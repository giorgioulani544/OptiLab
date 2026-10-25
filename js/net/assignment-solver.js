/* ===== OptiLab – zagadnienie przydziału: metoda węgierska (czysta matematyka, bez DOM, testowalna w Node) =====
   • macierz niekwadratowa → uzupełnienie fikcyjnymi wierszami/kolumnami o koszcie 0,
   • maksymalizacja → macierz „strat" (największy zysk − zysk), przydział zakazany (null) → bardzo duże „M",
   • kroki: redukcja wierszy, redukcja kolumn, pokrycie zer minimalną liczbą linii (twierdzenie Königa), korekta macierzy,
   • wybór niezależnych zer, wykrywanie rozwiązania alternatywnego. */
const AS_EPS = 1e-9;
function assignmentSolve(P) {
  const r0 = P.cost.length, c0 = P.cost[0].length, n = Math.max(r0, c0), maxi = !!P.maxi;
  const rNames = Array.from({length: n}, (_, i) => i < r0 ? (P.rNames?.[i] ?? 'W' + (i + 1)) : `Fikcyjny wykonawca ${i - r0 + 1}`);
  const cNames = Array.from({length: n}, (_, j) => j < c0 ? (P.cNames?.[j] ?? 'Z' + (j + 1)) : `Fikcyjne zadanie ${j - c0 + 1}`);
  const cost = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i < r0 && j < c0 ? P.cost[i][j] : 0));
  const finite = cost.flat().filter(v => v !== null), maxV = Math.max(...finite), BIG = (1 + Math.max(1, ...finite.map(Math.abs))) * 1e6;
  const isDummy = (i, j) => i >= r0 || j >= c0, steps = [], copy = M => M.map(r => r.slice());
  const zero = (A, i, j) => Math.abs(A[i][j]) <= AS_EPS;
  let A = cost.map(r => r.map(v => v === null ? BIG : maxi ? maxV - v : v));
  const he = v => String(v).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
  steps.push({kind: 'start', A: copy(A), text: (r0 !== c0 ? `Macierz ma wymiar ${r0} × ${c0}, a metoda węgierska wymaga macierzy kwadratowej – dodajemy ${r0 < c0 ? (c0 - r0 === 1 ? 'fikcyjnego wykonawcę' : `${c0 - r0} fikcyjnych wykonawców`) : (r0 - c0 === 1 ? 'fikcyjne zadanie' : `${r0 - c0} fikcyjne zadania`)} z ${maxi ? 'zyskiem' : 'kosztem'} 0. ` : '') +
    (maxi ? `Maksymalizujemy zysk, więc zamieniamy zyski na straty: od największego zysku (${fmt(maxV)}) odejmujemy każdy element. Minimalna suma strat daje maksymalny zysk. ` : '') +
    (finite.length < n * n ? 'Przydziały zakazane (M) mają ogromny koszt, więc metoda ich unika.' : '')});
  // 1. redukcja wierszy i 2. kolumn
  const rowMin = A.map(r => Math.min(...r)); A = A.map((r, i) => r.map(v => v - rowMin[i]));
  steps.push({kind: 'rows', A: copy(A), rowMin, text: `Redukcja wierszy: od każdego wiersza odejmujemy jego najmniejszy element (${rowMin.map(v => v >= BIG / 2 ? 'M' : fmt(v)).join(', ')}). W każdym wierszu pojawia się co najmniej jedno zero.`});
  const colMin = A[0].map((_, j) => Math.min(...A.map(r => r[j]))); A = A.map(r => r.map((v, j) => v - colMin[j]));
  steps.push({kind: 'cols', A: copy(A), colMin, text: `Redukcja kolumn: od każdej kolumny odejmujemy jej najmniejszy element (${colMin.map(v => v >= BIG / 2 ? 'M' : fmt(v)).join(', ')}). Teraz zero jest w każdym wierszu i każdej kolumnie.`});
  // maksymalne skojarzenie na zerach (ścieżki powiększające) + minimalne pokrycie linii (twierdzenie Königa)
  const matchZeros = (A, ban = null) => {
    const mr = Array(n).fill(-1), mc = Array(n).fill(-1);
    const ok = (i, j) => zero(A, i, j) && !(ban && ban.i === i && ban.j === j);
    const aug = (i, seen) => { for (let j = 0; j < n; j++) if (ok(i, j) && !seen[j]) { seen[j] = true; if (mc[j] < 0 || aug(mc[j], seen)) { mr[i] = j; mc[j] = i; return true; } } return false; };
    for (let i = 0; i < n; i++) aug(i, Array(n).fill(false));
    return {mr, mc, size: mr.filter(j => j >= 0).length};
  };
  const cover = A => {
    const {mr, mc, size} = matchZeros(A), vr = Array(n).fill(false), vc = Array(n).fill(false);
    const dfs = i => { vr[i] = true; for (let j = 0; j < n; j++) if (zero(A, i, j) && !vc[j]) { vc[j] = true; if (mc[j] >= 0 && !vr[mc[j]]) dfs(mc[j]); } };
    for (let i = 0; i < n; i++) if (mr[i] < 0 && !vr[i]) dfs(i);
    return {cr: vr.map(v => !v), cc: vc.slice(), lines: size};
  };
  const names = (flags, arr) => flags.map((f, k) => f ? he(arr[k]) : null).filter(Boolean);
  let status = 'optimal';
  for (let it = 0; ; it++) {
    const {cr, cc, lines} = cover(A), lineTxt = [names(cr, rNames).length ? 'wiersze ' + names(cr, rNames).join(', ') : '', names(cc, cNames).length ? 'kolumny ' + names(cc, cNames).join(', ') : ''].filter(Boolean).join(' oraz ');
    if (lines === n) { steps.push({kind: 'cover', A: copy(A), cr, cc, lines, text: `Wszystkie zera da się pokryć dopiero ${n} liniami (${lineTxt}) – tyle, ile wynosi wymiar macierzy. Można więc wybrać ${n} niezależnych zer: po jednym w każdym wierszu i kolumnie.`}); break; }
    let k = Infinity; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!cr[i] && !cc[j]) k = Math.min(k, A[i][j]);
    steps.push({kind: 'cover', A: copy(A), cr, cc, lines, text: `Pokrywamy wszystkie zera minimalną liczbą linii: ${lineTxt} – razem ${lines}. To mniej niż ${n}, więc nie da się jeszcze wybrać ${n} niezależnych zer. Najmniejszy niepokryty element: k = ${k >= BIG / 2 ? 'M' : fmt(k)}.`});
    if (it > 400) { status = 'limit'; break; }
    A = A.map((r, i) => r.map((v, j) => !cr[i] && !cc[j] ? v - k : cr[i] && cc[j] ? v + k : v));
    steps.push({kind: 'adjust', A: copy(A), cr, cc, k, text: `Korekta macierzy: odejmujemy k = ${fmt(k)} od elementów niepokrytych, dodajemy k do elementów na przecięciu dwóch linii, pozostałe elementy bez zmian. Powstają nowe zera.`});
  }
  const {mr} = matchZeros(A), assign = mr.slice();
  const total = as => as.reduce((s, j, i) => s + (i < r0 && j < c0 && cost[i][j] !== null ? cost[i][j] : 0), 0);
  const forbiddenUsed = assign.map((j, i) => cost[i][j] === null ? {i, j} : null).filter(Boolean);
  if (forbiddenUsed.length) status = 'infeasible';
  steps.push({kind: 'final', A: copy(A), assign, text: 'Wybrane niezależne zera (złote) wyznaczają przydział optymalny: ' + assign.map((j, i) => `${he(rNames[i])} → ${he(cNames[j])}`).join(', ') + '.'});
  let alt = null;                                            // inne doskonałe skojarzenie na zerach końcowej macierzy = ten sam koszt
  if (status === 'optimal') for (let i = 0; i < n && !alt; i++) {
    const m2 = matchZeros(A, {i, j: assign[i]});
    if (m2.size === n && m2.mr.some((j, q) => j !== assign[q] && !isDummy(q, j))) alt = {assign: m2.mr, total: total(m2.mr)};
  }
  return {status, maxi, n, r0, c0, rNames, cNames, cost, BIG, isDummy, steps, assign, total: total(assign), alt, forbiddenUsed};
}
