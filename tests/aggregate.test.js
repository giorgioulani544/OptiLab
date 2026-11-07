// Planowanie zagregowane: przykład z literatury (Chopra i Meindl, Red Tomato Tools: LP 422 275 $, całkowite 422 660 $),
// przegląd wszystkich wierzchołków dla modelu zbudowanego w teście niezależnie, własności strategii, bilans, ceny dualne
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/ilp-solver.js', 'js/agg/agg-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const RT = {D: [1600, 3000, 3200, 3800, 2200, 2200], k: 40, W0: 80, I0: 1000, Iend: 500, wage: 640, cReg: 10, cOT: 34, otMax: 2.5, cSub: 30, subMax: null, cHire: 300, cFire: 500, h: 2, b: 5, hireMax: null, fireMax: null};
const R = c.aggSolve(RT, 'opt'); t('Red Tomato (Chopra i Meindl): koszt planu LP = 422 275', R.status === 'optimal' && near(R.z, 422275, 1e-9));
const Ri = c.aggSolve(RT, 'opt', {intW: true}); t('Red Tomato: całkowita liczba pracowników → 422 660, 64 pracowników', Ri.status === 'optimal' && near(Ri.z, 422660, 1e-9) && Ri.plan.every(p => p.W === 64));
// niezależny bilans i koszt
const check = (P, S) => { let I = P.I0, B = 0, W = P.W0, okk = true, cost = 0;
  S.plan.forEach((p, t2) => { okk = okk && near(p.W, W + p.H - p.F, 1e-7) && p.R <= P.k * p.W + 1e-7 && (P.otMax === null || p.O <= P.otMax * p.W + 1e-7) && near(p.I - p.B, I - B + p.R + p.O + p.S - P.D[t2], 1e-7) && Object.values(p).every(x => x >= -1e-9);
    cost += P.wage * p.W + P.cHire * p.H + P.cFire * p.F + P.cReg * p.R + P.cOT * p.O + P.cSub * p.S + P.h * p.I + (P.b ?? 0) * p.B; W = p.W; I = p.I; B = p.B; });
  return okk && near(B, 0, 1e-7) && I >= P.Iend - 1e-7 && near(cost, S.z, 1e-9) && (P.b !== null || S.plan.every(p => p.B < 1e-7)); };
