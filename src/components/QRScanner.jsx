import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError('Camera access denied. Please allow camera and retry.');
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        stopCamera();
        onScan(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  return (
    <div className="scan-area active">
      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <video ref={videoRef} className="scan-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {scanning && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Point camera at QR code</div>}
        </>
      )}
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
