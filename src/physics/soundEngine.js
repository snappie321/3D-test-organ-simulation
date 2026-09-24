// Web Audio engine: synthesises the pipe voice from the physics response.
// Persistent oscillator bank + noise voice, driven entirely by computeResponse() output.

import { N_HARMONICS } from './pipePhysics.js';

const HARM_GAIN = 0.22;
const FREQ_MAX = 16000;

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
  }

  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.15;

    this.master.connect(this.comp);
    this.comp.connect(ctx.destination);

    // Persistent oscillator bank (one per harmonic).
    this.oscs = [];
    this.gains = [];
    for (let i = 0; i < N_HARMONICS; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.oscs.push(osc);
      this.gains.push(gain);
    }

    // Looping white-noise buffer for chiff and breath noise.
    const len = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.Q.value = 1.4;
    this.noiseFilter.frequency.value = 2500;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;

    src.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.master);
    src.start();
  }

  async resume() {
    this.init();
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  _setHarmonicTargets(resp, when, tau) {
    const t = this.ctx.currentTime;
    resp.harmonics.forEach((h, i) => {
      this.oscs[i].frequency.setTargetAtTime(Math.min(h.freq, FREQ_MAX), t, 0.03);
      const target = h.amp > 0.0005 ? h.amp * HARM_GAIN : 0;
      this.gains[i].gain.setTargetAtTime(target, t, tau);
    });
    this.noiseFilter.frequency.setTargetAtTime(resp.noiseCenter, t, 0.05);
  }

  async play(resp) {
    await this.resume();
    const t = this.ctx.currentTime;
    this.playing = true;
    const attack = Math.max(0.015, resp.attack);
    resp.harmonics.forEach((h, i) => {
      this.oscs[i].frequency.setTargetAtTime(Math.min(h.freq, FREQ_MAX), t, 0.02);
      const gain = this.gains[i].gain;
      const target = h.amp > 0.0005 ? h.amp * HARM_GAIN : 0;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(gain.value, t);
      gain.linearRampToValueAtTime(target, t + attack);
    });
    if (resp.chiff > 0.01) {
      const ng = this.noiseGain.gain;
      ng.cancelScheduledValues(t);
      ng.setValueAtTime(ng.value, t);
      ng.linearRampToValueAtTime(resp.chiff * 0.45, t + 0.015);
      ng.setTargetAtTime(resp.breath * 0.4, t + 0.06, 0.08);
    } else {
      const ng = this.noiseGain.gain;
      ng.cancelScheduledValues(t);
      ng.setValueAtTime(ng.value, t);
      ng.setTargetAtTime(resp.breath * 0.4, t, 0.05);
    }
  }

  update(resp) {
    if (!this.ctx || !this.playing) return;
    this._setHarmonicTargets(resp, null, 0.05);
    const t = this.ctx.currentTime;
    const ng = this.noiseGain.gain;
    ng.cancelScheduledValues(t);
    ng.setValueAtTime(ng.value, t);
    ng.setTargetAtTime(resp.breath * 0.4, t, 0.1);
  }

  stop(resp) {
    if (!this.ctx) {
      this.playing = false;
      return;
    }
    const t = this.ctx.currentTime;
    this.playing = false;
    const release = Math.max(0.05, resp ? resp.release : 0.15);
    this.gains.forEach((g) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + release);
    });
    const ng = this.noiseGain.gain;
    ng.cancelScheduledValues(t);
    ng.setValueAtTime(ng.value, t);
    ng.linearRampToValueAtTime(0, t + Math.min(release, 0.12));
  }
}

let engine = null;
export function getEngine() {
  if (!engine) engine = new SoundEngine();
  return engine;
}
