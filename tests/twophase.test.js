// Metoda dwufazowa: te same wyniki co metoda dużego M + poprawne kroki (faza I, faza II, ukryte kolumny sztuczne)
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
const both = M => { M = Object.assign({t: M.c.map(() => 'c')}, M); return [c.solveM({...M, method: 'M'}), c.solveM({...M, method: '2F'})]; };
const cases = [
  ['max ≤ (bez zmiennych sztucznych)', {n: 2, c: [3, 5], A: [[1, 0], [0, 2], [3, 2]], rel: ['<=', '<=', '<='], b: [4, 12, 18], maxi: true}, 'optimal', 36],
  ['min z ≥', {n: 2, c: [2, 3], A: [[1, 1], [1, 2]], rel: ['>=', '>='], b: [4, 6], maxi: false}, 'optimal', 10],
  ['równość', {n: 2, c: [1, 2], A: [[1, 1]], rel: ['='], b: [4], maxi: true}, 'optimal', 8],
  ['równości liniowo zależne', {n: 2, c: [1, 3], A: [[1, 1], [2, 2], [1, 0]], rel: ['=', '=', '<='], b: [4, 8, 3], maxi: false}, 'optimal', 6],
  ['sprzeczne', {n: 2, c: [1, 1], A: [[1, 1], [1, 1]], rel: ['<=', '>='], b: [3, 5], maxi: true}, 'infeasible'],
  ['sprzeczne i nieograniczone', {n: 2, c: [1, 1], A: [[1, 0], [1, 0]], rel: ['<=', '>='], b: [3, 5], maxi: true}, 'infeasible'],
  ['nieograniczone z ≥', {n: 2, c: [1, 1], A: [[1, -1]], rel: ['>='], b: [2], maxi: true}, 'unbounded'],
  ['ujemna prawa strona', {n: 2, c: [1, 1], A: [[-1, -1], [1, 0]], rel: ['<=', '<='], b: [-2, 5], maxi: false}, 'optimal', 2],
];
cases.forEach(([name, M, st, z]) => { const [r1, r2] = both(M);
  t(name + ': status ' + st, r1.status === st && r2.status === st);
  if (z !== undefined) t(name + ': Z = ' + z, near(r1.z, z) && near(r2.z, z)); });
// kroki: faza I i faza II, w fazie II ukryte kolumny sztuczne
const rec = []; c.solveM({n: 2, c: [2, 3], A: [[1, 1], [1, 2]], rel: ['>=', '>='], b: [4, 6], maxi: false, t: ['c', 'c'], method: '2F'}, [], rec);
t('kroki zawierają fazę I i fazę II', rec.some(s => /Faza I,/.test(s.text)) && rec.some(s => /Faza II:/.test(s.text)));
t('w fazie II kolumny sztuczne są ukryte', rec[rec.length - 1].hide.length === 2 && rec[0].hide.length === 0);
t('wiersz celu fazy I opisany jako −w', rec[0].zl === '−w');
// losowe zadania z ≤, ≥ i =: obie metody muszą dać ten sam status i Z
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 60; k++) {
  const n = ri(2, 4), m = ri(2, 4), rels = ['<=', '>=', '='];
  const M = {n, c: Array.from({length: n}, () => ri(-3, 9)), A: Array.from({length: m}, () => Array.from({length: n}, () => ri(-2, 6))),
    rel: Array.from({length: m}, () => rels[ri(0, 2)]), b: Array.from({length: m}, () => ri(-5, 20)), maxi: rnd() < .5};
  const [r1, r2] = both(M);
  t('losowe #' + k, r1.status === r2.status && (r1.status !== 'optimal' || near(r1.z, r2.z)));
}
console.log(`Testy metody dwufazowej: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
