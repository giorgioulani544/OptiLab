// Kolejki: przykłady z literatury (Render i Stair), Erlang B/C, równania równowagi (eliminacja Gaussa napisana tutaj), prawo Little'a, Monte Carlo (Lindley, symulacja wielostanowiskowa)
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/queue/queue-solver.js']), ST = vm.runInContext('ST', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// Render i Stair: Arnold's Muffler Shop λ = 2, μ = 3: M/M/1 L = 2, Lq = 1,333, W = 1 h, Wq = 0,667 h; dwa stanowiska: P0 = 0,5, L = 0,75, Lq = 0,083, W = 0,375 h, Wq = 0,0417 h
let R = c.quSolve('mm1', {lam: 2, mu: 3}); t('Arnold (M/M/1): L = 2, Lq = 4/3, W = 1, Wq = 2/3, ρ = 2/3', near(R.L, 2) && near(R.Lq, 4 / 3) && near(R.W, 1) && near(R.Wq, 2 / 3) && near(R.rho, 2 / 3));
R = c.quSolve('mms', {lam: 2, mu: 3, s: 2}); t('Arnold (M/M/2): P0 = 0,5, L = 0,75, Lq = 1/12, W = 0,375, Wq = 1/24', near(R.P0, 0.5) && near(R.L, 0.75) && near(R.Lq, 1 / 12) && near(R.W, 0.375) && near(R.Wq, 1 / 24));
R = c.quSolve('md1', {lam: 8, mu: 12}); t('Garcia-Golding (M/D/1, λ = 8, μ = 12): Lq = 0,667, Wq = 1/12 h', near(R.Lq, 2 / 3) && near(R.Wq, 1 / 12));
R = c.quSolve('mmsn', {lam: 0.05, mu: 0.5, s: 1, N: 5}); t('Department of Commerce (populacja 5): P0 = 0,564, Lq = 0,20, L = 0,64', Math.abs(R.P0 - 0.564) < 5e-4 && Math.abs(R.Lq - 0.2) < 0.005 && Math.abs(R.L - 0.64) < 0.005);
t('Erlang B(5 stanowisk, 2 Erl) = 0,0367; Erlang C(3, 2) = 4/9', Math.abs(c.quErlangB(5, 2) - 0.036697) < 1e-6 && near(c.quErlangC(3, 2), 4 / 9));
t('ρ ≥ 1 przy nieograniczonej kolejce → system niestabilny', c.quSolve('mm1', {lam: 3, mu: 3}).status === 'unstable' && c.quSolve('mms', {lam: 7, mu: 2, s: 3}).status === 'unstable' && c.quSolve('mg1', {lam: 5, mu: 4, sigma: 0.1}).status === 'unstable');
// równania równowagi rozwiązane eliminacją Gaussa (niezależny kod)
const gauss = (A, b) => { const n = A.length, M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; [M[k], M[p]] = [M[p], M[k]];
    for (let i = 0; i < n; i++) if (i !== k) { const f = M[i][k] / M[k][k]; for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; } } return M.map((r, i) => r[n] / r[i]); };
const balance = (lamN, muN, nmax) => { const n = nmax + 1, A = Array.from({length: n}, () => Array(n).fill(0));   // πQ = 0, Σπ = 1 (ostatnie równanie zastąpione normalizacją)
  for (let i = 0; i < n; i++) { const up = i < nmax ? lamN(i) : 0, dn = i > 0 ? muN(i) : 0; A[i][i] -= up + dn; if (i < nmax) A[i][i + 1] += up; if (i > 0) A[i][i - 1] += dn; }
  const AT = A[0].map((_, j) => A.map(r => r[j])); AT[n - 1] = Array(n).fill(1); const b = Array(n).fill(0); b[n - 1] = 1; return gauss(AT, b); };
