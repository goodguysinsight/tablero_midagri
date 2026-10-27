/* ===== Pestañas: Panorama VBP, Producción agrícola, Campaña agrícola, Pecuario ===== */
'use strict';
const TABS = {};

/* ---------------------------------------------------------------- PANORAMA VBP */
const SV = { year: null, tipo: 'TOTAL', per: 'ytd', mapk: 'lvl' };
function vbpSeries(V, tipo) { // nat monthly arrays por año
  if (tipo !== 'TOTAL') return V.nat_month[tipo];
  return V.years.map((y, i) => MESES.map((m, k) => { const a = V.nat_month.AGRICOLA[i][k], b = V.nat_month.PECUARIO[i][k]; return a == null && b == null ? null : (a || 0) + (b || 0); }));
}
const span = (arr, per, lm) => per === 'ytd' ? sum(arr.slice(0, lm + 1)) : (arr.slice(0, 12).some(v => v == null) ? null : sum(arr));
TABS.panorama = {
  async render(root) {
    const V = await load('data/vbp.json');
    const LY = V.last_year, LM = V.last_month, LMn = MESES[LM].toLowerCase();
    if (SV.year == null) SV.year = LY;
    const perOpts = [['ytd', `Ene–${LMn} (acumulado)`], ['full', 'Año completo']];
    root.innerHTML = `<div class="panel-head"><div><h2>Valor Bruto de la Producción agropecuaria</h2>
      <p>VBP en millones de soles a precios de 2007, por subsector, producto y departamento. Información disponible hasta ${MESL[LM]} ${LY}.</p></div></div>
      <div class="filters">${sel('pv-year', V.years.slice().reverse().map(y => [y, y === LY ? `${y} (ene–${LMn})` : y]), SV.year, 'Año')}
      ${seg('pv-tipo', [['TOTAL', 'Agropecuario'], ['AGRICOLA', 'Agrícola'], ['PECUARIO', 'Pecuario']], SV.tipo, 'Subsector')}
      ${seg('pv-per', perOpts, SV.per, 'Periodo')}</div>
      <div class="kpis" id="pv-k"></div>
      <div class="grid">
        ${card('pv-a', 'Evolución anual del VBP', '', 'w7')}
        ${card('pv-map', 'VBP por departamento', '', 'w5', 'map', 'Lima incluye Callao. Arrastre y use la rueda para acercar.')}
        ${card('pv-tree', 'Composición del VBP por producto', 'Tamaño proporcional al VBP del periodo', 'w7', 'tall')}
        ${card('pv-contrib', 'Contribución al crecimiento por producto', 'Puntos porcentuales de la variación del VBP', 'w5', 'tall')}
        ${card('pv-heat', 'Variación interanual mensual del VBP', 'Cada celda compara el mes con el mismo mes del año previo', 'w7', 'tall')}
        ${card('pv-bump', 'Ranking departamental del VBP', 'Posición de cada departamento por año; resaltados los 8 primeros del último año mostrado', 'w5', 'tall')}
      </div>`;
    const go = () => this.update(V);
    bindSel('pv-year', v => { SV.year = +v; if (SV.year === LY && SV.per === 'full') { SV.per = 'ytd'; } root.querySelectorAll('#pv-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SV.per)); go(); });
    bindSeg('pv-tipo', v => { SV.tipo = v; go(); });
    await ensureMaps();
    bindSeg('pv-per', v => { SV.per = (SV.year === LY) ? 'ytd' : v; root.querySelectorAll('#pv-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SV.per)); go(); });
    go();
  },
  update(V) {
    const LY = V.last_year, LM = V.last_month, yi = V.years.indexOf(SV.year), per = SV.year === LY ? 'ytd' : SV.per;
    const plab = per === 'ytd' ? `ene–${MESES[LM].toLowerCase()} ${SV.year}` : String(SV.year);
    const tot = vbpSeries(V, 'TOTAL'), agr = V.nat_month.AGRICOLA, pec = V.nat_month.PECUARIO, cur = vbpSeries(V, SV.tipo);
    const val = (s, i) => i < 0 ? null : span(s[i], per, LM);
    const v0 = val(cur, yi), v1 = val(cur, yi - 1);
    const a0 = val(agr, yi), p0 = val(pec, yi), t0 = val(tot, yi);
    // contribuciones por producto
    const prods = Object.entries(V.prod).filter(([k, p]) => SV.tipo === 'TOTAL' || p.tipo === SV.tipo);
    const pv = prods.map(([k, p]) => ({ k, tipo: p.tipo, v: span(p.vm[yi], per, LM) || 0, v1: yi > 0 ? (span(p.vm[yi - 1], per, LM) || 0) : null }));
    pv.sort((a, b) => b.v - a.v);
    const top = pv[0];
    // departamentos
    const depVal = (d, i) => { if (i < 0) return null; const t = SV.tipo === 'TOTAL' ? ['AGRICOLA', 'PECUARIO'] : [SV.tipo]; let s = 0, ok = false; t.forEach(tt => { const a = V.dep_month[tt][d]; if (a && a[i]) { const x = span(a[i], per, LM); if (x != null) { s += x; ok = true; } } }); return ok ? s : null; };
    const deps = V.deps.map(d => ({ d, v: depVal(d, yi), v1: depVal(d, yi - 1) })).filter(x => x.v != null);
    deps.sort((a, b) => b.v - a.v);
    $('#pv-k').innerHTML = kpi(`VBP ${SV.tipo === 'TOTAL' ? 'agropecuario' : SV.tipo === 'AGRICOLA' ? 'agrícola' : 'pecuario'} · ${plab}`, `S/ ${fmt(v0, 0)} M`, `${chip(vr(v0, v1))} frente a igual periodo de ${SV.year - 1}`)
      + kpi('Participación agrícola', pct(a0 / t0 * 100).replace('+', ''), `Pecuario: ${fmt(p0 / t0 * 100, 1)}% del VBP`)
      + kpi('Subsector agrícola', `S/ ${fmt(a0, 0)} M`, chip(vr(a0, val(agr, yi - 1))))
      + kpi('Subsector pecuario', `S/ ${fmt(p0, 0)} M`, chip(vr(p0, val(pec, yi - 1))))
      + kpi('Producto con mayor VBP', title(top.k), `${fmt(top.v / v0 * 100, 1)}% del VBP · ${chip(vr(top.v, top.v1))}`)
      + kpi('Departamento con mayor VBP', DEPN[deps[0].d], `${fmt(deps[0].v / sum(deps.map(x => x.v)) * 100, 1)}% del total`);
    // A. evolución anual apilada
    const yrs = V.years.filter(y => per === 'ytd' || y < LY);
    const idx = yrs.map(y => V.years.indexOf(y));
    const sa = idx.map(i => span(agr[i], per, LM)), sp = idx.map(i => span(pec[i], per, LM));
    const show = SV.tipo === 'TOTAL' ? ['AGRICOLA', 'PECUARIO'] : [SV.tipo];
    const ser = show.map(t => ({ name: t === 'AGRICOLA' ? 'Agrícola' : 'Pecuario', type: 'bar', stack: 'v', barMaxWidth: 26,
      itemStyle: { color: t === 'AGRICOLA' ? P.s3 : P.s2, borderColor: P.surface, borderWidth: 1, borderRadius: show.length === 1 || t === 'PECUARIO' ? [4, 4, 0, 0] : 0 },
      data: (t === 'AGRICOLA' ? sa : sp).map((v, i) => ({ value: v, itemStyle: yrs[i] === SV.year ? { borderColor: P.ink, borderWidth: 1.5 } : {} })) }));
    $('#s-pv-a').textContent = `Millones de S/ de 2007 · ${per === 'ytd' ? 'acumulado ene–' + MESES[LM].toLowerCase() + ' de cada año' : 'años completos'}`;
    draw('pv-a', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const i = ps[0].dataIndex; const t = (show.includes('AGRICOLA') ? sa[i] : 0) + (show.includes('PECUARIO') ? sp[i] : 0); const tp = i ? (show.includes('AGRICOLA') ? sa[i - 1] : 0) + (show.includes('PECUARIO') ? sp[i - 1] : 0) : null;
        return `<b>${yrs[i]}</b><br>` + ps.map(p => `${p.marker}${p.seriesName}: S/ ${fmt(p.value, 0)} M`).join('<br>') + `<br><b>Total: S/ ${fmt(t, 0)} M</b> (${pct(vr(t, tp))})`; } }),
      legend: Object.assign(base().legend, { show: show.length > 1 }),
      xAxis: axisCat(yrs), yAxis: axisVal(), series: ser }));
    setTable('pv-a', ['Año', 'Agrícola', 'Pecuario', 'Total', 'Var. %'], yrs.map((y, i) => [String(y), sa[i], sp[i], sa[i] + sp[i], i ? vr(sa[i] + sp[i], sa[i - 1] + sp[i - 1]) : null]));
    // B. mapa
    const mrows = deps.map(x => ({ id: x.d, value: SV.mapk === 'lvl' ? x.v : vr(x.v, x.v1), extra: SV.mapk === 'lvl' ? `Var.: ${pct(vr(x.v, x.v1))}` : `S/ ${fmt(x.v, 1)} M` }));
    const hm = $('#h-pv-map'); hm.innerHTML = `VBP por departamento <span class="seg" id="pv-mapk" style="margin-left:6px;vertical-align:middle"><button type="button" data-v="lvl" aria-pressed="${SV.mapk === 'lvl'}">Nivel</button><button type="button" data-v="var" aria-pressed="${SV.mapk === 'var'}">Var. %</button></span>`;
    bindSeg('pv-mapk', v => { SV.mapk = v; this.update(V); });
    $('#s-pv-map').textContent = SV.mapk === 'lvl' ? `Millones de S/ de 2007 · ${plab}` : `Variación % frente a igual periodo de ${SV.year - 1}`;
    draw('pv-map', mapOption({ map: 'dep', rows: mrows, kind: SV.mapk === 'lvl' ? 'seq' : 'div', unit: 'M S/', fmtFn: v => fmt(v, 0) }));
    setTable('pv-map', ['Departamento', 'VBP (M S/)', 'Var. %', 'Part. %'], deps.map(x => [DEPN[x.d], x.v, vr(x.v, x.v1), x.v / sum(deps.map(z => z.v)) * 100]));
    // C. treemap
    const groups = {};
    pv.filter(p => p.v > 0).forEach(p => { (groups[p.tipo] = groups[p.tipo] || []).push({ name: title(p.k), value: p.v, v1: p.v1 }); });
    const tdata = Object.entries(groups).map(([t, ch]) => ({ name: t === 'AGRICOLA' ? 'Agrícola' : 'Pecuario', itemStyle: { color: t === 'AGRICOLA' ? P.s6 : P.s2 }, children: ch.sort((a, b) => b.value - a.value).map(x => Object.assign(x, { itemStyle: { color: t === 'AGRICOLA' ? P.s6 : P.s2 } })) }));
    draw('pv-tree', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => p.data.v1 === undefined ? `<b>${p.name}</b><br>S/ ${fmt(p.value, 0)} M` : `<b>${esc(p.name)}</b><br>S/ ${fmt(p.value, 1)} M · ${fmt(p.value / v0 * 100, 1)}%<br>Var.: ${pct(vr(p.value, p.data.v1))}` }),
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, top: 4, left: 0, right: 0, bottom: 0,
        data: tdata, leafDepth: SV.tipo === 'TOTAL' ? 2 : 1, visibleMin: 300,
        upperLabel: { show: true, height: 20, color: '#fff', fontWeight: 600 },
        label: { color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'truncate', formatter: p => p.value / v0 < 0.008 ? '' : `${p.name}\n${fmt(p.value / v0 * 100, 1)}%` },
        levels: [{ itemStyle: { borderColor: P.surface, borderWidth: 3, gapWidth: 3 } }, { itemStyle: { borderColor: P.surface, borderWidth: 1, gapWidth: 1 } }] }]
    }));
    setTable('pv-tree', ['Producto', 'Subsector', 'VBP (M S/)', 'Part. %', 'Var. %'], pv.filter(p => p.v > 0).map(p => [title(p.k), p.tipo === 'AGRICOLA' ? 'Agrícola' : 'Pecuario', p.v, p.v / v0 * 100, vr(p.v, p.v1)]));
    // D. contribución
    if (yi > 0 && v1) {
      const c = pv.map(p => ({ k: title(p.k), c: (p.v - (p.v1 || 0)) / v1 * 100 })).sort((a, b) => b.c - a.c);
      const pick = [...c.slice(0, 8), ...c.slice(-8)].filter((x, i, a) => a.findIndex(z => z.k === x.k) === i).sort((a, b) => a.c - b.c);
      $('#s-pv-contrib').textContent = `Puntos porcentuales de la variación del VBP (${pct(vr(v0, v1))}) · ${plab} vs ${SV.year - 1}`;
      draw('pv-contrib', base({
        tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(p.name)}</b><br>${p.value > 0 ? '+' : ''}${fmt(p.value, 2)} p.p.` }),
        grid: { left: 8, right: 30, top: 10, bottom: 8, containLabel: true },
        xAxis: axisVal({ axisLabel: { color: P.muted, formatter: v => fmt(v, 1) } }), yAxis: axisCat(pick.map(x => x.k), { axisLabel: { color: P['ink-2'], fontSize: 11 } }),
        series: [{ type: 'bar', barMaxWidth: 16, data: pick.map(x => ({ value: +x.c.toFixed(3), itemStyle: { color: x.c >= 0 ? P.dpos : P.dneg, borderRadius: x.c >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })),
          label: { show: true, position: 'right', color: P['ink-2'], fontSize: 10, formatter: p => fmt(p.value, 2) } }]
      }));
      setTable('pv-contrib', ['Producto', 'Contribución (p.p.)'], c.map(x => [x.k, x.c]));
    } else noData('pv-contrib', 'No hay año previo para comparar');
    // E. heatmap variación interanual mensual
    const hy = V.years.slice(1), hd = [];
    hy.forEach((y, r) => { const i = r + 1; for (let m = 0; m < 12; m++) { const a = cur[i][m], b = cur[i - 1][m]; if (a != null && b) hd.push([m, r, +((a / b - 1) * 100).toFixed(1)]); } });
    draw('pv-heat', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${MESL[p.value[0]]} ${hy[p.value[1]]}</b><br>Var. interanual: ${pct(p.value[2])}` }),
      grid: { left: 8, right: 10, top: 8, bottom: 52, containLabel: true },
      xAxis: axisCat(MESES, { splitArea: { show: false } }), yAxis: axisCat(hy.map(String), { inverse: true }),
      visualMap: { type: 'piecewise', pieces: divPieces([8, 2]), orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 14, itemHeight: 10, textStyle: { color: P['ink-2'], fontSize: 11 } },
      series: [{ type: 'heatmap', data: hd, itemStyle: { borderColor: P.surface, borderWidth: 2 }, emphasis: { itemStyle: { borderColor: P.ink, borderWidth: 1 } } }]
    }));
    setTable('pv-heat', ['Año', ...MESES], hy.map((y, r) => [String(y), ...MESES.map((m, k) => { const f = hd.find(d => d[0] === k && d[1] === r); return f ? f[2] : null; })]));
    // F. bump ranking
    const by = V.years.filter(y => y <= SV.year).slice(-10), ranks = {};
    by.forEach(y => { const i = V.years.indexOf(y); const l = V.deps.map(d => ({ d, v: depVal(d, i) || 0 })).sort((a, b) => b.v - a.v); l.forEach((x, k) => (ranks[x.d] = ranks[x.d] || [])[by.indexOf(y)] = k + 1); });
    const lastR = Object.entries(ranks).sort((a, b) => a[1][by.length - 1] - b[1][by.length - 1]);
    const bser = lastR.map(([d, r], k) => ({ name: DEPN[d], type: 'line', data: r, smooth: 0.25, symbol: 'circle', symbolSize: k < 8 ? 7 : 4, z: k < 8 ? 3 : 1,
      lineStyle: { width: k < 8 ? 2 : 1, color: k < 8 ? P.cat[k] : P.axis }, itemStyle: { color: k < 8 ? P.cat[k] : P.axis, borderColor: P.surface, borderWidth: 1 },
      endLabel: { show: true, formatter: `${r[by.length - 1]}. ${DEPN[d]}`, color: k < 8 ? P.ink : P.muted, fontSize: 10.5 }, emphasis: { focus: 'series' } }));
    draw('pv-bump', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${p.seriesName}</b><br>${by[p.dataIndex]}: puesto ${p.value}` }),
      legend: { show: false }, grid: { left: 20, right: 110, top: 10, bottom: 8, containLabel: true },
      xAxis: axisCat(by.map(String), { boundaryGap: false }), yAxis: { type: 'value', inverse: true, min: 1, max: V.deps.length, interval: 1, axisLabel: { show: false }, splitLine: { show: false } }, series: bser
    }));
    setTable('pv-bump', ['Departamento', ...by.map(String)], lastR.map(([d, r]) => [DEPN[d], ...r.map(String)]));
  }
};

/* ---------------------------------------------------------------- PRODUCCIÓN AGRÍCOLA (SISAGRI) */
const SA = { g: '1404009', year: 2025, ind: 'Q', level: 'dep', dep: '00' };
const IND = { Q: ['Producción', 't'], C: ['Superficie cosechada', 'ha'], R: ['Rendimiento', 't/ha'], P: ['Precio en chacra', 'S/ por kg'], S: ['Superficie sembrada', 'ha'] };
function aggSis(G, yi, level, dep) {
  const out = {};
  G.ubi.forEach((u, i) => {
    if (dep !== '00' && !u.startsWith(dep)) return;
    const k = G.level === 'dep' ? u : level === 'dep' ? u.slice(0, 2) : level === 'prov' ? u.slice(0, 4) : u;
    const o = out[k] || (out[k] = { id: k, Q: 0, C: 0, S: 0, PQ: 0, QP: 0 });
    const q = G.Q[yi][i] || 0, p = G.P[yi][i];
    o.Q += q; o.C += G.C[yi][i] || 0; o.S += G.S[yi][i] || 0; if (p != null && q > 0) { o.PQ += p * q; o.QP += q; }
  });
  Object.values(out).forEach(o => { o.R = o.C > 0 ? o.Q / o.C : null; o.P = o.QP > 0 ? o.PQ / o.QP : null; });
  return out;
}
TABS.agricola = {
  async render(root) {
    const [IX, U] = await Promise.all([load('data/sisagri/index.json'), load('data/ubigeo.json')]); window.UBI = U;
    root.innerHTML = `<div class="panel-head"><div><h2>Producción agrícola territorial</h2>
      <p>Registro distrital SISAGRI ${IX.years[0]}–${IX.years[IX.years.length - 1]}: siembras, cosechas, producción, rendimiento y precio en chacra por cultivo. Las variedades se agrupan en su cultivo genérico.</p></div></div>
      <div class="filters">${sel('pa-g', IX.cultivos.map(c => [c.g, c.name + (c.level === 'dep' ? ' (departamental)' : '')]), SA.g, 'Cultivo')}
      ${sel('pa-year', IX.years.slice().reverse(), SA.year, 'Año')}
      ${sel('pa-ind', Object.entries(IND).map(([k, v]) => [k, `${v[0]} (${v[1]})`]), SA.ind, 'Indicador')}
      ${seg('pa-level', [['dep', 'Departamento'], ['prov', 'Provincia'], ['dist', 'Distrito']], SA.level, 'Nivel del mapa')}
      ${sel('pa-dep', [['00', 'Todo el país'], ...DEPS.map(d => [d, DEPN[d]])], SA.dep, 'Ámbito')}</div>
      <div class="kpis" id="pa-k"></div>
      <div class="grid">
        ${card('pa-map', 'Mapa', '', 'w7', 'map', 'Clases por quintiles de los territorios con registro. Gris: sin producción registrada.')}
        ${card('pa-rank', 'Principales territorios', '', 'w5', 'map')}
        ${card('pa-box', 'Dispersión distrital por departamento', '', 'w12', 'tall', 'Caja: rango intercuartílico (Q1–Q3) y mediana; bigotes hasta 1.5 veces el rango intercuartílico; puntos: distritos atípicos. Solo distritos con al menos 5 ha cosechadas.')}
        ${card('pa-scatter', 'Rendimiento y precio en chacra por distrito', 'Tamaño del punto proporcional a la producción', 'w7', 'tall')}
        ${card('pa-lorenz', 'Concentración territorial de la producción', 'Participación acumulada de la producción según número de territorios', 'w5', 'tall')}
        ${card('pa-cal', 'Calendario de cosechas', 'Producción nacional mensual (t)', 'w7', 'tall')}
        ${card('pa-trend', 'Producción y superficie cosechada anual', 'Total nacional', 'w5', 'tall')}
      </div>`;
    const go = () => this.update();
    bindSel('pa-g', v => { SA.g = v; go(); }); bindSel('pa-year', v => { SA.year = +v; go(); }); bindSel('pa-ind', v => { SA.ind = v; go(); });
    bindSeg('pa-level', v => { SA.level = v; go(); }); bindSel('pa-dep', v => { SA.dep = v; go(); });
    await ensureMaps(); go();
  },
  async update() {
    const G = await load(`data/sisagri/${SA.g}.json`);
    const yi = G.years.indexOf(SA.year), depOnly = G.level === 'dep', level = depOnly ? 'dep' : SA.level, dep = SA.dep;
    $$('#pa-level button').forEach(b => { b.disabled = depOnly && b.dataset.v !== 'dep'; b.style.opacity = b.disabled ? .4 : 1; });
    const [indN, indU] = IND[SA.ind];
    const nat = aggSis(G, yi, 'dep', dep), natP = yi > 0 ? aggSis(G, yi - 1, 'dep', dep) : {};
    const T = Object.values(nat).reduce((a, o) => ({ Q: a.Q + o.Q, C: a.C + o.C, S: a.S + o.S, PQ: a.PQ + o.PQ, QP: a.QP + o.QP }), { Q: 0, C: 0, S: 0, PQ: 0, QP: 0 });
    const T1 = Object.values(natP).reduce((a, o) => ({ Q: a.Q + o.Q, C: a.C + o.C }), { Q: 0, C: 0 });
    const distAll = aggSis(G, yi, 'dist', dep), dl = Object.values(distAll).filter(o => o.Q > 0).sort((a, b) => b.Q - a.Q);
    const top10 = sum(dl.slice(0, 10).map(o => o.Q)) / (T.Q || 1) * 100;
    const amb = dep === '00' ? 'nacional' : DEPN[dep];
    $('#pa-k').innerHTML = kpi(`Producción ${amb} ${SA.year}`, `${fmt(T.Q, 0)} t`, `${chip(vr(T.Q, T1.Q))} vs ${SA.year - 1}`)
      + kpi('Superficie cosechada', `${fmt(T.C, 0)} ha`, chip(vr(T.C, T1.C)))
      + kpi('Rendimiento promedio', `${fmt(T.C ? T.Q / T.C : null, 2)} t/ha`, `${SA.year - 1}: ${fmt(T1.C ? T1.Q / T1.C : null, 2)} t/ha`)
      + kpi('Precio en chacra', `S/ ${fmt(T.QP ? T.PQ / T.QP : null, 2)} por kg`, 'Promedio ponderado por producción')
      + kpi(depOnly ? 'Departamentos productores' : 'Distritos productores', fmt(dl.length), depOnly ? '' : `Siembras: ${fmt(T.S, 0)} ha`)
      + kpi(depOnly ? 'Concentración' : 'Concentración territorial', `${fmt(top10, 1)}%`, depOnly ? 'de la producción en 10 departamentos' : 'de la producción en los 10 primeros distritos');
    // mapa
    const units = Object.values(aggSis(G, yi, level, dep));
    const valOf = o => SA.ind === 'R' ? (o.C >= (level === 'dist' ? 5 : 20) ? o.R : null) : SA.ind === 'P' ? o.P : o[SA.ind];
    const rows = units.map(o => ({ id: o.id, value: valOf(o), extra: `Producción: ${fmt(o.Q, 0)} t · Cosecha: ${fmt(o.C, 0)} ha<br>Rend.: ${fmt(o.R, 2)} t/ha · Precio: ${o.P ? 'S/ ' + fmt(o.P, 2) : '—'}` })).filter(r => r.value != null && r.value > 0);
    const map = subMap(level, dep);
    $('#h-pa-map').textContent = `${indN} de ${G.name} por ${level === 'dep' ? 'departamento' : level === 'prov' ? 'provincia' : 'distrito'}`;
    $('#s-pa-map').textContent = `${indU} · ${SA.year}${dep !== '00' ? ' · ' + DEPN[dep] : ''}`;
    draw('pa-map', mapOption({ map, rows, kind: 'seq', unit: indU, level, fmtFn: SA.ind === 'R' || SA.ind === 'P' ? v => fmt(v, 2) : v => fmtShort(v) }));
    setTable('pa-map', ['Territorio', `${indN} (${indU})`, 'Producción (t)', 'Cosecha (ha)', 'Rend. (t/ha)', 'Precio (S/ kg)'], units.sort((a, b) => b.Q - a.Q).map(o => [placeName(level, o.id), valOf(o), o.Q, o.C, o.R, o.P]));
    // ranking
    const rk = rows.slice().sort((a, b) => b.value - a.value).slice(0, 15).reverse();
    $('#h-pa-rank').textContent = `Principales territorios: ${indN.toLowerCase()}`;
    $('#s-pa-rank').textContent = `${indU} · 15 primeros${SA.ind === 'R' ? ' (con superficie cosechada mínima)' : ''}`;
    draw('pa-rank', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(p.name)}</b><br>${fmtA(p.value)} ${indU}` }),
      grid: { left: 8, right: 54, top: 6, bottom: 8, containLabel: true },
      xAxis: axisVal(), yAxis: axisCat(rk.map(r => placeName(level, r.id).replace(/ \(.+\)$/, '')), { axisLabel: { color: P['ink-2'], fontSize: 11, width: 150, overflow: 'truncate' } }),
      series: [{ type: 'bar', barMaxWidth: 16, data: rk.map(r => r.value), itemStyle: { color: P.s3, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: P['ink-2'], fontSize: 10.5, formatter: p => fmtShort(p.value) } }]
    }));
    setTable('pa-rank', ['Territorio', `${indN} (${indU})`], rk.slice().reverse().map(r => [placeName(level, r.id), r.value]));
    // boxplot
    const bvar = SA.ind === 'P' ? 'P' : 'R', bU = bvar === 'P' ? 'S/ por kg' : 't/ha';
    $('#h-pa-box').textContent = `Dispersión distrital del ${bvar === 'P' ? 'precio en chacra' : 'rendimiento'} de ${G.name} por departamento`;
    $('#s-pa-box').textContent = `${bU} · ${SA.year} · departamentos ordenados por mediana`;
    if (depOnly) noData('pa-box', 'Cultivo con registro departamental: no hay detalle distrital');
    else {
      const byD = {};
      Object.values(aggSis(G, yi, 'dist', '00')).forEach(o => { if (o.C >= 5 && (bvar === 'R' ? o.R : o.P)) (byD[o.id.slice(0, 2)] = byD[o.id.slice(0, 2)] || []).push(bvar === 'R' ? o.R : o.P); });
      let st = Object.entries(byD).map(([d, a]) => ({ d, s: boxStats(a) })).filter(x => x.s && x.s.n >= 5).sort((a, b) => b.s.box[2] - a.s.box[2]);
      if (!st.length) noData('pa-box'); else {
        draw('pa-box', boxOption(st.map(x => DEPN[x.d]), st.map(x => x.s), bU, dep !== '00' ? P.s1 : P.s1));
        setTable('pa-box', ['Departamento', 'Distritos', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map(x => [DEPN[x.d], x.s.n, ...x.s.box]));
      }
    }
    // scatter rendimiento vs precio
    if (depOnly) noData('pa-scatter', 'Cultivo con registro departamental: sin detalle distrital');
    else {
      const pts = dl.filter(o => o.C >= 5 && o.P && o.R).map(o => [o.R, o.P, o.Q, o.id]);
      const mq = Math.max(...pts.map(p => p[2]), 1);
      draw('pa-scatter', base({
        tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(placeName('dist', p.value[3]))}</b><br>Rendimiento: ${fmt(p.value[0], 2)} t/ha<br>Precio: S/ ${fmt(p.value[1], 2)} por kg<br>Producción: ${fmt(p.value[2], 0)} t` }),
        grid: { left: 8, right: 18, top: 28, bottom: 30, containLabel: true },
        xAxis: axisVal({ name: 'Rendimiento (t/ha)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: P.muted }, axisLabel: { color: P.muted } }),
        yAxis: axisVal({ name: 'S/ por kg', axisLabel: { color: P.muted } }),
        series: [{ type: 'scatter', data: pts, symbolSize: p => 4 + 22 * Math.sqrt(p[2] / mq), itemStyle: { color: P.s1, opacity: .55, borderColor: P.surface, borderWidth: 1 } }]
      }));
      setTable('pa-scatter', ['Distrito', 'Rend. (t/ha)', 'Precio (S/ kg)', 'Producción (t)'], pts.slice(0, 300).map(p => [placeName('dist', p[3]), p[0], p[1], p[2]]));
    }
    // Lorenz / Pareto
    const lv = (depOnly ? Object.values(aggSis(G, yi, 'dep', dep)) : dl).map(o => o.Q).filter(v => v > 0).sort((a, b) => b - a);
    const tq = sum(lv); let acc = 0; const lc = lv.map((v, i) => { acc += v; return [i + 1, +(acc / tq * 100).toFixed(2)]; });
    const n50 = (lc.find(p => p[1] >= 50) || [0])[0], n80 = (lc.find(p => p[1] >= 80) || [0])[0];
    $('#s-pa-lorenz').textContent = `${fmt(n50)} ${depOnly ? 'departamentos' : 'distritos'} concentran el 50% y ${fmt(n80)} el 80% de la producción, de ${fmt(lv.length)} con registro`;
    draw('pa-lorenz', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', formatter: ps => `${fmt(ps[0].value[0])} primeros ${depOnly ? 'departamentos' : 'distritos'}<br><b>${fmt(ps[0].value[1], 1)}%</b> de la producción` }),
      grid: { left: 8, right: 18, top: 24, bottom: 26, containLabel: true },
      xAxis: axisVal({ type: lv.length > 30 ? 'log' : 'value', min: 1, max: lv.length, name: depOnly ? 'departamentos' : 'distritos (escala log.)', nameLocation: 'middle', nameGap: 26, axisLabel: { color: P.muted } }),
      yAxis: axisVal({ max: 100, axisLabel: { color: P.muted, formatter: v => v + '%' } }),
      series: [{ type: 'line', data: lc, showSymbol: false, lineStyle: { width: 2, color: P.s1 }, areaStyle: { color: P.s1, opacity: .12 },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: P.axis, type: 'solid' }, label: { color: P.muted, fontSize: 10 }, data: [{ yAxis: 50, label: { formatter: '50%', position: 'insideStartTop' } }, { yAxis: 80, label: { formatter: '80%', position: 'insideStartTop' } }] } }]
    }));
    setTable('pa-lorenz', ['N.° territorios', '% acumulado'], lc.filter((p, i) => i < 20 || i % 25 === 0).map(p => [String(p[0]), p[1]]));
    // calendario de cosechas (heatmap año × mes)
    const ys = [...new Set(G.m.map(r => r[0]))].sort(), hd = G.m.filter(r => r[2] > 0).map(r => [r[1] - 1, ys.indexOf(r[0]), r[2]]);
    const mx = Math.max(...hd.map(d => d[2]), 1);
    draw('pa-cal', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${MESL[p.value[0]]} ${ys[p.value[1]]}</b><br>${fmt(p.value[2], 0)} t` }),
      grid: { left: 8, right: 10, top: 8, bottom: 46, containLabel: true },
      xAxis: axisCat(MESES), yAxis: axisCat(ys.map(String), { inverse: true }),
      visualMap: { type: 'continuous', min: 0, max: mx, inRange: { color: [P.q0, P.q2, P.q5] }, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 160, itemWidth: 10, text: ['Mayor', 'Menor'], textStyle: { color: P['ink-2'], fontSize: 11 }, formatter: v => fmtShort(v) },
      series: [{ type: 'heatmap', data: hd, itemStyle: { borderColor: P.surface, borderWidth: 2 } }]
    }));
    setTable('pa-cal', ['Año', ...MESES], ys.map(y => [String(y), ...MESES.map((m, k) => { const r = G.m.find(x => x[0] === y && x[1] === k + 1); return r ? r[2] : null; })]));
    // tendencia anual
    const tr = G.years.map((y, i) => { const a = Object.values(aggSis(G, i, 'dep', dep)); return { y, Q: sum(a.map(o => o.Q)), C: sum(a.map(o => o.C)) }; });
    draw('pa-trend', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const t = tr[ps[0].dataIndex]; return `<b>${t.y}</b><br>Producción: ${fmt(t.Q, 0)} t<br>Cosecha: ${fmt(t.C, 0)} ha<br>Rendimiento: ${fmt(t.C ? t.Q / t.C : null, 2)} t/ha`; } }),
      grid: [{ left: 8, right: 12, top: 26, height: '38%', containLabel: true }, { left: 8, right: 12, top: '60%', bottom: 8, containLabel: true }],
      title: [{ text: 'Producción (t)', left: 0, top: 0, textStyle: { fontSize: 11.5, color: P['ink-2'], fontWeight: 600 } }, { text: 'Superficie cosechada (ha)', left: 0, top: '52%', textStyle: { fontSize: 11.5, color: P['ink-2'], fontWeight: 600 } }],
      xAxis: [axisCat(tr.map(t => String(t.y)), { gridIndex: 0, axisLabel: { show: false } }), axisCat(tr.map(t => String(t.y)), { gridIndex: 1 })],
      yAxis: [axisVal({ gridIndex: 0, splitNumber: 3 }), axisVal({ gridIndex: 1, splitNumber: 3 })],
      series: [{ type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: tr.map(t => ({ value: t.Q, itemStyle: { color: t.y === SA.year ? P.s3 : P.q2 } })), barMaxWidth: 22, itemStyle: { borderRadius: [4, 4, 0, 0] } },
        { type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: tr.map(t => ({ value: t.C, itemStyle: { color: t.y === SA.year ? P.s1 : P.dpos2 } })), barMaxWidth: 22, itemStyle: { borderRadius: [4, 4, 0, 0] } }]
    }));
    setTable('pa-trend', ['Año', 'Producción (t)', 'Cosecha (ha)', 'Rend. (t/ha)'], tr.map(t => [String(t.y), t.Q, t.C, t.C ? t.Q / t.C : null]));
  }
};

