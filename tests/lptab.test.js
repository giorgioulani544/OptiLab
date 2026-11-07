// Alternatywna metoda tabelaryczna: przykład z materiałów z zajęć (tablice krok po kroku), zadania Z6, Z9, Z15,
// losowe zadania (max/min, ≤, ≥, =, ujemne prawe strony) vs przegląd wierzchołków napisany tutaj, cyklowanie (Beale), symboliczne M
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/lp-tab.js']), sCmp = vm.runInContext('sCmp', c), sFmt = vm.runInContext('sFmt', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b)), eqA = (a, b, tol = 1e-3) => a.length === b.length && a.every((x, k) => Math.abs(x - b[k]) <= tol);
const S = R => R.tables.map(T => T.cmz.map(v => v.m ? NaN : v.a));
// przykład z materiałów: 30x1 + 20x2 → max; 2x1 + x2 ≤ 1000; 3x1 + 3x2 ≤ 2400; 1,5x1 ≤ 600
const P = {n: 2, c: [30, 20], A: [[2, 1], [3, 3], [1.5, 0]], rel: ['<=', '<=', '<='], b: [1000, 2400, 600], maxi: true}, R = c.tabSolve(P), T0 = R.tables[0], T1 = R.tables[1];
t('materiały: zmienne swobodne x3, x4, x5 w bazie pierwszej tablicy', R.names.join() === 'x1,x2,x3,x4,x5' && T0.basis.join() === '2,3,4');
t('materiały: pierwsza tablica z_j = 0, c_j − z_j = 30 20 0 0 0', eqA(S(R)[0], [30, 20, 0, 0, 0]) && T0.zj.every(v => v.a === 0 && v.m === 0));
t('materiały: ilorazy 500, 800, 400 → wychodzi x5 (najmniejszy), wchodzi x1 (największe c_j − z_j)', eqA(T0.ratios, [500, 800, 400]) && T0.pc === 0 && T0.pr === 2);
t('materiały: druga tablica – wiersze x3 = (0 1 1 0 −1,333 | 200), x4 = (0 3 0 1 −2 | 1200), x1 = (1 0 0 0 0,667 | 400)',
  eqA(T1.A[0], [0, 1, 1, 0, -4 / 3]) && near(T1.b[0], 200) && eqA(T1.A[1], [0, 3, 0, 1, -2]) && near(T1.b[1], 1200) && eqA(T1.A[2], [1, 0, 0, 0, 2 / 3]) && near(T1.b[2], 400) && T1.basis.join() === '2,3,0');
t('materiały: druga tablica z_j = 30 0 0 0 20, c_j − z_j = 0 20 0 0 −20, wartość 12 000', eqA(T1.zj.map(v => v.a), [30, 0, 0, 0, 20]) && eqA(S(R)[1], [0, 20, 0, 0, -20]) && near(T1.z.a, 12000));
t('materiały: wynik końcowy x1 = 200, x2 = 600, z = 18 000', R.status === 'optimal' && eqA(R.x, [200, 600], 1e-6) && near(R.z, 18000));
// zadania z zajęć Z6, Z9, Z15
for (const [nm, Q, z] of [['Z6', {c: [2.9, 5.5, 3.1], A: [[2, 2, 1], [4.5, 4, 3], [2.1, 6.3, 3.2]], b: [8800, 20000, 12000]}, 14636.2130], ['Z9', {c: [2.5, 5, 2], A: [[0, 5, 2], [1.1, 0.5, 1], [3, 7, 2]], b: [7500, 4500, 20000]}, 15579.2683],
  ['Z15', {c: [16, 23, 18], A: [[2.4, 2, 1.2], [1, 0, 2.5], [2, 3.5, 2.8]], b: [1100, 550, 2000]}, 13150.9677]]) {
  const RR = c.tabSolve({n: 3, ...Q, rel: ['<=', '<=', '<='], maxi: true}); t(`${nm}: z = ${z}`, RR.status === 'optimal' && Math.abs(RR.z - z) < 1e-3); }
