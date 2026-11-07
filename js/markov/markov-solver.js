/* ===== OptiLab – procesy Markowa: solver (bez DOM, testowalny w Node; korzysta z js/linalg.js) =====
   Łańcuch dyskretny: walidacja macierzy przejść, rozkład po n krokach, klasy komunikujące (Tarjan), stany pochłaniające / powracające / chwilowe, okres,
   rozkład stacjonarny (jednoznaczność), łańcuchy pochłaniające (macierz fundamentalna N = (I − Q)⁻¹, B = N·R, t = N·1), średnie czasy pierwszego przejścia.
   Łańcuch z czasem ciągłym: generator Q z intensywności, rozkład stacjonarny πQ = 0, średnie czasy przebywania. */
const MK_TOL = 1e-6;
function mkCheck(P, ctmc = false) {
  const errs = [];
  P.forEach((r, i) => { r.forEach((v, j) => { if (!isFinite(v) || v < 0 || (!ctmc && v > 1 + 1e-12)) errs.push({i, j, msg: ctmc ? 'intensywności przejść muszą być nieujemne.' : 'prawdopodobieństwa muszą należeć do [0; 1].'}); });
    if (!ctmc) { const s = r.reduce((a, b) => a + b, 0); if (Math.abs(s - 1) > MK_TOL) errs.push({i, row: true, msg: `suma wiersza ${i + 1} wynosi ${Math.round(s * 1e6) / 1e6}, a musi być równa 1.`}); } });
  return errs;
}
function mkClasses(P) {                                                // klasy komunikujące (Tarjan), zamknięte = powracające (łańcuch skończony), okres
  const n = P.length, adj = P.map(r => r.map((v, j) => v > 0 ? j : -1).filter(j => j >= 0)), idx = Array(n).fill(-1), low = Array(n).fill(0), on = Array(n).fill(false), st = [], comps = []; let c = 0;
  const strong = v => { idx[v] = low[v] = c++; st.push(v); on[v] = true;
    adj[v].forEach(w => { if (idx[w] < 0) { strong(w); low[v] = Math.min(low[v], low[w]); } else if (on[w]) low[v] = Math.min(low[v], idx[w]); });
    if (low[v] === idx[v]) { const comp = []; let w; do { w = st.pop(); on[w] = false; comp.push(w); } while (w !== v); comps.push(comp.sort((a, b) => a - b)); } };
  for (let v = 0; v < n; v++) if (idx[v] < 0) strong(v);
  comps.sort((a, b) => a[0] - b[0]);
  const cls = Array(n); comps.forEach((cp, k) => cp.forEach(v => { cls[v] = k; }));
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const info = comps.map(cp => { const set = new Set(cp), closed = cp.every(v => adj[v].every(w => set.has(w)));
    const lev = new Map([[cp[0], 0]]), q = [cp[0]]; let g = 0;                 // okres: NWD (poziom(u) + 1 − poziom(v)) po krawędziach w klasie
    while (q.length) { const u = q.shift(); adj[u].forEach(w => { if (!set.has(w)) return; if (!lev.has(w)) { lev.set(w, lev.get(u) + 1); q.push(w); } else g = gcd(g, Math.abs(lev.get(u) + 1 - lev.get(w))); }); }
    const hasEdge = cp.some(v => adj[v].some(w => set.has(w)));
    return {states: cp, closed, period: hasEdge ? g : null, absorbing: cp.length === 1 && P[cp[0]][cp[0]] >= 1 - 1e-12}; });
  return {cls, comps: info};
}
function mkStationaryOn(P, states) {                                    // rozkład stacjonarny na zamkniętej klasie
  const m = states.length, A = Array.from({length: m}, (_, r) => states.map((_, cI) => (r === cI ? -1 : 0) + P[states[cI]][states[r]]));
  A[m - 1] = Array(m).fill(1); const b = Array(m).fill(0); b[m - 1] = 1; return LA.solve(A, b);
}
function mkAnalyze(P, p0 = null, nSteps = 0) {
  const n = P.length, C = mkClasses(P), closed = C.comps.filter(k => k.closed), out = {n, classes: C};
  out.stat = closed.map(k => { const x = mkStationaryOn(P, k.states), pi = Array(n).fill(0); if (x) k.states.forEach((s, i) => { pi[s] = x[i]; }); return {k, pi}; });
  out.unique = closed.length === 1; out.pi = out.unique ? out.stat[0].pi : null;
  out.regular = out.unique && closed[0].states.length === n && closed[0].period === 1;
  if (p0) { const seq = [p0.slice()]; let p = p0.slice(); const N = Math.max(nSteps, Math.min(60, Math.max(20, nSteps))); for (let k = 1; k <= N; k++) { p = LA.vecMul(p, P); seq.push(p); } out.seq = seq; out.pn = seq[nSteps]; }
  out.Pn = LA.pow(P, nSteps);
  const tr = [...Array(n).keys()].filter(i => !C.comps[C.cls[i]].closed);
  if (tr.length && closed.length) {                                     // pochłanianie w klasach zamkniętych
    const Q = tr.map(i => tr.map(j => P[i][j])), IQ = Q.map((r, i) => r.map((v, j) => (i === j ? 1 : 0) - v)), N = LA.inv(IQ);
    if (N) { const R = tr.map(i => closed.map(k => k.states.reduce((s, j) => s + P[i][j], 0))); out.abs = {tr, closed, N, B: LA.mul(N, R), t: N.map(r => r.reduce((s, v) => s + v, 0))}; }
  }
  if (out.unique && closed[0].states.length === n) {                    // łańcuch nieprzywiedlny: średnie czasy pierwszego przejścia
    out.mfpt = Array.from({length: n}, () => Array(n).fill(0));
    for (let j = 0; j < n; j++) { const others = [...Array(n).keys()].filter(k => k !== j), A = others.map(i => others.map(k => (i === k ? 1 : 0) - P[i][k])), x = LA.solve(A, others.map(() => 1));
      others.forEach((i, r) => { out.mfpt[i][j] = x ? x[r] : NaN; }); out.mfpt[j][j] = 1 / out.pi[j]; }
  }
  return out;
}
function mkCTMC(Qr) {                                                   // Qr – intensywności przejść (przekątna ignorowana)
  const n = Qr.length, Q = Qr.map((r, i) => r.map((v, j) => i === j ? 0 : v)); Q.forEach((r, i) => { r[i] = -r.reduce((s, v) => s + v, 0); });
  const A = Array.from({length: n}, (_, r) => Array.from({length: n}, (_, cI) => Q[cI][r])); A[n - 1] = Array(n).fill(1); const b = Array(n).fill(0); b[n - 1] = 1;
  const C = mkClasses(Qr.map((r, i) => r.map((v, j) => i === j ? 0 : v))), closed = C.comps.filter(k => k.closed);
  const pi = closed.length === 1 ? LA.solve(A, b) : null, hold = Q.map((r, i) => -r[i] > 0 ? 1 / -r[i] : Infinity);
  const jump = Q.map((r, i) => r.map((v, j) => i === j ? (r[i] === 0 ? 1 : 0) : (r[i] === 0 ? 0 : v / -r[i])));
  return {Q, pi, unique: closed.length === 1, hold, jump, classes: C};
}
