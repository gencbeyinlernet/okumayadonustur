// Proje tanıtım sunumu (slaytlar). Görseller uygulamanın gerçek ekran görüntüleridir.
import { MODULES, GROUPS } from './data.js';
import { SKILLS } from './stats.js';
import { $, $$, esc } from './ui.js';

const img = (src, alt, cap) => `<figure class="shot"><img src="img/${src}" alt="${esc(alt)}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;

const flow = () => `
  <div class="flow-diagram">
    ${[
      ['Sesi fark et', 'ses farkındalığı'],
      ['Harfi tanı ve ayırt et', 'ses–harf ilişkisi'],
      ['İzi takip et', 'tam rehber → azaltılmış → rehbersiz'],
      ['Bağımsız yaz', 'ipucusuz harf üretme'],
      ['Hece ve kelime oluştur', 'birleştirme'],
      ['Oku ve eşleştir', 'kelime okuma'],
      ['Cümle kur ve anla', 'anlam kurma'],
    ].map(([t, s], i) => `<div class="fd-box" style="--mc:${MODULES[i].color}"><b>${t}</b><small>${s}</small></div>${i < 6 ? '<span class="fd-arrow">→</span>' : ''}`).join('')}
    <div class="fd-back">↩ Öğretmen gerektiğinde önceki etkinliğe döner veya uygun sonraki etkinliği açar</div>
  </div>`;

const SLIDES = [
  { cls: 'cover', html: `
    <div class="cover-in">
      <div class="logo-big" aria-hidden="true"><span>ses</span><span>izi</span></div>
      <h1>SESİZİ</h1>
      <p class="lead">İlk Okuma Yazma Sürecinde Sesten Harfe ve Kelimeye Aşamalı Dijital Etkinlikler</p>
      <div class="tags"><span>Ana alan: Türk Dili ve Edebiyatı</span><span>Tematik alan: E-Öğrenme</span></div>
      <p class="muted">Adı, sesin harfe dönüşmesini ve öğrencinin çizerek bıraktığı izi anlatır.</p>
    </div>` },
  { title: 'Proje ne yapıyor?', html: `
    <div class="two">
      <div>
        <p class="big">SESİZİ, 1. sınıf öğrencilerinin <b>sesi tanıma → harfi seçme → rehberli çizimden bağımsız yazmaya geçme → hece ve kelime kurma → kelimeyi okuyup anlamıyla eşleştirme → kısa cümleyi anlama</b> basamaklarında ilerlemesini sağlayan bir web uygulamasıdır.</p>
        <ul class="ticks">
          <li>Türkçenin ses temelli ilk okuma yazma sırasını izler</li>
          <li>Öğretmen gözetiminde, 15–20 dakikalık kısa oturumlar</li>
          <li>Kelimeler yalnızca öğrencinin öğrendiği seslerden oluşur</li>
          <li>Etkisi ekran dışında, kâğıt üzerinde ölçülür</li>
        </ul>
      </div>
      ${img('hub.png', 'SESİZİ modül seçimi ekranı', 'Öğrencinin modül akışı')}
    </div>` },
  { title: 'Problem', html: `
    <div class="two">
      <div class="callout"><p class="big">Öğrenciler harf–ses ilişkisi, harf biçimi ve birleştirme basamaklarında <b>farklı hızlarda</b> ilerler. Bu durum kısa, hedefli ve öğretmen gözetimli tekrar gerektirir.</p></div>
      <div class="callout warn"><p class="big">Dijital etkinlikler tekrarı sağlayabilir; ancak öğrencinin ekranda bir harfi doğru seçmesi, o harfi <b>kâğıda yazabildiğini</b> veya yeni bir kelime içinde <b>okuyabildiğini</b> göstermez.</p></div>
    </div>` },
  { title: 'Amaç ve araştırma sorusu', html: `
    <p class="big">Ses–harf eşleştirme, harf yazma, kelime okuma ve cümle anlama becerilerini aşamalı dijital etkinliklerle destekleyen bir uygulama geliştirmek ve bu becerilerdeki değişimi, özellikle <b>kâğıt üzerinde</b> gösterilen becerileri ölçmek.</p>
    <div class="callout"><b>Araştırma sorusu:</b> SESİZİ ile yapılan aşamalı dijital etkinliklerden sonra öğrencilerin ses–harf eşleştirme, kâğıt üzerinde bağımsız harf yazma, kelime okuma ve cümle anlama puanları değişmekte midir?</div>
    <div class="two small-gap">
      <div class="callout ok"><b>H1:</b> Son test puanları her beceride ön test puanlarından yüksektir.</div>
      <div class="callout"><b>H0:</b> Ön test ve son test puanları arasında fark yoktur.</div>
    </div>` },
  { title: 'Hedefler', html: `
    <ol class="goals">
      <li><b>Yedi modülden</b> oluşan, ses temelli öğretim sırasına uygun çalışır bir uygulama geliştirmek</li>
      <li>Bütün ses kayıtlarını, harf biçimlerini ve kelimeleri <b>sınıf öğretmenine kontrol ettirmek</b> ve hatalı içeriği düzeltmek</li>
      <li>Kelime örneklerini <b>yalnızca öğrenilmiş seslerden</b> oluşturmak</li>
      <li>20 öğrencinin dört becerideki ön test–son test değişimini eşleştirilmiş olarak ölçmek; uygulama içi başarıyı kâğıt üzerindeki yazmadan <b>ayrı</b> raporlamak</li>
      <li>Oturumları öğretmen gözetiminde <b>15–20 dakikayla</b> sınırlamak</li>
    </ol>
    <p class="muted">Uygulamada her hedefin karşılığı: 7 modül · İçerik kontrolü paneli · otomatik ses grubu süzgeci · Ölçme ve analiz paneli · oturum süresi sınırı.</p>` },
  { title: 'Bilimsel temel', html: `
    <div class="refs-grid">
      <div class="callout"><b>Ehri (2005)</b><p>Harf–ses bağlantıları kelime okumanın temelidir; kelimeler bu bağlantılarla belleğe yerleşir.</p></div>
      <div class="callout"><b>Ulusal Okuma Paneli (NICHD, 2000)</b><p>Ses farkındalığı ve sistematik ses–harf öğretimi erken okumaya katkı sağlar.</p></div>
      <div class="callout"><b>MEB (2024)</b><p>İlkokul Türkçe Dersi Öğretim Programı ses temelli ilk okuma yazma yaklaşımını benimser.</p></div>
      <div class="callout"><b>Cheung ve Slavin (2012) · Dahl-Leonard vd. (2024)</b><p>Teknolojinin okumaya etkisi küçük ama olumlu: ortalama etki 0,16 ve 0,24. Yazmaya etkisi uygun ölçüm olmadığı için belirlenememiş.</p></div>
      <div class="callout"><b>Heinz vd. (2026) · Sanders vd. (2024)</b><p>Dijital uygulama tek başına üstün değildir; sonuç kullanım türüne, öğretim tasarımına ve öğretmen rehberliğine bağlıdır.</p></div>
      <div class="callout warn"><b>James ve Engelhardt (2012)</b><p>Elle harf yazmak, iz sürmeye göre harf algısıyla ilişkili beyin bölgelerini daha çok etkinleştirir. Bu yüzden yazma <b>kâğıt üzerinde</b> ölçülür.</p></div>
    </div>` },
  { title: 'Şekil 1. Öğrenme akışı', html: `${flow()}
    <p class="muted center">Akış katı bir sıra değildir. Öğretmen, öğrencinin ihtiyacına göre önceki etkinliğe dönebilir veya sonraki etkinliği açabilir.</p>` },
  { title: 'Tablo 1. Modüller', html: `
    <div class="table-wrap"><table class="stats slide-table">
      <thead><tr><th>Modül</th><th>Öğrencinin yaptığı çalışma</th><th>Desteklenen beceri</th></tr></thead>
      <tbody>${MODULES.map((m) => `<tr><td><span class="dotc" style="background:${m.color}"></span>${m.icon} <b>${esc(m.title)}</b></td><td>${esc(m.task)}</td><td>${esc(m.skill)}</td></tr>`).join('')}</tbody>
    </table></div>` },
  { title: 'Şekil 2. Ses–harf eşleştirme ekranı', html: `
    <div class="two">
      ${img('m1-ses-harf.png', 'Ses–harf eşleştirme ekranı', 'Öğrenci sesi dinler, harfi seçer')}
      <ul class="ticks">
        <li>Ses, harf adı olarak değil <b>konuşma sesi</b> olarak verilir; ünsüzler ek ünlü olmadan seslendirilir</li>
        <li>Öğretmen her ses için kendi sesini kaydedebilir; kayıt yoksa tarayıcının Türkçe sesi kullanılır</li>
        <li>Çeldiriciler görsel olarak karışan harflerden seçilir (b–d–p, ı–i–l…)</li>
        <li>Doğru yanıtın yeri <b>her soruda değişir</b>; başarı konum ezberinden kaynaklanmaz</li>
      </ul>
    </div>` },
  { title: 'Harfi ayırt et', html: `
    <div class="two">
      ${img('m2-ayirt.png', 'Harfi ayırt et ekranı', 'Hedef harf; ayna görüntüsü, benzer harf ve semboller arasından bulunur')}
      <ul class="ticks">
        <li>12 hücrede 2–4 hedef harf</li>
        <li>Çeldiriciler: benzer harfler, harfin <b>ayna görüntüsü</b>, sayı ve semboller</li>
        <li>Yanlış dokunuşta biçime yönelik kısa geri bildirim: “Bu harf ters dönmüş. Yönüne bakalım.”</li>
      </ul>
    </div>` },
  { title: 'Şekil 3. Rehberli çizimden bağımsız yazmaya', html: `
    <div class="three">
      ${img('m3-tam.png', 'Tam rehberli iz', '1. Tam rehber: harf izi, başlangıç noktası, yön okları')}
      ${img('m3-azaltilmis.png', 'Azaltılmış rehber', '2. Azaltılmış rehber: yalnızca başlangıç noktası ve yön oku')}
      ${img('m3-rehbersiz.png', 'Rehbersiz', '3. Rehbersiz: yalnızca yazı çizgileri')}
    </div>
    <p class="muted center">Çizim 0–100 arası puanlanır: harf yolunun kapsanması, en zayıf çizgi, izin yolda kalması ve çizgi uçlarına ulaşılması; iz, yolla aynı yönde ilerlemelidir. Rehbersiz düzeylerde biçim $P nokta bulutu tanıyıcısıyla (Vatavu vd., 2012) 29 harfin tamamıyla karşılaştırılır ve satır yerleşimi denetlenir. Titreşim, kayma ve boyut farkı eklenmiş yapay yazımlarla yapılan doğrulama testinde doğru yazımların %99,7’si (578/580) kabul edildi; başka bir harfin çizimi (812 deneme) hiç kabul edilmedi. Gerçek çocuk yazısıyla doğruluk ayrıca sınanmalıdır. Ekrandaki iz kâğıt üzerinde yazmanın kanıtı sayılmaz.</p>` },
  { title: 'Bağımsız yaz ve Birleştir', html: `
    <div class="two">
      ${img('m4-bagimsiz.png', 'Bağımsız yaz ekranı', 'Gösterilen veya yalnızca söylenen harf, boş alana ipucusuz yazılır')}
      ${img('m5-birlestir.png', 'Birleştir ekranı', 'Öğrenilmiş seslerle önce hece, sonra kelime kurulur')}
    </div>` },
  { title: 'Şekil 4. Kelime okuma ve görsel eşleştirme', html: `
    <div class="two">
      ${img('m6-oku-eslestir.png', 'Kelime okuma ve görsel eşleştirme ekranı', 'Öğrenci kelimeyi okur, anlamına uygun resmi seçer')}
      ${img('m7-cumle.png', 'Cümle kur ve anla ekranı', 'Kelimeler sıraya konur, ardından soru yanıtlanır')}
    </div>` },
  { title: 'Ses ve içerik ilkeleri', html: `
    <div class="two">
      <div>
        <h3>Ses grupları (MEB sırası)</h3>
        <div class="groups-slide">${GROUPS.map((g) => `<div><b>${g.id}. grup</b> ${g.letters.map((c) => `<span class="chip lc">${c}</span>`).join('')}</div>`).join('')}</div>
        <p class="muted">Öğretmen sınıfta öğrenilmiş grupları seçer; etkinlikler yalnızca bu sesleri kullanır. Ör. “elma”, içerdiği bütün sesler (e, l, m, a) öğretildikten sonra açılır.</p>
      </div>
      <ul class="ticks">
        <li><b>Geri bildirim</b> kısa ve görevle ilişkili: “Başlangıç noktasına dönüp bir kez daha deneyelim.”</li>
        <li>Öğrenciler arasında <b>sıralama yok</b>, hız başarı ölçütü değil</li>
        <li><b>Geçiş ölçütü:</b> art arda 3 ipucusuz doğru yanıt (öğretmen değiştirebilir)</li>
        <li>Hatalı içerik öğretmen panelinden kullanımdan çıkarılır</li>
      </ul>
    </div>` },
  { title: 'Öğretmen paneli', html: `
    <div class="two">
      ${img('ogretmen-icerik.png', 'Öğretmen paneli içerik kontrolü', 'İçerik kontrolü: ses kaydı, harf biçimi, kelime onayı')}
      <ul class="ticks">
        <li><b>Sınıf ve ayarlar:</b> öğrenilmiş ses grupları, oturum süresi, geçiş ölçütü, PIN</li>
        <li><b>İlerleme:</b> öğrenci kodu bazında modül durumu, zorlanılan sesler, çizim puanları, gözlem notları, modül kilidi açma</li>
        <li><b>İçerik kontrolü:</b> sesleri mikrofonla kaydetme, harf yazım yolunu inceleme, “kontrol edildi / düzeltildi” işaretleri, Ek 2 listesi</li>
        <li><b>Ölçme ve analiz:</b> ön test–son test girişi, Tablo 3, Wilcoxon, Şekil 5, yazdırılabilir ölçme formları (Ek 1)</li>
      </ul>
    </div>` },
  { title: 'Yöntem', html: `
    <div class="two">
      <div>
        <h3>Desen ve çalışma grubu</h3>
        <ul class="ticks">
          <li>Tek gruplu eşleştirilmiş ön test–son test deseni, öğretmen gözlem notlarıyla desteklenir</li>
          <li>Bir ilkokulun 1. sınıfında 20 öğrenci; MEB izni ve veli onamı</li>
          <li>Öğrenciler Ö01–Ö20 kodlarıyla izlenir</li>
        </ul>
        <h3>Uygulama süreci</h3>
        <ol class="steps"><li>Ön test (bireysel)</li><li>Haftalık 15–20 dakikalık oturumlar, öğretmen gözetiminde</li><li>Son test (aynı görevler, bireysel)</li></ol>
      </div>
      <div>
        <h3>Tablo 2. Ölçme araçları</h3>
        <div class="table-wrap"><table class="stats slide-table"><thead><tr><th>Beceri</th><th>Görev</th><th>Puanlama</th></tr></thead>
          <tbody>${SKILLS.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.task)}</td><td>${esc(s.scoring)}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </div>` },
  { title: 'Verilerin analizi', html: `
    <div class="two">
      <ul class="ticks">
        <li>Puan = ham puan ÷ en yüksek puan × 100; değişim <b>yüzde puan</b></li>
        <li>Küçük örneklem → <b>Wilcoxon işaretli sıralar testi</b> (bağ düzeltmeli z, asimptotik ve kesin p)</li>
        <li>Etki büyüklüğü <b>r = z / √N</b> (Cohen, 1988)</li>
        <li>Her beceride artan / değişmeyen / azalan öğrenci sayısı</li>
        <li>Uygulama içi çizim başarısı ile kâğıt üzerindeki yazma karşılaştırması</li>
        <li>Dört ayrı test → sonuçlar keşfedici yorumlanır</li>
      </ul>
      ${img('olcme.png', 'Ölçme ve analiz paneli', 'Ölçme ve analiz paneli: Tablo 3 ve Şekil 5 otomatik hesaplanır')}
    </div>
    <p class="muted center">Bulgular, gerçek ölçümler girildikten sonra paneldeki Tablo 3 ve Şekil 5’ten alınır; bu sunumda uydurma sonuç gösterilmez.</p>` },
  { title: 'Etik ilkeler ve veri güvenliği', html: `
    <div class="two">
      <ul class="ticks">
        <li>MEB Araştırma Uygulama İzni ve veli onamı alındıktan sonra uygulama</li>
        <li>Çocuklara çalışma yaşlarına uygun anlatılır; istemeyen bırakabilir</li>
        <li>Öğrenci adı hiçbir yerde yok; yalnızca Ö01–Ö20 kodları</li>
        <li>Çocukların fotoğrafı, ses kaydı veya videosu alınmaz</li>
      </ul>
      <ul class="ticks">
        <li>Uygulama <b>sunucuya veri göndermez</b>; her şey cihazın tarayıcısında saklanır</li>
        <li>Saklanan: deneme / doğru / ipucu sayıları, çizim puanı (çizimin kendisi değil), oturum süresi</li>
        <li>Veriler JSON / CSV olarak dışa aktarılabilir, tamamen silinebilir</li>
        <li>Uygulama tanı koymaz ve öğretmenin yerini almaz</li>
      </ul>
    </div>` },
  { title: 'İş-zaman çizelgesi', html: `
    <div class="table-wrap"><table class="stats gantt">
      <thead><tr><th>İşin tanımı</th><th>2026 öncesi</th><th>Eylül 2026</th><th>Ekim 2026</th><th>Kasım 2026</th><th>Aralık 2026</th></tr></thead>
      <tbody>
        <tr><td>Literatür taraması</td><td class="on"></td><td class="on"></td><td></td><td></td><td></td></tr>
        <tr><td>Uygulamanın geliştirilmesi</td><td class="on"></td><td class="on"></td><td></td><td></td><td></td></tr>
        <tr><td>İçerik kontrolü (sınıf öğretmeni)</td><td></td><td class="on"></td><td class="on"></td><td></td><td></td></tr>
        <tr><td>İzinler (MEB izni, veli onamı)</td><td class="on"></td><td class="on"></td><td></td><td></td><td></td></tr>
        <tr><td>Ön test – uygulama – son test (20 öğrenci)</td><td></td><td class="on"></td><td class="on"></td><td></td><td></td></tr>
        <tr><td>Veri analizi</td><td></td><td></td><td></td><td class="on"></td><td></td></tr>
        <tr><td>Rapor yazımı ve başvuru (son gün 4 Ocak 2027)</td><td></td><td></td><td></td><td class="on"></td><td class="on"></td></tr>
      </tbody></table></div>
    <p class="muted center">Çizelge proje raporundaki plana göredir.</p>` },
  { title: 'Sınırlılıklar ve öneriler', html: `
    <div class="two">
      <div><h3>Sınırlılıklar</h3><ul class="ticks warnl">
        <li>Kontrol grubu yok; öğrenciler aynı dönemde derste de okuma yazma öğreniyor</li>
        <li>20 öğrenci, tek okul; sonuçlar genellenemez</li>
        <li>Aynı maddeler alıştırma etkisi yaratabilir</li>
        <li>Öğretmen yardımı ve cihaz farkı performansı etkileyebilir</li>
        <li>Kısa süre; kalıcılık ölçülmedi</li>
      </ul></div>
      <div><h3>Öneriler</h3><ul class="ticks">
        <li>Kâğıt üzerinde çalışan bir karşılaştırma grubu</li>
        <li>Gecikmeli ölçüm; benzer güçlükte farklı maddeler</li>
        <li>Yazmayı iki bağımsız değerlendirici puanlamalı</li>
        <li>Öğretmen ilerleme ekranı <b>(bu sürümde eklendi)</b></li>
        <li>Farklı okullarda ve ses gruplarında deneme; veliler için kısa rehber</li>
      </ul></div>
    </div>` },
  { title: 'Kaynaklar', html: `
    <ul class="refs">
      <li>Cheung, A. C. K., &amp; Slavin, R. E. (2012). How features of educational technology applications affect student reading outcomes: A meta-analysis. <i>Educational Research Review, 7</i>(3), 198–215.</li>
      <li>Cohen, J. (1988). <i>Statistical power analysis for the behavioral sciences</i> (2nd ed.). Lawrence Erlbaum.</li>
      <li>Dahl-Leonard, K., Hall, C., &amp; Peacott, D. (2024). A meta-analysis of technology-delivered literacy instruction for elementary students. <i>ETR&amp;D, 72</i>, 1507–1538.</li>
      <li>Ehri, L. C. (2005). Learning to read words: Theory, findings, and issues. <i>Scientific Studies of Reading, 9</i>(2), 167–188.</li>
      <li>Heinz, J., Neuberger, F., Eras, L., &amp; Hauck-Thum, U. (2026). Bridging the digital divide? <i>Learning and Instruction, 103</i>, 102324.</li>
      <li>James, K. H., &amp; Engelhardt, L. (2012). The effects of handwriting experience on functional brain development in pre-literate children. <i>Trends in Neuroscience and Education, 1</i>(1), 32–42.</li>
      <li>Millî Eğitim Bakanlığı. (2024). <i>İlkokul Türkçe dersi öğretim programı</i>.</li>
      <li>National Institute of Child Health and Human Development. (2000). <i>Report of the National Reading Panel</i>.</li>
      <li>Vatavu, R.-D., Anthony, L., &amp; Wobbrock, J. O. (2012). Gestures as point clouds: A $P recognizer for user interface prototypes. <i>Proceedings of ICMI ’12</i>, 273–280. (uygulamada kullanılan tanıyıcı)</li>
      <li>Sanders, T. vd. (2024). An umbrella review of the benefits and risks associated with youths' interactions with electronic screens. <i>Nature Human Behaviour, 8</i>, 82–99.</li>
    </ul>` },
  { cls: 'cover end', html: `
    <div class="cover-in">
      <div class="logo-big" aria-hidden="true"><span>ses</span><span>izi</span></div>
      <h1>Uygulamayı deneyin</h1>
      <p class="lead">Öğrenci kodunu seçin, ilk modülden başlayın. Öğretmen paneli için “Öğretmen” sekmesini kullanın.</p>
      <div class="row center"><a class="btn big primary" href="#/uygulama">🧒 Uygulamaya geç</a><a class="btn big" href="#/ogretmen">👩‍🏫 Öğretmen paneli</a></div>
    </div>` },
];

let keyHandler = null;
export function stopSunum() {
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
}

export function renderSunum(root, start = 1) {
  let i = Math.min(Math.max(1, start), SLIDES.length) - 1;
  root.innerHTML = `
  <section class="deck" aria-roledescription="sunum">
    <div class="deck-stage" data-stage>
      ${SLIDES.map((s, k) => `<article class="slide ${s.cls || ''}" data-k="${k}" aria-hidden="true">
        ${s.title ? `<header class="slide-h"><span class="slide-no">${k + 1}</span><h2>${s.title}</h2></header>` : ''}
        <div class="slide-b">${s.html}</div></article>`).join('')}
    </div>
    <div class="deck-bar">
      <button class="btn ghost" data-prev aria-label="Önceki slayt">←</button>
      <div class="deck-progress"><div data-prog></div></div>
      <span class="deck-count" data-count></span>
      <button class="btn ghost" data-next aria-label="Sonraki slayt">→</button>
      <button class="btn ghost" data-list aria-label="Slayt listesi">☰</button>
      <button class="btn ghost" data-fs aria-label="Tam ekran">⛶</button>
    </div>
    <nav class="deck-index" data-index hidden>${SLIDES.map((s, k) => `<button data-go="${k}">${k + 1}. ${s.title || (k === 0 ? 'Kapak' : 'Kapanış')}</button>`).join('')}</nav>
  </section>`;
  const slides = $$('.slide', root);
  const show = (n) => {
    i = Math.min(Math.max(0, n), SLIDES.length - 1);
    slides.forEach((el, k) => {
      el.classList.toggle('on', k === i);
      el.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    slides[i].scrollTop = 0;
    $('[data-count]', root).textContent = `${i + 1} / ${SLIDES.length}`;
    $('[data-prog]', root).style.width = ((i + 1) / SLIDES.length) * 100 + '%';
    history.replaceState(null, '', `#/sunum/${i + 1}`);
  };
  $('[data-prev]', root).onclick = () => show(i - 1);
  $('[data-next]', root).onclick = () => show(i + 1);
  $('[data-list]', root).onclick = () => { const ix = $('[data-index]', root); ix.hidden = !ix.hidden; };
  $$('[data-go]', root).forEach((b) => b.onclick = () => { show(+b.dataset.go); $('[data-index]', root).hidden = true; });
  $('[data-fs]', root).onclick = () => {
    const el = $('.deck', root);
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  stopSunum();
  keyHandler = (e) => {
    if (e.target.closest('input,textarea,select')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1); }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(SLIDES.length - 1);
  };
  document.addEventListener('keydown', keyHandler);
  // kaydırma hareketi
  let sx = null, sy = null;
  const stage = $('[data-stage]', root);
  stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(i + (dx < 0 ? 1 : -1));
    sx = null;
  });
  show(i);
}
