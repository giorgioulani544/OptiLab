/* ===== OptiLab – MRP: solver (czysta logika, bez DOM, testowalny w Node) =====
   Struktura wyrobu (BOM) wielopoziomowa, kody niskiego poziomu, zapotrzebowanie brutto (niezależne + z planowanych zamówień pozycji nadrzędnych),
   bilansowanie (zapas początkowy, przyjęcia zaplanowane, zapas bezpieczeństwa), dobór partii (js/inv/lotsize.js), przesunięcie o czas realizacji,
   odpad (zamówienie = przyjęcie / (1 − odpad), zaokrąglone w górę do pełnych sztuk), komunikaty: przyspieszyć (zamówienie po terminie), opóźnić lub anulować przyjęcie zaplanowane. */
function mrpCheck(codes, bom) {
  const errors = [], idx = new Map();
  codes.forEach((c, i) => { const k = String(c).trim(); if (!k) errors.push({where: 'item', i, field: 'code', msg: 'pozycja musi mieć kod.'});
    else if (idx.has(k)) errors.push({where: 'item', i, field: 'code', msg: `kod „${k}" powtarza się.`}); else idx.set(k, i); });
  const edges = [];
  bom.forEach((e, i) => { const p = String(e.parent).trim(), ch = String(e.child).trim();
    if (!idx.has(p)) errors.push({where: 'bom', i, field: 'parent', msg: `nieznana pozycja nadrzędna „${p}".`});
    else if (!idx.has(ch)) errors.push({where: 'bom', i, field: 'child', msg: `nieznany składnik „${ch}".`});
    else if (p === ch) errors.push({where: 'bom', i, field: 'child', msg: 'pozycja nie może być składnikiem samej siebie.'});
    else if (!(e.qty > 0)) errors.push({where: 'bom', i, field: 'qty', msg: 'ilość na sztukę musi być dodatnia.'});
    else if (edges.some(x => x.p === idx.get(p) && x.c === idx.get(ch))) errors.push({where: 'bom', i, field: 'child', msg: `para „${p} → ${ch}" występuje dwa razy – zsumuj ilości w jednym wierszu.`});
    else edges.push({p: idx.get(p), c: idx.get(ch), qty: e.qty, row: i}); });
  let cycle = null;
  if (!errors.length) { const n = codes.length, col = Array(n).fill(0), st = [], kids = Array.from({length: n}, () => []); edges.forEach(e => kids[e.p].push(e.c));
    const dfs = v => { col[v] = 1; st.push(v); for (const u of kids[v]) { if (col[u] === 1) { cycle = st.slice(st.indexOf(u)).concat(u); return true; } if (!col[u] && dfs(u)) return true; } st.pop(); col[v] = 2; return false; };
    for (let v = 0; v < n && !cycle; v++) if (!col[v]) dfs(v); }
  return {errors, edges, cycle};
}
/* P: {T, items: [{code, lt, onHand, ss, scrap, rule, Q, P, min, max, S, H}], edges: [{p, c, qty}], indep: [[T]], sr: [[T]]} */
function mrpSolve(P) {
  const n = P.items.length, T = P.T, llc = Array(n).fill(0), indeg = Array(n).fill(0), kids = Array.from({length: n}, () => []), topo = [];
  P.edges.forEach(e => { kids[e.p].push(e); indeg[e.c]++; });
  const q = [...Array(n).keys()].filter(i => !indeg[i]); while (q.length) { const v = q.shift(); topo.push(v); kids[v].forEach(e => { llc[e.c] = Math.max(llc[e.c], llc[v] + 1); if (--indeg[e.c] === 0) q.push(e.c); }); }
  const order = [...Array(n).keys()].sort((a, b) => llc[a] - llc[b] || a - b), R = Array(n), messages = [];
  order.forEach(i => {
    const it = P.items[i], gross = P.indep[i].slice(), dep = Array(T).fill(0);
    P.edges.filter(e => e.c === i).forEach(e => R[e.p].rel.forEach((v, t) => { dep[t] += e.qty * v; }));
    dep.forEach((v, t) => { gross[t] += v; });
    let A = it.onHand, N = 0; const net = gross.map((g, t) => { A += P.sr[i][t] - g; const N2 = Math.max(N, it.ss - A, 0), r = N2 - N; N = N2; return r; });
    const L = lotSize(net, it.rule, {Q: it.Q, P: it.P, min: it.min, max: it.max, S: it.S, H: it.H});
    let pab = it.onHand; const PAB = gross.map((g, t) => (pab += P.sr[i][t] + L.rec[t] - g));
    const rel = Array(T).fill(0), relQ = q => it.scrap > 0 ? Math.ceil(q / (1 - it.scrap) - 1e-9) : q;   // z odpadem: zamawiamy więcej, w pełnych sztukach
    L.rec.forEach((x, t) => { if (x <= LOT_EPS) return; const rt = t - it.lt; if (rt < 0) { rel[0] += relQ(x); messages.push({kind: 'late', i, t, rt, qty: relQ(x)}); } else rel[rt] += relQ(x); });
    P.sr[i].forEach((s, t) => { if (s <= LOT_EPS) return; let u = -1; for (let k = t; k < T; k++) if (PAB[k] - s < it.ss - 1e-9) { u = k; break; }
      if (u === -1) messages.push({kind: 'cancel', i, t, qty: s}); else if (u > t) messages.push({kind: 'delay', i, t, u, qty: s}); });
    R[i] = {gross, dep, net, rec: L.rec, pab: PAB, rel, lot: L};
  });
  return {llc, order, R, messages};
}
