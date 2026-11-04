// SESİZİ içerik verisi: ses grupları, kelimeler, cümleler.
// Ses grupları MEB ses temelli ilk okuma yazma sırasını izler.

export const GROUPS = [
  { id: 1, letters: ['e', 'l', 'a', 'k', 'i', 'n'] },
  { id: 2, letters: ['o', 'm', 'u', 't', 'ü', 'y'] },
  { id: 3, letters: ['ö', 'r', 'ı', 'd', 's', 'b'] },
  { id: 4, letters: ['z', 'ç', 'g', 'ş', 'c', 'p'] },
  { id: 5, letters: ['h', 'v', 'ğ', 'f', 'j'] },
];

export const ALL_LETTERS = GROUPS.flatMap((g) => g.letters);
export const VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü']);

export const upper = (s) => String(s).toLocaleUpperCase('tr-TR');
export const lower = (s) => String(s).toLocaleLowerCase('tr-TR');

/** Bir metindeki (tekrarsız) Türkçe harfler. */
export const lettersOf = (s) => [...new Set([...lower(s)].filter((c) => ALL_LETTERS.includes(c)))];

/** Bir harfin ait olduğu ses grubu numarası. */
export const groupOf = (ch) => (GROUPS.find((g) => g.letters.includes(ch)) || {}).id || 0;

/** Bir metnin kullanılabilmesi için öğrenilmiş olması gereken en yüksek ses grubu. */
export const groupOfText = (s) => Math.max(0, ...lettersOf(s).map(groupOf));

/** Görsel olarak karıştırılabilen harfler (Harfi ayırt et ve çeldiriciler için). */
export const CONFUSABLE = {
  a: ['o', 'e', 'd'], e: ['a', 'c', 'o'], l: ['ı', 'i', 't'], k: ['h', 'l'], i: ['ı', 'l', 'j'],
  n: ['m', 'u', 'h'], o: ['ö', 'a', 'c'], m: ['n', 'u'], u: ['ü', 'n', 'v'], t: ['f', 'l'],
  ü: ['u', 'ö'], y: ['v', 'g'], ö: ['o', 'ü'], r: ['n', 'v'], ı: ['i', 'l'], d: ['b', 'a', 'p'],
  s: ['ş', 'z'], b: ['d', 'p', 'h'], z: ['s', 'ş'], ç: ['c', 'ş'], g: ['ğ', 'y', 'p'],
  ş: ['s', 'ç'], c: ['ç', 'e', 'o'], p: ['b', 'd', 'g'], h: ['n', 'k', 'b'], v: ['y', 'u'],
  ğ: ['g', 'y'], f: ['t', 'l'], j: ['i', 'g'],
};

/** Aynalandığında kendine benzemeyen harfler (ayna görüntüsü çeldirici olarak kullanılabilir). */
export const MIRRORABLE = new Set(['b', 'd', 'p', 'k', 'r', 's', 'z', 'c', 'e', 'a', 'f', 'j', 't', 'y', 'n', 'h', 'g', 'ç', 'ş']);

export const SYMBOLS = ['★', '◆', '●', '▲', '7', '3', '♥', '?', '■', '5'];

