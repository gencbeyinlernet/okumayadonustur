// SESİZİ içerik verisi: ses grupları, kelimeler, cümleler.
// Ses grupları MEB ses temelli ilk okuma yazma sırasını izler.

// Türkiye Yüzyılı Maarif Modeli (2024) Türkçe Dersi Öğretim Programı, 1. sınıf ilk okuma yazma
// harf grupları ve önerilen süreler (6, 4, 2, 2, 2 hafta). Harfler grup içinde bu sırayla verilir.
export const GROUPS = [
  { id: 1, name: 'ANETİL', weeks: 6, color: '#2563eb', letters: ['a', 'n', 'e', 't', 'i', 'l'] },
  { id: 2, name: 'OKURIM', weeks: 4, color: '#16a34a', letters: ['o', 'k', 'u', 'r', 'ı', 'm'] },
  { id: 3, name: 'ÜSÖYDZ', weeks: 2, color: '#ea580c', letters: ['ü', 's', 'ö', 'y', 'd', 'z'] },
  { id: 4, name: 'ÇBGCŞ', weeks: 2, color: '#db2777', letters: ['ç', 'b', 'g', 'c', 'ş'] },
  { id: 5, name: 'PHVĞFJ', weeks: 2, color: '#7c3aed', letters: ['p', 'h', 'v', 'ğ', 'f', 'j'] },
];
export const CURRICULUM = 'Türkiye Yüzyılı Maarif Modeli 2024 Türkçe Dersi Öğretim Programı (1. sınıf)';

export const ALL_LETTERS = GROUPS.flatMap((g) => g.letters);
/** Harfin öğretim sırasındaki yeri (0–28). */
export const letterIndex = (ch) => ALL_LETTERS.indexOf(ch);
export const groupById = (id) => GROUPS.find((g) => g.id === id);
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

