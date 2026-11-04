// Teknik değerlendirme: kelime hata oranı (Tablo 1), ses olayı algılama (Tablo 2, Ek 1), gecikme (Tablo 3), eşik seçimi.
import { CATEGORIES, CAT_BY_ID, DEFAULT_RULES } from '../eklenti/core/categories.js';
import { EventDetector } from '../eklenti/core/events.js';
import { wer, normTR, median, quantile, mean } from './stats.js';
import { saveRules, loadRules } from './uygulama.js';
import { $, $$, esc, toast, download, toCSV, parseCSV, fmt } from './ui.js';

const TABS = [['wer', 'Kelime hata oranı'], ['olay', 'Ses olayları'], ['gecikme', 'Gecikme ve kaynak'], ['esik', 'Eşik seçimi']];
const CONDS = ['Temiz konuşma', 'Konuşma ve müzik', 'Konuşma ve çevresel ses', 'Çok konuşmacı'];

export function renderDegerlendirme(root, tab = 'wer') {
  if (!TABS.some(([t]) => t === tab)) tab = 'wer';
  root.innerHTML = `<section class="eval"><h2>Teknik değerlendirme</h2>
    <nav class="tabs">${TABS.map(([t, n]) => `<a class="tab ${t === tab ? 'on' : ''}" href="#/degerlendirme/${t}">${n}</a>`).join('')}</nav><div data-body></div></section>`;
  ({ wer: werTab, olay: olayTab, gecikme: gecikmeTab, esik: esikTab })[tab]($('[data-body]', root));
}

// ---------- Dosya okuyucular ----------
async function readFiles(input) { return Promise.all([...input.files].map(async (f) => ({ name: f.name, text: await f.text() }))); }
function parseSRT(text) {
  const out = []; const blocks = text.replace(/\r/g, '').split(/\n\n+/);
  const t = (s) => { const m = s.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +('0.' + m[4]) : NaN; };
  for (const b of blocks) { const L = b.split('\n').filter(Boolean); const i = L.findIndex((x) => x.includes('-->')); if (i < 0) continue; const [a, c] = L[i].split('-->'); out.push({ start: t(a), end: t(c), text: L.slice(i + 1).join(' ').replace(/<[^>]+>/g, '') }); }
  return out;
}
const baseName = (n) => n.replace(/\.(srt|vtt|txt|json)$/i, '').replace(/^SESIGOR_(oturum|altyazi)_/, '');

