// Harf yolculuğu: 2024 programındaki sırayla harf harf ilerleyen dersler.
// Her harf dersi ses temelli cümle yönteminin basamaklarını izler:
// sesi hissetme ve tanıma → harfi tanıma ve ayırt etme → okuma yazma (iz, büyük harf, bağımsız yazma)
// → harften heceye → kelime → cümle → (grup sonunda) metin.
import { GROUPS, ALL_LETTERS, WORDS, MODULE_BY_ID, upper, lower, groupOf, letterIndex } from './data.js';
import {
  getState, save, student, lessonOf, lessonLimit, finishLesson, lettersThrough, recordAnswer, starsFor,
  availableWords, availableSyllables, availableSentences, availableTexts, totalStars, lettersDone,
} from './store.js';
import { ROUNDS, later, stopActivity } from './activities.js';
import { playLetter, playWord, speak, play, phraseKey } from './audio.js';
import { STROKES } from './strokes.js';
import { certTitle, openCertificate } from './certificate.js';
import { $, $$, esc, shuffle, pick, placeAnswer, feedback, clearFeedback, chime, toast } from './ui.js';

const has = (txt, ch) => lower(txt).includes(ch);
const STAR = (n, of = 3) => Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');

// ---------------- Harita ----------------
export function letterState(code, ch, teacher) {
  const L = student(code).lessons[ch];
  const idx = letterIndex(ch);
  const lim = lessonLimit(code);
  if (L && L.done) return 'done';
  if (idx > lim && !teacher) return 'locked';
  const firstOpen = ALL_LETTERS.findIndex((c) => !(student(code).lessons[c] || {}).done);
  return idx === firstOpen ? 'current' : 'open';
}

export function renderMap(root, code, { teacher = false } = {}) {
  const s = student(code);
  const certs = Object.keys(s.certs).length;
  root.innerHTML = `
  <section class="journey">
    <div class="j-head">
      <div>
        <h2>Merhaba ${esc(code)} 👋</h2>
        <p class="muted">Harf yolculuğunda sıradaki harfe dokun. Her harfte sesi dinler, harfi tanır, yazar ve okursun.</p>
      </div>
      <div class="j-stats" aria-label="İlerleme">
        <span class="stat"><b>${totalStars(code)}</b><small>⭐ yıldız</small></span>
        <span class="stat"><b>${lettersDone(code)}/${ALL_LETTERS.length}</b><small>🔤 harf</small></span>
        <span class="stat"><b>${certs}</b><small>🏅 belge</small></span>
      </div>
    </div>
    <div class="j-actions" data-actions></div>
    <div class="islands">${GROUPS.map((g) => {
      const got = s.certs['g' + g.id];
      return `<div class="island" style="--gc:${g.color}">
        <div class="isl-head"><b>${g.id}. grup</b><span class="isl-name lc">${g.name}</span>
          ${got ? `<button class="btn tiny cert-btn" data-cert="g${g.id}">🏅 Belgem</button>` : `<small class="muted">${g.weeks} hafta</small>`}</div>
        <div class="path">${g.letters.map((ch) => {
          const st = letterState(code, ch, teacher);
          const L = s.lessons[ch] || {};
          const inner = `<span class="lc">${upper(ch)}${ch}</span><span class="stars">${st === 'done' ? STAR(L.stars) : st === 'locked' ? '🔒' : L.n ? '…' : ''}</span>`;
          return st === 'locked'
            ? `<span class="lnode locked" aria-disabled="true" title="Öğretmenin bu harfi açınca başlar">${inner}</span>`
            : `<a class="lnode ${st}" href="#/ogrenci/${encodeURIComponent(code)}/harf/${encodeURIComponent(ch)}" aria-label="${ch} harfi">${inner}</a>`;
        }).join('<span class="link" aria-hidden="true"></span>')}</div>
      </div>`;
    }).join('')}
      <div class="island final" style="--gc:#ca8a04">
        <div class="isl-head"><b>🏆 Yolculuğun sonu</b>${s.certs.final ? '<button class="btn tiny cert-btn" data-cert="final">🏆 Okuma yazma belgem</button>' : '<small class="muted">Bütün harfleri bitirince okuma yazma belgeni alırsın.</small>'}</div>
      </div>
    </div>
  </section>`;
  $$('[data-cert]', root).forEach((b) => b.onclick = () => openCertificate(code, b.dataset.cert));
  $$('.lnode.locked', root).forEach((b) => b.onclick = () => toast('Bu harfi öğretmenin açınca çalışabilirsin.'));
  return $('[data-actions]', root);
}

