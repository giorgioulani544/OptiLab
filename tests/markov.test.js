// Procesy Markowa: łańcuch dwustanowy (wzór zamknięty), iteracja potęgowa (napisana tutaj) vs układ liniowy, ruina gracza (wzory zamknięte),
// symulacja czasów pierwszego przejścia, klasyfikacja stanów na przykładach ręcznych, łańcuch z czasem ciągłym (dwustanowy, M/M/1/K wzorem)
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/linalg.js', 'js/markov/markov-solver.js']), ST = vm.runInContext('ST', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 60; k++) {                                         // dwustanowy: π = (b, a)/(a + b), Pⁿ wzorem
  const a = 0.05 + rnd() * 0.9, b = 0.05 + rnd() * 0.9, n = Math.floor(rnd() * 15), R = c.mkAnalyze([[1 - a, a], [b, 1 - b]], [1, 0], n), l = (1 - a - b) ** n;
  t(`#${k} dwustanowy: π = (b/(a+b), a/(a+b))`, near(R.pi[0], b / (a + b)) && near(R.pi[1], a / (a + b)));
  t(`#${k} dwustanowy: Pⁿ ze wzoru zamkniętego`, near(R.Pn[0][0], (b + a * l) / (a + b)) && near(R.Pn[1][0], (b - b * l) / (a + b)) && near(R.pn[0], (b + a * l) / (a + b)));
}
for (let k = 0; k < 80; k++) {                                         // losowe łańcuchy regularne: iteracja potęgowa, πP = π, średni czas powrotu = 1/π
  const n = 2 + Math.floor(rnd() * 7), P = Array.from({length: n}, () => { const r = Array.from({length: n}, () => rnd() + 0.01), s = r.reduce((x, y) => x + y, 0); return r.map(v => v / s); });
  const R = c.mkAnalyze(P, null, 0); let p = Array(n).fill(1 / n); for (let it = 0; it < 3000; it++) p = p.map((_, j) => p.reduce((s, x, i) => s + x * P[i][j], 0));
  t(`#${k} rozkład stacjonarny = iteracja potęgowa`, R.unique && R.regular && R.pi.every((v, i) => Math.abs(v - p[i]) < 1e-10));
  const j = Math.floor(rnd() * n), i0 = (j + 1) % n, M = R.mfpt;
  t(`#${k} czasy pierwszego przejścia spełniają m_ij = 1 + Σ_{k≠j} P_ik·m_kj, m_jj = 1/π_j`, near(M[i0][j], 1 + P[i0].reduce((s, v, kk) => s + (kk === j ? 0 : v * M[kk][j]), 0), 1e-9) && near(M[j][j], 1 / R.pi[j]));
}
{ // symulacja: średni czas pierwszego przejścia 0 → 2 w łańcuchu 3-stanowym
  const P = [[0.5, 0.3, 0.2], [0.2, 0.5, 0.3], [0.3, 0.3, 0.4]], R = c.mkAnalyze(P), g = ST.rng(9); let sum = 0, N = 200000;
  for (let r = 0; r < N; r++) { let s = 0, steps = 0; do { const u = g.u(); s = u < P[s][0] ? 0 : u < P[s][0] + P[s][1] ? 1 : 2; steps++; } while (s !== 2); sum += steps; }
  t('średni czas pierwszego przejścia 0 → 2 ≈ symulacja', Math.abs(sum / N - R.mfpt[0][2]) < 0.02 * R.mfpt[0][2]);
}
for (const [p, N] of [[0.4, 6], [0.55, 8], [0.5, 5]]) {                // ruina gracza: wzory zamknięte
  const q = 1 - p, P = Array.from({length: N + 1}, (_, i) => Array.from({length: N + 1}, (_, j) => i === 0 || i === N ? +(i === j) : j === i + 1 ? p : j === i - 1 ? q : 0)), R = c.mkAnalyze(P);
  const win = i => p === 0.5 ? i / N : (1 - (q / p) ** i) / (1 - (q / p) ** N), dur = i => p === 0.5 ? i * (N - i) : i / (q - p) - N / (q - p) * win(i);
  const top = R.abs.closed.findIndex(k => k.states[0] === N);
  t(`ruina gracza p = ${p}, N = ${N}: prawdopodobieństwa wygranej i średni czas gry`, R.abs.tr.every((i, r) => near(R.abs.B[r][top], win(i), 1e-9) && near(R.abs.t[r], dur(i), 1e-9)));
  t(`ruina gracza: dwa stany pochłaniające, pozostałe chwilowe`, R.classes.comps.filter(k => k.absorbing).length === 2 && R.abs.tr.length === N - 1);
}
{ // klasyfikacja: stany 0,1 – klasa zamknięta okresowa (okres 2); 2 – chwilowy; 3,4,5 – cykl (okres 3); 6 – pochłaniający
  const P = [[0, 1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0], [0.2, 0, 0.3, 0.2, 0, 0, 0.3], [0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 1]], C = c.mkClasses(P);
  const k = s => C.comps[C.cls[s]];
  t('klasyfikacja: okres 2, okres 3, stan chwilowy, stan pochłaniający', k(0).closed && k(0).period === 2 && k(3).closed && k(3).period === 3 && !k(2).closed && k(6).absorbing && C.comps.length === 4);
  const R = c.mkAnalyze(P); t('trzy klasy zamknięte → rozkład stacjonarny niejednoznaczny', !R.unique && R.stat.length === 3);
  t('walidacja: suma wiersza ≠ 1 i wartość ujemna wykryte', c.mkCheck([[0.5, 0.4], [0.2, 0.8]]).length === 1 && c.mkCheck([[1.2, -0.2], [0.5, 0.5]]).length === 2);
}
{ // czas ciągły: dwustanowy (λ, μ) → π = (μ, λ)/(λ + μ); M/M/1/K jako łańcuch → wzór na pₙ = ρⁿ(1 − ρ)/(1 − ρ^(K+1))
  const lam = 1.7, mu = 2.9, R = c.mkCTMC([[0, lam], [mu, 0]]); t('czas ciągły, dwa stany: π = (μ, λ)/(λ + μ), czasy przebywania 1/λ i 1/μ', near(R.pi[0], mu / (lam + mu)) && near(R.hold[0], 1 / lam) && near(R.hold[1], 1 / mu));
  const K = 6, l = 2, m = 3, Q = Array.from({length: K + 1}, (_, i) => Array.from({length: K + 1}, (_, j) => j === i + 1 ? l : j === i - 1 ? m : 0)), r = l / m, Rq = c.mkCTMC(Q);
  t('czas ciągły: łańcuch M/M/1/K → pₙ = ρⁿ(1 − ρ)/(1 − ρ^(K+1))', Rq.pi.every((v, n) => near(v, r ** n * (1 - r) / (1 - r ** (K + 1)), 1e-9)));
}
console.log(`Testy procesów Markowa: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
