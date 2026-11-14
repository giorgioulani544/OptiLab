// Moduł Analiza decyzji: raporty wszystkich trybów, rysunek drzewa, CSV (tabela, drzewo, gra), walidacja, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(DC_EXAMPLES))'), N = s => +String(s).replace(',', '.');
const toX = d => { if (d.mode === 'game') return {mode: 'game', A: d.game.cells.map(r => r.map(N)), rn: d.game.rn, cn: d.game.cn};
  if (d.mode === 'tree') { const names = d.tree.map(x => x.name); return {mode: 'tree', kind: d.kind, nodes: d.tree.map(x => ({name: x.name, type: x.type, parent: x.parent === '' ? -1 : names.indexOf(x.parent), prob: x.prob === '' ? null : N(x.prob), value: x.value === '' ? 0 : N(x.value)}))}; }
  const X = {mode: d.mode, V: d.st.cells.map(r => r.map(N)), rn: d.st.rn, cn: d.st.cn, kind: d.kind, P: d.st.xr.map(N), alpha: N(d.alpha)};
  if (d.util) X.R = N(d.R); if (d.mode === 'bayes') { X.L = d.like.cells.map(r => r.map(N)); X.ln = d.like.rn; X.cost = N(d.infoCost); } return X; };
const exp = [/Macierz żalu/, /Oczekiwany koszt/, /Strategia optymalna/, /Badanie się opłaca/, /Użyteczność oczekiwana/, /Metoda graficzna/, /punkt siodłowy/];
EX.forEach((e, k) => { const h = c.dcReportHTML(toX(e.data)); t(`raport „${e.name}"`, exp[k].test(h)); });
let h = c.dcReportHTML(toX(EX[0].data)); t('Thompson: EVPI 60 000 i progi wrażliwości', /<b>60000<\/b>/.test(h.replace(/\s/g, '')) && /Analiza wrażliwości/.test(h) && /0,6154/.test(h));
h = c.dcReportHTML(toX(EX[2].data)); t('drzewo Thompsona: rysunek, gałęzie odrzucone, wybór badania rynku', /aria-label="Drzewo decyzyjne"/.test(h) && /class="dtcut"/.test(h) && /wybierz <b>Badanie rynku<\/b>/.test(h));
const csv = c.dcToCSV(get('dcNormalize(JSON.parse(JSON.stringify(DC_EXAMPLES[3].data)))')), back = c.dcFromCSV(csv);
t('CSV (Bayes): tabela wypłat, prawdopodobieństwa, wiarygodność, koszt', back.mode === 'bayes' && back.st.cells[0][1] === '-180000' && back.st.xr[0] === '0.5' && back.like.cells[0][0] === '0.7' && back.infoCost === '10000');
const tcsv = c.dcToCSV(get('dcNormalize(JSON.parse(JSON.stringify(DC_EXAMPLES[2].data)))')), tb = c.dcFromCSV(tcsv); t('CSV (drzewo): węzły z rodzicami i prawdopodobieństwami', tb.mode === 'tree' && tb.tree.length === 26 && tb.tree[3].prob === '0.5');
let th = ''; try { c.dcFromCSV('tryb;table\nDecyzja;S1;S2\nA;1'); } catch (e) { th = e.message; } t('CSV: błąd liczby kolumn z numerem wiersza', /wiersz 3/.test(th));
h = c.dcReportHTML({mode: 'table', V: [[1, 2], [3, 4]], rn: ['<b>x</b>', 'y'], cn: ['s1', 's2'], kind: 'profit', alpha: 0.5}); t('nazwy bezpiecznie wyświetlane', !/<b>x<\/b>/.test(h));
{ // audyt 2026-11-13: tabela wartości oczekiwanych wszystkich decyzji (Thompson Lumber, liczone ręcznie: po wyniku korzystnym P = 7/9 → 115 555,56 i 73 333,33; po niekorzystnym P = 3/11 → −76 363,64 i 12 727,27)
  const hb = c.dcReportHTML(toX(EX.find(e => /Bayes/.test(e.name)).data)).replace(/[\u00a0 ]/g, '');
  t('Bayes: wartości oczekiwane każdej decyzji bez badania i po każdym wyniku (liczone ręcznie)', /Wartościoczekiwanedecyzji/.test(hb) && ['10000', '40000', '115555,56', '73333,33', '-76363,64', '12727,27'].every(v => hb.includes('>' + v + '<')) && (hb.match(/class="best">(40000|115555,56|12727,27)</g) || []).length === 3); }
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'dec') && !SOON.some(s => s[0] === 'dec')"));
console.log(`Testy modułu Analiza decyzji: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