// Kelimeler: içerdiği harflerin hepsi öğrenildiğinde otomatik olarak açılır.
// "Kelime örnekleri yalnızca öğrencinin öğrendiği seslerden oluşturulur."
// Sesi fark etme (dinleme) etkinliklerinde ise bütün resimli kelimeler kullanılabilir.
export const WORDS = [
  // 1. grup: a n e t i l
  { w: 'at', e: '🐴' }, { w: 'el', e: '✋' }, { w: 'et', e: '🥩' }, { w: 'anne', e: '👩' },
  { w: 'nine', e: '👵' }, { w: 'lale', e: '🌷' }, { w: 'nane', e: '🌿' }, { w: 'tatil', e: '🏖️' },
  { w: 'anten', e: '📡' },
  { w: 'olta', e: '🎣' }, { w: 'otel', e: '🏨' }, { w: 'on', e: '🔟' }, { w: 'ırmak', e: '🏞️' },
  { w: 'tüy', e: '🪶' }, { w: 'köprü', e: '🌉' }, { w: 'öküz', e: '🐂' }, { w: 'örümcek', e: '🕷️' },
  { w: 'civciv', e: '🐥' }, { w: 'cadı', e: '🧙' }, { w: 'gergedan', e: '🦏' }, { w: 'goril', e: '🦍' },
  { w: 'hamburger', e: '🍔' }, { w: 'helikopter', e: '🚁' }, { w: 'hindi', e: '🦃' }, { w: 'jimnastik', e: '🤸' },
  // 2. grup: + o k u r ı m
  { w: 'kek', e: '🍰' }, { w: 'kale', e: '🏰' }, { w: 'inek', e: '🐄' }, { w: 'ekin', e: '🌾' },
  { w: 'kalkan', e: '🛡️' }, { w: 'elma', e: '🍎' }, { w: 'kalem', e: '✏️' }, { w: 'mum', e: '🕯️' },
  { w: 'kutu', e: '📦' }, { w: 'limon', e: '🍋' }, { w: 'tilki', e: '🦊' }, { w: 'kemik', e: '🦴' },
  { w: 'tekne', e: '🚤' }, { w: 'keman', e: '🎻' }, { w: 'ekmek', e: '🍞' }, { w: 'ok', e: '🏹' },
  { w: 'okul', e: '🏫' }, { w: 'arı', e: '🐝' }, { w: 'armut', e: '🍐' }, { w: 'tren', e: '🚂' },
  { w: 'kurt', e: '🐺' }, { w: 'marul', e: '🥬' }, { w: 'orman', e: '🌲' }, { w: 'tırtıl', e: '🐛' },
  { w: 'roket', e: '🚀' }, { w: 'kamera', e: '📷' }, { w: 'mantar', e: '🍄' }, { w: 'kartal', e: '🦅' },
  // 3. grup: + ü s ö y d z
  { w: 'süt', e: '🥛' }, { w: 'su', e: '💧' }, { w: 'kedi', e: '🐱' }, { w: 'ördek', e: '🦆' },
  { w: 'ayı', e: '🐻' }, { w: 'saat', e: '⌚' }, { w: 'dede', e: '👴' }, { w: 'simit', e: '🥯' },
  { w: 'domates', e: '🍅' }, { w: 'aslan', e: '🦁' }, { w: 'radyo', e: '📻' }, { w: 'yumak', e: '🧶' },
  { w: 'koyun', e: '🐑' }, { w: 'yemek', e: '🍲' }, { w: 'kamyon', e: '🚚' }, { w: 'yatak', e: '🛏️' },
  { w: 'maymun', e: '🐒' }, { w: 'kiraz', e: '🍒' }, { w: 'deniz', e: '🌊' }, { w: 'yıldız', e: '⭐' },
  { w: 'muz', e: '🍌' }, { w: 'zil', e: '🔔' }, { w: 'dondurma', e: '🍦' }, { w: 'salata', e: '🥗' },
  { w: 'mısır', e: '🌽' }, { w: 'dinozor', e: '🦕' }, { w: 'üzüm', e: '🍇' }, { w: 'yüzük', e: '💍' },
  { w: 'robot', e: '🤖' },
  // 4. grup: + ç b g c ş
  { w: 'çiçek', e: '🌸' }, { w: 'güneş', e: '☀️' }, { w: 'kaşık', e: '🥄' }, { w: 'göz', e: '👁️' },
  { w: 'gözlük', e: '👓' }, { w: 'ceket', e: '🧥' }, { w: 'gemi', e: '🚢' }, { w: 'çilek', e: '🍓' },
  { w: 'şemsiye', e: '☂️' }, { w: 'çanta', e: '👜' }, { w: 'uçak', e: '✈️' }, { w: 'kuş', e: '🐦' },
  { w: 'balık', e: '🐟' }, { w: 'bebek', e: '👶' }, { w: 'bal', e: '🍯' }, { w: 'bulut', e: '☁️' },
  { w: 'sabun', e: '🧼' }, { w: 'araba', e: '🚗' }, { w: 'ayakkabı', e: '👟' }, { w: 'elbise', e: '👗' },
  { w: 'kurabiye', e: '🍪' }, { w: 'bisiklet', e: '🚲' }, { w: 'otobüs', e: '🚌' }, { w: 'muz', e: '🍌' },
  { w: 'böcek', e: '🐞' }, { w: 'şeker', e: '🍬' }, { w: 'çay', e: '🍵' }, { w: 'biber', e: '🌶️' },
  { w: 'gül', e: '🌹' }, { w: 'çekiç', e: '🔨' }, { w: 'cüzdan', e: '👛' }, { w: 'balon', e: '🎈' },
  { w: 'baykuş', e: '🦉' }, { w: 'gitar', e: '🎸' },
  // 5. grup: + p h v ğ f j
  { w: 'top', e: '⚽' }, { w: 'kitap', e: '📖' }, { w: 'köpek', e: '🐶' }, { w: 'pasta', e: '🎂' },
  { w: 'kapı', e: '🚪' }, { w: 'patates', e: '🥔' }, { w: 'pizza', e: '🍕' }, { w: 'peynir', e: '🧀' },
  { w: 'penguen', e: '🐧' }, { w: 'çorap', e: '🧦' }, { w: 'ağaç', e: '🌳' }, { w: 'havuç', e: '🥕' },
  { w: 'horoz', e: '🐓' }, { w: 'fil', e: '🐘' }, { w: 'tavuk', e: '🐔' }, { w: 'ev', e: '🏠' },
  { w: 'fare', e: '🐭' }, { w: 'hediye', e: '🎁' }, { w: 'kavun', e: '🍈' }, { w: 'kurbağa', e: '🐸' },
  { w: 'kaplumbağa', e: '🐢' }, { w: 'tavşan', e: '🐰' }, { w: 'kahve', e: '☕' }, { w: 'telefon', e: '📱' },
  { w: 'ejderha', e: '🐉' }, { w: 'vazo', e: '🏺' }, { w: 'zürafa', e: '🦒' }, { w: 'dağ', e: '⛰️' },
  { w: 'yaprak', e: '🍃' }, { w: 'hayvan', e: '🐾' },
].filter((x, i, a) => a.findIndex((y) => y.w === x.w) === i)
  .map((x) => ({ ...x, id: 'w:' + x.w, g: groupOfText(x.w) }));

