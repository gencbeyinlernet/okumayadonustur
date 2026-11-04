// Görüntü kaynakları: USB web kamerası, görüntü dosyası, simülasyon.
// Simülasyon yalnızca yazılımı denemek içindir; gerçek ölçüm değildir ve rapora sonuç olarak yazılmaz.

export class Source {
  constructor() { this.kind = null; this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }); this.sim = { lamp: 'hg', slit: 0.2, L: 140, alpha: 20, G: 25, cover: false, exposure: 1 }; }

  async startCamera(deviceId) {
    this.stop();
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) }, audio: false };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.track = this.stream.getVideoTracks()[0];
    this.video = document.createElement('video'); this.video.muted = true; this.video.playsInline = true; this.video.srcObject = this.stream;
    await this.video.play();
    this.kind = 'kamera';
    return this.info();
  }
  async listCameras() { const d = await navigator.mediaDevices.enumerateDevices(); return d.filter((x) => x.kind === 'videoinput'); }
  /** Otomatik odak, pozlama ve beyaz dengesini kapatmayı dener; desteklenmeyenleri bildirir. */
  async lockAuto(values = {}) {
    if (!this.track) return { applied: [], unsupported: ['kamera yok'] };
    const cap = this.track.getCapabilities ? this.track.getCapabilities() : {};
    const adv = {}, applied = [], unsupported = [];
    const want = [['exposureMode', 'manual'], ['whiteBalanceMode', 'manual'], ['focusMode', 'manual']];
    for (const [k, v] of want) { if (cap[k] && cap[k].includes(v)) { adv[k] = v; applied.push(k); } else unsupported.push(k); }
    for (const k of ['exposureTime', 'exposureCompensation', 'colorTemperature', 'focusDistance', 'brightness', 'contrast', 'saturation', 'sharpness', 'iso']) if (values[k] != null && cap[k]) adv[k] = values[k];
    try { await this.track.applyConstraints({ advanced: [adv] }); } catch (e) { unsupported.push('applyConstraints: ' + e.message); }
    return { applied, unsupported, settings: this.info().settings };
  }
  info() {
    if (this.kind === 'kamera') return { kind: 'kamera', label: this.track.label, settings: this.track.getSettings ? this.track.getSettings() : {}, capabilities: this.track.getCapabilities ? this.track.getCapabilities() : {} };
    if (this.kind === 'dosya') return { kind: 'dosya', label: this.fileName, settings: { width: this.canvas.width, height: this.canvas.height } };
    if (this.kind === 'sim') return { kind: 'sim', label: 'Simülasyon (gerçek ölçüm değildir)', settings: { width: 1280, height: 720, ...this.sim } };
    return { kind: null };
  }
  async startImage(file) {
    this.stop();
    const img = await createImageBitmap(file);
    this.canvas.width = img.width; this.canvas.height = img.height; this.ctx.drawImage(img, 0, 0);
    this.still = this.ctx.getImageData(0, 0, img.width, img.height); this.kind = 'dosya'; this.fileName = file.name;
    return this.info();
  }
  startSim() { this.stop(); this.kind = 'sim'; this.canvas.width = 1280; this.canvas.height = 720; this._seed = 1; return this.info(); }
  stop() { if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; this.track = null; this.video = null; this.kind = null; }
  get width() { return this.kind === 'kamera' ? this.video.videoWidth : this.canvas.width; }
  get height() { return this.kind === 'kamera' ? this.video.videoHeight : this.canvas.height; }

  /** Tek kare (ImageData). */
  grab() {
    if (this.kind === 'kamera') {
      const W = this.video.videoWidth, H = this.video.videoHeight;
      if (this.canvas.width !== W) { this.canvas.width = W; this.canvas.height = H; }
      this.ctx.drawImage(this.video, 0, 0); return this.ctx.getImageData(0, 0, W, H);
    }
    if (this.kind === 'dosya') return this.still;
    if (this.kind === 'sim') return simulate(this.sim, this.canvas.width, this.canvas.height, () => (this._seed = (this._seed * 16807) % 2147483647) / 2147483647);
    return null;
  }
  /** n karenin ortalaması (Float32 RGBA) ve doygun piksel sayısı. Kameradan ardışık karelerin gelmesi beklenir. */
  async grabMean(n, onFrame) {
    let acc = null, sat = 0, W = 0, H = 0; const frames = [];
    for (let k = 0; k < n; k++) {
      if (this.kind === 'kamera') await new Promise((r) => (this.video.requestVideoFrameCallback ? this.video.requestVideoFrameCallback(() => r()) : setTimeout(r, 40)));
      const f = this.grab(); W = f.width; H = f.height;
      if (!acc) acc = new Float32Array(f.data.length);
      for (let i = 0; i < f.data.length; i++) { acc[i] += f.data[i]; }
      frames.push(f); onFrame && onFrame(k + 1, n);
      if (this.kind === 'dosya') { // tek görüntü: aynı kare n kez sayılmaz
        for (let i = 0; i < acc.length; i++) acc[i] = f.data[i]; return { data: acc, W, H, frames: [f], n: 1 };
      }
    }
    for (let i = 0; i < acc.length; i++) acc[i] /= n;
    return { data: acc, W, H, frames, n };
  }
}

