import React, { useState } from 'react';
import { api } from '../api';
import { suggestedFilename } from '../utils';

// LinkUpload — paste a Google Photos or Drive link, app tries to
// auto-copy it into the dedicated "LMM Lab Files" Drive folder with
// a backtraceable filename. Falls back to manual instructions if it fails.
export default function LinkUpload({ label, value = [], onChange, parentId }) {
  const [busyIndex, setBusyIndex] = useState(null);

  function addRow() {
    onChange([...value, { url: '', caption: '', fileType: 'jpg', finalUrl: '', status: '' }]);
  }
  function updateRow(i, field, val) {
    onChange(value.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeRow(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  async function tryAutoCopy(i) {
    const row = value[i];
    if (!row.url) return;
    setBusyIndex(i);
    // Use explicitly selected file type — no guessing
    const ext = row.fileType && row.fileType !== 'other'
      ? row.fileType
      : (row.url.match(/\.(jpg|jpeg|png|pdf|docx?|xlsx?)/i)?.[1] || 'jpg');
    const captionForName = row.caption?.trim() || `file${i + 1}`;
    const filename = suggestedFilename(parentId || 'FILE', captionForName, ext);
    try {
      const result = await api.copyToLabDrive(row.url, filename);
      // Single combined update — avoids stale-closure overwrite bug
      if (result.success) {
        onChange(value.map((r, idx) => idx === i
          ? { ...r, finalUrl: result.url, status: '✓ Copied to LMM Lab Files folder' }
          : r));
      } else {
        onChange(value.map((r, idx) => idx === i
          ? { ...r, finalUrl: r.url, status: '⚠ ' + (result.error || 'Auto-copy failed — link kept as-is') }
          : r));
      }
    } catch (e) {
      onChange(value.map((r, idx) => idx === i
        ? { ...r, finalUrl: r.url, status: '⚠ Auto-copy failed — link kept as-is. ' + e.message }
        : r));
    }
    setBusyIndex(null);
  }

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      {value.map((row, i) => (
        <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <input
              placeholder="Paste Google Photos or Drive share link"
              value={row.url}
              onChange={e => updateRow(i, 'url', e.target.value)}
              style={{ flex: 2, minWidth: 160 }}
            />
            <input
              placeholder="Caption / label"
              value={row.caption}
              onChange={e => updateRow(i, 'caption', e.target.value)}
              style={{ flex: 1, minWidth: 100 }}
            />
            <select
              value={row.fileType || 'jpg'}
              onChange={e => updateRow(i, 'fileType', e.target.value)}
              style={{ width: 80, flexShrink: 0, fontSize: 12 }}
            >
              <option value="jpg">Image</option>
              <option value="png">PNG</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="xlsx">Excel</option>
              <option value="other">Other</option>
            </select>
            <button className="btn btn-danger btn-sm" onClick={() => removeRow(i)} style={{ flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => tryAutoCopy(i)}
              disabled={!row.url || busyIndex === i}
            >
              {busyIndex === i ? <><span className="spinner" /> Copying…</> : '⇪ Copy to Lab Folder'}
            </button>
            {row.finalUrl && (
              <a href={row.finalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>View saved copy</a>
            )}
          </div>
          {row.status && (
            <div style={{ fontSize: 11, marginTop: 6, color: row.status.startsWith('✓') ? 'var(--success)' : 'var(--warning)' }}>
              {row.status}
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addRow}>+ Add Link</button>
      <div className="hint" style={{ marginTop: 6 }}>
        Paste a Google Photos or Drive share link, then click "Copy to Lab Folder" — the app saves a renamed copy into your dedicated Drive folder for easy backtracing later. If auto-copy fails, the original link is kept.
      </div>
    </div>
  );
}
