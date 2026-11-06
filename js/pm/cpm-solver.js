/* ===== OptiLab – PERT/CPM: solver (czysta logika, bez DOM, testowalny w Node) =====
   Sieć czynności na węzłach: przejście w przód i wstecz (ES, EF, LS, LF), rezerwy całkowita, swobodna i niezależna,
   wszystkie ścieżki krytyczne, PERT (te, wariancja, P(T ≤ t), termin dla zadanego prawdopodobieństwa),
   skracanie czasu projektu (LP naszym solverem + krzywa czas–koszt przez analizę parametryczną), symulacja Monte Carlo (Beta-PERT). */
const CPM_EPS = 1e-9;
/* Walidacja i odczyt poprzedników: names – nazwy czynności, predTxt – teksty „A, B". Zwraca {preds, errors:[{i, field, msg}], cycle} */
function cpmCheck(names, predTxt) {
  const errors = [], idx = new Map();
  names.forEach((nm, i) => { const k = String(nm).trim(); if (!k) errors.push({i, field: 'name', msg: 'czynność musi mieć nazwę.'});
    else if (idx.has(k)) errors.push({i, field: 'name', msg: `nazwa „${k}" powtarza się (wiersze ${idx.get(k) + 1} i ${i + 1}).`}); else idx.set(k, i); });
  const preds = predTxt.map((txt, i) => {
    const list = String(txt || '').split(/[,;\s]+/).map(s => s.trim()).filter(s => s && s !== '-' && s !== '—'), out = [];
    list.forEach(p => { if (!idx.has(p)) errors.push({i, field: 'preds', msg: `nieznany poprzednik „${p}".`}); else if (idx.get(p) === i) errors.push({i, field: 'preds', msg: 'czynność nie może poprzedzać samej siebie.'}); else if (!out.includes(idx.get(p))) out.push(idx.get(p)); });
    return out;
  });
  let cycle = null;
  if (!errors.length) {                                                // cykl w poprzednikach (DFS z kolorowaniem)
    const col = Array(names.length).fill(0), stack = [];
    const dfs = v => { col[v] = 1; stack.push(v); for (const u of preds[v]) { if (col[u] === 1) { cycle = stack.slice(stack.indexOf(u)).concat(u).reverse(); return true; } if (col[u] === 0 && dfs(u)) return true; } stack.pop(); col[v] = 2; return false; };
    for (let v = 0; v < names.length && !cycle; v++) if (col[v] === 0) dfs(v);
  }
  return {preds, errors, cycle};
}
/* P: {names, preds:[[i]], d:[czas] albo pert:[{a,m,b}]} */
function cpmSolve(P) {
  const n = P.names.length, pert = !!P.pert, d = pert ? P.pert.map(q => (q.a + 4 * q.m + q.b) / 6) : P.d.slice();
  const vr = pert ? P.pert.map(q => ((q.b - q.a) / 6) ** 2) : Array(n).fill(0);
  const succ = Array.from({length: n}, () => []); P.preds.forEach((ps, j) => ps.forEach(i => succ[i].push(j)));
  const indeg = P.preds.map(p => p.length), order = [], q = []; indeg.forEach((g, i) => { if (!g) q.push(i); });
  while (q.length) { q.sort((a, b) => a - b); const v = q.shift(); order.push(v); succ[v].forEach(u => { if (--indeg[u] === 0) q.push(u); }); }
  if (order.length < n) return {status: 'cycle'};
  const ES = Array(n).fill(0), EF = Array(n).fill(0), fwd = [];
  order.forEach(j => { ES[j] = P.preds[j].length ? Math.max(...P.preds[j].map(i => EF[i])) : 0; EF[j] = ES[j] + d[j]; fwd.push({j, from: P.preds[j].map(i => [i, EF[i]])}); });
  const T = n ? Math.max(...EF) : 0, LS = Array(n).fill(0), LF = Array(n).fill(0), bwd = [];
  [...order].reverse().forEach(i => { LF[i] = succ[i].length ? Math.min(...succ[i].map(j => LS[j])) : T; LS[i] = LF[i] - d[i]; bwd.push({i, to: succ[i].map(j => [j, LS[j]])}); });
  const TF = ES.map((e, i) => LS[i] - e);
  const FF = EF.map((f, i) => (succ[i].length ? Math.min(...succ[i].map(j => ES[j])) : T) - f);
  const IF = d.map((di, i) => Math.max(0, (succ[i].length ? Math.min(...succ[i].map(j => ES[j])) : T) - (P.preds[i].length ? Math.max(...P.preds[i].map(k => LF[k])) : 0) - di));
  const crit = TF.map(v => Math.abs(v) <= CPM_EPS * (1 + Math.abs(T)));
  const paths = [], LIMIT = 200;                                       // wszystkie ścieżki krytyczne (ścieżki czynności krytycznych bez przerw)
  const walk = (i, acc) => { if (paths.length >= LIMIT) return; acc.push(i);
    const nx = succ[i].filter(j => crit[j] && Math.abs(EF[i] - ES[j]) <= CPM_EPS * (1 + T));
    if (!nx.length) { if (Math.abs(EF[i] - T) <= CPM_EPS * (1 + T)) paths.push(acc.slice()); } else nx.forEach(j => walk(j, acc)); acc.pop(); };
  order.filter(i => crit[i] && Math.abs(ES[i]) <= CPM_EPS * (1 + T)).forEach(i => walk(i, []));
  const pv = paths.map(p => p.reduce((s, i) => s + vr[i], 0)), worst = pv.length ? pv.indexOf(Math.max(...pv)) : -1;
  return {status: 'ok', n, d, vr, order, succ, ES, EF, LS, LF, TF, FF, IF, crit, T, paths, truncated: paths.length >= LIMIT, fwd, bwd,
    pathVar: pv, sigma: worst >= 0 ? Math.sqrt(pv[worst]) : 0, worst};
}
function cpmProb(R, t) { return R.sigma > 0 ? ST.normCdf((t - R.T) / R.sigma) : (t >= R.T - CPM_EPS ? 1 : 0); }   // P(T ≤ t), rozkład normalny
function cpmTimeFor(R, p) { return R.T + R.sigma * ST.normInv(p); }                                             // termin dla prawdopodobieństwa p
/* Skracanie: P + cr: [{dc, cn, cc}] (czas skrócony, koszt normalny, koszt skrócony). Zmienne LP: s_1..s_n (start), y_1..y_n (skrócenie), T. */
function cpmCrashModel(P, R, cr, target) {
  const n = R.n, N = 2 * n + 1, rows = [], rel = [], b = [], slope = cr.map((q, i) => R.d[i] - q.dc > CPM_EPS ? (q.cc - q.cn) / (R.d[i] - q.dc) : 0);
  const row = () => Array(N).fill(0);
  P.preds.forEach((ps, j) => ps.forEach(i => { const r = row(); r[j] = 1; r[i] = -1; r[n + i] = 1; rows.push(r); rel.push('>='); b.push(R.d[i]); }));   // s_j ≥ s_i + d_i − y_i
  R.succ.forEach((sc, i) => { if (!sc.length) { const r = row(); r[2 * n] = 1; r[i] = -1; r[n + i] = 1; rows.push(r); rel.push('>='); b.push(R.d[i]); } });   // T ≥ s_i + d_i − y_i
  cr.forEach((q, i) => { const r = row(); r[n + i] = 1; rows.push(r); rel.push('<='); b.push(Math.max(0, R.d[i] - q.dc)); });                        // y_i ≤ d_i − dc_i
  const r = row(); r[2 * n] = 1; rows.push(r); rel.push('<='); b.push(target);                                                                       // T ≤ termin
  return {M: {n: N, c: [...Array(n).fill(0), ...slope, 0], A: rows, rel, b, maxi: false, t: Array(N).fill('c'), method: '2F'}, slope, targetRow: rows.length - 1};
}
function cpmCrash(P, R, cr, target, overhead = 0) {
  const n = R.n, base = cr.reduce((s, q) => s + q.cn, 0);
  const Rmin = cpmSolve({...P, pert: null, d: cr.map(q => Math.min(q.dc, R.d[cr.indexOf(q)]))}), Tmin = Rmin.T;
  const {M, slope, targetRow} = cpmCrashModel(P, R, cr, target);
  const sol = target < Tmin - CPM_EPS ? {status: 'infeasible'} : solveM(M);
  const plan = sol.status === 'optimal' ? sol.x.slice(n, 2 * n).map(v => Math.abs(v) < 1e-9 ? 0 : v) : null;
  // krzywa czas–koszt: dokładne punkty załamania przez analizę parametryczną prawej strony „T ≤ termin"
  let curve = null;
  if (R.T - Tmin > CPM_EPS) {
    const M2 = cpmCrashModel(P, R, cr, R.T).M, bs = M2.b.slice(); bs[targetRow] = 0; const dir = bs.map((_, i) => +(i === targetRow));   // model z terminem dopuszczalnym; parametr θ = termin
    const par = parametric(M2, 'b', bs, dir, Tmin, R.T);
    if (!par.error) { const pts = []; par.segments.filter(g => g.status === 'optimal').forEach(g => { [g.start, g.end].forEach(x => { if (!pts.some(p => Math.abs(p[0] - x) < 1e-9)) pts.push([x, base + g.alpha + g.beta * x]); }); });
      curve = pts.sort((a, b) => a[0] - b[0]); }
  }
  let best = null;                                                        // koszt całkowity = bezpośredni + pośredni·T, minimum w punkcie załamania
  if (curve && overhead > 0) curve.forEach(([x, y]) => { const tot = y + overhead * x; if (!best || tot < best.tot - 1e-9) best = {T: x, direct: y, tot}; });
  return {status: sol.status, plan, cost: sol.status === 'optimal' ? base + sol.z : null, base, slope, Tmin, curve, best};
}
/* Monte Carlo: czasy z rozkładu Beta-PERT(a, m, b); wynik: czasy projektu i indeks krytyczności czynności */
function cpmMonteCarlo(P, R, N = 10000, seed = 1) {
  const n = R.n, g = ST.rng(seed), times = new Float64Array(N), critCount = Array(n).fill(0), dd = Array(n), ES = Array(n), EF = Array(n), LF = Array(n);
  for (let k = 0; k < N; k++) {
    for (let i = 0; i < n; i++) { const q = P.pert[i]; dd[i] = g.betaPert(q.a, q.m, q.b); }
    let T = 0; R.order.forEach(j => { ES[j] = 0; P.preds[j].forEach(i => { if (EF[i] > ES[j]) ES[j] = EF[i]; }); EF[j] = ES[j] + dd[j]; if (EF[j] > T) T = EF[j]; });
    for (let r = n - 1; r >= 0; r--) { const i = R.order[r]; let lf = T; R.succ[i].forEach(j => { const ls = LF[j] - dd[j]; if (ls < lf) lf = ls; }); LF[i] = lf; if (LF[i] - EF[i] <= 1e-9 * (1 + T)) critCount[i]++; }
    times[k] = T;
  }
  const arr = Array.from(times).sort((a, b) => a - b), mean = arr.reduce((s, v) => s + v, 0) / N, sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (N - 1));
  const pct = p => arr[Math.min(N - 1, Math.max(0, Math.ceil(p * N) - 1))];
  return {N, seed, times: arr, mean, sd, pct, prob: t => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) lo = m + 1; else hi = m; } return lo / N; }, crit: critCount.map(c => c / N)};
}
