// Smoke test for the pure physics module. Run: npm run physics:check
import assert from 'node:assert';
import {
  computeResponse,
  normalizeParams,
  playablePressureRange,
  rankResponses,
  feetToLength,
  PRESETS,
  FEET_OPTIONS,
} from '../src/physics/pipePhysics.js';

// --- Existing core behaviour -------------------------------------------------
const principal = computeResponse(PRESETS.principal.params);
assert.ok(principal.status.startsWith('Speaking'), `principal should speak, got "${principal.status}"`);
assert.ok(Math.abs(principal.fs - 261.6) < 12, `principal ~C4, got ${principal.fs.toFixed(1)} Hz`);
assert.ok(principal.mode === 1, 'principal should not overblow');

const flute = computeResponse(PRESETS.flute.params);
assert.ok(flute.status.startsWith('Speaking'), 'flute should speak');
assert.ok(flute.slope > principal.slope, 'wide flute should have fewer harmonics than principal');

const string = computeResponse(PRESETS.string.params);
assert.ok(string.status.startsWith('Speaking'), 'string should speak');
assert.ok(string.slope < principal.slope, 'narrow string pipe should be brighter');

for (const feet of FEET_OPTIONS) {
  const L = feetToLength(feet);
  assert.ok(L > 0, `${feet}' length should be positive`);
}

// --- New presets must all speak ------------------------------------------------
for (const [name, preset] of Object.entries(PRESETS)) {
  const state = { ...preset.params, length: feetToLength(preset.params.feet, preset.params.fineMM) };
  const resp = computeResponse(normalizeParams(state));
  assert.ok(resp.valid, `${name}: response must be valid`);
  assert.ok(resp.status.startsWith('Speaking'), `${name}: should speak, got "${resp.status}"`);
  for (const [k, v] of Object.entries(state)) {
    if (typeof v === 'number') assert.ok(isFinite(v), `${name}: ${k} must be finite`);
  }
}

// --- Stopped pipe: quarter-wave, even harmonics suppressed ---------------------
const stoppedRaw = computeResponse({ ...PRESETS.principal.params, stopped: true });
assert.ok(
  Math.abs(stoppedRaw.f0 - principal.f0 / 2) < 1,
  'stopped pipe should resonate about an octave lower'
);

// --- Rohrflöte: chimney restores even harmonics --------------------------------
const plainStopped = computeResponse(normalizeParams({
  ...PRESETS.rohrflaute.params, chimney: 0, stopped: true,
}));
const withChimney = computeResponse(normalizeParams({ ...PRESETS.rohrflaute.params }));
assert.ok(withChimney.formants.length > 0, 'Rohrflöte should have a chimney formant');
const evenRatio = (r) => r.harmonics[1].amp / Math.max(r.harmonics[2].amp, 1e-9);
assert.ok(
  evenRatio(withChimney) > evenRatio(plainStopped),
  'chimney should restore even harmonics vs plain stopped'
);

// --- Céleste: ranks beat --------------------------------------------------------
const celesteResp = rankResponses({ ...PRESETS.celeste.params });
assert.strictEqual(celesteResp.length, 2, 'céleste preset should have 2 ranks');
assert.ok(celesteResp[0].fs < celesteResp[1].fs, 'rank 1 should be sharper than rank 0');
const beatHz = celesteResp[1].fs - celesteResp[0].fs;
assert.ok(beatHz > 0.2 && beatHz < 8, `céleste beat should be audible slow, got ${beatHz.toFixed(2)} Hz`);
const single = rankResponses({ ...PRESETS.celeste.params, ranks: 1 });
assert.strictEqual(single.length, 1, 'ranks=1 gives one response');
const three = rankResponses({ ...PRESETS.celeste.params, ranks: 3 });
assert.strictEqual(three.length, 3, 'ranks=3 gives three responses');

// --- Reed: shallot and tongue change the timbre ---------------------------------
const vox = computeResponse(normalizeParams({ ...PRESETS.voxHumana.params }));
const trumpet = computeResponse(normalizeParams({ ...PRESETS.trumpet.params }));
assert.ok(vox.formants.length > 0, 'vox humana should have formants');
assert.ok(trumpet.formants.length > 0, 'trumpet should have formants');
assert.ok(
  vox.formants[0].freq < trumpet.formants[0].freq || vox.slope > trumpet.slope,
  'vox humana and trumpet must differ in timbre'
);
assert.ok(vox.mode === 1 && trumpet.mode === 1, 'reeds never overblow');
const shortTongue = computeResponse(normalizeParams({ ...PRESETS.trumpet.params, tongueLength: 0.025 }));
assert.ok(shortTongue.slope < trumpet.slope, 'shorter tongue should sound brighter');

// --- Playable ranges and normalisation ------------------------------------------
const range = playablePressureRange(PRESETS.principal.params);
assert.ok(!range.empty, 'principal has a playable pressure range');
const norm = normalizeParams({ ...PRESETS.principal.params, pressure: 3000 });
const normResp = computeResponse(norm);
assert.ok(normResp.mode === 1, 'normalizeParams should pull an overblowing setting back to the fundamental');

for (const feet of [0.5, 1, 2, 4, 8, 16, 32]) {
  const state = { ...PRESETS.principal.params, feet, fineMM: 0 };
  state.length = feetToLength(feet);
  const resp = computeResponse(normalizeParams(state));
  assert.ok(resp.status.startsWith('Speaking'), `${feet}' must speak after normalisation, got "${resp.status}"`);
}

// --- Tremulant passthrough ------------------------------------------------------
const withTrem = computeResponse({ ...PRESETS.principal.params, tremulantRate: 5, tremulantDepth: 0.5 });
assert.strictEqual(withTrem.trem.rate, 5);
assert.strictEqual(withTrem.trem.depth, 0.5);

const silent = computeResponse({ ...PRESETS.principal.params, pressure: 5 });
assert.ok(!silent.status.startsWith('Speaking'), 'almost no wind should not speak');

const invalid = computeResponse({ ...PRESETS.principal.params, cutup: 0 });
assert.strictEqual(invalid.status, 'Invalid geometry');

console.log('physics smoke test: all assertions passed');
