/* ===== OptiLab – aplikacja =====
   Zakładki, eksport raportu do PDF i uruchomienie formularzy. Ładowany jako ostatni. */
/* =====================================================================
   7. ZAKŁADKI I EKSPORT RAPORTU (druk do PDF przez @media print)
   ===================================================================== */
const TITLES = {graph: 'Metoda graficzna', simplex: 'Simpleks', ilp: 'Całkowitoliczbowe'};
SOON.forEach(([id, name]) => $('nav').insertAdjacentHTML('beforeend', `<button role="tab" class="soon" data-tab="${id}" aria-selected="false">${SOON_ICON}${name}</button>`));
function goTab(t) {
  const soon = SOON.find(x => x[0] === t), title = soon ? soon[1] : TITLES[t];
  document.querySelectorAll('nav button').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === t));
  [...Object.keys(TITLES), 'soon'].forEach(k => $('#tab-' + k).hidden = k !== (soon ? 'soon' : t));
  $('#soon-title').textContent = title; $('#tabname').textContent = title; window.scrollTo(0, 0);
  $('nav button[aria-selected=true]').scrollIntoView({inline: 'center', block: 'nearest'});
  if (t === 'graph') Plotly.Plots.resize('plot');
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => goTab(b.dataset.tab));
$('#logo').src = $('link[rel=icon]').href;     // logo w nagłówku = ta sama ikona
$('#btn-export').onclick = async () => {
  if (!lastModel || !(last.graph || last.simplex || last.ilp)) {
    const eb = $('#btn-export'); eb.classList.add('bad'); eb.textContent = 'Najpierw rozwiąż problem';
    setTimeout(() => { eb.classList.remove('bad'); eb.textContent = 'Eksportuj raport'; }, 2500); return; }
  let h = `<h1>Raport z obliczeń</h1><p>${new Date().toLocaleDateString('pl-PL')}</p><h2>Dane wejściowe</h2>${infoHTML(lastModel)}`;
  if (last.graph) {
    const img = await Plotly.toImage('plot', {format: 'png', width: 900, height: 560});
    h += `<h2>Metoda graficzna</h2><img src="${img}" style="max-width:100%">${last.graph}`;
  }
  if (last.simplex) h += `<h2>Metoda simpleks</h2>${last.simplex}`;
  if (last.dual) h += `<h2>Zadanie dualne</h2>${last.dual}`;
  if (last.par) h += `<h2>Analiza parametryczna</h2>${last.par}`;
  if (last.ilp) h += `<h2>Programowanie całkowitoliczbowe</h2><div class="tree">${last.ilp}</div>`;
  const pa = $('#print-area'); pa.innerHTML = h;
  // Zmierz tabele w szerokości A4 (~690 px) i zmniejsz zbyt szerokie, żeby nic nie było ucięte
  pa.querySelectorAll('details').forEach(d => d.open = true);
  pa.style.cssText = 'display:block;position:absolute;left:-9999px;width:690px;font-size:10pt';
  pa.querySelectorAll('table').forEach(t => { const w = t.scrollWidth; if (w > 690) t.style.zoom = (690 / w).toFixed(3); });
  pa.style.cssText = ''; window.print();
};

MODS.forEach(initModule);
