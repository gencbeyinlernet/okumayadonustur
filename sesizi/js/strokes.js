// Dik temel harfler (küçük harf) için yazım yolları.
// Koordinatlar: üst çizgi y=10, orta çizgi y=40, taban çizgisi y=70, alt çizgi y=95.
// Her harf: w = genişlik, s = yazım sırasına göre çizgi listesi (SVG yol söz dizimi).

export const LINES = { top: 10, mid: 40, base: 70, desc: 95 };
const T = 10, M = 40, B = 70, D = 95;

const f = (n) => +n.toFixed(2);
const P = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [f(cx + r * Math.cos(a)), f(cy - r * Math.sin(a))];
};
/** Tam daire; start açısından başlar, ccw=true ise saat yönünün tersine. */
function circle(cx, cy, r, start, ccw = true) {
  const p0 = P(cx, cy, r, start);
  const p1 = P(cx, cy, r, start + (ccw ? 180 : -180));
  const sw = ccw ? 0 : 1;
  return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 ${sw} ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 ${sw} ${p0[0]} ${p0[1]}`;
}
/** a1'den a2'ye yay (a2 > a1 ise saat yönünün tersine). */
function arc(cx, cy, r, a1, a2) {
  const p0 = P(cx, cy, r, a1), p1 = P(cx, cy, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  const sw = a2 > a1 ? 0 : 1;
  return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 ${large} ${sw} ${p1[0]} ${p1[1]}`;
}
const L = (x1, y1, x2, y2) => `M ${x1} ${y1} L ${x2} ${y2}`;
const dot = (x, y) => `M ${x} ${y - 1.2} L ${x} ${y + 1.2}`;
const cedilla = (x) => `M ${x} ${B} L ${x - 1} ${B + 6} Q ${x + 6} ${B + 7} ${x + 4} ${B + 12} Q ${x + 2} ${B + 16} ${x - 4} ${B + 14}`;
const e320 = P(25, 55, 15, 320);

const base = {
  a: { w: 50, s: [circle(25, 55, 15, 45, true), L(40, M, 40, B)] },
  b: { w: 45, s: [L(10, T, 10, B), circle(25, 55, 15, 180, false)] },
  c: { w: 45, s: [arc(25, 55, 15, 40, 320)] },
  d: { w: 50, s: [circle(25, 55, 15, 45, true), L(40, T, 40, B)] },
  e: { w: 50, s: [`M 10 55 L 40 55 A 15 15 0 1 0 ${e320[0]} ${e320[1]}`] },
  f: { w: 42, s: ['M 36 15 Q 31 10 26 10 Q 18 10 18 20 L 18 70', L(8, M, 32, M)] },
  g: { w: 50, s: [circle(25, 55, 15, 45, true), 'M 40 40 L 40 84 Q 40 95 26 95 Q 15 95 11 89'] },
  h: { w: 50, s: [L(10, T, 10, B), 'M 10 55 A 15 15 0 0 1 40 55 L 40 70'] },
  ı: { w: 30, s: [L(15, M, 15, B)] },
  j: { w: 34, s: ['M 22 40 L 22 85 Q 22 95 12 95 Q 6 95 3 91', dot(22, 28)] },
  k: { w: 45, s: [L(10, T, 10, B), 'M 36 40 L 11 58 L 37 70'] },
  l: { w: 30, s: [L(15, T, 15, B)] },
  m: { w: 64, s: [L(10, M, 10, B), 'M 10 52 A 11 11 0 0 1 32 52 L 32 70', 'M 32 52 A 11 11 0 0 1 54 52 L 54 70'] },
  n: { w: 50, s: [L(10, M, 10, B), 'M 10 55 A 15 15 0 0 1 40 55 L 40 70'] },
  o: { w: 50, s: [circle(25, 55, 15, 90, true)] },
  p: { w: 45, s: [L(10, M, 10, D), circle(25, 55, 15, 180, false)] },
  r: { w: 38, s: [L(10, M, 10, B), 'M 10 54 A 15 15 0 0 1 33 43'] },
  s: { w: 46, s: ['M 36 44 Q 32 40 24 40 Q 12 40 12 47.5 Q 12 55 24 55 Q 36 55 36 62.5 Q 36 70 24 70 Q 15 70 11 66'] },
  t: { w: 38, s: ['M 17 18 L 17 62 Q 17 70 27 70', L(7, M, 30, M)] },
  u: { w: 50, s: ['M 10 40 L 10 55 A 15 15 0 0 0 40 55', L(40, M, 40, B)] },
  v: { w: 50, s: ['M 10 40 L 25 70 L 40 40'] },
  y: { w: 50, s: ['M 10 40 L 25 68', 'M 40 40 L 18 95'] },
  z: { w: 50, s: ['M 10 40 L 40 40 L 10 70 L 40 70'] },
};

