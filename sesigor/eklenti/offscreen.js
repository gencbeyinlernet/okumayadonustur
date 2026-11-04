// Ekran dışı belge: sekme sesini yakalar, cihaz üzerinde işler, sonuçları yan panele iletir.
import { Pipeline, captureStream } from './core/pipeline.js';

const base = chrome.runtime.getURL('');
let pipe = null, cap = null, stream = null, t0 = 0, netStart = 0;
const send = (type, data) => chrome.runtime.sendMessage({ to: 'panel', type, ...data }).catch(() => {});

async function start({ streamId, keepAudio, rules }) {
  await stop();
  send('status', { text: 'Modeller yükleniyor…' });
  pipe = new Pipeline({ base, rules: rules || undefined, clock: () => (performance.now() - t0) / 1000 });
  pipe.addEventListener('final', (e) => send('final', { line: e.detail }));
  pipe.addEventListener('interim', (e) => send('interim', { data: e.detail }));
  pipe.addEventListener('event', (e) => send('event', { ev: e.detail }));
  pipe.addEventListener('active', (e) => send('active', { list: e.detail }));
  pipe.addEventListener('error', (e) => send('status', { text: 'Hata: ' + (e.detail?.message || e.detail) }));
  await pipe.init((p) => { if (p.status === 'progress' && p.total) send('status', { text: `Model yükleniyor: ${p.file} %${Math.round(p.progress)}` }); });
  stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }, video: false });
  t0 = performance.now();
  netStart = performance.getEntriesByType('resource').length;
  pipe.start();
  cap = await captureStream(stream, base, (c) => pipe.push(c), { passthrough: keepAudio });
  send('status', { text: `Çalışıyor (${pipe.device === 'webgpu' ? 'WebGPU' : 'WASM'})`, running: true });
}

async function stop() {
  if (cap) { cap.stop(); await cap.ctx.close().catch(() => {}); cap = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (pipe) { await pipe.finish(); pipe.stop(); }
  send('status', { text: 'Durduruldu', running: false });
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.to !== 'offscreen') return;
  if (msg.type === 'ping') { reply(true); return; }
  if (msg.type === 'start') start(msg).then(() => reply({ ok: true })).catch((e) => { send('status', { text: 'Başlatılamadı: ' + e.message }); reply({ ok: false, error: e.message }); });
  else if (msg.type === 'stop') stop().then(() => reply({ ok: true }));
  else if (msg.type === 'export') {
    // ağ denetimi: oturum başladıktan sonraki bütün istekler (eklenti içi dosyalar dışında olmamalı)
    const net = performance.getEntriesByType('resource').slice(netStart).map((e) => e.name);
    reply(pipe ? { ok: true, log: pipe.exportLog(), network: { during_session: net, external: net.filter((u) => !u.startsWith(base)) } } : { ok: false });
  }
  return true;
});
