import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import { serializeLinks, serializeTags, buildResinId, nextVersionForToday } from '../utils';
import BarcodeScanner from '../components/BarcodeScanner';
import BarcodeDisplay from '../components/BarcodeDisplay';
import DropdownOther from '../components/DropdownOther';
import LinkUpload from '../components/LinkUpload';
import { TagEditor } from '../components/StarTag';
import FormulationBuilder, { serializeFormulation, deserializeFormulation } from '../components/FormulationBuilder';
import MixingProfile, { serializeMixingProfile, deserializeMixingProfile } from '../components/MixingProfile';

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
  const [customId, setCustomId] = useState('');
  const [idEdited, setIdEdited] = useState(false);
  const [inherited, setInherited] = useState({});
  const [modified, setModified] = useState({});
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [imageLinks, setImageLinks] = useState([]);
  const [pdfLinks, setPdfLinks] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [fillKey, setFillKey] = useState(0);
  const [components, setComponents] = useState([]);
  const [mixingSteps, setMixingSteps] = useState([]);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // DRAFT: restore unsaved form from sessionStorage on mount (survives navigation)
  useEffect(() => {
    if (editId) return; // edit mode loads from API, not draft
    const draft = sessionStorage.getItem('resin_draft');
    if (!draft) return;
    try {
      const saved = JSON.parse(draft);
      if (saved.form) { setForm(f => ({ ...f, ...saved.form })); setIdEdited(true); }
      if (saved.customId) setCustomId(saved.customId);
      if (saved.components && saved.components.length > 0) setComponents(saved.components);
      if (saved.mixingSteps && saved.mixingSteps.length > 0) setMixingSteps(saved.mixingSteps);
      if (saved.tags && saved.tags.length > 0) setTags(saved.tags);
      if (saved.imageLinks) setImageLinks(saved.imageLinks);
      if (saved.pdfLinks) setPdfLinks(saved.pdfLinks);
      setFillKey(k => k + 1);
    } catch (e) {}
  }, []);

  // Save draft to sessionStorage on every change
  useEffect(() => {
    if (editId || savedId) return;
    const draft = { form, customId, components, mixingSteps, tags, imageLinks, pdfLinks };
    sessionStorage.setItem('resin_draft', JSON.stringify(draft));
  }, [form, customId, components, mixingSteps, tags, imageLinks, pdfLinks]);

  // EDIT MODE: load existing record once on mount
  useEffect(() => {
    if (!editId) return;
    api.getResinBatch(editId).then(existing => {
      if (existing.error) { setError('Could not load batch for editing: ' + existing.error); setLoadingEdit(false); return; }
      setForm(f => ({ ...f, ...existing }));
      setCustomId(existing['Full ID']);
      setIdEdited(true); // don't auto-regenerate ID in edit mode
      const inh = {};
      (existing['Inherited Fields'] || '').split('|').filter(Boolean).forEach(k => { inh[k] = true; });
      setInherited(inh);
      const mod = {};
      (existing['Modified Fields'] || '').split('|').filter(Boolean).forEach(k => { mod[k] = true; });
      setModified(mod);
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
      setFillKey(k => k + 1);
      const existingComps = deserializeFormulation(existing['Formulation']);
      if (existingComps.length > 0) setComponents(existingComps);
      const existingMix = deserializeMixingProfile(existing['Mixing Profile']);
      if (existingMix.length > 0) setMixingSteps(existingMix);
      setLoadingEdit(false);
    }).catch(e => { setError('Failed to load: ' + e.message); setLoadingEdit(false); });
    // eslint-disable-next-line
  }, [editId]);

  // Auto-generate ID whenever Metal Type or Renewed status changes (unless user manually edited it)
  useEffect(() => {
    async function regen() {
      if (!form['Metal Type'] || idEdited) return;
      try {
        const all = await api.getAllResinBatches();
        const version = nextVersionForToday(all, form['Metal Type']);
        const isRenewed = form['Type'] === 'Renewed'; // Clone does NOT get REN prefix
        setCustomId(buildResinId(form['Metal Type'], version, isRenewed));
      } catch (e) { /* silent — id stays editable manually */ }
    }
    regen();
    // eslint-disable-next-line
  }, [form['Metal Type'], form['Type']]);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (inherited[key] !== undefined) setModified(m => ({ ...m, [key]: true }));
  }

  async function handleScan(url) {
    setScanning(false);
    let parentId = url;
    if (url.includes('/resin/')) parentId = decodeURIComponent(url.split('/resin/')[1]);
    parentId = parentId.split('#')[0].trim();
    try {
      const parent = await api.getResinBatch(parentId);
      if (parent.error) { setError('Batch not found: ' + parentId); return; }

      // Fields to NEVER inherit
      const EXCLUDE = new Set([
        'Type', 'Parent Batch ID', 'Parent Batch Link', 'What Changed',
        'Image Links', 'PDF Links', 'Notes', 'Tags',
        'Starred', 'Inherited Fields', 'Modified Fields',
        'Full ID', 'Batch ID', 'Version', 'Date Prepared', 'Status',
      ]);

      // Inherit ALL non-excluded fields from parent into form
      const inh = {};
      Object.keys(parent).forEach(k => {
        if (!EXCLUDE.has(k) && parent[k] !== undefined && parent[k] !== '') {
          inh[k] = parent[k];
        }
      });

      setInherited(inh);
      setModified({});
      // Preserve Clone vs Renewed — don't force to Renewed
      const currentType = form['Type'] === 'Clone' ? 'Clone' : 'Renewed';
      setForm(f => ({ ...f, ...inh, 'Parent Batch ID': parentId, 'Type': currentType, 'What Changed': '' }));

      // Load formulation components from parent
      if (parent['Formulation']) {
        const parentComps = parent['Formulation'].split(';;').filter(Boolean).map(s => {
          const [name, category, amount, unit] = s.split('|');
          return { name: name||'', category: category||'Other', amount: amount||'', unit: unit||'wt% of total' };
        });
        setComponents(parentComps);
      }
      if (parent['Mixing Profile']) {
        const parentMix = deserializeMixingProfile(parent['Mixing Profile']);
        setMixingSteps(parentMix);
      }

      setFillKey(k => k + 1);
      setError('');
    } catch (e) {
      setError('Failed to load parent batch: ' + e.message);
    }
  }

  async function handleSubmit() {
    if (!form['Metal Type']) { setError('Metal Type is required'); return; }
    if (!customId) { setError('Batch ID could not be generated — check Metal Type'); return; }
    if (form['Type'] === 'Renewed' && !form['What Changed']) {
      setError('"What Changed" is required for renewed batches'); return;
    }
    // Clone: clear parent reference so it saves as independent batch
    if (form['Type'] === 'Clone') { setForm(f => ({ ...f, 'Parent Batch ID': '', 'Parent Batch Link': '', 'Type': 'Fresh' })); }
    setSaving(true);
    setError('');
    try {
      if (!isEditMode) {
        const check = await api.checkIdExists(customId, 'resin');
        if (check.exists) { setError(`ID "${customId}" already exists — edit it to make it unique`); setSaving(false); return; }
      }

      const payload = {
        ...form,
        'Full ID': customId,
        'Image Links': serializeLinks(imageLinks),
        'PDF Links': serializeLinks(pdfLinks),
        'Inherited Fields': Object.keys(inherited).join('|'),
        'Modified Fields': Object.keys(modified).join('|'),
        'Tags': serializeTags(tags),
        'Formulation': serializeFormulation(components),
        'Mixing Profile': serializeMixingProfile(mixingSteps),
      };
      const result = isEditMode
        ? await api.updateResinBatch(payload)
        : await api.createResinBatch(payload);
      sessionStorage.removeItem('resin_draft');
      setSavedId(isEditMode ? customId : result.id);
    } catch (e) {
      setError('Save failed: ' + e.message);
    }
    setSaving(false);
  }

  function badge(key) {
    if (!inherited[key]) return null;
    return modified[key] ? <span className="field-badge modified">✎ Modified</span> : <span className="field-badge inherited">🔒 Inherited</span>;
  }
  function fClass(key) {
    if (!inherited[key]) return 'form-group';
    return `form-group ${modified[key] ? 'field-modified' : 'field-inherited'}`;
  }
  function Num({ label, name, placeholder }) {
    return (
      <div className={fClass(name)}>
        <label className="label">{label} {badge(name)}</label>
        <input key={name + '_' + fillKey} type="number" inputMode="decimal"
          defaultValue={form[name] || ''} placeholder={placeholder}
          onBlur={e => setField(name, e.target.value)} />
      </div>
    );
  }

  if (loadingEdit) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;
  }

  if (savedId) {
    const qrUrl = `${APP_BASE}/#/resin/${encodeURIComponent(savedId)}`;
    return (
      <div className="page">
        <div className="alert alert-success">✓ Resin batch {isEditMode ? 'updated' : 'saved'}</div>
        <div className="batch-chip" style={{ fontSize: 18, padding: '8px 16px', marginBottom: 20 }}>{savedId}</div>
        <BarcodeDisplay value={savedId} label={savedId} size={200} />
        {/*<BarcodeDisplay value={qrUrl} label={savedId} size={200} />*/}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => nav(`/resin/${encodeURIComponent(savedId)}`)}>View Batch →</button>
          <button className="btn btn-primary" onClick={() => {
            setForm({ ...EMPTY }); setInherited({}); setModified({}); setSavedId('');
            setFillKey(0); setImageLinks([]); setPdfLinks([]); setTags([]);
            setCustomId(''); setIdEdited(false); setMixingSteps([]);
            sessionStorage.removeItem('resin_draft');
          }}>+ New Batch</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">{isEditMode ? 'Edit Resin Batch' : 'New Resin Batch'}</div>

      {/* Auto-generated editable ID */}
      <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(200,118,26,0.3)' }}>
        <label className="label">Batch ID {!idEdited && <span className="field-badge inherited">auto</span>}</label>
        <input
          style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--copper-lt)', fontWeight: 600 }}
          value={customId}
          placeholder="Select Metal Type below to auto-generate"
          onChange={e => { setCustomId(e.target.value); setIdEdited(true); }}
        />
        <div className="hint">Auto-fills as Metal_Version_Date (e.g. Cu_V1_300626). Edit freely if needed.</div>
      </div>

      {/* Batch Type */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Batch Type</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { key: 'Fresh', label: '🧪 Freshly Prepared' },
            { key: 'Clone', label: '⧉ Clone from Existing' },
            { key: 'Renewed', label: '🔄 Renewed from Previous' },
          ].map(({ key, label }) => (
            <button key={key} className={`btn ${form['Type'] === key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setForm(f => ({ ...f, 'Type': key }));
                if (key === 'Fresh') { setInherited({}); setModified({}); setComponents([]); setFillKey(k => k + 1); setIdEdited(false); }
              }}>
              {label}
            </button>
          ))}
        </div>

        {form['Type'] === 'Renewed' && (
          <div style={{ marginTop: 16 }}>
            {form['Parent Batch ID'] && Object.keys(inherited).length > 0 ? (
              <div className="alert alert-success">✓ Loaded from <strong>{form['Parent Batch ID']}</strong> — edit only what changed below</div>
            ) : (
              <>
                {scanning
                  ? <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />
                  : <button className="btn btn-secondary" onClick={() => setScanning(true)}>📷 Scan Old Resin QR</button>}
                <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID manually:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="e.g. Cu_V1_300626" value={form['Parent Batch ID']}
                    onChange={e => setForm(f => ({ ...f, 'Parent Batch ID': e.target.value }))} style={{ maxWidth: 220 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => handleScan(form['Parent Batch ID'])}>Load</button>
                </div>
              </>
            )}
            {form['Parent Batch ID'] && form['Type'] === 'Renewed' && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="label">What Changed (required)</label>
                <input placeholder="e.g. Increased BYK-111 from 1.5% to 2.0%"
                  value={form['What Changed'] || ''} onChange={e => setField('What Changed', e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clone UI — identical scan mechanic to Renewed but no parent relationship */}
      {form['Type'] === 'Clone' && (
        <div style={{ marginTop: 16 }}>
          {form['Parent Batch ID'] && Object.keys(inherited).length > 0 ? (
            <div className="alert alert-success">
              ✓ Cloned from <strong>{form['Parent Batch ID']}</strong> — edit what's different, save as new independent batch
            </div>
          ) : (
            <>
              {scanning
                ? <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />
                : <button className="btn btn-secondary" onClick={() => setScanning(true)}>📷 Scan Source Resin Barcode</button>
              }
              <div style={{ margin: '10px 0', color: 'var(--muted)', fontSize: 12 }}>or type batch ID:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="e.g. Cu_V1_300626" value={form['Parent Batch ID']}
                  onChange={e => setForm(f => ({ ...f, 'Parent Batch ID': e.target.value }))} style={{ maxWidth: 220 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => handleScan(form['Parent Batch ID'])}>Load</button>
              </div>
            </>
          )}
        </div>
      )}

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
      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="label">Total Batch Target (g)</label>
          <input key={'totalBatch_' + fillKey} type="number" inputMode="decimal"
            defaultValue={form['Total Batch Weight g'] || ''}
            placeholder="e.g. 100"
            onBlur={e => setField('Total Batch Weight g', e.target.value)} />
        </div>
      </div>
      <FormulationBuilder
        value={components}
        onChange={setComponents}
        totalBatch={form['Total Batch Weight g']}
      />

      {/* Process */}
      <div className="section-title">Mixing Process</div>
      <MixingProfile value={mixingSteps} onChange={setMixingSteps} />
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="label">Degas Method</label>
        <input placeholder="e.g. Vacuum 15 min" value={form['Degas Method'] || ''}
          onChange={e => setField('Degas Method', e.target.value)} />
      </div>
      <DropdownOther label="Viscosity Observation"
        options={['Water-like','Honey-like','Paste-like','Gel-like']}
        value={form['Viscosity Observation']} otherValue={form['Viscosity Other']}
        onChange={v => setField('Viscosity Observation', v)} onOtherChange={v => setField('Viscosity Other', v)} />
      <div className={fClass('Settlement Observation')}>
        <label className="label">Settlement Observation {badge('Settlement Observation')}</label>
        <input placeholder="e.g. No settlement in 2hr" value={form['Settlement Observation'] || ''}
          onChange={e => setField('Settlement Observation', e.target.value)} />
      </div>

      {/* SOP */}
      <div className="section-title">SOP & Notes</div>
      <div className={fClass('SOP Text')}>
        <label className="label">SOP / Procedure {badge('SOP Text')}</label>
        <textarea rows={5} placeholder="Step-by-step preparation procedure..."
          value={form['SOP Text'] || ''} onChange={e => setField('SOP Text', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Notes</label>
        <textarea rows={3} placeholder="Any additional observations, issues, or raw data..."
          value={form['Notes'] || ''} onChange={e => setField('Notes', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Conclusion</label>
        <textarea rows={3} placeholder="What did you conclude from this batch? Shown in Browse list..."
          value={form['Conclusion'] || ''} onChange={e => setField('Conclusion', e.target.value)} />
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
