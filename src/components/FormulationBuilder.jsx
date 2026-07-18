import React, { useState, useEffect } from 'react';

// ── Known densities for vol% ↔ wt% conversion ──────────
const DENSITIES = {
  'Copper': 8.96, 'Silver': 10.49, 'Bronze': 8.73, 'Gold': 19.32,
  'HDDA': 1.02, 'TMPTA': 1.06, 'PEGDA 250': 1.12, 'PEGDA 400': 1.13,
  'PEGDA 700': 1.10, 'IBOA': 1.03, 'PEA': 1.05, 'TPGDA': 1.06,
  'BEDA': 1.04,
};

// ── Component library with default units ─────────────────
export const COMPONENT_LIBRARY = {
  'Monomer': [
    'HDDA','TMPTA','PEGDA 250','PEGDA 400','PEGDA 700',
    'IBOA','PEA','TPGDA','BEDA',
  ],
  'Photoinitiator': ['BAPO','TPO','ITX','DETX','CQ','Speedcure 938'],
  'Metal Filler': ['Copper','Silver','Bronze','Gold'],
  'Dispersant': ['BYK-111','BYK-180','Solsperse 32000','Solsperse 41000','DISPERBYK-145','Triton X-100'],
  'Rheology Modifier': ['Fumed Silica (Aerosil 200)','Fumed Silica (R972)','Bentone'],
  'Coupling Agent': ['3-MPS','APTMS','Oleic Acid','Stearic Acid'],
  'Inhibitor / Additive': ['MEHQ','BHT','Sudan I','Tinuvin 400'],
  'Other': [],
};

const DEFAULT_UNITS = {
  'Monomer': 'wt% of resin',
  'Photoinitiator': 'wt% of monomer',
  'Metal Filler': 'vol% of total',
  'Dispersant': 'wt% of metal',
  'Rheology Modifier': 'wt% of total',
  'Coupling Agent': 'wt% of metal',
  'Inhibitor / Additive': 'wt% of monomer',
  'Other': 'wt% of total',
};

const UNITS = [
  'vol% of total',
  'wt% of total',
  'wt% of resin',
  'wt% of monomer',
  'wt% of metal',
];

// ── Calculation engine ────────────────────────────────────
function calculate(components, totalBatch) {
  if (!totalBatch || totalBatch <= 0) return components.map(c => ({ ...c, grams: null, extraInfo: null }));

  // Pass 1: compute metal grams from vol%
  let metalGrams = 0;
  let resinGrams = 0;
  let monomerGrams = 0;

  // First, compute metal from vol%
  components.forEach(c => {
    if (c.category === 'Metal Filler' && c.unit === 'vol% of total' && c.amount) {
      const density = DENSITIES[c.name] || 8.96;
      // vol% → grams: solve for metal mass given vol% and total batch mass
      // volFrac = (metal_g / density) / (total_g / rho_avg)
      // Approximate: rho_avg ≈ 1.05 for resin phase
      // metal_g / density = volFrac * total_g / rho_mix
      // Use exact: metal_vol = volFrac * total_batch / rho_effective
      // rho_effective = metal_vol_fraction * density + resin_vol_fraction * 1.05
      // Solve: m_g = volFrac * density * total_batch / (volFrac * density + (1 - volFrac) * 1.05)
      const vf = c.amount / 100;
      const grams = (vf * density * totalBatch) / (vf * density + (1 - vf) * 1.05);
      metalGrams += grams;
    }
    if (c.category === 'Metal Filler' && c.unit === 'wt% of total' && c.amount) {
      metalGrams += (c.amount / 100) * totalBatch;
    }
  });

  resinGrams = totalBatch - metalGrams;

  // Pass 2: compute monomer grams (wt% of resin)
  let monomerPct = 0;
  components.forEach(c => {
    if (c.category === 'Monomer' && c.unit === 'wt% of resin' && c.amount) {
      monomerPct += parseFloat(c.amount) || 0;
    }
  });
  monomerGrams = (monomerPct / 100) * resinGrams;

  // Pass 3: compute each component's grams
  return components.map(c => {
    if (!c.amount || !c.name) return { ...c, grams: null, extraInfo: null };
    const amt = parseFloat(c.amount) || 0;
    let grams = null;
    let extraInfo = null;

    if (c.category === 'Metal Filler') {
      if (c.unit === 'vol% of total') {
        const density = DENSITIES[c.name] || 8.96;
        const vf = amt / 100;
        grams = (vf * density * totalBatch) / (vf * density + (1 - vf) * 1.05);
        // Show wt% reference
        const wtPct = (grams / totalBatch) * 100;
        extraInfo = `= ${wtPct.toFixed(1)} wt%`;
      } else if (c.unit === 'wt% of total') {
        grams = (amt / 100) * totalBatch;
        // Show vol% reference
        const density = DENSITIES[c.name] || 8.96;
        const metalVol = grams / density;
        const totalVol = totalBatch / 1.05;
        const volPct = (metalVol / totalVol) * 100;
        extraInfo = `= ${volPct.toFixed(1)} vol%`;
      }
    } else if (c.unit === 'wt% of total') {
      grams = (amt / 100) * totalBatch;
    } else if (c.unit === 'wt% of resin') {
      grams = resinGrams > 0 ? (amt / 100) * resinGrams : null;
    } else if (c.unit === 'wt% of monomer') {
      grams = monomerGrams > 0 ? (amt / 100) * monomerGrams : null;
    } else if (c.unit === 'wt% of metal') {
      grams = metalGrams > 0 ? (amt / 100) * metalGrams : null;
    }

    return { ...c, grams, extraInfo };
  });
}

