// SESİGÖR web uygulaması: video dosyası, paylaşılan sekme veya mikrofon sesi → cihaz üzerinde altyazı + ses olayı etiketleri.
import { Pipeline, captureStream, captureElement } from '../eklenti/core/pipeline.js';
import { CaptionPanel, loadSettings } from '../eklenti/core/panel.js';
import { CATEGORIES, DEFAULT_RULES } from '../eklenti/core/categories.js';
import { $, $$, esc, toast, download, toCSV, fmt } from './ui.js';

const BASE = new URL('../eklenti/', import.meta.url).href;
const RULES_KEY = 'sesigor.kurallar';
let pipe = null, panel = null, cap = null, stream = null, netMark = 0, srcKind = 'video', fileName = '';

export const loadRules = () => { try { const r = JSON.parse(localStorage.getItem(RULES_KEY)); return r ? { ...DEFAULT_RULES, ...r, thresholds: { ...DEFAULT_RULES.thresholds, ...r.thresholds } } : { ...DEFAULT_RULES }; } catch { return { ...DEFAULT_RULES }; } };
export const saveRules = (r) => localStorage.setItem(RULES_KEY, JSON.stringify(r));

export function stopUygulama() { stopSession(); if (panel) { panel.destroy(); panel = null; } }

export async function renderUygulama(root) {
  const settings = loadSettings();
  root.innerHTML = `
  <section class="app">
    <div class="app-head">
      <div class="src-tabs" role="tablist" aria-label="Ses kaynağı">
        <button class="tab on" data-src="video" role="tab">🎬 Video dosyası</button>
        <button class="tab" data-src="tab" role="tab">🗂️ Sekme paylaş</button>
        <button class="tab" data-src="mic" role="tab">🎙️ Mikrofon</button>
      </div>
      <div class="row">
        <button class="btn primary" data-start>▶ Başlat</button><button class="btn" data-stop disabled>■ Durdur</button>
        <button class="btn" data-export disabled>⬇ Oturum kaydı</button>
      </div>
    </div>
    <div class="status-row"><span data-status>Modeller ilk başlatmada yüklenir (≈ 105 MB; tarayıcı önbelleğe alır).</span><div class="bar" data-bar hidden><i></i></div></div>
    <div class="stage" data-stage data-pos="${settings.position}">
      <div class="media">
        <div data-srcpane="video"><video data-video controls playsinline preload="metadata"></video>
          <div class="row"><label class="btn">📂 Video seç<input type="file" accept="video/*,audio/*" data-file hidden></label><button class="btn" data-sample>Örnek videoyu aç</button><span class="muted small" data-fname></span></div></div>
        <div data-srcpane="tab" hidden><video data-tabvideo autoplay muted playsinline></video><p class="muted small">“Başlat”a bastığınızda tarayıcı hangi sekmeyi paylaşacağınızı sorar; <b>sekme sesini paylaş</b> seçeneğini işaretleyin (Chrome/Edge).</p></div>
        <div data-srcpane="mic" hidden><p class="muted">Mikrofon sesi işlenir. Videodaki sesi doğrudan almak için “Video dosyası” veya “Sekme paylaş” önerilir.</p></div>
      </div>
      <div class="sgwrap" data-panel aria-label="SESİGÖR paneli"></div>
    </div>
    <div class="cards">
      <div class="card"><h4>Gizlilik denetimi</h4><p data-net class="small">Oturum başlayınca ağ istekleri burada sayılır.</p></div>
      <div class="card"><h4>Oturum özeti</h4><div data-sum class="small muted">–</div></div>
      <details class="card"><summary><b>Teknik görünüm: canlı olay puanları</b></summary><div data-scores class="scores"></div></details>
      <details class="card"><summary><b>Kurallar (geliştirme kayıtlarında seçilir)</b></summary><div data-rules></div></details>
    </div>
  </section>`;
  panel = new CaptionPanel($('[data-panel]', root), { settings, onChange: (s) => { $('[data-stage]', root).dataset.pos = s.position; } });
  $$('[data-src]', root).forEach((b) => (b.onclick = () => {
    if (pipe && pipe.running) return toast('Önce oturumu durdurun.');
    srcKind = b.dataset.src;
    $$('[data-src]', root).forEach((x) => x.classList.toggle('on', x === b));
    $$('[data-srcpane]', root).forEach((p) => (p.hidden = p.dataset.srcpane !== srcKind));
  }));
  const video = $('[data-video]', root);
  $('[data-file]', root).onchange = (e) => { const f = e.target.files[0]; if (!f) return; video.src = URL.createObjectURL(f); fileName = f.name; $('[data-fname]', root).textContent = f.name; };
  $('[data-sample]', root).onclick = () => { video.src = new URL('../media/ornek.mp4', import.meta.url).href; fileName = 'ornek.mp4'; $('[data-fname]', root).textContent = 'Örnek video (yapay ses ve sentetik olay sesleri)'; };
  $('[data-start]', root).onclick = () => startSession(root).catch((e) => { setStatus(root, 'Başlatılamadı: ' + e.message); toast(e.message, 5000); resetButtons(root); });
  $('[data-stop]', root).onclick = async () => { $('[data-stop]', root).disabled = true; setStatus(root, 'Kalan ses işleniyor…'); const v = $('[data-video]', root); if (v && !v.paused) v.pause(); if (pipe) await pipe.finish(); stopSession(); resetButtons(root); showSummary(root); setStatus(root, 'Durduruldu.'); };
  $('[data-export]', root).onclick = () => exportSession();
  renderRules($('[data-rules]', root));
}

