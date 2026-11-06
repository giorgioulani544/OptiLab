// Testy odniesienia – NIEZALEŻNE od kodu OptiLab:
//  • wartości z literatury (Taha, Hillier i Lieberman, Cormen i in.) wpisane ręcznie,
//  • osobny solver LP tylko do testów: przegląd wszystkich wierzchołków (przecięcia n ograniczeń, sprawdzenie dopuszczalności),
//  • pełne przeszukiwanie kraty dla zadań całkowitoliczbowych,
//  • test skali liczb (1e-3 … 1e6) dla metody dużego M i dwufazowej,
//  • ceny dualne z tablicy vs pochodna numeryczna i rozwiązanie zadania dualnego; zakresy wrażliwości sprawdzane przesuwaniem parametru,
//  • limit iteracji i cyklowanie (przykład Beale'a).
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/parametric.js', 'js/ilp-solver.js', 'js/examples.js', 'js/net/transport-solver.js', 'js/net/assignment-solver.js', 'js/net/shortestpath-solver.js', 'js/net/maxflow-solver.js']);
const dualOf = vm.runInContext('dualOf', c), EXAMPLES = vm.runInContext('EXAMPLES', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const rel = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(a) + Math.abs(b));
const LP = (cc, A, r, b, maxi, t = null, extra = {}) => ({n: cc.length, c: cc, A, rel: r, b, maxi, t: t || cc.map(() => 'c'), ...extra});
// ---------- 1. wartości z literatury ----------
let R = c.solveM(LP([3, 5], [[1, 0], [0, 2], [3, 2]], ['<=', '<=', '<='], [4, 12, 18], true));
t('Hillier–Lieberman, Wyndor Glass: Z = 36 w (2, 6)', rel(R.z, 36) && rel(R.x[0], 2) && rel(R.x[1], 6));
R = c.solveM(LP([5, 4], [[6, 4], [1, 2], [-1, 1], [0, 1]], ['<=', '<=', '<=', '<='], [24, 6, 1, 2], true));
t('Taha, Reddy Mikks: Z = 21 w (3; 1,5)', rel(R.z, 21) && rel(R.x[0], 3) && rel(R.x[1], 1.5));
for (const method of ['M', '2F']) {
  R = c.solveM(LP([0.3, 0.9], [[1, 1], [0.21, -0.30], [0.03, -0.01]], ['>=', '<=', '>='], [800, 0, 0], false, null, {method}));
  t(`Taha, mieszanka paszy Ozark Farms (${method}): z = 437,65 w (470,59; 329,41)`, Math.abs(R.z - 437.647) < 0.01 && Math.abs(R.x[0] - 470.588) < 0.01 && Math.abs(R.x[1] - 329.412) < 0.01);
}
R = c.ilpSolve(LP([5, 4], [[1, 1], [10, 6]], ['<=', '<='], [5, 45], true, ['i', 'i']));
t('Taha, Branch & Bound: z = 23 w (3, 2), relaksacja 23,75', R.status === 'optimal' && rel(R.bestZ, 23) && R.best.join() === '3,2' && rel(R.root.r.z, 23.75));
t('Taha, transport: optimum 435', rel(c.transportSolve({supply: [15, 25, 10], demand: [5, 15, 15, 15], cost: [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]]}, 'nw').t, 435));
t('Taha, przydział: koszt 27', rel(c.assignmentSolve({cost: [[15, 10, 9], [9, 15, 10], [10, 12, 8]]}).total, 27));
const nm = ['O', 'A', 'B', 'C', 'D', 'E', 'T'], ix = s => nm.indexOf(s);
t('Hillier–Lieberman, park Seervada: najkrótsza ścieżka 13', c.dijkstra({n: 7, names: nm, directed: false, src: 0, edges: [['O', 'A', 2], ['O', 'B', 5], ['O', 'C', 4], ['A', 'B', 2], ['A', 'D', 7], ['B', 'C', 1], ['B', 'D', 4], ['B', 'E', 3], ['C', 'E', 4], ['D', 'E', 1], ['D', 'T', 5], ['E', 'T', 7]].map(([a, b, w]) => ({a: ix(a), b: ix(b), w}))}).d[6] === 13);
t('Cormen i in., rys. 26.1: maksymalny przepływ 23', c.maxflowSolve({n: 6, names: ['s', 'v1', 'v2', 'v3', 'v4', 't'], directed: true, sources: [0], sinks: [5], edges: [[0, 1, 16], [0, 2, 13], [1, 3, 12], [2, 1, 4], [2, 4, 14], [3, 2, 9], [3, 5, 20], [4, 3, 7], [4, 5, 4]].map(([a, b, cc]) => ({a, b, c: cc}))}).F === 23);
// ---------- 2. limit iteracji i cyklowanie ----------
const beale = LP([-0.75, 20, -0.5, 6], [[0.25, -8, -1, 9], [0.5, -12, -0.5, 3], [0, 0, 1, 0]], ['<=', '<=', '<='], [0, 0, 1], false);
for (const method of ['M', '2F']) {
  const rec = []; R = c.solveM({...beale, method}, [], rec);
  t(`Beale (cyklowanie, ${method}): reguła Blanda włączona, optimum −1,25`, R.status === 'optimal' && rel(R.z, -1.25) && rec.some(s => /regułę Blanda/.test(s.text)));
}
t('Wyndor bez cyklowania: kroki bez reguły Blanda', (() => { const rec = []; c.solveM(LP([3, 5], [[1, 0], [0, 2], [3, 2]], ['<=', '<=', '<='], [4, 12, 18], true), [], rec); return !rec.some(s => /Blanda/.test(s.text)) && rec.length === 4; })());
for (const method of ['M', '2F']) {
  R = c.solveM(LP([2, 3], [[1, 1], [1, 2]], ['>=', '>='], [4, 6], false, null, {method, maxIt: 1}));
  t(`limit iteracji (${method}): status „limit", nie „optimal"`, R.status === 'limit');
}
t('limit w analizie parametrycznej → błąd „limit"', c.parametric(LP([3, 5], [[1, 0], [0, 2], [3, 2]], ['<=', '<=', '<='], [4, 12, 18], true, null, {maxIt: 1}), 'b', [4, 0, 18], [0, 1, 0], 0, 40).error === 'limit');
t('limit w Branch & Bound (korzeń) → status „limit"', c.ilpSolve(LP([5, 4], [[1, 1], [10, 6]], ['<=', '<='], [5, 45], true, ['i', 'i'], {maxIt: 0})).status === 'limit');
R = c.ilpSolve(LP([5, 4], [[1, 1], [10, 6]], ['<=', '<='], [5, 45], true, ['i', 'i']), {limit: 3});
t('limit węzłów B&B: wynik oznaczony jako niepewny, nie „optimal"', R.trunc && ['uncertain', 'unknown'].includes(R.status));
t('relaksacja nieograniczona w B&B → „unbounded_relax"', c.ilpSolve(LP([1, 1], [[1, -1]], ['<='], [2], true, ['i', 'i'])).status === 'unbounded_relax');
t('sprzeczne zadanie całkowitoliczbowe → „infeasible"', c.ilpSolve(LP([1, 1], [[2, 2]], ['='], [3], true, ['i', 'i'])).status === 'infeasible');
// ---------- 3. niezależny solver: przegląd wierzchołków ----------
const solveLin = (A0, b0) => { const n = b0.length, A = A0.map((r, i) => [...r, b0[i]]);
  for (let col = 0; col < n; col++) { let p = col; for (let i = col + 1; i < n; i++) if (Math.abs(A[i][col]) > Math.abs(A[p][col])) p = i;
    if (Math.abs(A[p][col]) < 1e-11) return null; [A[col], A[p]] = [A[p], A[col]];
    for (let i = 0; i < n; i++) if (i !== col) { const f = A[i][col] / A[col][col]; for (let k = col; k <= n; k++) A[i][k] -= f * A[col][k]; } }
  return A.map((r, i) => r[n] / r[i]); };
