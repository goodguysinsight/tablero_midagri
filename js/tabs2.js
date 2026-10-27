/* ===== Pestañas: Precios, Agroindustria, Insumos, Comercio exterior, Metodología ===== */
'use strict';

/* ---------------------------------------------------------------- PRECIOS */
const SPR = { g: '1404009', year: 2025, p: 'Papa blanca', reg: null, s: 'PAPA' };
TABS.precios = {
  async render(root) {
    const [IX, PR] = await Promise.all([load('data/sisagri/index.json'), load('data/precios.json')]);
    const cults = IX.cultivos.filter(c => c.level !== 'dep' || true);
    const sg = Object.keys(PR.sisap).sort();
    root.innerHTML = `<div class="panel-head"><div><h2>Precios agrícolas</h2>
      <p>Precio en chacra (pagado al productor) según SISAGRI y el registro semanal regional, y precio mayorista anual por variedad según SISAP. Soles corrientes por kg.</p></div></div>
      <div class="filters">${sel('pr-g', cults.map(c => [c.g, c.name]), SPR.g, 'Cultivo (SISAGRI)')}${sel('pr-year', IX.years.slice().reverse(), SPR.year, 'Año (dispersión)')}</div>
      <div class="kpis" id="pr-k"></div>
      <div class="grid">
        ${card('pr-line', 'Precio en chacra mensual', 'S/ por kg · promedio nacional ponderado por producción', 'w12', 'short')}
        ${card('pr-season', 'Estacionalidad del precio en chacra', 'Distribución de cada mes calendario entre años', 'w7', 'tall', 'Caja: rango intercuartílico entre años; línea central: mediana. Útil para identificar meses de precios altos y bajos.')}
        ${card('pr-box', 'Dispersión del precio entre distritos', '', 'w5', 'tall')}
      </div>
      <div class="filters">${sel('pr-p', PR.prods, SPR.p, 'Producto (registro regional)')}<span id="pr-regbox"></span></div>
      <div class="grid">
        ${card('pr-reg', 'Precio en chacra por región', 'S/ por kg · promedio mensual del registro semanal', 'w7', 'tall')}
        ${card('pr-regbox2', 'Distribución anual entre regiones', 'S/ por kg · cada observación es una región-mes', 'w5', 'tall')}
      </div>
      <div class="filters">${sel('pr-s', sg.map(s => [s, cap(s)]), SPR.s, 'Producto (SISAP mayorista)')}</div>
      <div class="grid">
        ${card('pr-sisap', 'Precio mayorista anual por variedad', 'S/ por kg · SISAP', 'w7', 'tall')}
        ${card('pr-sisapbox', 'Dispersión entre variedades', 'S/ por kg · distribución anual de las variedades', 'w5', 'tall')}
      </div>`;
    bindSel('pr-g', v => { SPR.g = v; this.u1(); }); bindSel('pr-year', v => { SPR.year = +v; this.u1(); });
    bindSel('pr-p', v => { SPR.p = v; SPR.reg = null; this.u2(PR); }); bindSel('pr-s', v => { SPR.s = v; this.u3(PR); });
    await this.u1(); this.u2(PR); this.u3(PR);
  },
  async u1() {
    const G = await load(`data/sisagri/${SPR.g}.json`);
    const m = G.m.filter(r => r[5] != null && r[5] > 0);
    const xs = m.map(r => `${MESES[r[1] - 1]} ${r[0]}`);
    const last = m[m.length - 1], prev = m.find(r => r[0] === last[0] - 1 && r[1] === last[1]);
    const yAvg = y => { const a = G.m.filter(r => r[0] === y && r[5]); const qq = sum(a.map(r => r[2])); return qq ? sum(a.map(r => r[5] * r[2])) / qq : null; };
    $('#pr-k').innerHTML = kpi(`Último registro · ${MESL[last[1] - 1]} ${last[0]}`, `S/ ${fmt(last[5], 2)} por kg`, `${chip(vr(last[5], prev && prev[5]))} vs igual mes del año previo`)
      + kpi('Promedio 2025', `S/ ${fmt(yAvg(2025), 2)}`, `${chip(vr(yAvg(2025), yAvg(2024)))} vs 2024`)
      + kpi('Máximo de la serie', `S/ ${fmt(Math.max(...m.map(r => r[5])), 2)}`, (() => { const r = m.reduce((a, b) => b[5] > a[5] ? b : a); return `${MESL[r[1] - 1]} ${r[0]}`; })())
      + kpi('Mínimo de la serie', `S/ ${fmt(Math.min(...m.map(r => r[5])), 2)}`, (() => { const r = m.reduce((a, b) => b[5] < a[5] ? b : a); return `${MESL[r[1] - 1]} ${r[0]}`; })());
    $('#h-pr-line').textContent = `Precio en chacra mensual de ${G.name}`;
    draw('pr-line', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', formatter: ps => `<b>${ps[0].axisValue}</b><br>S/ ${fmt(ps[0].value, 2)} por kg` }),
      grid: { left: 8, right: 16, top: 14, bottom: 8, containLabel: true },
      xAxis: axisCat(xs, { boundaryGap: false, axisLabel: { color: P.muted, interval: i => xs[i].startsWith('Ene') } }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted, formatter: v => fmt(v, 2) } }),
      series: [{ type: 'line', data: m.map(r => r[5]), showSymbol: false, lineStyle: { width: 2, color: P.s1 }, areaStyle: { color: P.s1, opacity: .1 },
        markPoint: { symbol: 'circle', symbolSize: 8, itemStyle: { color: P.s1, borderColor: P.surface, borderWidth: 2 }, label: { show: true, position: 'top', color: P.ink, fontSize: 11, formatter: p => fmt(p.value, 2) }, data: [{ coord: [xs.length - 1, last[5]], value: last[5] }] } }]
    }));
    setTable('pr-line', ['Mes', 'Precio (S/ kg)', 'Producción (t)'], m.map((r, i) => [xs[i], r[5], r[2]]));
    const st = MESES.map((mm, k) => boxStats(m.filter(r => r[1] === k + 1 && r[0] <= 2025).map(r => r[5])));
    draw('pr-season', boxOption(MESES, st, 'S/ por kg', P.s1));
    setTable('pr-season', ['Mes', 'Años', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map((s, k) => s ? [MESES[k], s.n, ...s.box] : [MESES[k], '—']));
    // dispersión distrital por departamento (precio)
    const yi = G.years.indexOf(SPR.year); const byD = {};
    G.ubi.forEach((u, i) => { const p = G.P[yi][i]; if (p && (G.Q[yi][i] || 0) > 0) (byD[u.slice(0, 2)] = byD[u.slice(0, 2)] || []).push(p); });
    const sd = Object.entries(byD).map(([d, a]) => ({ d, s: boxStats(a) })).filter(x => x.s && x.s.n >= (G.level === 'dep' ? 1 : 4)).sort((a, b) => b.s.box[2] - a.s.box[2]);
    $('#h-pr-box').textContent = `Dispersión del precio de ${G.name} entre distritos`;
    $('#s-pr-box').textContent = `S/ por kg · ${SPR.year} · por departamento, ordenado por mediana`;
    if (G.level === 'dep' || !sd.length) noData('pr-box', 'Sin detalle distrital para este cultivo');
    else { draw('pr-box', boxOption(sd.map(x => DEPN[x.d]), sd.map(x => x.s), 'S/ por kg', P.s7, true)); setTable('pr-box', ['Departamento', 'Distritos', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], sd.map(x => [DEPN[x.d], x.s.n, ...x.s.box])); }
  },
  u2(PR) {
    const rows = PR.chacra[SPR.p] || [];
    const regs = [...new Set(rows.map(r => r[0]))].sort((a, b) => rows.filter(r => r[0] === b).length - rows.filter(r => r[0] === a).length);
    if (!SPR.reg || !regs.includes(SPR.reg)) SPR.reg = regs[0];
    $('#pr-regbox').innerHTML = sel('pr-reg-s', regs.map(d => [d, DEPN[d]]), SPR.reg, 'Región resaltada');
    bindSel('pr-reg-s', v => { SPR.reg = v; this.u2(PR); });
    const months = [...new Set(rows.map(r => r[1] * 100 + r[2]))].sort(), xs = months.map(k => `${MESES[k % 100 - 1]} ${Math.floor(k / 100)}`);
    const ser = regs.map(d => { const mm = {}; rows.filter(r => r[0] === d).forEach(r => mm[r[1] * 100 + r[2]] = r[3]); const hl = d === SPR.reg;
      return { name: DEPN[d], type: 'line', connectNulls: false, data: months.map(k => mm[k] ?? null), showSymbol: false, z: hl ? 5 : 1, lineStyle: { width: hl ? 2.5 : 1, color: hl ? P.s2 : P.axis }, itemStyle: { color: hl ? P.s2 : P.axis }, emphasis: { focus: 'series' } }; });
    $('#h-pr-reg').textContent = `Precio en chacra de ${SPR.p.toLowerCase()} por región`;
    draw('pr-reg', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'item', formatter: p => `<b>${p.seriesName}</b><br>${xs[p.dataIndex]}: S/ ${fmt(p.value, 2)} por kg` }),
      legend: { show: false }, grid: { left: 8, right: 16, top: 14, bottom: 8, containLabel: true },
      xAxis: axisCat(xs, { boundaryGap: false }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted, formatter: v => fmt(v, 2) } }), series: ser
    }));
    setTable('pr-reg', ['Mes', ...regs.map(d => DEPN[d])], xs.map((x, i) => [x, ...ser.map(s => s.data[i])]));
    const ys = [...new Set(rows.map(r => r[1]))].sort();
    const st = ys.map(y => boxStats(rows.filter(r => r[1] === y).map(r => r[3])));
    draw('pr-regbox2', boxOption(ys.map(String), st, 'S/ por kg', P.s2));
    setTable('pr-regbox2', ['Año', 'Obs.', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map((s, i) => s ? [String(ys[i]), s.n, ...s.box] : [String(ys[i])]));
  },
  u3(PR) {
    const S = PR.sisap[SPR.s] || {};
    const vars = Object.entries(S).sort((a, b) => b[1].length - a[1].length || (b[1].at(-1)?.[1] || 0) - (a[1].at(-1)?.[1] || 0));
    const ys = [...new Set(vars.flatMap(([v, a]) => a.map(r => r[0])))].sort();
    const ser = vars.map(([v, a], k) => { const mm = Object.fromEntries(a); const c = k < 7 ? P.cat[k] : P.axis;
      return { name: cap(v), type: 'line', data: ys.map(y => mm[y] ?? null), symbol: 'circle', symbolSize: 5, showSymbol: k < 7, lineStyle: { width: k < 7 ? 2 : 1, color: c }, itemStyle: { color: c }, z: k < 7 ? 3 : 1 }; });
    $('#h-pr-sisap').textContent = `Precio mayorista anual de ${SPR.s.toLowerCase()} por variedad`;
    $('#s-pr-sisap').textContent = `S/ por kg · SISAP · ${vars.length} variedades${vars.length > 7 ? ' (7 con color; resto en gris)' : ''}`;
    draw('pr-sisap', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', valueFormatter: v => v == null ? '—' : 'S/ ' + fmt(v, 2) }),
      legend: Object.assign(base().legend, { data: ser.slice(0, 7).map(s => s.name) }), grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
      xAxis: axisCat(ys.map(String), { boundaryGap: false }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted, formatter: v => fmt(v, 1) } }), series: ser
    }));
    setTable('pr-sisap', ['Variedad', ...ys.map(String)], vars.map(([v, a]) => { const mm = Object.fromEntries(a); return [cap(v), ...ys.map(y => mm[y] ?? null)]; }));
    const st = ys.map(y => boxStats(vars.map(([v, a]) => (a.find(r => r[0] === y) || [])[1])));
    if (st.every(s => !s)) noData('pr-sisapbox', 'Se requieren al menos 3 variedades por año');
    else draw('pr-sisapbox', boxOption(ys.map(String), st, 'S/ por kg', P.s3));
    setTable('pr-sisapbox', ['Año', 'Variedades', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map((s, i) => s ? [String(ys[i]), s.n, ...s.box] : [String(ys[i]), '—']));
  }
};

