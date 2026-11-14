// Programowanie kwadratowe: Hillier i Lieberman (max 15x1 + 30x2 + 4x1x2 − 2x1² − 4x2², x1 + 2x2 ≤ 30 → (12, 9), 270),
// przegląd zbiorów aktywnych z warunkami KKT (napisany tutaj) dla losowych zadań ściśle wypukłych, Q = 0 (LP) vs przegląd wierzchołków, niewypukłość, sprzeczność, nieograniczoność
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/linalg.js', 'js/solver.js', 'js/qp/qp-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const H = c.qpSolve({n: 2, Q: [[-4, 4], [4, -8]], c: [15, 30], A: [[1, 2]], rel: ['<='], b: [30], maxi: true});
t('Hillier i Lieberman: x = (12, 9), wartość 270, mnożnik ograniczenia 3', H.status === 'optimal' && near(H.x[0], 12) && near(H.x[1], 9) && near(H.obj, 270) && near(H.lam[0], 3));
t('Hillier i Lieberman: funkcja wklęsła (Q dla −f dodatnio określona), warunki KKT spełnione', H.prep.convex && H.prep.strict && H.kkt.stat < 1e-9 && H.kkt.comp < 1e-9 && H.kkt.primal < 1e-9);
const gauss = (A, b) => { const n = A.length, M = A.map((r, i) => [...r, b[i]]); for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; if (Math.abs(M[p][k]) < 1e-11) return null; [M[k], M[p]] = [M[p], M[k]]; for (let i = 0; i < n; i++) if (i !== k) { const f = M[i][k] / M[k][k]; for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; } } return M.map((r, i) => r[n] / r[i]); };
// przegląd zbiorów aktywnych: ograniczenia ≤ (w tym −x ≤ 0); dla każdego podzbioru S: Qx + c + A_Sᵀλ = 0, A_S x = b_S → punkt dopuszczalny z λ ≥ 0 = rozwiązanie
const enumAS = (Q, cc, G, h) => { const n = cc.length, m = G.length; let best = null;
  for (let mask = 0; mask < 1 << m; mask++) { const S = [...Array(m).keys()].filter(k => mask >> k & 1); if (S.length > n) continue; const K = n + S.length, A = Array.from({length: K}, () => Array(K).fill(0)), r = Array(K).fill(0);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] = Q[i][j]; S.forEach((k, q) => { A[i][n + q] = G[k][i]; }); r[i] = -cc[i]; }
    S.forEach((k, q) => { for (let j = 0; j < n; j++) A[n + q][j] = G[k][j]; r[n + q] = h[k]; });
    const s = gauss(A, r); if (!s) continue; const x = s.slice(0, n), lm = s.slice(n);
    if (lm.some(v => v < -1e-9) || G.some((g, k) => g.reduce((a, v, j) => a + v * x[j], 0) > h[k] + 1e-7)) continue;
    const f = x.reduce((a, xi, i) => a + cc[i] * xi + 0.5 * xi * x.reduce((b2, xj, j) => b2 + Q[i][j] * xj, 0), 0); if (!best || f < best.f) best = {f, x}; }
  return best; };
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) {
  const n = ri(1, 3), m = ri(1, 3), B = Array.from({length: n}, () => Array.from({length: n}, () => ri(-3, 3))), Q = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => B.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1 : 0)));
  const cc = Array.from({length: n}, () => ri(-12, 6)), A = Array.from({length: m}, () => Array.from({length: n}, () => ri(-2, 5))), rel = Array.from({length: m}, () => ['<=', '>=', '='][ri(0, 2)]), b = Array.from({length: m}, () => ri(-4, 12));
  const G = [], h = []; A.forEach((row, i) => { if (rel[i] !== '>=') { G.push(row); h.push(b[i]); } if (rel[i] !== '<=') { G.push(row.map(v => -v)); h.push(-b[i]); } }); for (let j = 0; j < n; j++) { G.push(Array.from({length: n}, (_, q) => q === j ? -1 : 0)); h.push(0); }
  const E = enumAS(Q, cc, G, h), R = c.qpSolve({n, Q, c: cc, A, rel, b, maxi: false});
  t(`#${k} ściśle wypukłe: wynik Lemkego = przegląd zbiorów aktywnych z KKT${E ? '' : ' (brak rozwiązań dopuszczalnych)'}`, E ? R.status === 'optimal' && near(R.obj, E.f, 1e-6) && R.x.every((v, j) => Math.abs(v - E.x[j]) < 1e-5 * (1 + Math.abs(E.x[j]))) && R.kkt.stat < 1e-7 && R.kkt.comp < 1e-6 : R.status === 'infeasible');
}
for (let k = 0; k < 60; k++) {                                            // Q = 0 – zadanie liniowe: wynik = minimum po wierzchołkach (x ≤ 20 – ograniczone)
  const n = 2, cc = [ri(-5, 5), ri(-5, 5)], A = [[ri(1, 5), ri(1, 5)], [1, 0], [0, 1]], rel = ['<=', '<=', '<='], b = [ri(5, 30), 20, 20], R = c.qpSolve({n, Q: [[0, 0], [0, 0]], c: cc, A, rel, b, maxi: false});
  const L = [[A[0][0], A[0][1], b[0]], [1, 0, 20], [0, 1, 20], [1, 0, 0], [0, 1, 0]], pts = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const [a1, b1, c1] = L[i], [a2, b2, c2] = L[j], D = a1 * b2 - b1 * a2; if (Math.abs(D) < 1e-12) continue; const x = [(c1 * b2 - b1 * c2) / D, (a1 * c2 - c1 * a2) / D]; if (x.every(v => v >= -1e-9) && A.every((r, q) => r[0] * x[0] + r[1] * x[1] <= b[q] + 1e-9)) pts.push(cc[0] * x[0] + cc[1] * x[1]); }
  t(`#${k} Q = 0 (LP): wartość = minimum po wierzchołkach`, R.status === 'optimal' && near(R.obj, Math.min(...pts), 1e-7));
}
t('niewypukłe (Q z ujemną wartością własną) – status „nonconvex”, bez wyniku', c.qpSolve({n: 2, Q: [[1, 3], [3, 1]], c: [0, 0], A: [[1, 1]], rel: ['<='], b: [4], maxi: false}).status === 'nonconvex');
t('maksymalizacja funkcji wypukłej (niewklęsłej) – „nonconvex”', c.qpSolve({n: 1, Q: [[2]], c: [0], A: [[1]], rel: ['<='], b: [3], maxi: true}).status === 'nonconvex');
t('sprzeczne ograniczenia → „infeasible”', c.qpSolve({n: 1, Q: [[2]], c: [-1], A: [[1], [1]], rel: ['>=', '<='], b: [5, 3], maxi: false}).status === 'infeasible');
t('Q półokreślona, funkcja maleje bez końca → „unbounded”', c.qpSolve({n: 2, Q: [[1, 0], [0, 0]], c: [0, -1], A: [[1, 0]], rel: ['<='], b: [3], maxi: false}).status === 'unbounded');
t('niesymetryczna Q – symetryzacja (Q + Qᵀ)/2', !c.qpSolve({n: 2, Q: [[2, 1], [-1, 2]], c: [-2, -2], A: [[1, 1]], rel: ['<='], b: [5], maxi: false}).prep.sym);
console.log(`Testy programowania kwadratowego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