const vertexLP = (M, B = 1e7) => {
  const n = M.n, rows = M.A.map((a, i) => ({a, rel: M.rel[i], b: M.b[i]}));
  for (let j = 0; j < n; j++) { const e = Array.from({length: n}, (_, k) => +(k === j)); rows.push({a: e, rel: '>=', b: M.t[j] === 'u' ? -B : 0}, {a: e, rel: '<=', b: B}); }
  const feas = x => rows.every(r => { const v = r.a.reduce((s, a, k) => s + a * x[k], 0), tol = 1e-9 * (1 + Math.abs(r.b)) + 1e-12 * r.a.reduce((s, a, k) => s + Math.abs(a * x[k]), 0);   // błąd zaokrągleń, bez „luzu” przy dużych x
    return r.rel === '<=' ? v <= r.b + tol : r.rel === '>=' ? v >= r.b - tol : Math.abs(v - r.b) <= tol; });
  let best = null; const pick = [], mx = x => Math.max(...x.map(Math.abs));
  const go = s => { if (pick.length === n) { const x = solveLin(pick.map(i => rows[i].a), pick.map(i => rows[i].b));
      if (x && feas(x)) { const z = M.c.reduce((s2, cc, k) => s2 + cc * x[k], 0), better = !best || (M.maxi ? z > best.z + 1e-9 * (1 + Math.abs(z)) : z < best.z - 1e-9 * (1 + Math.abs(z)));
        if (better || (rel(z, best.z, 1e-9) && mx(x) < mx(best.x))) best = {z, x}; } return; }
    for (let i = s; i < rows.length; i++) { pick.push(i); go(i + 1); pick.pop(); } };
  go(0);
  if (!best) return {status: 'infeasible'};
  return best.x.some(v => Math.abs(v) >= B * (1 - 1e-6)) ? {status: 'unbounded'} : {status: 'optimal', z: best.z};
};
let seed = 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const randLP = (free = .2) => { const n = ri(2, 3), m = ri(1, 4), rels = ['<=', '>=', '='];
  return LP(Array.from({length: n}, () => ri(-3, 9)), Array.from({length: m}, () => Array.from({length: n}, () => ri(-3, 6))), Array.from({length: m}, () => rels[ri(0, 2)]),
    Array.from({length: m}, () => ri(-5, 15)), rnd() < .5, Array.from({length: n}, () => rnd() < free ? 'u' : 'c')); };
