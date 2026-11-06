// Najkrótsza ścieżka: przykłady podręcznikowe + porównanie z algorytmem Floyda-Warshalla na losowych grafach
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/net/shortestpath-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => a === b || Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
const G = (names, edges, directed, src = 0) => ({n: names.length, names, directed, src, edges: edges.map(([a, b, w]) => ({a: names.indexOf(a), b: names.indexOf(b), w}))});
// Hillier i Lieberman, park Seervada: O → T = 13, dwie najkrótsze ścieżki
const park = G(['O', 'A', 'B', 'C', 'D', 'E', 'T'], [['O', 'A', 2], ['O', 'B', 5], ['O', 'C', 4], ['A', 'B', 2], ['A', 'D', 7], ['B', 'C', 1], ['B', 'D', 4], ['B', 'E', 3], ['C', 'E', 4], ['D', 'E', 1], ['D', 'T', 5], ['E', 'T', 7]], false);
let R = c.dijkstra(park);
t('Seervada: d(T) = 13', R.d[6] === 13);
t('Seervada: dwie najkrótsze ścieżki O → T', R.paths[6].count === 2 && R.paths[6].paths.length === 2);
// Cormen i in., „Wprowadzenie do algorytmów": Dijkstra (t 8, x 9, y 5, z 7), Bellman-Ford (t 2, x 4, y 7, z −2)
const dj = G(['s', 't', 'x', 'y', 'z'], [['s', 't', 10], ['s', 'y', 5], ['t', 'x', 1], ['t', 'y', 2], ['y', 't', 3], ['y', 'x', 9], ['y', 'z', 2], ['x', 'z', 4], ['z', 'x', 6], ['z', 's', 7]], true);
t('CLRS Dijkstra', c.dijkstra(dj).d.join() === '0,8,9,5,7');
t('Dijkstra: każdy krok utrwala jeden węzeł', c.dijkstra(dj).steps.length === 5);
const bf = G(['s', 't', 'x', 'y', 'z'], [['s', 't', 6], ['s', 'y', 7], ['t', 'x', 5], ['t', 'y', 8], ['t', 'z', -4], ['x', 't', -2], ['y', 'x', -3], ['y', 'z', 9], ['z', 's', 2], ['z', 'x', 7]], true);
R = c.bellmanFord(bf); t('CLRS Bellman-Ford', R.status === 'ok' && R.d.join() === '0,2,4,7,-2');
const neg = G(['A', 'B', 'C'], [['A', 'B', 1], ['B', 'C', -2], ['C', 'B', 1]], true);
R = c.bellmanFord(neg); t('ujemny cykl wykryty (B → C → B, suma −1)', R.status === 'negcycle' && R.cycleSum === -1 && R.cycle[0] === R.cycle[R.cycle.length - 1]);
R = c.bellmanFord(G(['A', 'B'], [['A', 'B', -1]], false)); t('graf nieskierowany z ujemną krawędzią = ujemny cykl', R.status === 'negcycle');
R = c.dijkstra(G(['A', 'B', 'C'], [['A', 'B', 1]], true)); t('węzeł nieosiągalny', R.unreachable.join() === '2' && R.d[2] === Infinity);
// Floyd-Warshall jako niezależna kontrola
const fw = g => { const n = g.n, D = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 0 : Infinity));
  g.edges.forEach(e => { D[e.a][e.b] = Math.min(D[e.a][e.b], e.w); if (!g.directed) D[e.b][e.a] = Math.min(D[e.b][e.a], e.w); });
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j]; return D; };
let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) {
  const n = ri(2, 9), directed = rnd() < .6, negOk = directed && k % 3 === 0, edges = [];
  for (let e = 0; e < ri(1, n * 3); e++) { const a = ri(0, n - 1), b = ri(0, n - 1); if (a !== b) edges.push({a, b, w: negOk ? ri(-4, 12) : ri(0, 15)}); }
  if (!edges.length) edges.push({a: 0, b: n - 1, w: 3});
  const g = {n, names: Array.from({length: n}, (_, i) => 'V' + i), directed, src: ri(0, n - 1), edges}, D = fw(g);
  const negCycle = D.some((r, i) => r[i] < 0 && isFinite(D[g.src][i]));
  const B = c.bellmanFord(g);
  t(`losowe #${k}: Bellman-Ford`, negCycle ? B.status === 'negcycle' : B.status === 'ok' && B.d.every((v, i) => near(v, D[g.src][i])));
  if (!negOk) { const R = c.dijkstra(g); t(`losowe #${k}: Dijkstra`, R.d.every((v, i) => near(v, D[g.src][i])) && R.paths.every((p, v) => !isFinite(R.d[v]) || p.paths.every(path => near(path.reduce((s, u, q) => q ? s + Math.min(...g.edges.filter(e => (e.a === path[q - 1] && e.b === u) || (!directed && e.b === path[q - 1] && e.a === u)).map(e => e.w)) : 0, 0), R.d[v])))); }
}
console.log(`Testy najkrótszej ścieżki: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