export const STROKES = {
  ...base,
  i: { w: 30, s: [...base.ı.s, dot(15, 28)] },
  ç: { w: 45, s: [...base.c.s, cedilla(25)] },
  ğ: { w: 50, s: [...base.g.s, 'M 16 25 Q 25 34 34 25'] },
  ö: { w: 50, s: [...base.o.s, dot(18, 30), dot(32, 30)] },
  ş: { w: 46, s: [...base.s.s, cedilla(24)] },
  ü: { w: 50, s: [...base.u.s, dot(18, 30), dot(32, 30)] },
};

// Dik temel büyük harfler: üst çizgi (y=10) ile taban çizgisi (y=70) arasında.
const capDot = (x) => dot(x, 3.5);
const C_ARC = arc(36, 40, 30, 42, 318);
const G_ARC = arc(36, 40, 30, 42, 352);
const P_BOWL = 'M 10 10 L 26 10 Q 42 10 42 25 Q 42 40 26 40 L 10 40';
const S_UP = 'M 44 19 Q 39 10 27 10 Q 12 10 12 24 Q 12 37 28 40 Q 44 43 44 56 Q 44 70 28 70 Q 14 70 9 61';
const U_UP = 'M 10 10 L 10 50 Q 10 70 26 70 Q 42 70 42 50 L 42 10';
const O_UP = circle(35, 40, 30, 90, true);
const capsBase = {
  A: { w: 50, s: ['M 25 10 L 8 70', 'M 25 10 L 42 70', L(14, 48, 36, 48)] },
  B: { w: 50, s: [L(10, 10, 10, 70), 'M 10 10 L 25 10 Q 38 10 38 24 Q 38 38 25 38 L 10 38', 'M 10 38 L 27 38 Q 42 38 42 54 Q 42 70 27 70 L 10 70'] },
  C: { w: 64, s: [C_ARC] },
  D: { w: 52, s: [L(10, 10, 10, 70), 'M 10 10 L 22 10 Q 46 10 46 40 Q 46 70 22 70 L 10 70'] },
  E: { w: 48, s: [L(12, 10, 12, 70), L(12, 10, 40, 10), L(12, 40, 36, 40), L(12, 70, 40, 70)] },
  F: { w: 46, s: [L(12, 10, 12, 70), L(12, 10, 40, 10), L(12, 40, 36, 40)] },
  G: { w: 68, s: [G_ARC + ' L 46 44.18'] },
  H: { w: 52, s: [L(10, 10, 10, 70), L(42, 10, 42, 70), L(10, 40, 42, 40)] },
  I: { w: 30, s: [L(15, 10, 15, 70)] },
  J: { w: 44, s: ['M 34 10 L 34 55 Q 34 70 21 70 Q 10 70 7 61'] },
  K: { w: 46, s: [L(10, 10, 10, 70), 'M 40 10 L 11 42 L 41 70'] },
  L: { w: 44, s: ['M 12 10 L 12 70 L 40 70'] },
  M: { w: 60, s: [L(8, 10, 8, 70), 'M 8 10 L 30 50 L 52 10', L(52, 10, 52, 70)] },
  N: { w: 52, s: [L(10, 10, 10, 70), 'M 10 10 L 42 70', L(42, 70, 42, 10)] },
  O: { w: 70, s: [O_UP] },
  P: { w: 48, s: [L(10, 10, 10, 70), P_BOWL] },
  R: { w: 50, s: [L(10, 10, 10, 70), P_BOWL, 'M 24 40 L 42 70'] },
  S: { w: 52, s: [S_UP] },
  T: { w: 50, s: [L(6, 10, 44, 10), L(25, 10, 25, 70)] },
  U: { w: 52, s: [U_UP] },
  V: { w: 50, s: ['M 8 10 L 25 70 L 42 10'] },
  Y: { w: 50, s: ['M 8 10 L 25 38', 'M 42 10 L 25 38 L 25 70'] },
  Z: { w: 50, s: ['M 8 10 L 42 10 L 8 70 L 42 70'] },
};
Object.assign(STROKES, capsBase, {
  'İ': { w: 30, s: [...capsBase.I.s, capDot(15)] },
  'Ç': { w: 64, s: [C_ARC, cedilla(36)] },
  'Ğ': { w: 68, s: [capsBase.G.s[0], 'M 26 1.5 Q 36 8 46 1.5'] },
  'Ö': { w: 70, s: [O_UP, capDot(26), capDot(44)] },
  'Ş': { w: 52, s: [S_UP, cedilla(28)] },
  'Ü': { w: 52, s: [U_UP, capDot(19), capDot(33)] },
});
/** Küçük harf mi (dik temel küçük harf şablonları)? */
export const isLowerKey = (ch) => ch === ch.toLocaleLowerCase('tr-TR');

