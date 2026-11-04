// Harita görünümü: gölgelendirilmiş arazi, güzergâhlar, kanıtlar, bindirmeler, ölçek ve kuzey oku.
import { dem, hillshadeImage, elevAt } from './dem.js';
import { toLonLat } from './geo.js';

export const COLORS = { M0: '#334155', M1: '#ea580c', M2: '#7c3aed', dev: '#0f766e', test: '#be123c', end: '#111827' };
export const MODEL_NAMES = { M0: 'M0 Mesafe', M1: 'M1 Arazi', M2: 'M2 Arazi ve belge' };

export class MapView {
  constructor(container, { onClick, onHover } = {}) {
    this.wrap = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mapcanvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.onClick = onClick; this.onHover = onHover;
    this.layers = { routes: {}, evidence: [], endpoints: [], overlays: [], visible: { M0: true, M1: true, M2: true, dev: true, test: true, overlay: true } };
    const D = dem();
    const img = hillshadeImage();
    this.base = document.createElement('canvas'); this.base.width = D.W; this.base.height = D.H;
    this.base.getContext('2d').putImageData(img, 0, 0);
    this.cx = (D.x0 + D.x1) / 2; this.cy = (D.y0 + D.y1) / 2; this.mpp = 60;
    this._bind();
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(container);
  }
  destroy() { this._ro.disconnect(); }
  resize() {
    const r = this.wrap.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    this.W = r.width; this.H = r.height;
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px';
    this.dpr = dpr;
    if (!this._fitted) { this.fit(); this._fitted = true; }
    this.draw();
  }
  fit() {
    const D = dem();
    this.cx = (D.x0 + D.x1) / 2; this.cy = (D.y0 + D.y1) / 2;
    this.mpp = Math.max((D.x1 - D.x0) / this.W, (D.y1 - D.y0) / this.H) * 1.02;
  }
  focus(x, y, mpp) { this.cx = x; this.cy = y; if (mpp) this.mpp = mpp; this.draw(); }
  toScreen(x, y) { return [this.W / 2 + (x - this.cx) / this.mpp, this.H / 2 - (y - this.cy) / this.mpp]; }
  toWorld(px, py) { return [this.cx + (px - this.W / 2) * this.mpp, this.cy - (py - this.H / 2) * this.mpp]; }

