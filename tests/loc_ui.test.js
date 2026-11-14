// Moduł Lokalizacja i układ: raporty przykładów (wzory, tabele median, iteracje Weiszfelda, porównanie kryteriów, CRAFT, p-mediana, mapy), CSV, walidacja, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const locDist = get('locDist'), E = get('JSON.parse(JSON.stringify(LO_EXAMPLES.map(e => ({name: e.name, data: loNormalize(e.data)}))))'), N = Number;
const toX = d => { if (d.type !== 'layout') { const arr = d.type === 'single' ? d.pts : d.pm.pts, pts = arr.map(p => ({name: p.name, x: N(p.x), y: N(p.y), w: N(p.w), cand: p.cand !== 'nie'})); return d.type === 'single' ? {t: 'single', kind: d.kind, pts} : {t: 'pmed', kind: d.kind, pts, cands: pts.filter(q => q.cand), p: N(d.pm.p)}; }
  const L = d.lay, names = L.names, locs = L.locs.map(l => ({name: l.name, x: N(l.x), y: N(l.y)})), perm = Array(names.length); L.locs.forEach((l, i) => { perm[names.indexOf(l.dept)] = i; });
  return {t: 'layout', kind: d.kind, names, F: L.F.cells.map(r => r.map(N)), locs, perm, D: locs.map(a => locs.map(b => locDist([a.x, a.y], [b.x, b.y], d.kind)))}; };
E.forEach(e => { const h = c.loReportHTML(toX(e.data)); t(`raport „${e.name}": wynik i rysunek`, /class="sum"/.test(h) && /class="vzsvg"/.test(h)); });
let h = c.loReportHTML(toX(E[0].data)); t('Quain\'s: środek ciężkości (66,67; 93,33), porównanie kryteriów', /<b>\(66,67; 93,33\)<\/b>/.test(h) && /Porównanie kryteriów/.test(h));
h = c.loReportHTML(toX(E[1].data)); t('mediana ważona: tabele osi x i y z wagami skumulowanymi', /Oś x/.test(h) && /Waga skumulowana/.test(h));
h = c.loReportHTML(toX(E[2].data)); t('Weiszfeld: tabela iteracji albo warunek Kuhna', /Przesunięcie/.test(h) || /Warunek Kuhna spełniony/.test(h));
h = c.loReportHTML(toX(E[3].data)); t('CRAFT: 3 zamiany od kosztu 1080 do optimum 610 (potwierdzone przeglądem 720 układów)', /Iteracja 3/.test(h) && /koszt <b>610<\/b> \(początkowo 1080/.test(h) && /720 układów: CRAFT znalazł układ optymalny/.test(h));
h = c.loReportHTML(toX(E[4].data)); t('p-mediana: przegląd 15 zestawów (2 z 6 miejsc), tabela przydziału', /15 zestawy/.test(h) && /Obsługiwany przez/.test(h));
const back = c.loFromCSV(get('(() => { const d = loNormalize(JSON.parse(JSON.stringify(LO_EXAMPLES[3].data))); return [`zadanie;layout`, `odległość;rect`, "", ["Przepływy", ...d.lay.names].join(";"), ...d.lay.F.cells.map((r, i) => [d.lay.names[i], ...r].join(";")), "", "Miejsce;x;y;Dział na starcie", ...d.lay.locs.map(l => [l.name, l.x, l.y, l.dept].join(";"))].join("\\n"); })()'));
t('CSV układu: przepływy, miejsca i układ początkowy wracają', back.type === 'layout' && back.lay.names.length === 6 && back.lay.F.cells[4][5] === '10' && back.lay.locs[2].dept === 'E');
const bs = c.loFromCSV(c.rowsToCSV(get('LO_PCOLS'), get('LO_QUAIN'), [['zadanie', 'single'], ['odległość', 'euc']])); t('CSV punktów: współrzędne i wagi wracają', bs.type === 'single' && bs.kind === 'euc' && bs.pts[3].name === 'Atlanta' && bs.pts[3].w === '2000');
h = c.loReportHTML({t: 'single', kind: 'sq', pts: [{name: '<img src=x>', x: 0, y: 0, w: 1}, {name: 'B', x: 2, y: 0, w: 1}]}); t('nazwy punktów bezpiecznie wyświetlane', !/<img src=x>/.test(h));
t('moduł zarejestrowany, lista „wkrótce” pusta – wszystkie moduły gotowe', get("MODULES.some(m => m.id === 'loc') && SOON.length === 0"));
console.log(`Testy modułu Lokalizacja i układ: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
