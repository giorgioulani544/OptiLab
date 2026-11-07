/* ===== OptiLab – analiza decyzji: solver (bez DOM, testowalny w Node) =====
   Tabela wypłat (zyski lub koszty): Wald (maximin), maximax, Hurwicz (α), Laplace, Savage (minimax żalu); z prawdopodobieństwami: EMV, EOL, EVPI.
   Drzewa decyzyjne (rollback), twierdzenie Bayesa i EVSI, progi opłacalności dla dwóch stanów, użyteczność wykładnicza,
   gry dwuosobowe o sumie zerowej: punkt siodłowy, dominacja, strategie mieszane naszym solverem LP. */
const DEC_EPS = 1e-9;
function decCriteria(V, kind = 'profit', alpha = 0.5, P = null) {
  const prof = kind === 'profit', m = V.length, n = V[0].length, best = arr => prof ? Math.max(...arr) : Math.min(...arr), worst = arr => prof ? Math.min(...arr) : Math.max(...arr);
  const pick = vals => { const b = prof ? Math.max(...vals) : Math.min(...vals); return {vals, best: b, idx: vals.map((v, i) => Math.abs(v - b) <= DEC_EPS * (1 + Math.abs(b)) ? i : -1).filter(i => i >= 0)}; };
  const colBest = Array.from({length: n}, (_, j) => best(V.map(r => r[j]))), regret = V.map(r => r.map((v, j) => Math.abs(colBest[j] - v)));
  const out = {kind, colBest, regret,
    wald: pick(V.map(worst)), maximax: pick(V.map(best)), hurwicz: pick(V.map(r => alpha * best(r) + (1 - alpha) * worst(r))), laplace: pick(V.map(r => r.reduce((s, v) => s + v, 0) / n)),
    savage: (() => { const mr = regret.map(r => Math.max(...r)), b = Math.min(...mr); return {vals: mr, best: b, idx: mr.map((v, i) => Math.abs(v - b) <= DEC_EPS * (1 + b) ? i : -1).filter(i => i >= 0)}; })()};
  if (P) { out.emv = pick(V.map(r => r.reduce((s, v, j) => s + P[j] * v, 0))); const eol = regret.map(r => r.reduce((s, v, j) => s + P[j] * v, 0)), b = Math.min(...eol);
    out.eol = {vals: eol, best: b, idx: eol.map((v, i) => Math.abs(v - b) <= DEC_EPS * (1 + b) ? i : -1).filter(i => i >= 0)};
    out.evwpi = colBest.reduce((s, v, j) => s + P[j] * v, 0); out.evpi = Math.abs(out.evwpi - out.emv.best); }
  return out;
}
/* przedziały p (prawdopodobieństwo stanu 1 przy dwóch stanach), w których dana decyzja ma najlepsze EMV */
function decSens2(V, kind = 'profit') {
  const prof = kind === 'profit', ev = (r, p) => p * r[0] + (1 - p) * r[1], cuts = new Set([0, 1]);
  for (let i = 0; i < V.length; i++) for (let k = i + 1; k < V.length; k++) { const d = (V[i][0] - V[i][1]) - (V[k][0] - V[k][1]); if (Math.abs(d) > DEC_EPS) { const p = (V[k][1] - V[i][1]) / d; if (p > DEC_EPS && p < 1 - DEC_EPS) cuts.add(p); } }
  const pts = [...cuts].sort((a, b) => a - b), segs = [];
  for (let k = 0; k + 1 < pts.length; k++) { const mid = (pts[k] + pts[k + 1]) / 2, vals = V.map(r => ev(r, mid)), b = prof ? Math.max(...vals) : Math.min(...vals), i = vals.findIndex(v => Math.abs(v - b) < DEC_EPS * (1 + Math.abs(b)));
    if (segs.length && segs[segs.length - 1].i === i) segs[segs.length - 1].to = pts[k + 1]; else segs.push({i, from: pts[k], to: pts[k + 1]}); }
  return segs;
}
function decBayes(prior, like) {                                        // like[o][s] = P(wynik o | stan s)
  const po = like.map(r => r.reduce((s, v, j) => s + v * prior[j], 0)), post = like.map((r, o) => r.map((v, j) => po[o] > 0 ? v * prior[j] / po[o] : 0)); return {po, post};
}
function decEVSI(V, prior, like, kind = 'profit', cost = 0) {
  const prof = kind === 'profit', B = decBayes(prior, like), base = decCriteria(V, kind, 0.5, prior);
  const branch = B.post.map((q, o) => { const ev = V.map(r => r.reduce((s, v, j) => s + q[j] * v, 0)), b = prof ? Math.max(...ev) : Math.min(...ev); return {o, p: B.po[o], ev, best: b, idx: ev.indexOf(b)}; });
  const evwsi = branch.reduce((s, x) => s + x.p * x.best, 0), evsi = Math.abs(evwsi - base.emv.best);
  return {...B, branch, evwsi, evsi, emv: base.emv.best, evpi: base.evpi, eff: base.evpi > 0 ? evsi / base.evpi : null, worth: evsi > cost + DEC_EPS, net: prof ? evwsi - cost : evwsi + cost};
}
/* drzewo: nodes [{name, type: 'D'|'L'|'K', parent (indeks|-1), label, prob, value}] – value: wypłata końcowa (K) albo przepływ na gałęzi prowadzącej do węzła */
function decTreeCheck(nodes) {
  const errs = [], n = nodes.length, roots = nodes.map((x, i) => x.parent < 0 ? i : -1).filter(i => i >= 0);
  if (roots.length !== 1) errs.push({i: roots[1] ?? 0, field: 'parent', msg: roots.length ? 'drzewo może mieć tylko jeden korzeń (węzeł bez rodzica).' : 'brak korzenia – jeden węzeł musi nie mieć rodzica.'});
  nodes.forEach((x, i) => { if (x.parent >= 0 && nodes[x.parent].type === 'K') errs.push({i, field: 'parent', msg: `węzeł końcowy „${nodes[x.parent].name}" nie może mieć następników.`});
    const kids = nodes.filter(y => y.parent === i); if (x.type !== 'K' && !kids.length) errs.push({i, field: 'type', msg: `węzeł „${x.name}" (${x.type === 'D' ? 'decyzyjny' : 'losowy'}) nie ma gałęzi.`});
    if (x.type === 'L') { const s = kids.reduce((a, y) => a + (y.prob ?? 0), 0); if (Math.abs(s - 1) > 1e-6) errs.push({i, field: 'prob', msg: `prawdopodobieństwa gałęzi węzła losowego „${x.name}" sumują się do ${Math.round(s * 1e6) / 1e6}, a muszą do 1.`}); } });
  for (let i = 0; i < n && !errs.length; i++) { let k = i, steps = 0; while (k >= 0 && steps <= n) { k = nodes[k].parent; steps++; } if (steps > n) errs.push({i, field: 'parent', msg: 'odwołania do rodziców tworzą cykl.'}); }
  return errs;
}
function decTree(nodes, kind = 'profit') {
  const prof = kind === 'profit', ev = Array(nodes.length).fill(null), choice = Array(nodes.length).fill(-1), kids = nodes.map((_, i) => nodes.map((y, k) => y.parent === i ? k : -1).filter(k => k >= 0));
  const roll = i => { const x = nodes[i];
    if (x.type === 'K') ev[i] = 0;
    else if (x.type === 'L') ev[i] = kids[i].reduce((s, k) => s + nodes[k].prob * (roll(k) + nodes[k].value), 0);
    else { let b = null; kids[i].forEach(k => { const v = roll(k) + nodes[k].value; if (b === null || (prof ? v > b + DEC_EPS : v < b - DEC_EPS)) { b = v; choice[i] = k; } }); ev[i] = b; }
    return ev[i]; };
  const root = nodes.findIndex(x => x.parent < 0); roll(root);
  const path = []; const walk = i => { const x = nodes[i]; if (x.type === 'D' && choice[i] >= 0) { path.push(choice[i]); walk(choice[i]); } else if (x.type === 'L') kids[i].forEach(walk); }; walk(root);
  return {ev, choice, root, kids, best: path, value: ev[root]};
}
function decUtility(V, P, R) {                                         // U(x) = 1 − e^(−x/R) (niechęć do ryzyka), równoważnik pewności CE = −R·ln(1 − EU)
  const U = x => 1 - Math.exp(-x / R), eu = V.map(r => r.reduce((s, v, j) => s + P[j] * U(v), 0)), ce = eu.map(u => -R * Math.log(1 - u)), b = Math.max(...eu);
  return {eu, ce, idx: eu.indexOf(b), U};
}
/* gra o sumie zerowej: A[i][j] – wypłata gracza wierszowego */
function gameSolve(A) {
  const m = A.length, n = A[0].length, rowMin = A.map(r => Math.min(...r)), colMax = A[0].map((_, j) => Math.max(...A.map(r => r[j]))), lo = Math.max(...rowMin), hi = Math.min(...colMax);
  const saddle = Math.abs(lo - hi) < DEC_EPS ? {v: lo, cells: A.flatMap((r, i) => r.map((v, j) => Math.abs(v - lo) < DEC_EPS && Math.abs(rowMin[i] - lo) < DEC_EPS && Math.abs(colMax[j] - lo) < DEC_EPS ? [i, j] : null).filter(Boolean))} : null;
  let rows = [...Array(m).keys()], cols = [...Array(n).keys()]; const dom = []; let changed = true;   // dominacja (słaba) – kolejne usuwanie
  while (changed && (rows.length > 1 || cols.length > 1)) { changed = false;
    for (const i of rows) { const k = rows.find(k2 => k2 !== i && cols.every(j => A[k2][j] >= A[i][j] - DEC_EPS)); if (k !== undefined) { rows = rows.filter(x => x !== i); dom.push({who: 'A', out: i, by: k}); changed = true; break; } }
    if (changed) continue;
    for (const j of cols) { const k = cols.find(k2 => k2 !== j && rows.every(i => A[i][k2] <= A[i][j] + DEC_EPS)); if (k !== undefined) { cols = cols.filter(x => x !== j); dom.push({who: 'B', out: j, by: k}); changed = true; break; } } }
  const sh = Math.max(0, 1 - Math.min(...A.flat())), Ar = rows.map(i => cols.map(j => A[i][j] + sh));
  const LA_ = (c, Arows, rel, maxi) => solveM({n: c.length, c, A: Arows, rel, b: Arows.map(() => 1), maxi, t: c.map(() => 'c'), method: '2F'});
  const ra = LA_(rows.map(() => 1), cols.map((_, jj) => rows.map((_, ii) => Ar[ii][jj])), cols.map(() => '>='), false), rb = LA_(cols.map(() => 1), Ar, rows.map(() => '<='), true);
  if (ra.status !== 'optimal' || rb.status !== 'optimal') return {status: 'error', saddle, dom};
  const v = 1 / ra.z - sh, p = Array(m).fill(0), q = Array(n).fill(0); rows.forEach((i, k) => { p[i] = ra.x[k] / ra.z; }); cols.forEach((j, k) => { q[j] = rb.x[k] / rb.z; });
  return {status: 'ok', v, p, q, saddle, dom, rows, cols, lo, hi, rowMin, colMax, shift: sh};
}
