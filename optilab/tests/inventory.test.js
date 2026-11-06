// Zapasy: wartości z literatury (Hillier i Lieberman, Gallego – przykłady z pakietu SCperf), wzory zamknięte sprawdzane numerycznie, przegląd dla rabatów i gazeciarza, Monte Carlo
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/inv/inventory-solver.js']), ST = vm.runInContext('ST', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// literatura
let R = c.invEOQ({D: 8000, S: 12000, H: 0.3}); t('EOQ (Hillier–Lieberman): Q ≈ 25 298, koszt ≈ 7589,5', Math.round(R.Q) === 25298 && Math.abs(R.TCv - 7589.5) < 0.1);
R = c.invBack({D: 8000, S: 12000, H: 0.3, b: 1.1}); t('braki planowane: Q ≈ 28 540, maks. brak ≈ 6116, koszt ≈ 6727,3', Math.round(R.Q) === 28540 && Math.round(R.Smax) === 6116 && Math.abs(R.TCv - 6727.3) < 0.15);
R = c.invEPQ({D: 200, S: 100, H: 5, p: 1000}); t('EPQ: Q = 100, Imax = 80, koszt 400, czas produkcji 0,1, cykl 0,5', near(R.Q, 100) && near(R.Imax, 80) && near(R.TCv, 400) && near(R.tp, 0.1) && near(R.T, 0.5));
R = c.invNews({p: 4, c: 1, normal: {mu: 100, sd: 30}}); t('gazeciarz (Gallego): Q ≈ 120,23, zysk ≈ 261,87, koszt niedopasowania ≈ 38,13, wypełnienie ≈ 0,96', Math.abs(R.Q - 120.23) < 0.01 && Math.abs(R.profit - 261.87) < 0.01 && Math.abs(R.mismatch - 38.13) < 0.01 && Math.round(R.fill * 100) === 96);
R = c.invNews({p: 4, c: 1, normal: {mu: 100, sd: 20}}); t('gazeciarz (Gallego, σ = 20): Q ≈ 113,49, zysk ≈ 274,58', Math.abs(R.Q - 113.49) < 0.01 && Math.abs(R.profit - 274.58) < 0.01);
R = c.invROP({mu: 20, sd: 4, L: 9, alpha: 0.95}); t('zapas bezpieczeństwa: z(95%) = 1,645, SS = 1,645·4·√9 = 19,74, ROP = 199,74', near(R.z, 1.644854, 1e-6) && near(R.SS, 1.644854 * 12, 1e-6) && near(R.ROP, 180 + 1.644854 * 12, 1e-6));
// wzory zamknięte = minimum numeryczne (losowe dane)
let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + rnd() * (b - a);
for (let k = 0; k < 120; k++) {
  const D = rr(50, 50000), S = rr(5, 5000), H = rr(0.1, 50), p = D * rr(1.1, 5), b = rr(0.5, 100);
  for (const [nm, R] of [['EOQ', c.invEOQ({D, S, H})], ['EPQ', c.invEPQ({D, S, H, p})], ['braki', c.invBack({D, S, H, b})]]) {
    const f = R.tc, q = R.Q, d = (f(q * (1 + 1e-5)) - f(q * (1 - 1e-5))) / (2e-5 * q);
    t(`#${k} ${nm}: pochodna kosztu w optimum ≈ 0 i koszt minimalny na siatce`, Math.abs(d) * q < 1e-6 * f(q) && [0.5, 0.8, 0.95, 1.05, 1.3, 2].every(m => f(q * m) >= f(q) - 1e-9 * f(q)));
  }
  // braki: przegląd siatki (Q, S) z niezależną funkcją kosztu
  const B = c.invBack({D, S, H, b}); let best = Infinity;
  for (let i = 1; i <= 60; i++) for (let j = 0; j <= 60; j++) { const Q = B.Q * (0.7 + 0.6 * i / 60), Sm = Q * j / 60, cost = D * S / Q + H * (Q - Sm) ** 2 / (2 * Q) + b * Sm * Sm / (2 * Q); best = Math.min(best, cost); }
  t(`#${k} braki: optimum ≤ każdy punkt siatki (Q, S)`, B.TCv <= best + 1e-9 * best);
}
// rabaty: przegląd wszystkich całkowitych Q z niezależnie policzonym kosztem zakupu
for (let k = 0; k < 120; k++) {
  const D = Math.round(rr(500, 20000)), S = rr(10, 400), n = 2 + Math.floor(rnd() * 3), type = rnd() < .5 ? 'all' : 'inc', hMode = rnd() < .5 ? 'const' : 'rate';
  const from = [0]; for (let j = 1; j < n; j++) from.push(from[j - 1] + Math.round(rr(50, 900))); let pr = rr(5, 50); const tiers = from.map(f => { const x = {from: f, price: pr}; pr *= rr(0.85, 0.98); return x; });
  const H = rr(0.5, 5), i = rr(0.05, 0.4), args = {D, S, H, i, tiers, type, hMode}, Rr = c.invDisc(args);
  const buy = q => { if (type === 'all') { let pp = tiers[0].price; tiers.forEach(t2 => { if (q >= t2.from) pp = t2.price; }); return q * pp; }
    let s = 0; tiers.forEach((t2, j) => { const to = j + 1 < tiers.length ? tiers[j + 1].from : Infinity; if (q > t2.from) s += (Math.min(q, to) - t2.from) * t2.price; }); return s; };
  const cost = q => D * S / q + (hMode === 'rate' ? i * buy(q) / 2 : H * q / 2) + D * buy(q) / q;
  let bq = 1, bc = cost(1); const qmax = Math.ceil(Math.max(from[n - 1] * 3 + 3000, 3 * Rr.best.Qadj)); for (let q = 1; q <= qmax; q++) { const v = cost(q); if (v < bc) { bc = v; bq = q; } }
  if (!(Rr.best.TC <= bc + 1e-9 * bc && Rr.best.TC >= bc - 2e-4 * bc)) console.log("  diag:", type, hMode, "nasze", Rr.best.Qadj.toFixed(2), Rr.best.TC.toFixed(4), "przegląd", bq, bc.toFixed(4));
  t(`#${k} rabaty (${type}, H ${hMode}): koszt optimum = przegląd wszystkich ilości (różnica tylko z zaokrąglenia ilości do całkowitej)`, Rr.best.TC <= bc + 1e-9 * bc && Rr.best.TC >= bc - 2e-4 * bc && near(Rr.tc(Rr.best.Qadj), cost(Rr.best.Qadj), 1e-9));
}
// gazeciarz dyskretny: przegląd wszystkich ilości; normalny: Monte Carlo
for (let k = 0; k < 60; k++) {
  const m = 3 + Math.floor(rnd() * 8), ds = [...new Set(Array.from({length: m}, () => Math.round(rr(0, 200))))].sort((a, b) => a - b), w = ds.map(() => rnd()), sw = w.reduce((a, b) => a + b, 0);
  const disc = ds.map((d, j) => ({d, p: w[j] / sw})), p = rr(5, 20), cc = p * rr(0.2, 0.9), v = cc * rr(0, 0.6), g = rr(0, 5), Rn = c.invNews({p, c: cc, v, g, discrete: disc});
  const prof = q => disc.reduce((s, x) => s + x.p * (p * Math.min(x.d, q) + v * Math.max(0, q - x.d) - g * Math.max(0, x.d - q)), 0) - cc * q;
  const bestP = Math.max(...ds.map(prof));
  t(`#${k} gazeciarz dyskretny: reguła wskaźnika krytycznego daje maksymalny oczekiwany zysk`, near(prof(Rn.Q), bestP, 1e-9) && near(Rn.best.profit, bestP, 1e-9));
}
for (let k = 0; k < 10; k++) {
  const mu = rr(50, 500), sd = rr(5, 80), p = rr(5, 20), cc = p * rr(0.2, 0.8), v = cc * rr(0, 0.5), Rn = c.invNews({p, c: cc, v, normal: {mu, sd}}), g = ST.rng(100 + k); let s = 0, N = 200000;
  for (let j = 0; j < N; j++) { const d = g.normal(mu, sd); s += p * Math.min(d, Rn.Q) + v * Math.max(0, Rn.Q - d) - cc * Rn.Q; }
  t(`#${k} gazeciarz normalny: zysk ze wzoru ≈ Monte Carlo`, Math.abs(s / N - Rn.profit) < 0.01 * (Math.abs(Rn.profit) + p * sd));
}
console.log(`Testy zapasów: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
