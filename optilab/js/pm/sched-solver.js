/* ===== OptiLab – harmonogramowanie zadań: solver (czysta logika, bez DOM, testowalny w Node) =====
   Jedna maszyna: FCFS, SPT, WSPT, EDD, LPT, Moore-Hodgson (miary: C, F, L, T, liczba spóźnionych, ΣwC, Cmax).
   Flow shop: Johnson (2 maszyny, 3 maszyny przy spełnionym warunku), dla m maszyn heurystyki CDS, Palmer, Dannenbring, NEH
   oraz optimum przeglądem permutacji (n ≤ 8). Maszyny równoległe: LPT (heurystyka) i McNaughton (z podziałem zadań, optimum). */
const SC_EPS = 1e-9;
function scMeasures(p, d, w, seq) {                                     // jedna maszyna, wszystkie zadania gotowe w chwili 0
  let t = 0; const rows = seq.map(j => { t += p[j]; const L = t - d[j]; return {j, S: t - p[j], C: t, F: t, L, T: Math.max(0, L)}; });
  const n = seq.length, sum = k => rows.reduce((s, r) => s + r[k], 0);
  return {rows, Cmax: t, meanF: sum('F') / n, meanT: sum('T') / n, maxL: Math.max(...rows.map(r => r.L)), nTardy: rows.filter(r => r.T > SC_EPS).length,
    sumWC: rows.reduce((s, r) => s + w[r.j] * r.C, 0), avgInSystem: t > 0 ? sum('F') / t : 0};
}
function scRule(p, d, w, rule) {
  const n = p.length, idx = [...Array(n).keys()], by = f => idx.slice().sort((a, b) => f(a) - f(b) || a - b);   // remis: kolejność wpisania
  if (rule === 'FCFS') return {seq: idx};
  if (rule === 'SPT') return {seq: by(j => p[j])};
  if (rule === 'LPT') return {seq: by(j => -p[j])};
  if (rule === 'WSPT') return {seq: by(j => w[j] > 0 ? p[j] / w[j] : Infinity)};
  if (rule === 'EDD') return {seq: by(j => d[j])};
  if (rule === 'MH') {                                                   // Moore-Hodgson: minimalna liczba zadań spóźnionych
    const edd = by(j => d[j]), on = [], late = [], steps = []; let t = 0;
    edd.forEach(j => { on.push(j); t += p[j];
      if (t > d[j] + SC_EPS) { const k = on.reduce((a, b) => p[b] > p[a] ? b : a); on.splice(on.indexOf(k), 1); late.push(k); t -= p[k]; steps.push({j, k, t}); } });
    return {seq: [...on, ...late], late, steps};
  }
  throw new Error('nieznana reguła ' + rule);
}
function scBrute(n, f) {                                                 // przegląd wszystkich permutacji (n ≤ 8): minimalna wartość f(perm)
  let best = null; const perm = [], used = Array(n).fill(false);
  const go = () => { if (perm.length === n) { const v = f(perm); if (!best || v < best.v - SC_EPS) best = {v, seq: perm.slice()}; return; }
    for (let j = 0; j < n; j++) if (!used[j]) { used[j] = true; perm.push(j); go(); perm.pop(); used[j] = false; } };
  go(); return best;
}
function scFlow(P, seq) {                                                // flow shop: P[j][k] – czas zadania j na maszynie k; zwraca C[pozycja][k]
  const m = P[0].length, C = seq.map(() => Array(m).fill(0));
  seq.forEach((j, r) => { for (let k = 0; k < m; k++) C[r][k] = Math.max(r ? C[r - 1][k] : 0, k ? C[r][k - 1] : 0) + P[j][k]; });
  return {C, Cmax: seq.length ? C[seq.length - 1][m - 1] : 0};
}
function scJohnson(a, b) {                                               // dwie maszyny: a – czasy na M1, b – na M2
  const n = a.length, left = [], right = [], free = new Set([...Array(n).keys()]), steps = [];
  while (free.size) {
    let best = null; free.forEach(j => { [[a[j], 1], [b[j], 2]].forEach(([v, mch]) => { if (!best || v < best.v - SC_EPS || (Math.abs(v - best.v) <= SC_EPS && (mch < best.m || (mch === best.m && j < best.j)))) best = {v, m: mch, j}; }); });
    free.delete(best.j); if (best.m === 1) left.push(best.j); else right.unshift(best.j); steps.push(best);
  }
  return {seq: [...left, ...right], steps};
}
function scJohnson3(P) {                                                 // trzy maszyny: optymalne, gdy min p1 ≥ max p2 lub min p3 ≥ max p2
  const p1 = P.map(r => r[0]), p2 = P.map(r => r[1]), p3 = P.map(r => r[2]);
  const exact = Math.min(...p1) >= Math.max(...p2) - SC_EPS || Math.min(...p3) >= Math.max(...p2) - SC_EPS;
  return {...scJohnson(P.map((_, j) => p1[j] + p2[j]), P.map((_, j) => p2[j] + p3[j])), exact};
}
function scCDS(P) {                                                      // Campbell-Dudek-Smith: m−1 zadań pomocniczych dla reguły Johnsona
  const m = P[0].length, subs = [];
  for (let k = 1; k < m; k++) { const a = P.map(r => r.slice(0, k).reduce((s, v) => s + v, 0)), b = P.map(r => r.slice(m - k).reduce((s, v) => s + v, 0)), seq = scJohnson(a, b).seq; subs.push({k, a, b, seq, Cmax: scFlow(P, seq).Cmax}); }
  const best = subs.reduce((x, y) => y.Cmax < x.Cmax - SC_EPS ? y : x); return {subs, seq: best.seq, Cmax: best.Cmax, k: best.k};
}
function scPalmer(P) {                                                   // indeks nachylenia: s_j = Σ (2k − m − 1) p_jk, kolejność malejąco
  const m = P[0].length, s = P.map(r => r.reduce((t, v, k) => t + (2 * (k + 1) - m - 1) * v, 0)), seq = [...P.keys()].sort((x, y) => s[y] - s[x] || x - y);
  return {idx: s, seq, Cmax: scFlow(P, seq).Cmax};
}
function scDannenbring(P) {                                              // „rapid access": a_j = Σ (m − k + 1) p_jk, b_j = Σ k p_jk, potem Johnson
  const m = P[0].length, a = P.map(r => r.reduce((t, v, k) => t + (m - k) * v, 0)), b = P.map(r => r.reduce((t, v, k) => t + (k + 1) * v, 0)), seq = scJohnson(a, b).seq;
  return {a, b, seq, Cmax: scFlow(P, seq).Cmax};
}
function scNEH(P) {                                                      // Nawaz-Enscore-Ham: wstawianie zadań w kolejności malejącej sumy czasów
  const order = [...P.keys()].sort((x, y) => P[y].reduce((s, v) => s + v, 0) - P[x].reduce((s, v) => s + v, 0) || x - y), steps = []; let seq = [];
  order.forEach(j => { let best = null; for (let pos = 0; pos <= seq.length; pos++) { const cand = [...seq.slice(0, pos), j, ...seq.slice(pos)], c = scFlow(P, cand).Cmax; if (!best || c < best.c - SC_EPS) best = {c, cand, pos}; }
    seq = best.cand; steps.push({j, pos: best.pos, Cmax: best.c, seq: seq.slice()}); });
  return {order, steps, seq, Cmax: scFlow(P, seq).Cmax};
}
function scLPT(p, m) {                                                   // maszyny równoległe: najdłuższe zadanie na najmniej obciążoną maszynę
  const load = Array(m).fill(0), parts = [], order = [...p.keys()].sort((a, b) => p[b] - p[a] || a - b);
  order.forEach(j => { const k = load.indexOf(Math.min(...load)); parts.push({j, k, s: load[k], e: load[k] + p[j]}); load[k] += p[j]; });
  return {parts, Cmax: Math.max(...load), load};
}
function scMcNaughton(p, m) {                                            // z podziałem zadań: Cmax* = max(max p, Σp / m) – optimum
  const Cs = Math.max(Math.max(...p), p.reduce((s, v) => s + v, 0) / m), parts = []; let k = 0, t = 0;
  p.forEach((pj, j) => { let rest = pj; while (rest > SC_EPS) { const take = Math.min(rest, Cs - t); parts.push({j, k, s: t, e: t + take}); rest -= take; t += take; if (t >= Cs - SC_EPS) { k++; t = 0; } } });
  return {parts, Cmax: Cs};
}
