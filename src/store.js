import { create } from 'zustand';
import {
  computeResponse,
  normalizeParams,
  playablePressureRange,
  playableCutupRange,
  feetToLength,
  PRESETS,
} from './physics/pipePhysics.js';
import { getEngine } from './physics/soundEngine.js';

export const useStore = create((set, get) => ({
  params: { ...PRESETS.principal.params },
  playing: false,
  cutaway: true,
  bellowsExpanded: false,

  setParam: (key, value) => {
    set((s) => {
      let params = { ...s.params, [key]: value };
      if (key === 'feet') {
        params.length = feetToLength(value, params.fineMM);
      } else if (key === 'fineMM') {
        params.length = feetToLength(params.feet, value);
      } else if (s.params.material === 'metal' && key === 'width' && params.type !== 'reed') {
        params.depth = value;
      }
      params = normalizeParams(params);
      return { params };
    });
    get().refreshAudio();
  },

  setMaterial: (material) => {
    set((s) => {
      let params = { ...s.params, material };
      if (material === 'metal' && params.type !== 'reed') params.depth = params.width;
      params = normalizeParams(params);
      return { params };
    });
    get().refreshAudio();
  },

  setType: (type) => {
    set((s) => {
      const params = { ...s.params, type };
      return { params: normalizeParams(params) };
    });
    get().refreshAudio();
  },

  applyPreset: (name) => {
    set((s) => ({ params: normalizeParams({ ...PRESETS[name].params }) }));
    get().refreshAudio();
  },

  toggleCutaway: () => set((s) => ({ cutaway: !s.cutaway })),

  toggleWind: async () => {
    const { playing, params } = get();
    const engine = getEngine();
    const resp = computeResponse(params);
    if (!playing) {
      await engine.play(resp);
      set({ playing: true, bellowsExpanded: false });
    } else {
      engine.stop(resp);
      set({ playing: false });
    }
  },

  refreshAudio: () => {
    const { playing, params } = get();
    if (playing) getEngine().update(computeResponse(params));
  },

  ranges: () => {
    const { params } = get();
    return {
      pressure: playablePressureRange(params),
      cutup: playableCutupRange(params),
    };
  },
}));
