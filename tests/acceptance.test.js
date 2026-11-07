// Odbiór statystyczny: Montgomery (n = 89, c = 2: Pa(0,01) = 0,9397), dokładne sumy dwumianowe/hipergeometryczne napisane tutaj, minimalność doboru planu (przegląd wszystkich n, c),
// plany dwustopniowe vs symulacja, SPRT vs symulacja, AOQL vs siatka, plany dla cech mierzalnych
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/qc/acceptance-solver.js']), ST = vm.runInContext('ST', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }, bin = (n, cc, p) => { let s = 0; for (let d = 0; d <= cc; d++) s += choose(n, d) * p ** d * (1 - p) ** (n - d); return s; };
t('Montgomery: n = 89, c = 2 → Pa(0,01) = 0,9397', near(c.accPa(89, 2, 0.01), 0.9397, 5e-5));
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) { const n = ri(2, 120), cc = ri(0, Math.min(10, n - 1)), p = rnd() * 0.3, N = n + ri(0, 400), D = Math.round(p * N);
  let hyp = 0; for (let d = 0; d <= cc; d++) hyp += choose(D, d) * choose(N - D, n - d) / choose(N, n);
  t(`#${k} Pa dwumianowe i hipergeometryczne = sumy liczone tutaj`, near(c.accPa(n, cc, p), bin(n, cc, p), 1e-10) && near(c.accPa(n, cc, p, 'hyp', N), hyp, 1e-9)); }
// dobór planu: wynik spełnia warunki i jest najmniejszy (przegląd wszystkich par n ≤ 400, c ≤ n)
for (const [AQL, al, LT, be] of [[0.01, 0.05, 0.06, 0.1], [0.02, 0.05, 0.08, 0.1], [0.005, 0.05, 0.04, 0.1], [0.015, 0.1, 0.1, 0.05], [0.03, 0.05, 0.12, 0.1]]) {
  const R = c.accDesign(AQL, al, LT, be); let best = null;
  for (let n = 1; n <= 400 && !best; n++) for (let cc = 0; cc < n; cc++) if (bin(n, cc, AQL) >= 1 - al && bin(n, cc, LT) <= be) { best = {n, c: cc}; break; }
  t(`dobór planu AQL ${AQL}, LTPD ${LT}: (n, c) = (${R.n}, ${R.c}) – najmniejsze n z przeglądu`, R.status === 'ok' && best && R.n === best.n && R.pa1 >= 1 - al && R.pa2 <= be);
}
// AOQL: maksimum AOQ z dokładnej siatki
{ const S = c.accSingle(89, 2, 10000, 'bin'); let m = 0; for (let k = 1; k <= 20000; k++) { const p = k / 200000; m = Math.max(m, bin(89, 2, p) * p * (10000 - 89) / 10000); }
  t(`AOQL planu (89, 2), N = 10 000 ≈ ${S.AOQL.toFixed(5)} = maksimum na gęstej siatce`, near(S.AOQL, m, 2e-7) && S.AOQL > 0.015 && S.AOQL < 0.0165); }
// plan dwustopniowy: Pa i ASN vs symulacja
{ const n1 = 50, c1 = 1, n2 = 100, c2 = 3, p = 0.02, R = c.accDouble(n1, c1, n2, c2, p), g = ST.rng(8), M = 200000; let acc = 0, tot = 0;
  for (let k = 0; k < M; k++) { let d1 = 0; for (let i = 0; i < n1; i++) if (g.u() < p) d1++; tot += n1; if (d1 <= c1) { acc++; continue; } if (d1 > c2) continue; let d2 = 0; for (let i = 0; i < n2; i++) if (g.u() < p) d2++; tot += n2; if (d1 + d2 <= c2) acc++; }
  t(`plan dwustopniowy (50, 1; 100, 3), p = 0,02: Pa i ASN ≈ symulacja`, Math.abs(R.Pa - acc / M) < 0.004 && Math.abs(R.ASN - tot / M) < 0.5); }
// SPRT: przy p = p1 odrzucamy rzadko (≈ α), przy p = p2 przyjmujemy rzadko (≈ β)
{ const S = c.accSPRT(0.01, 0.06, 0.05, 0.1), g = ST.rng(21); const run = p => { let d = 0; for (let n = 1; n < 5000; n++) { if (g.u() < p) d++; if (d <= S.accept(n)) return 'a'; if (d >= S.reject(n)) return 'r'; } return '?'; };
  let r1 = 0, a2 = 0; const M = 40000; for (let k = 0; k < M; k++) { if (run(0.01) === 'r') r1++; if (run(0.06) === 'a') a2++; }
  t(`SPRT: P(odrzucenia | p1) = ${(r1 / M).toFixed(3)} ≤ ≈ α, P(przyjęcia | p2) = ${(a2 / M).toFixed(3)} ≤ ≈ β`, r1 / M < 0.06 && a2 / M < 0.11);
  t('SPRT: linie decyzyjne – nachylenie s między p1 a p2', S.s > 0.01 && S.s < 0.06 && S.h1 > 0 && S.h2 > 0); }
// cechy mierzalne (znane σ): Pa(AQL) ≈ 1 − α, Pa(LTPD) ≈ β (n zaokrąglone w górę → nieco lepiej)
const Vp = c.accVariables(0.01, 0.05, 0.06, 0.1); t(`plan dla cech mierzalnych: n = ${Vp.n}, k = ${Vp.k.toFixed(3)}; Pa(AQL) ≥ 0,95, Pa(LTPD) ≤ 0,10`, Vp.pa1 >= 0.95 - 1e-9 && Vp.pa2 <= 0.1 + 1e-9);
t('Poisson: Pa(n = 100, c = 2, p = 0,02) = P(X ≤ 2; λ = 2) = 5e⁻²', near(c.accPa(100, 2, 0.02, 'poi'), 5 * Math.exp(-2), 1e-12));
console.log(`Testy odbioru statystycznego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