/* ---------------------------------------------------------------- CAMPAÑA AGRÍCOLA (siembras) */
const SC = { c: 'TOTAL', dep: '00' };
TABS.campana = {
  async render(root) {
    const A = await load('data/avance.json'); window.UBI = window.UBI || await load('data/ubigeo.json');
    const L = A.months[A.last];
    root.innerHTML = `<div class="panel-head"><div><h2>Campaña agrícola: avance de siembras</h2>
      <p>Superficie sembrada (ha) por campaña agosto–julio. La campaña 2024-2025 registra avance hasta ${L === 'dic' ? 'diciembre' : L}; se compara con el promedio histórico, la campaña previa y la Encuesta de Intenciones de Siembra (ENIS) 2024-2025.</p></div></div>
      <div class="filters">${sel('pc-c', A.cultivos.map(c => [c, c === 'TOTAL' ? 'Todos los cultivos' : cap(c)]), SC.c, 'Cultivo')}
      ${sel('pc-dep', [['00', 'Todo el país'], ...DEPS.map(d => [d, DEPN[d]])], SC.dep, 'Ámbito')}</div>
      <div class="kpis" id="pc-k"></div>
      <div class="grid">
        ${card('pc-cum', 'Siembras acumuladas en la campaña', 'ha acumuladas desde agosto', 'w7', 'tall')}
        ${card('pc-mon', 'Siembras mensuales por campaña', 'ha por mes', 'w5', 'tall')}
        ${card('pc-map', 'Avance distrital frente al promedio', '', 'w7', 'map', 'Variación % de las siembras acumuladas frente al promedio histórico del mismo periodo. Gris: sin siembras en ambos periodos.')}
        ${card('pc-deps', 'Avance por departamento frente al promedio', '', 'w5', 'map')}
        ${card('pc-cult', 'Cultivos con mayor superficie sembrada', '', 'w12', 'tall')}
      </div>`;
    bindSel('pc-c', v => { SC.c = v; this.update(A); }); bindSel('pc-dep', v => { SC.dep = v; this.update(A); });
    await ensureMaps(); this.update(A);
  },
  update(A) {
    const L = A.last, M = A.months, Ml = M.map(cap), c = SC.c, dep = SC.dep;
    const ser = (cc, p) => { const o = (A.dep[cc] || {})[p] || {}; const r = Array(12).fill(0); Object.entries(o).forEach(([d, a]) => { if (dep === '00' || d === dep) a.forEach((v, i) => r[i] += v || 0); }); return r; };
    const P24 = ser(c, '2024-2025'), PR = ser(c, 'PROMEDIO'), P23 = ser(c, '2023-2024'), P22 = ser(c, '2022-2023'), EN = ser(c, 'ENIS 2024-2025');
    const cum = a => { let s = 0; return a.map(v => s += v); };
    const a = sum(P24.slice(0, L + 1)), pr = sum(PR.slice(0, L + 1)), p23 = sum(P23.slice(0, L + 1)), en = sum(EN), enL = sum(EN.slice(0, L + 1));
    const per = `ago–${M[L]}`;
    $('#pc-k').innerHTML = kpi(`Siembras 2024-2025 (${per})`, `${fmt(a, 0)} ha`, `${dep === '00' ? 'Nacional' : DEPN[dep]} · ${c === 'TOTAL' ? 'todos los cultivos' : cap(c)}`)
      + kpi('Frente al promedio', pct(vr(a, pr)), `Promedio ${per}: ${fmt(pr, 0)} ha`)
      + kpi('Frente a 2023-2024', pct(vr(a, p23)), `2023-2024 ${per}: ${fmt(p23, 0)} ha`)
      + kpi('Intención ENIS 2024-2025', `${fmt(en, 0)} ha`, `Avance: ${fmt(en ? a / en * 100 : null, 1)}% de la intención anual`)
      + kpi(`Cumplimiento ENIS ${per}`, `${fmt(enL ? a / enL * 100 : null, 1)}%`, `Intención ${per}: ${fmt(enL, 0)} ha`);
    // acumuladas
    const cs = [['2022-2023', P22, P.axis, 1.5], ['2023-2024', P23, P.s2, 2], ['Promedio', PR, P.muted, 2], ['ENIS 2024-2025', EN, P.s4, 2], ['2024-2025', P24, P.s1, 3]];
    draw('pc-cum', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt(v, 0) + ' ha' }),
      xAxis: axisCat(Ml, { boundaryGap: false }), yAxis: axisVal(),
      series: cs.map(([n, s, col, w]) => ({ name: n, type: 'line', data: cum(s).map((v, i) => n === '2024-2025' && i > L ? null : v), symbol: 'circle', symbolSize: n === '2024-2025' ? 7 : 4, showSymbol: n === '2024-2025',
        lineStyle: { width: w, color: col, type: n.startsWith('ENIS') ? [6, 4] : 'solid' }, itemStyle: { color: col }, z: n === '2024-2025' ? 5 : 2,
        endLabel: n === '2024-2025' ? { show: true, formatter: p => fmtShort(p.value), color: P.ink, fontWeight: 600 } : undefined }))
    }));
    setTable('pc-cum', ['Mes', ...cs.map(x => x[0])], Ml.map((m, i) => [m, ...cs.map(x => (x[0] === '2024-2025' && i > L) ? null : cum(x[1])[i])]));
    // mensuales
    const ms = [['2023-2024', P23, P.s2], ['Promedio', PR, P.muted], ['2024-2025', P24, P.s1]];
    draw('pc-mon', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v == null ? '—' : fmt(v, 0) + ' ha' }),
      xAxis: axisCat(Ml), yAxis: axisVal(),
      series: ms.map(([n, s, col]) => ({ name: n, type: 'bar', barGap: '10%', barMaxWidth: 12, data: s.map((v, i) => n === '2024-2025' && i > L ? null : v), itemStyle: { color: col, borderRadius: [3, 3, 0, 0] } }))
    }));
    setTable('pc-mon', ['Mes', ...ms.map(x => x[0])], Ml.map((m, i) => [m, ...ms.map(x => (x[0] === '2024-2025' && i > L) ? null : x[1][i])]));
    // mapa distrital
    const dd = A.dist[c] || {};
    const rows = Object.entries(dd).filter(([u]) => dep === '00' || u.startsWith(dep)).map(([u, [x, p, q]]) => {
      if (!x && !p) return null; const v = p > 0 ? vr(x, p) : 100;
      return { id: u, value: Math.max(-100, Math.min(v, 500)), extra: `2024-2025: ${fmt(x, 0)} ha · Promedio: ${fmt(p, 0)} ha<br>2023-2024: ${fmt(q, 0)} ha${p > 0 ? '' : '<br><i>Sin siembras en el promedio</i>'}` };
    }).filter(Boolean);
    $('#s-pc-map').textContent = `${c === 'TOTAL' ? 'Todos los cultivos' : cap(c)} · siembras ${per} 2024-2025 vs promedio`;
    draw('pc-map', mapOption({ map: subMap('dist', dep), rows, kind: 'div', level: 'dist' }));
    setTable('pc-map', ['Distrito', '2024-2025 (ha)', 'Promedio (ha)', 'Var. %'], Object.entries(dd).filter(([u]) => dep === '00' || u.startsWith(dep)).sort((a, b) => b[1][0] - a[1][0]).slice(0, 400).map(([u, [x, p]]) => [placeName('dist', u), x, p, vr(x, p)]));
    // departamentos
    const dr = DEPS.map(d => { const o = (A.dep[c] || {}); const x = sum(((o['2024-2025'] || {})[d] || []).slice(0, L + 1)), p = sum(((o.PROMEDIO || {})[d] || []).slice(0, L + 1)); return { d, x, p, v: vr(x, p) }; }).filter(r => r.p > 0 || r.x > 0).sort((a, b) => (a.v ?? 999) - (b.v ?? 999));
    $('#s-pc-deps').textContent = `Var. % siembras ${per} 2024-2025 vs promedio`;
    draw('pc-deps', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => { const r = dr[p.dataIndex]; return `<b>${DEPN[r.d]}</b><br>2024-2025: ${fmt(r.x, 0)} ha<br>Promedio: ${fmt(r.p, 0)} ha<br>Var.: ${pct(r.v)}`; } }),
      grid: { left: 8, right: 44, top: 6, bottom: 8, containLabel: true },
      xAxis: axisVal({ axisLabel: { color: P.muted, formatter: v => v + '%' } }), yAxis: axisCat(dr.map(r => DEPN[r.d]), { axisLabel: { color: P['ink-2'], fontSize: 11 } }),
      series: [{ type: 'bar', barMaxWidth: 14, data: dr.map(r => ({ value: r.v == null ? 0 : +r.v.toFixed(1), itemStyle: { color: (r.v || 0) >= 0 ? P.dpos : P.dneg, borderRadius: (r.v || 0) >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4], borderColor: (dep === r.d) ? P.ink : 'transparent', borderWidth: dep === r.d ? 1.5 : 0 } })),
        label: { show: true, position: 'right', color: P['ink-2'], fontSize: 10, formatter: p => pct(p.value, 0) } }]
    }));
    setTable('pc-deps', ['Departamento', '2024-2025 (ha)', 'Promedio (ha)', 'Var. %'], dr.slice().reverse().map(r => [DEPN[r.d], r.x, r.p, r.v]));
    // cultivos (sólo si TOTAL o para contexto)
    const cl = A.cultivos.filter(k => k !== 'TOTAL').map(k => { const x = sum(ser(k, '2024-2025').slice(0, L + 1)), p = sum(ser(k, 'PROMEDIO').slice(0, L + 1)), q = sum(ser(k, '2023-2024').slice(0, L + 1)); return { k, x, p, q }; }).filter(r => r.x > 0 || r.p > 0).sort((a, b) => b.x - a.x).slice(0, 20);
    $('#s-pc-cult').textContent = `20 cultivos con mayor siembra ${per} 2024-2025 · ${dep === '00' ? 'nacional' : DEPN[dep]} · ha`;
    draw('pc-cult', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const r = cl[ps[0].dataIndex]; return `<b>${cap(r.k)}</b><br>2024-2025: ${fmt(r.x, 0)} ha<br>Promedio: ${fmt(r.p, 0)} ha (${pct(vr(r.x, r.p))})<br>2023-2024: ${fmt(r.q, 0)} ha (${pct(vr(r.x, r.q))})`; } }),
      xAxis: axisCat(cl.map(r => cap(r.k)), { axisLabel: { color: P['ink-2'], interval: 0, rotate: 35, fontSize: 11 } }), yAxis: axisVal(),
      series: [['2024-2025', 'x', P.s1], ['Promedio', 'p', P.muted], ['2023-2024', 'q', P.s2]].map(([n, k, col]) => ({ name: n, type: 'bar', barGap: '10%', barMaxWidth: 12, data: cl.map(r => r[k]), itemStyle: { color: col, borderRadius: [3, 3, 0, 0] } }))
    }));
    setTable('pc-cult', ['Cultivo', '2024-2025 (ha)', 'Promedio (ha)', 'Var. % vs prom.', '2023-2024 (ha)'], cl.map(r => [cap(r.k), r.x, r.p, vr(r.x, r.p), r.q]));
  }
};

