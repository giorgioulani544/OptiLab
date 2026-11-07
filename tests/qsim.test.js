// Symulacja kolejek: determinizm (to samo ziarno), przebieg policzony ręcznie, D/D/1, M/M/1 i M/M/s vs wzory (tolerancja statystyczna), pokrycie przedziałów ufności ≈ 95%, odrzucenia vs Erlang B, prawo Little'a
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/qsim/qsim-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const EXP = m => ({type: 'exp', mean: m});
// przebieg ręczny: przyjścia co 1 (od t = 1), obsługa 1,5, jedno stanowisko → oczekiwania 0; 0,5; 1,0; 1,5 …
const H = c.qsRun({arr: {type: 'const', value: 1}, svc: {type: 'const', value: 1.5}, s: 1, K: null, T: 6.2, warm: 0, trace: 50}, 1);
t('przebieg ręczny: kolejne oczekiwania 0; 0,5; 1,0 (przyjścia co 1, obsługa 1,5)', H.trace.filter(e => e.type === 'przyjście').length === 6 && near(H.wq[0], 0) && near(H.wq[1], 0.5) && near(H.wq[2], 1.0));
t('przebieg ręczny: pierwsze zdarzenia w dobrej kolejności (t = 1 przyjście, 2 przyjście, 2,5 koniec obsługi)', H.trace[0].type === 'przyjście' && near(H.trace[0].t, 1) && H.trace[1].type === 'przyjście' && near(H.trace[1].t, 2) && H.trace[2].type === 'koniec obsługi' && near(H.trace[2].t, 2.5));
const D = c.qsRun({arr: {type: 'const', value: 2}, svc: {type: 'const', value: 1}, s: 1, K: null, T: 1001, warm: 1, trace: 0}, 3);
t('D/D/1 (przyjścia co 2, obsługa 1): brak kolejki, wykorzystanie 50%, L = 0,5', near(D.Wq, 0) && Math.abs(D.util - 0.5) < 1e-3 && Math.abs(D.L - 0.5) < 1e-3);
const P1 = {arr: EXP(1 / 0.8), svc: EXP(1), s: 1, K: null, T: 20000, warm: 500, trace: 0};
t('determinizm: to samo ziarno → identyczny wynik', c.qsRun(P1, 42).Wq === c.qsRun(P1, 42).Wq && c.qsRun(P1, 42).Wq !== c.qsRun(P1, 43).Wq);
const R1 = c.qsReplicate(P1, 20, 100), th = 0.8 / (1 - 0.8);                               // M/M/1, ρ = 0,8: Wq = ρ/(μ − λ) = 4, L = 4
t(`M/M/1: średnia z 20 powtórzeń ≈ teoria (Wq = 4, L = 4): ${R1.ci.Wq.m.toFixed(2)}, ${R1.ci.L.m.toFixed(2)}`, Math.abs(R1.ci.Wq.m - 4) < 0.35 && Math.abs(R1.ci.L.m - th) < 0.35 && Math.abs(R1.ci.util.m - 0.8) < 0.02);
t('prawo Little\'a w symulacji: L ≈ λ_ef·W', R1.runs.every(r => Math.abs(r.L - r.lamEff * r.W) < 0.05 * r.L + 0.05));
// pokrycie przedziałów ufności dla M/M/2 (ρ = 0,5): Wq = C/(sμ − λ) = 1/3 (λ = 1, μ = 1)
let cover = 0; const NS = 60, P2 = {arr: EXP(1), svc: EXP(1), s: 2, K: null, T: 3000, warm: 200, trace: 0};
for (let k = 0; k < NS; k++) { const R = c.qsReplicate(P2, 8, 1000 + 50 * k); if (Math.abs(R.ci.Wq.m - 1 / 3) <= R.ci.Wq.h) cover++; }
t(`pokrycie 95% przedziałów ufności dla Wq ≈ 95% (${cover}/${NS})`, cover / NS >= 0.85);
// M/M/3/3: odsetek odrzuceń ≈ Erlang B(3, a = 2) = (8/6)/(1 + 2 + 2 + 8/6) = 0,2105
const R3 = c.qsReplicate({arr: EXP(0.5), svc: EXP(1), s: 3, K: 3, T: 20000, warm: 200, trace: 0}, 10, 7), B = (8 / 6) / (1 + 2 + 2 + 8 / 6);
t(`M/M/3/3: odsetek odrzuceń ≈ Erlang B = 0,2105 (${R3.ci.rejFrac.m.toFixed(4)})`, Math.abs(R3.ci.rejFrac.m - B) < 0.01 && R3.runs.every(r => r.maxQ === 0));
// rozkłady: średnie próbek ≈ momenty (normalny obcięty – wzór dokładny)
const g = vm.runInContext('ST', c).rng(5); for (const d of [{type: 'uni', a: 1, b: 3}, {type: 'erl', k: 3, mean: 2}, {type: 'norm', mean: 1, sd: 1}, {type: 'emp', table: [{v: 1, p: 0.2}, {v: 4, p: 0.8}]}]) {
  const f = c.qsSampler(d, g), N = 300000; let s = 0, s2 = 0; for (let i = 0; i < N; i++) { const x = f(); s += x; s2 += x * x; } const m = s / N, v = s2 / N - m * m, M = c.qsMoments(d);
  t(`rozkład ${d.type}: średnia i wariancja próbki ≈ momenty`, Math.abs(m - M.m) < 0.01 * (1 + M.m) && Math.abs(v - M.v) < 0.03 * (1 + M.v)); }
// wspólne liczby losowe: porównanie s = 1 i s = 2 – różnica sparowana z mniejszym rozrzutem niż przy niezależnych próbach
const CR = c.qsCompare({arr: EXP(1 / 0.7), svc: EXP(1), s: 1, K: null, T: 3000, warm: 200, trace: 0}, 2, 12, 300);
t('wspólne liczby losowe: druga konfiguracja wyraźnie lepsza, przedział różnicy nie obejmuje 0', CR.d.m > 0 && CR.d.m - CR.d.h > 0);
// losowe M/M/s/K: L i odsetek odrzuceń ≈ dokładny rozkład (iloczyny λ/μ liczone tutaj)
let sd = 77; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 8; k++) {
  const s = 1 + Math.floor(rr() * 3), K = s + Math.floor(rr() * 5), lam = 0.5 + rr() * 2.5, mu = 0.6 + rr() * 1.5, w = [1];
  for (let n = 1; n <= K; n++) w.push(w[n - 1] * lam / (Math.min(n, s) * mu)); const Z = w.reduce((a, b) => a + b, 0), p = w.map(v => v / Z), L = p.reduce((a, v, n) => a + n * v, 0);
  const R = c.qsReplicate({arr: EXP(1 / lam), svc: EXP(1 / mu), s, K, T: 8000, warm: 200, trace: 0}, 6, 500 + k);
  t(`#${k} M/M/${s}/${K}: L i odsetek odrzuceń ≈ rozkład dokładny`, Math.abs(R.ci.L.m - L) < 0.04 * L + 0.03 && Math.abs(R.ci.rejFrac.m - p[K]) < 0.015);
}
console.log(`Testy symulacji kolejek: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
