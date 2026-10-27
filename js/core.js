/* ===== Núcleo: utilidades, tema, gráficos, mapas ===== */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const NFc = {};
const nf = d => NFc[d] || (NFc[d] = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '—' : nf(d).format(v);
const fmtA = v => { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); return a >= 100 ? fmt(v, 0) : a >= 10 ? fmt(v, 1) : fmt(v, 2); };
const pct = (v, d = 1) => (v == null || !isFinite(v)) ? '—' : (v > 0 ? '+' : '') + nf(d).format(v) + '%';
const vr = (a, b) => (a == null || b == null || !b) ? null : (a / b - 1) * 100;
const sum = a => a.reduce((s, x) => s + (x || 0), 0);
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DEPN = { '01': 'Amazonas', '02': 'Áncash', '03': 'Apurímac', '04': 'Arequipa', '05': 'Ayacucho', '06': 'Cajamarca', '07': 'Callao', '08': 'Cusco',
  '09': 'Huancavelica', '10': 'Huánuco', '11': 'Ica', '12': 'Junín', '13': 'La Libertad', '14': 'Lambayeque', '15': 'Lima', '16': 'Loreto', '17': 'Madre de Dios',
  '18': 'Moquegua', '19': 'Pasco', '20': 'Piura', '21': 'Puno', '22': 'San Martín', '23': 'Tacna', '24': 'Tumbes', '25': 'Ucayali', '00': 'Otros / sin ubicación' };
