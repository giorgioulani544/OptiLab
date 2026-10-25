// Przydział (metoda węgierska): przykłady podręcznikowe + porównanie z pełnym przeglądem wszystkich permutacji
const {load} = require('./helpers');
const c = load(['js/core.js', 'js/net/assignment-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
// niezależna kontrola: wszystkie permutacje (macierz uzupełniona do kwadratu zerami; null = zakazane)
const brute = P => {
  const r0 = P.cost.length, c0 = P.cost[0].length, n = Math.max(r0, c0), C = (i, j) => i < r0 && j < c0 ? P.cost[i][j] : 0;
  let best = null; const perm = (i, used, s) => {
    if (i === n) { if (best === null || (P.maxi ? s > best : s < best)) best = s; return; }
    for (let j = 0; j < n; j++) if (!used[j] && C(i, j) !== null) { used[j] = true; perm(i + 1, used, s + C(i, j)); used[j] = false; }
  };
  perm(0, [], 0); return best;                                  // null = brak przydziału bez pól zakazanych
};
// Taha, przykład z trojgiem dzieci i trzema pracami: optimum 27; klasyczny przykład 4 × 4: optimum 13
let R = c.assignmentSolve({cost: [[15, 10, 9], [9, 15, 10], [10, 12, 8]]});
t('Taha 3 × 3: koszt 27', near(R.total, 27) && near(brute({cost: [[15, 10, 9], [9, 15, 10], [10, 12, 8]]}), 27));
R = c.assignmentSolve({cost: [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]});
t('4 × 4: koszt 13 i przydział 2+6+1+4', near(R.total, 13) && R.assign.join() === '1,0,2,3');
t('kroki: redukcja wierszy, kolumn, pokrycie, wybór zer', ['start', 'rows', 'cols', 'cover', 'final'].every(k => R.steps.some(s => s.kind === k)));
t('ostatnie pokrycie ma n linii', R.steps.filter(s => s.kind === 'cover').pop().lines === 4);
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 120; k++) {
  const r = ri(1, 6), cc = ri(1, 6), P = {maxi: rnd() < .35, cost: Array.from({length: r}, () => Array.from({length: cc}, () => rnd() < .15 ? null : ri(0, 30)))};
  const R = c.assignmentSolve(P), B = brute(P);
  t(`losowe #${k} (${r}×${cc}${P.maxi ? ', max' : ''})`, B === null ? R.status === 'infeasible' : R.status === 'optimal' && near(R.total, B));
  if (R.status === 'optimal') {
    const cover = R.steps.filter(s => s.kind === 'cover');      // każde pokrycie: liczba linii = liczba wierszy + kolumn zaznaczonych, wszystkie zera pokryte
    t(`losowe #${k}: pokrycia zer poprawne`, cover.every(s => s.cr.filter(Boolean).length + s.cc.filter(Boolean).length === s.lines && s.A.every((row, i) => row.every((v, j) => Math.abs(v) > 1e-9 || s.cr[i] || s.cc[j]))));
    if (R.alt) t(`losowe #${k}: rozwiązanie alternatywne ma ten sam koszt`, near(R.alt.total, R.total));
  }
}
R = c.assignmentSolve({cost: [[2, 2], [2, 2]]});
t('rozwiązanie alternatywne wykryte', R.alt && near(R.alt.total, 4));
R = c.assignmentSolve({cost: [[null, 1], [null, 3]]});
t('przydział niemożliwy bez pól zakazanych', R.status === 'infeasible');
R = c.assignmentSolve({maxi: true, cost: [[5, 1], [1, 5], [3, 3]]});
t('maksymalizacja, 3 × 2 (fikcyjne zadanie): zysk 10', near(R.total, 10) && R.cNames[2] === 'Fikcyjne zadanie 1');
console.log(`Testy przydziału: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
