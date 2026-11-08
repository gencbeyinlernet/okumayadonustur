// SESİZİ: yönlendirme, öğretmen girişi, öğrenci ekranları, oturum süresi.
import { MODULES, MODULE_BY_ID, ALL_LETTERS, GROUPS } from './data.js';
import { getState, codes, student, isUnlocked, startSession, endSession, sessionMinutes, save, totalStars, lettersDone, resetAll } from './store.js';
import { runModule, stopActivity } from './activities.js';
import { renderMap, runLesson, letterState } from './lesson.js';
import { openCertificate, certTitle } from './certificate.js';
import { renderTeacher, loadRecordingKeys } from './teacher.js';
import { whenBundledReady } from './audio.js';
import { renderSunum, stopSunum } from './sunum.js';
import { $, $$, esc, modal, toast, confirmBox } from './ui.js';

const app = $('#app');
const nav = $('#topnav');

// ---- öğretmen oturumu ----
const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* yok */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* yok */ } },
};
const teacher = () => getState().teacher;
const loggedIn = () => !!teacher() && ss.get('sesizi.auth') === '1';
const teacherMode = () => loggedIn() && ss.get('sesizi.tmode') === '1';
export function logout() { ss.del('sesizi.auth'); ss.del('sesizi.tmode'); }

