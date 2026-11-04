// İZGE spektrum çekirdeği: profil çıkarma, tepe bulma, dalga boyu kalibrasyonu, FWHM.
// Referans dalga boyları havada ölçülen değerlerdir (Sansonetti ve Martin, 2005).

export const LINES = {
  cal: [
    { el: 'Hg I', nm: 404.6563, role: 'Kalibrasyon' },
    { el: 'Hg I', nm: 435.8328, role: 'Kalibrasyon' },
    { el: 'Hg I', nm: 546.0735, role: 'Kalibrasyon ve ana çizgi genişliği ölçümü' },
    { el: 'Ne I', nm: 692.9467, role: 'Kırmızı uç kalibrasyonu' },
  ],
  val: { el: 'Ne I', nm: 650.6528, role: 'Kalibrasyona alınmayan doğrulama çizgisi' },
  main: 546.0735,
  // tanımlamada yardımcı olabilecek diğer çizgiler (kalibrasyona alınmaz)
  extra: [
    { el: 'Hg I', nm: 576.9598 }, { el: 'Hg I', nm: 579.0663 }, { el: 'Hg I', nm: 491.6068 },
    { el: 'Ne I', nm: 585.2488 }, { el: 'Ne I', nm: 588.1895 }, { el: 'Ne I', nm: 594.4834 }, { el: 'Ne I', nm: 603.9969 },
    { el: 'Ne I', nm: 607.4338 }, { el: 'Ne I', nm: 614.3062 }, { el: 'Ne I', nm: 616.3594 }, { el: 'Ne I', nm: 621.7281 },
    { el: 'Ne I', nm: 626.6495 }, { el: 'Ne I', nm: 633.4428 }, { el: 'Ne I', nm: 638.2992 }, { el: 'Ne I', nm: 640.2248 },
    { el: 'Ne I', nm: 659.8953 }, { el: 'Ne I', nm: 667.8277 }, { el: 'Ne I', nm: 671.7043 }, { el: 'Ne I', nm: 703.2413 },
  ],
};

/**
 * Görüntüden spektrum profili: ROI içindeki her sütun için seçili kanalın satır ortalaması.
 * data: RGBA Uint8ClampedArray/Float32Array (W×H), roi: {x,y,w,h}, ch: 0=R,1=G,2=B,3=parlaklık
 */
export function profile(data, W, roi, ch = 1) {
  const out = new Float64Array(roi.w), max = new Float64Array(roi.w);
  for (let j = 0; j < roi.w; j++) {
    let s = 0, m = 0;
    for (let i = 0; i < roi.h; i++) {
      const q = ((roi.y + i) * W + roi.x + j) * 4;
      const v = ch === 3 ? 0.2126 * data[q] + 0.7152 * data[q + 1] + 0.0722 * data[q + 2] : data[q + ch];
      s += v; if (v > m) m = v;
    }
    out[j] = s / roi.h; max[j] = m;
  }
  return { y: out, max };
}

/** Basit tepe bulucu: yerel en büyük, en küçük belirginlik ve uzaklık şartıyla. */
export function findPeaks(y, { minProm = 0.05, minDist = 4 } = {}) {
  const n = y.length; let lo = Infinity, hi = -Infinity;
  for (const v of y) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const thr = lo + (hi - lo) * minProm; const peaks = [];
  for (let i = 1; i < n - 1; i++) {
    if (y[i] >= y[i - 1] && y[i] > y[i + 1] && y[i] > thr) {
      // belirginlik: iki yandaki en düşük vadiye göre
      let l = i, r = i, ml = y[i], mr = y[i];
      while (l > 0 && y[l - 1] <= y[i]) { l--; ml = Math.min(ml, y[l]); }
      while (r < n - 1 && y[r + 1] <= y[i]) { r++; mr = Math.min(mr, y[r]); }
      const prom = y[i] - Math.max(ml, mr);
      if (prom > (hi - lo) * minProm) peaks.push({ i, x: subpixel(y, i), h: y[i], prom });
    }
  }
  peaks.sort((a, b) => b.prom - a.prom);
  const kept = [];
  for (const p of peaks) if (kept.every((q) => Math.abs(q.i - p.i) >= minDist)) kept.push(p);
  return kept.sort((a, b) => a.i - b.i);
}
/** Parabol uydurmayla alt-piksel tepe konumu. */
export function subpixel(y, i) {
  const a = y[i - 1], b = y[i], c = y[i + 1]; const d = a - 2 * b + c;
  return d === 0 ? i : i + (0.5 * (a - c)) / d;
}

/** En küçük kareler polinom uydurma (derece ≤ 2): λ = c0 + c1·p + c2·p² */
export function polyfit(px, nm, deg) {
  const n = deg + 1; const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let k = 0; k < px.length; k++) {
    const pw = Array.from({ length: n }, (_, j) => px[k] ** j);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j]; A[i][n] += pw[i] * nm[k]; }
  }
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-18) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}
export const evalPoly = (c, p) => c.reduce((s, v, j) => s + v * p ** j, 0);

