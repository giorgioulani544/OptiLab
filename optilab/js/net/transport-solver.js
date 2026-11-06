/* ===== OptiLab – zagadnienie transportowe: solver (czysta matematyka, bez DOM, testowalny w Node) =====
   • zadania zbilansowane i niezbilansowane (automatycznie fikcyjny dostawca lub odbiorca o koszcie 0),
   • trasy zakazane (koszt null → wewnętrznie bardzo duże „M"), minimalizacja kosztu lub maksymalizacja zysku,
   • rozwiązanie początkowe: kąt północno-zachodni ('nw'), minimalny element ('lc'), VAM ('vam') – z krokami,
   • optymalizacja metodą potencjałów (MODI) z cyklem, degeneracja (przydziały zerowe ε),
   • rozwiązanie alternatywne, wskaźniki d_ij, ceny dualne (potencjały) i zakresy kosztów, przy których plan pozostaje optymalny. */
const TR_EPS = 1e-9;
function transportSolve(P, init = 'nw') {
  const maxi = !!P.maxi, sum = a => a.reduce((s, v) => s + v, 0);
  const supply = P.supply.slice(), demand = P.demand.slice(), cost = P.cost.map(r => r.slice());
  const sNames = (P.sNames || supply.map((_, i) => 'D' + (i + 1))).slice(), dNames = (P.dNames || demand.map((_, j) => 'O' + (j + 1))).slice();
  const S = sum(supply), D = sum(demand); let dummy = null;
  if (S > D + TR_EPS) { demand.push(S - D); dNames.push('Fikcyjny odbiorca'); cost.forEach(r => r.push(0)); dummy = {type: 'col', amount: S - D}; }
  else if (D > S + TR_EPS) { supply.push(D - S); sNames.push('Fikcyjny dostawca'); cost.push(demand.map(() => 0)); dummy = {type: 'row', amount: D - S}; }
  const m = supply.length, n = demand.length;
  const BIG = (1 + Math.max(1, ...cost.flat().filter(v => v !== null).map(Math.abs))) * 1e6;           // „M" dla tras zakazanych
  const w = cost.map(r => r.map(v => v === null ? BIG : (maxi ? -v : v)));                         // koszty robocze: max → −zysk
  const isDummy = (i, j) => !!dummy && (dummy.type === 'col' ? j === n - 1 : i === m - 1);
  const cv = (i, j) => cost[i][j] === null ? 'M' : fmt(cost[i][j]);
  const he = v => String(v).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);   // nazwy w opisach kroków są HTML-bezpieczne
  const route = (i, j) => `${he(sNames[i])} → ${he(dNames[j])}`;
  const x = Array.from({length: m}, () => Array(n).fill(0)), B = Array.from({length: m}, () => Array(n).fill(false));
  const copy = M => M.map(r => r.slice());

  /* ---------- 1. rozwiązanie początkowe ---------- */
  const a = supply.slice(), b = demand.slice(), rowOut = Array(m).fill(false), colOut = Array(n).fill(false), steps = [];
  let rowsLeft = m, colsLeft = n;
  const allocate = (i, j, why, extra = {}) => {
    const a0 = a[i], b0 = b[j], q = Math.min(a0, b0); x[i][j] = q; B[i][j] = true; a[i] -= q; b[j] -= q;
    let crossed, note = '';
    if (rowsLeft === 1 && colsLeft === 1) { rowOut[i] = colOut[j] = true; rowsLeft--; colsLeft--; crossed = 'both'; }
    else if (a[i] <= TR_EPS && (b[j] > TR_EPS || rowsLeft > 1)) { rowOut[i] = true; rowsLeft--; crossed = 'row'; }
    else { colOut[j] = true; colsLeft--; crossed = 'col'; }
    if (crossed !== 'both' && a[i] <= TR_EPS && b[j] <= TR_EPS)
      note = ` Jednocześnie wyczerpała się podaż i popyt – skreślamy tylko ${crossed === 'row' ? 'wiersz' : 'kolumnę'}, aby zachować m + n − 1 zmiennych bazowych (dalej pojawi się przydział zerowy – degeneracja).`;
    steps.push({i, j, q, crossed, x: copy(x), B: copy(B), a: a.slice(), b: b.slice(), rowOut: rowOut.slice(), colOut: colOut.slice(), ...extra,
      text: `${why} Przydzielamy min(${fmt(a0)}; ${fmt(b0)}) = ${fmt(q)} na trasie ${route(i, j)}. ` +
        (crossed === 'row' ? `Podaż ${he(sNames[i])} jest wyczerpana – skreślamy wiersz.` : crossed === 'col' ? `Popyt ${he(dNames[j])} jest zaspokojony – skreślamy kolumnę.` : 'To ostatnia wolna komórka – skreślamy wiersz i kolumnę.') + note});
  };
  const open = () => { const L = []; for (let i = 0; i < m; i++) if (!rowOut[i]) for (let j = 0; j < n; j++) if (!colOut[j]) L.push([i, j]); return L; };
  const better = (p, q) => w[p[0]][p[1]] < w[q[0]][q[1]] - TR_EPS || (Math.abs(w[p[0]][p[1]] - w[q[0]][q[1]]) <= TR_EPS && Math.min(a[p[0]], b[p[1]]) > Math.min(a[q[0]], b[q[1]]) + TR_EPS);
  const cheapest = cells => cells.reduce((best, c) => (!best || better(c, best)) ? c : best, null);
  const word = maxi ? 'największy zysk' : 'najmniejszy koszt';
  while (rowsLeft && colsLeft) {
    if (init === 'nw') {
      const i = rowOut.indexOf(false), j = colOut.indexOf(false);
      allocate(i, j, `Lewy górny róg nieskreślonej części tabeli: ${route(i, j)}.`);
    } else if (init === 'lc' || rowsLeft === 1 || colsLeft === 1) {
      const [i, j] = cheapest(open());
      allocate(i, j, init === 'vam' ? `Została jedna nieskreślona linia – wybieramy w niej ${word}: ${cv(i, j)} (${route(i, j)}).` : `Wśród nieskreślonych komórek ${word} ma trasa ${route(i, j)}: ${cv(i, j)}.`);
    } else {                                                                // VAM: kary = różnica dwóch najlepszych kosztów w linii
      const pen = vals => { const s = vals.slice().sort((p, q) => p - q); return s.length > 1 ? s[1] - s[0] : s[0]; };
      const rowPen = rowOut.map((o, i) => o ? null : pen(colOut.map((c, j) => c ? null : w[i][j]).filter(v => v !== null)));
      const colPen = colOut.map((o, j) => o ? null : pen(rowOut.map((r, i) => r ? null : w[i][j]).filter(v => v !== null)));
      let best = null;
      const consider = (type, k, p) => {
        if (p === null) return;
        const cells = type === 'row' ? colOut.map((c, j) => c ? null : [k, j]).filter(Boolean) : rowOut.map((r, i) => r ? null : [i, k]).filter(Boolean);
        const c = cheapest(cells), mc = w[c[0]][c[1]];
        if (!best || p > best.p + TR_EPS || (Math.abs(p - best.p) <= TR_EPS && mc < best.mc - TR_EPS)) best = {type, k, p, c, mc};
      };
      rowPen.forEach((p, i) => consider('row', i, p)); colPen.forEach((p, j) => consider('col', j, p));
      const [i, j] = best.c, pv = best.p >= BIG / 2 ? 'M' : fmt(best.p);
      allocate(i, j, `Kary (różnica dwóch ${maxi ? 'największych zysków' : 'najmniejszych kosztów'} w każdej linii): największa kara ${pv} jest w ${best.type === 'row' ? 'wierszu ' + he(sNames[i]) : 'kolumnie ' + he(dNames[j])}. W tej linii ${word} ma trasa ${route(i, j)}.`,
        {rowPen, colPen, line: {type: best.type, k: best.k}});
    }
  }
  /* degeneracja: uzupełniamy bazę do m + n − 1 komórek zerami (ε) w miejscach nietworzących cyklu */
  const parent = Array.from({length: m + n}, (_, k) => k), find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (B[i][j]) parent[find(i)] = find(m + j);
  const epsCells = [];
  let cnt = B.flat().filter(Boolean).length;
  if (cnt < m + n - 1) {
    const cand = []; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (!B[i][j]) cand.push([i, j]);
    cand.sort((p, q) => w[p[0]][p[1]] - w[q[0]][q[1]]);
    for (const [i, j] of cand) { if (cnt >= m + n - 1) break; if (find(i) !== find(m + j)) { parent[find(i)] = find(m + j); B[i][j] = true; epsCells.push({i, j}); cnt++; } }
  }
  const totals = X => { let t = 0, Mq = 0; X.forEach((r, i) => r.forEach((v, j) => { if (v > TR_EPS) { if (cost[i][j] === null) Mq += v; else t += cost[i][j] * v; } })); return {t, Mq}; };
  const initial = {method: init, steps, x: copy(x), B: copy(B), ...totals(x)};

  /* ---------- 2. metoda potencjałów (MODI) ---------- */
  const potentials = BB => {
    const u = Array(m).fill(null), v = Array(n).fill(null); u[0] = 0; let ch = true;
    while (ch) { ch = false; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (BB[i][j]) {
      if (u[i] !== null && v[j] === null) { v[j] = w[i][j] - u[i]; ch = true; } else if (v[j] !== null && u[i] === null) { u[i] = w[i][j] - v[j]; ch = true; } } }
    return {u: u.map(q => q ?? 0), v: v.map(q => q ?? 0)};
  };
  const reduced = (BB, u, v) => w.map((r, i) => r.map((c, j) => BB[i][j] ? null : c - u[i] - v[j]));
  const cycleFor = (BB, ei, ej) => {                                        // jedyna ścieżka w drzewie bazy: wiersz ei → kolumna ej
    const prev = new Map([[ei, -1]]), q = [ei];
    while (q.length) {
      const nd = q.shift(); if (nd === m + ej) break;
      if (nd < m) { for (let j = 0; j < n; j++) if (BB[nd][j] && !prev.has(m + j)) { prev.set(m + j, nd); q.push(m + j); } }
      else { const j = nd - m; for (let i = 0; i < m; i++) if (BB[i][j] && !prev.has(i)) { prev.set(i, nd); q.push(i); } }
    }
    const path = []; for (let nd = m + ej; nd !== -1 && nd !== undefined; nd = prev.get(nd)) path.push(nd);
    const cyc = [{i: ei, j: ej, s: 1}]; let s = -1;
    for (let k = 0; k + 1 < path.length; k++) { const p1 = path[k], p2 = path[k + 1], i = p1 < m ? p1 : p2, j = (p1 < m ? p2 : p1) - m; cyc.push({i, j, s}); s = -s; }
    return cyc;
  };
  const TOL = 1e-7, iters = []; let status = 'optimal';
  for (let it = 0; ; it++) {
    const {u, v} = potentials(B), d = reduced(B, u, v);
    let enter = null;
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (d[i][j] !== null && d[i][j] < -TOL && (!enter || d[i][j] < enter.d - TOL)) enter = {i, j, d: d[i][j]};
    const snap = {x: copy(x), B: copy(B), u, v, d, ...totals(x)};
    if (!enter) { iters.push({...snap, optimal: true}); break; }
    if (it >= 300) { status = 'limit'; iters.push(snap); break; }
    const cycle = cycleFor(B, enter.i, enter.j), minus = cycle.filter(c => c.s < 0);
    const theta = Math.min(...minus.map(c => x[c.i][c.j])), leave = minus.find(c => Math.abs(x[c.i][c.j] - theta) <= TR_EPS);
    iters.push({...snap, enter, cycle, theta, leave});
    cycle.forEach(c => { x[c.i][c.j] += c.s * theta; if (Math.abs(x[c.i][c.j]) < TR_EPS) x[c.i][c.j] = 0; });
    B[enter.i][enter.j] = true; B[leave.i][leave.j] = false; x[leave.i][leave.j] = 0;
  }
  const fin = iters[iters.length - 1];
  const forbiddenUsed = [];
  x.forEach((r, i) => r.forEach((q, j) => { if (cost[i][j] === null && q > TR_EPS) forbiddenUsed.push({i, j, q}); }));
  if (forbiddenUsed.length) status = 'infeasible';

  /* ---------- 3. analiza wyniku ---------- */
  let alt = null;                                                           // rozwiązanie alternatywne: trasa niebazowa z d = 0 i θ > 0
  if (status === 'optimal') for (let i = 0; i < m && !alt; i++) for (let j = 0; j < n && !alt; j++) {
    if (B[i][j] || cost[i][j] === null || Math.abs(fin.d[i][j]) > TOL) continue;
    const cyc = cycleFor(B, i, j), th = Math.min(...cyc.filter(c => c.s < 0).map(c => x[c.i][c.j]));
    if (th > TR_EPS) { const X = copy(x); cyc.forEach(c => X[c.i][c.j] += c.s * th); alt = {x: X, via: {i, j}, theta: th, ...totals(X)}; }
  }
  // zakresy kosztów (min) / zysków (max) trasy, w których obecny plan pozostaje optymalny
  const ranges = cost.map((r, i) => r.map((c, j) => {
    if (c === null || isDummy(i, j)) return null;
    let lo = -Infinity, hi = Infinity;                                       // dopuszczalna zmiana kosztu roboczego w[i][j]
    if (!B[i][j]) lo = -fin.d[i][j];
    else for (let k = 0; k < m; k++) for (let l = 0; l < n; l++) {
      if (B[k][l] || cost[k][l] === null) continue;
      const cell = cycleFor(B, k, l).find(q => q.i === i && q.j === j); if (!cell) continue;
      if (cell.s > 0) lo = Math.max(lo, -fin.d[k][l]); else hi = Math.min(hi, fin.d[k][l]);
    }
    return maxi ? {lo: c - hi, hi: c - lo} : {lo: c + lo, hi: c + hi};
  }));
  return {status, maxi, m, n, sNames, dNames, cost, supply, demand, dummy, BIG, w, isDummy, initial, epsCells, iters,
    x, B, ...totals(x), alt, ranges, forbiddenUsed, u: fin.u, v: fin.v, d: fin.d};
}
