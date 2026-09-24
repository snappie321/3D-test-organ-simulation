import { useMemo } from 'react';
import { useStore } from '../store.js';
import { computeResponse, PRESETS, N_HARMONICS } from '../physics/pipePhysics.js';

function Slider({ label, unit, min, max, step, value, onChange, format }) {
  return (
    <label className="ctl">
      <span className="ctl-label">
        {label}
        <em className="ctl-val">
          {format ? format(value) : value}
          {unit}
        </em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export default function ControlPanel() {
  const params = useStore((s) => s.params);
  const setParam = useStore((s) => s.setParam);
  const setMaterial = useStore((s) => s.setMaterial);
  const applyPreset = useStore((s) => s.applyPreset);
  const playing = useStore((s) => s.playing);
  const toggleWind = useStore((s) => s.toggleWind);
  const cutaway = useStore((s) => s.cutaway);
  const toggleCutaway = useStore((s) => s.toggleCutaway);
  const response = useMemo(() => computeResponse(params), [params]);

  const fmtM = (v) => (v * 100).toFixed(1) + ' cm';
  const fmtMM = (v) => (v * 1000).toFixed(1) + ' mm';
  const fmtPa = (v) => Math.round(v) + ' Pa';

  return (
    <aside className="panel">
      <h2>Pipe Simulator</h2>

      <div className="btn-row">
        <button
          className={playing ? 'primary on' : 'primary'}
          onClick={toggleWind}
        >
          {playing ? '◼ Stop Wind' : '▶ Send Wind'}
        </button>
        <button className={cutaway ? 'ghost on' : 'ghost'} onClick={toggleCutaway}>
          {cutaway ? 'Cutaway' : 'Solid'}
        </button>
      </div>

      <div className="status" data-ok={response.status === 'Speaking'}>
        <strong>{response.status}</strong>
        {response.valid && (
          <span>
            {response.note.name}
            {response.note.cents >= 0 ? '+' : ''}
            {response.note.cents} cent · {response.fs.toFixed(1)} Hz
          </span>
        )}
      </div>

      <h3>Material</h3>
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

      <h3>Presets</h3>
      <div className="btn-row wrap">
        {Object.entries(PRESETS).map(([name, p]) => (
          <button key={name} className="seg" onClick={() => applyPreset(name)}>
            {p.label}
          </button>
        ))}
      </div>

      <h3>Dimensions</h3>
      <Slider label="Length" unit="" min={0.1} max={3} step={0.01} value={params.length} onChange={(v) => setParam('length', v)} format={fmtM} />
      <Slider label="Width" unit="" min={0.02} max={0.3} step={0.002} value={params.width} onChange={(v) => setParam('width', v)} format={fmtM} />
      {params.material === 'wood' && (
        <Slider label="Depth" unit="" min={0.02} max={0.3} step={0.002} value={params.depth} onChange={(v) => setParam('depth', v)} format={fmtM} />
      )}
      <Slider label="Wall thickness" unit="" min={0.0004} max={0.02} step={0.0002} value={params.wallThickness} onChange={(v) => setParam('wallThickness', v)} format={fmtMM} />

      <h3>Mouth</h3>
      <Slider label="Cut-up" unit="" min={0.004} max={0.06} step={0.0005} value={params.cutup} onChange={(v) => setParam('cutup', v)} format={fmtMM} />
      <Slider label="Flue gap" unit="" min={0.0003} max={0.004} step={0.00005} value={params.flueGap} onChange={(v) => setParam('flueGap', v)} format={fmtMM} />

      <h3>Wind</h3>
      <Slider label="Wind pressure" unit="" min={50} max={1200} step={10} value={params.pressure} onChange={(v) => setParam('pressure', v)} format={fmtPa} />
      <div className="hint">
        Jet speed ≈ {response.v.toFixed(1)} m/s · Strouhal ≈{' '}
        {response.St > 0 ? response.St.toFixed(3) : '—'}
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
