// PERT/CPM: przykład podręcznikowy (Hillier i Lieberman, Reliable Construction) + niezależny przegląd wszystkich ścieżek, przegląd skracania, Monte Carlo
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/stats.js', 'js/solver.js', 'js/parametric.js', 'js/pm/cpm-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// Hillier i Lieberman: projekt Reliable Construction Co. – czas 44 tygodnie, rezerwy D, G, H, M = 4, I = 2, K = 1; PERT: σ² = 9, P(T ≤ 47) ≈ 0,84
const HL = [['A', '', 2, 1, 2, 3], ['B', 'A', 4, 2, 3.5, 8], ['C', 'B', 10, 6, 9, 18], ['D', 'C', 6, 4, 5.5, 10], ['E', 'C', 4, 1, 4.5, 5], ['F', 'E', 5, 4, 4, 10], ['G', 'D', 7, 5, 6.5, 11],
  ['H', 'E, G', 9, 5, 8, 17], ['I', 'C', 7, 3, 7.5, 9], ['J', 'F, I', 8, 3, 9, 9], ['K', 'J', 4, 4, 4, 4], ['L', 'J', 5, 1, 5.5, 7], ['M', 'H', 2, 1, 2, 3], ['N', 'K, L', 6, 5, 5.5, 9]];
const chk = c.cpmCheck(HL.map(r => r[0]), HL.map(r => r[1]));
let R = c.cpmSolve({names: HL.map(r => r[0]), preds: chk.preds, d: HL.map(r => r[2])});
t('Hillier–Lieberman: czas projektu 44', R.T === 44);
t('Hillier–Lieberman: rezerwy D, G, H, M = 4, I = 2, K = 1, pozostałe 0', 'D G H M'.split(' ').every(k => R.TF[HL.findIndex(r => r[0] === k)] === 4) && R.TF[8] === 2 && R.TF[10] === 1 && 'A B C E F J L N'.split(' ').every(k => R.TF[HL.findIndex(r => r[0] === k)] === 0));
t('Hillier–Lieberman: ścieżka krytyczna A-B-C-E-F-J-L-N', R.paths.length === 1 && R.paths[0].map(i => HL[i][0]).join('') === 'ABCEFJLN');
const Rp = c.cpmSolve({names: HL.map(r => r[0]), preds: chk.preds, pert: HL.map(r => ({a: r[3], m: r[4], b: r[5]}))});
t('Hillier–Lieberman PERT: te zgodne z czasami, σ² ścieżki = 9', near(Rp.T, 44) && near(Rp.sigma ** 2, 9));
t('Hillier–Lieberman PERT: P(T ≤ 47) = Φ(1) ≈ 0,8413', near(c.cpmProb(Rp, 47), 0.841345, 1e-5));
t('termin dla p = 0,95: 44 + 3·1,645 ≈ 48,93', near(c.cpmTimeFor(Rp, 0.95), 44 + 3 * 1.644854, 1e-6));
// walidacja: nieznany poprzednik, duplikat, cykl
t('nieznany poprzednik wykryty', c.cpmCheck(['A', 'B'], ['', 'X']).errors.some(e => e.i === 1 && /nieznany/.test(e.msg)));
t('duplikat nazwy wykryty', c.cpmCheck(['A', 'A'], ['', '']).errors.some(e => /powtarza/.test(e.msg)));
const cy = c.cpmCheck(['A', 'B', 'C'], ['C', 'A', 'B']); t('cykl wykryty i wskazany', cy.cycle && cy.cycle.length === 4 && cy.cycle[0] === cy.cycle[3]);
// niezależny przegląd: wszystkie ścieżki od czynności bez poprzedników do czynności bez następników
let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const allPaths = (n, preds, d) => { const succ = Array.from({length: n}, () => []); preds.forEach((ps, j) => ps.forEach(i => succ[i].push(j)));
  const out = []; const go = (i, acc, len) => { acc.push(i); len += d[i]; if (!succ[i].length) out.push({p: acc.slice(), len}); else succ[i].forEach(j => go(j, acc, len)); acc.pop(); };
  for (let i = 0; i < n; i++) if (!preds[i].length) go(i, [], 0); return out; };
