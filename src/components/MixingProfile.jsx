import React from 'react';

const METHODS = [
  'Ball Mill', 'Shear Mixer', 'Ultrasonic', 'Planetary Mixer',
  'Manual Stir', 'Magnetic Stir', 'Roll Mill', 'Other'
];

const EMPTY_STEP = {
  method: 'Ball Mill', duration: '', unit: 'min', notes: '',
};

export default function MixingProfile({ value = [], onChange }) {
  function addStep() {
    const prev = value[value.length - 1];
    onChange([...value, prev ? { ...EMPTY_STEP, method: prev.method } : { ...EMPTY_STEP }]);
  }
  function removeStep(i) { onChange(value.filter((_, idx) => idx !== i)); }
  function updateStep(i, field, val) {
    onChange(value.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  return (
    <div>
      {value.map((step, i) => (
        <div key={i} style={{
          background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
          marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%', background: 'var(--copper-glow)',
            color: 'var(--copper-lt)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
            flexShrink: 0, marginTop: 18 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="label" style={{ fontSize: 10 }}>Method</label>
            <select value={step.method} onChange={e => updateStep(i, 'method', e.target.value)}
              style={{ fontSize: 12 }}>
              {METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ width: 80 }}>
            <label className="label" style={{ fontSize: 10 }}>Duration</label>
            <input type="number" inputMode="decimal" value={step.duration}
              onChange={e => updateStep(i, 'duration', e.target.value)}
              placeholder="0" style={{ fontSize: 12 }} />
          </div>
          <div style={{ width: 70 }}>
            <label className="label" style={{ fontSize: 10 }}>Unit</label>
            <select value={step.unit} onChange={e => updateStep(i, 'unit', e.target.value)}
              style={{ fontSize: 12 }}>
              <option value="min">min</option>
              <option value="hr">hr</option>
              <option value="day">day</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 140 }}>
            <label className="label" style={{ fontSize: 10 }}>Notes</label>
            <input value={step.notes} placeholder="e.g. in ice bath, 30s on/off..."
              onChange={e => updateStep(i, 'notes', e.target.value)}
              style={{ fontSize: 12 }} />
          </div>
          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-danger btn-sm" onClick={() => removeStep(i)}
              style={{ padding: '5px 9px' }}>✕</button>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addStep}>+ Add Mixing Step</button>
      {value.length === 0 && (
        <div className="hint" style={{ marginTop: 6 }}>
          Add mixing steps in sequence. Each step has method, duration, and optional notes.
        </div>
      )}
    </div>
  );
}

export function serializeMixingProfile(steps) {
  if (!steps || steps.length === 0) return '';
  return steps.map(s => `${s.method}|${s.duration}|${s.unit}|${s.notes || ''}`).join(';;');
}

export function deserializeMixingProfile(str) {
  if (!str) return [];
  return str.split(';;').filter(Boolean).map(s => {
    const [method, duration, unit, notes] = s.split('|');
    return { method: method || 'Ball Mill', duration: duration || '', unit: unit || 'min', notes: notes || '' };
  });
}
