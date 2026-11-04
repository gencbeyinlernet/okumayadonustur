// Ses olayı algılama: YAMNet (MediaPipe Audio Classifier) + eşik, ardışık doğrulama ve birleştirme kuralları.
import { CATEGORIES, DEFAULT_RULES } from './categories.js';

export class EventDetector {
  constructor({ base, rules = DEFAULT_RULES } = {}) {
    this.base = base; this.rules = { ...DEFAULT_RULES, ...rules, thresholds: { ...DEFAULT_RULES.thresholds, ...(rules.thresholds || {}) } };
    this.state = {}; this.active = []; this.events = []; this.raw = []; this.scores = [];
    CATEGORIES.forEach((c) => (this.state[c.id] = { run: 0, runStart: null, peak: 0, last: -1e9, ev: null }));
  }
  async init() {
    const { AudioClassifier, FilesetResolver } = await import(this.base + 'vendor/mediapipe/audio_bundle.mjs');
    const fileset = await FilesetResolver.forAudioTasks(this.base + 'vendor/mediapipe/wasm');
    this.ac = await AudioClassifier.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: this.base + 'models/yamnet.tflite' }, maxResults: -1, scoreThreshold: 0,
    });
    this.window = 15600; // 0,975 s @ 16 kHz
  }
  /** 0,975 s'lik pencereyi sınıflandırır; t: pencerenin başlangıç zamanı (s). Dönüş: kategori puanları. */
  classify(win, t) {
    const res = this.ac.classify(win, 16000);
    const cats = (res[0] && res[0].classifications[0].categories) || [];
    const by = {}; for (const c of cats) by[c.categoryName] = c.score;
    const s = {}; for (const c of CATEGORIES) s[c.id] = Math.max(0, ...c.classes.map((n) => by[n] || 0));
    // sınıf hiyerarşisi: genel "Alarm" puanı, özgül alt sınıflar (telefon, kapı zili) onu açıklamıyorsa alarm kategorisine eklenir
    for (const c of CATEGORIES) if (c.generic) {
      const g = by[c.generic] || 0, sib = Math.max(s.telefon || 0, s.kapi_zili || 0);
      if (g > sib + 0.1) s[c.id] = Math.max(s[c.id], g);
    }
    const top = cats.slice().sort((a, b) => b.score - a.score).slice(0, 3).map((c) => `${c.categoryName}:${c.score.toFixed(2)}`);
    this.scores.push({ t, ...s });
    return { scores: s, top };
  }
  /** Kuralları uygular; yeni gösterilecek / güncellenen olayları döndürür. now: gösterim saati (s). */
  update(t, scores, now) {
    const R = this.rules, out = [];
    for (const c of CATEGORIES) {
      const st = this.state[c.id], v = scores[c.id], above = v >= R.thresholds[c.id];
      if (above) this.raw.push({ cat: c.id, onset: t, score: v }); // ham çıktı: kural uygulanmamış her pencere
      if (above) {
        if (!st.run) st.runStart = t;
        st.run++; st.peak = Math.max(st.peak, v); st.last = t;
        if (st.ev && t - st.ev.end <= R.mergeGap) { st.ev.end = t + 0.975; st.ev.peak = Math.max(st.ev.peak, v); continue; } // birleştirme
        if (st.run >= R.confirm) {
          st.ev = { cat: c.id, onset: st.runStart, end: t + 0.975, peak: st.peak, shownAt: now };
          this.events.push(st.ev); out.push(st.ev);
        }
      } else { st.run = 0; st.peak = 0; }
    }
    // ekranda gösterilen etkin olaylar: en çok maxActive, puana göre
    this.active = this.events.filter((e) => t - e.end <= R.hold).sort((a, b) => b.peak - a.peak).slice(0, R.maxActive);
    return out;
  }
}