const DEPS = Object.keys(DEPN).filter(k => k !== '00' && k !== '07');
const title = s => String(s || '').toLowerCase().replace(/(^|[\s(\/-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
const cap = s => { s = String(s || '').trim().toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const cache = {};
const load = p => cache[p] || (cache[p] = fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); }));

/* ---- paleta desde tokens */
const P = {};
function readPalette() {
  ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'muted', 'line', 'axis', 'accent', 'nodata', 'good', 'bad',
    's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'dneg', 'dneg2', 'dmid', 'dpos2', 'dpos'].forEach(k => P[k] = cssv('--' + k));
  P.cat = [P.s1, P.s2, P.s3, P.s4, P.s5, P.s6, P.s7, P.s8];
  P.seq = [P.q1, P.q2, P.q3, P.q4, P.q5];
  P.div = [P.dneg, P.dneg2, P.dmid, P.dpos2, P.dpos];
}

/* ---- gráficos */
const charts = new Map();
function base(extra = {}) {
  return Object.assign({
    animationDuration: 400,
    textStyle: { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: P['ink-2'], fontSize: 12 },
    tooltip: { trigger: 'item', confine: true, backgroundColor: P.surface, borderColor: P.line, textStyle: { color: P.ink, fontSize: 12 },
      extraCssText: 'box-shadow:0 2px 10px rgba(0,0,0,.12);border-radius:8px;' },
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, right: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 10, textStyle: { color: P['ink-2'] }, type: 'plain' }
  }, extra);
}
const axisCat = (data, o = {}) => Object.assign({ type: 'category', data, axisLine: { lineStyle: { color: P.axis } }, axisTick: { show: false }, axisLabel: { color: P.muted } }, o);
const axisVal = (o = {}) => Object.assign({ type: 'value', splitLine: { lineStyle: { color: P.line } }, axisLabel: { color: P.muted, formatter: v => fmtShort(v) }, nameTextStyle: { color: P.muted, align: 'left' } }, o);
function fmtShort(v) { const a = Math.abs(v); if (a >= 1e9) return fmt(v / 1e9, a >= 1e10 ? 0 : 1) + ' mil M'; if (a >= 1e6) return fmt(v / 1e6, a >= 1e7 ? 0 : 1) + ' M'; if (a >= 1e3) return fmt(v / 1e3, a >= 1e4 ? 0 : 1) + ' mil'; return fmt(v, a < 10 && v % 1 ? 1 : 0); }
function draw(id, option) {
  const el = document.getElementById(id); if (!el) return null;
  let c = charts.get(id);
  if (c && c.getDom() !== el) { c.dispose(); c = null; }
  if (!c) { c = echarts.init(el, null, { renderer: 'canvas' }); charts.set(id, c); }
  c.setOption(option, true);
  return c;
}
function disposeAll() { charts.forEach(c => c.dispose()); charts.clear(); }
window.addEventListener('resize', () => charts.forEach(c => c.getDom().isConnected && c.resize()));
function noData(id, msg = 'Sin datos para la selección') {
  draw(id, base({ graphic: { type: 'text', left: 'center', top: 'middle', style: { text: msg, fill: P.muted, fontSize: 13 } }, xAxis: { show: false }, yAxis: { show: false }, series: [] }));
}

/* ---- tablas gemelas de cada gráfico */
const tables = {};
function setTable(id, cols, rows) { tables[id] = { cols, rows }; const box = document.getElementById('tb-' + id); if (box && !box.hidden) renderTable(id); }
function renderTable(id) {
  const t = tables[id], box = document.getElementById('tb-' + id); if (!t || !box) return;
  box.innerHTML = '<table><thead><tr>' + t.cols.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>' +
    t.rows.map(r => '<tr>' + r.map(v => `<td>${typeof v === 'number' ? fmtA(v) : esc(v ?? '—')}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('.tbl-btn'); if (!b) return;
  const id = b.dataset.t, box = document.getElementById('tb-' + id);
  box.hidden = !box.hidden; b.textContent = box.hidden ? 'Tabla' : 'Ocultar tabla'; if (!box.hidden) renderTable(id);
});
function card(id, h, sub = '', cls = '', chartCls = '', note = '') {
  return `<section class="card ${cls}"><div class="card-h"><div><h3 id="h-${id}">${h}</h3><p class="sub" id="s-${id}">${sub}</p></div>
  <button class="tbl-btn" type="button" data-t="${id}">Tabla</button></div><div class="chart ${chartCls}" id="${id}" role="img" aria-labelledby="h-${id}"></div>
  <div class="tablebox" id="tb-${id}" hidden></div>${note ? `<p class="note">${note}</p>` : ''}</section>`;
}
function kpi(k, v, d = '') { return `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="d">${d}</span></div>`; }
function chip(v, d = 1, inverse = false) { if (v == null || !isFinite(v)) return '<span class="chip">s/d</span>'; const up = inverse ? v < 0 : v > 0; return `<span class="chip ${v === 0 ? '' : up ? 'up' : 'down'}">${v > 0 ? '▲' : v < 0 ? '▼' : '■'} ${pct(v, d)}</span>`; }
function sel(id, opts, val, label) {
  return `<label for="${id}">${label}<select id="${id}">${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
}
function seg(id, opts, val, label) {
  return `<label>${label}<span class="seg" id="${id}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(val)}">${t}</button>`).join('')}</span></label>`;
}
function bindSeg(id, fn) { const s = document.getElementById(id); s && s.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', s).forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b.dataset.v); }); }
function bindSel(id, fn) { const s = document.getElementById(id); s && s.addEventListener('change', () => fn(s.value)); }

/* ---- estadística */
function quant(sorted, p) { if (!sorted.length) return null; const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
function boxStats(arr) {
  const s = arr.filter(v => v != null && isFinite(v)).sort((a, b) => a - b); if (s.length < 3) return null;
  const q1 = quant(s, .25), q2 = quant(s, .5), q3 = quant(s, .75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const inside = s.filter(v => v >= lo && v <= hi);
  return { box: [inside[0], q1, q2, q3, inside[inside.length - 1]], out: s.filter(v => v < lo || v > hi), n: s.length };
}
function boxOption(cats, stats, unit, color, horizontal = false) {
  const data = stats.map(s => s ? s.box : [null, null, null, null, null]);
  const out = []; stats.forEach((s, i) => s && s.out.forEach(v => out.push(horizontal ? [v, i] : [i, v])));
  const ax1 = axisCat(cats, { axisLabel: { color: P.muted, interval: 0, rotate: horizontal ? 0 : (cats.length > 12 ? 40 : 0), fontSize: 11 } });
  const ax2 = axisVal({ name: horizontal ? '' : unit, scale: true });
  return base({
    tooltip: Object.assign(base().tooltip, { formatter: p => {
      if (p.seriesType === 'boxplot') { const s = stats[p.dataIndex]; const b = s.box; return `<b>${esc(cats[p.dataIndex])}</b> · ${s.n} obs.<br>Máx. (bigote): ${fmtA(b[4])}<br>Q3: ${fmtA(b[3])}<br><b>Mediana: ${fmtA(b[2])}</b><br>Q1: ${fmtA(b[1])}<br>Mín. (bigote): ${fmtA(b[0])}<br><span style="color:${P.muted}">${unit}</span>`; }
      return `${esc(cats[horizontal ? p.value[1] : p.value[0]])}<br>Valor atípico: ${fmtA(horizontal ? p.value[0] : p.value[1])} ${unit}`; } }),
    grid: { left: 8, right: 18, top: 26, bottom: 8, containLabel: true },
    xAxis: horizontal ? ax2 : ax1, yAxis: horizontal ? Object.assign(ax1, { inverse: true }) : ax2,
    series: [{ type: 'boxplot', data, itemStyle: { color: color + '33', borderColor: color, borderWidth: 1.5 }, boxWidth: ['30%', '62%'] },
      { type: 'scatter', data: out, symbolSize: 5, itemStyle: { color: P.muted, opacity: .55 } }]
  });
}

/* ---- mapas */
const geo = {}; const geoNames = {};
async function ensureMaps() {
  if (geo.dep) return;
  const [d, p, t, w] = await Promise.all(['geo/dep.json', 'geo/prov.json', 'geo/dist.json', 'geo/world.json'].map(load));
  Object.assign(geo, { dep: d, prov: p, dist: t, world: w });
  for (const k of ['dep', 'prov', 'dist', 'world']) { geoNames[k] = {}; geo[k].features.forEach(f => geoNames[k][f.properties.id] = f.properties.name); echarts.registerMap(k, geo[k]); }
}
function subMap(level, dep) {
  if (!dep || dep === '00' || level === 'dep') return level;
  const key = `${level}_${dep}`;
  if (!geo[key]) { geo[key] = { type: 'FeatureCollection', features: geo[level].features.filter(f => f.properties.id.startsWith(dep)) }; echarts.registerMap(key, geo[key]); }
  return key;
}
function placeName(level, id) {
  if (level === 'dep') return DEPN[id] || id;
  const u = window.UBI || {};
  if (level === 'prov') { const k = Object.keys(u).find(x => x.startsWith(id)); return k ? `${title(u[k][1])} (${DEPN[id.slice(0, 2)]})` : title(geoNames.prov[id] || id); }
  const r = u[id]; return r ? `${title(r[2])} – ${title(r[1])} (${DEPN[id.slice(0, 2)]})` : title(geoNames.dist[id] || id);
}
function seqPieces(values, fmtFn) {
  const s = values.filter(v => v != null && isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!s.length) return [];
  let br = [0.2, 0.4, 0.6, 0.8].map(p => quant(s, p));
  br = [...new Set(br.map(v => +v.toPrecision(2)))];
  const edges = [s[0], ...br, s[s.length - 1]];
  const pcs = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i], hi = edges[i + 1]; if (hi <= lo && i) continue;
    const pc = { gt: i ? lo : 0, label: `${fmtFn(lo)} – ${fmtFn(hi)}` }; if (i < edges.length - 2) pc.lte = hi; pcs.push(pc);
  }
  const cols = P.seq.slice(5 - pcs.length);
  pcs.forEach((p, i) => p.color = cols[i]);
  return pcs;
}
function divPieces(t = [15, 3]) {
  return [{ lt: -t[0], color: P.div[0], label: `< −${t[0]}%` }, { gte: -t[0], lt: -t[1], color: P.div[1], label: `−${t[0]} a −${t[1]}%` },
    { gte: -t[1], lte: t[1], color: P.div[2], label: `±${t[1]}%` }, { gt: t[1], lte: t[0], color: P.div[3], label: `+${t[1]} a +${t[0]}%` }, { gt: t[0], color: P.div[4], label: `> +${t[0]}%` }];
}
/* rows: [{id, value, extra(html)}] */
function mapOption({ map, rows, kind = 'seq', unit = '', fmtFn = fmtA, level = 'dep', nameFn, center, zoom }) {
  const vals = rows.map(r => r.value);
  const pieces = kind === 'div' ? divPieces() : seqPieces(vals, fmtFn);
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  return base({
    tooltip: Object.assign(base().tooltip, { formatter: p => { const r = byId[p.name]; const nm = nameFn ? nameFn(p.name) : placeName(level, p.name);
      return `<b>${esc(nm)}</b><br>` + (r ? `${kind === 'div' ? pct(r.value) : fmtFn(r.value) + ' ' + unit}${r.extra ? '<br>' + r.extra : ''}` : '<span style="color:' + P.muted + '">Sin registro</span>'); } }),
    visualMap: { type: 'piecewise', pieces, left: 4, bottom: 6, itemWidth: 14, itemHeight: 10, itemGap: 4, textStyle: { color: P['ink-2'], fontSize: 11 }, outOfRange: { color: P.nodata }, seriesIndex: 0 },
    series: [{ type: 'map', map, nameProperty: 'id', showLegendSymbol: false, roam: true, scaleLimit: { min: 0.8, max: 25 }, center, zoom: zoom || 1.1, aspectScale: map === 'world' ? 0.85 : 1,
      data: rows.map(r => ({ name: r.id, value: r.value })),
      itemStyle: { areaColor: P.nodata, borderColor: P.surface, borderWidth: level === 'dist' ? 0.25 : 0.8 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: P.s4, borderColor: P.ink, borderWidth: 1 } }, select: { disabled: true }, label: { show: false } }]
  });
}

/* ---- tema */
function effectiveDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function setThemeLabel() { $('#themeBtn').textContent = effectiveDark() ? '◐ Modo claro' : '◐ Modo oscuro'; }
function initTheme(onChange) {
  try { const t = localStorage.getItem('ggi-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { }
  setThemeLabel();
  $('#themeBtn').addEventListener('click', () => { const t = effectiveDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('ggi-theme', t); } catch (e) { } setThemeLabel(); onChange(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { setThemeLabel(); onChange(); });
}
/* logo de respaldo si no existe img/logo_ggi.png */
function logoFallback() {
  const img = $('#logo'); if (!img) return;
  const svg = `<svg class="logo" viewBox="0 0 120 46" role="img" aria-label="Good Guys Insight"><rect x="0" y="3" width="40" height="40" rx="9" fill="var(--accent)"/><text x="20" y="30" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="17" fill="var(--accent-ink)">GGI</text><text x="48" y="20" font-family="Archivo, sans-serif" font-weight="700" font-size="12" fill="var(--ink)">Good Guys</text><text x="48" y="35" font-family="Archivo, sans-serif" font-weight="700" font-size="12" fill="var(--ink)">Insight</text></svg>`;
  const swap = () => { img.insertAdjacentHTML('afterend', svg); img.remove(); };
  if (img.complete && !img.naturalWidth) swap(); else img.addEventListener('error', swap);
}
