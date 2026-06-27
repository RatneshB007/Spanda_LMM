import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import QRScanner from '../components/QRScanner';
import QRDisplay from '../components/QRDisplay';
import DropdownOther from '../components/DropdownOther';
import LinkUpload, { serializeLinks } from '../components/LinkUpload';

const EMPTY = {
  Status: 'Planned',
  'Resin Batch Full ID': '', 'Resin Batch Link': '',
  'Printer Model': 'Elegoo Saturn 16K',
  'Layer Height µm': '', 'Exposure Time s': '', 'Bottom Exposure s': '',
  'Lift Speed mm/min': '', 'Rest Time s': '', 'Total Layers': '', 'Print Duration': '',
  'Green Body Condition': '', 'Green Body Other': '', 'Green Body Observations': '',
  'Furnace Program No': '', 'Peak Temperature °C': '', 'Atmosphere': '', 'Atmosphere Other': '',
  'Ramp Rate °C/min': '', 'Hold Time min': '',
  'X Shrinkage %': '', 'Y Shrinkage %': '', 'Z Shrinkage %': '',
  'Surface Condition': '', 'Surface Condition Other': '', 'Sinter Observations': '',
  'Failed At Stage': '', 'Failure Mode': '', 'Failure Mode Other': '',
  'Probable Cause': '', 'Corrective Action': '',
  'Final Result': '', 'Final Result Other': '',
  'Key Findings': '', 'Next Experiment Recommendation': '', 'Conclusion': '',
};

// Fields excluded from "Fill from Last" (these should always be fresh)
const EXCLUDE_FROM_LAST = ['Status', 'Resin Batch Full ID', 'Resin Batch Link',
  'X Shrinkage %', 'Y Shrinkage %', 'Z Shrinkage %',
  'Green Body Condition', 'Green Body Other', 'Green Body Observations',
  'Surface Condition', 'Surface Condition Other', 'Sinter Observations',
  'Failed At Stage', 'Failure Mode', 'Failure Mode Other',
  'Probable Cause', 'Corrective Action', 'Final Result', 'Final Result Other',
  'Key Findings', 'Next Experiment Recommendation', 'Conclusion'];

const LAST_KEY = 'lmm_last_experiment';