// Kelimeler: içerdiği harflerin ses grubuna göre otomatik olarak açılır.
// "Kelime örnekleri yalnızca öğrencinin öğrendiği seslerden oluşturulur."
export const WORDS = [
  // 1. grup (e l a k i n)
  { w: 'anne', e: '👩' }, { w: 'nine', e: '👵' }, { w: 'kek', e: '🍰' }, { w: 'lale', e: '🌷' },
  { w: 'kale', e: '🏰' }, { w: 'inek', e: '🐄' }, { w: 'el', e: '✋' }, { w: 'nane', e: '🌿' },
  { w: 'kalkan', e: '🛡️' }, { w: 'ekin', e: '🌾' },
  // 2. grup (+ o m u t ü y)
  { w: 'elma', e: '🍎' }, { w: 'kalem', e: '✏️' }, { w: 'ay', e: '🌙' }, { w: 'at', e: '🐴' },
  { w: 'mum', e: '🕯️' }, { w: 'kutu', e: '📦' }, { w: 'limon', e: '🍋' }, { w: 'tilki', e: '🦊' },
  { w: 'koyun', e: '🐑' }, { w: 'kemik', e: '🦴' }, { w: 'tekne', e: '🚤' }, { w: 'yumak', e: '🧶' },
  { w: 'ok', e: '🏹' }, { w: 'yemek', e: '🍲' }, { w: 'keman', e: '🎻' }, { w: 'kamyon', e: '🚚' },
  { w: 'yatak', e: '🛏️' }, { w: 'maymun', e: '🐒' }, { w: 'ekmek', e: '🍞' },
  // 3. grup (+ ö r ı d s b)
  { w: 'kedi', e: '🐱' }, { w: 'ördek', e: '🦆' }, { w: 'arı', e: '🐝' }, { w: 'ayı', e: '🐻' },
  { w: 'balık', e: '🐟' }, { w: 'saat', e: '⌚' }, { w: 'dede', e: '👴' }, { w: 'bebek', e: '👶' },
  { w: 'armut', e: '🍐' }, { w: 'sabun', e: '🧼' }, { w: 'simit', e: '🥯' }, { w: 'araba', e: '🚗' },
  { w: 'domates', e: '🍅' }, { w: 'bulut', e: '☁️' }, { w: 'ayakkabı', e: '👟' }, { w: 'elbise', e: '👗' },
  { w: 'kurabiye', e: '🍪' }, { w: 'aslan', e: '🦁' }, { w: 'radyo', e: '📻' }, { w: 'robot', e: '🤖' },
  { w: 'bisiklet', e: '🚲' }, { w: 'otobüs', e: '🚌' }, { w: 'su', e: '💧' }, { w: 'süt', e: '🥛' },
  { w: 'bal', e: '🍯' },
  // 4. grup (+ z ç g ş c p)
  { w: 'güneş', e: '☀️' }, { w: 'çiçek', e: '🌸' }, { w: 'kitap', e: '📖' }, { w: 'köpek', e: '🐶' },
  { w: 'top', e: '⚽' }, { w: 'kaşık', e: '🥄' }, { w: 'göz', e: '👁️' }, { w: 'muz', e: '🍌' },
  { w: 'yıldız', e: '⭐' }, { w: 'ceket', e: '🧥' }, { w: 'gemi', e: '🚢' }, { w: 'pasta', e: '🎂' },
  { w: 'kapı', e: '🚪' }, { w: 'çilek', e: '🍓' }, { w: 'peynir', e: '🧀' }, { w: 'şemsiye', e: '☂️' },
  { w: 'çorap', e: '🧦' }, { w: 'patates', e: '🥔' }, { w: 'pizza', e: '🍕' }, { w: 'zil', e: '🔔' },
  { w: 'çanta', e: '👜' }, { w: 'gözlük', e: '👓' }, { w: 'penguen', e: '🐧' }, { w: 'uçak', e: '✈️' },
  { w: 'kuş', e: '🐦' },
  // 5. grup (+ h v ğ f j)
  { w: 'ağaç', e: '🌳' }, { w: 'havuç', e: '🥕' }, { w: 'horoz', e: '🐓' }, { w: 'fil', e: '🐘' },
  { w: 'tavuk', e: '🐔' }, { w: 'ev', e: '🏠' }, { w: 'fare', e: '🐭' }, { w: 'hediye', e: '🎁' },
  { w: 'kavun', e: '🍈' }, { w: 'kurbağa', e: '🐸' }, { w: 'kaplumbağa', e: '🐢' }, { w: 'tavşan', e: '🐰' },
  { w: 'kahve', e: '☕' }, { w: 'telefon', e: '📱' }, { w: 'ejderha', e: '🐉' }, { w: 'vazo', e: '🏺' },
].map((x) => ({ ...x, id: 'w:' + x.w, g: groupOfText(x.w) }));

// Cümleler: t = kelimeler (doğru sıra), q = soru, a = doğru görsel, d = çeldirici görseller.
export const SENTENCES = [
  { t: ['Ali', 'kalk'], q: 'Kim kalkacak?', a: '👦', d: ['👩', '👵'] },
  { t: ['Anne', 'kek', 'al'], q: 'Ne alınacak?', a: '🍰', d: ['🌷', '🐄'] },
  { t: ['Nine', 'lale', 'al'], q: 'Ne alınacak?', a: '🌷', d: ['🍰', '🏰'] },
  { t: ['Anne', 'nane', 'al'], q: 'Ne alınacak?', a: '🌿', d: ['🍰', '🌷'] },
  { t: ['Ali', 'elma', 'al'], q: 'Ne alınacak?', a: '🍎', d: ['🍋', '🍰'] },
  { t: ['Emine', 'mum', 'yak'], q: 'Ne yakılacak?', a: '🕯️', d: ['🌙', '🍎'] },
  { t: ['Ümit', 'kalem', 'al'], q: 'Ne alınacak?', a: '✏️', d: ['📦', '🍎'] },
  { t: ['Kedi', 'süt', 'istedi'], q: 'Kedi ne istedi?', a: '🥛', d: ['🐟', '🍰'] },
  { t: ['Dede', 'arabayı', 'sildi'], q: 'Dede neyi sildi?', a: '🚗', d: ['🚲', '🚌'] },
  { t: ['Bebek', 'uyudu'], q: 'Kim uyudu?', a: '👶', d: ['👴', '🐱'] },
  { t: ['Ayı', 'bal', 'yedi'], q: 'Ayı ne yedi?', a: '🍯', d: ['🍎', '🐟'] },
  { t: ['Köpek', 'top', 'ile', 'oynadı'], q: 'Köpek ne ile oynadı?', a: '⚽', d: ['📖', '🦴'] },
  { t: ['Güneş', 'çıktı'], q: 'Gökyüzüne ne çıktı?', a: '☀️', d: ['🌙', '⭐'] },
  { t: ['Can', 'kitap', 'okudu'], q: 'Can ne okudu?', a: '📖', d: ['🍕', '⚽'] },
  { t: ['Zeynep', 'çilek', 'yedi'], q: 'Zeynep ne yedi?', a: '🍓', d: ['🍌', '🍕'] },
  { t: ['Tavşan', 'havuç', 'yedi'], q: 'Tavşan ne yedi?', a: '🥕', d: ['🍓', '🍎'] },
  { t: ['Horoz', 'sabah', 'öttü'], q: 'Kim öttü?', a: '🐓', d: ['🐔', '🐶'] },
  { t: ['Fil', 'suya', 'girdi'], q: 'Fil nereye girdi?', a: '💧', d: ['🌳', '🏠'] },
  { t: ['Babam', 'eve', 'geldi'], q: 'Babam nereye geldi?', a: '🏠', d: ['🌳', '🚗'] },
].map((x) => ({ ...x, id: 's:' + x.t.join(' '), g: groupOfText(x.t.join(' ')) }));

