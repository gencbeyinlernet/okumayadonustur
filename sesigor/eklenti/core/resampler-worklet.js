// AudioWorklet: çok kanallı sesi tek kanala indirir ve 16 kHz'e yeniden örnekler (doğrusal ara değerleme + basit alçak geçiren).
class Resampler16k extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; this.pos = 0; this.prev = 0; this.buf = new Float32Array(1600); this.n = 0; this.lp = 0;
  }
  process(inputs) {
    const inp = inputs[0]; if (!inp || !inp.length) return true;
    const L = inp[0].length, ch = inp.length;
    for (let i = 0; i < L; i++) {
      let s = 0; for (let c = 0; c < ch; c++) s += inp[c][i]; s /= ch;
      this.lp += 0.6 * (s - this.lp); // basit kenar yumuşatma (~7 kHz)
      const cur = this.lp;
      while (this.pos <= 1) {
        this.buf[this.n++] = this.prev + (cur - this.prev) * this.pos;
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
        this.pos += this.ratio;
      }
      this.pos -= 1; this.prev = cur;
    }
    return true;
  }
}
registerProcessor('resampler-16k', Resampler16k);
