// Yedi modülün etkinlikleri ve ortak etkinlik motoru.
import { MODULE_BY_ID, MODULES, CONFUSABLE, MIRRORABLE, SYMBOLS, WORDS, ALL_LETTERS, VOWELS, upper, lower, lettersOf, sentenceText, textBody } from './data.js';
import { student, getState, learnedLetters, availableWords, availableSentences, availableSyllables, availableTexts, recordAnswer, recordDrawing, letterWeight } from './store.js';
import { playLetter, playWord, playSyllable, play, sentenceKey, questionKey } from './audio.js';
import { TraceBoard, LEVELS } from './draw.js';
import { $, $$, h, esc, shuffle, pick, placeAnswer, weightedPick, feedback, clearFeedback } from './ui.js';

const focusByStudent = {};
let activeBoard = null;
let timers = [];
export const later = (fn, ms) => timers.push(setTimeout(fn, ms));
export function stopActivity() {
  timers.forEach(clearTimeout);
  timers = [];
  if (activeBoard) { activeBoard.destroy(); activeBoard = null; }
}

const insufficient = (body, msg) => {
  body.innerHTML = `<div class="empty-state"><div class="big-emoji">🔤</div><p>${esc(msg)}</p>
    <p class="muted">Öğretmen panelinden “Sınıf ve ayarlar” bölümünde öğrenilmiş ses gruplarını güncelleyebilirsiniz.</p></div>`;
};

/** Etkinlik ekranını kurar. */
export function runModule(root, code, mid, { teacher = false, onBack } = {}) {
  stopActivity();
  const mod = MODULE_BY_ID[mid];
  const ms = student(code).modules[mid];
  const learned = learnedLetters(code);
  const passStreak = getState().settings.passStreak;

  root.innerHTML = `
  <section class="activity" style="--mc:${mod.color}">
    <div class="act-head">
      <button class="btn ghost back" data-back aria-label="Modüllere dön">← Modüller</button>
      <div class="act-title"><span class="act-icon">${mod.icon}</span><div><h2>${esc(mod.title)}</h2><p class="muted">${esc(mod.task)}</p></div></div>
      <div class="act-meta">
        <div class="stage-pill" data-stage></div>
        <div class="streak" data-streak aria-label="Art arda doğru"></div>
        <label class="focus-sel">Harf
          <select data-focus><option value="">Karışık</option>${learned.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
        </label>
      </div>
    </div>
    <div class="act-body" data-body></div>
    <div class="feedback" data-fb aria-live="polite"></div>
  </section>`;

  const body = $('[data-body]', root);
  const fb = $('[data-fb]', root);
  const focusSel = $('[data-focus]', root);
  focusSel.value = focusByStudent[code] || '';
  if (!['m1', 'm2', 'm3', 'm4'].includes(mid)) focusSel.closest('label').hidden = true;

  const ctx = {
    code, mid, mod, body, fb, learned, teacher, ms,
    levelOverride: null,
    get focus() { return focusByStudent[code] || null; },
    get stage() { return Math.min(ms.stage, mod.stages.length - 1); },
    pickLetter(pool = learned) {
      if (this.focus && pool.includes(this.focus)) return this.focus;
      const ch = weightedPick(pool, (c) => letterWeight(code, c, mid), this._last);
      this._last = ch;
      return ch;
    },
    result(r) {
      const out = recordAnswer(code, mid, r);
      updateHead();
      if (out.stageUp) {
        const done = out.stage >= out.total;
        later(() => showStageUp(ctx, done), 1300);
        return { ...out, interrupted: true };
      }
      return out;
    },
    next() { clearFeedback(fb); ROUNDS[mid](ctx); },
    words: () => availableWords(learned),
    syllables: () => availableSyllables(learned),
    sentences: () => availableSentences(learned),
    texts: () => availableTexts(learned),
  };

  function updateHead() {
    const st = Math.min(ms.stage, mod.stages.length - 1);
    const lvl = ctx.levelOverride ? ctx.levelOverride - 1 : st;
    $('[data-stage]', root).innerHTML = mod.stages.length > 1
      ? `Aşama ${lvl + 1}/${mod.stages.length}: <b>${esc(mod.stages[lvl])}</b>${ms.done ? ' ✓' : ''}`
      : (ms.done ? 'Tamamlandı ✓' : 'Çalışma');
    $('[data-streak]', root).innerHTML = Array.from({ length: passStreak }, (_, i) =>
      `<span class="${i < ms.streak ? 'on' : ''}">★</span>`).join('');
  }
  ctx.updateHead = updateHead;
  updateHead();

  $('[data-back]', root).onclick = () => { stopActivity(); onBack && onBack(); };
  focusSel.onchange = () => { focusByStudent[code] = focusSel.value || null; ctx.next(); };

  ROUNDS[mid](ctx);
}

