// $P nokta bulutu tanıyıcısı (Vatavu, Anthony ve Wobbrock, 2012).
// Çizgi sırasından ve yönünden bağımsızdır; rehbersiz yazılan harfin hangi harfe en çok benzediğini bulur.
import { STROKES, sampleLetter, isLowerKey } from './strokes.js';

const N = 32;

function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

function resample(points, n = N) {
  const pts = points.map((p) => ({ ...p }));
  const I = pathLength(pts) / (n - 1);
  if (!(I > 0)) return null;
  let D = 0;
  const out = [{ ...pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].id !== pts[i - 1].id) continue;
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (D + d >= I && d > 0) {
      const t = (I - D) / d;
      const q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), id: pts[i].id };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out.slice(0, n);
}

function normalize(pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const s = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  const sc = pts.map((p) => ({ x: (p.x - x0) / s, y: (p.y - y0) / s, id: p.id }));
  const cx = sc.reduce((a, p) => a + p.x, 0) / sc.length, cy = sc.reduce((a, p) => a + p.y, 0) / sc.length;
  return sc.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function cloudDistance(a, b, start) {
  const n = a.length;
  const matched = new Array(n).fill(false);
  let sum = 0, i = start;
  do {
    let min = Infinity, idx = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = (a[i].x - b[j].x) ** 2 + (a[i].y - b[j].y) ** 2;
      if (d < min) { min = d; idx = j; }
    }
    matched[idx] = true;
    sum += (1 - ((i - start + n) % n) / n) * Math.sqrt(min);
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyMatch(a, b) {
  const step = Math.floor(Math.pow(N, 0.5));
  let min = Infinity;
  for (let i = 0; i < N; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

/** strokes: [[ [x,y], ... ], ...] → $P bulutu */
export function toCloud(strokes) {
  const pts = [];
  strokes.forEach((st, id) => st.forEach(([x, y]) => pts.push({ x, y, id })));
  if (pts.length < 2) return null;
  const r = resample(pts);
  return r ? normalize(r) : null;
}

let templates = null;
function getTemplates() {
  if (templates) return templates;
  templates = Object.keys(STROKES).filter(isLowerKey).map((ch) => ({ ch, cloud: toCloud(sampleLetter(ch).strokes.map((s) => s.pts)) }));
  return templates;
}

/** Bütün harflerle karşılaştırır; uzaklığa göre sıralı liste döner. */
export function recognize(strokes) {
  const c = toCloud(strokes);
  if (!c) return [];
  return getTemplates().map((t) => ({ ch: t.ch, d: greedyMatch(c, t.cloud) })).sort((a, b) => a.d - b.d);
}

// Biçimce aynı olup yalnızca boyut/nokta ile ayrılan harfler: bunları satır yerleşimi ve kapsama ölçüsü ayırır.
const SAME_SHAPE = [['ı', 'l', 'i'], ['o', 'ö'], ['u', 'ü'], ['c', 'ç'], ['s', 'ş'], ['g', 'ğ'], ['j', 'ı', 'i']];
const sameShape = (a, b) => a === b || SAME_SHAPE.some((g) => g.includes(a) && g.includes(b));

/**
 * Çizim hedef harfe yeterince benziyor mu?
 * En yakın harf hedefse ya da hedefin uzaklığı en yakın (farklı biçimli) harfinkinin %15 fazlasını aşmıyorsa evet.
 */
export function shapeMatches(strokes, target) {
  const ranked = recognize(strokes);
  if (!ranked.length) return { ok: false, best: null, ranked };
  const t = ranked.find((r) => r.ch === target);
  const rival = ranked.find((r) => !sameShape(r.ch, target));
  const ok = !rival || t.d <= rival.d * 1.15;
  return { ok, best: ranked[0].ch, ranked };
}
