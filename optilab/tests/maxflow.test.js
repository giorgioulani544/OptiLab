// Maksymalny przepływ: przykłady podręcznikowe + porównanie z simpleksem (OptiLab LP) i z przeglądem wszystkich przekrojów
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/net/maxflow-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => a === b || Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
const G = (names, edges, directed, src, snk) => ({n: names.length, names, directed, sources: [].concat(src).map(x => names.indexOf(x)), sinks: [].concat(snk).map(x => names.indexOf(x)),
  edges: edges.map(([a, b, cap]) => ({a: names.indexOf(a), b: names.indexOf(b), c: cap}))});
// Cormen i in., rys. 26.1: przepływ maksymalny 23
const clrs = G(['s', 'v1', 'v2', 'v3', 'v4', 't'], [['s', 'v1', 16], ['s', 'v2', 13], ['v1', 'v3', 12], ['v2', 'v1', 4], ['v2', 'v4', 14], ['v3', 'v2', 9], ['v3', 't', 20], ['v4', 'v3', 7], ['v4', 't', 4]], true, 's', 't');
let R = c.maxflowSolve(clrs);
t('Cormen 26.1: przepływ 23', R.F === 23);
t('Cormen 26.1: przekrój minimalny 23 = przepływ', R.cutCap === 23);
t('Edmonds-Karp: ścieżki powiększające mają niemalejącą liczbę łuków', R.iters.every((s, k) => !k || s.path.length >= R.iters[k - 1].path.length));
// przykład z opisu algorytmu Edmondsa-Karpa: przepływ 5
const ek = G(['A', 'B', 'C', 'D', 'E', 'F', 'G'], [['A', 'B', 3], ['A', 'D', 3], ['B', 'C', 4], ['C', 'A', 3], ['C', 'D', 1], ['C', 'E', 2], ['D', 'E', 2], ['D', 'F', 6], ['E', 'B', 1], ['E', 'G', 1], ['F', 'G', 9]], true, 'A', 'G');
R = c.maxflowSolve(ek); t('Edmonds-Karp (przykład podręcznikowy): przepływ 5', R.F === 5 && R.cutCap === 5);
// przepływ wsteczny: klasyczna sieć, w której BFS musi cofnąć przepływ
R = c.maxflowSolve(G(['s', 'a', 'b', 't'], [['s', 'a', 1], ['s', 'b', 1], ['a', 'b', 1], ['a', 't', 1], ['b', 't', 1]], true, 's', 't'));
t('sieć z przepływem 2', R.F === 2);
R = c.maxflowSolve(G(['s', 'a', 'b', 't'], [['s', 'a', 1], ['a', 'b', 1], ['b', 't', 1], ['s', 'b', 1], ['a', 't', 1]], true, 's', 't'));
t('przepływ 2 przy innej kolejności łuków', R.F === 2);
R = c.maxflowSolve(G(['s', 'a', 't'], [['s', 'a', Infinity], ['a', 't', Infinity]], true, 's', 't')); t('nieograniczony przepływ wykryty', R.status === 'unbounded');
R = c.maxflowSolve(G(['s', 'a', 't'], [['s', 'a', 5]], true, 's', 't')); t('brak ścieżki: przepływ 0, przekrój 0', R.F === 0 && R.cutCap === 0);
// niezależna kontrola 1: simpleks (zmienne: przepływ na krawędzi; nieskierowana → zmienna dowolnego znaku)
const viaLP = g => {
  const m = g.edges.length, A = [], rel = [], b = [], net = v => g.edges.map(e => (e.a === v ? 1 : 0) - (e.b === v ? 1 : 0));
  g.edges.forEach((e, k) => { if (!isFinite(e.c)) return; const row = Array(m).fill(0); row[k] = 1; A.push(row); rel.push('<='); b.push(e.c); if (!g.directed) { const r2 = Array(m).fill(0); r2[k] = -1; A.push(r2); rel.push('<='); b.push(e.c); } });
  for (let v = 0; v < g.n; v++) {
    if (g.sources.includes(v)) { A.push(net(v)); rel.push('>='); b.push(0); } else if (g.sinks.includes(v)) { A.push(net(v).map(x => -x)); rel.push('>='); b.push(0); } else { A.push(net(v)); rel.push('='); b.push(0); }
  }
  const obj = Array(m).fill(0); g.sources.forEach(v => net(v).forEach((x, k) => obj[k] += x));
  return c.solveM({n: m, c: obj, A, rel, b, maxi: true, t: g.edges.map(() => g.directed ? 'c' : 'u')});
};
// niezależna kontrola 2: przegląd wszystkich przekrojów (zbiory S ze źródłami, bez ujść)
const minCut = g => { let best = Infinity; for (let mask = 0; mask < 1 << g.n; mask++) {
  const inS = v => !!(mask >> v & 1); if (!g.sources.every(inS) || g.sinks.some(inS)) continue;
  let cap = 0; g.edges.forEach(e => { if (inS(e.a) && !inS(e.b)) cap += e.c; else if (!g.directed && inS(e.b) && !inS(e.a)) cap += e.c; }); best = Math.min(best, cap); } return best; };
let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 120; k++) {
  const n = ri(3, 8), directed = rnd() < .65, edges = [];
  for (let e = 0; e < ri(2, n * 3); e++) { const a = ri(0, n - 1), b = ri(0, n - 1); if (a !== b) edges.push({a, b, c: ri(0, 20)}); }
  const perm = Array.from({length: n}, (_, i) => i).sort(() => rnd() - .5), ns = k % 4 === 0 ? 2 : 1, nt = k % 5 === 0 ? 2 : 1;
  const g = {n, names: perm.map(i => 'V' + i), directed, edges, sources: perm.slice(0, ns), sinks: perm.slice(ns, ns + nt)};
  const R = c.maxflowSolve(g), L = viaLP(g), MC = minCut(g);
  t(`losowe #${k} (${directed ? 'skierowany' : 'nieskierowany'}${ns + nt > 2 ? ', wiele źródeł/ujść' : ''}): przepływ = simpleks = min. przekrój`, R.status === 'ok' && near(R.F, L.z) && near(R.F, MC) && near(R.cutCap + R.cutSup.length * 0, MC));
  const capOk = R.edges.every((e, q) => e.sup || (R.flow[q] <= e.c + 1e-9 && (directed ? R.flow[q] >= -1e-9 : R.flow[q] >= -e.c - 1e-9)));
  const balOk = g.names.every((_, v) => g.sources.includes(v) || g.sinks.includes(v) || near(R.inF[v], R.outF[v]));
  t(`losowe #${k}: przepustowości i bilans w węzłach`, capOk && balOk);
}
console.log(`Testy maksymalnego przepływu: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
