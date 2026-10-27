# -*- coding: utf-8 -*-
"""SISAGRI distrital (2015-2026) -> data/sisagri/index.json + un JSON por cultivo genérico.
Cultivo genérico = primeros 7 dígitos del código de producto (agrupa variedades)."""
import polars as pl, pandas as pd, json, os, re
OUT = '/home/claude/tablero/data/sisagri'; os.makedirs(OUT, exist_ok=True)
df = pl.read_parquet('/home/claude/data/pq/sisagri.parquet')
df = df.with_columns(pl.col('COD_PRODUCTO').str.slice(0, 7).alias('G'),
                     pl.col('ANIO').cast(pl.Int32), pl.col('MES').cast(pl.Int32),
                     pl.col('UBIGEO').str.zfill(6))
# nombre del genérico: el del código terminado en 0000, si existe
names = (df.select('COD_PRODUCTO', 'PRODUCTO', 'G').unique(subset=['COD_PRODUCTO'])
           .sort('COD_PRODUCTO').group_by('G', maintain_order=True).agg(pl.col('PRODUCTO').first()))
NAME_FIX = {'CAFETO': 'Café', 'VID': 'Uva (vid)', 'PALTO': 'Palta', 'MANDARIN0': 'Mandarina', 'NARANJO': 'Naranja',
            'MANZANO': 'Manzana', 'GRANADO': 'Granada', 'LIMON SUTIL': 'Limón', 'MAIZ CHOCLO CRIOLLO': 'Maíz choclo',
            'MAIZ AMILACEO MOROCHO': 'Maíz amiláceo', 'CAMOTE MORADO': 'Camote', 'FRIJOL GRANO SECO PINTADO': 'Frijol grano seco',
            'ARROZ': 'Arroz cáscara', 'MAIZ AMARILLO DURO': 'Maíz amarillo duro', 'PLATANOS Y BANANAS PARA COCCIÓN (M X paradisiaca)': 'Plátano',
            'CAÑA DE AZUCAR (PARA ALCOHOL)': 'Caña de azúcar (alcohol)', 'PIÑA': 'Piña', 'CEBADA GRANO': 'Cebada grano',
            'TRIGO BLANDO': 'Trigo', 'ESPARRAGO': 'Espárrago', 'CACAO': 'Cacao', 'QUINUA': 'Quinua', 'ALCACHOFA': 'Alcachofa',
            'MARACUYA': 'Maracuyá', 'HABA GRANO SECO': 'Haba grano seco', 'HABA GRANO VERDE': 'Haba grano verde',
            'ARVEJA GRANO VERDE': 'Arveja grano verde', 'ARVEJA GRANO SECO': 'Arveja grano seco', 'PAPRIKA': 'Páprika',
            'SANDIA': 'Sandía', 'OLLUCO': 'Olluco', 'ALFALFA': 'Alfalfa', 'AJO': 'Ajo', 'CEBOLLA': 'Cebolla', 'TOMATE': 'Tomate',
            'ZAPALLO': 'Zapallo', 'ZANAHORIA': 'Zanahoria', 'YUCA': 'Yuca', 'MANGO': 'Mango', 'PAPAYA': 'Papaya', 'OCA': 'Oca',
            'TUNA': 'Tuna', 'TANGELO': 'Tangelo', 'MAIZ AMILACEO': 'Maíz amiláceo', 'MAIZ CHOCLO': 'Maíz choclo',
            'LIMON TAHITI': 'Limón', 'OLIVO': 'Olivo (aceituna)', 'PIMIENTO': 'Pimiento y páprika', 'TUNA (PARA COCHINILLA)': 'Tuna (cochinilla)',
            'JENGIBRE O KION': 'Jengibre (kion)', 'AJI': 'Ají', 'CHOCHO O TARHUI G.S.': 'Tarwi (chocho)', 'TARA': 'Tara'}
gname = {}
for g, n in names.iter_rows():
    if g == '1404009': n = 'Papa'
    gname[g] = NAME_FIX.get(n, n.capitalize())
