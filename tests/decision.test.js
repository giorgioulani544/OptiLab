// Analiza decyzji: Thompson Lumber (Render i Stair) – kryteria, EMV, EOL, EVPI; Bayes i EVSI liczone ręcznie; drzewa vs przegląd strategii;
// tożsamości (EVPI = min EOL, Hurwicz α = 1/0); gry: punkt siodłowy, wzór 2×2, warunki optymalności strategii mieszanych
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/dec/decision-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// Thompson Lumber: duży zakład 200 000 / −180 000, mały 100 000 / −20 000, nic 0 / 0; p = 0,5
const TL = [[200000, -180000], [100000, -20000], [0, 0]], C = c.decCriteria(TL, 'profit', 0.8, [0.5, 0.5]);
t('Thompson: maximax – duży zakład (200 000), maximin – nic (0)', C.maximax.idx[0] === 0 && C.maximax.best === 200000 && C.wald.idx[0] === 2 && C.wald.best === 0);
t('Thompson: Hurwicz α = 0,8 – duży 124 000, mały 76 000', near(C.hurwicz.vals[0], 124000) && near(C.hurwicz.vals[1], 76000) && C.hurwicz.idx[0] === 0);
t('Thompson: Laplace – mały 40 000; Savage – mały (maks. żal 100 000)', near(C.laplace.best, 40000) && C.laplace.idx[0] === 1 && C.savage.idx[0] === 1 && near(C.savage.best, 100000));
t('Thompson: EMV duży 10 000, mały 40 000, wybór mały; EVwPI 100 000, EVPI 60 000; EOL mały = 60 000', near(C.emv.vals[0], 10000) && near(C.emv.best, 40000) && near(C.evwpi, 100000) && near(C.evpi, 60000) && near(C.eol.vals[1], 60000) && near(C.eol.vals[0], 90000));
// Bayes: badanie rynku P(+|korzystny) = 0,7, P(+|niekorzystny) = 0,2 → P(+) = 0,45, P(korz.|+) = 0,35/0,45 = 7/9, P(korz.|−) = 0,15/0,55 = 3/11
const B = c.decEVSI(TL, [0.5, 0.5], [[0.7, 0.2], [0.3, 0.8]], 'profit', 10000);
t('Bayes: P(+) = 0,45, P(korzystny | +) = 7/9, P(korzystny | −) = 3/11', near(B.po[0], 0.45) && near(B.post[0][0], 7 / 9) && near(B.post[1][0], 3 / 11));
// EV przy badaniu (bez kosztu): wynik +: duży 7/9·200 000 − 2/9·180 000 = 115 555,56; wynik −: mały 3/11·100 000 − 8/11·20 000 = 12 727,27 → 0,45·115 555,56 + 0,55·12 727,27 = 59 000 → EVSI = 19 000
t('EVSI: EV z informacją 59 000 (dokładne prawdopodobieństwa a posteriori), EVSI = 19 000, sprawność 31,7%', near(B.evwsi, 59000, 1e-9) && near(B.evsi, 19000, 1e-9) && near(B.eff, 19000 / 60000) && B.worth);
// progi dla dwóch stanów: Thompson – nic dla p < 1/6, mały dla 1/6 < p < 0,615, duży powyżej
const Sg = c.decSens2(TL); t('progi opłacalności: 1/6 i 0,6154', Sg.length === 3 && Sg[0].i === 2 && near(Sg[0].to, 1 / 6) && Sg[1].i === 1 && near(Sg[1].to, 0.615384615) && Sg[2].i === 0);
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) {
  const m = ri(2, 5), n = ri(2, 5), V = Array.from({length: m}, () => Array.from({length: n}, () => ri(-50, 100))), w = Array.from({length: n}, () => rnd() + 0.05), sw = w.reduce((a, b) => a + b, 0), P = w.map(v => v / sw), kind = rnd() < .5 ? 'profit' : 'cost';
  const X = c.decCriteria(V, kind, 1, P), Y = c.decCriteria(V, kind, 0, P), Z = c.decCriteria(V, kind, 0.5, Array(n).fill(1 / n));
  t(`#${k} Hurwicz α = 1 = optymista, α = 0 = Wald; Laplace = EMV przy równych p`, near(X.hurwicz.best, X.maximax.best) && near(Y.hurwicz.best, Y.wald.best) && near(Z.laplace.best, Z.emv.best, 1e-9));
  t(`#${k} EVPI = minimalny EOL (tożsamość) i EOL + EMV stałe`, near(X.evpi, X.eol.best, 1e-9) && X.eol.vals.every((e, i) => near(kind === 'profit' ? e + X.emv.vals[i] : X.emv.vals[i] - e, X.evwpi, 1e-9)));
}
// drzewa: rollback vs przegląd wszystkich strategii (wybór gałęzi w każdym węźle decyzyjnym)
for (let k = 0; k < 80; k++) {
  const nodes = [{name: 'R', type: 'D', parent: -1, value: 0}]; const grow = (p, depth) => { const nb = ri(2, 3); for (let b = 0; b < nb; b++) { const type = depth >= 3 || rnd() < 0.3 ? 'K' : rnd() < 0.5 ? 'D' : 'L', i = nodes.length;
      nodes.push({name: 'N' + i, type, parent: p, value: ri(-20, 40), prob: null}); if (type !== 'K') grow(i, depth + 1); }
    if (nodes[p].type === 'L') { const kids = nodes.filter(x => x.parent === p), ws = kids.map(() => rnd() + 0.1), s = ws.reduce((a, b) => a + b, 0); kids.forEach((x, q) => { x.prob = ws[q] / s; }); } };
  grow(0, 1); nodes.forEach(x => { if (x.type === 'K') x.value += 0; }); const kind = rnd() < .5 ? 'profit' : 'cost', T = c.decTree(nodes, kind);
  const ds = nodes.map((x, i) => x.type === 'D' ? i : -1).filter(i => i >= 0), kids = i => nodes.map((y, q) => y.parent === i ? q : -1).filter(q => q >= 0); let best = null; const ch = {};
  const val = i => { const x = nodes[i]; if (x.type === 'K') return 0; if (x.type === 'L') return kids(i).reduce((s, q) => s + nodes[q].prob * (val(q) + nodes[q].value), 0); const q = ch[i]; return val(q) + nodes[q].value; };
  const go = d => { if (d === ds.length) { const v = val(0); if (best === null || (kind === 'profit' ? v > best : v < best)) best = v; return; } kids(ds[d]).forEach(q => { ch[ds[d]] = q; go(d + 1); }); };
  go(0); t(`#${k} drzewo: wartość rollback = najlepsza ze wszystkich strategii (${ds.length} węzłów decyzyjnych)`, near(T.value, best, 1e-9) && c.decTreeCheck(nodes).length === 0);
}
t('drzewo: walidacja – prawdopodobieństwa ≠ 1, dwa korzenie, węzeł bez gałęzi', c.decTreeCheck([{name: 'a', type: 'L', parent: -1}, {name: 'b', type: 'K', parent: 0, prob: 0.5}]).length === 1 && c.decTreeCheck([{name: 'a', type: 'K', parent: -1}, {name: 'b', type: 'K', parent: -1}]).length >= 1 && c.decTreeCheck([{name: 'a', type: 'D', parent: -1}]).length === 1);
// gry
let G = c.gameSolve([[3, 1, 4], [2, -1, 0], [5, 0, 6]]); t('gra z punktem siodłowym: wartość 1 (maximin = minimax)', G.saddle && near(G.saddle.v, 1) && near(G.v, 1));
G = c.gameSolve([[3, -1], [-2, 4]]); t('gra 2×2 bez punktu siodłowego: wzór p = (d − c)/(a − b − c + d) = 0,6, v = 1', near(G.p[0], 0.6) && near(G.v, 1) && near(G.q[0], 0.5));
for (let k = 0; k < 120; k++) {
  const m = ri(2, 4), n = ri(2, 4), A = Array.from({length: m}, () => Array.from({length: n}, () => ri(-9, 9))), R = c.gameSolve(A);
  const okP = A[0].every((_, j) => A.reduce((s, r, i) => s + R.p[i] * r[j], 0) >= R.v - 1e-7), okQ = A.every(r => r.reduce((s, v, j) => s + R.q[j] * v, 0) <= R.v + 1e-7);
  t(`#${k} gra ${m}×${n}: strategie mieszane optymalne (pᵀA ≥ v, Aq ≤ v, sumy = 1), wartość między maximin a minimax`, R.status === 'ok' && okP && okQ && near(R.p.reduce((a, b) => a + b, 0), 1) && near(R.q.reduce((a, b) => a + b, 0), 1) && R.v >= R.lo - 1e-9 && R.v <= R.hi + 1e-9);
}
const Ut = c.decUtility([[100, 100], [0, 200]], [0.5, 0.5], 100); t('użyteczność wykładnicza: CE pewnej wypłaty = wypłata; loteria 0/200 ma CE < 100 (awersja do ryzyka)', near(Ut.ce[0], 100, 1e-9) && Ut.ce[1] < 100 && Ut.idx === 0);
console.log(`Testy analizy decyzji: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