// Cümleler: t = kelimeler (doğru sıra), q = soru, a = doğru görsel, d = çeldirici görseller.
// Her cümle yalnızca öğrenilmiş harflerle yazılmıştır; soru öğrenciye sesli okunur.
export const SENTENCES = [
  // 1. grup
  { t: ['Anne', 'nane', 'al'], q: 'Anne ne alacak?', a: '🌿', d: ['🌷', '🐴'] },
  { t: ['Nine', 'lale', 'al'], q: 'Nine ne alacak?', a: '🌷', d: ['🌿', '🥩'] },
  { t: ['Ali', 'at', 'al'], q: 'Ali ne alacak?', a: '🐴', d: ['🌷', '📡'] },
  { t: ['Ela', 'et', 'al'], q: 'Ela ne alacak?', a: '🥩', d: ['🐴', '🌿'] },
  { t: ['Talat', 'anten', 'al'], q: 'Talat ne alacak?', a: '📡', d: ['🌷', '🥩'] },
  // 2. grup
  { t: ['Ali', 'kalk'], q: 'Kim kalkacak?', a: '👦', d: ['👩', '👵'] },
  { t: ['Anne', 'kek', 'al'], q: 'Ne alınacak?', a: '🍰', d: ['🌷', '🐄'] },
  { t: ['Ali', 'elma', 'al'], q: 'Ne alınacak?', a: '🍎', d: ['🍋', '🍰'] },
  { t: ['Kerem', 'roket', 'al'], q: 'Kerem ne alacak?', a: '🚀', d: ['🚂', '🍎'] },
  { t: ['Kerem', 'ekmek', 'al'], q: 'Kerem ne alacak?', a: '🍞', d: ['🍰', '🍋'] },
  { t: ['Tırtıl', 'marul', 'kemirir'], q: 'Tırtıl neyi kemirir?', a: '🥬', d: ['🍎', '🍋'] },
  // 3. grup
  { t: ['Emine', 'mum', 'yak'], q: 'Ne yakılacak?', a: '🕯️', d: ['🌙', '🍎'] },
  { t: ['Ümit', 'kalem', 'al'], q: 'Ne alınacak?', a: '✏️', d: ['📦', '🍎'] },
  { t: ['Kedi', 'süt', 'istedi'], q: 'Kedi ne istedi?', a: '🥛', d: ['🐟', '🍰'] },
  { t: ['Deniz', 'kiraz', 'yedi'], q: 'Deniz ne yedi?', a: '🍒', d: ['🍇', '🍌'] },
  { t: ['Maymun', 'muz', 'yedi'], q: 'Maymun ne yedi?', a: '🍌', d: ['🍒', '🥯'] },
  { t: ['Dede', 'simit', 'aldı'], q: 'Dede ne aldı?', a: '🥯', d: ['🍦', '🍅'] },
  { t: ['Ayı', 'ormanda', 'uyudu'], q: 'Ayı nerede uyudu?', a: '🌲', d: ['🏠', '🌊'] },
  // 4. grup
  { t: ['Dede', 'arabayı', 'sildi'], q: 'Dede neyi sildi?', a: '🚗', d: ['🚲', '🚌'] },
  { t: ['Bebek', 'uyudu'], q: 'Kim uyudu?', a: '👶', d: ['👴', '🐱'] },
  { t: ['Ayı', 'bal', 'yedi'], q: 'Ayı ne yedi?', a: '🍯', d: ['🍎', '🐟'] },
  { t: ['Güneş', 'çıktı'], q: 'Gökyüzüne ne çıktı?', a: '☀️', d: ['🌙', '⭐'] },
  { t: ['Can', 'çiçek', 'aldı'], q: 'Can ne aldı?', a: '🌸', d: ['🍓', '🎈'] },
  { t: ['Baykuş', 'gece', 'öttü'], q: 'Baykuş ne zaman öttü?', a: '🌙', d: ['☀️', '🌈'] },
  { t: ['Balık', 'denizde', 'yüzdü'], q: 'Balık nerede yüzdü?', a: '🌊', d: ['🌳', '🏠'] },
  // 5. grup
  { t: ['Köpek', 'top', 'ile', 'oynadı'], q: 'Köpek ne ile oynadı?', a: '⚽', d: ['📖', '🦴'] },
  { t: ['Can', 'kitap', 'okudu'], q: 'Can ne okudu?', a: '📖', d: ['🍕', '⚽'] },
  { t: ['Zeynep', 'çilek', 'yedi'], q: 'Zeynep ne yedi?', a: '🍓', d: ['🍌', '🍕'] },
  { t: ['Tavşan', 'havuç', 'yedi'], q: 'Tavşan ne yedi?', a: '🥕', d: ['🍓', '🍎'] },
  { t: ['Horoz', 'sabah', 'öttü'], q: 'Kim öttü?', a: '🐓', d: ['🐔', '🐶'] },
  { t: ['Fil', 'suya', 'girdi'], q: 'Fil nereye girdi?', a: '💧', d: ['🌳', '🏠'] },
  { t: ['Babam', 'eve', 'geldi'], q: 'Babam nereye geldi?', a: '🏠', d: ['🌳', '🚗'] },
].map((x) => ({ ...x, id: 's:' + x.t.join(' '), g: groupOfText(x.t.join(' ')) }));

