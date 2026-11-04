// SESİGÖR işlem hattı: 16 kHz ses → (a) Whisper konuşma tanıma → altyazı, (b) YAMNet → kurallar → olay etiketi.
// Ses ve metin hiçbir sunucuya gönderilmez; işleme için gereken kısa tamponlar durdurmada temizlenir.
import { EventDetector } from './events.js';
import { HALLUCINATIONS } from './categories.js';

const SR = 16000;
const words = (t) => t.split(/\s+/).filter(Boolean);
const norm = (w) => w.toLocaleLowerCase('tr-TR').replace(/[.,!?;:"'“”‘’()…-]/g, '');

export class Pipeline extends EventTarget {
  /**
   * base: eklenti kökünün URL'si (vendor/, models/ buradan yüklenir)
   * clock(): o anki medya zamanı (s) — video dosyasında currentTime, akışta oturum süresi
   */
  constructor({ base, clock, rules, asr = {}, model = 'Xenova/whisper-base', allowRemote = false, webgpu = true }) {
    super();
    this.base = base; this.clock = clock || (() => (performance.now() - this.t0) / 1000);
    this.opt = { window: 4, hop: 1, maxBuf: 10, silence: 0.7, ...asr };
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
    if (rms(this.buf) < 0.004) { if (dur > 2) this.finalize(this.prevHyp, this.buf.length); return; }
    this.busy = true; this.lastInfer = performance.now();
    const audio = this.buf.slice(); const span = [this.bufStart, this.bufStart + dur];
    const sent = audio.slice(); // işçiye aktarılan kopya
    try {
      const r = await this.transcribe(sent);
      this.log.infer.push({ ms: Math.round(r.ms), audio_s: +r.dur.toFixed(2) });
      let text = r.text;
      if (HALLUCINATIONS.some((re) => re.test(text))) text = '';
      const hyp = words(text);
      // Yerel uzlaşma: art arda iki hipotezde aynı olan önek kesinleşir; kalanı geçici gösterilir.
      let k = 0; while (k < hyp.length && k < this.prevHyp.length && norm(hyp[k]) === norm(this.prevHyp[k])) k++;
      if (hyp.length && this.firstShown == null) this.firstShown = this.clock();
      if (k > this.committed) { this.committed = k; if (this.stableAt == null) this.stableAt = this.clock(); }
      this.prevHyp = hyp;
      // Sonlandırma yalnızca tanınan örnekleri kapsar; tanıma sürerken gelen ses tamponda kalır.
      const tail = rms(audio.slice(-Math.round(this.opt.silence * SR)));
      const endSilent = tail < 0.006;
      if (audio.length / SR >= this.opt.maxBuf || (endSilent && hyp.length && k === hyp.length)) {
        this.finalize(hyp, audio.length, span);
      } else {
        this.emit('interim', { committed: hyp.slice(0, this.committed).join(' '), interim: hyp.slice(this.committed).join(' ') });
      }
    } catch (e) { this.emit('error', e); }
    this.busy = false;
    if (this.running) setTimeout(() => this.maybeTranscribe(), 50);
  }

  /** used: tanınan (tampondan atılacak) örnek sayısı. */
  finalize(hyp, used, span) {
    const text = hyp.join(' ').trim();
    if (text) {
      const now = this.clock();
      const line = { text, audioStart: +(span ? span[0] : this.bufStart).toFixed(3), audioEnd: +(span ? span[1] : this.bufStart + used / SR).toFixed(3),
        firstShownAt: +(this.firstShown ?? now).toFixed(3), stableAt: +(this.stableAt ?? now).toFixed(3), shownAt: +now.toFixed(3) };
      this.log.lines.push(line); this.emit('final', line);
    }
    this.emit('interim', { committed: '', interim: '' });
    this.buf = this.buf.slice(used); this.bufStart += used / SR;
    this.prevHyp = []; this.committed = 0; this.firstShown = null; this.stableAt = null;
  }

  summary() {
    const inf = this.log.infer; const audioS = this.total / SR;
    const procMs = inf.reduce((s, x) => s + x.ms, 0);
    // gecikme: ses parçasının sonu → ilk kararlı (kesinleşmiş) gösterim
    const lat = this.log.lines.map((l) => Math.max(0, Math.min(l.stableAt, l.shownAt) - l.audioEnd)).filter((x) => isFinite(x)).sort((a, b) => a - b);
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
