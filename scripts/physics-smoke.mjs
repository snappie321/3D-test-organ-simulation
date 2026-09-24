// Smoke test for the pure physics module. Run: npm run physics:check
import assert from 'node:assert';
import { computeResponse, PRESETS } from '../src/physics/pipePhysics.js';

const principal = computeResponse(PRESETS.principal.params);
assert.strictEqual(principal.status, 'Speaking', 'principal should speak');
assert.ok(Math.abs(principal.fs - 261.6) < 12, `principal ~C4, got ${principal.fs.toFixed(1)} Hz`);
assert.ok(principal.mode === 1, 'principal should not overblow');

const flute = computeResponse(PRESETS.flute.params);
assert.strictEqual(flute.status, 'Speaking', 'flute should speak');
assert.ok(flute.slope > principal.slope, 'wide flute should have fewer harmonics than principal');

const string = computeResponse(PRESETS.string.params);
assert.strictEqual(string.status, 'Speaking', 'string should speak');
assert.ok(string.slope < principal.slope, 'narrow string pipe should be brighter');

const doubled = computeResponse({ ...PRESETS.principal.params, length: 1.24 });
const ratio = doubled.f0 / principal.f0;
assert.ok(ratio > 0.48 && ratio < 0.56, `double length should ~halve resonance, got ratio ${ratio.toFixed(3)}`);

const overblown = computeResponse({
  ...PRESETS.principal.params,
  pressure: 1200,
});
assert.ok(overblown.mode > 1, 'excess wind should overblow the pipe');
assert.match(overblown.status, /Overblown/);

const silent = computeResponse({ ...PRESETS.principal.params, pressure: 5 });
assert.notStrictEqual(silent.status, 'Speaking', 'almost no wind should not speak');

const invalid = computeResponse({ ...PRESETS.principal.params, cutup: 0 });
assert.strictEqual(invalid.status, 'Invalid geometry');

console.log('physics smoke test: all assertions passed');
