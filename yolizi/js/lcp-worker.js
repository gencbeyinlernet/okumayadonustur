// En düşük maliyetli yol motoru (Web Worker).
// Maliyet: c = d·(1 + a·u + b·v + g·s² + λ·h) + K   (rapordaki tanım)
//   d: hücre merkezleri arası gerçek mesafe (m); s = Δz/d; u = max(s,0); v = max(−s,0)
//   h: geliştirme kanıtlarına uzaklık cezası = min(1, uzaklık / 500 m); K: akarsu geçişi kenar cezası
// Ağ: 8 komşulu ızgara, Dijkstra (1959); geçilemeyen hücre köşelerinden çapraz geçiş yok.

let BASE = null; // {W,H,res,x0,y1,z:Float32Array,riv:Uint8Array}
const grids = {}; // çözünürlük → ızgara

const NB = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function grid(res) {
  if (grids[res]) return grids[res];
  const k = Math.round(res / BASE.res);
  if (k === 1) return (grids[res] = BASE);
  const W = Math.floor(BASE.W / k), H = Math.floor(BASE.H / k);
  const z = new Float32Array(W * H), riv = new Uint8Array(W * H);
  for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
    let s = 0, c = 0, r = 0;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      const q = (i * k + a) * BASE.W + j * k + b;
      const v = BASE.z[q];
      if (!Number.isNaN(v)) { s += v; c++; }
      r = Math.max(r, BASE.riv[q]);
    }
    z[i * W + j] = c ? s / c : NaN;
    riv[i * W + j] = r;
  }
  return (grids[res] = { W, H, res, x0: BASE.x0, y1: BASE.y1, z, riv });
}

const cellXY = (G, idx) => [G.x0 + ((idx % G.W) + 0.5) * G.res, G.y1 - (Math.floor(idx / G.W) + 0.5) * G.res];

function regionCells(G, reg) {
  const out = [];
  const r = Math.max(reg.r || 0, G.res * 0.75);
  const c0 = Math.floor((reg.x - r - G.x0) / G.res), c1 = Math.ceil((reg.x + r - G.x0) / G.res);
  const r0 = Math.floor((G.y1 - reg.y - r) / G.res), r1 = Math.ceil((G.y1 - reg.y + r) / G.res);
  for (let i = Math.max(0, r0); i <= Math.min(G.H - 1, r1); i++) for (let j = Math.max(0, c0); j <= Math.min(G.W - 1, c1); j++) {
    const idx = i * G.W + j;
    const [x, y] = cellXY(G, idx);
    if (Math.hypot(x - reg.x, y - reg.y) <= r && !Number.isNaN(G.z[idx])) out.push(idx);
  }
  return out;
}

/** Geliştirme kanıtlarına uzaklık cezası h (0–1). */
function hField(G, regions, scale = 500) {
  const h = new Float32Array(G.W * G.H).fill(1);
  if (!regions.length) return h;
  for (let idx = 0; idx < h.length; idx++) {
    const [x, y] = cellXY(G, idx);
    let m = Infinity;
    for (const g of regions) m = Math.min(m, Math.max(0, Math.hypot(x - g.x, y - g.y) - (g.r || 0)));
    h[idx] = Math.min(1, m / scale);
  }
  return h;
}

// İndeksli ikili yığın (azaltma işlemli)
class Heap {
  constructor(n, key) { this.h = new Int32Array(n); this.pos = new Int32Array(n).fill(-1); this.n = 0; this.key = key; }
  push(i) {
    let k = this.pos[i];
    if (k < 0) { k = this.n++; this.h[k] = i; this.pos[i] = k; }
    this.up(k);
  }
  pop() {
    const top = this.h[0]; this.pos[top] = -2; this.n--;
    if (this.n > 0) { const last = this.h[this.n]; this.h[0] = last; this.pos[last] = 0; this.down(0); }
    return top;
  }
  up(k) {
    const { h, pos, key } = this; const i = h[k]; const ki = key[i];
    while (k > 0) { const p = (k - 1) >> 1; if (key[h[p]] <= ki) break; h[k] = h[p]; pos[h[k]] = k; k = p; }
    h[k] = i; pos[i] = k;
  }
  down(k) {
    const { h, pos, key } = this; const i = h[k]; const ki = key[i]; const n = this.n;
    for (;;) {
      let c = 2 * k + 1; if (c >= n) break;
      if (c + 1 < n && key[h[c + 1]] < key[h[c]]) c++;
      if (key[h[c]] >= ki) break;
      h[k] = h[c]; pos[h[k]] = k; k = c;
    }
    h[k] = i; pos[i] = k;
  }
}

