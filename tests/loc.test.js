// Lokalizacja i układ: Heizer i Render (środek ciężkości sklepów Quain's: (66,7; 93,3)), mediana ważona vs przegląd współrzędnych, Weiszfeld vs siatka,
// CRAFT: lokalne optimum wymiany par i ≥ optimum z przeglądu n! (n ≤ 8), p-mediana vs niezależny przegląd
const {load} = require('./helpers');
const c = load(['js/loc/loc-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const Q = [{x: 30, y: 120, w: 2000}, {x: 90, y: 110, w: 1000}, {x: 130, y: 130, w: 1000}, {x: 60, y: 40, w: 2000}], G = c.locSingle(Q, 'sq');
t('Heizer i Render (Quain\'s): środek ciężkości (66,7; 93,3)', near(G.x[0], 400000 / 6000, 1e-9) && near(G.x[1], 560000 / 6000, 1e-9) && Math.round(G.x[0] * 10) === 667 && Math.round(G.x[1] * 10) === 933);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const costR = (P, x) => P.reduce((s, q) => s + q.w * (Math.abs(q.x - x[0]) + Math.abs(q.y - x[1])), 0), costE = (P, x) => P.reduce((s, q) => s + q.w * Math.hypot(q.x - x[0], q.y - x[1]), 0), costS = (P, x) => P.reduce((s, q) => s + q.w * ((q.x - x[0]) ** 2 + (q.y - x[1]) ** 2), 0);
for (let k = 0; k < 120; k++) {
  const P = Array.from({length: ri(1, 7)}, () => ({x: ri(0, 100), y: ri(0, 100), w: ri(1, 9)}));
  const R = c.locSingle(P, 'rect'); let best = Infinity; P.forEach(a => P.forEach(b => { best = Math.min(best, costR(P, [a.x, b.y])); }));   // optimum L1 leży na współrzędnych danych
  t(`#${k} prostokątna: koszt mediany ważonej = minimum po wszystkich współrzędnych danych`, near(R.cost, best, 1e-9 * (1 + best)));
  const S = c.locSingle(P, 'sq'); t(`#${k} kwadrat euklidesowej: środek ciężkości nie gorszy od punktów siatki wokół`, [[-1, 0], [1, 0], [0, 1], [0, -1], [0.3, -0.2]].every(([dx, dy]) => costS(P, S.x) <= costS(P, [S.x[0] + dx, S.x[1] + dy]) + 1e-9));
  const E = c.locSingle(P, 'euc', {tol: 1e-10, maxIt: 20000}); let gb = Infinity, gp = null; for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) { const p = [i / 2, j / 2], v = costE(P, p); if (v < gb) { gb = v; gp = p; } }
  let fb = gb; for (let i = -50; i <= 50; i++) for (let j = -50; j <= 50; j++) fb = Math.min(fb, costE(P, [gp[0] + i / 100, gp[1] + j / 100]));
  t(`#${k} euklidesowa (Weiszfeld): koszt ≤ minimum z siatki (z dokładnością siatki)`, E.status === 'optimal' && E.cost <= fb + 1e-6 * (1 + fb));
}
const layC = (F, D, p) => { let s = 0; F.forEach((r, i) => r.forEach((f, j) => { s += f * D[p[i]][p[j]]; })); return s; };
for (let k = 0; k < 40; k++) {
  const n = ri(3, 7), L = Array.from({length: n}, () => [ri(0, 10), ri(0, 10)]), D = L.map(a => L.map(b => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]))), F = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 0 : ri(0, 9)));
  const C = c.layCRAFT(F, D, [...Array(n).keys()]), B = c.layBrute(F, D); let fact = 1; for (let q = 2; q <= n; q++) fact *= q;
  let local = true; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const p = C.perm.slice(); [p[i], p[j]] = [p[j], p[i]]; if (layC(F, D, p) < C.cost - 1e-9) local = false; }
  t(`#${k} CRAFT: koszt policzony dobrze, brak poprawiającej wymiany (optimum lokalne), ≥ optimum z przeglądu ${n}!`, near(C.cost, layC(F, D, C.perm), 1e-9) && local && C.cost >= B.cost - 1e-9 && B.count === fact && near(B.cost, layC(F, D, B.perm), 1e-9));
}
for (let k = 0; k < 40; k++) {
  const dem = Array.from({length: ri(2, 8)}, () => ({x: ri(0, 50), y: ri(0, 50), w: ri(1, 9)})), cands = Array.from({length: ri(2, 7)}, () => ({x: ri(0, 50), y: ri(0, 50)})), p = ri(1, cands.length), kind = ['rect', 'euc'][ri(0, 1)];
  const R = c.pMedian(dem, cands, p, kind); let best = Infinity; for (let mask = 0; mask < 1 << cands.length; mask++) { const S = [...Array(cands.length).keys()].filter(j => mask >> j & 1); if (S.length !== p) continue;
    best = Math.min(best, dem.reduce((s, q) => s + q.w * Math.min(...S.map(j => kind === 'rect' ? Math.abs(q.x - cands[j].x) + Math.abs(q.y - cands[j].y) : Math.hypot(q.x - cands[j].x, q.y - cands[j].y))), 0)); }
  t(`#${k} p-mediana: koszt = niezależny przegląd wszystkich zestawów`, near(R.cost, best, 1e-9 * (1 + best)) && R.set.length === p);
}
const Mt = c.locSingle([{x: 0, y: 0, w: 1}, {x: 10, y: 0, w: 1}], 'rect'); t('mediana ważona: przy równym podziale wag cały odcinek optymalny [0; 10]', Mt.mx.lo === 0 && Mt.mx.hi === 10 && !Mt.unique);
const Wv = c.locSingle([{x: 0, y: 0, w: 10}, {x: 5, y: 0, w: 1}, {x: 0, y: 5, w: 1}], 'euc'); t('Weiszfeld: dominujący punkt (waga 10) jest optimum – warunek Kuhna w wierzchołku', Wv.status === 'optimal' && near(Wv.x[0], 0, 1e-9) && near(Wv.x[1], 0, 1e-9));
console.log(`Testy lokalizacji i układu: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
