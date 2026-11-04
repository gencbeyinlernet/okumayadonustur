// SESİGÖR altyazı paneli (web uygulaması ve eklenti yan paneli ortak).
// Konuşma satırı ile ses olayı etiketi farklı biçimde gösterilir; ayrım yalnızca renge dayanmaz.
import { CAT_BY_ID } from './categories.js';

const KEY = 'sesigor.ayarlar';
export const DEFAULT_SETTINGS = { fontSize: 22, contrast: 'normal', position: 'sag', events: true, maxLines: 8 };
export function loadSettings() { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEFAULT_SETTINGS }; } }
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* yok */ } }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class CaptionPanel {
  constructor(el, { settings = loadSettings(), showPosition = true, onChange } = {}) {
    this.el = el; this.s = settings; this.onChange = onChange; this.lines = [];
    el.classList.add('sg-panel');
    el.innerHTML = `
      <div class="sg-toolbar" role="toolbar" aria-label="Altyazı ayarları">
        <button type="button" data-a="font-" title="Yazıyı küçült (Alt+Shift+−)" aria-label="Yazıyı küçült">A−</button>
        <button type="button" data-a="font+" title="Yazıyı büyüt (Alt+Shift++)" aria-label="Yazıyı büyüt">A+</button>
        <button type="button" data-a="contrast" aria-pressed="false" title="Yüksek kontrast (Alt+Shift+K)">◐ Kontrast</button>
        <button type="button" data-a="events" aria-pressed="true" title="Ses olayı etiketleri (Alt+Shift+O)">🔔 Olay etiketleri</button>
        ${showPosition ? '<button type="button" data-a="pos" title="Panel konumu (Alt+Shift+P)">⇄ Konum</button>' : ''}
        <button type="button" data-a="clear" title="Ekranı temizle">🧹</button>
      </div>
      <div class="sg-active" aria-live="polite" aria-label="Şu an duyulan ses olayları"></div>
      <div class="sg-lines" role="log" aria-live="polite" aria-label="Altyazı"></div>
      <div class="sg-interim" aria-hidden="true"></div>`;
    this.$active = el.querySelector('.sg-active'); this.$lines = el.querySelector('.sg-lines'); this.$interim = el.querySelector('.sg-interim');
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => this.action(b.dataset.a)));
    this._key = (e) => {
      if (!(e.altKey && e.shiftKey)) return;
      const k = e.key.toLowerCase();
      const map = { '+': 'font+', '=': 'font+', '-': 'font-', '_': 'font-', k: 'contrast', o: 'events', p: 'pos' };
      if (map[k]) { e.preventDefault(); this.action(map[k]); }
    };
    document.addEventListener('keydown', this._key);
    this.apply();
  }
  destroy() { document.removeEventListener('keydown', this._key); }
  action(a) {
    const s = this.s;
    if (a === 'font+') s.fontSize = Math.min(44, s.fontSize + 2);
    if (a === 'font-') s.fontSize = Math.max(14, s.fontSize - 2);
    if (a === 'contrast') s.contrast = s.contrast === 'yuksek' ? 'normal' : 'yuksek';
    if (a === 'events') s.events = !s.events;
    if (a === 'pos') s.position = { sag: 'sol', sol: 'alt', alt: 'sag' }[s.position] || 'sag';
    if (a === 'clear') { this.lines = []; this.render(); }
    saveSettings(s); this.apply(); this.onChange && this.onChange(s, a);
  }
  apply() {
    const s = this.s, el = this.el;
    el.style.setProperty('--sg-font', s.fontSize + 'px');
    el.classList.toggle('sg-hc', s.contrast === 'yuksek');
    el.classList.toggle('sg-noevents', !s.events);
    el.dataset.pos = s.position;
    const c = el.querySelector('[data-a="contrast"]'); c && c.setAttribute('aria-pressed', String(s.contrast === 'yuksek'));
    const ev = el.querySelector('[data-a="events"]'); if (ev) { ev.setAttribute('aria-pressed', String(s.events)); ev.textContent = s.events ? '🔔 Olay etiketleri: açık' : '🔕 Olay etiketleri: kapalı'; }
    this.render();
  }
  setEventsVisible(on) { this.s.events = on; this.apply(); }
  // Satırlar ses zamanına göre sıralanır: konuşma (başlangıç) ve olay (başlangıç) kronolojik okunur.
  addLine(line) { this.lines.push({ type: 'speech', text: line.text, t: line.audioStart ?? 1e12 }); this.sort(); }
  addEvent(ev) { this.lines.push({ type: 'event', cat: ev.cat, t: ev.onset ?? 1e12 }); this.sort(); }
  sort() { this.lines.sort((a, b) => a.t - b.t); this.trim(); this.render(); }
  trim() { const max = Math.max(this.s.maxLines * 3, 20); if (this.lines.length > max) this.lines.splice(0, this.lines.length - max); }
  setInterim({ committed, interim }) {
    this.$interim.innerHTML = committed || interim ? `<span class="sg-c">${esc(committed)}</span> <span class="sg-i">${esc(interim)}</span>` : '';
  }
  setActive(list) {
    this.$active.innerHTML = this.s.events ? list.map((e) => tag(e.cat, true)).join(' ') : '';
  }
  render() {
    const show = this.lines.filter((l) => this.s.events || l.type === 'speech').slice(-this.s.maxLines);
    this.$lines.innerHTML = show.map((l) => (l.type === 'speech' ? `<p class="sg-speech">${esc(l.text)}</p>` : `<p class="sg-event">${tag(l.cat)}</p>`)).join('');
  }
}

/** Olay etiketi: köşeli parantez + simge + kesikli çerçeve (yalnız renge dayanmaz). */
export function tag(cat, live) {
  const c = CAT_BY_ID[cat]; if (!c) return '';
  return `<span class="sg-tag${live ? ' live' : ''}" data-cat="${c.id}"><span aria-hidden="true">${c.icon}</span> [${esc(c.label)}]</span>`;
}
