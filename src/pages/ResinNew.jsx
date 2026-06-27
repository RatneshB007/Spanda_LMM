import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import QRScanner from '../components/QRScanner';
import QRDisplay from '../components/QRDisplay';
import DropdownOther from '../components/DropdownOther';
import LinkUpload, { serializeLinks } from '../components/LinkUpload';

const EMPTY = {
  'Metal Type': '', 'Particle Size µm': '', 'Vol% Loading': '',
  'HDDA wt%': '', 'TMPTA wt%': '', 'PEGDA wt%': '', 'BAPO wt%': '',
  'BYK-111 wt%': '', 'Fumed Silica wt%': '', 'Additional Components': '',
  'Total Batch Weight g': '', 'Mixing Method': '', 'Mixing Method Other': '',
  'Mixing Duration min': '', 'Degas Method': '',
  'Viscosity Observation': '', 'Viscosity Other': '',
  'Settlement Observation': '', 'SOP Text': '', 'Status': 'Active',
  'Type': 'Fresh', 'Parent Batch ID': '', 'What Changed': '', 'Notes': '',
};

export default function ResinNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({ ...EMPTY });
  const [inherited, setInherited] = useState({});     // fields from parent
  const [modified, setModified] = useState({});       // fields user changed
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageLinks, setImageLinks] = useState([]);
  const [pdfLinks, setPdfLinks] = useState([]);
  const [error, setError] = useState('');

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (inherited[key] !== undefined) {
      setModified(m => ({ ...m, [key]: true }));
    }
  }

  // When old QR scanned during renewal — fetch parent data
  async function handleScan(url) {
    setScanning(false);
    // Extract batch ID from URL like .../resin/CU-001-V1
    const parts = url.split('/resin/');
    const parentId = parts[1] ? decodeURIComponent(parts[1]) : url;
    try {
      const parent = await api.getResinBatch(parentId);
      if (parent.error) { setError('Batch not found: ' + parentId); return; }
      // Auto-fill all fields from parent
      const inherited = {};
      Object.keys(EMPTY).forEach(k => {
        if (parent[k] !== undefined && parent[k] !== '') inherited[k] = parent[k];
      });
      setInherited(inherited);
      setModified({});
      setForm(f => ({ ...f, ...inherited, 'Parent Batch ID': parentId, 'Type': 'Renewed' }));
    } catch (e) {
      setError('Failed to load parent batch: ' + e.message);
    }
  }

  async function handleSubmit() {
    if (!form['Metal Type']) { setError('Metal Type is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        'Image Links': serializeLinks(imageLinks),
        'PDF Links': serializeLinks(pdfLinks),
        'Inherited Fields': Object.keys(inherited).join('|'),
        'Modified Fields': Object.keys(modified).join('|'),
      };
      const result = await api.createResinBatch(payload);
      setSavedId(result.id);
    } catch (e) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  }

  // Indicator for each field
  function indicator(key) {
    if (!inherited[key]) return null;
    return modified[key]
      ? <span className="field-badge modified">✎ Modified</span>
      : <span className="field-badge inherited">🔒 Inherited</span>;
  }

  function fieldClass(key) {
    if (!inherited[key]) return 'form-group';
    return `form-group ${modified[key] ? 'field-modified' : 'field-inherited'}`;
  }

  function F({ label, name, type = 'text', placeholder }) {
    return (
      <div className={fieldClass(name)}>
        <label className="label">{label} {indicator(name)}</label>
        <input type={type} value={form[name] || ''} placeholder={placeholder}
          onChange={e => set(name, e.target.value)} />
      </div>
    );
  }

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/resin/${encodeURIComponent(savedId)}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Resin batch saved successfully</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <QRDisplay value={qrUrl} label={savedId} size={200} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/resin/${encodeURIComponent(savedId)}`)}>
            View Batch →
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY }); setInherited({}); setModified({}); setSavedId(''); }}>
            + New Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">New Resin Batch</div>

      {/* Type selection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Batch Type</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Fresh', 'Renewed'].map(t => (
            <button key={t}
              className={`btn ${form['Type'] === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setForm(f => ({ ...f, 'Type': t })); if (t === 'Fresh') { setInherited({}); setModified({}); } }}>
              {t === 'Fresh' ? '🧪 Freshly Prepared' : '🔄 Renewed from Previous'}
            </button>
          ))}
        </div>

        {form['Type'] === 'Renewed' && (
          <div style={{ marginTop: 16 }}>
            {form['Parent Batch ID'] ? (
              <div className="alert alert-success">
                ✓ Loaded from <strong>{form['Parent Batch ID']}</strong> — edit only what changed
              </div>
            ) : (
              <>
                {scanning
                  ? <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
                  : <button className="btn btn-secondary" onClick={() => setScanning(true)}>
                      📷 Scan Old Resin QR
                    </button>
                }
                <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="e.g. CU-001-V1" value={form['Parent Batch ID']}
                    onChange={e => setForm(f => ({ ...f, 'Parent Batch ID': e.target.value }))}
                    style={{ maxWidth: 200 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => handleScan(form['Parent Batch ID'])}>
                    Load
                  </button>
                </div>
              </>
            )}
            {form['Parent Batch ID'] && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="label">What Changed (required)</label>
                <input placeholder="e.g. Increased BYK-111 from 1.5% to 2.0%"
                  value={form['What Changed']} onChange={e => set('What Changed', e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Identification */}
      <div className="section-title">Identification</div>
      <div className="form-row">
        <div className={fieldClass('Metal Type')}>
          <label className="label">Metal Type {indicator('Metal Type')}</label>
          <select value={form['Metal Type']} onChange={e => set('Metal Type', e.target.value)}>
            <option value="">— Select —</option>
            {['Copper','Silver','Bronze','Gold','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <F label="Particle Size µm" name="Particle Size µm" type="number" placeholder="e.g. 1.5" />
      </div>
      <div className="form-row">
        <F label="Total Batch Weight g" name="Total Batch Weight g" type="number" />
        <div className={fieldClass('Status')}>
          <label className="label">Status {indicator('Status')}</label>
          <select value={form['Status']} onChange={e => set('Status', e.target.value)}>
            {['Active','Depleted','Retired','On Hold'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Formulation */}
      <div className="section-title">Formulation</div>
      <div className="form-row">
        <F label="Vol% Loading" name="Vol% Loading" type="number" placeholder="e.g. 30" />
        <F label="HDDA wt%" name="HDDA wt%" type="number" placeholder="e.g. 50" />
      </div>
      <div className="form-row-3">
        <F label="TMPTA wt%" name="TMPTA wt%" type="number" />
        <F label="PEGDA wt%" name="PEGDA wt%" type="number" />
        <F label="BAPO wt%" name="BAPO wt%" type="number" />
      </div>
      <div className="form-row">
        <F label="BYK-111 wt%" name="BYK-111 wt%" type="number" />
        <F label="Fumed Silica wt%" name="Fumed Silica wt%" type="number" />
      </div>
      <div className={fieldClass('Additional Components')}>
        <label className="label">Additional Components {indicator('Additional Components')}</label>
        <input placeholder="Any other additives" value={form['Additional Components'] || ''}
          onChange={e => set('Additional Components', e.target.value)} />
      </div>

      {/* Process */}
      <div className="section-title">Process</div>
      <DropdownOther
        label={<>Mixing Method {indicator('Mixing Method')}</>}
        options={['Shear Mixer','Ball Mill','Ultrasonic','Shear+Ultrasonic','Ball Mill+Ultrasonic']}
        value={form['Mixing Method']} otherValue={form['Mixing Method Other']}
        onChange={v => set('Mixing Method', v)} onOtherChange={v => set('Mixing Method Other', v)}
      />
      <div className="form-row">
        <F label="Mixing Duration min" name="Mixing Duration min" type="number" />
        <F label="Degas Method" name="Degas Method" placeholder="e.g. Vacuum 15 min" />
      </div>
      <DropdownOther
        label={<>Viscosity Observation {indicator('Viscosity Observation')}</>}
        options={['Water-like','Honey-like','Paste-like','Gel-like']}
        value={form['Viscosity Observation']} otherValue={form['Viscosity Other']}
        onChange={v => set('Viscosity Observation', v)} onOtherChange={v => set('Viscosity Other', v)}
      />
      <div className={fieldClass('Settlement Observation')}>
        <label className="label">Settlement Observation {indicator('Settlement Observation')}</label>
        <input placeholder="e.g. Settled after 45 min, no settlement in 2hr"
          value={form['Settlement Observation'] || ''} onChange={e => set('Settlement Observation', e.target.value)} />
      </div>

      {/* SOP */}
      <div className="section-title">SOP & Notes</div>
      <div className={fieldClass('SOP Text')}>
        <label className="label">SOP / Procedure {indicator('SOP Text')}</label>
        <textarea rows={5} placeholder="Write step-by-step preparation procedure..."
          value={form['SOP Text'] || ''} onChange={e => set('SOP Text', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Notes</label>
        <textarea rows={3} placeholder="Any additional observations..."
          value={form['Notes'] || ''} onChange={e => set('Notes', e.target.value)} />
      </div>

      {/* Attachments */}
      <div className="section-title">Attachments</div>
      <LinkUpload label="Image Links (paste Google Drive/Photos links)" value={imageLinks} onChange={setImageLinks} />
      <LinkUpload label="PDF / Document Links (paste Google Drive links)" value={pdfLinks} onChange={setPdfLinks} />

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
