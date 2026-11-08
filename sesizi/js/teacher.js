// Öğretmen paneli: sınıf ayarları, ilerleme, içerik kontrolü, ölçme (ön test–son test), veri.
import { GROUPS, MODULES, WORDS, SENTENCES, TEXTS, ALL_LETTERS, VOWELS, upper, sentenceText, textBody, letterIndex, CURRICULUM } from './data.js';
import {
  getState, save, codes, student, setUnlocked, resetStudent, resetAll, replaceState, learnedLetters,
  availableWords, availableSentences, availableSyllables, availableTexts, sessionMinutes, upToIndex, totalStars, lettersDone,
} from './store.js';
import { certTitle, openCertificate, printCertificates } from './certificate.js';
import {
  playLetter, playWord, play, hasRecording, saveRecording, deleteRecording, recordingCount, loadRecordingKeys,
  soundKey, wordKey, sentenceKey, Recorder, canRecord, hasTurkishVoice, ttsAvailable, hasBundled, bundledCount, whenBundledReady,
} from './audio.js';
import { letterSVG } from './strokes.js';
import { mean, sd, wilcoxon, SKILLS } from './stats.js';
import { $, $$, h, esc, toast, modal, confirmBox, download, toCSV, pct, fmt } from './ui.js';

const TABS = [
  ['sinif', '⚙️ Sınıf ve müfredat'],
  ['ilerleme', '📈 İlerleme'],
  ['belgeler', '🏅 Belgeler'],
  ['icerik', '🔤 İçerik kontrolü'],
  ['olcme', '📊 Ölçme ve analiz'],
  ['veri', '💾 Veri'],
];

let onLogout = () => {};
export function renderTeacher(root, tab = 'sinif', arg, { logout } = {}) {
  if (logout) onLogout = logout;
  if (!TABS.some(([id]) => id === tab)) tab = 'sinif';
  const T = getState().teacher || {};
  root.innerHTML = `
  <section class="teacher">
    <div class="t-head row between">
      <div><h2>Öğretmen paneli</h2>
      <p class="muted">👩‍🏫 <b>${esc(T.name || '')}</b>${T.school ? ' · ' + esc(T.school) : ''}${T.className ? ' · ' + esc(T.className) : ''}${T.year ? ' · ' + esc(T.year) : ''}</p></div>
      <button class="btn ghost" data-logout>Çıkış yap</button></div>
    <nav class="tabs" role="tablist">${TABS.map(([id, n]) => `<a class="tab ${id === tab ? 'on' : ''}" href="#/ogretmen/${id}">${n}</a>`).join('')}</nav>
    <div class="t-body" data-tbody></div>
  </section>`;
  const body = $('[data-tbody]', root);
  $('[data-logout]', root).onclick = () => onLogout();
  ({ sinif, ilerleme, belgeler, icerik, olcme, veri })[tab](body, arg);
}

// ================= Sınıf ve müfredat =================
/** 2024 programındaki önerilen sürelere göre (6, 4, 2, 2, 2 hafta) harflerin plan haftaları. */
export function letterPlan() {
  const out = [];
  let w0 = 0;
  GROUPS.forEach((g) => {
    const per = g.weeks / g.letters.length;
    g.letters.forEach((c, i) => out.push({ ch: c, g: g.id, from: w0 + i * per, to: w0 + (i + 1) * per }));
    w0 += g.weeks;
  });
  return out;
}
const TOTAL_WEEKS = GROUPS.reduce((a, g) => a + g.weeks, 0);

function planNow(start) {
  if (!start) return null;
  const t0 = new Date(start + 'T00:00:00');
  if (isNaN(t0)) return null;
  const week = (Date.now() - t0) / (7 * 864e5);
  const plan = letterPlan();
  const cur = plan.find((p) => week >= p.from && week < p.to) || (week >= TOTAL_WEEKS ? plan[plan.length - 1] : null);
  return { week, cur };
}

