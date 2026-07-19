import React, { useState } from 'react';

// ── Dispersant Calculator ─────────────────────────────────
const DISPERSANTS = [
  { name: 'BYK-111',        defaultA: 3.0, note: 'Phosphoric acid ester — datasheet: 2–4 mg/m²' },
  { name: 'BYK-180',        defaultA: 3.0, note: 'Acrylate copolymer — datasheet: 2–4 mg/m²' },
  { name: 'BYK-2013',       defaultA: 2.5, note: 'Polyurethane — estimated: 2–3 mg/m²' },
  { name: 'Solsperse 32000',defaultA: 4.0, note: 'Polyamine — literature: 3–5 mg/m²' },
  { name: 'Solsperse 41000',defaultA: 4.0, note: 'Polyamine — literature: 3–5 mg/m²' },
  { name: 'DISPERBYK-145',  defaultA: 4.5, note: 'Phosphate ester — literature: 3–6 mg/m²' },
  { name: 'Triton X-100',   defaultA: 2.0, note: 'Nonionic surfactant — literature: 1–3 mg/m²' },
];

function DispersantCalc() {
  const [dispersant, setDispersant] = useState('BYK-111');
  const [metal, setMetal] = useState('Copper');
  const [particleSize, setParticleSize] = useState('1');
  const [adsorption, setAdsorption] = useState('3');
  const [safetyFactor, setSafetyFactor] = useState('1.2');
  const [metalWeight, setMetalWeight] = useState('');

  const d = parseFloat(particleSize) || 0;
  const A = parseFloat(adsorption) || 0;
  const sf = parseFloat(safetyFactor) || 1;
  const mw = parseFloat(metalWeight) || 0;
  const metalData = METAL_SSA[metal] || METAL_SSA.Copper;
  const k = metalData.k; // SSA constant = 6/density

  // SSA (m²/g) = k/d where k = 6/density, d in µm
  const SSA = d > 0 ? (k / d) : 0;
  const wt_pct_base = A > 0 && d > 0 ? (A * SSA) / 10 : 0;
  const wt_pct = wt_pct_base * sf;
  const grams = mw > 0 ? (wt_pct / 100) * mw : null;

  function onDispersantChange(name) {
    setDispersant(name);
    const found = DISPERSANTS.find(d => d.name === name);
    if (found) setAdsorption(String(found.defaultA));
  }

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Dispersant Calculator</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Calculates required dispersant concentration based on particle surface area.
        Formula: BYK wt% = (A × SSA) / 10, where SSA ≈ 0.67/d (m²/g) for spherical copper.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Dispersant</label>
          <select value={dispersant} onChange={e => onDispersantChange(e.target.value)}>
            {DISPERSANTS.map(d => <option key={d.name}>{d.name}</option>)}
          </select>
          <div className="hint">{DISPERSANTS.find(d => d.name === dispersant)?.note}</div>
        </div>
        <div className="form-group">
          <label className="label">Metal Powder</label>
          <select value={metal} onChange={e => setMetal(e.target.value)}>
            {Object.keys(METAL_SSA).map(m => (
              <option key={m}>{m} (ρ={METAL_SSA[m].density} g/cm³)</option>
            ))}
          </select>
          <div className="hint">SSA constant k = {k.toFixed(4)} (= 6/ρ)</div>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Particle Size (µm)</label>
        <input type="number" inputMode="decimal" value={particleSize}
          onChange={e => setParticleSize(e.target.value)} placeholder="e.g. 1" style={{ maxWidth: 200 }} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="label">Adsorption Density (mg/m²)</label>
          <input type="number" inputMode="decimal" value={adsorption}
            onChange={e => setAdsorption(e.target.value)} placeholder="2–4 typical" />
          <div className="hint">Low=2, Medium=3, High=4 mg/m²</div>
        </div>
        <div className="form-group">
          <label className="label">Safety Factor</label>
          <input type="number" inputMode="decimal" value={safetyFactor}
            onChange={e => setSafetyFactor(e.target.value)} placeholder="1.0–1.5" />
          <div className="hint">1.0 = exact theory, 1.2–1.5 = practical safety margin</div>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Metal Powder Weight (g) — optional</label>
        <input type="number" inputMode="decimal" value={metalWeight}
          onChange={e => setMetalWeight(e.target.value)} placeholder="e.g. 50" />
        <div className="hint">Enter to calculate actual grams needed</div>
      </div>

      {d > 0 && A > 0 && (
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SSA</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text)', fontWeight: 700 }}>
                {SSA.toFixed(3)} m²/g
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dispersant} Required</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, color: 'var(--copper-lt)', fontWeight: 700 }}>
                {wt_pct.toFixed(3)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>wt% of metal powder</div>
            </div>
            {grams !== null && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grams Needed</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 28, color: 'var(--success)', fontWeight: 700 }}>
                  {grams.toFixed(3)}g
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>for {metalWeight}g metal</div>
              </div>
            )}
          </div>

          {/* Particle size sweep */}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Required {dispersant} vs particle size (at {A} mg/m², safety ×{sf})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['Particle size (µm)', 'SSA (m²/g)', `${dispersant} wt%`, mw > 0 ? `Grams (for ${mw}g metal)` : null].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10,
                    color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0.2, 0.5, 1, 1.5, 2, 3, 5].map(ps => {
                const ssa = k / ps;
                const pct = ((A * ssa) / 10) * sf;
                const g = mw > 0 ? (pct / 100) * mw : null;
                const isCurrent = Math.abs(ps - d) < 0.01;
                return (
                  <tr key={ps} style={{ borderBottom: '1px solid var(--border)',
                    background: isCurrent ? 'rgba(200,118,26,0.08)' : 'transparent' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)' }}>
                      {ps}µm {isCurrent && <span style={{ color: 'var(--copper-lt)' }}>← current</span>}
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{ssa.toFixed(3)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--copper-lt)' }}>{pct.toFixed(3)}%</td>
                    {g !== null && (
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', color: 'var(--success)' }}>{g.toFixed(3)}g</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Vol% ↔ Wt% Converter ─────────────────────────────────
const METAL_DENSITIES = {
  Copper: 8.96, Silver: 10.49, Bronze: 8.73, Gold: 19.32,
  Aluminium: 2.70, Titanium: 4.51, Nickel: 8.91, Steel: 7.85,
};
const RESIN_DENSITY = 1.05;

function VolWtConverter() {
  const [metal, setMetal] = useState('Copper');
  const [mode, setMode] = useState('vol_to_wt'); // or 'wt_to_vol'
  const [inputVal, setInputVal] = useState('');
  const [totalBatch, setTotalBatch] = useState('');

  const d = METAL_DENSITIES[metal] || 8.96;
  const v = parseFloat(inputVal) || 0;
  const tb = parseFloat(totalBatch) || 0;

  let result = null;
  if (v > 0 && v < 100) {
    if (mode === 'vol_to_wt') {
      const vf = v / 100;
      const metalG = (vf * d * (tb || 100)) / (vf * d + (1 - vf) * RESIN_DENSITY);
      const wtPct = tb > 0 ? (metalG / tb) * 100 : (vf * d) / (vf * d + (1 - vf) * RESIN_DENSITY) * 100;
      result = { primary: wtPct, primaryLabel: 'wt% of total', secondary: tb > 0 ? metalG : null };
    } else {
      const wf = v / 100;
      const volPct = (wf / d) / (wf / d + (1 - wf) / RESIN_DENSITY) * 100;
      const metalG = tb > 0 ? wf * tb : null;
      result = { primary: volPct, primaryLabel: 'vol% of total', secondary: metalG };
    }
  }

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Vol% ↔ Wt% Converter</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Converts between volume percent and weight percent for metal-resin slurries.
        Resin density assumed {RESIN_DENSITY} g/cm³.
      </p>
      <div className="form-row">
        <div className="form-group">
          <label className="label">Metal</label>
          <select value={metal} onChange={e => setMetal(e.target.value)}>
            {Object.keys(METAL_DENSITIES).map(m => (
              <option key={m}>{m} ({METAL_DENSITIES[m]} g/cm³)</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Convert</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="vol_to_wt">vol% → wt%</option>
            <option value="wt_to_vol">wt% → vol%</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="label">{mode === 'vol_to_wt' ? 'Vol%' : 'Wt%'} Input</label>
          <input type="number" inputMode="decimal" value={inputVal}
            onChange={e => setInputVal(e.target.value)} placeholder="e.g. 30" />
        </div>
        <div className="form-group">
          <label className="label">Total Batch Weight (g) — optional</label>
          <input type="number" inputMode="decimal" value={totalBatch}
            onChange={e => setTotalBatch(e.target.value)} placeholder="e.g. 100" />
        </div>
      </div>

      {result && (
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {result.primaryLabel}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, color: 'var(--copper-lt)', fontWeight: 700 }}>
                {result.primary.toFixed(2)}%
              </div>
            </div>
            {result.secondary !== null && result.secondary !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Metal Weight
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 28, color: 'var(--success)', fontWeight: 700 }}>
                  {result.secondary.toFixed(2)}g
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>in {totalBatch}g batch</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cure Depth Estimator ──────────────────────────────────
const PHOTOINITIATORS = [
  { name: 'BAPO', sensitivity: 1.0, note: 'Strong at 405nm' },
  { name: 'TPO', sensitivity: 0.9, note: 'Similar to BAPO' },
  { name: 'ITX + BAPO', sensitivity: 1.4, note: 'Sensitized system, 2-3× faster' },
  { name: 'DETX + BAPO', sensitivity: 1.3, note: 'Alternative sensitizer' },
  { name: 'CQ', sensitivity: 0.4, note: 'Visible light, less efficient at 405nm' },
  { name: 'Speedcure 938', sensitivity: 1.1, note: 'Broad absorption' },
];

function CureDepthCalc() {
  const [pi, setPI] = useState('BAPO');
  const [piConc, setPiConc] = useState('1.5');
  const [metalVol, setMetalVol] = useState('30');
  const [exposure, setExposure] = useState('10');
  const [wavelength, setWavelength] = useState('405');

  const piData = PHOTOINITIATORS.find(p => p.name === pi) || PHOTOINITIATORS[0];
  const c = parseFloat(piConc) || 0;
  const mv = parseFloat(metalVol) || 0;
  const t = parseFloat(exposure) || 0;
  const wl = parseFloat(wavelength) || 405;

  // Dp (penetration depth) decreases with metal vol% — empirical approximation
  // At 0 vol%: Dp ~2000µm for clear resin at 405nm
  // At 30 vol% Cu: Dp ~60µm (copper absorbs ~60% of 405nm)
  // Linear approximation: Dp = 2000 * exp(-0.12 * vol%)
  const Dp = mv > 0 ? 2000 * Math.exp(-0.12 * mv) : 2000;

  // Critical energy Ec scales inversely with PI concentration and sensitivity
  // Approximate: Ec = 10 / (c * sensitivity) mJ/cm²
  const Ec = c > 0 ? 10 / (c * piData.sensitivity) : null;

  // Cure depth: Cd = Dp * ln(E/Ec)
  // E (energy) ≈ irradiance * time. Saturn irradiance ~3.5 mW/cm²
  const irradiance = 3.5; // mW/cm² for Saturn 16K
  const E = irradiance * t; // mJ/cm²
  const Cd = Ec && E > Ec ? Dp * Math.log(E / Ec) : null;

  // Layer height recommendation
  const layerRec = Cd ? Math.floor(Cd * 0.7) : null; // 70% of cure depth for safe overlap

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Cure Depth Estimator</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Estimates cure depth using Jacobs working curve: Cd = Dp × ln(E/Ec).
        Irradiance assumed 3.5 mW/cm² (Elegoo Saturn 16K). Run actual cure depth tiles to calibrate.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Photoinitiator</label>
          <select value={pi} onChange={e => setPI(e.target.value)}>
            {PHOTOINITIATORS.map(p => <option key={p.name}>{p.name}</option>)}
          </select>
          <div className="hint">{piData.note}</div>
        </div>
        <div className="form-group">
          <label className="label">PI Concentration (wt% of monomer)</label>
          <input type="number" inputMode="decimal" value={piConc}
            onChange={e => setPiConc(e.target.value)} placeholder="e.g. 1.5" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="label">Metal Vol% Loading</label>
          <input type="number" inputMode="decimal" value={metalVol}
            onChange={e => setMetalVol(e.target.value)} placeholder="e.g. 30" />
        </div>
        <div className="form-group">
          <label className="label">Exposure Time (seconds)</label>
          <input type="number" inputMode="decimal" value={exposure}
            onChange={e => setExposure(e.target.value)} placeholder="e.g. 10" />
        </div>
      </div>

      {Cd !== null ? (
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Penetration Depth (Dp)</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text)', fontWeight: 600 }}>{Dp.toFixed(0)} µm</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Energy Dose (E)</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text)', fontWeight: 600 }}>{E.toFixed(1)} mJ/cm²</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated Cure Depth</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 32, color: 'var(--copper-lt)', fontWeight: 700 }}>{Cd.toFixed(0)} µm</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended Layer Height</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 32, color: 'var(--success)', fontWeight: 700 }}>{layerRec} µm</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>≤ 70% of cure depth</div>
            </div>
          </div>

          {/* Exposure sweep */}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cure depth vs exposure time
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['Exposure (s)', 'Energy (mJ/cm²)', 'Cure Depth (µm)', 'Max Layer (µm)'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10,
                    color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 8, 10, 12, 15, 20, 30, 45, 60].map(s => {
                const energy = irradiance * s;
                const cd = Ec && energy > Ec ? Dp * Math.log(energy / Ec) : null;
                const isCurrent = s === parseInt(exposure);
                return (
                  <tr key={s} style={{ borderBottom: '1px solid var(--border)',
                    background: isCurrent ? 'rgba(200,118,26,0.08)' : 'transparent' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)' }}>
                      {s}{isCurrent && <span style={{ color: 'var(--copper-lt)', marginLeft: 6 }}>← current</span>}
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)' }}>{energy.toFixed(1)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', color: 'var(--copper-lt)', fontWeight: 600 }}>
                      {cd ? cd.toFixed(0) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', color: 'var(--success)' }}>
                      {cd ? Math.floor(cd * 0.7) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 8 }}>
            ⚠ These are estimates. Calibrate with actual cure depth tiles on your Saturn 16K.
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
          {E <= (Ec || 0) ? '⚠ Exposure energy below critical threshold — resin will not cure at this setting.' : 'Fill in all fields to see estimate.'}
        </div>
      )}
    </div>
  );
}

// ── Main Calculator Page ──────────────────────────────────
export default function Calculator() {
  const [tab, setTab] = useState('dispersant');

  const tabs = [
    { key: 'dispersant', label: '🧪 Dispersant' },
    { key: 'volwt', label: '⚖ Vol↔Wt' },
    { key: 'cure', label: '💡 Cure Depth' },
  ];

  return (
    <div className="page">
      <div className="page-title">Calculators</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'dispersant' && <DispersantCalc />}
      {tab === 'volwt' && <VolWtConverter />}
      {tab === 'cure' && <CureDepthCalc />}
    </div>
  );
}
