// İstatistik ve metin yardımcıları
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
export const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
export const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
export const quantile = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const r = (s.length - 1) * p, lo = Math.floor(r), hi = Math.ceil(r); return s[lo] + (s[hi] - s[lo]) * (r - lo); };

// Student t dağılımı: düzenlenmiş eksik beta (Numerical Recipes, betacf) ile CDF, ikiye bölmeyle ters çevirme.
function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const v of c) s += v / ++y; return -t + Math.log((2.5066282746310005 * s) / x); }
function betacf(a, b, x) {
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m; let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
export function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
export function tcdf(t, df) { const x = df / (df + t * t); const p = 0.5 * ibeta(df / 2, 0.5, x); return t > 0 ? 1 - p : p; }
export function tinv(p, df) { let lo = -100, hi = 100; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (tcdf(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

/** Eşleştirilmiş fark özeti: ortalama, SS, ortanca, %95 GA (t), artan/değişmeyen/azalan. */
export function paired(a, b) {
  const d = a.map((x, i) => b[i] - x).filter((x) => isFinite(x)); const n = d.length;
  const m = mean(d), s = sd(d), se = s / Math.sqrt(n), t = n > 1 ? tinv(0.975, n - 1) : NaN;
  return { n, mean: m, sd: s, median: median(d), lo: m - t * se, hi: m + t * se, up: d.filter((x) => x > 1e-9).length, same: d.filter((x) => Math.abs(x) <= 1e-9).length, down: d.filter((x) => x < -1e-9).length, t };
}


/** F dağılımı üst kuyruk olasılığı: P(F > f). */
export function fsf(f, d1, d2) { if (!(f > 0)) return 1; return ibeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * f)); }

/**
 * Dengeli iki faktörlü varyans analizi (etkileşimli). cells[a][b] = gözlem dizisi (eşit n).
 * Dönüş: A, B, A×B ve hata için SS, sd, KO, F, p.
 */
export function anova2(cells) {
  const a = cells.length, b = cells[0].length, n = cells[0][0].length;
  const all = cells.flat(2); const N = all.length; const G = mean(all);
  const mA = cells.map((r) => mean(r.flat())), mB = cells[0].map((_, j) => mean(cells.map((r) => r[j]).flat()));
  const mAB = cells.map((r) => r.map((c) => mean(c)));
  let SSA = 0, SSB = 0, SSAB = 0, SSE = 0;
  for (let i = 0; i < a; i++) SSA += b * n * (mA[i] - G) ** 2;
  for (let j = 0; j < b; j++) SSB += a * n * (mB[j] - G) ** 2;
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) {
    SSAB += n * (mAB[i][j] - mA[i] - mB[j] + G) ** 2;
    for (const v of cells[i][j]) SSE += (v - mAB[i][j]) ** 2;
  }
  const dA = a - 1, dB = b - 1, dAB = dA * dB, dE = N - a * b;
  const row = (SS, d) => { const MS = SS / d, F = MS / (SSE / dE); return { SS, df: d, MS, F, p: fsf(F, d, dE) }; };
  return { A: row(SSA, dA), B: row(SSB, dB), AB: row(SSAB, dAB), E: { SS: SSE, df: dE, MS: SSE / dE }, N, ok: N === a * b * n && dE > 0 };
}

/** Welch t testi (varyanslar eşit varsayılmaz): fark = ortalama(b) − ortalama(a). */
export function welch(a, b) {
  const m1 = mean(a), m2 = mean(b), v1 = sd(a) ** 2, v2 = sd(b) ** 2, n1 = a.length, n2 = b.length;
  const se = Math.sqrt(v1 / n1 + v2 / n2); const t = (m2 - m1) / se;
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = 2 * (1 - tcdf(Math.abs(t), df)); const tc = tinv(0.975, df);
  return { diff: m2 - m1, t, df, p, lo: m2 - m1 - tc * se, hi: m2 - m1 + tc * se, se };
}
/** Ortalamanın %95 güven aralığı (t). */
export function ci95(a) { const n = a.length; if (n < 2) return [NaN, NaN]; const h = tinv(0.975, n - 1) * sd(a) / Math.sqrt(n); return [mean(a) - h, mean(a) + h]; }
