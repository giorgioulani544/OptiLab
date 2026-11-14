// Programowanie nieliniowe: znane minima (funkcje kwadratowe – rozwiązanie analityczne, Rosenbrock), przeszukiwanie siatką (funkcja Boyda), metody 1D,
// zadania z ograniczeniami z rozwiązaniem z warunków KKT (liczone ręcznie), brak zbieżności zgłaszany jako „limit”
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/linalg.js', 'js/expr.js', 'js/nlp/nlp-solver.js']), EX = vm.runInContext('EX', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol) => Math.abs(a - b) <= tol, F = s => EX.make(s).f;
// jedna zmienna: f = (x − 2)² + 1 na [0; 5] → x = 2; maksimum −(x − 2)²
for (const m of ['bisect', 'golden', 'fib', 'newton']) { const R = c.nlp1D(x => F('(x1 - 2)^2 + 1')([x]), m, {a: 0, b: 5, tol: 1e-6}); t(`1D ${m}: minimum (x − 2)² + 1 w x = 2, f = 1`, R.status === 'optimal' && near(R.x, 2, 1e-5) && near(R.fx, 1, 1e-9)); }
for (const m of ['bisect', 'golden', 'fib']) { const R = c.nlp1D(x => -((x - 2) ** 2), m, {a: 0, b: 5, tol: 1e-6, maxi: true}); t(`1D ${m}: maksimum −(x − 2)² w x = 2`, R.status === 'optimal' && near(R.x, 2, 1e-5)); }
const B = c.nlp1D(x => x ** 4 - 14 * x ** 3 + 60 * x ** 2 - 70 * x, 'golden', {a: 0, b: 2, tol: 1e-7});
let gx = 0, gb = Infinity; for (let i = 0; i <= 2e6; i++) { const x = i / 1e6, v = x ** 4 - 14 * x ** 3 + 60 * x ** 2 - 70 * x; if (v < gb) { gb = v; gx = x; } }
t(`złoty podział: x⁴ − 14x³ + 60x² − 70x na [0; 2] = przeszukiwanie siatką (x ≈ ${gx.toFixed(4)})`, near(B.x, gx, 2e-6));
t('bisekcja: brak zmiany znaku pochodnej → komunikat, bez wyniku', c.nlp1D(x => x * x, 'bisect', {a: 1, b: 3}).status === 'nobracket');
// wiele zmiennych: funkcje kwadratowe ½xᵀQx + bᵀx (losowe, Q dodatnio określona) – rozwiązanie Q x = −b liczone tutaj eliminacją Gaussa
const gauss = (A, b) => { const n = A.length, M = A.map((r, i) => [...r, b[i]]); for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; [M[k], M[p]] = [M[p], M[k]]; for (let i = 0; i < n; i++) if (i !== k) { const f = M[i][k] / M[k][k]; for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; } } return M.map((r, i) => r[n] / r[i]); };
let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 60; k++) {
  const n = ri(2, 4), Bm = Array.from({length: n}, () => Array.from({length: n}, () => ri(-3, 3))), Q = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => Bm.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1 : 0))), b = Array.from({length: n}, () => ri(-9, 9));
  const fq = x => 0.5 * x.reduce((s, xi, i) => s + xi * x.reduce((u, xj, j) => u + Q[i][j] * xj, 0), 0) + b.reduce((s, bi, i) => s + bi * x[i], 0), xs = gauss(Q, b.map(v => -v));
  for (const m of ['newton', 'bfgs']) { const R = c.nlpMin(fq, Array(n).fill(0), m, {tol: 1e-9, maxIt: 400}); t(`#${k} ${m}: minimum funkcji kwadratowej = rozwiązanie Qx = −b`, R.status === 'optimal' && R.x.every((v, i) => near(v, xs[i], 1e-5 * (1 + Math.abs(xs[i]))))); }
}
const rb = F('(1 - x1)^2 + 100*(x2 - x1^2)^2');
for (const m of ['newton', 'bfgs']) { const R = c.nlpMin(rb, [-1.2, 1], m, {tol: 1e-8, maxIt: 2000}); t(`Rosenbrock (${m}) z (−1,2; 1): minimum (1; 1)`, R.status === 'optimal' && near(R.x[0], 1, 1e-4) && near(R.x[1], 1, 1e-4)); }
const Rg = c.nlpMin(rb, [-1.2, 1], 'grad', {tol: 1e-8, maxIt: 200}); t('Rosenbrock (spadek gradientu, 200 iteracji): brak zbieżności zgłoszony jako „limit”, nie jako wynik', Rg.status === 'limit');
// funkcja Boyda e^(x1+3x2−0,1) + e^(x1−3x2−0,1) + e^(−x1−0,1): minimum vs przeszukiwanie siatką
const boyd = x => Math.exp(x[0] + 3 * x[1] - 0.1) + Math.exp(x[0] - 3 * x[1] - 0.1) + Math.exp(-x[0] - 0.1); let gm = Infinity, gp = null;
for (let i = -2000; i <= 2000; i++) for (let j = -400; j <= 400; j++) { const p = [i / 2000, j / 2000], v = boyd(p); if (v < gm) { gm = v; gp = p; } }
for (const m of ['grad', 'newton', 'bfgs']) { const R = c.nlpMin(boyd, [1, 1], m, {tol: 1e-9, maxIt: 3000}); t(`funkcja Boyda (${m}): minimum = przeszukiwanie siatką (${gp.map(v => v.toFixed(3)).join('; ')})`, R.status === 'optimal' && near(R.x[0], gp[0], 1e-3) && near(R.x[1], gp[1], 1e-3) && R.fx <= gm + 1e-9); }
// z ograniczeniami (rozwiązania z warunków KKT, policzone ręcznie)
const CASES = [['(x1 - 2)^2 + (x2 - 1)^2', [{e: 'x1 + x2', type: '<=', rhs: 2}], [1.5, 0.5]], ['x1^2 + x2^2', [{e: 'x1 + x2', type: '=', rhs: 1}], [0.5, 0.5]], ['x1^2 + x2^2', [{e: 'x1 + x2', type: '>=', rhs: 2}], [1, 1]],
  ['x1 + x2', [{e: 'x1^2 + x2^2', type: '<=', rhs: 2}], [-1, -1]], ['(x1 - 2)^2 + (x2 - 1)^2', [{e: 'x1^2 - x2', type: '<=', rhs: 0}, {e: 'x1 + x2', type: '<=', rhs: 2}], [1, 1]]];
