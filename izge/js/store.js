// İZGE yerel veri deposu: kurulum kayıtları, deney planı, yarık ölçümleri. Veriler tarayıcıda kalır.
import { sha256 } from './ui.js';

const KEY = 'izge.v1';
export const BASELINE = { slit: 0.2, L: 140, alpha: 20, G: 25 };
const defaults = () => ({
  version: 1,
  settings: { deg: 2, channel: 1, calChannel: 3, darkN: 10, calN: 10, mainN: 20, snrMin: 10, satLevel: 250, software: 'İZGE web 1.0', cad: '', operator: '', lens: '', camera: '', source: '' },
  plan: null,          // { seed, t, hash, stage1:[...], stage2:[...], stage3:[...] }
  selected: { stage1: null, stage2: null },
  slits: [],           // { nominal, h1, h2, h3, note }
  records: [],         // kurulum kayıtları
  log: [],
});
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.version === 1) return { ...defaults(), ...s, settings: { ...defaults().settings, ...s.settings } }; } catch { /* bozuk */ } return defaults(); }
let state = load();
export const S = () => state;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('İZGE: depoya yazılamadı', e); window.dispatchEvent(new CustomEvent('izge-save-error')); } }
export function log(event, detail) { state.log.push({ t: new Date().toISOString(), event, ...(detail ? { detail } : {}) }); save(); }
export function replace(next) { state = { ...defaults(), ...next }; save(); }
export function reset() { state = defaults(); save(); }

// ---- Deney planı ----
const S1 = { slit: [0.05, 0.1, 0.2], L: [100, 140, 180] };
const S2 = { alpha: [15, 20, 25], G: [15, 25, 35] };
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function shuffle(a, r) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Aşama 1 koşulları (α = 20°, G = 25 mm sabit); her blokta 9 koşul rastgele sırada. */
export function stage1Conditions() { const out = []; S1.slit.forEach((slit, i) => S1.L.forEach((L, j) => out.push({ code: `A1-Y${i + 1}L${j + 1}`, slit, L, alpha: 20, G: 25 }))); return out; }
export function stage2Conditions(sel) { const out = []; S2.alpha.forEach((alpha, i) => S2.G.forEach((G, j) => out.push({ code: `A2-A${i + 1}G${j + 1}`, slit: sel.slit, L: sel.L, alpha, G }))); return out; }
export function makeSchedule(conds, blocks, seed) { const r = rng(seed); const out = []; for (let b = 1; b <= blocks; b++) shuffle(conds, r).forEach((c, k) => out.push({ ...c, block: b, order: k + 1, id: `${c.code}-B${b}` })); return out; }

export async function lockPlan(seed) {
  const stage1 = makeSchedule(stage1Conditions(), 5, seed);
  state.plan = { seed, t: new Date().toISOString(), stage1, stage2: null, stage3: null };
  state.plan.hash = await sha256(JSON.stringify(stage1.map((x) => x.id)));
  log('Deney protokolü (Aşama 1 sırası) sabitlendi', { seed, hash: state.plan.hash });
}
export async function lockStage2(sel) {
  state.selected.stage1 = sel;
  state.plan.stage2 = makeSchedule(stage2Conditions(sel), 5, state.plan.seed + 2);
  log('Aşama 1 seçimi ve Aşama 2 sırası sabitlendi', { secim: sel });
}
export async function lockStage3(sel) {
  state.selected.stage2 = sel;
  const base = { code: 'A3-BASLANGIC', ...BASELINE }, chosen = { code: 'A3-SECILEN', ...sel };
  const r = rng(state.plan.seed + 3); const out = [];
  for (let b = 1; b <= 10; b++) shuffle([base, chosen], r).forEach((c, k) => out.push({ ...c, block: b, order: k + 1, id: `${c.code}-B${b}` }));
  state.plan.stage3 = out;
  log('Aşama 2 seçimi ve son karşılaştırma sırası sabitlendi', { secim: sel });
}
export const allPlanned = () => (state.plan ? [...(state.plan.stage1 || []), ...(state.plan.stage2 || []), ...(state.plan.stage3 || [])] : []);
export const recordFor = (id) => state.records.filter((r) => r.planId === id);
