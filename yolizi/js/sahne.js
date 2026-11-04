// 3B / sanal gerçeklik sahnesi (three.js + WebXR).
// Mod 1: masa üstü arazi modeli (döndür, büyüt, katmanları aç-kapat). Mod 2: durak çevresine ışınlanma, yatay = düşey ölçek.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { VRButton } from '../vendor/VRButton.js';
import { loadDEM, dem, hillshadeImage, elevAt } from './dem.js';
import { toUTM, toLonLat } from './geo.js';
import { S, save, log } from './store.js';
import { COLORS, MODEL_NAMES } from './map.js';
import { $, $$, esc, toast, download, toCSV, fmt } from './ui.js';

const TABLE_W = 1.4;      // masa üstü modelin genişliği (m)
const TABLE_H = 0.85;     // masa yüksekliği (m)
const EXAG = 1.5;         // üstten görünümde düşey abartı

export async function renderSahne(root) {
  root.innerHTML = '<div class="loading">3B sahne hazırlanıyor…</div>';
  const t0 = performance.now();
  await loadDEM();
  const D = dem(); const st = S();
  root.innerHTML = `
  <section class="sahne" data-s>
    <button class="btn tiny s-toggle" data-toggle>☰ Panel</button>
    <div class="s-ui" data-ui>
      <div class="s-card s-warn"><b>Not:</b> Güncel arazi yüzeyi (Copernicus DEM) 1856 yılının tam görünümünü temsil etmez. Güzergâhlar model önerisidir; belgesi olmayan han, kervan veya bina çizilmemiştir.</div>
      <div class="s-card">
        <h4>Görünüm</h4>
        <div class="row"><button class="btn tiny primary" data-mode="masa">Masa üstü model</button><button class="btn tiny" data-mode="yer">Yer seviyesi</button></div>
        <p class="small muted" data-scale></p>
        <div class="row">${['M0', 'M1', 'M2'].map((m) => `<label class="chk" style="--c:${COLORS[m]}"><input type="checkbox" data-l="${m}" checked ${st.results[m] ? '' : 'disabled'}><span>${m}</span></label>`).join('')}
          <label class="chk" style="--c:${COLORS.dev}"><input type="checkbox" data-l="kanit" checked><span>Kanıtlar</span></label></div>
        <label class="field small">Işınlan<select data-stop><option value="">— durak / bölge seçin —</option></select></label>
      </div>
      <div class="s-card"><h4>Lejant</h4>
        <div class="small">■ <b>Kaynakla belgelenmiş</b>: içi dolu iğne (geliştirme), içi boş halka (bağımsız test)<br>━ <b>Algoritmanın önerdiği</b> güzergâh: renkli tüp (M0 kesikli gri, M1 turuncu, M2 mor)<br>▢ Uç bölgeler: siyah sütun<br>Görsel bağlam: yalnızca arazi ve akarsu</div></div>
      <div class="s-card"><h4>Teknik test (Ek 3)</h4>
        <div class="row"><select data-tscene><option value="durak">Durak çevresi</option><option value="vadi">Vadi kesimi</option><option value="alan">Bütün pilot alan</option></select>
          <select data-tdur><option value="300">5 dk</option><option value="60">1 dk</option><option value="20">20 sn</option></select>
          <button class="btn tiny primary" data-test>Başlat</button></div>
        <p class="small" data-tres></p>
        <div class="row"><button class="btn tiny" data-coord>Koordinat aktarım kontrolü</button><button class="btn tiny" data-texp>Test kayıtlarını indir</button></div>
      </div>
    </div>
    <div class="s-card s-src" data-card hidden></div>
    <div class="s-stats" data-stats></div>
  </section>`;
  const box = $('[data-s]', root);

  // ---- three.js temel ----
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcbd5e1);
  scene.fog = new THREE.Fog(0xcbd5e1, 8000, 40000);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 60000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b7d6b, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-1, 2, 1); scene.add(sun);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // sahne koordinatı: yerel metre (merkez = alan ortası, y yukarı, -z kuzey)
  const CX = (D.x0 + D.x1) / 2, CY = (D.y0 + D.y1) / 2, Z0 = Math.floor(D.min);
  const toScene = (x, y, z, k, ex) => new THREE.Vector3((x - CX) * k, (z - Z0) * k * ex, -(y - CY) * k);
  const fromScene = (v, k, ex) => [v.x / k + CX, -v.z / k + CY, v.y / (k * ex) + Z0];

  // arazi dokusu (gölgelendirme + akarsu)
  const img = hillshadeImage();
  const tcv = document.createElement('canvas'); tcv.width = D.W; tcv.height = D.H; tcv.getContext('2d').putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(tcv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  function terrainMesh(x0, y0, x1, y1, step, k, ex) {
    const nx = Math.max(2, Math.round((x1 - x0) / step) + 1), ny = Math.max(2, Math.round((y1 - y0) / step) + 1);
    const geo = new THREE.PlaneGeometry(1, 1, nx - 1, ny - 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) {
      const q = i * nx + j; const x = x0 + (j / (nx - 1)) * (x1 - x0), y = y1 - (i / (ny - 1)) * (y1 - y0);
      const v = toScene(x, y, elevAt(x, y), k, ex);
      pos.setXYZ(q, v.x, v.y, v.z);
      uv.setXY(q, (x - D.x0) / (D.x1 - D.x0), (y - D.y0) / (D.y1 - D.y0));
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    m.userData.tris = (nx - 1) * (ny - 1) * 2;
    return m;
  }

  function routeTube(line, color, k, ex, radius, dashed, lift = 6) {
    const pts = line.filter((_, i) => i % 2 === 0 || i === line.length - 1).map(([x, y]) => toScene(x, y, elevAt(x, y) + lift, k, ex));
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, Math.min(4000, pts.length * 2), radius, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: dashed, opacity: dashed ? 0.75 : 1 });
    return new THREE.Mesh(g, mat);
  }

  function marker(e, k, ex, size) {
    const [x, y] = toUTM(+e.lon, +e.lat); const z = elevAt(x, y);
    const g = new THREE.Group(); const base = toScene(x, y, z, k, ex);
    if (e.rol === 'test') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 1.2, size * 0.28, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.test }));
      ring.rotation.x = Math.PI / 2; ring.position.copy(base).add(new THREE.Vector3(0, size * 3, 0)); g.add(ring);
    } else {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshLambertMaterial({ color: COLORS.dev }));
      pin.position.copy(base).add(new THREE.Vector3(0, size * 3, 0)); g.add(pin);
    }
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.12, size * 0.12, size * 3, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    stick.position.copy(base).add(new THREE.Vector3(0, size * 1.5, 0)); g.add(stick);
    g.userData = { ev: e, utm: [x, y, z] };
    return g;
  }
  function pillar(e, k, ex, size) {
    const [x, y] = toUTM(+e.lon, +e.lat); const z = elevAt(x, y);
    const m = new THREE.Mesh(new THREE.BoxGeometry(size * 1.4, size * 6, size * 1.4), new THREE.MeshLambertMaterial({ color: 0x111827 }));
    m.position.copy(toScene(x, y, z, k, ex)).add(new THREE.Vector3(0, size * 3, 0));
    m.userData = { ev: { ...e, kod: e.name, rol: 'uc' }, utm: [x, y, z] };
    return m;
  }

  // ---- içerik ----
  const world = new THREE.Group(); scene.add(world);
  let mode = 'masa', k = TABLE_W / (D.x1 - D.x0), ex = EXAG, layers = {}, markers = [], tris = 0;
  const stops = [
    ...['start', 'end'].map((s) => ({ ...st.endpoints[s], kod: st.endpoints[s].name, rol: 'uc' })),
    ...st.evidence,
  ];
  if (st.results.M1) { // M1 güzergâhının en yüksek noktası (geçit) — model önerisi olarak
    let best = null; for (const [x, y] of st.results.M1.line) { const z = elevAt(x, y); if (!best || z > best.z) best = { x, y, z }; }
    const [lon, lat] = toLonLat(best.x, best.y);
    stops.push({ kod: 'M1 en yüksek noktası (model önerisi)', lon, lat, r: 0, rol: 'model' });
  }
  const sel = $('[data-stop]', root);
  sel.innerHTML += stops.map((s, i) => `<option value="${i}">${esc(s.kod)}${s.ad ? ' · ' + esc(s.ad) : ''}</option>`).join('');

  function build(center) {
    world.clear(); markers = []; layers = {}; tris = 0;
    let terr;
    if (mode === 'masa') {
      k = TABLE_W / (D.x1 - D.x0); ex = EXAG;
      terr = terrainMesh(D.x0, D.y0, D.x1, D.y1, 120, k, ex);
      world.position.set(0, TABLE_H, -0.9);
      const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W * 1.08, 0.04, TABLE_W * 1.0), new THREE.MeshLambertMaterial({ color: 0x8b6f4e }));
      table.position.set(0, -0.025, 0); world.add(table);
    } else {
      k = 1; ex = 1; // yer seviyesinde yatay ve düşey ölçek eşit
      const c = center || { x: CX, y: CY }; const R = 4000;
      terr = terrainMesh(Math.max(D.x0, c.x - R), Math.max(D.y0, c.y - R), Math.min(D.x1, c.x + R), Math.min(D.y1, c.y + R), 30, k, ex);
      world.position.set(0, 0, 0);
    }
    world.add(terr); tris += terr.userData.tris;
    const rad = mode === 'masa' ? 0.0035 : 2.5, msz = mode === 'masa' ? 0.006 : 6, lift = mode === 'masa' ? 60 : 3;
    for (const m of ['M0', 'M1', 'M2']) {
      const r = st.results[m]; if (!r) continue;
      let line = r.line;
      if (mode === 'yer' && center) line = line.filter(([x, y]) => Math.hypot(x - center.x, y - center.y) < 4000);
      if (line.length < 2) continue;
      const tube = routeTube(line, COLORS[m], k, ex, rad, m === 'M0', lift);
      tube.visible = $(`[data-l="${m}"]`, root).checked; layers[m] = tube; world.add(tube);
    }
    const kg = new THREE.Group(); layers.kanit = kg; kg.visible = $('[data-l="kanit"]', root).checked; world.add(kg);
    for (const e of st.evidence) { const mk = marker(e, k, ex, msz); kg.add(mk); markers.push(mk); }
    for (const s of ['start', 'end']) { const p = pillar(st.endpoints[s], k, ex, msz); world.add(p); markers.push(p); }
    $('[data-scale]', root).textContent = mode === 'masa'
      ? `Ölçek ≈ 1:${fmt(1 / k)} · düşey abartı ×${EXAG} (yalnız üstten görünümde)`
      : 'Yer seviyesi: yatay ve düşey ölçek eşit (1:1), 8 × 8 km çevre';
    return terr;
  }

  function setMode(m, center) {
    mode = m;
    $$('[data-mode]', root).forEach((b) => b.classList.toggle('primary', b.dataset.mode === m));
    const terr = build(center);
    if (m === 'masa') {
      camera.near = 0.01; camera.far = 50; scene.fog.near = 20; scene.fog.far = 60;
      camera.position.set(0.15, TABLE_H + 0.75, 0.15); controls.target.set(0, TABLE_H, -0.9);
      controls.minDistance = 0.2; controls.maxDistance = 4;
    } else {
      const c = center || { x: CX, y: CY, z: elevAt(CX, CY) };
      const p = toScene(c.x, c.y, (c.z ?? elevAt(c.x, c.y)) + 1.7, k, ex);
      camera.near = 0.5; camera.far = 30000; scene.fog.near = 3000; scene.fog.far = 9000;
      camera.position.set(p.x + 350, p.y + 220, p.z + 350); controls.target.copy(p);
      controls.minDistance = 5; controls.maxDistance = 6000;
    }
    camera.updateProjectionMatrix(); controls.update();
    return terr;
  }

  // ---- kaynak kartı ----
  const card = $('[data-card]', root);
  function showCard(e) {
    if (!e) { card.hidden = true; return; }
    card.hidden = false;
    card.innerHTML = e.rol === 'uc' ? `<h4>${esc(e.kod)}</h4><p class="small">Uç bölge: modele verilen bilgi (başarı hesabına katılmaz). Yarıçap ${fmt(e.r)} m.</p><button class="btn tiny" data-cclose>Kapat</button>`
      : e.rol === 'model' ? `<h4>${esc(e.kod)}</h4><p class="small">Algoritmanın önerdiği güzergâh üzerindeki nokta; kaynakla belgelenmiş değildir.</p><button class="btn tiny" data-cclose>Kapat</button>`
      : `<h4>${esc(e.kod)} · ${esc(e.ad || '')}</h4><dl class="card-dl small"><dt>Kaynak</dt><dd>${esc(e.aile || '–')} ${e.konum ? '· ' + esc(e.konum) : ''}</dd><dt>Belge tarihi</dt><dd>${esc(e.tarih || '–')}</dd><dt>Yer adı eşleşmesi</dt><dd>${esc(e.guncel || '–')}</dd><dt>Konum belirsizliği</dt><dd>${fmt(e.r)} m</dd><dt>Rol</dt><dd>${e.rol === 'test' ? 'Bağımsız test' : 'Geliştirme'}</dd><dt>Not</dt><dd>${esc(e.not || '–')}</dd></dl><button class="btn tiny" data-cclose>Kapat</button>`;
    $('[data-cclose]', card).onclick = () => showCard(null);
    if (renderer.xr.isPresenting) vrCard(e);
  }
  // VR içinde kart: tuval dokulu panel
  let vrPanel = null;
  function vrCard(e) {
    const c = document.createElement('canvas'); c.width = 768; c.height = 432; const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.96)'; x.fillRect(0, 0, 768, 432); x.fillStyle = '#111'; x.font = 'bold 34px sans-serif';
    x.fillText(`${e.kod} ${e.ad ? '· ' + e.ad : ''}`.slice(0, 40), 24, 56); x.font = '26px sans-serif';
    [`Kaynak: ${e.aile || '–'}`, `Belge tarihi: ${e.tarih || '–'}`, `Yer adı eşleşmesi: ${e.guncel || '–'}`, `Konum belirsizliği: ${e.r ?? '–'} m`, `Rol: ${e.rol === 'test' ? 'bağımsız test' : e.rol === 'uc' ? 'uç bölge' : e.rol === 'model' ? 'model önerisi' : 'geliştirme'}`]
      .forEach((t, i) => x.fillText(t.slice(0, 52), 24, 116 + i * 52));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (vrPanel) scene.remove(vrPanel);
    vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    const cam = renderer.xr.getCamera(); const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    vrPanel.position.copy(cam.position).add(dir.multiplyScalar(1.1)); vrPanel.lookAt(cam.position); scene.add(vrPanel);
  }

  // ---- seçme (fare / dokunma) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(markers, true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.ev) o = o.parent; showCard(o && o.userData.ev); }
  });

  // ---- denetimler ----
  $$('[data-mode]', root).forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $('[data-toggle]', root).onclick = () => { const u = $('[data-ui]', root); u.hidden = !u.hidden; };
  $$('[data-l]', root).forEach((cb) => (cb.onchange = () => { if (layers[cb.dataset.l]) layers[cb.dataset.l].visible = cb.checked; }));
  sel.onchange = () => {
    const s = stops[+sel.value]; if (!s) return;
    const [x, y] = toUTM(+s.lon, +s.lat);
    setMode('yer', { x, y, z: elevAt(x, y) }); showCard(s);
  };

  // ---- WebXR ----
  let vrButton = null;
  if ('xr' in navigator) {
    vrButton = VRButton.createButton(renderer);
    vrButton.classList.add('vr-btn'); box.appendChild(vrButton);
  } else {
    const n = document.createElement('div'); n.className = 's-card vr-btn small'; n.textContent = 'Bu tarayıcıda WebXR yok; masaüstü görünümü kullanılıyor.'; box.appendChild(n);
  }
  // kumanda: tetik → işaret seçme (masa) / ışınlanma (yer); başparmak çubuğu → 30° kademeli dönüş
  const ctrls = [0, 1].map((i) => {
    const c = renderer.xr.getController(i); scene.add(c);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff })); ln.scale.z = 5; c.add(ln);
    c.addEventListener('selectstart', () => onSelect(c));
    return c;
  });
  let baseRef = null, yaw = 0, offset = new THREE.Vector3();
  renderer.xr.addEventListener('sessionstart', () => {
    baseRef = renderer.xr.getReferenceSpace(); yaw = 0; offset.set(0, 0, 0);
    log('VR oturumu başladı', { mod: mode }); if (mode === 'masa') world.position.set(0, TABLE_H, -0.9);
  });
  renderer.xr.addEventListener('sessionend', () => log('VR oturumu bitti', { mod: mode }));
  function applyRef() {
    if (!baseRef) return;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const t = new XRRigidTransform({ x: -offset.x, y: -offset.y, z: -offset.z }, { x: q.x, y: q.y, z: q.z, w: q.w });
    renderer.xr.setReferenceSpace(baseRef.getOffsetReferenceSpace(t));
  }
  function onSelect(c) {
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
    const hit = ray.intersectObjects(markers, true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.ev) o = o.parent; if (o) { showCard(o.userData.ev); return; } }
    if (mode === 'yer') { const th = ray.intersectObject(world.children.find((o) => o.isMesh && o.userData.tris), false)[0]; if (th) { offset.set(th.point.x, th.point.y, th.point.z); applyRef(); } }
  }
  let turnLock = 0;
  function pollGamepads() {
    const s = renderer.xr.getSession(); if (!s) return;
    for (const src of s.inputSources) {
      const gp = src.gamepad; if (!gp || gp.axes.length < 4) continue;
      const ax = gp.axes[2];
      if (Math.abs(ax) > 0.7 && performance.now() > turnLock) { yaw += ax > 0 ? -Math.PI / 6 : Math.PI / 6; applyRef(); turnLock = performance.now() + 350; }
    }
  }

  // ---- teknik test: kare süreleri ----
  let test = null, last = performance.now(), frames = [];
  const stats = $('[data-stats]', root);
  const resize = () => { const r = box.getBoundingClientRect(); renderer.setSize(r.width, r.height); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(box); resize();
  setMode('masa');
  const loadMs = performance.now() - t0;

  renderer.setAnimationLoop((t, frame) => {
    const now = performance.now(), dt = now - last; last = now;
    frames.push(dt); if (frames.length > 240) frames.shift();
    if (test) test.dts.push(dt);
    if (!renderer.xr.isPresenting) controls.update(); else pollGamepads();
    renderer.render(scene, camera);
    if ((frames.length & 15) === 0) {
      const s = [...frames].sort((a, b) => a - b), med = s[s.length >> 1];
      stats.textContent = `${Math.round(1000 / med)} kare/sn · ${fmt(tris)} üçgen · yükleme ${fmt(loadMs)} ms${test ? ` · test ${Math.round((now - test.t0) / 1000)}/${test.dur} sn` : ''}`;
    }
    if (test && now - test.t0 >= test.dur * 1000) finishTest();
  });

  function startTest() {
    if (test) return toast('Test sürüyor.');
    const scn = $('[data-tscene]', root).value, dur = +$('[data-tdur]', root).value;
    const l0 = performance.now();
    if (scn === 'alan') setMode('masa');
    else {
      const s = scn === 'durak' ? stops.find((x) => x.rol !== 'uc') || stops[0] : stops.find((x) => x.rol === 'model') || stops[0];
      const [x, y] = toUTM(+s.lon, +s.lat); setMode('yer', { x, y, z: elevAt(x, y) });
    }
    const load = performance.now() - l0;
    // etkin yenileme hızı: XR'de oturumun bildirdiği, değilse 2 sn ölçümün ortancası (sonra)
    test = { scene: scn, dur, t0: performance.now(), dts: [], load, tris, xr: renderer.xr.isPresenting, rate: renderer.xr.getSession()?.frameRate || null };
    $('[data-tres]', root).textContent = 'Test sürüyor…';
  }
  function finishTest() {
    const T = test; test = null;
    const d = T.dts.slice(5); const s = [...d].sort((a, b) => a - b);
    // etkin yenileme hızı: XR oturumunun bildirdiği; yoksa en hızlı karelerden (%10'luk) en yakın standart değer
    const p10 = s[Math.floor(s.length * 0.1)] || 16.7;
    const rate = T.rate || [30, 60, 72, 90, 120, 144].reduce((a, b) => (Math.abs(1000 / b - p10) < Math.abs(1000 / a - p10) ? b : a));
    const budget = 1000 / rate;
    const within = d.filter((x) => x <= budget * 1.05).length / d.length;
    const rec = { t: new Date().toISOString(), sahne: T.scene, sure_sn: T.dur, xr: T.xr, tarayici: navigator.userAgent, ag: navigator.connection?.effectiveType || 'bilinmiyor', ucgen: T.tris, yukleme_ms: Math.round(T.load), kare: d.length, yenileme_hz: rate, butce_ms: +budget.toFixed(2), butce_ici_oran: +within.toFixed(4), ortanca_ms: +s[s.length >> 1].toFixed(2), p95_ms: +s[Math.floor(s.length * 0.95)].toFixed(2), oturum: 'tamamlandı' };
    st.vrtests.push(rec); save(); log('VR teknik testi', rec);
    $('[data-tres]', root).innerHTML = `${T.scene}: ${d.length} kare, bütçe ${rec.butce_ms} ms (${rate} Hz); bütçe içi <b>%${(within * 100).toFixed(1)}</b> ${within >= 0.95 ? '✅' : '⚠️'} · yükleme ${rec.yukleme_ms} ms`;
  }
  function coordCheck() {
    // analiz koordinatı → sahne → geri dönüşüm; ve her kartın bağlı olduğu işaretin konumu
    const kNow = k, exNow = ex; let maxErr = 0, n = 0, wrong = 0;
    const pts = [...stops];
    for (const s of pts) {
      const [x, y] = toUTM(+s.lon, +s.lat); const z = elevAt(x, y);
      const v = toScene(x, y, z, kNow, exNow); const [bx, by, bz] = fromScene(v, kNow, exNow);
      const [lon2, lat2] = toLonLat(bx, by); const [x2, y2] = toUTM(lon2, lat2);
      maxErr = Math.max(maxErr, Math.hypot(x2 - x, y2 - y, bz - z)); n++;
    }
    for (const mk of markers) {
      const e = mk.userData.ev; if (!e || e.lon == null) continue;
      const [x, y] = toUTM(+e.lon, +e.lat); if (Math.hypot(x - mk.userData.utm[0], y - mk.userData.utm[1]) > 1) wrong++;
    }
    const rec = { t: new Date().toISOString(), tur: 'koordinat', mod: mode, kontrol_konumu: n, en_buyuk_fark_m: +maxErr.toExponential(3), yanlis_kart: wrong };
    st.vrtests.push(rec); save(); log('Koordinat aktarım kontrolü', rec);
    $('[data-tres]', root).innerHTML = `Koordinat aktarımı: ${n} konum, en büyük fark <b>${maxErr < 0.001 ? '< 1 mm' : fmt(maxErr, 3) + ' m'}</b> ${maxErr <= 1 ? '✅' : '⚠️'} · yanlış yere bağlanan kart: <b>${wrong}</b>${n < 6 ? ' · en az 6 kontrol konumu için kanıt ekleyin' : ''}`;
  }
  $('[data-test]', root).onclick = startTest;
  $('[data-coord]', root).onclick = coordCheck;
  $('[data-texp]', root).onclick = () => {
    const keys = ['t', 'tur', 'sahne', 'mod', 'sure_sn', 'xr', 'tarayici', 'ag', 'ucgen', 'yukleme_ms', 'kare', 'yenileme_hz', 'butce_ms', 'butce_ici_oran', 'ortanca_ms', 'p95_ms', 'oturum', 'kontrol_konumu', 'en_buyuk_fark_m', 'yanlis_kart'];
    download('YOLIZI_Ek3_VR_test_kayitlari.csv', toCSV([keys, ...st.vrtests.map((r) => keys.map((k2) => r[k2] ?? ''))]), 'text/csv;charset=utf-8');
  };

  return {
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
      const s = renderer.xr.getSession(); if (s) s.end();
      renderer.dispose(); tex.dispose();
    },
  };
}
