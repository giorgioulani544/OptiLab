/* ===== OptiLab – programowanie nieliniowe: solver (bez DOM, testowalny w Node; korzysta z EX.grad/EX.hess, LA) =====
   Jedna zmienna na przedziale: bisekcja (na pochodnej), złoty podział, Fibonacci, Newton. Wiele zmiennych: spadek gradientu, Newton (z modyfikacją
   hesjanu, gdy nie jest dodatnio określony), BFGS – kroki z regułą Armijo. Z ograniczeniami: zewnętrzna funkcja kary, rozszerzony Lagrange.
   Status: 'optimal' (spełnione kryterium zbieżności), 'limit' (brak zbieżności w limicie iteracji – NIE jest wynikiem), 'diverge' (wartości nieskończone). */
const NLP_GOLD = (Math.sqrt(5) - 1) / 2;
function nlp1D(f0, method, o = {}) {
  const sg = o.maxi ? -1 : 1, f = x => sg * f0(x), tol = o.tol ?? 1e-6, maxIt = o.maxIt ?? 200, rows = [], d1 = x => { const h = 1e-6 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); }, d2 = x => { const h = 1e-4 * Math.max(1, Math.abs(x)); return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h); };
  let a = o.a, b = o.b;
  if (method === 'bisect') {
    if (!(d1(a) < 0 && d1(b) > 0)) return {status: 'nobracket', rows, msg: `pochodna na końcach przedziału nie zmienia znaku ${o.maxi ? 'z + na −' : 'z − na +'} (f′(a) = ${(sg * d1(a)).toPrecision(4)}, f′(b) = ${(sg * d1(b)).toPrecision(4)}) – w przedziale nie ma jednego ${o.maxi ? 'maksimum' : 'minimum'} rozpoznawalnego bisekcją.`};
    for (let k = 1; k <= maxIt; k++) { const m = (a + b) / 2, g = d1(m); rows.push({k, a, b, x: m, d: sg * g}); if (b - a < tol || g === 0) return {status: 'optimal', x: m, fx: f0(m), rows}; if (g > 0) b = m; else a = m; }
    return {status: 'limit', rows};
  }
  if (method === 'golden') {
    let x1 = b - NLP_GOLD * (b - a), x2 = a + NLP_GOLD * (b - a), f1 = f(x1), f2 = f(x2);
    for (let k = 1; k <= maxIt; k++) { rows.push({k, a, b, x1, x2, f1: sg * f1, f2: sg * f2}); if (b - a < tol) { const x = (a + b) / 2; return {status: 'optimal', x, fx: f0(x), rows}; }
      if (f1 <= f2) { b = x2; x2 = x1; f2 = f1; x1 = b - NLP_GOLD * (b - a); f1 = f(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + NLP_GOLD * (b - a); f2 = f(x2); } }
    return {status: 'limit', rows};
  }
  if (method === 'fib') {
    const F = [1, 1]; while (F[F.length - 1] < (b - a) / tol) F.push(F[F.length - 1] + F[F.length - 2]); const N = F.length - 1; if (N > maxIt) return {status: 'limit', rows};
    let x1 = a + F[N - 2] / F[N] * (b - a), x2 = a + F[N - 1] / F[N] * (b - a), f1 = f(x1), f2 = f(x2);
    for (let k = 1; k <= N - 2; k++) { rows.push({k, a, b, x1, x2, f1: sg * f1, f2: sg * f2});
      if (f1 <= f2) { b = x2; x2 = x1; f2 = f1; x1 = a + F[N - k - 2] / F[N - k] * (b - a); f1 = f(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + F[N - k - 1] / F[N - k] * (b - a); f2 = f(x2); } }
    const x = (a + b) / 2; rows.push({k: N - 1, a, b, x1, x2, f1: sg * f1, f2: sg * f2}); return {status: 'optimal', x, fx: f0(x), rows, N};
  }
  let x = o.x0 ?? (a + b) / 2;                                               // Newton: x ← x − f′(x)/f″(x)
  for (let k = 1; k <= maxIt; k++) { const g = d1(x), h = d2(x); rows.push({k, x, d: sg * g, dd: sg * h, fx: f0(x)}); if (Math.abs(g) < tol) return {status: 'optimal', x, fx: f0(x), rows, curv: h};
    if (!(Math.abs(h) > 1e-14) || !isFinite(h)) return {status: 'limit', rows, msg: 'druga pochodna równa 0 – krok Newtona niemożliwy.'}; x = x - g / h; if (!isFinite(x)) return {status: 'diverge', rows}; }
  return {status: 'limit', rows};
}
function nlpMin(f0, x0, method, o = {}) {
  const sg = o.maxi ? -1 : 1, f = x => sg * f0(x), n = x0.length, tol = o.tol ?? 1e-6, maxIt = o.maxIt ?? 500, rows = [], path = [x0.slice()];
  let x = x0.slice(), fx = f(x), g = EX.grad(f, x), Hinv = LA.I(n), mods = 0, dfLast = Infinity;
  const norm = v => Math.sqrt(v.reduce((s, q) => s + q * q, 0)), dot = (a, b) => a.reduce((s, q, i) => s + q * b[i], 0);
  const g0n = norm(g);   // kryterium: ‖∇f‖ ≤ tol·(1 + ‖∇f(x₀)‖) albo ‖∇f‖ na poziomie dokładności różniczkowania numerycznego przy ustalonej wartości f
  for (let k = 0; k <= maxIt; k++) {
    if (!isFinite(fx) || x.some(v => !isFinite(v)) || fx < -1e15) return {status: 'diverge', x, rows, path};
    const gn = norm(g); rows.push({k, x: x.slice(), fx: sg * fx, gn, alpha: rows.length ? rows[rows.length - 1].alphaNext : null});
    if (gn <= tol * (1 + g0n) || (gn <= 1e-7 * (1 + Math.abs(fx)) && Math.abs(dfLast) <= 1e-14 * (1 + Math.abs(fx)))) return {status: 'optimal', x, fx: sg * fx, rows, path, mods};
    if (k === maxIt) break;
    let d;
    if (method === 'grad') d = g.map(v => -v);
    else if (method === 'newton') { const H = EX.hess(f, x); let mu = 0, L = LA.chol(H); while (!L && mu < 1e12) { mu = mu ? mu * 10 : 1e-3 * Math.max(1, ...H.map((r, i) => Math.abs(r[i]))); L = LA.chol(H.map((r, i) => r.map((v, j) => v + (i === j ? mu : 0)))); } if (mu) mods++;
      d = LA.solve(H.map((r, i) => r.map((v, j) => v + (i === j ? mu : 0))), g.map(v => -v)) || g.map(v => -v); }
    else d = Hinv.map(r => -dot(r, g));
    if (dot(d, g) >= 0) { d = g.map(v => -v); Hinv = LA.I(n); }
    let alpha = 1; const slope = dot(g, d); let xn, fn;
    for (let ls = 0; ls < 60; ls++) { xn = x.map((v, i) => v + alpha * d[i]); fn = f(xn); if (isFinite(fn) && fn <= fx + 1e-4 * alpha * slope) break; alpha /= 2; }
    rows[rows.length - 1].alphaNext = alpha;
    const gnew = EX.grad(f, xn);
    if (method === 'bfgs') { const s = xn.map((v, i) => v - x[i]), y = gnew.map((v, i) => v - g[i]), sy = dot(s, y);
      // aktualizację pomijamy, gdy zmiana gradientu to tylko szum numeryczny (np. funkcja liniowa)
      if (sy > 1e-12 * norm(s) * norm(y) && norm(y) > 1e-8 * (1 + norm(g))) { const rho = 1 / sy, Hy = Hinv.map(r => dot(r, y)), yHy = dot(y, Hy);
        Hinv = Hinv.map((r, i) => r.map((v, j) => v - rho * (Hy[i] * s[j] + s[i] * Hy[j]) + (rho * rho * yHy + rho) * s[i] * s[j])); } }
    if (Math.abs(fn - fx) < 1e-15 * (1 + Math.abs(fx)) && norm(xn.map((v, i) => v - x[i])) < 1e-14 * (1 + norm(x))) { x = xn; fx = fn; g = gnew; path.push(x.slice()); rows.push({k: k + 1, x: x.slice(), fx: sg * fx, gn: norm(g)}); return {status: norm(g) <= 1e-4 * (1 + Math.abs(fx)) ? 'optimal' : 'limit', x, fx: sg * fx, rows, path, mods, stalled: true}; }
    dfLast = fn - fx; x = xn; fx = fn; g = gnew; path.push(x.slice());
  }
  return {status: 'limit', x, fx: sg * fx, rows, path, mods};
}
/* cons: [{g: x → wartość, type: '<='|'>='|'=', rhs}] ; metody: 'penalty' (kara zewnętrzna μ·Σ naruszeń²), 'auglag' (rozszerzony Lagrange) */
function nlpCon(f0, x0, cons, method, o = {}) {
  const sg = o.maxi ? -1 : 1, f = x => sg * f0(x), tol = o.tol ?? 1e-6, rows = [], path = [x0.slice()];
  const cv = x => cons.map(c => { const v = c.g(x) - c.rhs; return c.type === '<=' ? v : c.type === '>=' ? -v : v; });              // ≤ 0 (nierówności) / = 0 (równości)
  const viol = x => Math.max(0, ...cv(x).map((v, i) => cons[i].type === '=' ? Math.abs(v) : Math.max(0, v)));
  let x = x0.slice(), mu = o.mu0 ?? 1, lam = cons.map(() => 0);
  for (let k = 1; k <= (o.maxOuter ?? 30); k++) {
    const P = method === 'penalty' ? (y => f(y) + mu * cv(y).reduce((s, v, i) => s + (cons[i].type === '=' ? v * v : Math.max(0, v) ** 2), 0))
      : (y => f(y) + cv(y).reduce((s, v, i) => s + (cons[i].type === '=' ? lam[i] * v + mu / 2 * v * v : (mu / 2) * (Math.max(0, lam[i] / mu + v) ** 2 - (lam[i] / mu) ** 2)), 0));
    const R = nlpMin(P, x, 'bfgs', {tol: Math.max(tol * 1e-2, 1e-10), maxIt: 2000}); if (R.status === 'diverge') return {status: 'diverge', rows, path};
    x = R.x; R.path.slice(1).forEach(p => path.push(p)); const vv = viol(x);
    if (method === 'auglag') { const c = cv(x); lam = lam.map((l, i) => cons[i].type === '=' ? l + mu * c[i] : Math.max(0, l + mu * c[i])); }
    rows.push({k, mu, x: x.slice(), fx: f0(x), viol: vv, lam: lam.slice(), inner: R.rows.length - 1});
    if (vv <= tol && (method === 'penalty' || k > 1 && Math.abs(rows[k - 1].fx - rows[k - 2].fx) <= tol * (1 + Math.abs(rows[k - 1].fx)))) return {status: 'optimal', x, fx: f0(x), rows, path, lam: lam.map(l => sg * l)};
    mu *= method === 'penalty' ? 10 : 4;
    if (mu > 1e12) break;
  }
  return {status: 'limit', x, fx: f0(x), rows, path};
}