const setStatus = (root, t) => { const s = $('[data-status]', root); if (s) s.textContent = t; };
function resetButtons(root) { $('[data-start]', root).disabled = false; $('[data-stop]', root).disabled = true; }

async function startSession(root) {
  $('[data-start]', root).disabled = true;
  const video = $('[data-video]', root);
  if (srcKind === 'video' && !video.src) throw new Error('Önce bir video seçin.');
  const clock = srcKind === 'video' ? () => video.currentTime : null;
  if (!pipe) {
    setStatus(root, 'Modeller yükleniyor…'); const bar = $('[data-bar]', root); bar.hidden = false;
    const files = {};
    pipe = new Pipeline({ base: BASE, rules: loadRules(), clock: clock || undefined });
    await pipe.init((p) => {
      if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const L = Object.values(files).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]); bar.querySelector('i').style.width = Math.round((100 * L[0]) / L[1]) + '%'; setStatus(root, `Model yükleniyor: ${fmt(L[0] / 1048576, 1)} / ${fmt(L[1] / 1048576, 1)} MB`); }
    });
    bar.hidden = true;
    bindPipe(root);
  } else { pipe.clock = clock || (() => (performance.now() - pipe.t0) / 1000); pipe.events.rules = loadRules(); }
  netMark = performance.getEntriesByType('resource').length;
  if (srcKind === 'video') {
    cap = cap && cap.el === video ? cap : await captureElement(video, BASE, (c) => pipe.push(c));
    cap.el = video;
    await cap.ctx.resume();
    pipe.start();
    if (video.paused) video.play().catch(() => {});
  } else {
    if (srcKind === 'tab') {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (!stream.getAudioTracks().length) { stream.getTracks().forEach((t) => t.stop()); throw new Error('Paylaşımda ses yok. “Sekme sesini paylaş” seçeneğini işaretleyin.'); }
      $('[data-tabvideo]', root).srcObject = stream;
    } else stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    pipe.start();
    cap = await captureStream(stream, BASE, (c) => pipe.push(c));
    stream.getTracks().forEach((t) => (t.onended = () => { stopSession(); resetButtons(root); showSummary(root); }));
  }
  $('[data-stop]', root).disabled = false; $('[data-export]', root).disabled = false;
  setStatus(root, `Çalışıyor · ${pipe.device === 'webgpu' ? 'WebGPU' : 'WASM (işlemci)'} · ses cihazdan çıkmıyor`);
  watchNetwork(root);
}

function bindPipe(root) {
  pipe.addEventListener('final', (e) => panel && panel.addLine(e.detail));
  pipe.addEventListener('interim', (e) => panel && panel.setInterim(e.detail));
  pipe.addEventListener('event', (e) => panel && panel.addEvent(e.detail));
  pipe.addEventListener('active', (e) => panel && panel.setActive(e.detail));
  pipe.addEventListener('error', (e) => toast('Tanıma hatası: ' + (e.detail?.message || e.detail)));
  pipe.addEventListener('scores', (e) => {
    const box = $('[data-scores]'); if (!box || !box.closest('details').open) return;
    box.innerHTML = CATEGORIES.map((c) => { const v = e.detail.scores[c.id]; const thr = pipe.events.rules.thresholds[c.id];
      return `<div class="sc"><span>${c.icon} ${esc(c.label)}</span><div class="scbar"><i style="width:${Math.round(v * 100)}%" class="${v >= thr ? 'on' : ''}"></i><b style="left:${thr * 100}%"></b></div><span>${v.toFixed(2)}</span></div>`; }).join('')
      + `<p class="muted small">YAMNet ilk 3: ${esc(e.detail.top.join(' · '))}</p>`;
  });
}

let netTimer = null;
function watchNetwork(root) {
  clearInterval(netTimer);
  netTimer = setInterval(() => {
    const el = $('[data-net]', root); if (!el) return clearInterval(netTimer);
    const ent = performance.getEntriesByType('resource').slice(netMark).filter((e) => !e.name.startsWith('blob:') && !e.name.startsWith('data:'));
    const ext = ent.filter((e) => new URL(e.name).origin !== location.origin);
    const local = ent.filter((e) => new URL(e.name).origin === location.origin).map((e) => new URL(e.name).pathname.split('/').pop());
    el.innerHTML = `Oturum başladıktan sonra ağ isteği: <b>${ent.length}</b> · dış sunucuya: <b>${ext.length}</b>. ${ext.length === 0 ? '✅ Ses ve altyazı hiçbir sunucuya gönderilmiyor.' : '⚠️ Dış istekler: ' + esc(ext.map((e) => new URL(e.name).host).join(', '))}${local.length ? ` <span class="muted">(sitenin kendi model dosyaları: ${esc([...new Set(local)].join(', '))})</span>` : ''}`;
    if (pipe && !pipe.running) showSummary(root);
  }, 1000);
}

