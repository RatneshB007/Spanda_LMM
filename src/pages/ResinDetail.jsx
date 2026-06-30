import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import { deserializeLinks, deserializeTags } from '../utils';
import ImageThumb from '../components/ImageThumb';
import QRDisplay from '../components/QRDisplay';
import { StarButton, TagChips } from '../components/StarTag';

const FORMULATION_KEYS = [
  'Metal Type','Particle Size µm','Vol% Loading',
  'HDDA wt%','TMPTA wt%','PEGDA wt%','BAPO wt%',
  'BYK-111 wt%','Fumed Silica wt%','Additional Components','Total Batch Weight g',
];
const PROCESS_KEYS = [
  'Mixing Method','Mixing Duration min','Degas Method',
  'Viscosity Observation','Settlement Observation',
];

export default function ResinDetail() {
  const { id } = useParams();
  const decodedId = decodeURIComponent(id);
  const [batch, setBatch] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState('FALSE');

  useEffect(() => {
    Promise.all([api.getResinBatch(decodedId), api.getExperimentsByResin(decodedId)])
      .then(([b, e]) => { setBatch(b); setExperiments(e); setStarred(b['Starred']); })
      .finally(() => setLoading(false));
  }, [decodedId]);

  if (loading) return <div className="page" style={{ textAlign:'center', paddingTop: 60 }}><div className="spinner" style={{ width:32, height:32, borderWidth:3 }} /></div>;
  if (!batch || batch.error) return <div className="page"><div className="alert alert-danger">Batch not found</div></div>;

  const qrUrl = `${APP_BASE}/#/resin/${encodeURIComponent(decodedId)}`;
  const modifiedFields = (batch['Modified Fields'] || '').split('|').filter(Boolean);
  const images = deserializeLinks(batch['Image Links']);
  const pdfs   = deserializeLinks(batch['PDF Links']);
  const tags   = deserializeTags(batch['Tags']);

  function statusClass(s) {
    return { Active:'status-active', Depleted:'status-depleted', Retired:'status-retired', 'On Hold':'status-onhold' }[s] || 'status-active';
  }
  function expStatusClass(s) {
    return { Complete:'status-complete', Failed:'status-failed', Planned:'status-planned',
      Printing:'status-printing', Sintering:'status-sintering', 'Green Body Done':'status-greenbody' }[s] || 'status-planned';
  }

  function Row({ label, val, isModified }) {
    if (!val) return null;
    return (
      <div className="detail-row">
        <span className="detail-key">
          {label}
          {isModified && <span className="field-badge modified" style={{ marginLeft:6 }}>✎</span>}
        </span>
        <span className="detail-value">{val}</span>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
            <StarButton id={batch['Full ID']} type="resin" starred={starred} onToggle={setStarred} />
            <span className="batch-chip" style={{ fontSize:16, padding:'6px 14px' }}>{batch['Full ID']}</span>
            <span className={`status ${statusClass(batch['Status'])}`}>{batch['Status']}</span>
            {batch['Type'] === 'Renewed' && (
              <span className="status" style={{ background:'rgba(200,118,26,0.15)', color:'var(--copper-lt)' }}>Renewed</span>
            )}
          </div>
          <div style={{ color:'var(--muted)', fontSize:13 }}>Prepared: {batch['Date Prepared']}</div>
          <TagChips tags={tags} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/resin/new?edit=${encodeURIComponent(batch['Full ID'])}`} className="btn btn-secondary btn-sm">✎ Edit</Link>
          <Link to="/resin/new" className="btn btn-primary btn-sm">+ New Batch</Link>
        </div>
      </div>

      {/* Parent link */}
      {batch['Parent Batch ID'] && (
        <div className="alert alert-info">
          🔗 Renewed from{' '}
          <Link to={`/resin/${encodeURIComponent(batch['Parent Batch ID'])}`}>
            <strong>{batch['Parent Batch ID']}</strong>
          </Link>
          {batch['What Changed'] && <span> · Changes: {batch['What Changed']}</span>}
        </div>
      )}

      {/* QR */}
      <QRDisplay value={qrUrl} label={batch['Full ID']} size={180} />

      {/* Formulation */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Formulation</div>
        {FORMULATION_KEYS.map(k => (
          <Row key={k} label={k} val={batch[k]} isModified={modifiedFields.includes(k)} />
        ))}
      </div>

      {/* Process */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Process</div>
        {PROCESS_KEYS.map(k => {
          const val = batch[k] === 'Other' ? (batch[k + ' Other'] || batch[k]) : batch[k];
          return <Row key={k} label={k} val={val} isModified={modifiedFields.includes(k)} />;
        })}
      </div>

      {/* SOP */}
      {batch['SOP Text'] && (
        <div className="card">
          <div className="section-title" style={{ marginTop:0 }}>SOP / Procedure</div>
          <pre style={{ fontFamily:'var(--sans)', fontSize:13, color:'var(--text)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>
            {batch['SOP Text']}
          </pre>
        </div>
      )}

      {/* Notes */}
      {batch['Notes'] && (
        <div className="card">
          <div className="section-title" style={{ marginTop:0 }}>Notes</div>
          <p style={{ fontSize:13, lineHeight:1.6 }}>{batch['Notes']}</p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginTop:0 }}>Images</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:10 }}>
            {images.map((img, i) => (
              <ImageThumb key={i} img={img} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* PDFs */}
      {pdfs.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginTop:0 }}>Documents</div>
          {pdfs.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', fontSize:13, borderBottom:'1px solid var(--border)' }}>
              📄 {p.caption || `Document ${i+1}`}
            </a>
          ))}
        </div>
      )}

      {/* Linked Experiments */}
      <div className="section-title">Linked Experiments ({experiments.length})</div>
      {experiments.length === 0
        ? <div style={{ color:'var(--muted)', fontSize:13, marginBottom:12 }}>No experiments yet for this batch.</div>
        : experiments.map(e => (
          <Link key={e['Experiment ID']} to={`/experiment/${e['Experiment ID']}`} className="list-item">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                <span className="batch-chip">{e['Experiment ID']}</span>
                <span className={`status ${expStatusClass(e['Status'])}`}>{e['Status']}</span>
              </div>
              <div className="list-item-meta">{e['Date']} · {e['Final Result'] || 'In progress'}</div>
            </div>
            <div style={{ color:'var(--faint)', fontSize:18 }}>›</div>
          </Link>
        ))
      }
      <Link to="/experiment/new" className="btn btn-primary btn-sm" style={{ marginTop:8 }}>
        + New Experiment with this Batch
      </Link>
    </div>
  );
}
