// SESİGÖR yönlendirme
import { renderSunum, stopSunum } from './sunum.js';
import { $ } from './ui.js';

const app = $('#app'), nav = $('#topnav');
let current = null;

function setNav(a) {
  nav.innerHTML = [['sunum', '🎞️ Sunum'], ['uygulama', '▶️ Uygulama'], ['eklenti', '🧩 Eklenti'], ['degerlendirme', '📏 Değerlendirme'], ['pilot', '👥 Kullanıcı pilotu']]
    .map(([k, n]) => `<a href="#/${k}" class="${k === a ? 'on' : ''}">${n}</a>`).join('');
}

async function route() {
  stopSunum();
  if (current && current.stop) current.stop();
  current = null;
  const [p0, p1] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const v = p0 || 'sunum';
  document.body.dataset.view = v; setNav(v); window.scrollTo(0, 0);
  if (v === 'uygulama') { const m = await import('./uygulama.js'); await m.renderUygulama(app); current = { stop: m.stopUygulama }; return; }
  if (v === 'eklenti') { const m = await import('./eklenti.js'); return m.renderEklenti(app); }
  if (v === 'degerlendirme') { const m = await import('./degerlendirme.js'); return m.renderDegerlendirme(app, p1); }
  if (v === 'pilot') { const m = await import('./pilot.js'); return m.renderPilot(app); }
  renderSunum(app, +p1 || 1);
}
window.addEventListener('hashchange', route);
route();