function showStageUp(ctx, done) {
  const { body, mod, ms } = ctx;
  const idx = MODULES.findIndex((m) => m.id === mod.id);
  const next = MODULES[idx + 1];
  const st = Math.min(ms.stage, mod.stages.length - 1);
  body.innerHTML = `<div class="stage-up">
    <div class="big-emoji">${done ? '🏅' : '🎉'}</div>
    <h3>${done ? 'Bu modülü tamamladın!' : 'Yeni aşama açıldı: ' + esc(mod.stages[st])}</h3>
    <p class="muted">${done ? 'Art arda doğru yanıtlarla geçiş ölçütünü sağladın.' : 'Şimdi destek biraz azalıyor.'}</p>
    <div class="row center">
      <button class="btn big primary" data-cont>${done ? 'Tekrar çalış' : 'Devam et'}</button>
      ${done && next ? `<button class="btn big" data-nextmod>Sonraki: ${esc(next.title)} →</button>` : ''}
    </div></div>`;
  clearFeedback(ctx.fb);
  ctx.updateHead();
  $('[data-cont]', body).onclick = () => ctx.next();
  const nb = $('[data-nextmod]', body);
  if (nb) nb.onclick = () => { location.hash = `#/ogrenci/${encodeURIComponent(ctx.code)}/${next.id}`; };
}

// ---------- yardımcılar ----------
function letterDistractors(target, pool, n) {
  const conf = (CONFUSABLE[target] || []).filter((c) => pool.includes(c) && c !== target);
  const rest = shuffle(pool.filter((c) => c !== target && !conf.includes(c)));
  return shuffle(conf).concat(rest).slice(0, n);
}
const soundBtn = (label = 'Dinle') => `<button class="btn sound" data-sound aria-label="${label}">🔊 <span>${label}</span></button>`;

// ---------- Modül 1: Sesi fark et ve harfi tanı ----------
function m1(ctx) {
  const { body, fb, learned } = ctx;
  // Çok az harf öğrenilmişken (ilk harfler) çeldiriciler programdaki ilk harflerden seçilir.
  const pool = learned.length >= 4 ? learned : ALL_LETTERS.slice(0, Math.max(6, learned.length + 3));
  const target = ctx.pickLetter(learned);
  const nOpt = Math.min(pool.length, pool.length >= 8 ? 4 : 3);
  const opts = placeAnswer('m1', [target, ...letterDistractors(target, pool, nOpt - 1)], target);
  let answered = false, hints = 0;
  body.innerHTML = `
    <div class="prompt">${soundBtn('Sesi dinle')}<p>Sesi dinle. Bu sesin harfini seç.</p></div>
    <div class="choices letters">${opts.map((c) => `<button class="choice letter-card" data-v="${c}"><span class="lc">${c}</span><small>${upper(c)}</small></button>`).join('')}</div>
    <div class="act-tools"><button class="btn ghost" data-hint>💡 İpucu</button></div>`;
  const say = () => playLetter(target);
  $('[data-sound]', body).onclick = say;
  later(say, 250);
  $('[data-hint]', body).onclick = (e) => {
    const wrong = $$('.choice:not([disabled])', body).filter((b) => b.dataset.v !== target);
    // En az bir çeldirici kalacak biçimde bir yanlış seçeneği kaldırır.
    if (wrong.length > 1) {
      const b = pick(wrong); b.disabled = true; b.classList.add('faded'); hints++;
    }
    if (wrong.length <= 2) e.currentTarget.disabled = true;
  };
  $$('.choice', body).forEach((b) => b.onclick = () => {
    if (b.dataset.v === target) {
      b.classList.add('right');
      $$('.choice', body).forEach((x) => x.disabled = true);
      const first = !answered;
      answered = true;
      feedback(fb, `Evet, «${target}» sesinin harfini buldun.`, true, 'Evet, doğru harfi buldun.');
      const out = first ? ctx.result({ correct: true, letters: [target], hints }) : {};
      if (!out.interrupted) later(() => ctx.next(), 1500);
    } else {
      b.classList.add('wrong'); b.disabled = true;
      if (!answered) { answered = true; ctx.result({ correct: false, letters: [target], hints }); }
      feedback(fb, 'Sesi bir kez daha dinleyelim.', false);
      later(say, 700);
    }
  });
}

