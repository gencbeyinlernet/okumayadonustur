// YOLİZİ proje sunumu
import { $, $$, esc } from './ui.js';

const img = (src, alt, cap) => `<figure class="shot"><img src="img/${src}" alt="${esc(alt)}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const flow = (items) => `<div class="flow">${items.map(([t, s, c], i) => `<div class="fbox" style="--c:${c}"><b>${t}</b><small>${s}</small></div>${i < items.length - 1 ? '<span class="farrow">→</span>' : ''}`).join('')}</div>`;

const SLIDES = [
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big">⛰</div><h1>YOLİZİ</h1>
    <p class="lead">1856 Trabzon–Erzurum Kış Yolunun Maçka–Torul Kesiminin En Düşük Maliyetli Yol Analiziyle Modellenmesi</p>
    <div class="tags"><span>Ana alan: Coğrafya</span><span>Tematik alan: Somut Kültürel Miras</span></div>
    <p class="muted">Kesin bir tarihî yol iddiası değil; kanıta dayalı güzergâh adayları, belirsizlik gösterimleri ve yeniden üretilebilir bir yöntem.</p></div>` },
  { title: 'Proje ne yapıyor?', html: `<div class="two"><div>
      <p class="big">YOLİZİ, Maçka–Zigana–Torul kesiminde 1856 tarihli kış yolu kaydının desteklediği güzergâh adaylarını <b>sayısal yükseklik verisi</b> ve <b>tarihî belgelerle</b> modelleyen bir coğrafi analiz ve sunum uygulamasıdır.</p>
      <ul class="ticks"><li>Üç model: yalnızca mesafe (M0), yönlü eğim ve akarsu geçişi (M1), bunlara belge yakınlığı (M2)</li>
      <li>Kanıtlar geliştirme ve bağımsız test olarak ayrılır; test kanıtları parametre seçiminde kullanılmaz</li>
      <li>Belirsizlik: senaryolar arası uzlaşma haritası, %5 ve %10 alternatif koridorlar</li>
      <li>Sonuçlar kaynak kartlarıyla birlikte sanal gerçeklik gözlüğünde incelenebilir</li></ul></div>
      ${img('analiz.jpg', 'YOLİZİ analiz ekranı', 'Analiz ekranı: Copernicus DEM üzerinde M0 ve M1 güzergâhları')}</div>` },
  { title: 'Problem', html: `<div class="two">
      <div class="callout"><p class="big">Dağlık bölgelerde en kısa bağlantı, yük taşıyan bir kafilenin kullanabileceği geçit ve vadilerden farklı olabilir. Nehir geçişleri, eğim, mevsim ve konaklama noktaları yol seçimini etkiler.</p></div>
      <div class="callout warn"><p class="big">Güncel bir harita üzerinde iki yerleşimi birleştirmek tarihî güzergâhı açıklamaya yetmez; farklı dönemlere ait yolları tek hat olarak birleştirmek de yanıltıcıdır.</p></div></div>` },
  { title: 'Araştırma soruları ve hipotezler', html: `
    <div class="callout"><b>Ana soru:</b> Topoğrafyayı ve dönemle uyumlu tarihî kayıtları birleştiren bir güzergâh modeli, geliştirmede kullanılmayan kontrol bölgeleriyle yalnızca mesafeyi kullanan modele göre daha iyi örtüşür mü?</div>
    <div class="callout"><b>Teknik soru:</b> Koordinatları ve kaynak bağlantıları korunan sanal sahne, gözlükte inceleme görevlerini tamamlayabilecek biçimde çalışır mı? (Tarihsel doğruluk hipotezlerinden ayrı değerlendirilir.)</div>
    <div class="three"><div class="callout ok"><b>H1</b><p>M1'in bağımsız kontrol bölgelerine medyan uzaklığı M0'dan düşüktür.</p></div>
    <div class="callout ok"><b>H2</b><p>Belge bilgisinin eklenmesi (M2) medyan uzaklığı azaltır, kapsama oranlarını artırır.</p></div>
    <div class="callout ok"><b>H3</b><p>Bazı kesimler parametre ve çözünürlük değişimlerinde kararlı kalır; bazılarında birden fazla aday oluşur.</p></div></div>` },
  { title: 'Hedefler ve başarı ölçütleri', html: `<ol class="goals">
      <li>Kanıt gruplarını ve kaynak ailelerini parametre seçiminden önce <b>tarihli bir kayıtla</b> geliştirme ve test olarak ayırmak (en az 10 grup, en az 4 test)</li>
      <li>M0, M1 ve M2'yi <b>aynı alan, çözünürlük ve uç bölgelerle</b> hesaplamak</li>
      <li>Modelleri bağımsız test bölgelerine <b>medyan uzaklık, %90 değeri ve 100 / 250 / 500 m kapsama</b> ile karşılaştırmak</li>
      <li>Parametre, çözünürlük ve alan sınırı değişimlerinde <b>kararlı ve değişken kesimleri</b> göstermek</li>
      <li>Sonuçları kaynak kartlarıyla sanal gerçeklikte sunmak (oturumların tamamlanması, karelerin ≥ %95'inin bütçe içinde kalması, koordinat farkı ≤ 1 m)</li></ol>
    <p class="muted">Uygulamadaki karşılıkları: ayrım kilidi (SHA-256 özetli), model sekmesi, değerlendirme tabloları, duyarlılık sekmesi, 3B/VR sahne testi.</p>` },
  { title: 'Bilimsel temel', html: `<div class="three">
      <div class="callout"><b>Yılmaz (2020)</b><p>Mircher ve Saget 1856'da Trabzon–Erzurum yolunu inceleyip haritalamış; kış yolu ile yaz yolu ayrımı yapılmıştır.</p></div>
      <div class="callout"><b>Dijkstra (1959)</b><p>Izgara hücreleri ağ düğümleridir; toplam maliyeti en aza indiren bağlantı en kısa yol algoritmasıyla bulunur.</p></div>
      <div class="callout"><b>Herzog (2014)</b><p>Sonuç; maliyet fonksiyonuna, yokuş yukarı/aşağı farkına (yönlülük), komşuluk düzenine ve yükseklik verisine duyarlıdır.</p></div>
      <div class="callout"><b>Tobler (1993)</b><p>Yürüyüş hızının eğime bağlı fonksiyonu; insan yürüyüşü katsayıları yük hayvanlı kafileyi doğrudan temsil etmez.</p></div>
      <div class="callout warn"><b>Lewis (2021)</b><p>Yükseklik verisindeki belirsizlik sonuçları değiştirebilir; tek çizgiye dayanan yorumlar sınırlıdır.</p></div>
      <div class="callout"><b>W3C WebXR (2026)</b><p>Tarayıcıda çalışan sahne, destek sorgusundan sonra kullanıcının “VR'ye gir” seçimiyle oturum açar.</p></div></div>` },
  { title: 'İş akışı', html: `${flow([
      ['Kaynak ve kanıt', 'künye, yer adı eşleştirme, konum belirsizliği', '#0f766e'],
      ['Ayrımı sabitle', 'geliştirme / test, tarihli SHA-256 kaydı', '#0e7490'],
      ['Parametre seçimi', 'yalnız geliştirme kanıtları, aile dışarıda bırakma', '#7c3aed'],
      ['M0 · M1 · M2', '8 komşulu Dijkstra, Copernicus DEM 30 m', '#ea580c'],
      ['Duyarlılık', 'uzlaşma haritası, %5–%10 koridor', '#ca8a04'],
      ['Bağımsız test', 'medyan, %90, kapsama', '#be123c'],
      ['3B / VR', 'kaynak kartları, teknik testler', '#334155']])}
    <p class="muted center">Test kayıtları maliyet katmanına, ara durak seçimine veya parametre ayarına aktarılmaz.</p>` },
  { title: 'Veri kaynakları (Tablo 1)', html: `<div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Veri türü</th><th>Hazırlama işlemi</th><th>Kullanım ve sınır</th></tr></thead><tbody>
      <tr><td>Sayısal yükseklik modeli</td><td>Copernicus GLO-30 verisinin UTM 37K (EPSG:32637) 30 m ızgaraya çift doğrusal yeniden örneklenmesi; 60 ve 90 m genelleştirme</td><td>Eğim ve arazi yüzeyi; bugünkü yüzey geçmiş araziyle özdeş değildir</td></tr>
      <tr><td>Dönem haritası ve anlatılar</td><td>Künyelendirme, yer adı eşleştirme, haritanın konumlandırılması (afin, KOK hata)</td><td>Geliştirme veya bağımsız test kanıtı</td></tr>
      <tr><td>Akarsu ve geçiş bilgileri</td><td>DEM'den türetilmiş akarsu ağı (çukur doldurma + D8 akış birikimi; 10 / 50 / 250 km² havza eşikleri); dış katman içe aktarılabilir</td><td>Geçiş maliyeti senaryoları; bugünkü köprüler tarihî kanıt değildir</td></tr>
      <tr><td>Güncel yerleşim ve görüntüler</td><td>Tarihî adlarla olası eşleştirmelerin kontrolü</td><td>Konumlandırma yardımı; tarihsel kullanımın kanıtı sayılmaz</td></tr></tbody></table></div>
    <p class="muted">Copernicus DEM bir sayısal yüzey modelidir; yapı ve bitki örtüsü etkilerini içerebilir.</p>` },
  { title: 'Modeller ve maliyet fonksiyonu', html: `<div class="two"><div>
      <p class="formula" style="font-size:1.25rem">c = d·(1 + a·u + b·v + g·s² + λ·h) + K</p>
      <ul class="ticks"><li><b>d</b>: hücre merkezleri arası gerçek mesafe; çaprazda √2·çözünürlük</li><li><b>s</b> = Δz/d; <b>u</b> = max(s, 0), <b>v</b> = max(−s, 0): yokuş yukarı ve aşağı farklı maliyet</li>
      <li><b>h</b> = min(1, en yakın geliştirme bölgesine uzaklık / 500 m); <b>λ</b> belge ağırlığı</li><li><b>K</b>: yalnızca akarsu geçişi olan kenarlara eklenir</li><li>Geçilemeyen hücre köşelerinden yapay geçiş yok</li></ul></div>
      <div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Model</th><th>Kullanılan bilgi</th><th>Sınanan katkı</th></tr></thead><tbody>
      <tr><td><b>M0</b> Mesafe</td><td>Geçilebilir alan ve gerçek mesafe</td><td>En kısa bağlantı (temel karşılaştırma)</td></tr>
      <tr><td><b>M1</b> Arazi</td><td>Mesafe, yönlü eğim, akarsu geçiş maliyeti</td><td>Topoğrafyanın katkısı</td></tr>
      <tr><td><b>M2</b> Arazi ve belge</td><td>M1 + yalnız geliştirme kanıtlarına yakınlık</td><td>Belge bilgisinin bağımsız kayıtlarla örtüşmeye katkısı</td></tr></tbody></table>
      <p class="muted small">Başlangıç değerleri a = 8, b = 4, g = 6 deneysel olarak doğrulanmış kervan katsayıları değildir; ölçek 0,5 / 1 / 1,5; λ 0 / 0,5 / 1; akarsu cezası 50 / 200 / 500 m.</p></div></div>` },
  { title: 'Gerçek arazi üzerinde ilk sonuç', html: `<div class="two">
      ${img('m0m1.jpg', 'M0 ve M1 güzergâhları', 'Maçka → Torul: M0 (kesikli) ve M1 (turuncu). Kanıt kullanılmadan, yalnızca uç bölgelerle hesaplanmıştır.')}
      <div><ul class="ticks"><li><b>M0</b> (mesafe): ~37 km, toplam yükselme ~6.000 m; sırtları dik keser</li>
      <li><b>M1</b> (arazi): ~44 km, toplam yükselme ~2.250 m; en yüksek noktası ~2.030 m</li>
      <li>M1, Zigana'dan geçme zorunluluğu konulmadan Zigana Geçidi çevresinden geçer</li>
      <li>30 m çözünürlükte bir güzergâh tarayıcıda ~1 saniyede hesaplanır</li></ul>
      <p class="callout warn">Bu ekran yöntemi gösterir; M2 ve bağımsız test sonuçları ekibin kanıt matrisiyle üretilir. Bu sunumda uydurma kanıt veya sonuç gösterilmez.</p></div></div>` },
  { title: 'Belirsizlik ve alternatif koridorlar', html: `<div class="two">
      ${img('koridor.jpg', 'Koridorlar ve uzlaşma', 'M1 için %5 (koyu sarı) ve %10 (açık sarı) koridorlar ile senaryolar arası uzlaşma')}
      <ul class="ticks"><li>Her parametre birleşiminde güzergâh yeniden üretilir; her kesimin kaç senaryoda seçildiği haritalanır</li>
      <li>Toplam maliyeti en iyi yola göre en çok %5 ve %10 yüksek bağlantılar; bitişe kalan maliyet kenar yönleri ters çevrilerek bulunur</li>
      <li>Yüzde, tarihteki gerçek yolun bulunma olasılığı <b>değildir</b>; eşikler modelde izin verilen maliyet farklarıdır</li></ul></div>` },
  { title: 'Bağımsız değerlendirme (Tablo 3)', html: `<div class="table-wrap"><table class="tbl slide-table"><thead><tr><th>Gösterge</th><th>Hesaplama</th><th>Yorum</th></tr></thead><tbody>
      <tr><td>Medyan kontrol uzaklığı</td><td>Bağımsız bölgelere uzaklıkların ortancası</td><td>Küçük değer daha yakın örtüşme</td></tr>
      <tr><td>%90 uzaklık değeri</td><td>Uzaklık dağılımının üst bölümü</td><td>Az sayıdaki büyük sapmayı görünür kılar</td></tr>
      <tr><td>Kapsama oranı</td><td>100, 250 ve 500 m içindeki grup / toplam grup</td><td>Eşikler önceden sabit; hepsi birlikte raporlanır</td></tr>
      <tr><td>Uzunluk ve yükselme</td><td>Çizgi uzunluğu ve yükseklik profili</td><td>Örtüşmenin dolambaçlılıkla ilişkisi</td></tr>
      <tr><td>Senaryolar arası değişim</td><td>Kesimlerin seçilme sıklığı</td><td>Kararlı ve değişken bölümler</td></tr></tbody></table></div>
    <p class="muted">Çizgi bölgenin içinden geçiyorsa uzaklık 0'dır; birim kanıt grubudur, raster hücreleri bağımsız gözlem sayılmaz. Uygulama Tablo 4, 5 ve 6'yı doğrudan üretir.</p>` },
  { title: 'Sanal gerçeklik sahnesi', html: `<div class="two">
      ${img('sahne.jpg', '3B sahne', 'Masa üstü arazi modu: gerçek DEM, güzergâh katmanları ve kaynak kartı')}
      <ul class="ticks"><li>Tarayıcıda çalışır; WebXR ile “VR'ye gir” seçimiyle oturum açar; gözlüksüz masaüstü görünümü de vardır</li>
      <li><b>Mod 1:</b> masa üstü arazi modeli — döndür, büyüt, M0/M1/M2 katmanlarını aç-kapat</li>
      <li><b>Mod 2:</b> durak veya geçit çevresine ışınlanma ve kademeli dönüş</li>
      <li>Kaynakla belgelenmiş unsur, algoritmanın önerdiği güzergâh ve görsel bağlam farklı biçimlerde; belgesiz han, kervan veya bina çizilmez</li>
      <li>Teknik test: kare süresi, yükleme süresi, koordinat aktarım farkı (≤ 1 m hedef)</li></ul></div>` },
  { title: 'Etik ve veri yönetimi', html: `<div class="two"><ul class="ticks">
      <li>Harita, metin ve görüntülerin kaynakları, erişim tarihleri ve kullanım koşulları kaydedilir</li>
      <li>Özgün belge görseli yalnızca kullanım izni kapsamında kullanılır</li>
      <li>Kaynak metni ile ekibin yorumu ayrı tutulur</li><li>Kişisel veri toplanmaz; katılımcı yoktur</li></ul>
      <ul class="ticks"><li>Uygulama işlem günlüğü tutar; sonuç vermeyen model koşuları silinmez</li>
      <li>Ham DEM, dönüştürülmüş katmanlar, kaynak matrisi, parametre dosyası ve çıktılar ayrı dışa aktarılır</li>
      <li>Kış aylarında dağlık alanda saha çalışması yapılmaz</li></ul></div>` },
  { title: 'Sınırlılıklar ve öneriler', html: `<div class="two">
      <div><h3>Sınırlılıklar</h3><ul class="ticks warnl"><li>Güncel yüzey modeli eski patikaları, köprüleri ve değişen yerleşimleri göstermez</li><li>Yol tercihi yalnızca eğimle açıklanamaz (güvenlik, ticaret, yerel bilgi)</li><li>Maliyet katsayıları varsayımdır</li><li>Test grubu sayısı küçüktür; sonuçlar betimseldir</li><li>Sonuçlar yalnızca bu kesim, dönem ve varsayımlar için geçerlidir</li></ul></div>
      <div><h3>Öneriler</h3><ul class="ticks"><li>Yaz yolu ve farklı dönem kayıtlarıyla ayrı modeller</li><li>Tobler tipi yürüyüş fonksiyonuyla ek karşılaştırma</li><li>Güvenli mevsimde, izinli ve öğretmen eşliğinde kısa saha doğrulaması</li><li>İkinci bir tarihî yol kesiminde sınama</li><li>VR sahnesinin öğrenmeye etkisi için ayrı, izinli katılımcı çalışması</li></ul></div></div>` },
  { title: 'Kaynaklar', html: `<ul class="refs" style="display:grid;gap:8px;padding-left:20px">
      <li>Copernicus Data Space Ecosystem. (t.y.). <i>Copernicus DEM: Global and European digital elevation model</i>.</li>
      <li>Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. <i>Numerische Mathematik, 1</i>, 269–271.</li>
      <li>Herzog, I. (2014). Least-cost paths – some methodological issues. <i>Internet Archaeology, 36</i>.</li>
      <li>Lewis, J. (2021). Probabilistic modelling for incorporating uncertainty in least cost path results. <i>Journal of Archaeological Method and Theory</i>.</li>
      <li>Tobler, W. (1993). <i>Three presentations on geographical analysis and modeling</i> (Technical Report 93-1). NCGIA.</li>
      <li>W3C. (2026). <i>WebXR Device API</i>.</li>
      <li>Yılmaz, Ö. (2020). Yüzbaşı Mircher'ye göre XIX. yüzyılın ortalarında Trabzon–Erzurum yolu. <i>Karadeniz Araştırmaları Enstitüsü Dergisi, 6</i>(9), 49–80.</li>
      <li>Barnes, R., Lehman, C., &amp; Mulla, D. (2014). Priority-flood: An optimal depression-filling and watershed-labeling algorithm. <i>Computers &amp; Geosciences, 62</i>, 117–127. (akarsu katmanı)</li></ul>` },
  { cls: 'cover', html: `<div class="cover-in"><div class="logo-big">⛰</div><h1>Uygulamayı deneyin</h1>
    <p class="lead">Kanıt matrisinizi içe aktarın, ayrımı sabitleyin, modelleri hesaplayın; sonuçları 3B/VR sahnede kaynak kartlarıyla inceleyin.</p>
    <div class="row center"><a class="btn big primary" href="#/analiz">🗺️ Analize geç</a><a class="btn big" href="#/sahne">🥽 3B / VR sahne</a></div></div>` },
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
    $('[data-count]', root).textContent = `${i + 1} / ${SLIDES.length}`;
    $('[data-prog]', root).style.width = ((i + 1) / SLIDES.length) * 100 + '%';
    history.replaceState(null, '', `#/sunum/${i + 1}`);
  };
  $('[data-prev]', root).onclick = () => show(i - 1);
  $('[data-next]', root).onclick = () => show(i + 1);
  $('[data-list]', root).onclick = () => { const x = $('[data-index]', root); x.hidden = !x.hidden; };
  $$('[data-go]', root).forEach((b) => (b.onclick = () => { show(+b.dataset.go); $('[data-index]', root).hidden = true; }));
  $('[data-fs]', root).onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('.deck', root).requestFullscreen?.().catch(() => {}));
  stopSunum();
  keyHandler = (e) => {
    if (e.target.closest('input,textarea,select')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1); }
  };
  document.addEventListener('keydown', keyHandler);
  let sx = null; const st = $('[data-stage]', root);
  st.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  st.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) show(i + (dx < 0 ? 1 : -1)); sx = null; });
  show(i);
}
