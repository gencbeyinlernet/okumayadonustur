// İZGE proje sunumu
import { $, $$, esc } from './ui.js';
import { schematic } from './araclar.js';

const img = (src, alt, cap) => `<figure class="shot"><img src="img/${src}" alt="${esc(alt)}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const flow = (items) => `<div class="flow">${items.map(([t, s, c], i) => `<div class="fbox" style="--c:${c}"><b>${t}</b><small>${s}</small></div>${i < items.length - 1 ? '<span class="farrow">→</span>' : ''}`).join('')}</div>`;

const SLIDES = [
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big">◈</div><h1>İZGE</h1>
    <p class="lead">Optik Geometrinin Spektral Çözünürlüğe Etkisini İnceleyen Üç Boyutlu Baskılı Modüler Spektrometre</p>
    <div class="tags"><span>Ana alan: Fizik</span><span>Tematik alan: STEAM</span></div>
    <p class="muted">Işığı dalga boylarına ayıran, okulda üretilebilen ve ölçüm kalitesi kontrollü deneylerle belirlenen bir cihaz.</p></div>` },
  { title: 'Proje ne yapıyor?', html: `<div class="two"><div>
      <p class="big">İZGE; değiştirilebilir <b>yarık kaseti</b>, <b>kolimatör merceği</b>, <b>geçirgen kırınım ızgarası</b> ve açısı ayarlanabilen <b>kamera yuvası</b> bulunan, üç boyutlu baskıyla üretilen bir görünür bölge spektrometresidir.</p>
      <ul class="ticks"><li>USB web kamerasıyla görüntü, açık kaynak yazılımla dalga boyu ekseni</li><li>Cıva ve neon çizgileriyle kalibrasyon; 650,6528 nm ile bağımsız doğrulama</li><li>Performans ölçütü: 546,0735 nm çizgisinin yarı yükseklikteki tam genişliği (FWHM)</li><li>Dört geometri değişkeni, 110 bağımsız kurulum</li></ul></div>
      <div>${schematic({ L: 140, G: 25, alpha: 20, fcol: 75 })}</div></div>` },
  { title: 'Problem', html: `<div class="two">
      <div class="callout"><p class="big">Spektrometreler okul laboratuvarlarında az bulunur; kameralı düşük maliyetli düzeneklerde ölçüm kalitesinin hangi tasarım kararlarına bağlı olduğu çoğu zaman ölçülmez.</p></div>
      <div class="callout warn"><p class="big">Hazır bir kamerayla baskılı gövdeyi birleştirmek ölçüm niteliğini kanıtlamaz: yarığın gerçek genişliği, mercek hizası, iç yansımalar, kameranın görüntü işlemleri ve yeniden kurulum hataları spektrumu etkiler.</p></div></div>` },
  { title: 'Araştırma sorusu ve hipotezler', html: `
    <div class="callout"><b>Araştırma sorusu:</b> Yarık açıklığı, yarık–ızgara uzaklığı (L), kamera açısı (α) ve ızgara–kamera uzaklığı (G) değiştirildiğinde 546,0735 nm referans çizgisinin ölçülen genişliği nasıl değişir?</div>
    <div class="three"><div class="callout ok"><b>H1</b><p>Yarık daraldıkça çizgi genişliği azalır; sensör örneklemesi ve optik kusurların belirlediği bir sınırdan sonra azalma belirginleşmez.</p></div>
      <div class="callout ok"><b>H2</b><p>α ve G spektrumun sensöre yerleşmesini ve kullanılabilir aralığı değiştirir; bazı konumlarda genişlik veya kalibrasyon hatası artabilir.</p></div>
      <div class="callout ok"><b>H3</b><p>Yarık–kolimatör uzaklığı sabitken L'nin değişmesi tek yönlü bir iyileşme oluşturmaz.</p></div></div>` },
  { title: 'Hedefler ve başarı ölçütleri', html: `<ol class="goals">
      <li>Değiştirilebilir yarık kaseti, mesafe ve açı işaretleri bulunan ışık geçirmez gövde (yarıkların mikroskopla doğrulanması, ışık sızıntısı kontrolü)</li>
      <li>Cıva ve neon çizgileriyle kalibrasyon; kalibrasyona alınmayan 650,6528 nm çizgisindeki mutlak hatanın her kurulumda raporlanması</li>
      <li>Dört geometri değişkeninin FWHM'ye etkisinin iki aşamada, her koşulda beş bağımsız kurulumla ölçülmesi</li>
      <li>Seçilen düzenin seçimde kullanılmayan yeni kurulumlarla başlangıç düzenine karşı karşılaştırılması</li>
      <li>Üretim dosyaları, yazılım ve maliyetin yeniden kurulabilir biçimde belgelenmesi</li></ol>` },
  { title: 'Fizik temeli', html: `<div class="two"><div>
      <p class="formula" style="font-size:1.3rem">d · sin θ = m · λ</p>
      <ul class="ticks"><li>600 çizgi/mm ızgarada d ≈ 1,667 µm; 546,0735 nm için birinci mertebe θ ≈ 19,1° (dik geliş; tasarım değeri)</li>
      <li>Kuramsal ayırma gücü mertebe × aydınlatılan çizgi sayısıyla artar (Hecht, 2017)</li>
      <li>Gerçek cihazda genişliği yarık görüntüsü, mercek kusurları, hizalama ve piksel örneklemesi belirler</li>
      <li>Yarık daraldıkça çizgi daralır, sensöre ulaşan ışık da azalır</li></ul></div>
      <div><div class="callout"><b>Ana gösterge</b><p>FWHM: Δλ = λ(sağ) − λ(sol), yarı yükseklikte iki kesişim kalibrasyonla dalga boyuna çevrilir.</p><p>Etkin çözme gücü: R = 546,0735 nm / Δλ</p></div>
      <div class="callout warn"><b>Örnekleme sınırı</b><p>İki pikselden dar görünen çizgide kesin FWHM yerine örnekleme sınırı bildirilir; yumuşatma ve keskinleştirme kullanılmaz.</p></div></div></div>` },
  { title: 'Önceki çalışmalar (Tablo 1)', html: `<div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Çalışma</th><th>Yaklaşım</th><th>İZGE'nin farkı</th></tr></thead><tbody>
      <tr><td>Woo ve Ju (2019)</td><td>3B baskılı eğitim spektrometresi, akıllı telefon; dar yarık ve iç perdelerin rolü</td><td>Geometri değişkenlerinin sistematik karşılaştırması</td></tr>
      <tr><td>Wilkes vd. (2017)</td><td>3B baskılı, telefon sensörlü, morötesi bölge; yaklaşık 1 nm (başlıkta)</td><td>Görünür bölge, okulda kurulum, tekrarlı kurulum</td></tr>
      <tr><td>Hernández Gutiérrez ve Moreno Araujo (2026)</td><td>3B baskılı gövde, web kamerası, ticari cihazla karşılaştırma</td><td>Aynı protokolle 18 koşul ve bağımsız doğrulama çizgisi</td></tr></tbody></table></div>
    <p class="muted">Bu çalışmaların sonuçları farklı optik parçalara aittir; İZGE'nin sonucu olarak aktarılmaz. Projede “ilk” iddiası yoktur.</p>` },
  { title: 'Ölçüm yazılımı', html: `${flow([
      ['Kaynak ve kamera', 'otomatik odak, pozlama ve beyaz denge kapalı; ayarlar kayda yazılır', '#6d28d9'],
      ['İlgi bölgesi', 'birinci mertebe spektrumun merkezinde sabit yükseklik', '#2563eb'],
      ['Karanlık kareler', '10 kare ortalaması çıkarılır', '#334155'],
      ['Kalibrasyon', 'Hg 404,66 / 435,83 / 546,07 + Ne 692,95; ≤ 2. derece', '#16a34a'],
      ['Doğrulama', 'kalibrasyona alınmayan Ne 650,6528 nm', '#ca8a04'],
      ['Ana ölçüm', '20 kare · yeşil kanal · yerel arka plan · FWHM', '#dc2626']])}
    <p class="muted center">Her yeni geometride kalibrasyon yeniden yapılır, eski katsayılar taşınmaz. Doygunluk, yetersiz sinyal (tepe ≥ 10 × gürültü), ışık sızıntısı, birleşmiş çizgi ve eksik kayıt otomatik denetlenir.</p>` },
  { title: 'Ölçüm ekranı', html: `<div class="two">${img('olcum.jpg', 'İZGE ölçüm ekranı', 'Ölçüm ekranı — yazılım denemesi için simülasyon kaynağıyla (gerçek ölçüm değildir)')}
      <ul class="ticks"><li>Web kamerası, görüntü dosyası veya simülasyon kaynağı</li><li>Cıva çizgileri örüntü eşleştirmeyle önerilir (577–579 nm sarı çift denetimi); neon çizgileri kaydırma + ölçek aramasıyla</li>
      <li>Her öneri kullanıcı onayına sunulur; eşleşmeler elle değiştirilebilir</li><li>Kayıt: deney kodu, blok, gerçek yarık açıklığı, L, G, α, kamera ayarları, katsayılar, doğrulama hatası, FWHM, piksel genişliği, sinyal/gürültü, geçerlilik</li></ul></div>` },
  { title: 'Kalibrasyon ve FWHM', html: `<div class="two">${img('kalibrasyon.jpg', 'Kalibrasyon ve FWHM', 'Kalibrasyon tablosu ve 546,0735 nm çizgisinin yarı yükseklik sınırları (simülasyon)')}
      <div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Kaynak</th><th>λ (nm, havada)</th><th>Kullanım</th></tr></thead><tbody>
      <tr><td>Hg I</td><td>404,6563</td><td>Kalibrasyon</td></tr><tr><td>Hg I</td><td>435,8328</td><td>Kalibrasyon</td></tr><tr><td>Hg I</td><td>546,0735</td><td>Kalibrasyon ve ana çizgi genişliği</td></tr><tr><td>Ne I</td><td>692,9467</td><td>Kırmızı uç kalibrasyonu</td></tr><tr><td>Ne I</td><td>650,6528</td><td>Bağımsız doğrulama</td></tr></tbody></table>
      <p class="muted small">Referans değerler: Sansonetti ve Martin (2005). İZGE ile ölçülmüş sonuç değildir.</p></div></div>` },
  { title: 'Deney düzeni', html: `<div class="two"><div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Değişken</th><th>Düzeyler</th></tr></thead><tbody>
      <tr><td>Yarık açıklığı (nominal)</td><td>0,05 / 0,10 / 0,20 mm</td></tr><tr><td>Yarık–ızgara uzaklığı L</td><td>100 / 140 / 180 mm</td></tr><tr><td>Kamera açısı α</td><td>15 / 20 / 25°</td></tr><tr><td>Izgara–objektif uzaklığı G</td><td>15 / 25 / 35 mm</td></tr></tbody></table>
      <ul class="ticks" style="margin-top:12px"><li>Aşama 1: yarık × L (α 20°, G 25 mm) · 45 kurulum</li><li>Aşama 2: α × G (seçilen yarık ve L) · 45 kurulum</li><li>Son karşılaştırma: başlangıç ve seçilen düzen, 10'ar yeni kurulum</li><li>Toplam 110 kurulum, 2200 ana ölçüm karesi</li></ul></div>
      ${img('deney.jpg', 'Deney yöneticisi', 'Deney yöneticisi: tohumla rastgele sıra, SHA-256 özetli sabit protokol')}</div>` },
  { title: 'Veri analizi', html: `<div class="two"><ul class="ticks">
      <li>Her kurulumun 20 karesinden bir ortalama FWHM; birim bağımsız kurulumdur (20 kare 20 deney sayılmaz)</li>
      <li>Koşul başına ortalama, standart sapma ve %95 güven aralığı</li><li>Her aşamada iki faktörlü varyans analizi: F(2; 36) ve etkileşim F(4; 36)</li>
      <li>Son karşılaştırma: Welch t testi (varyanslar eşit varsayılmaz); iyileşme yüzdesi</li><li>Belirsizlik bileşenleri ayrı kaydedilir; sonuçlar belirsizlikten fazla basamakla yazılmaz (JCGM, 2008)</li></ul>
      <div class="callout"><b>Seçim kuralı</b><p>Geçerli koşullar içinde ortalama FWHM'si en küçük düzen seçilir; fark ölçüm belirsizliğinden küçükse daha kararlı ve kolay kurulan düzen tercih edilir. Uygulama, güven aralığı örtüşen adayları gösterir.</p>
      <p class="muted small">Tablo 6–10 ve Şekil 4–6 gerçek kayıtlardan otomatik üretilir; bu sunumda uydurma sonuç gösterilmez.</p></div></div>` },
  { title: 'Laboratuvar güvenliği', html: `<div class="two"><ul class="ticks">
      <li>Işık kaynakları kapalı, sağlam ve öğretmen gözetiminde</li><li>Floresan lambalar açılmaz; çıplak yüksek gerilim, açık morötesi kaynak ve doğrudan bakılan lazer yok</li></ul>
      <ul class="ticks"><li>Neon kaynağın güç birimi üretici düzeninde bırakılır</li><li>Metal yarık kenarları taşıyıcı içinde kapatılır; baskı ve sıcak yüzeyler okul kurallarına göre</li><li>Çalışmada insan katılımcı yoktur</li></ul></div>` },
  { title: 'Sınırlılıklar ve öneriler', html: `<div class="two">
      <div><h3>Sınırlılıklar</h3><ul class="ticks warnl"><li>Tek kamera, tek mercek, tek ızgara</li><li>Tüketici kamerasının renk işlemleri çizgi şeklini etkileyebilir</li><li>Çözünürlük 546 nm çevresinde ölçülür; bütün bölgeye genellenemez</li><li>Aşamalı tasarım bütün etkileşimleri ölçmez</li><li>Tek bağımsız doğrulama çizgisi; radyometrik kalibrasyon yok</li></ul></div>
      <div><h3>Öneriler</h3><ul class="ticks"><li>Farklı ızgara, kamera ve merceklerle aynı protokol</li><li>Aynı kaynakların ticari spektrometreyle karşılaştırılması</li><li>Sıvı örnekler için kararlı kaynak ve küvet taşıyıcısı; kamera doğrusallığı sınanmalı</li><li>Kaynak sınıflandırmada aynı örneğin kareleri eğitim ve teste dağıtılmamalı</li><li>Öğretim materyali ve etkisinin ayrı araştırılması</li></ul></div></div>` },
  { title: 'Kaynaklar', html: `<ul style="display:grid;gap:8px;padding-left:20px">
      <li>Hecht, E. (2017). <i>Optics</i> (5th ed.). Pearson.</li>
      <li>Hernández Gutiérrez, C. A., &amp; Moreno Araujo, J. E. (2026). Development and experimental validation of a low-cost CMOS based spectrometer for optical and fluorescence applications. <i>Revista Mexicana de Física, 72</i>, 020901.</li>
      <li>Joint Committee for Guides in Metrology. (2008). <i>Guide to the expression of uncertainty in measurement</i> (JCGM 100:2008). BIPM.</li>
      <li>Ling, S. J., Sanny, J., &amp; Moebs, W. (2016). <i>University physics: Volume 3</i>. OpenStax.</li>
      <li>Sansonetti, J. E., &amp; Martin, W. C. (2005). Handbook of basic atomic spectroscopic data. <i>J. Phys. Chem. Ref. Data, 34</i>(4), 1559–2259.</li>
      <li>Welch, B. L. (1947). The generalization of “Student's” problem when several different population variances are involved. <i>Biometrika, 34</i>(1–2), 28–35.</li>
      <li>Wilkes, T. C. vd. (2017). Low-cost 3D printed 1 nm resolution smartphone sensor-based spectrometer. <i>Optics Letters, 42</i>(21), 4323–4326.</li>
      <li>Woo, Y., &amp; Ju, Y. G. (2019). Fabrication of a high-resolution smartphone spectrometer for education using a 3D printer. <i>Physics Education, 54</i>(1), 015010.</li></ul>` },
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big">◈</div><h1>Ölçmeye başlayın</h1>
    <p class="lead">Web kamerasını bağlayın, cıva ve neon çizgileriyle kalibre edin, 546,0735 nm çizgisinin genişliğini ölçün.</p>
    <div class="row center"><a class="btn big primary" href="#/olcum">🔬 Ölçüm</a><a class="btn big" href="#/deney">🧪 Deney ve analiz</a><a class="btn big" href="#/araclar">📐 Optik araçlar</a></div></div>` },
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
