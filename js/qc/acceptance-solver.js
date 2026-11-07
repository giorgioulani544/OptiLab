/* ===== OptiLab – odbiór statystyczny (bez DOM, testowalny w Node; korzysta z ST) =====
   Plany jednostopniowe (n, c): krzywa OC (dwumianowy, Poissona, hipergeometryczny), AOQ, AOQL, ATI; dobór najmniejszego planu dla AQL, α, LTPD, β
   (przegląd c = 0, 1, …); plany dwustopniowe (OC, ASN); test sekwencyjny Walda (SPRT); plany dla cech mierzalnych przy znanym σ (metoda k). */
function accPa(n, c, p, dist = 'bin', N = null) {
  if (c < 0) return 0; if (c >= n) return 1;
  if (dist === 'poi') return ST.poissonCdf(c, n * p);
  if (dist === 'hyp') { const D = Math.round(p * N); return ST.hyperCdf(c, N, D, n); }
  return ST.binomCdf(c, n, p);
}
function accSingle(n, c, N, dist = 'bin', pmax = null) {
  const top = pmax ?? Math.min(1, Math.max(0.05, 4 * (c + 1) / n)), pts = Array.from({length: 101}, (_, k) => top * k / 100);
  const rows = pts.map(p => { const Pa = accPa(n, c, p, dist, N); return {p, Pa, AOQ: N ? Pa * p * (N - n) / N : Pa * p, ATI: N ? n + (1 - Pa) * (N - n) : null}; });
  let lo = 0, hi = top; const g = (Math.sqrt(5) - 1) / 2, aoq = p => accPa(n, c, p, dist, N) * p * (N ? (N - n) / N : 1);   // AOQL – złoty podział na najwyższym punkcie siatki
  const k = rows.reduce((b, r, i) => r.AOQ > rows[b].AOQ ? i : b, 0); lo = rows[Math.max(0, k - 1)].p; hi = rows[Math.min(100, k + 1)].p;
  for (let it = 0; it < 80; it++) { const a = hi - g * (hi - lo), b = lo + g * (hi - lo); if (aoq(a) > aoq(b)) hi = b; else lo = a; }
  const pA = (lo + hi) / 2; return {rows, AOQL: aoq(pA), pAOQL: pA};
}
/* najmniejszy plan: Pa(AQL) ≥ 1 − α i Pa(LTPD) ≤ β */
function accDesign(AQL, alpha, LTPD, beta, dist = 'bin', N = null, nmax = 5000) {
  const steps = [];
  for (let c = 0; c <= 200; c++) {
    let lo = c + 1, hi = N ? N : nmax; if (accPa(hi, c, LTPD, dist, N) > beta) { steps.push({c, n: null}); continue; }
    while (lo < hi) { const m = (lo + hi) >> 1; if (accPa(m, c, LTPD, dist, N) <= beta) hi = m; else lo = m + 1; }
    const n = lo, pa1 = accPa(n, c, AQL, dist, N), pa2 = accPa(n, c, LTPD, dist, N); steps.push({c, n, pa1, pa2, ok: pa1 >= 1 - alpha - 1e-12});
    if (pa1 >= 1 - alpha - 1e-12) return {status: 'ok', n, c, pa1, pa2, steps};
  }
  return {status: 'none', steps};
}
function accDouble(n1, c1, n2, c2, p, dist = 'bin', N = null) {
  const P1 = d => dist === 'poi' ? ST.poissonPmf(d, n1 * p) : ST.binomPmf(d, n1, p), C2 = (k) => k < 0 ? 0 : dist === 'poi' ? ST.poissonCdf(k, n2 * p) : ST.binomCdf(k, n2, p);
  let acc1 = 0; for (let d = 0; d <= c1; d++) acc1 += P1(d); let acc2 = 0, second = 0;
  for (let d = c1 + 1; d <= c2; d++) { const q = P1(d); second += q; acc2 += q * C2(c2 - d); }
  return {Pa: acc1 + acc2, Pa1: acc1, Psecond: second, ASN: n1 + n2 * second};
}
function accSPRT(p1, p2, alpha, beta) {
  const k = Math.log(p2 * (1 - p1) / (p1 * (1 - p2))), h1 = Math.log((1 - alpha) / beta) / k, h2 = Math.log((1 - beta) / alpha) / k, s = Math.log((1 - p1) / (1 - p2)) / k;
  const A = Math.log((1 - beta) / alpha), B = Math.log(beta / (1 - alpha));
  const asn = (p, Pa) => { const den = p * Math.log(p2 / p1) + (1 - p) * Math.log((1 - p2) / (1 - p1)); return Math.abs(den) < 1e-12 ? -A * B / (Math.log(p2 / p1) * Math.log((1 - p1) / (1 - p2))) : (Pa * B + (1 - Pa) * A) / den; };
  return {k, h1, h2, s, accept: n => -h1 + s * n, reject: n => h2 + s * n, ASN1: asn(p1, 1 - alpha), ASN2: asn(p2, beta)};
}
function accSequence(S, items) {                                        // items: 0/1 (1 = wadliwy); zwraca decyzję i przebieg
  let d = 0; const path = []; for (let i = 0; i < items.length; i++) { d += items[i]; const n = i + 1, a = S.accept(n), r = S.reject(n); path.push({n, d, a, r});
    if (d <= a) return {decision: 'accept', at: n, path}; if (d >= r) return {decision: 'reject', at: n, path}; }
  return {decision: 'continue', at: items.length, path};
}
function accVariables(AQL, alpha, LTPD, beta) {                          // znane σ, jedna granica: n = ((zα + zβ)/(z_AQL − z_LTPD))², k = (z_AQL·zβ + z_LTPD·zα)/(zα + zβ)
  const za = ST.normInv(1 - alpha), zb = ST.normInv(1 - beta), z1 = ST.normInv(1 - AQL), z2 = ST.normInv(1 - LTPD), nn = ((za + zb) / (z1 - z2)) ** 2, n = Math.ceil(nn - 1e-9), k = (z1 * zb + z2 * za) / (za + zb);
  const Pa = p => ST.normCdf((ST.normInv(1 - p) - k) * Math.sqrt(n)); return {n, nExact: nn, k, Pa, pa1: Pa(AQL), pa2: Pa(LTPD)};
}
