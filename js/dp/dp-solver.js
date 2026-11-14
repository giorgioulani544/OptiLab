/* ===== OptiLab – programowanie dynamiczne: solver (bez DOM, testowalny w Node) =====
   Wspólny wynik: etapy z tablicami f_n(s) (stan, decyzje z wartościami, najlepsza wartość, decyzje optymalne), polityka optymalna, wartość.
   Zadania: najkrótsza (najdłuższa) ścieżka etapowa – rekurencja wstecz lub w przód; rozdział zasobów; plecak 0/1, ograniczony i nieograniczony;
   produkcja–zapasy (koszt uruchomienia, jednostkowy, magazynowania, limity); wymiana sprzętu (zatrzymaj / wymień). */
const DP_EPS = 1e-9;
const dpBetter = (a, b, maxi) => maxi ? a > b + DP_EPS * (1 + Math.abs(b)) : a < b - DP_EPS * (1 + Math.abs(b));
const dpSame = (a, b) => Math.abs(a - b) <= DP_EPS * (1 + Math.abs(b));
/* ścieżka etapowa: arcs [{a, b, c}] (nazwy węzłów), start, end; etapy = poziomy (najdłuższa liczba łuków od startu) */
function dpStageLayers(arcs, start, end) {
  const nodes = [...new Set(arcs.flatMap(e => [e.a, e.b]))], out = new Map(nodes.map(v => [v, []])), lev = new Map([[start, 0]]);
  arcs.forEach(e => out.get(e.a).push(e)); if (!out.has(start)) return {error: `węzeł początkowy „${start}" nie występuje w łukach.`}; if (!out.has(end)) return {error: `węzeł końcowy „${end}" nie występuje w łukach.`};
  const indeg = new Map(nodes.map(v => [v, 0])); arcs.forEach(e => indeg.set(e.b, indeg.get(e.b) + 1)); const q = nodes.filter(v => !indeg.get(v)), order = [];
  while (q.length) { const v = q.shift(); order.push(v); out.get(v).forEach(e => { indeg.set(e.b, indeg.get(e.b) - 1); if (!indeg.get(e.b)) q.push(e.b); }); }
  if (order.length < nodes.length) return {error: 'łuki tworzą cykl – zadanie etapowe wymaga sieci bez cykli.'};
  order.forEach(v => { if (!lev.has(v)) return; out.get(v).forEach(e => lev.set(e.b, Math.max(lev.get(e.b) ?? 0, lev.get(v) + 1))); });
  const unreach = nodes.filter(v => !lev.has(v)); if (!lev.has(end)) return {error: `węzeł końcowy „${end}" jest nieosiągalny ze startu.`};
  const keep = nodes.filter(v => lev.has(v)); keep.forEach(v => out.set(v, out.get(v).filter(e => lev.has(e.b))));   // węzły nieosiągalne pomijamy (raport o nich informuje)
  return {nodes: keep, out, lev, order: order.filter(v => lev.has(v)), unreach};
}
function dpPath(arcs, start, end, maxi = false, dir = 'back') {
  const L = dpStageLayers(arcs, start, end); if (L.error) return {status: 'error', msg: L.error};
  const {nodes, out, lev, order, unreach} = L, f = new Map(), stages = [], into = new Map(nodes.map(v => [v, []])); arcs.forEach(e => { if (lev.has(e.a) && lev.has(e.b)) into.get(e.b).push(e); });
  const N = Math.max(...nodes.map(v => lev.get(v)));
  if (dir === 'back') {
    f.set(end, 0);
    for (let k = N - 1; k >= 0; k--) { const rows = nodes.filter(v => lev.get(v) === k && v !== end).map(s => {
        const opts = out.get(s).filter(e => f.has(e.b) && f.get(e.b) !== null).map(e => ({x: e.b, imm: e.c, val: e.c + f.get(e.b)}));
        if (!opts.length) { f.set(s, null); return {s, opts, best: null, xs: []}; }
        const best = opts.reduce((m, o) => dpBetter(o.val, m, maxi) ? o.val : m, opts[0].val); f.set(s, best); return {s, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}; });
      if (rows.length) stages.push({k: k + 1, rows}); }
    if (f.get(start) === null || f.get(start) === undefined) return {status: 'infeasible', stages, N};
    const routes = [], walk = (v, acc) => { if (routes.length > 50) return; if (v === end) { routes.push([...acc, v]); return; } const row = stages.flatMap(s => s.rows).find(r => r.s === v); (row ? row.xs : []).forEach(x => walk(x, [...acc, v])); };
    walk(start, []); return {status: 'optimal', value: f.get(start), stages, routes, N, lev, dir, unreach};
  }
  const g = new Map([[start, 0]]);                                            // rekurencja w przód: g(t) = opt po łukach s→t [g(s) + c]
  for (let k = 1; k <= N; k++) { const rows = nodes.filter(v => lev.get(v) === k).map(s => {
      const opts = into.get(s).filter(e => g.has(e.a) && g.get(e.a) !== null).map(e => ({x: e.a, imm: e.c, val: e.c + g.get(e.a)}));
      if (!opts.length) { g.set(s, null); return {s, opts, best: null, xs: []}; }
      const best = opts.reduce((m, o) => dpBetter(o.val, m, maxi) ? o.val : m, opts[0].val); g.set(s, best); return {s, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}; });
    stages.push({k, rows}); }
  if (!g.has(end) || g.get(end) === null) return {status: 'infeasible', stages, N};
  const routes = [], walk = (v, acc) => { if (routes.length > 50) return; if (v === start) { routes.push([v, ...acc]); return; } const row = stages.flatMap(s => s.rows).find(r => r.s === v); (row ? row.xs : []).forEach(x => walk(x, [v, ...acc])); };
  walk(end, []); return {status: 'optimal', value: g.get(end), stages, routes, N, lev, dir, unreach};
}
/* rozdział zasobów: R jednostek (rozdzielamy wszystkie – na rezerwę dodaj działanie o efekcie 0), ret[i][x] – efekt działania i przy x jednostkach (x = 0..R) */
function dpAlloc(ret, R, maxi = true) {
  const n = ret.length, NO = maxi ? -Infinity : Infinity, f = Array.from({length: n + 1}, (_, i) => Array.from({length: R + 1}, (_, s) => i === n && s > 0 ? NO : 0)), stages = [];   // cały zasób musi zostać rozdzielony
  for (let i = n - 1; i >= 0; i--) { const rows = [];
    for (let s = 0; s <= R; s++) { const opts = []; for (let x = 0; x <= s; x++) if (isFinite(f[i + 1][s - x])) opts.push({x, imm: ret[i][x], val: ret[i][x] + f[i + 1][s - x]});
      const best = opts.reduce((m, o) => dpBetter(o.val, m, maxi) ? o.val : m, opts[0].val); f[i][s] = best; rows.push({s, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}); }
    stages.unshift({k: i + 1, rows}); }
  const policy = []; let s = R; for (let i = 0; i < n; i++) { const x = stages[i].rows[s].xs[0]; policy.push({k: i + 1, s, x, imm: ret[i][x]}); s -= x; }
  return {status: 'optimal', value: f[0][R], stages, policy, alt: stages.some((st, i) => st.rows[policy[i].s].xs.length > 1)};
}
/* plecak: items [{w, v, lim}] (lim = Infinity – bez limitu), W – pojemność; stan = wolna pojemność */
function dpKnap(items, W) {
  const n = items.length, f = Array.from({length: n + 1}, () => Array(W + 1).fill(0)), stages = [];
  for (let i = n - 1; i >= 0; i--) { const it = items[i], rows = [];
    for (let s = 0; s <= W; s++) { const mmax = Math.min(it.lim, Math.floor(s / it.w)), opts = []; for (let m = 0; m <= mmax; m++) opts.push({x: m, imm: m * it.v, val: m * it.v + f[i + 1][s - m * it.w]});
      const best = opts.reduce((mm, o) => o.val > mm + DP_EPS ? o.val : mm, opts[0].val); f[i][s] = best; rows.push({s, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}); }
    stages.unshift({k: i + 1, rows}); }
  const policy = []; let s = W; for (let i = 0; i < n; i++) { const x = stages[i].rows[s].xs[stages[i].rows[s].xs.length - 1]; policy.push({k: i + 1, s, x, imm: x * items[i].v}); s -= x * items[i].w; }
  return {status: 'optimal', value: f[0][W], stages, policy, used: W - s};
}
/* produkcja–zapasy: per [{D, cap, K, c, h}], I0, Iend, Smax (magazyn); stan = zapas na początku okresu; decyzja = produkcja x */
function dpProd(per, I0, Iend, Smax) {
  const T = per.length, INF = Infinity, f = Array.from({length: T + 1}, () => Array(Smax + 1).fill(INF)), stages = [];
  f[T][Iend] = 0;
  for (let t = T - 1; t >= 0; t--) { const p = per[t], rows = [];
    for (let s = 0; s <= Smax; s++) { const opts = [];
      for (let x = 0; x <= p.cap; x++) { const e = s + x - p.D; if (e < 0 || e > Smax || f[t + 1][e] === INF) continue; const imm = (x > 0 ? p.K + p.c * x : 0) + p.h * e; opts.push({x, imm, val: imm + f[t + 1][e], e}); }
      if (!opts.length) { rows.push({s, opts, best: null, xs: []}); continue; }
      const best = opts.reduce((m, o) => o.val < m - DP_EPS * (1 + Math.abs(m)) ? o.val : m, opts[0].val); f[t][s] = best; rows.push({s, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}); }
    stages.unshift({k: t + 1, rows}); }
  if (I0 > Smax || f[0][I0] === INF) return {status: 'infeasible', stages};
  const policy = []; let s = I0; for (let t = 0; t < T; t++) { const row = stages[t].rows[s], x = row.xs[0], o = row.opts.find(q => q.x === x); policy.push({k: t + 1, s, x, imm: o.imm, e: o.e}); s = o.e; }
  return {status: 'optimal', value: f[0][I0], stages, policy};
}
/* wymiana sprzętu: T lat, a0 – wiek na starcie, P – cena nowego, op[a] – koszt eksploatacji w roku, gdy maszyna ma wiek a (a = 0..A−1),
   sal[a] – wartość odsprzedaży maszyny w wieku a (a = 1..A); maszyna wieku A musi być wymieniona. Na końcu horyzontu sprzedajemy maszynę. */
