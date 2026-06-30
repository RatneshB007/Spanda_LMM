import React, { useState } from 'react';
import { driveImgUrl } from '../utils';

// Shows an image preview if it loads; otherwise shows a clickable
// fallback card so the link is never silently hidden.
export default function ImageThumb({ img, index }) {
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <a href={img.url} target="_blank" rel="noreferrer">
        {!failed ? (
          <img
            src={driveImgUrl(img.url)}
            alt={img.caption || `Image ${index + 1}`}
            style={{ width: '100%', borderRadius: 6, objectFit: 'cover', height: 120, background: 'var(--surface2)' }}
            onError={() => setFailed(true)}
          />
        ) : (
          <div style={{
            width: '100%', height: 120, borderRadius: 6,
            background: 'var(--surface2)', border: '1px dashed var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: 11, padding: 8, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🖼️</div>
            Preview unavailable<br />tap to open in Drive
          </div>
        )}
      </a>
      {img.caption && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{img.caption}</div>}
    </div>
  );
}
