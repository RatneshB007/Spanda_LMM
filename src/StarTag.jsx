import React, { useState } from 'react';
import { api } from '../api';

// Star toggle button — calls backend immediately
export function StarButton({ id, type, starred, onToggle }) {
  const [busy, setBusy] = useState(false);
  const isStarred = starred === 'TRUE' || starred === true;

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await api.toggleStar(id, type);
      onToggle && onToggle(res.starred);
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 18, padding: '2px 4px', lineHeight: 1,
        opacity: busy ? 0.5 : 1,
      }}
      title={isStarred ? 'Unstar' : 'Star this'}
    >
      {isStarred ? '⭐' : '☆'}
    </button>
  );
}

// Tag editor — add/remove tags, free text
export function TagEditor({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  function addTag() {
    const t = input.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInput('');
  }

  function removeTag(t) {
    onChange(tags.filter(x => x !== t));
  }

  return (
    <div className="form-group">
      <label className="label">Tags</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tags.map(t => (
          <span key={t} className="batch-chip" style={{ fontSize: 11, padding: '3px 8px' }}>
            {t}
            <span onClick={() => removeTag(t)} style={{ marginLeft: 6, cursor: 'pointer', color: 'var(--danger)' }}>✕</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="e.g. best-shrinkage, needs-retry"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        />
        <button className="btn btn-secondary btn-sm" onClick={addTag}>+ Add</button>
      </div>
      <div className="hint">Press Enter or click Add. Use your own categories — e.g. reference, failed-batch, client-sample.</div>
    </div>
  );
}

// Read-only tag chips for detail/list views
export function TagChips({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
      {tags.map(t => (
        <span key={t} style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)',
        }}>{t}</span>
      ))}
    </div>
  );
}