// symboliczne M
t('symboliczne M: porządek (−M + 1000 < 0 < M − 1000), zapis', sCmp({a: 1000, m: -1}, {a: 0, m: 0}) < 0 && sCmp({a: -1000, m: 1}, {a: 0, m: 0}) > 0 && sFmt({a: 3, m: -1}) === '−M + 3' && sFmt({a: -30, m: 2}) === '2M − 30' && sFmt({a: 0, m: 1}) === 'M');
// Beale – cyklowanie przy regule największego współczynnika
const Bl = c.tabSolve({n: 4, c: [-0.75, 20, -0.5, 6], A: [[0.25, -8, -1, 9], [0.5, -12, -0.5, 3], [0, 0, 1, 0]], rel: ['<=', '<=', '<='], b: [0, 0, 1], maxi: false});
t('Beale: reguła Blanda po powtórzeniu bazy, optimum −1,25', Bl.status === 'optimal' && near(Bl.z, -1.25) && Bl.tables.some(T => T.bland));
// przegląd wierzchołków (niezależny): wszystkie bazy układu z ograniczeniami pudełkowymi x ≤ U
const vertexBest = (Q, U) => { const n = Q.n, rows = [], rhs = [];
  Q.A.forEach((a, i) => { if (Q.rel[i] !== '>=') { rows.push(a); rhs.push(Q.b[i]); } if (Q.rel[i] !== '<=') { rows.push(a.map(v => -v)); rhs.push(-Q.b[i]); } });
  for (let j = 0; j < n; j++) { const e = Array(n).fill(0); e[j] = 1; rows.push(e); rhs.push(U); const f = Array(n).fill(0); f[j] = -1; rows.push(f); rhs.push(0); }
  let best = null; const pick = [], go = (s, left) => { if (!left) { const M2 = pick.map(i => [...rows[i], rhs[i]]);
      for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M2[i][k]) > Math.abs(M2[p][k])) p = i; if (Math.abs(M2[p][k]) < 1e-10) return; [M2[k], M2[p]] = [M2[p], M2[k]]; for (let i = 0; i < n; i++) if (i !== k) { const f = M2[i][k] / M2[k][k]; for (let j = k; j <= n; j++) M2[i][j] -= f * M2[k][j]; } }
      const x = M2.map((r, k) => r[n] / r[k]); if (rows.every((r, i) => r.reduce((s2, v, j) => s2 + v * x[j], 0) <= rhs[i] + 1e-7)) { const z = Q.c.reduce((s2, v, j) => s2 + v * x[j], 0); if (best === null || (Q.maxi ? z > best : z < best)) best = z; } return; }
    for (let i = s; i <= rows.length - left; i++) { pick.push(i); go(i + 1, left - 1); pick.pop(); } };
  go(0, n); return best; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 250; k++) {
  const n = ri(1, 3), m = ri(1, 4), Q = {n, c: Array.from({length: n}, () => ri(-6, 9)), A: Array.from({length: m}, () => Array.from({length: n}, () => ri(-3, 6))), rel: Array.from({length: m}, () => ['<=', '<=', '>=', '='][ri(0, 3)]), b: Array.from({length: m}, () => ri(-10, 30)), maxi: rnd() < 0.5};
  const R2 = c.tabSolve(Q), v1 = vertexBest(Q, 1e4), v2 = vertexBest(Q, 1e5), unb = v1 !== null && Math.abs(v2 - v1) > 1e-6 * (1 + Math.abs(v1));
  const expected = v1 === null ? 'infeasible' : unb ? 'unbounded' : 'optimal';
  t(`#${k} status (${expected}) i wartość zgodne z przeglądem wierzchołków`, R2.status === expected && (expected !== 'optimal' || near(R2.z, v1, 1e-6)));
  if (R2.status === 'optimal') { const x = R2.x; t(`#${k} rozwiązanie dopuszczalne i z = c·x`, Q.A.every((a, i) => { const lhs = a.reduce((s2, v, j) => s2 + v * x[j], 0); return Q.rel[i] === '<=' ? lhs <= Q.b[i] + 1e-6 : Q.rel[i] === '>=' ? lhs >= Q.b[i] - 1e-6 : Math.abs(lhs - Q.b[i]) < 1e-6; }) && x.every(v => v >= -1e-9) && near(Q.c.reduce((s2, v, j) => s2 + v * x[j], 0), R2.z)); }
}
// przypadek z testu losowego: kierunek nieograniczony części bez M, ale zmienna sztuczna dodatnia → zadanie sprzeczne
t('sprzeczne mimo kierunku nieograniczonego w części bez M (4x2 ≤ −8)', c.tabSolve({n: 2, c: [5, 0], A: [[-2, -3], [-1, -2], [-1, 6], [0, 4]], rel: ['<=', '<=', '<=', '<='], b: [5, 22, -8, -8], maxi: true}).status === 'infeasible');
console.log(`Testy alternatywnej metody tabelarycznej: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