# agregación anual distrital
yr = df.filter(pl.col('ANIO').is_between(2016, 2025))
ag = (yr.group_by('G', 'UBIGEO', 'ANIO').agg(
        pl.col('SIEMBRA').sum().alias('S'), pl.col('COSECHA').sum().alias('C'), pl.col('PRODUCCION').sum().alias('Q'),
        (pl.col('PRECIO_CHACRA') * pl.col('PRODUCCION')).filter(pl.col('PRECIO_CHACRA') > 0).sum().alias('PQ'),
        pl.col('PRODUCCION').filter(pl.col('PRECIO_CHACRA') > 0).sum().alias('QP')))
# valor aproximado para ranking (2023-2025)
val = (ag.filter(pl.col('ANIO') >= 2023).group_by('G').agg(pl.col('PQ').sum().alias('V'), pl.col('Q').sum().alias('Q'))
         .sort('V', descending=True))
excl = ('1201', '1405', '1407023')  # pastos cultivados y forrajes
sel = [g for g, v, q in val.iter_rows() if not g.startswith(excl)][:45]
sel += ['1201001']  # alfalfa (referencia forrajera)
# monthly national series (2015-2026) for selected: produccion + precio ponderado
mon = (df.filter(pl.col('G').is_in(sel)).group_by('G', 'ANIO', 'MES').agg(
        pl.col('PRODUCCION').sum().alias('Q'), pl.col('SIEMBRA').sum().alias('S'), pl.col('COSECHA').sum().alias('C'),
        (pl.col('PRECIO_CHACRA') * pl.col('PRODUCCION')).filter(pl.col('PRECIO_CHACRA') > 0).sum().alias('PQ'),
        pl.col('PRODUCCION').filter(pl.col('PRECIO_CHACRA') > 0).sum().alias('QP')).sort('G', 'ANIO', 'MES'))
