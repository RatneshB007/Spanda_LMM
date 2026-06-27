import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import QRScanner from '../components/QRScanner';
import QRDisplay from '../components/QRDisplay';
import DropdownOther from '../components/DropdownOther';
import FileUpload, { serializeFiles } from '../components/FileUpload';

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

export default function ExperimentNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ ...EMPTY });
  const [resinInfo, setResinInfo] = useState(null);
  const [newerExists, setNewerExists] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [error, setError] = useState('');

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // Extract batch ID from QR URL or raw ID
  function extractId(urlOrId) {
    const parts = urlOrId.split('/resin/');
    return parts[1] ? decodeURIComponent(parts[1]) : urlOrId.trim();
  }

  async function loadResin(urlOrId) {
    const batchId = extractId(urlOrId);
    try {
      const batch = await api.getResinBatch(batchId);
      if (batch.error) { setError('Resin batch not found: ' + batchId); return; }
      setResinInfo(batch);
      setForm(f => ({
        ...f,
        'Resin Batch Full ID': batch['Full ID'],
        'Resin Batch Link': `${APP_BASE}/#/resin/${encodeURIComponent(batch['Full ID'])}`,
      }));
      // Check if newer version exists
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
    if (!form['Resin Batch Full ID']) { setError('Resin batch is required — scan QR or enter ID'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        'Image Links': serializeFiles(imageFiles),
        'PDF Links': serializeFiles(pdfFiles),
      };
      const result = await api.createExperiment(payload);
      setSavedId(result.id);
    } catch (e) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  }

  const isFailed = form['Final Result'] === 'Failed' || form['Final Result'] === 'Partial';

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/experiment/${savedId}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Experiment saved</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <QRDisplay value={qrUrl} label={savedId} size={200} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/experiment/${savedId}`)}>View →</button>
          <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY }); setResinInfo(null); setSavedId(''); }}>
            + New Experiment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">New Experiment</div>
      {error && <div className="alert alert-danger">{error}</div>}

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
              <div className="alert alert-warning">⚠ A newer version of this batch exists — verify you're using the correct one</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="batch-chip">{resinInfo['Full ID']}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{resinInfo['Metal Type']} · {resinInfo['Vol% Loading']}vol% · {resinInfo['Date Prepared']}</span>
            </div>
            <a href={form['Resin Batch Link']} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              View resin page →
            </a>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => { setResinInfo(null); setForm(f => ({ ...f, 'Resin Batch Full ID': '', 'Resin Batch Link': '' })); }}>
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
              <button className="btn btn-secondary btn-sm" onClick={() => loadResin(form['Resin Batch Full ID'])}>Load</button>
            </div>
          </>
        )}
      </div>

      {/* Print Settings */}
      <div className="section-title">Print Settings</div>
      <div className="form-group">
        <label className="label">Printer Model</label>
        <input value={form['Printer Model']} onChange={e => set('Printer Model', e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Layer Height µm</label>
          <input type="number" value={form['Layer Height µm']} onChange={e => set('Layer Height µm', e.target.value)} placeholder="e.g. 25" /></div>
        <div className="form-group"><label className="label">Exposure Time s</label>
          <input type="number" value={form['Exposure Time s']} onChange={e => set('Exposure Time s', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Bottom Exposure s</label>
          <input type="number" value={form['Bottom Exposure s']} onChange={e => set('Bottom Exposure s', e.target.value)} /></div>
        <div className="form-group"><label className="label">Lift Speed mm/min</label>
          <input type="number" value={form['Lift Speed mm/min']} onChange={e => set('Lift Speed mm/min', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Rest Time s</label>
          <input type="number" value={form['Rest Time s']} onChange={e => set('Rest Time s', e.target.value)} /></div>
        <div className="form-group"><label className="label">Total Layers</label>
          <input type="number" value={form['Total Layers']} onChange={e => set('Total Layers', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="label">Print Duration</label>
        <input value={form['Print Duration']} onChange={e => set('Print Duration', e.target.value)} placeholder="e.g. 3h 20min" /></div>

      {/* Green Body */}
      <div className="section-title">Green Body Results</div>
      <DropdownOther label="Condition" options={['Good','Cracked','Tacky','Delaminated','Warped']}
        value={form['Green Body Condition']} otherValue={form['Green Body Other']}
        onChange={v => set('Green Body Condition', v)} onOtherChange={v => set('Green Body Other', v)} />
      <div className="form-group"><label className="label">Observations</label>
        <textarea rows={3} placeholder="Describe green body appearance, any issues..."
          value={form['Green Body Observations']} onChange={e => set('Green Body Observations', e.target.value)} /></div>

      {/* Sinter Settings */}
      <div className="section-title">Sinter Settings</div>
      <div className="form-row">
        <div className="form-group"><label className="label">Furnace Program No</label>
          <input value={form['Furnace Program No']} onChange={e => set('Furnace Program No', e.target.value)} /></div>
        <div className="form-group"><label className="label">Peak Temperature °C</label>
          <input type="number" value={form['Peak Temperature °C']} onChange={e => set('Peak Temperature °C', e.target.value)} /></div>
      </div>
      <DropdownOther label="Atmosphere" options={['Air','N₂','N₂/H₂ Forming Gas','Argon']}
        value={form['Atmosphere']} otherValue={form['Atmosphere Other']}
        onChange={v => set('Atmosphere', v)} onOtherChange={v => set('Atmosphere Other', v)} />
      <div className="form-row">
        <div className="form-group"><label className="label">Ramp Rate °C/min</label>
          <input type="number" value={form['Ramp Rate °C/min']} onChange={e => set('Ramp Rate °C/min', e.target.value)} /></div>
        <div className="form-group"><label className="label">Hold Time min</label>
          <input type="number" value={form['Hold Time min']} onChange={e => set('Hold Time min', e.target.value)} /></div>
      </div>

      {/* Sinter Results */}
      <div className="section-title">Sinter Results</div>
      <div className="form-row-3">
        <div className="form-group"><label className="label">X Shrinkage %</label>
          <input type="number" step="0.1" value={form['X Shrinkage %']} onChange={e => set('X Shrinkage %', e.target.value)} /></div>
        <div className="form-group"><label className="label">Y Shrinkage %</label>
          <input type="number" step="0.1" value={form['Y Shrinkage %']} onChange={e => set('Y Shrinkage %', e.target.value)} /></div>
        <div className="form-group"><label className="label">Z Shrinkage %</label>
          <input type="number" step="0.1" value={form['Z Shrinkage %']} onChange={e => set('Z Shrinkage %', e.target.value)} /></div>
      </div>
      <DropdownOther label="Surface Condition" options={['Good','Oxidized','Porous','Cracked','Rough']}
        value={form['Surface Condition']} otherValue={form['Surface Condition Other']}
        onChange={v => set('Surface Condition', v)} onOtherChange={v => set('Surface Condition Other', v)} />
      <div className="form-group"><label className="label">Sinter Observations</label>
        <textarea rows={3} placeholder="Surface quality, colour, dimensional accuracy..."
          value={form['Sinter Observations']} onChange={e => set('Sinter Observations', e.target.value)} /></div>

      {/* Final Result */}
      <div className="section-title">Conclusion</div>
      <DropdownOther label="Final Result" options={['Success','Partial','Failed']}
        value={form['Final Result']} otherValue={form['Final Result Other']}
        onChange={v => set('Final Result', v)} onOtherChange={v => set('Final Result Other', v)} />

      {/* Failure Analysis — only if failed */}
      {isFailed && (
        <>
          <div className="alert alert-warning" style={{ marginTop: 12 }}>⚠ Failure Analysis Required</div>
          <DropdownOther label="Failed At Stage" options={['Printing','Debinding','Sintering','Post-processing']}
            value={form['Failed At Stage']} otherValue={form['Failure Mode Other']}
            onChange={v => set('Failed At Stage', v)} onOtherChange={v => set('Failure Mode Other', v)} />
          <DropdownOther label="Failure Mode" options={['Crack','Delamination','Oxidation','Warping','Incomplete Cure','Porosity']}
            value={form['Failure Mode']} otherValue={form['Failure Mode Other']}
            onChange={v => set('Failure Mode', v)} onOtherChange={v => set('Failure Mode Other', v)} />
          <div className="form-group"><label className="label">Probable Cause</label>
            <textarea rows={2} value={form['Probable Cause']} onChange={e => set('Probable Cause', e.target.value)} /></div>
          <div className="form-group"><label className="label">Corrective Action Planned</label>
            <textarea rows={2} value={form['Corrective Action']} onChange={e => set('Corrective Action', e.target.value)} /></div>
        </>
      )}

      <div className="form-group"><label className="label">Key Findings</label>
        <textarea rows={3} value={form['Key Findings']} onChange={e => set('Key Findings', e.target.value)} /></div>
      <div className="form-group"><label className="label">Next Experiment Recommendation</label>
        <textarea rows={2} value={form['Next Experiment Recommendation']} onChange={e => set('Next Experiment Recommendation', e.target.value)} /></div>
      <div className="form-group"><label className="label">Conclusion</label>
        <textarea rows={3} value={form['Conclusion']} onChange={e => set('Conclusion', e.target.value)} /></div>

      {/* Attachments */}
      <div className="section-title">Attachments</div>
      <FileUpload label="Images (caption required for each)" accept="image/*" onUpload={setImageFiles} />
      <FileUpload label="PDFs / Documents" accept=".pdf,.doc,.docx" onUpload={setPdfFiles} />

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
