// İZGE ölçüm ekranı: kaynak → ilgi bölgesi → karanlık kareler → kalibrasyon → ana ölçüm (FWHM) → kayıt.
import { Source } from './camera.js';
import { LINES, profile, findPeaks, calibrate, fwhm, evalPoly, suggestHgAuto, suggestNe, autoBg, mean, sd } from './spectro.js';
import { drawProfile } from './chart.js';
import { S, save, log, allPlanned, recordFor } from './store.js';
import { $, $$, esc, toast, download, fmt } from './ui.js';

let src = null, raf = null, M = null;
/** Kalibre eksen yalnız kalibrasyon çizgilerinin kapsadığı bölgede (±%20) gösterilir; dışarısı polinomla uydurulmaz. */
const calRange = (n) => { const xs = Object.values(M.pairs).filter((x) => x != null); if (xs.length < 2) return {}; const a = Math.min(...xs), b = Math.max(...xs), m = 0.2 * (b - a); return { x0: Math.max(0, a - m), x1: Math.min(n - 1, b + m) }; };
const CAL = [...LINES.cal.map((l) => ({ ...l, key: String(l.nm) })), { ...LINES.val, key: 'val' }];

export function stopOlcum() { cancelAnimationFrame(raf); raf = null; if (src) src.stop(); src = null; }