// ---------- Modül 2: Harfi ayırt et ----------
function m2(ctx) {
  const { body, fb, learned } = ctx;
  if (!learned.length) return insufficient(body, 'Öğrenilmiş ses bulunmuyor.');
  const target = ctx.pickLetter();
  const total = 12, nT = 2 + Math.floor(Math.random() * 3); // 2–4 hedef
  const cells = Array(nT).fill({ v: target, t: true });
  const conf = (CONFUSABLE[target] || []);
  const others = ALL_LETTERS.filter((c) => c !== target && !conf.includes(c));
  while (cells.length < total) {
    const r = Math.random();
    if (r < 0.45 && conf.length) cells.push({ v: pick(conf) });
    else if (r < 0.62 && MIRRORABLE.has(target)) cells.push({ v: target, mirror: true });
    else if (r < 0.82) cells.push({ v: pick(SYMBOLS) });
    else cells.push({ v: pick(others) });
  }
  const grid = shuffle(cells);
  let found = 0, wrongTaps = 0, done = false;
  body.innerHTML = `
    <div class="prompt"><div class="target-card"><span class="lc">${target}</span></div>${soundBtn()}<p>Bütün <b class="lc">${target}</b> harflerini bul ve dokun. <span class="muted">(${nT} tane)</span></p></div>
    <div class="grid-find">${grid.map((c, i) => `<button class="cell" data-i="${i}"><span class="lc ${c.mirror ? 'mirror' : ''}">${esc(c.v)}</span></button>`).join('')}</div>`;
  $('[data-sound]', body).onclick = () => playLetter(target);
  later(() => playLetter(target), 250);
  $$('.cell', body).forEach((b) => b.onclick = () => {
    if (done) return;
    const c = grid[+b.dataset.i];
    if (c.t) {
      b.classList.add('right'); b.disabled = true; found++;
      if (found === nT) {
        done = true;
        const ok = wrongTaps === 0;
        feedback(fb, ok ? `Bütün «${target}» harflerini buldun.` : 'Hepsini buldun. Bir dahaki sefere biçimlere daha dikkatli bakalım.', ok, ok ? 'Bütün harfleri buldun.' : null);
        const out = ctx.result({ correct: ok, letters: [target], extra: { yanlisDokunma: wrongTaps } });
        if (!out.interrupted) later(() => ctx.next(), 1700);
      }
    } else {
      wrongTaps++;
      b.classList.add('wrong'); b.disabled = true;
      feedback(fb, c.mirror ? 'Bu harf ters dönmüş. Yönüne bakalım.' : 'Bu, aradığımız harf değil. Biçimine yeniden bakalım.', false);
    }
  });
}

// ---------- Modül 3: İzi takip et ----------
function m3(ctx) { traceRound(ctx, false); }
// ---------- Modül 4: Bağımsız yaz ----------
function m4(ctx) { traceRound(ctx, true); }

