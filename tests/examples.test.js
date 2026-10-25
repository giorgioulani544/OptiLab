// Testy przykładów i zapisu/wczytania danych: każdy przykład daje oczekiwany wynik, a plik .json wraca bez zmian
const vm = require('vm'), {load, order} = require('./helpers');
const el = (value = '') => new Proxy({value, innerHTML: '', addEventListener() {}, classList: {add() {}, remove() {}, toggle() {}}}, {get: (t, k) => k in t ? t[k] : () => el(), set: (t, k, v) => (t[k] = v, true)});
const $ = () => el();
const c = load(order, {document: {querySelector: $, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const expected = [{s: 'optimal', z: 36}, {s: 'optimal', z: 10}, {s: 'optimal', z: 21}, {s: 'optimal', z: 4}, {s: 'optimal'}, {s: 'infeasible'}, {s: 'unbounded'}];
t('liczba przykładów', get('EXAMPLES.length') === expected.length);
expected.forEach((e, i) => {
  const m = get(`(() => { const d = parseModel('simplex', exampleToData(EXAMPLES[${i}])); const num = v => Number(v);
    return {n: d.n, maxi: d.maxi, c: d.c.map(num), A: d.rows.map(r => r.a.map(num)), rel: d.rows.map(r => r.rel), b: d.rows.map(r => num(r.b)), t: d.t}; })()`);
  const r = c.solveM(m);
  t(`przykład ${i + 1}: status ${e.s}`, r.status === e.s); if (e.z !== undefined) t(`przykład ${i + 1}: Z = ${e.z}`, near(r.z, e.z));
});
// zapis -> wczytanie (jak plik .json): dane wracają bez zmian, a typy zależą od modułu
const file = JSON.stringify(Object.assign({optilab: 1}, get("exampleToData(EXAMPLES[4])")));
const back = get(`parseModel('ilp', ${JSON.stringify(file)})`);
t('plik: 3 zmienne i 3 ograniczenia', back.n === 3 && back.rows.length === 3);
t('plik w module Całkowite: typy = całkowita', back.t.every(x => x === 'i'));
t('plik w module Simpleks: typy = ≥ 0', get(`parseModel('simplex', ${JSON.stringify(file)})`).t.every(x => x === 'c'));
let threw = false; try { get("parseModel('simplex', '{\"x\":1}')"); } catch (_) { threw = true; } t('zły plik jest odrzucany', threw);
console.log(`Testy przykładów i plików: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