// Kısa metinler (metin oluşturma ve okuduğunu anlama aşaması). Her biri ilgili grubun sonunda açılır.
export const TEXTS = [
  { title: 'Ela ile Ali', s: ['Ela, et al.', 'Ali, at al.', 'Nine, nane al.'],
    qs: [{ q: 'Ela ne alacak?', a: '🥩', d: ['🐴', '🌿'] }, { q: 'Nine ne alacak?', a: '🌿', d: ['🌷', '🥩'] }] },
  { title: 'Kerem', s: ['Kerem erken kalktı.', 'Annem Kerem’e kek tuttu.', 'Kerem keki tattı.'],
    qs: [{ q: 'Annem Kerem’e ne tuttu?', a: '🍰', d: ['🍎', '🍋'] }, { q: 'Kim erken kalktı?', a: '👦', d: ['👵', '👩'] }] },
  { title: 'Ormanda', s: ['Deniz ile dedesi ormana yürüdü.', 'Dede Deniz’e kiraz uzattı.', 'Deniz kirazları yedi.'],
    qs: [{ q: 'Dede Deniz’e ne uzattı?', a: '🍒', d: ['🍌', '🍇'] }, { q: 'Deniz ile dedesi nereye yürüdü?', a: '🌲', d: ['🏠', '🌊'] }] },
  { title: 'Balkondaki kuş', s: ['Bugün güneş çıktı.', 'Can ile Seda balkona çıktı.', 'Balkonda bir kuş öttü.', 'Seda kuşa su koydu.'],
    qs: [{ q: 'Balkonda ne öttü?', a: '🐦', d: ['🐱', '🐶'] }, { q: 'Seda kuşa ne koydu?', a: '💧', d: ['🍞', '🍎'] }] },
  { title: 'Piknik', s: ['Pazar günü ailece pikniğe gittik.', 'Annem havuç ile peynir getirdi.', 'Babam top getirdi.', 'Ağacın altında top oynadık.'],
    qs: [{ q: 'Annem ne getirdi?', a: '🥕', d: ['⚽', '🍕'] }, { q: 'Nerede top oynadık?', a: '🌳', d: ['🏠', '🌊'] }] },
].map((x, i) => ({ ...x, id: 't:' + (i + 1), g: groupOfText(x.s.join(' ')) }));
export const textBody = (t) => t.s.join(' ');

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
    task: 'Uygun kelimelerle kısa cümle kurar, soruya yanıt verir; kısa metni okuyup anlar', skill: 'Başlangıç düzeyinde anlam kurma', stages: ['Cümle', 'Kısa metin'] },
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
  'Harfi tamamladın. Harika çalıştın!', 'Metni okudun ve soruları doğru yanıtladın.', 'Metni bir kez daha okuyalım.',
];
