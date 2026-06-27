// Convert Google Drive share URL to direct-display URL for <img> tags
export function driveImgUrl(url) {
  if (!url) return '';
  // Format: https://drive.google.com/file/d/FILE_ID/view...
  const m1 = url.match(/\/file\/d\/([^/?#]+)/);
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
  // Format: https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&#]+)/);
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
  // Already a direct URL or unknown format — return as-is
  return url;
}

// Serialize link array to pipe-separated string for Sheets storage
export function serializeLinks(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.filter(r => r.url).map(r => `${r.url}||${r.caption}`).join('|PIPE|');
}

// Deserialize from Sheets storage back to link array
export function deserializeLinks(str) {
  if (!str) return [];
  return str.split('|PIPE|').filter(Boolean).map(s => {
    const [url, caption] = s.split('||');
    return { url: url || '', caption: caption || '' };
  });
}
