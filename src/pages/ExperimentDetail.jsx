import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { APP_BASE } from '../config';
import { formatDate, deserializeLinks, deserializeTags } from '../utils';
import { deserializeSinteringProfile } from '../components/SinteringProfile';
import ImageThumb from '../components/ImageThumb';
import BarcodeDisplay from '../components/BarcodeDisplay';
import { StarButton, TagChips } from '../components/StarTag';

export default function ExperimentDetail() {
  const { id } = useParams();
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState('FALSE');

  useEffect(() => {
    api.getExperiment(id).then(e => { setExp(e); if (!e.error) setStarred(e['Starred']); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page" style={{ textAlign:'center', paddingTop:60 }}><div className="spinner" style={{ width:32, height:32, borderWidth:3 }} /></div>;
  if (!exp || exp.error) return <div className="page"><div className="alert alert-danger">Experiment not found</div></div>;

  const qrUrl = `${APP_BASE}/#/experiment/${id}`;
  const sinterSteps = deserializeSinteringProfile(exp['Sintering Profile']);
  const images = deserializeLinks(exp['Image Links']);
  const pdfs   = deserializeLinks(exp['PDF Links']);
  const tags   = deserializeTags(exp['Tags']);
  const isFailed = exp['Final Result'] === 'Failed' || exp['Final Result'] === 'Partial';

  function statusClass(s) {
    return { Complete:'status-complete', Failed:'status-failed', Planned:'status-planned',
      Printing:'status-printing', Sintering:'status-sintering', 'Green Body Done':'status-greenbody' }[s] || 'status-planned';
  }

  function Row({ label, val }) {
    if (!val) return null;
    return (
      <div className="detail-row">
        <span className="detail-key">{label}</span>
        <span className="detail-value">{val}</span>
      </div>
    );
  }

  function TextBlock({ label, val }) {
    if (!val) return null;
    return (
      <div style={{ marginBottom:16 }}>
        <div className="label">{label}</div>
        <p style={{ fontSize:13, lineHeight:1.7, color:'var(--text)', marginTop:4 }}>{val}</p>
      </div>
    );
  }

  function resolveOther(val, other) {
    return val === 'Other' ? (other || val) : val;
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
            <StarButton id={exp['Experiment ID']} type="experiment" starred={starred} onToggle={setStarred} />
            <span className="batch-chip" style={{ fontSize:16, padding:'6px 14px' }}>{exp['Experiment ID']}</span>
            <span className={`status ${statusClass(exp['Status'])}`}>{exp['Status']}</span>
          </div>
          <div style={{ color:'var(--muted)', fontSize:13 }}>{formatDate(exp['Date'])}</div>
          <TagChips tags={tags} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/experiment/new?edit=${encodeURIComponent(exp['Experiment ID'])}`} className="btn btn-secondary btn-sm">✎ Edit</Link>
          <Link to="/experiment/new" className="btn btn-primary btn-sm">+ New Experiment</Link>
        </div>
      </div>

      {/* Resin Link */}
      {exp['Resin Batch Full ID'] && (
        <div className="alert alert-info">
          🧪 Resin Batch:{' '}
          <Link to={`/resin/${encodeURIComponent(exp['Resin Batch Full ID'])}`}>
            <strong>{exp['Resin Batch Full ID']}</strong>
          </Link>
          {' '}— tap to view formulation
        </div>
      )}

      {/* QR */}
      <BarcodeDisplay value={qrUrl} label={exp['Experiment ID']} size={180} />

      {/* Print Settings */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Print Settings</div>
        <Row label="Printer" val={exp['Printer Model']} />
        <Row label="Layer Height µm" val={exp['Layer Height µm']} />
        <Row label="Exposure Time s" val={exp['Exposure Time s']} />
        <Row label="Bottom Exposure s" val={exp['Bottom Exposure s']} />
        <Row label="Lift Speed mm/min" val={exp['Lift Speed mm/min']} />
        <Row label="Rest Time s" val={exp['Rest Time s']} />
        <Row label="Total Layers" val={exp['Total Layers']} />
        <Row label="Print Duration" val={exp['Print Duration']} />
      </div>

      {/* Green Body */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Green Body</div>
        <Row label="Condition" val={resolveOther(exp['Green Body Condition'], exp['Green Body Other'])} />
        <TextBlock label="Observations" val={exp['Green Body Observations']} />
      </div>

      {/* Sinter Settings */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Sintering Profile</div>
        <Row label="Furnace Program" val={exp['Furnace Program No']} />
        {sinterSteps.length > 0 ? (
          <table style={{ width:'100%', borderCollapse:'collapse', marginTop:8, fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Step','Set Temp °C','Ramp Rate','Dwell','Atmosphere'].map(h => (
                  <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:10,
                    color:'var(--muted)', fontWeight:600, textTransform:'uppercase',
                    letterSpacing:'0.06em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sinterSteps.map((s, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'6px 8px', fontFamily:'var(--mono)', color:'var(--muted)' }}>{i+1}</td>
                  <td style={{ padding:'6px 8px', fontFamily:'var(--mono)', color:'var(--copper-lt)', fontWeight:600 }}>{s.setTemp}°C</td>
                  <td style={{ padding:'6px 8px', fontFamily:'var(--mono)' }}>{s.rampRate} {s.rampUnit}</td>
                  <td style={{ padding:'6px 8px', fontFamily:'var(--mono)' }}>{s.dwell} {s.dwellUnit}</td>
                  <td style={{ padding:'6px 8px', color:'var(--muted)' }}>{s.atmosphere}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color:'var(--muted)', fontSize:13, marginTop:6 }}>No sintering profile recorded.</div>
        )}
      </div>

      {/* Sinter Results */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Sinter Results</div>
        <Row label="X Shrinkage %" val={exp['X Shrinkage %']} />
        <Row label="Y Shrinkage %" val={exp['Y Shrinkage %']} />
        <Row label="Z Shrinkage %" val={exp['Z Shrinkage %']} />
        <Row label="Surface Condition" val={resolveOther(exp['Surface Condition'], exp['Surface Condition Other'])} />
        <TextBlock label="Observations" val={exp['Sinter Observations']} />
      </div>

      {/* Failure Analysis */}
      {isFailed && (
        <div className="card" style={{ borderColor:'rgba(239,68,68,0.3)' }}>
          <div className="section-title" style={{ marginTop:0, color:'var(--danger)' }}>Failure Analysis</div>
          <Row label="Failed At" val={exp['Failed At Stage']} />
          <Row label="Failure Mode" val={resolveOther(exp['Failure Mode'], exp['Failure Mode Other'])} />
          <TextBlock label="Probable Cause" val={exp['Probable Cause']} />
          <TextBlock label="Corrective Action" val={exp['Corrective Action']} />
        </div>
      )}

      {/* Conclusion */}
      <div className="card">
        <div className="section-title" style={{ marginTop:0 }}>Conclusion</div>
        <Row label="Final Result" val={resolveOther(exp['Final Result'], exp['Final Result Other'])} />
        <TextBlock label="Key Findings" val={exp['Key Findings']} />
        <TextBlock label="Next Experiment" val={exp['Next Experiment Recommendation']} />
        <TextBlock label="Conclusion" val={exp['Conclusion']} />
      </div>

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
    </div>
  );
}
