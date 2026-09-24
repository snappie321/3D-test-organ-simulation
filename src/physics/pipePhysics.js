// Pure physics model of a labial (flue) organ pipe. No browser APIs — safe to unit-test in Node.

export const PHYS = { c: 343, rho: 1.2 };

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function freqToNote(f) {
  const midi = 69 + 12 * Math.log2(f / 440);
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1);
  return { name, cents };
}

// Strouhal number at which the jet locks to the fundamental most strongly (empirical optimum).
const ST_OPT = 0.15;
// Jet "tongue" width of the speaking window (log-gaussian around the optimum).
const ST_TONGUE = 0.6;
export const N_HARMONICS = 14;

export function computeResponse(p) {
  const { length: L, width: W, depth: D, cutup: E, flueGap: g, pressure: P, material } = p;

  const c = PHYS.c;
  const rho = PHYS.rho;
  const v = Math.sqrt((2 * Math.max(P, 0)) / rho); // jet speed at the flue slit
  const area = Math.max(W * D, 1e-6);
  const rEff = Math.sqrt(area / Math.PI); // radius of the equivalent circular cross-section
  // Effective acoustic length: physical length + open-end correction + mouth correction.
  const Leff = L + 0.61 * rEff + 0.3 * Math.sqrt(area);
  const f0 = c / (2 * Leff);

  const valid = E > 1e-4 && g > 1e-5 && L > 0.02 && W > 0.005 && isFinite(v) && v > 0;
  const St = valid ? (f0 * E) / v : NaN; // Strouhal number of the jet at the cut-up
  const mode = valid ? Math.max(1, Math.round(ST_OPT / St)) : 1; // harmonic the jet locks onto
  const x = valid ? Math.log(St / ST_OPT) : 0;
  const tongue = valid ? Math.exp(-(x * x) / ST_TONGUE) : 0; // 1.0 = perfect jet/pipe cooperation
  const speaks = valid && v > 2.5 && tongue > 0.22;

  const drive = speaks
    ? tongue * (0.35 + 0.65 * Math.min(1, v / 45)) * Math.pow(0.8, mode - 1)
    : 0;

  const fs = f0 * mode; // sounding fundamental

  // Spectral slope from the pipe scale: wide pipes -> few harmonics, narrow -> rich spectrum.
  const slope = Math.min(3.2, Math.max(0.9, 0.4 + 10 * (W / L)));
  // Wall damping: wood absorbs high harmonics much more than metal.
  const beta = material === 'wood' ? 0.16 : 0.06;

  const harmonics = [];
  for (let k = 1; k <= N_HARMONICS; k++) {
    const base = Math.pow(1 / k, slope) * Math.exp(-beta * Math.pow(k - 1, 1.3));
    harmonics.push({ k, freq: fs * k, amp: speaks ? base * drive : 0 });
  }

  const power = harmonics.reduce((s, h) => s + h.amp * h.amp, 0);
  const levelDb = speaks ? 10 * Math.log10(power + 1e-9) + 96 : -Infinity;

  const attack = speaks
    ? Math.min(0.45, (0.02 + 0.12 * Math.abs(x)) * (mode > 1 ? 1.6 : 1))
    : 0.1;
  const release = (material === 'wood' ? 0.16 : 0.09) + Math.min(0.1, L * 0.03);

  // Jet noise band (chiff): Strouhal-based estimate around the slit.
  const noiseCenter = valid ? Math.min(6000, Math.max(900, 0.12 * v / Math.max(g, 2e-4))) : 2000;
  const chiff = speaks ? 0.55 * Math.min(1, v / 50) * (material === 'metal' ? 1.2 : 0.75) : 0;
  const breath = speaks ? 0.05 * Math.min(1, v / 50) : 0;

  let status;
  if (!valid) status = 'Invalid geometry';
  else if (!speaks) {
    status = v <= 2.5
      ? 'No wind'
      : St > ST_OPT
        ? 'Underblown — cut-up too tall for this wind'
        : 'Unstable jet';
  } else if (mode > 1) {
    status = `Overblown — mode ${mode}`;
  } else {
    status = 'Speaking';
  }

  return {
    f0,
    fs,
    mode,
    St: valid ? St : 0,
    v,
    drive,
    slope,
    harmonics,
    levelDb,
    attack,
    release,
    noiseCenter,
    chiff,
    breath,
    status,
    note: freqToNote(fs),
    valid,
  };
}

export const PRESETS = {
  principal: {
    label: 'Principal (8′, middle C)',
    params: {
      material: 'metal',
      length: 0.62,
      width: 0.077,
      depth: 0.077,
      cutup: 0.014,
      flueGap: 0.001,
      wallThickness: 0.0007,
      pressure: 350,
    },
  },
  flute: {
    label: 'Wooden flute (8′, middle C)',
    params: {
      material: 'wood',
      length: 0.62,
      width: 0.13,
      depth: 0.1,
      cutup: 0.028,
      flueGap: 0.0012,
      wallThickness: 0.01,
      pressure: 550,
    },
  },
  string: {
    label: 'String / Viola (8′, middle C)',
    params: {
      material: 'metal',
      length: 0.62,
      width: 0.03,
      depth: 0.03,
      cutup: 0.01,
      flueGap: 0.0008,
      wallThickness: 0.0006,
      pressure: 200,
    },
  },
};
