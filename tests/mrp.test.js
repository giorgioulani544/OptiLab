// MRP: przykład policzony ręcznie (jawne wyliczenia w komentarzach) + niezmienniki na losowych strukturach wyrobu, sprawdzane niezależnie
const {load} = require('./helpers');
const c = load(['js/inv/lotsize.js', 'js/mrp/mrp-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b)), eqA = (a, b) => a.length === b.length && a.every((x, k) => near(x, b[k]));
// Przykład ręczny: A = 2 B + 1 C, B = 3 C (C jest wspólny → kod niskiego poziomu 2). 6 okresów.
// A: LT 1, zapas 10, L4L, MPS 0 0 20 0 30 0 → netto 0 0 10 0 30 0 → zamówienia (o 1 wcześniej): 0 10 0 30 0 0
// B: LT 2, zapas 5, przyjęcie zaplanowane 10 w okr. 2, L4L; brutto = 2·zam. A = 0 20 0 60 0 0
//    dostępne: 5, 5 + 10 − 20 = −5 → netto 0 5 0 60 0 0; przyjęcie 5 w okr. 2 wymaga zamówienia w okr. 0 → PO TERMINIE (wstawiamy do okr. 1); 60 w okr. 4 → zamówienie w okr. 2
//    zamówienia B: 5 60 0 0 0 0
// C: LT 1, zapas 50, FOQ Q = 100; brutto = 1·zam. A + 3·zam. B = (0 10 0 30 0 0) + (15 180 0 0 0 0) = 15 190 0 30 0 0
//    dostępne: 35, −155 → netto 0 155 0 30 0 0; FOQ: w okr. 2 2·100 = 200 (zapas po: 45), w okr. 4 45 ≥ 30 → bez zamówienia; zapas: 35 45 45 15 15 15; zamówienie 200 w okr. 1
const items = [{code: 'A', lt: 1, onHand: 10, ss: 0, scrap: 0, rule: 'L4L'}, {code: 'B', lt: 2, onHand: 5, ss: 0, scrap: 0, rule: 'L4L'}, {code: 'C', lt: 1, onHand: 50, ss: 0, scrap: 0, rule: 'FOQ', Q: 100}];
const chk = c.mrpCheck(['A', 'B', 'C'], [{parent: 'A', child: 'B', qty: 2}, {parent: 'A', child: 'C', qty: 1}, {parent: 'B', child: 'C', qty: 3}]);
const Z = Array(6).fill(0), S = c.mrpSolve({T: 6, items, edges: chk.edges, indep: [[0, 0, 20, 0, 30, 0], Z.slice(), Z.slice()], sr: [Z.slice(), [0, 10, 0, 0, 0, 0], Z.slice()]});
t('ręczny: kody niskiego poziomu A 0, B 1, C 2', S.llc.join() === '0,1,2');
t('ręczny: A – netto 0 0 10 0 30 0, zamówienia 0 10 0 30 0 0', eqA(S.R[0].net, [0, 0, 10, 0, 30, 0]) && eqA(S.R[0].rel, [0, 10, 0, 30, 0, 0]));
t('ręczny: B – brutto 0 20 0 60 0 0, netto 0 5 0 60 0 0, zamówienia 5 60 0 0 0 0', eqA(S.R[1].gross, [0, 20, 0, 60, 0, 0]) && eqA(S.R[1].net, [0, 5, 0, 60, 0, 0]) && eqA(S.R[1].rel, [5, 60, 0, 0, 0, 0]));
t('ręczny: B – komunikat „przyspieszyć" dla przyjęcia w okr. 2', S.messages.some(m => m.kind === 'late' && m.i === 1 && m.t === 1 && m.rt === -1 && near(m.qty, 5)));
t('ręczny: C – brutto 15 190 0 30 0 0, przyjęcie 200, zapas 35 45 45 15 15 15, zamówienie 200 w okr. 1', eqA(S.R[2].gross, [15, 190, 0, 30, 0, 0]) && eqA(S.R[2].rec, [0, 200, 0, 0, 0, 0]) && eqA(S.R[2].pab, [35, 45, 45, 15, 15, 15]) && eqA(S.R[2].rel, [200, 0, 0, 0, 0, 0]));
t('walidacja: cykl w strukturze wyrobu wykryty', !!c.mrpCheck(['X', 'Y'], [{parent: 'X', child: 'Y', qty: 1}, {parent: 'Y', child: 'X', qty: 1}]).cycle);
t('walidacja: nieznany składnik i ilość ≤ 0', c.mrpCheck(['X'], [{parent: 'X', child: 'Q', qty: 1}]).errors.length === 1 && c.mrpCheck(['X', 'Y'], [{parent: 'X', child: 'Y', qty: 0}]).errors.length === 1);
const D = c.mrpSolve({T: 4, items: [{code: 'K', lt: 0, onHand: 100, ss: 0, scrap: 0, rule: 'L4L'}], edges: [], indep: [[10, 10, 10, 10]], sr: [[0, 50, 0, 0]]});
t('komunikat: przyjęcie zaplanowane niepotrzebne w horyzoncie → anulować', D.messages.some(m => m.kind === 'cancel' && m.t === 1));
const D2 = c.mrpSolve({T: 6, items: [{code: 'K', lt: 0, onHand: 25, ss: 0, scrap: 0, rule: 'L4L'}], edges: [], indep: [[10, 10, 10, 10, 10, 10]], sr: [[0, 30, 0, 0, 0, 0]]});
t('komunikat: przyjęcie potrzebne dopiero w okr. 3 → opóźnić', D2.messages.some(m => m.kind === 'delay' && m.t === 1 && m.u === 2));
// losowe struktury: niezmienniki liczone niezależnie
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const RULES = ['L4L', 'FOQ', 'EOQ', 'POQ', 'MINMAX', 'SM', 'LUC', 'PPB', 'WW'];
for (let k = 0; k < 150; k++) {
  const n = ri(1, 7), T = ri(3, 10), edges = []; for (let ch = 1; ch < n; ch++) for (let p = 0; p < ch; p++) if (rnd() < 0.4) edges.push({p, c: ch, qty: ri(1, 4)});
  const its = Array.from({length: n}, () => { const mn = ri(0, 20); return {code: '', lt: ri(0, 3), onHand: ri(0, 80), ss: rnd() < .3 ? ri(1, 15) : 0, scrap: rnd() < .2 ? ri(1, 20) / 100 : 0, rule: RULES[ri(0, 8)], Q: ri(10, 80), P: ri(1, 3), min: mn, max: mn + ri(10, 80), S: ri(20, 200), H: ri(1, 4)}; });
  const indep = its.map((_, i) => Array.from({length: T}, () => (i === 0 || rnd() < .25) ? ri(0, 40) : 0)), sr = its.map(() => Array.from({length: T}, () => rnd() < .15 ? ri(5, 40) : 0));
  const R = c.mrpSolve({T, items: its, edges, indep, sr});
  // kod niskiego poziomu = najdłuższa ścieżka od pozycji bez rodzica (przegląd wszystkich ścieżek)
  const depth = Array(n).fill(0), walk = (v, d) => { depth[v] = Math.max(depth[v], d); edges.filter(e => e.p === v).forEach(e => walk(e.c, d + 1)); };
  for (let v = 0; v < n; v++) if (!edges.some(e => e.c === v)) walk(v, 0);
  t(`#${k} kody niskiego poziomu = najdłuższe ścieżki w strukturze`, depth.every((d, i) => d === R.llc[i]));
  let good = true;
  for (let i = 0; i < n; i++) { const it = its[i], X = R.R[i];
    const g = indep[i].map((v, tt) => v + edges.filter(e => e.c === i).reduce((s, e) => s + e.qty * R.R[e.p].rel[tt], 0));
    let p = it.onHand; const pabOk = X.pab.every((v, tt) => { p += sr[i][tt] + X.rec[tt] - g[tt]; return near(v, p, 1e-9) && v >= it.ss - 1e-7; });
    const rel = Array(T).fill(0); X.rec.forEach((q, tt) => { if (q > 1e-9) rel[Math.max(0, tt - it.lt)] += it.scrap ? Math.ceil(q / (1 - it.scrap) - 1e-9) : q; });
    if (!(eqA(X.gross, g) && pabOk && eqA(X.rel, rel))) good = false;
    if (it.rule === 'L4L') { let A = it.onHand, worst = 0; g.forEach((v, tt) => { A += sr[i][tt] - v; worst = Math.max(worst, it.ss - A); }); if (!near(X.pab[T - 1], A + Math.max(0, worst), 1e-9)) good = false; }
  }
  t(`#${k} brutto = niezależne + ilość × zamówienia nadrzędnych; zapas nigdy poniżej zapasu bezpieczeństwa; bilans; zamówienia = przyjęcia przesunięte o LT (z odpadem); L4L bez nadwyżek`, good);
}
console.log(`Testy MRP: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
