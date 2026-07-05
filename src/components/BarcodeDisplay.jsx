import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeDisplay({ value, label, width = 180 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1,
        height: 45,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
        fontOptions: 'bold',
      });
    } catch (e) {
      console.error('Barcode error:', e);
    }
  }, [value]);

  function downloadBarcode() {
    const svg = svgRef.current;
    if (!svg) return;

    // Render SVG to canvas at 3x for high DPI print quality
    const scale = 3;
    const svgRect = svg.getBoundingClientRect();
    const w = Math.round((svgRect.width || 300) * scale);
    const h = Math.round((svgRect.height || 100) * scale);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${label}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.onerror = () => {
      // Fallback: download SVG directly
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  }

  if (!value) return null;

  return (
    <div className="qr-box">
      <svg ref={svgRef} style={{ maxWidth: width, borderRadius: 4 }} />
      <div className="qr-label">{label}</div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={downloadBarcode}>
        ⬇ Download Barcode
      </button>
    </div>
  );
}