// ---------------- Ders adımları ----------------
export function lessonSteps(ch) {
  const L = lettersThrough(ch);
  const words = availableWords(L).filter((w) => has(w.w, ch));
  const shortWords = words.filter((w) => [...w.w].length <= 6);
  const syl = availableSyllables(L).filter((x) => x.includes(ch));
  const sents = availableSentences(L).filter((x) => has(x.t.join(' '), ch));
  const g = GROUPS.find((x) => x.letters.includes(ch));
  const lastOfGroup = g.letters[g.letters.length - 1] === ch;
  const texts = lastOfGroup ? availableTexts(L).filter((t) => t.g === g.id) : [];
  const posWords = positionWords(ch);
  const st = [
    { id: 'tanis', title: 'Harfle tanış', icon: '👋', n: 1, kind: 'intro' },
    { id: 'sesavi', title: 'Sesi bul', icon: '👂', n: 3, kind: 'hunt' },
    posWords.length >= 2 && { id: 'sesyeri', title: 'Ses nerede?', icon: '📍', n: 2, kind: 'pos' },
    { id: 'tani', title: 'Harfi tanı', icon: '🔤', n: 3, mid: 'm1' },
    { id: 'ayirt', title: 'Harfi ayırt et', icon: '🔍', n: 2, mid: 'm2' },
    { id: 'iz1', title: 'İzi takip et', icon: '✍️', n: 1, mid: 'm3', level: 1 },
    { id: 'iz2', title: 'Az rehberle yaz', icon: '✍️', n: 1, mid: 'm3', level: 2 },
    STROKES[upper(ch)] && { id: 'buyuk', title: 'Büyük harfi yaz', icon: '🅰️', n: 1, mid: 'm3', level: 1, upper: true },
    { id: 'iz3', title: 'Rehbersiz yaz', icon: '✍️', n: 1, mid: 'm3', level: 3 },
    { id: 'yaz', title: 'Kendin yaz', icon: '📝', n: 2, mid: 'm4' },
    syl.length && { id: 'hece', title: 'Hece kur', icon: '🧩', n: 3, mid: 'm5', stage: 0, pool: { syllables: syl } },
    shortWords.length && { id: 'kelimekur', title: 'Kelime kur', icon: '🧩', n: 2, mid: 'm5', stage: 1, pool: { words: shortWords } },
    words.length && { id: 'oku', title: 'Oku ve eşleştir', icon: '🖼️', n: Math.min(3, Math.max(2, words.length)), mid: 'm6', pool: { words } },
    sents.length && { id: 'cumle', title: 'Cümle kur', icon: '💬', n: Math.min(2, sents.length), mid: 'm7', stage: 0, pool: { sentences: sents } },
    texts.length && { id: 'metin', title: 'Metni oku', icon: '📖', n: 1, mid: 'm7', stage: 1, pool: { texts } },
  ];
  return st.filter(Boolean);
}

/** Hedef sesi bir kez içeren resimli kelimeler (sesin kelimedeki yeri etkinliği). */
function positionWords(ch) {
  return WORDS.filter((w) => [...w.w].filter((c) => c === ch).length === 1 && [...w.w].length >= 2);
}

