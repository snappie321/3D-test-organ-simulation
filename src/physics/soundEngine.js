// Web Audio engine: synthesises the pipe voice from the physics response.
// Persistent oscillator bank + noise voice, driven entirely by computeResponse() output.
// Supports multiple ranks (céleste beats) and per-rank formant filters.

import { N_HARMONICS } from './pipePhysics.js';

const HARM_GAIN = 0.22;
const FREQ_MAX = 16000;
const MAX_RANKS = 3;

function makeNoiseBuffer(ctx) {
  const len = 2 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

class Rank {
  constructor(ctx, parent) {
    this.ctx = ctx;
    this.oscs = [];
    this.gains = [];
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'peaking';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 1;
    this.filter.gain.value = 0;
    for (let i = 0; i < N_HARMONICS; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();
      this.oscs.push(osc);
      this.gains.push(gain);
    }
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.Q.value = 1.4;
    this.noiseFilter.frequency.value = 2500;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    const src = ctx.createBufferSource();
    src.buffer = parent.noiseBuffer;
    src.loop = true;
    src.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.filter);
    src.start();
    this.filter.connect(parent.master);
  }

  setFormant(formants) {
    // The strongest formant shapes this rank's voice; secondary peaks are
    // approximated by centering the peaking filter on the dominant one.
    if (!formants || formants.length === 0) {
      this.filter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    const f = formants.reduce((a, b) => (a && a.dB >= b.dB ? a : b));
    this.filter.frequency.setTargetAtTime(f.freq, this.ctx.currentTime, 0.05);
    this.filter.Q.setTargetAtTime(f.q, this.ctx.currentTime, 0.05);
    this.filter.gain.setTargetAtTime(f.dB, this.ctx.currentTime, 0.05);
  }

  start(resp, delay) {
    const t = this.ctx.currentTime + delay;
    const attack = Math.max(0.015, resp.attack);
    resp.harmonics.forEach((h, i) => {
      this.oscs[i].frequency.setValueAtTime(Math.min(h.freq, FREQ_MAX), t);
      const gain = this.gains[i].gain;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(0, t);
      gain.linearRampToValueAtTime(h.amp > 0.0005 ? h.amp * HARM_GAIN : 0, t + attack);
    });
    const ng = this.noiseGain.gain;
    ng.cancelScheduledValues(t);
    ng.setValueAtTime(0, t);
    ng.linearRampToValueAtTime(resp.chiff * 0.45, t + 0.015);
    ng.setTargetAtTime(resp.breath * 0.4, t + 0.06, 0.08);
    this.setFormant(resp.formants);
  }

  update(resp) {
    const t = this.ctx.currentTime;
    resp.harmonics.forEach((h, i) => {
      this.oscs[i].frequency.setTargetAtTime(Math.min(h.freq, FREQ_MAX), t, 0.03);
      const target = h.amp > 0.0005 ? h.amp * HARM_GAIN : 0;
      this.gains[i].gain.setTargetAtTime(target, t, 0.05);
    });
    this.noiseFilter.frequency.setTargetAtTime(resp.noiseCenter, t, 0.08);
    const ng = this.noiseGain.gain;
    ng.cancelScheduledValues(t);
    ng.setValueAtTime(ng.value, t);
    ng.setTargetAtTime(resp.breath * 0.4, t, 0.1);
    this.setFormant(resp.formants);
  }

  stop(resp) {
    const t = this.ctx.currentTime;
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

    this.tremGain = ctx.createGain();
    this.tremGain.gain.value = 1;

    this.tremLfo = ctx.createOscillator();
    this.tremLfo.type = 'sine';
    this.tremLfo.frequency.value = 0;
    this.tremLfoDepth = ctx.createGain();
    this.tremLfoDepth.gain.value = 0;
    this.tremLfo.connect(this.tremLfoDepth);
    this.tremLfoDepth.connect(this.tremGain.gain);
    this.tremLfo.start();

    this.tremLfo2 = ctx.createOscillator();
    this.tremLfo2.type = 'sine';
    this.tremLfo2.frequency.value = 0;
    this.tremLfo2Depth = ctx.createGain();
    this.tremLfo2Depth.gain.value = 0;
    this.tremLfo2.connect(this.tremLfo2Depth);
    this.tremLfo2Depth.connect(this.tremGain.gain);
    this.tremLfo2.start();

    this.master.connect(this.tremGain);
    this.tremGain.connect(this.comp);
    this.comp.connect(ctx.destination);

    this.noiseBuffer = makeNoiseBuffer(ctx);
    this.ranks = Array.from({ length: MAX_RANKS }, () => new Rank(ctx, this));
  }

  async resume() {
    this.init();
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }

  _setTremulant(resp, tau = 0.12) {
    const t = this.ctx.currentTime;
    const { rate, depth } = resp.trem;
    this.tremLfo.frequency.setTargetAtTime(rate, t, 0.08);
    this.tremLfo2.frequency.setTargetAtTime(rate * 1.04, t, 0.5);
    const d = Math.min(0.85, depth);
    this.tremLfoDepth.gain.setTargetAtTime(d * 0.7, t, tau);
    this.tremLfo2Depth.gain.setTargetAtTime(d * 0.3, t, tau);
  }

  async play(responses) {
    await this.resume();
    this.playing = true;
    this._setTremulant(responses[0], 0.05);
    responses.slice(0, MAX_RANKS).forEach((resp, i) => {
      this.ranks[i].start(resp, i * 0.012);
    });
  }

  update(responses) {
    if (!this.ctx || !this.playing) return;
    responses.slice(0, MAX_RANKS).forEach((resp, i) => this.ranks[i].update(resp));
    this._setTremulant(responses[0], 0.15);
  }

  stop(responses) {
    if (!this.ctx) {
      this.playing = false;
      return;
    }
    this.playing = false;
    const resps = responses || [];
    for (let i = 0; i < MAX_RANKS; i++) {
      this.ranks[i].stop(resps[i] || resps[0]);
    }
  }
}

let engine = null;
export function getEngine() {
  if (!engine) engine = new SoundEngine();
  return engine;
}
