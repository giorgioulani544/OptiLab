// Karty kontrolne: stałe wyznaczone wzorami vs tablice (Montgomery), d2 vs symulacja, granice liczone ręcznie, reguły Nelsona na ciągach ułożonych ręcznie,
// faza I, zdolność procesu, fałszywe alarmy ≈ 0,27% (symulacja), ARL₀ ≈ 370, CUSUM i EWMA liczone ręcznie
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/stats.js', 'js/qc/spc-solver.js']), ST = vm.runInContext('ST', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
// tablice stałych (Montgomery, Introduction to Statistical Quality Control): n, d2, d3, A2, D3, D4, c4, A3, B3, B4
const TAB = [[2, 1.128, 0.853, 1.880, 0, 3.267, 0.7979, 2.659, 0, 3.267], [5, 2.326, 0.864, 0.577, 0, 2.114, 0.9400, 1.427, 0, 2.089], [10, 3.078, 0.797, 0.308, 0.223, 1.777, 0.9727, 0.975, 0.284, 1.716], [25, 3.931, 0.708, 0.153, 0.459, 1.541, 0.9896, 0.606, 0.565, 1.435]];
TAB.forEach(([n, d2, d3, A2, D3, D4, c4, A3, B3, B4]) => { const K = c.spcConst(n);
  t(`stałe n = ${n}: d2, d3, c4 jak w tablicach`, near(K.d2, d2, 6e-4) && near(K.d3, d3, 1.5e-3) && near(K.c4, c4, 6e-5));
  t(`stałe n = ${n}: A2, D3, D4, A3, B3, B4 jak w tablicach`, near(K.A2, A2, 1.5e-3) && near(K.D3, D3, 2e-3) && near(K.D4, D4, 2e-3) && near(K.A3, A3, 1.5e-3) && near(K.B3, B3, 1.5e-3) && near(K.B4, B4, 1.5e-3)); });
{ const g = ST.rng(4), N = 200000; let s = 0; for (let k = 0; k < N; k++) { const a = [0, 0, 0, 0, 0].map(() => g.normal()); s += Math.max(...a) - Math.min(...a); } t('d2(5) ≈ średni rozstęp 5 obserwacji N(0,1) w symulacji', Math.abs(s / N - c.spcConst(5).d2) < 0.01); }
// X̄-R liczone ręcznie: próbki (n = 3): [1,2,3], [2,4,6], [3,3,3] → średnie 2, 4, 3 → X̄̄ = 3; rozstępy 2, 4, 0 → R̄ = 2; A2(3) = 1,023 → UCL = 3 + 2,046
const L = c.spcLimits('xr', {sub: [[1, 2, 3], [2, 4, 6], [3, 3, 3]]}), K3 = c.spcConst(3);
t('X̄-R ręcznie: X̄̄ = 3, R̄ = 2, UCL = 3 + A2·2, granice R: D3·2, D4·2', near(L.main.cl[0], 3, 1e-12) && near(L.disp.cl[0], 2, 1e-12) && near(L.main.ucl[0], 3 + K3.A2 * 2, 1e-12) && near(L.disp.ucl[0], K3.D4 * 2, 1e-12) && near(K3.A2, 1.023, 1.5e-3));
const I = c.spcLimits('imr', {x: [10, 12, 11, 13, 9]});                // MR: 2, 1, 2, 4 → MR̄ = 2,25; σ = 2,25/1,128
t('I-MR ręcznie: x̄ = 11, MR̄ = 2,25, UCL = 11 + 3·MR̄/d2 = 11 + 2,66·2,25', near(I.main.cl[0], 11, 1e-12) && near(I.disp.cl[0], 2.25, 1e-12) && near(I.main.ucl[0], 11 + 3 * 2.25 / c.spcConst(2).d2, 1e-12) && near(3 / c.spcConst(2).d2, 2.66, 0.002));
const Pc = c.spcLimits('p', {n: [100, 200, 50], c: [5, 8, 2]});        // p̄ = 15/350; granice zależne od n
t('karta p ze zmienną liczebnością: p̄ = 15/350, granice p̄ ± 3√(p̄(1 − p̄)/n)', near(Pc.main.cl[0], 15 / 350, 1e-12) && near(Pc.main.ucl[1], 15 / 350 + 3 * Math.sqrt((15 / 350) * (335 / 350) / 200), 1e-12) && Pc.main.ucl[2] > Pc.main.ucl[0]);
const Cc = c.spcLimits('c', {n: [1, 1, 1, 1], c: [4, 9, 2, 5]}); t('karta c: c̄ = 5, UCL = 5 + 3√5, LCL = max(0, 5 − 3√5) = 0', near(Cc.main.cl[0], 5, 1e-12) && near(Cc.main.ucl[0], 5 + 3 * Math.sqrt(5), 1e-12) && Cc.main.lcl[0] === 0);
const U = c.spcLimits('u', {n: [2, 4], c: [6, 6]}); t('karta u: ū = 12/6 = 2, UCL = 2 + 3√(2/n)', near(U.main.cl[0], 2, 1e-12) && near(U.main.ucl[0], 2 + 3 * Math.sqrt(1), 1e-12));
// reguły Nelsona na ciągach ułożonych ręcznie (linia centralna 0, σ = 1)
const ch = s => ({stat: s, cl: s.map(() => 0), ucl: s.map(() => 3), lcl: s.map(() => -3), sigma: s.map(() => 1)}), has = (s, r) => c.spcRules(ch(s)).some(o => o.rule === r);
t('reguła 1: punkt 3,5 > UCL', has([0, 0.5, 3.5, 0], 1) && !has([0, 0.5, 2.9, 0], 1));
t('reguła 2: 9 punktów nad linią centralną (8 – nie)', has([0.1, 0.2, 0.3, 0.1, 0.2, 0.3, 0.1, 0.2, 0.3], 2) && !has([0.1, 0.2, 0.3, 0.1, 0.2, 0.3, 0.1, 0.2], 2));
t('reguła 3: 6 punktów stale rosnących', has([-1, -0.5, 0, 0.5, 1, 1.5], 3) && !has([-1, -0.5, 0, 0.5, 1], 3));
t('reguła 4: 14 punktów naprzemiennie', has([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1].map(v => v - 0.5), 4) && !has([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0].map(v => v - 0.5), 4));
t('reguła 5: 2 z 3 powyżej 2σ', has([0, 2.5, 0.5, 2.2], 5) && !has([2.5, 0, -2.5], 5));
t('reguła 6: 4 z 5 powyżej 1σ', has([1.5, 1.2, 0.2, 1.3, 1.8], 6) && !has([1.5, 1.2, 0.2, 0.3, 1.8], 6));
t('reguła 7: 15 punktów w strefie ±1σ', has(Array.from({length: 15}, (_, k) => (k % 2 ? 0.3 : -0.3)), 7) && !has(Array.from({length: 14}, () => 0.3), 7));
t('reguła 8: 8 punktów poza ±1σ po obu stronach', has([1.5, -1.5, 1.5, -1.5, 1.5, -1.5, 1.5, -1.5], 8) && !has([1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], 8));
// faza I: punkt 30 wśród wartości ~10 zostaje usunięty, granice przeliczone bez niego
const P1 = c.spcPhase1('imr', {x: [10, 11, 9, 10, 12, 30, 10, 11, 9, 10, 11, 10]}); t('faza I: punkt odstający usunięty, granice przeliczone', !P1.keep[5] && P1.steps.length >= 1 && P1.L.main.cl[0] < 11);
// zdolność: μ = 10, σ = 1 (z danych), granice 7 i 13 → Cp = 1; przesunięcie do 11 → Cpk = 2/3
const cap = c.spcCapability([9, 10, 11, 10], 1, 7, 13); t('Cp = (USL − LSL)/6σ = 1, Cpk = 1 przy procesie wyśrodkowanym', near(cap.Cp, 1, 1e-12) && near(cap.Cpk, 1, 1e-12));
t('Cpk = min(USL − μ, μ − LSL)/3σ = 2/3 przy przesunięciu', near(c.spcCapability([10, 11, 12, 11], 1, 7, 13).Cpk, 2 / 3, 1e-12));
// fałszywe alarmy: karta indywidualna ze znanymi parametrami, 3σ → 0,27%
{ const g = ST.rng(77), N = 2000000; let a = 0; for (let k = 0; k < N; k++) { const z = g.normal(); if (z > 3 || z < -3) a++; } t(`fałszywe alarmy ±3σ ≈ 0,27% (${(a / N * 100).toFixed(3)}%)`, Math.abs(a / N - 0.0027) < 0.0002); }
t('ARL₀ = 1/0,0027 ≈ 370,4; przesunięcie o 1σ przy n = 4: ARL ≈ 6,3', near(c.spcARL(0), 370.4, 0.1) && near(c.spcARL(1, 4), 6.30, 0.01));
// CUSUM i EWMA liczone ręcznie: μ0 = 10, σ = 1, k = 0,5
const Cu = c.spcCusum([11, 12, 10], 10, 1); t('CUSUM: C⁺ = 0,5; 2,0; 1,5', near(Cu[0].cp, 0.5, 1e-12) && near(Cu[1].cp, 2, 1e-12) && near(Cu[2].cp, 1.5, 1e-12) && Cu[0].h === 5);
const Ew = c.spcEwma([12, 12], 10, 1, 0.2); t('EWMA: z₁ = 10,4, z₂ = 10,72; granica 1. punktu 10 + 3·√(0,2/1,8·(1 − 0,8²))', near(Ew[0].z, 10.4, 1e-12) && near(Ew[1].z, 10.72, 1e-12) && near(Ew[0].ucl, 10 + 3 * Math.sqrt(0.2 / 1.8 * (1 - 0.64)), 1e-12));
const Pa = c.spcPareto(['A', 'B', 'C'], [10, 50, 40]); t('Pareto: sortowanie malejąco i skumulowany udział', Pa[0].nm === 'B' && near(Pa[1].cum, 0.9, 1e-12));
console.log(`Testy kart kontrolnych: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