export default function ExperimentNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ ...EMPTY });
  const [resinInfo, setResinInfo] = useState(null);
  const [newerExists, setNewerExists] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageLinks, setImageLinks] = useState([]);
  const [pdfLinks, setPdfLinks] = useState([]);
  const [error, setError] = useState('');
  const [filledFromLast, setFilledFromLast] = useState(false);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  // Fill from last saved experiment
  function fillFromLast() {
    const saved = localStorage.getItem(LAST_KEY);
    if (!saved) { setError('No previous experiment found yet.'); return; }
    try {
      const last = JSON.parse(saved);
      const filled = { ...form };
      Object.keys(last).forEach(k => {
        if (!EXCLUDE_FROM_LAST.includes(k) && last[k]) {
          filled[k] = last[k];
        }
      });
      setForm(filled);
      setFilledFromLast(true);
      setError('');
    } catch(e) {
      setError('Could not load last experiment.');
    }
  }

  function extractId(urlOrId) {
    const parts = urlOrId.split('/experiment/');
    if (parts[1]) return decodeURIComponent(parts[1]);
    const parts2 = urlOrId.split('/resin/');
    if (parts2[1]) return decodeURIComponent(parts2[1]);
    return urlOrId.trim();
  }

  async function loadResin(urlOrId) {
    const batchId = urlOrId.includes('/resin/') || !urlOrId.includes('/')
      ? (urlOrId.split('/resin/')[1] ? decodeURIComponent(urlOrId.split('/resin/')[1]) : urlOrId.trim())
      : urlOrId.trim();
    try {
      const batch = await api.getResinBatch(batchId);
      if (batch.error) { setError('Resin batch not found: ' + batchId); return; }
      setResinInfo(batch);
      setForm(f => ({
        ...f,
        'Resin Batch Full ID': batch['Full ID'],
        'Resin Batch Link': `${APP_BASE}/#/resin/${encodeURIComponent(batch['Full ID'])}`,
      }));
      const allBatches = await api.getAllResinBatches();
      const sameFamily = allBatches.filter(b =>
        b['Full ID'] !== batch['Full ID'] &&
        b['Full ID'].split('-V')[0] === batch['Full ID'].split('-V')[0]
      );
      const versions = sameFamily.map(b => parseInt(b['Version']?.replace('V','') || 0));
      const currentVer = parseInt(batch['Version']?.replace('V','') || 1);
      setNewerExists(versions.some(v => v > currentVer));
      setScanning(false);
      setError('');
    } catch (e) {
      setError('Failed to load batch: ' + e.message);
    }
  }

  async function handleSubmit() {
    if (!form['Resin Batch Full ID']) { setError('Resin batch is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        'Image Links': serializeLinks(imageLinks),
        'PDF Links': serializeLinks(pdfLinks),
      };
      const result = await api.createExperiment(payload);
      // Save to localStorage for "Fill from Last"
      localStorage.setItem(LAST_KEY, JSON.stringify(form));
      setSavedId(result.id);
    } catch (e) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  }

  const isFailed = form['Final Result'] === 'Failed' || form['Final Result'] === 'Partial';

  // Numeric input — uses onBlur to avoid mobile focus jumping
  function NumInput({ label, name, placeholder }) {
    return (
      <div className="form-group">
        <label className="label">{label}</label>
        <input
          type="number"
          inputMode="decimal"
          defaultValue={form[name]}
          placeholder={placeholder}
          onBlur={e => set(name, e.target.value)}
          key={name + '_' + filledFromLast}
        />
      </div>
    );
  }

  function TextInput({ label, name, placeholder }) {
    return (
      <div className="form-group">
        <label className="label">{label}</label>
        <input
          type="text"
          value={form[name] || ''}
          placeholder={placeholder}
          onChange={e => set(name, e.target.value)}
        />
      </div>
    );
  }

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/experiment/${savedId}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Experiment saved</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <QRDisplay value={qrUrl} label={savedId} size={200} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/experiment/${savedId}`)}>View →</button>
          <button className="btn btn-primary" onClick={() => {
            setForm({ ...EMPTY }); setResinInfo(null);
            setSavedId(''); setImageLinks([]); setPdfLinks([]);
            setFilledFromLast(false);
          }}>+ New Experiment</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">New Experiment</div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Fill from Last button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-secondary" onClick={fillFromLast}>
          ⏮ Fill from Last Experiment
        </button>
        {filledFromLast && (
          <span style={{ fontSize: 12, color: 'var(--success)', marginLeft: 10 }}>
            ✓ Filled — update only what changed
          </span>
        )}
        <div className="hint" style={{ marginTop: 4 }}>
          Loads all settings from your previous experiment. Results fields are always left blank.
        </div>
      </div>

      {/* Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Status</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Planned','Printing','Green Body Done','Sintering','Complete','Failed'].map(s => (
            <button key={s} className={`btn btn-sm ${form.Status === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => set('Status', s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Resin Link */}
      <div className="section-title">Resin Batch</div>
      <div className="card" style={{ marginBottom: 20 }}>
        {resinInfo ? (
          <>
            {newerExists && (
              <div className="alert alert-warning">⚠ A newer version of this batch exists</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="batch-chip">{resinInfo['Full ID']}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {resinInfo['Metal Type']} · {resinInfo['Vol% Loading']}vol% · {resinInfo['Date Prepared']}
              </span>
            </div>
            <a href={form['Resin Batch Link']} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              View resin page →
            </a>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }}
              onClick={() => { setResinInfo(null); setForm(f => ({ ...f, 'Resin Batch Full ID': '', 'Resin Batch Link': '' })); }}>
              Change
            </button>
          </>
        ) : (
          <>
            {scanning
              ? <QRScanner onScan={loadResin} onClose={() => setScanning(false)} />
              : <button className="btn btn-secondary" onClick={() => setScanning(true)}>📷 Scan Resin QR</button>
            }
            <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="e.g. CU-001-V1" value={form['Resin Batch Full ID']}
                onChange={e => set('Resin Batch Full ID', e.target.value)} style={{ maxWidth: 200 }} />
              <button className="btn btn-secondary btn-sm"
                onClick={() => loadResin(form['Resin Batch Full ID'])}>Load</button>
            </div>
          </>
        )}
      </div>

      {/* Print Settings */}
      <div className="section-title">Print Settings</div>
      <TextInput label="Printer Model" name="Printer Model" />
      <div className="form-row">
        <NumInput label="Layer Height µm" name="Layer Height µm" placeholder="e.g. 25" />
        <NumInput label="Exposure Time s" name="Exposure Time s" placeholder="e.g. 12" />
      </div>
      <div className="form-row">
        <NumInput label="Bottom Exposure s" name="Bottom Exposure s" />
        <NumInput label="Lift Speed mm/min" name="Lift Speed mm/min" placeholder="e.g. 35" />
      </div>
      <div className="form-row">
        <NumInput label="Rest Time s" name="Rest Time s" placeholder="e.g. 20" />
        <NumInput label="Total Layers" name="Total Layers" />
      </div>
      <TextInput label="Print Duration" name="Print Duration" placeholder="e.g. 3h 20min" />

      {/* Green Body */}
      <div className="section-title">Green Body Results</div>
      <DropdownOther label="Condition"
        options={['Good','Cracked','Tacky','Delaminated','Warped']}
        value={form['Green Body Condition']} otherValue={form['Green Body Other']}
        onChange={v => set('Green Body Condition', v)} onOtherChange={v => set('Green Body Other', v)} />
      <div className="form-group">
        <label className="label">Observations</label>
        <textarea rows={3} placeholder="Describe green body appearance..."
          value={form['Green Body Observations']}
          onChange={e => set('Green Body Observations', e.target.value)} />
      </div>

      {/* Sinter Settings */}
      <div className="section-title">Sinter Settings</div>
      <div className="form-row">
        <TextInput label="Furnace Program No" name="Furnace Program No" />
        <NumInput label="Peak Temperature °C" name="Peak Temperature °C" placeholder="e.g. 1000" />
      </div>
      <DropdownOther label="Atmosphere"
        options={['Air','N₂','N₂/H₂ Forming Gas','Argon']}
        value={form['Atmosphere']} otherValue={form['Atmosphere Other']}
        onChange={v => set('Atmosphere', v)} onOtherChange={v => set('Atmosphere Other', v)} />
      <div className="form-row">
        <NumInput label="Ramp Rate °C/min" name="Ramp Rate °C/min" placeholder="e.g. 1" />
        <NumInput label="Hold Time min" name="Hold Time min" placeholder="e.g. 60" />
      </div>

      {/* Sinter Results */}
      <div className="section-title">Sinter Results</div>
      <div className="form-row-3">
        <NumInput label="X Shrinkage %" name="X Shrinkage %" />
        <NumInput label="Y Shrinkage %" name="Y Shrinkage %" />
        <NumInput label="Z Shrinkage %" name="Z Shrinkage %" />
      </div>
      <DropdownOther label="Surface Condition"
        options={['Good','Oxidized','Porous','Cracked','Rough']}
        value={form['Surface Condition']} otherValue={form['Surface Condition Other']}
        onChange={v => set('Surface Condition', v)} onOtherChange={v => set('Surface Condition Other', v)} />
      <div className="form-group">
        <label className="label">Sinter Observations</label>
        <textarea rows={3} value={form['Sinter Observations']}
          onChange={e => set('Sinter Observations', e.target.value)} />
      </div>

      {/* Conclusion */}
      <div className="section-title">Conclusion</div>
      <DropdownOther label="Final Result"
        options={['Success','Partial','Failed']}
        value={form['Final Result']} otherValue={form['Final Result Other']}
        onChange={v => set('Final Result', v)} onOtherChange={v => set('Final Result Other', v)} />

      {/* Failure Analysis */}
      {isFailed && (
        <>
          <div className="alert alert-warning" style={{ marginTop: 12 }}>⚠ Failure Analysis</div>
          <DropdownOther label="Failed At Stage"
            options={['Printing','Debinding','Sintering','Post-processing']}
            value={form['Failed At Stage']} otherValue={form['Failed At Stage Other']}
            onChange={v => set('Failed At Stage', v)} onOtherChange={v => set('Failed At Stage Other', v)} />
          <DropdownOther label="Failure Mode"
            options={['Crack','Delamination','Oxidation','Warping','Incomplete Cure','Porosity']}
            value={form['Failure Mode']} otherValue={form['Failure Mode Other']}
            onChange={v => set('Failure Mode', v)} onOtherChange={v => set('Failure Mode Other', v)} />
          <div className="form-group"><label className="label">Probable Cause</label>
            <textarea rows={2} value={form['Probable Cause']}
              onChange={e => set('Probable Cause', e.target.value)} /></div>
          <div className="form-group"><label className="label">Corrective Action</label>
            <textarea rows={2} value={form['Corrective Action']}
              onChange={e => set('Corrective Action', e.target.value)} /></div>
        </>
      )}

      <div className="form-group"><label className="label">Key Findings</label>
        <textarea rows={3} value={form['Key Findings']}
          onChange={e => set('Key Findings', e.target.value)} /></div>
      <div className="form-group"><label className="label">Next Experiment Recommendation</label>
        <textarea rows={2} value={form['Next Experiment Recommendation']}
          onChange={e => set('Next Experiment Recommendation', e.target.value)} /></div>
      <div className="form-group"><label className="label">Conclusion</label>
        <textarea rows={3} value={form['Conclusion']}
          onChange={e => set('Conclusion', e.target.value)} /></div>

      {/* Attachments */}
      <div className="section-title">Images</div>
      <LinkUpload label="Image Links (paste Google Drive/Photos links)"
        value={imageLinks} onChange={setImageLinks} />

      <div className="section-title">Documents</div>
      <LinkUpload label="PDF / Document Links (paste Google Drive links)"
        value={pdfLinks} onChange={setPdfLinks} />

      <div className="divider" />
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving…</> : '💾 Save & Generate QR'}
        </button>
        <button className="btn btn-secondary" onClick={() => nav(-1)}>Cancel</button>
      </div>
    </div>
  );
}
