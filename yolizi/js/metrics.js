// Bağımsız test göstergeleri (Tablo 3, 5, 6) ve harita konumlandırma hatası (Tablo 4).
import { lineDist, toUTM } from './geo.js';
import { median, quantile } from './ui.js';

/** Kanıt bölgesine uzaklık: çizgi bölgenin içinden geçiyorsa 0. */
export function regionDistance(line, e) {
  const [x, y] = toUTM(+e.lon, +e.lat);
  return Math.max(0, lineDist(x, y, line) - (+e.r || 0));
}
export const regionType = (e) => ((+e.r || 0) <= 250 ? 'dar' : 'geniş');

export function evaluate(route, groups) {
  const d = groups.map((g) => regionDistance(route.line, g));
  const cov = (t) => (d.length ? d.filter((v) => v <= t).length / d.length : NaN);
  return { n: d.length, dists: d, median: median(d), p90: quantile(d, 0.9), c100: cov(100), c250: cov(250), c500: cov(500), len: route.len / 1000, asc: route.asc };
}

/** İki modelin grup bazında karşılaştırması (A, B'den daha yakın mı?). */
export function compare(evA, evB) {
  const diff = evA.dists.map((v, i) => v - evB.dists[i]);
  return { closer: diff.filter((x) => x < -1e-6).length, farther: diff.filter((x) => x > 1e-6).length, same: diff.filter((x) => Math.abs(x) <= 1e-6).length, medianDiff: median(diff) };
}

/** Birinci derece polinom (afin) konumlandırma: piksel → UTM. En küçük kareler; RMSE uyum ve kontrol noktaları için ayrı. */
export function affineFit(points) {
  const P = points.map((p) => { const [x, y] = toUTM(+p.lon, +p.lat); return { ...p, X: x, Y: y, px: +p.px, py: +p.py }; });
  const fitPts = P.filter((p) => p.rol !== 'kontrol');
  if (fitPts.length < 3) return null;
  // Normal denklemler: [px py 1]·[a b c]ᵀ = X (ve Y)
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], vx = [0, 0, 0], vy = [0, 0, 0];
  for (const p of fitPts) {
    const r = [p.px, p.py, 1];
    for (let i = 0; i < 3; i++) { vx[i] += r[i] * p.X; vy[i] += r[i] * p.Y; for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j]; }
  }
  const sx = solve3(M, vx), sy = solve3(M, vy);
  if (!sx || !sy) return null;
  const pred = (p) => [sx[0] * p.px + sx[1] * p.py + sx[2], sy[0] * p.px + sy[1] * p.py + sy[2]];
  const res = P.map((p) => { const [X, Y] = pred(p); return { ...p, resid: Math.hypot(X - p.X, Y - p.Y) }; });
  const rmse = (arr) => (arr.length ? Math.sqrt(arr.reduce((s, p) => s + p.resid ** 2, 0) / arr.length) : NaN);
  return { coef: { x: sx, y: sy }, points: res, rmseFit: rmse(res.filter((p) => p.rol !== 'kontrol')), rmseCheck: rmse(res.filter((p) => p.rol === 'kontrol')), nFit: fitPts.length, nCheck: res.filter((p) => p.rol === 'kontrol').length };
}
function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}
