import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({ value, label, size = 180 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [value, size]);

  function printQR() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR — ${label}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;font-size:13px;gap:10px;}</style>
      </head><body>
      <img src="${canvas.toDataURL()}" style="width:200px;height:200px;" />
      <div>${label}</div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  }

  if (!value) return null;

  return (
    <div className="qr-box">
      <canvas ref={canvasRef} />
      <div className="qr-label">{label}</div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={printQR}>
        🖨 Print QR
      </button>
    </div>
  );
}
