// Veri ve yöntem sayfası (kaynak, lisans, işlem adımları)
import { loadDEM } from './dem.js';
import { esc } from './ui.js';

export async function renderVeri(root) {
  const D = await loadDEM(); const m = D.meta;
  root.innerHTML = `<section class="doc">
    <h2>Veri ve yöntem</h2>
    <div class="box"><h4>Sayısal yükseklik modeli</h4>
      <p>${esc(m.source)}. Kaynak: <a href="${esc(m.source_url)}">${esc(m.source_url)}</a> · İndirme tarihi: ${esc(m.downloaded)}.</p>
      <p>Koordinat sistemi: <b>${esc(m.crs)}</b>; ızgara ${m.width} × ${m.height} hücre, ${m.res} m; ${esc(m.resampling)} yeniden örnekleme. Çalışma alanı: ${m.bbox_lonlat[1]}–${m.bbox_lonlat[3]}° K, ${m.bbox_lonlat[0]}–${m.bbox_lonlat[2]}° D. Yükseklik aralığı ${Math.round(D.min)}–${Math.round(D.max)} m.</p>
      <p class="muted small">${esc(m.license)} Copernicus DEM bir sayısal yüzey modelidir; yapı ve bitki örtüsü etkilerini içerebilir. Güncel yüzey 1856 arazisini tam temsil etmez.</p></div>
    <div class="box"><h4>Akarsu katmanı</h4><p>${esc(m.rivers)}. Bu katman bir kolaylıktır; kaynak, tarih ve konum güvenilirliği belirtilen ayrı bir akarsu ve geçiş katmanı varsa onunla karşılaştırılmalıdır. Bugünkü köprüler tarihî kanıt değildir.</p></div>
    <div class="box"><h4>İşlem sırası</h4><ol>
      <li>Kanıt grupları kaynak matrisine girilir (kod, özgün ad, olası güncel karşılık, belge tarihi, kaynak ailesi, sayfa/harita konumu, konum belirsizliği).</li>
      <li>Geliştirme–test ayrımı parametre seçiminden önce sabitlenir; tarih ve SHA-256 özeti kaydedilir.</li>
      <li>M1 arazi parametreleri (ölçek × akarsu cezası) yalnızca geliştirme kanıtlarına medyan uzaklıkla seçilir; M2'de yalnızca λ, kaynak aileleri sırayla dışarıda bırakılarak ayarlanır.</li>
      <li>Parametreler sabitlenir; M0, M1, M2 aynı alan, çözünürlük ve uç bölgelerle hesaplanır.</li>
      <li>Duyarlılık: ölçek, akarsu cezası, λ ve çözünürlük senaryoları; uzlaşma haritası ve %5 / %10 koridorlar.</li>
      <li>Bağımsız değerlendirme: medyan, %90, 100 / 250 / 500 m kapsama; Tablo 4, 5, 6.</li>
      <li>Sonuçlar 3B/VR sahneye aktarılır; teknik testler kaydedilir.</li></ol></div>
    <div class="box"><h4>Yazılım</h4><p>Tarayıcıda çalışan saf JavaScript (ES modülleri); en düşük maliyetli yol Web Worker içinde indeksli ikili yığınla Dijkstra; UTM dönüşümü Krüger serileri (pyproj ile karşılaştırmada &lt; 0,1 mm fark); 3B sahne three.js r170 (MIT) ve WebXR. DEM hazırlama: Python, rasterio (bilinear yeniden örnekleme), Priority-Flood + D8.</p>
      <p class="muted small">Bütün veriler tarayıcıda (localStorage) tutulur; sunucuya gönderilmez.</p></div>
  </section>`;
}