function sinif(body) {
  const S = getState();
  const st = S.settings;
  const T = S.teacher || {};
  whenBundledReady().then(() => { const b = $('[data-bundled]', body); if (b) b.textContent = bundledCount(); });
  const ttsOk = ttsAvailable() && hasTurkishVoice();
  const plan = letterPlan();
  body.innerHTML = `
  <div class="card">
    <h3>Sınıfın geldiği harf</h3>
    <p class="muted">${esc(CURRICULUM)}: harfler gruplar hâlinde ve bu sırayla verilir. Sınıfın son öğrendiği harfe dokunun; öğrenciler bu harfe kadar olan harf derslerini açabilir, etkinliklerde yalnızca bu harflerden oluşan hece, kelime, cümle ve metinler kullanılır.</p>
    <div class="letter-path">${GROUPS.map((g) => `
      <div class="lp-group" style="--gc:${g.color}">
        <div class="lp-head"><b>${g.id}. grup</b> <span class="lc">${g.name}</span> <small>${g.weeks} hafta</small></div>
        <div class="lp-letters">${g.letters.map((c) => { const i = letterIndex(c); return `<button class="lp-l ${i <= st.learnedUpTo ? 'on' : ''} ${i === st.learnedUpTo ? 'cur' : ''}" data-up="${i}"><span class="lc">${upper(c)}${c}</span><small>${i + 1}</small></button>`; }).join('')}</div>
      </div>`).join('')}</div>
    <div class="avail" data-avail></div>
    <label class="check"><input type="checkbox" data-k="selfPaced" ${st.selfPaced ? 'checked' : ''}> Kendi hızında ilerleme: öğrenci bir harf dersini bitirince sıradaki harf kendiliğinden açılsın</label>
  </div>
  <div class="cards2">
    <div class="card">
      <h3>Haftalık plan (16 hafta)</h3>
      <label class="field">İlk okuma yazma başlangıç tarihi
        <input type="date" data-k="yearStart" value="${esc(st.yearStart || '')}"></label>
      <div data-plan></div>
      <details><summary>Plan tablosu</summary>
        <div class="table-wrap"><table class="stats"><thead><tr><th>Hafta</th><th>Grup</th><th>Harf</th></tr></thead><tbody>
        ${plan.map((p) => `<tr><td>${(p.from + 1).toFixed(1).replace('.0', '').replace('.', ',')}–${p.to.toFixed(1).replace('.0', '').replace('.', ',')}</td><td>${p.g}</td><td class="lc">${upper(p.ch)}${p.ch}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="muted">Programda önerilen süreler: 1. grup 6 hafta, 2. grup 4 hafta, 3., 4. ve 5. gruplar ikişer hafta. Tatiller ve sınıfın hızı hesaba katılmaz; plan yalnızca yol göstericidir.</p>
      </details>
    </div>
    <div class="card">
      <h3>Oturum ve geçiş</h3>
      <label class="field">Oturum süresi (dakika)
        <input type="number" min="5" max="40" step="1" data-k="sessionMinutes" value="${st.sessionMinutes}"></label>
      <label class="check"><input type="checkbox" data-k="sessionLimit" ${st.sessionLimit ? 'checked' : ''}> Süre dolunca oturumu nazikçe bitir</label>
      <label class="field">Aşama geçiş ölçütü (art arda ipucusuz doğru yanıt)
        <input type="number" min="1" max="10" data-k="passStreak" value="${st.passStreak}"></label>
      <label class="field">Öğrenci sayısı
        <input type="number" min="1" max="60" data-k="studentCount" value="${st.studentCount}"></label>
      <label class="field">Bağımsız yaz etkinliğinde harf
        <select data-k="writeMode">
          <option value="karisik" ${st.writeMode === 'karisik' ? 'selected' : ''}>Karışık (gösterilen veya söylenen)</option>
          <option value="goster" ${st.writeMode === 'goster' ? 'selected' : ''}>Gösterilir</option>
          <option value="soyle" ${st.writeMode === 'soyle' ? 'selected' : ''}>Yalnızca söylenir</option>
        </select></label>
      <label class="check"><input type="checkbox" data-k="speakFeedback" ${st.speakFeedback ? 'checked' : ''}> Geri bildirimleri sesli oku</label>
      <label class="check"><input type="checkbox" data-k="listeningMode" ${st.listeningMode ? 'checked' : ''}> Cümleler öğrenciye sesli okunuyor (“dinlediğini anlama”)</label>
    </div>
    <div class="card">
      <h3>Öğretmen hesabı</h3>
      <label class="field">Ad soyad<input data-t="name" maxlength="60" value="${esc(T.name || '')}"></label>
      <label class="field">Okul<input data-t="school" maxlength="80" value="${esc(T.school || '')}"></label>
      <div class="row2"><label class="field">Sınıf / şube<input data-t="className" maxlength="30" value="${esc(T.className || '')}"></label>
        <label class="field">Öğretim yılı<input data-t="year" maxlength="12" value="${esc(T.year || '')}"></label></div>
      <div class="row2"><label class="field">Yeni PIN<input type="password" inputmode="numeric" maxlength="8" data-np></label>
        <button class="btn" data-setpin>PIN’i değiştir</button></div>
      <p class="muted">Ad, okul ve sınıf bilgileri başarı belgelerinde yer alır. Hesap yalnızca bu cihazda tutulur.</p>
    </div>
    <div class="card">
      <h3>Ses durumu</h3>
      <p>✅ Uygulamayla gelen hazır Türkçe ses dosyası: <b data-bundled>${bundledCount()}</b> (harf sesleri, heceler, kelimeler, cümleler, sorular ve geri bildirimler).</p>
      <p>Öğretmen kaydı: <b data-reccount>${recordingCount()}</b> · Tarayıcı sesi (yedek): ${ttsOk ? 'Türkçe ses bulundu' : 'Türkçe ses yok'}</p>
      <p class="muted">Çalma önceliği: öğretmen kaydı → hazır ses → tarayıcı sesi. Ünsüzler ek bir ünlü eklenmeden seslendirilmelidir (ör. “le” değil /l/). Hazır sesler yapay zekâ ile üretilmiş ve otomatik olarak denetlenmiştir; özellikle patlamalı ünsüzleri (b, c, d, g, k, p, t, ç) dinleyip gerekirse “İçerik kontrolü” bölümünden kendi sesinizle kaydedin.</p>
    </div>
  </div>`;
  const avail = $('[data-avail]', body);
  const showAvail = () => {
    const L = learnedLetters();
    avail.innerHTML = `<p><b>Sınıf düzeyi:</b> ${L.length}. harf «${L[L.length - 1]}» · kullanılabilir içerik: ${availableSyllables().length} hece · ${availableWords().length} kelime · ${availableSentences().length} cümle · ${availableTexts().length} metin</p>`;
  };
  const showPlan = () => {
    const p = planNow(st.yearStart);
    const box = $('[data-plan]', body);
    if (!p) { box.innerHTML = '<p class="muted">Tarih girildiğinde bu haftanın plan harfi gösterilir.</p>'; return; }
    if (p.week < 0) { box.innerHTML = '<p class="muted">Başlangıç tarihi henüz gelmedi.</p>'; return; }
    const cls = st.learnedUpTo, want = letterIndex(p.cur.ch);
    box.innerHTML = `<p>📅 <b>${Math.floor(p.week) + 1}. hafta</b> · plana göre harf: <b class="lc">${upper(p.cur.ch)}${p.cur.ch}</b> · sınıf: <b class="lc">${ALL_LETTERS[cls]}</b></p>
      <p class="${cls < want - 1 ? 'warn-text' : 'muted'}">${cls < want - 1 ? 'Sınıf plana göre geride. Bu durum olağandır; tekrar ve pekiştirme için zaman ayrılabilir.' : cls > want ? 'Sınıf plandan önde.' : 'Sınıf plana uygun ilerliyor.'}</p>`;
  };
  showAvail(); showPlan();
  $$('[data-up]', body).forEach((b) => b.onclick = () => {
    st.learnedUpTo = +b.dataset.up; save();
    $$('[data-up]', body).forEach((x) => { const i = +x.dataset.up; x.classList.toggle('on', i <= st.learnedUpTo); x.classList.toggle('cur', i === st.learnedUpTo); });
    showAvail(); showPlan(); toast('Sınıfın harf düzeyi: ' + ALL_LETTERS[st.learnedUpTo]);
  });
  $$('[data-k]', body).forEach((el) => el.onchange = () => {
    const k = el.dataset.k;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') {
      v = Math.round(+v);
      v = Math.min(+el.max, Math.max(+el.min, isFinite(v) ? v : +el.min));
      el.value = v;
    }
    st[k] = v; save(); toast('Kaydedildi');
    if (k === 'yearStart') showPlan();
  });
  $$('[data-t]', body).forEach((el) => el.onchange = () => {
    S.teacher[el.dataset.t] = el.value.trim(); save(); toast('Kaydedildi');
  });
  $('[data-setpin]', body).onclick = () => {
    const v = $('[data-np]', body).value;
    if (!/^\d{4,8}$/.test(v)) return toast('PIN 4–8 rakamdan oluşmalı.');
    S.teacher.pin = v; save(); $('[data-np]', body).value = ''; toast('PIN değiştirildi');
  };
}

// ================= Belgeler =================
function belgeler(body) {
  const S = getState();
  const keys = [...GROUPS.map((g) => 'g' + g.id), 'final'];
  const has = (c, k) => S.students[c] && S.students[c].certs && S.students[c].certs[k];
  body.innerHTML = `
  <div class="card">
    <h3>Başarı belgeleri</h3>
    <p class="muted">Öğrenci bir harf grubundaki bütün harf derslerini bitirdiğinde o grubun belgesini, bütün harfleri bitirdiğinde “İlk Okuma Yazma Başarı Belgesi”ni kazanır. Belgeye yazılacak ad yazdırma sırasında girilir ve kaydedilmez.</p>
    <div class="table-wrap"><table class="stats certs-table">
      <thead><tr><th>Kod</th>${keys.map((k) => `<th>${k === 'final' ? '🏆 Okuma yazma' : '🏅 ' + k.slice(1) + '. grup'}</th>`).join('')}</tr></thead>
      <tbody>${codes().map((c) => `<tr><th>${c}</th>${keys.map((k) => has(c, k)
        ? `<td><button class="btn tiny" data-open="${c}|${k}">${new Date(has(c, k)).toLocaleDateString('tr-TR')}</button></td>`
        : `<td class="muted">–</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <h4>Toplu yazdırma</h4>
    <div class="row wrap">${keys.map((k) => {
      const n = codes().filter((c) => has(c, k)).length;
      return `<button class="btn" data-bulk="${k}" ${n ? '' : 'disabled'}>🖨️ ${esc(certTitle(k))} (${n})</button>`;
    }).join('')}</div>
    <p class="muted">Toplu yazdırmada belgelerde öğrenci kodu yer alır; adı elle yazabilirsiniz.</p>
  </div>`;
  $$('[data-open]', body).forEach((b) => b.onclick = () => { const [c, k] = b.dataset.open.split('|'); openCertificate(c, k); });
  $$('[data-bulk]', body).forEach((b) => b.onclick = () => {
    const k = b.dataset.bulk;
    printCertificates(codes().filter((c) => has(c, k)).map((c) => ({ code: c, key: k, name: '' })));
  });
}

// ================= İlerleme =================
const acc = (m) => (m.attempts ? m.correct / m.attempts : null);

function ilerleme(body, code) {
  const S = getState();
  const list = codes();
  const learned = learnedLetters();
  // Sınıf geneli harf zorluğu
  const classLetters = {};
  list.forEach((c) => {
    const s = S.students[c];
    if (!s) return;
    Object.entries(s.letters).forEach(([ch, v]) => { const a = (classLetters[ch] ||= { c: 0, w: 0 }); a.c += v.c; a.w += v.w; });
  });
  body.innerHTML = `
  <div class="card">
    <h3>Harf yolculuğu</h3>
    <p class="muted">Her hücre bir harf dersidir: ★ sayısı ilk denemedeki doğruluğu gösterir (3 ★ ≥ %90, 2 ★ ≥ %70). Mavi çerçeve öğrencinin açık olan son harfidir.</p>
    <div class="table-wrap"><table class="prog letters-table">
      <thead><tr><th>Kod</th>${GROUPS.map((g) => g.letters.map((c, i) => `<th class="lc ${i === 0 ? 'gstart' : ''}" style="--gc:${g.color}">${c}</th>`).join('')).join('')}<th>⭐</th><th>🏅</th></tr></thead>
      <tbody>${list.map((c) => {
        const s = S.students[c];
        const up = upToIndex(c);
        const cells = ALL_LETTERS.map((ch, i) => {
          const L = s && s.lessons && s.lessons[ch];
          const g = GROUPS.find((x) => x.letters.includes(ch));
          const cls = [g.letters[0] === ch ? 'gstart' : '', i === up ? 'upto' : '', i > up ? 'beyond' : ''].join(' ');
          return `<td class="${cls}" style="--gc:${g.color}">${L && L.done ? `<span class="st st${L.stars}">${'★'.repeat(L.stars)}</span>` : L && L.n ? '<small>…</small>' : ''}</td>`;
        }).join('');
        return `<tr data-code="${c}" class="${c === code ? 'sel' : ''}"><th>${c}</th>${cells}<td>${s ? totalStars(c) : 0}</td><td>${s && s.certs ? Object.keys(s.certs).length : 0}</td></tr>`;
      }).join('')}</tbody></table></div>
  </div>
  <div class="card">
    <h3>Modüllere göre ilerleme (serbest çalışma ve harf dersleri)</h3>
    <p class="muted">Öğrenciler arasında sıralama yapılmaz; hız bir başarı ölçütü değildir. Bir satıra dokunarak ayrıntıyı açın.</p>
    <div class="table-wrap"><table class="prog">
      <thead><tr><th>Kod</th>${MODULES.map((m) => `<th title="${esc(m.title)}">${m.icon}<br><small>${m.no}</small></th>`).join('')}<th>Süre</th><th>Son etkinlik</th></tr></thead>
      <tbody>${list.map((c) => {
        const s = S.students[c];
        const cells = MODULES.map((m) => {
          if (!s) return `<td class="cell-empty">${m.id === 'm1' ? '' : '🔒'}</td>`;
          const ms = s.modules[m.id];
          const lock = !s.unlocked.includes(m.id);
          const a = acc(ms);
          return `<td class="${ms.done ? 'cell-done' : ''}">${lock ? '🔒' : ms.done ? '✓' : ms.attempts ? `${Math.min(ms.stage + 1, m.stages.length)}/${m.stages.length}` : '·'}${a != null ? `<small>${pct(a)}</small>` : ''}</td>`;
        }).join('');
        const mins = s ? s.sessions.reduce((t, x) => t + sessionMinutes(x), 0) : 0;
        return `<tr data-code="${c}" class="${c === code ? 'sel' : ''}"><th>${c}</th>${cells}<td>${s ? Math.round(mins) + ' dk' : '–'}</td><td>${s && s.lastActive ? new Date(s.lastActive).toLocaleDateString('tr-TR') : '–'}</td></tr>`;
      }).join('')}</tbody></table></div>
  </div>
  <div class="card">
    <h3>Sınıf geneli: seslere göre doğruluk</h3>
    ${heat(classLetters, learned)}
  </div>
  <div data-detail></div>`;
  $$('tr[data-code]', body).forEach((tr) => tr.onclick = () => { location.hash = `#/ogretmen/ilerleme/${encodeURIComponent(tr.dataset.code)}`; });
  if (code) detail($('[data-detail]', body), code);
}

function heat(letters, learned) {
  const shown = ALL_LETTERS.filter((c) => learned.includes(c) || letters[c]);
  if (!shown.length) return '<p class="muted">Henüz veri yok.</p>';
  return `<div class="heat">${shown.map((c) => {
    const v = letters[c] || { c: 0, w: 0 };
    const n = v.c + v.w;
    const a = n ? v.c / n : null;
    const cls = a == null ? 'h-none' : a >= 0.8 ? 'h-good' : a >= 0.6 ? 'h-mid' : 'h-low';
    return `<div class="hcell ${cls}" title="${n} deneme"><span class="lc">${c}</span><small>${a == null ? '–' : pct(a)}</small><small class="n">${n}</small></div>`;
  }).join('')}</div>
  <p class="legend"><span class="hcell h-good"></span> %80 ve üzeri <span class="hcell h-mid"></span> %60–79 <span class="hcell h-low"></span> %60 altı <span class="hcell h-none"></span> veri yok</p>`;
}

function detail(box, code) {
  const s = student(code);
  const S = getState();
  const learned = learnedLetters(code);
  const hard = Object.entries(s.letters).filter(([, v]) => v.c + v.w >= 3 && v.c / (v.c + v.w) < 0.6).sort((a, b) => a[1].c / (a[1].c + a[1].w) - b[1].c / (b[1].c + b[1].w));
  // Çizim özetleri
  const dr = {};
  s.drawings.forEach((d) => { const k = d.l; (dr[k] ||= { 1: [], 2: [], 3: [], 4: [] })[d.lv].push(d.sc); });
  const notes = S.notes[code] || [];
  box.innerHTML = `
  <div class="card detail">
    <div class="row between"><h3>${code} · ayrıntı</h3>
      <div class="row"><a class="btn primary" data-start href="#/ogrenci/${encodeURIComponent(code)}">▶ Bu öğrenciyle başlat</a>
      <button class="btn danger ghost" data-reset>Verileri sıfırla</button></div></div>
    <h4>Harf düzeyi ve belgeler</h4>
    <div class="row wrap">
      <label class="field inline">Bu öğrencinin geldiği harf
        <select data-upto><option value="">Sınıf düzeyi (${ALL_LETTERS[S.settings.learnedUpTo]})</option>${ALL_LETTERS.map((c, i) => `<option value="${i}" ${s.upTo === i ? 'selected' : ''}>${i + 1}. ${c}</option>`).join('')}</select></label>
      <span class="chip">🔤 ${lettersDone(code)}/${ALL_LETTERS.length} harf</span><span class="chip">⭐ ${totalStars(code)}</span>
      ${Object.keys(s.certs).map((k) => `<button class="btn tiny" data-cert="${k}">${k === 'final' ? '🏆' : '🏅'} ${esc(certTitle(k))}</button>`).join('')}
    </div>
    <p class="muted">Öğrenciye özel düzey, sınıftan önde ya da geride olan öğrenci için kullanılır (bireysel farklılıklar).</p>
    <div class="table-wrap"><table class="stats"><thead><tr><th>Harf</th><th>Durum</th><th>Yıldız</th><th>En iyi doğruluk</th><th>Tarih</th><th></th></tr></thead><tbody>
      ${ALL_LETTERS.filter((c) => s.lessons[c]).map((c) => { const L = s.lessons[c]; return `<tr><td class="lc">${c}</td><td>${L.done ? 'Tamamlandı' : `Devam ediyor (adım ${L.step + 1})`}</td><td>${'★'.repeat(L.stars || 0) || '–'}</td><td>${L.best ? pct(L.best) : '–'}</td><td>${L.date ? new Date(L.date).toLocaleDateString('tr-TR') : '–'}</td>
        <td><button class="btn tiny ghost" data-relesson="${c}" title="Dersi sıfırla">↺</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Henüz harf dersi yok.</td></tr>'}
    </tbody></table></div>
    <h4>Modüller</h4>
    <div class="table-wrap"><table class="stats">
      <thead><tr><th>Modül</th><th>Açık</th><th>Aşama</th><th>Deneme</th><th>Doğru</th><th>Yanlış</th><th>İpuçlu doğru</th><th>İpucu</th><th>Doğruluk</th></tr></thead>
      <tbody>${MODULES.map((m) => {
        const ms = s.modules[m.id];
        return `<tr><td>${m.icon} ${esc(m.title)}</td>
          <td><label class="switch"><input type="checkbox" data-unlock="${m.id}" ${s.unlocked.includes(m.id) ? 'checked' : ''}><span></span></label></td>
          <td>${ms.done ? 'Tamamlandı' : esc(m.stages[Math.min(ms.stage, m.stages.length - 1)])}</td>
          <td>${ms.attempts}</td><td>${ms.correct}</td><td>${ms.wrong}</td><td>${ms.hintedCorrect}</td><td>${ms.hints}</td><td>${pct(acc(ms))}</td></tr>`;
      }).join('')}</tbody></table></div>
    <p class="muted">Kilidi açılan modül öğrenciye görünür. Akış katı bir sıra değildir; öğrencinin ihtiyacına göre önceki etkinliğe dönülebilir veya sonraki açılabilir.</p>
    ${s.modules.m7.extra.kurmaDogru != null ? `<p>Cümle modülü: kurma ${s.modules.m7.extra.kurmaDogru || 0} doğru / ${s.modules.m7.extra.kurmaYanlis || 0} yanlış · soru ${s.modules.m7.extra.soruDogru || 0} doğru / ${s.modules.m7.extra.soruYanlis || 0} yanlış</p>` : ''}
    <h4>Seslere göre doğruluk</h4>
    ${heat(s.letters, learned)}
    <h4>Zorlandığı sesler</h4>
    <p>${hard.length ? hard.map(([c, v]) => `<span class="chip warn lc">${c}</span> <small>${pct(v.c / (v.c + v.w))} (${v.c + v.w})</small>`).join(' ') : '<span class="muted">En az 3 denemede %60 altında kalan ses yok.</span>'}</p>
    <h4>Uygulama içi çizim puanları (ortalama)</h4>
    ${Object.keys(dr).length ? `<div class="table-wrap"><table class="stats"><thead><tr><th>Harf</th><th>Tam rehber</th><th>Azaltılmış</th><th>Rehbersiz</th><th>Bağımsız yaz</th></tr></thead><tbody>
      ${Object.entries(dr).map(([l, v]) => `<tr><td class="lc">${l}</td>${[1, 2, 3, 4].map((k) => `<td>${v[k].length ? Math.round(mean(v[k])) + ` <small>(${v[k].length})</small>` : '–'}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Henüz çizim yok.</p>'}
    <p class="muted">Çizim puanı 0–100: harf yolunun kapsanması (%40), en zayıf çizginin kapsanması (%20), izin yolda kalması (%25) ve çizgi uçlarına ulaşılması (%15). Bir nokta ancak yakınında aynı yönde ilerleyen iz varsa kapsanmış sayılır. Rehbersiz düzeylerde ayrıca biçim $P tanıyıcısıyla ve yazı çizgilerine göre yerleşim denetlenir. Ekrandaki iz, kâğıt üzerinde yazmanın kanıtı sayılmaz.</p>
    <h4>Oturumlar</h4>
    <p>${s.sessions.length ? s.sessions.slice(-8).map((x) => `<span class="chip">${new Date(x.start).toLocaleDateString('tr-TR')} · ${Math.round(sessionMinutes(x))} dk</span>`).join(' ') : '<span class="muted">Oturum yok.</span>'}</p>
    <h4>Öğretmen gözlem notları</h4>
    <div class="notes">${notes.map((n, i) => `<div class="note-item"><small>${new Date(n.t).toLocaleDateString('tr-TR')}</small> ${esc(n.x)} <button class="btn tiny ghost" data-delnote="${i}">✕</button></div>`).join('') || '<p class="muted">Not yok.</p>'}</div>
    <div class="row"><input class="grow" data-note placeholder="Ör. “ş” sesinde yardım istedi; rehbersiz yazmada başlangıç noktasını karıştırdı."><button class="btn" data-addnote>Not ekle</button></div>
    <p class="muted">Notlara öğrenci adı yazmayın.</p>
  </div>`;
  // Öğretmen panelinden başlatılan oturum öğretmen gözetimi kipinde açılır.
  $('[data-start]', box).onclick = () => { try { sessionStorage.setItem('sesizi.tmode', '1'); } catch { /* yok */ } };
  $('[data-upto]', box).onchange = (e) => { s.upTo = e.target.value === '' ? null : +e.target.value; save(); toast('Öğrencinin harf düzeyi güncellendi'); };
  $$('[data-cert]', box).forEach((b) => b.onclick = () => openCertificate(code, b.dataset.cert));
  $$('[data-relesson]', box).forEach((b) => b.onclick = async () => {
    if (await confirmBox(`«${b.dataset.relesson}» harf dersi sıfırlansın mı? (Yıldızlar silinir; kazanılmış belgeler korunur.)`, 'Sıfırla')) { delete s.lessons[b.dataset.relesson]; save(); detail(box, code); }
  });
  $$('[data-unlock]', box).forEach((cb) => cb.onchange = () => { setUnlocked(code, cb.dataset.unlock, cb.checked); toast('Güncellendi'); });
  $('[data-reset]', box).onclick = async () => {
    if (await confirmBox(`${code} kodlu öğrencinin tüm uygulama verileri silinsin mi?`, 'Sil')) { resetStudent(code); location.hash = '#/ogretmen/ilerleme'; }
  };
  $('[data-addnote]', box).onclick = () => {
    const inp = $('[data-note]', box);
    if (!inp.value.trim()) return;
    (S.notes[code] ||= []).push({ t: Date.now(), x: inp.value.trim() });
    save(); detail(box, code);
  };
  $$('[data-delnote]', box).forEach((b) => b.onclick = () => { S.notes[code].splice(+b.dataset.delnote, 1); save(); detail(box, code); });
}

// ================= İçerik kontrolü =================
function icerik(body) {
  const C = getState().content;
  const letterIds = ALL_LETTERS.map((c) => 'l:' + c);
  const counts = () => {
    const chk = (ids) => ids.filter((id) => C.checked[id]).length;
    return {
      rec: recordingCount(),
      letters: chk(letterIds), lettersN: letterIds.length,
      words: chk(WORDS.map((w) => w.id)), wordsN: WORDS.length,
      sents: chk(SENTENCES.map((s) => s.id)), sentsN: SENTENCES.length,
      disabled: Object.values(C.disabled).filter(Boolean).length,
      corrected: Object.values(C.corrected).filter(Boolean).length,
    };
  };
  const srcBadge = (key) => hasRecording(key) ? '<span class="badge ok" title="Öğretmen kaydı">öğretmen kaydı</span>'
    : hasBundled(key) ? '<span class="badge ok" title="Uygulamayla gelen yüksek kaliteli Türkçe ses">hazır ses</span>'
    : '<span class="badge" title="Tarayıcının metin okuma sesi">tarayıcı sesi</span>';
  const recBtns = (key) => canRecord()
    ? `<button class="btn tiny" data-rec="${esc(key)}">● Kaydet</button>${hasRecording(key) ? `<button class="btn tiny ghost" data-delrec="${esc(key)}" title="Kaydı sil">🗑</button>` : ''}${srcBadge(key)}`
    : srcBadge(key);
  const checkBox = (id) => `<label class="check small"><input type="checkbox" data-chk="${esc(id)}" ${C.checked[id] ? 'checked' : ''}> kontrol edildi</label>`;
  const enableBox = (id) => `<label class="check small"><input type="checkbox" data-en="${esc(id)}" ${C.disabled[id] ? '' : 'checked'}> kullanımda</label>`;
  const corrBox = (id) => `<label class="check small"><input type="checkbox" data-cor="${esc(id)}" ${C.corrected[id] ? 'checked' : ''}> düzeltildi</label>`;

  body.innerHTML = `
  <div class="card">
    <h3>İçerik kontrolü özeti</h3>
    <div class="kpis" data-kpis></div>
    <p class="muted">Hedef: bütün ses kayıtlarını, harf biçimlerini ve kelimeleri sınıf öğretmenine kontrol ettirmek ve hatalı içeriği düzeltmek. Hatalı içeriği “kullanımda” kutusunu kaldırarak etkinliklerden çıkarabilirsiniz.</p>
    <div class="row"><button class="btn" data-ek2>⬇ Ek 2 listesini indir (CSV)</button></div>
  </div>
  ${GROUPS.map((g) => `
  <div class="card">
    <h3>${g.id}. harf grubu · <span class="lc">${g.name}</span></h3>
    <h4>Sesler ve harf biçimleri</h4>
    <div class="letter-grid">${g.letters.map((c) => `
      <div class="lg-item">
        <div class="lg-top"><span class="lc big">${c}</span><span class="lc">${upper(c)}</span>${VOWELS.has(c) ? '<span class="badge">ünlü</span>' : '<span class="badge">ünsüz</span>'}</div>
        <div class="lg-svg">${letterSVG(c, { size: 70 })}</div>
        <div class="row wrap"><button class="btn tiny" data-play-l="${c}">▶ Dinle</button>${recBtns(soundKey(c))}</div>
        ${checkBox('l:' + c)}${corrBox('l:' + c)}
      </div>`).join('')}</div>
    <h4>Bu grupla açılan kelimeler</h4>
    <div class="table-wrap"><table class="stats content"><tbody>
      ${WORDS.filter((w) => w.g === g.id).map((w) => `<tr><td class="emoji">${w.e}</td><td class="lc">${esc(w.w)}</td>
        <td><button class="btn tiny" data-play-w="${esc(w.w)}">▶</button> ${recBtns(wordKey(w.w))}</td><td>${checkBox(w.id)}</td><td>${enableBox(w.id)}</td><td>${corrBox(w.id)}</td></tr>`).join('')}
    </tbody></table></div>
    ${SENTENCES.some((s) => s.g === g.id) ? `<h4>Bu grupla açılan cümleler</h4>
    <div class="table-wrap"><table class="stats content"><tbody>
      ${SENTENCES.filter((s) => s.g === g.id).map((s) => `<tr><td class="lc">${esc(sentenceText(s))}</td><td><small>${esc(s.q)} → ${s.a}</small></td>
        <td><button class="btn tiny" data-play-s="${esc(s.id)}">▶</button> ${recBtns(sentenceKey(s.id))}</td><td>${checkBox(s.id)}</td><td>${enableBox(s.id)}</td><td>${corrBox(s.id)}</td></tr>`).join('')}
    </tbody></table></div>` : ''}
  </div>`).join('')}
  <div class="card">
    <h3>Kısa metinler</h3>
    <p class="muted">Her grubun son harfinde ve serbest çalışmada “Cümle kur ve anla” modülünün 2. aşamasında okunur.</p>
    <div class="table-wrap"><table class="stats content"><tbody>
      ${TEXTS.map((t) => `<tr><td><b>${t.g}. grup</b></td><td class="lc"><b>${esc(t.title)}</b><br>${esc(textBody(t))}</td><td><small>${t.qs.map((q) => esc(q.q) + ' → ' + q.a).join('<br>')}</small></td>
        <td><button class="btn tiny" data-play-t="${esc(t.id)}">▶</button> ${recBtns('metin:' + t.id)}</td><td>${checkBox(t.id)}</td><td>${enableBox(t.id)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;

  const kp = $('[data-kpis]', body);
  const showK = () => {
    const k = counts();
    kp.innerHTML = `
      <div class="kpi"><b>${k.rec}</b><span>ses kaydı</span></div>
      <div class="kpi"><b>${k.letters}/${k.lettersN}</b><span>harf (ses + biçim) kontrol edildi</span></div>
      <div class="kpi"><b>${k.words}/${k.wordsN}</b><span>kelime kontrol edildi</span></div>
      <div class="kpi"><b>${k.sents}/${k.sentsN}</b><span>cümle kontrol edildi</span></div>
      <div class="kpi"><b>${k.corrected}</b><span>içerikte düzeltme</span></div>
      <div class="kpi"><b>${k.disabled}</b><span>içerik kullanım dışı</span></div>`;
  };
  showK();
  const bindToggle = (attr, obj, invert) => $$(`[data-${attr}]`, body).forEach((cb) => cb.onchange = () => {
    const id = cb.getAttribute('data-' + attr);
    obj[id] = invert ? !cb.checked : cb.checked;
    if (!obj[id]) delete obj[id];
    save(); showK();
  });
  bindToggle('chk', C.checked);
  bindToggle('cor', C.corrected);
  bindToggle('en', C.disabled, true);
  $$('[data-play-l]', body).forEach((b) => b.onclick = () => playLetter(b.dataset.playL));
  $$('[data-play-w]', body).forEach((b) => b.onclick = () => playWord(b.dataset.playW));
  $$('[data-play-s]', body).forEach((b) => b.onclick = () => {
    const s = SENTENCES.find((x) => x.id === b.dataset.playS);
    play(sentenceKey(s.id), sentenceText(s), 0.8);
  });
  $$('[data-play-t]', body).forEach((b) => b.onclick = () => {
    const t = TEXTS.find((x) => x.id === b.dataset.playT);
    play('metin:' + t.id, textBody(t), 0.8);
  });
  let rec = null, recKey = null;
  $$('[data-rec]', body).forEach((b) => b.onclick = async () => {
    const key = b.dataset.rec;
    if (rec && recKey === key) {
      const blob = await rec.stop();
      rec = null; recKey = null;
      await saveRecording(key, blob);
      toast('Kayıt kaydedildi');
      icerik(body);
      return;
    }
    if (rec) return toast('Önce süren kaydı durdurun.');
    try {
      rec = new Recorder(); recKey = key;
      await rec.start();
      b.textContent = '■ Durdur'; b.classList.add('danger');
    } catch {
      rec = null; recKey = null;
      toast('Mikrofona erişilemedi. Tarayıcı iznini kontrol edin.');
    }
  });
  $$('[data-delrec]', body).forEach((b) => b.onclick = async () => {
    if (await confirmBox('Bu ses kaydı silinsin mi?', 'Sil')) { await deleteRecording(b.dataset.delrec); icerik(body); }
  });
  $('[data-ek2]', body).onclick = () => {
    const rows = [['Ses grubu', 'Tür', 'İçerik', 'Görsel', 'Ses kaynağı', 'Kontrol edildi', 'Düzeltildi', 'Kullanımda']];
    GROUPS.forEach((g) => {
      const src = (k) => (hasRecording(k) ? 'öğretmen kaydı' : hasBundled(k) ? 'hazır ses' : 'tarayıcı sesi');
      g.letters.forEach((c) => rows.push([g.id, VOWELS.has(c) ? 'ses (ünlü)' : 'ses (ünsüz)', c, '', src(soundKey(c)), C.checked['l:' + c] ? 'evet' : 'hayır', C.corrected['l:' + c] ? 'evet' : 'hayır', 'evet']));
      WORDS.filter((w) => w.g === g.id).forEach((w) => rows.push([g.id, 'kelime', w.w, w.e, src(wordKey(w.w)), C.checked[w.id] ? 'evet' : 'hayır', C.corrected[w.id] ? 'evet' : 'hayır', C.disabled[w.id] ? 'hayır' : 'evet']));
      SENTENCES.filter((s) => s.g === g.id).forEach((s) => rows.push([g.id, 'cümle', sentenceText(s), s.a, src(sentenceKey(s.id)), C.checked[s.id] ? 'evet' : 'hayır', C.corrected[s.id] ? 'evet' : 'hayır', C.disabled[s.id] ? 'hayır' : 'evet']));
    });
    download('SESIZI_Ek2_ses_harf_kelime_listesi.csv', toCSV(rows), 'text/csv;charset=utf-8');
  };
}

// ================= Ölçme ve analiz =================
function skillName(id) {
  const S = getState();
  if (id === 'cum' && S.settings.listeningMode) return 'Dinlediğini anlama';
  return SKILLS.find((s) => s.id === id).name;
}

export function computeResults() {
  const S = getState();
  const list = codes();
  const rows = {};
  const per = {};
  SKILLS.forEach((sk) => {
    const max = +S.maxScores[sk.id] || 0;
    const pre = [], post = [], who = [];
    list.forEach((c) => {
      const t = S.tests[c] || {};
      const a = t[sk.id + '_on'], b = t[sk.id + '_son'];
      if (max > 0 && a !== '' && b !== '' && a != null && b != null && isFinite(a) && isFinite(b)) {
        pre.push((100 * a) / max); post.push((100 * b) / max); who.push(c);
      }
    });
    per[sk.id] = { pre, post, who };
    rows[sk.id] = summarize(pre, post);
  });
  // Toplam: dört becerinin tamamı olan öğrenciler, ham puan toplamı / en yüksek puan toplamı
  const maxT = SKILLS.reduce((s, sk) => s + (+S.maxScores[sk.id] || 0), 0);
  const tp = [], tq = [];
  list.forEach((c) => {
    const t = S.tests[c] || {};
    const ok = SKILLS.every((sk) => isFinite(t[sk.id + '_on']) && isFinite(t[sk.id + '_son']) && t[sk.id + '_on'] !== '' && t[sk.id + '_son'] !== '' && t[sk.id + '_on'] != null && t[sk.id + '_son'] != null);
    if (ok && maxT > 0) {
      tp.push((100 * SKILLS.reduce((s, sk) => s + +t[sk.id + '_on'], 0)) / maxT);
      tq.push((100 * SKILLS.reduce((s, sk) => s + +t[sk.id + '_son'], 0)) / maxT);
    }
  });
  rows.toplam = summarize(tp, tq);
  per.toplam = { pre: tp, post: tq };
  return { rows, per };
}
function summarize(pre, post) {
  const w = wilcoxon(pre, post);
  // n: eşleştirilmiş öğrenci sayısı (farkı sıfır olanlar dâhil); nNonZero: sıralamaya giren fark sayısı
  return { ...w, n: pre.length, nNonZero: w.n, mPre: mean(pre), sPre: sd(pre), mPost: mean(post), sPost: sd(post), diff: mean(post) - mean(pre) };
}
const pfmt = (p) => (p == null || isNaN(p) ? '–' : p < 0.001 ? '< ,001' : fmt(p, 3).replace(/^0/, ''));
// APA: 1'i aşamayan değerlerde baştaki sıfır yazılmaz (r = ,91)
const rfmt = (r) => (r == null || isNaN(r) ? '–' : fmt(r, 2).replace(/^(-?)0,/, '$1,'));

function olcme(body) {
  const S = getState();
  const list = codes();
  body.innerHTML = `
  <div class="card">
    <h3>Ölçme araçları (Tablo 2)</h3>
    <div class="table-wrap"><table class="stats">
      <thead><tr><th>Beceri</th><th>Görev</th><th>En yüksek puan</th><th>Puanlama</th></tr></thead>
      <tbody>${SKILLS.map((sk) => `<tr><td>${esc(skillName(sk.id))}</td><td>${esc(sk.task)}</td>
        <td><input type="number" min="1" max="500" class="num" data-max="${sk.id}" value="${S.maxScores[sk.id]}"></td><td>${esc(sk.scoring)}</td></tr>`).join('')}</tbody></table></div>
    <div class="row"><button class="btn" data-forms>🖨 Ölçme formlarını hazırla (Ek 1)</button></div>
    <p class="muted">Ölçümler ekran dışında, kâğıt üzerinde ve bireysel olarak yapılır; puanları buraya ham puan olarak girin. Yazma puanlaması öğrenci adı ve ölçüm zamanı gizlenerek yapılmalıdır.</p>
  </div>
  <div class="card">
    <h3>Ön test – son test puanları (ham puan)</h3>
    <div class="table-wrap"><table class="entry">
      <thead><tr><th rowspan="2">Kod</th>${SKILLS.map((sk) => `<th colspan="2">${esc(skillName(sk.id))}<br><small>en yüksek ${S.maxScores[sk.id]}</small></th>`).join('')}</tr>
        <tr>${SKILLS.map(() => '<th>Ön</th><th>Son</th>').join('')}</tr></thead>
      <tbody>${list.map((c) => {
        const t = S.tests[c] || {};
        return `<tr><th>${c}</th>${SKILLS.map((sk) => ['on', 'son'].map((w) => `<td><input type="number" min="0" max="${S.maxScores[sk.id]}" step="0.5" class="num" data-c="${c}" data-f="${sk.id}_${w}" value="${t[sk.id + '_' + w] ?? ''}"></td>`).join('')).join('')}</tr>`;
      }).join('')}</tbody></table></div>
    <p class="muted">Devamsızlık veya eksik test nedeniyle bir becerisi eksik olan öğrenci o becerinin analizine alınmaz.</p>
  </div>
  <div data-results></div>`;
  $$('[data-max]', body).forEach((el) => el.onchange = () => { S.maxScores[el.dataset.max] = Math.max(1, +el.value || 1); save(); olcme(body); });
  $$('[data-c]', body).forEach((el) => el.onchange = () => {
    const t = (S.tests[el.dataset.c] ||= {});
    const max = S.maxScores[el.dataset.f.split('_')[0]];
    if (el.value === '') delete t[el.dataset.f];
    else {
      let v = +el.value;
      if (v < 0 || v > max) { toast(`Puan 0 ile ${max} arasında olmalı.`); v = Math.min(max, Math.max(0, v)); el.value = v; }
      t[el.dataset.f] = v;
    }
    save(); results($('[data-results]', body));
  });
  $('[data-forms]', body).onclick = forms;
  results($('[data-results]', body));
}

function results(box) {
  const { rows, per } = computeResults();
  const S = getState();
  const keys = [...SKILLS.map((s) => s.id), 'toplam'];
  const name = (k) => (k === 'toplam' ? 'Toplam' : skillName(k));
  const any = keys.some((k) => rows[k].n > 0);
  const nAll = Math.max(...keys.map((k) => rows[k].n));
  // Uygulama içi başarı ile kâğıt üzerindeki bağımsız yazma (alt soru 4)
  const cmp = codes().map((c) => {
    const s = S.students[c];
    const d = s ? s.drawings.filter((x) => x.lv >= 3) : [];
    const app = d.length ? mean(d.map((x) => x.sc)) : null;
    const t = S.tests[c] || {};
    const paper = isFinite(t.yaz_son) && t.yaz_son !== '' && t.yaz_son != null ? (100 * t.yaz_son) / S.maxScores.yaz : null;
    return { c, app, paper, n: d.length };
  }).filter((x) => x.app != null && x.paper != null);
  const mismatch = cmp.filter((x) => x.app >= 70 && x.paper < 50).length;

  box.innerHTML = `
  <div class="card">
    <h3>Tablo 3. Becerilere göre ön test–son test puanları (yüzde, n = ${nAll || '–'})</h3>
    ${any ? '' : '<p class="muted">Sonuçlar için en az bir öğrencinin ön ve son test puanlarını girin.</p>'}
    <div class="table-wrap"><table class="stats t3">
      <thead><tr><th>Beceri</th><th>n</th><th>Ön test ort. (SS)</th><th>Son test ort. (SS)</th><th>Fark (yp)</th><th>Wilcoxon z</th><th>p</th><th>p (kesin)</th><th>r</th><th>Artan / Değişmeyen / Azalan</th></tr></thead>
      <tbody>${keys.map((k) => {
        const r = rows[k];
        return `<tr class="${k === 'toplam' ? 'total' : ''}"><td>${esc(name(k))}</td><td>${r.n}</td>
          <td>${fmt(r.mPre, 1)} (${fmt(r.sPre, 1)})</td><td>${fmt(r.mPost, 1)} (${fmt(r.sPost, 1)})</td>
          <td>${r.n ? (r.diff >= 0 ? '+' : '') + fmt(r.diff, 1) : '–'}</td><td>${r.n ? fmt(r.z, 2) : '–'}</td><td>${r.n ? pfmt(r.p) : '–'}</td><td>${r.n ? pfmt(r.pExact) : '–'}</td>
          <td>${r.n ? rfmt(r.r) : '–'}</td><td>${r.n ? `${r.pos} / ${r.zero} / ${r.neg}` : '–'}</td></tr>`;
      }).join('')}</tbody></table></div>
    <p class="muted">yp: yüzde puan. Puan = ham puan ÷ en yüksek puan × 100. z: Wilcoxon işaretli sıralar testi, normal yaklaşım (bağ düzeltmeli; pozitif z son testin yüksek olduğunu gösterir). p: iki yönlü asimptotik; p (kesin): n ≤ 30 için kesin dağılım. Etki büyüklüğü r = z / √N (N: eşleştirilmiş öğrenci sayısı; Cohen, 1988: ,10 küçük, ,30 orta, ,50 büyük). Dört beceride ayrı test yapıldığından sonuçlar keşfedici olarak yorumlanmalıdır.</p>
    ${any ? `<div class="summary">${summaryText(rows, name)}</div>` : ''}
    <div class="row"><button class="btn" data-csv>⬇ Tablo 3 ve ham verileri indir (CSV)</button></div>
  </div>
  <div class="card">
    <h3>Şekil 5. Öğrenci bazında ön test ve son test puanları</h3>
    <div class="charts">${SKILLS.map((sk) => chart(name(sk.id), per[sk.id])).join('')}</div>
    <p class="muted">Her çizgi bir öğrenciyi gösterir; öğrenci kodları gösterilmez. Kalın çizgi ortalamadır.</p>
  </div>
  <div class="card">
    <h3>Uygulama içi başarı ile kâğıt üzerindeki bağımsız yazma</h3>
    ${cmp.length ? `<p>Karşılaştırılabilen öğrenci: <b>${cmp.length}</b>. Uygulamada başarılı (rehbersiz/bağımsız çizim ort. ≥ 70) olup kâğıtta zorlanan (son test yazma < %50) öğrenci sayısı: <b>${mismatch}</b>.</p>
      <p>Uygulama içi rehbersiz çizim ortalaması: <b>${fmt(mean(cmp.map((x) => x.app)), 1)}</b> · kâğıt üzerinde son test yazma ortalaması: <b>%${fmt(mean(cmp.map((x) => x.paper)), 1)}</b>${cmp.length >= 3 ? ` · Spearman ρ = <b>${fmt(spearman(cmp.map((x) => x.app), cmp.map((x) => x.paper)), 2)}</b>` : ''}</p>
      ${scatter(cmp)}` : '<p class="muted">Bu karşılaştırma için öğrencinin uygulamada rehbersiz veya bağımsız çizim kaydı ve kâğıt üzerinde son test yazma puanı gerekir.</p>'}
  </div>`;
  $('[data-csv]', box).onclick = () => {
    const out = [['Tablo 3'], ['Beceri', 'n', 'Ön ort', 'Ön SS', 'Son ort', 'Son SS', 'Fark (yp)', 'W+', 'W-', 'z', 'p', 'p kesin', 'r', 'Artan', 'Değişmeyen', 'Azalan']];
    keys.forEach((k) => { const r = rows[k]; out.push([name(k), r.n, fmt(r.mPre, 2), fmt(r.sPre, 2), fmt(r.mPost, 2), fmt(r.sPost, 2), fmt(r.diff, 2), fmt(r.Wplus, 1), fmt(r.Wminus, 1), fmt(r.z, 3), fmt(r.p, 4), fmt(r.pExact, 4), fmt(r.r, 3), r.pos, r.zero, r.neg]); });
    out.push([]); out.push(['Ham puanlar']);
    out.push(['Kod', ...SKILLS.flatMap((sk) => [skillName(sk.id) + ' ön', skillName(sk.id) + ' son'])]);
    codes().forEach((c) => { const t = S.tests[c] || {}; out.push([c, ...SKILLS.flatMap((sk) => [t[sk.id + '_on'] ?? '', t[sk.id + '_son'] ?? ''])]); });
    out.push([]); out.push(['En yüksek puanlar', ...SKILLS.map((sk) => `${skillName(sk.id)}=${S.maxScores[sk.id]}`)]);
    download('SESIZI_Tablo3_on_son_test.csv', toCSV(out), 'text/csv;charset=utf-8');
  };
}

function summaryText(rows, name) {
  const ks = SKILLS.map((s) => s.id).filter((k) => rows[k].n > 0);
  if (!ks.length) return '';
  const best = ks.reduce((a, b) => (rows[b].diff > rows[a].diff ? b : a));
  const worst = ks.reduce((a, b) => (rows[b].diff < rows[a].diff ? b : a));
  const sig = (r) => { const p = isFinite(r.pExact) ? r.pExact : r.p; return p < 0.05 ? 'anlamlıdır' : 'anlamlı değildir'; };
  return `<p><b>Otomatik özet (rapora uyarlayın):</b> En büyük değişim <b>${esc(name(best))}</b> (${fmt(rows[best].diff, 1)} yp), en küçük değişim <b>${esc(name(worst))}</b> (${fmt(rows[worst].diff, 1)} yp) becerisindedir. ${ks.map((k) => `${esc(name(k))}: %${fmt(rows[k].mPre, 1)} → %${fmt(rows[k].mPost, 1)}, değişim ${sig(rows[k])} (p = ${pfmt(isFinite(rows[k].pExact) ? rows[k].pExact : rows[k].p)}, r = ${rfmt(rows[k].r)}).`).join(' ')} Öğrenciler okuma yazmayı normal derslerde de öğrendiği için gözlenen değişimin tamamı uygulamaya bağlanamaz.</p>`;
}

function spearman(a, b) {
  const rk = (v) => { const s = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = []; for (let i = 0; i < s.length;) { let j = i; while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++; for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const ra = rk(a), rb = rk(b);
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  ra.forEach((x, i) => { num += (x - ma) * (rb[i] - mb); da += (x - ma) ** 2; db += (rb[i] - mb) ** 2; });
  return da && db ? num / Math.sqrt(da * db) : NaN;
}

function chart(title, d) {
  const W = 220, H = 200, l = 34, r = 14, t = 14, b = 30;
  const x0 = l + 18, x1 = W - r - 18;
  const y = (v) => t + (1 - v / 100) * (H - t - b);
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${l - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join('');
  const lines = d.pre.map((p, i) => `<line x1="${x0}" x2="${x1}" y1="${y(p)}" y2="${y(d.post[i])}" class="ln"/><circle cx="${x0}" cy="${y(p)}" r="2.5" class="pt"/><circle cx="${x1}" cy="${y(d.post[i])}" r="2.5" class="pt"/>`).join('');
  const m = d.pre.length ? `<line x1="${x0}" x2="${x1}" y1="${y(mean(d.pre))}" y2="${y(mean(d.post))}" class="mean"/>` : '';
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} ön test ve son test">
      ${grid}${lines}${m}
      <text x="${x0}" y="${H - 10}" text-anchor="middle" class="ax">Ön test</text><text x="${x1}" y="${H - 10}" text-anchor="middle" class="ax">Son test</text>
      ${d.pre.length ? '' : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="ax">veri yok</text>`}
    </svg></figure>`;
}

function scatter(pts) {
  const W = 320, H = 240, l = 40, r = 12, t = 12, b = 36;
  const x = (v) => l + (v / 100) * (W - l - r);
  const y = (v) => t + (1 - v / 100) * (H - t - b);
  return `<figure class="chart wide"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Uygulama içi çizim ile kâğıt üzerinde yazma">
    ${[0, 50, 100].map((v) => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${l - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text><text x="${x(v)}" y="${H - 20}" class="ax" text-anchor="middle">${v}</text>`).join('')}
    <rect x="${x(70)}" y="${y(50)}" width="${x(100) - x(70)}" height="${y(0) - y(50)}" class="zone"/>
    ${pts.map((p) => `<circle cx="${x(p.app)}" cy="${y(p.paper)}" r="4" class="pt"/>`).join('')}
    <text x="${(l + W - r) / 2}" y="${H - 4}" class="ax" text-anchor="middle">Uygulama içi rehbersiz çizim puanı</text>
    <text x="12" y="${H / 2 - 10}" class="ax" text-anchor="middle" transform="rotate(-90 12 ${H / 2 - 10})">Kâğıtta yazma (%)</text>
  </svg><figcaption class="muted">Taralı alan: uygulamada başarılı, kâğıtta zorlanan.</figcaption></figure>`;
}

// ----- Ek 1: Ölçme formları -----
function forms() {
  const learned = learnedLetters();
  const words = availableWords().map((w) => w.w);
  const sents = availableSentences();
  const { box, close } = modal(`
    <h3>Ölçme formları (Ek 1)</h3>
    <p class="muted">Listeleri düzenleyip yazdırın. Kelime okuma için uygulamada çalışılmamış, öğrenilmiş seslerden oluşan <b>yeni</b> kelimeler kullanın. Ön ve son testte aynı maddeler veya benzer güçlükte iki form kullanılabilir.</p>
    <label class="field">Ses–harf eşleştirme: söylenecek sesler (virgülle)<textarea data-f1>${learned.join(', ')}</textarea></label>
    <label class="field">Bağımsız harf yazma: yazdırılacak harfler<textarea data-f2>${learned.join(', ')}</textarea></label>
    <label class="field">Kelime okuma: yeni kelimeler<textarea data-f3>${words.slice(0, 10).join(', ')}</textarea></label>
    <label class="field">Cümle anlama: cümle | soru (her satıra bir madde)<textarea data-f4 rows="5">${sents.map((s) => `${sentenceText(s)} | ${s.q}`).join('\n')}</textarea></label>
    <label class="field">Form adı<select data-ft><option>Form A</option><option>Form B</option></select></label>
    <div class="row end"><button class="btn ghost" data-close>Kapat</button><button class="btn primary" data-print>🖨 Yazdır</button></div>`, { wide: true });
  $('[data-print]', box).onclick = () => {
    const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const f1 = split($('[data-f1]', box).value), f2 = split($('[data-f2]', box).value), f3 = split($('[data-f3]', box).value);
    const f4 = $('[data-f4]', box).value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]);
    const ft = $('[data-ft]', box).value;
    const head = (t) => `<div class="pf-head"><b>SESİZİ · ${esc(t)}</b><span>${esc(ft)}</span><span>Öğrenci kodu: ________</span><span>Ölçüm: ☐ Ön test ☐ Son test</span><span>Tarih: ________</span></div>`;
    const html = `
      <section class="pf">${head('Ses–harf eşleştirme')}
        <p>Yönerge: “Sana bir ses söyleyeceğim. Bu sesin harfini göster.” Ses, harf adı olarak değil konuşma sesi olarak söylenir. Her doğru yanıt 1 puan. En yüksek puan: ${f1.length}.</p>
        <table><tr><th>#</th><th>Ses</th><th>Öğrencinin gösterdiği</th><th>Puan (0/1)</th></tr>${f1.map((c, i) => `<tr><td>${i + 1}</td><td class="lc">/${esc(c)}/</td><td></td><td></td></tr>`).join('')}</table></section>
      <section class="pf">${head('Bağımsız harf yazma (kâğıt)')}
        <p>Yönerge: “Söyleyeceğim sesin harfini çizgili alana yaz.” Harf gösterilmez, ipucu verilmez. Puanlama: biçim, yönelim, satır yerleşimi; her biri 0–2. En yüksek puan: ${f2.length * 6}. Puanlama, öğrenci kodu ve ölçüm zamanı gizlenerek yapılır.</p>
        <table><tr><th>#</th><th>Söylenen ses</th><th class="wr">Öğrencinin yazısı</th><th>Biçim</th><th>Yönelim</th><th>Satır</th></tr>${f2.map((c, i) => `<tr><td>${i + 1}</td><td class="lc">/${esc(c)}/</td><td class="wr"><div class="lines"></div></td><td></td><td></td><td></td></tr>`).join('')}</table>
        <p class="small">Rubrik — Biçim: 0 tanınmıyor, 1 tanınıyor ama eksik/fazla parça, 2 doğru biçim. Yönelim: 0 ters/ayna, 1 kısmen doğru, 2 doğru. Satır yerleşimi: 0 çizgilerden bağımsız, 1 kısmen, 2 orta ve taban çizgisine uygun.</p></section>
      <section class="pf">${head('Kelime okuma')}
        <p>Yönerge: “Bu kelimeyi oku.” Öğrenci kartı yardımsız okur. Bağımsız doğru okuma 1 puan. En yüksek puan: ${f3.length}.</p>
        <div class="cards-print">${f3.map((w) => `<span class="lc">${esc(w)}</span>`).join('')}</div>
        <table><tr><th>#</th><th>Kelime</th><th>Puan (0/1)</th><th>Not</th></tr>${f3.map((w, i) => `<tr><td>${i + 1}</td><td class="lc">${esc(w)}</td><td></td><td></td></tr>`).join('')}</table></section>
      <section class="pf">${head('Cümle anlama')}
        <p>Yönerge: “Cümleyi oku ve soruyu yanıtla.” Cümle öğrenciye sesli okunursa bu puan “dinlediğini anlama” olarak adlandırılır. Her doğru yanıt 1 puan. En yüksek puan: ${f4.length}.</p>
        <table><tr><th>#</th><th>Cümle</th><th>Soru</th><th>Puan (0/1)</th></tr>${f4.map((x, i) => `<tr><td>${i + 1}</td><td class="lc">${esc(x[0])}</td><td>${esc(x[1] || '')}</td><td></td></tr>`).join('')}</table></section>`;
    const area = $('#print-area');
    area.innerHTML = html;
    close();
    toast(`Önerilen en yüksek puanlar: ses–harf ${f1.length}, yazma ${f2.length * 6}, kelime ${f3.length}, cümle ${f4.length}`, 4000);
    setTimeout(() => { window.print(); }, 300);
  };
}

// ================= Veri =================
function veri(body) {
  body.innerHTML = `
  <div class="cards2">
    <div class="card">
      <h3>Dışa aktar / içe aktar</h3>
      <p>Bütün veriler yalnızca bu cihazın tarayıcısında saklanır; sunucuya gönderilmez. Başka bir cihaza taşımak veya yedeklemek için dışa aktarın.</p>
      <div class="row wrap"><button class="btn primary" data-exp>⬇ Tüm verileri indir (JSON)</button>
        <button class="btn" data-expcsv>⬇ Uygulama içi kayıtlar (CSV)</button>
        <label class="btn">⬆ İçe aktar<input type="file" accept="application/json" data-imp hidden></label></div>
      <p class="muted">Ses kayıtları dosyaya dâhil edilmez; her cihazda ayrıca kaydedilir.</p>
    </div>
    <div class="card">
      <h3>Kaydedilen veriler</h3>
      <ul>
        <li>Öğrenci kodu (Ö01–Ö${String(getState().settings.studentCount).padStart(2, '0')}); ad, fotoğraf, ses veya video kaydedilmez.</li>
        <li>Etkinlik başına deneme, doğru, yanlış ve ipucu sayısı; ses bazında doğruluk.</li>
        <li>Çizim puanı (0–100), destek düzeyi ve harf; çizimin kendisi saklanmaz.</li>
        <li>Oturum başlangıç ve bitiş zamanları; öğretmen gözlem notları; ön test–son test puanları.</li>
        <li>Harf dersi ilerlemesi (adım, yıldız, tarih) ve kazanılan belgeler. Belgedeki öğrenci adı yazdırma anında girilir, saklanmaz.</li>
        <li>Öğretmen hesabı (ad, okul, sınıf, PIN) yalnızca bu cihazda; dışa aktarılan dosyaya PIN yazılmaz.</li>
      </ul>
    </div>
    <div class="card danger-zone">
      <h3>Sıfırla</h3>
      <p>Bütün öğrenci verilerini, test puanlarını ve ayarları siler. Geri alınamaz.</p>
      <button class="btn danger" data-reset>Tüm verileri sil</button>
    </div>
    <div class="card">
      <h3>Çok cihazlı kullanım (bulut veri tabanı)</h3>
      <p>Şu an her cihaz kendi verisini tutar. Sınıfta birden çok tablet kullanılıyorsa günün sonunda her cihazdan “Tüm verileri indir” ile yedek alıp ana cihazda içe aktarabilirsiniz.</p>
      <p class="muted">Öğretmen hesabının ve öğrenci verilerinin bütün cihazlarda eş zamanlı görünmesi için bulut veri tabanı (ör. Firebase) bağlantısı sonraki sürümde eklenecektir; bu durumda veli onamı ve kişisel verilerin korunması (KVKK) gereklilikleri ayrıca karşılanmalıdır.</p>
    </div>
  </div>`;
  $('[data-exp]', body).onclick = () => {
    const S = getState();
    const out = { ...S, teacher: S.teacher ? { ...S.teacher, pin: undefined } : null };
    download(`SESIZI_veri_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), 'application/json');
  };
  $('[data-expcsv]', body).onclick = () => {
    const S = getState();
    const rows = [['Kod', 'Modül', 'Deneme', 'Doğru', 'Yanlış', 'İpuçlu doğru', 'İpucu', 'Aşama', 'Tamamlandı']];
    Object.entries(S.students).forEach(([c, s]) => MODULES.forEach((m) => { const x = s.modules[m.id]; if (x) rows.push([c, m.title, x.attempts, x.correct, x.wrong, x.hintedCorrect, x.hints, Math.min(x.stage + 1, m.stages.length), x.done ? 'evet' : 'hayır']); }));
    rows.push([]); rows.push(['Kod', 'Modül', 'Harf', 'Destek düzeyi', 'Çizim puanı', 'Başarılı', 'Tarih']);
    const lv = { 1: 'Tam rehber', 2: 'Azaltılmış rehber', 3: 'Rehbersiz', 4: 'Bağımsız yaz' };
    Object.entries(S.students).forEach(([c, s]) => s.drawings.forEach((d) => rows.push([c, d.m, d.l, lv[d.lv], d.sc, d.ok ? 'evet' : 'hayır', new Date(d.t).toLocaleString('tr-TR')])));
    rows.push([]); rows.push(['Kod', 'Harf', 'Sıra', 'Durum', 'Yıldız', 'En iyi doğruluk', 'Tarih']);
    Object.entries(S.students).forEach(([c, s]) => ALL_LETTERS.forEach((ch, i) => { const L = (s.lessons || {})[ch]; if (L) rows.push([c, ch, i + 1, L.done ? 'tamamlandı' : 'devam', L.stars || 0, L.best ? Math.round(L.best * 100) + '%' : '', L.date ? new Date(L.date).toLocaleDateString('tr-TR') : '']); }));
    rows.push([]); rows.push(['Kod', 'Belge', 'Tarih']);
    Object.entries(S.students).forEach(([c, s]) => Object.entries(s.certs || {}).forEach(([k, t]) => rows.push([c, certTitle(k), new Date(t).toLocaleDateString('tr-TR')])));
    download('SESIZI_uygulama_ici_kayitlar.csv', toCSV(rows), 'text/csv;charset=utf-8');
  };
  $('[data-imp]', body).onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.version !== 1 || !data.settings) throw new Error();
      if (await confirmBox('Mevcut verilerin yerine dosyadaki veriler yüklensin mi? (Bu cihazdaki öğretmen hesabı ve PIN korunur.)', 'Yükle')) { replaceState({ ...data, teacher: getState().teacher }); toast('Veriler yüklendi'); veri(body); }
    } catch { toast('Dosya okunamadı veya SESİZİ verisi değil.'); }
  };
  $('[data-reset]', body).onclick = async () => {
    if (await confirmBox('Bütün veriler kalıcı olarak silinsin mi?', 'Hepsini sil')) { resetAll(); toast('Veriler silindi'); veri(body); }
  };
}

export { loadRecordingKeys };
