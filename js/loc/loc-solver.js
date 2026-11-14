/* ===== OptiLab – lokalizacja i układ: solver (bez DOM, testowalny w Node) =====
   Jeden obiekt (punkty z wagami): odległość prostokątna – mediana ważona (osobno x i y), euklidesowa – algorytm Weiszfelda (z warunkiem Kuhna
   w punkcie danych), kwadrat euklidesowej – środek ciężkości. Układ działów (zadanie przydziału kwadratowego): koszt Σ f_ij·d(π(i), π(j)),
   CRAFT – najlepsza wymiana par aż do braku poprawy, porównanie z przeglądem n! układów (n ≤ 8). p-mediana: przegląd wszystkich zestawów p miejsc. */
const locDist = (a, b, kind) => kind === 'rect' ? Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) : kind === 'sq' ? (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 : Math.hypot(a[0] - b[0], a[1] - b[1]);
const locCost = (pts, p, kind) => pts.reduce((s, q) => s + q.w * locDist([q.x, q.y], p, kind), 0);
function locMedian(vals, w) {                                            // mediana ważona: zbiór optymalny [lo, hi] (punkt albo odcinek)
  const ord = vals.map((v, i) => ({v, w: w[i]})).sort((a, b) => a.v - b.v), W = ord.reduce((s, o) => s + o.w, 0); let cum = 0; const steps = [];
  for (let k = 0; k < ord.length; k++) { cum += ord[k].w; steps.push({v: ord[k].v, w: ord[k].w, cum});
    if (cum > W / 2 + 1e-12) return {lo: ord[k].v, hi: ord[k].v, steps: steps.concat(ord.slice(k + 1).map(o => ({v: o.v, w: o.w, cum: (cum += o.w)}))), W};
    if (Math.abs(cum - W / 2) <= 1e-12) { const hi = ord[k + 1] ? ord[k + 1].v : ord[k].v; return {lo: ord[k].v, hi, steps: steps.concat(ord.slice(k + 1).map(o => ({v: o.v, w: o.w, cum: (cum += o.w)}))), W}; } }
  return {lo: ord[ord.length - 1].v, hi: ord[ord.length - 1].v, steps, W};
}
function locSingle(pts, kind, o = {}) {
  const W = pts.reduce((s, q) => s + q.w, 0), cg = [pts.reduce((s, q) => s + q.w * q.x, 0) / W, pts.reduce((s, q) => s + q.w * q.y, 0) / W];
  if (kind === 'sq') return {status: 'optimal', x: cg, cost: locCost(pts, cg, 'sq'), W};
  if (kind === 'rect') { const mx = locMedian(pts.map(q => q.x), pts.map(q => q.w)), my = locMedian(pts.map(q => q.y), pts.map(q => q.w)), x = [(mx.lo + mx.hi) / 2, (my.lo + my.hi) / 2];
    return {status: 'optimal', x, cost: locCost(pts, x, 'rect'), mx, my, unique: mx.lo === mx.hi && my.lo === my.hi, W}; }
  const tol = o.tol ?? 1e-7, maxIt = o.maxIt ?? 1000, rows = [], path = [cg.slice()]; let x = cg.slice();
  const kuhn = pts.map((p, i) => { const R = pts.reduce((s, q, j) => { if (j === i) return s; const d = Math.hypot(p.x - q.x, p.y - q.y); return d < 1e-12 ? s : [s[0] + q.w * (p.x - q.x) / d, s[1] + q.w * (p.y - q.y) / d]; }, [0, 0]);
    return {i, pull: Math.hypot(R[0], R[1]), w: pts.filter(q => Math.hypot(p.x - q.x, p.y - q.y) < 1e-12).reduce((s, q) => s + q.w, 0)}; });   // warunek Kuhna: punkt danych jest optimum ⇔ wypadkowa „sił” pozostałych ≤ jego waga
  const vtx = kuhn.find(k => k.pull <= k.w + 1e-12 * (1 + k.w));
  if (vtx) { const v = [pts[vtx.i].x, pts[vtx.i].y]; rows.push({k: 0, x: v, cost: locCost(pts, v, 'euc'), ch: 0, vertex: vtx.i}); return {status: 'optimal', x: v, cost: locCost(pts, v, 'euc'), rows, path: [cg.slice(), v], vertex: vtx.i, kuhn, W}; }
  for (let k = 0; k < maxIt; k++) {
    const at = pts.findIndex(q => Math.hypot(q.x - x[0], q.y - x[1]) < 1e-12);
    if (at >= 0) { const R = pts.reduce((s, q, i) => { if (i === at) return s; const d = Math.hypot(x[0] - q.x, x[1] - q.y); return [s[0] + q.w * (x[0] - q.x) / d, s[1] + q.w * (x[1] - q.y) / d]; }, [0, 0]), nr = Math.hypot(R[0], R[1]);
      if (nr <= pts[at].w + 1e-12) { rows.push({k, x: x.slice(), cost: locCost(pts, x, 'euc'), ch: 0, vertex: at}); return {status: 'optimal', x, cost: locCost(pts, x, 'euc'), rows, path, vertex: at, W}; }
      const t = (nr - pts[at].w) / pts.reduce((s, q, i) => i === at ? s : s + q.w / Math.hypot(x[0] - q.x, x[1] - q.y), 0); x = [x[0] - t * R[0] / nr, x[1] - t * R[1] / nr]; path.push(x.slice()); continue; }
    let sx = 0, sy = 0, sw = 0; pts.forEach(q => { const d = Math.hypot(x[0] - q.x, x[1] - q.y); sx += q.w * q.x / d; sy += q.w * q.y / d; sw += q.w / d; });
    const xn = [sx / sw, sy / sw], ch = Math.hypot(xn[0] - x[0], xn[1] - x[1]); rows.push({k, x: x.slice(), cost: locCost(pts, x, 'euc'), ch}); x = xn; path.push(x.slice());
    if (ch < tol * (1 + Math.hypot(x[0], x[1]))) { rows.push({k: k + 1, x: x.slice(), cost: locCost(pts, x, 'euc'), ch: 0}); return {status: 'optimal', x, cost: locCost(pts, x, 'euc'), rows, path, kuhn, W}; }
  }
  return {status: 'limit', x, rows, path, W};
}
const layCost = (F, D, perm) => { let s = 0; for (let i = 0; i < F.length; i++) for (let j = 0; j < F.length; j++) if (F[i][j]) s += F[i][j] * D[perm[i]][perm[j]]; return s; };   // perm[i] – miejsce działu i
function layCRAFT(F, D, perm0, maxIt = 200) {
  let perm = perm0.slice(), cost = layCost(F, D, perm); const steps = [], n = perm.length;
  for (let it = 0; it < maxIt; it++) { const cand = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const p = perm.slice(); [p[i], p[j]] = [p[j], p[i]]; cand.push({i, j, cost: layCost(F, D, p)}); }
    cand.sort((a, b) => a.cost - b.cost || a.i - b.i || a.j - b.j); const best = cand[0];
    steps.push({it: it + 1, cost, cand: cand.slice(0, 6), best: best && best.cost < cost - 1e-9 ? best : null});
    if (!best || best.cost >= cost - 1e-9) return {perm, cost, steps};
    [perm[best.i], perm[best.j]] = [perm[best.j], perm[best.i]]; cost = best.cost;
  }
  return {perm, cost, steps, limit: true};
}
function layBrute(F, D) {                                                 // n ≤ 8: wszystkie n! układów
  const n = F.length, perm = [...Array(n).keys()], used = Array(n).fill(false), cur = []; let best = null, count = 0;
  const go = () => { if (cur.length === n) { count++; const c = layCost(F, D, cur); if (!best || c < best.cost - 1e-9) best = {cost: c, perm: cur.slice()}; return; } for (let k = 0; k < n; k++) if (!used[k]) { used[k] = true; cur.push(k); go(); cur.pop(); used[k] = false; } };
  go(); return {...best, count, n: perm.length};
}
function pMedian(dem, cands, p, kind) {                                   // dem: [{x, y, w}], cands: [{x, y}] – przegląd wszystkich C(m, p) zestawów
  const m = cands.length, D = dem.map(q => cands.map(c => locDist([q.x, q.y], [c.x, c.y], kind))); let best = null, count = 0; const cur = [];
  const go = s => { if (cur.length === p) { count++; const c = dem.reduce((t, q, i) => t + q.w * Math.min(...cur.map(j => D[i][j])), 0); if (!best || c < best.cost - 1e-9) best = {cost: c, set: cur.slice()}; return; } for (let j = s; j <= m - (p - cur.length); j++) { cur.push(j); go(j + 1); cur.pop(); } };
  go(0); const assign = dem.map((_, i) => best.set.reduce((a, j) => D[i][j] < D[i][a] ? j : a, best.set[0]));
  return {...best, assign, count, D};
}
