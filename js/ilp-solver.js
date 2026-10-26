/* ===== OptiLab – programowanie całkowitoliczbowe: Branch & Bound (czysta logika, bez DOM, testowalna w Node) =====
   Węzeł = relaksacja LP z dodatkowymi granicami zmiennych; podział po zmiennej ułamkowej (pierwsza / najbardziej ułamkowa),
   przeszukiwanie w głąb albo według najlepszej granicy. Statusy relaksacji obsługiwane osobno:
   infeasible → gałąź odcięta; unbounded → w korzeniu koniec (B&B nie rozstrzyga), w węźle potomnym ostrzeżenie (wynik niegwarantowany);
   limit iteracji simpleksu → przerwanie. Wynik: optimal | uncertain (najlepsze znalezione, bez gwarancji) | infeasible | unknown | unbounded_relax | limit. */
function ilpSolve(M, opt = {}) {
  const sg = M.maxi ? 1 : -1, n = M.n, LIMIT = opt.limit ?? 1000, rule = opt.rule || 'first', dfs = opt.search !== 'best';
  const isInt = M.t.map(t => t === 'i' || t === 'b');
  let bestW = -Infinity, best = null, id = 0, trunc = false, stopped = false; const warn = [];
  const mk = (lb, ub, label) => {                                   // tworzy węzeł i rozwiązuje jego relaksację LP
    const node = {id: ++id, label, kids: [], lb, ub}, ex = [];
    for (let j = 0; j < n; j++) {
      if (lb[j] > -Infinity && !(lb[j] === 0 && M.t[j] !== 'u')) ex.push({j, rel: '>=', b: lb[j]});
      if (ub[j] < Infinity) ex.push({j, rel: '<=', b: ub[j]});
    }
    const r = solveM(M, ex); node.r = r;
    if (r.status === 'limit') { node.cls = 'warn'; node.res = 'Simpleks przekroczył limit iteracji – nie wiadomo, co zawiera ta gałąź. Przeszukiwanie przerwano.'; stopped = true; return node; }
    if (r.status === 'unbounded') {
      if (id === 1) { node.unb = true; node.res = 'Relaksacja LP jest nieograniczona.'; return node; }
      node.cls = 'warn'; node.res = 'Relaksacja LP w tej gałęzi jest nieograniczona – gałęzi nie wolno odciąć, a nie da się jej dalej dzielić. Wynik nie jest gwarantowany.'; warn.push(node.id); return node;
    }
    if (r.status !== 'optimal') { node.cls = 'cut'; node.res = 'Brak rozwiązań dopuszczalnych – gałąź odcięta.'; return node; }
    node.info = `x = (${r.x.map(fmt).join('; ')}), Z = ${fmt(r.z)}`;
    if (sg * r.z <= bestW + 1e-9) { node.cls = 'cut'; node.res = `Odcięty: nawet bez wymogu całkowitości Z = ${fmt(r.z)} nie bije najlepszego całkowitego (${fmt(sg * bestW)}).`; return node; }
    if (!r.x.some((v, k) => isInt[k] && Math.abs(v - Math.round(v)) > 1e-6)) {
      bestW = sg * r.z; best = r.x.map((v, k) => isInt[k] ? Math.round(v) : v); node.cls = 'int'; node.res = `Rozwiązanie całkowite – nowy rekord Z = ${fmt(r.z)}.`; return node;
    }
    node.open = true; return node;
  };
  const root = mk(M.t.map(t => t === 'u' ? -Infinity : 0), M.t.map(t => t === 'b' ? 1 : Infinity), '');
  const base = {root, rule, dfs, limit: LIMIT};
  if (root.unb) return {...base, status: 'unbounded_relax', count: 1};
  if (root.r.status === 'limit') return {...base, status: 'limit', count: 1};
  const open = root.open ? [root] : [];
  while (open.length && !stopped) {
    if (id >= LIMIT) { trunc = true; break; }
    let k = open.length - 1;                                        // DFS: ostatni węzeł; najlepsza granica: największe Z (w postaci „max")
    if (!dfs) open.forEach((q, i) => { if (sg * q.r.z > sg * open[k].r.z) k = i; });
    const nd = open.splice(k, 1)[0]; nd.open = false;
    if (sg * nd.r.z <= bestW + 1e-9) { nd.cls = 'cut'; nd.res = 'Odcięty po znalezieniu lepszego rozwiązania całkowitego.'; continue; }
    let j = -1, mf = 1e-6;                                          // wybór zmiennej do podziału
    nd.r.x.forEach((v, q) => { if (!isInt[q]) return; const f = Math.abs(v - Math.round(v)); if (rule === 'first' ? (j < 0 && f > 1e-6) : f > mf) { j = q; mf = f; } });
    const v = nd.r.x[j], f = Math.floor(v + 1e-9), u2 = nd.ub.slice(), l2 = nd.lb.slice(); u2[j] = f; l2[j] = f + 1;
    nd.res = `x${sub(j + 1)} = ${fmt(v)} jest ułamkiem. Odcinamy pas między ${f} a ${f + 1} i dzielimy na x${sub(j + 1)} ≤ ${f} oraz x${sub(j + 1)} ≥ ${f + 1}.`;
    const A1 = mk(nd.lb, u2, `x${sub(j + 1)} ≤ ${f}`), B1 = mk(l2, nd.ub, `x${sub(j + 1)} ≥ ${f + 1}`);
    nd.kids.push(A1, B1);
    [B1, A1].forEach(c => { if (c.open) open.push(c); });          // DFS zaczyna od gałęzi „≤"
  }
  open.forEach(q => { q.res = stopped ? 'Nieodwiedzony (przerwano – limit iteracji simpleksu).' : 'Nieodwiedzony (przerwano – limit węzłów).'; });
  const certain = !trunc && !stopped && !warn.length;
  return {...base, status: best ? (certain ? 'optimal' : 'uncertain') : (certain ? 'infeasible' : 'unknown'), best, bestZ: best ? sg * bestW : null, count: id, trunc, stopped, warn};
}
