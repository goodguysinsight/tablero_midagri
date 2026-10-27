# -*- coding: utf-8 -*-
"""VBP agropecuario (DATA_VBP.xlsx) -> data/vbp.json"""
import pandas as pd, numpy as np, json, os
OUT = '/home/claude/tablero/data'; os.makedirs(OUT, exist_ok=True)
MES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
v = pd.read_parquet('/home/claude/data/pq/vbp.parquet')
v['M'] = v.MES.map({m: i for i, m in enumerate(MES)})
v['DEP'] = v.COD_DEPARTAMENTO.astype(int).map(lambda x: f'{x:02d}')
v['TIPO'] = v.TIPO.str.replace('AGRÍCOLA', 'AGRICOLA')
years = sorted(v.ANIO.unique().tolist())
last_year = years[-1]
last_m = int(v[v.ANIO == last_year].M.max())  # 0-based
deps = sorted(v.DEP.unique().tolist())
R = lambda a, d=3: [round(float(x), d) if pd.notna(x) else None for x in a]

def cube(df, val, idx):
    p = df.pivot_table(index=idx, columns='M', values=val, aggfunc='sum').reindex(columns=range(12))
    return p

out = {'years': years, 'last_year': int(last_year), 'last_month': last_m, 'deps': deps,
       'unit_vbp': 'Millones de S/ a precios de 2007', 'unit_prod': 't'}
# national monthly by tipo
nat = {}
for t, g in v.groupby('TIPO'):
    p = cube(g, 'VBP', 'ANIO').reindex(years)
    nat[t] = [R(p.loc[y].values) for y in years]
out['nat_month'] = nat
# dept monthly by tipo
dm = {}
for t, g in v.groupby('TIPO'):
    dm[t] = {}
    for d, gg in g.groupby('DEP'):
        p = cube(gg, 'VBP', 'ANIO').reindex(years)
        dm[t][d] = [R(p.loc[y].values) for y in years]
out['dep_month'] = dm
# products
prods = {}
tot = v[v.ANIO < last_year].groupby('PRODUCTO').VBP.sum()
for pr, g in v.groupby('PRODUCTO'):
    pv = cube(g, 'VBP', 'ANIO').reindex(years)
    pq = cube(g, 'PRODUCCION', 'ANIO').reindex(years)
    dep_a = g.groupby(['DEP', 'ANIO']).agg(VBP=('VBP', 'sum'), Q=('PRODUCCION', 'sum'))
    ytd = g[g.M <= last_m].groupby(['DEP', 'ANIO']).agg(VBP=('VBP', 'sum'), Q=('PRODUCCION', 'sum'))
    dep = {}
    for d in sorted(g.DEP.unique()):
        a = dep_a.loc[d].reindex(years); b = ytd.loc[d].reindex(years) if d in ytd.index.get_level_values(0) else None
        dep[d] = {'v': R(a.VBP.values), 'q': R(a.Q.values, 1),
                  'vy': R(b.VBP.values) if b is not None else None, 'qy': R(b.Q.values, 1) if b is not None else None}
    prods[pr] = {'tipo': g.TIPO.iloc[0], 'tot': round(float(tot.get(pr, 0)), 2),
                 'vm': [R(pv.loc[y].values) for y in years],
                 'qm': [R(pq.loc[y].values, 1) for y in years], 'dep': dep}
out['prod'] = prods
json.dump(out, open(f'{OUT}/vbp.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('vbp', os.path.getsize(f'{OUT}/vbp.json') / 1e6, 'MB', last_year, last_m)
