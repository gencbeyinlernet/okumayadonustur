// Arayüz yardımcıları
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

export function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function modal(html, { wide, onClose } = {}) {
  const ov = $('#overlay'); ov.innerHTML = '';
  const box = h(`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`);
  ov.appendChild(box); ov.hidden = false;
  const close = () => { ov.hidden = true; ov.innerHTML = ''; onClose && onClose(); };
  $$('[data-close]', box).forEach((b) => (b.onclick = close));
  return { box, close };
}

export function confirmBox(msg, ok = 'Evet') {
  return new Promise((res) => {
    const { box, close } = modal(`<p class="modal-msg">${esc(msg)}</p><div class="row end"><button class="btn ghost" data-n>Vazgeç</button><button class="btn danger" data-y>${esc(ok)}</button></div>`);
    $('[data-n]', box).onclick = () => { close(); res(false); };
    $('[data-y]', box).onclick = () => { close(); res(true); };
  });
}

export function download(name, data, type = 'text/plain;charset=utf-8') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

export function toCSV(rows) {
  return '﻿' + rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
}

/** Basit CSV ayrıştırıcı (; veya , ayırıcı, tırnak desteği). */
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split('\n')[0];
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export const fmt = (x, d = 0) => (x == null || !isFinite(x) ? '–' : Number(x).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const pct = (x) => (x == null || !isFinite(x) ? '–' : '%' + Math.round(x * 100));

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function median(a) {
  const s = [...a].sort((x, y) => x - y); const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
}
/** Doğrusal ara değerlemeli yüzdelik (R tip 7). */
export function quantile(a, p) {
  const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN;
  const r = (s.length - 1) * p, lo = Math.floor(r), hi = Math.ceil(r);
  return s[lo] + (s[hi] - s[lo]) * (r - lo);
}