// ---------------- Ders ekranı ----------------
let seq = 0; // sesli sıralı oynatmayı iptal etmek için
export function runLesson(root, code, ch, { teacher = false, onBack } = {}) {
  stopActivity();
  const steps = lessonSteps(ch);
  const L = lessonOf(code, ch);
  if (L.step >= steps.length) { L.step = 0; L.c = 0; L.n = 0; }
  const g = GROUPS.find((x) => x.letters.includes(ch));
  root.innerHTML = `
  <section class="activity lesson" style="--mc:${g.color}">
    <div class="act-head">
      <button class="btn ghost back" data-back aria-label="Harf yolculuğuna dön">← Yolculuk</button>
      <div class="act-title"><span class="act-icon lesson-badge lc">${upper(ch)}${ch}</span>
        <div><h2 data-title></h2><p class="muted">${g.id}. grup · <span class="lc">${g.name}</span> · <span data-count></span></p></div></div>
      <div class="act-meta"><div class="steps" data-steps></div></div>
    </div>
    <div class="act-body" data-body></div>
    <div class="feedback" data-fb aria-live="polite"></div>
    <div class="lesson-tools" data-ltools></div>
  </section>`;
  const body = $('[data-body]', root), fb = $('[data-fb]', root), tools = $('[data-ltools]', root);
  $('[data-back]', root).onclick = () => { seq++; stopActivity(); onBack && onBack(); };

  let item = 0, cur = null;
  const head = () => {
    const step = steps[L.step];
    $('[data-title]', root).textContent = step.icon + ' ' + step.title;
    $('[data-count]', root).textContent = `Adım ${L.step + 1}/${steps.length}`;
    $('[data-steps]', root).innerHTML = steps.map((s, i) =>
      `<span class="sdot ${i < L.step ? 'on' : i === L.step ? 'cur' : ''}" title="${esc(s.title)}">${i < L.step ? '✓' : ''}</span>`).join('');
  };
  const tally = (ok) => {
    if (cur.scored) { if (!ok) cur.wrong++; showSkip(); return; }
    cur.scored = true; L.n++; if (ok) L.c++; else cur.wrong++;
    save(); showSkip();
  };
  const showSkip = () => {
    tools.innerHTML = (cur.wrong >= 2 || teacher) ? `<button class="btn ghost" data-skip>⏭ Sonrakine geç</button>` : '';
    const b = $('[data-skip]', tools);
    if (b) b.onclick = () => { if (!cur.scored) { cur.scored = true; L.n++; save(); } advance(); };
  };
  const advance = () => {
    stopActivity();
    clearFeedback(fb);
    item++;
    if (item >= steps[L.step].n) { item = 0; L.step++; save(); }
    if (L.step >= steps.length) return finish();
    run();
  };
  const run = () => {
    seq++;
    cur = { scored: false, wrong: 0 };
    tools.innerHTML = teacher ? `<button class="btn ghost" data-skip>⏭ Sonrakine geç</button>` : '';
    showSkip();
    head();
    const step = steps[L.step];
    if (step.kind === 'intro') return intro(body, ch, () => { cur.scored = true; advance(); });
    if (step.kind === 'hunt') return hunt({ body, fb, ch, code, tally, next: advance });
    if (step.kind === 'pos') return position({ body, fb, ch, code, tally, next: advance });
    const mod = MODULE_BY_ID[step.mid];
    const learned = lettersThrough(ch);
    const pool = step.pool || {};
    const ctx = {
      code, mid: step.mid, mod, body, fb, learned, teacher, lesson: true,
      ms: student(code).modules[step.mid],
      levelOverride: step.level || null, upperCase: !!step.upper,
      get focus() { return ch; },
      get stage() { return step.stage || 0; },
      pickLetter() { return ch; },
      result(r) { recordAnswer(code, step.mid, r); tally(r.correct); return {}; },
      next: advance,
      updateHead() {},
      words: () => pool.words || availableWords(learned),
      syllables: () => pool.syllables || availableSyllables(learned),
      sentences: () => pool.sentences || availableSentences(learned),
      texts: () => pool.texts || availableTexts(learned),
    };
    ROUNDS[step.mid](ctx);
  };
  const finish = () => {
    const c = L.c, n = L.n;
    const { stars, newCerts } = finishLesson(code, ch);
    const nextCh = ALL_LETTERS[letterIndex(ch) + 1];
    const nextOpen = nextCh && (teacher || letterIndex(nextCh) <= lessonLimit(code));
    tools.innerHTML = '';
    clearFeedback(fb);
    $('[data-steps]', root).innerHTML = steps.map(() => '<span class="sdot on">✓</span>').join('');
    body.innerHTML = `<div class="stage-up celebrate">
      <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}">${pick(['⭐', '🎉', '✨', '🌟'])}</i>`).join('')}</div>
      <div class="big-letter lc">${upper(ch)}${ch}</div>
      <h3>«${ch}» harfini tamamladın!</h3>
      <div class="big-stars">${STAR(stars)}</div>
      <p class="muted">${n ? `${c}/${n} etkinliği ilk denemede doğru yaptın.` : ''}</p>
      ${newCerts.length ? `<div class="new-cert"><b>🏅 Yeni belge kazandın:</b> ${newCerts.map((k) => esc(certTitle(k))).join(', ')}
        <div class="row center">${newCerts.map((k) => `<button class="btn primary" data-cert="${k}">${k === 'final' ? '🏆' : '🏅'} Belgemi gör</button>`).join('')}</div></div>` : ''}
      <div class="row center">
        <button class="btn big" data-map>🗺️ Yolculuğa dön</button>
        ${nextOpen ? `<a class="btn big primary" href="#/ogrenci/${encodeURIComponent(code)}/harf/${encodeURIComponent(nextCh)}">Sıradaki harf: <span class="lc">${nextCh}</span> →</a>` : ''}
      </div>
      ${!nextOpen && nextCh ? '<p class="muted">Sıradaki harfi öğretmenin açacak.</p>' : ''}
    </div>`;
    chime(true);
    if (getState().settings.speakFeedback) play(phraseKey('Harfi tamamladın. Harika çalıştın!'), 'Harfi tamamladın. Harika çalıştın!', 0.95);
    $('[data-map]', body).onclick = () => onBack && onBack();
    $$('[data-cert]', body).forEach((b) => b.onclick = () => openCertificate(code, b.dataset.cert));
  };
  run();
}

// ---------------- Adım: Harfle tanış ----------------
export function animatedLetterSVG(ch, size = 190) {
  const def = STROKES[ch];
  if (!def) return '';
  const vbW = def.w + 10;
  let delay = 0;
  const paths = def.s.map((d) => {
    const el = `<path d="${d}" pathLength="1" class="anim-stroke" style="animation-delay:${delay}s"/>`;
    delay += 0.9;
    return el;
  }).join('');
  return `<svg class="anim-letter" viewBox="-5 0 ${vbW} 100" width="${(size * vbW) / 100}" height="${size}" aria-label="${ch} harfinin yazılışı">
    <line x1="-5" x2="${vbW}" y1="10" y2="10" class="ln faint"/><line x1="-5" x2="${vbW}" y1="40" y2="40" class="ln mid"/>
    <line x1="-5" x2="${vbW}" y1="70" y2="70" class="ln base"/>
    ${def.s.map((d) => `<path d="${d}" class="ghost-stroke"/>`).join('')}${paths}</svg>`;
}

function highlight(word, ch) {
  return [...word].map((c) => (c === ch ? `<b class="hl">${c}</b>` : c)).join('');
}

function intro(body, ch, done) {
  const my = seq;
  const ex = WORDS.filter((w) => has(w.w, ch));
  const examples = [...shuffle(ex.filter((w) => w.w.startsWith(ch))), ...shuffle(ex.filter((w) => !w.w.startsWith(ch)))].slice(0, 4);
  body.innerHTML = `
    <div class="intro">
      <div class="intro-card">
        <div class="intro-letters lc"><span>${upper(ch)}</span><span>${ch}</span></div>
        <button class="btn sound big" data-snd>🔊 Sesi dinle</button>
        <p class="muted">${VOWEL_HINT(ch)}</p>
      </div>
      <div class="intro-write">
        <div class="anim-pair" data-anim>${animatedLetterSVG(ch)}${STROKES[upper(ch)] ? animatedLetterSVG(upper(ch)) : ''}</div>
        <button class="btn ghost" data-replay>↻ Yazılışını yeniden göster</button>
      </div>
    </div>
    <h3 class="center">Bu kelimelerde «${ch}» sesi var. Dinle!</h3>
    <div class="examples">${examples.map((w) => `<button class="ex-card" data-w="${esc(w.w)}"><span class="pic">${w.e}</span><span class="lc">${highlight(w.w, ch)}</span></button>`).join('')}</div>
    <div class="act-tools"><button class="btn primary big" data-go>Hazırım →</button></div>`;
  const say = () => playLetter(ch);
  $('[data-snd]', body).onclick = say;
  $('[data-replay]', body).onclick = () => { const a = $('[data-anim]', body); a.innerHTML = a.innerHTML; };
  $$('.ex-card', body).forEach((b) => b.onclick = async () => {
    b.classList.add('on'); await playWord(b.dataset.w); b.classList.remove('on');
  });
  $('[data-go]', body).onclick = () => { seq++; done(); };
  later(async () => {
    if (my !== seq) return;
    await say();
    for (const b of $$('.ex-card', body)) {
      if (my !== seq) return;
      b.classList.add('on'); await playWord(b.dataset.w); b.classList.remove('on');
      await new Promise((r) => setTimeout(r, 250));
    }
  }, 400);
}
const VOWEL_HINT = (ch) => ('aeıioöuü'.includes(ch)
  ? 'Bu bir ünlü ses. Ağzını açarak, sesi uzatarak söyleyebilirsin.'
  : 'Bu bir ünsüz ses. Sesi yalın söyle; sonuna ünlü ekleme.');

// ---------------- Adım: Sesi bul (ses farkındalığı) ----------------
function hunt({ body, fb, ch, tally, next }) {
  const my = seq;
  const yes = WORDS.filter((w) => has(w.w, ch));
  const no = WORDS.filter((w) => !has(w.w, ch));
  const target = pick(yes);
  const opts = placeAnswer('hunt', [target, ...shuffle(no).slice(0, 2)], target);
  let first = true;
  body.innerHTML = `
    <div class="prompt"><button class="btn sound" data-snd>🔊 <span>«${ch}» sesi</span></button><p>Resimlerin adlarını dinle. Adında <b class="lc">«${ch}»</b> sesi olan resmi seç.</p></div>
    <div class="choices pics hunt">${opts.map((o) => `<div class="hunt-opt"><button class="choice pic-card" data-w="${esc(o.w)}">${o.e}</button>
      <button class="btn tiny ghost" data-say="${esc(o.w)}" aria-label="Adını dinle">🔊</button></div>`).join('')}</div>`;
  $('[data-snd]', body).onclick = () => playLetter(ch);
  $$('[data-say]', body).forEach((b) => b.onclick = () => playWord(b.dataset.say));
  const cards = $$('.choice', body);
  cards.forEach((b) => b.onclick = () => {
    const ok = b.dataset.w === target.w;
    if (first) { first = false; tally(ok); } else if (!ok) tally(false);
    if (ok) {
      b.classList.add('right'); cards.forEach((x) => x.disabled = true);
      seq++;
      feedback(fb, `Evet! «${target.w}» kelimesinde «${ch}» sesi var.`, true, 'Doğru yanıtı buldun.');
      later(next, 1700);
    } else {
      b.classList.add('wrong'); b.disabled = true;
      feedback(fb, `«${b.dataset.w}» kelimesinde «${ch}» sesi yok. Bir daha dinleyelim.`, false, 'Sesi bir kez daha dinleyelim.');
    }
  });
  later(async () => {
    await playLetter(ch);
    for (const b of cards) {
      if (my !== seq) return;
      b.classList.add('on'); await playWord(b.dataset.w); b.classList.remove('on');
      await new Promise((r) => setTimeout(r, 300));
    }
  }, 300);
}

// ---------------- Adım: Ses nerede? (başta, ortada, sonda) ----------------
function position({ body, fb, ch, tally, next }) {
  const w = pick(positionWords(ch));
  const chars = [...w.w];
  const i = chars.indexOf(ch);
  const ans = i === 0 ? 0 : i === chars.length - 1 ? 2 : 1;
  const names = ['başta', 'ortada', 'sonda'];
  let first = true;
  body.innerHTML = `
    <div class="prompt"><div class="pic">${w.e}</div><button class="btn sound" data-snd>🔊 <span>Dinle</span></button>
      <p><b class="lc">«${ch}»</b> sesi kelimenin neresinde? Başında mı, ortasında mı, sonunda mı?</p></div>
    <div class="train">${names.map((n, k) => `<button class="wagon" data-k="${k}"><span class="wagon-ico">${k === 0 ? '🚂' : '🚃'}</span><b>${n}</b></button>`).join('')}</div>`;
  const say = () => playWord(w.w);
  $('[data-snd]', body).onclick = say;
  later(say, 300);
  $$('.wagon', body).forEach((b) => b.onclick = () => {
    const ok = +b.dataset.k === ans;
    if (first) { first = false; tally(ok); } else if (!ok) tally(false);
    if (ok) {
      b.classList.add('right'); $$('.wagon', body).forEach((x) => x.disabled = true);
      body.querySelector('.prompt p').innerHTML = `<span class="lc word-reveal">${highlight(w.w, ch)}</span>`;
      feedback(fb, `Evet, «${ch}» sesi ${names[ans]}.`, true, 'Doğru yanıtı buldun.');
      later(next, 1900);
    } else {
      b.classList.add('wrong'); b.disabled = true;
      feedback(fb, 'Kelimeyi yavaşça bir kez daha dinleyelim.', false, 'Sesi bir kez daha dinleyelim.');
      later(say, 600);
    }
  });
}
