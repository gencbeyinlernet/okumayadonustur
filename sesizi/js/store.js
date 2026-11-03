// Yerel veri deposu (localStorage). Kişisel veri tutulmaz; öğrenciler Ö01–Ö20 kodlarıyla izlenir.
import { GROUPS, MODULES, WORDS, SENTENCES, VOWELS } from './data.js';

const KEY = 'sesizi.v1';

const defaults = () => ({
  version: 1,
  settings: {
    learnedGroups: [1],
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

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === 1) {
      const d = defaults();
      return { ...d, ...raw, settings: { ...d.settings, ...raw.settings }, content: { ...d.content, ...raw.content }, maxScores: { ...d.maxScores, ...raw.maxScores } };
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
  state = { ...d, ...next, settings: { ...d.settings, ...(next.settings || {}) }, content: { ...d.content, ...(next.content || {}) } };
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

/** Öğrenilmiş harfler (sınıf düzeyinde, ses grubu sırasıyla). */
export function learnedLetters() {
  return GROUPS.filter((g) => state.settings.learnedGroups.includes(g.id)).flatMap((g) => g.letters);
}
export const maxLearnedGroup = () => Math.max(0, ...state.settings.learnedGroups);

const isEnabled = (id) => !state.content.disabled[id];
const allLearned = (letters, set) => letters.every((c) => set.has(c));

export function availableWords() {
  const set = new Set(learnedLetters());
  return WORDS.filter((w) => isEnabled(w.id) && allLearned([...w.w].filter((c) => /\p{L}/u.test(c)), set));
}
export function availableSentences() {
  const set = new Set(learnedLetters());
  return SENTENCES.filter((s) => isEnabled(s.id) && allLearned([...s.t.join('').toLocaleLowerCase('tr-TR')], set));
}
export function availableSyllables() {
  const L = learnedLetters();
  const vs = L.filter((c) => VOWELS.has(c));
  const cs = L.filter((c) => !VOWELS.has(c) && c !== 'ğ');
  const out = [];
  cs.forEach((c) => vs.forEach((v) => { out.push(c + v); out.push(v + c); }));
  return [...new Set(out)];
}

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
