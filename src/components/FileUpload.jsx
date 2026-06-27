import React, { useState } from 'react';
import { api, fileToBase64 } from '../api';

export default function FileUpload({ label, accept, onUpload, existingLinks = [] }) {
  const [files, setFiles] = useState(existingLinks.map(l => ({ url: l.url, caption: l.caption, uploading: false })));
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await api.uploadFile(base64, file.name, file.type);
      const newFile = { url: result.url, caption: '', uploading: false, name: file.name };
      const updated = [...files, newFile];
      setFiles(updated);
      onUpload(updated);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  }

  function updateCaption(i, caption) {
    const updated = files.map((f, idx) => idx === i ? { ...f, caption } : f);
    setFiles(updated);
    onUpload(updated);
  }

  function remove(i) {
    const updated = files.filter((_, idx) => idx !== i);
    setFiles(updated);
    onUpload(updated);
  }

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <div className="file-list">
        {files.map((f, i) => (
          <div key={i} className="file-item">
            <span className="file-name">{f.name || f.url?.split('/').pop()}</span>
            <input
              placeholder={accept?.includes('image') ? 'Caption (required)' : 'Label'}
              value={f.caption}
              onChange={e => updateCaption(i, e.target.value)}
            />
            <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--info)' }}>View</a>
            <button className="btn btn-danger btn-sm" onClick={() => remove(i)} style={{ padding: '4px 8px' }}>✕</button>
          </div>
        ))}
      </div>
      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', marginTop: 8 }}>
        {uploading ? <span className="spinner" /> : '+ Add File'}
        <input type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />
      </label>
    </div>
  );
}

// Serialize file list to pipe-separated string for storage
export function serializeFiles(files) {
  return files.map(f => `${f.url}||${f.caption}`).join('|PIPE|');
}

// Deserialize from storage
export function deserializeFiles(str) {
  if (!str) return [];
  return str.split('|PIPE|').filter(Boolean).map(s => {
    const [url, caption] = s.split('||');
    return { url, caption: caption || '' };
  });
}
