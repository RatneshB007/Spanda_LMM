import React, { useState } from 'react';
import { APP_PIN } from '../config';

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function press(digit) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === 8) {
      if (next === APP_PIN) {
        sessionStorage.setItem('lmm_unlocked', '1');
        onUnlock();
      } else {
        setTimeout(() => { setPin(''); setError(true); }, 300);
      }
    }
  }

  function del() { setPin(p => p.slice(0, -1)); setError(false); }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="pin-gate">
      <div className="pin-card">
        <div className="pin-title">⬡ LMM LAB</div>
        <div className="pin-subtitle">FlexMotion Technologies — Private</div>
        <div className="pin-dots">
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>
        <div className="pin-keys">
          {keys.map((k, i) => (
            <button
              key={i}
              className="pin-key"
              onClick={() => k === '⌫' ? del() : k ? press(k) : null}
              style={k === '' ? { background: 'transparent', border: 'none' } : {}}
            >{k}</button>
          ))}
        </div>
        {error && <div className="pin-error">Incorrect PIN — try again</div>}
      </div>
    </div>
  );
}
