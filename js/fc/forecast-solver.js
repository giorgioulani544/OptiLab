/* ===== OptiLab – prognozowanie: solver (czysta matematyka, bez DOM, testowalny w Node) =====
   Metody: naiwna, średnia ruchoma (k), ważona średnia ruchoma, wygładzanie wykładnicze (α), Holt (α, β), Holt-Winters addytywny
   i multiplikatywny (α, β, γ, długość sezonu s), regresja liniowa względem czasu. Błędy: MAD, MSE, RMSE, MAPE, CFE (skumulowany),
   obciążenie, sygnał kontrolny. Dobór parametrów siatką według wybranego kryterium (jak w WinQSB: MAD, CFE, MSE, MAPE).
   Konwencje inicjalizacji (różnią się między podręcznikami – opisujemy je w raporcie):
   SES: F₁ = y₁; Holt: L₁ = y₁, T₁ = y₂ − y₁; Holt-Winters: poziom = średnia 1. sezonu, trend = (średnia 2. sezonu − średnia 1.) / s,
   wskaźniki sezonowe z 1. sezonu; prognozy od okresu s + 1. Błędy liczymy od pierwszego okresu z prawdziwą prognozą. */
const FC_METHODS = {naive: 'naiwna', ma: 'średnia ruchoma', wma: 'ważona średnia ruchoma', ses: 'wygładzanie wykładnicze', holt: 'Holt (trend)', hwa: 'Holt-Winters addytywny', hwm: 'Holt-Winters multiplikatywny', reg: 'regresja liniowa (trend)'};
function fcRun(y, method, P = {}) {
  const n = y.length, F = Array(n).fill(null), h = Math.max(0, P.h ?? 0), fut = []; let start = 1, state = {};
  if (method === 'naive') { for (let t = 1; t < n; t++) F[t] = y[t - 1]; for (let j = 1; j <= h; j++) fut.push(y[n - 1]); start = 1; }
  else if (method === 'ma' || method === 'wma') {
    const w = method === 'ma' ? Array(P.k).fill(1) : P.w, k = w.length, sw = w.reduce((s, v) => s + v, 0);
    const avg = end => { let s = 0; for (let j = 0; j < k; j++) s += w[j] * y[end - k + j]; return s / sw; };   // w[k−1] – waga najnowszej obserwacji
    for (let t = k; t < n; t++) F[t] = avg(t); const last = avg(n); for (let j = 1; j <= h; j++) fut.push(last); start = k;
  } else if (method === 'ses') {
    const a = P.alpha; F[0] = y[0]; for (let t = 1; t < n; t++) F[t] = a * y[t - 1] + (1 - a) * F[t - 1];
    const nx = a * y[n - 1] + (1 - a) * F[n - 1]; for (let j = 1; j <= h; j++) fut.push(nx); start = 1;
  } else if (method === 'holt') {
    const a = P.alpha, b = P.beta, L = [y[0]], T = [y[1] - y[0]];
    for (let t = 1; t < n; t++) { F[t] = L[t - 1] + T[t - 1]; L[t] = a * y[t] + (1 - a) * (L[t - 1] + T[t - 1]); T[t] = b * (L[t] - L[t - 1]) + (1 - b) * T[t - 1]; }
    for (let j = 1; j <= h; j++) fut.push(L[n - 1] + j * T[n - 1]); start = 2; state = {L, T};
  } else if (method === 'hwa' || method === 'hwm') {
    const s = P.L, a = P.alpha, b = P.beta, g = P.gamma, mul = method === 'hwm', m1 = y.slice(0, s).reduce((p, v) => p + v, 0) / s, m2 = y.slice(s, 2 * s).reduce((p, v) => p + v, 0) / s;
    const S = Array(n).fill(0), L = Array(n).fill(0), T = Array(n).fill(0);
    for (let i = 0; i < s; i++) S[i] = mul ? y[i] / m1 : y[i] - m1;
    L[s - 1] = m1; T[s - 1] = (m2 - m1) / s;
    for (let t = s; t < n; t++) {
      F[t] = mul ? (L[t - 1] + T[t - 1]) * S[t - s] : L[t - 1] + T[t - 1] + S[t - s];
      L[t] = a * (mul ? y[t] / S[t - s] : y[t] - S[t - s]) + (1 - a) * (L[t - 1] + T[t - 1]);
      T[t] = b * (L[t] - L[t - 1]) + (1 - b) * T[t - 1];
      S[t] = g * (mul ? y[t] / L[t] : y[t] - L[t]) + (1 - g) * S[t - s];
    }
    for (let j = 1; j <= h; j++) { const si = S[n - s + ((j - 1) % s)]; fut.push(mul ? (L[n - 1] + j * T[n - 1]) * si : L[n - 1] + j * T[n - 1] + si); }
    start = s; state = {L, T, S, m1, m2};
  } else if (method === 'reg') {
    const tb = (n + 1) / 2, yb = y.reduce((p, v) => p + v, 0) / n; let sxy = 0, sxx = 0, syy = 0;
    y.forEach((v, i) => { sxy += (i + 1 - tb) * (v - yb); sxx += (i + 1 - tb) ** 2; syy += (v - yb) ** 2; });
    const bb = sxx > 0 ? sxy / sxx : 0, aa = yb - bb * tb; for (let t = 0; t < n; t++) F[t] = aa + bb * (t + 1);
    for (let j = 1; j <= h; j++) fut.push(aa + bb * (n + j)); start = 0; state = {a: aa, b: bb, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1};
  } else throw new Error('nieznana metoda ' + method);
  return {F, fut, start, state, err: fcErrors(y, F, start)};
}
function fcErrors(y, F, start) {
  const rows = []; let cum = 0, sa = 0;
  for (let t = start; t < y.length; t++) { if (F[t] === null) continue; const e = y[t] - F[t]; cum += e; sa += Math.abs(e); const cnt = rows.length + 1;
    rows.push({t, e, ae: Math.abs(e), e2: e * e, pe: y[t] !== 0 ? Math.abs(e / y[t]) : null, cfe: cum, mad: sa / cnt, ts: sa > 0 ? cum / (sa / cnt) : 0}); }
  const m = rows.length, pes = rows.filter(r => r.pe !== null);
  return {rows, n: m, MAD: m ? sa / m : NaN, MSE: m ? rows.reduce((s, r) => s + r.e2, 0) / m : NaN, RMSE: m ? Math.sqrt(rows.reduce((s, r) => s + r.e2, 0) / m) : NaN,
    MAPE: pes.length ? 100 * pes.reduce((s, r) => s + r.pe, 0) / pes.length : NaN, CFE: cum, bias: m ? cum / m : NaN, TS: m && sa > 0 ? cum / (sa / m) : 0, mapeSkipped: m - pes.length};
}
/* dobór parametrów siatką według kryterium: 'MSE' | 'MAD' | 'MAPE' | 'CFE' (|CFE|) */
function fcOptimize(y, method, P, crit = 'MSE') {
  const keys = {ses: ['alpha'], holt: ['alpha', 'beta'], hwa: ['alpha', 'beta', 'gamma'], hwm: ['alpha', 'beta', 'gamma']}[method]; if (!keys) return null;
  const step = keys.length === 1 ? 0.01 : keys.length === 2 ? 0.05 : 0.1, grid = []; for (let v = step; v < 1 - 1e-9; v += step) grid.push(Math.round(v * 1000) / 1000);
  const score = e => crit === 'CFE' ? Math.abs(e.CFE) : e[crit];
  let best = null, tried = 0; const cur = {...P};
  const go = i => { if (i === keys.length) { const r = fcRun(y, method, cur), sc = score(r.err); tried++; if (isFinite(sc) && (!best || sc < best.score - 1e-12)) best = {score: sc, P: {...cur}}; return; } grid.forEach(v => { cur[keys[i]] = v; go(i + 1); }); };
  go(0); return {...best, step, tried, crit};
}
