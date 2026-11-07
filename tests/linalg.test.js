// Algebra liniowa: residua układów, A·A⁻¹ = I, wyznacznik vs rozwinięcie Laplace'a (niezależnie), Cholesky L·Lᵀ = A, macierze osobliwe
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/linalg.js']), LA = vm.runInContext('LA', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const laplace = A => A.length === 1 ? A[0][0] : A[0].reduce((s, v, j) => s + (j % 2 ? -1 : 1) * v * laplace(A.slice(1).map(r => r.filter((_, k) => k !== j))), 0);
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 200; k++) {
  const n = 1 + Math.floor(rnd() * 7), A = Array.from({length: n}, () => Array.from({length: n}, () => Math.round((rnd() * 20 - 10) * 100) / 100)), b = Array.from({length: n}, () => rnd() * 10);
  const d = laplace(A); t(`#${k} wyznacznik = rozwinięcie Laplace'a`, near(LA.det(A), d, 1e-8));
  if (Math.abs(d) > 1e-6) { const x = LA.solve(A, b), Ai = LA.inv(A);
    t(`#${k} układ: residuum ≈ 0`, x && A.every((r, i) => near(r.reduce((s, v, j) => s + v * x[j], 0), b[i], 1e-8)));
    t(`#${k} A·A⁻¹ = I`, LA.mul(A, Ai).every((r, i) => r.every((v, j) => Math.abs(v - +(i === j)) < 1e-8))); }
  const B = Array.from({length: n}, () => Array.from({length: n}, () => rnd() * 4 - 2)), S = LA.mul(B, B.map((_, i) => B.map(r => r[i]))).map((r, i) => r.map((v, j) => v + (i === j ? 0.5 : 0)));   // B·Bᵀ + 0,5·I – dodatnio określona
  const L = LA.chol(S); t(`#${k} Cholesky: L·Lᵀ = A`, L && LA.mul(L, L.map((_, i) => L.map(r => r[i]))).every((r, i) => r.every((v, j) => near(v, S[i][j], 1e-9))));
}
t('macierz osobliwa: brak rozwiązania (null), wyznacznik 0', LA.solve([[1, 2], [2, 4]], [1, 2]) === null && LA.det([[1, 2], [2, 4]]) === 0 && LA.inv([[1, 2], [2, 4]]) === null);
t('macierz nieokreślona i niesymetryczna: Cholesky odrzuca', !LA.isPD([[1, 2], [2, 1]]) && !LA.isPD([[2, 1], [0, 2]]) && LA.isPD([[4, 2], [2, 3]]));
t('potęga macierzy: P² dla łańcucha [[0,1],[1,0]] = I', JSON.stringify(LA.pow([[0, 1], [1, 0]], 2)) === JSON.stringify([[1, 0], [0, 1]]));
console.log(`Testy algebry liniowej: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
