// Yerel veri deposu (localStorage). Kişisel veri tutulmaz; öğrenciler Ö01–Ö20 kodlarıyla izlenir.
import { GROUPS, MODULES, WORDS, SENTENCES, TEXTS, VOWELS, ALL_LETTERS, letterIndex } from './data.js';

const KEY = 'sesizi.v1';

const defaults = () => ({
  version: 1,
  curriculum: 2024,
  teacher: null, // { name, school, className, year, pin } — yalnızca bu cihazda
  settings: {
    learnedUpTo: 5, // sınıfın geldiği son harfin sıra numarası (0 = a, 5 = l: ANETİL tamam)
    selfPaced: false, // öğrenci harf dersini bitirince sonraki harf kendiliğinden açılsın
    yearStart: '', // ilk okuma yazma başlangıç tarihi (haftalık plan için)
    sessionMinutes: 20,
    sessionLimit: true,
    passStreak: 3,
    studentCount: 20,
    pin: '',
    speakFeedback: true,
    writeMode: 'karisik', // goster | soyle | karisik
    listeningMode: false, // cümleler sesli okunduysa "dinlediğini anlama"
  },
  students: {},
  content: { disabled: {}, checked: {}, corrected: {} },
  tests: {},
  maxScores: { sh: 20, yaz: 20, kel: 20, cum: 10 },
  notes: {},
});

// Eski sürüm (2019 programı, ELAKİN sırası, grup onay kutuları) verisini 2024 sırasına taşır.
function migrate(st) {
  const s = st.settings;
  if (st.curriculum !== 2024) {
    if (Array.isArray(s.learnedGroups)) {
      const n = [6, 6, 6, 6, 5].filter((_, i) => s.learnedGroups.includes(i + 1)).reduce((a, b) => a + b, 0);
      s.learnedUpTo = Math.max(0, Math.min(ALL_LETTERS.length - 1, n - 1));
    }
    st.curriculum = 2024;
  }
  delete s.learnedGroups;
  if (!st.teacher && s.pin) st.teacher = { name: '', school: '', className: '', year: '', pin: s.pin };
  delete s.pin;
  return st;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === 1) {
      const d = defaults();
      return migrate({ ...d, ...raw, settings: { ...d.settings, ...raw.settings }, content: { ...d.content, ...raw.content }, maxScores: { ...d.maxScores, ...raw.maxScores } });
    }
  } catch { /* bozuk veri */ }
  return defaults();
}

let state = load();
export const getState = () => state;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* depolama kapalı */ }
}
export function replaceState(next) {
  const d = defaults();
  state = migrate({ ...d, ...next, settings: { ...d.settings, ...(next.settings || {}) }, content: { ...d.content, ...(next.content || {}) } });
  save();
}
export function resetAll() {
  state = defaults();
  save();
}

export const codes = () =>
  Array.from({ length: state.settings.studentCount }, (_, i) => 'Ö' + String(i + 1).padStart(2, '0'));

export const STAGE_COUNT = Object.fromEntries(MODULES.map((m) => [m.id, m.stages.length]));

function emptyModule() {
  return { attempts: 0, correct: 0, wrong: 0, hints: 0, hintedCorrect: 0, streak: 0, stage: 0, done: false, letters: {}, extra: {} };
}

export function student(code) {
  let s = state.students[code];
  if (!s) {
    s = state.students[code] = { modules: {}, unlocked: ['m1'], letters: {}, drawings: [], sessions: [], lastActive: null };
  }
  s.lessons ||= {}; // harf dersleri: { a: { step, c, n, stars, done, date } }
  s.certs ||= {};   // belgeler: { g1: tarih, ..., final: tarih }
  if (s.upTo === undefined) s.upTo = null; // öğrenciye özel harf düzeyi (null = sınıf düzeyi)
  MODULES.forEach((m) => { s.modules[m.id] ||= emptyModule(); });
  return s;
}

