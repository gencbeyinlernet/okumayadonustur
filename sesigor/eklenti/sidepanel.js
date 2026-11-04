// SESİGÖR yan paneli
import { CaptionPanel } from './core/panel.js';

const $ = (s) => document.querySelector(s);
const panel = new CaptionPanel($('#panel'), { showPosition: false });
const status = (t) => { $('#status').textContent = t; };

$('#start').onclick = async () => {
  status('Başlatılıyor…'); $('#start').disabled = true;
  const r = await chrome.runtime.sendMessage({ to: 'sw', type: 'start', keepAudio: $('#keep').checked });
  if (!r || !r.ok) { status('Başlatılamadı: ' + (r && r.error ? r.error : 'bilinmeyen hata')); $('#start').disabled = false; return; }
  $('#stop').disabled = false; $('#export').disabled = false;
};
$('#stop').onclick = async () => { await chrome.runtime.sendMessage({ to: 'sw', type: 'stop' }); $('#start').disabled = false; $('#stop').disabled = true; };
$('#export').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ to: 'sw', type: 'export' });
  if (!r || !r.ok) return status('Kayıt alınamadı.');
  const blob = new Blob([JSON.stringify({ ...r.log, network: r.network }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `SESIGOR_oturum_${new Date().toISOString().replace(/[:.]/g, '-')}.json`; a.click();
  status(`Kayıt indirildi. Oturum sırasında dış ağ isteği: ${r.network.external.length}`);
};

chrome.runtime.onMessage.addListener((m) => {
  if (m.to !== 'panel') return;
  if (m.type === 'final') panel.addLine(m.line);
  else if (m.type === 'interim') panel.setInterim(m.data);
  else if (m.type === 'event') panel.addEvent(m.ev);
  else if (m.type === 'active') panel.setActive(m.list);
  else if (m.type === 'status') { status(m.text); if (m.running === false) { $('#start').disabled = false; $('#stop').disabled = true; } }
});
