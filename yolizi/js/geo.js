// WGS 84 ↔ UTM 37N (EPSG:32637) dönüşümü: Krüger serileri (Karney, 2011), milimetre düzeyinde doğruluk.
const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, E0 = 500000, N0 = 0, lon0 = (39 * Math.PI) / 180;
const n = f / (2 - f), n2 = n * n, n3 = n2 * n;
const A = (a / (1 + n)) * (1 + n2 / 4 + (n2 * n2) / 64);
const al = [n / 2 - (2 * n2) / 3 + (5 * n3) / 16, (13 * n2) / 48 - (3 * n3) / 5, (61 * n3) / 240];
const be = [n / 2 - (2 * n2) / 3 + (37 * n3) / 96, n2 / 48 + n3 / 15, (17 * n3) / 480];
const de = [2 * n - (2 * n2) / 3 - 2 * n3, (7 * n2) / 3 - (8 * n3) / 5, (56 * n3) / 15];
const c2 = (2 * Math.sqrt(n)) / (1 + n);

export function toUTM(lon, lat) {
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180 - lon0;
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - c2 * Math.atanh(c2 * Math.sin(phi)));
  const xi = Math.atan2(t, Math.cos(lam)), eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  let E = eta, N = xi;
  for (let j = 1; j <= 3; j++) {
    E += al[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
    N += al[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
  }
  return [E0 + k0 * A * E, N0 + k0 * A * N];
}

export function toLonLat(E, N) {
  const xi = (N - N0) / (k0 * A), eta = (E - E0) / (k0 * A);
  let xp = xi, ep = eta;
  for (let j = 1; j <= 3; j++) {
    xp -= be[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    ep -= be[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
  let phi = chi;
  for (let j = 1; j <= 3; j++) phi += de[j - 1] * Math.sin(2 * j * chi);
  const lam = lon0 + Math.atan2(Math.sinh(ep), Math.cos(xp));
  return [(lam * 180) / Math.PI, (phi * 180) / Math.PI];
}

export const fmtLonLat = (lon, lat) => `${lat.toFixed(5)}° K, ${lon.toFixed(5)}° D`;

/** Nokta ile doğru parçası arasındaki en kısa uzaklık (m). */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Çoklu çizgiye (metre koordinatları [[x,y],...]) uzaklık. */
export function lineDist(px, py, line) {
  let m = Infinity;
  for (let i = 1; i < line.length; i++) m = Math.min(m, segDist(px, py, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]));
  return line.length === 1 ? Math.hypot(px - line[0][0], py - line[0][1]) : m;
}
