/* ===== OptiLab – programowanie celowe: solver (bez DOM, testowalny w Node; korzysta z solveM / ilpSolve) =====
   Cel i: a_i·x + d_i⁻ − d_i⁺ = b_i. Niepożądane odchylenie zależy od rodzaju celu: „≥” – d⁻ (niedobór), „≤” – d⁺ (nadmiar), „=” – oba.
   Metody: priorytety (leksykograficznie – kolejne zadania LP, osiągnięcia wyższych poziomów zostają zachowane), wagi (suma ważona),
   minimax (Czebyszewa: najmniejsze największe ważone odchylenie). Opcje: normalizacja odchyleń (% wartości docelowej), zmienne całkowite. */
const GP_EPS = 1e-7;
/* P: {n, goals: [{a[], type: '>='|'<='|'=', b, P, w, name}], hard: [{a[], rel, b}], int: bool, norm: bool} */
function gpModel(P) {
  const n = P.n, G = P.goals.length, N = n + 2 * G, rows = [], rel = [], rhs = [], dm = i => n + 2 * i, dp = i => n + 2 * i + 1;
  P.goals.forEach((g, i) => { const r = Array(N).fill(0); g.a.forEach((v, j) => { r[j] = v; }); r[dm(i)] = 1; r[dp(i)] = -1; rows.push(r); rel.push('='); rhs.push(g.b); });
  (P.hard || []).forEach(h => { const r = Array(N).fill(0); h.a.forEach((v, j) => { r[j] = v; }); rows.push(r); rel.push(h.rel); rhs.push(h.b); });
  const scale = i => P.norm ? 1 / Math.max(GP_EPS, Math.abs(P.goals[i].b)) : 1;
  const devCost = (i, mult) => { const g = P.goals[i], c = Array(N).fill(0); if (g.type !== '<=') c[dm(i)] = mult * g.w * scale(i); if (g.type !== '>=') c[dp(i)] = mult * g.w * scale(i); return c; };
  return {n, G, N, rows, rel, rhs, dm, dp, devCost, t: [...Array(n).fill(P.int ? 'i' : 'c'), ...Array(2 * G).fill('c')]};
}
const gpRun = (M, P) => { if (!P.int) return solveM(M); const R = ilpSolve(M, {rule: 'most', search: 'best'}); return R.status === 'optimal' ? {status: 'optimal', x: R.best, z: R.bestZ} : {status: R.status === 'infeasible' ? 'infeasible' : 'limit'}; };
function gpSolve(P, method = 'lex') {
  const md = gpModel(P), {N, rows, rel, rhs} = md, base = {n: N, A: rows.map(r => r.slice()), rel: rel.slice(), b: rhs.slice(), maxi: false, t: md.t, method: '2F'}, stages = [];
  const sumC = arr => arr.reduce((s, c) => s.map((v, j) => v + c[j]), Array(N).fill(0));
  let res = null;
  if (method === 'lex') {
    const levels = [...new Set(P.goals.map(g => g.P))].sort((a, b) => a - b), extra = [];
    for (const L of levels) {
      const c = sumC(P.goals.map((g, i) => g.P === L ? md.devCost(i, 1) : Array(N).fill(0)));
      const M = {...base, c, A: [...base.A, ...extra.map(e => e.row)], rel: [...base.rel, ...extra.map(() => '<=')], b: [...base.b, ...extra.map(e => e.rhs)]};
      const r = gpRun(M, P); if (r.status !== 'optimal') return {status: r.status, stages, md};
      stages.push({L, c, z: r.z, x: r.x, goals: P.goals.map((g, i) => g.P === L ? i : -1).filter(i => i >= 0)});
      if (r.z <= 1e-9) c.forEach((v, j) => { if (v > 0) { const e = Array(N).fill(0); e[j] = 1; extra.push({row: e, rhs: 0}); } });   // cel osiągnięty w całości – odchylenia dokładnie 0
      else extra.push({row: c, rhs: r.z * (1 + 1e-9) + 1e-9});                                                                         // utrzymaj osiągnięcie tego poziomu (tolerancja tylko na zaokrąglenia)
      res = r;
    }
  } else if (method === 'weighted') {
    const c = sumC(P.goals.map((g, i) => md.devCost(i, 1))); res = gpRun({...base, c}, P); if (res.status !== 'optimal') return {status: res.status, stages, md};
    stages.push({L: 0, c, z: res.z, x: res.x, goals: P.goals.map((_, i) => i)});
  } else {                                                                    // minimax: min D, w_i·odchylenie_i ≤ D
    const Nm = N + 1, ext = r => [...r, 0], A = rows.map(ext), R = rel.slice(), B = rhs.slice();
    P.goals.forEach((g, i) => { const dc = md.devCost(i, 1); if (g.type === '=') { [md.dm(i), md.dp(i)].forEach(j => { const r = Array(Nm).fill(0); r[j] = dc[j]; r[N] = -1; A.push(r); R.push('<='); B.push(0); }); }
      else { const r = [...dc, -1]; A.push(r); R.push('<='); B.push(0); } });
    const c = Array(Nm).fill(0); c[N] = 1; res = gpRun({n: Nm, c, A, rel: R, b: B, maxi: false, t: [...md.t, 'c'], method: '2F'}, P); if (res.status !== 'optimal') return {status: res.status, stages, md};
    res = {...res, x: res.x.slice(0, N)}; stages.push({L: 0, c: null, z: res.z, x: res.x, goals: P.goals.map((_, i) => i)});
  }
  const x = res.x.slice(0, P.n).map(v => Math.abs(v) < 1e-9 ? 0 : v);
  const ach = P.goals.map((g, i) => { const val = g.a.reduce((s, v, j) => s + v * x[j], 0), dmn = Math.max(0, g.b - val), dpl = Math.max(0, val - g.b), bad = (g.type !== '<=' ? dmn : 0) + (g.type !== '>=' ? dpl : 0);
    return {i, val, dm: dmn, dp: dpl, bad, ok: bad <= 1e-6 * (1 + Math.abs(g.b))}; });
  return {status: 'optimal', x, ach, stages, md, method};
}
