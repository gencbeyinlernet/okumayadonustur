// YOLİZİ analiz ekranı: kanıtlar, modeller, parametre seçimi, duyarlılık, bağımsız değerlendirme, dışa aktarma.
import { S, save, log, effParams, devGroups, testGroups, lockSplit, lockParams, verifyLock, DEFAULT_PARAMS, replace } from './store.js';
import { loadDEM, dem, runRoute, runCorridors, toRegion, onProgress } from './dem.js';
import { MapView, COLORS, MODEL_NAMES, maskOverlay } from './map.js';
import { evaluate, compare, regionType, regionDistance, affineFit } from './metrics.js';
import { toUTM, toLonLat } from './geo.js';
import { $, $$, esc, toast, modal, confirmBox, download, toCSV, parseCSV, fmt, pct, median } from './ui.js';

let map = null, addMode = false, busy = false;
let sweepCounts = null; // uzlaşma sayaçları yalnız bellekte tutulur (depoya yazılmaz)
const TABS = [['kanit', '1. Kanıtlar'], ['model', '2. Modeller'], ['duyarlilik', '3. Duyarlılık'], ['deger', '4. Değerlendirme'], ['konum', 'Konumlandırma'], ['disa', 'Dışa aktar']];

export async function renderAnaliz(root, tab = 'kanit') {
  if (!TABS.some(([t]) => t === tab)) tab = 'kanit';
  root.innerHTML = `<div class="loading">Yükseklik verisi yükleniyor…</div>`;
  await loadDEM();
  root.innerHTML = `
  <section class="analiz">
    <aside class="side">
      <nav class="tabs">${TABS.map(([t, n]) => `<a class="tab ${t === tab ? 'on' : ''}" href="#/analiz/${t}">${n}</a>`).join('')}</nav>
      <div class="panel" data-panel></div>
    </aside>
    <div class="mapwrap">
      <div class="map" data-map></div>
      <div class="map-tools">
        ${['M0', 'M1', 'M2'].map((m) => `<label class="chk" style="--c:${COLORS[m]}"><input type="checkbox" data-vis="${m}" checked><span>${MODEL_NAMES[m]}</span></label>`).join('')}
        <label class="chk" style="--c:${COLORS.dev}"><input type="checkbox" data-vis="dev" checked><span>Geliştirme</span></label>
        <label class="chk" style="--c:${COLORS.test}"><input type="checkbox" data-vis="test" checked><span>Bağımsız test</span></label>
        <label class="chk"><input type="checkbox" data-vis="overlay" checked><span>Bindirme</span></label>
        <button class="btn tiny" data-fit>Tümünü göster</button>
      </div>
      <div class="readout" data-readout></div>
      <div class="progress" data-progress hidden><div></div><span></span></div>
    </div>
  </section>`;
  if (map) map.destroy();
  map = new MapView($('[data-map]', root), {
    onClick: (x, y) => { if (addMode) { addMode = false; document.body.classList.remove('adding'); editEvidence(null, toLonLat(x, y)); } else pickEvidence(x, y); },
    onHover: (x, y) => { $('[data-readout]', root).textContent = map.readout(x, y); },
  });
  $$('[data-vis]', root).forEach((cb) => (cb.onchange = () => { map.layers.visible[cb.dataset.vis] = cb.checked; map.draw(); }));
  $('[data-fit]', root).onclick = () => { map.fit(); map.draw(); };
  onProgress((m) => setProgress(null, `${Math.round((100 * m.pops) / m.N)}% hücre`));
  refreshLayers();
  ({ kanit, model, duyarlilik, deger, konum, disa })[tab]($('[data-panel]', root));
}

function setProgress(frac, text) {
  const p = $('[data-progress]'); if (!p) return;
  if (frac === false) { p.hidden = true; return; }
  p.hidden = false;
  if (frac != null) p.querySelector('div').style.width = Math.round(frac * 100) + '%';
  if (text) p.querySelector('span').textContent = text;
}

function refreshLayers() {
  const st = S();
  map.layers.endpoints = ['start', 'end'].map((k) => ({ ...toRegion(st.endpoints[k]), name: st.endpoints[k].name }));
  map.layers.evidence = st.evidence.map((e) => ({ ...e, ...toRegion(e) }));
  map.layers.routes = st.results;
  map.draw();
}

function pickEvidence(x, y) {
  let best = null, bd = 14 * map.mpp;
  for (const e of map.layers.evidence) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  map.selected = best; map.draw();
  if (best) showCard(S().evidence.find((e) => e.id === best.id));
}

function showCard(e) {
  modal(`<h3>${esc(e.kod)} · ${esc(e.ad || '')}</h3>
    <dl class="card-dl">
      <dt>Olası güncel karşılığı</dt><dd>${esc(e.guncel || '–')}</dd>
      <dt>Belge tarihi</dt><dd>${esc(e.tarih || '–')}</dd>
      <dt>Kaynak ailesi</dt><dd>${esc(e.aile || '–')}</dd>
      <dt>Sayfa / harita konumu</dt><dd>${esc(e.konum || '–')}</dd>
      <dt>Rol</dt><dd>${e.rol === 'test' ? 'Bağımsız test' : 'Geliştirme'}</dd>
      <dt>Konum</dt><dd>${(+e.lat).toFixed(5)}° K, ${(+e.lon).toFixed(5)}° D · belirsizlik yarıçapı ${fmt(e.r)} m (${regionType(e)} bölge)</dd>
      <dt>Not</dt><dd>${esc(e.not || '–')}</dd>
    </dl>
    <div class="row end"><button class="btn" data-edit>Düzenle</button><button class="btn primary" data-close>Kapat</button></div>`).box.querySelector('[data-edit]').onclick = () => editEvidence(e);
}

