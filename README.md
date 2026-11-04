# Proje Uygulamaları

Her proje için önce **sunum**, ardından çalışan **web uygulaması**. Kurulum ve sunucu gerekmez; GitHub Pages'te statik olarak çalışır.

| Proje | Alan | Durum |
|---|---|---|
| [SESİZİ](sesizi/) | Türk Dili ve Edebiyatı · E-Öğrenme | Hazır |
| SESİGÖR | Yazılım | Hazırlanıyor |
| YOLİZİ | Coğrafya | Hazırlanıyor |
| İZGE | Fizik | Hazırlanıyor |

## SESİZİ

İlk okuma yazma sürecinde sesten harfe ve kelimeye aşamalı dijital etkinlikler.

- **Sunum** (`sesizi/#/sunum`): proje özeti, problem, amaç, hedefler, bilimsel temel, öğrenme akışı (Şekil 1), modüller (Tablo 1), uygulama ekranları (Şekil 2–4), yöntem, analiz, etik, iş-zaman çizelgesi, sınırlılıklar ve kaynaklar. Klavye okları, kaydırma hareketi ve tam ekran desteklenir.
- **Uygulama** (`sesizi/#/uygulama`): Ö01–Ö20 kodlarıyla öğrenci girişi ve yedi modül:
  1. Sesi fark et ve harfi tanı
  2. Harfi ayırt et
  3. İzi takip et (tam rehber → azaltılmış rehber → rehbersiz)
  4. Bağımsız yaz
  5. Birleştir (hece → kelime)
  6. Oku ve eşleştir
  7. Cümle kur ve anla
- **Öğretmen paneli** (`sesizi/#/ogretmen`): öğrenilmiş ses grupları, oturum süresi, geçiş ölçütü, PIN; öğrenci ilerlemesi ve zorlanılan sesler; içerik kontrolü ve mikrofonla ses kaydı (Ek 2); ön test–son test girişi, Tablo 3 (Wilcoxon işaretli sıralar testi, kesin p, etki büyüklüğü r), Şekil 5, yazdırılabilir ölçme formları (Ek 1); JSON/CSV dışa aktarma.

### Teknik notlar

- Saf HTML, CSS ve JavaScript (ES modülleri); derleme adımı ve harici API yoktur.
- Veriler yalnızca tarayıcıda (`localStorage`, ses kayıtları `IndexedDB`) saklanır; sunucuya gönderilmez.
- Ses: öncelik öğretmen kaydı → `sesizi/audio/` altındaki hazır Türkçe ses dosyaları → tarayıcının metin okuma sesi. Hazır sesler Gemini TTS ile toplu üretildi, sessizliklerden bölündü ve otomatik yazıya döküm ile denetlendi. Patlamalı ünsüzler hece kayıtlarından ünlü başlamadan önce kesilerek türetildi; öğretmenin dinleyip gerekirse kendi sesiyle kaydetmesi önerilir. API anahtarı depoda yer almaz.
- Çizim puanlaması: yön uyumlu kapsama, en zayıf çizgi, isabet ve uç noktalar; rehbersiz düzeylerde ek olarak $P nokta bulutu tanıyıcısı (Vatavu vd., 2012) ve satır yerleşimi denetimi.
- Kelime ve cümleler, içerdikleri bütün harfler öğrenilmiş ses gruplarında olduğunda otomatik açılır.

### Yerel çalıştırma

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000/sesizi/` adresini açın.

### GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → yayımlanacak dalı ve `/ (root)` klasörünü seçin.
