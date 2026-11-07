/* ===== OptiLab – alternatywna metoda tabelaryczna simpleksu (bez DOM, testowalna w Node) =====
   Tablica w układzie: C_B | Baza | x1 … xN | b | iloraz; wiersze z_j = Σ C_B·a_ij oraz c_j − z_j (wiersz indeksu).
   Maksymalizacja: kolumna z największym dodatnim c_j − z_j, optimum gdy wszystkie ≤ 0. Minimalizacja: najbardziej ujemne c_j − z_j, optimum gdy wszystkie ≥ 0.
   Wiersz wiodący: najmniejszy iloraz b_i / a_ik po elementach a_ik > 0. Ograniczenia ≥ i = – zmienne sztuczne z kosztem −M (max) / +M (min),
   M zapisane symbolicznie (liczba a + m·M, porównanie najpierw po m). Remisy – najmniejszy indeks; przy powtórzeniu bazy – reguła Blanda. */
const TB_EPS = 1e-9;
const sym = (a = 0, m = 0) => ({a, m});
const sAdd = (x, y) => sym(x.a + y.a, x.m + y.m), sSub = (x, y) => sym(x.a - y.a, x.m - y.m), sMul = (x, k) => sym(x.a * k, x.m * k);
const sCmp = (x, y) => { const dm = x.m - y.m; if (Math.abs(dm) > TB_EPS * (1 + Math.abs(x.m) + Math.abs(y.m))) return dm; const da = x.a - y.a; return Math.abs(da) > TB_EPS * (1 + Math.abs(x.a) + Math.abs(y.a)) ? da : 0; };
const sSign = x => Math.sign(sCmp(x, sym()));
function sFmt(x, f = v => String(v)) {                                 // np. „−M + 3”, „2M − 30”, „M”
  const r = v => Math.abs(v) < TB_EPS ? 0 : v, a = r(x.a), m = r(x.m);
  if (!m) return f(a);
  const mt = (m === 1 ? '' : m === -1 ? '−' : f(m)) + 'M';
  return a ? `${mt} ${a > 0 ? '+' : '−'} ${f(Math.abs(a))}` : mt;
}
function tabSolve(M, opt = {}) {
  const n = M.n, maxIt = opt.maxIt || 200, names = [], cost = [], A = [], b = [], basis = [], kinds = [];
  for (let j = 0; j < n; j++) { names.push('x' + (j + 1)); cost.push(sym(M.c[j])); kinds.push('x'); }
  const rows = M.A.map((a, i) => { const neg = M.b[i] < 0; return {a: a.map(v => neg ? -v : v), b: neg ? -M.b[i] : M.b[i], rel: neg ? ({'<=': '>=', '>=': '<=', '=': '='})[M.rel[i]] : M.rel[i], flipped: neg}; });
  const add = (nm, c, kind) => { names.push(nm); cost.push(c); kinds.push(kind); return names.length - 1; };
  let k = n, art = 0; const colOf = [];
  rows.forEach((r, i) => {
    if (r.rel === '<=') colOf.push([add('x' + (++k), sym(), 's'), +1]);
    else if (r.rel === '>=') colOf.push([add('x' + (++k), sym(), 'e'), -1]);
    else colOf.push(null);
  });
  const artOf = rows.map(r => r.rel === '<=' ? null : add('a' + (++art), sym(0, M.maxi ? -1 : 1), 'a'));
  const N = names.length;
  rows.forEach((r, i) => { const row = Array(N).fill(0); r.a.forEach((v, j) => { row[j] = v; }); if (colOf[i]) row[colOf[i][0]] = colOf[i][1]; if (artOf[i] !== null) row[artOf[i]] = 1;
    A.push(row); b.push(r.b); basis.push(r.rel === '<=' ? colOf[i][0] : artOf[i]); });
  const tables = [], seen = new Set(); let bland = false, status = null, it = 0;
  const snapshot = () => { const cB = basis.map(j => cost[j]);
    const zj = Array.from({length: N}, (_, j) => cB.reduce((s, c, i) => sAdd(s, sMul(c, A[i][j])), sym())), z = cB.reduce((s, c, i) => sAdd(s, sMul(c, b[i])), sym());
    return {cB, basis: basis.slice(), A: A.map(r => r.slice()), b: b.slice(), zj, z, cmz: zj.map((v, j) => sSub(cost[j], v)), ratios: null, pc: -1, pr: -1, bland}; };
  while (true) {
    const T = snapshot(); tables.push(T);
    const better = j => M.maxi ? sSign(T.cmz[j]) > 0 : sSign(T.cmz[j]) < 0;
    const cand = [...Array(N).keys()].filter(j => !basis.includes(j) && better(j));
    if (!cand.length) { status = basis.some((j, i) => kinds[j] === 'a' && b[i] > TB_EPS) ? 'infeasible' : 'optimal'; break; }
    const artPos = basis.some((j, i) => kinds[j] === 'a' && b[i] > TB_EPS), mImp = cand.some(j => M.maxi ? T.cmz[j].m > TB_EPS : T.cmz[j].m < -TB_EPS);
    if (artPos && !mImp) { status = 'infeasible'; T.artStuck = true; break; }   // część z M już optymalna, a zmienna sztuczna > 0 → brak rozwiązań dopuszczalnych
    if (++it > maxIt) { status = 'limit'; break; }
    const key = basis.slice().sort((x, y) => x - y).join(',') + '|' + basis.join(','); if (seen.has(key)) bland = true; seen.add(key); T.bland = bland;
    const pc = bland ? cand[0] : cand.reduce((p, j) => (M.maxi ? sCmp(T.cmz[j], T.cmz[p]) > 0 : sCmp(T.cmz[j], T.cmz[p]) < 0) ? j : p);
    const ratios = A.map((r, i) => r[pc] > TB_EPS ? b[i] / r[pc] : null); T.ratios = ratios; T.pc = pc;
    let pr = -1; ratios.forEach((q, i) => { if (q === null) return; if (pr < 0 || q < ratios[pr] - TB_EPS * (1 + Math.abs(q)) || (Math.abs(q - ratios[pr]) <= TB_EPS * (1 + Math.abs(q)) && (bland ? basis[i] < basis[pr] : false))) pr = i; });
    if (pr < 0) { status = 'unbounded'; break; }
    T.pr = pr; T.tie = ratios.filter(q => q !== null && Math.abs(q - ratios[pr]) <= TB_EPS * (1 + Math.abs(q))).length > 1;
    const piv = A[pr][pc]; A[pr] = A[pr].map(v => v / piv); b[pr] /= piv;
    for (let i = 0; i < A.length; i++) if (i !== pr && Math.abs(A[i][pc]) > 0) { const f = A[i][pc]; A[i] = A[i].map((v, j) => Math.abs(v - f * A[pr][j]) < 1e-12 ? 0 : v - f * A[pr][j]); b[i] = Math.abs(b[i] - f * b[pr]) < 1e-12 ? 0 : b[i] - f * b[pr]; }
    basis[pr] = pc;
  }
  const last = tables[tables.length - 1], x = Array(n).fill(0); basis.forEach((j, i) => { if (j < n) x[j] = b[i]; });
  const alt = status === 'optimal' ? [...Array(N).keys()].filter(j => !basis.includes(j) && kinds[j] !== 'a' && sSign(last.cmz[j]) === 0) : [];
  return {status, tables, names, cost, kinds, x, z: last.z.a, zSym: last.z, alt, degenerate: status === 'optimal' && basis.some((_, i) => Math.abs(b[i]) < TB_EPS), rows};
}
