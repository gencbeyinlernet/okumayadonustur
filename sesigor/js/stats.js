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
function ibeta(a, b, x) {
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

// ---- Türkçe metin normalleştirme ve kelime hata oranı ----
export function normTR(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').normalize('NFC')
    .replace(/[’'`´](?=\p{L})/gu, '')            // kesme işareti: "Ali'nin" → "alinin" (bütün sistemlere aynı)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
/** Levenshtein hizalaması: S, D, I, N ve hizalama listesi. */
export function wer(ref, hyp) {
  const r = normTR(ref).split(' ').filter(Boolean), h = normTR(hyp).split(' ').filter(Boolean);
  const R = r.length, H = h.length, D = Array.from({ length: R + 1 }, () => new Int32Array(H + 1));
  for (let i = 0; i <= R; i++) D[i][0] = i; for (let j = 0; j <= H; j++) D[0][j] = j;
  for (let i = 1; i <= R; i++) for (let j = 1; j <= H; j++) D[i][j] = Math.min(D[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  let i = R, j = H, S = 0, Dl = 0, I = 0; const al = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1)) { const ok = r[i - 1] === h[j - 1]; if (!ok) S++; al.push([ok ? '=' : 'S', r[i - 1], h[j - 1]]); i--; j--; }
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { Dl++; al.push(['D', r[i - 1], '']); i--; }
    else { I++; al.push(['I', '', h[j - 1]]); j--; }
  }
  al.reverse();
  return { S, D: Dl, I, N: R, wer: R ? (100 * (S + Dl + I)) / R : NaN, align: al };
}
