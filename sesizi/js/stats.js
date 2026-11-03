// İstatistik: ortalama, standart sapma, Wilcoxon işaretli sıralar testi, etki büyüklüğü r.

export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export function sd(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// Standart normal dağılım fonksiyonu (Abramowitz–Stegun 7.1.26, hata < 1.5e-7)
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Ortalama sıralar (bağlı değerler için). */
function rank(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(values.length);
  const ties = [];
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    if (j > i) ties.push(j - i + 1);
    i = j + 1;
  }
  return { r, ties };
}

/**
 * Wilcoxon işaretli sıralar testi (eşleştirilmiş).
 * z: normal yaklaşım (bağ düzeltmeli, süreklilik düzeltmesiz; pozitif z = son test yüksek).
 * pExact: n ≤ 30 için kesin (koşullu) iki yönlü p.
 * r = z / √N (N: eşleştirilmiş gözlem sayısı, farkı sıfır olanlar dâhil).
 */
export function wilcoxon(pre, post) {
  const pairs = pre.map((x, i) => [x, post[i]]).filter(([a, b]) => isFinite(a) && isFinite(b));
  const N = pairs.length;
  const diffs = pairs.map(([a, b]) => b - a);
  const nz = diffs.filter((d) => Math.abs(d) > 1e-9);
  const n = nz.length;
  const out = {
    N, n, pos: diffs.filter((d) => d > 1e-9).length, neg: diffs.filter((d) => d < -1e-9).length,
    zero: N - n, Wplus: NaN, Wminus: NaN, z: NaN, p: NaN, pExact: NaN, r: NaN,
  };
  if (n === 0) { out.z = 0; out.p = 1; out.pExact = 1; out.r = 0; out.Wplus = 0; out.Wminus = 0; return out; }
  const { r, ties } = rank(nz.map(Math.abs));
  out.Wplus = nz.reduce((s, d, i) => s + (d > 0 ? r[i] : 0), 0);
  out.Wminus = nz.reduce((s, d, i) => s + (d < 0 ? r[i] : 0), 0);
  const mu = (n * (n + 1)) / 4;
  const tieCorr = ties.reduce((s, t) => s + (t ** 3 - t), 0) / 48;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tieCorr);
  out.z = sigma > 0 ? (out.Wplus - mu) / sigma : 0;
  out.p = Math.min(1, 2 * (1 - phi(Math.abs(out.z))));
  out.r = N ? out.z / Math.sqrt(N) : NaN;
  if (n <= 30) {
    // Kesin dağılım: iki katına çıkarılmış sıralar tamsayıdır.
    const r2 = r.map((x) => Math.round(x * 2));
    const max = r2.reduce((a, b) => a + b, 0);
    let dist = new Float64Array(max + 1);
    dist[0] = 1;
    r2.forEach((v) => {
      const nd = new Float64Array(max + 1);
      for (let s = 0; s <= max; s++) if (dist[s]) { nd[s] += dist[s]; if (s + v <= max) nd[s + v] += dist[s]; }
      dist = nd;
    });
    const total = 2 ** n;
    const obs = Math.round(out.Wplus * 2);
    let lo = 0, hi = 0;
    for (let s = 0; s <= max; s++) { if (s <= obs) lo += dist[s]; if (s >= obs) hi += dist[s]; }
    out.pExact = Math.min(1, (2 * Math.min(lo, hi)) / total);
  }
  return out;
}

export const SKILLS = [
  { id: 'sh', name: 'Ses–harf eşleştirme', task: 'Duyduğu sese karşılık gelen harfi seçme', scoring: 'Her doğru yanıt 1 puan' },
  { id: 'yaz', name: 'Bağımsız harf yazma', task: 'Söylenen harfi kâğıda ipucusuz yazma', scoring: 'Rubrik: biçim, yönelim, satır yerleşimi (her biri 0–2)' },
  { id: 'kel', name: 'Kelime okuma', task: 'Öğrenilmiş seslerden oluşan yeni kelimeyi okuma', scoring: 'Bağımsız doğru okuma 1 puan' },
  { id: 'cum', name: 'Cümle anlama', task: 'Kısa yazılı cümleyi okuyup soruya yanıt verme', scoring: 'Her doğru yanıt 1 puan' },
];
