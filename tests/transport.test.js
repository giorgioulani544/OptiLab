// Zagadnienie transportowe: przykład podręcznikowy (Taha) + porównanie z simpleksem na losowych zadaniach
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/net/transport-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
// Taha, „Operations Research", przykład transportowy: NW = 520, minimalny element = 475, VAM = 475, optimum = 435
const TAHA = {supply: [15, 25, 10], demand: [5, 15, 15, 15], cost: [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]]};
const start = {nw: 520, lc: 475, vam: 475};
for (const k of ['nw', 'lc', 'vam']) {
  const R = c.transportSolve(TAHA, k);
  t(`Taha ${k}: koszt początkowy ${start[k]}`, near(R.initial.t, start[k]));
  t(`Taha ${k}: optimum 435`, R.status === 'optimal' && near(R.t, 435));
  t(`Taha ${k}: m+n−1 zmiennych bazowych w każdej iteracji`, R.iters.every(s => s.B.flat().filter(Boolean).length === 6));
}
// rozwiązanie przez simpleks (OptiLab LP) – niezależna kontrola
const viaLP = P => {
  const m = P.supply.length, n = P.demand.length, S = P.supply.reduce((a, b) => a + b, 0), D = P.demand.reduce((a, b) => a + b, 0);
  const A = [], rel = [], b = [], cc = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) cc.push(P.cost[i][j] === null ? 0 : P.cost[i][j]);
  for (let i = 0; i < m; i++) { A.push(cc.map((_, k) => Math.floor(k / n) === i ? 1 : 0)); rel.push(S > D ? '<=' : '='); b.push(P.supply[i]); }
  for (let j = 0; j < n; j++) { A.push(cc.map((_, k) => k % n === j ? 1 : 0)); rel.push(D > S ? '<=' : '='); b.push(P.demand[j]); }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (P.cost[i][j] === null) { A.push(cc.map((_, k) => k === i * n + j ? 1 : 0)); rel.push('<='); b.push(0); }
  return c.solveM({n: cc.length, c: cc, A, rel, b, maxi: !!P.maxi, t: cc.map(() => 'c')});
};
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 60; k++) {
  const m = ri(2, 4), n = ri(2, 5), P = {maxi: rnd() < .3, supply: Array.from({length: m}, () => ri(0, 30)), demand: Array.from({length: n}, () => ri(0, 30)),
    cost: Array.from({length: m}, () => Array.from({length: n}, () => rnd() < .12 ? null : ri(1, 20)))};
  if (P.supply.every(v => !v)) P.supply[0] = 10; if (P.demand.every(v => !v)) P.demand[0] = 10;
  const init = ['nw', 'lc', 'vam'][k % 3], R = c.transportSolve(P, init), L = viaLP(P);
  const same = L.status === 'optimal' ? (R.status === 'optimal' && near(R.t, L.z)) : R.status === 'infeasible';
  t(`losowe #${k} (${init}${P.maxi ? ', max' : ''})`, same);
  if (R.status === 'optimal') {                                              // zakres kosztu: plan zostaje optymalny tuż przy granicy zakresu
    const cells = []; R.ranges.forEach((r, i) => r.forEach((q, j) => q && cells.push([i, j, q])));
    const [i, j, q] = cells[ri(0, cells.length - 1)], P2 = JSON.parse(JSON.stringify(P));
    if (i < P.supply.length && j < P.demand.length) {
      const nc = isFinite(q.hi) ? q.hi - 1e-3 : isFinite(q.lo) ? q.lo + 1e-3 : P.cost[i][j] + 5; P2.cost[i][j] = nc;
      const R2 = c.transportSolve(P2, 'vam'); let old = 0; R.x.forEach((r, a) => r.forEach((v, bb) => { if (a < P.supply.length && bb < P.demand.length && v) old += v * P2.cost[a][bb]; }));
      t(`losowe #${k}: zakres kosztu trasy ${i + 1}-${j + 1}`, R2.status === 'optimal' && near(R2.t, old));
    }
  }
}
// degeneracja (NW kończy wiersz i kolumnę jednocześnie), niezbilansowanie, rozwiązanie alternatywne, trasa zakazana
let R = c.transportSolve({supply: [20, 30], demand: [20, 30], cost: [[4, 6], [5, 3]]}, 'nw');
t('degeneracja: poprawne optimum 170', R.status === 'optimal' && near(R.t, 170));
R = c.transportSolve({supply: [30, 25], demand: [20, 20], cost: [[2, 3], [4, 1]]}, 'vam');
t('podaż > popyt: fikcyjny odbiorca z 15', R.dummy.type === 'col' && near(R.dummy.amount, 15) && R.dNames[2] === 'Fikcyjny odbiorca');
R = c.transportSolve({supply: [10, 10], demand: [10, 10], cost: [[1, 1], [1, 1]]}, 'nw');
t('rozwiązanie alternatywne wykryte', R.alt && near(R.alt.t, R.t));
R = c.transportSolve({supply: [10, 5], demand: [10, 5], cost: [[null, 1], [2, 3]]}, 'nw');
t('trasa zakazana wymusza brak rozwiązania', R.status === 'infeasible' && R.forbiddenUsed.length === 1);
R = c.transportSolve({maxi: true, supply: [10, 10], demand: [10, 10], cost: [[5, 1], [1, 5]]}, 'nw');
t('maksymalizacja zysku: 100', R.status === 'optimal' && near(R.t, 100));
console.log(`Testy transportu: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