YEARS = list(range(2016, 2026))
r1 = lambda x: None if x is None else round(x, 1)
index = []
for g in sel:
    a = ag.filter(pl.col('G') == g).to_pandas()
    ubis = sorted(a.UBIGEO.unique())
    pos = {u: i for i, u in enumerate(ubis)}
    S = [[0] * len(ubis) for _ in YEARS]; C = [[0] * len(ubis) for _ in YEARS]; Q = [[0] * len(ubis) for _ in YEARS]; P = [[None] * len(ubis) for _ in YEARS]
    for r in a.itertuples():
        yi = r.ANIO - 2016; i = pos[r.UBIGEO]
        S[yi][i] = r1(r.S); C[yi][i] = r1(r.C); Q[yi][i] = r1(r.Q)
        P[yi][i] = round(r.PQ / r.QP, 2) if r.QP and r.QP > 0 else None
    m = mon.filter(pl.col('G') == g).to_pandas()
    mm = [[int(r.ANIO), int(r.MES), r1(r.Q), r1(r.S), r1(r.C), round(r.PQ / r.QP, 2) if r.QP and r.QP > 0 else None] for r in m.itertuples()]
    rec = {'g': g, 'name': gname[g], 'years': YEARS, 'ubi': ubis, 'S': S, 'C': C, 'Q': Q, 'P': P, 'm': mm}
    json.dump(rec, open(f'{OUT}/{g}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    tq = a[a.ANIO == 2025].Q.sum()
    index.append({'g': g, 'name': gname[g], 'q2025': round(float(tq)), 'n': len(ubis)})
    print(g, gname[g], len(ubis), round(os.path.getsize(f'{OUT}/{g}.json') / 1e3), 'KB')
json.dump({'cultivos': index, 'years': YEARS, 'last_month_2026': int(df.filter(pl.col('ANIO') == 2026).select(pl.col('MES').max()).item())},
          open(f'{OUT}/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
# lookup ubigeo -> nombres
ub = df.select('UBIGEO', 'DEPARTAMENTO', 'PROVINCIA', 'DISTRITO').unique(subset=['UBIGEO']).sort('UBIGEO')
json.dump({u: [d, p, di] for u, d, p, di in ub.iter_rows()}, open('/home/claude/tablero/data/ubigeo.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---- Otros cultivos con registro departamental (SISAGRI_OTROS_CULTIVOS)
DEPC = {'AMAZONAS':'01','ANCASH':'02','APURIMAC':'03','AREQUIPA':'04','AYACUCHO':'05','CAJAMARCA':'06','CALLAO':'07','CUSCO':'08','HUANCAVELICA':'09',
        'HUANUCO':'10','ICA':'11','JUNIN':'12','LA LIBERTAD':'13','LAMBAYEQUE':'14','LIMA':'15','LIMA METROPOLITANA':'15','LORETO':'16','MADRE DE DIOS':'17',
        'MOQUEGUA':'18','PASCO':'19','PIURA':'20','PUNO':'21','SAN MARTIN':'22','TACNA':'23','TUMBES':'24','UCAYALI':'25'}
import unicodedata
def norm(x):
    x = unicodedata.normalize('NFKD', str(x).strip().upper()); return ''.join(c for c in x if not unicodedata.combining(c))
o = pd.read_pickle('/home/claude/data/pq/otros.pkl')
o['DEP'] = o.Dpto.map(lambda x: DEPC[norm(x)]); o['M'] = o.MES.astype(int)
o['V'] = o.Valores.map({'PRODUCCION (t)': 'Q', 'COSECHA (ha)': 'C', 'SIEMBRA (ha)': 'S', 'PRODXPRECIO_': 'PQ', 'PRECIO_(Soles x kg)': 'P'})
ONAME = {'ARANDANO': 'Arándano', 'CAÑA DE AZUCAR (PARA AZUCAR)': 'Caña de azúcar (azúcar)', 'CAÑA DE AZUCAR (PARA ETANOL)': 'Caña de azúcar (etanol)',
         'FRIJOL LOCTAO': 'Frijol loctao', 'PALMA ACEITERA': 'Palma aceitera'}
for k, (cult, g) in enumerate(o.groupby('CULTIVO')):
    code = f'OT{k+1}'
    w = g.pivot_table(index=['DEP', 'Año', 'M'], columns='V', values='Total', aggfunc='sum').reset_index().fillna(0)
    wa = w[w['Año'].between(2016, 2025)].groupby(['DEP', 'Año']).sum(numeric_only=True).reset_index()
    ubis = sorted(wa.DEP.unique()); pos = {u: i for i, u in enumerate(ubis)}
    S = [[0] * len(ubis) for _ in YEARS]; C = [[0] * len(ubis) for _ in YEARS]; Q = [[0] * len(ubis) for _ in YEARS]; P = [[None] * len(ubis) for _ in YEARS]
    for r in wa.itertuples():
        yi = int(r.Año) - 2016; i = pos[r.DEP]
        S[yi][i] = r1(r.S); C[yi][i] = r1(r.C); Q[yi][i] = r1(r.Q); P[yi][i] = round(r.PQ / r.Q, 2) if r.Q > 0 else None
    wm = w.groupby(['Año', 'M']).sum(numeric_only=True).reset_index()
    mm = [[int(r.Año), int(r.M), r1(r.Q), r1(r.S), r1(r.C), round(r.PQ / r.Q, 2) if r.Q > 0 else None] for r in wm.itertuples()]
    rec = {'g': code, 'name': ONAME[cult], 'years': YEARS, 'ubi': ubis, 'S': S, 'C': C, 'Q': Q, 'P': P, 'm': mm, 'level': 'dep'}
    json.dump(rec, open(f'{OUT}/{code}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    index.append({'g': code, 'name': ONAME[cult], 'q2025': round(float(wa[wa['Año'] == 2025].Q.sum())), 'n': len(ubis), 'level': 'dep'})
    print(code, cult, len(ubis))
json.dump({'cultivos': index, 'years': YEARS, 'last_month_2026': int(df.filter(pl.col('ANIO') == 2026).select(pl.col('MES').max()).item())},
          open(f'{OUT}/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