function traceRound(ctx, independent) {
  const { body, fb, learned, teacher } = ctx;
  if (!learned.length) return insufficient(body, 'Öğrenilmiş ses bulunmuyor.');
  const sound = ctx.pickLetter();
  const target = ctx.upperCase ? upper(sound) : sound; // büyük harf yazımı (harf derslerinde)
  const level = independent ? LEVELS.FREE : (ctx.levelOverride || ctx.stage + 1);
  const mode = getState().settings.writeMode;
  const hidden = independent && (mode === 'soyle' || (mode === 'karisik' && Math.random() < 0.5));
  let hints = 0, success = false;
  const levelNames = ['Tam rehber', 'Azaltılmış rehber', 'Rehbersiz'];
  body.innerHTML = `
    <div class="trace-head">
      <div class="target-card ${hidden ? 'hidden-letter' : ''}" data-card><span class="lc">${hidden ? '?' : target}</span></div>
      ${soundBtn()}
      <p>${independent ? (hidden ? 'Sesi dinle ve harfini kendin yaz.' : 'Bu harfi boş alana kendin yaz.') : 'Yeşil noktadan başla, okları izle.'}</p>
      ${!independent && !ctx.lesson ? `<div class="level-tabs" role="tablist">${levelNames.map((n, i) =>
        `<button class="tab ${level === i + 1 ? 'on' : ''}" data-lv="${i + 1}" ${teacher ? '' : 'disabled'}>${n}</button>`).join('')}</div>` : ''}
    </div>
    <div data-board></div>
    <div class="act-tools">
      ${hidden ? '<button class="btn ghost" data-show>💡 Harfi göster</button>' : ''}
      <button class="btn ghost" data-clear>🧽 Temizle</button>
      <button class="btn primary big" data-done>✔ Bitti</button>
    </div>
    <p class="note">Ekranda bırakılan iz, kâğıt üzerinde yazma becerisinin kanıtı sayılmaz.</p>`;
  if (activeBoard) activeBoard.destroy();
  const board = activeBoard = new TraceBoard($('[data-board]', body));
  board.setLetter(target, level);
  const say = () => playLetter(sound);
  $('[data-sound]', body).onclick = say;
  later(say, 250);
  $('[data-clear]', body).onclick = () => { board.clear(); clearFeedback(fb); };
  const show = $('[data-show]', body);
  if (show) show.onclick = () => { $('[data-card] .lc', body).textContent = target; $('[data-card]', body).classList.remove('hidden-letter'); hints = 1; show.disabled = true; };
  $$('[data-lv]', body).forEach((b) => b.onclick = () => { ctx.levelOverride = +b.dataset.lv; ctx.updateHead(); traceRound(ctx, independent); });
  $('[data-done]', body).onclick = () => {
    if (success) return;
    if (!board.hasInk) return feedback(fb, 'Önce harfi yazalım.', null);
    const r = board.evaluate();
    recordDrawing(ctx.code, { m: ctx.mid, l: target, lv: level, sc: r.score, ok: r.ok, hint: hints });
    if (r.ok) {
      success = true;
      feedback(fb, independent ? `«${target}» harfini kendin yazdın.` : 'İzi baştan sona takip ettin.', true, independent ? 'Harfi kendin yazdın.' : null);
      const out = ctx.result({ correct: true, letters: [sound], hints });
      if (!out.interrupted) later(() => ctx.next(), 1600);
    } else {
      ctx.result({ correct: false, letters: [sound], hints });
      board.showStartHint();
      feedback(fb, r.coverage < 0.7 ? 'Başlangıç noktasına dönüp bir kez daha deneyelim.' : 'Çizgilerin dışına taştı. Yavaşça bir kez daha deneyelim.', false);
      later(() => board.clear() || board.showStartHint(), 1600);
    }
  };
}

