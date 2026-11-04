// SESİZİ: yönlendirme, öğrenci ekranları, oturum süresi.
import { MODULES, MODULE_BY_ID } from './data.js';
import { getState, codes, student, isUnlocked, startSession, endSession, sessionMinutes, save } from './store.js';
import { runModule, stopActivity } from './activities.js';
import { renderTeacher, loadRecordingKeys } from './teacher.js';
import { whenBundledReady } from './audio.js';
import { renderSunum, stopSunum } from './sunum.js';
import { $, $$, esc, modal, toast } from './ui.js';

const app = $('#app');
const nav = $('#topnav');

// ---- öğretmen gözetimi kipi ve PIN ----
const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* yok */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* yok */ } },
};
const teacherMode = () => ss.get('sesizi.tmode') === '1';
const pinOk = () => !getState().settings.pin || ss.get('sesizi.pin') === '1';

function askPin() {
  return new Promise((res) => {
    if (pinOk()) return res(true);
    const { box, close } = modal(`<h3>Öğretmen PIN kodu</h3>
      <input type="password" inputmode="numeric" class="pin-input" data-pin autofocus aria-label="PIN">
      <div class="row end"><button class="btn ghost" data-close>Vazgeç</button><button class="btn primary" data-ok>Aç</button></div>`, { onClose: () => res(false) });
    const inp = $('[data-pin]', box);
    const go = () => {
      if (inp.value === getState().settings.pin) { ss.set('sesizi.pin', '1'); box.closest('#overlay').hidden = true; box.remove(); res(true); }
      else { inp.value = ''; toast('PIN hatalı'); }
    };
    $('[data-ok]', box).onclick = go;
    inp.onkeydown = (e) => e.key === 'Enter' && go();
    setTimeout(() => inp.focus(), 50);
  });
}

// ---- oturum süresi ----
let sessionTimer = null;
let currentCode = null;
let extended = 0;
function startTimer(code) {
  if (currentCode !== code) { extended = 0; }
  currentCode = code;
  const ses = startSession(code);
  clearInterval(sessionTimer);
  const tick = () => {
    const st = getState().settings;
    const chip = $('#session-chip');
    const used = sessionMinutes(ses);
    const limit = st.sessionMinutes + extended;
    const left = Math.max(0, Math.ceil(limit - used));
    if (chip) chip.innerHTML = `⏱ ${st.sessionLimit ? left + ' dk' : Math.floor(used) + ' dk'}`;
    if (st.sessionLimit && used >= limit && !$('#overlay .time-up')) timeUp(code);
  };
  tick();
  sessionTimer = setInterval(tick, 15000);
}
function stopTimer() { clearInterval(sessionTimer); sessionTimer = null; }
function timeUp(code) {
  stopActivity();
  const { box, close } = modal(`<div class="time-up"><div class="big-emoji">🌙</div><h3>Bugünlük bu kadar!</h3>
    <p>Güzel çalıştın. Gözlerimizi dinlendirme zamanı.</p>
    <div class="row center"><button class="btn primary big" data-end>Oturumu bitir</button><button class="btn ghost" data-ext>Öğretmen: 5 dk uzat</button></div></div>`);
  $('[data-end]', box).onclick = () => { close(); endSession(code); stopTimer(); currentCode = null; location.hash = '#/uygulama'; };
  $('[data-ext]', box).onclick = async () => { close(); if (await askPin()) { extended += 5; toast('Oturum 5 dakika uzatıldı'); route(); } else timeUp(code); };
}

// ---- ekranlar ----
function setNav(active, extra = '') {
  nav.innerHTML = `
    <a href="#/sunum" class="${active === 'sunum' ? 'on' : ''}">🎞️ Sunum</a>
    <a href="#/uygulama" class="${active === 'uygulama' ? 'on' : ''}">🧒 Uygulama</a>
    <a href="#/ogretmen" class="${active === 'ogretmen' ? 'on' : ''}">👩‍🏫 Öğretmen</a>
    ${extra}`;
}

