import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';

export default function BarcodeScanner({ onScan, onClose }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const lastResult = useRef('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    let started = false;

    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: containerRef.current,
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      decoder: {
        readers: ['code_128_reader'],
        multiple: false,
      },
      locator: {
        patchSize: 'medium',
        halfSample: false,
      },
      locate: true,
      numOfWorkers: 2,
      frequency: 5,
    }, (err) => {
      if (err) {
        setError('Camera access denied or not available. Please allow camera access.');
        return;
      }
      Quagga.start();
      started = true;
      setScanning(true);
    });

    Quagga.onDetected((result) => {
      const code = result?.codeResult?.code;
      if (!code) return;
      // Debounce — same code must appear twice within 300ms to confirm
      if (code === lastResult.current) {
        clearTimeout(debounceTimer.current);
        Quagga.stop();
        onScan(code);
      } else {
        lastResult.current = code;
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => { lastResult.current = ''; }, 300);
      }
    });

    return () => {
      clearTimeout(debounceTimer.current);
      if (started) Quagga.stop();
    };
  }, []);

  return (
    <div className="scan-area active">
      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div
            ref={containerRef}
            style={{ width: '100%', maxHeight: 280, borderRadius: 8, overflow: 'hidden', position: 'relative', background: '#000' }}
          />
          {scanning && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Point camera at barcode — hold steady
            </div>
          )}
        </>
      )}
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
