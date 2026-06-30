import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [resins, setResins] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAllResinBatches(), api.getAllExperiments()])
      .then(([r, e]) => { setResins(r); setExperiments(e); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const activeResins = resins.filter(r => r['Status'] === 'Active').length;
  const successExp = experiments.filter(e => e['Final Result'] === 'Success').length;

  const recentResins = [...resins].reverse().slice(0, 5);
  const recentExp = [...experiments].reverse().slice(0, 5);

  function statusClass(s) {
    const map = {
      'Active': 'status-active', 'Depleted': 'status-depleted',
      'Retired': 'status-retired', 'On Hold': 'status-onhold',
      'Complete': 'status-complete', 'Failed': 'status-failed',
      'Planned': 'status-planned', 'Printing': 'status-printing',
      'Sintering': 'status-sintering', 'Green Body Done': 'status-greenbody',
    };
    return map[s] || 'status-planned';
  }

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <div style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Loading lab data…</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-title">Lab Overview</div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{resins.length}</div>
          <div className="stat-lbl">Total Batches</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{activeResins}</div>
          <div className="stat-lbl">Active Resins</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{experiments.length}</div>
          <div className="stat-lbl">Experiments</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{successExp}</div>
          <div className="stat-lbl">Successes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">
            {experiments.length ? Math.round((successExp / experiments.length) * 100) : 0}%
          </div>
          <div className="stat-lbl">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">
            {experiments.filter(e => e['Status'] === 'Planned' || e['Status'] === 'Printing').length}
          </div>
          <div className="stat-lbl">In Progress</div>
        </div>
      </div>

      <div className="action-row">
        <Link to="/resin/new" className="btn btn-primary">+ New Resin Batch</Link>
        <Link to="/experiment/new" className="btn btn-secondary">+ New Experiment</Link>
        <Link to="/analysis" className="btn btn-secondary">📊 Analysis</Link>
        <Link to="/browse" className="btn btn-secondary">🔍 Browse & Filter</Link>
      </div>

      <div className="section-title">Recent Resin Batches</div>
      {recentResins.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No resin batches yet. Create your first one.</div>
      ) : recentResins.map(r => (
        <Link key={r['Full ID']} to={`/resin/${encodeURIComponent(r['Full ID'])}`} className="list-item">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="batch-chip">{r['Full ID']}</span>
              <span className={`status ${statusClass(r['Status'])}`}>{r['Status']}</span>
            </div>
            <div className="list-item-meta">{r['Metal Type']} · {r['Vol% Loading']}vol% · {r['Date Prepared']}</div>
          </div>
          <div style={{ color: 'var(--faint)', fontSize: 18 }}>›</div>
        </Link>
      ))}

      {resins.length > 5 && (
        <Link to="/resins" style={{ fontSize: 12, color: 'var(--copper-lt)' }}>View all {resins.length} batches →</Link>
      )}

      <div className="section-title" style={{ marginTop: 28 }}>Recent Experiments</div>
      {recentExp.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No experiments yet.</div>
      ) : recentExp.map(e => (
        <Link key={e['Experiment ID']} to={`/experiment/${e['Experiment ID']}`} className="list-item">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="batch-chip">{e['Experiment ID']}</span>
              <span className={`status ${statusClass(e['Status'])}`}>{e['Status']}</span>
            </div>
            <div className="list-item-meta">
              Resin: {e['Resin Batch Full ID']} · {e['Date']}
            </div>
          </div>
          <div style={{ color: 'var(--faint)', fontSize: 18 }}>›</div>
        </Link>
      ))}
    </div>
  );
}