// ---------- Modül 5: Birleştir ----------
function m5(ctx) {
  const { body, fb, learned } = ctx;
  let stageIdx = ctx.stage;
  let items;
  const words = ctx.words().filter((w) => [...w.w].length <= 7);
  if (stageIdx === 1 && words.length) items = words.map((w) => ({ text: w.w, emoji: w.e, word: true }));
  else items = ctx.syllables().map((s) => ({ text: s }));
  if (!items.length) return insufficient(body, 'Hece kurmak için en az bir ünlü ve bir ünsüz öğrenilmiş olmalı.');
  const item = weightedPick(items, (it) => Math.max(...lettersOf(it.text).map((c) => letterWeight(ctx.code, c, 'm5'))), ctx._lastItem);
  ctx._lastItem = item;
  const target = [...item.text];
  const extraPool = learned.filter((c) => !target.includes(c));
  const tiles = shuffle([...target, ...shuffle(extraPool).slice(0, 2)]).map((v, i) => ({ v, i, used: false }));
  const filled = [];
  let attempted = false, hints = 0, done = false;
  body.innerHTML = `
    <div class="prompt">${soundBtn()}${item.emoji ? `<div class="pic">${item.emoji}</div>` : ''}
      <p>${item.word ? 'Dinle ve kelimeyi harflerle kur.' : 'Dinle ve heceyi harflerle kur.'}</p></div>
    <div class="slots" data-slots>${target.map(() => '<div class="slot"></div>').join('')}</div>
    <div class="tiles" data-tiles>${tiles.map((t) => `<button class="tile" data-t="${t.i}"><span class="lc">${t.v}</span></button>`).join('')}</div>
    <div class="act-tools"><button class="btn ghost" data-undo>↩ Geri al</button><button class="btn ghost" data-hint>💡 İpucu</button></div>`;
  const say = () => (item.word ? playWord(item.text) : playSyllable(item.text));
  $('[data-sound]', body).onclick = say;
  later(say, 250);
  const slots = $$('.slot', body);
  const draw = () => {
    slots.forEach((s, i) => { s.innerHTML = filled[i] ? `<span class="lc">${filled[i].v}</span>` : ''; s.className = 'slot' + (filled[i] ? ' full' : ''); });
    $$('.tile', body).forEach((b) => { b.disabled = tiles[+b.dataset.t].used; });
  };
  const check = () => {
    if (filled.length < target.length) return;
    const ok = filled.map((t) => t.v).join('') === item.text;
    if (ok) {
      done = true;
      slots.forEach((s) => s.classList.add('right'));
      feedback(fb, `Sesleri doğru birleştirdin: «${item.text}».`, true, 'Sesleri doğru birleştirdin.');
      const out = !attempted ? ctx.result({ correct: true, letters: lettersOf(item.text), hints, extra: { [item.word ? 'kelime' : 'hece']: 1 } }) : {};
      attempted = true;
      if (!out.interrupted) later(() => ctx.next(), 1600);
    } else {
      if (!attempted) { attempted = true; ctx.result({ correct: false, letters: lettersOf(item.text), hints }); }
      slots.forEach((s) => s.classList.add('wrong'));
      feedback(fb, 'Sesleri sırayla söyleyip yeniden deneyelim.', false);
      later(() => { filled.splice(0).forEach((t) => (t.used = false)); draw(); }, 1100);
    }
  };
  $$('.tile', body).forEach((b) => b.onclick = () => {
    if (done || filled.length >= target.length) return;
    const t = tiles[+b.dataset.t];
    t.used = true; filled.push(t); draw(); check();
  });
  $('[data-undo]', body).onclick = () => { if (done) return; const t = filled.pop(); if (t) t.used = false; draw(); };
  $('[data-hint]', body).onclick = () => {
    if (done) return;
    // yanlış yerleşenleri geri al, bir sonraki doğru harfi yerleştir
    let k = 0;
    while (k < filled.length && filled[k].v === target[k]) k++;
    filled.splice(k).forEach((t) => (t.used = false));
    const t = tiles.find((x) => !x.used && x.v === target[k]);
    if (t) { t.used = true; filled.push(t); hints++; }
    draw(); check();
  };
  draw();
}

// ---------- Modül 6: Oku ve eşleştir ----------
function m6(ctx) {
  const { body, fb } = ctx;
  const words = ctx.words();
  if (!words.length) return insufficient(body, 'Öğrenilmiş seslerle oluşturulmuş kelime henüz yok.');
  const w = weightedPick(words, (x) => Math.max(...lettersOf(x.w).map((c) => letterWeight(ctx.code, c, 'm6'))), ctx._lastW);
  ctx._lastW = w;
  const nOpt = 3;
  const others = WORDS.filter((x) => x.e !== w.e);
  const similar = shuffle(others.filter((x) => x.w[0] === w.w[0] || Math.abs(x.w.length - w.w.length) <= 1));
  const ds = [...new Set([...similar, ...shuffle(others)])].slice(0, nOpt - 1);
  const opts = placeAnswer('m6', [w, ...ds], w);
  let answered = false, hints = 0;
  body.innerHTML = `
    <div class="prompt"><p>Kelimeyi oku. Anlamına uygun resmi seç.</p></div>
    <div class="word-card lc">${esc(w.w)}</div>
    <div class="choices pics">${opts.map((o) => `<button class="choice pic-card" data-w="${esc(o.w)}" aria-label="resim">${o.e}</button>`).join('')}</div>
    <div class="act-tools">${soundBtn('Dinle (ipucu)')}</div>`;
  $('[data-sound]', body).onclick = () => { hints = 1; playWord(w.w); };
  $$('.choice', body).forEach((b) => b.onclick = () => {
    const first = !answered;
    answered = true;
    if (b.dataset.w === w.w) {
      b.classList.add('right');
      $$('.choice', body).forEach((x) => x.disabled = true);
      feedback(fb, 'Kelimeyi okuyup doğru resmi seçtin.', true);
      const out = first ? ctx.result({ correct: true, letters: lettersOf(w.w), hints }) : {};
      if (!out.interrupted) later(() => ctx.next(), 1500);
    } else {
      b.classList.add('wrong'); b.disabled = true;
      if (first) ctx.result({ correct: false, letters: lettersOf(w.w), hints });
      feedback(fb, 'Kelimeyi harf harf okuyup yeniden bakalım.', false);
    }
  });
}