export const isUnlocked = (code, mid) => student(code).unlocked.includes(mid);

export function setUnlocked(code, mid, on) {
  const s = student(code);
  s.unlocked = s.unlocked.filter((x) => x !== mid);
  if (on) s.unlocked.push(mid);
  save();
}

/** Sınıfın ya da öğrencinin geldiği son harfin sıra numarası. */
export function upToIndex(code) {
  const cls = state.settings.learnedUpTo;
  const s = code && state.students[code];
  return s && s.upTo != null ? s.upTo : cls;
}
/** Öğrenilmiş harfler (2024 programındaki sırayla). code verilirse öğrenciye özel düzey kullanılır. */
export function learnedLetters(code) {
  return ALL_LETTERS.slice(0, upToIndex(code) + 1);
}
/** Belirli bir harfe kadar (o harf dahil) öğrenilmiş sayılan harfler: harf dersleri bu kümeyle çalışır. */
export const lettersThrough = (ch) => ALL_LETTERS.slice(0, letterIndex(ch) + 1);
export const maxLearnedGroup = (code) => {
  const L = new Set(learnedLetters(code));
  return Math.max(0, ...GROUPS.filter((g) => g.letters.every((c) => L.has(c))).map((g) => g.id));
};

const isEnabled = (id) => !state.content.disabled[id];
const allLearned = (letters, set) => letters.every((c) => set.has(c));
const toSet = (x) => new Set(Array.isArray(x) ? x : learnedLetters(x));
const lettersIn = (t) => [...t.toLocaleLowerCase('tr-TR')].filter((c) => /\p{L}/u.test(c));

/** Öğrenilmiş harflerle yazılabilen kelimeler. L: öğrenci kodu ya da harf listesi. */
export function availableWords(L) {
  const set = toSet(L);
  return WORDS.filter((w) => isEnabled(w.id) && allLearned(lettersIn(w.w), set));
}
export function availableSentences(L) {
  const set = toSet(L);
  return SENTENCES.filter((s) => isEnabled(s.id) && allLearned(lettersIn(s.t.join('')), set));
}
export function availableTexts(L) {
  const set = toSet(L);
  return TEXTS.filter((t) => isEnabled(t.id) && allLearned(lettersIn(t.s.join('')), set));
}
export function availableSyllables(L) {
  const Ls = [...toSet(L)];
  const vs = Ls.filter((c) => VOWELS.has(c));
  const cs = Ls.filter((c) => !VOWELS.has(c) && c !== 'ğ');
  const out = [];
  cs.forEach((c) => vs.forEach((v) => { out.push(c + v); out.push(v + c); }));
  return [...new Set(out)];
}

// ---- Harf dersleri, yıldızlar ve belgeler ----
export const starsFor = (c, n) => (!n ? 0 : c / n >= 0.9 ? 3 : c / n >= 0.7 ? 2 : 1);
export function lessonOf(code, ch) {
  const s = student(code);
  return (s.lessons[ch] ||= { step: 0, c: 0, n: 0, stars: 0, done: false, date: null, best: 0 });
}
/** Öğrencinin harf dersini açabileceği son harf (sınıf düzeyi, öğrenciye özel düzey ya da kendi hızında ilerleme). */
export function lessonLimit(code) {
  const s = student(code);
  let lim = upToIndex(code);
  if (state.settings.selfPaced) {
    let k = 0;
    while (k < ALL_LETTERS.length && s.lessons[ALL_LETTERS[k]] && s.lessons[ALL_LETTERS[k]].done) k++;
    lim = Math.max(lim, Math.min(ALL_LETTERS.length - 1, k));
  }
  return lim;
}
export function finishLesson(code, ch) {
  const s = student(code);
  const L = lessonOf(code, ch);
  const stars = starsFor(L.c, L.n);
  L.done = true;
  L.stars = Math.max(L.stars || 0, stars);
  L.best = Math.max(L.best || 0, L.n ? L.c / L.n : 0);
  L.date = Date.now();
  L.step = 0; L.c = 0; L.n = 0;
  const newCerts = [];
  GROUPS.forEach((g) => {
    const key = 'g' + g.id;
    if (!s.certs[key] && g.letters.every((c) => s.lessons[c] && s.lessons[c].done)) { s.certs[key] = Date.now(); newCerts.push(key); }
  });
  if (!s.certs.final && GROUPS.every((g) => s.certs['g' + g.id])) { s.certs.final = Date.now(); newCerts.push('final'); }
  s.lastActive = Date.now();
  save();
  return { stars, newCerts };
}
export const totalStars = (code) => Object.values(student(code).lessons).reduce((a, l) => a + (l.done ? l.stars : 0), 0);
export const lettersDone = (code) => ALL_LETTERS.filter((c) => (student(code).lessons[c] || {}).done).length;

