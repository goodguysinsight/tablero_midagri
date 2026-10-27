/* ===== Enrutador de pestañas ===== */
'use strict';
const ORDER = ['panorama', 'agricola', 'campana', 'pecuario', 'precios', 'agroindustria', 'insumos', 'comercio', 'metodologia'];
let current = null;
async function show(tab) {
  if (!TABS[tab]) tab = 'panorama';
  current = tab;
  $$('#tabs a').forEach(a => a.setAttribute('aria-selected', a.getAttribute('href') === '#' + tab));
  const main = $('#main');
  disposeAll();
  const root = document.createElement('div'); root.className = 'panel';
  root.innerHTML = '<div class="loading">Cargando datos…</div>';
  main.replaceChildren(root);
  try { await TABS[tab].render(root); }
  catch (e) { console.error(e); main.innerHTML = `<div class="loading">No se pudo cargar esta sección (${esc(e.message)}). Verifique que las carpetas data/ y geo/ estén junto a index.html.</div>`; }
}
function boot() {
  readPalette(); logoFallback();
  initTheme(() => { readPalette(); show(current); });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || 'panorama');
}
document.addEventListener('DOMContentLoaded', boot);
