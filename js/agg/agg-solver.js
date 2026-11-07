/* ===== OptiLab – planowanie zagregowane: solver (model LP, bez DOM, testowalny w Node) =====
   Zmienne w okresie t: W pracownicy, H zatrudnienia, F zwolnienia, R produkcja w czasie normalnym, O w nadgodzinach,
   S podwykonawstwo, I zapas na koniec okresu, B zaległości (popyt przesunięty na później).
   Rozwiązywane naszym solverem LP (metoda dwufazowa); wersja z całkowitą liczbą pracowników – metodą podziału i ograniczeń. */
const AG_VARS = ['W', 'H', 'F', 'R', 'O', 'S', 'I', 'B'];
/* P: {D[], k, W0, I0, Iend, wage, cReg, cOT, otMax|null, cSub, subMax|null, cHire, cFire, h, b|null, hireMax|null, fireMax|null} */
function aggModel(P, strategy = 'opt') {
  const T = P.D.length, N = 8 * T, v = (t, name) => 8 * t + AG_VARS.indexOf(name), A = [], rel = [], b = [], tag = [];
  const row = (cells, r, rhs, what) => { const a = Array(N).fill(0); cells.forEach(([j, x]) => { a[j] += x; }); A.push(a); rel.push(r); b.push(rhs); tag.push(what); };
  for (let t = 0; t < T; t++) {
    row([[v(t, 'W'), 1], [v(t, 'H'), -1], [v(t, 'F'), 1], ...(t ? [[v(t - 1, 'W'), -1]] : [])], '=', t ? 0 : P.W0, {kind: 'work', t});
    row([[v(t, 'R'), 1], [v(t, 'W'), -P.k]], '<=', 0, {kind: 'cap', t});
    if (P.otMax !== null) row([[v(t, 'O'), 1], [v(t, 'W'), -P.otMax]], '<=', 0, {kind: 'ot', t});
    if (P.subMax !== null) row([[v(t, 'S'), 1]], '<=', P.subMax, {kind: 'sub', t});
    row([[v(t, 'R'), 1], [v(t, 'O'), 1], [v(t, 'S'), 1], [v(t, 'I'), -1], [v(t, 'B'), 1], ...(t ? [[v(t - 1, 'I'), 1], [v(t - 1, 'B'), -1]] : [])], '=', P.D[t] - (t ? 0 : P.I0), {kind: 'bal', t});
    if (P.b === null || t === T - 1) row([[v(t, 'B'), 1]], '<=', 0, {kind: 'noB', t});
    if (P.hireMax !== null) row([[v(t, 'H'), 1]], '<=', P.hireMax, {kind: 'hmax', t});
    if (P.fireMax !== null) row([[v(t, 'F'), 1]], '<=', P.fireMax, {kind: 'fmax', t});
    if (strategy === 'chase') { row([[v(t, 'O'), 1]], '<=', 0, {kind: 'st', t}); row([[v(t, 'S'), 1]], '<=', 0, {kind: 'st', t}); row([[v(t, 'B'), 1]], '<=', 0, {kind: 'st', t}); if (t < T - 1) row([[v(t, 'I'), 1]], '<=', 0, {kind: 'st', t}); }
    if (strategy === 'level') { row([[v(t, 'O'), 1]], '<=', 0, {kind: 'st', t}); row([[v(t, 'S'), 1]], '<=', 0, {kind: 'st', t}); if (t) row([[v(t, 'W'), 1], [v(t - 1, 'W'), -1]], '=', 0, {kind: 'st', t}); }
  }
  row([[v(T - 1, 'I'), 1]], '>=', P.Iend, {kind: 'end', t: T - 1});
  const cost = {W: P.wage, H: P.cHire, F: P.cFire, R: P.cReg, O: P.cOT, S: P.cSub, I: P.h, B: P.b ?? 0}, c = Array(N).fill(0);
  for (let t = 0; t < T; t++) AG_VARS.forEach(nm => { c[v(t, nm)] = cost[nm]; });
  return {M: {n: N, c, A, rel, b, maxi: false, t: Array(N).fill('c'), method: '2F'}, tag, v, T, cost};
}
function aggSolve(P, strategy = 'opt', opt = {}) {
  const md = aggModel(P, strategy), {M, v, T, cost, tag} = md;
  let r, ilp = null;
  if (opt.intW) { M.t = M.t.map((_, j) => ['W', 'H', 'F'].includes(AG_VARS[j % 8]) ? 'i' : 'c'); ilp = ilpSolve(M, {limit: opt.limit ?? 3000});
    r = ilp.best ? {status: ilp.status === 'optimal' ? 'optimal' : ilp.status, x: ilp.best.x || ilp.best, z: ilp.bestZ} : {status: ilp.status}; }
  else r = solveM(M);
  if (r.status !== 'optimal' && !(opt.intW && r.x)) return {status: r.status, ilp, model: md};
  const x = r.x.map(q => Math.abs(q) < 1e-9 ? 0 : q), plan = Array.from({length: T}, (_, t) => { const o = {t, D: P.D[t]}; AG_VARS.forEach(nm => { o[nm] = x[v(t, nm)]; }); return o; });
  const parts = {}; AG_VARS.forEach(nm => { parts[nm] = plan.reduce((s, p) => s + cost[nm] * p[nm], 0); });
  const duals = !opt.intW && r.y ? tag.map((g, i) => ({...g, y: r.y[i]})).filter(g => g.kind === 'bal') : null;
  return {status: r.status, z: Object.values(parts).reduce((s, q) => s + q, 0), plan, parts, duals, degenerate: !!r.degenerate, ilp, model: md};
}
