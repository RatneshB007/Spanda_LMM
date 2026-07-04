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

  function printBarcode() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Barcode — ${label}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center;
               justify-content:center; min-height:100vh; margin:0; font-family:monospace; gap:8px; }
        svg { max-width: 300px; }
      </style>
      </head><body>
      ${svgStr}
      <div style="font-size:11px;color:#666;">${label}</div>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
    win.document.close();
  }

  if (!value) return null;

  return (
    <div className="qr-box">
      <svg ref={svgRef} style={{ maxWidth: width, borderRadius: 4 }} />
      <div className="qr-label">{label}</div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={printBarcode}>
        🖨 Print Barcode
      </button>
    </div>
  );
}
