import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import BarcodeScanner from './BarcodeScanner';

function ManualLookup({ onScan }) {
  const [val, setVal] = React.useState('');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        placeholder="e.g. Cu_V1_040726 or EX_040726_01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onScan(val.trim()); }}
        style={{ fontSize: 13 }}
      />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => { if (val.trim()) onScan(val.trim()); }}
        style={{ flexShrink: 0 }}
      >Go</button>
    </div>
  );
}

export default function GlobalScanner() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleScan(code) {
    setOpen(false);
    setLoading(true);
    setError('');
    const id = code.trim();

    // Try resin first
    try {
      const resin = await api.getResinBatch(id);
      if (!resin.error) {
        navigate(`/resin/${encodeURIComponent(id)}`);
        setLoading(false);
        return;
      }
    } catch (e) {}

    // Try experiment
    try {
      const exp = await api.getExperiment(id);
      if (!exp.error) {
        navigate(`/experiment/${id}`);
        setLoading(false);
        return;
      }
    } catch (e) {}

    setError(`No record found for: "${id}"`);
    setLoading(false);
  }

  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => { setOpen(true); setError(''); }}
        style={{ fontWeight: 700, letterSpacing: '0.03em' }}
        title="Scan barcode to open record"
      >
        {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⌦ Scan'}
      </button>

      {error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--danger)', color: '#fff', padding: '10px 18px',
          borderRadius: 8, fontSize: 13, zIndex: 999, maxWidth: 320, textAlign: 'center',
        }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 10, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--copper-lt)', marginBottom: 16, fontWeight: 600 }}>
              Scan Barcode
            </div>
            <BarcodeScanner onScan={handleScan} onClose={() => setOpen(false)} />
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                Or type ID manually if scan fails:
              </div>
              <ManualLookup onScan={handleScan} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
