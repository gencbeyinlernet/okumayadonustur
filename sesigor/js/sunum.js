// SESİGÖR proje sunumu
import { $, $$, esc } from './ui.js';
import { CATEGORIES } from '../eklenti/core/categories.js';

const img = (src, alt, cap) => `<figure class="shot"><img src="img/${src}" alt="${esc(alt)}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const flow = (items) => `<div class="flow">${items.map(([t, s, c], i) => `<div class="fbox" style="--c:${c}"><b>${t}</b><small>${s}</small></div>${i < items.length - 1 ? '<span class="farrow">→</span>' : ''}`).join('')}</div>`;

const SLIDES = [
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big"><img src="eklenti/icons/128.png" alt="" style="width:76px"></div><h1>SESİGÖR</h1>
    <p class="lead">Türkçe Videolarda Konuşma Altyazısına Ses Olayı Etiketleri Ekleyen Tarayıcı Eklentisi ve Kullanıcı Değerlendirmesi</p>
    <div class="tags"><span>Ana alan: Yazılım</span><span>Tematik alan: Erişilebilir Yaşam Teknolojileri</span></div>
    <p class="muted">Konuşmayı ve konuşma dışındaki anlamlı sesleri birlikte görünür kılar; ses cihazdan çıkmaz.</p></div>` },
  { title: 'Proje ne yapıyor?', html: `<div class="two"><div>
      <p class="big">Videolardaki ses bilgisi yalnızca konuşmalardan oluşmaz; <b>kapı zili, alarm, alkış, gülme</b> gibi sesler olayların anlaşılmasını etkiler. SESİGÖR, kullanıcı başlattığında sekmenin sesini <b>cihaz üzerinde</b> işleyip konuşmayı Türkçe altyazıya, altı ses olayını zamanla ilişkili yazılı etiketlere dönüştürür.</p>
      <ul class="ticks"><li>İşitme engelli ve işitme güçlüğü yaşayan bireyler için</li><li>Konuşma: “Birazdan kapıyı açacağım.” · Olay: <span class="sg-tag" style="--sg-tag-bg:#fef3c7;--sg-tag-fg:#78350f;--sg-tag-bd:#b45309">🔔 [Kapı zili]</span></li><li>Ses ve altyazı hiçbir sunucuya gönderilmez</li></ul></div>
      ${img('panel-t2.png', 'SESİGÖR paneli', 'Konuşma altyazısı ve ses olayı etiketi birlikte')}</div>` },
  { title: 'Problem', html: `<div class="two">
      <div class="callout"><p class="big">Bir videoda kapı zili duyulduktan sonra bir kişinin kapıya yönelmesi yalnızca konuşma metniyle açıklanamayabilir.</p></div>
      <div class="callout warn"><p class="big">Erişilebilir altyazı, konuşmanın yanında anlamlı konuşma dışı sesleri de içermelidir (W3C); ancak otomatik araçlar genellikle yalnızca konuşmayı yazıya dönüştürür.</p></div></div>` },
  { title: 'Araştırma soruları ve hipotezler', html: `
    <div class="callout"><b>Ana soru:</b> Aynı konuşma tanıma motoruyla üretilen Türkçe altyazıya ses olayı etiketleri eklemek, işitme engelli kullanıcıların videodaki işitsel olayları anlamasını yalnızca konuşma altyazısına göre artırır mı?</div>
    <div class="callout"><b>Teknik sorular:</b> Kelime hata oranı farklı ses koşullarında nasıl değişir? Ses olayları ne başarıyla ve ne kadar yanlış bildirimle algılanır? Gösterim gecikmesi ne kadardır?</div>
    <div class="three"><div class="callout ok"><b>H1</b><p>T2'de ses olayı sorularının doğru cevap oranı T1'den yüksektir.</p></div>
      <div class="callout ok"><b>H2</b><p>Etiketler konuşma puanında büyük düşüş oluşturmadan ek bilgi sağlar (ortalama düşüş ≤ 5 yp).</p></div>
      <div class="callout ok"><b>H3</b><p>Eşik, ardışık doğrulama ve birleştirme kuralları yanlış ve yinelenen bildirimleri azaltır.</p></div></div>` },
  { title: 'Hedefler ve başarı ölçütleri', html: `<ol class="goals">
      <li>Kullanıcı başlatmadan ses yakalamayan, sesi cihaz üzerinde işleyen bir eklenti (ölçüt: ağ kayıtlarında ses dış sunucuya gitmez)</li>
      <li>Konuşma tanımayı dört ses koşulunda kelime hata oranıyla ölçmek, tarayıcının yerleşik canlı altyazısıyla karşılaştırmak</li>
      <li>Altı ses olayında makro F1 ≥ 0,75 ve yanlış bildirim ≤ 1/dk</li>
      <li>Konuşmada ortanca gecikme ≤ 3 s, %95 değeri ≤ 6 s</li>
      <li>12 gönüllüyle iki görünümü karşılaştırmak; konuşma puanında ortalama düşüş ≤ 5 yp</li></ol>` },
  { title: 'Bilimsel temel', html: `<div class="three">
      <div class="callout"><b>W3C WCAG 1.2.2</b><p>Kaydedilmiş videoda altyazı konuşmacı bilgisini ve anlamlı konuşma dışı sesleri de vermelidir.</p></div>
      <div class="callout"><b>Kafle ve Huenerfauth (2017)</b><p>Otomatik altyazıda hataların türü ve konumu kullanıcı değerlendirmesini etkiler: başarı yalnızca hata oranıyla ölçülemez.</p></div>
      <div class="callout"><b>Radford vd. (2023)</b><p>Whisper modelleri Türkçe dahil birçok dilde farklı ses koşullarına dayanıklı yazıya dönüştürme yapar.</p></div>
      <div class="callout"><b>Gemmeke vd. (2017)</b><p>AudioSet: ses olayı sınıflandırmada yaygın, binlerce saatlik etiketli video sesi.</p></div>
      <div class="callout"><b>Mesaros vd. (2016)</b><p>Ses olayı algılama başarısı, başlangıç toleransıyla eşleştirilen olaylar üzerinden kesinlik, duyarlılık ve F1 ile ölçülür.</p></div>
      <div class="callout warn"><b>Google (t.y.)</b><p>Tarayıcının yerleşik canlı altyazısı da cihazda çalışır: yerelde işleme tek başına yenilik değildir. Katkı, ses olayı etiketlerinin ek yararını kontrollü sınamaktır.</p></div></div>` },
  { title: 'Şekil 1. Ses akışı', html: `${flow([
      ['Kullanıcı başlatır', 'eklenti kendiliğinden ses yakalamaz', '#0369a1'],
      ['Seçili sekmenin sesi', 'tabCapture · ekran dışı belge', '#0e7490'],
      ['Yerel ses tamponu', '16 kHz tek kanal', '#475569'],
      ['(a) Konuşma tanıma', 'Whisper base → geçici / kesinleşmiş altyazı', '#7c3aed'],
      ['(b) Ses olayı sınıflandırma', 'YAMNet → eşik + ardışık doğrulama + birleştirme', '#b45309'],
      ['Yan panel', 'birleşik görünüm', '#15803d']])}
    <p class="callout ok center" style="max-width:640px;margin:16px auto">🔒 Ses cihazdan çıkmaz: modeller ve kodlar paketin içinde; oturum boyunca ağ isteği sayılır.</p>` },
  { title: 'Ses olayı sözlüğü ve kurallar', html: `<div class="two">
      <div><table class="tbl slide-table"><thead><tr><th>Kategori</th><th>AudioSet sınıfları (örnek)</th></tr></thead><tbody>
      ${CATEGORIES.map((c) => `<tr><td>${c.icon} <b>${c.label}</b></td><td class="small">${c.classes.slice(0, 4).join(', ')}${c.generic ? ' (+ genel “Alarm”, hiyerarşi kuralıyla)' : ''}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">Sözlük dışındaki sesler rastgele bir kategoriye zorlanmaz; duygu veya niyet etiketi üretilmez. Etiketler yalnızca videonun sesini anlatır.</p></div>
      <ul class="ticks"><li><b>Eşik</b>: sınıfa özgü; geliştirme kayıtlarında seçilir, bağımsız testte değiştirilmez</li><li><b>Ardışık doğrulama</b>: art arda 2 pencere (0,975 s, 0,5 s ilerleme)</li>
      <li><b>Birleştirme</b>: 3 s içinde gelen aynı kategori tek olay</li><li>Aynı anda en çok <b>2</b> olay</li>
      <li>AudioSet'te “Alarm”, telefon ve kapı zilinin de üst sınıfı: genel sınıf yalnızca bu ikisinden güçlüyse alarm sayılır</li></ul></div>` },
  { title: 'Şekil 2. Yan panel: T1 ve T2', html: `<div class="two">
      ${img('panel-t1.png', 'T1 görünümü', '(a) T1: yalnızca konuşma altyazısı')}
      ${img('panel-t2.png', 'T2 görünümü', '(b) T2: konuşma altyazısı ve olay etiketi')}</div>
    <p class="muted center">Konuşma ve ses olayı farklı biçimlerle gösterilir (köşeli parantez, simge, kesikli çerçeve); ayrım yalnızca renge dayanmaz. Yazı boyutu, kontrast, panel konumu ve olay etiketleri klavyeyle de değiştirilebilir.</p>` },
  { title: 'Web uygulaması', html: `<div class="two">${img('uygulama.png', 'SESİGÖR web uygulaması', 'Video dosyası, paylaşılan sekme veya mikrofon; aynı işlem hattı')}
      <ul class="ticks"><li>Eklentiyle <b>aynı kod ve modeller</b>; kurulum gerektirmeden denenebilir</li><li>Geçici altyazı gri, kesinleşmiş altyazı beyaz</li>
      <li><b>Gizlilik denetimi:</b> oturum başladıktan sonraki bütün ağ istekleri sayılır</li><li>Oturum kaydı (JSON + SRT): değerlendirme araçlarının girdisi</li>
      <li>Teknik görünüm: altı kategorinin canlı puanı ve eşiği</li></ul></div>` },
  { title: 'Teknik test düzeni', html: `<div class="two"><div>
      <h3>Veri seti</h3><ul class="ticks"><li>60–90 s'lik 48 kısa Türkçe video: 24 geliştirme, 24 bağımsız test</li><li>Dört koşul × altışar video: temiz konuşma, konuşma + müzik, konuşma + çevresel ses, çok konuşmacı</li><li>Referans: iki kişi bağımsız işaretler, farklılıklar uzlaştırılır</li></ul>
      <h3>Koşullar</h3><ul class="ticks"><li><b>T0</b> yerleşik canlı altyazı · <b>T1</b> SESİGÖR yalnız altyazı · <b>T2</b> altyazı + olay</li><li>T1'de olay modülü arka planda çalışır, yalnızca görünümü kapalıdır</li></ul></div>
      <div><h3>Ölçüler (araçlar uygulamada)</h3><ul class="ticks"><li>WER = (S + D + I) / N × 100, ağırlıklı toplam (Tablo 1)</li><li>Olaylar: aynı kategori, ≤ 1 s başlangıç farkı, bire bir eşleşme; makro F1, yanlış bildirim/dk; kurallı ve ham (Tablo 2, Ek 1)</li><li>Gecikme: söz sonu / olay başlangıcı → ilk kararlı gösterim; ortanca ve %95 (Tablo 3)</li><li>Gerçek zaman oranı ve bellek</li></ul></div></div>` },
  { title: 'Değerlendirme araçları', html: `<div class="two">${img('degerlendirme.png', 'Değerlendirme araçları', 'Kelime hata oranı hizalaması ve ses olayı tabloları')}
      <ul class="ticks"><li>Türkçe normalleştirmeli kelime hata oranı; değiştirme / silme / ekleme hizalaması</li><li>Referans olay CSV + oturum kayıtları → Tablo 2 ve Ek 1 (0,5 / 1 / 2 s tolerans)</li>
      <li>Eşik seçimi: geliştirme kayıtlarındaki pencere puanları kurallarla yeniden oynatılır</li><li>Gecikme: referans SRT ile söz sonu → kararlı gösterim</li></ul></div>` },
  { title: 'Kullanıcı pilotu', html: `<div class="two"><div><ul class="ticks">
      <li>Yazılı Türkçeyle video takip edebilen, 18 yaş üstü 12 gönüllü; kurum izni, etik kurul kararı ve yazılı onam</li>
      <li>Her katılımcı 6 video: 3'ü T1, 3'ü T2; her video 6 kişide T1, 6 kişide T2; koşul sırası dengeli</li>
      <li>Her video için 3 konuşma + 3 ses olayı sorusu; birincil ölçüt ses olayı soruları</li>
      <li>Analiz birimi katılımcı: kişi içi fark (T2 − T1), ortalama, SS, ortanca, %95 GA</li></ul></div>
      ${img('pilot.png', 'Pilot aracı', 'Dengeli atama çizelgesi ve Şekil 3 (eşleştirilmiş nokta grafiği)')}</div>
    <p class="muted center">Bulgular gerçek ölçümlerden üretilir; bu sunumda uydurma sonuç gösterilmez.</p>` },
  { title: 'Etik ve veri gizliliği', html: `<div class="two"><ul class="ticks">
      <li>Kurum izni, etik kurul kararı, yazılı onam; amaç, görevler, kayıtlar ve ayrılma hakkı erişilebilir yazılı biçimde</li>
      <li>İşitme durumu yalnızca beyanla; tıbbi belge istenmez</li><li>Puanlar kodlarla; kimlik ve onam belgeleri ayrı saklanır</li></ul>
      <ul class="ticks"><li>Eklenti ses veya konuşma geçmişini kalıcı kaydetmez; kısa tamponlar durdurmada temizlenir</li><li>Ağ kayıtlarıyla sesin dış sunucuya gönderilmediği doğrulanır</li><li>Test videolarında sesi veya görüntüsü olan kişilerden izin</li></ul></div>` },
  { title: 'Sınırlılıklar ve öneriler', html: `<div class="two">
      <div><h3>Sınırlılıklar</h3><ul class="ticks warnl"><li>12 kişilik pilot; Türk İşaret Dili'ni tercih eden kullanıcıları kapsamaz</li><li>Kısa, önceden kaydedilmiş videolar; canlı yayın ölçülmedi</li><li>Ağız özellikleri, hızlı konuşma, müzik ve üst üste konuşma tanımayı etkiler</li><li>Sınıflandırıcı sesin gerçek kaynağını kesin tanımaz</li><li>Tarayıcı ve sitelerin yapısı değişebilir</li></ul></div>
      <div><h3>Öneriler</h3><ul class="ticks"><li>Olay sözlüğünü kullanıcı ihtiyacına göre genişletmek; her kategoriyi ayrı test kayıtlarıyla sınamak</li><li>Anonim konuşmacı ayrımı</li><li>Daha büyük ve çeşitli katılımcı grubu</li><li>Türk İşaret Dili için ayrı çalışma</li><li>Testlerden sonra açık kaynak paylaşım ve kurulum rehberi</li></ul></div></div>` },
  { title: 'Kaynaklar', html: `<ul style="display:grid;gap:8px;padding-left:20px">
      <li>Gemmeke, J. F. vd. (2017). Audio Set: An ontology and human-labeled dataset for audio events. <i>ICASSP 2017</i>, 776–780.</li>
      <li>Google. (t.y.-a). <i>Manage captions and translations in Chrome</i>. · Google. (t.y.-b). <i>chrome.tabCapture</i>.</li>
      <li>Kafle, S., &amp; Huenerfauth, M. (2017). Evaluating the usability of automatically generated captions for people who are deaf or hard of hearing. <i>ASSETS '17</i>, 165–174.</li>
      <li>Mesaros, A., Heittola, T., &amp; Virtanen, T. (2016). Metrics for polyphonic sound event detection. <i>Applied Sciences, 6</i>(6), 162.</li>
      <li>Radford, A. vd. (2023). Robust speech recognition via large-scale weak supervision. <i>ICML 2023</i>, 28492–28518.</li>
      <li>W3C. (t.y.). <i>Understanding success criterion 1.2.2: Captions (prerecorded)</i>.</li>
      <li>Macháček, D., Dabre, R., &amp; Bojar, O. (2023). Turning Whisper into real-time transcription system. <i>IJCNLP-AACL 2023 Demo</i>. (yerel uzlaşma ilkesi)</li></ul>` },
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big"><img src="eklenti/icons/128.png" alt="" style="width:76px"></div><h1>Deneyin</h1>
    <p class="lead">Bir Türkçe video seçin veya bir sekmeyi paylaşın; altyazı ve ses olayı etiketleri cihazınızda üretilsin.</p>
    <div class="row center"><a class="btn big primary" href="#/uygulama">▶️ Uygulamaya geç</a><a class="btn big" href="#/eklenti">🧩 Eklentiyi kur</a></div></div>` },
];

let keyHandler = null;
export function stopSunum() { if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } }
export function renderSunum(root, start = 1) {
  let i = Math.min(Math.max(1, start), SLIDES.length) - 1;
  root.innerHTML = `<section class="deck"><div class="deck-stage" data-stage>
    ${SLIDES.map((s, k) => `<article class="slide ${s.cls || ''}" aria-hidden="true">${s.title ? `<header class="slide-h"><span class="slide-no">${k + 1}</span><h2>${s.title}</h2></header>` : ''}<div class="slide-b">${s.html}</div></article>`).join('')}
    </div><div class="deck-bar"><button class="btn ghost" data-prev aria-label="Önceki">←</button><div class="deck-progress"><div data-prog></div></div><span class="deck-count" data-count></span>
    <button class="btn ghost" data-next aria-label="Sonraki">→</button><button class="btn ghost" data-list aria-label="Slayt listesi">☰</button><button class="btn ghost" data-fs aria-label="Tam ekran">⛶</button></div>
    <nav class="deck-index" data-index hidden>${SLIDES.map((s, k) => `<button data-go="${k}">${k + 1}. ${s.title || (k ? 'Kapanış' : 'Kapak')}</button>`).join('')}</nav></section>`;
  const slides = $$('.slide', root);
  const show = (n) => {
    i = Math.min(Math.max(0, n), SLIDES.length - 1);
    slides.forEach((el, k) => { el.classList.toggle('on', k === i); el.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    $('[data-count]', root).textContent = `${i + 1} / ${SLIDES.length}`; $('[data-prog]', root).style.width = ((i + 1) / SLIDES.length) * 100 + '%';
    history.replaceState(null, '', `#/sunum/${i + 1}`);
  };
  $('[data-prev]', root).onclick = () => show(i - 1); $('[data-next]', root).onclick = () => show(i + 1);
  $('[data-list]', root).onclick = () => { const x = $('[data-index]', root); x.hidden = !x.hidden; };
  $$('[data-go]', root).forEach((b) => (b.onclick = () => { show(+b.dataset.go); $('[data-index]', root).hidden = true; }));
  $('[data-fs]', root).onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('.deck', root).requestFullscreen?.().catch(() => {}));
  stopSunum();
  keyHandler = (e) => { if (e.target.closest('input,textarea,select')) return; if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1); } };
  document.addEventListener('keydown', keyHandler);
  let sx = null; const st = $('[data-stage]', root);
  st.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  st.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) show(i + (dx < 0 ? 1 : -1)); sx = null; });
  show(i);
}
