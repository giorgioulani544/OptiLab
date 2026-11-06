/* ===== OptiLab – solver =====
   Czysta matematyka bez DOM (testowalna w Node): simpleks z metodą dużego M, typy zmiennych, zadanie dualne. */
/* =====================================================================
   3. SOLVER SIMPLEKS (tablicowy, metoda dużego M) Z ZAPISEM KROKÓW
   Obsługuje ograniczenia ≤, ≥, =. Minimalizację zamienia na maksymalizację −Z.
   ===================================================================== */
function solveLP(c, A0, rel0, b0, maxi, rec, vn, method = '2F', opts = {}) {   // domyślnie dwufazowa: stabilna numerycznie
  // method: 'M' – metoda dużego M, '2F' – metoda dwufazowa (faza I: minimalizacja sumy zmiennych sztucznych)
  // opts.maxIt – limit iteracji (domyślnie zależny od rozmiaru zadania); wynik: optimal | unbounded | infeasible | limit
  const n = c.length, m = A0.length;
  const bigM = Math.max(1e6, 1e4 * Math.max(1, ...c.map(Math.abs), ...A0.flat().map(Math.abs), ...b0.map(Math.abs)));   // lokalnie – bez zmiennych globalnych
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
  const basis0 = basis.slice(), art = extra.filter(e => e.art).map(e => e.col), isArt = k => art.includes(k);
  const T = Array.from({length: m + 1}, () => Array(N + 1).fill(0));
  for (let i = 0; i < m; i++) { for (let j = 0; j < n; j++) T[i][j] = A[i][j]; T[i][N] = b[i]; }
  extra.forEach(e => T[e.i][e.col] = e.v);
  let hide = [], zl = maxi ? 'Z' : '−Z';
  const snap = (text, pr = -1, pc = -1) => rec.push({T: T.map(r => r.slice()), basis: basis.slice(), names, pr, pc, text, b0: basis0, fl: flip, hide: hide.slice(), zl});
  const setObjective = () => { T[m].fill(0); for (let j = 0; j < n; j++) T[m][j] = maxi ? -c[j] : c[j]; };
  const eliminate = () => { for (let i = 0; i < m; i++) { const f = T[m][basis[i]]; if (f) for (let j = 0; j <= N; j++) T[m][j] -= f * T[i][j]; } };
  const pivot = (pr, pc) => {
    const p = T[pr][pc]; for (let j = 0; j <= N; j++) T[pr][j] /= p;
    for (let i = 0; i <= m; i++) if (i !== pr) { const f = T[i][pc]; if (f) for (let j = 0; j <= N; j++) T[i][j] -= f * T[pr][j]; }
    basis[pr] = pc;
  };
  const artPositive = () => basis.some((k, i) => isArt(k) && T[i][N] > 1e-7);
  const INF_TXT = 'W bazie została zmienna sztuczna o dodatniej wartości – ograniczenia wzajemnie się wykluczają. Brak rozwiązania dopuszczalnego.';
  const maxIt = opts.maxIt ?? Math.max(200, 25 * (m + N));          // zabezpieczenie przed zapętleniem, rośnie z rozmiarem zadania
  let total = 0, bland = false; const seen = new Set();
  /* Iteracje simpleksu. Wynik: {kind: 'opt'} | {kind: 'unb', pc} | {kind: 'limit'}.
     Ochrona przed cyklowaniem: gdy baza się powtórzy, przechodzimy na regułę Blanda (najmniejsze indeksy) – wtedy simpleks zawsze się kończy.
     W zadaniach bez cyklowania baza nigdy się nie powtarza, więc kroki i wyniki pozostają takie jak przy regule Dantziga. */
  const iterate = (prefix, goal, banned) => {
    for (let it = 1; ; it++) {
      let pc = -1, mn = -1e-9;
      if (bland) { for (let j = 0; j < N; j++) if (!banned(j) && T[m][j] < -1e-9) { pc = j; break; } }
      else for (let j = 0; j < N; j++) if (!banned(j) && T[m][j] < mn) { mn = T[m][j]; pc = j; }
      if (pc < 0) return {kind: 'opt'};
      if (total >= maxIt) return {kind: 'limit'};
      let best = Infinity; const ratios = [], rows = [];
      for (let i = 0; i < m; i++) if (T[i][pc] > 1e-9) {
        const q = T[i][N] / T[i][pc]; ratios.push(`${names[basis[i]]}: ${fmt(T[i][N])}/${fmt(T[i][pc])} = ${fmt(q)}`); rows.push([i, q]);
        if (q < best) best = q;
      }
      if (!rows.length) return {kind: 'unb', pc};
      const ties = rows.filter(([, q]) => q <= best + 1e-12 * (1 + Math.abs(best))).map(([i]) => i);
      const pr = bland ? ties.reduce((a, i) => basis[i] < basis[a] ? i : a) : ties[0];
      const key = basis.slice().sort((u, v) => u - v).join(',');
      if (!bland && seen.has(key)) {
        bland = true; it--;
        snap('Baza powtórzyła się – przy zdegenerowanych wierzchołkach simpleks krążyłby w nieskończoność (cyklowanie). Od tej chwili stosujemy regułę Blanda: do bazy wchodzi pierwsza kolumna z ujemną wartością, a przy remisie w teście ilorazów bazę opuszcza zmienna o najmniejszym indeksie. Ta reguła gwarantuje zakończenie obliczeń.');
        continue;
      }
      seen.add(key);
      const p = T[pr][pc];
      snap(`${prefix}teracja ${it}. Kolumna wejściowa: ${names[pc]} – ${bland ? 'pierwsza kolumna z ujemną wartością' : 'najbardziej ujemna wartość'} w wierszu ${zl} (${fmt(T[m][pc])}), więc wprowadzenie tej zmiennej ${goal}. ` +
           `Test ilorazów (prawa strona ÷ element kolumny): ${ratios.join('; ')}. Najmniejszy iloraz (${fmt(best)}) ma wiersz zmiennej ${names[basis[pr]]} – ona opuszcza bazę${bland && ties.length > 1 ? ' (remis rozstrzygnięty regułą Blanda)' : ''}. ` +
           `Element centralny = ${fmt(p)}. Dzielimy wiersz przez ${fmt(p)}, potem zerujemy resztę kolumny ${names[pc]}.`, pr, pc);
      pivot(pr, pc); total++;
    }
  };
  const LIMIT_TXT = () => `Przekroczono limit ${maxIt} iteracji – obliczenia przerwano. Ten wynik NIE jest optimum i nie należy go używać (zadanie jest zbyt duże albo źle uwarunkowane numerycznie).`;
  const intro = `Tablica początkowa. Zamieniamy nierówności na równania: dodajemy zmienne zapasu (s), nadwyżki (e) i sztuczne (a). Zmienne bazowe: ${basis.map(k => names[k]).join(', ')}.`;
  const minTxt = maxi ? '' : ' Minimalizację Z zamieniamy na maksymalizację −Z (w wierszu −Z widać więc −Z).';
  let unb;
  if (method !== '2F' || !hasArt) {
    /* ---------- metoda dużego M ---------- */
    setObjective(); art.forEach(k => T[m][k] = bigM); eliminate();
    snap(intro + (hasArt ? ` Zmienne sztuczne karzemy dużą stałą M = ${fmt(bigM)} (metoda dużego M).` : '') + (method === '2F' && !hasArt ? ' Brak zmiennych sztucznych, więc faza I nie jest potrzebna – od razu liczymy fazę II.' : '') + minTxt);
    const r1 = iterate('I', 'najbardziej poprawia funkcję celu', () => false);
    if (r1.kind === 'limit') { snap(LIMIT_TXT()); return {status: 'limit', maxIt}; }
    if (r1.kind === 'unb' && artPositive()) { snap(INF_TXT); return {status: 'infeasible'}; }
    unb = r1.kind === 'unb' ? r1.pc : -1;
  } else {
    /* ---------- metoda dwufazowa: faza I ---------- */
    zl = '−w'; T[m].fill(0); art.forEach(k => T[m][k] = 1); eliminate();
    snap(intro + ` Faza I: zamiast funkcji celu minimalizujemy sumę zmiennych sztucznych w = ${art.map(k => names[k]).join(' + ')} (w tablicy jako maksymalizacja −w). Jeśli minimum wyniesie 0, znaleźliśmy rozwiązanie dopuszczalne.`);
    if (iterate('Faza I, i', 'najbardziej zmniejsza sumę zmiennych sztucznych', () => false).kind === 'limit') { snap(LIMIT_TXT()); return {status: 'limit', maxIt}; }
    if (T[m][N] < -1e-7) {
      snap(`Koniec fazy I: minimum w = ${fmt(-T[m][N])} > 0 – nie da się wyzerować zmiennych sztucznych, więc ograniczenia wzajemnie się wykluczają. Brak rozwiązania dopuszczalnego.`);
      return {status: 'infeasible'};
    }
    let redundant = 0;
    for (let i = 0; i < m; i++) if (isArt(basis[i])) {             // zmienna sztuczna w bazie na poziomie 0 → wymieniamy ją
      const k = Array.from({length: N}, (_, j) => j).find(j => !isArt(j) && Math.abs(T[i][j]) > 1e-9);
      if (k === undefined) { redundant++; continue; }
      snap(`Zmienna sztuczna ${names[basis[i]]} została w bazie na poziomie 0. Wymieniamy ją na ${names[k]} (element centralny ${fmt(T[i][k])}), aby w fazie II baza nie zawierała zmiennych sztucznych.`, i, k);
      pivot(i, k);
    }
    /* ---------- faza II ---------- */
    hide = art.slice(); zl = maxi ? 'Z' : '−Z'; setObjective(); eliminate();
    snap('Koniec fazy I: w = 0, mamy rozwiązanie dopuszczalne. Faza II: pomijamy kolumny zmiennych sztucznych i wpisujemy do wiersza oryginalną funkcję celu, zerując w nim kolumny zmiennych bazowych.' +
      (redundant ? ` ${redundant === 1 ? 'Jedno ograniczenie jest' : redundant + ' ograniczenia są'} liniowo zależne od pozostałych – ${redundant === 1 ? 'jego zmienna sztuczna zostaje' : 'ich zmienne sztuczne zostają'} w bazie z wartością 0 i nie wpływa na wynik.` : '') + minTxt);
    const r2 = iterate('Faza II, i', 'najbardziej poprawia funkcję celu', isArt);
    if (r2.kind === 'limit') { snap(LIMIT_TXT()); return {status: 'limit', maxIt}; }
    unb = r2.kind === 'unb' ? r2.pc : -1;
  }
  if (unb >= 0) { snap(`Kolumna ${names[unb]} nie ma dodatnich elementów, więc zmienną ${names[unb]} można zwiększać w nieskończoność bez łamania ograniczeń. Problem jest nieograniczony.`, -1, unb); return {status: 'unbounded', pc: unb}; }
  const x = Array(n).fill(0);
  basis.forEach((k, i) => { if (k < n) x[k] = T[i][N]; });
  if (artPositive()) { snap(INF_TXT); return {status: 'infeasible'}; }
  snap('Wszystkie wartości w wierszu funkcji celu są nieujemne – rozwiązanie jest optymalne. Wartości zmiennych bazowych czytamy z kolumny prawych stron, pozostałe zmienne są równe 0.');
  /* Ceny dualne prosto z końcowej tablicy (bez przybliżeń): y_i = ∂Z/∂b_i dla oryginalnej prawej strony.
     ≤: wiersz celu w kolumnie zapasu; ≥: minus wiersz celu w kolumnie nadwyżki; =: kolumna sztuczna (minus M w metodzie dużego M).
     Uwzględniamy odwrócone wiersze (ujemna prawa strona) i minimalizację. */
  const usedM = method !== '2F' && hasArt;
  const y = Array.from({length: m}, (_, i) => {
    const col = basis0[i], sur = extra.find(e => e.i === i && e.v === -1);
    const yw = !isArt(col) ? T[m][col] : sur ? -T[m][sur.col] : T[m][col] - (usedM ? bigM : 0);
    return (maxi ? 1 : -1) * (flip[i] ? -1 : 1) * yw;
  });
  const degenerate = basis.some((k, i) => Math.abs(T[i][N]) < 1e-9);   // zmienna bazowa = 0 → ceny dualne mogą nie być jednoznaczne
  return {status: 'optimal', x, z: maxi ? T[m][N] : -T[m][N], y, degenerate};
}
function expand(M) {
  const cols = [], vn = [];
  M.t.forEach((t, j) => { cols.push([j, t === 'n' ? -1 : 1]); vn.push('x' + sub(j + 1) + (t === 'u' ? '⁺' : t === 'n' ? '′' : '')); });
  M.t.forEach((t, j) => { if (t === 'u') { cols.push([j, -1]); vn.push('x' + sub(j + 1) + '⁻'); } });
  return {cols, vn, c: cols.map(([j, s]) => s * M.c[j]), A: M.A.map(r => cols.map(([j, s]) => s * r[j]))};
}
/* Rozwiązuje model z typami zmiennych; extra = dodatkowe granice {j, rel, b} (dla Branch & Bound) */
/* Analiza wrażliwości z końcowej tablicy (czysta funkcja – testowalna):
   koszty zredukowane i zakresy współczynników celu (baza pozostaje optymalna), ceny dualne i zakresy prawych stron (baza pozostaje dopuszczalna). */
