// Pure physics model of an organ pipe (flue and reed). No browser APIs — safe to unit-test in Node.

export const PHYS = { c: 343, rho: 1.2 };

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const FEET_OPTIONS = [0.5, 1, 2, 3, 4, 6, 8, 12, 16, 32];
export const FOOT_LABELS = {
  0.5: '½′', 1: '1′', 2: '2′', 3: '3′', 4: '4′', 6: '6′', 8: '8′', 12: '12′', 16: '16′', 32: '32′',
};

export function feetToLength(feet, fineMM = 0) {
  return feet * 0.3048 + fineMM / 1000;
}

export function freqToNote(f) {
  const midi = 69 + 12 * Math.log2(f / 440);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1);
  return { name, cents };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Strouhal number at which the jet locks to the fundamental most strongly (empirical optimum).
const ST_OPT = 0.15;
// Jet "tongue" width of the speaking window (log-gaussian around the optimum).
const ST_TONGUE = 0.6;
export const N_HARMONICS = 14;

// Minimum drive to count as audible speech.
const DRIVE_MIN = 0.0005;

// Formant templates (freq Hz, boost dB, Q) per shallot type for reed pipes.
const FORMANT_OPEN_SHALLOT = [
  { freq: 850, dB: 8, q: 1.2 },
  { freq: 1700, dB: 5, q: 1.4 },
];
const FORMANT_CLOSED_SHALLOT = [
  { freq: 550, dB: 9, q: 2.0 },
  { freq: 1500, dB: 6, q: 2.0 },
];

