import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDate, deserializeTags } from '../utils';
import { deserializeFormulation } from '../components/FormulationBuilder';
import { StarButton, TagChips } from '../components/StarTag';

const RESIN_STATUSES = ['Active', 'Depleted', 'Retired', 'On Hold'];
const EXP_STATUSES = ['Planned', 'Printing', 'Green Body Done', 'Sintering', 'Complete', 'Failed'];

export default function Browse() {
  const [view, setView] = useState('resin'); // 'resin' | 'experiment'
  const [resins, setResins] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState(null);
  const [starredOnly, setStarredOnly] = useState(false);

  useEffect(() => {
    Promise.all([api.getAllResinBatches(), api.getAllExperiments()])
      .then(([r, e]) => { setResins(r); setExperiments(e); })
      .finally(() => setLoading(false));
  }, []);

  const items = view === 'resin' ? resins : experiments;
  const statuses = view === 'resin' ? RESIN_STATUSES : EXP_STATUSES;

  const allTags = useMemo(() => {
    const set = new Set();
    items.forEach(i => deserializeTags(i['Tags']).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [items, view]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (statusFilter !== 'All' && i['Status'] !== statusFilter) return false;
      if (starredOnly && i['Starred'] !== 'TRUE') return false;
      if (tagFilter && !deserializeTags(i['Tags']).includes(tagFilter)) return false;
      return true;
    });
  }, [items, statusFilter, starredOnly, tagFilter]);

  function statusClass(s) {
    const m = {
      Active: 'status-active', Depleted: 'status-depleted', Retired: 'status-retired', 'On Hold': 'status-onhold',
      Planned: 'status-planned', Printing: 'status-printing', 'Green Body Done': 'status-greenbody',
      Sintering: 'status-sintering', Complete: 'status-complete', Failed: 'status-failed',
    };
    return m[s] || 'status-active';
  }

  function handleStarToggle(idx, newVal) {
    if (view === 'resin') {
      setResins(r => r.map((item, i) => i === idx ? { ...item, Starred: newVal } : item));
    } else {
      setExperiments(e => e.map((item, i) => i === idx ? { ...item, Starred: newVal } : item));
    }
  }

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>;

  return (
    <div className="page-wide">
      <div className="page-title">Browse Lab Records</div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${view === 'resin' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setView('resin'); setStatusFilter('All'); setTagFilter(null); }}>
          🧪 Resin Batches ({resins.length})
        </button>
        <button className={`btn ${view === 'experiment' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setView('experiment'); setStatusFilter('All'); setTagFilter(null); }}>
          🔬 Experiments ({experiments.length})
        </button>
      </div>

      {/* Status filter */}
      <div className="section-title" style={{ marginTop: 0 }}>Filter by Status</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={`btn btn-sm ${statusFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('All')}>All ({items.length})</button>
        {statuses.map(s => {
          const count = items.filter(i => i['Status'] === s).length;
          return (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}>{s} ({count})</button>
          );
        })}
        <button className={`btn btn-sm ${starredOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStarredOnly(s => !s)}>
          ⭐ Starred ({items.filter(i => i['Starred'] === 'TRUE').length})
        </button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <>
          <div className="section-title">Filter by Tag</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button className={`btn btn-sm ${!tagFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTagFilter(null)}>All Tags</button>
            {allTags.map(t => (
              <button key={t} className={`btn btn-sm ${tagFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTagFilter(t)}>🏷 {t}</button>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      <div className="section-title">
        {filtered.length} {view === 'resin' ? 'Batch' : 'Experiment'}{filtered.length !== 1 ? 'es' : ''}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No records match this filter.</div>
      ) : view === 'resin' ? (
        filtered.map((r) => {
          const idx = resins.indexOf(r);
          return (
            <Link key={r['Full ID']} to={`/resin/${encodeURIComponent(r['Full ID'])}`} className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <StarButton id={r['Full ID']} type="resin" starred={r['Starred']}
                    onToggle={(v) => handleStarToggle(idx, v)} />
                  <span className="batch-chip">{r['Full ID']}</span>
                  <span className={`status ${statusClass(r['Status'])}`}>{r['Status']}</span>
                </div>
                <div className="list-item-meta">
                  {(() => {
                    const comps = deserializeFormulation(r['Formulation']);
                    const metal = comps.find(c => c.category === 'Metal Filler');
                    const names = comps.map(c => c.name).filter(Boolean).join(' · ');
                    return metal
                      ? `${metal.name} ${metal.amount}${metal.unit.includes('vol') ? 'vol%' : 'wt%'} — ${names} · ${r['Date Prepared']}`
                      : r['Date Prepared'];
                  })()}
                </div>
                {r['Notes'] && (
                  <div style={{ fontSize:11, color:'var(--faint)', marginTop:2, fontStyle:'italic',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>
                    "{r['Notes']}"
                  </div>
                )}
                <TagChips tags={deserializeTags(r['Tags'])} />
              </div>
              <div style={{ color: 'var(--faint)', fontSize: 18 }}>›</div>
            </Link>
          );
        })
      ) : (
        filtered.map((e) => {
          const idx = experiments.indexOf(e);
          return (
            <Link key={e['Experiment ID']} to={`/experiment/${e['Experiment ID']}`} className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <StarButton id={e['Experiment ID']} type="experiment" starred={e['Starred']}
                    onToggle={(v) => handleStarToggle(idx, v)} />
                  <span className="batch-chip">{e['Experiment ID']}</span>
                  <span className={`status ${statusClass(e['Status'])}`}>{e['Status']}</span>
                </div>
                <div className="list-item-meta">Resin: {e['Resin Batch Full ID']} · {e['Date']} · {e['Final Result'] || 'In progress'}</div>
                {(e['Key Findings'] || e['Conclusion']) && (
                  <div style={{ fontSize:11, color:'var(--faint)', marginTop:2, fontStyle:'italic',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>
                    "{e['Key Findings'] || e['Conclusion']}"
                  </div>
                )}
                <TagChips tags={deserializeTags(e['Tags'])} />
              </div>
              <div style={{ color: 'var(--faint)', fontSize: 18 }}>›</div>
            </Link>
          );
        })
      )}
    </div>
  );
}
