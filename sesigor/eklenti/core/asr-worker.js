// Konuşma tanıma işçisi: Whisper (Transformers.js, ONNX Runtime Web). Ses cihazdan çıkmaz.
let asr = null;

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      const T = await import(m.base + 'vendor/transformers.min.js');
      T.env.allowRemoteModels = !!m.allowRemote;
      T.env.allowLocalModels = true;
      T.env.useBrowserCache = !m.base.startsWith('chrome-extension'); // eklenti kökeni Cache API desteklemez
      T.env.localModelPath = m.base + 'models/';
      T.env.backends.onnx.wasm.wasmPaths = m.base + 'vendor/';
      T.env.backends.onnx.wasm.numThreads = 1; // GitHub Pages / eklentide ortak bellek (COOP/COEP) yok
      let device = 'wasm';
      if (m.webgpu && self.navigator && navigator.gpu) { try { const a = await navigator.gpu.requestAdapter(); if (a) device = 'webgpu'; } catch { /* yok */ } }
      const opts = { device, dtype: 'q8', // pakette yalnız 8 bit nicemlenmiş dosyalar bulunur
        progress_callback: (p) => self.postMessage({ type: 'progress', p }) };
      try { asr = await T.pipeline('automatic-speech-recognition', m.model, opts); }
      catch (err) { if (device !== 'webgpu') throw err; device = 'wasm'; asr = await T.pipeline('automatic-speech-recognition', m.model, { ...opts, device: 'wasm', dtype: 'q8' }); }
      self.postMessage({ type: 'ready', device });
    } else if (m.type === 'transcribe') {
      const t0 = performance.now();
      // bölüt zaman damgaları: tamamlanan bölütler kesinleştirilip tampon kırpılır
      const out = await asr(m.audio, { language: 'turkish', task: 'transcribe', return_timestamps: true, no_repeat_ngram_size: 3 });
      const chunks = (out.chunks || []).map((c) => ({ text: (c.text || '').trim(), t0: c.timestamp?.[0] ?? 0, t1: c.timestamp?.[1] ?? null }));
      self.postMessage({ type: 'result', id: m.id, text: (out.text || '').trim(), chunks, ms: performance.now() - t0, dur: m.audio.length / 16000 });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, message: err.message || String(err) });
  }
};