export function renderOlcum(root) {
  stopOlcum();
  src = new Source();
  const st = S(); const set = st.settings;
  M = { roi: null, dark: null, hg: null, ne: null, pairs: {}, cal: null, main: null };
  const open = allPlanned().filter((p) => !recordFor(p.id).length);
  root.innerHTML = `
  <section class="olcum">
    <aside class="side"><div class="panel">
      <h2>Ölçüm</h2>
      <div class="box"><h4>1. Görüntü kaynağı</h4>
        <div class="row"><button class="btn tiny" data-src="kamera">📷 Web kamerası</button><label class="btn tiny">🖼️ Görüntü dosyası<input type="file" accept="image/*" data-img hidden></label><button class="btn tiny" data-src="sim">🧪 Simülasyon</button></div>
        <div data-camctl hidden><label class="field small">Kamera<select data-dev></select></label>
          <button class="btn tiny" data-lock>Otomatik odak / pozlama / beyaz dengeyi kapat</button>
          <label class="field small">Pozlama süresi (destekleniyorsa)<input type="number" data-exp step="1"></label><p class="small muted" data-camstat></p></div>
        <div data-simctl hidden class="s-sim"><p class="warn small">Simülasyon yalnızca yazılımı denemek içindir; sonuçları gerçek ölçüm değildir.</p>
          <label class="field small">Lamba<select data-sim="lamp"><option value="hg">Cıva</option><option value="ne">Neon</option><option value="hgne">Cıva + neon</option></select></label>
          <label class="check small"><input type="checkbox" data-simcover> Ölçüm kanalı kapalı (karanlık)</label>
          <div class="grid3"><label class="field small">Yarık (mm)<input type="number" step="0.01" data-sim="slit" value="0.2"></label><label class="field small">L (mm)<input type="number" data-sim="L" value="140"></label><label class="field small">α (°)<input type="number" data-sim="alpha" value="20"></label><label class="field small">G (mm)<input type="number" data-sim="G" value="25"></label><label class="field small">Pozlama ×<input type="number" step="0.1" data-sim="exposure" value="1"></label></div></div>
      </div>
      <div class="box"><h4>2. Kurulum bilgisi</h4>
        <label class="field small">Planlanan kurulum<select data-plan><option value="">Plan dışı (pilot) — ana veriye eklenmez</option>${open.map((p) => `<option value="${p.id}">${p.id} · yarık ${p.slit} mm · L ${p.L} · α ${p.alpha}° · G ${p.G}</option>`).join('')}</select></label>
        <div class="grid3"><label class="field small">Nominal yarık (mm)<input type="number" step="0.01" data-m="slitNominal" value="0.2"></label>
          <label class="field small">Ölçülen yarık (mm)<input type="number" step="0.001" data-m="slitMeasured"></label>
          <label class="field small">L (mm)<input type="number" data-m="L" value="140"></label><label class="field small">α (°)<input type="number" data-m="alpha" value="20"></label><label class="field small">G (mm)<input type="number" data-m="G" value="25"></label>
          <label class="field small">Uygulayıcı<input data-m="operator" value="${esc(set.operator)}"></label></div>
        <div class="grid3"><label class="field small">Kaynak kimliği<input data-m="source" value="${esc(set.source)}"></label><label class="field small">CAD / parça sürümü<input data-m="cad" value="${esc(set.cad)}"></label><label class="field small">Mercek odak konumu<input data-m="lens" value="${esc(set.lens)}"></label></div></div>
      <div class="box"><h4>3. Ölçüm adımları</h4>
        <ol class="steps-list">
          <li><button class="btn tiny" data-roi>İlgi bölgesini otomatik bul</button> <span class="small muted">veya görüntüde sürükleyin</span> <span data-roiinfo class="small"></span></li>
          <li><button class="btn tiny" data-dark>Karanlık kareler (${set.darkN})</button> <span data-darkinfo class="small"></span></li>
          <li><button class="btn tiny" data-hg>Cıva kalibrasyon karesi</button> <button class="btn tiny" data-ne>Neon kalibrasyon karesi</button></li>
          <li><button class="btn tiny primary" data-cal>Kalibrasyonu hesapla</button> <label class="small">derece <select data-deg>${[1, 2].map((d) => `<option ${set.deg === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></li>
          <li><button class="btn tiny primary" data-main>Ana ölçüm: 546,0735 nm (${set.mainN} kare)</button></li>
          <li><button class="btn tiny primary" data-save>Kaydet</button> <button class="btn tiny" data-png>Ortalama kareyi indir (PNG)</button></li></ol>
        <div data-calout></div><div data-mainout></div></div>
    </div></aside>
    <div class="view">
      <div class="live"><canvas data-live></canvas><div class="live-note" data-livenote>Bir görüntü kaynağı seçin.</div></div>
      <canvas class="chart" data-chart></canvas>
      <canvas class="chart" data-zoom></canvas>
    </div>
  </section>`;
  const live = $('[data-live]', root), lctx = live.getContext('2d');
  // kaynaklar
  $$('[data-src]', root).forEach((b) => (b.onclick = async () => {
    try {
      if (b.dataset.src === 'kamera') {
        const info = await src.startCamera(); $('[data-camctl]', root).hidden = false; $('[data-simctl]', root).hidden = true;
        const cams = await src.listCameras(); $('[data-dev]', root).innerHTML = cams.map((c) => `<option value="${c.deviceId}">${esc(c.label || 'kamera')}</option>`).join('');
        $('[data-camstat]', root).textContent = `${info.label} · ${info.settings.width}×${info.settings.height}`;
      } else { src.startSim(); $('[data-simctl]', root).hidden = false; $('[data-camctl]', root).hidden = true; syncSim(); }
      startLive();
    } catch (e) { toast('Kaynak açılamadı: ' + e.message, 5000); }
  }));
  $('[data-img]', root).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; await src.startImage(f); $('[data-simctl]', root).hidden = true; $('[data-camctl]', root).hidden = true; startLive(); toast('Görüntü dosyası: tek kare; karanlık ve kalibrasyon için ayrı dosyalar seçin.', 4000); };
  $('[data-dev]', root).onchange = async (e) => { await src.startCamera(e.target.value); startLive(); };
  $('[data-lock]', root).onclick = async () => { const r = await src.lockAuto({ exposureTime: +$('[data-exp]', root).value || undefined }); $('[data-camstat]', root).innerHTML = `Kapatılan: ${r.applied.join(', ') || '—'}<br>Desteklenmeyen: ${esc(r.unsupported.join(', ') || '—')}`; if (r.unsupported.length) toast('Bazı ayarlar bu kamerada tarayıcıdan değiştirilemiyor; kamera yazılımından sabitleyin ve not edin.', 5000); };
  const syncSim = () => { $$('[data-sim]', root).forEach((i) => (src.sim[i.dataset.sim] = i.type === 'number' ? +i.value : i.value)); src.sim.cover = $('[data-simcover]', root).checked; };
  $$('[data-sim], [data-simcover]', root).forEach((i) => (i.onchange = syncSim));
  // plan seçimi
  $('[data-plan]', root).onchange = (e) => {
    const p = allPlanned().find((x) => x.id === e.target.value); if (!p) return;
    const set2 = (k, v) => { const i = $(`[data-m="${k}"]`, root); if (i) i.value = v; };
    set2('slitNominal', p.slit); set2('L', p.L); set2('alpha', p.alpha); set2('G', p.G);
    const sl = S().slits.find((x) => +x.nominal === +p.slit); if (sl) set2('slitMeasured', mean([sl.h1, sl.h2, sl.h3].map(Number).filter(isFinite)).toFixed(3));
    if (src && src.kind === 'sim') { ['slit', 'L', 'alpha', 'G'].forEach((k) => { const i = $(`[data-sim="${k}"]`, root); if (i) i.value = p[k]; }); syncSim(); }
  };
  // ilgi bölgesi: sürükleme
  let drag = null;
  live.onpointerdown = (e) => { const r = live.getBoundingClientRect(), k = src.width / r.width; drag = { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };
  live.onpointermove = (e) => { if (!drag) return; const r = live.getBoundingClientRect(), k = src.width / r.width; const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k; M.roi = { x: Math.round(Math.min(drag.x, x)), y: Math.round(Math.min(drag.y, y)), w: Math.max(8, Math.round(Math.abs(x - drag.x))), h: Math.max(2, Math.round(Math.abs(y - drag.y))) }; roiInfo(); };
  live.onpointerup = () => { drag = null; };
  const roiInfo = () => { $('[data-roiinfo]', root).textContent = M.roi ? `x ${M.roi.x}, y ${M.roi.y}, ${M.roi.w}×${M.roi.h}` : ''; };
  $('[data-roi]', root).onclick = () => { const f = src.grab(); if (!f) return toast('Önce kaynak seçin.'); M.roi = autoRoi(f); roiInfo(); };
  // canlı görüntü
  function startLive() {
    cancelAnimationFrame(raf); $('[data-livenote]', root).textContent = src.info().label || '';
    const tick = () => {
      const f = src.grab();
      if (f) {
        if (live.width !== f.width) { live.width = f.width; live.height = f.height; }
        lctx.putImageData(f, 0, 0);
        if (M.roi) { lctx.strokeStyle = '#facc15'; lctx.lineWidth = 3; lctx.strokeRect(M.roi.x, M.roi.y, M.roi.w, M.roi.h); }
        if (M.roi) { const pr = profile(f.data, f.width, M.roi, set.channel).y; drawProfile($('[data-chart]', root), [{ y: pr, color: '#a3e635' }], { coef: M.cal && M.cal.ok ? M.cal.coef : null, ...(M.cal && M.cal.ok ? calRange(pr.length) : {}), title: 'Canlı profil (yeşil kanal)' }); }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  const need = () => { if (!src || !src.kind) { toast('Önce kaynak seçin.'); return false; } if (!M.roi) { toast('Önce ilgi bölgesini seçin.'); return false; } return true; };
  const sub = (mean0, ch) => { const d = mean0.data; if (M.dark) { const x = new Float32Array(d.length); for (let i = 0; i < d.length; i++) x[i] = Math.max(0, d[i] - M.dark.data[i]); return profile(x, mean0.W, M.roi, ch).y; } return profile(d, mean0.W, M.roi, ch).y; };
  $('[data-dark]', root).onclick = async () => {
    if (!need()) return;
    if (src.kind === 'sim') { $('[data-simcover]', root).checked = true; syncSim(); }
    M.dark = await src.grabMean(set.darkN, (k, n) => ($('[data-darkinfo]', root).textContent = `${k}/${n}`));
    if (src.kind === 'sim') { $('[data-simcover]', root).checked = false; syncSim(); }
    const dp = profile(M.dark.data, M.dark.W, M.roi, 3).y; M.darkLevel = mean([...dp]);
    $('[data-darkinfo]', root).textContent = `✓ ortalama düzey ${fmt(M.darkLevel, 1)}${M.darkLevel > 25 ? ' ⚠️ yüksek: ışık sızıntısı olabilir' : ''}`;
  };
  const grabLamp = async (lamp) => {
    if (!need()) return;
    if (src.kind === 'sim') { $('[data-sim="lamp"]', root).value = lamp; syncSim(); }
    const m = await src.grabMean(set.calN); const y = sub(m, set.calChannel);
    M[lamp] = { y, peaks: findPeaks(y, { minProm: 0.02, minDist: 3 }) };
    drawProfile($('[data-chart]', root), [{ y, color: lamp === 'hg' ? '#86efac' : '#fca5a5' }], { peaks: M[lamp].peaks, title: lamp === 'hg' ? 'Cıva kalibrasyon profili' : 'Neon kalibrasyon profili' });
    toast(`${lamp === 'hg' ? 'Cıva' : 'Neon'}: ${M[lamp].peaks.length} tepe bulundu.`);
  };
  $('[data-hg]', root).onclick = () => grabLamp('hg');
  $('[data-ne]', root).onclick = () => grabLamp('ne');
  $('[data-cal]', root).onclick = () => { if (!M.hg) return toast('Önce cıva karesi alın.'); set.deg = +$('[data-deg]', root).value; save(); autoCal(); renderCal(root); };
  $('[data-main]', root).onclick = () => mainMeasure(root);
  $('[data-save]', root).onclick = () => saveRecord(root);
  $('[data-png]', root).onclick = () => { if (!M.mainMean) return toast('Önce ana ölçüm yapın.'); const c = document.createElement('canvas'); c.width = M.mainMean.W; c.height = M.mainMean.H; const id = new ImageData(c.width, c.height); for (let i = 0; i < id.data.length; i++) id.data[i] = M.mainMean.data[i]; c.getContext('2d').putImageData(id, 0, 0); c.toBlob((b) => download(`${M.fileId || 'IZGE_kurulum'}_ortalama.png`, b), 'image/png'); };
}

function autoRoi(f) {
  const W = f.width, H = f.height, rows = new Float64Array(H);
  for (let i = 0; i < H; i++) { let s = 0; for (let j = 0; j < W; j += 2) { const q = (i * W + j) * 4; s += f.data[q] + f.data[q + 1] + f.data[q + 2]; } rows[i] = s; }
  // bant: satır toplamı arka plan (ortanca satır) üzerinde en yüksek yarı düzeyin üstünde kalan bölge
  const med = [...rows].sort((x, y) => x - y)[Math.floor(H / 2)];
  let mx = 0, im = 0; rows.forEach((v, i) => { if (v > mx) { mx = v; im = i; } });
  const thr = med + (mx - med) * 0.5;
  let a = im, b = im; while (a > 0 && rows[a] > thr) a--; while (b < H - 1 && rows[b] > thr) b++;
  const h = Math.max(4, Math.round((b - a) * 0.6)), y = Math.round((a + b) / 2 - h / 2);
  return { x: 0, y, w: W, h }; // sabit yükseklikli bölge, spektrum merkezinde
}

function autoCal() {
  const sg = suggestHgAuto(M.hg.y); M.pairs = {};
  if (sg) { sg.pairs.forEach((p) => (M.pairs[String(p.nm)] = p.x)); M.hg.peaks = sg.peaks; }
  if (sg && M.ne) {
    const sn = suggestNe(M.ne.peaks, sg.coef);
    if (sn.cal) M.pairs['692.9467'] = sn.cal.x; if (sn.val) M.pairs.val = sn.val.x;
  }
  computeCal();
}
function computeCal() {
  const pairs = LINES.cal.filter((l) => M.pairs[String(l.nm)] != null).map((l) => ({ x: M.pairs[String(l.nm)], nm: l.nm }));
  M.cal = calibrate(pairs, S().settings.deg, M.pairs.val);
}
function renderCal(root) {
  const box = $('[data-calout]', root); const c = M.cal;
  const opts = (lamp) => (M[lamp] ? M[lamp].peaks.map((p) => `<option value="${p.x}">${p.x.toFixed(1)} px${c && c.ok ? ' ≈ ' + evalPoly(c.coef, p.x).toFixed(1) + ' nm' : ''}</option>`).join('') : '');
  box.innerHTML = `<table class="tbl small"><thead><tr><th>Çizgi</th><th>Kullanım</th><th>Tepe</th><th>Artık (nm)</th></tr></thead><tbody>
    ${CAL.map((l) => { const lamp = l.el.startsWith('Hg') ? 'hg' : 'ne'; const x = M.pairs[l.key]; const ri = c && c.ok && l.key !== 'val' ? c.res[LINES.cal.filter((q) => M.pairs[String(q.nm)] != null).findIndex((q) => String(q.nm) === l.key)] : null;
      return `<tr><td>${l.el} ${l.nm.toFixed(4)}</td><td class="small">${esc(l.role)}</td><td><select data-pair="${l.key}"><option value="">—</option>${opts(lamp).replace(`value="${x}"`, `value="${x}" selected`)}</select></td><td>${l.key === 'val' ? (c && c.ok && c.valErr != null ? '<b>' + fmt(c.valErr, 3) + '</b> (doğrulama)' : '–') : ri != null ? fmt(ri, 3) : '–'}</td></tr>`; }).join('')}</tbody></table>
    ${c ? (c.ok ? `<p class="small">Derece ${c.deg} · uyum RMS <b>${fmt(c.rms, 3)} nm</b> · en büyük artık ${fmt(c.maxRes, 3)} nm · dağılım ≈ ${fmt(c.dispersion, 3)} nm/piksel · 650,6528 nm doğrulama hatası <b>${c.valErr != null ? fmt(c.valErr, 3) + ' nm' : 'çizgi seçilmedi'}</b></p>` : `<p class="warn small">${esc(c.reason)}</p>`) : ''}
    <p class="muted small">Öneri otomatiktir; her çizginin eşleşmesini kontrol edin. Her yeni geometride kalibrasyon yeniden yapılır, eski katsayılar taşınmaz.</p>`;
  $$('[data-pair]', box).forEach((s) => (s.onchange = () => { M.pairs[s.dataset.pair] = s.value === '' ? undefined : +s.value; computeCal(); renderCal(root); }));
  if (M.hg) {
    const labels = {}; M.hg.peaks.forEach((p) => { for (const l of CAL) if (M.pairs[l.key] === p.x) labels[p.i] = l.nm.toFixed(2); });
    drawProfile($('[data-chart]', root), [{ y: M.hg.y, color: '#86efac' }, ...(M.ne ? [{ y: M.ne.y, color: '#fca5a5' }] : [])], { coef: c && c.ok ? c.coef : null, ...(c && c.ok ? calRange(M.hg.y.length) : {}), peaks: [...M.hg.peaks, ...(M.ne ? M.ne.peaks : [])], labels: { ...labels, ...Object.fromEntries((M.ne ? M.ne.peaks : []).filter((p) => CAL.some((l) => M.pairs[l.key] === p.x)).map((p) => [p.i, evalPoly(c.coef, p.x).toFixed(2)])) }, title: 'Kalibrasyon: cıva (yeşil) ve neon (kırmızı)' });
  }
}

async function mainMeasure(root) {
  if (!M.cal || !M.cal.ok) return toast('Önce kalibrasyonu tamamlayın.');
  const set = S().settings; const x546 = M.pairs['546.0735'];
  if (src.kind === 'sim') { $('[data-sim="lamp"]', root).value = 'hg'; src.sim.lamp = 'hg'; }
  const out = $('[data-mainout]', root); out.innerHTML = '<p class="small">Kareler alınıyor…</p>';
  const m = await src.grabMean(set.mainN, (k, n) => (out.innerHTML = `<p class="small">Kare ${k}/${n}</p>`));
  M.mainMean = m;
  const per = [], sat = [];
  for (const f of m.frames) {
    const d = f.data; let x = d;
    if (M.dark) { x = new Float32Array(d.length); for (let i = 0; i < d.length; i++) x[i] = Math.max(0, d[i] - M.dark.data[i]); }
    const y = profile(x, f.width, M.roi, set.channel).y; const mx = profile(d, f.width, M.roi, set.channel).max;
    const pk = findPeaks(y, { minProm: 0.02, minDist: 3 }); const ab = autoBg(y, x546, pk.map((p) => p.x));
    const r = fwhm(y, x546, M.cal.coef, { bg: ab.bg }); if (r.ok) per.push(r);
    const i0 = Math.round(x546); let s = 0; for (let k = i0 - 6; k <= i0 + 6; k++) s = Math.max(s, mx[k] || 0); sat.push(s);
  }
  const yMean = profile(M.dark ? m.data.map((v, i) => Math.max(0, v - M.dark.data[i])) : m.data, m.W, M.roi, set.channel).y;
  const pkM = findPeaks(yMean, { minProm: 0.02, minDist: 3 }); const abM = autoBg(yMean, x546, pkM.map((p) => p.x));
  const rm = fwhm(yMean, x546, M.cal.coef, { bg: abM.bg });
  const nm = per.map((r) => r.nm), px = per.map((r) => r.px);
  const reasons = [];
  if (Math.max(...sat) >= set.satLevel) reasons.push('doygunluk');
  if (!rm.ok || rm.snr < set.snrMin) reasons.push('yetersiz sinyal');
  if (M.darkLevel > 25) reasons.push('ışık sızıntısı (karanlık düzey yüksek)');
  if (!M.dark) reasons.push('eksik kayıt (karanlık kare yok)');
  if (M.cal.valErr == null) reasons.push('eksik kayıt (doğrulama çizgisi yok)');
  if (per.length < m.n) reasons.push(`${m.n - per.length} karede FWHM ölçülemedi`);
  M.main = { n: m.n, nOk: per.length, fwhmNm: mean(nm), fwhmSd: sd(nm), fwhmPx: mean(px), R: LINES.main / mean(nm), snr: rm.snr, sampled: mean(px) < 2, satMax: Math.max(...sat), meanFwhm: rm, yMean, reasons, bgLimited: abM.limited };
  // yakın görünüm
  const z0 = Math.max(0, x546 - 40), z1 = Math.min(yMean.length - 1, x546 + 40);
  if (rm.ok) drawProfile($('[data-zoom]', root), [{ y: yMean, color: '#a3e635', width: 2 }], { coef: M.cal.coef, x0: z0, x1: z1, title: '546,0735 nm çizgisi: yarı yükseklik ve FWHM sınırları',
    marks: [{ type: 'v', x: rm.xl }, { type: 'v', x: rm.xr }, { type: 'h', y: (rm.base[0] + rm.base[1] * rm.i0) + rm.peak / 2, xa: rm.xl - 8, xb: rm.xr + 8, color: '#38bdf8' }] });
  out.innerHTML = `<p>FWHM <b>${fmt(M.main.fwhmNm, 3)} nm</b> (kareler arası SS ${fmt(M.main.fwhmSd, 3)}) · ${fmt(M.main.fwhmPx, 2)} piksel · etkin çözme gücü R ≈ <b>${fmt(M.main.R, 0)}</b> · sinyal/gürültü ${fmt(M.main.snr, 0)} · en yüksek piksel ${fmt(M.main.satMax, 0)}</p>
    ${M.main.sampled ? '<p class="warn small">Çizgi iki pikselden dar: kesin FWHM yerine örnekleme sınırı bildirilir.</p>' : ''}${M.main.bgLimited ? '<p class="muted small">Arka plan penceresi komşu çizgi nedeniyle daraltıldı.</p>' : ''}
    <p class="${reasons.length ? 'warn' : 'ok'} small">${reasons.length ? 'Dışlama nedenleri: ' + esc(reasons.join(', ')) : '✓ Geçerlilik ölçütleri sağlandı.'}</p>
    <label class="field small">Ek dışlama nedeni (varsa)<select data-extra><option value="">—</option><option>birleşmiş referans çizgisi</option><option>ışık sızıntısı</option><option>eksik kayıt</option><option>diğer</option></select></label>`;
}

function saveRecord(root) {
  if (!M.main) return toast('Önce ana ölçüm yapın.');
  const st = S(); const g = (k) => $(`[data-m="${k}"]`, root).value; const planId = $('[data-plan]', root).value;
  const plan = allPlanned().find((p) => p.id === planId);
  const extra = $('[data-extra]', root) ? $('[data-extra]', root).value : '';
  const reasons = [...M.main.reasons, ...(extra ? [extra] : [])];
  if (!g('slitMeasured')) reasons.push('eksik kayıt (ölçülen yarık)');
  const x546 = M.pairs['546.0735']; const lam = [], prof = [];
  const pk = M.main.meanFwhm; const base = (k) => pk.base[0] + pk.base[1] * k;
  for (let k = Math.max(0, Math.round(x546 - 40)); k <= Math.min(M.main.yMean.length - 1, Math.round(x546 + 40)); k++) { lam.push(+evalPoly(M.cal.coef, k).toFixed(4)); prof.push(+((M.main.yMean[k] - base(k)) / pk.peak).toFixed(4)); }
  const info = src.info();
  const rec = {
    id: (planId || 'PILOT') + '-' + new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14), planId: planId || null, pilot: !planId,
    stage: plan ? (plan.code.startsWith('A1') ? 1 : plan.code.startsWith('A2') ? 2 : 3) : 0, code: plan ? plan.code : 'PILOT', block: plan ? plan.block : null,
    t: new Date().toISOString(), operator: g('operator'), cad: g('cad'), software: st.settings.software, lens: g('lens'), source: g('source'),
    slitNominal: +g('slitNominal'), slitMeasured: g('slitMeasured') === '' ? null : +g('slitMeasured'), L: +g('L'), alpha: +g('alpha'), G: +g('G'),
    imageSource: info.kind, simulated: info.kind === 'sim', camera: { label: info.label, settings: info.settings }, roi: M.roi, channel: 'yeşil',
    darkN: M.dark ? M.dark.n : 0, darkLevel: M.darkLevel ?? null, calDeg: M.cal.deg, coef: M.cal.coef, calRms: M.cal.rms, calMaxRes: M.cal.maxRes, valErr: M.cal.valErr,
    nFrames: M.main.n, nFramesOk: M.main.nOk, fwhmNm: M.main.fwhmNm, fwhmSd: M.main.fwhmSd, fwhmPx: M.main.fwhmPx, R: M.main.R, snr: M.main.snr, sampled: M.main.sampled, satMax: M.main.satMax,
    reasons, valid: reasons.length === 0, profile: { lam, y: prof },
  };
  if (rec.simulated) rec.reasons.push('simülasyon (gerçek ölçüm değil)'), (rec.valid = false);
  M.fileId = rec.id;
  // ayarları bir sonraki kurulum için hatırla
  Object.assign(st.settings, { operator: rec.operator, cad: rec.cad, lens: rec.lens, source: rec.source });
  st.records.push(rec); log('Kurulum kaydedildi', { id: rec.id, gecerli: rec.valid, nedenler: rec.reasons });
  save(); toast(`Kaydedildi: ${rec.id}${rec.valid ? '' : ' (geçersiz: ' + rec.reasons.join(', ') + ')'}`, 5000);
  // yeni kurulum: kalibrasyon yeniden yapılmalı
  M.cal = null; M.main = null; M.hg = null; M.ne = null; M.pairs = {}; $('[data-calout]', root).innerHTML = ''; $('[data-mainout]', root).innerHTML = '<p class="muted small">Yeni kurulum: ayar parçalarını gevşetip yeniden yerleştirin, kalibrasyonu yenileyin.</p>';
  const sel = $('[data-plan]', root); const o = sel.querySelector(`option[value="${planId}"]`); if (o) o.remove();
}