/* ---------------------------------------------------------------- AGROINDUSTRIA */
const SI = { v: 'P', act: '-1', year: 2025 };
TABS.agroindustria = {
  async render(root) {
    const D = await load('data/agroind.json');
    const ys = [...new Set(D.rows.map(r => r[4]))].sort();
    root.innerHTML = `<div class="panel-head"><div><h2>Agroindustria</h2>
      <p>Ingreso y utilización de materias primas, producción y venta de productos agroindustriales (toneladas) por actividad, producto y departamento, ${ys[0]}–${ys.at(-1)}.</p></div></div>
      <div class="filters">${seg('pi-v', Object.entries(D.vars).map(([k, t]) => [k, t.replace(' de materia prima', ' MP')]), SI.v, 'Variable')}
      ${sel('pi-act', [['-1', 'Todas las actividades'], ...D.acts.map((a, i) => [i, a])], SI.act, 'Actividad')}
      ${sel('pi-year', ys.slice().reverse(), SI.year, 'Año')}</div>
      <div class="kpis" id="pi-k"></div>
      <div class="grid">
        ${card('pi-bar', 'Evolución anual por actividad', 't', 'w7', 'tall')}
        ${card('pi-map', 'Distribución departamental', '', 'w5', 'tall')}
        ${card('pi-sankey', 'Flujo de materias primas hacia las actividades', 'Utilización de materia prima (t) · 18 principales flujos', 'w7', 'tall', 'El grosor de cada banda es proporcional al volumen de materia prima utilizada por la actividad.')}
        ${card('pi-top', 'Principales productos', '', 'w5', 'tall')}
        ${card('pi-heat', 'Calendario mensual de la actividad', 't por mes', 'w12', 'short')}
      </div>`;
    const go = () => this.update(D, ys);
    bindSeg('pi-v', v => { SI.v = v; go(); }); bindSel('pi-act', v => { SI.act = v; go(); }); bindSel('pi-year', v => { SI.year = +v; go(); });
    await ensureMaps(); go();
  },
  update(D, ys) {
    const act = +SI.act, rows = D.rows.filter(r => r[0] === SI.v && (act < 0 || r[1] === act));
    const tot = r => sum(r.slice(5));
    const yT = y => sum(rows.filter(r => r[4] === y).map(tot));
    const cur = rows.filter(r => r[4] === SI.year), vn = D.vars[SI.v];
    const byP = {}; cur.forEach(r => byP[r[2]] = (byP[r[2]] || 0) + tot(r));
    const byD = {}; cur.forEach(r => byD[r[3]] = (byD[r[3]] || 0) + tot(r));
    const tp = Object.entries(byP).sort((a, b) => b[1] - a[1]), td = Object.entries(byD).filter(([d]) => d !== '00').sort((a, b) => b[1] - a[1]);
    const T = yT(SI.year);
    $('#pi-k').innerHTML = kpi(`${vn} · ${SI.year}`, `${fmt(T, 0)} t`, `${chip(vr(T, yT(SI.year - 1)))} vs ${SI.year - 1}`)
      + kpi('Principal producto', tp[0] ? D.prods[tp[0][0]] : '—', tp[0] ? `${fmt(tp[0][1] / T * 100, 1)}% del volumen` : '')
      + kpi('Principal departamento', td[0] ? DEPN[td[0][0]] : '—', td[0] ? `${fmt(td[0][1] / T * 100, 1)}% del volumen` : '')
      + kpi('Productos con registro', fmt(tp.length), act < 0 ? `${D.acts.length} actividades` : D.acts[act]);
    // barras por actividad (top 7 + otras)
    const aT = {}; D.rows.filter(r => r[0] === SI.v).forEach(r => aT[r[1]] = (aT[r[1]] || 0) + tot(r));
    const topA = Object.entries(aT).sort((a, b) => b[1] - a[1]).map(x => +x[0]);
    const keys = act >= 0 ? [act] : topA.slice(0, 7), other = act >= 0 ? [] : topA.slice(7);
    const series = keys.map((a, k) => ({ name: D.acts[a], type: 'bar', stack: 's', barMaxWidth: 24, data: ys.map(y => sum(rows.filter(r => r[1] === a && r[4] === y).map(tot))), itemStyle: { color: P.cat[topA.indexOf(a) % 8], borderColor: P.surface, borderWidth: 1 } }));
    if (other.length) series.push({ name: 'Otras', type: 'bar', stack: 's', barMaxWidth: 24, data: ys.map(y => sum(rows.filter(r => other.includes(r[1]) && r[4] === y).map(tot))), itemStyle: { color: P.axis, borderColor: P.surface, borderWidth: 1 } });
    $('#s-pi-bar').textContent = `${vn} · t`;
    draw('pi-bar', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => fmt(v, 0) + ' t' }),
      grid: { left: 8, right: 10, top: 56, bottom: 8, containLabel: true },
      xAxis: axisCat(ys.map(String)), yAxis: axisVal(), series
    }));
    setTable('pi-bar', ['Año', ...series.map(s => s.name), 'Total'], ys.map((y, i) => [String(y), ...series.map(s => s.data[i]), sum(series.map(s => s.data[i]))]));
    // departamentos (barra horizontal; datos regionales con pocos departamentos)
    const dd = td.slice(0, 15).reverse();
    $('#s-pi-map').textContent = `${vn} · t · ${SI.year} · 15 principales`;
    draw('pi-map', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${p.name}</b><br>${fmt(p.value, 0)} t · ${fmt(p.value / T * 100, 1)}%` }),
      grid: { left: 8, right: 50, top: 6, bottom: 8, containLabel: true },
      xAxis: axisVal(), yAxis: axisCat(dd.map(x => DEPN[x[0]]), { axisLabel: { color: P['ink-2'], fontSize: 11 } }),
      series: [{ type: 'bar', barMaxWidth: 16, data: dd.map(x => x[1]), itemStyle: { color: P.s1, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 10, color: P['ink-2'], formatter: p => fmt(p.value / T * 100, 1) + '%' } }]
    }));
    setTable('pi-map', ['Departamento', 'Volumen (t)', 'Part. %'], td.map(([d, v]) => [DEPN[d], v, v / T * 100]));
    // sankey MP -> actividad (utilización)
    const U = D.rows.filter(r => r[0] === 'U' && r[4] === SI.year && (act < 0 || r[1] === act));
    const lk = {}; U.forEach(r => { const k = r[2] + '|' + r[1]; lk[k] = (lk[k] || 0) + tot(r); });
    const links = Object.entries(lk).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => { const [p, a] = k.split('|').map(Number); return { source: 'mp:' + D.prods[p], target: 'ac:' + D.acts[a], value: Math.round(v) }; });
    const lkT = sum(links.map(l => l.value));
    const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))].map(n => ({ name: n, itemStyle: { color: n.startsWith('ac:') ? P.cat[topA.indexOf(D.acts.indexOf(n.slice(3))) % 8] : P.muted } }));
    if (!links.length) noData('pi-sankey'); else draw('pi-sankey', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => p.dataType === 'edge' ? `${esc(p.data.source.slice(3))} → ${esc(p.data.target.slice(3))}<br><b>${fmt(p.value, 0)} t</b>` : `<b>${esc(p.name.slice(3))}</b><br>${fmt(p.value, 0)} t` }),
      series: [{ type: 'sankey', left: 4, right: 150, top: 8, bottom: 8, nodeGap: 6, nodeWidth: 10, draggable: false, emphasis: { focus: 'adjacency' }, data: nodes, links,
        label: { color: P.ink, fontSize: 11, formatter: p => p.value < lkT * 0.006 ? '' : p.name.slice(3) }, lineStyle: { color: 'gradient', opacity: .35, curveness: .5 } }]
    }));
    setTable('pi-sankey', ['Materia prima', 'Actividad', 'Utilización (t)'], links.map(l => [l.source.slice(3), l.target.slice(3), l.value]));
    // top productos
    const tt = tp.slice(0, 15).reverse();
    $('#s-pi-top').textContent = `${vn} · t · ${SI.year}`;
    draw('pi-top', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(p.name)}</b><br>${fmt(p.value, 0)} t · ${fmt(p.value / T * 100, 1)}%` }),
      grid: { left: 8, right: 50, top: 6, bottom: 8, containLabel: true },
      xAxis: axisVal(), yAxis: axisCat(tt.map(x => D.prods[x[0]]), { axisLabel: { color: P['ink-2'], fontSize: 11, width: 160, overflow: 'truncate' } }),
      series: [{ type: 'bar', barMaxWidth: 16, data: tt.map(x => x[1]), itemStyle: { color: P.s3, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 10, color: P['ink-2'], formatter: p => fmtShort(p.value) } }]
    }));
    setTable('pi-top', ['Producto', 'Volumen (t)', 'Part. %'], tp.map(([p, v]) => [D.prods[p], v, v / T * 100]));
    // heatmap mes × año
    const hd = []; ys.forEach((y, r) => { for (let m = 0; m < 12; m++) { const v = sum(rows.filter(x => x[4] === y).map(x => x[5 + m])); if (v > 0) hd.push([m, r, Math.round(v)]); } });
    const mx = Math.max(...hd.map(d => d[2]), 1);
    $('#s-pi-heat').textContent = `${vn} · t por mes${act >= 0 ? ' · ' + D.acts[act] : ''}`;
    draw('pi-heat', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${MESL[p.value[1]]} ${ys[p.value[0]]}</b><br>${fmt(p.value[2], 0)} t` }),
      grid: { left: 8, right: 90, top: 4, bottom: 8, containLabel: true },
      xAxis: axisCat(ys.map(String), { position: 'top' }), yAxis: axisCat(MESES, { inverse: true }),
      visualMap: { type: 'continuous', min: 0, max: mx, inRange: { color: [P.q0, P.q2, P.q5] }, right: 0, top: 'middle', itemHeight: 140, itemWidth: 10, textStyle: { color: P['ink-2'], fontSize: 11 }, formatter: v => fmtShort(v) },
      series: [{ type: 'heatmap', data: hd.map(d => [d[1], d[0], d[2]]), itemStyle: { borderColor: P.surface, borderWidth: 2 } }]
    }));
    setTable('pi-heat', ['Año', ...MESES], ys.map((y, r) => [String(y), ...MESES.map((m, k) => (hd.find(d => d[0] === k && d[1] === r) || [])[2] ?? null)]));
  }
};

/* ---------------------------------------------------------------- INSUMOS (agroquímicos) */
const SQ = { tipo: 'Nitrogenados', p: 'Urea Agricola', dep: '00' };
const FERT = ['Urea Agricola', 'Fosfato Diamonico', 'Cloruro de Potasio', 'Nitrato de Amonio', 'Sulfato de Amonio'];
TABS.insumos = {
  async render(root) {
    const Q = await load('data/agroq.json');
    const tipos = [...new Set(Q.prods.map(p => p.tipo))].sort();
    root.innerHTML = `<div class="panel-head"><div><h2>Insumos agrícolas: precios de fertilizantes y agroquímicos</h2>
      <p>Precios de venta al productor registrados en provincias, en soles corrientes por unidad comercial (t, kg o l, según el producto). Se resume con la mediana para atenuar valores extremos.</p></div></div>
      <div class="filters">${sel('pq-t', tipos, SQ.tipo, 'Tipo de insumo')}<span id="pq-pbox"></span>
      ${sel('pq-dep', [['00', 'Todo el país'], ...DEPS.map(d => [d, DEPN[d]])], SQ.dep, 'Ámbito')}</div>
      <div class="kpis" id="pq-k"></div>
      <div class="grid">
        ${card('pq-fan', 'Precio mensual: mediana y rango intercuartílico', '', 'w7', 'tall', 'Banda: precios entre el percentil 25 y 75 de los registros del mes en todo el país.')}
        ${card('pq-idx', 'Índice de precios de fertilizantes', 'Mediana nacional, promedio 2019 = 100', 'w5', 'tall')}
        ${card('pq-map', 'Precio mediano por departamento', '', 'w5', 'map')}
        ${card('pq-box', 'Dispersión del precio por departamento', '', 'w7', 'map', 'Distribución de las medianas mensuales departamentales en los últimos 12 meses con registro.')}
      </div>`;
    const drawP = () => { const ps = Q.prods.filter(p => p.tipo === SQ.tipo); if (!ps.some(p => p.p === SQ.p)) SQ.p = ps[0].p;
      $('#pq-pbox').innerHTML = sel('pq-p', ps.map(p => [p.p, `${p.p} (${p.um})`]), SQ.p, 'Producto'); bindSel('pq-p', v => { SQ.p = v; this.update(Q); }); };
    bindSel('pq-t', v => { SQ.tipo = v; drawP(); this.update(Q); }); bindSel('pq-dep', v => { SQ.dep = v; this.update(Q); });
    drawP(); await ensureMaps(); this.update(Q);
  },
  update(Q) {
    const info = Q.prods.find(p => p.p === SQ.p), um = info.um.replace(/^1/, ''), N = Q.nat[SQ.p] || [], D = Q.dep[SQ.p] || [];
    const unit = `S/ por ${um}`;
    const yms = N.map(r => r[0]), lastYM = yms.at(-1);
    const ymAdd = (ym, k) => { let [y, m] = ym.split('-').map(Number); m += k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
    const depSeries = SQ.dep === '00' ? null : Object.fromEntries(D.filter(r => r[0] === SQ.dep).map(r => [r[1], r[2]]));
    const ref = depSeries ? yms.map(ym => depSeries[ym] ?? null) : N.map(r => r[2]);
    const lastIdx = ref.map((v, i) => v != null ? i : -1).filter(i => i >= 0).at(-1) ?? N.length - 1;
    const lv = ref[lastIdx], lym = yms[lastIdx], i12 = yms.indexOf(ymAdd(lym, -12));
    const avg19 = (() => { const a = yms.map((ym, i) => ym.startsWith('2019') ? ref[i] : null).filter(v => v != null); return a.length ? sum(a) / a.length : null; })();
    const lab = ym => { const [y, m] = ym.split('-'); return `${MESES[+m - 1]} ${y}`; };
    $('#pq-k').innerHTML = kpi(`${SQ.p} · ${lab(lym)}`, `S/ ${fmt(lv, 2)}`, `por ${um} · ${SQ.dep === '00' ? 'mediana nacional' : DEPN[SQ.dep]}`)
      + kpi('Variación a 12 meses', pct(vr(lv, i12 >= 0 ? ref[i12] : null)), i12 >= 0 && ref[i12] != null ? `${lab(yms[i12])}: S/ ${fmt(ref[i12], 2)}` : 'Sin registro comparable')
      + kpi('Frente al promedio 2019', pct(vr(lv, avg19)), `Promedio 2019: S/ ${fmt(avg19, 2)}`)
      + kpi('Registros del último mes', fmt(N.at(-1)?.[4]), `Último mes con datos: ${lab(lastYM)}`);
    // fan chart
    const xs = yms.map(lab), p25 = N.map(r => r[1]), p75 = N.map(r => r[3]);
    const ser = [{ name: 'P25', type: 'line', stack: 'b', data: p25, lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
      { name: 'Rango intercuartílico', type: 'line', stack: 'b', data: p75.map((v, i) => v - p25[i]), lineStyle: { opacity: 0 }, symbol: 'none', itemStyle: { color: P.s1, opacity: .3 }, areaStyle: { color: P.s1, opacity: .16 }, silent: true },
      { name: 'Mediana nacional', type: 'line', data: N.map(r => r[2]), showSymbol: false, lineStyle: { width: 2, color: P.s1 }, itemStyle: { color: P.s1 } }];
    if (depSeries) ser.push({ name: DEPN[SQ.dep], type: 'line', data: ref, showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: P.s2 }, itemStyle: { color: P.s2 } });
    $('#h-pq-fan').textContent = `Precio mensual de ${SQ.p}`; $('#s-pq-fan').textContent = `${unit} · mediana y rango intercuartílico nacional`;
    draw('pq-fan', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', formatter: ps => { const i = ps[0].dataIndex; return `<b>${xs[i]}</b><br>Mediana: S/ ${fmt(N[i][2], 2)}<br>P25–P75: S/ ${fmt(p25[i], 2)} – ${fmt(p75[i], 2)}<br>Registros: ${N[i][4]}` + (depSeries ? `<br>${DEPN[SQ.dep]}: S/ ${fmt(ref[i], 2)}` : ''); } }),
      legend: Object.assign(base().legend, { data: ['Mediana nacional', 'Rango intercuartílico', ...(depSeries ? [DEPN[SQ.dep]] : [])] }),
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
      xAxis: axisCat(xs, { boundaryGap: false, axisLabel: { color: P.muted, interval: i => xs[i].startsWith('Ene') } }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted, formatter: v => fmtShort(v) } }), series: ser
    }));
    setTable('pq-fan', ['Mes', 'P25', 'Mediana', 'P75', 'Registros', ...(depSeries ? [DEPN[SQ.dep]] : [])], N.map((r, i) => [xs[i], r[1], r[2], r[3], r[4], ...(depSeries ? [ref[i]] : [])]));
    // índice fertilizantes
    const allYM = [...new Set(FERT.flatMap(f => (Q.nat[f] || []).map(r => r[0])))].sort();
    const iser = FERT.filter(f => Q.nat[f]).map((f, k) => { const mm = Object.fromEntries(Q.nat[f].map(r => [r[0], r[2]])); const b = Q.nat[f].filter(r => r[0].startsWith('2019')); const bb = b.length ? sum(b.map(r => r[2])) / b.length : null;
      return { name: f, type: 'line', data: allYM.map(ym => mm[ym] && bb ? +(mm[ym] / bb * 100).toFixed(1) : null), showSymbol: false, connectNulls: true, lineStyle: { width: f === SQ.p ? 3 : 1.6, color: P.cat[k] }, itemStyle: { color: P.cat[k] }, z: f === SQ.p ? 5 : 2 }; });
    draw('pq-idx', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt(v, 1) }),
      grid: { left: 8, right: 16, top: 50, bottom: 8, containLabel: true },
      xAxis: axisCat(allYM.map(lab), { boundaryGap: false, axisLabel: { color: P.muted, interval: i => allYM[i].endsWith('-01') } }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted } }),
      series: [...iser, { type: 'line', data: [], markLine: { silent: true, symbol: 'none', lineStyle: { color: P.axis, type: 'solid' }, label: { show: false }, data: [{ yAxis: 100 }] } }]
    }));
    setTable('pq-idx', ['Mes', ...iser.map(s => s.name)], allYM.map((ym, i) => [lab(ym), ...iser.map(s => s.data[i])]));
    // mapa y boxplot últimos 12 meses
    const from = ymAdd(lastYM, -11), rec = D.filter(r => r[1] >= from);
    const byD = {}; rec.forEach(r => (byD[r[0]] = byD[r[0]] || []).push(r[2]));
    const med = Object.entries(byD).map(([d, a]) => ({ d, v: quant(a.slice().sort((x, y) => x - y), .5), n: a.length }));
    $('#s-pq-map').textContent = `${unit} · mediana ${lab(from)} – ${lab(lastYM)}`;
    draw('pq-map', mapOption({ map: 'dep', rows: med.map(m => ({ id: m.d, value: m.v, extra: `${m.n} meses con registro` })), unit, fmtFn: v => fmtShort(v) }));
    setTable('pq-map', ['Departamento', `Mediana (${unit})`, 'Meses'], med.sort((a, b) => b.v - a.v).map(m => [DEPN[m.d], m.v, m.n]));
    const st = Object.entries(byD).map(([d, a]) => ({ d, s: boxStats(a) })).filter(x => x.s).sort((a, b) => b.s.box[2] - a.s.box[2]);
    $('#s-pq-box').textContent = `${unit} · ${lab(from)} – ${lab(lastYM)}`;
    if (!st.length) noData('pq-box'); else draw('pq-box', boxOption(st.map(x => DEPN[x.d]), st.map(x => x.s), unit, P.s2, true));
    setTable('pq-box', ['Departamento', 'Meses', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.'], st.map(x => [DEPN[x.d], x.s.n, ...x.s.box]));
  }
};

/* ---------------------------------------------------------------- COMERCIO EXTERIOR */
const SX = { f: 'E', year: 2025, p: '-1', per: 'full' };
const prodName = s => { s = cap(s).replace(/\s+,/g, ','); return s.length > 70 ? s.slice(0, 68) + '…' : s; };
TABS.comercio = {
  async render(root) {
    const C = await load('data/comex.json');
    const ys = [...new Set(C.m.map(r => r[1]))].sort(), LY = ys.at(-1), LM = Math.max(...C.m.filter(r => r[1] === LY).map(r => r[2]));
    this.LY = LY; this.LM = LM;
    root.innerHTML = `<div class="panel-head"><div><h2>Comercio exterior agrario</h2>
      <p>Exportaciones e importaciones de productos agrarios por partida arancelaria y país (SISCOMEX), en miles de US$ FOB y toneladas de peso neto. Datos hasta ${MESL[LM - 1]} ${LY}.</p></div></div>
      <div class="filters">${seg('px-f', [['E', 'Exportaciones'], ['I', 'Importaciones']], SX.f, 'Flujo')}
      ${sel('px-year', ys.slice().reverse().map(y => [y, y === LY ? `${y} (ene–${MESES[LM - 1].toLowerCase()})` : y]), SX.year, 'Año')}
      ${seg('px-per', [['full', 'Año completo'], ['ytd', `Ene–${MESES[LM - 1].toLowerCase()}`]], SX.per, 'Periodo')}<span id="px-pbox"></span></div>
      <div class="kpis" id="px-k"></div>
      <div class="grid">
        ${card('px-ann', 'Exportaciones, importaciones y saldo', 'Millones de US$ FOB', 'w7', 'tall')}
        ${card('px-tree', 'Productos', '', 'w5', 'tall')}
        ${card('px-map', 'Mercados de destino', '', 'w8', 'map', 'No se dibujan territorios pequeños sin geometría (p. ej., Hong Kong, Singapur); figuran en la tabla.')}
        ${card('px-top', 'Principales países', '', 'w4', 'map')}
        ${card('px-uv', 'Valor unitario mensual', 'US$ por kg (FOB / peso neto)', 'w7', 'tall')}
        ${card('px-heat', 'Estacionalidad del comercio', 'Millones de US$ FOB por mes', 'w5', 'tall')}
      </div>`;
    const drawP = () => { const ps = C.prods.map((p, i) => [i, p]).filter(([i, p]) => p[0] === SX.f).slice(0, 80);
      if (SX.p !== '-1' && !ps.some(([i]) => String(i) === SX.p)) SX.p = '-1';
      $('#px-pbox').innerHTML = sel('px-p', [['-1', 'Todos los productos'], ...ps.map(([i, p]) => [i, prodName(p[2])])], SX.p, 'Producto (80 principales)');
      bindSel('px-p', v => { SX.p = v; this.update(C); }); };
    bindSeg('px-f', v => { SX.f = v; drawP(); this.update(C); });
    bindSel('px-year', v => { SX.year = +v; if (SX.year === LY) { SX.per = 'ytd'; $$('#px-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'ytd')); } this.update(C); });
    bindSeg('px-per', v => { SX.per = SX.year === LY ? 'ytd' : v; $$('#px-per button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SX.per)); this.update(C); });
    drawP(); await ensureMaps(); this.update(C);
  },
  update(C) {
    const LY = this.LY, LM = this.LM, per = SX.year === LY ? 'ytd' : SX.per, pi = +SX.p, fl = SX.f;
    const inP = i => C.prods[i][0] === fl && (pi < 0 || i === pi);
    const mm = C.m.filter(r => inP(r[0]) && (per === 'full' || r[2] <= LM));
    const agg = y => { const a = mm.filter(r => r[1] === y); return { F: sum(a.map(r => r[3])), W: sum(a.map(r => r[4])) }; };
    const c0 = agg(SX.year), c1 = agg(SX.year - 1);
    const pa = C.pa.filter(r => inP(r[0]) && r[2] === SX.year);
    const byC = {}; pa.forEach(r => byC[r[1]] = (byC[r[1]] || 0) + r[3]);
    const cl = Object.entries(byC).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); const ct = sum(cl.map(x => x[1]));
    const hhi = sum(cl.map(([, v]) => (v / ct * 100) ** 2));
    const flN = fl === 'E' ? 'Exportaciones' : 'Importaciones', plab = per === 'ytd' ? `ene–${MESES[LM - 1].toLowerCase()} ${SX.year}` : String(SX.year);
    $('#px-k').innerHTML = kpi(`${flN} · ${plab}`, `US$ ${fmt(c0.F / 1000, 1)} M`, `${chip(vr(c0.F, c1.F))} vs igual periodo ${SX.year - 1}`)
      + kpi('Volumen', `${fmt(c0.W / 1000, 1)} mil t`, chip(vr(c0.W, c1.W)))
      + kpi('Valor unitario', `US$ ${fmt(c0.W ? c0.F / c0.W : null, 2)} por kg`, `${SX.year - 1}: US$ ${fmt(c1.W ? c1.F / c1.W : null, 2)}`)
      + kpi(fl === 'E' ? 'Mercados de destino' : 'Países de origen', fmt(cl.length), cl[0] ? `Principal: ${C.countries[cl[0][0]][0]} (${fmt(cl[0][1] / ct * 100, 1)}%)` : '')
      + kpi('Concentración de mercados (IHH)', fmt(hhi, 0), hhi > 2500 ? 'Alta concentración (> 2,500)' : hhi > 1500 ? 'Concentración moderada' : 'Baja concentración (< 1,500)');
    // anual X, M, saldo
    const ys = [...new Set(C.m.map(r => r[1]))].sort().filter(y => per === 'ytd' || y < LY);
    const yv = f => ys.map(y => sum(C.m.filter(r => r[1] === y && C.prods[r[0]][0] === f && (pi < 0 || r[0] === pi || C.prods[pi][0] !== f) && (per === 'full' || r[2] <= LM)).map(r => r[3])) / 1000);
    const X = yv('E'), M = yv('I');
    $('#s-px-ann').textContent = `Millones de US$ FOB · ${per === 'ytd' ? 'acumulado ene–' + MESES[LM - 1].toLowerCase() : 'años completos'}${pi >= 0 ? ' · flujo seleccionado: producto elegido; otro flujo: total' : ''}`;
    draw('px-ann', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => 'US$ ' + fmt(v, 1) + ' M' }),
      xAxis: axisCat(ys.map(String)), yAxis: axisVal(),
      series: [{ name: 'Exportaciones', type: 'bar', barGap: '8%', barMaxWidth: 18, data: X, itemStyle: { color: P.s1, borderRadius: [4, 4, 0, 0] } },
        { name: 'Importaciones', type: 'bar', barMaxWidth: 18, data: M, itemStyle: { color: P.s2, borderRadius: [4, 4, 0, 0] } },
        { name: 'Saldo comercial', type: 'line', data: X.map((x, i) => +(x - M[i]).toFixed(1)), symbol: 'circle', symbolSize: 6, lineStyle: { width: 2, color: P.ink }, itemStyle: { color: P.ink, borderColor: P.surface, borderWidth: 1 } }]
    }));
    setTable('px-ann', ['Año', 'Exportaciones', 'Importaciones', 'Saldo'], ys.map((y, i) => [String(y), X[i], M[i], X[i] - M[i]]));
    // treemap productos
    const byP = {}; C.pa.filter(r => C.prods[r[0]][0] === fl && r[2] === SX.year).forEach(r => byP[r[0]] = (byP[r[0]] || 0) + r[3]);
    const pl = Object.entries(byP).sort((a, b) => b[1] - a[1]); const pt = sum(pl.map(x => x[1]));
    const tp = pl.slice(0, 25).map(([i, v]) => ({ name: prodName(C.prods[i][2]), value: Math.round(v), itemStyle: +i === pi ? { borderColor: P.ink, borderWidth: 2 } : {} }));
    if (pl.length > 25) tp.push({ name: 'Resto de productos', value: Math.round(sum(pl.slice(25).map(x => x[1]))), itemStyle: { color: P.muted } });
    $('#h-px-tree').textContent = `${flN} por producto`; $('#s-px-tree').textContent = `Miles de US$ FOB · ${SX.year}${SX.year === LY ? ' (parcial)' : ''} · 25 principales partidas`;
    draw('px-tree', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(p.name)}</b><br>US$ ${fmt(p.value / 1000, 1)} M · ${fmt(p.value / pt * 100, 1)}%` }),
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, top: 0, left: 0, right: 0, bottom: 0, data: tp,
        levels: [{ itemStyle: { color: fl === 'E' ? P.s1 : P.s2, borderColor: P.surface, borderWidth: 2, gapWidth: 2 } }],
        label: { color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'truncate', formatter: p => p.value / pt < 0.02 ? '' : `${p.name}\n${fmt(p.value / pt * 100, 1)}%` } }]
    }));
    setTable('px-tree', ['Partida', 'Código', 'Miles US$ FOB', 'Part. %'], pl.map(([i, v]) => [prodName(C.prods[i][2]), C.prods[i][1], v, v / pt * 100]));
    // mapa mundial
    const rows = cl.filter(([c]) => C.countries[c][1]).map(([c, v]) => ({ id: C.countries[c][1], value: v / 1000, extra: `${C.countries[c][0]} · ${fmt(v / ct * 100, 1)}%` }));
    const wn = Object.fromEntries(cl.map(([c]) => [C.countries[c][1], C.countries[c][0]]));
    $('#h-px-map').textContent = fl === 'E' ? 'Mercados de destino' : 'Países de origen';
    $('#s-px-map').textContent = `Millones de US$ FOB · ${SX.year}${SX.year === LY ? ' (parcial)' : ''}${pi >= 0 ? ' · ' + prodName(C.prods[pi][2]) : ''}`;
    draw('px-map', mapOption({ map: 'world', rows, unit: 'M US$', level: 'world', fmtFn: v => fmt(v, v < 10 ? 1 : 0), nameFn: id => wn[id] || id, zoom: 1.15 }));
    setTable('px-map', ['País', 'Miles US$ FOB', 'Part. %'], cl.map(([c, v]) => [C.countries[c][0], v, v / ct * 100]));
    // top países
    const tc = cl.slice(0, 15).reverse();
    draw('px-top', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${esc(p.name)}</b><br>US$ ${fmt(p.value, 1)} M · ${fmt(p.value * 1000 / ct * 100, 1)}%` }),
      grid: { left: 8, right: 44, top: 6, bottom: 8, containLabel: true },
      xAxis: axisVal(), yAxis: axisCat(tc.map(x => C.countries[x[0]][0]), { axisLabel: { color: P['ink-2'], fontSize: 11 } }),
      series: [{ type: 'bar', barMaxWidth: 15, data: tc.map(x => +(x[1] / 1000).toFixed(2)), itemStyle: { color: fl === 'E' ? P.s1 : P.s2, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', fontSize: 10, color: P['ink-2'], formatter: p => fmt(p.value * 1000 / ct * 100, 1) + '%' } }]
    }));
    $('#s-px-top').textContent = `Millones de US$ FOB · ${SX.year}`;
    setTable('px-top', ['País', 'Millones US$ FOB'], tc.slice().reverse().map(x => [C.countries[x[0]][0], x[1] / 1000]));
    // valor unitario mensual (últimos 6 años)
    const allm = C.m.filter(r => inP(r[0]) && r[1] >= LY - 6);
    const km = {}; allm.forEach(r => { const k = r[1] * 100 + r[2]; const o = km[k] || (km[k] = { F: 0, W: 0 }); o.F += r[3]; o.W += r[4]; });
    const ks = Object.keys(km).map(Number).sort(), xs = ks.map(k => `${MESES[k % 100 - 1]} ${Math.floor(k / 100)}`);
    $('#s-px-uv').textContent = `US$ por kg (FOB / peso neto) · ${pi >= 0 ? prodName(C.prods[pi][2]) : 'todos los productos del flujo'}`;
    draw('px-uv', base({
      tooltip: Object.assign(base().tooltip, { trigger: 'axis', formatter: ps => { const o = km[ks[ps[0].dataIndex]]; return `<b>${ps[0].axisValue}</b><br>US$ ${fmt(ps[0].value, 2)} por kg<br>FOB: US$ ${fmt(o.F / 1000, 1)} M · ${fmt(o.W, 0)} t`; } }),
      grid: { left: 8, right: 16, top: 14, bottom: 8, containLabel: true },
      xAxis: axisCat(xs, { boundaryGap: false, axisLabel: { color: P.muted, interval: i => xs[i].startsWith('Ene') } }), yAxis: axisVal({ scale: true, axisLabel: { color: P.muted, formatter: v => fmt(v, 2) } }),
      series: [{ type: 'line', data: ks.map(k => km[k].W ? +(km[k].F / km[k].W).toFixed(3) : null), showSymbol: false, lineStyle: { width: 2, color: fl === 'E' ? P.s1 : P.s2 }, areaStyle: { color: fl === 'E' ? P.s1 : P.s2, opacity: .1 } }]
    }));
    setTable('px-uv', ['Mes', 'US$/kg', 'Miles US$ FOB', 't'], ks.map((k, i) => [xs[i], km[k].W ? km[k].F / km[k].W : null, km[k].F, km[k].W]));
    // heatmap año × mes
    const hy = [...new Set(C.m.map(r => r[1]))].sort(); const hd = [];
    hy.forEach((y, r) => { for (let m = 1; m <= 12; m++) { const v = sum(C.m.filter(x => inP(x[0]) && x[1] === y && x[2] === m).map(x => x[3])) / 1000; if (v > 0) hd.push([m - 1, r, +v.toFixed(1)]); } });
    draw('px-heat', base({
      tooltip: Object.assign(base().tooltip, { formatter: p => `<b>${MESL[p.value[0]]} ${hy[p.value[1]]}</b><br>US$ ${fmt(p.value[2], 1)} M` }),
      grid: { left: 8, right: 10, top: 8, bottom: 46, containLabel: true },
      xAxis: axisCat(MESES), yAxis: axisCat(hy.map(String), { inverse: true }),
      visualMap: { type: 'continuous', min: 0, max: Math.max(...hd.map(d => d[2]), 1), inRange: { color: fl === 'E' ? [P.dmid, P.dpos2, P.dpos] : [P.dmid, P.dneg2, P.dneg] }, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 160, itemWidth: 10, textStyle: { color: P['ink-2'], fontSize: 11 }, formatter: v => fmt(v, 0) },
      series: [{ type: 'heatmap', data: hd, itemStyle: { borderColor: P.surface, borderWidth: 2 } }]
    }));
    setTable('px-heat', ['Año', ...MESES], hy.map((y, r) => [String(y), ...MESES.map((m, k) => (hd.find(d => d[0] === k && d[1] === r) || [])[2] ?? null)]));
  }
};

/* ---------------------------------------------------------------- METODOLOGÍA */
TABS.metodologia = {
  async render(root) {
    root.innerHTML = `<div class="panel-head"><div><h2>Metodología y fuentes</h2><p>Bases utilizadas, cobertura, unidades y tratamiento aplicado a cada temática.</p></div></div>
    <div class="method">
      <h3>Bases de datos</h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Pestaña</th><th>Base (archivo)</th><th>Cobertura</th><th>Unidades</th></tr></thead><tbody>
        <tr><td>Panorama VBP · Pecuario</td><td>DATA_VBP.xlsx (MIDAGRI-SIEA)</td><td>2000 – julio 2026, mensual, 24 departamentos, 170 productos</td><td>VBP en millones de S/ a precios de 2007; producción en t</td></tr>
        <tr><td>Producción agrícola · Precios</td><td>SISAGRI.xlsx y SISAGRI_OTROS_CULTIVOS.xlsx (DATA_PERFIL_PRODUCTIVO)</td><td>2015 – mayo 2026, mensual, distrital (4.4 millones de registros); otros cultivos a nivel departamental</td><td>Siembra y cosecha en ha; producción en t; precio en chacra en S/ por kg</td></tr>
        <tr><td>Campaña agrícola</td><td>DATA_AVANCE_AGRICOLA.xlsx</td><td>Campañas 2022-2023 a 2024-2025, promedio histórico y ENIS 2024-2025; distrital, 107 cultivos</td><td>Superficie sembrada en ha</td></tr>
        <tr><td>Precios</td><td>PRECIO_CHACRA.xlsx; SISAP.xlsx</td><td>Registro semanal regional 2020-2025 (8 productos); precio mayorista anual por variedad 2010-2026</td><td>S/ por kg</td></tr>
        <tr><td>Agroindustria</td><td>DATA_AGROINDUSTRIAL.xlsx</td><td>2010-2025, mensual, por actividad, producto y departamento</td><td>t</td></tr>
        <tr><td>Insumos agrícolas</td><td>DATA_AGROQUIMICOS.xlsx</td><td>Enero 2019 – junio 2026, registros por provincia</td><td>S/ por unidad comercial (t, kg o l)</td></tr>
        <tr><td>Comercio exterior</td><td>SISCOMEX.xlsx</td><td>2015 – julio 2026, mensual, por partida y país</td><td>Miles de US$ FOB; t de peso neto</td></tr>
      </tbody></table></div>
      <h3>Tratamiento</h3>
      <ul>
        <li><b>Comparaciones homogéneas.</b> Cuando el último año está incompleto, las variaciones comparan el mismo periodo acumulado (por ejemplo, enero–julio) del año previo.</li>
        <li><b>Cultivo genérico.</b> En SISAGRI las variedades se agrupan por los siete primeros dígitos del código de producto (p. ej., papa nativa, mejorada y de color en «Papa»). Se presentan los 45 cultivos de mayor valor de producción 2023-2025, excluidos pastos y forrajes, además de alfalfa y los cultivos con registro departamental.</li>
        <li><b>Rendimiento y precio.</b> El rendimiento es producción entre superficie cosechada del año. El precio en chacra agregado es un promedio ponderado por la producción con precio registrado. En mapas y diagramas de caja de rendimiento se excluyen distritos con menos de 5 ha cosechadas (20 ha en provincias y departamentos) para evitar valores extremos por superficies mínimas.</li>
        <li><b>Diagramas de caja.</b> La caja cubre del primer al tercer cuartil con la mediana marcada; los bigotes llegan hasta 1.5 veces el rango intercuartílico y los puntos fuera de ese rango se muestran como atípicos.</li>
        <li><b>Mapas.</b> Las clases se definen por quintiles de los territorios con registro; las variaciones usan una escala divergente centrada en cero. La cartografía distrital no incluye 43 distritos de creación reciente, que sí se suman en los totales provinciales y departamentales. En el VBP, Lima incluye Callao.</li>
        <li><b>Precios de insumos.</b> Se descartan registros mayores a cinco veces o menores a la quinta parte de la mediana del producto, y se resume con la mediana mensual.</li>
        <li><b>Concentración de mercados.</b> Índice de Herfindahl-Hirschman (IHH): suma de los cuadrados de las participaciones porcentuales de cada país; valores mayores a 2,500 indican alta concentración.</li>
        <li><b>Valor unitario de comercio.</b> Miles de US$ FOB entre toneladas de peso neto, equivalente a US$ por kg.</li>
      </ul>
      <h3>Referencia</h3>
      <p>El boletín mensual «El Agro en Cifras» (agosto 2026) y sus cuadros en Excel se incluyen en la carpeta del proyecto como referencia para contrastar cifras oficiales del periodo enero–agosto 2026.</p>
    </div>`;
  }
};
