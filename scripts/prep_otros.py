# -*- coding: utf-8 -*-
"""Avance de siembras, precios en chacra, SISAP, agroindustria, agroquímicos y comercio exterior -> data/*.json"""
import pandas as pd, numpy as np, json, os, unicodedata, re
OUT = '/home/claude/tablero/data'; PQ = '/home/claude/data/pq'
def norm(x):
    x = unicodedata.normalize('NFKD', str(x).strip().upper()); return re.sub(r'\s+', ' ', ''.join(c for c in x if not unicodedata.combining(c)))
DEPC = {'AMAZONAS':'01','ANCASH':'02','APURIMAC':'03','ANDAHUAYLAS':'03','AREQUIPA':'04','AYACUCHO':'05','CAJAMARCA':'06','CALLAO':'07','CUSCO':'08',
        'HUANCAVELICA':'09','HUANUCO':'10','ICA':'11','JUNIN':'12','LA LIBERTAD':'13','LAMBAYEQUE':'14','LIMA':'15','LIMA METROPOLITANA':'15',
        'LORETO':'16','MADRE DE DIOS':'17','MOQUEGUA':'18','PASCO':'19','PIURA':'20','PUNO':'21','SAN MARTIN':'22','TACNA':'23','TUMBES':'24','UCAYALI':'25'}
dump = lambda o, f: json.dump(o, open(f'{OUT}/{f}', 'w'), ensure_ascii=False, separators=(',', ':'))
r = lambda x, d=1: None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), d)

# ---------------- 1. Avance de siembras (campañas agosto-julio)
a = pd.read_parquet(f'{PQ}/avance.parquet')
MC = ['ago','set','oct','nov','dic','ene','feb','mar','abr','may','jun','jul']
a['UBI'] = a.COD_UBIGEO.astype(int).astype(str).str.zfill(6); a['DEP'] = a.UBI.str[:2]
per = ['2022-2023', '2023-2024', '2024-2025', 'PROMEDIO', 'ENIS 2024-2025']
nat = a.groupby('PERIODO')[MC].sum()
last = max(i for i in range(12) if nat.loc['2024-2025'].iloc[i] > 0)  # último mes con registro de la campaña vigente
cult = a.groupby('CULTIVO')[MC].sum().sum(axis=1).sort_values(ascending=False).index.tolist()
dep = {}
for (c, p, d), g in a.groupby(['CULTIVO', 'PERIODO', 'DEP']):
    dep.setdefault(c, {}).setdefault(p, {})[d] = [r(x) for x in g[MC].sum().values]
for (p, d), g in a.groupby(['PERIODO', 'DEP']):
    dep.setdefault('TOTAL', {}).setdefault(p, {})[d] = [r(x) for x in g[MC].sum().values]
# distrital acumulado ago -> último mes (campaña vigente, promedio, campaña anterior)
cum = a.assign(V=a[MC[:last + 1]].sum(axis=1)).pivot_table(index=['CULTIVO', 'UBI'], columns='PERIODO', values='V', aggfunc='sum').fillna(0)
dist = {}
for (c, u), row in cum.iterrows():
    dist.setdefault(c, {})[u] = [r(row.get('2024-2025', 0)), r(row.get('PROMEDIO', 0)), r(row.get('2023-2024', 0))]
tot = cum.groupby(level='UBI').sum()
dist['TOTAL'] = {u: [r(row.get('2024-2025', 0)), r(row.get('PROMEDIO', 0)), r(row.get('2023-2024', 0))] for u, row in tot.iterrows()}
dump({'months': MC, 'periodos': per, 'last': last, 'cultivos': ['TOTAL'] + cult, 'dep': dep, 'dist': dist}, 'avance.json')
print('avance last month idx', last, MC[last])

