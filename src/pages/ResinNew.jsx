import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import QRScanner from '../components/QRScanner';
import QRDisplay from '../components/QRDisplay';
import DropdownOther from '../components/DropdownOther';
import LinkUpload from '../components/LinkUpload';
import { serializeLinks } from '../utils';

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
  const [inherited, setInherited] = useState({});
  const [modified, setModified] = useState({});
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageLinks, setImageLinks] = useState([]);
  const [pdfLinks, setPdfLinks] = useState([]);
  const [error, setError] = useState('');
  const [fillKey, setFillKey] = useState(0); // increments on renewal to remount numeric inputs

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (inherited[key] !== undefined) {
      setModified(m => ({ ...m, [key]: true }));
    }
  }

  async function handleScan(url) {
    setScanning(false);
    // Handle both full URL and raw batch ID
    let parentId = url;
    if (url.includes('/resin/')) {
      parentId = decodeURIComponent(url.split('/resin/')[1]);
    }
    // Remove any hash fragments
    parentId = parentId.split('#')[0].trim();
    try {
      const parent = await api.getResinBatch(parentId);
      if (parent.error) { setError('Batch not found: ' + parentId); return; }
      const inh = {};
      Object.keys(EMPTY).forEach(k => {
        if (parent[k] !== undefined && parent[k] !== '') inh[k] = parent[k];
      });
      // Don't inherit Type, Parent Batch ID, What Changed
      delete inh['Type'];
      delete inh['Parent Batch ID'];
      delete inh['What Changed'];
      setInherited(inh);
      setModified({});
      setForm(f => ({
        ...f,
        ...inh,
        'Parent Batch ID': parentId,
        'Type': 'Renewed',
        'What Changed': '',
      }));
      setFillKey(k => k + 1); // remount numeric inputs with inherited values
      setError('');
    } catch (e) {
      setError('Failed to load parent batch: ' + e.message);
    }
  }

  async function handleSubmit() {
    if (!form['Metal Type']) { setError('Metal Type is required'); return; }
    if (form['Type'] === 'Renewed' && !form['What Changed']) {
      setError('"What Changed" is required for renewed batches'); return;
    }
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

  function badge(key) {
    if (!inherited[key]) return null;
    return modified[key]
      ? <span className="field-badge modified">✎ Modified</span>
      : <span className="field-badge inherited">🔒 Inherited</span>;
  }

  function fClass(key) {
    if (!inherited[key]) return 'form-group';
    return `form-group ${modified[key] ? 'field-modified' : 'field-inherited'}`;
  }

  // Numeric input — uncontrolled with onBlur, key remounts when fill happens
  function Num({ label, name, placeholder }) {
    return (
      <div className={fClass(name)}>
        <label className="label">{label} {badge(name)}</label>
        <input
          key={name + '_' + fillKey}
          type="number"
          inputMode="decimal"
          defaultValue={form[name] || ''}
          placeholder={placeholder}
          onBlur={e => setField(name, e.target.value)}
        />
      </div>
    );
  }

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/resin/${encodeURIComponent(savedId)}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Resin batch saved</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <QRDisplay value={qrUrl} label={savedId} size={200} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/resin/${encodeURIComponent(savedId)}`)}>
            View Batch →
          </button>
          <button className="btn btn-primary" onClick={() => {
            setForm({ ...EMPTY }); setInherited({}); setModified({});
            setSavedId(''); setFillKey(0); setImageLinks([]); setPdfLinks([]);
          }}>+ New Batch</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">New Resin Batch</div>

      {/* Batch Type */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Batch Type</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Fresh', 'Renewed'].map(t => (
            <button key={t}
              className={`btn ${form['Type'] === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setForm(f => ({ ...f, 'Type': t }));
                if (t === 'Fresh') { setInherited({}); setModified({}); setFillKey(k => k + 1); }
              }}>
              {t === 'Fresh' ? '🧪 Freshly Prepared' : '🔄 Renewed from Previous'}
            </button>
          ))}
        </div>

        {form['Type'] === 'Renewed' && (
          <div style={{ marginTop: 16 }}>
            {form['Parent Batch ID'] && Object.keys(inherited).length > 0 ? (
              <div className="alert alert-success">
                ✓ Loaded from <strong>{form['Parent Batch ID']}</strong> — edit only what changed below
              </div>
            ) : (
              <>
                {scanning
                  ? <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
                  : <button className="btn btn-secondary" onClick={() => setScanning(true)}>
                      📷 Scan Old Resin QR
                    </button>
                }
                <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID manually:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="e.g. CU-001-V1"
                    value={form['Parent Batch ID']}
                    onChange={e => setForm(f => ({ ...f, 'Parent Batch ID': e.target.value }))}
                    style={{ maxWidth: 200 }}
                  />
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => handleScan(form['Parent Batch ID'])}>
                    Load
                  </button>
                </div>
              </>
            )}
            {form['Parent Batch ID'] && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="label">What Changed (required)</label>
                <input
                  placeholder="e.g. Increased BYK-111 from 1.5% to 2.0%"
                  value={form['What Changed'] || ''}
                  onChange={e => setField('What Changed', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Identification */}
      <div className="section-title">Identification</div>
      <div className="form-row">
        <div className={fClass('Metal Type')}>
          <label className="label">Metal Type {badge('Metal Type')}</label>
          <select value={form['Metal Type']} onChange={e => setField('Metal Type', e.target.value)}>
            <option value="">— Select —</option>
            {['Copper','Silver','Bronze','Gold','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <Num label="Particle Size µm" name="Particle Size µm" placeholder="e.g. 1.5" />
      </div>
      <div className="form-row">
        <Num label="Total Batch Weight g" name="Total Batch Weight g" placeholder="e.g. 30" />
        <div className={fClass('Status')}>
          <label className="label">Status {badge('Status')}</label>
          <select value={form['Status']} onChange={e => setField('Status', e.target.value)}>
            {['Active','Depleted','Retired','On Hold'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Formulation */}
      <div className="section-title">Formulation</div>
      <div className="form-row">
        <Num label="Vol% Loading" name="Vol% Loading" placeholder="e.g. 30" />
        <Num label="HDDA wt%" name="HDDA wt%" placeholder="e.g. 50" />
      </div>
      <div className="form-row-3">
        <Num label="TMPTA wt%" name="TMPTA wt%" placeholder="e.g. 30" />
        <Num label="PEGDA wt%" name="PEGDA wt%" placeholder="e.g. 20" />
        <Num label="BAPO wt%" name="BAPO wt%" placeholder="e.g. 1.5" />
      </div>
      <div className="form-row">
        <Num label="BYK-111 wt%" name="BYK-111 wt%" placeholder="e.g. 1.5" />
        <Num label="Fumed Silica wt%" name="Fumed Silica wt%" placeholder="e.g. 1" />
      </div>
      <div className={fClass('Additional Components')}>
        <label className="label">Additional Components {badge('Additional Components')}</label>
        <input
          placeholder="Any other additives"
          value={form['Additional Components'] || ''}
          onChange={e => setField('Additional Components', e.target.value)}
        />
      </div>

      {/* Process */}
      <div className="section-title">Process</div>
      <DropdownOther
        label="Mixing Method"
        options={['Shear Mixer','Ball Mill','Ultrasonic','Shear+Ultrasonic','Ball Mill+Ultrasonic']}
        value={form['Mixing Method']} otherValue={form['Mixing Method Other']}
        onChange={v => setField('Mixing Method', v)}
        onOtherChange={v => setField('Mixing Method Other', v)}
      />
      <div className="form-row">
        <Num label="Mixing Duration min" name="Mixing Duration min" placeholder="e.g. 15" />
        <div className={fClass('Degas Method')}>
          <label className="label">Degas Method {badge('Degas Method')}</label>
          <input
            placeholder="e.g. Vacuum 15 min"
            value={form['Degas Method'] || ''}
            onChange={e => setField('Degas Method', e.target.value)}
          />
        </div>
      </div>
      <DropdownOther
        label="Viscosity Observation"
        options={['Water-like','Honey-like','Paste-like','Gel-like']}
        value={form['Viscosity Observation']} otherValue={form['Viscosity Other']}
        onChange={v => setField('Viscosity Observation', v)}
        onOtherChange={v => setField('Viscosity Other', v)}
      />
      <div className={fClass('Settlement Observation')}>
        <label className="label">Settlement Observation {badge('Settlement Observation')}</label>
        <input
          placeholder="e.g. No settlement in 2hr"
          value={form['Settlement Observation'] || ''}
          onChange={e => setField('Settlement Observation', e.target.value)}
        />
      </div>

      {/* SOP */}
      <div className="section-title">SOP & Notes</div>
      <div className={fClass('SOP Text')}>
        <label className="label">SOP / Procedure {badge('SOP Text')}</label>
        <textarea rows={5}
          placeholder="Step-by-step preparation procedure..."
          value={form['SOP Text'] || ''}
          onChange={e => setField('SOP Text', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="label">Notes</label>
        <textarea rows={3}
          placeholder="Any additional observations..."
          value={form['Notes'] || ''}
          onChange={e => setField('Notes', e.target.value)}
        />
      </div>

      {/* Attachments */}
      <div className="section-title">Images</div>
      <LinkUpload
        label="Paste Google Drive / Photos share links"
        value={imageLinks} onChange={setImageLinks}
      />
      <div className="section-title">Documents</div>
      <LinkUpload
        label="Paste Google Drive PDF / document links"
        value={pdfLinks} onChange={setPdfLinks}
      />

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
