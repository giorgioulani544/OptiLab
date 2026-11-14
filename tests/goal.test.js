// Programowanie celowe: Beaver Creek Pottery (Taylor) – priorytety; przegląd wierzchołków (napisany tutaj) dla priorytetów i wag;
// bilans celów, wagi bardzo duże ≈ priorytety, minimax, zmienne całkowite vs przegląd punktów całkowitych
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/ilp-solver.js', 'js/goal/goal-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// Taylor: robocizna x1 + 2x2 = 40 (P1: bez niedoboru d1⁻, P4: min nadgodzin d1⁺), zysk 40x1 + 50x2 ≥ 1600 (P2), glina 4x1 + 3x2 ≤ 120 (P3)
const BC = {n: 2, goals: [{a: [1, 2], type: '>=', b: 40, P: 1, w: 1}, {a: [40, 50], type: '>=', b: 1600, P: 2, w: 1}, {a: [4, 3], type: '<=', b: 120, P: 3, w: 1}, {a: [1, 2], type: '<=', b: 40, P: 4, w: 1}], hard: []};
const R = c.gpSolve(BC, 'lex');
t('Beaver Creek (Taylor): x1 = 15, x2 = 20; nadgodziny d1⁺ = 15; zysk 1600, glina 120', R.status === 'optimal' && near(R.x[0], 15) && near(R.x[1], 20) && near(R.ach[3].dp, 15) && near(R.ach[1].val, 1600) && near(R.ach[2].val, 120));
t('Beaver Creek: cele P1–P3 osiągnięte, P4 nie (15 h nadgodzin)', R.ach[0].ok && R.ach[1].ok && R.ach[2].ok && !R.ach[3].ok);
// przegląd wierzchołków (n = 2 + odchylenia → rozwiązujemy w przestrzeni x: każde odchylenie to max(0, ±(a·x − b)), wierzchołki = przecięcia prostych celów i ograniczeń)
const evalDev = (P, x) => P.goals.map(g => { const v = g.a[0] * x[0] + g.a[1] * x[1], s = P.norm ? 1 / Math.max(1e-7, Math.abs(g.b)) : 1; return g.w * s * ((g.type !== '<=' ? Math.max(0, g.b - v) : 0) + (g.type !== '>=' ? Math.max(0, v - g.b) : 0)); });
const cand = P => { const L = [...P.goals.map(g => [g.a[0], g.a[1], g.b]), ...P.hard.map(h => [h.a[0], h.a[1], h.b]), [1, 0, 0], [0, 1, 0]], pts = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const [a, b, e] = L[i], [c2, d, f] = L[j], D = a * d - b * c2; if (Math.abs(D) < 1e-12) continue; pts.push([(e * d - b * f) / D, (a * f - e * c2) / D]); }
  return pts.filter(x => x[0] >= -1e-9 && x[1] >= -1e-9 && P.hard.every(h => { const v = h.a[0] * x[0] + h.a[1] * x[1]; return h.rel === '<=' ? v <= h.b + 1e-7 : h.rel === '>=' ? v >= h.b - 1e-7 : Math.abs(v - h.b) < 1e-7; })); };
let seed = 29; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) {
  const G = ri(2, 4), P = {n: 2, norm: rnd() < 0.3, goals: Array.from({length: G}, () => ({a: [ri(1, 9), ri(0, 9)], type: ['>=', '<=', '='][ri(0, 2)], b: ri(10, 80), P: ri(1, 3), w: ri(1, 5)})), hard: [{a: [1, 1], rel: '<=', b: ri(20, 60)}]};
  // wagi: minimum sumy po wierzchołkach (funkcja kawałkami liniowa wypukła – minimum w wierzchołku)
  const pts = cand(P), W = c.gpSolve(P, 'weighted'), best = Math.min(...pts.map(x => evalDev(P, x).reduce((a, b) => a + b, 0)));
  t(`#${k} wagi: suma ważonych odchyleń = minimum po wierzchołkach`, W.status === 'optimal' && near(evalDev(P, W.x).reduce((a, b) => a + b, 0), best, 1e-6));
  // priorytety: leksykograficzne minimum po wierzchołkach (poziom po poziomie)
  const Lx = c.gpSolve(P, 'lex'), levels = [...new Set(P.goals.map(g => g.P))].sort((a, b) => a - b); let set = pts, okL = true;
  for (const L of levels) { const v = x => evalDev(P, x).reduce((s, d, i) => s + (P.goals[i].P === L ? d : 0), 0), m = Math.min(...set.map(v)); set = set.filter(x => v(x) <= m + 1e-6 * (1 + m));
    if (!near(v(Lx.x), m, 1e-5)) okL = false; }
  t(`#${k} priorytety: każdy poziom osiąga minimum leksykograficzne (przegląd wierzchołków)`, Lx.status === 'optimal' && okL);
  t(`#${k} bilans celów: a·x + d⁻ − d⁺ = b, d⁻·d⁺ = 0`, Lx.ach.every((a, i) => near(a.val + a.dm - a.dp, P.goals[i].b) && a.dm * a.dp < 1e-9));
  const Pbig = {...P, goals: P.goals.map(g => ({...g, w: g.w * 1e4 ** (3 - g.P)}))}, Wb = c.gpSolve(Pbig, 'weighted');
  t(`#${k} wagi rzędu 10⁴ na poziom ≈ priorytety (te same odchylenia poziomu 1)`, near(evalDev(P, Wb.x).reduce((s, d, i) => s + (P.goals[i].P === levels[0] ? d : 0), 0), evalDev(P, Lx.x).reduce((s, d, i) => s + (P.goals[i].P === levels[0] ? d : 0), 0), 1e-4));
  const Mm = c.gpSolve(P, 'minimax'), mm = Math.min(...pts.map(x => Math.max(...evalDev(P, x))));
  // minimax nie zawsze w wierzchołku przecięć celów – sprawdzamy, że nie jest gorszy od żadnego wierzchołka
  t(`#${k} minimax: największe ważone odchylenie ≤ najlepszego wierzchołka`, Mm.status === 'optimal' && Math.max(...evalDev(P, Mm.x)) <= mm + 1e-6 * (1 + mm));
}
// zmienne całkowite: przegląd punktów całkowitych (siatka)
for (let k = 0; k < 40; k++) {
  const P = {n: 2, int: true, goals: Array.from({length: 2}, () => ({a: [ri(1, 7), ri(1, 7)], type: ['>=', '<='][ri(0, 1)], b: ri(5, 40) + 0.5, P: 1, w: ri(1, 4)})), hard: [{a: [1, 1], rel: '<=', b: ri(5, 15)}]};
  const R2 = c.gpSolve(P, 'weighted'); let best = Infinity; for (let a = 0; a <= 15; a++) for (let b2 = 0; b2 <= 15; b2++) if (a + b2 <= P.hard[0].b) best = Math.min(best, evalDev(P, [a, b2]).reduce((s, d) => s + d, 0));
  t(`#${k} cele całkowite: wynik całkowity = minimum z przeglądu siatki`, R2.status === 'optimal' && R2.x.every(v => Math.abs(v - Math.round(v)) < 1e-9) && near(evalDev(P, R2.x).reduce((s, d) => s + d, 0), best, 1e-6));
}
console.log(`Testy programowania celowego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