/** Öğretmen PIN doğrulaması (öğrenci ekranından gözetim kipine geçerken). */
function askPin() {
  return new Promise((res) => {
    if (!teacher()) { toast('Önce öğretmen hesabını oluşturun.'); location.hash = '#/ogretmen'; return res(false); }
    if (loggedIn()) return res(true);
    const { box } = modal(`<h3>👩‍🏫 Öğretmen girişi</h3><p class="muted">${esc(teacher().name || 'Öğretmen')}</p>
      <input type="password" inputmode="numeric" class="pin-input" data-pin autofocus aria-label="PIN">
      <div class="row end"><button class="btn ghost" data-close>Vazgeç</button><button class="btn primary" data-ok>Giriş</button></div>`, { onClose: () => res(false) });
    const inp = $('[data-pin]', box);
    const go = () => {
      if (inp.value === teacher().pin) { ss.set('sesizi.auth', '1'); box.closest('#overlay').hidden = true; box.remove(); res(true); }
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
    <p>Güzel çalıştın. Gözlerimizi dinlendirme zamanı. Kaldığın yerden sonra devam edeceksin.</p>
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
const enc = encodeURIComponent;

function viewHome() {
  setNav('uygulama');
  const S = getState();
  const T = S.teacher;
  app.innerHTML = `
  <section class="home">
    <div class="hero">
      <div class="logo-big" aria-hidden="true"><span>ses</span><span>izi</span></div>
      <div>
        <h1>SESİZİ</h1>
        <p class="lead">İlk okuma yazma sürecinde sesten harfe ve kelimeye aşamalı dijital etkinlikler</p>
        <p class="muted">${T && T.className ? esc(T.className) + (T.school ? ' · ' + esc(T.school) : '') + ' · ' : ''}Öğretmen gözetiminde, ${S.settings.sessionMinutes} dakikalık kısa oturumlar için. Harf sırası: 2024 Türkçe dersi öğretim programı.</p>
      </div>
    </div>
    ${!T ? `<div class="banner">👩‍🏫 İlk kullanım: öğretmen hesabını oluşturup sınıfın geldiği harfi seçin. <a class="btn tiny primary" href="#/ogretmen">Öğretmen hesabı oluştur</a></div>` : ''}
    <h2 class="section-title">Öğrenci kodunu seç</h2>
    <div class="codes">${codes().map((c) => {
      const s = S.students[c];
      const done = s ? lettersDone(c) : 0;
      const stars = s ? totalStars(c) : 0;
      return `<a class="code-btn" href="#/ogrenci/${enc(c)}"><b>${c}</b>
        <span class="mini-bar" aria-label="${done} harf"><i style="width:${(100 * done) / ALL_LETTERS.length}%"></i></span>
        <small>${done}/${ALL_LETTERS.length} harf · ⭐ ${stars}</small></a>`;
    }).join('')}</div>
    <p class="muted center">Öğrenci adları kullanılmaz; her öğrenci yalnızca koduyla izlenir.</p>
  </section>`;
}

function studentHead(code, active) {
  const tm = teacherMode();
  return `<div class="row between hub-head">
    <nav class="seg" aria-label="Öğrenci menüsü">
      <a class="${active === 'yol' ? 'on' : ''}" href="#/ogrenci/${enc(code)}">🗺️ Harf yolculuğu</a>
      <a class="${active === 'mod' ? 'on' : ''}" href="#/ogrenci/${enc(code)}/moduller">🧩 Serbest çalışma</a>
      <a class="${active === 'belge' ? 'on' : ''}" href="#/ogrenci/${enc(code)}/belgeler">🏅 Belgelerim</a>
    </nav>
    <div class="row">
      <button class="btn ${tm ? 'primary' : 'ghost'}" data-tm>${tm ? '👩‍🏫 Gözetim: açık' : '👩‍🏫 Öğretmen gözetimi'}</button>
      <button class="btn ghost" data-exit>Oturumu bitir</button>
    </div>
  </div>`;
}
function bindStudentHead(code, rerender) {
  $('[data-tm]', app).onclick = async () => {
    if (teacherMode()) { ss.del('sesizi.tmode'); return rerender(); }
    if (await askPin()) { ss.set('sesizi.tmode', '1'); rerender(); }
  };
  $('[data-exit]', app).onclick = () => { endSession(code); stopTimer(); currentCode = null; location.hash = '#/uygulama'; };
}
function studentNav(code) {
  setNav('uygulama', `<span class="chip">${esc(code)}</span><span class="chip session" id="session-chip"></span>`);
  startTimer(code);
}

function viewJourney(code) {
  student(code); save();
  studentNav(code);
  const holder = document.createElement('div');
  app.innerHTML = studentHead(code, 'yol');
  app.appendChild(holder);
  renderMap(holder, code, { teacher: teacherMode() });
  bindStudentHead(code, () => viewJourney(code));
}

function viewHub(code) {
  const s = student(code);
  save();
  const tm = teacherMode();
  studentNav(code);
  app.innerHTML = `${studentHead(code, 'mod')}
  <section class="hub">
    <p class="muted">Yedi modülde, sınıfın öğrendiği bütün seslerle serbest çalışma. Her modülde art arda ipucusuz doğru yanıtlarla aşama geçilir.</p>
    <ol class="flow">${MODULES.map((m, i) => {
      const ms = s.modules[m.id];
      const open = tm || isUnlocked(code, m.id);
      const st = Math.min(ms.stage, m.stages.length - 1);
      return `<li class="flow-item">
        <a class="mod-card ${open ? '' : 'locked'} ${ms.done ? 'done' : ''}" style="--mc:${m.color}" ${open ? `href="#/ogrenci/${enc(code)}/${m.id}"` : 'aria-disabled="true"'}>
          <span class="mod-no">${m.no}</span>
          <span class="mod-icon">${open ? m.icon : '🔒'}</span>
          <b>${esc(m.title)}</b>
          <small>${esc(m.skill)}</small>
          <span class="mod-state">${ms.done ? '✓ Tamamlandı' : open ? (m.stages.length > 1 ? `Aşama ${st + 1}/${m.stages.length}` : (ms.attempts ? 'Devam' : 'Başla')) : 'Kilitli'}</span>
        </a>${i < MODULES.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}</li>`;
    }).join('')}</ol>
    <p class="muted center">Öğretmen, öğrencinin ihtiyacına göre önceki etkinliğe dönebilir veya uygun bir sonraki etkinliği açabilir.</p>
  </section>`;
  bindStudentHead(code, () => viewHub(code));
  $$('.mod-card.locked', app).forEach((a) => a.onclick = () => toast('Bu etkinliği öğretmenin açabilir.'));
}

function viewCerts(code) {
  const s = student(code);
  studentNav(code);
  const keys = [...GROUPS.map((g) => 'g' + g.id), 'final'];
  app.innerHTML = `${studentHead(code, 'belge')}
  <section class="certs">
    <h2>🏅 Belgelerim</h2>
    <div class="cert-grid">${keys.map((k) => {
      const got = s.certs[k];
      const g = GROUPS.find((x) => 'g' + x.id === k);
      return `<button class="cert-tile ${got ? 'got' : ''}" data-k="${k}" style="--cc:${g ? g.color : '#ca8a04'}" ${got ? '' : 'disabled'}>
        <span class="medal">${got ? (k === 'final' ? '🏆' : '🏅') : '🔒'}</span>
        <b>${esc(certTitle(k))}</b>
        <small>${got ? new Date(got).toLocaleDateString('tr-TR') : g ? `${g.letters.filter((c) => (s.lessons[c] || {}).done).length}/${g.letters.length} harf` : `${lettersDone(code)}/${ALL_LETTERS.length} harf`}</small>
      </button>`;
    }).join('')}</div>
  </section>`;
  bindStudentHead(code, () => viewCerts(code));
  $$('.cert-tile.got', app).forEach((b) => b.onclick = () => openCertificate(code, b.dataset.k));
}

function viewActivity(code, mid) {
  if (!MODULE_BY_ID[mid]) return viewHub(code);
  if (!teacherMode() && !isUnlocked(code, mid)) { toast('Bu etkinlik henüz açılmadı.'); location.hash = `#/ogrenci/${enc(code)}/moduller`; return; }
  studentNav(code);
  runModule(app, code, mid, { teacher: teacherMode(), onBack: () => { location.hash = `#/ogrenci/${enc(code)}/moduller`; } });
}

function viewLesson(code, ch) {
  if (!ALL_LETTERS.includes(ch)) { location.hash = `#/ogrenci/${enc(code)}`; return; }
  if (letterState(code, ch, teacherMode()) === 'locked') { toast('Bu harfi öğretmenin açınca çalışabilirsin.'); location.hash = `#/ogrenci/${enc(code)}`; return; }
  studentNav(code);
  runLesson(app, code, ch, { teacher: teacherMode(), onBack: () => { location.hash = `#/ogrenci/${enc(code)}`; } });
}

// ---- öğretmen hesabı ----
function viewTeacherSetup() {
  setNav('ogretmen');
  app.innerHTML = `
  <section class="auth">
    <div class="auth-card">
      <h2>👩‍🏫 Öğretmen hesabı oluştur</h2>
      <p class="muted">Hesap bilgileri ve öğrenci verileri yalnızca bu cihazda saklanır; sunucuya gönderilmez. Bilgiler başarı belgelerinde kullanılır.</p>
      <label class="field">Ad soyad<input data-f="name" maxlength="60" autocomplete="name"></label>
      <label class="field">Okul<input data-f="school" maxlength="80"></label>
      <div class="row2">
        <label class="field">Sınıf / şube<input data-f="className" maxlength="30" placeholder="1-A"></label>
        <label class="field">Öğretim yılı<input data-f="year" maxlength="12" placeholder="2025-2026"></label>
      </div>
      <div class="row2">
        <label class="field">PIN (4–8 rakam)<input type="password" inputmode="numeric" maxlength="8" data-f="pin"></label>
        <label class="field">PIN (tekrar)<input type="password" inputmode="numeric" maxlength="8" data-f="pin2"></label>
      </div>
      <div class="row end"><button class="btn primary big" data-save>Hesabı oluştur</button></div>
    </div>
  </section>`;
  $('[data-save]', app).onclick = () => {
    const v = Object.fromEntries($$('[data-f]', app).map((i) => [i.dataset.f, i.value.trim()]));
    if (!v.name) return toast('Ad soyad gerekli.');
    if (!/^\d{4,8}$/.test(v.pin)) return toast('PIN 4–8 rakamdan oluşmalı.');
    if (v.pin !== v.pin2) return toast('PIN kodları aynı değil.');
    getState().teacher = { name: v.name, school: v.school, className: v.className, year: v.year, pin: v.pin, created: Date.now() };
    save();
    ss.set('sesizi.auth', '1');
    toast('Hesap oluşturuldu. Sınıfın geldiği harfi seçin.');
    location.hash = '#/ogretmen/sinif';
    route();
  };
}

function viewTeacherLogin(next) {
  setNav('ogretmen');
  const T = teacher();
  app.innerHTML = `
  <section class="auth">
    <div class="auth-card narrow">
      <h2>👩‍🏫 Öğretmen girişi</h2>
      <p class="lead">${esc(T.name || 'Öğretmen')}</p>
      <p class="muted">${esc([T.school, T.className, T.year].filter(Boolean).join(' · '))}</p>
      <label class="field">PIN<input type="password" inputmode="numeric" maxlength="8" class="pin-input" data-pin autofocus></label>
      <div class="row between"><button class="btn ghost tiny" data-forgot>PIN’imi unuttum</button><button class="btn primary big" data-ok>Giriş</button></div>
    </div>
  </section>`;
  const inp = $('[data-pin]', app);
  const go = () => {
    if (inp.value === T.pin) { ss.set('sesizi.auth', '1'); next(); }
    else { inp.value = ''; toast('PIN hatalı'); }
  };
  $('[data-ok]', app).onclick = go;
  inp.onkeydown = (e) => e.key === 'Enter' && go();
  setTimeout(() => inp.focus(), 50);
  $('[data-forgot]', app).onclick = async () => {
    if (await confirmBox('PIN, güvenlik nedeniyle kurtarılamaz. Bu cihazdaki bütün SESİZİ verileri (öğrenci ilerlemesi, ölçmeler, ayarlar) silinip hesap yeniden oluşturulsun mu? Ses kayıtları korunur.', 'Verileri sil')) {
      resetAll(); logout(); route();
    }
  };
}

function viewTeacher(tab, arg) {
  if (!teacher()) return viewTeacherSetup();
  if (!loggedIn()) return viewTeacherLogin(() => viewTeacher(tab, arg));
  setNav('ogretmen');
  renderTeacher(app, tab, arg, { logout: () => { logout(); toast('Çıkış yapıldı'); location.hash = '#/uygulama'; } });
}

// ---- yönlendirici ----
function route() {
  stopActivity();
  stopSunum();
  $('#overlay').hidden = true;
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [p0, p1, p2, p3] = parts;
  document.body.dataset.view = p0 || 'sunum';
  window.scrollTo(0, 0);
  if (p0 !== 'ogrenci') stopTimer();
  switch (p0) {
    case 'uygulama': return viewHome();
    case 'ogrenci':
      if (!codes().includes(p1)) { location.hash = '#/uygulama'; return; }
      if (!p2) return viewJourney(p1);
      if (p2 === 'moduller') return viewHub(p1);
      if (p2 === 'belgeler') return viewCerts(p1);
      if (p2 === 'harf') return viewLesson(p1, p3);
      return viewActivity(p1, p2);
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
