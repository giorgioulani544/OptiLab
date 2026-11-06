/* ===== OptiLab – maksymalny przepływ (czysta matematyka, bez DOM, testowalna w Node) =====
   Algorytm Forda-Fulkersona w wersji Edmondsa-Karpa: ścieżka powiększająca o najmniejszej liczbie łuków (BFS) w sieci rezydualnej.
   • graf skierowany lub nieskierowany (krawędź nieskierowana = para łuków o tej samej przepustowości),
   • przepustowość nieograniczona (Infinity) z wykrywaniem przepływu nieograniczonego,
   • wiele źródeł i ujść przez superźródło S* i superujście T*,
   • wynik: przepływ na każdej krawędzi, bilans w węzłach, minimalny przekrój (twierdzenie Forda-Fulkersona). */
const MF_EPS = 1e-9;
function maxflowSolve(G) {
  const sources = G.sources, sinks = G.sinks, multi = sources.length > 1 || sinks.length > 1;
  const names = G.names.slice(); let N = G.n, s, t;
  const edges = G.edges.map(e => ({a: e.a, b: e.b, c: e.c, sup: false}));
  if (multi) {
    s = N; t = N + 1; names.push('S*', 'T*'); N += 2;
    sources.forEach(v => edges.push({a: s, b: v, c: Infinity, sup: true})); sinks.forEach(v => edges.push({a: v, b: t, c: Infinity, sup: true}));
  } else { s = sources[0]; t = sinks[0]; }
  const arcs = [], adj = Array.from({length: N}, () => []);                 // łuki w parach: arcs[2k] = a→b, arcs[2k+1] = b→a (odwrotny)
  edges.forEach((e, k) => {
    const und = !G.directed && !e.sup;
    arcs.push({u: e.a, v: e.b, cap: e.c, flow: 0, edge: k}, {u: e.b, v: e.a, cap: und ? e.c : 0, flow: 0, edge: k});
  });
  arcs.forEach((x, i) => adj[x.u].push(i));
  const res = x => x.cap - x.flow, netFlow = () => edges.map((_, k) => arcs[2 * k].flow);
  const residual = () => {                                                    // sieć rezydualna: suma przepustowości rezydualnych dla pary (u, v)
    const m = new Map(); arcs.forEach(x => { const r = res(x); if (r > MF_EPS) { const key = x.u + '>' + x.v; m.set(key, (m.get(key) || 0) + r); } });
    return [...m].map(([key, r]) => { const [u, v] = key.split('>').map(Number); return {u, v, r}; });
  };
  const bfs = () => {
    const prev = Array(N).fill(-1), seen = Array(N).fill(false), q = [s]; seen[s] = true;
    while (q.length) { const u = q.shift(); for (const i of adj[u]) { const x = arcs[i]; if (!seen[x.v] && res(x) > MF_EPS) { seen[x.v] = true; prev[x.v] = i; q.push(x.v); } } }
    return {prev, seen};
  };
  const iters = []; let F = 0, status = 'ok';
  for (let it = 0; it < 10000; it++) {
    const before = netFlow(), resNet = residual(), {prev, seen} = bfs();
    if (!seen[t]) break;
    const path = []; for (let v = t; v !== s; v = arcs[prev[v]].u) path.unshift(prev[v]);
    const delta = Math.min(...path.map(i => res(arcs[i])));
    if (delta === Infinity) { status = 'unbounded'; iters.push({path: path.map(i => ({u: arcs[i].u, v: arcs[i].v, r: res(arcs[i]), edge: arcs[i].edge, back: false})), delta, before, after: before, total: Infinity, residual: resNet}); F = Infinity; break; }
    const steps = path.map(i => {
      const x = arcs[i], k = x.edge, fwd = i % 2 === 0, f0 = before[k];             // fwd: łuk zgodny z kierunkiem krawędzi a→b
      const back = G.directed || edges[k].sup ? !fwd : (fwd ? f0 < -MF_EPS : f0 > MF_EPS);   // przepływ wsteczny = cofamy istniejący przepływ
      return {u: x.u, v: x.v, r: res(x), edge: k, back};
    });
    path.forEach(i => { arcs[i].flow += delta; arcs[i ^ 1].flow -= delta; });
    F += delta;
    iters.push({path: steps, delta, before, after: netFlow(), total: F, residual: resNet});
  }
  const fin = bfs(), S = fin.seen, flow = netFlow();
  const cut = status === 'ok' ? edges.map((e, k) => ({...e, k})).filter(e => !e.sup && ((S[e.a] && !S[e.b]) || (!G.directed && S[e.b] && !S[e.a])))
    .map(e => ({k: e.k, from: S[e.a] ? e.a : e.b, to: S[e.a] ? e.b : e.a, c: e.c})) : [];
  const cutSup = status === 'ok' ? edges.map((e, k) => ({...e, k})).filter(e => e.sup && S[e.a] && !S[e.b]) : [];
  const inF = Array(N).fill(0), outF = Array(N).fill(0);
  edges.forEach((e, k) => { const f = flow[k]; if (f > MF_EPS) { outF[e.a] += f; inF[e.b] += f; } else if (f < -MF_EPS) { outF[e.b] -= f; inF[e.a] -= f; } });
  return {status, F, names, N, s, t, multi, edges, flow, iters, S, cut, cutCap: cut.reduce((a, e) => a + e.c, 0), cutSup, inF, outF, finalResidual: residual()};
}