t('Red Tomato: plan spełnia bilans, limity i koszt policzony niezależnie', check(RT, R));
// przegląd wierzchołków (T = 2): zmienne W1 H1 F1 R1 O1 S1 I1 B1 | W2 H2 F2 R2 O2 S2 I2 (B2 = 0), model zbudowany tu od zera
const vertexMin = P => {
  const V = 15, rows = [], rhs = [], cost = [P.wage, P.cHire, P.cFire, P.cReg, P.cOT, P.cSub, P.h, P.b, P.wage, P.cHire, P.cFire, P.cReg, P.cOT, P.cSub, P.h];
  const r = (cells, val, slack) => { const a = Array(V).fill(0); cells.forEach(([j, x]) => { a[j] += x; }); rows.push({a, slack}); rhs.push(val); };
  r([[0, 1], [1, -1], [2, 1]], P.W0, 0); r([[8, 1], [9, -1], [10, 1], [0, -1]], 0, 0);                         // pracownicy
  r([[3, 1], [4, 1], [5, 1], [6, -1], [7, 1]], P.D[0] - P.I0, 0); r([[11, 1], [12, 1], [13, 1], [14, -1], [6, 1], [7, -1]], P.D[1], 0);   // bilans
  r([[3, 1], [0, -P.k]], 0, 1); r([[11, 1], [8, -P.k]], 0, 1); r([[4, 1], [0, -P.otMax]], 0, 1); r([[12, 1], [8, -P.otMax]], 0, 1); r([[14, -1]], -P.Iend, 1);
  const m = rows.length, ns = rows.filter(x => x.slack).length, NC = V + ns, A = rows.map(() => Array(NC).fill(0)); let s = V;
  rows.forEach((x, i) => { x.a.forEach((q, j) => { A[i][j] = q; }); if (x.slack) A[i][s++] = 1; });
  const C = [...cost, ...Array(ns).fill(0)]; let best = Infinity; const pick = [];
  const solve = cols => { const M = A.map((row, i) => [...cols.map(j => row[j]), rhs[i]]);
    for (let k = 0; k < m; k++) { let p = k; for (let i = k + 1; i < m; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; if (Math.abs(M[p][k]) < 1e-10) return null; [M[k], M[p]] = [M[p], M[k]];
      for (let i = 0; i < m; i++) if (i !== k) { const f = M[i][k] / M[k][k]; if (f) for (let j = k; j <= m; j++) M[i][j] -= f * M[k][j]; } }
    return cols.map((_, k) => M[k][m] / M[k][k]); };
  const go = (start, left) => { if (!left) { const x = solve(pick); if (x && x.every(q => q >= -1e-9)) best = Math.min(best, x.reduce((s2, q, k) => s2 + C[pick[k]] * q, 0)); return; }
    for (let j = start; j <= NC - left; j++) { pick.push(j); go(j + 1, left - 1); pick.pop(); } };
  go(0, m); return best; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 14; k++) {
  const P = {D: [ri(100, 900), ri(100, 900)], k: ri(10, 40), W0: ri(5, 30), I0: ri(0, 200), Iend: ri(0, 100), wage: ri(200, 900), cReg: ri(0, 20), cOT: ri(15, 60), otMax: ri(1, 10), cSub: ri(20, 90), subMax: null, cHire: ri(100, 900), cFire: ri(100, 900), h: ri(1, 8), b: ri(2, 30), hireMax: null, fireMax: null};
  const S = c.aggSolve(P, 'opt'), V = vertexMin(P);
  t(`#${k} koszt planu = minimum po wszystkich wierzchołkach modelu zbudowanego niezależnie`, S.status === 'optimal' && near(S.z, V, 1e-7));
}
// losowe zadania: strategie i własności
for (let k = 0; k < 60; k++) {
  const T = ri(2, 8), P = {D: Array.from({length: T}, () => ri(0, 1500)), k: ri(10, 50), W0: ri(0, 40), I0: ri(0, 300), Iend: ri(0, 200), wage: ri(200, 1000), cReg: ri(0, 25), cOT: ri(20, 70), otMax: rnd() < .3 ? null : ri(0, 12),
    cSub: ri(25, 120), subMax: rnd() < .5 ? null : ri(0, 400), cHire: ri(0, 1200), cFire: ri(0, 1200), h: ri(1, 10), b: rnd() < .4 ? null : ri(2, 40), hireMax: rnd() < .7 ? null : ri(0, 20), fireMax: rnd() < .7 ? null : ri(0, 20)};
  const O = c.aggSolve(P, 'opt'), Ch = c.aggSolve(P, 'chase'), Lv = c.aggSolve(P, 'level');
  if (O.status !== 'optimal') { t(`#${k} brak planu tylko przy limitach zatrudniania/zwalniania`, P.hireMax !== null || P.fireMax !== null); continue; }
  t(`#${k} plan optymalny: bilans, limity, koszt (sprawdzenie niezależne)`, check(P, O));
  t(`#${k} strategie nie tańsze od planu optymalnego`, [Ch, Lv].every(S => S.status !== 'optimal' || S.z >= O.z - 1e-6 * O.z));
  t(`#${k} pogoń za popytem: brak zapasu (poza końcowym), nadgodzin i zaległości; stały poziom: stała liczba pracowników`,
    (Ch.status !== 'optimal' || (Ch.plan.every((p, i) => (i === T - 1 || p.I < 1e-7) && p.O < 1e-7 && p.S < 1e-7 && p.B < 1e-7) && check(P, Ch))) && (Lv.status !== 'optimal' || (Lv.plan.every(p => near(p.W, Lv.plan[0].W, 1e-7)) && check(P, Lv))));
  t(`#${k} składniki kosztu sumują się do kosztu całkowitego`, near(Object.values(O.parts).reduce((s, q) => s + q, 0), O.z, 1e-9));
  if (!O.degenerate && O.duals) { const j = ri(0, T - 1), D2 = P.D.slice(); D2[j] += 0.01; const O2 = c.aggSolve({...P, D: D2}, 'opt');
    t(`#${k} cena dualna bilansu = przyrost kosztu przy wzroście popytu`, O2.status === 'optimal' && Math.abs((O2.z - O.z) / 0.01 - O.duals[j].y) < 1e-4 * (1 + Math.abs(O.duals[j].y))); }
}
// całkowita liczba pracowników: wynik całkowity, nie tańszy od LP
for (let k = 0; k < 10; k++) {
  const T = ri(2, 5), P = {D: Array.from({length: T}, () => ri(100, 900)), k: ri(10, 40), W0: ri(5, 25), I0: ri(0, 100), Iend: 0, wage: ri(300, 900), cReg: ri(0, 15), cOT: ri(20, 60), otMax: ri(1, 8), cSub: ri(25, 90), subMax: null, cHire: ri(100, 900), cFire: ri(100, 900), h: ri(1, 6), b: ri(3, 20), hireMax: null, fireMax: null};
  const L = c.aggSolve(P, 'opt'), I = c.aggSolve(P, 'opt', {intW: true});
  t(`#${k} całkowita liczba pracowników: wynik całkowity, bilans spełniony, koszt ≥ LP`, I.status === 'optimal' && I.plan.every(p => near(p.W, Math.round(p.W), 1e-9)) && check(P, I) && I.z >= L.z - 1e-6 * L.z);
}
console.log(`Testy planowania zagregowanego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
