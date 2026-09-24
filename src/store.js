import { create } from 'zustand';
import {
  computeResponse,
  normalizeParams,
  playablePressureRange,
  playableCutupRange,
  rankResponses,
  feetToLength,
  PRESETS,
} from './physics/pipePhysics.js';
import { getEngine } from './physics/soundEngine.js';

function withLength(params) {
  return { ...params, length: feetToLength(params.feet, params.fineMM) };
}

export const useStore = create((set, get) => ({
  params: withLength({ ...PRESETS.principal.params }),
  playing: false,
  cutaway: true,

  setParam: (key, value) => {
    set((s) => {
      let params = { ...s.params, [key]: value };
      if (key === 'feet') params.fineMM = 0;
      if (s.params.material === 'metal' && key === 'width' && params.type !== 'reed') {
        params.depth = value;
      }
      params = normalizeParams(withLength(params));
      return { params };
    });
    get().refreshAudio();
  },

  setMaterial: (material) => {
    set((s) => {
      let params = { ...s.params, material };
      if (material === 'metal' && params.type !== 'reed') params.depth = params.width;
      params = normalizeParams(withLength(params));
      return { params };
    });
    get().refreshAudio();
  },

  setType: (type) => {
    set((s) => {
      const params = { ...s.params, type };
      return { params: normalizeParams(withLength(params)) };
    });
    get().refreshAudio();
  },

  applyPreset: (name) => {
    set({ params: normalizeParams(withLength({ ...PRESETS[name].params })) });
    get().refreshAudio();
  },

  toggleCutaway: () => set((s) => ({ cutaway: !s.cutaway })),

  toggleWind: async () => {
    const { playing, params } = get();
    const engine = getEngine();
    const responses = rankResponses(params);
    if (!playing) {
      await engine.play(responses);
      set({ playing: true });
    } else {
      engine.stop(responses);
      set({ playing: false });
    }
  },

  refreshAudio: () => {
    const { playing, params } = get();
    if (playing) getEngine().update(rankResponses(params));
  },
}));

export function useRanges() {
  const params = useStore((s) => s.params);
  const isReed = params.type === 'reed';
  return {
    pressure: isReed ? null : playablePressureRange(params),
    cutup: isReed ? null : playableCutupRange(params),
  };
}
