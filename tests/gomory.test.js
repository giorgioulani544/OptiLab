// Odcięcia Gomory'ego: przykład podręcznikowy (Taha: max 7x1 + 10x2 → LP (4,5; 3,5), z = 66,5; całkowite (4, 3), z = 58),
// zadania z laboratorium Z6, Z9, Z15 vs przegląd wszystkich punktów całkowitych (napisany tutaj), losowe zadania vs przegląd, arytmetyka ułamków
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/lp-gomory.js']), FR = vm.runInContext('FR', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
t('ułamki: 2,9 = 29/10; część ułamkowa −7/3 = 2/3; floor(−7/3) = −3', FR.str(FR.fromNum(2.9)) === '29/10' && FR.str(FR.frac(FR.mk(-7n, 3n))) === '2/3' && FR.str(FR.floor(FR.mk(-7n, 3n))) === '-3');
const T = c.gomSolve({n: 2, c: [7, 10], A: [[-1, 3], [7, 1]], rel: ['<=', '<='], b: [6, 35], maxi: true});
t('Taha: relaksacja LP x = (4,5; 3,5), z = 66,5', FR.toNum(T.lpX[0]) === 4.5 && FR.toNum(T.lpX[1]) === 3.5 && FR.toNum(T.lpValue) === 66.5);
t('Taha: rozwiązanie całkowite x = (4, 3), z = 58', T.status === 'optimal' && T.xNum.join() === '4,3' && T.zNum === 58);
t('Taha: pierwsze odcięcie z wiersza x2: (7/22)x3 + (1/22)x4 ≥ 1/2', T.cuts.length >= 1 && T.cuts[0].srcVar === 'x2' && FR.str(T.cuts[0].f0) === '1/2' && FR.str(T.cuts[0].f[2]) === '7/22' && FR.str(T.cuts[0].f[3]) === '1/22');
// przegląd: najlepszy punkt całkowity (dla x3 – najlepsza wartość przy ustalonych x1, x2, gdy wszystkie ograniczenia ≤ z dodatnimi współczynnikami)
const brute3 = (cc, A, b) => { let best = -Infinity, arg = null; const ub = j => Math.floor(Math.min(...A.map((r, i) => r[j] > 0 ? b[i] / r[j] : Infinity)));
  for (let x1 = 0; x1 <= ub(0); x1++) for (let x2 = 0; x2 <= ub(1); x2++) { let cap = Infinity, okk = true;
    for (let i = 0; i < A.length; i++) { const rest = b[i] - A[i][0] * x1 - A[i][1] * x2; if (rest < -1e-9) { okk = false; break; } if (A[i][2] > 0) cap = Math.min(cap, rest / A[i][2]); }
    if (!okk) continue; const x3 = Math.floor(cap + 1e-9), z = cc[0] * x1 + cc[1] * x2 + cc[2] * x3; if (z > best + 1e-9) { best = z; arg = [x1, x2, x3]; } } return {best, arg}; };
for (const [nm, Q] of [['Z6', {c: [2.9, 5.5, 3.1], A: [[2, 2, 1], [4.5, 4, 3], [2.1, 6.3, 3.2]], b: [8800, 20000, 12000]}], ['Z9', {c: [2.5, 5, 2], A: [[0, 5, 2], [1.1, 0.5, 1], [3, 7, 2]], b: [7500, 4500, 20000]}],
  ['Z15', {c: [16, 23, 18], A: [[2.4, 2, 1.2], [1, 0, 2.5], [2, 3.5, 2.8]], b: [1100, 550, 2000]}]]) {
  const G = c.gomSolve({n: 3, ...Q, rel: ['<=', '<=', '<='], maxi: true}, {maxCuts: 400, maxPiv: 20000}), B = brute3(Q.c, Q.A, Q.b);
  t(`${nm}: Gomory = przegląd wszystkich punktów całkowitych (z = ${B.best.toFixed(2)}), odcięć: ${G.cuts.length}`, G.status === 'optimal' && near(G.zNum, B.best, 1e-9) && G.xNum.every(v => Number.isInteger(v)) && Q.A.every((r, i) => r.reduce((s, v, j) => s + v * G.xNum[j], 0) <= Q.b[i] + 1e-9));
}
// losowe zadania (max i min, ≤, ≥, =) vs przegląd wszystkich punktów całkowitych w pudełku
let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 220; k++) {
  const n = ri(2, 3), m = ri(1, 3), A = Array.from({length: m}, () => Array.from({length: n}, () => ri(0, 9) + (rnd() < 0.2 ? 0.5 : 0))), rel = Array.from({length: m}, () => rnd() < 0.7 ? '<=' : rnd() < 0.5 ? '>=' : '=');
  A.push(Array(n).fill(1)); rel.push('<='); const b = [...A.slice(0, m).map(() => ri(0, 30) + (rnd() < 0.2 ? 0.5 : 0)), ri(3, 14)];   // Σx ≤ U – zadanie ograniczone
  const maxi = rnd() < 0.6, cc = Array.from({length: n}, () => ri(-4, 9)), U = b[m];
  let best = null; const x = Array(n).fill(0), go = j => { if (j === n) { if (A.every((r, i) => { const l = r.reduce((s, v, q) => s + v * x[q], 0); return rel[i] === '<=' ? l <= b[i] + 1e-9 : rel[i] === '>=' ? l >= b[i] - 1e-9 : Math.abs(l - b[i]) < 1e-9; })) { const z = cc.reduce((s, v, q) => s + v * x[q], 0); if (best === null || (maxi ? z > best : z < best)) best = z; } return; } for (let v = 0; v <= U; v++) { x[j] = v; go(j + 1); } x[j] = 0; };
  go(0); const G = c.gomSolve({n, c: cc, A, rel, b, maxi}, {maxCuts: 300, maxPiv: 20000});
  if (G.status === 'limit') { t(`#${k} limit odcięć zgłoszony jako „limit” (nie jako wynik)`, !G.x); continue; }
  t(`#${k} ${best === null ? 'brak rozwiązań całkowitych' : 'z* = ' + best}: wynik Gomory'ego zgodny z przeglądem`, best === null ? G.status === 'infeasible' : G.status === 'optimal' && near(G.zNum, best, 1e-9) && G.xNum.every(Number.isInteger));
}
console.log(`Testy odcięć Gomory'ego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
