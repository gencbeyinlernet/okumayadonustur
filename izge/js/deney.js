// İZGE deney yöneticisi: protokol, yarık ölçümleri, kayıtlar, Tablo 6–10, ANOVA, Welch, Şekil 4–6.
import { S, save, log, lockPlan, lockStage2, lockStage3, allPlanned, recordFor, stage1Conditions, BASELINE, replace } from './store.js';
import { anova2, welch, ci95, mean, sd, tinv } from './stats.js';
import { LINES } from './spectro.js';
import { $, $$, esc, toast, download, toCSV, fmt, confirmBox } from './ui.js';

const TABS = [['protokol', 'Protokol'], ['yarik', 'Yarık ölçümleri'], ['kayit', 'Kayıtlar'], ['asama1', 'Aşama 1'], ['asama2', 'Aşama 2'], ['son', 'Son karşılaştırma'], ['disa', 'Dışa aktar']];

export function renderDeney(root, tab = 'protokol') {
  if (!TABS.some(([t]) => t === tab)) tab = 'protokol';
  root.innerHTML = `<section class="doc wide"><h2>Deney yöneticisi</h2><nav class="tabs">${TABS.map(([t, n]) => `<a class="tab ${t === tab ? 'on' : ''}" href="#/deney/${t}">${n}</a>`).join('')}</nav><div data-b></div></section>`;
  ({ protokol, yarik, kayit, asama1, asama2, son, disa })[tab]($('[data-b]', root));
}

const valid = (stage) => S().records.filter((r) => r.stage === stage && r.valid && !r.simulated);
const fmtCell = (a) => (a.length ? `${fmt(mean(a), 3)} (${fmt(sd(a), 3)})` : '–');
const pf = (p) => (p == null || !isFinite(p) ? '–' : p < 0.001 ? '< ,001' : fmt(p, 3).replace(/^0/, ''));