/**
 * Bir yanıtı kaydeder; geçiş ölçütünü (art arda N ipucusuz doğru) uygular.
 * İpucuyla verilen doğru yanıt doğru sayılır ama art arda doğru serisini artırmaz.
 */
export function recordAnswer(code, mid, { correct, letters = [], hints = 0, extra = {} }) {
  const s = student(code);
  const m = s.modules[mid];
  m.attempts++;
  if (correct) m.correct++; else m.wrong++;
  m.hints += hints;
  if (correct && hints) m.hintedCorrect++;
  letters.forEach((ch) => {
    const a = (s.letters[ch] ||= { c: 0, w: 0 });
    const b = (m.letters[ch] ||= { c: 0, w: 0 });
    if (correct) { a.c++; b.c++; } else { a.w++; b.w++; }
  });
  Object.entries(extra).forEach(([k, v]) => { m.extra[k] = (m.extra[k] || 0) + v; });

  let stageUp = false, moduleDone = false;
  const total = STAGE_COUNT[mid];
  if (correct && !hints) {
    m.streak++;
    if (m.streak >= state.settings.passStreak && m.stage < total) {
      m.stage++;
      m.streak = 0;
      stageUp = true;
      if (m.stage >= total && !m.done) {
        m.done = true;
        moduleDone = true;
        const idx = MODULES.findIndex((x) => x.id === mid);
        const next = MODULES[idx + 1];
        if (next && !s.unlocked.includes(next.id)) s.unlocked.push(next.id);
      }
    }
  } else if (!correct) {
    m.streak = 0;
  }
  s.lastActive = Date.now();
  save();
  return { stageUp, moduleDone, streak: m.streak, stage: m.stage, total };
}

export function recordDrawing(code, rec) {
  const s = student(code);
  s.drawings.push({ ...rec, t: Date.now() });
  if (s.drawings.length > 800) s.drawings.splice(0, s.drawings.length - 800);
  save();
}

export function resetStudent(code) {
  delete state.students[code];
  delete state.notes[code];
  save();
}

/** Harf için hata oranına dayalı seçim ağırlığı. */
export function letterWeight(code, ch, mid) {
  const s = student(code);
  const st = (mid ? s.modules[mid].letters[ch] : s.letters[ch]) || { c: 0, w: 0 };
  const n = st.c + st.w;
  return 1 + (n ? (2.5 * st.w) / n : 0.8);
}

// ---- Oturumlar ----
export function startSession(code) {
  const s = student(code);
  const open = s.sessions.find((x) => !x.end);
  if (open) return open;
  const ses = { start: Date.now(), end: null };
  s.sessions.push(ses);
  save();
  return ses;
}
export function endSession(code) {
  const s = state.students[code];
  if (!s) return;
  s.sessions.filter((x) => !x.end).forEach((x) => { x.end = Date.now(); });
  save();
}
export function sessionMinutes(ses) {
  return ((ses.end || Date.now()) - ses.start) / 60000;
}
