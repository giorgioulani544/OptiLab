/* ===== OptiLab – dobór wielkości partii przy zapotrzebowaniu zmiennym w czasie (bez DOM, testowalne w Node) =====
   Wspólne dla modułów Zapasy i MRP. Wejście: zapotrzebowanie netto r[t] ≥ 0. Koszt utrzymania liczony od zapasu na koniec okresu
   (jednostka przyjęta w okresie i i zużyta w okresie k jest utrzymywana k − i okresów). */
const LOT_RULES = {L4L: 'partia na partię (L4L)', FOQ: 'stała wielkość partii (FOQ)', EOQ: 'ekonomiczna wielkość partii (EOQ)', POQ: 'zamówienie na P okresów (POQ)', MINMAX: 'min-max',
  SM: 'Silver-Meal', LUC: 'najmniejszy koszt jednostkowy (LUC)', PPB: 'bilansowanie okres-część (PPB)', WW: 'Wagner-Whitin (optimum)'};
const LOT_EPS = 1e-9;
function lotCost(r, rec, S = 0, H = 0) {
  let inv = 0; const end = r.map((x, t) => (inv += rec[t] - x));
  const setups = rec.filter(q => q > LOT_EPS).length, hold = H * end.reduce((s, v) => s + Math.max(0, v), 0);
  return {end, setups, setupCost: S * setups, hold, total: S * setups + hold, short: end.some(v => v < -1e-7)};
}
function lotSize(r, rule, p = {}) {
  const T = r.length, rec = Array(T).fill(0), steps = [], S = p.S ?? 0, H = p.H ?? 0, sumR = (a, b) => { let s = 0; for (let k = a; k <= b; k++) s += r[k]; return s; };
  const hold = (t, j) => { let s = 0; for (let k = t; k <= j; k++) s += (k - t) * r[k]; return H * s; };   // koszt utrzymania, gdy partia z okresu t pokrywa t..j
  let extra = {};
  if (rule === 'L4L') r.forEach((x, t) => { rec[t] = x; });
  else if (rule === 'POQ') { for (let t = 0; t < T;) { if (r[t] <= LOT_EPS) { t++; continue; } const j = Math.min(T - 1, t + p.P - 1); rec[t] = sumR(t, j); steps.push({t, j}); t = j + 1; } }
  else if (rule === 'FOQ' || rule === 'EOQ') {
    const Q = rule === 'EOQ' ? Math.sqrt(2 * (sumR(0, T - 1) / T) * S / H) : p.Q; extra.Q = Q; let inv = 0;
    for (let t = 0; t < T; t++) { if (inv < r[t] - LOT_EPS) { const k = Math.ceil((r[t] - inv) / Q - 1e-9); rec[t] = k * Q; steps.push({t, k}); } inv += rec[t] - r[t]; }
  } else if (rule === 'MINMAX') {
    let inv = 0; for (let t = 0; t < T; t++) { if (inv - r[t] < p.min - LOT_EPS || inv - r[t] < -LOT_EPS) { rec[t] = p.max - (inv - r[t]); steps.push({t}); } inv += rec[t] - r[t]; }
  } else if (rule === 'SM' || rule === 'LUC' || rule === 'PPB') {
    for (let t = 0; t < T;) {
      if (r[t] <= LOT_EPS) { t++; continue; }
      let j = t, trail = [];
      const crit = jj => rule === 'SM' ? (S + hold(t, jj)) / (jj - t + 1) : rule === 'LUC' ? (S + hold(t, jj)) / sumR(t, jj) : hold(t, jj) / (H || 1);
      if (rule === 'PPB') {                                                // część-okresy najbliższe EPP = S / H
        const epp = S / H; let best = t; trail.push({j: t, v: 0});
        for (let jj = t + 1; jj < T; jj++) { const v = crit(jj); trail.push({j: jj, v}); if (Math.abs(v - epp) <= Math.abs(crit(best) - epp) + 1e-12) best = jj; if (v > epp) break; }
        j = best; extra.epp = epp;
      } else { let cur = crit(t); trail.push({j: t, v: cur}); while (j + 1 < T) { const nx = crit(j + 1); trail.push({j: j + 1, v: nx}); if (nx > cur + 1e-12) break; cur = nx; j++; } }
      rec[t] = sumR(t, j); steps.push({t, j, trail}); t = j + 1;
    }
  } else if (rule === 'WW') {
    const f = Array(T + 1).fill(Infinity), arg = Array(T + 1).fill(-1); f[0] = 0;
    for (let jj = 1; jj <= T; jj++) for (let i = 1; i <= jj; i++) { const c = f[i - 1] + (sumR(i - 1, jj - 1) > LOT_EPS ? S : 0) + hold(i - 1, jj - 1); if (c < f[jj] - 1e-12) { f[jj] = c; arg[jj] = i; } }
    let jj = T; const cuts = []; while (jj > 0) { const i = arg[jj]; cuts.unshift([i - 1, jj - 1]); jj = i - 1; }
    cuts.forEach(([a, b]) => { const q = sumR(a, b); if (q > LOT_EPS) { rec[a] = q; steps.push({t: a, j: b}); } });
    extra = {f, arg, cuts};
  } else throw new Error('nieznana reguła doboru partii ' + rule);
  return {rule, rec, steps, ...extra, ...lotCost(r, rec, S, H)};
}