for (let k = 0; k < 200; k++) {
  const M = randLP(), V = vertexLP(M);
  for (const method of ['M', '2F']) { const S = c.solveM({...M, method});
    t(`losowe LP #${k} (${method}) vs przegląd wierzchołków`, S.status === V.status && (V.status !== 'optimal' || rel(S.z, V.z))); }
}
// ---------- 4. skala liczb: wiersze × 10^(−3…6), kolumny × 10^(−3…3) ----------
let scaleFail = {M: 0, '2F': 0}, scaleN = 0;
for (let k = 0; k < 120; k++) {
  const M0 = randLP(0), V = vertexLP(M0); if (V.status !== 'optimal') continue; scaleN++;
  const rs = M0.A.map(() => 10 ** ri(-3, 6)), cs = M0.c.map(() => 10 ** ri(-3, 3));
  const M = {...M0, c: M0.c.map((v, j) => v * cs[j]), A: M0.A.map((r, i) => r.map((v, j) => v * rs[i] * cs[j])), b: M0.b.map((v, i) => v * rs[i])};
  for (const method of ['M', '2F']) { const S = c.solveM({...M, method}); const good = S.status === 'optimal' && rel(S.z, V.z, 1e-6);
    if (!good) scaleFail[method]++; if (method === '2F') t(`skala liczb #${k} (dwufazowa)`, good); }
}
console.log(`  (skala liczb: ${scaleN} zadań; błędy metody dużego M: ${scaleFail.M}, dwufazowej: ${scaleFail['2F']})`);
// ---------- 5. ceny dualne i zakresy wrażliwości ----------
const fromExample = ex => LP(ex.c, ex.rows.map(r => r.slice(0, -2)), ex.rows.map(r => r[r.length - 2]), ex.rows.map(r => r[r.length - 1]), ex.maxi);
const pool = [...EXAMPLES.map(fromExample), ...Array.from({length: 250}, () => randLP(0))];
let dualN = 0, rangeN = 0;
pool.forEach((M, k) => {
  for (const method of ['M', '2F']) {
    const rec = [], r = c.solveM({...M, method}, [], rec); if (r.status !== 'optimal' || r.degenerate) return;
    const fd = M.b.map((_, i) => { const b2 = M.b.slice(); b2[i] += 1e-5; const q = c.solveM({...M, b: b2}); return q.status === 'optimal' ? (q.z - r.z) / 1e-5 : NaN; });
    const D = c.solveM(dualOf(M));
    // ściśle: ceny dualne = rozwiązanie zadania dualnego; luźno (pochodna numeryczna jest niedokładna rzędu 1e-4): zgodność do 1e-3
    t(`ceny dualne #${k} (${method}) = rozwiązanie zadania dualnego (i ≈ pochodna numeryczna)`, D.status === 'optimal' && r.y.every((y, i) => rel(y, D.x[i], 1e-6) && (isNaN(fd[i]) || Math.abs(y - fd[i]) <= 1e-3 * (1 + Math.abs(y)))));
    dualN++;
    if (method !== '2F') continue;
    const S = c.lpSensitivity(M, r, rec), zAt = (mm) => c.solveM(mm);
    const fin = rec[rec.length - 1], row0 = fin.T[fin.T.length - 1];   // tylko jednoznaczne optimum: żadna kolumna spoza bazy (także zapasu) nie ma kosztu zredukowanego 0
    if (row0.some((v, q) => q < fin.names.length && !fin.basis.includes(q) && fin.names[q][0] !== 'a' && Math.abs(v) < 1e-7)) return;
    let good = true;
    // prawa strona: w zakresie Z zmienia się liniowo z nachyleniem = cena dualna; tuż za granicą już nie (albo brak rozwiązania)
    S.rows.forEach((q, i) => { const bi = M.b[i];
      [[q.hi, 1], [q.lo, -1]].forEach(([lim, dir]) => { if (!isFinite(lim) || Math.abs(lim - bi) < 1e-6) return;
        const inside = bi + (lim - bi) / 2, out = lim + dir * 0.01 * (1 + Math.abs(lim - bi)), b1 = M.b.slice(), b2 = M.b.slice(); b1[i] = inside; b2[i] = out;
        const z1 = zAt({...M, b: b1}), z2 = zAt({...M, b: b2});
        if (z1.status !== 'optimal' || !rel(z1.z, r.z + q.y * (inside - bi), 1e-7)) good = false;
        if (z2.status === 'optimal' && rel(z2.z, r.z + q.y * (out - bi), 1e-9)) good = false; }); });
    // współczynnik celu: w zakresie ten sam wierzchołek optymalny; tuż za granicą istnieje lepszy (albo zadanie nieograniczone)
    S.vars.forEach((v, j) => { const cj = M.c[j];
      [[v.hi, 1], [v.lo, -1]].forEach(([lim, dir]) => { if (!isFinite(lim) || Math.abs(lim - cj) < 1e-6) return;
        const inside = cj + (lim - cj) / 2, out = lim + dir * 0.01 * (1 + Math.abs(lim - cj)), c1 = M.c.slice(), c2 = M.c.slice(); c1[j] = inside; c2[j] = out;
        const at = cc => cc.reduce((t2, q, jj) => t2 + q * r.x[jj], 0), z1 = zAt({...M, c: c1}), z2 = zAt({...M, c: c2});
        if (z1.status !== 'optimal' || !rel(z1.z, at(c1), 1e-7)) good = false;
        if (z2.status === 'optimal' && !(M.maxi ? z2.z > at(c2) + 1e-9 : z2.z < at(c2) - 1e-9)) good = false; }); });
    t(`zakresy wrażliwości #${k}: w zakresie baza optymalna, tuż za granicą już nie`, good); rangeN++;
  }
});
console.log(`  (ceny dualne sprawdzone na ${dualN} rozwiązaniach, zakresy na ${rangeN} zadaniach)`);
// ---------- 6. Branch & Bound vs pełne przeszukiwanie kraty ----------
for (let k = 0; k < 150; k++) {
  const n = ri(2, 3), K = ri(3, 8), m = ri(1, 3), types = Array.from({length: n}, () => rnd() < .3 ? 'b' : 'i');
  const A = [Array(n).fill(1), ...Array.from({length: m}, () => Array.from({length: n}, () => ri(0, 6)))], b = [K, ...Array.from({length: m}, () => ri(3, 25))];
  const rels = ['<=', ...Array.from({length: m}, () => rnd() < .25 ? '>=' : '<=')], M = LP(Array.from({length: n}, () => ri(-3, 9)), A, rels, b, rnd() < .6, types);
  let best = null; const x = Array(n).fill(0), walk = j => { if (j === n) { if (A.every((r, i) => { const v = r.reduce((s, a, q) => s + a * x[q], 0); return rels[i] === '<=' ? v <= b[i] : v >= b[i]; })) { const z = M.c.reduce((s, cc, q) => s + cc * x[q], 0); if (best === null || (M.maxi ? z > best : z < best)) best = z; } return; }
    for (let v = 0; v <= (types[j] === 'b' ? 1 : K); v++) { x[j] = v; walk(j + 1); } };
  walk(0);
  for (const [rule, search] of [['first', 'dfs'], ['most', 'best']]) { const R = c.ilpSolve(M, {rule, search});
    t(`B&B #${k} (${rule}, ${search}) vs pełne przeszukiwanie`, best === null ? R.status === 'infeasible' : R.status === 'optimal' && rel(R.bestZ, best)); }
}
console.log(`Testy odniesienia: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