// ── Summary block ─────────────────────────────────────────
function Summary({ computed, totalBatch }) {
  let metalG = 0, resinG = 0;
  computed.forEach(c => {
    if (c.category === 'Metal Filler' && c.grams) metalG += c.grams;
    else if (c.grams) resinG += c.grams;
  });
  const total = metalG + resinG;
  const remaining = totalBatch ? totalBatch - total : null;
  const pct = totalBatch ? Math.min(100, Math.round((total / totalBatch) * 100)) : 0;
  const overTarget = remaining !== null && remaining < -0.5;
  const onTarget = remaining !== null && Math.abs(remaining) <= 0.5;

  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px',
      marginTop: 12, fontSize: 12, fontFamily: 'var(--mono)',
    }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ color: 'var(--muted)' }}>Metal: <strong style={{ color: 'var(--text)' }}>{metalG.toFixed(2)}g</strong></span>
        <span style={{ color: 'var(--muted)' }}>Resin: <strong style={{ color: 'var(--text)' }}>{resinG.toFixed(2)}g</strong></span>
        <span style={{ color: 'var(--muted)' }}>Total: <strong style={{ color: overTarget ? 'var(--danger)' : onTarget ? 'var(--success)' : 'var(--text)' }}>{total.toFixed(2)}g</strong></span>
        {remaining !== null && (
          <span style={{ color: overTarget ? 'var(--danger)' : onTarget ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
            {overTarget ? `⚠ ${Math.abs(remaining).toFixed(2)}g over target` : onTarget ? '✓ On target' : `${remaining.toFixed(2)}g remaining`}
          </span>
        )}
      </div>
      {totalBatch > 0 && (
        <div style={{ position: 'relative', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
            width: `${pct}%`,
            background: overTarget ? 'var(--danger)' : onTarget ? 'var(--success)' : 'var(--copper)',
            transition: 'width 0.3s',
          }} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function FormulationBuilder({ value = [], onChange, totalBatch }) {
  const [customNames, setCustomNames] = useState([]);
  const [newCustom, setNewCustom] = useState('');
  const [newCategory, setNewCategory] = useState('Other');

  // On mount and when value changes, auto-register any component names
  // not in the built-in library so they show correctly in the dropdown
  useEffect(() => {
    const allLibraryNames = Object.values(COMPONENT_LIBRARY).flat();
    const missing = value
      .filter(r => r.name && !allLibraryNames.includes(r.name))
      .map(r => ({ name: r.name, category: r.category || 'Other' }));
    if (missing.length > 0) {
      setCustomNames(prev => {
        const existingNames = prev.map(c => c.name);
        const toAdd = missing.filter(m => !existingNames.includes(m.name));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      });
    }
  }, [value]);

  const computed = calculate(value, parseFloat(totalBatch) || 0);

  function addRow() {
    onChange([...value, { name: '', category: 'Monomer', amount: '', unit: 'wt% of resin' }]);
  }

  function updateRow(i, field, val) {
    const updated = value.map((r, idx) => {
      if (idx !== i) return r;
      const newRow = { ...r, [field]: val };
      // Auto-set unit when category changes
      if (field === 'category') newRow.unit = DEFAULT_UNITS[val] || 'wt% of total';
      // Auto-set category when name selected from library
      if (field === 'name') {
        for (const [cat, names] of Object.entries(COMPONENT_LIBRARY)) {
          if (names.includes(val)) { newRow.category = cat; newRow.unit = DEFAULT_UNITS[cat]; break; }
        }
      }
      return newRow;
    });
    onChange(updated);
  }

  function removeRow(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function addCustomName() {
    if (!newCustom.trim()) return;
    setCustomNames(prev => [...prev, { name: newCustom.trim(), category: newCategory }]);
    onChange([...value, { name: newCustom.trim(), category: newCategory, amount: '', unit: DEFAULT_UNITS[newCategory] || 'wt% of total' }]);
    setNewCustom('');
  }

  // All names including custom
  const allNames = Object.entries(COMPONENT_LIBRARY).flatMap(([cat, names]) =>
    names.map(n => ({ name: n, category: cat }))
  ).concat(customNames);

  return (
    <div>
      {/* Component rows */}
      {value.map((row, i) => {
        const comp = computed[i];
        return (
          <div key={i} style={{
            background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
            marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap',
          }}>
            {/* Name */}
            <div style={{ flex: 2, minWidth: 140 }}>
              <label className="label" style={{ fontSize: 10 }}>Component</label>
              <select value={row.name} onChange={e => updateRow(i, 'name', e.target.value)}>
                <option value="">— Select —</option>
                {Object.entries(COMPONENT_LIBRARY).map(([cat, names]) => (
                  <optgroup key={cat} label={cat}>
                    {names.map(n => <option key={n} value={n}>{n}</option>)}
                    {customNames.filter(c => c.category === cat).map(c => (
                      <option key={c.name} value={c.name}>{c.name} ★</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div style={{ width: 80 }}>
              <label className="label" style={{ fontSize: 10 }}>Amount</label>
              <input
                type="number" inputMode="decimal" step="any"
                value={row.amount}
                onChange={e => updateRow(i, 'amount', e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Unit */}
            <div style={{ flex: 1, minWidth: 130 }}>
              <label className="label" style={{ fontSize: 10 }}>Unit</label>
              <select value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Calculated grams */}
            <div style={{ width: 90, paddingTop: 18 }}>
              {comp?.grams != null ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                  <span style={{ color: 'var(--copper-lt)', fontWeight: 600 }}>{comp.grams.toFixed(2)}g</span>
                  {comp.extraInfo && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{comp.extraInfo}</div>
                  )}
                </div>
              ) : (
                <span style={{ color: 'var(--faint)', fontSize: 11 }}>—</span>
              )}
            </div>

            {/* Remove */}
            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-danger btn-sm" onClick={() => removeRow(i)}
                style={{ padding: '5px 9px' }}>✕</button>
            </div>
          </div>
        );
      })}

      {/* Add known component */}
      <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginRight: 8 }}>
        + Add Component
      </button>

      {/* Add custom component */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label className="label">New Component (not in list)</label>
          <input placeholder="e.g. Camphor, HPMA..."
            value={newCustom} onChange={e => setNewCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomName(); } }}
          />
        </div>
        <div style={{ width: 140 }}>
          <label className="label">Category</label>
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
            {Object.keys(COMPONENT_LIBRARY).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={addCustomName}
          style={{ marginBottom: 1 }}>+ Add Custom</button>
      </div>

      <div className="hint" style={{ marginTop: 6 }}>
        Custom components are remembered for this session. Type the name, select category, press Enter or click Add Custom.
      </div>

      {/* Summary */}
      {value.some(c => c.grams !== undefined) && (
        <Summary computed={computed} totalBatch={parseFloat(totalBatch) || 0} />
      )}
    </div>
  );
}

// ── Serialization for Google Sheets storage ───────────────
export function serializeFormulation(components) {
  if (!components || components.length === 0) return '';
  return components.map(c =>
    `${c.name}|${c.category}|${c.amount}|${c.unit}`
  ).join(';;');
}

export function deserializeFormulation(str) {
  if (!str) return [];
  return str.split(';;').filter(Boolean).map(s => {
    const [name, category, amount, unit] = s.split('|');
    return { name: name || '', category: category || 'Other', amount: amount || '', unit: unit || 'wt% of total' };
  });
}
