// DEM ve akarsu katmanını yükler; gölgelendirilmiş arazi görüntüsü ve yol motoru köprüsü.
import { toUTM, toLonLat } from './geo.js';

let DEM = null;
let worker = null, seq = 0;
const pending = new Map();
let progressCb = null;

export async function loadDEM() {
  if (DEM) return DEM;
  const base = new URL('../data/', import.meta.url);
  const [meta, zb, rb] = await Promise.all([
    fetch(new URL('meta.json', base)).then((r) => r.json()),
    fetch(new URL('dem30.i16', base)).then((r) => r.arrayBuffer()),
    fetch(new URL('akarsu30.u8', base)).then((r) => r.arrayBuffer()),
  ]);
  const zi = new Int16Array(zb), z = new Float32Array(zi.length);
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < zi.length; i++) { const v = zi[i] === -32768 ? NaN : zi[i] / 10; z[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  DEM = { meta, W: meta.width, H: meta.height, res: meta.res, x0: meta.x0, y1: meta.y1, z, riv: new Uint8Array(rb), min: mn, max: mx };
  DEM.x1 = DEM.x0 + DEM.W * DEM.res; DEM.y0 = DEM.y1 - DEM.H * DEM.res;
  return DEM;
}
export const dem = () => DEM;

/** Metre koordinatındaki yükseklik (çift doğrusal). */
export function elevAt(x, y) {
  const c = (x - DEM.x0) / DEM.res - 0.5, r = (DEM.y1 - y) / DEM.res - 0.5;
  const j = Math.floor(c), i = Math.floor(r), fx = c - j, fy = r - i;
  const g = (a, b) => DEM.z[Math.min(DEM.H - 1, Math.max(0, a)) * DEM.W + Math.min(DEM.W - 1, Math.max(0, b))];
  return (g(i, j) * (1 - fx) + g(i, j + 1) * fx) * (1 - fy) + (g(i + 1, j) * (1 - fx) + g(i + 1, j + 1) * fx) * fy;
}

/** Gölgelendirilmiş arazi + hipsometrik renk + akarsular (ImageData). */
export function hillshadeImage({ rivers = true } = {}) {
  const { W, H, z, riv, res } = DEM;
  const img = new ImageData(W, H), d = img.data;
  const az = (315 * Math.PI) / 180, alt = (45 * Math.PI) / 180;
  const ramp = [[200, [133, 170, 112]], [800, [196, 204, 138]], [1400, [214, 190, 140]], [2000, [190, 160, 130]], [2600, [235, 230, 225]], [3100, [255, 255, 255]]];
  const color = (v) => {
    for (let k = 1; k < ramp.length; k++) if (v <= ramp[k][0]) {
      const [v0, c0] = ramp[k - 1], [v1, c1] = ramp[k]; const t = Math.max(0, (v - v0) / (v1 - v0));
      return c0.map((c, q) => c + (c1[q] - c) * t);
    }
    return ramp[ramp.length - 1][1];
  };
  for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
    const q = i * W + j;
    const zl = z[i * W + Math.max(0, j - 1)], zr = z[i * W + Math.min(W - 1, j + 1)];
    const zu = z[Math.max(0, i - 1) * W + j], zd = z[Math.min(H - 1, i + 1) * W + j];
    // yüzey normali (doğu, kuzey, yukarı) ile kuzeybatıdan (315°) 45° yükseklikte gelen ışık
    const ge = (zr - zl) / (2 * res), gn = (zu - zd) / (2 * res);
    const L = Math.hypot(ge, gn, 1);
    let hs = ((-ge) * Math.sin(az) * Math.cos(alt) + (-gn) * Math.cos(az) * Math.cos(alt) + Math.sin(alt)) / L;
    hs = Math.max(0, Math.min(1, hs));
    let c = color(z[q]);
    const k = 0.35 + 0.75 * hs;
    let r = c[0] * k, g = c[1] * k, b = c[2] * k;
    if (rivers && riv[q]) { const w = riv[q] === 3 ? 0.95 : riv[q] === 2 ? 0.8 : 0.55; r = r * (1 - w) + 30 * w; g = g * (1 - w) + 110 * w; b = b * (1 - w) + 220 * w; }
    d[q * 4] = r; d[q * 4 + 1] = g; d[q * 4 + 2] = b; d[q * 4 + 3] = 255;
  }
  return img;
}

// ---- Yol motoru (Web Worker) ----
export async function engine() {
  if (worker) return worker;
  await loadDEM();
  worker = new Worker(new URL('./lcp-worker.js', import.meta.url));
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') { progressCb && progressCb(m); return; }
    const p = pending.get(m.id); if (!p) return;
    pending.delete(m.id);
    m.type === 'error' ? p.rej(new Error(m.message)) : p.res(m.result);
  };
  await call({ type: 'init', W: DEM.W, H: DEM.H, res: DEM.res, x0: DEM.x0, y1: DEM.y1, z: DEM.z.slice(), riv: DEM.riv.slice() });
  return worker;
}
function call(msg) {
  return new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); worker.postMessage({ ...msg, id }); });
}
export const onProgress = (cb) => { progressCb = cb; };

/** Bölge (lon,lat,r) → metre. */
export const toRegion = (e) => { const [x, y] = toUTM(+e.lon, +e.lat); return { x, y, r: +e.r || 0 }; };

export async function runRoute(P) { await engine(); return call({ type: 'route', P }); }
export async function runCorridors(P) { await engine(); return call({ type: 'corridors', P }); }
export { toUTM, toLonLat };