export function computeResponse(p) {
  const {
    width: W, depth: D, cutup: E, flueGap: g,
    pressure: P, material, type = 'flue', stopped = false,
    chimney = 0, shallot = 'open', tongueLength = 0.04, detuneCents = 0,
    tremulantRate = 0, tremulantDepth = 0,
  } = p;

  const c = PHYS.c;
  const rho = PHYS.rho;
  const v = Math.sqrt((2 * Math.max(P, 0)) / rho); // jet speed at the flue slit
  const area = Math.max(W * D, 1e-6);
  const rEff = Math.sqrt(area / Math.PI);
  // Effective acoustic length: physical length + open-end correction + mouth correction.
  const L = p.length !== undefined ? p.length : feetToLength(p.feet ?? 8, p.fineMM ?? 0);
  const Leff = L + 0.61 * rEff + 0.3 * Math.sqrt(area);
  // Stopped (capped) pipes are quarter-wave resonators, open pipes half-wave.
  const waveDiv = stopped ? 4 : 2;
  const f0 = c / (waveDiv * Leff);

  const valid = E > 1e-4 && g > 1e-5 && L > 0.02 && W > 0.005 && isFinite(v) && v > 0;
  const isReed = type === 'reed';

  let mode = 1;
  let tongue = 0;
  let drive = 0;
  let speaks = false;

  if (isReed) {
    // A reed tongue vibrates against the shallot; it does not overblow.
    speaks = valid && v > 3;
    tongue = speaks ? 1 : 0;
    drive = speaks ? Math.min(1, v / 40) * 0.85 : 0;
  } else {
    const St = valid ? (f0 * E) / v : NaN; // Strouhal number of the jet at the cut-up
    let raw = valid ? Math.max(1, Math.round(ST_OPT / St)) : 1;
    if (stopped && raw === 2) raw = 3; // stopped pipes skip the even mode and jump to the 3rd
    mode = raw;
    const x = valid ? Math.log(St / ST_OPT) : 0;
    tongue = valid ? Math.exp(-(x * x) / ST_TONGUE) : 0;
    speaks = valid && v > 2.5 && tongue > 0.22;
    drive = speaks
      ? tongue * (0.35 + 0.65 * Math.min(1, v / 45)) * Math.pow(0.8, mode - 1)
      : 0;
  }

  const detune = Math.pow(2, (detuneCents || 0) / 1200);
  const fs = f0 * mode * detune; // sounding fundamental

  // Spectral slope from the pipe scale: wide pipes -> few harmonics, narrow -> rich spectrum.
  // Reed timbre: an open (expressive) shallot gives the blazing trumpet
  // brightness; a closed shallot sounds narrower and duller (vox humana).
  // A shorter tongue adds extra brightness on top.
  const tongueBright = clamp(0.035 / clamp(tongueLength, 0.015, 0.2), 0.85, 1.25);
  const shallotBright = shallot === 'closed' ? 1.3 : 0.75;
  const slope = isReed
    ? clamp((0.25 + 6 * (W / L)) * shallotBright / tongueBright, 0.4, 2.6)
    : clamp(0.4 + 10 * (W / L), 0.9, 3.2);
  // Wall damping: wood absorbs high harmonics much more than metal.
  const beta = isReed
    ? (material === 'wood' ? 0.09 : 0.035)
    : (material === 'wood' ? 0.16 : 0.06);

  // Stopped pipes suppress even harmonics; a chimney (Rohrflöte) partially
  // restores them, proportional to the chimney length relative to the body.
  const chimneyRest = clamp(chimney / Math.max(0.001, L * 0.12), 0, 1);
  const evenBase = stopped ? (isReed ? 0.4 : 0.12) : 1;
  const evenFactor = (stopped && !isReed) ? evenBase + 0.55 * chimneyRest : evenBase;

  const harmonics = [];
  for (let k = 1; k <= N_HARMONICS; k++) {
    const base = Math.pow(1 / k, slope) * Math.exp(-beta * Math.pow(k - 1, 1.3));
    const even = k % 2 === 0 ? evenFactor : 1;
    harmonics.push({ k, freq: fs * k, amp: speaks ? base * even * drive : 0 });
  }

  // Formants: resonant peaks layered on top of the harmonic slope.
  let formants = [];
  if (speaks) {
    if (isReed) {
      const tpl = shallot === 'closed' ? FORMANT_CLOSED_SHALLOT : FORMANT_OPEN_SHALLOT;
      formants = tpl.map((f) => ({ ...f, freq: f.freq * tongueBright }));
    } else if (stopped && chimney > 0.002) {
      // The chimney behaves as a small open pipe on top of the cap: its own
      // resonance peaks through the stopped spectrum (the Rohrflöte timbre).
      formants = [{ freq: c / (2 * Math.max(chimney, 0.004)), dB: 6, q: 2.2 }];
    }
  }

  const power = harmonics.reduce((s, h) => s + h.amp * h.amp, 0);
  const levelDb = speaks ? 10 * Math.log10(power + 1e-9) + 96 : -Infinity;

  const attack = isReed
    ? (speaks ? clamp(0.04 + tongueLength * 1.2, 0.05, 0.2) : 0.1)
    : (speaks
      ? Math.min(0.45, (0.02 + 0.12 * Math.abs(Math.log((f0 * E) / v / ST_OPT))) * (mode > 1 ? 1.6 : 1))
      : 0.1);
  const release = isReed
    ? 1.3 * (0.14 + Math.min(0.1, L * 0.03))
    : (material === 'wood' ? 0.16 : 0.09) + Math.min(0.1, L * 0.03);

  const noiseCenter = isReed
    ? Math.min(4000, fs * 3)
    : Math.min(6000, Math.max(900, 0.12 * v / Math.max(g, 2e-4)));
  const chiff = isReed
    ? (speaks ? 0.14 * Math.min(1, v / 50) : 0)
    : (speaks ? 0.55 * Math.min(1, v / 50) * (material === 'metal' ? 1.2 : 0.75) : 0);
  const breath = speaks ? 0.05 * Math.min(1, v / 50) : 0;

  let status;
  if (!valid) status = 'Invalid geometry';
  else if (isReed) status = v <= 3 ? 'No wind' : 'Speaking (reed)';
  else if (!speaks) {
    status = v <= 2.5
      ? 'No wind'
      : (f0 * E) / v > ST_OPT
        ? 'Underblown — cut-up too tall for this wind'
        : 'Unstable jet';
  } else if (mode > 1) {
    status = `Overblown — mode ${mode}`;
  } else {
    const kind = stopped ? (chimney > 0.002 ? 'Rohrflöte' : 'stopped') : null;
    status = kind ? `Speaking (${kind})` : 'Speaking';
  }

  return {
    f0,
    fs,
    mode,
    St: valid ? (f0 * E) / v : 0,
    v,
    drive,
    slope,
    harmonics,
    formants,
    levelDb,
    attack,
    release,
    noiseCenter,
    chiff,
    breath,
    status,
    note: freqToNote(fs),
    valid,
    trem: { rate: tremulantRate, depth: tremulantDepth },
  };
}

function speaksFundamental(p) {
  const r = computeResponse(p);
  return r.valid && r.mode === 1 && r.drive > DRIVE_MIN;
}

// Range of wind pressures (Pa) for which the pipe speaks at its fundamental.
export function playablePressureRange(p) {
  let min = null;
  let max = null;
  for (let P = 5; P <= 1600; P += 5) {
    if (speaksFundamental({ ...p, pressure: P })) {
      if (min === null) min = P;
      max = P;
    }
  }
  return min === null ? { empty: true, min: 0, max: 0 } : { empty: false, min, max };
}

// Range of cut-ups (m) for which the pipe speaks at its fundamental with the current wind.
export function playableCutupRange(p) {
  let min = null;
  let max = null;
  for (let E = 0.003; E <= 0.06; E += 0.0005) {
    if (speaksFundamental({ ...p, cutup: E })) {
      if (min === null) min = E;
      max = E;
    }
  }
  return min === null ? { empty: true, min: 0, max: 0 } : { empty: false, min, max };
}

