/* ===== OptiLab – aplikacja =====
   Zakładki, eksport raportu do PDF i uruchomienie formularzy. Ładowany jako ostatni. */
/* =====================================================================
   7. ZAKŁADKI I EKSPORT RAPORTU (druk do PDF przez @media print)
   ===================================================================== */
const TITLES = {graph: 'Metoda graficzna', simplex: 'Simpleks', ilp: 'Całkowitoliczbowe'};
MODULES.forEach(md => {                       // moduły z rejestru: zakładka + sekcja (przed listą „wkrótce")
  TITLES[md.id] = md.title;
  $('nav').insertAdjacentHTML('beforeend', `<button role="tab" data-tab="${md.id}" aria-selected="false">${md.icon}${md.title}</button>`);
  $('#tab-soon').insertAdjacentHTML('beforebegin', `<section id="tab-${md.id}" hidden>${md.html}</section>`);
});
SOON.forEach(([id, name]) => $('nav').insertAdjacentHTML('beforeend', `<button role="tab" class="soon" data-tab="${id}" aria-selected="false">${SOON_ICON}${name}</button>`));
let curTab = 'graph';                          // bieżąca zakładka – eksport raportu dotyczy tylko jej
function goTab(t) {
  curTab = t;
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
  // Raport obejmuje WYŁĄCZNIE bieżącą zakładkę (wcześniej łączył wyniki ze wszystkich zakładek)
  const t = curTab, sec = [];
  if (t === 'graph' && last.graph) {
    const img = await Plotly.toImage('plot', {format: 'png', width: 900, height: 560});
    sec.push(['Metoda graficzna', `<img src="${img}" style="max-width:100%">${last.graph}`]);
  }
  if (t === 'simplex') { if (last.simplex) sec.push(['Metoda simpleks', last.simplex]); if (last.dual) sec.push(['Zadanie dualne', last.dual]); if (last.par) sec.push(['Analiza parametryczna', last.par]); }
  if (t === 'ilp' && last.ilp) sec.push(['Programowanie całkowitoliczbowe', `<div class="tree">${last.ilp}</div>`]);
  const md = MODULES.find(x => x.id === t); if (md && last[md.id]) sec.push([md.title, last[md.id]]);
  if (!sec.length) {
    const eb = $('#btn-export'); eb.classList.add('bad'); eb.textContent = 'Najpierw rozwiąż zadanie w tej zakładce';
    setTimeout(() => { eb.classList.remove('bad'); eb.textContent = 'Eksportuj raport'; }, 2500); return;
  }
  const pa = $('#print-area');
  pa.innerHTML = `<h1>Raport z obliczeń – ${TITLES[t]}</h1><p>${new Date().toLocaleDateString('pl-PL')}</p>` + sec.map(([ti, body]) => `<h2>${ti}</h2>${body}`).join('');
  pa.querySelectorAll('details').forEach(d => d.open = true);
  // Nagłówek tabeli jako <thead>: gdy długa tabela przechodzi na kolejną stronę, nagłówek powtarza się na każdej stronie
  pa.querySelectorAll('table').forEach(tb => { const r = tb.rows[0]; if (r && !tb.tHead && [...r.cells].every(c => c.tagName === 'TH')) tb.createTHead().appendChild(r); });
  // Szerokie tabele zmniejszamy czcionką (nie „zoom" – ten psuje dzielenie na strony w Chrome), aż zmieszczą się w A4 (~690 px)
  pa.style.cssText = 'display:block;position:absolute;left:-9999px;width:690px;font-size:10pt';
  pa.querySelectorAll('table').forEach(tb => {
    for (let k = 0; k < 4 && tb.scrollWidth > 690; k++) {
      const cur = parseFloat(getComputedStyle(tb).fontSize) || 11.3;
      tb.style.fontSize = Math.max(5, cur * 690 / tb.scrollWidth * 0.97).toFixed(2) + 'px';
      tb.querySelectorAll('td,th').forEach(c => { c.style.padding = '1px 3px'; c.style.minWidth = '0'; });
    }
  });
  pa.style.cssText = ''; window.print();
};

MODS.forEach(initModule);
MODULES.forEach(md => md.init && md.init());
