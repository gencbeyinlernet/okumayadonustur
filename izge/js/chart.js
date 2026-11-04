// Basit tuval grafikleri: spektrum profili, FWHM yakın görünümü.
import { evalPoly } from './spectro.js';

export function drawProfile(cv, series, { coef, peaks = [], labels = {}, marks = [], title = '', x0 = 0, x1 } = {}) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 220;
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H); c.fillStyle = '#0b1020'; c.fillRect(0, 0, W, H);
  const L = 44, R = 10, T = 18, B = 30; const n = Math.max(...series.map((s) => s.y.length));
  x1 = x1 ?? n - 1;
  let ymax = 1; series.forEach((s) => { for (let i = Math.max(0, Math.floor(x0)); i <= Math.min(s.y.length - 1, Math.ceil(x1)); i++) ymax = Math.max(ymax, s.y[i]); });
  const X = (i) => L + ((i - x0) / (x1 - x0)) * (W - L - R), Y = (v) => T + (1 - v / (ymax * 1.08)) * (H - T - B);
  // eksen
  c.strokeStyle = '#334155'; c.lineWidth = 1; c.font = '11px Inter, sans-serif'; c.fillStyle = '#94a3b8';
  for (let k = 0; k <= 4; k++) { const v = (ymax * k) / 4; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(W - R, Y(v)); c.stroke(); c.fillText(v.toFixed(0), 4, Y(v) + 4); }
  const ticks = 8;
  for (let k = 0; k <= ticks; k++) {
    const i = x0 + ((x1 - x0) * k) / ticks; const lab = coef ? evalPoly(coef, i).toFixed(0) + ' nm' : i.toFixed(0) + ' px';
    c.fillText(lab, X(i) - 16, H - 10);
  }
  if (title) { c.fillStyle = '#e2e8f0'; c.font = '600 12px Inter, sans-serif'; c.fillText(title, L + 4, 13); }
  // seriler
  series.forEach((s) => {
    c.strokeStyle = s.color || '#a3e635'; c.lineWidth = s.width || 1.5; c.setLineDash(s.dash || []); c.beginPath();
    for (let i = Math.max(0, Math.floor(x0)); i <= Math.min(s.y.length - 1, Math.ceil(x1)); i++) { const px = X(i), py = Y(s.y[i]); i === Math.max(0, Math.floor(x0)) ? c.moveTo(px, py) : c.lineTo(px, py); }
    c.stroke(); c.setLineDash([]);
  });
  // tepeler
  peaks.forEach((p) => { if (p.x < x0 || p.x > x1) return; c.fillStyle = labels[p.i] ? '#facc15' : '#64748b'; c.beginPath(); c.arc(X(p.x), Y(p.h) - 6, 3, 0, Math.PI * 2); c.fill();
    if (labels[p.i]) { c.save(); c.translate(X(p.x) + 3, Y(p.h) - 10); c.rotate(-Math.PI / 2); c.fillStyle = '#fde68a'; c.font = '600 11px Inter, sans-serif'; c.fillText(labels[p.i], 0, 0); c.restore(); } });
  // işaretler (yarı yükseklik, sınırlar)
  marks.forEach((m) => {
    c.strokeStyle = m.color || '#f472b6'; c.lineWidth = 1.2; c.setLineDash(m.dash || [4, 3]); c.beginPath();
    if (m.type === 'v') { c.moveTo(X(m.x), T); c.lineTo(X(m.x), H - B); } else { c.moveTo(X(m.xa ?? x0), Y(m.y)); c.lineTo(X(m.xb ?? x1), Y(m.y)); }
    c.stroke(); c.setLineDash([]);
  });
  return { X, Y };
}