function dpReplace(T, a0, P, op, sal, A) {
  const f = Array.from({length: T + 1}, () => Array(A + 1).fill(Infinity)), stages = [];
  for (let a = 1; a <= A; a++) f[T][a] = -sal[a];
  for (let t = T - 1; t >= 0; t--) { const rows = [];
    for (let a = (t === 0 ? a0 : 1); a <= (t === 0 ? a0 : A); a++) { const opts = [];
      if (a < A && isFinite(f[t + 1][a + 1])) opts.push({x: 'zatrzymaj', imm: op[a], val: op[a] + f[t + 1][a + 1]});
      if (isFinite(f[t + 1][1])) opts.push({x: 'wymień', imm: P - sal[a] + op[0], val: P - sal[a] + op[0] + f[t + 1][1]});
      const best = Math.min(...opts.map(o => o.val)); f[t][a] = best; rows.push({s: a, opts, best, xs: opts.filter(o => dpSame(o.val, best)).map(o => o.x)}); }
    stages.unshift({k: t + 1, rows}); }
  const policy = []; let a = a0; for (let t = 0; t < T; t++) { const row = stages[t].rows.find(r => r.s === a), x = row.xs[0], o = row.opts.find(q => q.x === x); policy.push({k: t + 1, s: a, x, imm: o.imm}); a = x === 'zatrzymaj' ? a + 1 : 1; }
  return {status: 'optimal', value: f[0][a0], stages, policy, endAge: a, endSal: sal[a]};
}