// ---------- Tablo 1: Kelime hata oranı ----------
let werRows = [];
function werTab(b) {
  b.innerHTML = `<div class="card">
    <p>WER = (S + D + I) / N × 100. Türkçe karakterler korunur; büyük–küçük harf, noktalama ve kesme işareti bütün sistemlere aynı biçimde normalleştirilir. Oran her videoda ve kelime sayısıyla ağırlıklandırılmış toplam olarak verilir.</p>
    <details open><summary><b>Tek karşılaştırma</b></summary>
      <div class="grid2"><label class="field">Referans metin<textarea data-ref rows="4" placeholder="Birazdan kapıyı açacağım."></textarea></label>
      <label class="field">Sistem çıktısı<textarea data-hyp rows="4" placeholder="Birazdan kapıyı açacağım"></textarea></label></div>
      <button class="btn primary" data-one>Hesapla</button><div data-oneout></div></details>
    <details><summary><b>Toplu değerlendirme (Tablo 1)</b></summary>
      <p class="small muted">CSV sütunları: <code>video; kosul; referans; sesigor; yerlesik</code>. Koşullar: ${CONDS.join(' / ')}. Yerleşik canlı altyazı Türkçe desteklemediğinde veya çalıştırılamadığında hücreye <code>desteklenmedi</code> yazın.</p>
      <label class="btn">⬆ CSV yükle<input type="file" accept=".csv,.txt" data-csv hidden></label>
      <button class="btn ghost" data-tpl>⬇ Boş şablon</button><div data-batch></div></details></div>`;
  $('[data-one]', b).onclick = () => {
    const r = wer($('[data-ref]', b).value, $('[data-hyp]', b).value);
    $('[data-oneout]', b).innerHTML = `<p>WER <b>%${fmt(r.wer, 1)}</b> · S ${r.S} · D ${r.D} · I ${r.I} · N ${r.N}</p><p class="align">${r.align.map(([t, a, h]) => t === '=' ? `<span>${esc(a)}</span>` : t === 'S' ? `<span class="s" title="değiştirme">${esc(a)}→${esc(h)}</span>` : t === 'D' ? `<span class="d" title="silme">${esc(a)}</span>` : `<span class="i" title="ekleme">+${esc(h)}</span>`).join(' ')}</p>`;
  };
  $('[data-tpl]', b).onclick = () => download('SESIGOR_WER_sablon.csv', toCSV([['video', 'kosul', 'referans', 'sesigor', 'yerlesik'], ['V01', CONDS[0], 'Birazdan kapıyı açacağım.', '', '']]), 'text/csv;charset=utf-8');
  $('[data-csv]', b).onchange = async (e) => {
    const rows = parseCSV(await e.target.files[0].text()); const hd = rows.shift().map((x) => x.trim().toLowerCase());
    const c = (r, k) => r[hd.indexOf(k)] ?? '';
    werRows = rows.map((r) => ({ video: c(r, 'video'), cond: c(r, 'kosul'), ref: c(r, 'referans'), sys: c(r, 'sesigor'), base: c(r, 'yerlesik') }));
    renderWerBatch($('[data-batch]', b));
  };
  if (werRows.length) renderWerBatch($('[data-batch]', b));
}
function renderWerBatch(box) {
  const res = werRows.map((r) => ({ ...r, a: wer(r.ref, r.sys), bb: /desteklenmedi/i.test(r.base) || !r.base.trim() ? null : wer(r.ref, r.base) }));
  const agg = (list, k) => { const L = list.filter((x) => x[k]); const e = L.reduce((s, x) => s + x[k].S + x[k].D + x[k].I, 0), n = L.reduce((s, x) => s + x[k].N, 0); return L.length ? { w: (100 * e) / n, n: L.length } : null; };
  const conds = [...new Set([...CONDS, ...res.map((r) => r.cond)])].filter((c) => res.some((r) => r.cond === c));
  const cell = (x) => (x ? `%${fmt(x.w, 1)}` : 'desteklenmedi');
  box.innerHTML = `<table class="tbl"><thead><tr><th>Koşul</th><th>Video (n)</th><th>SESİGÖR</th><th>Yerleşik canlı altyazı</th></tr></thead><tbody>
    ${conds.map((c) => { const L = res.filter((r) => r.cond === c); return `<tr><td>${esc(c)}</td><td>${L.length}</td><td>${cell(agg(L, 'a'))}</td><td>${cell(agg(L, 'bb'))}</td></tr>`; }).join('')}
    <tr class="total"><td>Tümü</td><td>${res.length}</td><td>${cell(agg(res, 'a'))}</td><td>${cell(agg(res, 'bb'))}</td></tr></tbody></table>
    <p>Video başına WER ortancası (SESİGÖR): <b>%${fmt(median(res.map((r) => r.a.wer).filter(isFinite)), 1)}</b></p>
    <details><summary>Video ayrıntısı</summary><table class="tbl small"><thead><tr><th>Video</th><th>Koşul</th><th>N</th><th>S</th><th>D</th><th>I</th><th>WER</th><th>Yerleşik</th></tr></thead><tbody>
    ${res.map((r) => `<tr><td>${esc(r.video)}</td><td>${esc(r.cond)}</td><td>${r.a.N}</td><td>${r.a.S}</td><td>${r.a.D}</td><td>${r.a.I}</td><td>%${fmt(r.a.wer, 1)}</td><td>${r.bb ? '%' + fmt(r.bb.wer, 1) : 'desteklenmedi'}</td></tr>`).join('')}</tbody></table></details>
    <button class="btn" data-wexp>⬇ Tablo 1 (CSV)</button>`;
  $('[data-wexp]', box).onclick = () => download('SESIGOR_Tablo1_WER.csv', toCSV([['Koşul', 'Video (n)', 'SESİGÖR WER %', 'Yerleşik WER %'], ...conds.map((c) => { const L = res.filter((r) => r.cond === c); const a = agg(L, 'a'), bb = agg(L, 'bb'); return [c, L.length, a ? a.w.toFixed(2) : '', bb ? bb.w.toFixed(2) : 'desteklenmedi']; }), ['Tümü', res.length, agg(res, 'a')?.w.toFixed(2), agg(res, 'bb')?.w.toFixed(2) ?? 'desteklenmedi'], [], ['video', 'kosul', 'N', 'S', 'D', 'I', 'WER'], ...res.map((r) => [r.video, r.cond, r.a.N, r.a.S, r.a.D, r.a.I, r.a.wer.toFixed(2)])]), 'text/csv;charset=utf-8');
}

