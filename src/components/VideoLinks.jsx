import React from 'react';

export default function VideoLinks({ value = [], onChange }) {
  function addRow() { onChange([...value, { url: '', caption: '' }]); }
  function updateRow(i, field, val) {
    onChange(value.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeRow(i) { onChange(value.filter((_, idx) => idx !== i)); }

  return (
    <div className="form-group">
      {value.map((row, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <input
              placeholder="Paste Google Drive video share link"
              value={row.url}
              onChange={e => updateRow(i, 'url', e.target.value)}
              style={{ flex: 2, minWidth: 160 }}
            />
            <input
              placeholder="Caption"
              value={row.caption}
              onChange={e => updateRow(i, 'caption', e.target.value)}
              style={{ flex: 1, minWidth: 100 }}
            />
            <button className="btn btn-danger btn-sm" onClick={() => removeRow(i)}
              style={{ flexShrink: 0 }}>✕</button>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addRow}>+ Add Video Link</button>
      <div className="hint" style={{ marginTop: 6 }}>
        Upload video to Google Drive → Share → Copy link → paste above
      </div>
    </div>
  );
}

export function serializeVideoLinks(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.filter(r => r.url).map(r => `${r.url}||${r.caption}`).join('|PIPE|');
}

export function deserializeVideoLinks(str) {
  if (!str) return [];
  return str.split('|PIPE|').filter(Boolean).map(s => {
    const [url, caption] = s.split('||');
    return { url: url || '', caption: caption || '' };
  });
}

export function driveVideoUrl(url) {
  if (!url) return '';
  const m1 = url.match(/\/file\/d\/([^/?#]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  const m2 = url.match(/[?&]id=([^&#]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return url;
}
