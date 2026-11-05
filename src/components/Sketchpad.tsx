import { useEffect, useRef, useState } from 'react';
import { clearSketch, loadSketch, saveSketch } from '../lib/sketchStorage';
import { getPersistPref } from '../lib/graphStorage';
import './Sketchpad.css';

/** A separate paper surface: the canvas stays mounted while the panel is hidden. */
export default function Sketchpad({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState('#273449');
  const [width, setWidth] = useState(3);
  const [error, setError] = useState('');
  const persistNow = () => {
    const c = canvas.current;
    if (c && getPersistPref() === 'remember' && !saveSketch(c.toDataURL('image/png'))) setError('Could not save this sketch in your browser. Download a PNG to keep it.');
  };
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1600, 1000); }
    const saved = loadSketch();
    if (saved) {
      const img = new Image();
      img.onload = () => { canvas.current?.getContext('2d')?.drawImage(img, 0, 0, 1600, 1000); };
      img.src = saved;
    }
  }, []);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - rect.left) * 1600 / rect.width, (e.clientY - rect.top) * 1000 / rect.height] as const;
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true;
    const ctx = e.currentTarget.getContext('2d'); if (!ctx) return;
    const [x, y] = point(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y + 0.01);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const ctx = e.currentTarget.getContext('2d'); if (!ctx) return;
    const [x, y] = point(e); ctx.lineTo(x, y); ctx.stroke();
  };
  const endStroke = () => { if (drawing.current) { drawing.current = false; persistNow(); } };
  const upload = (file?: File) => {
    if (!file) return; if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const ctx = canvas.current?.getContext('2d'); const scale = Math.min(1600 / img.width, 1000 / img.height, 1); ctx?.drawImage(img, 0, 0, img.width * scale, img.height * scale); URL.revokeObjectURL(url); setError(''); persistNow(); };
    img.onerror = () => { URL.revokeObjectURL(url); setError('Could not open that image.'); }; img.src = url;
  };
  return <section className="sketch-overlay" hidden={!open} aria-label="Sketchpad">
    <header><div><strong>Sketchpad</strong><span> Draw ideas, wireframes, and diagrams</span></div><button onClick={onClose}>Close</button></header>
    <div className="sketch-tools"><label>Ink <input aria-label="Ink color" type="color" value={color} onChange={e => setColor(e.target.value)} /></label><label>Size <input aria-label="Pen size" type="range" min="1" max="30" value={width} onChange={e => setWidth(Number(e.target.value))} /></label><label className="sketch-upload">Add image <input type="file" accept="image/*" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label><button onClick={() => { const c = canvas.current; if (c && window.confirm('Clear this sketch?')) { const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); } clearSketch(); } }}>Clear</button><button onClick={() => { const a = document.createElement('a'); a.download = 'sketch.png'; a.href = canvas.current!.toDataURL('image/png'); a.click(); }}>Download PNG</button></div>
    {error && <p role="alert">{error}</p>}
    <div className="sketch-paper"><canvas ref={canvas} width={1600} height={1000} onPointerDown={start} onPointerMove={move} onPointerUp={endStroke} onPointerCancel={endStroke} /></div><p>Sketches are saved in this browser only if you choose to remember; otherwise they last while this page is open. Download a PNG to keep your work.</p>
  </section>;
}