/* ---------------------------------------------------------------- PECUARIO */
const SP = { p: 'AVE', year: null, per: 'ytd' };
const PEC_N = { AVE: 'Carne de ave', VACUNO: 'Carne de vacuno', PORCINO: 'Carne de porcino', OVINO: 'Carne de ovino', CAPRINO: 'Carne de caprino', ALPACA: 'Carne de alpaca', LLAMA: 'Carne de llama', LECHE: 'Leche fresca', HUEVO: 'Huevo', LANA: 'Lana', 'FIBRA ALPACA': 'Fibra de alpaca', 'FIBRA LLAMA': 'Fibra de llama' };
TABS.pecuario = {
  async render(root) {
    const V = await load('data/vbp.json'); const LY = V.last_year, LM = V.last_month;
    if (SP.year == null) SP.year = LY;
    const pk = Object.entries(V.prod).filter(([k, p]) => p.tipo === 'PECUARIO').sort((a, b) => b[1].tot - a[1].tot).map(([k]) => k);
    root.innerHTML = `<div class="panel-head"><div><h2>Producción pecuaria</h2>
      <p>Producción (t) y VBP pecuario por especie y departamento. Las carnes se expresan en peso de animal en pie, según la fuente. Datos hasta ${MESL[LM]} ${LY}.</p></div></div>
      <div class="filters">${sel('pp-p', pk.map(k => [k, PEC_N[k] || title(k)]), SP.p, 'Producto')}
      ${sel('pp-year', V.years.slice().reverse().map(y => [y, y === LY ? `${y} (ene–${MESES[LM].toLowerCase()})` : y]), SP.year, 'Año')}
      ${seg('pp-per', [['ytd', `Ene–${MESES[LM].toLowerCase()}`], ['full', 'Año completo']], SP.per, 'Periodo')}</div>
      <div class="kpis" id="pp-k"></div>
      <div class="grid">
        ${card('pp-season', 'Perfil mensual de la producción', 'Cada línea es un año; resaltados el año elegido y el previo', 'w7', 'tall')}
        ${card('pp-map', 'Producción por departamento', '', 'w5', 'map', 'Lima incluye Callao.')}
        ${card('pp-box', 'Estacionalidad: distribución mensual', 'Producción de cada mes entre 2015 y el último año completo', 'w7', 'tall', 'Caja: rango intercuartílico entre años; línea central: mediana.')}
        ${card('pp-comp', 'Composición del VBP pecuario', '% del VBP pecuario por especie', 'w5', 'tall')}
      </div>`;
    const go = () => this.update(V, pk);
    bindSel('pp-p', v => { SP.p = v; go(); }); bindSel('pp-year', v => { SP.year = +v; if (SP.year === LY) SP.per = 'ytd'; $$('#pp-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SP.per)); go(); });
    bindSeg('pp-per', v => { SP.per = SP.year === LY ? 'ytd' : v; $$('#pp-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SP.per)); go(); });
    await ensureMaps(); go();
  },
  update(V, pk) {
    const LY = V.last_year, LM = V.last_month, yi = V.years.indexOf(SP.year), per = SP.year === LY ? 'ytd' : SP.per, pr = V.prod[SP.p];
    const q = i => i < 0 ? null : span(pr.qm[i], per, LM), v = i => i < 0 ? null : span(pr.vm[i], per, LM);
    const pecT = i => span(V.nat_month.PECUARIO[i], per, LM);
    const plab = per === 'ytd' ? `ene–${MESES[LM].toLowerCase()} ${SP.year}` : String(SP.year);
    const depRows = Object.entries(pr.dep).map(([d, o]) => ({ d, q: per === 'ytd' ? (o.qy || [])[yi] : o.q[yi], q1: per === 'ytd' ? (o.qy || [])[yi - 1] : o.q[yi - 1] })).filter(r => r.q > 0).sort((a, b) => b.q - a.q);
    const name = PEC_N[SP.p] || title(SP.p);
    $('#pp-k').innerHTML = kpi(`${name} · ${plab}`, `${fmt(q(yi), 0)} t`, `${chip(vr(q(yi), q(yi - 1)))} vs igual periodo ${SP.year - 1}`)
      + kpi('VBP del producto', `S/ ${fmt(v(yi), 1)} M`, `${fmt(v(yi) / pecT(yi) * 100, 1)}% del VBP pecuario`)
      + kpi('Principal departamento', depRows[0] ? DEPN[depRows[0].d] : '—', depRows[0] ? `${fmt(depRows[0].q / sum(depRows.map(r => r.q)) * 100, 1)}% de la producción` : '')
      + kpi('Tres primeros departamentos', `${fmt(sum(depRows.slice(0, 3).map(r => r.q)) / sum(depRows.map(r => r.q)) * 100, 1)}%`, depRows.slice(0, 3).map(r => DEPN[r.d]).join(', '));
    // perfil mensual por año
    const yrs = V.years.slice(-8);
    draw('pp-season', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', valueFormatter: x => x == null ? '—' : fmt(x, 0) + ' t' }),
      legend: Object.assign(base().legend, { data: [String(SP.year - 1), String(SP.year)] }), grid: { left: 8, right: 44, top: 30, bottom: 8, containLabel: true },
      xAxis: axisCat(MESES, { boundaryGap: false }), yAxis: axisVal({ scale: true }),
      series: yrs.map(y => { const i = V.years.indexOf(y); const hl = y === SP.year ? P.s1 : y === SP.year - 1 ? P.s2 : null;
        return { name: String(y), type: 'line', data: pr.qm[i].map(x => x || null), showSymbol: !!hl, symbolSize: 6, lineStyle: { width: hl ? 2.5 : 1, color: hl || P.axis }, itemStyle: { color: hl || P.axis }, z: hl ? 5 : 1,
          endLabel: hl ? { show: true, formatter: String(y), color: P.ink, fontSize: 11 } : undefined }; })
    }));
    setTable('pp-season', ['Año', ...MESES], yrs.map(y => [String(y), ...pr.qm[V.years.indexOf(y)]]));
    // mapa
    draw('pp-map', mapOption({ map: 'dep', rows: depRows.map(r => ({ id: r.d, value: r.q, extra: `Var.: ${pct(vr(r.q, r.q1))}` })), unit: 't', fmtFn: fmtShort }));
    $('#s-pp-map').textContent = `t · ${plab}`;
    setTable('pp-map', ['Departamento', 'Producción (t)', 'Var. %', 'Part. %'], depRows.map(r => [DEPN[r.d], r.q, vr(r.q, r.q1), r.q / sum(depRows.map(x => x.q)) * 100]));
    // boxplot estacional
    const by = V.years.filter(y => y >= 2015 && y < LY);
    const st = MESES.map((m, k) => boxStats(by.map(y => pr.qm[V.years.indexOf(y)][k])));
    draw('pp-box', boxOption(MESES, st, 't', P.s3));
    setTable('pp-box', ['Mes', 'Años', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map((s, k) => s ? [MESES[k], s.n, ...s.box] : [MESES[k], '—']));
    // composición VBP pecuario (100% apilado)
    const top = pk.slice(0, 7), yy = V.years.filter(y => y < LY).concat(per === 'ytd' ? [LY] : []);
    const comp = yy.map(y => { const i = V.years.indexOf(y); const t = span(V.nat_month.PECUARIO[i], 'full', LM) ?? span(V.nat_month.PECUARIO[i], 'ytd', LM); const pp = y === LY ? 'ytd' : 'full'; const tt = span(V.nat_month.PECUARIO[i], pp, LM);
      const parts = top.map(k => span(V.prod[k].vm[i], pp, LM) / tt * 100); return [...parts, 100 - sum(parts)]; });
    const names = [...top.map(k => PEC_N[k] || title(k)), 'Otros'];
    draw('pp-comp', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: x => fmt(x, 1) + '%' }),
      grid: { left: 8, right: 10, top: 64, bottom: 8, containLabel: true },
      xAxis: axisCat(yy.map(y => y === LY ? `${y}*` : String(y))), yAxis: axisVal({ max: 100, axisLabel: { color: P.muted, formatter: x => x + '%' } }),
      series: names.map((n, k) => ({ name: n, type: 'bar', stack: 'c', barMaxWidth: 22, data: comp.map(r => +r[k].toFixed(2)), itemStyle: { color: P.cat[k], borderColor: P.surface, borderWidth: 1 } }))
    }));
    $('#s-pp-comp').textContent = `% del VBP pecuario por especie${per === 'ytd' ? ` · *${LY}: ene–${MESES[LM].toLowerCase()}` : ''}`;
    setTable('pp-comp', ['Año', ...names], yy.map((y, i) => [String(y), ...comp[i]]));
  }
};
