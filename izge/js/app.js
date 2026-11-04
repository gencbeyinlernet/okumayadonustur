// İZGE yönlendirme
import { renderSunum, stopSunum } from './sunum.js';
import { $, toast } from './ui.js';
window.addEventListener('izge-save-error', () => toast('Tarayıcı deposu dolu: “Deney → Dışa aktar” ile yedekleyin.', 5000));

const app = $('#app'), nav = $('#topnav');
let stopper = null;
function setNav(a) { nav.innerHTML = [['sunum', '🎞️ Sunum'], ['olcum', '🔬 Ölçüm'], ['deney', '🧪 Deney ve analiz'], ['araclar', '📐 Optik araçlar']].map(([k, n]) => `<a href="#/${k}" class="${k === a ? 'on' : ''}">${n}</a>`).join(''); }
async function route() {
  stopSunum(); if (stopper) { stopper(); stopper = null; }
  const [p0, p1] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const v = p0 || 'sunum'; document.body.dataset.view = v; setNav(v); window.scrollTo(0, 0);
  if (v === 'olcum') { const m = await import('./olcum.js'); m.renderOlcum(app); stopper = m.stopOlcum; return; }
  if (v === 'deney') { const m = await import('./deney.js'); return m.renderDeney(app, p1); }
  if (v === 'araclar') { const m = await import('./araclar.js'); return m.renderAraclar(app); }
  renderSunum(app, +p1 || 1);
}
window.addEventListener('hashchange', route);
route();
