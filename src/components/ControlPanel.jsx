import { useMemo, useState } from 'react';
import { useStore } from '../store.js';
import {
  computeResponse,
  rankResponses,
  playablePressureRange,
  playableCutupRange,
  PRESETS,
  FEET_OPTIONS,
  FOOT_LABELS,
  N_HARMONICS,
} from '../physics/pipePhysics.js';

const INFOS = {
  feet: 'Organ pipe lengths are named in feet (′), like organ stops: 8′ = unison pitch, 4′ one octave higher, 2′ two octaves higher. Halving the length doubles the pitch.',
  fine: 'Fine adjustment in millimetres on top of the chosen foot measure, to tune the pipe precisely.',
  width: 'The pipe scale: internal width. Wide pipes (flutes) produce round, harmonic-poor tones; narrow pipes (strings) produce bright, harmonic-rich tones.',
  depth: 'Internal depth of a wooden pipe. A deeper pipe has a larger acoustic cross-section and sounds slightly lower.',
  wall: 'Wall thickness. Thicker wooden walls absorb more sound energy, making the tone softer and duller. In metal pipes this mainly affects stability.',
  cutup: 'The cut-up is the height of the mouth opening. A higher cut-up needs more wind and gives a slower, rounder speech; a lower cut-up speaks quickly but overblows sooner.',
  flue: 'The flue gap is the narrow slit the wind passes through. A wider slit gives a strong, loud jet (more chiff); a narrower slit gives a gentle, quiet jet.',
  pressure: 'Wind pressure from the bellows in pascal. The jet speed follows √(2P/ρ). Too little wind: no speech. Too much: the pipe overblows (jumps an octave).',
  tremRate: 'Tremulant speed in Hz (beats per second). A slow tremulant (~4–5 Hz) is romantic and wavy; a fast one (~6–8 Hz) is more like a vibrato.',
  tremDepth: 'Tremulant depth: how strongly the wind (and thus volume and pitch) sways. A depth of 0 disables the tremulant.',
  material: 'Metal pipes (tin/lead alloy) reflect high frequencies well: a clear, bright tone. Wooden pipes absorb highs: a warm, fluty tone.',
  type: 'Flue pipes: a jet of air strikes the upper lip and makes the air column vibrate. Reed pipes: a brass tongue vibrates against a shallot — a piercing, trumpet-like tone that cannot overblow.',
  stopped: 'A stopped (capped) pipe is closed at the top: the same length sounds one octave lower and even harmonics nearly disappear — a hollow, flute-like tone.',
  chimney: 'The chimney (Rohrflöte): a small open tube through the cap of a stopped pipe. It adds its own resonance, partially restores even harmonics and gives the typical hollow, slightly reedy flute timbre.',
  ranks: 'Number of pipes speaking together (like a céleste rank). Two ranks with a detune offset produce slow, rolling beats — the "floating" voix céleste sound.',
  detune: 'Detune in cents between the ranks. 1–3 cents gives a gentle waver (undamus), 4–8 cents a pronounced céleste beat, more than 10 cents sounds out of tune.',
  shallot: 'The shallot is the brass tube against which the reed tongue vibrates. An open (expressive) shallot gives a bright trumpet tone; a closed (capped) shallot gives the narrow, vocal vox humana character.',
  tongue: 'Length of the brass reed tongue. A shorter tongue vibrates faster and brighter (vox humana); a longer tongue gives a fuller, heavier trumpet tone.',
};

function Info({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-wrap">
      <button
        className="info-btn"
        aria-label="Info"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
      >
        i
      </button>
      {open && (
        <span className="info-pop" role="tooltip" onClick={() => setOpen(false)}>
          {text}
        </span>
      )}
    </span>
  );
}

