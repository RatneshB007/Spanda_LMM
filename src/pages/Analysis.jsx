import React, { useEffect, useState } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../api';

export default function Analysis() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.getAllExperiments().then(setExperiments).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="spinner" /></div>;

  const metals = ['All', ...new Set(experiments.map(e => e['Resin Batch Full ID']?.split('-')[0]).filter(Boolean).map(p => p === 'CU' ? 'Copper' : p === 'AG' ? 'Silver' : p === 'BR' ? 'Bronze' : p))];

  const filtered = filter === 'All' ? experiments : experiments.filter(e => {
    const prefix = e['Resin Batch Full ID']?.split('-')[0];
    const name = prefix === 'CU' ? 'Copper' : prefix === 'AG' ? 'Silver' : prefix === 'BR' ? 'Bronze' : prefix;
    return name === filter;
  });

  // Cure depth proxy: exposure vs layers (what we have)
  const exposureData = filtered
    .filter(e => e['Exposure Time s'] && e['Layer Height µm'])
    .map(e => ({
      exposure: parseFloat(e['Exposure Time s']),
      layerH: parseFloat(e['Layer Height µm']),
      id: e['Experiment ID'],
    })).sort((a, b) => a.exposure - b.exposure);

  // Shrinkage data
  const shrinkageData = filtered
    .filter(e => e['X Shrinkage %'] || e['Y Shrinkage %'] || e['Z Shrinkage %'])
    .map(e => ({
      id: e['Experiment ID'],
      X: parseFloat(e['X Shrinkage %']) || 0,
      Y: parseFloat(e['Y Shrinkage %']) || 0,
      Z: parseFloat(e['Z Shrinkage %']) || 0,
    }));

  // Result breakdown
  const resultCounts = ['Success','Partial','Failed'].map(r => ({
    result: r,
    count: filtered.filter(e => e['Final Result'] === r).length,
  }));

  // Failure modes
  const failModes = {};
  filtered.filter(e => e['Failure Mode']).forEach(e => {
    const m = e['Failure Mode'];
    failModes[m] = (failModes[m] || 0) + 1;
  });
  const failData = Object.entries(failModes).map(([mode, count]) => ({ mode, count }));

  const chartStyle = { background: 'transparent' };
  const gridColor = '#2D3650';
  const textColor = '#8892AA';

  return (
    <div className="page-wide">
      <div className="page-title">Analysis Dashboard</div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {metals.map(m => (
          <button key={m} className={`btn btn-sm ${filter === m ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(m)}>{m}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>No experiment data yet. Run some experiments first.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 20 }}>

          {/* Exposure vs Layer Height */}
          {exposureData.length > 1 && (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Exposure Time vs Layer Height</div>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart style={chartStyle}>
                  <CartesianGrid stroke={gridColor} />
                  <XAxis dataKey="exposure" name="Exposure s" stroke={textColor} fontSize={11} label={{ value: 'Exposure (s)', position: 'insideBottom', offset: -5, fill: textColor, fontSize: 11 }} />
                  <YAxis dataKey="layerH" name="Layer µm" stroke={textColor} fontSize={11} label={{ value: 'Layer µm', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#1A1F2E', border: '1px solid #2D3650', borderRadius: 8, fontSize: 12 }} />
                  <Scatter data={exposureData} fill="#C8761A" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Shrinkage by experiment */}
          {shrinkageData.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Shrinkage by Experiment (%)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={shrinkageData} style={chartStyle}>
                  <CartesianGrid stroke={gridColor} />
                  <XAxis dataKey="id" stroke={textColor} fontSize={10} />
                  <YAxis stroke={textColor} fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1A1F2E', border: '1px solid #2D3650', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="X" fill="#C8761A" />
                  <Bar dataKey="Y" fill="#E8921F" />
                  <Bar dataKey="Z" fill="#F4B060" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Result breakdown */}
          {filtered.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Result Breakdown</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={resultCounts} style={chartStyle}>
                  <CartesianGrid stroke={gridColor} />
                  <XAxis dataKey="result" stroke={textColor} fontSize={12} />
                  <YAxis stroke={textColor} fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1A1F2E', border: '1px solid #2D3650', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Failure modes */}
          {failData.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Failure Modes</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={failData} layout="vertical" style={chartStyle}>
                  <CartesianGrid stroke={gridColor} />
                  <XAxis type="number" stroke={textColor} fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="mode" type="category" stroke={textColor} fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: '#1A1F2E', border: '1px solid #2D3650', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Raw data table */}
      <div className="section-title" style={{ marginTop: 32 }}>All Experiments — Raw Data</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--mono)' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['ID','Date','Resin','Exposure s','Layer µm','X%','Y%','Z%','Surface','Result'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e['Experiment ID']} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--copper-lt)' }}>{e['Experiment ID']}</td>
                <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{e['Date']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Resin Batch Full ID']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Exposure Time s']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Layer Height µm']}</td>
                <td style={{ padding: '8px 12px' }}>{e['X Shrinkage %']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Y Shrinkage %']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Z Shrinkage %']}</td>
                <td style={{ padding: '8px 12px' }}>{e['Surface Condition']}</td>
                <td style={{ padding: '8px 12px', color: e['Final Result'] === 'Success' ? 'var(--success)' : e['Final Result'] === 'Failed' ? 'var(--danger)' : 'var(--warning)' }}>
                  {e['Final Result']}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
