// Testy solvera (Node, bez przeglądarki): node tests/solver.test.js
const {load} = require('./helpers');
const vm = require('vm'), c = load(['js/core.js', 'js/solver.js']);
const dualOf = vm.runInContext('dualOf', c);   // const nie trafia na obiekt kontekstu – pobieramy przez runInContext
const S = (M, extra) => c.solveM(Object.assign({t: M.c.map(() => 'c')}, M), extra);
const near = (a, b) => Math.abs(a - b) < 1e-6;
let ok = 0, bad = 0;
const t = (name, cond) => { cond ? ok++ : (bad++, console.log('BŁĄD:', name)); };
const W = {n: 2, c: [3, 5], A: [[1, 0], [0, 2], [3, 2]], rel: ['<=', '<=', '<='], b: [4, 12, 18], maxi: true};
let r = S(W); t('Wyndor: x=(2,6), Z=36', r.status === 'optimal' && near(r.x[0], 2) && near(r.x[1], 6) && near(r.z, 36));
const Mn = {n: 2, c: [1, 1], A: [[1, 2], [3, 1]], rel: ['>=', '>='], b: [4, 6], maxi: false};
r = S(Mn); t('minimalizacja z ≥: Z=2,8', near(r.z, 2.8));
t('dualność (max): W = Z', near(S(dualOf(Object.assign({t: ['c', 'c']}, W))).z, 36));
t('dualność (min): W = Z', near(S(dualOf(Object.assign({t: ['c', 'c']}, Mn))).z, 2.8));
r = c.solveM({n: 2, c: [1, 1], A: [[1, 1], [1, -1]], rel: ['<=', '<='], b: [5, -1], maxi: true, t: ['u', 'c']});
t('zmienna dowolna: Z=5', near(r.z, 5));
r = S({n: 1, c: [1], A: [[1], [1]], rel: ['<=', '>='], b: [1, 3], maxi: true}); t('sprzeczne: infeasible', r.status === 'infeasible');
r = S({n: 2, c: [1, 0], A: [[1, -1]], rel: ['<='], b: [1], maxi: true}); t('nieograniczone: unbounded', r.status === 'unbounded');
r = S({n: 2, c: [126428, 50000], A: [[1, 1], [1, 0]], rel: ['>=', '<='], b: [300000, 200000], maxi: false}); t('duże liczby: Z=1,5e10', near(r.z / 1e10, 1.5));
r = S({n: 2, c: [1, 2], A: [[1, 1]], rel: ['='], b: [4], maxi: true}); t('ograniczenie równościowe: Z=8', near(r.z, 8));
r = S(W, [{j: 1, rel: '<=', b: 3}]); t('dodatkowa granica x2≤3: Z=27', near(r.z, 27));
console.log(`Testy solvera: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