let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 80; k++) {
  const s = 1 + Math.floor(rnd() * 5), K = s + Math.floor(rnd() * 12), N = 1 + Math.floor(rnd() * 12), lam = 0.2 + rnd() * 6, mu = 0.3 + rnd() * 4;
  for (const [m, P, ln, nm] of [['mmsk', {lam, mu, s, K}, n => n < K ? lam : 0, K], ['mm1k', {lam, mu, K}, n => n < K ? lam : 0, K], ['mmsn', {lam: lam / 4, mu, s, N}, n => (N - n) * lam / 4, N]]) {
    const ss = m === 'mm1k' ? 1 : s, R = c.quSolve(m, P), pi = balance(ln, n => Math.min(n, ss) * mu, nm);
    t(`#${k} ${m}: Pₙ = rozwiązanie równań równowagi`, R.Pn.every((v, n) => Math.abs(v - pi[n]) < 1e-9));
    t(`#${k} ${m}: prawo Little'a L = λ_ef·W i Lq = λ_ef·Wq`, near(R.L, R.lamEff * R.W) && near(R.Lq, R.lamEff * R.Wq));
  }
  const rho = 0.1 + rnd() * 0.8, Rs = c.quSolve('mms', {lam: rho * s * mu, mu, s}), pi2 = balance(() => rho * s * mu, n => Math.min(n, s) * mu, 300);
  t(`#${k} M/M/s: P0 i L zgodne z obciętym łańcuchem (300 stanów)`, Math.abs(Rs.P0 - pi2[0]) < 1e-7 && Math.abs(Rs.L - pi2.reduce((x, v, n) => x + n * v, 0)) < 1e-5 && near(Rs.L, Rs.lam * Rs.W));
}
// Monte Carlo: rekurencja Lindleya dla jednego stanowiska (M/G/1, M/D/1, M/Eₖ/1) – czas oczekiwania w kolejce
const lindley = (lam, svc, n, sd) => { const g = ST.rng(sd); let w = 0, sum = 0; for (let i = 0; i < n; i++) { const S = svc(g); sum += w; w = Math.max(0, w + S - g.exp(lam)); } return sum / n; };
for (const [m, P, svc] of [['md1', {lam: 0.7, mu: 1}, () => 1], ['mek1', {lam: 0.6, mu: 1, k: 3}, g => g.erlang(3, 3)], ['mg1', {lam: 0.5, mu: 1, sigma: 1.5}, g => g.gamma(1 / 2.25, 2.25)]]) {
  const R = c.quSolve(m, P), sim = lindley(P.lam, svc, 1500000, 77);
  t(`${m}: Wq ze wzoru Pollaczka-Chinczyna ≈ symulacja (${R.Wq.toFixed(3)} vs ${sim.toFixed(3)})`, Math.abs(sim - R.Wq) < 0.04 * R.Wq + 0.01);
}
// Monte Carlo: M/M/s – P(Wq > t) i P(W > t) z symulacji FIFO z s stanowiskami
for (const [s, lam, mu] of [[1, 0.8, 1], [3, 2.4, 1], [2, 1.5, 1.2]]) {
  const R = c.quSolve(s === 1 ? 'mm1' : 'mms', {lam, mu, s}), g = ST.rng(123 + s), free = Array(s).fill(0), n = 400000; let tA = 0, cq = 0, cw = 0, sq = 0; const t0 = 0.8;
  for (let i = 0; i < n; i++) { tA += g.exp(lam); let j = 0; for (let q = 1; q < s; q++) if (free[q] < free[j]) j = q; const st = Math.max(tA, free[j]), S = g.exp(mu); free[j] = st + S; const wq = st - tA; sq += wq; if (wq > t0) cq++; if (wq + S > t0) cw++; }
  t(`M/M/${s}: P(Wq > ${t0}) i P(W > ${t0}) ≈ symulacja`, Math.abs(cq / n - R.pWq(t0)) < 0.01 && Math.abs(cw / n - R.pW(t0)) < 0.01 && Math.abs(sq / n - R.Wq) < 0.04 * R.Wq + 0.005);
}
// koszt: optimum = minimum z przeglądu
const Cc = c.quCost('mms', {lam: 10, mu: 3}, 40, 25, 'L'); t('model kosztowy: optimum = minimum tabeli, start od najmniejszej stabilnej liczby stanowisk', Cc.rows[0].s === 4 && Cc.best.total === Math.min(...Cc.rows.map(r => r.total)));
console.log(`Testy kolejek: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
