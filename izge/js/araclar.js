// Optik araçlar: kırınım ızgarası denklemi (d·sin θ = m·λ), çözme gücü, Şekil 2 optik yol şeması.
import { LINES } from './spectro.js';
import { $, $$, esc, download, fmt } from './ui.js';

const ALL = [...LINES.cal, LINES.val, { el: 'Hg I', nm: 576.9598 }, { el: 'Hg I', nm: 579.0663 }];

export function renderAraclar(root) {
  const p = { lpmm: 600, m: 1, L: 140, G: 25, alpha: 20, fcol: 75, width: 10 };
  root.innerHTML = `<section class="doc wide"><h2>Optik araçlar</h2>
    <div class="box"><h4>Kırınım ızgarası: d·sin θ = m·λ</h4>
      <div class="row"><label class="field small">Çizgi yoğunluğu (çizgi/mm)<input type="number" data-p="lpmm" value="600"></label><label class="field small">Mertebe m<input type="number" data-p="m" value="1" min="1" max="3"></label><label class="field small">Aydınlatılan genişlik (mm)<input type="number" data-p="width" value="10" step="0.5"></label></div>
      <div data-gr></div></div>
    <div class="box"><h4>Şekil 2. Optik yol ve geometri değişkenleri</h4>
      <div class="row"><label class="field small">L: yarık–ızgara (mm)<input type="number" data-p="L" value="140"></label><label class="field small">G: ızgara–objektif (mm)<input type="number" data-p="G" value="25"></label><label class="field small">α: kamera açısı (°)<input type="number" data-p="alpha" value="20"></label><label class="field small">Kolimatör odak uzaklığı (mm)<input type="number" data-p="fcol" value="75"></label></div>
      <div data-fig></div>
      <div class="row"><button class="btn tiny" data-svg>⬇ SVG</button><button class="btn tiny" data-png>⬇ PNG</button></div>
      <p class="muted small">Şema ölçekli değildir; ölçüler ve açılar etiketlenmiştir. G, sensör değil objektif ön merkezi uzaklığıdır (sensörün gövde içindeki konumu bilinmez).</p></div></section>`;
  const upd = () => {
    $$('[data-p]', root).forEach((i) => (p[i.dataset.p] = +i.value));
    const d = 1e6 / p.lpmm; // nm
    $('[data-gr]', root).innerHTML = `<p class="small">d = ${fmt(d / 1000, 3)} µm · kuramsal ayırma gücü R = m·N = ${fmt(p.m * p.lpmm * p.width, 0)} (546 nm'de Δλ ≈ ${fmt(LINES.main / (p.m * p.lpmm * p.width), 4)} nm). Gerçek cihazda ölçülen çizgi genişliğini yarık görüntüsü, mercek kusurları, hizalama ve piksel örneklemesi belirler.</p>
      <table class="tbl small"><thead><tr><th>Çizgi</th><th>λ (nm, havada)</th><th>θ (°), dik geliş</th><th>Kamera eksenine göre (θ − α)</th></tr></thead><tbody>
      ${ALL.map((l) => { const s = (p.m * l.nm) / d; return `<tr><td>${l.el}</td><td>${l.nm.toFixed(4)}</td><td>${s < 1 ? fmt((Math.asin(s) * 180) / Math.PI, 2) : 'oluşmaz'}</td><td>${s < 1 ? fmt((Math.asin(s) * 180) / Math.PI - p.alpha, 2) : '–'}</td></tr>`; }).join('')}</tbody></table>
      <p class="muted small">Değerler başlangıç hizalaması için hesaplanan tasarım değerleridir; ölçüm sonucu değildir.</p>`;
    $('[data-fig]', root).innerHTML = schematic(p, d);
  };
  $$('[data-p]', root).forEach((i) => (i.oninput = upd)); upd();
  $('[data-svg]', root).onclick = () => download('IZGE_Sekil2_optik_yol.svg', $('[data-fig] svg', root).outerHTML, 'image/svg+xml');
  $('[data-png]', root).onclick = () => svgToPng($('[data-fig] svg', root), 'IZGE_Sekil2_optik_yol.png');
}