# ---------------- 2. Precios en chacra (registro semanal regional)
p = pd.read_pickle(f'{PQ}/precio_chacra.pkl').dropna(subset=['PRECIO', 'ANIO', 'PRODUCTO'])
MESES = {'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,'julio':7,'agosto':8,'setiembre':9,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12}
p['M'] = p.MES.str.strip().str.lower().map(MESES)
PFIX = {'ARROZ CASCARA':'Arroz cáscara','PAPA BLANCA':'Papa blanca','MAIZ AMARILLO DURO':'Maíz amarillo duro','MAIZ CHOCLO':'Maíz choclo','MAIZ CHCLO':'Maíz choclo',
        'MAIZ AMILACEO':'Maíz amiláceo','QUINUA':'Quinua','CEBOLLA':'Cebolla','FRIJOL GRANO SECO':'Frijol grano seco'}
p['PROD'] = p.PRODUCTO.map(lambda x: PFIX.get(norm(x), x))
p['DEP'] = p.REGION.map(lambda x: DEPC.get(norm(x)))
p = p.dropna(subset=['M', 'DEP']); p = p[p.PRECIO > 0]
p['ANIO'] = p.ANIO.astype(int); p['M'] = p.M.astype(int)
pm = p.groupby(['PROD', 'DEP', 'ANIO', 'M']).PRECIO.mean().reset_index()
prods = sorted(pm.PROD.unique())
chacra = {pr: [[d, int(y), int(m), r(v, 3)] for d, y, m, v in g[['DEP', 'ANIO', 'M', 'PRECIO']].values] for pr, g in pm.groupby('PROD')}
# ---------------- 3. SISAP (precio mayorista anual por variedad)
s = pd.read_pickle(f'{PQ}/sisap.pkl')
s['Y'] = s.COD_ANIO.astype(int)
sisap = {}
for (gname, var), g in s.groupby(['TXT_DSCGENERO', 'TXT_DSCVARIEDAD']):
    sisap.setdefault(gname.strip(), {})[var.strip()] = [[int(y), r(v, 2)] for y, v in g.sort_values('Y')[['Y', 'PRECIO_KG']].values]
dump({'chacra': chacra, 'prods': prods, 'sisap': sisap}, 'precios.json')

# ---------------- 4. Agroindustria
MM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
rows = []; acts = []; prs = []; dps = []
def ix(lst, v):
    if v not in lst: lst.append(v)
    return lst.index(v)
for code, sh in [('I', 'INGRESO_MP'), ('U', 'UTILIZACION_MP'), ('P', 'PRODUCCION_P'), ('V', 'VENTA_P')]:
    d = pd.read_pickle(f'{PQ}/agroind_{sh}.pkl')
    yc = 'ANIO' if 'ANIO' in d else 'AÑO'; pc = 'MATERIA_P' if 'MATERIA_P' in d else 'PRODUCTO'
    d = d.dropna(subset=[yc, pc, 'ACTIVIDAD'])
    for c in MM: d[c] = pd.to_numeric(d[c], errors='coerce').fillna(0)
    d['ACT'] = d.ACTIVIDAD.str.strip().str.upper().str.replace('PROCESAMIENTO DE ', '').str.replace('PROCESAMIENTO DEL ', '').str.capitalize()
    d['PR'] = d[pc].str.strip().str.replace(r'\s+', ' ', regex=True).str.capitalize()
    d['DEP'] = d.DEPARTAMENTO.map(lambda x: DEPC.get(norm(x), '00'))
    g = d.groupby([d.ACT, d.PR, d.DEP, d[yc].astype(int)])[MM].sum().reset_index()
    for t in g.itertuples(index=False):
        vals = [r(x) for x in t[4:]]
        if sum(v or 0 for v in vals) == 0: continue
        rows.append([code, ix(acts, t[0]), ix(prs, t[1]), t[2], int(t[3])] + vals)
dump({'acts': acts, 'prods': prs, 'rows': rows, 'vars': {'I': 'Ingreso de materia prima', 'U': 'Utilización de materia prima', 'P': 'Producción', 'V': 'Venta'}}, 'agroind.json')
print('agroind rows', len(rows))

# ---------------- 5. Agroquímicos (precios de insumos)
q = pd.read_pickle(f'{PQ}/agroq.pkl').dropna(subset=['Valor', 'FECHA'])
q = q[q.Valor > 0]
q['DEP'] = q.DEPARTAMENTO.map(lambda x: DEPC.get(norm(x)))
q['PR'] = q.DENOMINACION.str.strip().str.replace(r'\s+', ' ', regex=True)
q['TIPO'] = q.TIPO.str.strip().str.capitalize()
q['YM'] = q.FECHA.dt.strftime('%Y-%m')
pinfo = q.groupby('PR').agg(tipo=('TIPO', lambda x: x.mode()[0]), um=('Um', lambda x: x.mode()[0]), n=('Valor', 'size')).reset_index()
pinfo = pinfo[pinfo.n >= 200].sort_values(['tipo', 'n'], ascending=[True, False])
q = q[q.PR.isin(pinfo.PR)]
# limpiar outliers groseros por producto (fuera de 5x la mediana)
med = q.groupby('PR').Valor.transform('median'); q = q[(q.Valor < med * 5) & (q.Valor > med / 5)]
nat = q.groupby(['PR', 'YM']).Valor.describe(percentiles=[.25, .5, .75])[['25%', '50%', '75%', 'count']].reset_index()
depm = q.groupby(['PR', 'DEP', 'YM']).Valor.median().reset_index()
aq = {'prods': [{'p': t.PR, 'tipo': t.tipo, 'um': t.um} for t in pinfo.itertuples()],
      'nat': {pr: [[ym, r(a, 2), r(b, 2), r(c, 2), int(n)] for ym, a, b, c, n in g[['YM', '25%', '50%', '75%', 'count']].values] for pr, g in nat.groupby('PR')},
      'dep': {pr: [[d, ym, r(v, 2)] for d, ym, v in g[['DEP', 'YM', 'Valor']].values] for pr, g in depm.groupby('PR')}}
dump(aq, 'agroq.json'); print('agroq prods', len(pinfo))

# ---------------- 6. Comercio exterior (SISCOMEX)
c = pd.read_pickle(f'{PQ}/siscomex.pkl')
c['Y'] = c.COD_ANIO.astype(int); c['M'] = c.COD_MES.astype(int)
c['PR'] = c.TXT_NARANCEL.str.strip().str.replace(r'\s+', ' ', regex=True)
c['PA'] = c.TEX_PAIS_DESTINO.str.strip()
prl = c.groupby(['TIPO', 'COD_ARANCEL', 'PR']).VALOR_FOB.sum().reset_index().sort_values('VALOR_FOB', ascending=False)
pr_list = [[t.TIPO[0], t.COD_ARANCEL, t.PR] for t in prl.itertuples()]
pidx = {(t[0], t[1]): i for i, t in enumerate(pr_list)}
pa_list = c.groupby('PA').VALOR_FOB.sum().sort_values(ascending=False).index.tolist(); paidx = {p: i for i, p in enumerate(pa_list)}
c['PI'] = [pidx[(t[0], a)] for t, a in zip(c.TIPO, c.COD_ARANCEL)]; c['CI'] = c.PA.map(paidx)
m1 = c.groupby(['PI', 'Y', 'M']).agg(F=('VALOR_FOB', 'sum'), W=('CAN_PNETO', 'sum')).reset_index()
m2 = c.groupby(['PI', 'CI', 'Y']).agg(F=('VALOR_FOB', 'sum'), W=('CAN_PNETO', 'sum')).reset_index()
EN2GEO = {'UNITED STATES': 'United States of America', 'RUSSIAN FEDERATION': 'Russia', 'KOREA, REPUBLIC OF': 'South Korea', 'VIET NAM': 'Vietnam',
          'TAIWAN, PROVINCE OF CHINA': 'Taiwan', 'IRAN (ISLAMIC REPUBLIC OF)': 'Iran', "COTE D'IVOIRE": 'Ivory Coast', 'LIBYAN ARAB JAMAHIRIYA': 'Libya',
          'MACEDONIA F.Y.R.': 'Macedonia', 'SERVIA': 'Republic of Serbia', 'KYRGYSTAN': 'Kyrgyzstan', "KOREA, DEMOCRATIC PEOPLE'S REP. OF": 'North Korea',
          'TANZANIA': 'United Republic of Tanzania', 'BAHAMAS': 'The Bahamas', 'GUINEA-BISSAU': 'Guinea Bissau'}
geo = json.load(open('/home/claude/geo/world.geojson')); gnames = {f['properties']['name'].upper(): f['properties']['name'] for f in geo['features']}
ES = {'UNITED STATES':'Estados Unidos','NETHERLANDS':'Países Bajos','SPAIN':'España','CHINA':'China','UNITED KINGDOM':'Reino Unido','CANADA':'Canadá',
      'CHILE':'Chile','ECUADOR':'Ecuador','COLOMBIA':'Colombia','MEXICO':'México','GERMANY':'Alemania','HONG KONG':'Hong Kong','KOREA, REPUBLIC OF':'Corea del Sur',
      'JAPAN':'Japón','FRANCE':'Francia','ITALY':'Italia','BELGIUM':'Bélgica','BRAZIL':'Brasil','ARGENTINA':'Argentina','BOLIVIA':'Bolivia','PANAMA':'Panamá',
      'COSTA RICA':'Costa Rica','RUSSIAN FEDERATION':'Rusia','TAIWAN, PROVINCE OF CHINA':'Taiwán','THAILAND':'Tailandia','INDIA':'India','SWITZERLAND':'Suiza',
      'SWEDEN':'Suecia','DENMARK':'Dinamarca','NORWAY':'Noruega','FINLAND':'Finlandia','POLAND':'Polonia','PORTUGAL':'Portugal','IRELAND':'Irlanda',
      'SAUDI ARABIA':'Arabia Saudita','UNITED ARAB EMIRATES':'Emiratos Árabes Unidos','SINGAPORE':'Singapur','MALAYSIA':'Malasia','INDONESIA':'Indonesia',
      'PHILIPPINES':'Filipinas','VIET NAM':'Vietnam','AUSTRALIA':'Australia','NEW ZEALAND':'Nueva Zelanda','SOUTH AFRICA':'Sudáfrica','EGYPT':'Egipto',
      'MOROCCO':'Marruecos','TURKEY':'Turquía','ISRAEL':'Israel','GUATEMALA':'Guatemala','HONDURAS':'Honduras','EL SALVADOR':'El Salvador','NICARAGUA':'Nicaragua',
      'DOMINICAN REPUBLIC':'República Dominicana','PUERTO RICO':'Puerto Rico','URUGUAY':'Uruguay','PARAGUAY':'Paraguay','VENEZUELA':'Venezuela','CUBA':'Cuba',
      'HAITI':'Haití','JAMAICA':'Jamaica','TRINIDAD AND TOBAGO':'Trinidad y Tobago','GREECE':'Grecia','AUSTRIA':'Austria','CZECH REPUBLIC':'República Checa',
      'UKRAINE':'Ucrania','ROMANIA':'Rumania','HUNGARY':'Hungría','LITHUANIA':'Lituania','LATVIA':'Letonia','ESTONIA':'Estonia','SLOVENIA':'Eslovenia',
      'CROATIA':'Croacia','BULGARIA':'Bulgaria','SLOVAKIA':'Eslovaquia','ICELAND':'Islandia','LUXEMBOURG':'Luxemburgo','MALTA':'Malta','CYPRUS':'Chipre',
      'KUWAIT':'Kuwait','QATAR':'Catar','OMAN':'Omán','BAHRAIN':'Baréin','JORDAN':'Jordania','LEBANON':'Líbano','PAKISTAN':'Pakistán','BANGLADESH':'Bangladés',
      'SRI LANKA':'Sri Lanka','MACAU':'Macao','ALGERIA':'Argelia','TUNISIA':'Túnez','NIGERIA':'Nigeria','GHANA':'Ghana','KENYA':'Kenia','SENEGAL':'Senegal',
      "COTE D'IVOIRE":'Costa de Marfil','CAMEROON':'Camerún','GUYANA':'Guyana','FRENCH GUIANA':'Guayana Francesa','ARUBA':'Aruba','CURACAO':'Curazao',
      'ZONAS FRANCAS DEL PERU':'Zonas francas del Perú','AGUAS INTERNACIONALES':'Aguas internacionales','KAZAKHSTAN':'Kazajistán','GEORGIA':'Georgia',
      'BELARUS':'Bielorrusia','IRAN (ISLAMIC REPUBLIC OF)':'Irán','MYANMAR':'Myanmar','CAMBODIA':'Camboya','PERU':'Perú'}
countries = []; miss = []
for p_ in pa_list:
    g_ = EN2GEO.get(p_) or gnames.get(p_)
    if not g_: miss.append(p_)
    countries.append([ES.get(p_, p_.title()), g_])
print('países sin geometría:', miss)
dump({'prods': pr_list, 'countries': countries, 'unit_fob': 'Miles de US$ FOB', 'unit_w': 't (peso neto)',
      'm': [[int(a), int(y), int(m), r(f, 1), r(w, 1)] for a, y, m, f, w in m1.values],
      'pa': [[int(a), int(b), int(y), r(f, 1), r(w, 1)] for a, b, y, f, w in m2.values]}, 'comex.json')
for f in sorted(os.listdir(OUT)):
    if f.endswith('.json'): print(f, round(os.path.getsize(f'{OUT}/{f}') / 1e6, 2), 'MB')