// Keeps the pipe inside its playable window: clamps the cut-up to a physically
// plausible band, then (re)balances the wind pressure so the fundamental speaks.
export function normalizeParams(p) {
  const q = { ...p };
  const mouthMin = Math.max(0.003, q.width * 0.12);
  const mouthMax = q.width * 0.45;
  q.cutup = clamp(q.cutup, mouthMin, mouthMax);
  q.chimney = clamp(q.chimney || 0, 0, 0.3);
  q.tongueLength = clamp(q.tongueLength || 0.04, 0.02, 0.12);

  if (q.type === 'reed') {
    q.pressure = clamp(q.pressure, 20, 1600);
    return q;
  }

  let pr = playablePressureRange(q);
  if (pr.empty) {
    // No wind setting works with this mouth: retune jet cooperation to the
    // Strouhal optimum (v = f0·E / St_opt). If the jet would be too slow, raise
    // the cut-up as far as the mouth allows.
    const area = Math.max(q.width * q.depth, 1e-6);
    const rEff = Math.sqrt(area / Math.PI);
    const L = q.length !== undefined ? q.length : feetToLength(q.feet ?? 8, q.fineMM ?? 0);
    const Leff = L + 0.61 * rEff + 0.3 * Math.sqrt(area);
    const f0 = PHYS.c / ((q.stopped ? 4 : 2) * Leff);
    let E = q.cutup;
    let v = (f0 * E) / ST_OPT;
    if (v < 3) {
      E = clamp((3 * ST_OPT) / f0, mouthMin, mouthMax);
      v = Math.max((f0 * E) / ST_OPT, 3);
    }
    q.cutup = E;
    q.pressure = clamp((PHYS.rho * v * v) / 2, 5, 1600);
    pr = playablePressureRange(q);
  }
  if (!pr.empty) q.pressure = clamp(q.pressure, pr.min, pr.max);
  return q;
}

// Rank detune layout: rank 0 is at pitch, extra ranks beat against it.
export const RANK_OFFSETS = { 1: [0], 2: [0, 1], 3: [0, -0.5, 0.5] };

// One response per rank (céleste: identical pipes with a detune offset).
export function rankResponses(p) {
  const offsets = RANK_OFFSETS[clamp(p.ranks || 1, 1, 3)] || [0];
  return offsets.map((m) =>
    computeResponse({ ...p, detuneCents: (p.detuneCents || 0) * m })
  );
}

const BASE = {
  type: 'flue', stopped: false, chimney: 0, shallot: 'open',
  tongueLength: 0.04, ranks: 1, detuneCents: 0,
  tremulantRate: 0, tremulantDepth: 0, fineMM: 0,
};

export const PRESETS = {
  principal: {
    label: 'Principal (2′)',
    params: {
      ...BASE, material: 'metal', feet: 2,
      width: 0.077, depth: 0.077, cutup: 0.014, flueGap: 0.001,
      wallThickness: 0.0007, pressure: 350,
    },
  },
  flute: {
    label: 'Wooden flute (2′)',
    params: {
      ...BASE, material: 'wood', feet: 2,
      width: 0.13, depth: 0.1, cutup: 0.028, flueGap: 0.0012,
      wallThickness: 0.01, pressure: 800,
    },
  },
  string: {
    label: 'String (2′)',
    params: {
      ...BASE, material: 'metal', feet: 2,
      width: 0.03, depth: 0.03, cutup: 0.01, flueGap: 0.0008,
      wallThickness: 0.0006, pressure: 200,
    },
  },
  celeste: {
    label: 'Voix Céleste (2 ranks, +4 cent)',
    params: {
      ...BASE, material: 'metal', feet: 2,
      width: 0.035, depth: 0.035, cutup: 0.009, flueGap: 0.0007,
      wallThickness: 0.0006, pressure: 180,
      ranks: 2, detuneCents: 4,
    },
  },
  rohrflaute: {
    label: 'Rohrflöte (2′, chimney)',
    params: {
      ...BASE, material: 'wood', feet: 2, stopped: true,
      width: 0.11, depth: 0.09, cutup: 0.02, flueGap: 0.0012,
      wallThickness: 0.01, pressure: 500, chimney: 0.14,
    },
  },
  voxHumana: {
    label: 'Vox Humana (reed, closed shallot)',
    params: {
      ...BASE, material: 'metal', feet: 2, type: 'reed', shallot: 'closed',
      width: 0.05, depth: 0.05, cutup: 0.014, flueGap: 0.001,
      wallThickness: 0.001, pressure: 600, tongueLength: 0.025,
    },
  },
  trumpet: {
    label: 'Trompet (reed, open shallot)',
    params: {
      ...BASE, material: 'metal', feet: 2, type: 'reed', shallot: 'open',
      width: 0.06, depth: 0.06, cutup: 0.016, flueGap: 0.0012,
      wallThickness: 0.001, pressure: 900, tongueLength: 0.05,
    },
  },
};
