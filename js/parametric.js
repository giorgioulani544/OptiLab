/* ===== OptiLab – analiza parametryczna (dokładna) =====
   Czysta matematyka bez DOM (testowalna w Node). Parametr θ przesuwa prawe strony b(θ) = base + θ·d
   (mode 'b') albo współczynniki celu c(θ) = base + θ·d (mode 'c'). Z(θ) jest kawałkami liniowa.
   Zakres θ, w którym zadanie ma rozwiązanie, wyznaczamy dokładnie programem liniowym względem θ,
   a punkty załamania jako przecięcia prostych stycznych (nachylenia: d·y dla b, d·x dla c). */
function parametric(M, mode, base, d, lo, hi) {
  const mk = th => { const m2 = {...M, b: M.b.slice(), c: M.c.slice()}, v = base.map((q, i) => q + th * d[i]); if (mode === 'b') m2.b = v; else m2.c = v; return m2; };
  let hit = false;                                                      // simpleks przekroczył limit iteracji → wynik analizy niewiarygodny
  const solveAt = th => { const r = solveM(mk(th)); if (r.status === 'limit') hit = true; return r; };
  const close = (u, v) => Math.abs(u - v) <= 1e-9 * (1 + Math.abs(u) + Math.abs(v));
  const badStatus = mode === 'b' ? 'infeasible' : 'unbounded';
  const st0 = solveM(M).status;
  if (st0 === 'limit') return {error: 'limit', segments: []};
  if (st0 === 'infeasible') return {error: 'infeasible', segments: []};
  /* 1) przedział θ, w którym istnieje rozwiązanie: 'b' – dopuszczalność pierwotna, 'c' – dopuszczalność dualna */
  const D = mode === 'c' ? dualOf(M) : null;
  const A0 = mode === 'b' ? M.A : D.A, rel0 = mode === 'b' ? M.rel : D.rel, t0 = mode === 'b' ? M.t : D.t, nn = t0.length;
  const P = {n: nn + 1, c: [...Array(nn).fill(0), 1], A: A0.map((r, i) => [...r, -d[i]]), rel: rel0.slice(), b: base.slice(), t: [...t0, 'u']};
  const up = solveM({...P, maxi: true}), dn = solveM({...P, maxi: false});
  const segments = [];
  if (up.status === 'limit' || dn.status === 'limit') return {error: 'limit', segments: []};
  if (up.status === 'infeasible' || dn.status === 'infeasible') return {segments: [{start: lo, end: hi, status: badStatus}]};
  const L = Math.max(lo, dn.status === 'unbounded' ? -Infinity : dn.z), H = Math.min(hi, up.status === 'unbounded' ? Infinity : up.z);
  if (!(H - L > 1e-12 * (1 + Math.abs(hi - lo)))) return {segments: [{start: lo, end: hi, status: badStatus}]};
  if (L > lo) segments.push({start: lo, end: L, status: badStatus});
  /* 2) proste styczne i rekurencyjne wyznaczanie punktów załamania */
  const E = (H - L) * 1e-7;
  const line = th => {
    const r = solveAt(th); if (r.status !== 'optimal') return null;
    let s;
    if (mode === 'c') s = d.reduce((t, v, j) => t + v * r.x[j], 0);
    else { const q = solveM(dualOf(mk(th))); if (q.status === 'limit') hit = true; if (q.status !== 'optimal') return null; s = d.reduce((t, v, i) => t + v * q.x[i], 0); }
    return {th, z: r.z, s};
  };
  const val = (ln, th) => ln.z + ln.s * (th - ln.th), pieces = [];
  const rec = (a, b, la, lb, depth) => {
    if (close(la.s, lb.s) && close(val(la, b), val(lb, b))) { pieces.push({start: a, end: b, line: la}); return; }
    let th = close(la.s, lb.s) ? NaN : (lb.z - la.z + la.s * la.th - lb.s * lb.th) / (la.s - lb.s);
    if (!(th > a + E && th < b - E)) th = (a + b) / 2;
    const f = solveAt(th);
    if (depth > 60) { pieces.push({start: a, end: b, line: la}); return; }
    if (f.status === 'optimal' && close(f.z, val(la, th)) && close(f.z, val(lb, th))) {
      pieces.push({start: a, end: th, line: la}, {start: th, end: b, line: lb}); return;
    }
    rec(a, th, la, line(th - E), depth + 1); rec(th, b, line(th + E), lb, depth + 1);
  };
  const la = line(L + E), lb = line(H - E);
  if (!la || !lb) return {segments: [{start: lo, end: hi, status: badStatus}]};
  rec(L, H, la, lb, 0);
  /* 3) sklejamy sąsiednie przedziały o tej samej prostej, dodajemy plan x na końcach */
  const merged = [];
  pieces.forEach(p => {
    const beta = p.line.s, alpha = p.line.z - beta * p.line.th, l = merged[merged.length - 1];
    if (l && close(l.beta, beta) && close(l.alpha, alpha)) l.end = p.end; else merged.push({start: p.start, end: p.end, status: 'optimal', alpha, beta});
  });
  merged.forEach(g => { const e = (g.end - g.start) * 1e-7; g.x0 = solveAt(g.start + e).x; g.x1 = solveAt(g.end - e).x; });
  if (hit) return {error: 'limit', segments: []};
  segments.push(...merged);
  if (H < hi) segments.push({start: H, end: hi, status: badStatus});
  return {segments};
}
