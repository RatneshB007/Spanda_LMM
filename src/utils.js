// ── Google Drive image URL converter ─────────────────────
export function driveImgUrl(url) {
  if (!url) return '';
  const m1 = url.match(/\/file\/d\/([^/?#]+)/);
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
  const m2 = url.match(/[?&]id=([^&#]+)/);
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
  return url;
}

// ── Date formatting — handles ISO strings AND Google Sheets serial numbers ──
export function formatDate(raw) {
  if (!raw) return '—';
  // Google Sheets serial number (days since 30 Dec 1899)
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d{5}$/.test(raw.trim()))) {
    const serial = parseInt(raw);
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  // ISO string or date string
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw; // unparseable — show as-is
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return raw;
  }
}

// ── Link serialization for Sheets storage ────────────────
export function serializeLinks(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.filter(r => r.url).map(r => `${r.finalUrl || r.url}||${r.caption}`).join('|PIPE|');
}

export function deserializeLinks(str) {
  if (!str) return [];
  return str.split('|PIPE|').filter(Boolean).map(s => {
    const [url, caption] = s.split('||');
    return { url: url || '', caption: caption || '' };
  });
}

// ── Tag serialization ─────────────────────────────────────
export function serializeTags(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.map(t => t.trim()).filter(Boolean).join(',');
}

export function deserializeTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

// ── Metal abbreviation map ────────────────────────────────
export const METAL_ABBR = {
  Copper: 'Cu', Silver: 'Ag', Bronze: 'Br', Gold: 'Au', Other: 'Ot',
};

// ── Date as DDMMYY ─────────────────────────────────────────
export function todayDDMMYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// ── Build resin ID: Cu_V1_300626 or Cu_REN_V3_300626 ──────
export function buildResinId(metalType, version, isRenewed) {
  const abbr = METAL_ABBR[metalType] || 'Xx';
  const date = todayDDMMYY();
  return isRenewed
    ? `${abbr}_REN_V${version}_${date}`
    : `${abbr}_V${version}_${date}`;
}

export function nextVersionForToday(allBatches, metalType) {
  const abbr = METAL_ABBR[metalType] || 'Xx';
  const date = todayDDMMYY();
  const prefix = `${abbr}_`;
  const todays = allBatches.filter(b => {
    const id = b['Full ID'] || '';
    return id.startsWith(prefix) && id.endsWith('_' + date);
  });
  return todays.length + 1;
}

// ── Build experiment ID: EX_300626_01 ─────────────────────
export function buildExperimentId(sequenceToday) {
  const date = todayDDMMYY();
  return `EX_${date}_${String(sequenceToday).padStart(2, '0')}`;
}

export function nextExpSequenceForToday(allExperiments) {
  const date = todayDDMMYY();
  const prefix = `EX_${date}_`;
  const todays = allExperiments.filter(e => (e['Experiment ID'] || '').startsWith(prefix));
  return todays.length + 1;
}

// ── Suggested filename for image/PDF ──────────────────────
export function suggestedFilename(parentId, caption, ext) {
  const safe = (caption || 'file').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 30);
  return `${parentId}__${safe}.${ext || 'jpg'}`;
}
