// Ses: öğretmen kayıtları (IndexedDB) öncelikli, yoksa tarayıcının Türkçe metin okuma sesi.

let trVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  trVoice = vs.find((v) => v.lang === 'tr-TR') || vs.find((v) => (v.lang || '').toLowerCase().startsWith('tr')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export const ttsAvailable = () => 'speechSynthesis' in window;
export const hasTurkishVoice = () => !!trVoice;

let currentAudio = null;
function stopAll() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export function speak(text, rate = 0.8) {
  return new Promise((res) => {
    if (!('speechSynthesis' in window) || !text) return res();
    stopAll();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    if (trVoice) u.voice = trVoice;
    u.rate = rate;
    let done = false;
    const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin;
    u.onerror = fin;
    speechSynthesis.speak(u);
    setTimeout(fin, 6000);
  });
}

// ---- IndexedDB kayıt deposu ----
const DB_NAME = 'sesizi-audio';
let dbp;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('rec', mode);
    const st = t.objectStore('rec');
    const req = fn(st);
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}

const keyCache = new Set();
let keysLoaded = false;
export async function loadRecordingKeys() {
  try {
    const keys = await tx('readonly', (st) => st.getAllKeys());
    keyCache.clear();
    (keys || []).forEach((k) => keyCache.add(k));
  } catch { /* IndexedDB kapalı olabilir */ }
  keysLoaded = true;
  return keyCache;
}
export const hasRecording = (key) => keyCache.has(key);
export const recordingCount = () => keyCache.size;
export const recordingKeys = () => [...keyCache];

export async function getRecording(key) {
  if (keysLoaded && !keyCache.has(key)) return null;
  try { return (await tx('readonly', (st) => st.get(key))) || null; } catch { return null; }
}
export async function saveRecording(key, blob) {
  await tx('readwrite', (st) => st.put(blob, key));
  keyCache.add(key);
}
export async function deleteRecording(key) {
  await tx('readwrite', (st) => st.delete(key));
  keyCache.delete(key);
}

export const soundKey = (ch) => 'ses:' + ch;
export const wordKey = (w) => 'kelime:' + w;
export const sentenceKey = (id) => 'cumle:' + id;

/** Kayıt varsa onu çalar, yoksa metni okur. Dönüş: 'kayit' | 'tts' */
export async function play(key, fallbackText, rate) {
  const blob = key ? await getRecording(key) : null;
  if (blob) {
    stopAll();
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    currentAudio = a;
    await new Promise((res) => {
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); res(); };
      a.play().catch(res);
    });
    return 'kayit';
  }
  await speak(fallbackText, rate);
  return 'tts';
}

export const playLetter = (ch) => play(soundKey(ch), ch, 0.7);
export const playWord = (w) => play(wordKey(w), w, 0.75);

// ---- Mikrofonla kayıt (öğretmen) ----
export class Recorder {
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mr = new MediaRecorder(this.stream);
    this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.mr.start();
  }
  stop() {
    return new Promise((res) => {
      this.mr.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        res(new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' }));
      };
      this.mr.stop();
    });
  }
}
export const canRecord = () => !!(navigator.mediaDevices && window.MediaRecorder);
