/* ===== OptiLab – programowanie kwadratowe: solver (bez DOM, testowalny w Node; korzysta z LA, solveM) =====
   min ½xᵀQx + cᵀx przy A x (≤, ≥, =) b, x ≥ 0 (maksymalizację zamieniamy na minimalizację −f). Wypukłość: wartości własne Q (metoda Jacobiego).
   Rozwiązanie: algorytm Lemkego dla zadania komplementarności (warunki KKT): w = q + M·z, w, z ≥ 0, wᵀz = 0, gdzie
   z = (x, y), w = (u, v), M = [[Q, Aᵀ], [−A, 0]], q = (c, b). Leksykograficzna reguła ilorazów chroni przed zapętleniem. */
function qpPrep(P) {
  const n = P.n, Qs = P.Q.map((r, i) => r.map((v, j) => (v + P.Q[j][i]) / 2)), sym = P.Q.every((r, i) => r.every((v, j) => Math.abs(v - P.Q[j][i]) < 1e-12));
  const sg = P.maxi ? -1 : 1, Q = Qs.map(r => r.map(v => sg * v)), c = P.c.map(v => sg * v), A = [], b = [], map = [];
  P.A.forEach((row, i) => { if (P.rel[i] !== '>=') { A.push(row.slice()); b.push(P.b[i]); map.push({i, s: 1}); } if (P.rel[i] !== '<=') { A.push(row.map(v => -v)); b.push(-P.b[i]); map.push({i, s: -1}); } });
  const eig = n ? LA.eigSym(Q) : [], tol = 1e-9 * Math.max(1, ...Q.flat().map(Math.abs));
  return {n, Q, c, A, b, map, sym, eig, convex: !eig.length || eig[0] >= -tol, strict: eig.length && eig[0] > tol, sg};
}
function qpLemke(Q, c, A, b, maxIt = 500) {
  const n = c.length, m = b.length, N = n + m, M = Array.from({length: N}, (_, i) => Array.from({length: N}, (_, j) => i < n ? (j < n ? Q[i][j] : A[j - n][i]) : (j < n ? -A[i - n][j] : 0))), q = [...c, ...b];
  const cols = 2 * N + 1, T = Array.from({length: N}, (_, i) => [...Array.from({length: N}, (_, j) => +(i === j)), ...M[i].map(v => -v), -1, q[i]]), basis = Array.from({length: N}, (_, i) => i), steps = [];
  const nameOf = j => j < N ? (j < n ? `u${j + 1}` : `v${j - n + 1}`) : j < 2 * N ? (j - N < n ? `x${j - N + 1}` : `y${j - N - n + 1}`) : 'z₀', Z0 = 2 * N, rhs = cols;
  const snap = (enter, leave, row) => steps.push({enter: enter === null ? null : nameOf(enter), leave: leave === null ? null : nameOf(leave), row, basis: basis.map(nameOf), vals: T.map(r => r[rhs])});
  if (q.every(v => v >= -1e-12)) { snap(null, null, -1); return {status: 'optimal', z: Array(N).fill(0), steps, N, n}; }
  const pivot = (r, col) => { const p = T[r][col]; T[r] = T[r].map(v => v / p); for (let i = 0; i < N; i++) if (i !== r && T[i][col] !== 0) { const f = T[i][col]; T[i] = T[i].map((v, j) => v - f * T[r][j]); } };
  let r = q.reduce((bi, v, i) => v < q[bi] ? i : bi, 0); let leave = basis[r]; pivot(r, Z0); basis[r] = Z0; snap(Z0, leave, r);
  let enter = leave < N ? leave + N : leave - N;
  for (let it = 0; it < maxIt; it++) {
    const cand = []; for (let i = 0; i < N; i++) if (T[i][enter] > 1e-11) cand.push(i);
    if (!cand.length) { snap(enter, null, -1); return {status: 'ray', steps, N, n}; }
    const ratio = i => T[i][rhs] / T[i][enter], mn = Math.min(...cand.map(ratio)); let best = cand.filter(i => ratio(i) <= mn + 1e-11 * (1 + Math.abs(mn)));
    if (best.some(i => basis[i] === Z0)) best = best.filter(i => basis[i] === Z0);
    for (let k = 0; best.length > 1 && k < N; k++) { const v = i => T[i][k] / T[i][enter], m2 = Math.min(...best.map(v)); best = best.filter(i => v(i) <= m2 + 1e-12); }   // leksykograficznie
    r = best[0]; leave = basis[r]; pivot(r, enter); basis[r] = enter; snap(enter, leave, r);
    if (leave === Z0) { const z = Array(N).fill(0); basis.forEach((j, i) => { if (j >= N && j < 2 * N) z[j - N] = Math.max(0, T[i][rhs]); }); return {status: 'optimal', z, steps, N, n}; }
    enter = leave < N ? leave + N : leave - N;
  }
  return {status: 'limit', steps, N, n};
}
function qpSolve(P) {
  const S = qpPrep(P), out = {prep: S, n: P.n};
  if (!S.convex) return {...out, status: 'nonconvex'};
  const L = qpLemke(S.Q, S.c, S.A, S.b); out.steps = L.steps;
  if (L.status === 'limit') return {...out, status: 'limit'};
  if (L.status === 'ray') {                                                   // zadanie sprzeczne albo nieograniczone – rozstrzyga LP fazy I
    const F = S.A.length ? solveM({n: P.n, c: Array(P.n).fill(0), A: P.A, rel: P.rel, b: P.b, maxi: false, t: Array(P.n).fill('c'), method: '2F'}) : {status: 'optimal'};
    return {...out, status: F.status === 'infeasible' ? 'infeasible' : 'unbounded'};
  }
  const x = L.z.slice(0, P.n), y = L.z.slice(P.n), f = x.reduce((s, xi, i) => s + S.c[i] * xi + 0.5 * xi * x.reduce((t, xj, j) => t + S.Q[i][j] * xj, 0), 0);
  const grad = x.map((_, i) => S.Q[i].reduce((s, q, j) => s + q * x[j], 0) + S.c[i]), u = grad.map((g, i) => g + S.A.reduce((s, row, k) => s + row[i] * y[k], 0)), v = S.b.map((bk, k) => bk - S.A[k].reduce((s, a, j) => s + a * x[j], 0));
  const lam = P.A.map((_, i) => S.map.reduce((s, mp, k) => mp.i === i ? s + mp.s * y[k] : s, 0));
  const kkt = {stat: Math.max(0, ...u.map((ui, i) => x[i] > 1e-9 ? Math.abs(ui) : Math.max(0, -ui))), primal: Math.max(0, ...v.map(vk => -vk), ...x.map(xi => -xi)), dual: Math.max(0, ...y.map(yk => -yk)), comp: Math.max(0, ...x.map((xi, i) => Math.abs(xi * u[i])), ...y.map((yk, k) => Math.abs(yk * v[k])))};
  return {...out, status: 'optimal', x, obj: S.sg * f, lam, u, slack: P.A.map((row, i) => P.b[i] - row.reduce((s, a, j) => s + a * x[j], 0)), kkt, unique: !!S.strict};
}
