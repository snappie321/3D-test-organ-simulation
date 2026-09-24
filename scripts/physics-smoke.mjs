// Smoke test for the pure physics module. Run: npm run physics:check
import assert from 'node:assert';
import {
  computeResponse,
  normalizeParams,
  playablePressureRange,
  feetToLength,
  PRESETS,
  FEET_OPTIONS,
} from '../src/physics/pipePhysics.js';

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

// Feet conversion: 8' open pipe speaks near C4 (fundamental ~65 Hz would be 8' C2).
for (const feet of FEET_OPTIONS) {
  const L = feetToLength(feet);
  assert.ok(L > 0, `${feet}' length should be positive`);
}
const eightFt = computeResponse({
  ...PRESETS.principal.params,
  feet: 8,
  fineMM: 0,
  length: feetToLength(8),
});
assert.ok(eightFt.f0 < principal.f0, '8\' should resonate lower than 2\'');

// Stopped pipe: same length resonates one octave lower, even harmonics suppressed.
const stoppedRaw = computeResponse({ ...PRESETS.principal.params, stopped: true });
assert.ok(
  Math.abs(stoppedRaw.f0 - principal.f0 / 2) < 1,
  'stopped pipe should resonate about an octave lower'
);
const stopped = computeResponse(normalizeParams({ ...PRESETS.principal.params, stopped: true }));
assert.ok(stopped.status.startsWith('Speaking'), `stopped pipe should speak after normalizing wind, got "${stopped.status}"`);
assert.ok(stopped.mode === 1, 'normalized stopped pipe should speak at its fundamental');
assert.ok(stopped.harmonics[1].amp < stopped.harmonics[2].amp, 'stopped pipe suppresses the 2nd harmonic vs the 3rd');

// Reed pipe: speaks, does not overblow, brighter than a flue of equal scale.
const reed = computeResponse({ ...PRESETS.principal.params, type: 'reed', pressure: 700 });
assert.ok(reed.status.startsWith('Speaking'), `reed should speak, got "${reed.status}"`);
assert.ok(reed.mode === 1, 'reed cannot overblow');
const overblownReed = computeResponse({ ...PRESETS.principal.params, type: 'reed', pressure: 1500 });
assert.ok(overblownReed.mode === 1, 'reed still cannot overblow at high wind');

// Overblowing a flue pipe.
const overblown = computeResponse({ ...PRESETS.principal.params, pressure: 1200 });
assert.ok(overblown.mode > 1, 'excess wind should overblow the flue pipe');
assert.match(overblown.status, /Overblown/);

// Playable ranges exist and the normalizer keeps parameters inside them.
const range = playablePressureRange(PRESETS.principal.params);
assert.ok(!range.empty, 'principal has a playable pressure range');
const norm = normalizeParams({ ...PRESETS.principal.params, pressure: 3000 });
const normResp = computeResponse(norm);
assert.ok(normResp.mode === 1, 'normalizeParams should pull an overblowing setting back to the fundamental');

// Tremulant passes through to the response.
const withTrem = computeResponse({ ...PRESETS.principal.params, tremulantRate: 5, tremulantDepth: 0.5 });
assert.strictEqual(withTrem.trem.rate, 5);
assert.strictEqual(withTrem.trem.depth, 0.5);

const silent = computeResponse({ ...PRESETS.principal.params, pressure: 5 });
assert.ok(!silent.status.startsWith('Speaking'), 'almost no wind should not speak');

const invalid = computeResponse({ ...PRESETS.principal.params, cutup: 0 });
assert.strictEqual(invalid.status, 'Invalid geometry');

console.log('physics smoke test: all assertions passed');