// ---------- Tablo 2 ve Ek 1: Ses olayları ----------
let refEvents = [], sessions = [];
/** Kategori içinde bire bir eşleştirme: zaman farkı en küçük çiftten başlayarak, |Δ| ≤ tol. */
export function matchEvents(refs, preds, tol) {
  const pairs = [];
  refs.forEach((r, i) => preds.forEach((p, j) => { const d = Math.abs(p.onset - r.onset); if (d <= tol) pairs.push([d, i, j]); }));
  pairs.sort((a, b) => a[0] - b[0]);
  const ur = new Set(), up = new Set(), m = [];
  for (const [d, i, j] of pairs) if (!ur.has(i) && !up.has(j)) { ur.add(i); up.add(j); m.push({ ref: refs[i], pred: preds[j], d }); }
  return { tp: m.length, fp: preds.length - m.length, fn: refs.length - m.length, matches: m };
}
export function scoreEvents(refsByVideo, predsByVideo, durations, tol) {
  const per = {}; CATEGORIES.forEach((c) => (per[c.id] = { tp: 0, fp: 0, fn: 0, ref: 0, lat: [] }));
  let minutes = 0;
  for (const v of Object.keys({ ...refsByVideo, ...predsByVideo })) {
    minutes += (durations[v] || 0) / 60;
    for (const c of CATEGORIES) {
      const R = (refsByVideo[v] || []).filter((e) => e.cat === c.id), P = (predsByVideo[v] || []).filter((e) => e.cat === c.id);
      const r = matchEvents(R, P, tol); const q = per[c.id];
      q.tp += r.tp; q.fp += r.fp; q.fn += r.fn; q.ref += R.length;
      r.matches.forEach((m) => m.pred.shownAt != null && q.lat.push(m.pred.shownAt - m.ref.onset));
    }
  }
  const f = (q) => { const P = q.tp + q.fp ? q.tp / (q.tp + q.fp) : NaN, Rc = q.tp + q.fn ? q.tp / (q.tp + q.fn) : NaN; return { P, R: Rc, F1: P + Rc ? (2 * P * Rc) / (P + Rc) : 0 }; };
  const cats = CATEGORIES.map((c) => ({ id: c.id, ...per[c.id], ...f(per[c.id]) }));
  const used = cats.filter((c) => c.ref > 0 || c.tp + c.fp > 0);
  const tot = cats.reduce((a, c) => ({ tp: a.tp + c.tp, fp: a.fp + c.fp, fn: a.fn + c.fn }), { tp: 0, fp: 0, fn: 0 });
  return { cats, macroF1: used.length ? mean(used.map((c) => c.F1)) : NaN, micro: f(tot), tot, fpPerMin: minutes ? tot.fp / minutes : NaN, minutes, lat: cats.flatMap((c) => c.lat) };
}
function olayTab(b) {
  b.innerHTML = `<div class="card">
    <p>Eşleştirme: aynı kategori ve başlangıç farkı en çok <b data-tol>1</b> s; tek referans olaya birden fazla tahmin doğru sayılmaz (Mesaros vd., 2016). Yanlış bildirim, toplam video süresine bölünerek dakika başına verilir.</p>
    <div class="row"><label class="btn">⬆ Referans olaylar (CSV)<input type="file" accept=".csv" data-ref hidden></label>
      <label class="btn">⬆ Oturum kayıtları (JSON, çoklu)<input type="file" accept=".json" multiple data-ses hidden></label>
      <label class="field small">Tolerans<select data-tsel><option>0.5</option><option selected>1</option><option>2</option></select></label>
      <button class="btn ghost" data-tpl>⬇ Referans şablonu</button></div>
    <p class="small muted">Referans CSV: <code>video; kategori; baslangic_s</code> (kategori kodları: ${CATEGORIES.map((c) => c.id).join(', ')}). Oturum kaydının dosya adı ya da içindeki <code>meta.dosya</code> videoyla eşleştirilir. Her videonun süresi kayıttan alınır.</p>
    <div data-out><p class="muted">${refEvents.length} referans olay, ${sessions.length} oturum yüklü.</p></div></div>`;
  const run = () => {
    if (!refEvents.length || !sessions.length) { $('[data-out]', b).innerHTML = `<p class="muted">${refEvents.length} referans olay, ${sessions.length} oturum yüklü.</p>`; return; }
    const tol = +$('[data-tsel]', b).value; $('[data-tol]', b).textContent = tol;
    const refs = {}; refEvents.forEach((e) => (refs[e.video] ||= []).push(e));
    const ruled = {}, raw = {}, dur = {};
    sessions.forEach((s) => { ruled[s.video] = s.events; raw[s.video] = s.raw; dur[s.video] = s.duration; });
    const A = scoreEvents(refs, ruled, dur, tol), B = scoreEvents(refs, raw, dur, tol);
    const missing = Object.keys(refs).filter((v) => !ruled[v]);
    $('[data-out]', b).innerHTML = `
      ${missing.length ? `<p class="warn">Oturum kaydı bulunmayan videolar: ${esc(missing.join(', '))}</p>` : ''}
      <h4>Tablo 2. Ses olayı algılama: kurallı ve ham çıktı</h4>
      <table class="tbl"><thead><tr><th>Ölçüt</th><th>Kurallı (eşik + birleştirme)</th><th>Ham çıktı</th></tr></thead><tbody>
        <tr><td>Makro F1 (hedef ≥ 0,75)</td><td><b>${fmt(A.macroF1, 2)}</b></td><td>${fmt(B.macroF1, 2)}</td></tr>
        <tr><td>Kesinlik / duyarlılık (mikro)</td><td>${fmt(A.micro.P, 2)} / ${fmt(A.micro.R, 2)}</td><td>${fmt(B.micro.P, 2)} / ${fmt(B.micro.R, 2)}</td></tr>
        <tr><td>Yanlış bildirim (adet/dk; hedef ≤ 1)</td><td><b>${fmt(A.fpPerMin, 2)}</b></td><td>${fmt(B.fpPerMin, 2)}</td></tr>
        <tr><td>Referans olay / doğru bulunan / kaçırılan</td><td>${A.tot.tp + A.tot.fn} / ${A.tot.tp} / ${A.tot.fn}</td><td>—</td></tr></tbody></table>
      <p class="small">Toplam süre ${fmt(A.minutes, 1)} dk · tolerans ${tol} s. Kurallar yanlış bildirimi dakikada ${fmt(B.fpPerMin, 2)}'den ${fmt(A.fpPerMin, 2)}'ye ${A.fpPerMin < B.fpPerMin ? 'azalttı' : 'azaltmadı'} (H3).</p>
      <h4>Ek 1. Kategori bazında sonuçlar (kurallı)</h4>
      <table class="tbl"><thead><tr><th>Kategori</th><th>Referans</th><th>Kesinlik</th><th>Duyarlılık</th><th>F1</th></tr></thead><tbody>
        ${A.cats.map((c) => `<tr><td>${CAT_BY_ID[c.id].icon} ${esc(CAT_BY_ID[c.id].label)}</td><td>${c.ref}</td><td>${fmt(c.P, 2)}</td><td>${fmt(c.R, 2)}</td><td>${fmt(c.F1, 2)}</td></tr>`).join('')}</tbody></table>
      <button class="btn" data-exp>⬇ Tablo 2 ve Ek 1 (CSV)</button>`;
    $('[data-exp]', b).onclick = () => download(`SESIGOR_Tablo2_Ek1_tol${tol}.csv`, toCSV([['Ölçüt', 'Kurallı', 'Ham'], ['Makro F1', A.macroF1.toFixed(3), B.macroF1.toFixed(3)], ['Kesinlik (mikro)', A.micro.P.toFixed(3), B.micro.P.toFixed(3)], ['Duyarlılık (mikro)', A.micro.R.toFixed(3), B.micro.R.toFixed(3)], ['Yanlış bildirim / dk', A.fpPerMin.toFixed(3), B.fpPerMin.toFixed(3)], ['Referans / TP / FN', `${A.tot.tp + A.tot.fn} / ${A.tot.tp} / ${A.tot.fn}`, ''], [], ['Kategori', 'Referans', 'Kesinlik', 'Duyarlılık', 'F1'], ...A.cats.map((c) => [CAT_BY_ID[c.id].label, c.ref, isFinite(c.P) ? c.P.toFixed(3) : '', isFinite(c.R) ? c.R.toFixed(3) : '', c.F1.toFixed(3)])]), 'text/csv;charset=utf-8');
  };
  $('[data-tpl]', b).onclick = () => download('SESIGOR_referans_olaylar_sablon.csv', toCSV([['video', 'kategori', 'baslangic_s'], ['V01', 'kapi_zili', '12.4']]), 'text/csv;charset=utf-8');
  $('[data-ref]', b).onchange = async (e) => { const rows = parseCSV(await e.target.files[0].text()); const hd = rows.shift().map((x) => x.trim().toLowerCase()); refEvents = rows.map((r) => ({ video: r[hd.indexOf('video')].trim(), cat: r[hd.indexOf('kategori')].trim(), onset: parseFloat(String(r[hd.indexOf('baslangic_s')]).replace(',', '.')) })).filter((x) => CAT_BY_ID[x.cat] && isFinite(x.onset)); run(); };
  $('[data-ses]', b).onchange = async (e) => { sessions = (await readFiles(e.target)).map(sessionFromFile).filter(Boolean); run(); };
  $('[data-tsel]', b).onchange = run;
  run();
}
function sessionFromFile(f) {
  try {
    const j = JSON.parse(f.text);
    const video = (j.meta && j.meta.dosya ? j.meta.dosya.replace(/\.[^.]+$/, '') : baseName(f.name));
    const last = j.scores && j.scores.length ? j.scores[j.scores.length - 1].t + 0.975 : 0;
    return { video, events: j.events || [], raw: j.raw || [], scores: j.scores || [], lines: j.lines || [], summary: j.summary || {}, duration: last, meta: j.meta || {}, name: f.name };
  } catch { toast(f.name + ' okunamadı'); return null; }
}