// ---- Örnekleme (SVG geometri API'si ile) ----
let svgNS;
function svgPath(d) {
  if (!svgNS) {
    svgNS = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgNS.setAttribute('width', '0');
    svgNS.setAttribute('height', '0');
    svgNS.style.position = 'absolute';
    svgNS.style.visibility = 'hidden';
    document.body.appendChild(svgNS);
  }
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svgNS.appendChild(p);
  return p;
}

const cache = {};
/** Harf yollarını örnekler: her çizgi için noktalar, toplam uzunluk. */
export function sampleLetter(ch, step = 1.5) {
  if (cache[ch]) return cache[ch];
  const def = STROKES[ch];
  if (!def) return null;
  const strokes = def.s.map((d) => {
    const p = svgPath(d);
    const len = p.getTotalLength();
    const n = Math.max(2, Math.ceil(len / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength((len * i) / n);
      pts.push([q.x, q.y]);
    }
    p.remove();
    return { d, len, pts };
  });
  const all = strokes.flatMap((s) => s.pts);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  return (cache[ch] = { w: def.w, strokes, all, bbox });
}

/** Harfin yazım yolunu SVG olarak verir (öğretmen içerik kontrolü için). */
export function letterSVG(ch, { size = 80, starts = true } = {}) {
  const def = STROKES[ch];
  if (!def) return '';
  const vbW = def.w + 10;
  const paths = def.s.map((d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  let dots = '';
  if (starts) {
    dots = def.s.map((d, i) => {
      const m = d.match(/M\s*([\d.-]+)\s+([\d.-]+)/);
      return m ? `<circle cx="${m[1]}" cy="${m[2]}" r="4" fill="#16a34a"/><text x="${+m[1] + 5}" y="${+m[2] - 4}" font-size="8" fill="#16a34a" font-family="sans-serif">${i + 1}</text>` : '';
    }).join('');
  }
  return `<svg viewBox="-5 0 ${vbW} 100" width="${(size * vbW) / 100}" height="${size}" aria-label="${ch} harfinin yazımı">
    <line x1="-5" x2="${vbW}" y1="40" y2="40" stroke="#cbd5e1" stroke-dasharray="3 3"/>
    <line x1="-5" x2="${vbW}" y1="70" y2="70" stroke="#94a3b8"/>
    ${paths}${dots}</svg>`;
}
