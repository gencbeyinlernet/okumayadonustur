// Başarı belgeleri: her harf grubu için bir belge ve bütün harfler bitince "İlk Okuma Yazma" belgesi.
// Öğrenci adı belgeye yalnızca yazdırma anında yazılır; hiçbir yerde saklanmaz (öğrenciler kodla izlenir).
import { GROUPS, ALL_LETTERS, upper } from './data.js';
import { getState, student } from './store.js';
import { $, esc, modal } from './ui.js';

export function certTitle(key) {
  if (key === 'final') return 'İlk Okuma Yazma Başarı Belgesi';
  const g = GROUPS.find((x) => 'g' + x.id === key);
  return g ? `${g.id}. Harf Grubu (${g.name}) Başarı Belgesi` : 'Başarı Belgesi';
}

const fmtDate = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export function certHTML(code, key, name) {
  const s = student(code);
  const T = getState().teacher || {};
  const final = key === 'final';
  const g = GROUPS.find((x) => 'g' + x.id === key);
  const letters = final ? ALL_LETTERS : g.letters;
  const stars = letters.reduce((a, c) => a + ((s.lessons[c] || {}).stars || 0), 0);
  const color = final ? '#ca8a04' : g.color;
  const who = name && name.trim() ? esc(name.trim()) : esc(code);
  const text = final
    ? `ilk okuma yazma yolculuğundaki bütün harfleri sesten harfe, harften heceye, kelimeye, cümleye ve metne uzanan etkinliklerle başarıyla tamamlamıştır.`
    : `${g.id}. harf grubundaki <b>${g.letters.map((c) => upper(c) + c).join(', ')}</b> harflerinin seslerini tanıma, okuma ve yazma etkinliklerini başarıyla tamamlamıştır.`;
  return `<div class="cert ${final ? 'final' : ''}" style="--cc:${color}">
    <div class="cert-inner">
      <div class="cert-top"><span class="cert-logo">s</span><span>SESİZİ · Sesten Harfe, Harften Kelimeye</span></div>
      <div class="cert-medal">${final ? '🏆' : '🏅'}</div>
      <h1>${final ? 'İlk Okuma Yazma Başarı Belgesi' : 'Başarı Belgesi'}</h1>
      ${final ? '' : `<p class="cert-sub">${g.id}. Harf Grubu · <span class="lc">${g.name}</span></p>`}
      <p class="cert-name">${who}</p>
      <p class="cert-text">${text}</p>
      <div class="cert-letters lc">${letters.map((c) => `<span>${c}</span>`).join('')}</div>
      <p class="cert-stars">⭐ ${stars} / ${letters.length * 3} yıldız</p>
      <div class="cert-foot">
        <div><b>${fmtDate(s.certs[key] || Date.now())}</b><small>Tarih</small></div>
        <div><b>${esc(T.school || ' ')}</b><small>Okul${T.className ? ' · ' + esc(T.className) : ''}</small></div>
        <div><b class="sign">${esc(T.name || ' ')}</b><small>Sınıf öğretmeni</small></div>
      </div>
    </div>
  </div>`;
}

/** Belge önizlemesi; ad isteğe bağlıdır ve kaydedilmez. */
export function openCertificate(code, key) {
  const { box, close } = modal(`
    <h3>${esc(certTitle(key))}</h3>
    <label class="field">Belgede yazacak ad (isteğe bağlı; kaydedilmez — boş kalırsa öğrenci kodu yazılır)
      <input type="text" data-name maxlength="40" placeholder="${esc(code)}"></label>
    <div class="cert-preview" data-prev>${certHTML(code, key)}</div>
    <div class="row end"><button class="btn ghost" data-close>Kapat</button><button class="btn primary" data-print>🖨️ Yazdır / PDF kaydet</button></div>`, { wide: true });
  const inp = $('[data-name]', box);
  inp.oninput = () => { $('[data-prev]', box).innerHTML = certHTML(code, key, inp.value); };
  $('[data-print]', box).onclick = () => { printCertificates([{ code, key, name: inp.value }]); };
  return { close };
}

/** Bir ya da birden çok belgeyi A4 yatay sayfalara yazdırır. */
export function printCertificates(list) {
  const area = $('#print-area');
  area.innerHTML = list.map((x) => `<div class="cert-page">${certHTML(x.code, x.key, x.name)}</div>`).join('');
  document.body.classList.add('printing-cert');
  const done = () => { document.body.classList.remove('printing-cert'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
}
