// YOLİZİ yerel veri deposu. Bütün veriler tarayıcıda kalır; işlem günlüğü silinmez.
import { sha256 } from './ui.js';

const KEY = 'yolizi.v1';
export const DEFAULT_PARAMS = { a: 8, b: 4, g: 6, scale: 1, K: 200, lambda: 0.5, riverMin: 2, res: 30 };

const defaults = () => ({
  version: 1,
  endpoints: {
    start: { name: 'Maçka (başlangıç bölgesi)', lon: 39.6111, lat: 40.8136, r: 1000 },
    end: { name: 'Torul (bitiş bölgesi)', lon: 39.2928, lat: 40.5583, r: 1000 },
  },
  evidence: [],
  lock: null,
  params: { ...DEFAULT_PARAMS },
  paramsLock: null,
  results: {},
  sweep: null,
  georef: [],
  vrtests: [],
  log: [],
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.version === 1) return { ...defaults(), ...s, params: { ...DEFAULT_PARAMS, ...s.params } };
  } catch { /* bozuk */ }
  return defaults();
}
let state = load();
export const S = () => state;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('YOLİZİ: tarayıcı deposuna yazılamadı', e); window.dispatchEvent(new CustomEvent('yolizi-save-error')); }
}
export function log(event, detail) {
  state.log.push({ t: new Date().toISOString(), event, ...(detail ? { detail } : {}) });
  save();
}
export function replace(next) { state = { ...defaults(), ...next }; save(); }
export function reset() { state = defaults(); save(); }

export const effParams = (p = state.params) => ({ ...p, a: p.a * p.scale, b: p.b * p.scale, g: p.g * p.scale });

export const devGroups = () => state.evidence.filter((e) => e.rol === 'gelistirme');
export const testGroups = () => state.evidence.filter((e) => e.rol === 'test');

/** Ayrımın kanonik metni (kilit özeti için). */
export const splitCanon = () => JSON.stringify(state.evidence.map((e) => [e.kod, e.aile, e.rol, +(+e.lon).toFixed(6), +(+e.lat).toFixed(6), +e.r]).sort());

export async function lockSplit() {
  const canon = splitCanon();
  state.lock = { t: new Date().toISOString(), hash: await sha256(canon), n: state.evidence.length, test: testGroups().length };
  log('Geliştirme–test ayrımı sabitlendi', state.lock);
}
export async function lockParams() {
  const canon = JSON.stringify(state.params);
  state.paramsLock = { t: new Date().toISOString(), hash: await sha256(canon), params: { ...state.params } };
  log('Parametreler sabitlendi', state.paramsLock);
}
export async function verifyLock() {
  if (!state.lock) return null;
  return (await sha256(splitCanon())) === state.lock.hash;
}
