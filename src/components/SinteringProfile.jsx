import React from 'react';

const ATMOSPHERES = ['Air', 'N₂', 'N₂/H₂ Forming Gas', 'Argon', 'Vacuum', 'Other'];

const EMPTY_STEP = {
  setTemp: '', rampRate: '', rampUnit: '°C/min', dwell: '', dwellUnit: 'min', atmosphere: 'N₂',
};

export default function SinteringProfile({ value = [], onChange }) {
  function addStep() {
    const prev = value[value.length - 1];
    onChange([...value, prev
      ? { ...EMPTY_STEP, atmosphere: prev.atmosphere }
      : { ...EMPTY_STEP }
    ]);
  }

  function removeStep(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function updateStep(i, field, val) {
    onChange(value.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Step', 'Set Temp (°C)', 'Ramp Rate', 'Unit', 'Dwell', 'Unit', 'Atmosphere', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '7px 8px', textAlign: 'left', color: 'var(--muted)',
                    fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.map((step, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 90 }}>
                    <input
                      type="number" inputMode="decimal"
                      value={step.setTemp}
                      onChange={e => updateStep(i, 'setTemp', e.target.value)}
                      placeholder="e.g. 400"
                      style={{ padding: '5px 8px', fontSize: 12 }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 80 }}>
                    <input
                      type="number" inputMode="decimal"
                      value={step.rampRate}
                      onChange={e => updateStep(i, 'rampRate', e.target.value)}
                      placeholder="e.g. 1"
                      style={{ padding: '5px 8px', fontSize: 12 }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 100 }}>
                    <select value={step.rampUnit}
                      onChange={e => updateStep(i, 'rampUnit', e.target.value)}
                      style={{ padding: '5px 8px', fontSize: 12 }}>
                      <option>°C/min</option>
                      <option>°C/hr</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 80 }}>
                    <input
                      type="number" inputMode="decimal"
                      value={step.dwell}
                      onChange={e => updateStep(i, 'dwell', e.target.value)}
                      placeholder="e.g. 60"
                      style={{ padding: '5px 8px', fontSize: 12 }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 80 }}>
                    <select value={step.dwellUnit}
                      onChange={e => updateStep(i, 'dwellUnit', e.target.value)}
                      style={{ padding: '5px 8px', fontSize: 12 }}>
                      <option>min</option>
                      <option>hr</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px 6px', minWidth: 130 }}>
                    <select value={step.atmosphere}
                      onChange={e => updateStep(i, 'atmosphere', e.target.value)}
                      style={{ padding: '5px 8px', fontSize: 12 }}>
                      {ATMOSPHERES.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => removeStep(i)}
                      style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {value.length < 10 && (
        <button className="btn btn-secondary btn-sm" onClick={addStep}>
          + Add Step {value.length > 0 ? `(${value.length}/10)` : ''}
        </button>
      )}
      {value.length === 0 && (
        <div className="hint" style={{ marginTop: 6 }}>
          Add up to 10 sintering steps. Each step: target temperature, ramp rate to reach it, dwell time at that temperature, atmosphere.
        </div>
      )}
    </div>
  );
}

// Serialize for Sheets storage
export function serializeSinteringProfile(steps) {
  if (!steps || steps.length === 0) return '';
  return steps.map(s =>
    `${s.setTemp}|${s.rampRate}|${s.rampUnit}|${s.dwell}|${s.dwellUnit}|${s.atmosphere}`
  ).join(';;');
}

// Deserialize from Sheets
export function deserializeSinteringProfile(str) {
  if (!str) return [];
  return str.split(';;').filter(Boolean).map(s => {
    const [setTemp, rampRate, rampUnit, dwell, dwellUnit, atmosphere] = s.split('|');
    return {
      setTemp: setTemp || '',
      rampRate: rampRate || '',
      rampUnit: rampUnit || '°C/min',
      dwell: dwell || '',
      dwellUnit: dwellUnit || 'min',
      atmosphere: atmosphere || 'N₂',
    };
  });
}
