import React from 'react';

export default function LinkUpload({ label, value = [], onChange }) {
  function addRow() {
    onChange([...value, { url: '', caption: '' }]);
  }
  function updateRow(i, field, val) {
    onChange(value.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeRow(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      {value.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Paste Google Drive / Photos share link"
            value={row.url}
            onChange={e => updateRow(i, 'url', e.target.value)}
            style={{ flex: 2, minWidth: 180 }}
          />
          <input
            placeholder="Caption / label"
            value={row.caption}
            onChange={e => updateRow(i, 'caption', e.target.value)}
            style={{ flex: 1, minWidth: 100 }}
          />
          {row.url && (
            <a href={row.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--info)', whiteSpace: 'nowrap' }}>View</a>
          )}
          <button className="btn btn-danger btn-sm"
            onClick={() => removeRow(i)} style={{ padding: '6px 10px', flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addRow}>+ Add Link</button>
      <div className="hint" style={{ marginTop: 6 }}>
        Upload to Google Drive → right-click → Share → Copy link → paste above
      </div>
    </div>
  );
}
