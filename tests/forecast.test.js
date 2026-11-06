// Prognozowanie: przykłady liczone ręcznie (jawna arytmetyka), niezależne wzory (wygładzanie jako suma ważona, regresja z równań normalnych),
// własności dokładne (Holt na danych liniowych, Holt-Winters na danych czysto sezonowych), dobór parametrów vs losowe parametry
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/fc/forecast-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const y = [10, 12, 14, 13];
let R = c.fcRun(y, 'naive', {h: 1}); t('naiwna: prognozy 10, 12, 14; MAD = 5/3, MSE = 3; następna 13', R.F.slice(1).join() === '10,12,14' && near(R.err.MAD, 5 / 3) && near(R.err.MSE, 3) && R.fut[0] === 13);
R = c.fcRun(y, 'ma', {k: 2, h: 1}); t('średnia ruchoma k = 2: F₃ = 11, F₄ = 13, błędy 3 i 0, następna 13,5', R.F[2] === 11 && R.F[3] === 13 && near(R.err.MAD, 1.5) && R.fut[0] === 13.5);
R = c.fcRun(y, 'wma', {w: [1, 3], h: 1}); t('ważona średnia (wagi 1, 3): F₃ = (10 + 3·12)/4 = 11,5', near(R.F[2], 11.5) && near(R.fut[0], (14 + 3 * 13) / 4));
R = c.fcRun(y, 'ses', {alpha: 0.5, h: 1}); t('wygładzanie α = 0,5: F = 10, 10, 11, 12,5; następna 12,75; MAD = (2 + 3 + 0,5)/3', R.F.join() === '10,10,11,12.5' && near(R.fut[0], 12.75) && near(R.err.MAD, 5.5 / 3));
R = c.fcRun([3, 5, 7, 9, 11, 13], 'holt', {alpha: 0.3, beta: 0.4, h: 3}); t('Holt na danych liniowych: błędy 0, prognozy 15, 17, 19', R.err.rows.every(r => near(r.e, 0, 1e-12)) && R.fut.every((v, j) => near(v, 15 + 2 * j)));
R = c.fcRun([3, 5, 7, 9, 11, 13], 'reg', {h: 2}); t('regresja na danych liniowych: a = 1, b = 2, R² = 1, prognozy 15 i 17', near(R.state.a, 1) && near(R.state.b, 2) && near(R.state.r2, 1) && near(R.fut[0], 15) && near(R.fut[1], 17));
const seasA = [5, -3, 8, -10], seasM = [1.2, 0.7, 1.4, 0.7];
const ya = Array.from({length: 16}, (_, i) => 100 + seasA[i % 4]), ym = Array.from({length: 16}, (_, i) => 50 * seasM[i % 4]);
R = c.fcRun(ya, 'hwa', {L: 4, alpha: 0.4, beta: 0.2, gamma: 0.3, h: 4}); t('Holt-Winters addytywny na danych czysto sezonowych: błędy 0, prognozy = sezon', R.err.rows.every(r => near(r.e, 0, 1e-9)) && R.fut.every((v, j) => near(v, 100 + seasA[(16 + j) % 4], 1e-9)));
R = c.fcRun(ym, 'hwm', {L: 4, alpha: 0.4, beta: 0.2, gamma: 0.3, h: 4}); t('Holt-Winters multiplikatywny na danych czysto sezonowych: błędy 0', R.err.rows.every(r => near(r.e, 0, 1e-9)) && R.fut.every((v, j) => near(v, 50 * seasM[(16 + j) % 4], 1e-9)));
// niezależne wzory na losowych danych
let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let k = 0; k < 120; k++) {
  const n = 6 + Math.floor(rnd() * 20), ys = Array.from({length: n}, () => Math.round(50 + 50 * rnd() + k)), a = 0.05 + 0.9 * rnd();
  R = c.fcRun(ys, 'ses', {alpha: a});
  const sum = t2 => { let s = 0; for (let j = 0; j < t2; j++) s += a * (1 - a) ** j * ys[t2 - 1 - j]; return s + (1 - a) ** t2 * ys[0]; };   // F_{t+1} jako suma ważona
  t(`#${k} wygładzanie = suma ważona α(1−α)ʲ·y + (1−α)ᵗ·F₁`, ys.every((_, i) => !i || near(R.F[i], sum(i), 1e-10)));
  const G = c.fcRun(ys, 'reg', {}); let S0 = n, S1 = 0, S2 = 0, Sy = 0, Sty = 0; ys.forEach((v, i) => { const tt = i + 1; S1 += tt; S2 += tt * tt; Sy += v; Sty += tt * v; });
  const det = S0 * S2 - S1 * S1, A = (Sy * S2 - S1 * Sty) / det, B = (S0 * Sty - S1 * Sy) / det;      // równania normalne, wzory Cramera
  t(`#${k} regresja = rozwiązanie równań normalnych`, near(G.state.a, A, 1e-9) && near(G.state.b, B, 1e-9));
  const E = c.fcRun(ys, 'ma', {k: 3}).err, F = c.fcRun(ys, 'ma', {k: 3}).F; let m = 0, ma = 0, ms = 0, cf = 0; for (let i = 3; i < n; i++) { const e = ys[i] - (ys[i - 1] + ys[i - 2] + ys[i - 3]) / 3; m++; ma += Math.abs(e); ms += e * e; cf += e; }
  t(`#${k} średnia ruchoma i miary błędów = obliczenie niezależne`, near(E.MAD, ma / m) && near(E.MSE, ms / m) && near(E.CFE, cf) && near(E.TS, cf / (ma / m)) && near(F[3], (ys[0] + ys[1] + ys[2]) / 3));
}
// dobór parametrów: wynik nie gorszy niż 50 losowych zestawów parametrów
for (let k = 0; k < 12; k++) {
  const n = 16, ys = Array.from({length: n}, (_, i) => 80 + 3 * i + 15 * Math.sin(i * Math.PI / 2) + 10 * rnd()), meth = ['ses', 'holt', 'hwa', 'hwm'][k % 4];
  const O = c.fcOptimize(ys, meth, {L: 4}, ['MSE', 'MAD', 'MAPE', 'CFE'][k % 4]), crit = ['MSE', 'MAD', 'MAPE', 'CFE'][k % 4], sc = e => crit === 'CFE' ? Math.abs(e.CFE) : e[crit];
  let good = true; for (let j = 0; j < 50; j++) { const P = {L: 4, alpha: 0.05 + 0.9 * rnd(), beta: 0.05 + 0.9 * rnd(), gamma: 0.05 + 0.9 * rnd()}, s = sc(c.fcRun(ys, meth, P).err);
    const g = {alpha: Math.round(P.alpha / O.step) * O.step, beta: Math.round(P.beta / O.step) * O.step, gamma: Math.round(P.gamma / O.step) * O.step}; if (sc(c.fcRun(ys, meth, {L: 4, ...g}).err) < O.score - 1e-9) good = false; }
  t(`#${k} dobór parametrów (${meth}, ${crit}): minimum na siatce`, good && O.score <= sc(c.fcRun(ys, meth, {L: 4, alpha: 0.5, beta: 0.5, gamma: 0.5}).err) + 1e-9);
}
console.log(`Testy prognozowania: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