function Slider({ id, label, unit, min, max, step, value, onChange, format, disabledZones }) {
  const zones = disabledZones || [];
  return (
    <label className="ctl">
      <span className="ctl-label">
        {label} <Info text={INFOS[id]} />
        <em className="ctl-val">
          {format ? format(value) : value}
          {unit}
        </em>
      </span>
      <div className="range-wrap">
        {zones.map((z, i) => (
          <div
            key={i}
            className="range-shade"
            style={{
              left: ((z.min - min) / (max - min)) * 100 + '%',
              width: ((z.max - z.min) / (max - min)) * 100 + '%',
            }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      {zones.length > 0 && <span className="range-note">Grey = would not speak</span>}
    </label>
  );
}

export default function ControlPanel() {
  const params = useStore((s) => s.params);
  const setParam = useStore((s) => s.setParam);
  const setMaterial = useStore((s) => s.setMaterial);
  const setType = useStore((s) => s.setType);
  const applyPreset = useStore((s) => s.applyPreset);
  const playing = useStore((s) => s.playing);
  const toggleWind = useStore((s) => s.toggleWind);
  const cutaway = useStore((s) => s.cutaway);
  const toggleCutaway = useStore((s) => s.toggleCutaway);
  const responses = useMemo(() => rankResponses(params), [params]);
  const response = responses[0];
  const pRange = useMemo(() => (params.type === 'reed' ? null : playablePressureRange(params)), [params]);
  const cRange = useMemo(() => (params.type === 'reed' ? null : playableCutupRange(params)), [params]);

  const fmtM = (v) => (v * 100).toFixed(1) + ' cm';
  const fmtMM = (v) => (v * 1000).toFixed(1) + ' mm';
  const fmtPa = (v) => Math.round(v) + ' Pa';
  const isReed = params.type === 'reed';

  return (
    <aside className="panel">
      <h2>Pipe Simulator</h2>

      <div className="btn-row">
        <button className={playing ? 'primary on' : 'primary'} onClick={toggleWind}>
          {playing ? '◼ Stop Wind' : '▶ Send Wind'}
        </button>
        <button className={cutaway ? 'ghost on' : 'ghost'} onClick={toggleCutaway}>
          {cutaway ? 'Cutaway' : 'Solid'}
        </button>
      </div>

      <div className="status" data-ok={response.status.startsWith('Speaking')}>
        <strong>{response.status}</strong>
        {response.valid && (
          <span>
            {response.note.name}
            {response.note.cents >= 0 ? '+' : ''}
            {response.note.cents} cent · {response.fs.toFixed(1)} Hz
            {responses.length > 1 && ` · ${responses.length} ranks`}
          </span>
        )}
      </div>

      <h3>Presets</h3>
      <div className="btn-row wrap">
        {Object.entries(PRESETS).map(([name, p]) => (
          <button key={name} className="seg" onClick={() => applyPreset(name)}>
            {p.label}
          </button>
        ))}
      </div>

      <h3>Type <Info text={INFOS.type} /></h3>
      <div className="btn-row">
        <button className={!isReed ? 'seg on' : 'seg'} onClick={() => setType('flue')}>Flue</button>
        <button className={isReed ? 'seg on' : 'seg'} onClick={() => setType('reed')}>Reed</button>
        <button
          className={params.stopped ? 'seg on' : 'seg'}
          onClick={() => setParam('stopped', !params.stopped)}
        >
          {params.stopped ? 'Stopped ✓' : 'Stopped'}
        </button>
      </div>

      <h3>Material <Info text={INFOS.material} /></h3>
      <div className="btn-row">
        {['metal', 'wood'].map((m) => (
          <button
            key={m}
            className={params.material === m ? 'seg on' : 'seg'}
            onClick={() => setMaterial(m)}
          >
            {m === 'metal' ? 'Metal' : 'Wood'}
          </button>
        ))}
      </div>

      <h3>Pipe length</h3>
      <div className="btn-row wrap feet">
        {FEET_OPTIONS.map((f) => (
          <button
            key={f}
            className={params.feet === f ? 'seg on' : 'seg'}
            onClick={() => setParam('feet', f)}
          >
            {FOOT_LABELS[f]}
          </button>
        ))}
      </div>
      <Slider id="fine" label="Fine tuning" unit=" mm" min={-50} max={50} step={1} value={params.fineMM} onChange={(v) => setParam('fineMM', v)} />

      {params.stopped && !isReed && (
        <Slider
          id="chimney"
          label="Chimney (Rohrflöte)"
          unit=""
          min={0}
          max={0.3}
          step={0.005}
          value={params.chimney}
          onChange={(v) => setParam('chimney', v)}
          format={fmtM}
        />
      )}

      {isReed && (
        <>
          <h3>Reed (tongwerk)</h3>
          <div className="btn-row">
            {['open', 'closed'].map((s) => (
              <button
                key={s}
                className={params.shallot === s ? 'seg on' : 'seg'}
                onClick={() => setParam('shallot', s)}
              >
                {s === 'open' ? 'Open shallot' : 'Closed shallot'}
              </button>
            ))}
          </div>
          <Slider
            id="tongue"
            label="Tongue length"
            unit=""
            min={0.02}
            max={0.12}
            step={0.001}
            value={params.tongueLength}
            onChange={(v) => setParam('tongueLength', v)}
            format={fmtMM}
          />
        </>
      )}

      <h3>Ranks (céleste)</h3>
      <div className="btn-row">
        {[1, 2, 3].map((r) => (
          <button
            key={r}
            className={params.ranks === r ? 'seg on' : 'seg'}
            onClick={() => setParam('ranks', r)}
          >
            {r} {r === 1 ? 'pipe' : 'ranks'}
          </button>
        ))}
      </div>
      {params.ranks > 1 && (
        <Slider
          id="detune"
          label="Detune"
          unit=" cents"
          min={0}
          max={12}
          step={0.5}
          value={params.detuneCents}
          onChange={(v) => setParam('detuneCents', v)}
        />
      )}

      <h3>Dimensions</h3>
      <Slider id="width" label="Width" unit="" min={0.02} max={0.3} step={0.002} value={params.width} onChange={(v) => setParam('width', v)} format={fmtM} />
      {params.material === 'wood' && !isReed && (
        <Slider id="depth" label="Depth" unit="" min={0.02} max={0.3} step={0.002} value={params.depth} onChange={(v) => setParam('depth', v)} format={fmtM} />
      )}
      <Slider id="wall" label="Wall thickness" unit="" min={0.0004} max={0.02} step={0.0002} value={params.wallThickness} onChange={(v) => setParam('wallThickness', v)} format={fmtMM} />

      {!isReed && (
        <>
          <h3>Mouth</h3>
          <Slider
            id="cutup"
            label="Cut-up"
            unit=""
            min={0.003}
            max={0.06}
            step={0.0005}
            value={params.cutup}
            onChange={(v) => setParam('cutup', v)}
            format={fmtMM}
            disabledZones={[
              ...(cRange && !cRange.empty ? [{ min: 0.003, max: Math.min(cRange.min, 0.06) }] : []),
              ...(cRange && !cRange.empty && cRange.max < 0.06 ? [{ min: cRange.max, max: 0.06 }] : []),
            ]}
          />
          <Slider id="flue" label="Flue gap" unit="" min={0.0003} max={0.004} step={0.00005} value={params.flueGap} onChange={(v) => setParam('flueGap', v)} format={fmtMM} />
        </>
      )}

      <h3>Wind</h3>
      <Slider
        id="pressure"
        label="Wind pressure"
        unit=""
        min={50}
        max={1200}
        step={10}
        value={params.pressure}
        onChange={(v) => setParam('pressure', v)}
        format={fmtPa}
        disabledZones={[
          ...(pRange && !pRange.empty && pRange.min > 50 ? [{ min: 50, max: Math.min(pRange.min, 1200) }] : []),
          ...(pRange && !pRange.empty && pRange.max < 1200 ? [{ min: pRange.max, max: 1200 }] : []),
        ]}
      />

      <h3>Tremulant</h3>
      <Slider id="tremRate" label="Rate" unit=" Hz" min={0} max={10} step={0.1} value={params.tremulantRate} onChange={(v) => setParam('tremulantRate', v)} />
      <Slider id="tremDepth" label="Depth" unit="" min={0} max={1} step={0.01} value={params.tremulantDepth} onChange={(v) => setParam('tremulantDepth', v)} />

      <div className="hint">
        Jet speed ≈ {response.v.toFixed(1)} m/s
        {!isReed && <> · Strouhal ≈ {response.St > 0 ? response.St.toFixed(3) : '—'}</>}
        {response.formants.length > 0 && <> · formant ≈ {Math.round(response.formants[0].freq)} Hz</>}
      </div>

      <h3>Spectrum</h3>
      <div className="spectrum">
        {response.harmonics.map((h) => (
          <div
            key={h.k}
            className={'bar' + (h.amp <= 0.0005 ? ' off' : '')}
            style={{ '--h': Math.max(2, (Math.sqrt(h.amp) * 100) | 0) + '%' }}
            title={`Harmonic ${h.k}: ${(h.freq).toFixed(0)} Hz`}
          />
        ))}
      </div>
      <div className="hint">
        {N_HARMONICS} harmonics · level ≈{' '}
        {isFinite(response.levelDb) ? response.levelDb.toFixed(1) + ' dB' : '—'}
      </div>
    </aside>
  );
}
