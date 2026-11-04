// SESİGÖR işlem hattı: 16 kHz ses → (a) Whisper konuşma tanıma → altyazı, (b) YAMNet → kurallar → olay etiketi.
// Ses ve metin hiçbir sunucuya gönderilmez; işleme için gereken kısa tamponlar durdurmada temizlenir.
import { EventDetector } from './events.js';
import { HALLUCINATIONS } from './categories.js';

const SR = 16000;
const words = (t) => t.split(/\s+/).filter(Boolean);
/** Whisper'ın parantezli ses açıklamaları ([Müzik], (alkış) …) altyazıdan çıkarılır; ses olaylarını yalnız olay modülü bildirir. */
const clean = (t) => String(t || '').replace(/\[[^\]]*\]|\([^)]*\)|[♪♫]+/g, ' ').replace(/\s+/g, ' ').trim();
const norm = (w) => w.toLocaleLowerCase('tr-TR').replace(/[.,!?;:"'“”‘’()…-]/g, '');

export class Pipeline extends EventTarget {
  /**
   * base: eklenti kökünün URL'si (vendor/, models/ buradan yüklenir)
   * clock(): o anki medya zamanı (s) — video dosyasında currentTime, akışta oturum süresi
   */
  constructor({ base, clock, rules, asr = {}, model = 'Xenova/whisper-base', allowRemote = false, webgpu = true }) {
    super();
    this.base = base; this.clock = clock || (() => (performance.now() - this.t0) / 1000);
    this.opt = { hop: 1, maxBuf: 12, silence: 0.6, ...asr };
    this.model = model; this.allowRemote = allowRemote; this.webgpu = webgpu;
    this.events = new EventDetector({ base, rules });
    this.log = { lines: [], events: [], raw: [], scores: [], infer: [], start: null, end: null };
    this.reset();
  }
  reset() {
    this.buf = new Float32Array(0); this.bufStart = 0; this.total = 0; this.prevHyp = []; this.committed = 0;
    this.evBuf = new Float32Array(0); this.evT = 0; this.busy = false; this.lastInfer = 0;
  }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  async init(onProgress) {
    this.worker = new Worker(this.base + 'core/asr-worker.js', { type: 'module' });
    this.pending = new Map(); this.seq = 0;
    const ready = new Promise((res, rej) => {
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'progress') onProgress && onProgress(m.p);
        else if (m.type === 'ready') { this.device = m.device; res(); }
        else if (m.type === 'error' && m.id == null) rej(new Error(m.message));
        else { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.type === 'error' ? p.rej(new Error(m.message)) : p.res(m); } }
      };
    });
    this.worker.postMessage({ type: 'init', base: this.base, model: this.model, allowRemote: this.allowRemote, webgpu: this.webgpu });
    await Promise.all([ready, this.events.init()]);
  }
  transcribe(audio) {
    return new Promise((res, rej) => { const id = ++this.seq; this.pending.set(id, { res, rej }); this.worker.postMessage({ type: 'transcribe', id, audio }, [audio.buffer]); });
  }

  start() { this.reset(); this.running = true; this.t0 = performance.now(); this.log.start = new Date().toISOString(); this.mediaStart = this.clock(); }
  stop() {
    if (this.running) this.flushInterim();
    this.running = false; this.log.end = new Date().toISOString();
    this.buf = new Float32Array(0); this.evBuf = new Float32Array(0); // kısa tamponlar temizlenir
  }
  dispose() { this.stop(); this.worker && this.worker.terminate(); }

  /** 16 kHz tek kanal ses parçası ekler. */
  push(chunk) {
    if (!this.running) return;
    const tNow = this.clock();
    if (!this.buf.length) this.bufStart = tNow - chunk.length / SR;
    this.buf = cat(this.buf, chunk); this.total += chunk.length;
    // olay penceresi: 0,975 s, 0,5 s ilerleme
    if (!this.evBuf.length) this.evT = tNow - chunk.length / SR;
    this.evBuf = cat(this.evBuf, chunk);
    while (this.evBuf.length >= 15600) {
      const win = this.evBuf.slice(0, 15600);
      const { scores, top } = this.events.classify(win, this.evT);
      const shown = this.events.update(this.evT, scores, this.clock());
      this.log.scores.push({ t: +this.evT.toFixed(3), ...roundAll(scores) });
      shown.forEach((ev) => { this.log.events.push({ ...ev }); this.emit('event', ev); });
      this.emit('active', this.events.active);
      this.emit('scores', { t: this.evT, scores, top });
      this.evBuf = this.evBuf.slice(8000); this.evT += 0.5;
    }
    this.maybeTranscribe();
  }

  async maybeTranscribe() {
    if (this.busy || !this.running) return;
    const dur = this.buf.length / SR;
    if (dur < 1 || performance.now() - this.lastInfer < this.opt.hop * 1000) return;
    // enerji tabanlı ses etkinliği: tampon tamamen sessizse tanıma yapılmaz (uydurma metni önler)
    if (rms(this.buf) < 0.004) { if (dur > 2) { this.flushInterim(); this.buf = new Float32Array(0); } return; }
    this.busy = true; this.lastInfer = performance.now();
    const audio = this.buf.slice(); const start = this.bufStart; const len = audio.length / SR;
    try {
      const r = await this.transcribe(audio.slice());
      this.log.infer.push({ ms: Math.round(r.ms), audio_s: +r.dur.toFixed(2) });
      let segs = (r.chunks && r.chunks.length ? r.chunks : [{ text: r.text, t0: 0, t1: null }])
        .map((c) => ({ ...c, text: clean(c.text), t1: c.t1 == null ? len : Math.min(c.t1, len) }))
        .filter((c) => c.text && !HALLUCINATIONS.some((re) => re.test(c.text)));
      const endSilent = rms(audio.slice(-Math.round(this.opt.silence * SR))) < 0.006;
      // Tamamlanmış bölütler: son bölüt dışındakiler (ardından konuşma sürüyor) ya da sonda sessizlik varsa hepsi.
      let n = endSilent ? segs.length : Math.max(0, segs.length - 1);
      if (!n && len >= this.opt.maxBuf && segs.length) n = segs.length; // tampon sınırı: zorla kesinleştir
      const now = this.clock();
      for (let i = 0; i < n; i++) {
        const sg = segs[i];
        const line = { text: sg.text, audioStart: +(start + sg.t0).toFixed(3), audioEnd: +(start + sg.t1).toFixed(3), firstShownAt: +(this.firstShown ?? now).toFixed(3), stableAt: +now.toFixed(3), shownAt: +now.toFixed(3) };
        this.log.lines.push(line); this.emit('final', line);
      }
      if (n) {
        const cut = n === segs.length ? audio.length : Math.round(segs[n - 1].t1 * SR);
        this.buf = this.buf.slice(cut); this.bufStart += cut / SR; this.firstShown = null; this.prevHyp = [];
      }
      // Kalan bölüt: art arda iki hipotezde aynı kalan önek kesinleşmiş (beyaz), kalanı geçici (gri) gösterilir.
      const rest = words(segs.slice(n).map((c) => c.text).join(' '));
      let k = 0; while (k < rest.length && k < this.prevHyp.length && norm(rest[k]) === norm(this.prevHyp[k])) k++;
      if (rest.length && this.firstShown == null) this.firstShown = now;
      this.prevHyp = rest;
      this.emit('interim', { committed: rest.slice(0, k).join(' '), interim: rest.slice(k).join(' ') });
    } catch (e) { this.emit('error', e); }
    this.busy = false;
    if (this.running) setTimeout(() => this.maybeTranscribe(), 50);
  }

  /** Durdurmadan önce: süren tanımayı bekler, tamponda kalan sesi tanıyıp bütün bölütleri kesinleştirir. */
  async finish() {
    if (!this.running) return;
    this.running = false;
    for (let i = 0; i < 200 && this.busy; i++) await new Promise((r) => setTimeout(r, 100));
    const SR30 = 28 * SR;
    while (this.buf.length / SR >= 0.5 && rms(this.buf) >= 0.004) {
      const audio = this.buf.slice(0, SR30); const start = this.bufStart; const len = audio.length / SR;
      try {
        const r = await this.transcribe(audio.slice());
        this.log.infer.push({ ms: Math.round(r.ms), audio_s: +r.dur.toFixed(2) });
        const now = this.clock();
        (r.chunks && r.chunks.length ? r.chunks : [{ text: r.text, t0: 0, t1: len }]).map((c) => ({ ...c, text: clean(c.text) }))
          .filter((c) => c.text && !HALLUCINATIONS.some((re) => re.test(c.text)))
          .forEach((c) => { const line = { text: c.text, audioStart: +(start + c.t0).toFixed(3), audioEnd: +(start + Math.min(c.t1 ?? len, len)).toFixed(3), firstShownAt: +(this.firstShown ?? now).toFixed(3), stableAt: +now.toFixed(3), shownAt: +now.toFixed(3), afterStop: true }; this.log.lines.push(line); this.emit('final', line); });
      } catch (e) { this.emit('error', e); break; }
      this.buf = this.buf.slice(audio.length); this.bufStart += len; this.prevHyp = []; this.firstShown = null;
    }
    this.emit('interim', { committed: '', interim: '' });
    this.running = true; this.stop();
  }

  /** Sessizlikte bekleyen geçici metni satır olarak kapatır. */
  flushInterim() {
    if (!this.prevHyp.length) return;
    const now = this.clock();
    const line = { text: this.prevHyp.join(' '), audioStart: +this.bufStart.toFixed(3), audioEnd: +(this.bufStart + this.buf.length / SR).toFixed(3), firstShownAt: +(this.firstShown ?? now).toFixed(3), stableAt: +now.toFixed(3), shownAt: +now.toFixed(3) };
    this.log.lines.push(line); this.emit('final', line); this.emit('interim', { committed: '', interim: '' });
    this.prevHyp = []; this.firstShown = null; this.bufStart += this.buf.length / SR;
  }

  summary() {
    const inf = this.log.infer; const audioS = this.total / SR;
    const procMs = inf.reduce((s, x) => s + x.ms, 0);
    // gecikme: ses parçasının sonu → ilk kararlı (kesinleşmiş) gösterim
    const lat = this.log.lines.filter((l) => !l.afterStop).map((l) => Math.max(0, l.stableAt - l.audioEnd)).filter((x) => isFinite(x)).sort((a, b) => a - b);
    const q = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : null);
    return { device: this.device, audio_s: +audioS.toFixed(1), inference_count: inf.length, rtf: audioS ? +(procMs / 1000 / audioS).toFixed(3) : null,
      line_latency_median_s: q(0.5), line_latency_p95_s: q(0.95), events: this.log.events.length, raw_detections: this.events.raw.length,
      heap_mb: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
  }
  exportLog() { return { ...this.log, raw: this.events.raw, rules: this.events.rules, summary: this.summary(), model: this.model }; }
}

