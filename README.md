# Tablero agropecuario MIDAGRI — Good Guys Insight

Tablero web estático (HTML + ECharts 5.5.1) con nueve pestañas temáticas construidas a partir de las bases de MIDAGRI ubicadas en esta carpeta.

## Estructura
- `index.html` — página principal (pestañas por hash: `#panorama`, `#agricola`, `#campana`, `#pecuario`, `#precios`, `#agroindustria`, `#insumos`, `#comercio`, `#metodologia`).
- `css/styles.css` — estilos, modo claro/oscuro.
- `js/core.js`, `js/tabs1.js`, `js/tabs2.js`, `js/app.js` — lógica de gráficos y pestañas.
- `data/` — JSON compactos generados desde los Excel (SISAGRI con un archivo por cultivo, carga diferida).
- `geo/` — límites departamentales, provinciales, distritales y mundiales (GeoJSON simplificado).
- `img/logo_ggi.jpg` — logo de Good Guys Insight (el mismo del tablero ERM 2026).
- `scripts/` — scripts Python de procesamiento (`prep_vbp.py`, `prep_sisagri.py`, `prep_otros.py`).

## Publicación en GitHub Pages
Subir el contenido de esta carpeta a un repositorio (p. ej. `goodguysinsight/tablero_midagri`) y activar Pages sobre la rama principal.
Para revisar localmente: `python -m http.server` dentro de la carpeta y abrir http://localhost:8000 (abrir el archivo directamente no carga los JSON).

## Actualización de datos
Los scripts leen versiones parquet/pickle de los Excel; requieren `pandas`, `polars`, `pyarrow` y `python-calamine`. Ajustar las rutas al inicio de cada script.