CASES.forEach(([fs, cs, xs]) => { const cons = cs.map(q => ({g: F(q.e), type: q.type, rhs: q.rhs}));
  for (const m of ['penalty', 'auglag']) { const R = c.nlpCon(F(fs), [0, 0], cons, m, {tol: 1e-6}); t(`${m}: min ${fs} przy ${cs.map(q => q.e + ' ' + q.type + ' ' + q.rhs).join(', ')} → (${xs.join('; ')})`, R.status === 'optimal' && near(R.x[0], xs[0], 2e-3) && near(R.x[1], xs[1], 2e-3)); } });
const RA = c.nlpCon(F('(x1 - 2)^2 + (x2 - 1)^2'), [0, 0], [{g: F('x1^2 - x2'), type: '<=', rhs: 0}, {g: F('x1 + x2'), type: '<=', rhs: 2}], 'auglag', {tol: 1e-7});
t('rozszerzony Lagrange: mnożniki KKT λ₁ = λ₂ = 2/3 (liczone ręcznie)', near(RA.lam[0], 2 / 3, 1e-3) && near(RA.lam[1], 2 / 3, 1e-3));
t('maksymalizacja z ograniczeniem: max x1 + x2 przy x1² + x2² ≤ 2 → (1; 1)', (R => R.status === 'optimal' && near(R.x[0], 1, 2e-3) && near(R.x[1], 1, 2e-3))(c.nlpCon(F('x1 + x2'), [0, 0], [{g: F('x1^2 + x2^2'), type: '<=', rhs: 2}], 'auglag', {maxi: true})));
t('funkcja nieograniczona z dołu (−x1) – „diverge” albo „limit”, bez wyniku', ['diverge', 'limit'].includes(c.nlpMin(x => -x[0], [0], 'bfgs', {maxIt: 300}).status));
console.log(`Testy programowania nieliniowego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