function lpSensitivity(M, r, rec) {
  const s = rec[rec.length - 1], T = s.T, m = M.A.length, N = T[0].length - 1;
  const vars = M.c.map((c, j) => {
    const row = s.basis.indexOf(j), rc = row < 0 ? Math.max(0, T[m][j]) : 0;
    let lo = -Infinity, hi = row < 0 ? rc : Infinity;                     // dopuszczalna zmiana współczynnika w postaci „max"
    if (row >= 0) for (let k = 0; k < N; k++) if (!s.basis.includes(k) && s.names[k][0] !== 'a') {
      const al = T[row][k], d = T[m][k];
      if (al > 1e-9) lo = Math.max(lo, -d / al); else if (al < -1e-9) hi = Math.min(hi, d / -al);
    }
    const [a, b] = M.maxi ? [c + lo, c + hi] : [c - hi, c - lo];
    return {basic: row >= 0, rc, lo: a, hi: b};
  });
  const rows = M.A.map((a, i) => {
    let lo = -Infinity, hi = Infinity;                                   // kolumna B⁻¹ dla i-tego ograniczenia
    for (let k = 0; k < m; k++) { const u = T[k][s.b0[i]], be = T[k][N];
      if (u > 1e-9) lo = Math.max(lo, -be / u); else if (u < -1e-9) hi = Math.min(hi, be / -u); }
    if (s.fl[i]) [lo, hi] = [-hi, -lo];
    return {lhs: a.reduce((t, v, j) => t + v * r.x[j], 0), y: r.y[i], lo: M.b[i] + lo, hi: M.b[i] + hi};
  });
  return {vars, rows, s};
}
function solveM(M, extra = [], rec = []) {
  const E = expand(M), A = E.A.map(r => r.slice()), rel = M.rel.slice(), b = M.b.slice();
  extra.forEach(e => { A.push(E.cols.map(([j, s]) => j === e.j ? s : 0)); rel.push(e.rel); b.push(e.b); });
  const r = solveLP(E.c, A, rel, b, M.maxi, rec, E.vn, M.method, {maxIt: M.maxIt});
  if (r.status === 'optimal') { const x = Array(M.n).fill(0); E.cols.forEach(([j, s], k) => x[j] += s * r.x[k]); r.x = x; }
  return r;
}
/* Zadanie dualne (reguły przekształceń SOB) */
const dualOf = M => { const mx = M.maxi; return {n: M.A.length, c: M.b.slice(), maxi: !mx, A: M.c.map((_, j) => M.A.map(r => r[j])), b: M.c.slice(),
  rel: M.t.map(t => t === 'u' ? '=' : mx ? '>=' : '<='), t: M.rel.map(r => r === '=' ? 'u' : r === (mx ? '<=' : '>=') ? 'c' : 'n')}; };
