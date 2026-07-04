import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import { serializeLinks, serializeTags, buildExperimentId, nextExpSequenceForToday } from '../utils';
import QRScanner from '../components/QRScanner';
import BarcodeDisplay from '../components/BarcodeDisplay';
import DropdownOther from '../components/DropdownOther';
import LinkUpload from '../components/LinkUpload';
import SinteringProfile, { serializeSinteringProfile, deserializeSinteringProfile } from '../components/SinteringProfile';
import { TagEditor } from '../components/StarTag';

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

const SKIP_FROM_LAST = [
  'Status', 'Resin Batch Full ID', 'Resin Batch Link',
  'X Shrinkage %', 'Y Shrinkage %', 'Z Shrinkage %',
  'Green Body Condition', 'Green Body Other', 'Green Body Observations',
  'Surface Condition', 'Surface Condition Other', 'Sinter Observations',
  'Failed At Stage', 'Failure Mode', 'Failure Mode Other',
  'Probable Cause', 'Corrective Action', 'Final Result', 'Final Result Other',
  'Key Findings', 'Next Experiment Recommendation', 'Conclusion',
];

const LAST_KEY = 'lmm_last_experiment';

export default function ExperimentNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ ...EMPTY });
  const [customId, setCustomId] = useState('');
  const [idEdited, setIdEdited] = useState(false);
  const [resinInfo, setResinInfo] = useState(null);
  const [newerExists, setNewerExists] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageLinks, setImageLinks] = useState([]);
  const [pdfLinks, setPdfLinks] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [fillKey, setFillKey] = useState(0);
  const [filledFromLast, setFilledFromLast] = useState(false);
  const [sinterSteps, setSinterSteps] = useState([]);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // EDIT MODE: load existing record once on mount
  useEffect(() => {
    if (!editId) return;
    api.getExperiment(editId).then(async existing => {
      if (existing.error) { setError('Could not load experiment for editing: ' + existing.error); setLoadingEdit(false); return; }
      setForm(f => ({ ...f, ...existing }));
      setCustomId(existing['Experiment ID']);
      setIdEdited(true);
      try {
        const imgs = existing['Image Links'] ? existing['Image Links'].split('|PIPE|').filter(Boolean).map(s => {
          const [url, caption] = s.split('||');
          return { url, caption, finalUrl: url };
        }) : [];
        setImageLinks(imgs);
        const pdfs = existing['PDF Links'] ? existing['PDF Links'].split('|PIPE|').filter(Boolean).map(s => {
          const [url, caption] = s.split('||');
          return { url, caption, finalUrl: url };
        }) : [];
        setPdfLinks(pdfs);
      } catch (e) {}
      const existingTags = existing['Tags'] ? existing['Tags'].split(',').map(t => t.trim()).filter(Boolean) : [];
      setTags(existingTags);
      // Load linked resin info for display
      if (existing['Resin Batch Full ID']) {
        try {
          const batch = await api.getResinBatch(existing['Resin Batch Full ID']);
          if (!batch.error) setResinInfo(batch);
        } catch (e) {}
      }
      setFillKey(k => k + 1);
      const existingSteps = deserializeSinteringProfile(existing['Sintering Profile']);
      if (existingSteps.length > 0) setSinterSteps(existingSteps);
      setLoadingEdit(false);
    }).catch(e => { setError('Failed to load: ' + e.message); setLoadingEdit(false); });
    // eslint-disable-next-line
  }, [editId]);

  // Auto-generate experiment ID once on mount (unless user edits it)
  useEffect(() => {
    async function gen() {
      if (idEdited) return;
      try {
        const all = await api.getAllExperiments();
        const seq = nextExpSequenceForToday(all);
        setCustomId(buildExperimentId(seq));
      } catch (e) { /* leave blank, user can type manually */ }
    }
    gen();
    // eslint-disable-next-line
  }, []);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function fillFromLast() {
    const saved = localStorage.getItem(LAST_KEY);
    if (!saved) { setError('No previous experiment saved yet.'); return; }
    try {
      const last = JSON.parse(saved);
      const filled = { ...form };
      Object.keys(last).forEach(k => {
        if (!SKIP_FROM_LAST.includes(k) && last[k] !== undefined && last[k] !== '') {
          filled[k] = last[k];
        }
      });
      setForm(filled);
      setFillKey(k => k + 1);
      setFilledFromLast(true);
      if (last['Sintering Profile']) { const steps = deserializeSinteringProfile(last['Sintering Profile']); if (steps.length > 0) setSinterSteps(steps); }
      setError('');
    } catch (e) {
      setError('Could not load last experiment.');
    }
  }

  async function loadResin(urlOrId) {
    setScanning(false);
    let batchId = urlOrId;
    if (urlOrId.includes('/resin/')) batchId = decodeURIComponent(urlOrId.split('/resin/')[1]);
    batchId = batchId.split('#')[0].trim();
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
      const family = batch['Full ID'].split('_V')[0];
      const currentVer = parseInt((batch['Version'] || 'V1').replace('V', ''));
      const hasNewer = allBatches.some(b => {
        if (b['Full ID'] === batch['Full ID']) return false;
        if (!b['Full ID'].startsWith(family)) return false;
        const v = parseInt((b['Version'] || 'V1').replace('V', ''));
        return v > currentVer;
      });
      setNewerExists(hasNewer);
      setError('');
    } catch (e) {
      setError('Failed to load batch: ' + e.message);
    }
  }

  async function handleSubmit() {
    if (!form['Resin Batch Full ID']) { setError('Scan or enter a resin batch first'); return; }
    if (!customId) { setError('Experiment ID could not be generated — type one manually'); return; }
    setSaving(true);
    setError('');
    try {
      if (!isEditMode) {
        const check = await api.checkIdExists(customId, 'experiment');
        if (check.exists) { setError(`ID "${customId}" already exists — edit it to make it unique`); setSaving(false); return; }
      }

      const payload = {
        ...form,
        'Experiment ID': customId,
        'Image Links': serializeLinks(imageLinks),
        'PDF Links': serializeLinks(pdfLinks),
        'Tags': serializeTags(tags),
        'Sintering Profile': serializeSinteringProfile(sinterSteps),
      };
      const result = isEditMode
        ? await api.updateExperiment(payload)
        : await api.createExperiment(payload);
      if (!isEditMode) localStorage.setItem(LAST_KEY, JSON.stringify(form));
      setSavedId(isEditMode ? customId : result.id);
    } catch (e) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  }

  const isFailed = form['Final Result'] === 'Failed' || form['Final Result'] === 'Partial';

  if (loadingEdit) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;
  }

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/experiment/${savedId}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Experiment {isEditMode ? 'updated' : 'saved'}</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <BarcodeDisplay value={qrUrl} label={savedId} size={200} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/experiment/${savedId}`)}>View →</button>
          <button className="btn btn-primary" onClick={() => {
            setForm({ ...EMPTY }); setResinInfo(null); setSavedId('');
            setImageLinks([]); setPdfLinks([]); setTags([]);
            setFilledFromLast(false); setFillKey(0); setCustomId(''); setIdEdited(false); setSinterSteps([]);
          }}>+ New Experiment</button>
        </div>
      </div>
    );
  }

  function num(name, placeholder) {
    return (
      <input key={name + '_' + fillKey} type="number" inputMode="decimal"
        defaultValue={form[name] || ''} placeholder={placeholder || ''}
        onBlur={e => set(name, e.target.value)} />
    );
  }

  return (
    <div className="page">
      <div className="page-title">{isEditMode ? 'Edit Experiment' : 'New Experiment'}</div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Auto-generated editable ID */}
      <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(200,118,26,0.3)' }}>
        <label className="label">Experiment ID {!idEdited && <span className="field-badge inherited">auto</span>}</label>
        <input
          style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--copper-lt)', fontWeight: 600 }}
          value={customId}
          onChange={e => { setCustomId(e.target.value); setIdEdited(true); }}
        />
        <div className="hint">Auto-fills as EX_Date_Sequence. Edit freely if needed.</div>
      </div>

      {/* Fill from Last */}
      <div className="card" style={{ marginBottom: 20 }}>
        <button className="btn btn-secondary" onClick={fillFromLast}>⏮ Fill from Last Experiment</button>
        {filledFromLast && (
          <span style={{ fontSize: 12, color: 'var(--success)', marginLeft: 12 }}>
            ✓ Settings loaded — update only what changed. Result fields left blank.
          </span>
        )}
        <div className="hint" style={{ marginTop: 6 }}>Copies all print + sinter settings from your last saved experiment.</div>
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

      {/* Resin Batch */}
      <div className="section-title">Resin Batch</div>
      <div className="card" style={{ marginBottom: 20 }}>
        {resinInfo ? (
          <>
            {newerExists && <div className="alert alert-warning" style={{ marginBottom: 10 }}>⚠ A newer version of this batch exists</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="batch-chip">{resinInfo['Full ID']}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {resinInfo['Metal Type']} · {resinInfo['Vol% Loading']}vol% · {resinInfo['Date Prepared']}
              </span>
            </div>
            <a href={form['Resin Batch Link']} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>View resin page →</a>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }}
              onClick={() => { setResinInfo(null); set('Resin Batch Full ID', ''); set('Resin Batch Link', ''); }}>
              Change
            </button>
          </>
        ) : (
          <>
            {scanning
              ? <QRScanner onScan={loadResin} onClose={() => setScanning(false)} />
              : <button className="btn btn-secondary" onClick={() => setScanning(true)}>📷 Scan Resin QR</button>}
            <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="e.g. Cu_V1_300626" value={form['Resin Batch Full ID']}
                onChange={e => set('Resin Batch Full ID', e.target.value)} style={{ maxWidth: 220 }} />
              <button className="btn btn-secondary btn-sm" onClick={() => loadResin(form['Resin Batch Full ID'])}>Load</button>
            </div>
          </>
        )}
      </div>

      {/* Print Settings */}
      <div className="section-title">Print Settings</div>
      <div className="form-group">
        <label className="label">Printer Model</label>
        <input value={form['Printer Model'] || ''} onChange={e => set('Printer Model', e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Layer Height µm</label>{num('Layer Height µm', 'e.g. 25')}</div>
        <div className="form-group"><label className="label">Exposure Time s</label>{num('Exposure Time s', 'e.g. 12')}</div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Bottom Exposure s</label>{num('Bottom Exposure s', 'e.g. 60')}</div>
        <div className="form-group"><label className="label">Lift Speed mm/min</label>{num('Lift Speed mm/min', 'e.g. 35')}</div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="label">Rest Time s</label>{num('Rest Time s', 'e.g. 20')}</div>
        <div className="form-group"><label className="label">Total Layers</label>{num('Total Layers', '')}</div>
      </div>
      <div className="form-group">
        <label className="label">Print Duration</label>
        <input value={form['Print Duration'] || ''} placeholder="e.g. 3h 20min" onChange={e => set('Print Duration', e.target.value)} />
      </div>

      {/* Green Body */}
      <div className="section-title">Green Body Results</div>
      <DropdownOther label="Condition" options={['Good','Cracked','Tacky','Delaminated','Warped']}
        value={form['Green Body Condition']} otherValue={form['Green Body Other']}
        onChange={v => set('Green Body Condition', v)} onOtherChange={v => set('Green Body Other', v)} />
      <div className="form-group">
        <label className="label">Observations</label>
        <textarea rows={3} value={form['Green Body Observations'] || ''}
          onChange={e => set('Green Body Observations', e.target.value)} />
      </div>

      {/* Sinter Settings */}
      <div className="section-title">Sintering Profile</div>
      <div className="form-group">
        <label className="label">Furnace Program No</label>
        <input value={form['Furnace Program No'] || ''} onChange={e => set('Furnace Program No', e.target.value)} style={{ maxWidth: 200 }} />
      </div>
      <SinteringProfile value={sinterSteps} onChange={setSinterSteps} />

      {/* Sinter Results */}
      <div className="section-title">Sinter Results</div>
      <div className="form-row-3">
        <div className="form-group"><label className="label">X Shrinkage %</label>{num('X Shrinkage %', '')}</div>
        <div className="form-group"><label className="label">Y Shrinkage %</label>{num('Y Shrinkage %', '')}</div>
        <div className="form-group"><label className="label">Z Shrinkage %</label>{num('Z Shrinkage %', '')}</div>
      </div>
      <DropdownOther label="Surface Condition" options={['Good','Oxidized','Porous','Cracked','Rough']}
        value={form['Surface Condition']} otherValue={form['Surface Condition Other']}
        onChange={v => set('Surface Condition', v)} onOtherChange={v => set('Surface Condition Other', v)} />
      <div className="form-group">
        <label className="label">Sinter Observations</label>
        <textarea rows={3} value={form['Sinter Observations'] || ''} onChange={e => set('Sinter Observations', e.target.value)} />
      </div>

      {/* Conclusion */}
      <div className="section-title">Conclusion</div>
      <DropdownOther label="Final Result" options={['Success','Partial','Failed']}
        value={form['Final Result']} otherValue={form['Final Result Other']}
        onChange={v => set('Final Result', v)} onOtherChange={v => set('Final Result Other', v)} />

      {isFailed && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', marginTop: 12 }}>
          <div className="section-title" style={{ marginTop: 0, color: 'var(--danger)' }}>Failure Analysis</div>
          <DropdownOther label="Failed At Stage" options={['Printing','Debinding','Sintering','Post-processing']}
            value={form['Failed At Stage']} otherValue={form['Failed At Stage Other']}
            onChange={v => set('Failed At Stage', v)} onOtherChange={v => set('Failed At Stage Other', v)} />
          <DropdownOther label="Failure Mode" options={['Crack','Delamination','Oxidation','Warping','Incomplete Cure','Porosity']}
            value={form['Failure Mode']} otherValue={form['Failure Mode Other']}
            onChange={v => set('Failure Mode', v)} onOtherChange={v => set('Failure Mode Other', v)} />
          <div className="form-group"><label className="label">Probable Cause</label>
            <textarea rows={2} value={form['Probable Cause'] || ''} onChange={e => set('Probable Cause', e.target.value)} /></div>
          <div className="form-group"><label className="label">Corrective Action Planned</label>
            <textarea rows={2} value={form['Corrective Action'] || ''} onChange={e => set('Corrective Action', e.target.value)} /></div>
        </div>
      )}

      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="label">Key Findings</label>
        <textarea rows={3} value={form['Key Findings'] || ''} onChange={e => set('Key Findings', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Next Experiment Recommendation</label>
        <textarea rows={2} value={form['Next Experiment Recommendation'] || ''} onChange={e => set('Next Experiment Recommendation', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Conclusion</label>
        <textarea rows={3} value={form['Conclusion'] || ''} onChange={e => set('Conclusion', e.target.value)} />
      </div>

      {/* Tags */}
      <div className="section-title">Organize</div>
      <TagEditor tags={tags} onChange={setTags} />

      {/* Attachments */}
      <div className="section-title">Images</div>
      <LinkUpload label="Paste Google Photos / Drive links" value={imageLinks} onChange={setImageLinks} parentId={customId} />
      <div className="section-title">Documents</div>
      <LinkUpload label="Paste Google Drive PDF / document links" value={pdfLinks} onChange={setPdfLinks} parentId={customId} />

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
