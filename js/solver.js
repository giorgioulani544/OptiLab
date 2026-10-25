/* ===== OptiLab – solver =====
   Czysta matematyka bez DOM (testowalna w Node): simpleks z metodą dużego M, typy zmiennych, zadanie dualne. */
/* =====================================================================
   3. SOLVER SIMPLEKS (tablicowy, metoda dużego M) Z ZAPISEM KROKÓW
   Obsługuje ograniczenia ≤, ≥, =. Minimalizację zamienia na maksymalizację −Z.
   ===================================================================== */
function solveLP(c, A0, rel0, b0, maxi, rec, vn) {
  const n = c.length, m = A0.length;
  BIGM = Math.max(1e6, 1e4 * Math.max(1, ...c.map(Math.abs), ...A0.flat().map(Math.abs), ...b0.map(Math.abs)));
  const A = A0.map(r => r.slice()), b = b0.slice(), rel = rel0.slice(), flip = Array(m).fill(false);
  // Prawe strony muszą być ≥ 0: mnożymy wiersz przez −1 i odwracamy znak
  for (let i = 0; i < m; i++) if (b[i] < 0) {
    A[i] = A[i].map(v => -v); b[i] = -b[i]; flip[i] = true; rel[i] = rel[i] === '<=' ? '>=' : rel[i] === '>=' ? '<=' : '=';
  }
  const names = vn ? vn.slice() : Array.from({length: n}, (_, j) => 'x' + sub(j + 1)), basis = [], extra = [];
  let N = n, hasArt = false;
  for (let i = 0; i < m; i++) {
    if (rel[i] === '<=') { extra.push({i, col: N, v: 1}); names.push('s' + sub(i + 1)); basis[i] = N++; }
    else {
      if (rel[i] === '>=') { extra.push({i, col: N, v: -1}); names.push('e' + sub(i + 1)); N++; }
      extra.push({i, col: N, v: 1, art: true}); names.push('a' + sub(i + 1)); basis[i] = N++; hasArt = true;
    }
  }
  const basis0 = basis.slice();
  const T = Array.from({length: m + 1}, () => Array(N + 1).fill(0));
  for (let i = 0; i < m; i++) { for (let j = 0; j < n; j++) T[i][j] = A[i][j]; T[i][N] = b[i]; }
  extra.forEach(e => T[e.i][e.col] = e.v);
  for (let j = 0; j < n; j++) T[m][j] = maxi ? -c[j] : c[j];
  extra.filter(e => e.art).forEach(e => { T[m][e.col] = BIGM; });
  for (let i = 0; i < m; i++) if (names[basis[i]][0] === 'a')           // zerujemy M w wierszu Z
    for (let j = 0; j <= N; j++) T[m][j] -= BIGM * T[i][j];
  const snap = (text, pr = -1, pc = -1) => rec.push({T: T.map(r => r.slice()), basis: basis.slice(), names, pr, pc, text, b0: basis0, fl: flip});
  snap(`Tablica początkowa. Zamieniamy nierówności na równania: dodajemy zmienne zapasu (s), nadwyżki (e) i sztuczne (a). Zmienne bazowe: ${basis.map(k => names[k]).join(', ')}.` +
       (hasArt ? ` Zmienne sztuczne karzemy dużą stałą M = ${fmt(BIGM)} (metoda dużego M).` : '') +
       (maxi ? '' : ' Minimalizację Z zamieniamy na maksymalizację −Z (w wierszu Z widać więc −Z).'));
  for (let it = 1; it <= 200; it++) {
    let pc = -1, mn = -1e-9;
    for (let j = 0; j < N; j++) if (T[m][j] < mn) { mn = T[m][j]; pc = j; }
    if (pc < 0) break;                                                  // optimum
    let pr = -1, best = Infinity; const ratios = [];
    for (let i = 0; i < m; i++) if (T[i][pc] > 1e-9) {
      const q = T[i][N] / T[i][pc]; ratios.push(`${names[basis[i]]}: ${fmt(T[i][N])}/${fmt(T[i][pc])} = ${fmt(q)}`);
      if (q < best - 1e-12) { best = q; pr = i; }
    }
    if (pr < 0) { snap(`Kolumna ${names[pc]} nie ma dodatnich elementów, więc zmienną ${names[pc]} można zwiększać w nieskończoność bez łamania ograniczeń. Problem jest nieograniczony.`, -1, pc); return {status: 'unbounded', pc}; }
    const p = T[pr][pc];
    snap(`Iteracja ${it}. Kolumna wejściowa: ${names[pc]} – najbardziej ujemna wartość w wierszu Z (${fmt(T[m][pc])}), więc wprowadzenie tej zmiennej najbardziej poprawia funkcję celu. ` +
         `Test ilorazów (prawa strona ÷ element kolumny): ${ratios.join('; ')}. Najmniejszy iloraz (${fmt(best)}) ma wiersz zmiennej ${names[basis[pr]]} – ona opuszcza bazę. ` +
         `Element centralny = ${fmt(p)}. Dzielimy wiersz przez ${fmt(p)}, potem zerujemy resztę kolumny ${names[pc]}.`, pr, pc);
    for (let j = 0; j <= N; j++) T[pr][j] /= p;
    for (let i = 0; i <= m; i++) if (i !== pr) { const f = T[i][pc]; for (let j = 0; j <= N; j++) T[i][j] -= f * T[pr][j]; }
    basis[pr] = pc;
  }
  const x = Array(n).fill(0);
  basis.forEach((k, i) => { if (k < n) x[k] = T[i][N]; });
  if (basis.some((k, i) => names[k][0] === 'a' && T[i][N] > 1e-7)) {
    snap('W bazie została zmienna sztuczna o dodatniej wartości – ograniczenia wzajemnie się wykluczają. Brak rozwiązania dopuszczalnego.');
    return {status: 'infeasible'};
  }
  snap('Wszystkie wartości w wierszu Z są nieujemne – rozwiązanie jest optymalne. Wartości zmiennych bazowych czytamy z kolumny prawych stron, pozostałe zmienne są równe 0.');
  return {status: 'optimal', x, z: maxi ? T[m][N] : -T[m][N]};
}
function expand(M) {
  const cols = [], vn = [];
  M.t.forEach((t, j) => { cols.push([j, t === 'n' ? -1 : 1]); vn.push('x' + sub(j + 1) + (t === 'u' ? '⁺' : t === 'n' ? '′' : '')); });
  M.t.forEach((t, j) => { if (t === 'u') { cols.push([j, -1]); vn.push('x' + sub(j + 1) + '⁻'); } });
  return {cols, vn, c: cols.map(([j, s]) => s * M.c[j]), A: M.A.map(r => cols.map(([j, s]) => s * r[j]))};
}
/* Rozwiązuje model z typami zmiennych; extra = dodatkowe granice {j, rel, b} (dla Branch & Bound) */
function solveM(M, extra = [], rec = []) {
  const E = expand(M), A = E.A.map(r => r.slice()), rel = M.rel.slice(), b = M.b.slice();
  extra.forEach(e => { A.push(E.cols.map(([j, s]) => j === e.j ? s : 0)); rel.push(e.rel); b.push(e.b); });
  const r = solveLP(E.c, A, rel, b, M.maxi, rec, E.vn);
  if (r.status === 'optimal') { const x = Array(M.n).fill(0); E.cols.forEach(([j, s], k) => x[j] += s * r.x[k]); r.x = x; }
  return r;
}
/* Zadanie dualne (reguły przekształceń SOB) */
const dualOf = M => { const mx = M.maxi; return {n: M.A.length, c: M.b.slice(), maxi: !mx, A: M.c.map((_, j) => M.A.map(r => r[j])), b: M.c.slice(),
  rel: M.t.map(t => t === 'u' ? '=' : mx ? '>=' : '<='), t: M.rel.map(r => r === '=' ? 'u' : r === (mx ? '<=' : '>=') ? 'c' : 'n')}; };