export function schematic(p, d = 1e6 / 600) {
  const W = 1000, H = 470, cy = 250;
  const xs = 70, xsl = 165, xc = 310, xg = 560; // kaynak, yarık, kolimatör, ızgara (şematik, ölçekli değil)
  const th = (nm) => Math.asin(nm / d);
  const a = (p.alpha * Math.PI) / 180, Gpx = 230 + p.G * 2;
  const ux = Math.cos(a), uy = -Math.sin(a);              // kamera ekseni birim vektörü (yukarı açı)
  const nx = -uy, ny = ux;                                  // eksene dik (aşağı doğru)
  const lens = { x: xg + Gpx * ux, y: cy + Gpx * uy };      // objektif ön merkezi
  const ray = (nm, col) => { const t = th(nm); const R = Gpx / Math.cos(t - a); return `<line x1="${xg}" y1="${cy}" x2="${xg + R * Math.cos(t)}" y2="${cy - R * Math.sin(t)}" stroke="${col}" stroke-width="2.6" opacity=".9"/>`; };
  const arc = (r, a0, a1, col, w = 1.6) => `<path d="M${xg + r * Math.cos(a0)} ${cy - r * Math.sin(a0)} A ${r} ${r} 0 0 0 ${xg + r * Math.cos(a1)} ${cy - r * Math.sin(a1)}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
  const t546 = th(546.0735), off = 72; // G ölçü çizgisi kamera ekseninin altında, paralel
  const g0 = { x: xg + nx * off, y: cy + ny * off }, g1 = { x: lens.x + nx * off, y: lens.y + ny * off };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:980px;background:#fff" font-family="Inter, sans-serif">
  <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#334155"/></marker></defs>
  <text x="20" y="30" font-size="19" font-weight="800">İZGE optik yolu (üstten şematik görünüm, ölçekli değil)</text>
  <rect x="${xs - 30}" y="${cy - 30}" width="50" height="60" rx="10" fill="#fde68a" stroke="#b45309" stroke-width="2"/><text x="${xs - 5}" y="${cy + 52}" font-size="14" text-anchor="middle">Referans kaynak</text><text x="${xs - 5}" y="${cy + 69}" font-size="12" text-anchor="middle" fill="#555">(Hg / Ne)</text>
  <line x1="${xs + 20}" y1="${cy}" x2="${xsl}" y2="${cy}" stroke="#f59e0b" stroke-width="3"/>
  <rect x="${xsl - 4}" y="${cy - 60}" width="8" height="52" fill="#111"/><rect x="${xsl - 4}" y="${cy + 8}" width="8" height="52" fill="#111"/><text x="${xsl}" y="${cy - 70}" font-size="14" text-anchor="middle">Yarık</text>
  <path d="M${xsl} ${cy} L${xc} ${cy - 46} M${xsl} ${cy} L${xc} ${cy + 46}" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity=".7"/>
  <ellipse cx="${xc}" cy="${cy}" rx="12" ry="58" fill="#bae6fd" stroke="#0369a1" stroke-width="2"/><text x="${xc}" y="${cy - 70}" font-size="14" text-anchor="middle">Kolimatör</text><text x="${xc}" y="${cy + 78}" font-size="12" text-anchor="middle" fill="#555">f ≈ ${p.fcol} mm</text>
  <path d="M${xc} ${cy - 46} L${xg} ${cy - 46} M${xc} ${cy + 46} L${xg} ${cy + 46} M${xc} ${cy} L${xg} ${cy}" stroke="#f59e0b" stroke-width="1.5" opacity=".7"/>
  <rect x="${xg - 5}" y="${cy - 70}" width="10" height="140" fill="#c4b5fd" stroke="#6d28d9" stroke-width="2"/><text x="${xg}" y="${cy + 90}" font-size="14" text-anchor="middle">Geçirgen ızgara</text><text x="${xg}" y="${cy + 107}" font-size="12" text-anchor="middle" fill="#555">600 çizgi/mm</text>
  <line x1="${xg}" y1="${cy}" x2="${W - 60}" y2="${cy}" stroke="#94a3b8" stroke-dasharray="6 5"/><text x="${W - 60}" y="${cy + 18}" font-size="12" fill="#555" text-anchor="end">giriş optik ekseni (0. mertebe)</text>
  <line x1="${xg}" y1="${cy}" x2="${lens.x + 80 * ux}" y2="${lens.y + 80 * uy}" stroke="#334155" stroke-dasharray="3 4"/>
  ${ray(404.6563, '#7c3aed')}${ray(435.8328, '#2563eb')}${ray(546.0735, '#16a34a')}${ray(692.9467, '#dc2626')}
  ${arc(95, 0, t546, '#16a34a')}<line x1="${xg + 95 * Math.cos(t546 / 2)}" y1="${cy - 95 * Math.sin(t546 / 2)}" x2="${xg + 70}" y2="${cy - 115}" stroke="#16a34a" stroke-width="1"/>
  <text x="${xg + 66}" y="${cy - 121}" font-size="14" fill="#16a34a" text-anchor="end">θ₅₄₆ ≈ ${fmt((t546 * 180) / Math.PI, 1)}° (1. mertebe)</text>
  ${arc(165, 0, a, '#334155', 1.8)}<text x="${xg + 172 * Math.cos(a / 2) + 6}" y="${cy - 172 * Math.sin(a / 2) + 5}" font-size="15" font-weight="700">α = ${p.alpha}°</text>
  <g transform="translate(${lens.x} ${lens.y}) rotate(${-p.alpha})"><rect x="0" y="-26" width="74" height="52" rx="8" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><rect x="-14" y="-16" width="14" height="32" rx="3" fill="#475569"/></g>
  <text x="${lens.x + 34 * ux}" y="${lens.y - 46}" font-size="14" text-anchor="middle">Web kamerası</text>
  <line x1="${xg}" y1="${cy}" x2="${g0.x + nx * 8}" y2="${g0.y + ny * 8}" stroke="#94a3b8" stroke-width="1"/><line x1="${lens.x - 14 * ux}" y1="${lens.y - 14 * uy}" x2="${g1.x - 14 * ux + nx * 8}" y2="${g1.y - 14 * uy + ny * 8}" stroke="#94a3b8" stroke-width="1"/>
  <line x1="${g0.x}" y1="${g0.y}" x2="${g1.x - 14 * ux}" y2="${g1.y - 14 * uy}" stroke="#334155" stroke-width="1.5" marker-start="url(#ar)" marker-end="url(#ar)"/>
  <text x="${g1.x + 10}" y="${g1.y + 26}" font-size="15" font-weight="700">G = ${p.G} mm</text>
  <line x1="${xsl}" y1="${cy + 135}" x2="${xg}" y2="${cy + 135}" stroke="#334155" stroke-width="1.5" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="${(xsl + xg) / 2}" y="${cy + 156}" font-size="15" font-weight="700" text-anchor="middle">L = ${p.L} mm (yarık–ızgara)</text>
  <g font-size="12"><rect x="20" y="${H - 46}" width="12" height="12" fill="#7c3aed"/><text x="38" y="${H - 36}">404,66 nm</text><rect x="120" y="${H - 46}" width="12" height="12" fill="#2563eb"/><text x="138" y="${H - 36}">435,83 nm</text><rect x="220" y="${H - 46}" width="12" height="12" fill="#16a34a"/><text x="238" y="${H - 36}">546,07 nm (ana çizgi)</text><rect x="390" y="${H - 46}" width="12" height="12" fill="#dc2626"/><text x="408" y="${H - 36}">692,95 nm</text>
  <text x="20" y="${H - 14}" fill="#555">Kırınım açıları dik geliş varsayımıyla hesaplanmıştır (d·sin θ = m·λ, d = ${fmt(d / 1000, 3)} µm). G: ızgara merkezi ile kamera objektifinin ön merkezi arası.</text></g></svg>`;
}

export function svgToPng(svg, name, scale = 2) {
  const xml = new XMLSerializer().serializeToString(svg); const img = new Image();
  const vb = svg.viewBox.baseVal; const c = document.createElement('canvas'); c.width = vb.width * scale; c.height = vb.height * scale;
  img.onload = () => { const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => download(name, b), 'image/png'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}