// ---------- Tablo 3: Gecikme ve kaynak ----------
let refSRT = {}, latSessions = [];
function gecikmeTab(b) {
  b.innerHTML = `<div class="card">
    <p>Gecikme: referans söz sonu (konuşma) veya olay başlangıcı ile ilk kararlı ekran gösterimi arasındaki süre. Konuşma için oturumdaki kesinleşmiş satırın zamanı kullanılır; video dosyası kipinde zamanlar videonun kendi saatindedir.</p>
    <div class="row"><label class="btn">⬆ Referans altyazılar (SRT, çoklu)<input type="file" accept=".srt,.vtt" multiple data-srt hidden></label>
      <label class="btn">⬆ Oturum kayıtları (JSON, çoklu)<input type="file" accept=".json" multiple data-ses hidden></label>
      <label class="field small">Bilgisayar etiketi<input data-pc value="Bilgisayar 1" style="width:130px"></label></div>
    <p class="small muted">SRT dosyasının adı videoyla aynı olmalıdır (ör. V01.srt). Olay gecikmesi için “Ses olayları” sekmesindeki referans olaylar kullanılır.</p>
    <div data-out></div></div>`;
  const run = () => {
    if (!latSessions.length) return;
    const groups = {}; latSessions.forEach((s) => (groups[s.pc] ||= []).push(s));
    const rows = Object.entries(groups).map(([pc, L]) => {
      const sp = [], ev = []; let rtfNum = 0, rtfDen = 0, heap = 0, errs = 0;
      for (const s of L) {
        const ref = refSRT[s.video] || [];
        for (const seg of ref) {
          const line = s.lines.find((l) => l.audioEnd >= seg.start && l.audioStart <= seg.end && (l.stableAt ?? l.shownAt) >= seg.start);
          if (line) sp.push(Math.max(0, (line.stableAt ?? line.shownAt) - seg.end));
        }
        const refs = refEvents.filter((e) => e.video === s.video);
        for (const c of CATEGORIES) { const r = matchEvents(refs.filter((e) => e.cat === c.id), s.events.filter((e) => e.cat === c.id), 1); r.matches.forEach((m) => ev.push(Math.max(0, m.pred.shownAt - m.ref.onset))); }
        if (s.summary.rtf != null) { rtfNum += s.summary.rtf * s.summary.audio_s; rtfDen += s.summary.audio_s; }
        heap = Math.max(heap, s.summary.heap_mb || 0); if (!s.lines.length && !s.events.length) errs++;
      }
      return { pc, n: L.length, sp, ev, rtf: rtfDen ? rtfNum / rtfDen : NaN, heap, errs };
    });
    const q = (a, p) => (a.length ? fmt(quantile(a, p), 2) : '–');
    $('[data-out]', b).innerHTML = `<h4>Tablo 3. Gösterim gecikmesi (s) ve kaynak kullanımı</h4>
      <table class="tbl"><thead><tr><th>Ölçüt</th>${rows.map((r) => `<th>${esc(r.pc)}</th>`).join('')}</tr></thead><tbody>
        <tr><td>Konuşma: ortanca / %95 (hedef ≤ 3 / ≤ 6)</td>${rows.map((r) => `<td>${q(r.sp, 0.5)} / ${q(r.sp, 0.95)} <small>(n = ${r.sp.length})</small></td>`).join('')}</tr>
        <tr><td>Ses olayı: ortanca / %95</td>${rows.map((r) => `<td>${q(r.ev, 0.5)} / ${q(r.ev, 0.95)} <small>(n = ${r.ev.length})</small></td>`).join('')}</tr>
        <tr><td>Gerçek zaman oranı (işlem / ses süresi)</td>${rows.map((r) => `<td>${fmt(r.rtf, 2)}</td>`).join('')}</tr>
        <tr><td>En yüksek JS belleği (MB) / oturum hatası</td>${rows.map((r) => `<td>${r.heap ? fmt(r.heap, 0) : '–'} / ${r.errs}</td>`).join('')}</tr></tbody></table>
      <p class="small muted">Bellek, tarayıcının ölçebildiği JavaScript yığınıdır (performance.memory); WASM ve GPU belleği ayrıca görev yöneticisinden kaydedilmelidir.</p>`;
  };
  $('[data-srt]', b).onchange = async (e) => { (await readFiles(e.target)).forEach((f) => (refSRT[baseName(f.name)] = parseSRT(f.text))); run(); toast(Object.keys(refSRT).length + ' referans altyazı yüklü'); };
  $('[data-ses]', b).onchange = async (e) => { const pc = $('[data-pc]', b).value || 'Bilgisayar'; latSessions.push(...(await readFiles(e.target)).map(sessionFromFile).filter(Boolean).map((s) => ({ ...s, pc }))); run(); };
  run();
}