for (let k = 0; k < 150; k++) {
  const n = ri(2, 9), preds = Array.from({length: n}, (_, j) => { const ps = []; for (let i = 0; i < j; i++) if (rnd() < 0.35) ps.push(i); return ps; }), d = Array.from({length: n}, () => ri(0, 9));
  const R = c.cpmSolve({names: d.map((_, i) => 'Z' + i), preds, d}), AP = allPaths(n, preds, d), T = Math.max(...AP.map(p => p.len));
  // ES = najdłuższa ścieżka do czynności; LF = T − najdłuższa ścieżka od następników do końca
  const into = Array(n).fill(0), from = Array(n).fill(0);
  AP.forEach(({p}) => { let s = 0; p.forEach(i => { into[i] = Math.max(into[i], s); s += d[i]; }); let e = 0; [...p].reverse().forEach(i => { from[i] = Math.max(from[i], e); e += d[i]; }); });
  const critPaths = AP.filter(x => x.len === T).map(x => x.p.join('-')).sort(), mine = R.paths.map(p => p.join('-')).sort();
  t(`losowa sieć #${k}: czas, ES, LF i ścieżki krytyczne zgodne z przeglądem wszystkich ścieżek`, R.T === T && into.every((v, i) => v === R.ES[i]) && from.every((v, i) => T - v === R.LF[i]) &&
    (d.some(v => v === 0) || JSON.stringify(critPaths) === JSON.stringify(mine)));
  t(`losowa sieć #${k}: rezerwy ≥ 0, swobodna ≤ całkowita, niezależna ≤ swobodna`, R.TF.every((v, i) => v >= -1e-9 && R.FF[i] <= v + 1e-9 && R.IF[i] <= R.FF[i] + 1e-9 && R.FF[i] >= -1e-9));
}
// skracanie: LP vs przegląd wszystkich całkowitych skróceń (małe sieci)
for (let k = 0; k < 60; k++) {
  const n = ri(2, 5), preds = Array.from({length: n}, (_, j) => { const ps = []; for (let i = 0; i < j; i++) if (rnd() < 0.45) ps.push(i); return ps; }), d = Array.from({length: n}, () => ri(2, 7));
  const cr = d.map(v => { const dc = Math.max(1, v - ri(0, 2)), cn = ri(10, 50); return {dc, cn, cc: cn + (v - dc) * ri(1, 9)}; });
  const P = {names: d.map((_, i) => 'Z' + i), preds, d}, R = c.cpmSolve(P), target = R.T - ri(0, 3);
  const C = c.cpmCrash(P, R, cr, target);
  let best = null; const y = Array(n).fill(0), rec = i => { if (i === n) { const RR = c.cpmSolve({...P, d: d.map((v, q) => v - y[q])}); if (RR.T <= target + 1e-9) { const cost = cr.reduce((s, q, j) => s + q.cn + y[j] * (q.cc - q.cn) / Math.max(1e-12, d[j] - q.dc), 0); if (best === null || cost < best) best = cost; } return; }
    for (let v = 0; v <= d[i] - cr[i].dc; v++) { y[i] = v; rec(i + 1); } y[i] = 0; };
  rec(0);
  t(`skracanie #${k}: koszt LP = przegląd wszystkich skróceń`, best === null ? C.status === 'infeasible' : C.status === 'optimal' && near(C.cost, best, 1e-7));
  t(`skracanie #${k}: krzywa czas–koszt istnieje, gdy da się skrócić projekt`, R.T - C.Tmin < 1e-9 || !!C.curve);
  if (C.curve) t(`skracanie #${k}: krzywa czas–koszt nierosnąca i zgodna z LP w punkcie terminu`, C.curve.every((p, i) => !i || p[1] <= C.curve[i - 1][1] + 1e-7) &&
    (best === null || target < C.Tmin || (() => { const seg = C.curve.findIndex(p => p[0] >= target - 1e-9); if (seg < 0) return true; const [x1, y1] = C.curve[seg], [x0, y0] = C.curve[Math.max(0, seg - 1)]; const y = x1 === x0 ? y1 : y0 + (y1 - y0) * (target - x0) / (x1 - x0); return near(y, best, 1e-6); })()));
}
// Monte Carlo: czasy deterministyczne (a = m = b) → czas dokładny; jedna ścieżka → średnia = Σ te
const det = {names: ['A', 'B'], preds: [[], [0]], pert: [{a: 3, m: 3, b: 3}, {a: 5, m: 5, b: 5}]}, Rd = c.cpmSolve(det), MCd = c.cpmMonteCarlo(det, Rd, 1000, 3);
t('Monte Carlo: czasy pewne → zawsze 8, krytyczność 100%', MCd.times.every(v => near(v, 8)) && MCd.crit.every(v => v === 1));
const one = {names: ['A', 'B', 'C'], preds: [[], [0], [1]], pert: [{a: 2, m: 4, b: 9}, {a: 1, m: 3, b: 4}, {a: 4, m: 6, b: 14}]}, R1 = c.cpmSolve(one), MC1 = c.cpmMonteCarlo(one, R1, 40000, 11);
t('Monte Carlo: jedna ścieżka → średnia ≈ Σ te', Math.abs(MC1.mean - R1.T) < 0.03);
const MCh = c.cpmMonteCarlo({names: HL.map(r => r[0]), preds: chk.preds, pert: HL.map(r => ({a: r[3], m: r[4], b: r[5]}))}, Rp, 20000, 5);
t('Monte Carlo (Hillier–Lieberman): średnia ≥ 44 (efekt ścieżek równoległych), to samo ziarno = ten sam wynik', MCh.mean > 44 - 0.05 && c.cpmMonteCarlo({names: HL.map(r => r[0]), preds: chk.preds, pert: HL.map(r => ({a: r[3], m: r[4], b: r[5]}))}, Rp, 20000, 5).mean === MCh.mean);
console.log(`Testy PERT/CPM: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
