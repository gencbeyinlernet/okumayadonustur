// Kullanıcı pilotu: dengeli koşul ataması, puan girişi, Tablo 4 ve Şekil 3 (eşleştirilmiş nokta grafiği).
import { paired, mean, sd, median } from './stats.js';
import { $, $$, esc, toast, download, toCSV, fmt } from './ui.js';

const KEY = 'sesigor.pilot';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
const def = () => ({ n: 12, videos: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'], q: 3, scores: {}, extra: {} });

/**
 * Dengeli atama: her katılımcı 6 videonun 3'ünü T1, 3'ünü T2 koşulunda görür; her video 6 kişide T1, 6 kişide T2.
 * Video sırası 6×6 Latin karesiyle döndürülür; koşul sırası katılımcılar arasında dönüşümlü (T1 veya T2 ile başlama dengelenir).
 */
export function assignment(n, videos) {
  const V = videos.length, out = [];
  for (let i = 0; i < n; i++) {
    const order = Array.from({ length: V }, (_, k) => (i + k) % V);
    if (Math.floor(i / V) % 2 === 1) order.reverse();
    out.push({ p: 'K' + String(i + 1).padStart(2, '0'), seq: order.map((j, pos) => ({ video: videos[j], cond: (pos + i) % 2 === 0 ? 'T1' : 'T2' })) });
  }
  return out;
}

export function renderPilot(root) {
  const st = load() || def(); save(st);
  const A = assignment(st.n, st.videos);
  // denge denetimi
  const perVideo = Object.fromEntries(st.videos.map((v) => [v, { T1: 0, T2: 0 }])); A.forEach((a) => a.seq.forEach((x) => perVideo[x.video][x.cond]++));
  const firstT1 = A.filter((a) => a.seq[0].cond === 'T1').length;
  root.innerHTML = `<section class="eval"><h2>Kullanıcı pilotu</h2>
    <div class="card"><h4>1. Dengeli koşul ataması</h4>
      <div class="row"><label class="field small">Katılımcı sayısı<input type="number" min="2" max="60" data-n value="${st.n}"></label>
      <label class="field small">Video kodları (virgülle)<input data-v value="${esc(st.videos.join(', '))}" style="min-width:240px"></label>
      <label class="field small">Video başına soru (her tür)<input type="number" min="1" max="10" data-q value="${st.q}"></label></div>
      <p class="small">Denge: ${st.videos.map((v) => `${v}: T1 ${perVideo[v].T1} · T2 ${perVideo[v].T2}`).join(' | ')} · T1 ile başlayan ${firstT1}, T2 ile başlayan ${A.length - firstT1} katılımcı.</p>
      <div class="table-wrap"><table class="tbl small"><thead><tr><th>Katılımcı</th>${st.videos.map((_, k) => `<th>${k + 1}. izleme</th>`).join('')}</tr></thead><tbody>
      ${A.map((a) => `<tr><td><b>${a.p}</b></td>${a.seq.map((x) => `<td>${esc(x.video)} · <span class="pill ${x.cond}">${x.cond}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <button class="btn" data-aexp>⬇ Atama çizelgesi (CSV)</button>
      <p class="small muted">T1: yalnızca konuşma altyazısı · T2: aynı motor ve arayüzle altyazı + ses olayı etiketleri. Aynı video aynı kişiye ikinci kez gösterilmez; bir kişinin iki koşulunda yazı boyutu ve ekran ayarları aynı tutulur.</p></div>
    <div class="card"><h4>2. Doğru cevap sayıları (video başına 0–${st.q})</h4>
      <p class="small muted">Her hücre: ses olayı doğru / konuşma doğru. Analiz birimi katılımcıdır; aynı kişiden gelen cevaplar bağımsız sayılmaz.</p>
      <div class="table-wrap"><table class="tbl small entry"><thead><tr><th>Katılımcı</th>${st.videos.map((v) => `<th>${esc(v)}</th>`).join('')}<th>Duraklatma T1 / T2</th><th>Süre (s) T1 / T2</th></tr></thead><tbody>
      ${A.map((a) => `<tr><td><b>${a.p}</b></td>${st.videos.map((v) => { const x = a.seq.find((s) => s.video === v); const k = a.p + '|' + v; const sc = st.scores[k] || {}; return `<td><span class="pill ${x.cond}">${x.cond}</span><input type="number" min="0" max="${st.q}" data-k="${k}" data-f="ev" value="${sc.ev ?? ''}" title="ses olayı"> <input type="number" min="0" max="${st.q}" data-k="${k}" data-f="sp" value="${sc.sp ?? ''}" title="konuşma"></td>`; }).join('')}
        ${['pause', 'time'].map((f) => `<td><input type="number" min="0" data-x="${a.p}" data-f="${f}1" value="${st.extra[a.p]?.[f + '1'] ?? ''}"> <input type="number" min="0" data-x="${a.p}" data-f="${f}2" value="${st.extra[a.p]?.[f + '2'] ?? ''}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>
    <div data-res></div></section>`;
  $('[data-n]', root).onchange = (e) => { st.n = Math.max(2, +e.target.value); save(st); renderPilot(root); };
  $('[data-v]', root).onchange = (e) => { const v = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); if (v.length < 2) return toast('En az iki video'); st.videos = v; save(st); renderPilot(root); };
  $('[data-q]', root).onchange = (e) => { st.q = Math.max(1, +e.target.value); save(st); renderPilot(root); };
  $$('[data-k]', root).forEach((i) => (i.onchange = () => { const v = i.value === '' ? undefined : Math.min(st.q, Math.max(0, +i.value)); (st.scores[i.dataset.k] ||= {})[i.dataset.f] = v; if (v !== undefined) i.value = v; save(st); results(root, st, A); }));
  $$('[data-x]', root).forEach((i) => (i.onchange = () => { (st.extra[i.dataset.x] ||= {})[i.dataset.f] = i.value === '' ? undefined : +i.value; save(st); results(root, st, A); }));
  $('[data-aexp]', root).onclick = () => download('SESIGOR_pilot_atama.csv', toCSV([['katilimci', 'sira', 'video', 'kosul'], ...A.flatMap((a) => a.seq.map((x, k) => [a.p, k + 1, x.video, x.cond]))]), 'text/csv;charset=utf-8');
  results(root, st, A);
}

function participantScores(st, A) {
  return A.map((a) => {
    const agg = { T1: { ev: [0, 0], sp: [0, 0] }, T2: { ev: [0, 0], sp: [0, 0] } };
    let complete = true;
    for (const x of a.seq) { const sc = st.scores[a.p + '|' + x.video] || {}; for (const f of ['ev', 'sp']) { if (sc[f] == null) { complete = false; continue; } agg[x.cond][f][0] += sc[f]; agg[x.cond][f][1] += st.q; } }
    const pct = (c, f) => (agg[c][f][1] ? (100 * agg[c][f][0]) / agg[c][f][1] : NaN);
    return { p: a.p, complete, evT1: pct('T1', 'ev'), evT2: pct('T2', 'ev'), spT1: pct('T1', 'sp'), spT2: pct('T2', 'sp'), ...st.extra[a.p] };
  });
}

function results(root, st, A) {
  const P = participantScores(st, A).filter((x) => x.complete);
  const box = $('[data-res]', root);
  if (P.length < 2) { box.innerHTML = '<div class="card"><p class="muted">Sonuçlar için en az iki katılımcının bütün puanlarını girin.</p></div>'; return; }
  const ev = paired(P.map((x) => x.evT1), P.map((x) => x.evT2)), sp = paired(P.map((x) => x.spT1), P.map((x) => x.spT2));
  const ms = (a) => `${fmt(mean(a), 1)} (${fmt(sd(a), 1)})`;
  const ext = (k) => { const a = P.map((x) => x[k]).filter((v) => v != null && isFinite(v)); return a.length ? fmt(mean(a), 1) : '–'; };
  const byVideo = st.videos.map((v) => { const r = { v, T1: [], T2: [] }; A.forEach((a) => { const x = a.seq.find((s) => s.video === v); const sc = st.scores[a.p + '|' + v]; if (sc && sc.ev != null) r[x.cond].push((100 * sc.ev) / st.q); }); return r; });
  box.innerHTML = `<div class="card"><h4>Tablo 4. Katılımcı düzeyinde doğru cevap oranları (%, n = ${P.length})</h4>
    <table class="tbl"><thead><tr><th>Ölçüt</th><th>Ses olayı soruları</th><th>Konuşma soruları</th></tr></thead><tbody>
      <tr><td>T1: yalnızca altyazı</td><td>${ms(P.map((x) => x.evT1))}</td><td>${ms(P.map((x) => x.spT1))}</td></tr>
      <tr><td>T2: altyazı + ses olayı etiketi</td><td>${ms(P.map((x) => x.evT2))}</td><td>${ms(P.map((x) => x.spT2))}</td></tr>
      <tr><td>Kişi içi fark T2 − T1 (yp)</td><td><b>${fmt(ev.mean, 1)} (${fmt(ev.sd, 1)})</b></td><td><b>${fmt(sp.mean, 1)} (${fmt(sp.sd, 1)})</b></td></tr>
      <tr><td>Farkın ortancası (yp)</td><td>${fmt(ev.median, 1)}</td><td>${fmt(sp.median, 1)}</td></tr>
      <tr><td>Farkın %95 güven aralığı (yp)</td><td>${fmt(ev.lo, 1)}; ${fmt(ev.hi, 1)}</td><td>${fmt(sp.lo, 1)}; ${fmt(sp.hi, 1)}</td></tr>
      <tr><td>Puanı artan / değişmeyen / azalan katılımcı</td><td>${ev.up} / ${ev.same} / ${ev.down}</td><td>${sp.up} / ${sp.same} / ${sp.down}</td></tr></tbody></table>
    <p class="small">%95 GA: t dağılımı (sd = ${P.length - 1}, t = ${fmt(ev.t, 3)}). Konuşma puanındaki ortalama fark ${fmt(sp.mean, 1)} yp; 5 yp tasarım hedefinin ${sp.mean >= -5 ? 'içinde' : 'dışında'} (bu bir istatistiksel eşdeğerlik kanıtı değildir). Ortalama duraklatma T1 ${ext('pause1')}, T2 ${ext('pause2')}; ortalama görev süresi T1 ${ext('time1')} s, T2 ${ext('time2')} s. Küçük pilot: sonuçlar betimseldir.</p>
    <h4>Video düzeyinde ses olayı puanları (%)</h4>
    <table class="tbl small"><thead><tr><th>Video</th><th>T1 ort. (n)</th><th>T2 ort. (n)</th></tr></thead><tbody>${byVideo.map((r) => `<tr><td>${esc(r.v)}</td><td>${fmt(mean(r.T1), 1)} (${r.T1.length})</td><td>${fmt(mean(r.T2), 1)} (${r.T2.length})</td></tr>`).join('')}</tbody></table>
    <button class="btn" data-pexp>⬇ Tablo 4 (CSV)</button></div>
    <div class="card"><h4>Şekil 3. Katılımcıların iki koşuldaki ses olayı puanları</h4>${dotPlot(P)}
      <p class="small muted">Her çizgi bir katılımcıdır; katılımcı kodu gösterilmez. Kalın çizgi ortalamadır.</p><button class="btn" data-svg>⬇ Şekil 3 (SVG)</button></div>`;
  $('[data-pexp]', box).onclick = () => download('SESIGOR_Tablo4_pilot.csv', toCSV([['Ölçüt', 'Ses olayı', 'Konuşma'], ['T1 ort', mean(P.map((x) => x.evT1)).toFixed(2), mean(P.map((x) => x.spT1)).toFixed(2)], ['T1 SS', sd(P.map((x) => x.evT1)).toFixed(2), sd(P.map((x) => x.spT1)).toFixed(2)], ['T2 ort', mean(P.map((x) => x.evT2)).toFixed(2), mean(P.map((x) => x.spT2)).toFixed(2)], ['T2 SS', sd(P.map((x) => x.evT2)).toFixed(2), sd(P.map((x) => x.spT2)).toFixed(2)], ['Fark ort', ev.mean.toFixed(2), sp.mean.toFixed(2)], ['Fark SS', ev.sd.toFixed(2), sp.sd.toFixed(2)], ['Fark ortanca', ev.median.toFixed(2), sp.median.toFixed(2)], ['%95 GA alt', ev.lo.toFixed(2), sp.lo.toFixed(2)], ['%95 GA üst', ev.hi.toFixed(2), sp.hi.toFixed(2)], ['Artan/Değişmeyen/Azalan', `${ev.up}/${ev.same}/${ev.down}`, `${sp.up}/${sp.same}/${sp.down}`], [], ['katilimci', 'olay_T1', 'olay_T2', 'konusma_T1', 'konusma_T2'], ...P.map((x) => [x.p, x.evT1.toFixed(1), x.evT2.toFixed(1), x.spT1.toFixed(1), x.spT2.toFixed(1)])]), 'text/csv;charset=utf-8');
  $('[data-svg]', box).onclick = () => download('SESIGOR_Sekil3.svg', $('svg.dot', box).outerHTML, 'image/svg+xml');
}

function dotPlot(P) {
  const W = 420, H = 300, l = 46, r = 20, t = 16, b = 40, x1 = l + 70, x2 = W - r - 70;
  const y = (v) => t + (1 - v / 100) * (H - t - b);
  const g = [0, 25, 50, 75, 100].map((v) => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e7eb"/><text x="${l - 8}" y="${y(v) + 4}" font-size="12" text-anchor="end" fill="#555">${v}</text>`).join('');
  const lines = P.map((p) => `<line x1="${x1}" x2="${x2}" y1="${y(p.evT1)}" y2="${y(p.evT2)}" stroke="#7dd3fc" stroke-width="1.6"/><circle cx="${x1}" cy="${y(p.evT1)}" r="4" fill="#0284c7"/><circle cx="${x2}" cy="${y(p.evT2)}" r="4" fill="#0284c7"/>`).join('');
  const m1 = mean(P.map((p) => p.evT1)), m2 = mean(P.map((p) => p.evT2));
  return `<svg class="dot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" font-family="Inter, sans-serif">${g}${lines}
    <line x1="${x1}" x2="${x2}" y1="${y(m1)}" y2="${y(m2)}" stroke="#0c4a6e" stroke-width="5" stroke-linecap="round"/>
    <text x="${x1}" y="${H - 14}" text-anchor="middle" font-size="13" font-weight="700">T1: yalnızca altyazı</text><text x="${x2}" y="${H - 14}" text-anchor="middle" font-size="13" font-weight="700">T2: altyazı + olay</text>
    <text x="14" y="${H / 2}" font-size="12" transform="rotate(-90 14 ${H / 2})" text-anchor="middle">Ses olayı doğru cevap (%)</text></svg>`;
}