/** Kenar maliyeti i→j (yön komşu indeksi k). Geçilemezse Infinity. */
function makeCost(G, P, h) {
  const { W, z, riv, res } = G;
  const terrain = P.model !== 'M0';
  const lam = P.model === 'M2' ? P.lambda : 0;
  const rmin = P.riverMin || 2;
  const isR = (q) => riv[q] >= rmin;
  return (i, j, k) => {
    const zi = z[i], zj = z[j];
    if (Number.isNaN(zj) || Number.isNaN(zi)) return Infinity;
    const di = NB[k][0], dj = NB[k][1];
    const diag = di !== 0 && dj !== 0;
    const ii = Math.floor(i / W), ij = i % W;
    let river = false;
    if (diag) {
      const o1 = (ii + di) * W + ij, o2 = ii * W + ij + dj;
      if (Number.isNaN(z[o1]) || Number.isNaN(z[o2])) return Infinity; // köşeden yapay geçiş yok
      if (terrain && !isR(i) && !isR(j) && isR(o1) && isR(o2)) river = true; // akarsuyu köşeden atlama = geçiş
    }
    const d = diag ? res * Math.SQRT2 : res;
    if (!terrain) return d;
    if (isR(j)) river = true; // akarsu hücresine giriş (ve akarsu içinde ilerleme) geçiş sayılır
    const s = (zj - zi) / d;
    const u = s > 0 ? s : 0, v = s < 0 ? -s : 0;
    return d * (1 + P.a * u + P.b * v + P.g * s * s + (lam ? lam * h[j] : 0)) + (river ? P.K : 0);
  };
}

/** Tek yönlü maliyet alanı. dir='fwd': başlangıçtan; 'bwd': bitişe kalan (kenarlar ters). */
function field(G, P, h, sources, dir, targetSet) {
  const N = G.W * G.H;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new Heap(N, dist);
  const cost = makeCost(G, P, h);
  for (const s of sources) { dist[s] = 0; heap.push(s); }
  const { W, H } = G;
  let reached = -1, pops = 0;
  while (heap.n) {
    const i = heap.pop(); pops++;
    if (targetSet && targetSet.has(i)) { reached = i; break; }
    const ii = Math.floor(i / W), ij = i % W, di0 = dist[i];
    for (let k = 0; k < 8; k++) {
      const a = ii + NB[k][0], b = ij + NB[k][1];
      if (a < 0 || b < 0 || a >= H || b >= W) continue;
      const j = a * W + b;
      if (heap.pos[j] === -2) continue;
      const c = dir === 'fwd' ? cost(i, j, k) : cost(j, i, 7 - k); // ters kenar: j→i
      if (c === Infinity) continue;
      const nd = di0 + c;
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; heap.push(j); }
    }
    if ((pops & 0x3ffff) === 0) postMessage({ type: 'progress', pops, N });
  }
  return { dist, prev, reached };
}

function pathInfo(G, path) {
  let len = 0, asc = 0, desc = 0;
  const line = path.map((idx) => cellXY(G, idx));
  for (let q = 1; q < path.length; q++) {
    len += Math.hypot(line[q][0] - line[q - 1][0], line[q][1] - line[q - 1][1]);
    const dz = G.z[path[q]] - G.z[path[q - 1]];
    if (dz > 0) asc += dz; else desc -= dz;
  }
  const prof = path.map((idx, q) => [q, G.z[idx]]);
  return { line, len, asc, desc, profile: prof.filter((_, q) => q % Math.max(1, Math.floor(path.length / 400)) === 0) };
}

function route(P) {
  const G = grid(P.res);
  const h = P.model === 'M2' ? hField(G, P.dev || []) : null;
  const src = regionCells(G, P.start), dst = new Set(regionCells(G, P.end));
  if (!src.length || !dst.size) throw new Error('Başlangıç veya bitiş bölgesi çalışma alanının dışında.');
  const t0 = performance.now();
  const f = field(G, P, h, src, 'fwd', dst);
  if (f.reached < 0) throw new Error('Bitiş bölgesine ulaşılamadı.');
  const path = [];
  for (let i = f.reached; i >= 0; i = f.prev[i]) path.push(i);
  path.reverse();
  return { cost: f.dist[f.reached], ms: performance.now() - t0, res: G.res, ...pathInfo(G, path) };
}

/** Alternatif koridorlar: fwd(c)+bwd(c) ≤ (1+ε)·en iyi maliyet. */
function corridors(P) {
  const G = grid(P.res);
  const h = P.model === 'M2' ? hField(G, P.dev || []) : null;
  const src = regionCells(G, P.start), dst = regionCells(G, P.end);
  const f = field(G, P, h, src, 'fwd', null);
  const b = field(G, P, h, dst, 'bwd', null);
  let best = Infinity;
  for (const d of dst) best = Math.min(best, f.dist[d]);
  const N = G.W * G.H, mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const t = f.dist[i] + b.dist[i];
    if (t <= best * 1.05) mask[i] = 2; else if (t <= best * 1.1) mask[i] = 1;
  }
  return { W: G.W, H: G.H, res: G.res, mask, best };
}

onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      BASE = { W: m.W, H: m.H, res: m.res, x0: m.x0, y1: m.y1, z: m.z, riv: m.riv };
      postMessage({ type: 'ready', id: m.id });
    } else if (m.type === 'route') {
      postMessage({ type: 'result', id: m.id, result: route(m.P) });
    } else if (m.type === 'corridors') {
      const r = corridors(m.P);
      postMessage({ type: 'result', id: m.id, result: r }, [r.mask.buffer]);
    }
  } catch (err) {
    postMessage({ type: 'error', id: m.id, message: err.message || String(err) });
  }
};