  _bind() {
    const cv = this.canvas; let drag = null; const pts = new Map(); let pinch = null;
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(); const [wx, wy] = this.toWorld(e.clientX - r.left, e.clientY - r.top);
      const k = Math.exp(e.deltaY * 0.0015);
      this.mpp = Math.min(200, Math.max(2, this.mpp * k));
      const [nx, ny] = this.toWorld(e.clientX - r.left, e.clientY - r.top);
      this.cx += wx - nx; this.cy += wy - ny; this.draw();
    }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, cx: this.cx, cy: this.cy, moved: false };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mpp: this.mpp }; }
    });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      if (this.onHover) { const [x, y] = this.toWorld(e.clientX - r.left, e.clientY - r.top); this.onHover(x, y); }
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.mpp = Math.min(200, Math.max(2, (pinch.mpp * pinch.d) / d)); this.draw(); return; }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        this.cx = drag.cx - dx * this.mpp; this.cy = drag.cy + dy * this.mpp; this.draw();
      }
    });
    const up = (e) => {
      const r = cv.getBoundingClientRect();
      if (drag && !drag.moved && pts.size === 1 && this.onClick) { const [x, y] = this.toWorld(e.clientX - r.left, e.clientY - r.top); this.onClick(x, y); }
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  draw(ctx = this.ctx, W = this.W, H = this.H, scale = this.dpr, opts = {}) {
    if (!W) return;
    const D = dem(); const L = this.layers, vis = L.visible;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#e7e5e4'; ctx.fillRect(0, 0, W, H);
    // arazi
    const [sx, sy] = this.toScreen(D.x0, D.y1);
    ctx.imageSmoothingEnabled = this.mpp > D.res;
    ctx.drawImage(this.base, sx, sy, (D.x1 - D.x0) / this.mpp, (D.y1 - D.y0) / this.mpp);
    // bindirmeler (uzlaşma, koridorlar)
    if (vis.overlay) for (const o of L.overlays) {
      const [ox, oy] = this.toScreen(o.x0, o.y1);
      ctx.globalAlpha = o.alpha ?? 0.75; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(o.canvas, ox, oy, (o.x1 - o.x0) / this.mpp, (o.y1 - o.y0) / this.mpp);
      ctx.globalAlpha = 1;
    }
    // güzergâhlar
    for (const m of ['M0', 'M1', 'M2']) {
      const r = L.routes[m]; if (!r || !vis[m]) continue;
      ctx.beginPath();
      r.line.forEach(([x, y], q) => { const [px, py] = this.toScreen(x, y); q ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.setLineDash([]); ctx.stroke();
      ctx.strokeStyle = COLORS[m]; ctx.lineWidth = 3; ctx.setLineDash(m === 'M0' ? [8, 6] : []); ctx.stroke();
      ctx.setLineDash([]);
    }
    // uç bölgeler
    for (const e of L.endpoints) {
      const [px, py] = this.toScreen(e.x, e.y); const rr = Math.max(5, e.r / this.mpp);
      ctx.strokeStyle = COLORS.end; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLORS.end; ctx.fillRect(px - 5, py - 5, 10, 10);
      label(ctx, e.name, px + 8, py - 8);
    }
    // kanıtlar: geliştirme içi dolu, bağımsız test içi boş
    for (const e of L.evidence) {
      if ((e.rol === 'gelistirme' && !vis.dev) || (e.rol === 'test' && !vis.test)) continue;
      const [px, py] = this.toScreen(e.x, e.y); const rr = e.r / this.mpp;
      const col = e.rol === 'test' ? COLORS.test : COLORS.dev;
      if (rr > 4) { ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fillStyle = col + '22'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      if (e.rol === 'test') { ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (opts.labels !== false && this.mpp < 40) label(ctx, e.kod, px + 8, py + 4, 11);
      if (e === this.selected) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke(); }
    }
    this._furniture(ctx, W, H);
  }

  _furniture(ctx, W, H) {
    // ölçek çubuğu
    const target = W * 0.18 * this.mpp;
    const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const len = steps.reduce((b, s) => (s <= target ? s : b), 100);
    const px = len / this.mpp, x = 16, y = H - 22;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - 8, y - 22, px + 74, 34);
    ctx.fillStyle = '#111'; ctx.fillRect(x, y, px / 2, 6); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.strokeRect(x, y, px, 6);
    ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('0', x - 3, y - 4); ctx.fillText(len >= 1000 ? `${len / 1000} km` : `${len} m`, x + px - 8, y - 4);
    // kuzey oku (UTM ızgara kuzeyi; 39° D merkez meridyeninde yakınsama < 0,3°)
    const nx = W - 34, ny = 50;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(nx, ny, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(nx, ny - 16); ctx.lineTo(nx + 8, ny + 10); ctx.lineTo(nx, ny + 4); ctx.lineTo(nx - 8, ny + 10); ctx.closePath(); ctx.fill();
    ctx.font = '800 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('K', nx, ny + 22 + 14); ctx.textAlign = 'left';
    // koordinat sistemi
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    const t = 'WGS 84 / UTM 37K (EPSG:32637) · Copernicus DEM GLO-30';
    const tw = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(W - tw - 18, H - 22, tw + 12, 18);
    ctx.fillStyle = '#111'; ctx.fillText(t, W - tw - 12, H - 9);
  }

  /** Şekil olarak PNG (lejantlı). */
  exportPNG({ title = '', legend = [], note = '' } = {}) {
    const W = 1600, H = 1100, lw = 360;
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
    const ctx = c.getContext('2d');
    const keep = { W: this.W, H: this.H, mpp: this.mpp };
    this.W = W - lw; this.H = H; this.mpp = keep.mpp * Math.min(keep.W / this.W, keep.H / this.H);
    this.draw(ctx, W - lw, H, 2, { labels: true });
    Object.assign(this, keep);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(W - lw, 0, lw, H);
    ctx.fillStyle = '#111'; ctx.font = '800 20px Inter, system-ui, sans-serif';
    wrapText(ctx, title, W - lw + 20, 40, lw - 40, 26);
    let y = 120; ctx.font = '600 15px Inter, system-ui, sans-serif';
    for (const it of legend) {
      const x = W - lw + 20;
      if (it.type === 'line') { ctx.strokeStyle = it.color; ctx.lineWidth = 4; ctx.setLineDash(it.dash || []); ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 36, y - 5); ctx.stroke(); ctx.setLineDash([]); }
      if (it.type === 'filled') { ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(x + 18, y - 5, 7, 0, Math.PI * 2); ctx.fill(); }
      if (it.type === 'hollow') { ctx.strokeStyle = it.color; ctx.lineWidth = 3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 18, y - 5, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      if (it.type === 'square') { ctx.fillStyle = it.color; ctx.fillRect(x + 12, y - 11, 12, 12); }
      if (it.type === 'swatch') { ctx.fillStyle = it.color; ctx.fillRect(x, y - 14, 36, 16); }
      ctx.fillStyle = '#111'; y = wrapText(ctx, it.label, x + 48, y, lw - 90, 19) + 14;
    }
    if (note) { ctx.font = '500 13px Inter, system-ui, sans-serif'; ctx.fillStyle = '#444'; wrapText(ctx, note, W - lw + 20, Math.max(y + 10, H - 220), lw - 40, 18); }
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  readout(x, y) {
    const D = dem(); if (x < D.x0 || x > D.x1 || y < D.y0 || y > D.y1) return '';
    const [lon, lat] = toLonLat(x, y);
    return `${lat.toFixed(5)}° K  ${lon.toFixed(5)}° D  ·  ${Math.round(elevAt(x, y))} m`;
  }
}

function label(ctx, t, x, y, size = 12) {
  ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = '#111'; ctx.fillText(t, x, y);
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' '); let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

/** Izgara maskesinden bindirme tuvali. colorFn(v) → [r,g,b,a] ya da null */
export function maskOverlay(mask, W, H, res, x0, y1, colorFn, alpha = 0.75) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
  for (let i = 0; i < mask.length; i++) {
    const col = colorFn(mask[i]); if (!col) continue;
    img.data.set(col, i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, x0, y1, x1: x0 + W * res, y0: y1 - H * res, alpha };
}
