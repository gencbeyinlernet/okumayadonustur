// Küçük arayüz yardımcıları
import { speak } from './audio.js';
import { getState } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * Seçenekleri karıştırır; doğru yanıtın konumu bir önceki sorudakiyle aynı olmaz
 * (başarının konum ezberinden kaynaklanmasını önlemek için).
 */
const lastPos = {};
export function placeAnswer(key, options, correct) {
  let out = shuffle(options);
  if (options.length > 1) {
    let guard = 0;
    while (out.indexOf(correct) === lastPos[key] && guard++ < 20) out = shuffle(options);
  }
  lastPos[key] = out.indexOf(correct);
  return out;
}

/** Ağırlıklı seçim: hata oranı yüksek ve az denenmiş harfler daha sık gelir. */
export function weightedPick(items, weightFn, avoid) {
  let pool = items.length > 1 && avoid != null ? items.filter((x) => x !== avoid) : items;
  if (!pool.length) pool = items;
  const ws = pool.map((x) => Math.max(0.05, weightFn(x)));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

let actx;
export function chime(ok) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [523.25, 659.25, 783.99] : [392, 330];
    notes.forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = actx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch { /* ses yoksa sessiz geç */ }
}

/** Kısa, görevle ilişkili geri bildirim. */
export function feedback(box, msg, ok) {
  box.className = 'feedback show ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'info');
  box.innerHTML = `<span class="fb-icon">${ok === true ? '🌟' : ok === false ? '🤔' : '💡'}</span><span>${esc(msg)}</span>`;
  if (ok !== null && ok !== undefined) chime(ok);
  if (getState().settings.speakFeedback) speak(msg.replace(/[«»]/g, ''), 0.95);
}

export function clearFeedback(box) {
  box.className = 'feedback';
  box.innerHTML = '';
}

export function modal(html, { onClose, wide } = {}) {
  const ov = $('#overlay');
  ov.innerHTML = '';
  const box = h(`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`);
  ov.appendChild(box);
  ov.hidden = false;
  const close = () => {
    ov.hidden = true;
    ov.innerHTML = '';
    onClose && onClose();
  };
  $$('[data-close]', box).forEach((b) => b.addEventListener('click', close));
  return { box, close };
}

export function confirmBox(msg, okText = 'Evet') {
  return new Promise((res) => {
    const { box, close } = modal(`<p class="modal-msg">${esc(msg)}</p>
      <div class="row end"><button class="btn ghost" data-no>Vazgeç</button><button class="btn danger" data-yes>${esc(okText)}</button></div>`);
    $('[data-no]', box).onclick = () => { close(); res(false); };
    $('[data-yes]', box).onclick = () => { close(); res(true); };
  });
}

export function download(name, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function toCSV(rows) {
  return '﻿' + rows.map((r) => r.map((c) => {
    const s = String(c ?? '');
    return /[";\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\n');
}

export const pct = (x) => (x == null || isNaN(x) ? '–' : Math.round(x * 100) + '%');
export const fmt = (x, d = 2) => (x == null || isNaN(x) ? '–' : Number(x).toFixed(d).replace('.', ','));