export const sentenceText = (s) => s.t.join(' ') + '.';

// Modüller (Tablo 1)
export const MODULES = [
  { id: 'm1', no: 1, title: 'Sesi fark et ve harfi tanı', icon: '👂', color: '#2563eb',
    task: 'Sesi dinler, ilgili harfi görür ve seçer', skill: 'Ses–harf ilişkisi', stages: ['Ses–harf'] },
  { id: 'm2', no: 2, title: 'Harfi ayırt et', icon: '🔍', color: '#7c3aed',
    task: 'Hedef harfi farklı semboller arasından bulur', skill: 'Görsel ayırt etme', stages: ['Ayırt etme'] },
  { id: 'm3', no: 3, title: 'İzi takip et', icon: '✍️', color: '#db2777',
    task: 'Tam rehberli, azaltılmış rehberli ve rehbersiz çizim yapar', skill: 'Destek düzeyine göre harf oluşturma',
    stages: ['Tam rehber', 'Azaltılmış rehber', 'Rehbersiz'] },
  { id: 'm4', no: 4, title: 'Bağımsız yaz', icon: '📝', color: '#ea580c',
    task: 'Gösterilen veya söylenen harfi boş alanda yazar', skill: 'İpucusuz harf üretme', stages: ['Bağımsız yazma'] },
  { id: 'm5', no: 5, title: 'Birleştir', icon: '🧩', color: '#16a34a',
    task: 'Öğrenilmiş seslerle hece ve kelime oluşturur', skill: 'Birleştirme ve çözümleme', stages: ['Hece', 'Kelime'] },
  { id: 'm6', no: 6, title: 'Oku ve eşleştir', icon: '🖼️', color: '#0891b2',
    task: 'Yazılı kelimeyi okur, anlamına uygun görseli seçer', skill: 'Kelime okuma ve anlamla ilişkilendirme', stages: ['Okuma'] },
  { id: 'm7', no: 7, title: 'Cümle kur ve anla', icon: '💬', color: '#ca8a04',
    task: 'Uygun kelimelerle kısa cümle kurar, soruya yanıt verir', skill: 'Başlangıç düzeyinde anlam kurma', stages: ['Cümle'] },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));

// Sesli geri bildirim cümleleri (hazır ses dosyası üretilir; değişken içermez).
export const PHRASES = [
  'Evet, doğru harfi buldun.', 'Sesi bir kez daha dinleyelim.', 'Bütün harfleri buldun.',
  'Hepsini buldun. Bir dahaki sefere biçimlere daha dikkatli bakalım.', 'Bu harf ters dönmüş. Yönüne bakalım.',
  'Bu, aradığımız harf değil. Biçimine yeniden bakalım.', 'Önce harfi yazalım.', 'Harfi kendin yazdın.',
  'İzi baştan sona takip ettin.', 'Başlangıç noktasına dönüp bir kez daha deneyelim.',
  'Çizgilerin dışına taştı. Yavaşça bir kez daha deneyelim.', 'Sesleri doğru birleştirdin.',
  'Sesleri sırayla söyleyip yeniden deneyelim.', 'Kelimeyi okuyup doğru resmi seçtin.',
  'Kelimeyi harf harf okuyup yeniden bakalım.', 'Cümleyi doğru kurdun. Şimdi soruyu yanıtlayalım.',
  'Cümleyi okuyup kelimelerin sırasına yeniden bakalım.', 'Cümleyi kurdun ve doğru anladın.',
  'Doğru yanıtı buldun.', 'Cümleyi bir kez daha okuyalım.', 'Bugünlük bu kadar! Güzel çalıştın.',
];
