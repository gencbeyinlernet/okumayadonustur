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
