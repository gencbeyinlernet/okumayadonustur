// Rehberli çizim tahtası ve puanlama.
// Puanlama: yön uyumlu kapsama, en zayıf çizgi, isabet ve uç noktalar; rehbersiz düzeylerde
// ek olarak $P tanıyıcısı (biçim) ve dikey kapsam (satır yerleşimi) denetlenir.
import { sampleLetter, LINES } from './strokes.js';
import { shapeMatches } from './recognizer.js';

export const LEVELS = { FULL: 1, REDUCED: 2, NONE: 3, FREE: 4 };

export class TraceBoard {
  constructor(container) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'board-wrap';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'board';
    this.canvas.setAttribute('aria-label', 'Yazma alanı');
    this.wrap.appendChild(this.canvas);
    container.appendChild(this.wrap);
    this.ctx = this.canvas.getContext('2d');
    this.strokes = [];
    this.cur = null;
    this.hint = false;
    this._bind();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.wrap);
  }

  destroy() { this._ro.disconnect(); }

  setLetter(ch, level) {
    this.ch = ch;
    this.level = level;
    this.sample = sampleLetter(ch);
    this.strokes = [];
    this.hint = false;
    this.resize();
  }

  clear() { this.strokes = []; this.hint = false; this.render(); }
  get hasInk() { return this.strokes.some((s) => s.length > 0); }
  showStartHint() { this.hint = true; this.render(); }

  resize() {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    const W = r.width, H = Math.min(r.width * 0.8, 540);
    this.canvas.style.height = H + 'px';
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.W = W; this.H = H; this.dpr = dpr;
    // Harf koordinatları (0..100 yükseklik) → piksel
    const w = this.sample ? this.sample.w : 50;
    this.s = Math.min(H / 100, W / (w + 30));
    this.ox = (W - w * this.s) / 2;
    this.oy = (H - 100 * this.s) / 2;
    this.render();
  }

  toPx([x, y]) { return [this.ox + x * this.s, this.oy + y * this.s]; }
  toLetter(px, py) { return [(px - this.ox) / this.s, (py - this.oy) / this.s]; }

  render() {
    const c = this.ctx;
    if (!c || !this.W) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    // yazı çizgileri
    const ly = (y) => this.oy + y * this.s;
    c.lineWidth = 1.5;
    [[LINES.top, '#e2e8f0', [6, 6]], [LINES.mid, '#93c5fd', [8, 6]], [LINES.base, '#2563eb', []], [LINES.desc, '#e2e8f0', [6, 6]]].forEach(([y, col, dash]) => {
      c.strokeStyle = col;
      c.setLineDash(dash);
      c.beginPath(); c.moveTo(8, ly(y)); c.lineTo(this.W - 8, ly(y)); c.stroke();
    });
    c.setLineDash([]);

    if (this.sample) {
      c.save();
      c.translate(this.ox, this.oy);
      c.scale(this.s, this.s);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (this.level === LEVELS.FULL) {
        this.sample.strokes.forEach((st) => {
          const p = new Path2D(st.d);
          c.strokeStyle = '#fde7f1'; c.lineWidth = 16; c.stroke(p);
          c.strokeStyle = '#f9a8d4'; c.lineWidth = 2; c.setLineDash([3, 3]); c.stroke(p); c.setLineDash([]);
        });
        this.sample.strokes.forEach((st) => this._arrows(c, st, [0.35, 0.75]));
      }
      if (this.level === LEVELS.REDUCED) {
        this.sample.strokes.forEach((st) => this._arrows(c, st, [0.12]));
      }
      if (this.level === LEVELS.FULL || this.level === LEVELS.REDUCED || this.hint) {
        this.sample.strokes.forEach((st, i) => this._start(c, st, i + 1));
      }
      c.restore();
    }

    // öğrencinin izi
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#1e3a8a';
    c.lineWidth = Math.max(5, 6 * this.s);
    this.strokes.forEach((st) => {
      if (!st.length) return;
      c.beginPath();
      const [x0, y0] = this.toPx(st[0]);
      c.moveTo(x0, y0);
      if (st.length === 1) c.lineTo(x0 + 0.1, y0 + 0.1);
      st.forEach((p) => { const [x, y] = this.toPx(p); c.lineTo(x, y); });
      c.stroke();
    });
  }

  _start(c, st, n) {
    const [x, y] = st.pts[0];
    c.fillStyle = '#16a34a';
    c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.font = 'bold 5.5px Nunito, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), x, y + 0.3);
  }

  _arrows(c, st, ts) {
    ts.forEach((t) => {
      const n = st.pts.length - 1;
      if (n < 3) return;
      const i = Math.min(n - 1, Math.max(1, Math.round(n * t)));
      const [x, y] = st.pts[i];
      const [x2, y2] = st.pts[Math.min(n, i + 2)];
      const ang = Math.atan2(y2 - y, x2 - x);
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.fillStyle = '#db2777';
      c.beginPath(); c.moveTo(5, 0); c.lineTo(-3, -3.6); c.lineTo(-3, 3.6); c.closePath(); c.fill();
      c.restore();
    });
  }

  _bind() {
    const cv = this.canvas;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return this.toLetter(e.clientX - r.left, e.clientY - r.top);
    };
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      this.cur = [pos(e)];
      this.strokes.push(this.cur);
      this.render();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.cur) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach((ev) => this.cur.push(pos(ev)));
      this.render();
    });
    const end = () => { this.cur = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', end);
  }

  /**
   * Çizimi puanlar. Rehbersiz düzeylerde iz yalnızca yatayda hizalanır (yazı çizgilerine göre
   * dikey yerleşim ve boyut korunur) ve $P tanıyıcısıyla harf biçimi ayrıca denetlenir.
   * Bir nokta ancak yakınında AYNI YÖNDE ilerleyen iz varsa "kapsanmış" sayılır
   * (ör. "a" yerine "o" çizildiğinde çubuk kapsanmaz).
   */
  evaluate() {
    const sm = this.sample;
    let ink = densify(this.strokes);
    if (!ink.length || !sm) return { score: 0, coverage: 0, precision: 0, ok: false, empty: true };
    const unguided = this.level === LEVELS.NONE || this.level === LEVELS.FREE;
    if (unguided) ink = normalize(ink, sm.bbox);
    const tol = 8;       // yol çevresindeki kabul bandı (harf birimi; x-yüksekliği = 30)
    const endTol = 6.5;  // çizgi başlangıç/bitiş noktaları için daha dar bant
    const COS = 0.766;   // yön uyumu: en fazla 40° fark
    const tpl = sm.strokes.map((st) => (st.len < 4 ? st.pts.map(([x, y]) => [x, y, 0, 0]) : withDirs(st.pts)));
    const tplAll = tpl.flat();
    const match = (p, set, t) => set.some((q) => {
      if ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > t * t) return false;
      if ((!p[2] && !p[3]) || (!q[2] && !q[3])) return true; // nokta / dokunuş: yön yok
      return Math.abs(p[2] * q[2] + p[3] * q[3]) >= COS;
    });
    // 1) Kapsama: harf yolunun ne kadarının izle örtüldüğü (her çizgi ayrı ayrı)
    const perStroke = tpl.map((pts) => pts.filter((p) => match(p, ink, tol)).length / pts.length);
    const totalPts = tpl.reduce((s, pts) => s + pts.length, 0);
    const coverage = tpl.reduce((s, pts, i) => s + perStroke[i] * pts.length, 0) / totalPts;
    const minStroke = Math.min(...perStroke);
    // 2) İsabet: izin ne kadarının harf yolunda (uyumlu yönde) kaldığı
    const precision = ink.filter((p) => match(p, tplAll, tol + 1)).length / ink.length;
    // 3) Uç noktalar: çizgilerin başlangıç ve bitişine ulaşılması
    const ends = tpl.flatMap((pts) => [pts[0], pts[pts.length - 1]]);
    const endsHit = ends.filter((p) => ink.some((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= endTol * endTol)).length / ends.length;
    const score = Math.round(100 * (0.4 * coverage + 0.2 * minStroke + 0.25 * precision + 0.15 * endsHit));
    let ok = score >= 75 && coverage >= 0.75 && minStroke >= 0.7 && precision >= 0.7 && endsHit >= 0.75;
    let shape = null;
    if (unguided) {
      shape = shapeMatches(this.strokes.filter((st) => st.length), this.ch);
      // Dikey kapsam: harfin üst ve alt sınırı yazı çizgilerine göre korunmalı
      // (ör. "ı" ile "l", "g" ile "ğ" yalnızca bu yolla ayrılır).
      const ys = ink.map((q) => q[1]);
      const extentOk = Math.abs(Math.min(...ys) - sm.bbox.y0) <= 9 && Math.abs(Math.max(...ys) - sm.bbox.y1) <= 9;
      ok = ok && shape.ok && extentOk;
    }
    return { score, coverage, minStroke, precision, endsHit, ok, recognized: shape && shape.best, shapeOk: shape ? shape.ok : null };
  }
}

/** Noktalara birim teğet yönü ekler: [x, y, dx, dy]. */
function withDirs(pts, k = 2) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - k)], b = pts[Math.min(pts.length - 1, i + k)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    return L > 0.5 ? [p[0], p[1], dx / L, dy / L] : [p[0], p[1], 0, 0];
  });
}

function densify(strokes, step = 1.5) {
  const out = [];
  strokes.forEach((st) => {
    const pts = [];
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      const prev = pts[pts.length - 1];
      if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.3) pts.push([p[0], p[1]]);
      const q = st[i + 1];
      if (!q) continue;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const n = Math.floor(d / step);
      for (let k = 1; k < n; k++) pts.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
    }
    // yön, ~3 birimlik pencereden hesaplanır (titremeye dayanıklı)
    out.push(...withDirs(pts, 2));
  });
  return out;
}

/** Rehbersiz yazıda izi yalnızca yatayda harfin yerine kaydırır. */
function normalize(ink, bb) {
  const xs = ink.map((p) => p[0]);
  const shift = (bb.x0 + bb.x1) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  return ink.map(([x, y, dx, dy]) => [x + shift, y, dx, dy]);
}