function stopSession() {
  if (pipe) pipe.stop();
  if (cap && !cap.el) { cap.stop(); cap.ctx.close().catch(() => {}); cap = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  const v = $('[data-video]'); if (v && !v.paused) v.pause();
}

function showSummary(root) {
  if (!pipe) return; const s = pipe.summary(); const el = $('[data-sum]', root); if (!el) return;
  el.innerHTML = `İşlenen ses ${fmt(s.audio_s, 1)} s · tanıma ${s.inference_count} kez · gerçek zaman oranı <b>${s.rtf ?? '–'}</b>${s.rtf > 1 ? ' (bu cihaz gerçek zamanın gerisinde: gecikme birikir; WebGPU destekli bir tarayıcı veya daha hızlı bir bilgisayar önerilir)' : ''} · iç gecikme ortanca ${s.line_latency_median_s == null ? '–' : fmt(s.line_latency_median_s, 2) + ' s'} · kurallı olay ${s.events} / ham algılama ${s.raw_detections}${s.heap_mb ? ' · JS belleği ' + s.heap_mb + ' MB' : ''}`;
}

function exportSession() {
  if (!pipe) return;
  const log = pipe.exportLog();
  const ent = performance.getEntriesByType('resource').slice(netMark).map((e) => e.name);
  const meta = { kaynak: srcKind, dosya: fileName, gorunum: panel.s.events ? 'T2' : 'T1', tarayici: navigator.userAgent, cihaz: { cekirdek: navigator.hardwareConcurrency, bellek_gb: navigator.deviceMemory || null }, ag_istekleri_oturumda: ent };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  download(`SESIGOR_oturum_${stamp}.json`, JSON.stringify({ meta, ...log }, null, 1), 'application/json');
  const srt = log.lines.map((l, i) => `${i + 1}\n${ts(l.audioStart)} --> ${ts(l.audioEnd)}\n${l.text}\n`).join('\n');
  download(`SESIGOR_altyazi_${stamp}.srt`, srt);
}
const ts = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0').replace('.', ',')}`; };

function renderRules(box) {
  const r = loadRules();
  box.innerHTML = `<p class="muted small">Bir etiketin görünmesi için sınıfa özgü eşik ve ardışık doğrulama şartı aranır; yakın zamanda gelen aynı kategori tek olayda birleşir; aynı anda en çok ${r.maxActive} olay gösterilir. Eşikleri “Değerlendirme → Eşik seçimi” bölümünde geliştirme kayıtlarıyla seçin; bağımsız testte değiştirmeyin.</p>
    <div class="grid3">${CATEGORIES.map((c) => `<label class="field small">${c.icon} ${esc(c.label)} eşiği<input type="number" min="0.05" max="0.95" step="0.05" data-thr="${c.id}" value="${r.thresholds[c.id]}"></label>`).join('')}
    <label class="field small">Ardışık doğrulama (pencere)<input type="number" min="1" max="5" data-r="confirm" value="${r.confirm}"></label>
    <label class="field small">Birleştirme aralığı (s)<input type="number" min="0" max="10" step="0.5" data-r="mergeGap" value="${r.mergeGap}"></label>
    <label class="field small">Aynı anda en çok olay<input type="number" min="1" max="6" data-r="maxActive" value="${r.maxActive}"></label></div>
    <div class="row"><button class="btn tiny" data-rexp>⬇ Kuralları indir</button><label class="btn tiny">⬆ Kural dosyası yükle<input type="file" accept=".json" data-rimp hidden></label><button class="btn tiny ghost" data-rdef>Varsayılana dön</button></div>`;
  const upd = () => { const n = loadRules(); $$('[data-thr]', box).forEach((i) => (n.thresholds[i.dataset.thr] = +i.value)); $$('[data-r]', box).forEach((i) => (n[i.dataset.r] = +i.value)); saveRules(n); if (pipe) pipe.events.rules = n; toast('Kurallar kaydedildi'); };
  $$('input[data-thr], input[data-r]', box).forEach((i) => (i.onchange = upd));
  $('[data-rexp]', box).onclick = () => download('SESIGOR_kurallar.json', JSON.stringify(loadRules(), null, 1), 'application/json');
  $('[data-rimp]', box).onchange = async (e) => { try { saveRules(JSON.parse(await e.target.files[0].text())); renderRules(box); toast('Kurallar yüklendi'); } catch { toast('Dosya okunamadı'); } };
  $('[data-rdef]', box).onclick = () => { localStorage.removeItem(RULES_KEY); renderRules(box); if (pipe) pipe.events.rules = loadRules(); };
}
