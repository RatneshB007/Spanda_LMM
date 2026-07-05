import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.listVideoInputDevices().then(devices => {
      // Prefer back camera
      const device = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1];

      const deviceId = device?.deviceId;

      reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          reader.reset();
          onScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException is normal — just means no code found in this frame
          console.warn('Scanner error:', err);
        }
      });

      setScanning(true);
    }).catch(err => {
      setError('Camera access denied or no camera found. Allow camera access and try again.');
    });

    return () => {
      try { readerRef.current?.reset(); } catch (e) {}
    };
  }, []);

  return (
    <div className="scan-area active">
      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="scan-video"
            style={{ width: '100%', maxHeight: 280, borderRadius: 8 }}
            playsInline
            muted
          />
          {scanning && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Point camera at barcode or QR code — hold steady
            </div>
          )}
        </>
      )}
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => {
        try { readerRef.current?.reset(); } catch (e) {}
        onClose();
      }}>
        Cancel
      </button>
    </div>
  );
}
