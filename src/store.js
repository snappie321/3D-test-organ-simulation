import { create } from 'zustand';
import { computeResponse, PRESETS } from './physics/pipePhysics.js';
import { getEngine } from './physics/soundEngine.js';

export const useStore = create((set, get) => ({
  params: { ...PRESETS.principal.params },
  playing: false,
  cutaway: true,

  setParam: (key, value) => {
    set((s) => {
      const params = { ...s.params, [key]: value };
      if (s.params.material === 'metal' && key === 'width') {
        params.depth = value;
      }
      return { params };
    });
    get().refreshAudio();
  },

  setMaterial: (material) => {
    set((s) => {
      const params = { ...s.params, material };
      if (material === 'metal') params.depth = params.width;
      return { params };
    });
    get().refreshAudio();
  },

  applyPreset: (name) => {
    set({ params: { ...PRESETS[name].params } });
    get().refreshAudio();
  },

  toggleCutaway: () => set((s) => ({ cutaway: !s.cutaway })),

  toggleWind: async () => {
    const { playing, params } = get();
    const engine = getEngine();
    const resp = computeResponse(params);
    if (!playing) {
      await engine.play(resp);
      set({ playing: true });
    } else {
      engine.stop(resp);
      set({ playing: false });
    }
  },

  refreshAudio: () => {
    const { playing, params } = get();
    if (playing) getEngine().update(computeResponse(params));
  },
}));