function cat(a, b) { const c = new Float32Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }
function rms(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return a.length ? Math.sqrt(s / a.length) : 0; }
function roundAll(o) { const r = {}; for (const k in o) r[k] = +o[k].toFixed(3); return r; }

/** Bir MediaStream'i 16 kHz parçalara çevirir. passthrough: sesi hoparlöre de verir. */
export async function captureStream(stream, base, onChunk, { passthrough = false, ctx } = {}) {
  ctx = ctx || new AudioContext();
  await ctx.audioWorklet.addModule(base + 'core/resampler-worklet.js');
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'resampler-16k');
  node.port.onmessage = (e) => onChunk(e.data);
  src.connect(node);
  const mute = ctx.createGain(); mute.gain.value = 0; node.connect(mute).connect(ctx.destination); // işlemcinin çalışması için
  if (passthrough) src.connect(ctx.destination);
  return { ctx, stop: () => { try { src.disconnect(); node.disconnect(); } catch { /* yok */ } } };
}

/** Bir video/ses öğesinden yakalama (ses hoparlöre gitmeye devam eder). */
export async function captureElement(el, base, onChunk) {
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule(base + 'core/resampler-worklet.js');
  const src = el._sesigorSrc || (el._sesigorSrc = ctx.createMediaElementSource(el));
  const node = new AudioWorkletNode(ctx, 'resampler-16k');
  node.port.onmessage = (e) => onChunk(e.data);
  src.connect(node); src.connect(ctx.destination);
  const mute = ctx.createGain(); mute.gain.value = 0; node.connect(mute).connect(ctx.destination);
  return { ctx, stop: () => { try { node.disconnect(); } catch { /* yok */ } } };
}