// ---------- Modül 7: Cümle kur ve anla ----------
function m7(ctx) {
  const { body, fb } = ctx;
  if (ctx.stage === 1) { const ts = ctx.texts(); if (ts.length) return textRound(ctx, ts); }
  const sents = ctx.sentences();
  if (!sents.length) return insufficient(body, 'Öğrenilmiş seslerle oluşturulmuş cümle henüz yok.');
  const s = weightedPick(sents, () => 1, ctx._lastS);
  ctx._lastS = s;
  let order = shuffle(s.t.map((t, i) => ({ t, i })));
  if (s.t.length > 1) { let g = 0; while (order.every((o, k) => o.i === k) && g++ < 10) order = shuffle(order); }
  const built = [];
  let buildFirstOk = null, hints = 0;
  const listening = getState().settings.listeningMode;
  body.innerHTML = `
    <div class="prompt"><p>Kelimeleri doğru sıraya koyarak cümleyi kur.</p></div>
    <div class="sentence-line" data-line></div>
    <div class="tiles words" data-tiles>${order.map((o, k) => `<button class="tile word" data-k="${k}"><span class="lc">${esc(o.t)}</span></button>`).join('')}</div>
    <div class="act-tools"><button class="btn ghost" data-undo>↩ Geri al</button>${soundBtn('Dinle (ipucu)')}</div>`;
  const line = $('[data-line]', body);
  const draw = () => {
    line.innerHTML = built.length ? built.map((o) => `<span class="w lc">${esc(o.t)}</span>`).join(' ') + (built.length === s.t.length ? '<span class="lc">.</span>' : '') : '<span class="muted">…</span>';
    $$('.tile', body).forEach((b) => { b.disabled = built.includes(order[+b.dataset.k]); });
  };
  $('[data-sound]', body).onclick = () => { hints = 1; play(sentenceKey(s.id), sentenceText(s), 0.8); };
  $('[data-undo]', body).onclick = () => { built.pop(); draw(); };
  $$('.tile', body).forEach((b) => b.onclick = () => {
    built.push(order[+b.dataset.k]); draw();
    if (built.length < s.t.length) return;
    const ok = built.every((o, k) => o.t === s.t[k]);
    if (buildFirstOk === null) buildFirstOk = ok;
    if (ok) {
      line.classList.add('right');
      feedback(fb, 'Cümleyi doğru kurdun. Şimdi soruyu yanıtlayalım.', true);
      later(() => question(), 1400);
    } else {
      line.classList.add('wrong');
      feedback(fb, 'Cümleyi okuyup kelimelerin sırasına yeniden bakalım.', false);
      later(() => { built.length = 0; line.classList.remove('wrong'); draw(); }, 1200);
    }
  });
  draw();

  function question() {
    clearFeedback(fb);
    const opts = placeAnswer('m7', [s.a, ...s.d], s.a);
    let qFirst = null;
    body.innerHTML = `
      <div class="sentence-line right lc">${esc(sentenceText(s))}</div>
      <div class="prompt">${soundBtn('Soruyu dinle')}<p class="question">${esc(s.q)}</p></div>
      <div class="choices pics">${opts.map((e) => `<button class="choice pic-card" data-e="${e}">${e}</button>`).join('')}</div>
      ${listening ? '<p class="note">Sınıf ayarı: cümleler sesli okunuyor (dinlediğini anlama).</p>' : ''}`;
    const sayQ = () => play(questionKey(s.q), s.q, 0.85);
    $('[data-sound]', body).onclick = sayQ;
    later(sayQ, 300);
    $$('.choice', body).forEach((b) => b.onclick = () => {
      const ok = b.dataset.e === s.a;
      if (qFirst === null) qFirst = ok;
      if (ok) {
        b.classList.add('right');
        $$('.choice', body).forEach((x) => x.disabled = true);
        const all = buildFirstOk && qFirst;
        feedback(fb, all ? 'Cümleyi kurdun ve doğru anladın.' : 'Doğru yanıtı buldun.', true);
        const out = ctx.result({
          correct: all, letters: lettersOf(s.t.join('')), hints,
          extra: { kurmaDogru: buildFirstOk ? 1 : 0, kurmaYanlis: buildFirstOk ? 0 : 1, soruDogru: qFirst ? 1 : 0, soruYanlis: qFirst ? 0 : 1 },
        });
        if (!out.interrupted) later(() => ctx.next(), 1700);
      } else {
        b.classList.add('wrong'); b.disabled = true;
        feedback(fb, 'Cümleyi bir kez daha okuyalım.', false);
      }
    });
  }
}

