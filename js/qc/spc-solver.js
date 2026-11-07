/* ===== OptiLab – karty kontrolne (SPC): solver (bez DOM, testowalny w Node; korzysta z ST) =====
   Stałe kart wyznaczane wzorami (całkowanie numeryczne – nie z tabeli): d2, d3, c4 i pochodne A2, D3, D4, A3, B3, B4.
   Karty: X̄-R, X̄-s, I-MR, p (zmienna liczebność), np, c, u; reguły Nelsona 1–8; faza I (usuwanie punktów poza granicami);
   zdolność procesu Cp, Cpk, Pp, Ppk; wykres Pareto; rozszerzenia: CUSUM tabelaryczny, EWMA, ARL. */
const SPC_NELSON = ['punkt poza granicami ±3σ', '9 kolejnych punktów po jednej stronie linii centralnej', '6 kolejnych punktów stale rosnących lub malejących', '14 kolejnych punktów naprzemiennie w górę i w dół',
  '2 z 3 kolejnych punktów poza ±2σ po tej samej stronie', '4 z 5 kolejnych punktów poza ±1σ po tej samej stronie', '15 kolejnych punktów w strefie ±1σ', '8 kolejnych punktów poza strefą ±1σ (po obu stronach)'];
const spcConstCache = {};
function spcConst(n) {
  if (spcConstCache[n]) return spcConstCache[n];
  const L = 9, h = 0.01, G = Math.round(2 * L / h), xs = Array.from({length: G + 1}, (_, k) => -L + k * h), F = xs.map(x => ST.normCdf(x));
  let d2 = 0; for (let k = 0; k <= G; k++) { const w = k === 0 || k === G ? 0.5 : 1; d2 += w * (1 - (1 - F[k]) ** n - F[k] ** n); } d2 *= h;
  const h2 = 0.04, G2 = Math.round(2 * 7 / h2), F2 = Array.from({length: G2 + 1}, (_, k) => ST.normCdf(-7 + k * h2)); let er2 = 0;          // E[R²] = 2∫∫_{x<y} [1 − F(y)ⁿ − (1 − F(x))ⁿ + (F(y) − F(x))ⁿ]
  for (let i = 0; i <= G2; i++) for (let j = i; j <= G2; j++) { const w = (i === 0 || i === G2 ? 0.5 : 1) * (j === 0 || j === G2 ? 0.5 : 1) * (i === j ? 0.5 : 1); er2 += w * (1 - F2[j] ** n - (1 - F2[i]) ** n + (F2[j] - F2[i]) ** n); }
  er2 *= 2 * h2 * h2; const d3 = Math.sqrt(Math.max(0, er2 - d2 * d2)), c4 = Math.sqrt(2 / (n - 1)) * Math.exp(ST.lnGamma(n / 2) - ST.lnGamma((n - 1) / 2)), sq = Math.sqrt(1 - c4 * c4) / c4;
  return (spcConstCache[n] = {n, d2, d3, c4, A2: 3 / (d2 * Math.sqrt(n)), D3: Math.max(0, 1 - 3 * d3 / d2), D4: 1 + 3 * d3 / d2, A3: 3 / (c4 * Math.sqrt(n)), B3: Math.max(0, 1 - 3 * sq), B4: 1 + 3 * sq});
}
const spcMean = a => a.reduce((s, v) => s + v, 0) / a.length, spcSd = a => { const m = spcMean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
/* karta: {stat[], cl[], ucl[], lcl[], sigma[] (odchylenie statystyki – do stref reguł)}; zwraca też drugą kartę (R, s, MR) */
function spcLimits(type, D, keep = null) {
  const use = (arr, i) => !keep || keep[i];
  if (type === 'xr' || type === 'xs') {
    const n = D.sub[0].length, K = spcConst(n), means = D.sub.map(spcMean), disp = D.sub.map(r => type === 'xr' ? Math.max(...r) - Math.min(...r) : spcSd(r)), idx = means.map((_, i) => i).filter(i => use(means, i));
    const xbb = spcMean(idx.map(i => means[i])), db = spcMean(idx.map(i => disp[i])), w = type === 'xr' ? K.A2 * db : K.A3 * db, sig = type === 'xr' ? db / K.d2 : db / K.c4, N = means.length, f = v => Array(N).fill(v);
    return {K, main: {stat: means, cl: f(xbb), ucl: f(xbb + w), lcl: f(xbb - w), sigma: f(w / 3), name: 'X̄'}, disp: {stat: disp, cl: f(db), ucl: f((type === 'xr' ? K.D4 : K.B4) * db), lcl: f((type === 'xr' ? K.D3 : K.B3) * db), name: type === 'xr' ? 'R' : 's'},
      sigmaW: sig, center: xbb, dbar: db, n};
  }
  if (type === 'imr') {
    const x = D.x, mr = x.slice(1).map((v, i) => Math.abs(v - x[i])), K = spcConst(2), idx = x.map((_, i) => i).filter(i => use(x, i)), xb = spcMean(idx.map(i => x[i]));
    const mrIdx = mr.map((_, i) => i).filter(i => use(x, i + 1) && use(x, i)), mrb = spcMean(mrIdx.map(i => mr[i])), sig = mrb / K.d2, N = x.length, f = (v, k = N) => Array(k).fill(v);
    return {K, main: {stat: x, cl: f(xb), ucl: f(xb + 3 * sig), lcl: f(xb - 3 * sig), sigma: f(sig), name: 'x'}, disp: {stat: mr, cl: f(mrb, N - 1), ucl: f(K.D4 * mrb, N - 1), lcl: f(0, N - 1), name: 'MR', offset: 1}, sigmaW: sig, center: xb, dbar: mrb, n: 1};
  }
  const nn = D.n, cnt = D.c, idx = cnt.map((_, i) => i).filter(i => use(cnt, i)), N = cnt.length;
  if (type === 'p' || type === 'np') { const pb = idx.reduce((s, i) => s + cnt[i], 0) / idx.reduce((s, i) => s + nn[i], 0);
    if (type === 'p') { const sd = nn.map(n => Math.sqrt(pb * (1 - pb) / n)); return {main: {stat: cnt.map((c, i) => c / nn[i]), cl: Array(N).fill(pb), ucl: sd.map(s => pb + 3 * s), lcl: sd.map(s => Math.max(0, pb - 3 * s)), sigma: sd, name: 'p'}, center: pb}; }
    const n = nn[0], s = Math.sqrt(n * pb * (1 - pb)); return {main: {stat: cnt.slice(), cl: Array(N).fill(n * pb), ucl: Array(N).fill(n * pb + 3 * s), lcl: Array(N).fill(Math.max(0, n * pb - 3 * s)), sigma: Array(N).fill(s), name: 'np'}, center: pb}; }
  if (type === 'c') { const cb = spcMean(idx.map(i => cnt[i])), s = Math.sqrt(cb); return {main: {stat: cnt.slice(), cl: Array(N).fill(cb), ucl: Array(N).fill(cb + 3 * s), lcl: Array(N).fill(Math.max(0, cb - 3 * s)), sigma: Array(N).fill(s), name: 'c'}, center: cb}; }
  const ub = idx.reduce((s, i) => s + cnt[i], 0) / idx.reduce((s, i) => s + nn[i], 0), sd = nn.map(n => Math.sqrt(ub / n));
  return {main: {stat: cnt.map((c, i) => c / nn[i]), cl: Array(N).fill(ub), ucl: sd.map(s => ub + 3 * s), lcl: sd.map(s => Math.max(0, ub - 3 * s)), sigma: sd, name: 'u'}, center: ub};
}
/* reguły Nelsona: zwraca listę naruszeń {rule (1..8), idx: [punkty]} */
function spcRules(ch, active = [1, 2, 3, 4, 5, 6, 7, 8]) {
  const x = ch.stat, N = x.length, z = x.map((v, i) => ch.sigma[i] > 0 ? (v - ch.cl[i]) / ch.sigma[i] : 0), out = [], on = r => active.includes(r);
  const add = (r, idx) => { const prev = out.find(o => o.rule === r && o.idx[o.idx.length - 1] >= idx[0] - 1); if (prev) idx.forEach(i => { if (!prev.idx.includes(i)) prev.idx.push(i); }); else out.push({rule: r, idx: idx.slice()}); };
  for (let i = 0; i < N; i++) {
    if (on(1) && (x[i] > ch.ucl[i] + 1e-12 || x[i] < ch.lcl[i] - 1e-12)) add(1, [i]);
    if (on(2) && i >= 8) { const w = z.slice(i - 8, i + 1); if (w.every(v => v > 0) || w.every(v => v < 0)) add(2, [...Array(9).keys()].map(k => i - 8 + k)); }
    if (on(3) && i >= 5) { const w = x.slice(i - 5, i + 1); let up = true, dn = true; for (let k = 1; k < 6; k++) { if (!(w[k] > w[k - 1])) up = false; if (!(w[k] < w[k - 1])) dn = false; } if (up || dn) add(3, [...Array(6).keys()].map(k => i - 5 + k)); }
    if (on(4) && i >= 13) { const w = x.slice(i - 13, i + 1); let alt = true; for (let k = 2; k < 14; k++) if (!((w[k] - w[k - 1]) * (w[k - 1] - w[k - 2]) < 0)) alt = false; if (alt) add(4, [...Array(14).keys()].map(k => i - 13 + k)); }
    if (on(5) && i >= 2) { const w = z.slice(i - 2, i + 1); if (w.filter(v => v > 2).length >= 2 && z[i] > 2 || w.filter(v => v < -2).length >= 2 && z[i] < -2) add(5, [i - 2, i - 1, i].filter(k => Math.abs(z[k]) > 2 && Math.sign(z[k]) === Math.sign(z[i]))); }
    if (on(6) && i >= 4) { const w = z.slice(i - 4, i + 1); if (w.filter(v => v > 1).length >= 4 && z[i] > 1 || w.filter(v => v < -1).length >= 4 && z[i] < -1) add(6, [0, 1, 2, 3, 4].map(k => i - 4 + k).filter(k => Math.abs(z[k]) > 1 && Math.sign(z[k]) === Math.sign(z[i]))); }
    if (on(7) && i >= 14) { const w = z.slice(i - 14, i + 1); if (w.every(v => Math.abs(v) < 1)) add(7, [...Array(15).keys()].map(k => i - 14 + k)); }
    if (on(8) && i >= 7) { const w = z.slice(i - 7, i + 1); if (w.every(v => Math.abs(v) > 1) && w.some(v => v > 0) && w.some(v => v < 0)) add(8, [...Array(8).keys()].map(k => i - 7 + k)); }
  }
  return out;
}
/* faza I: usuwamy punkty poza granicami (reguła 1 na karcie głównej i karcie rozrzutu) i przeliczamy, aż ich nie będzie */
function spcPhase1(type, D, maxIt = 20) {
  const N = type === 'imr' ? D.x.length : type === 'xr' || type === 'xs' ? D.sub.length : D.c.length, keep = Array(N).fill(true), steps = [];
  for (let it = 0; it < maxIt; it++) {
    const L = spcLimits(type, D, keep), bad = new Set();
    L.main.stat.forEach((v, i) => { if (keep[i] && (v > L.main.ucl[i] + 1e-12 || v < L.main.lcl[i] - 1e-12)) bad.add(i); });
    if (L.disp) L.disp.stat.forEach((v, i) => { const k = i + (L.disp.offset || 0); if (keep[k] && (v > L.disp.ucl[i] + 1e-12 || v < L.disp.lcl[i] - 1e-12)) bad.add(k); });
    if (!bad.size) return {keep, steps, L, converged: true};
    bad.forEach(i => { keep[i] = false; }); steps.push({removed: [...bad].sort((a, b) => a - b)});
    if (keep.filter(Boolean).length < 2) return {keep, steps, L: spcLimits(type, D, keep), converged: false};
  }
  return {keep, steps, L: spcLimits(type, D, keep), converged: false};
}
function spcCapability(all, sigmaW, LSL, USL) {
  const mu = spcMean(all), so = spcSd(all), one = (s, k) => k === 'U' ? (USL - mu) / (3 * s) : (mu - LSL) / (3 * s), r = {mu, sigmaW, sigmaO: so};
  if (LSL !== null && USL !== null) { r.Cp = (USL - LSL) / (6 * sigmaW); r.Pp = (USL - LSL) / (6 * so); }
  r.Cpk = Math.min(...[USL !== null ? one(sigmaW, 'U') : Infinity, LSL !== null ? one(sigmaW, 'L') : Infinity]); r.Ppk = Math.min(...[USL !== null ? one(so, 'U') : Infinity, LSL !== null ? one(so, 'L') : Infinity]);
  r.ppm = 1e6 * ((USL !== null ? 1 - ST.normCdf(USL, mu, sigmaW) : 0) + (LSL !== null ? ST.normCdf(LSL, mu, sigmaW) : 0)); return r;
}
function spcPareto(names, counts) {
  const ord = names.map((nm, i) => ({nm, v: counts[i]})).sort((a, b) => b.v - a.v), tot = ord.reduce((s, o) => s + o.v, 0); let cum = 0;
  return ord.map(o => { cum += o.v; return {...o, share: o.v / tot, cum: cum / tot}; });
}
function spcCusum(x, mu0, sigma, K = 0.5, H = 5) {
  const k = K * sigma, h = H * sigma; let cp = 0, cm = 0; return x.map((v, i) => { cp = Math.max(0, v - (mu0 + k) + cp); cm = Math.max(0, (mu0 - k) - v + cm); return {i, cp, cm, sig: cp > h || cm > h}; }).map(r => ({...r, h}));
}
function spcEwma(x, mu0, sigma, lam = 0.2, Lw = 3) {
  let z = mu0; return x.map((v, i) => { z = lam * v + (1 - lam) * z; const w = Lw * sigma * Math.sqrt(lam / (2 - lam) * (1 - (1 - lam) ** (2 * (i + 1)))); return {i, z, ucl: mu0 + w, lcl: mu0 - w, sig: z > mu0 + w || z < mu0 - w}; });
}
function spcARL(delta, n = 1, L = 3) { const s = delta * Math.sqrt(n), p = 1 - ST.normCdf(L - s) + ST.normCdf(-L - s); return 1 / p; }   // średnia długość przebiegu do sygnału
