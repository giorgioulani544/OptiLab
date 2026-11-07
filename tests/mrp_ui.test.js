// Moduł MRP: raporty dla przykładów, komunikaty, plan zamówień, CSV (eksport → import), walidacja, bezpieczeństwo kodów
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(MR_EXAMPLES))');
const toP = d => { const items = d.items.map(i => { const o = {code: i.code, lt: +i.lt, onHand: +i.onHand, rule: i.rule, ss: +(i.ss || 0), scrap: +(i.scrap || 0) / 100}, p1 = i.p1 === '' ? null : +i.p1, p2 = i.p2 === '' ? null : +i.p2;
    if (i.rule === 'FOQ') o.Q = p1; if (i.rule === 'POQ') o.P = p1; if (i.rule === 'MINMAX') { o.min = p1; o.max = p2; } if (['EOQ', 'SM', 'LUC', 'PPB', 'WW'].includes(i.rule)) { o.S = p1; o.H = p2; } return o; });
  const ch = c.mrpCheck(items.map(i => i.code), d.bom.map(e => ({...e, qty: +e.qty})));
  return {T: d.T, items, edges: ch.edges, indep: d.indep.cells.map(r => r.map(Number)), sr: d.sr.cells.map(r => r.map(Number))}; };
EX.forEach(e => { const P = toP(e.data), S = c.mrpSolve(P), h = c.mrReportHTML(P, S);
  t(`raport „${e.name}": struktura, tabele MRP dla każdej pozycji, plan zamówień`, /class="netsvg"/.test(h) && (h.match(/<th>Zapotrzebowanie brutto<\/th>/g) || []).length === P.items.length && /Plan zamówień/.test(h)); });
let P = toP(EX[0].data), S = c.mrpSolve(P);
t('przykład „Stół": wkręt jest wspólnym składnikiem (poziom 2)', S.llc[3] === 2 && S.llc[1] === 1);
P = toP(EX[2].data); S = c.mrpSolve(P); const h = c.mrReportHTML(P, S);
t('przykład z komunikatami: zapas nie spada poniżej zapasu bezpieczeństwa; są komunikaty', S.R.every((X, i) => X.pab.every(v => v >= P.items[i].ss - 1e-9)) && /<h4>Komunikaty<\/h4>/.test(h));
t('CSV: eksport → import zachowuje pozycje, strukturę i harmonogram', (() => { const s = ['okresy;8', '', 'Kod pozycji;Czas realizacji;Zapas początkowy;Reguła partii;Parametr 1;Parametr 2;Zapas bezpieczeństwa;Odpad %', 'Stół;1;10;L4L;;;;', 'Noga;1;20;FOQ;100;;;',
  '', 'Pozycja nadrzędna;Składnik;Ilość na sztukę', 'Stół;Noga;4', '', 'Zapotrzebowanie niezależne;1;2;3;4;5;6;7;8', 'Stół;0;0;20;0;30;0;25;0', 'Noga;0;0;0;0;0;0;0;0', '', 'Przyjęcia zaplanowane;1;2;3;4;5;6;7;8', 'Stół;0;0;0;0;0;0;0;0', 'Noga;0;0;0;0;0;0;0;0'].join('\n');
  const d = c.mrFromCSV(s); return d.T === 8 && d.items.length === 2 && d.items[1].p1 === '100' && d.bom[0].qty === '4' && d.indep.cells[0][4] === '30'; })());
let th = ''; try { c.mrFromCSV('okresy;6\nKod pozycji;Czas realizacji\nA;x'); } catch (e) { th = e.message; } t('CSV: błąd z numerem wiersza', /wiersz 3: „x"/.test(th));
th = ''; try { get('mrNormalize({items: []})'); } catch (e) { th = e.message; } t('plik bez pozycji odrzucony', /brak listy pozycji/.test(th));
const P2 = {T: 3, items: [{code: '<img src=x>', lt: 0, onHand: 0, ss: 0, scrap: 0, rule: 'L4L'}], edges: [], indep: [[1, 2, 3]], sr: [[0, 0, 0]]};
t('kody pozycji bezpiecznie wyświetlane', !/<img src=x>/.test(c.mrReportHTML(P2, c.mrpSolve(P2))));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'mrp') && !SOON.some(s => s[0] === 'mrp')"));
console.log(`Testy modułu MRP: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
