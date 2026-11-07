/* ===== OptiLab – kolejki: solver (wzory zamknięte, bez DOM, testowalny w Node) =====
   M/M/1, M/M/s, M/M/1/K, M/M/s/K, M/G/1 (Pollaczek-Chinczyn), M/D/1, M/Eₖ/1, populacja skończona M/M/s//N.
   Modele skończone liczone jako proces narodzin i śmierci (logarytmy – bez przepełnienia), nieskończone – wzorami (Erlang C).
   Status 'unstable' gdy ρ ≥ 1 przy nieograniczonej kolejce – wtedy nie podajemy miar (kolejka rośnie bez końca). */
const QU_MODELS = {mm1: 'M/M/1', mms: 'M/M/s', mm1k: 'M/M/1/K', mmsk: 'M/M/s/K', mg1: 'M/G/1', md1: 'M/D/1', mek1: 'M/Eₖ/1', mmsn: 'M/M/s//N (populacja skończona)'};
const quLogFact = n => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log(k); return s; };
function quErlangB(s, a) { let B = 1; for (let k = 1; k <= s; k++) B = a * B / (k + a * B); return B; }   // rekurencja – stabilna numerycznie
function quErlangC(s, a) { const B = quErlangB(s, a), r = a / s; return r >= 1 ? 1 : B / (1 - r * (1 - B)); }
function quBD(lamN, muN, nmax) {                                         // proces narodzin i śmierci na stanach 0..nmax: rozkład stacjonarny
  const lp = [0]; for (let n = 0; n < nmax; n++) lp.push(lp[n] + Math.log(lamN(n)) - Math.log(muN(n + 1)));
  const mx = Math.max(...lp.filter(isFinite)), w = lp.map(v => isFinite(v) ? Math.exp(v - mx) : 0), Z = w.reduce((s, v) => s + v, 0); return w.map(v => v / Z);
}
function quSolve(m, P) {
  const {lam, mu} = P, s = ['mm1', 'mm1k', 'mg1', 'md1', 'mek1'].includes(m) ? 1 : P.s, a = lam / mu, out = {m, lam, mu, s, a};
  if (m === 'mm1' || m === 'mms') {
    const rho = a / s; out.rho = rho; if (rho >= 1 - 1e-12) return {...out, status: 'unstable'};
    const C = quErlangC(s, a), P0 = 1 / (Array.from({length: s}, (_, n) => Math.exp(n * Math.log(a) - quLogFact(n))).reduce((x, y) => x + y, 0) + Math.exp(s * Math.log(a) - quLogFact(s)) / (1 - rho));
    const Lq = C * rho / (1 - rho), L = Lq + a, Wq = Lq / lam, W = Wq + 1 / mu;
    const pn = n => P0 * Math.exp(n * Math.log(a) - (n <= s ? quLogFact(n) : quLogFact(s) + (n - s) * Math.log(s)));
    const pWq = t => C * Math.exp(-(s * mu - lam) * t), k = s - 1 - a;
    const pW = s === 1 ? (t => Math.exp(-mu * (1 - rho) * t)) : (t => Math.abs(k) < 1e-9 ? Math.exp(-mu * t) * (1 + C * mu * t) : Math.exp(-mu * t) * (1 + C * (1 - Math.exp(-mu * t * k)) / k));
    let nmax = s; while (nmax < 400 && pn(nmax) > 1e-6) nmax++;
    return {...out, status: 'ok', P0, Pn: Array.from({length: nmax + 1}, (_, n) => pn(n)), L, Lq, W, Wq, lamEff: lam, Pwait: C, pWq, pW, util: rho};
  }
  if (m === 'mg1' || m === 'md1' || m === 'mek1') {
    const rho = a; out.rho = rho; if (rho >= 1 - 1e-12) return {...out, status: 'unstable'};
    const sig2 = m === 'md1' ? 0 : m === 'mek1' ? 1 / (P.k * mu * mu) : P.sigma ** 2, Lq = (lam * lam * sig2 + rho * rho) / (2 * (1 - rho)), L = Lq + rho, Wq = Lq / lam, W = Wq + 1 / mu;
    return {...out, status: 'ok', P0: 1 - rho, Pn: null, L, Lq, W, Wq, lamEff: lam, Pwait: rho, sig2, util: rho};
  }
  // modele skończone: M/M/1/K, M/M/s/K, M/M/s//N
  const K = m === 'mmsn' ? P.N : P.K, lamN = m === 'mmsn' ? (n => (P.N - n) * lam) : (n => n < K ? lam : 0), muN = n => Math.min(n, s) * mu;
  const p = quBD(lamN, muN, K), L = p.reduce((x, v, n) => x + n * v, 0), Lq = p.reduce((x, v, n) => x + Math.max(0, n - s) * v, 0);
  const lamEff = p.reduce((x, v, n) => x + lamN(n) * v, 0), W = lamEff > 0 ? L / lamEff : 0, Wq = lamEff > 0 ? Lq / lamEff : 0;
  const Pwait = lamEff > 0 ? p.reduce((x, v, n) => x + (n >= s ? lamN(n) * v : 0), 0) / lamEff : 0;
  return {...out, status: 'ok', rho: m === 'mmsn' ? null : a / s, P0: p[0], Pn: p, L, Lq, W, Wq, lamEff, Pwait, Pblock: m === 'mmsn' ? null : p[K], util: lamEff / (s * mu), K};
}
/* koszt: s·Cs + Cw·(L albo Lq) [+ Cb·λ·P(odrzucenia)] dla kolejnych liczb stanowisk */
function quCost(m, P, Cs, Cw, base = 'L', Cb = 0, span = 15) {
  const s0 = m === 'mms' ? Math.floor(P.lam / P.mu + 1e-12) + 1 : 1, rows = [];
  for (let s = s0; s <= s0 + span; s++) { if ((m === 'mmsk' && s > P.K)) break; const R = quSolve(m, {...P, s}); if (R.status !== 'ok') continue;
    const wait = Cw * (base === 'L' ? R.L : R.Lq), lost = Cb * P.lam * (R.Pblock || 0); rows.push({s, R, serv: s * Cs, wait, lost, total: s * Cs + wait + lost}); }
  const best = rows.length ? rows.reduce((x, y) => y.total < x.total - 1e-12 ? y : x) : null; return {rows, best};
}