// ---- Simülasyon (yazılım denemesi için) ----
const HG = [[404.6563, 0.7], [435.8328, 1.0], [491.6068, 0.04], [546.0735, 1.0], [576.9598, 0.32], [579.0663, 0.3]];
const NE = [[585.2488, 0.55], [588.1895, 0.3], [594.4834, 0.35], [603.9969, 0.2], [607.4338, 0.35], [609.6163, 0.4], [614.3062, 0.5], [616.3594, 0.3], [621.7281, 0.3],
  [626.6495, 0.4], [630.4789, 0.3], [633.4428, 0.45], [638.2992, 0.5], [640.2248, 0.85], [650.6528, 0.55], [653.2882, 0.35], [659.8953, 0.4], [667.8277, 0.45], [671.7043, 0.3], [692.9467, 0.5], [703.2413, 0.6]];
const sens = (nm) => [Math.exp(-(((nm - 610) / 62) ** 2)), Math.exp(-(((nm - 535) / 45) ** 2)), Math.exp(-(((nm - 450) / 48) ** 2))];

export function simulate(p, W, H, rnd) {
  const img = new ImageData(W, H), d = img.data;
  const dgr = 1e6 / 600; // nm
  const fpx = (W / 2) / Math.tan((30 * Math.PI) / 180); // ~60° yatay görüş
  const a = (p.alpha * Math.PI) / 180;
  // çizgi genişliği (simülasyon varsayımı): yarık görüntüsü (f_kam/f_kol ≈ 3,6/75) + optik bulanıklık (L ve G'ye bağlı)
  const slitPx = (p.slit * (3.6 / 75)) / 0.003 * (W / 1280) * 1.0;
  const blur = 1.3 + 0.004 * Math.abs(p.L - 140) + 0.02 * Math.abs(p.G - 25);
  const sigma = Math.sqrt((slitPx / 2.355) ** 2 + blur ** 2 + (Math.abs(p.alpha - 20) * 0.05) ** 2);
  const vign = Math.exp(-(((p.G - 15) / 60) ** 2));
  const lines = p.cover ? [] : p.lamp === 'hg' ? HG : p.lamp === 'ne' ? NE : p.lamp === 'hgne' ? [...HG, ...NE] : [];
  const col = new Float32Array(W * 3);
  for (const [nm, I] of lines) {
    const th = Math.asin(nm / dgr); const x = W / 2 + fpx * Math.tan(th - a);
    const s = sens(nm); const amp = I * 150 * p.exposure * (p.slit / 0.2) ** 0.9 * vign;
    for (let j = Math.max(0, Math.floor(x - 6 * sigma)); j < Math.min(W, Math.ceil(x + 6 * sigma)); j++) {
      const g = Math.exp(-0.5 * ((j - x) / sigma) ** 2) * amp;
      col[j * 3] += g * s[0]; col[j * 3 + 1] += g * s[1]; col[j * 3 + 2] += g * s[2];
    }
  }
  const y0 = H * 0.5, hh = H * 0.09;
  for (let i = 0; i < H; i++) {
    const v = Math.exp(-(((i - y0) / hh) ** 8));
    for (let j = 0; j < W; j++) {
      const q = (i * W + j) * 4;
      for (let c = 0; c < 3; c++) {
        let x = col[j * 3 + c] * v + 6 + (p.cover ? 0 : 2 * v); // karanlık seviye + saçılma
        x += Math.sqrt(Math.max(x, 1)) * gauss(rnd) * 0.8 + gauss(rnd) * 1.2; // atış ve okuma gürültüsü
        d[q + c] = Math.max(0, Math.min(255, 255 * Math.pow(Math.max(0, x) / 255, 1 / 1.1))); // kamera eğrisi + doygunluk
      }
      d[q + 3] = 255;
    }
  }
  return img;
}
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