// ---------- Eşik seçimi (yalnız geliştirme kayıtları) ----------
let devSessions = [];
function esikTab(b) {
  b.innerHTML = `<div class="card">
    <p>Eşikler <b>yalnızca geliştirme grubundaki</b> kayıtlarla seçilir ve bağımsız testte değiştirilmez. Oturum kayıtlarındaki pencere puanları, geçerli ardışık doğrulama ve birleştirme kurallarıyla yeniden oynatılır; her kategori için F1'i en yüksek eşik seçilir (eşitlikte yüksek eşik: daha az yanlış bildirim).</p>
    <div class="row"><label class="btn">⬆ Geliştirme oturumları (JSON)<input type="file" accept=".json" multiple data-ses hidden></label><span class="small muted">Referans olaylar “Ses olayları” sekmesinden alınır (${refEvents.length} olay yüklü).</span></div>
    <div data-out></div></div>`;
  const run = () => {
    if (!devSessions.length || !refEvents.length) return;
    const base = loadRules(); const grid = []; for (let t = 0.05; t <= 0.9001; t += 0.05) grid.push(+t.toFixed(2));
    const best = {}; const table = [];
    for (const c of CATEGORIES) {
      let bt = base.thresholds[c.id], bf = -1; const row = [];
      const nref = refEvents.filter((e) => e.cat === c.id && devSessions.some((s) => s.video === e.video)).length;
      if (!nref) { best[c.id] = { thr: bt, f1: NaN, none: true }; continue; } // geliştirme verisi yoksa eşik korunur
      for (const thr of grid) {
        const rules = { ...base, thresholds: { ...base.thresholds, [c.id]: thr } };
        const preds = {}, refs = {}, dur = {};
        for (const s of devSessions) { preds[s.video] = replay(s.scores, rules).filter((e) => e.cat === c.id); dur[s.video] = s.duration; }
        refEvents.filter((e) => e.cat === c.id && devSessions.some((s) => s.video === e.video)).forEach((e) => (refs[e.video] ||= []).push(e));
        const sc = scoreEvents(refs, preds, dur, 1).cats.find((x) => x.id === c.id);
        row.push(sc.F1); if (sc.F1 >= bf) { bf = sc.F1; bt = thr; }
      }
      best[c.id] = { thr: bt, f1: bf, n: nref }; table.push([c, row]);
    }
    $('[data-out]', b).innerHTML = `<table class="tbl small"><thead><tr><th>Kategori</th><th>Seçilen eşik</th><th>Geliştirme F1</th></tr></thead><tbody>
      ${CATEGORIES.map((c) => `<tr><td>${c.icon} ${esc(c.label)}</td><td><b>${best[c.id].thr}</b></td><td>${best[c.id].none ? '<span class="warn">geliştirme verisinde örnek yok; eşik korundu</span>' : fmt(best[c.id].f1, 2) + ` (n = ${best[c.id].n})`}</td></tr>`).join('')}</tbody></table>
      <button class="btn primary" data-apply>Bu eşikleri kurallara yaz</button>`;
    $('[data-apply]', b).onclick = () => { const r = loadRules(); CATEGORIES.forEach((c) => (r.thresholds[c.id] = best[c.id].thr)); r.selected = { t: new Date().toISOString(), oturum: devSessions.map((s) => s.name) }; saveRules(r); toast('Eşikler kaydedildi. “Uygulama → Kurallar → Kuralları indir” ile dosyaya alın.'); };
  };
  $('[data-ses]', b).onchange = async (e) => { devSessions = (await readFiles(e.target)).map(sessionFromFile).filter(Boolean); run(); };
  run();
}
/** Kayıtlı pencere puanlarını kurallarla yeniden oynatır. */
export function replay(scores, rules) {
  const d = new EventDetector({ rules });
  for (const s of scores) { const { t, ...sc } = s; d.update(t, sc, t + 0.975); }
  return d.events;
}