/** Kalibrasyon: eşleştirilmiş tepeler [{x, nm}] → katsayılar, uyum RMS ve doğrulama hatası. */
export function calibrate(pairs, deg, valPeakX) {
  const px = pairs.map((p) => p.x), nm = pairs.map((p) => p.nm);
  if (pairs.length < deg + 1) return { ok: false, reason: `Derece ${deg} için en az ${deg + 1} çizgi gerekir.` };
  // piksel ekseni tek yönlü olmalı (dalga boyu sırasıyla artan ya da azalan)
  const ord = pairs.slice().sort((a, b) => a.x - b.x).map((p) => p.nm);
  const mono = ord.every((v, i) => !i || v > ord[i - 1]) || ord.every((v, i) => !i || v < ord[i - 1]);
  if (!mono) return { ok: false, reason: 'Eşleştirilen çizgilerin piksel sırası dalga boyu sırasıyla uyuşmuyor.' };
  const c = polyfit(px, nm, deg); if (!c) return { ok: false, reason: 'Uydurma tekil.' };
  const res = pairs.map((p) => evalPoly(c, p.x) - p.nm);
  const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
  const disp = Math.abs(c[1] + 2 * (c[2] || 0) * ((px[0] + px[px.length - 1]) / 2)); // nm/piksel (orta bölge)
  const valErr = valPeakX != null ? evalPoly(c, valPeakX) - LINES.val.nm : null;
  return { ok: true, coef: c, deg, rms, maxRes: Math.max(...res.map(Math.abs)), res, dispersion: disp, valErr, n: pairs.length };
}

/**
 * FWHM: yerel arka plan (iki yandaki çizgisiz pencerelerden doğrusal), yarı yükseklikte doğrusal ara değerlemeyle iki kesişim.
 * x0: çizgi tepesinin yaklaşık konumu; win: arama yarı genişliği (piksel); bg: [iç, dış] arka plan penceresi uzaklıkları
 */
export function fwhm(y, x0, coef, { win = 25, bg = [12, 30] } = {}) {
  const n = y.length; let i0 = Math.round(x0);
  for (let k = Math.max(1, i0 - 4); k <= Math.min(n - 2, i0 + 4); k++) if (y[k] > y[i0]) i0 = k;
  const side = (a, b) => { const xs = [], ys = []; for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) { xs.push(k); ys.push(y[k]); } return { xs, ys }; };
  const L = side(i0 - bg[1], i0 - bg[0]), R = side(i0 + bg[0], i0 + bg[1]);
  const xs = [...L.xs, ...R.xs], ys = [...L.ys, ...R.ys];
  if (xs.length < 4) return { ok: false, reason: 'Arka plan penceresi profil dışında.' };
  const bl = polyfit(xs, ys, 1); const base = (k) => bl[0] + bl[1] * k;
  const peak = y[i0] - base(i0);
  const resid = ys.map((v, k) => v - base(xs[k])); const mu = resid.reduce((a, b) => a + b, 0) / resid.length;
  const noise = Math.sqrt(resid.reduce((s, v) => s + (v - mu) ** 2, 0) / Math.max(1, resid.length - 1));
  const half = peak / 2;
  let l = i0; while (l > i0 - win && l > 0 && y[l] - base(l) > half) l--;
  let r = i0; while (r < i0 + win && r < n - 1 && y[r] - base(r) > half) r++;
  if (y[l] - base(l) > half || y[r] - base(r) > half) return { ok: false, reason: 'Yarı yükseklik kesişimi arama penceresinde bulunamadı.' };
  const lerp = (a, b) => { const ya = y[a] - base(a), yb = y[b] - base(b); return a + (half - ya) / (yb - ya) * (b - a); };
  const xl = lerp(l, l + 1), xr = lerp(r - 1, r);
  const px = xr - xl;
  const nmW = coef ? Math.abs(evalPoly(coef, xr) - evalPoly(coef, xl)) : null;
  return { ok: true, i0, xPeak: subpixel(y, i0), xl, xr, px, nm: nmW, R: nmW ? LINES.main / nmW : null, peak, noise, snr: noise > 0 ? peak / noise : Infinity, sampled: px < 2, base: bl };
}

export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
export const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

/**
 * Cıva çizgilerinin otomatik önerisi: belirgin tepelerden 3'lü adaylar 404,66 / 435,83 / 546,07 nm'ye doğrusal uydurulur;
 * uyum hatası ve 577–579 nm sarı çiftinin beklenen yerde bulunup bulunmaması puanlanır. Öneri kullanıcı onayına sunulur.
 */
