// Eklenti indirme ve kurulum sayfası (Ek 3: destek matrisi ve kurulum)
export function renderEklenti(root) {
  root.innerHTML = `<section class="doc">
    <h2>SESİGÖR tarayıcı eklentisi</h2>
    <div class="card"><h4>İndir</h4>
      <p>Eklenti iki parça hâlinde sunulur (GitHub dosya sınırı nedeniyle). İkisini de <b>aynı klasöre</b> açın; klasörde <code>manifest.json</code>, <code>core/</code>, <code>vendor/</code> ve <code>models/</code> bulunmalıdır.</p>
      <div class="row"><a class="btn primary" href="indir/SESIGOR_eklenti_1_kod.zip" download>⬇ 1. parça: kod ve çalışma zamanı</a>
      <a class="btn primary" href="indir/SESIGOR_eklenti_2_modeller.zip" download>⬇ 2. parça: modeller</a></div>
      <p class="small muted">Modeller ve kodlar paketin içindedir; eklenti çalışırken uzaktan kod veya model indirmez.</p></div>
    <div class="card"><h4>Geliştirici modunda kurulum (Chrome / Edge)</h4><ol>
      <li>İki zip dosyasını aynı klasöre açın (ör. <code>SESIGOR</code>).</li>
      <li>Adres çubuğuna <code>chrome://extensions</code> (Edge: <code>edge://extensions</code>) yazın.</li>
      <li>Sağ üstten <b>Geliştirici modu</b>nu açın.</li>
      <li><b>Paketlenmemiş öğe yükle</b> düğmesine basın ve klasörü seçin.</li>
      <li>Türkçe bir video açın, araç çubuğundaki SESİGÖR simgesine tıklayın; yan panelde <b>Bu sekmede başlat</b>.</li></ol>
      <p class="small muted">Eklenti, siz başlatmadan ses yakalamaz. “Sekmenin sesini duymaya devam et” işaretliyken yakalanan ses hoparlöre yeniden bağlanır.</p></div>
    <div class="card"><h4>Teknik tasarım</h4><ul>
      <li>Manifest V3; sekme sesi <code>chrome.tabCapture</code> ile alınır, sürekli işleme ekran dışı belgede (offscreen) yürür.</li>
      <li>Konuşma: Whisper base (çok dilli, 8 bit nicemlenmiş ONNX; Transformers.js 3.7.5 + ONNX Runtime Web). WebGPU varsa GPU, yoksa WASM.</li>
      <li>Konuşma işleme: ses tamponu en çok 10 s; yaklaşık 1 s aralıkla yeniden tanıma; art arda iki hipotezde aynı kalan kelimeler kesinleşir, kalanı geçici gösterilir; sessizlikte satır kapanır.</li>
      <li>Ses olayları: YAMNet (AudioSet, 521 sınıf; MediaPipe Audio Classifier), 0,975 s pencere, 0,5 s ilerleme; sınıfa özgü eşik + ardışık doğrulama + birleştirme; aynı anda en çok 2 etiket.</li>
      <li>Ses ve altyazı ağ üzerinden gönderilmez; oturum kaydı yalnızca kullanıcı isterse indirilir.</li></ul></div>
    <div class="card"><h4>Destek matrisi (doldurulacak)</h4>
      <table class="tbl"><thead><tr><th>Sayfa türü</th><th>Tarayıcı sürümü</th><th>Durum</th><th>Bilinen sınır</th></tr></thead><tbody>
        <tr><td>Video sitesi (standart oynatıcı)</td><td>Chrome ≥ 116</td><td>Denenecek</td><td></td></tr>
        <tr><td>Gömülü oynatıcı (iframe)</td><td></td><td>Denenecek</td><td>Sekmenin bütün sesi yakalanır</td></tr>
        <tr><td>Tam ekran</td><td></td><td>Denenecek</td><td>Yan panel tam ekranda görünmeyebilir</td></tr>
        <tr><td>Aynı sekmede iki ses kaynağı</td><td></td><td>Denenecek</td><td>Kaynaklar ayrılmaz</td></tr>
        <tr><td>Canlı yayın / mobil tarayıcı</td><td>—</td><td>Kapsam dışı</td><td>İlk sürüm iddiası yok</td></tr></tbody></table>
      <p class="small muted">Tabloyu kendi denemelerinizle doldurun; çalıştığı doğrulanmamış bir durum “çalışıyor” olarak yazılmamalıdır.</p></div>
    <div class="card"><h4>Lisanslar</h4><p class="small">Whisper modeli (OpenAI, MIT) — ONNX dönüştürmesi Xenova/whisper-base; Transformers.js (Apache 2.0); ONNX Runtime Web (MIT); YAMNet ve MediaPipe Tasks (Apache 2.0).</p></div>
  </section>`;
}