// ===================== 1. Kanıtlar =====================
function kanit(p) {
  const st = S(); const ev = st.evidence;
  const dev = devGroups(), test = testGroups();
  const famDev = new Set(dev.map((e) => e.aile)), famTest = new Set(test.map((e) => e.aile));
  const overlap = test.filter((e) => famDev.has(e.aile)).length;
  p.innerHTML = `
    <h2>Uç bölgeler ve kanıtlar</h2>
    <div class="box">
      <h4>Uç bölgeler <small class="muted">(modele verilen bilgi; başarı hesabına katılmaz)</small></h4>
      ${['start', 'end'].map((k) => { const e = st.endpoints[k]; return `<div class="row ep"><b>${k === 'start' ? 'Başlangıç' : 'Bitiş'}</b>
        <input data-ep="${k}" data-f="name" value="${esc(e.name)}" class="grow">
        <input data-ep="${k}" data-f="lat" type="number" step="0.0001" value="${e.lat}" title="Enlem">
        <input data-ep="${k}" data-f="lon" type="number" step="0.0001" value="${e.lon}" title="Boylam">
        <input data-ep="${k}" data-f="r" type="number" step="50" value="${e.r}" title="Yarıçap (m)"> m</div>`; }).join('')}
    </div>
    <div class="box ${st.lock ? 'locked' : ''}">
      <div class="row between"><h4>Kanıt grupları (${ev.length})</h4>
        <div class="row"><button class="btn tiny primary" data-add ${st.lock ? 'disabled' : ''}>＋ Haritada ekle</button>
        <label class="btn tiny">⬆ CSV / GeoJSON<input type="file" accept=".csv,.json,.geojson" data-imp hidden ${st.lock ? 'disabled' : ''}></label></div></div>
      <p class="kpis"><span><b>${dev.length}</b> geliştirme</span><span><b>${test.length}</b> bağımsız test</span><span><b>${famTest.size}</b> test kaynak ailesi</span><span class="${overlap ? 'warn' : ''}"><b>${overlap}</b> test grubu geliştirmede de kullanılan aileden</span></p>
      ${ev.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Kod</th><th>Özgün ad</th><th>Aile</th><th>Rol</th><th>Belirsizlik</th></tr></thead><tbody>
        ${ev.map((e) => `<tr data-id="${e.id}"><td><b>${esc(e.kod)}</b></td><td>${esc(e.ad || '')}</td><td>${esc(e.aile || '')}</td><td><span class="pill ${e.rol}">${e.rol === 'test' ? 'test' : 'geliştirme'}</span></td><td>${fmt(e.r)} m</td></tr>`).join('')}
      </tbody></table></div>` : `<p class="muted">Henüz kanıt yok. Haritada ekleyin veya kaynak matrisini CSV olarak içe aktarın. Sütunlar: <code>kod; ozgun_ad; guncel_karsilik; belge_tarihi; kaynak_ailesi; rol (gelistirme/test); enlem; boylam; belirsizlik_m; kaynak_konumu; not</code></p>`}
      <p class="muted">Ölçüt: en az 10 kanıt grubu ve en az 4 bağımsız test grubu. Aynı özgün belgeden üretilen makale, çeviri ve harita kopyası tek kaynak ailesinde tutulmalıdır.</p>
    </div>
    <div class="box">
      <h4>Geliştirme–test ayrımının sabitlenmesi</h4>
      ${st.lock ? `<p>🔒 <b>${new Date(st.lock.t).toLocaleString('tr-TR')}</b> tarihinde sabitlendi (${st.lock.n} grup, ${st.lock.test} test).<br><small class="mono">SHA-256: ${st.lock.hash}</small></p><p data-lockcheck class="muted">Denetleniyor…</p>
        <button class="btn tiny danger ghost" data-unlock>Kilidi kaldır (günlüğe yazılır)</button>`
      : `<p class="muted">Parametre seçiminden önce ayrımı sabitleyin. Sabitlenen ayrımın özeti (SHA-256) ve tarihi kayıt dosyasına yazılır; sonradan değişiklik denetlenir. Test kayıtları maliyet katmanına, ara durak seçimine veya parametre ayarına aktarılmaz.</p>
        <button class="btn primary" data-lock ${ev.length < 2 ? 'disabled' : ''}>🔒 Ayrımı sabitle</button>
        ${ev.length < 10 || test.length < 4 ? '<p class="warn">Ölçüt henüz sağlanmıyor (en az 10 grup, en az 4 test).</p>' : ''}`}
    </div>`;
  $$('[data-ep]', p).forEach((inp) => (inp.onchange = () => { const e = st.endpoints[inp.dataset.ep]; e[inp.dataset.f] = inp.dataset.f === 'name' ? inp.value : +inp.value; save(); log('Uç bölge değiştirildi', { [inp.dataset.ep]: e }); refreshLayers(); }));
  const add = $('[data-add]', p); if (add) add.onclick = () => { addMode = true; document.body.classList.add('adding'); toast('Haritada kanıtın konumuna dokunun.'); };
  $$('tr[data-id]', p).forEach((tr) => (tr.onclick = () => { const e = ev.find((x) => x.id === tr.dataset.id); const r = toRegion(e); map.focus(r.x, r.y, Math.min(map.mpp, 20)); map.selected = map.layers.evidence.find((x) => x.id === e.id); map.draw(); showCard(e); }));
  const imp = $('[data-imp]', p); if (imp) imp.onchange = (e) => importEvidence(e.target.files[0], p);
  const lk = $('[data-lock]', p); if (lk) lk.onclick = async () => { if (await confirmBox('Geliştirme–test ayrımı şimdi sabitlensin mi? Bundan sonra rol, aile ve konum değiştirilemez.', 'Sabitle')) { await lockSplit(); kanit(p); } };
  const ul = $('[data-unlock]', p); if (ul) ul.onclick = async () => { if (await confirmBox('Kilit kaldırılsın mı? Bu işlem günlüğe kaydedilir ve değerlendirme raporunda görünür.', 'Kaldır')) { log('Ayrım kilidi kaldırıldı', st.lock); st.lock = null; save(); kanit(p); } };
  const lc = $('[data-lockcheck]', p); if (lc) verifyLock().then((ok) => { lc.textContent = ok ? '✅ Kanıt ayrımı sabitlendiği hâliyle duruyor.' : '⚠️ Ayrım sabitlendikten sonra değişmiş!'; lc.className = ok ? 'ok' : 'warn'; });
}

function editEvidence(e, lonlat) {
  const st = S(); const locked = !!st.lock && e;
  const v = e || { id: 'k' + Date.now().toString(36), kod: 'K' + String(st.evidence.length + 1).padStart(2, '0'), rol: 'gelistirme', r: 250, lon: lonlat[0].toFixed(6), lat: lonlat[1].toFixed(6) };
  const f = (k, label, type = 'text', extra = '') => `<label class="field">${label}<input data-k="${k}" type="${type}" value="${esc(v[k] ?? '')}" ${extra}></label>`;
  const { box, close } = modal(`<h3>${e ? 'Kanıt grubunu düzenle' : 'Yeni kanıt grubu'}</h3>
    <div class="grid2">${f('kod', 'Kod')}${f('ad', 'Özgün yer adı')}${f('guncel', 'Olası güncel karşılığı')}${f('tarih', 'Belge tarihi')}
    ${f('aile', 'Kaynak ailesi', 'text', locked ? 'disabled' : '')}${f('konum', 'Sayfa / harita konumu')}
    <label class="field">Rol<select data-k="rol" ${locked ? 'disabled' : ''}><option value="gelistirme" ${v.rol === 'gelistirme' ? 'selected' : ''}>Geliştirme</option><option value="test" ${v.rol === 'test' ? 'selected' : ''}>Bağımsız test</option></select></label>
    ${f('r', 'Konum belirsizliği yarıçapı (m)', 'number', locked ? 'disabled' : 'min="0" step="10"')}
    ${f('lat', 'Enlem', 'number', locked ? 'disabled' : 'step="0.00001"')}${f('lon', 'Boylam', 'number', locked ? 'disabled' : 'step="0.00001"')}</div>
    <label class="field">Not (kaynak metni ile ekip yorumu ayrı yazılmalı)<textarea data-k="not">${esc(v.not || '')}</textarea></label>
    ${locked ? '<p class="muted">🔒 Ayrım sabitlendiği için rol, aile ve konum değiştirilemez.</p>' : ''}
    <div class="row between">${e && !st.lock ? '<button class="btn danger ghost" data-del>Sil</button>' : '<span></span>'}<div class="row"><button class="btn ghost" data-close>Vazgeç</button><button class="btn primary" data-save>Kaydet</button></div></div>`, { wide: true });
  $('[data-save]', box).onclick = () => {
    const nv = { ...v };
    $$('[data-k]', box).forEach((i) => { if (!i.disabled) nv[i.dataset.k] = i.type === 'number' ? +i.value : i.value; });
    if (!nv.kod) return toast('Kod gerekli.');
    if (st.evidence.some((x) => x.kod === nv.kod && x.id !== nv.id)) return toast('Bu kod zaten kullanılıyor.');
    const [x, y] = toUTM(+nv.lon, +nv.lat); const D = dem();
    if (x < D.x0 || x > D.x1 || y < D.y0 || y > D.y1) return toast('Konum çalışma alanının dışında.');
    const i = st.evidence.findIndex((q) => q.id === nv.id);
    if (i >= 0) st.evidence[i] = nv; else st.evidence.push(nv);
    log(i >= 0 ? 'Kanıt düzenlendi' : 'Kanıt eklendi', { kod: nv.kod, rol: nv.rol });
    save(); close(); refreshLayers(); rerender();
  };
  const del = $('[data-del]', box);
  if (del) del.onclick = async () => { if (await confirmBox(`${v.kod} silinsin mi?`, 'Sil')) { st.evidence = st.evidence.filter((q) => q.id !== v.id); log('Kanıt silindi', { kod: v.kod }); save(); refreshLayers(); rerender(); } };
}

async function importEvidence(file, p) {
  if (!file) return;
  const text = await file.text(); const st = S(); let added = 0;
  try {
    let items = [];
    if (/\.(geo)?json$/i.test(file.name)) {
      const gj = JSON.parse(text);
      items = (gj.features || []).filter((f) => f.geometry && f.geometry.type === 'Point').map((f) => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
    } else {
      const rows = parseCSV(text); const hd = rows.shift().map((h) => h.trim().toLowerCase());
      const col = (r, ...names) => { for (const n of names) { const i = hd.indexOf(n); if (i >= 0) return r[i]; } return ''; };
      items = rows.map((r) => ({ kod: col(r, 'kod'), ad: col(r, 'ozgun_ad', 'özgün ad', 'ad'), guncel: col(r, 'guncel_karsilik', 'güncel karşılık'), tarih: col(r, 'belge_tarihi', 'tarih'), aile: col(r, 'kaynak_ailesi', 'aile'), rol: col(r, 'rol'), lat: col(r, 'enlem', 'lat'), lon: col(r, 'boylam', 'lon'), r: col(r, 'belirsizlik_m', 'r'), konum: col(r, 'kaynak_konumu', 'konum'), not: col(r, 'not') }));
    }
    for (const it of items) {
      const lat = parseFloat(String(it.lat).replace(',', '.')), lon = parseFloat(String(it.lon).replace(',', '.'));
      if (!it.kod || !isFinite(lat) || !isFinite(lon)) continue;
      const rol = /test/i.test(it.rol) ? 'test' : 'gelistirme';
      st.evidence = st.evidence.filter((e) => e.kod !== it.kod);
      st.evidence.push({ id: 'k' + Math.random().toString(36).slice(2, 9), kod: String(it.kod).trim(), ad: it.ad || '', guncel: it.guncel || '', tarih: it.tarih || '', aile: it.aile || '', konum: it.konum || '', not: it.not || '', rol, lat, lon, r: parseFloat(String(it.r || 250).replace(',', '.')) || 0 });
      added++;
    }
    log('Kanıtlar içe aktarıldı', { dosya: file.name, adet: added }); save(); refreshLayers(); kanit(p); toast(`${added} kanıt grubu içe aktarıldı.`);
  } catch (err) { toast('Dosya okunamadı: ' + err.message); }
}

function rerender() { const p = $('[data-panel]'); const tab = (location.hash.split('/')[2]) || 'kanit'; ({ kanit, model, duyarlilik, deger, konum, disa })[tab](p); }

// ===================== 2. Modeller =====================
const P = (model, over = {}) => {
  const st = S(); const prm = effParams({ ...st.params, ...over });
  return { model, res: over.res || st.params.res, a: prm.a, b: prm.b, g: prm.g, K: prm.K, lambda: prm.lambda, riverMin: prm.riverMin, start: toRegion(st.endpoints.start), end: toRegion(st.endpoints.end), dev: (over.dev || devGroups()).map(toRegion) };
};
const thin = (line, max = 1500) => { const k = Math.max(1, Math.ceil(line.length / max)); return line.filter((_, i) => i % k === 0 || i === line.length - 1).map(([x, y]) => [Math.round(x), Math.round(y)]); };

async function guarded(fn) {
  if (busy) return toast('Bir hesaplama sürüyor.');
  busy = true; setProgress(0, 'Başlıyor…');
  try { await fn(); } catch (e) { toast('Hata: ' + e.message, 5000); } finally { busy = false; setProgress(false); }
}

function model(p) {
  const st = S(), pr = st.params, R = st.results;
  const num = (k, label, step, help) => `<label class="field small">${label}<input type="number" step="${step}" data-p="${k}" value="${pr[k]}" ${st.paramsLock ? 'disabled' : ''}>${help ? `<small>${help}</small>` : ''}</label>`;
  p.innerHTML = `
    <h2>Güzergâh modelleri</h2>
    <div class="box">
      <p class="formula">c = d·(1 + a·u + b·v + g·s² + λ·h) + K</p>
      <p class="muted small">d: hücre merkezleri arası mesafe; s = Δz/d; u = max(s,0), v = max(−s,0); h = min(1, en yakın geliştirme bölgesine uzaklık / 500 m); K yalnızca akarsu geçişi olan kenarlarda. 8 komşulu Dijkstra; köşeden geçiş yok.</p>
      <div class="grid3">${num('a', 'a (yokuş yukarı)', 0.5)}${num('b', 'b (yokuş aşağı)', 0.5)}${num('g', 'g (eğim²)', 0.5)}
      ${num('scale', 'Katsayı ölçeği', 0.5, '0,5 / 1 / 1,5')}${num('K', 'Akarsu cezası K (m)', 50, '50 / 200 / 500')}${num('lambda', 'Belge ağırlığı λ', 0.5, 'yalnız M2')}</div>
      <div class="grid3">
        <label class="field small">Çözünürlük<select data-p="res" ${st.paramsLock ? 'disabled' : ''}>${[30, 60, 90].map((r) => `<option value="${r}" ${pr.res === r ? 'selected' : ''}>${r} m</option>`).join('')}</select></label>
        <label class="field small">Geçiş cezalı akarsu<select data-p="riverMin" ${st.paramsLock ? 'disabled' : ''}>${[[1, '≥ 10 km² havza'], [2, '≥ 50 km² havza'], [3, '≥ 250 km² havza']].map(([v, n]) => `<option value="${v}" ${pr.riverMin === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <p class="muted small">Başlangıç değerleri a = 8, b = 4, g = 6 deneysel olarak doğrulanmış kervan katsayıları değildir.</p>
      <div class="row"><button class="btn primary" data-run>▶ M0, M1, M2'yi hesapla</button>
        ${st.paramsLock ? `<span class="pill ok">🔒 Parametreler sabit (${new Date(st.paramsLock.t).toLocaleDateString('tr-TR')})</span>` : '<button class="btn" data-plock>🔒 Parametreleri sabitle</button>'}</div>
    </div>
    <div class="box">
      <h4>Parametre seçimi (yalnızca geliştirme kanıtlarıyla)</h4>
      <p class="muted small">Önce M1'in arazi parametreleri (ölçek × K) geliştirme bölgelerine medyan uzaklığa göre seçilir; ardından M2'de yalnızca λ, kaynak aileleri sırayla dışarıda bırakılarak ayarlanır. Test grupları kullanılmaz.</p>
      <button class="btn" data-select ${devGroups().length < 1 || st.paramsLock ? 'disabled' : ''}>Parametre seçimini çalıştır</button>
      <div data-selout>${st.selection ? selectionTable(st.selection) : ''}</div>
    </div>
    <div class="box">
      <h4>Sonuçlar</h4>
      ${['M0', 'M1', 'M2'].map((m) => R[m] ? `<div class="res-row" style="--c:${COLORS[m]}"><b>${MODEL_NAMES[m]}</b><span>${fmt(R[m].len / 1000, 1)} km</span><span>↑ ${fmt(R[m].asc)} m</span><span>↓ ${fmt(R[m].desc)} m</span><span class="muted">${R[m].res} m · ${fmt(R[m].ms)} ms</span></div>` : `<div class="res-row muted" style="--c:${COLORS[m]}"><b>${MODEL_NAMES[m]}</b><span>hesaplanmadı</span></div>`).join('')}
      ${R.M1 ? `<canvas class="profile" data-prof width="600" height="160"></canvas><p class="muted small">Yükseklik profili (m). Kesikli: M0, turuncu: M1, mor: M2.</p>` : ''}
      ${devGroups().length ? '' : '<p class="muted small">M2 için en az bir geliştirme kanıtı gerekir.</p>'}
    </div>`;
  $$('[data-p]', p).forEach((i) => (i.onchange = () => { st.params[i.dataset.p] = +i.value; save(); log('Parametre değişti', { [i.dataset.p]: +i.value }); }));
  $('[data-run]', p).onclick = () => guarded(async () => {
    for (const [k, m] of ['M0', 'M1', 'M2'].entries()) {
      if (m === 'M2' && !devGroups().length) { delete st.results.M2; continue; }
      setProgress(k / 3, `${MODEL_NAMES[m]} hesaplanıyor…`);
      const r = await runRoute(P(m));
      st.results[m] = { line: thin(r.line), len: r.len, asc: r.asc, desc: r.desc, cost: r.cost, res: r.res, ms: r.ms, profile: r.profile, t: new Date().toISOString(), params: { ...st.params } };
      log('Model koşusu', { model: m, uzunluk_km: +(r.len / 1000).toFixed(2), yukselme_m: Math.round(r.asc), params: st.params });
    }
    save(); refreshLayers(); model(p); toast('Modeller hesaplandı.');
  });
  const pl = $('[data-plock]', p); if (pl) pl.onclick = async () => { if (await confirmBox('Parametreler sabitlensin mi? Bağımsız değerlendirme sabit parametrelerle yapılmalıdır.', 'Sabitle')) { await lockParams(); model(p); } };
  const sel = $('[data-select]', p); if (sel) sel.onclick = () => guarded(() => paramSelection(p));
  const cv = $('[data-prof]', p); if (cv) drawProfile(cv, R);
}

function drawProfile(cv, R) {
  const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
  const all = ['M0', 'M1', 'M2'].filter((m) => R[m]).flatMap((m) => R[m].profile.map((q) => q[1]));
  const mn = Math.min(...all), mx = Math.max(...all);
  ctx.clearRect(0, 0, W, H); ctx.font = '11px sans-serif'; ctx.fillStyle = '#555';
  ctx.fillText(Math.round(mx) + ' m', 4, 12); ctx.fillText(Math.round(mn) + ' m', 4, H - 4);
  for (const m of ['M0', 'M1', 'M2']) {
    const r = R[m]; if (!r) continue; const n = r.profile.length;
    ctx.beginPath(); r.profile.forEach((q, i) => { const x = 50 + (i / (n - 1)) * (W - 60), y = 8 + (1 - (q[1] - mn) / (mx - mn || 1)) * (H - 16); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = COLORS[m]; ctx.lineWidth = 2; ctx.setLineDash(m === 'M0' ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
  }
}

function selectionTable(s) {
  return `<table class="tbl small"><thead><tr><th>Ölçek</th><th>K</th><th>Geliştirme medyan uzaklık</th></tr></thead><tbody>
    ${s.m1.map((r) => `<tr class="${r.best ? 'best' : ''}"><td>${r.scale}</td><td>${r.K}</td><td>${fmt(r.med)} m</td></tr>`).join('')}</tbody></table>
    ${s.m2 ? `<table class="tbl small"><thead><tr><th>λ</th><th>Aile dışarıda bırakma medyan uzaklık</th></tr></thead><tbody>${s.m2.map((r) => `<tr class="${r.best ? 'best' : ''}"><td>${r.lambda}</td><td>${fmt(r.med)} m</td></tr>`).join('')}</tbody></table>` : ''}
    <p class="muted small">Seçilen değerler parametrelere yazıldı (${new Date(s.t).toLocaleString('tr-TR')}). Sabitlemek için “Parametreleri sabitle”.</p>`;
}

async function paramSelection(p) {
  const st = S(); const dev = devGroups();
  const m1 = []; let k = 0;
  for (const scale of [0.5, 1, 1.5]) for (const K of [50, 200, 500]) {
    setProgress(k++ / 12, `M1 ölçek ${scale}, K ${K}`);
    const r = await runRoute(P('M1', { scale, K, lambda: 0 }));
    m1.push({ scale, K, med: median(dev.map((g) => regionDistance(r.line, g))) });
  }
  // Eşitlikte varsayılana en yakın (ölçek 1, K 200) seçilir; sonuç yalnızca geliştirme kanıtlarına dayanır.
  const pen1 = (r) => Math.abs(r.scale - 1) + Math.abs(Math.log(r.K / 200));
  const b1 = m1.reduce((a, b) => (b.med < a.med - 1e-6 || (Math.abs(b.med - a.med) <= 1e-6 && pen1(b) < pen1(a)) ? b : a)); b1.best = true;
  st.params.scale = b1.scale; st.params.K = b1.K;
  const fams = [...new Set(dev.map((e) => e.aile || '(ailesiz)'))];
  let m2 = null;
  if (fams.length >= 2) {
    m2 = [];
    for (const lambda of [0, 0.5, 1]) {
      const ds = [];
      for (const f of fams) {
        setProgress(Math.min(0.99, k++ / (9 + 3 * fams.length)), `M2 λ ${lambda}, dışarıda: ${f}`);
        const inF = dev.filter((e) => (e.aile || '(ailesiz)') === f), outF = dev.filter((e) => (e.aile || '(ailesiz)') !== f);
        const r = await runRoute(P('M2', { scale: b1.scale, K: b1.K, lambda, dev: outF }));
        ds.push(...inF.map((g) => regionDistance(r.line, g)));
        if (lambda === 0) break; // λ = 0'da belge etkisi yok; tek koşu yeterli
      }
      m2.push({ lambda, med: median(ds) });
    }
    const b2 = m2.reduce((a, b) => (b.med < a.med - 1e-6 ? b : a)); b2.best = true; st.params.lambda = b2.lambda; // eşitlikte küçük λ
  }
  st.selection = { t: new Date().toISOString(), m1, m2, families: fams };
  log('Parametre seçimi', st.selection); save(); model(p);
  if (!m2) toast('λ seçimi için en az iki geliştirme kaynak ailesi gerekir; λ değiştirilmedi.', 4000);
}

// ===================== 3. Duyarlılık =====================
function duyarlilik(p) {
  const st = S(); const sw = st.sweep;
  p.innerHTML = `
    <h2>Duyarlılık ve alternatif koridorlar</h2>
    <div class="box">
      <h4>Senaryolar</h4>
      <p class="muted small">Katsayı ölçeği 0,5 / 1 / 1,5 × akarsu cezası 50 / 200 / 500 m (M1, M2) × λ 0 / 0,5 / 1 (M2); ayrıca seçili parametrelerle 30, 60 ve 90 m çözünürlük. Her senaryoda güzergâh yeniden üretilir; her kesimin kaç senaryoda seçildiği haritalanır.</p>
      <label class="field small">Model<select data-sm><option value="M1">M1 Arazi</option><option value="M2" ${devGroups().length ? '' : 'disabled'}>M2 Arazi ve belge</option></select></label>
      <button class="btn primary" data-sweep>▶ Senaryoları çalıştır</button>
      <div data-swout>${sw ? sweepSummary(sw) : ''}</div>
    </div>
    <div class="box">
      <h4>Alternatif koridorlar (%5 ve %10)</h4>
      <p class="muted small">Toplam maliyeti en iyi yola göre en çok %5 ve %10 yüksek bağlantılar. Bitişe kalan maliyet, ağın kenar yönleri ters çevrilerek hesaplanır. Bu eşikler tarihsel güven düzeyi değil, modelde izin verilen maliyet farklarıdır.</p>
      <label class="field small">Model<select data-cm><option value="M1">M1</option><option value="M2" ${devGroups().length ? '' : 'disabled'}>M2</option></select></label>
      <button class="btn" data-corr>▶ Koridorları hesapla</button>
    </div>
    <div class="box"><h4>Bindirmeyi temizle</h4><button class="btn ghost" data-clear>Bindirmeleri kaldır</button></div>`;
  $('[data-sweep]', p).onclick = () => guarded(() => runSweep($('[data-sm]', p).value, p));
  $('[data-corr]', p).onclick = () => guarded(async () => {
    const m = $('[data-cm]', p).value;
    setProgress(0.2, 'İleri ve geri maliyet alanları…');
    const c = await runCorridors(P(m));
    const D = dem();
    map.layers.overlays = map.layers.overlays.filter((o) => o.kind !== 'corr');
    const ov = maskOverlay(c.mask, c.W, c.H, c.res, D.x0, D.y1, (v) => (v === 2 ? [250, 204, 21, 200] : v === 1 ? [253, 230, 138, 150] : null), 0.8);
    ov.kind = 'corr'; map.layers.overlays.push(ov); map.draw();
    log('Koridor hesabı', { model: m, params: st.params });
    toast('Koridorlar haritada: koyu sarı %5, açık sarı %10.');
  });
  $('[data-clear]', p).onclick = () => { map.layers.overlays = []; map.draw(); };
  if (sw && sweepCounts) showAgreement(sw);
}

async function runSweep(m, p) {
  const st = S(); const base = st.params; const scen = [];
  for (const scale of [0.5, 1, 1.5]) for (const K of [50, 200, 500]) {
    if (m === 'M2') for (const lambda of [0, 0.5, 1]) scen.push({ scale, K, lambda, res: base.res });
    else scen.push({ scale, K, lambda: 0, res: base.res });
  }
  for (const res of [30, 60, 90]) if (res !== base.res) scen.push({ scale: base.scale, K: base.K, lambda: m === 'M2' ? base.lambda : 0, res });
  const D = dem(); const cw = 60, W = Math.ceil((D.x1 - D.x0) / cw), H = Math.ceil((D.y1 - D.y0) / cw);
  const counts = new Uint16Array(W * H); const out = [];
  const tests = st.lock ? testGroups() : [];
  for (const [k, s] of scen.entries()) {
    setProgress(k / scen.length, `${m} senaryo ${k + 1}/${scen.length}`);
    const r = await runRoute(P(m, s));
    const seen = new Set();
    for (const [x, y] of r.line) { const j = Math.floor((x - D.x0) / cw), i = Math.floor((D.y1 - y) / cw); seen.add(i * W + j); }
    seen.forEach((q) => counts[q]++);
    out.push({ ...s, len: r.len, asc: r.asc, testMedian: tests.length ? median(tests.map((g) => regionDistance(r.line, g))) : null });
  }
  st.sweep = { model: m, n: scen.length, scenarios: out, t: new Date().toISOString(), grid: { W, H, cw } };
  log('Duyarlılık analizi', { model: m, senaryo: scen.length });
  save();
  sweepCounts = counts;
  showAgreement(st.sweep); duyarlilik(p);
}

function showAgreement(sw) {
  const D = dem(); const { W, H, cw } = sw.grid;
  const ramp = (f) => { const c = [[0, [59, 130, 246]], [0.5, [16, 185, 129]], [1, [220, 38, 38]]]; for (let k = 1; k < 3; k++) if (f <= c[k][0]) { const t = (f - c[k - 1][0]) / (c[k][0] - c[k - 1][0]); return c[k - 1][1].map((v, q) => v + (c[k][1][q] - v) * t); } return c[2][1]; };
  const ov = maskOverlay(sweepCounts, W, H, cw, D.x0, D.y1, (v) => (v ? [...ramp(v / sw.n), 230] : null), 0.9);
  ov.kind = 'agree';
  map.layers.overlays = map.layers.overlays.filter((o) => o.kind !== 'agree'); map.layers.overlays.push(ov); map.draw();
}

function sweepSummary(sw) {
  const tm = sw.scenarios.map((s) => s.testMedian).filter((v) => v != null);
  return `<p><b>${sw.n}</b> senaryo (${sw.model}) · ${new Date(sw.t).toLocaleString('tr-TR')}</p>
    ${tm.length ? `<p>Bağımsız test medyan uzaklığı senaryolar arasında <b>${fmt(Math.min(...tm))}–${fmt(Math.max(...tm))} m</b> aralığında değişti.</p>` : '<p class="muted small">Test medyan aralığı ayrım sabitlendikten sonra gösterilir.</p>'}
    <div class="legend-bar"><span>az senaryoda</span><i></i><span>bütün senaryolarda</span></div>
    <p class="muted small">Renk, kesimin seçildiği senaryo oranıdır; tarihteki gerçek yolun bulunma olasılığı değildir.</p>
    ${sweepCounts ? '' : '<p class="muted small">Uzlaşma haritası için senaryoları yeniden çalıştırın (harita bu oturumda tutulur).</p>'}
    <details><summary>Senaryo tablosu</summary><table class="tbl small"><thead><tr><th>Ölçek</th><th>K</th><th>λ</th><th>Çöz.</th><th>km</th><th>Test medyan</th></tr></thead><tbody>
    ${sw.scenarios.map((s) => `<tr><td>${s.scale}</td><td>${s.K}</td><td>${s.lambda}</td><td>${s.res}</td><td>${fmt(s.len / 1000, 1)}</td><td>${s.testMedian == null ? '–' : fmt(s.testMedian) + ' m'}</td></tr>`).join('')}</tbody></table></details>`;
}

// ===================== 4. Değerlendirme =====================
async function deger(p) {
  const st = S(); const R = st.results; const tests = testGroups();
  if (!st.lock) { p.innerHTML = `<h2>Bağımsız değerlendirme</h2><div class="box"><p>🔒 Bağımsız test bölgeleriyle değerlendirme, geliştirme–test ayrımı sabitlendikten sonra açılır.</p><a class="btn" href="#/analiz/kanit">Kanıtlar sekmesine git</a></div>`; return; }
  const ok = await verifyLock();
  const ev = {}; ['M0', 'M1', 'M2'].forEach((m) => { if (R[m]) ev[m] = evaluate(R[m], tests); });
  const ms = Object.keys(ev);
  const dev = devGroups(); const famDev = new Set(dev.map((e) => e.aile));
  const gf = affineFit(st.georef || []);
  const c10 = ev.M1 && ev.M0 ? compare(ev.M1, ev.M0) : null, c21 = ev.M2 && ev.M1 ? compare(ev.M2, ev.M1) : null;
  const paramsOk = st.paramsLock && ms.every((m) => JSON.stringify(R[m].params) === JSON.stringify(st.paramsLock.params));
  p.innerHTML = `
    <h2>Bağımsız değerlendirme</h2>
    ${ok ? '' : '<p class="warn">⚠️ Kanıt ayrımı sabitlendikten sonra değişmiş. Sonuçlar raporlanmadan önce açıklanmalıdır.</p>'}
    ${paramsOk ? '<p class="ok small">✅ Sonuçlar sabitlenen parametrelerle üretildi.</p>' : '<p class="warn small">⚠️ Parametreler sabitlenmedi ya da sonuçlar sabit parametrelerle yeniden hesaplanmadı.</p>'}
    <div class="box"><h4>Tablo 4. Kanıt grupları ve konumlandırma hatası</h4>
      <table class="tbl"><tbody>
        <tr><td>Toplam kanıt grubu / geliştirme / bağımsız test</td><td>${st.evidence.length} / ${dev.length} / ${tests.length}</td></tr>
        <tr><td>Test gruplarındaki farklı kaynak ailesi</td><td>${new Set(tests.map((e) => e.aile)).size}</td></tr>
        <tr><td>Geliştirmede de kullanılan kaynak ailesinden gelen test grubu</td><td>${tests.filter((e) => famDev.has(e.aile)).length}</td></tr>
        <tr><td>Konumlandırma: uyum noktaları KOK hata (m)</td><td>${gf ? fmt(gf.rmseFit, 1) + ` (n = ${gf.nFit})` : 'Konumlandırma sekmesinde girilmedi'}</td></tr>
        <tr><td>Konumlandırma: kontrol noktaları KOK hata (m)</td><td>${gf && gf.nCheck ? fmt(gf.rmseCheck, 1) + ` (n = ${gf.nCheck})` : '–'}</td></tr>
      </tbody></table></div>
    <div class="box"><h4>Tablo 5. Model karşılaştırması (bağımsız test grupları, n = ${tests.length})</h4>
      ${ms.length && tests.length ? `<table class="tbl"><thead><tr><th>Gösterge</th>${ms.map((m) => `<th style="color:${COLORS[m]}">${m}</th>`).join('')}</tr></thead><tbody>
        ${[['Medyan uzaklık (m)', 'median', (v) => fmt(v)], ['%90 uzaklık değeri (m)', 'p90', (v) => fmt(v)], ['100 m içinde kalan grup oranı', 'c100', pct], ['250 m içinde kalan grup oranı', 'c250', pct], ['500 m içinde kalan grup oranı', 'c500', pct], ['Toplam uzunluk (km)', 'len', (v) => fmt(v, 1)], ['Toplam yükselme (m)', 'asc', (v) => fmt(v)]]
          .map(([n, k, f]) => `<tr><td>${n}</td>${ms.map((m) => `<td>${f(ev[m][k])}</td>`).join('')}</tr>`).join('')}
      </tbody></table>` : '<p class="muted">Modelleri hesaplayın ve en az bir test grubu ekleyin.</p>'}</div>
    ${ms.length && tests.length ? `<div class="box"><h4>Tablo 6. Test gruplarına göre uzaklıklar (m)</h4>
      <table class="tbl"><thead><tr><th>Test grubu</th><th>Bölge türü</th>${ms.map((m) => `<th>${m}</th>`).join('')}</tr></thead><tbody>
        ${tests.map((g, i) => `<tr><td>${esc(g.kod)}</td><td>${regionType(g)}</td>${ms.map((m) => `<td>${fmt(ev[m].dists[i])}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
      <p>${c10 ? `M1, test gruplarının <b>${c10.closer}</b>'inde M0'dan daha yakın, <b>${c10.farther}</b>'inde daha uzak (farkların medyanı ${fmt(c10.medianDiff)} m). ` : ''}${c21 ? `M2, grupların <b>${c21.closer}</b>'inde M1'den daha yakın, <b>${c21.farther}</b>'inde daha uzak (farkların medyanı ${fmt(c21.medianDiff)} m).` : ''}</p>
      ${['dar', 'geniş'].map((t) => { const idx = tests.map((g, i) => [g, i]).filter(([g]) => regionType(g) === t).map(([, i]) => i); return idx.length ? `<p class="small">${t === 'dar' ? 'Dar (≤ 250 m)' : 'Geniş (> 250 m)'} bölgeler (n = ${idx.length}): ${ms.map((m) => `${m} medyan ${fmt(median(idx.map((i) => ev[m].dists[i])))} m`).join(' · ')}</p>` : ''; }).join('')}
      <p class="muted small">Çizgi bölgenin içinden geçiyorsa uzaklık 0'dır; bu, kesin geçiş noktasının bulunduğu anlamına gelmez. Birim kanıt grubudur; az sayıda grupla çalışıldığından sonuçlar betimseldir.</p></div>` : ''}`;
  st.lastEval = { t: new Date().toISOString(), ev, c10, c21 };
}

// ===================== Konumlandırma =====================
function konum(p) {
  const st = S(); st.georef ||= [];
  const gf = affineFit(st.georef);
  p.innerHTML = `
    <h2>Dönem haritasının konumlandırılması</h2>
    <div class="box">
      <p class="muted small">Kararlı ve tanımlanabilir yer şekillerinin taranmış haritadaki piksel konumunu ve gerçek koordinatını girin. Birinci derece polinom (afin) dönüşüm en küçük karelerle uyum noktalarına oturtulur; uyuma alınmayan kontrol noktalarının hatası ayrıca hesaplanır (Tablo 4).</p>
      <table class="tbl small"><thead><tr><th>Ad</th><th>Piksel x</th><th>Piksel y</th><th>Enlem</th><th>Boylam</th><th>Rol</th><th>Artık (m)</th><th></th></tr></thead><tbody>
      ${st.georef.map((g, i) => `<tr><td><input data-g="${i}" data-f="ad" value="${esc(g.ad || '')}"></td>${['px', 'py', 'lat', 'lon'].map((f) => `<td><input type="number" step="any" data-g="${i}" data-f="${f}" value="${g[f] ?? ''}"></td>`).join('')}
        <td><select data-g="${i}" data-f="rol"><option value="uyum" ${g.rol !== 'kontrol' ? 'selected' : ''}>uyum</option><option value="kontrol" ${g.rol === 'kontrol' ? 'selected' : ''}>kontrol</option></select></td>
        <td>${gf && gf.points[i] ? fmt(gf.points[i].resid, 1) : '–'}</td><td><button class="btn tiny ghost" data-gdel="${i}">✕</button></td></tr>`).join('')}
      </tbody></table>
      <button class="btn tiny" data-gadd>＋ Nokta ekle</button>
      ${gf ? `<p>Uyum KOK hata: <b>${fmt(gf.rmseFit, 1)} m</b> (n = ${gf.nFit}) · Kontrol KOK hata: <b>${gf.nCheck ? fmt(gf.rmseCheck, 1) + ' m' : '–'}</b> (n = ${gf.nCheck})</p>` : '<p class="muted small">En az 3 uyum noktası gerekir.</p>'}
    </div>`;
  $$('[data-g]', p).forEach((i) => (i.onchange = () => { st.georef[+i.dataset.g][i.dataset.f] = i.type === 'number' ? +i.value : i.value; save(); konum(p); }));
  $$('[data-gdel]', p).forEach((b) => (b.onclick = () => { st.georef.splice(+b.dataset.gdel, 1); save(); konum(p); }));
  $('[data-gadd]', p).onclick = () => { st.georef.push({ ad: '', rol: 'uyum' }); save(); konum(p); };
}

// ===================== Dışa aktar =====================
function disa(p) {
  const st = S();
  p.innerHTML = `
    <h2>Dışa aktar</h2>
    <div class="box"><h4>Şekiller (PNG)</h4>
      <button class="btn" data-f1>Şekil 1: güzergâhlar ve bağımsız test bölgeleri</button>
      <button class="btn" data-f2>Şekil 2: model uzlaşması ve koridorlar (geçerli bindirme)</button>
      <p class="muted small">Şekil, haritanın şu anki görünümüyle; lejant, ölçek çubuğu, kuzey oku ve koordinat sistemi bilgisiyle üretilir.</p></div>
    <div class="box"><h4>Tablolar ve kayıtlar</h4>
      <button class="btn" data-ek1>Ek 1: kaynak matrisi (CSV)</button>
      <button class="btn" data-ek2>Ek 2: parametre dosyası ve işlem sırası (JSON)</button>
      <button class="btn" data-t56>Tablo 5–6 (CSV)</button>
      <button class="btn" data-gj>Güzergâhlar (GeoJSON, WGS 84)</button></div>
    <div class="box"><h4>Proje yedeği</h4>
      <button class="btn primary" data-all>Tüm proje verisini indir (JSON)</button>
      <label class="btn">⬆ Yedekten yükle<input type="file" accept=".json" data-load hidden></label>
      <p class="muted small">İşlem günlüğünde ${st.log.length} kayıt var; sonuç vermeyen model koşuları silinmez.</p></div>`;
  const legendBase = [
    ...['M0', 'M1', 'M2'].filter((m) => st.results[m]).map((m) => ({ type: 'line', color: COLORS[m], dash: m === 'M0' ? [8, 6] : [], label: MODEL_NAMES[m] })),
    { type: 'square', color: COLORS.end, label: 'Uç bölgeler (kesikli: yarıçap)' },
    { type: 'filled', color: COLORS.dev, label: 'Geliştirme kanıtı (içi dolu)' },
    { type: 'hollow', color: COLORS.test, label: 'Bağımsız test bölgesi (içi boş)' },
    { type: 'swatch', color: 'rgb(30,110,220)', label: 'Akarsu (DEM’den türetilmiş)' },
  ];
  $('[data-f1]', p).onclick = async () => download('YOLIZI_Sekil1_guzergahlar.png', await map.exportPNG({ title: 'M0, M1 ve M2 güzergâhları ile bağımsız test bölgeleri', legend: legendBase, note: 'Kaynak: Copernicus DEM GLO-30. Güncel yüzey 1856 arazisini tam temsil etmez.' }));
  $('[data-f2]', p).onclick = async () => download('YOLIZI_Sekil2_uzlasma_koridor.png', await map.exportPNG({ title: 'Model uzlaşması ve %5–%10 alternatif koridorlar', legend: [...legendBase.slice(0, 3), { type: 'swatch', color: 'rgb(59,130,246)', label: 'Az senaryoda seçilen kesim' }, { type: 'swatch', color: 'rgb(220,38,38)', label: 'Bütün senaryolarda seçilen kesim' }, { type: 'swatch', color: 'rgb(250,204,21)', label: '%5 koridor' }, { type: 'swatch', color: 'rgb(253,230,138)', label: '%10 koridor' }], note: 'Yüzde, kesimin seçildiği senaryo oranıdır; tarihsel olasılık değildir. Koridor eşikleri modelde izin verilen maliyet farklarıdır.' }));
  $('[data-ek1]', p).onclick = () => download('YOLIZI_Ek1_kaynak_matrisi.csv', toCSV([['kod', 'ozgun_ad', 'guncel_karsilik', 'belge_tarihi', 'kaynak_ailesi', 'rol', 'enlem', 'boylam', 'belirsizlik_m', 'bolge_turu', 'kaynak_konumu', 'not'], ...st.evidence.map((e) => [e.kod, e.ad, e.guncel, e.tarih, e.aile, e.rol, e.lat, e.lon, e.r, regionType(e), e.konum, e.not])]), 'text/csv;charset=utf-8');
  $('[data-ek2]', p).onclick = () => download('YOLIZI_Ek2_parametre_ve_islem_sirasi.json', JSON.stringify({ olusturma: new Date().toISOString(), yazilim: { uygulama: 'YOLİZİ web uygulaması', tarayici: navigator.userAgent }, veri: dem().meta, maliyet: 'c = d·(1 + a·u + b·v + g·s² + λ·h) + K; 8 komşulu Dijkstra', parametreler: st.params, parametre_kilidi: st.paramsLock, ayrim_kilidi: st.lock, parametre_secimi: st.selection || null, duyarlilik: st.sweep || null, islem_gunlugu: st.log }, null, 2), 'application/json');
  $('[data-t56]', p).onclick = () => {
    const tests = testGroups(); const ms = ['M0', 'M1', 'M2'].filter((m) => st.results[m]);
    if (!st.lock) return toast('Önce ayrımı sabitleyin.');
    const ev = Object.fromEntries(ms.map((m) => [m, evaluate(st.results[m], tests)]));
    const rows = [['Tablo 5'], ['Gösterge', ...ms], ['Medyan uzaklık (m)', ...ms.map((m) => Math.round(ev[m].median))], ['%90 uzaklık (m)', ...ms.map((m) => Math.round(ev[m].p90))], ['100 m kapsama', ...ms.map((m) => ev[m].c100.toFixed(3))], ['250 m kapsama', ...ms.map((m) => ev[m].c250.toFixed(3))], ['500 m kapsama', ...ms.map((m) => ev[m].c500.toFixed(3))], ['Uzunluk (km)', ...ms.map((m) => ev[m].len.toFixed(2))], ['Yükselme (m)', ...ms.map((m) => Math.round(ev[m].asc))], [], ['Tablo 6'], ['Test grubu', 'Bölge türü', ...ms], ...tests.map((g, i) => [g.kod, regionType(g), ...ms.map((m) => Math.round(ev[m].dists[i]))])];
    download('YOLIZI_Tablo5_6.csv', toCSV(rows), 'text/csv;charset=utf-8');
  };
  $('[data-gj]', p).onclick = () => download('YOLIZI_guzergahlar.geojson', JSON.stringify({ type: 'FeatureCollection', features: ['M0', 'M1', 'M2'].filter((m) => st.results[m]).map((m) => ({ type: 'Feature', properties: { model: m, uzunluk_km: +(st.results[m].len / 1000).toFixed(3), yukselme_m: Math.round(st.results[m].asc), cozunurluk_m: st.results[m].res, parametreler: st.results[m].params }, geometry: { type: 'LineString', coordinates: st.results[m].line.map(([x, y]) => toLonLat(x, y).map((v) => +v.toFixed(6))) } })) }), 'application/geo+json');
  $('[data-all]', p).onclick = () => download(`YOLIZI_proje_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(st, null, 1), 'application/json');
  $('[data-load]', p).onchange = async (e) => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.version !== 1) throw new Error('sürüm'); if (await confirmBox('Mevcut proje verisinin yerine yedek yüklensin mi?', 'Yükle')) { replace(d); refreshLayers(); toast('Yedek yüklendi.'); } } catch { toast('Yedek okunamadı.'); } };
}

export { refreshLayers };