export function suggestHg(peaks) {
  const top = peaks.slice().sort((a, b) => b.prom - a.prom).slice(0, 7);
  const tgt = [404.6563, 435.8328, 546.0735]; let best = null;
  for (let i = 0; i < top.length; i++) for (let j = 0; j < top.length; j++) for (let k = 0; k < top.length; k++) {
    if (i === j || j === k || i === k) continue;
    const P = [top[i], top[j], top[k]];
    const mono = (P[0].x < P[1].x && P[1].x < P[2].x) || (P[0].x > P[1].x && P[1].x > P[2].x);
    if (!mono) continue;
    const c = polyfit(P.map((p) => p.x), tgt, 1); if (!c) continue;
    const res = Math.sqrt(P.reduce((s, p, q) => s + (evalPoly(c, p.x) - tgt[q]) ** 2, 0) / 3);
    const disp = Math.abs(c[1]); if (disp < 0.05 || disp > 20) continue;
    const xs = (578 - c[0]) / c[1]; // sarı çift
    const yel = peaks.some((p) => Math.abs(p.x - xs) * disp < 4 + 2 * disp);
    const score = res + (yel ? 0 : 3) - 0.002 * (P[0].prom + P[1].prom + P[2].prom) / Math.max(...peaks.map((q) => q.prom));
    if (!yel || res > 1.5) continue; // güvenilir değil: sarı çift beklenen yerde yok ya da uyum kötü
    if (!best || score < best.score) best = { score, pairs: P.map((p, q) => ({ x: p.x, nm: tgt[q] })), coef: c, res, yellow: yel };
  }
  return best;
}
/** Tepe eşiği giderek düşürülerek cıva önerisi aranır (zayıf mor çizgiler için). */
export function suggestHgAuto(y) {
  for (const minProm of [0.05, 0.03, 0.02, 0.012, 0.008]) {
    const peaks = findPeaks(y, { minProm, minDist: 3 }); const s = suggestHg(peaks);
    if (s) return { ...s, peaks, minProm };
  }
  return null;
}
/** Kalibrasyondan sonra verilen dalga boyuna en yakın tepeyi önerir (en çok tol nm). */
export function nearestPeak(peaks, coef, nm, tol = 6) {
  let best = null;
  for (const p of peaks) { const d = Math.abs(evalPoly(coef, p.x) - nm); if (d <= tol && (!best || d < best.d)) best = { ...p, d }; }
  return best;
}
/** Arka plan pencereleri: çizginin yarı genişliğine göre ve komşu tepelerden uzak. */
export function autoBg(y, x0, others = []) {
  const i0 = Math.round(x0), h = y[i0]; let lo = Infinity; for (let k = Math.max(0, i0 - 60); k < Math.min(y.length, i0 + 60); k++) lo = Math.min(lo, y[k]);
  let l = i0; while (l > 0 && y[l] > lo + (h - lo) / 2) l--;
  let r = i0; while (r < y.length - 1 && y[r] > lo + (h - lo) / 2) r++;
  const hw = Math.max(1, (r - l) / 2); const inner = Math.ceil(3 * hw + 2), outer = inner + Math.max(8, Math.ceil(3 * hw));
  const near = others.filter((x) => Math.abs(x - x0) > 1.5).map((x) => Math.abs(x - x0)).sort((a, b) => a - b)[0];
  if (near && near - 2 * hw - 2 < outer) return { bg: [inner, Math.max(inner + 3, Math.floor(near - 2 * hw - 2))], hw, limited: true };
  return { bg: [inner, outer], hw, limited: false };
}

/**
 * Neon önerisi: cıva kalibrasyonu kırmızıya doğru dışarı uzatıldığında oluşan kayma ve ölçek hatası,
 * güçlü neon çizgi örüntüsü tepe listesine oturtularak (kaydırma + ölçek araması) düzeltilir; sonra 692,95 ve 650,65 nm aranır.
 */
const NE_STRONG = [585.2488, 594.4834, 607.4338, 614.3062, 633.4428, 638.2992, 640.2248, 650.6528, 659.8953, 667.8277, 692.9467, 703.2413];
export function suggestNe(peaks, coef) {
  const lam = peaks.map((p) => evalPoly(coef, p.x)); let best = null;
  for (let k = 0.95; k <= 1.05; k += 0.0025) for (let s = -12; s <= 12; s += 0.2) {
    const f = (l) => 546.0735 + (l - 546.0735) * k + s;
    let sc = 0; for (const r of NE_STRONG) { let m = 3; for (const l of lam) m = Math.min(m, Math.abs(f(l) - r)); sc += m; }
    if (!best || sc < best.sc) best = { sc, k, s, f };
  }
  const pick = (nm) => { let b = null; peaks.forEach((p, i) => { const d = Math.abs(best.f(lam[i]) - nm); if (d < 2.5 && (!b || d < b.d)) b = { ...p, d }; }); return b; };
  return { cal: pick(692.9467), val: pick(650.6528), shift: best.s, scale: best.k, score: best.sc };
}
