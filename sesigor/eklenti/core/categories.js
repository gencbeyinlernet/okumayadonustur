// Altı ses olayı kategorisi ve AudioSet (YAMNet) sınıf eşlemesi.
// Sözlük dışındaki sesler hiçbir kategoriye zorlanmaz. Duygu veya niyet etiketi üretilmez.
export const CATEGORIES = [
  { id: 'kapi_zili', label: 'Kapı zili', icon: '🔔', thr: 0.2,
    classes: ['Doorbell', 'Ding-dong'] },
  { id: 'telefon', label: 'Telefon zili', icon: '📞', thr: 0.2,
    classes: ['Telephone bell ringing', 'Ringtone', 'Telephone'] },
  { id: 'alarm', label: 'Alarm veya siren', icon: '🚨', thr: 0.2,
    classes: ['Alarm clock', 'Siren', 'Civil defense siren', 'Smoke detector, smoke alarm', 'Fire alarm',
      'Police car (siren)', 'Ambulance (siren)', 'Fire engine, fire truck (siren)', 'Emergency vehicle', 'Buzzer'],
    // AudioSet sözlüğünde "Alarm", telefon ve kapı zilinin de üst sınıfıdır: genel sınıf yalnızca bu ikisinden güçlüyse sayılır.
    generic: 'Alarm' },
  { id: 'alkis', label: 'Alkış', icon: '👏', thr: 0.25,
    classes: ['Applause', 'Clapping'] },
  { id: 'gulme', label: 'Gülme', icon: '😄', thr: 0.25,
    classes: ['Laughter', 'Baby laughter', 'Giggle', 'Snicker', 'Belly laugh', 'Chuckle, chortle'] },
  { id: 'kopek', label: 'Köpek havlaması', icon: '🐕', thr: 0.25,
    classes: ['Bark', 'Dog', 'Bow-wow', 'Yip'] },
];
export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/** Kurallar (eşikler geliştirme kayıtlarında seçilir, bağımsız testte değiştirilmez). */
export const DEFAULT_RULES = {
  thresholds: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.thr])),
  confirm: 2,        // ardışık doğrulama: eşiği aşan pencere sayısı
  mergeGap: 3.0,     // s: aynı kategori bu süre içinde gelirse tek olayda birleşir
  hold: 1.5,         // s: eşik altına düştükten sonra etiketin ekranda kalma süresi
  maxActive: 2,      // aynı anda gösterilen en çok olay
};

/** Whisper'ın sessizlikte ürettiği bilinen Türkçe uydurma metinler. */
export const HALLUCINATIONS = [
  /altyaz[ıi]\s*m\.?\s*k\.?/i, /izledi[gğ]iniz i[cç]in te[sş]ekk[uü]r/i, /abone ol(may[ıi]|un)/i, /altyaz[ıi]lar?\b.*taraf[ıi]ndan/i,
  /^\s*\[?m[uü]zik\]?\s*$/i, /^\s*\.+\s*$/, /^\s*(te[sş]ekk[uü]rler|te[sş]ekk[uü]r ederim)[.!]?\s*$/i,
];