function viewHome() {
  setNav('uygulama');
  const S = getState();
  app.innerHTML = `
  <section class="home">
    <div class="hero">
      <div class="logo-big" aria-hidden="true"><span>ses</span><span>izi</span></div>
      <div>
        <h1>SESİZİ</h1>
        <p class="lead">İlk okuma yazma sürecinde sesten harfe ve kelimeye aşamalı dijital etkinlikler</p>
        <p class="muted">Öğretmen gözetiminde, ${S.settings.sessionMinutes} dakikalık kısa oturumlar için.</p>
      </div>
    </div>
    <h2 class="section-title">Öğrenci kodunu seç</h2>
    <div class="codes">${codes().map((c) => {
      const s = S.students[c];
      const done = s ? MODULES.filter((m) => s.modules[m.id] && s.modules[m.id].done).length : 0;
      return `<a class="code-btn" href="#/ogrenci/${encodeURIComponent(c)}"><b>${c}</b><span class="dots">${MODULES.map((m, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</span></a>`;
    }).join('')}</div>
    <p class="muted center">Öğrenci adları kullanılmaz; her öğrenci yalnızca koduyla izlenir.</p>
  </section>`;
}

function viewHub(code) {
  const s = student(code);
  save();
  const tm = teacherMode();
  setNav('uygulama', `<span class="chip session" id="session-chip"></span>`);
  startTimer(code);
  app.innerHTML = `
  <section class="hub">
    <div class="row between hub-head">
      <div><h2>Merhaba ${esc(code)} 👋</h2><p class="muted">Bir etkinlik seç.</p></div>
      <div class="row">
        <button class="btn ${tm ? 'primary' : 'ghost'}" data-tm>${tm ? '👩‍🏫 Öğretmen gözetimi: açık' : '👩‍🏫 Öğretmen gözetimi'}</button>
        <button class="btn ghost" data-exit>Oturumu bitir</button>
      </div>
    </div>
    <ol class="flow">${MODULES.map((m, i) => {
      const ms = s.modules[m.id];
      const open = tm || isUnlocked(code, m.id);
      const st = Math.min(ms.stage, m.stages.length - 1);
      return `<li class="flow-item">
        <a class="mod-card ${open ? '' : 'locked'} ${ms.done ? 'done' : ''}" style="--mc:${m.color}" ${open ? `href="#/ogrenci/${encodeURIComponent(code)}/${m.id}"` : 'aria-disabled="true"'}>
          <span class="mod-no">${m.no}</span>
          <span class="mod-icon">${open ? m.icon : '🔒'}</span>
          <b>${esc(m.title)}</b>
          <small>${esc(m.skill)}</small>
          <span class="mod-state">${ms.done ? '✓ Tamamlandı' : open ? (m.stages.length > 1 ? `Aşama ${st + 1}/${m.stages.length}` : (ms.attempts ? 'Devam' : 'Başla')) : 'Kilitli'}</span>
        </a>${i < MODULES.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}</li>`;
    }).join('')}</ol>
    <p class="muted center">Öğretmen, öğrencinin ihtiyacına göre önceki etkinliğe dönebilir veya uygun bir sonraki etkinliği açabilir.</p>
  </section>`;
  $('[data-tm]', app).onclick = async () => {
    if (teacherMode()) { ss.del('sesizi.tmode'); return viewHub(code); }
    if (await askPin()) { ss.set('sesizi.tmode', '1'); viewHub(code); }
  };
  $('[data-exit]', app).onclick = () => { endSession(code); stopTimer(); currentCode = null; location.hash = '#/uygulama'; };
  $$('.mod-card.locked', app).forEach((a) => a.onclick = () => toast('Bu etkinliği öğretmenin açabilir.'));
}

function viewActivity(code, mid) {
  if (!MODULE_BY_ID[mid]) return viewHub(code);
  if (!teacherMode() && !isUnlocked(code, mid)) { toast('Bu etkinlik henüz açılmadı.'); location.hash = `#/ogrenci/${encodeURIComponent(code)}`; return; }
  setNav('uygulama', `<span class="chip">${esc(code)}</span><span class="chip session" id="session-chip"></span>`);
  startTimer(code);
  runModule(app, code, mid, { teacher: teacherMode(), onBack: () => { location.hash = `#/ogrenci/${encodeURIComponent(code)}`; } });
}

async function viewTeacher(tab, arg) {
  setNav('ogretmen');
  if (!(await askPin())) { location.hash = '#/uygulama'; return; }
  renderTeacher(app, tab, arg);
}

// ---- yönlendirici ----
function route() {
  stopActivity();
  stopSunum();
  $('#overlay').hidden = true;
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [p0, p1, p2] = parts;
  document.body.dataset.view = p0 || 'sunum';
  window.scrollTo(0, 0);
  if (p0 !== 'ogrenci') stopTimer();
  switch (p0) {
    case 'uygulama': return viewHome();
    case 'ogrenci':
      if (!codes().includes(p1)) { location.hash = '#/uygulama'; return; }
      return p2 ? viewActivity(p1, p2) : viewHub(p1);
    case 'ogretmen':
      return viewTeacher(p1, p2);
    case 'sunum':
    case '':
    case undefined:
      setNav('sunum');
      return renderSunum(app, +p1 || 1);
    default:
      location.hash = '#/sunum';
  }
}

window.addEventListener('hashchange', route);
Promise.allSettled([loadRecordingKeys(), whenBundledReady()]).finally(route);
