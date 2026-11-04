// YOLİZİ yönlendirme
import { renderAnaliz } from './analiz.js';
import { renderSunum, stopSunum } from './sunum.js';
import { $, toast } from './ui.js';
window.addEventListener('yolizi-save-error', () => toast('Tarayıcı deposu dolu: verileri “Dışa aktar” bölümünden yedekleyin.', 5000));

const app = $('#app'), nav = $('#topnav');
let scene = null;

function setNav(active) {
  nav.innerHTML = [['sunum', '🎞️ Sunum'], ['analiz', '🗺️ Analiz'], ['sahne', '🥽 3B / VR sahne'], ['veri', 'ℹ️ Veri ve yöntem']]
    .map(([k, n]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${n}</a>`).join('');
}

async function route() {
  stopSunum();
  if (scene) { scene.dispose(); scene = null; }
  $('#overlay').hidden = true;
  const [p0, p1] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const view = p0 || 'sunum';
  document.body.dataset.view = view;
  setNav(view);
  window.scrollTo(0, 0);
  if (view === 'analiz') return renderAnaliz(app, p1);
  if (view === 'sahne') { const m = await import('./sahne.js'); scene = await m.renderSahne(app); return; }
  if (view === 'veri') { const m = await import('./veri.js'); return m.renderVeri(app); }
  return renderSunum(app, +p1 || 1);
}
window.addEventListener('hashchange', route);
route();