// ---------- Protokol ----------
function protokol(b) {
  const st = S(); const P = st.plan;
  b.innerHTML = `<div class="box">
    <p>Ana deney iki aşamalıdır. Aşama 1'de α = 20° ve G = 25 mm sabitken üç yarık açıklığı × üç L değeri; Aşama 2'de seçilen yarık ve L sabitken üç kamera açısı × üç G değeri karşılaştırılır. Her koşul beş bağımsız kurulumla ölçülür; her blokta dokuz koşul rastgele sıradadır. Son karşılaştırmada başlangıç düzeni (${BASELINE.slit} mm, L ${BASELINE.L}, α ${BASELINE.alpha}°, G ${BASELINE.G} mm) ile seçilen düzen, seçimde kullanılmayan 10'ar yeni kurulumla ölçülür.</p>
    ${P ? `<p>🔒 Protokol <b>${new Date(P.t).toLocaleString('tr-TR')}</b> tarihinde sabitlendi · tohum ${P.seed}<br><small class="mono">SHA-256: ${P.hash}</small></p>`
      : `<div class="row"><label class="field small">Rastgele sıra tohumu<input type="number" data-seed value="${Math.floor(Math.random() * 1e6)}"></label><button class="btn primary" data-lock>🔒 Protokolü sabitle</button></div><p class="muted small">Pilot ölçümler ana veri kümesine eklenmez. Protokol sabitlendikten sonra sıra değiştirilmez.</p>`}
  </div>
  ${P ? schedule('Aşama 1', P.stage1) + (P.stage2 ? schedule('Aşama 2', P.stage2) : '') + (P.stage3 ? schedule('Son karşılaştırma', P.stage3) : '') : ''}`;
  const lk = $('[data-lock]', b); if (lk) lk.onclick = async () => { await lockPlan(+$('[data-seed]', b).value); protokol(b); };
}
function schedule(title, list) {
  const done = (id) => recordFor(id).filter((r) => !r.simulated);
  return `<div class="box"><h4>${title}: ${list.filter((x) => done(x.id).length).length} / ${list.length} kurulum</h4>
    <div class="table-wrap"><table class="tbl small"><thead><tr><th>Blok</th><th>Sıra</th><th>Kurulum</th><th>Yarık</th><th>L</th><th>α</th><th>G</th><th>Durum</th></tr></thead><tbody>
    ${list.map((x) => { const r = done(x.id); return `<tr><td>${x.block}</td><td>${x.order}</td><td>${esc(x.id)}</td><td>${x.slit}</td><td>${x.L}</td><td>${x.alpha}°</td><td>${x.G}</td><td>${r.length ? (r.some((q) => q.valid) ? '✅ geçerli' : '⚠️ geçersiz') : '—'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

// ---------- Tablo 6: Yarık ölçümleri ----------
function yarik(b) {
  const st = S(); if (!st.slits.length) st.slits = [0.05, 0.1, 0.2].map((n) => ({ nominal: n }));
  b.innerHTML = `<div class="box"><h4>Tablo 6. Yarık kasetlerinin ölçülen açıklıkları</h4>
    <p class="muted small">Ölçeği doğrulanmış mikroskop görüntüsünde üç farklı yükseklikte ölçülen açıklıklar (mm). Doğrulanamayan kaset ana deneye alınmaz.</p>
    <table class="tbl"><thead><tr><th>Nominal (mm)</th><th>Üst</th><th>Orta</th><th>Alt</th><th>Ortalama</th><th>Aralık</th><th>Not</th></tr></thead><tbody>
    ${st.slits.map((s, i) => { const v = [s.h1, s.h2, s.h3].map(Number).filter((x) => isFinite(x) && x > 0); return `<tr><td>${s.nominal}</td>${['h1', 'h2', 'h3'].map((k) => `<td><input type="number" step="0.001" data-s="${i}" data-k="${k}" value="${s[k] ?? ''}" style="width:90px"></td>`).join('')}
      <td><b>${v.length ? fmt(mean(v), 3) : '–'}</b></td><td>${v.length > 1 ? fmt(Math.min(...v), 3) + '–' + fmt(Math.max(...v), 3) : '–'}</td><td><input data-s="${i}" data-k="note" value="${esc(s.note || '')}"></td></tr>`; }).join('')}</tbody></table></div>`;
  $$('[data-s]', b).forEach((i) => (i.onchange = () => { st.slits[+i.dataset.s][i.dataset.k] = i.type === 'number' ? (i.value === '' ? null : +i.value) : i.value; save(); yarik(b); }));
}

// ---------- Kayıtlar ve Tablo 7 ----------
function kayit(b) {
  const st = S(); const R = st.records; const main = R.filter((r) => !r.pilot && !r.simulated), ok = main.filter((r) => r.valid);
  const reasons = {}; main.filter((r) => !r.valid).forEach((r) => r.reasons.forEach((x) => (reasons[x] = (reasons[x] || 0) + 1)));
  const rms = ok.map((r) => r.calRms), ve = ok.map((r) => Math.abs(r.valErr)).filter(isFinite);
  b.innerHTML = `<div class="box"><h4>Tablo 7. Kalibrasyon, doğrulama ve geçersiz kurulumlar</h4>
    <table class="tbl"><tbody>
      <tr><td>Kaydedilen / geçerli kurulum (pilot ve simülasyon hariç)</td><td><b>${main.length} / ${ok.length}</b></td></tr>
      <tr><td>Kalibrasyon uyum hatası RMS: ortalama / en büyük (nm)</td><td>${rms.length ? fmt(mean(rms), 3) + ' / ' + fmt(Math.max(...rms), 3) : '–'}</td></tr>
      <tr><td>650,6528 nm doğrulama hatası: ortalama mutlak (nm)</td><td>${ve.length ? fmt(mean(ve), 3) : '–'}</td></tr>
      <tr><td>Doğrulama yapılabilen geçerli kurulum</td><td>${ve.length}</td></tr>
      <tr><td>Geçersiz kurulumlar ve nedenleri</td><td>${Object.keys(reasons).length ? esc(Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(', ')) : '–'}</td></tr></tbody></table>
    <p class="muted small">Dışlanan kayıtlar silinmez; nedeni kaydedilir. Simülasyon kayıtları hiçbir analize girmez.</p></div>
    <div class="box"><h4>Bütün kayıtlar (${R.length})</h4><div class="table-wrap"><table class="tbl small"><thead><tr><th>Kurulum</th><th>Tarih</th><th>Yarık (ölç.)</th><th>L</th><th>α</th><th>G</th><th>RMS</th><th>Doğrul.</th><th>FWHM (nm)</th><th>px</th><th>R</th><th>Durum</th></tr></thead><tbody>
    ${R.slice().reverse().map((r) => `<tr><td>${esc(r.id)}${r.simulated ? ' <span class="pill">sim</span>' : r.pilot ? ' <span class="pill">pilot</span>' : ''}</td><td>${new Date(r.t).toLocaleString('tr-TR')}</td><td>${r.slitMeasured ?? '–'}</td><td>${r.L}</td><td>${r.alpha}</td><td>${r.G}</td><td>${fmt(r.calRms, 3)}</td><td>${fmt(r.valErr, 2)}</td><td>${r.sampled ? '≤ ' : ''}${fmt(r.fwhmNm, 3)}</td><td>${fmt(r.fwhmPx, 2)}</td><td>${fmt(r.R, 0)}</td><td>${r.valid ? '✅' : '⚠️ ' + esc(r.reasons.join(', '))}</td></tr>`).join('')}</tbody></table></div></div>`;
}

// ---------- Aşama 1 / 2 ----------
function stageAnalysis(b, stage) {
  const st = S(); const P = st.plan;
  const f1 = stage === 1 ? { key: 'slitNominal', levels: [0.05, 0.1, 0.2], name: 'Nominal yarık', unit: 'mm' } : { key: 'alpha', levels: [15, 20, 25], name: 'Kamera açısı', unit: '°' };
  const f2 = stage === 1 ? { key: 'L', levels: [100, 140, 180], name: 'L', unit: 'mm' } : { key: 'G', levels: [15, 25, 35], name: 'G', unit: 'mm' };
  const recs = valid(stage);
  const cell = (a, c) => recs.filter((r) => +r[f1.key] === a && +r[f2.key] === c).map((r) => r.fwhmNm);
  const cells = f1.levels.map((a) => f2.levels.map((c) => cell(a, c)));
  const nmin = Math.min(...cells.flat().map((x) => x.length)), balanced = nmin >= 2 && cells.flat().every((x) => x.length === nmin);
  const A = balanced ? anova2(cells) : null;
  // seçim kuralı: geçerli koşullar içinde ortalaması en küçük; fark ölçüm belirsizliğinden küçükse daha kararlı (küçük SS) ve kolay kurulan düzen
  const list = f1.levels.flatMap((a, i) => f2.levels.map((c, j) => ({ a, c, v: cells[i][j], m: mean(cells[i][j]), s: sd(cells[i][j]), ci: ci95(cells[i][j]) }))).filter((x) => x.v.length);
  const best = list.reduce((p, q) => (q.m < p.m ? q : p), list[0] || null);
  const near = best ? list.filter((x) => x !== best && x.ci[0] <= best.ci[1]) : [];
  const sel = stage === 1 ? st.selected.stage1 : st.selected.stage2;
  b.innerHTML = `<div class="box"><h4>Tablo ${stage === 1 ? 8 : 9}. Aşama ${stage}: ortalama FWHM (nm) ve standart sapma</h4>
    <table class="tbl"><thead><tr><th>${f1.name}</th>${f2.levels.map((c) => `<th>${f2.name} = ${c} ${f2.unit}</th>`).join('')}</tr></thead><tbody>
    ${f1.levels.map((a, i) => `<tr><td>${a} ${f1.unit}</td>${f2.levels.map((c, j) => `<td>${fmtCell(cells[i][j])} <small>n = ${cells[i][j].length}</small></td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="small muted">${stage === 1 ? 'α = 20°, G = 25 mm.' : `Aşama 1'de seçilen yarık ve L${st.selected.stage1 ? ` (${st.selected.stage1.slit} mm, L ${st.selected.stage1.L} mm)` : ''}.`} Yalnız geçerli, simülasyon olmayan kurulumlar; her kurulumun 20 karesinin ortalama FWHM'si bir gözlemdir.</p>
    ${A ? `<h4>İki faktörlü varyans analizi</h4><table class="tbl small"><thead><tr><th>Kaynak</th><th>KT</th><th>sd</th><th>KO</th><th>F</th><th>p</th></tr></thead><tbody>
      <tr><td>${f1.name}</td><td>${fmt(A.A.SS, 4)}</td><td>${A.A.df}</td><td>${fmt(A.A.MS, 4)}</td><td>F(${A.A.df}; ${A.E.df}) = <b>${fmt(A.A.F, 2)}</b></td><td>${pf(A.A.p)}</td></tr>
      <tr><td>${f2.name}</td><td>${fmt(A.B.SS, 4)}</td><td>${A.B.df}</td><td>${fmt(A.B.MS, 4)}</td><td>F(${A.B.df}; ${A.E.df}) = <b>${fmt(A.B.F, 2)}</b></td><td>${pf(A.B.p)}</td></tr>
      <tr><td>Etkileşim</td><td>${fmt(A.AB.SS, 4)}</td><td>${A.AB.df}</td><td>${fmt(A.AB.MS, 4)}</td><td>F(${A.AB.df}; ${A.E.df}) = <b>${fmt(A.AB.F, 2)}</b></td><td>${pf(A.AB.p)}</td></tr>
      <tr><td>Hata</td><td>${fmt(A.E.SS, 4)}</td><td>${A.E.df}</td><td>${fmt(A.E.MS, 4)}</td><td></td><td></td></tr></tbody></table>
      <p class="muted small">Küçük tekrar sayısı nedeniyle yalnızca p değerine değil, farkların büyüklüğüne ve %95 güven aralıklarına bakın.</p>` : `<p class="warn small">Varyans analizi için her hücrede eşit sayıda (≥ 2) geçerli kurulum gerekir (şu an en az ${isFinite(nmin) ? nmin : 0}).</p>`}
    </div>
    <div class="box"><h4>Şekil ${stage === 1 ? 4 : 5}. ${stage === 1 ? 'Ölçülen yarık açıklığına göre FWHM' : 'Kamera açısı ve ızgara–kamera uzaklığına göre FWHM'}</h4>${stage === 1 ? plot1(recs) : plot2(recs)}
      <button class="btn tiny" data-svg>⬇ Şekil (SVG)</button></div>
    <div class="box"><h4>Seçim</h4>
      ${best ? `<p>En küçük ortalama FWHM: <b>${f1.name} ${best.a} ${f1.unit}, ${f2.name} ${best.c} ${f2.unit}</b> → ${fmt(best.m, 3)} nm (%95 GA ${fmt(best.ci[0], 3)}–${fmt(best.ci[1], 3)}).</p>
        ${near.length ? `<p class="small">Güven aralığı örtüşen adaylar (fark belirsizlikten küçük olabilir): ${near.map((x) => `${x.a}/${x.c} (${fmt(x.m, 3)} ± SS ${fmt(x.s, 3)})`).join(', ')}. Seçim kuralına göre bu durumda daha kararlı ve kolay kurulan düzen tercih edilebilir.</p>` : ''}
        <div class="row"><label class="field small">${f1.name}<select data-s1>${f1.levels.map((v) => `<option ${v === best.a ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="field small">${f2.name}<select data-s2>${f2.levels.map((v) => `<option ${v === best.c ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <button class="btn primary" data-pick ${!P || (stage === 1 ? P.stage2 : P.stage3) ? 'disabled' : ''}>Seçimi sabitle ve ${stage === 1 ? 'Aşama 2' : 'son karşılaştırma'} sırasını oluştur</button></div>` : '<p class="muted">Henüz geçerli kayıt yok.</p>'}
      ${sel ? `<p class="ok small">🔒 Sabitlenen seçim: ${esc(JSON.stringify(sel))}</p>` : ''}</div>`;
  const sv = $('[data-svg]', b); if (sv) sv.onclick = () => download(`IZGE_Sekil${stage === 1 ? 4 : 5}.svg`, $('svg.fig', b).outerHTML, 'image/svg+xml');
  const pk = $('[data-pick]', b);
  if (pk) pk.onclick = async () => {
    const a = +$('[data-s1]', b).value, c = +$('[data-s2]', b).value;
    if (!(await confirmBox(`${f1.name} ${a}, ${f2.name} ${c} seçimi sabitlensin mi? Sonraki aşamanın sırası oluşturulur.`, 'Sabitle'))) return;
    if (stage === 1) await lockStage2({ slit: a, L: c }); else await lockStage3({ ...st.selected.stage1, alpha: a, G: c });
    save(); stageAnalysis(b, stage);
  };
}
function asama1(b) { stageAnalysis(b, 1); }
function asama2(b) { stageAnalysis(b, 2); }

// ---------- Grafikler ----------
function svgPlot(groups, { xlab, ylab, xdom, ydom }) {
  const W = 620, H = 380, l = 60, r = 140, t = 16, bm = 50;
  const X = (v) => l + ((v - xdom[0]) / (xdom[1] - xdom[0])) * (W - l - r), Y = (v) => t + (1 - (v - ydom[0]) / (ydom[1] - ydom[0])) * (H - t - bm);
  const cols = ['#6d28d9', '#ea580c', '#0f766e'];
  const yt = []; for (let k = 0; k <= 5; k++) yt.push(ydom[0] + ((ydom[1] - ydom[0]) * k) / 5);
  let s = `<svg class="fig" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:720px" font-family="Inter, sans-serif">`;
  yt.forEach((v) => (s += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e7eb"/><text x="${l - 8}" y="${Y(v) + 4}" font-size="12" text-anchor="end">${v.toFixed(2)}</text>`));
  groups.forEach((g, gi) => {
    const c = cols[gi % 3]; const pts = g.pts.filter((p) => isFinite(p.m)).sort((a, b) => a.x - b.x);
    s += `<polyline fill="none" stroke="${c}" stroke-width="2" points="${pts.map((p) => `${X(p.x)},${Y(p.m)}`).join(' ')}"/>`;
    pts.forEach((p) => { if (isFinite(p.lo)) s += `<line x1="${X(p.x)}" x2="${X(p.x)}" y1="${Y(p.lo)}" y2="${Y(p.hi)}" stroke="${c}" stroke-width="1.5"/><line x1="${X(p.x) - 5}" x2="${X(p.x) + 5}" y1="${Y(p.lo)}" y2="${Y(p.lo)}" stroke="${c}"/><line x1="${X(p.x) - 5}" x2="${X(p.x) + 5}" y1="${Y(p.hi)}" y2="${Y(p.hi)}" stroke="${c}"/>`; s += `<circle cx="${X(p.x)}" cy="${Y(p.m)}" r="4.5" fill="${c}"/>`; });
    s += `<line x1="${W - r + 14}" x2="${W - r + 40}" y1="${t + 20 + gi * 24}" y2="${t + 20 + gi * 24}" stroke="${c}" stroke-width="3"/><text x="${W - r + 46}" y="${t + 24 + gi * 24}" font-size="13">${esc(g.label)}</text>`;
  });
  const xt = []; for (let k = 0; k <= 4; k++) xt.push(xdom[0] + ((xdom[1] - xdom[0]) * k) / 4);
  xt.forEach((v) => (s += `<text x="${X(v)}" y="${H - bm + 18}" font-size="12" text-anchor="middle">${v.toFixed(v < 1 ? 2 : 0)}</text>`));
  s += `<text x="${(l + W - r) / 2}" y="${H - 10}" font-size="13" text-anchor="middle">${esc(xlab)}</text><text x="16" y="${(t + H - bm) / 2}" font-size="13" text-anchor="middle" transform="rotate(-90 16 ${(t + H - bm) / 2})">${esc(ylab)}</text>`;
  s += `<text x="${W - r + 14}" y="${t + 104}" font-size="11" fill="#555">Hata çubukları: %95 GA</text></svg>`;
  return s;
}
// iki aşamada aynı dikey ölçek
function yDomain() { const all = S().records.filter((r) => r.valid && !r.simulated && (r.stage === 1 || r.stage === 2)).map((r) => r.fwhmNm); if (!all.length) return [0, 1]; return [0, Math.ceil(Math.max(...all) * 1.15 * 10) / 10]; }
function plot1(recs) {
  const groups = [100, 140, 180].map((L) => ({ label: `L = ${L} mm`, pts: [0.05, 0.1, 0.2].map((n) => { const R = recs.filter((r) => r.L === L && r.slitNominal === n); const v = R.map((r) => r.fwhmNm), xs = R.map((r) => r.slitMeasured).filter((x) => x != null); const ci = ci95(v); return { x: xs.length ? mean(xs) : n, m: mean(v), lo: ci[0], hi: ci[1] }; }) }));
  return svgPlot(groups, { xlab: 'Ölçülen yarık açıklığı (mm)', ylab: 'FWHM (nm)', xdom: [0, 0.25], ydom: yDomain() });
}
function plot2(recs) {
  const groups = [15, 20, 25].map((a) => ({ label: `α = ${a}°`, pts: [15, 25, 35].map((G) => { const v = recs.filter((r) => r.alpha === a && r.G === G).map((r) => r.fwhmNm); const ci = ci95(v); return { x: G, m: mean(v), lo: ci[0], hi: ci[1] }; }) }));
  return svgPlot(groups, { xlab: 'Izgara–objektif uzaklığı G (mm)', ylab: 'FWHM (nm)', xdom: [10, 40], ydom: yDomain() });
}

// ---------- Tablo 10 ve Şekil 6 ----------
function son(b) {
  const recs = valid(3); const base = recs.filter((r) => r.code === 'A3-BASLANGIC'), sel = recs.filter((r) => r.code === 'A3-SECILEN');
  const v0 = base.map((r) => r.fwhmNm), v1 = sel.map((r) => r.fwhmNm);
  const w = v0.length > 1 && v1.length > 1 ? welch(v0, v1) : null;
  const imp = v0.length && v1.length ? (100 * (mean(v0) - mean(v1))) / mean(v0) : NaN;
  const ci = (v) => { const c = ci95(v); return v.length > 1 ? `${fmt(c[0], 3)}–${fmt(c[1], 3)}` : '–'; };
  b.innerHTML = `<div class="box"><h4>Tablo 10. Yeni kurulumlarla son karşılaştırma</h4>
    <table class="tbl"><thead><tr><th>Ölçüt</th><th>Başlangıç düzeni</th><th>Seçilen düzen</th></tr></thead><tbody>
      <tr><td>Geçerli kurulum (n)</td><td>${v0.length}</td><td>${v1.length}</td></tr>
      <tr><td>FWHM ortalaması (SS) (nm)</td><td>${fmtCell(v0)}</td><td>${fmtCell(v1)}</td></tr>
      <tr><td>%95 güven aralığı (nm)</td><td>${ci(v0)}</td><td>${ci(v1)}</td></tr>
      <tr><td>Etkin çözme gücü R</td><td>${v0.length ? fmt(LINES.main / mean(v0), 0) : '–'}</td><td>${v1.length ? fmt(LINES.main / mean(v1), 0) : '–'}</td></tr>
      <tr><td>Ortalama doğrulama hatası (nm)</td><td>${base.length ? fmt(mean(base.map((r) => Math.abs(r.valErr))), 3) : '–'}</td><td>${sel.length ? fmt(mean(sel.map((r) => Math.abs(r.valErr))), 3) : '–'}</td></tr></tbody></table>
    <p class="small">Başlangıç düzeni: ${BASELINE.slit} mm yarık, L ${BASELINE.L} mm, α ${BASELINE.alpha}°, G ${BASELINE.G} mm.</p>
    ${w ? `<p>Seçilen düzenin FWHM değeri başlangıç düzenine göre <b>${fmt(w.diff, 3)} nm</b> (%95 GA: ${fmt(w.lo, 3)}; ${fmt(w.hi, 3)}) farklıdır (Welch t(${fmt(w.df, 1)}) = ${fmt(w.t, 2)}, p = ${pf(w.p)}); iyileşme <b>%${fmt(imp, 1)}</b>.</p>` : '<p class="muted">Welch testi için her düzende en az iki geçerli kurulum gerekir.</p>'}</div>
    <div class="box"><h4>Şekil 6. 546,0735 nm çizgisinin normalize profilleri</h4>${profilePlot(base, sel)}
      <p class="muted small">Arka planı çıkarılmış, tepe yüksekliği 1'e normalize edilmiş ortalama profiller; kesikli çizgi yarı yükseklik. Normalizasyon bir ışık gücü karşılaştırması değildir.</p><button class="btn tiny" data-svg>⬇ Şekil 6 (SVG)</button></div>`;
  const sv = $('[data-svg]', b); if (sv) sv.onclick = () => download('IZGE_Sekil6.svg', $('svg.fig', b).outerHTML, 'image/svg+xml');
}
function avgProfile(recs) {
  if (!recs.length) return null; const grid = []; for (let x = -15; x <= 15.0001; x += 0.1) grid.push(+x.toFixed(2));
  const ys = grid.map((d) => mean(recs.map((r) => interp(r.profile.lam.map((l) => l - LINES.main), r.profile.y, d)).filter(isFinite)));
  return { grid, ys };
}
function interp(xs, ys, x) { if (!xs.length) return NaN; const asc = xs[0] < xs[xs.length - 1]; const X = asc ? xs : [...xs].reverse(), Y = asc ? ys : [...ys].reverse(); if (x < X[0] || x > X[X.length - 1]) return NaN; let i = 1; while (X[i] < x) i++; const t = (x - X[i - 1]) / (X[i] - X[i - 1]); return Y[i - 1] + t * (Y[i] - Y[i - 1]); }
function profilePlot(base, sel) {
  const W = 620, H = 340, l = 50, r = 150, t = 16, bm = 46; const A = avgProfile(base), B = avgProfile(sel);
  const X = (d) => l + ((d + 15) / 30) * (W - l - r), Y = (v) => t + (1 - (v + 0.05) / 1.15) * (H - t - bm);
  let s = `<svg class="fig" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:720px" font-family="Inter, sans-serif">`;
  [0, 0.5, 1].forEach((v) => (s += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0.5 ? '#94a3b8' : '#e5e7eb'}" ${v === 0.5 ? 'stroke-dasharray="5 4"' : ''}/><text x="${l - 8}" y="${Y(v) + 4}" font-size="12" text-anchor="end">${v}</text>`));
  [-15, -10, -5, 0, 5, 10, 15].forEach((d) => (s += `<text x="${X(d)}" y="${H - bm + 18}" font-size="12" text-anchor="middle">${(LINES.main + d).toFixed(0)}</text>`));
  [[A, '#94a3b8', 'Başlangıç düzeni'], [B, '#6d28d9', 'Seçilen düzen']].forEach(([P, c, lab], k) => {
    if (P) s += `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${P.grid.map((d, i) => (isFinite(P.ys[i]) ? `${X(d)},${Y(P.ys[i])}` : '')).filter(Boolean).join(' ')}"/>`;
    s += `<line x1="${W - r + 14}" x2="${W - r + 40}" y1="${t + 20 + k * 24}" y2="${t + 20 + k * 24}" stroke="${c}" stroke-width="3"/><text x="${W - r + 46}" y="${t + 24 + k * 24}" font-size="13">${lab}</text>`;
  });
  s += `<text x="${(l + W - r) / 2}" y="${H - 8}" font-size="13" text-anchor="middle">Dalga boyu (nm)</text><text x="14" y="${(t + H - bm) / 2}" font-size="13" text-anchor="middle" transform="rotate(-90 14 ${(t + H - bm) / 2})">Normalize şiddet</text>`;
  if (!A && !B) s += `<text x="${(l + W - r) / 2}" y="${H / 2}" text-anchor="middle" font-size="14" fill="#888">veri yok</text>`;
  return s + '</svg>';
}

// ---------- Dışa aktar ----------
function disa(b) {
  const st = S();
  b.innerHTML = `<div class="box"><h4>Ölçüm tablosu ve kayıtlar</h4>
    <button class="btn primary" data-csv>⬇ Bütün kurulumların ölçüm tablosu (CSV, Ek 1 alanları)</button>
    <button class="btn" data-json>⬇ Proje yedeği (JSON)</button>
    <label class="btn">⬆ Yedekten yükle<input type="file" accept=".json" data-imp hidden></label>
    <p class="muted small">İşlem günlüğünde ${st.log.length} kayıt var. Dışlanan dosyalar silinmez.</p></div>`;
  $('[data-csv]', b).onclick = () => {
    const keys = ['id', 'planId', 'pilot', 'simulated', 'stage', 'code', 'block', 't', 'operator', 'cad', 'software', 'slitNominal', 'slitMeasured', 'L', 'G', 'alpha', 'lens', 'source', 'imageSource', 'channel', 'darkN', 'darkLevel', 'calDeg', 'calRms', 'calMaxRes', 'valErr', 'nFrames', 'nFramesOk', 'fwhmNm', 'fwhmSd', 'fwhmPx', 'R', 'snr', 'sampled', 'satMax', 'valid'];
    download('IZGE_olcum_tablosu.csv', toCSV([[...keys, 'katsayilar', 'kamera', 'nedenler'], ...st.records.map((r) => [...keys.map((k) => (typeof r[k] === 'number' ? +r[k].toFixed(6) : r[k] ?? '')), (r.coef || []).map((c) => c.toExponential(8)).join(' '), JSON.stringify(r.camera?.settings || {}), (r.reasons || []).join(', ')])]), 'text/csv;charset=utf-8');
  };
  $('[data-json]', b).onclick = () => download(`IZGE_proje_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(st, null, 1), 'application/json');
  $('[data-imp]', b).onchange = async (e) => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.version !== 1) throw 0; if (await confirmBox('Mevcut verinin yerine yedek yüklensin mi?', 'Yükle')) { replace(d); toast('Yüklendi'); } } catch { toast('Yedek okunamadı'); } };
}