// ---------- Modül 7, 2. aşama: Kısa metin (okuma ve okuduğunu anlama) ----------
export function textRound(ctx, texts) {
  const { body, fb } = ctx;
  const t = weightedPick(texts, () => 1, ctx._lastT);
  ctx._lastT = t;
  let qi = 0, allFirst = true, hints = 0, nRight = 0;
  body.innerHTML = `
    <div class="text-card">
      <h3 class="text-title lc">${esc(t.title)}</h3>
      ${t.s.map((x) => `<p class="text-line lc">${esc(x)}</p>`).join('')}
    </div>
    <div class="prompt"><p>Metni oku. Bitirince sorulara geç.</p></div>
    <div class="act-tools">${soundBtn('Dinle (ipucu)')}<button class="btn primary big" data-go>Okudum →</button></div>`;
  $('[data-sound]', body).onclick = () => { hints = 1; play('metin:' + t.id, textBody(t), 0.8); };
  $('[data-go]', body).onclick = () => ask();
  function ask() {
    clearFeedback(fb);
    const q = t.qs[qi];
    const opts = placeAnswer('m7t', [q.a, ...q.d], q.a);
    let first = null;
    body.innerHTML = `
      <div class="text-card small">${t.s.map((x) => `<p class="text-line lc">${esc(x)}</p>`).join('')}</div>
      <div class="prompt">${soundBtn('Soruyu dinle')}<p class="question">${esc(q.q)}</p><span class="chip">${qi + 1}/${t.qs.length}</span></div>
      <div class="choices pics">${opts.map((e) => `<button class="choice pic-card" data-e="${e}">${e}</button>`).join('')}</div>`;
    const sayQ = () => play(questionKey(q.q), q.q, 0.85);
    $('[data-sound]', body).onclick = sayQ;
    later(sayQ, 300);
    $$('.choice', body).forEach((b) => b.onclick = () => {
      const ok = b.dataset.e === q.a;
      if (first === null) { first = ok; if (ok) nRight++; else allFirst = false; }
      if (!ok) { b.classList.add('wrong'); b.disabled = true; feedback(fb, 'Metni bir kez daha okuyalım.', false); return; }
      b.classList.add('right');
      $$('.choice', body).forEach((x) => x.disabled = true);
      qi++;
      if (qi < t.qs.length) { feedback(fb, 'Doğru yanıtı buldun.', true); later(ask, 1300); return; }
      feedback(fb, allFirst ? 'Metni okudun ve bütün soruları doğru yanıtladın.' : 'Doğru yanıtı buldun.', true, allFirst ? 'Metni okudun ve soruları doğru yanıtladın.' : 'Doğru yanıtı buldun.');
      const out = ctx.result({ correct: allFirst, letters: lettersOf(textBody(t)), hints, extra: { metinSoruDogru: nRight, metinSoruYanlis: t.qs.length - nRight } });
      if (!out.interrupted) later(() => ctx.next(), 1700);
    });
  }
}

export const ROUNDS = { m1, m2, m3, m4, m5, m6, m7 };

