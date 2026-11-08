# Proje Uygulamaları

Her proje için önce **sunum**, ardından çalışan **web uygulaması**. Kurulum ve sunucu gerekmez; GitHub Pages'te statik olarak çalışır.

| Proje | Alan | Durum |
|---|---|---|
| [SESİZİ](sesizi/) | Türk Dili ve Edebiyatı · E-Öğrenme | Hazır |
| [SESİGÖR](sesigor/) | Yazılım · Erişilebilir Yaşam Teknolojileri | Hazır |
| [YOLİZİ](yolizi/) | Coğrafya · Somut Kültürel Miras | Hazır |
| [İZGE](izge/) | Fizik · STEAM | Hazır |

## SESİZİ

İlk okuma yazma sürecinde sesten harfe ve kelimeye aşamalı dijital etkinlikler.

- **Sunum** (`sesizi/#/sunum`): proje özeti, problem, amaç, hedefler, bilimsel temel, öğrenme akışı (Şekil 1), modüller (Tablo 1), uygulama ekranları (Şekil 2–4), yöntem, analiz, etik, iş-zaman çizelgesi, sınırlılıklar ve kaynaklar. Klavye okları, kaydırma hareketi ve tam ekran desteklenir.
- **Uygulama** (`sesizi/#/uygulama`): Ö01–Ö20 kodlarıyla öğrenci girişi.
  - **Harf yolculuğu:** 29 harf, Türkiye Yüzyılı Maarif Modeli 2024 Türkçe dersi öğretim programındaki sırayla: ANETİL · OKURIM · ÜSÖYDZ · ÇBGCŞ · PHVĞFJ (6/4/2/2/2 hafta). Her harf dersi: harfle tanış (ses, yazılış animasyonu, resimli kelimeler) → sesi bul → ses nerede (başta/ortada/sonda) → harfi tanı → ayırt et → iz takibi (tam/azaltılmış rehber) → büyük harf → rehbersiz ve bağımsız yazma → hece → kelime → cümle → grup sonunda kısa metin. Yıldızlar ilk denemedeki doğruluğa göre verilir.
  - **Belgeler:** her harf grubu bitince grup başarı belgesi, bütün harfler bitince İlk Okuma Yazma Başarı Belgesi (A4, yazdır/PDF). Öğrenci adı yalnızca yazdırırken girilir, saklanmaz.
  - **Serbest çalışma:** yedi modül (Tablo 1): sesi fark et ve harfi tanı, harfi ayırt et, izi takip et, bağımsız yaz, birleştir (hece → kelime), oku ve eşleştir, cümle kur ve anla (cümle → kısa metin).
- **Öğretmen paneli** (`sesizi/#/ogretmen`): öğretmen hesabı (ad, okul, sınıf, PIN ile giriş); sınıfın geldiği harf, 16 haftalık plan, öğrenciye özel harf düzeyi, kendi hızında ilerleme; harf × öğrenci yıldız tablosu, modül ilerlemesi, zorlanılan sesler; belgeler ve toplu yazdırma; içerik kontrolü ve mikrofonla ses kaydı (Ek 2); ön test–son test, Tablo 3 (Wilcoxon, kesin p, r), Şekil 5, ölçme formları (Ek 1); JSON/CSV dışa aktarma.

### Teknik notlar

- Saf HTML, CSS ve JavaScript (ES modülleri); derleme adımı ve harici API yoktur.
- Veriler yalnızca tarayıcıda (`localStorage`, ses kayıtları `IndexedDB`) saklanır; sunucuya gönderilmez.
- Ses: öncelik öğretmen kaydı → `sesizi/audio/` altındaki hazır Türkçe ses dosyaları → tarayıcının metin okuma sesi. Hazır sesler Gemini TTS ile toplu üretildi, sessizliklerden bölündü ve otomatik yazıya döküm ile denetlendi. Patlamalı ünsüzler hece kayıtlarından ünlü başlamadan önce kesilerek türetildi; öğretmenin dinleyip gerekirse kendi sesiyle kaydetmesi önerilir. API anahtarı depoda yer almaz.
- Çizim puanlaması: yön uyumlu kapsama, en zayıf çizgi, isabet ve uç noktalar; rehbersiz düzeylerde ek olarak $P nokta bulutu tanıyıcısı (Vatavu vd., 2012) ve satır yerleşimi denetimi.
- Kelime, cümle ve metinler, içerdikleri bütün harfler öğretildiğinde otomatik açılır.
- Veriler cihazda tutulur; çok cihazlı kullanım için yedekle/içe aktar vardır. Bulut veri tabanı (eş zamanlı öğretmen hesabı) sonraki sürümde eklenecektir.

### Yerel çalıştırma

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000/sesizi/` adresini açın.

### GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → yayımlanacak dalı ve `/ (root)` klasörünü seçin.

## SESİGÖR

Türkçe videolarda konuşma altyazısına ses olayı etiketleri ekleyen tarayıcı eklentisi (`sesigor/eklenti`, Manifest V3) ve aynı çekirdeği kullanan web uygulaması. Konuşma: Whisper base (Transformers.js, 8 bit ONNX); ses olayları: YAMNet (MediaPipe). Eşik, ardışık doğrulama, birleştirme, en çok 2 etiket. Değerlendirme: WER (Tablo 1), olay F1 (Tablo 2, Ek 1), gecikme (Tablo 3), eşik seçimi; kullanıcı pilotu: dengeli atama, Tablo 4, Şekil 3. Ses ve altyazı sunucuya gönderilmez.

## YOLİZİ

Copernicus GLO-30 DEM (UTM 37K, 30 m) üzerinde M0/M1/M2 en düşük maliyetli yol modelleri (8 komşulu Dijkstra), SHA-256 özetli geliştirme–test ayrım kilidi, parametre seçimi, duyarlılık/uzlaşma haritası, %5–%10 koridorlar, Tablo 4–6, Ek 1–2 dışa aktarma; three.js + WebXR 3B/VR sahne ve teknik testler.

## İZGE

Web kamerasıyla spektrum ölçümü: karanlık kare, Hg/Ne kalibrasyonu (≤ 2. derece), 650,6528 nm bağımsız doğrulama, 546,0735 nm FWHM ve geçerlilik denetimleri; deney yöneticisi (tohumlu rastgele sıra, protokol kilidi), Tablo 6–10, iki faktörlü ANOVA, Welch t, Şekil 4–6; optik araçlar ve Şekil 2 şeması. Simülasyon kaynağı yalnızca yazılım denemesi içindir ve analizlere girmez.
