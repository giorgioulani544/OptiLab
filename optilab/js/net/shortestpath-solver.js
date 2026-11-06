/* ===== OptiLab – najkrótsza ścieżka (czysta matematyka, bez DOM, testowalna w Node) =====
   • algorytm Dijkstry z tabelą etykiet (wagi nieujemne), • algorytm Bellmana-Forda (wagi ujemne, wykrywanie ujemnego cyklu),
   • graf skierowany lub nieskierowany, ścieżki do wszystkich węzłów, liczba i lista alternatywnych najkrótszych ścieżek. */
const SP_EPS = 1e-9;
function spArcs(G) {                                            // łuki skierowane (krawędź nieskierowana = dwa łuki)
  const arcs = [];
  G.edges.forEach((e, k) => { arcs.push({a: e.a, b: e.b, w: e.w, k}); if (!G.directed) arcs.push({a: e.b, b: e.a, w: e.w, k}); });
  return arcs;
}
function spPaths(G, d, maxList = 3) {                           // DAG najkrótszych ścieżek → liczba i lista ścieżek do każdego węzła
  const arcs = spArcs(G), preds = Array.from({length: G.n}, () => []);
  arcs.forEach(r => { if (isFinite(d[r.a]) && isFinite(d[r.b]) && r.b !== G.src && Math.abs(d[r.a] + r.w - d[r.b]) <= SP_EPS * (1 + Math.abs(d[r.b])) && !preds[r.b].includes(r.a)) preds[r.b].push(r.a); });
  const memo = new Map(), count = (v, stack = new Set()) => {
    if (v === G.src) return 1; if (memo.has(v)) return memo.get(v); if (stack.has(v)) return 0;
    stack.add(v); let c = 0; for (const p of preds[v]) { c += count(p, stack); if (c > 1e6) break; } stack.delete(v); memo.set(v, c); return c;
  };
  const list = v => {                                            // do maxList ścieżek (proste, bez powtórzeń węzłów)
    const out = [], walk = (u, acc) => { if (out.length >= maxList) return; if (u === G.src) { out.push([G.src, ...acc]); return; } for (const p of preds[u]) if (!acc.includes(p)) walk(p, [u, ...acc]); };
    if (isFinite(d[v])) walk(v, []); return out;
  };
  return Array.from({length: G.n}, (_, v) => ({count: isFinite(d[v]) ? count(v) : 0, paths: list(v)}));
}
function dijkstra(G) {
  const n = G.n, arcs = spArcs(G), d = Array(n).fill(Infinity), pred = Array(n).fill(-1), perm = Array(n).fill(false), steps = [];
  const nm = k => String(G.names[k]).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
  d[G.src] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1; for (let v = 0; v < n; v++) if (!perm[v] && isFinite(d[v]) && (u < 0 || d[v] < d[u] - SP_EPS)) u = v;
    if (u < 0) break;
    perm[u] = true; const upd = [];
    arcs.filter(r => r.a === u && !perm[r.b]).forEach(r => {
      const old = d[r.b], nd = d[u] + r.w;
      if (nd < old - SP_EPS) { d[r.b] = nd; pred[r.b] = u; upd.push({v: r.b, old, nd, better: true}); }
      else upd.push({v: r.b, old, nd, better: false, tie: Math.abs(nd - old) <= SP_EPS});
    });
    const txt = (k === 0 ? `Start: d(${nm(u)}) = 0, pozostałe etykiety = ∞. Węzeł ${nm(u)} dostaje etykietę stałą.` : `Najmniejszą etykietę tymczasową ma węzeł ${nm(u)}: d = ${fmt(d[u])} (poprzednik ${nm(pred[u])}) – staje się ona stała.`) +
      (upd.length ? ' Sprawdzamy sąsiadów: ' + upd.map(q => `${nm(q.v)}: min(${isFinite(q.old) ? fmt(q.old) : '∞'}; ${fmt(d[u])} + ${fmt(q.nd - d[u])}) = ${fmt(Math.min(q.old, q.nd))}${q.better ? ' – poprawa' : q.tie ? ' – równa (ścieżka alternatywna)' : ' – bez zmian'}`).join('; ') + '.' : ' Nie ma sąsiadów z etykietą tymczasową.');
    steps.push({u, d: d.slice(), pred: pred.slice(), perm: perm.slice(), upd, text: txt});
  }
  const unreachable = d.map((v, k) => isFinite(v) ? null : k).filter(k => k !== null);
  return {algo: 'dijkstra', status: 'ok', d, pred, steps, unreachable, paths: spPaths(G, d)};
}
function bellmanFord(G) {
  const n = G.n, arcs = spArcs(G), d = Array(n).fill(Infinity), pred = Array(n).fill(-1), iters = [];
  const nm = k => String(G.names[k]).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
  d[G.src] = 0; iters.push({d: d.slice(), pred: pred.slice(), imp: [], text: `Start: d(${nm(G.src)}) = 0, pozostałe = ∞.`});
  for (let it = 1; it < n; it++) {
    const imp = [];
    arcs.forEach(r => { if (isFinite(d[r.a]) && d[r.a] + r.w < d[r.b] - SP_EPS) { imp.push({v: r.b, old: d[r.b], nd: d[r.a] + r.w, via: r.a}); d[r.b] = d[r.a] + r.w; pred[r.b] = r.a; } });
    iters.push({d: d.slice(), pred: pred.slice(), imp, text: `Przebieg ${it}: sprawdzamy wszystkie łuki. ` + (imp.length ? 'Poprawy: ' + imp.map(q => `${nm(q.v)}: ${isFinite(q.old) ? fmt(q.old) : '∞'} → ${fmt(q.nd)} (przez ${nm(q.via)})`).join('; ') + '.' : 'Brak poprawy – etykiety są ostateczne, kończymy wcześniej.')});
    if (!imp.length) break;
  }
  const bad = arcs.find(r => isFinite(d[r.a]) && d[r.a] + r.w < d[r.b] - SP_EPS);
  if (bad) {                                                      // ujemny cykl: cofamy się po poprzednikach n razy, potem obchodzimy cykl
    pred[bad.b] = bad.a; let v = bad.b; for (let k = 0; k < n; k++) v = pred[v];
    const cyc = [v]; for (let u = pred[v]; u !== v && cyc.length <= n; u = pred[u]) cyc.push(u); cyc.reverse(); cyc.push(cyc[0]);
    let sum = 0; for (let k = 0; k + 1 < cyc.length; k++) sum += Math.min(...arcs.filter(r => r.a === cyc[k] && r.b === cyc[k + 1]).map(r => r.w));
    return {algo: 'bf', status: 'negcycle', cycle: cyc, cycleSum: sum, iters, d, pred};
  }
  const unreachable = d.map((v, k) => isFinite(v) ? null : k).filter(k => k !== null);
  return {algo: 'bf', status: 'ok', d, pred, iters, unreachable, paths: spPaths(G, d)};
}
