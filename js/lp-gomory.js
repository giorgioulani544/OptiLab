/* ===== OptiLab – algorytm odcięć Gomory'ego z dualną metodą simpleks (bez DOM, testowalny w Node) =====
   Arytmetyka dokładna na ułamkach (BigInt) – część ułamkowa jest liczona bez błędów zaokrągleń.
   1) Każde ograniczenie mnożymy przez NWW mianowników, by współczynniki i prawe strony były całkowite – wtedy zmienne swobodne też są całkowite.
   2) Relaksacja LP: simpleks w zapisie c_j − z_j (≥ i = przez metodę dwufazową). 3) Dopóki któraś zmienna bazowa jest ułamkowa: odcięcie z wiersza
   o największej części ułamkowej: Σ f_j·x_j ≥ f_0 (f – części ułamkowe), zapisane jako −Σ f_j·x_j + s = −f_0; dualny simpleks: wychodzi wiersz z ujemnym b,
   wchodzi kolumna z najmniejszym |c_j − z_j| / |a_rj| po a_rj < 0. */
const FR = (() => {
  const abs = a => a < 0n ? -a : a, gcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const mk = (n, d = 1n) => { if (d === 0n) throw new Error('dzielenie przez zero'); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return {n: n / g, d: d / g}; };
  const fromNum = x => { if (!isFinite(x)) throw new Error('liczba nieskończona'); let s = String(x); if (/e/i.test(s)) s = x.toFixed(15).replace(/\.?0+$/, ''); const neg = s[0] === '-'; if (neg) s = s.slice(1);
    const [i, f = ''] = s.split('.'); return mk((neg ? -1n : 1n) * BigInt(i + f || '0'), 10n ** BigInt(f.length)); };
  const add = (a, b) => mk(a.n * b.d + b.n * a.d, a.d * b.d), sub = (a, b) => mk(a.n * b.d - b.n * a.d, a.d * b.d), mul = (a, b) => mk(a.n * b.n, a.d * b.d), div = (a, b) => mk(a.n * b.d, a.d * b.n);
  const cmp = (a, b) => { const x = a.n * b.d - b.n * a.d; return x > 0n ? 1 : x < 0n ? -1 : 0; }, sgn = a => a.n > 0n ? 1 : a.n < 0n ? -1 : 0;
  const floor = a => { const q = a.n / a.d; return mk(a.n < 0n && q * a.d !== a.n ? q - 1n : q); }, frac = a => sub(a, floor(a)), isInt = a => a.d === 1n;
  const toNum = a => Number(a.n) / Number(a.d), str = a => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`, Z = mk(0n), ONE = mk(1n);
  const lcm = (a, b) => a / gcd(a, b) * b;
  return {mk, fromNum, add, sub, mul, div, cmp, sgn, floor, frac, isInt, toNum, str, Z, ONE, lcm};
})();
function gomSolve(M, opt = {}) {
  const n = M.n, maxCuts = opt.maxCuts ?? 60, maxPiv = opt.maxPiv ?? 2000, F = FR, zero = F.Z;
  const names = [], cost = [], kinds = [], A = [], b = [], basis = [], scale = [];
  for (let j = 0; j < n; j++) { names.push('x' + (j + 1)); cost.push(F.fromNum(M.c[j])); kinds.push('x'); }
  let k = n, art = 0; const rows = M.A.map((a, i) => { let ra = a.map(F.fromNum), rb = F.fromNum(M.b[i]), rel = M.rel[i];
    if (F.sgn(rb) < 0) { ra = ra.map(v => F.sub(zero, v)); rb = F.sub(zero, rb); rel = rel === '<=' ? '>=' : rel === '>=' ? '<=' : '='; }
    const L = [...ra, rb].reduce((s, v) => F.lcm(s, v.d), 1n), fac = F.mk(L); scale.push(L);
    return {a: ra.map(v => F.mul(v, fac)), b: F.mul(rb, fac), rel}; });
  const colS = rows.map(r => r.rel === '=' ? null : (names.push('x' + (++k)), cost.push(zero), kinds.push(r.rel === '<=' ? 's' : 'e'), names.length - 1));
  const colA = rows.map(r => r.rel === '<=' ? null : (names.push('a' + (++art)), cost.push(zero), kinds.push('a'), names.length - 1));
  rows.forEach((r, i) => { const row = Array(names.length).fill(zero); r.a.forEach((v, j) => { row[j] = v; }); if (colS[i] !== null) row[colS[i]] = r.rel === '<=' ? F.ONE : F.mk(-1n); if (colA[i] !== null) row[colA[i]] = F.ONE;
    A.push(row); b.push(r.b); basis.push(r.rel === '<=' ? colS[i] : colA[i]); });
  const sense = M.maxi ? 1 : -1; let pivots = 0;
  const cmzOf = c => { const zj = c.map((_, j) => basis.reduce((s, bi, i) => F.add(s, F.mul(c[bi], A[i][j])), zero)); return {zj, cmz: c.map((cj, j) => F.sub(cj, zj[j])), z: basis.reduce((s, bi, i) => F.add(s, F.mul(c[bi], b[i])), zero)}; };
  const snap = (c, extra = {}) => { const {zj, cmz, z} = cmzOf(c); return {names: names.slice(), cost: c.slice(), basis: basis.slice(), A: A.map(r => r.slice()), b: b.slice(), zj, cmz, z, kinds: kinds.slice(), ...extra}; };
  const pivot = (r, s) => { pivots++; const p = A[r][s]; A[r] = A[r].map(v => F.div(v, p)); b[r] = F.div(b[r], p);
    for (let i = 0; i < A.length; i++) if (i !== r && F.sgn(A[i][s])) { const f = A[i][s]; A[i] = A[i].map((v, j) => F.sub(v, F.mul(f, A[r][j]))); b[i] = F.sub(b[i], F.mul(f, b[r])); } basis[r] = s; };
  const primal = (c, maxi, steps, allowed = () => true) => {                     // zwraca 'optimal' | 'unbounded' | 'limit'
    const seen = new Set(); let bland = false;
    for (;;) { const T = snap(c); const cand = names.map((_, j) => j).filter(j => allowed(j) && !basis.includes(j) && (maxi ? F.sgn(T.cmz[j]) > 0 : F.sgn(T.cmz[j]) < 0));
      if (!cand.length) { steps.push(T); return 'optimal'; } if (pivots > maxPiv) { steps.push(T); return 'limit'; }
      const key = basis.join(','); if (seen.has(key)) bland = true; seen.add(key);
      const s = bland ? cand[0] : cand.reduce((p, j) => (maxi ? F.cmp(T.cmz[j], T.cmz[p]) > 0 : F.cmp(T.cmz[j], T.cmz[p]) < 0) ? j : p);
      const ratios = A.map((r, i) => F.sgn(r[s]) > 0 ? F.div(b[i], r[s]) : null); let r = -1;
      ratios.forEach((q, i) => { if (q && (r < 0 || F.cmp(q, ratios[r]) < 0 || (F.cmp(q, ratios[r]) === 0 && bland && basis[i] < basis[r]))) r = i; });
      T.pc = s; T.pr = r; T.ratios = ratios; T.bland = bland; steps.push(T); if (r < 0) return 'unbounded'; pivot(r, s); } };
  const out = {names, kinds, scale, rows, lp: [], phase1: [], cuts: [], n};
  if (kinds.includes('a')) {                                                   // faza I: max −Σ a
    const c1 = kinds.map(t => t === 'a' ? F.mk(-1n) : zero), st = primal(c1, true, out.phase1);
    if (st === 'limit') return {...out, status: 'limit'};
    if (F.sgn(basis.reduce((s, bi, i) => kinds[bi] === 'a' ? F.add(s, b[i]) : s, zero)) > 0) return {...out, status: 'infeasible', reason: 'lp'};
    for (let i = A.length - 1; i >= 0; i--) if (kinds[basis[i]] === 'a') { const j = A[i].findIndex((v, jj) => kinds[jj] !== 'a' && F.sgn(v)); if (j >= 0) pivot(i, j); else { A.splice(i, 1); b.splice(i, 1); basis.splice(i, 1); } }
    const keep = names.map((_, j) => kinds[j] !== 'a'); const map = arr => arr.filter((_, j) => keep[j]);
    for (let i = 0; i < A.length; i++) A[i] = map(A[i]); const old = names.slice(), idx = old.map((_, j) => j).filter(j => keep[j]);
    basis.forEach((bi, i) => { basis[i] = idx.indexOf(bi); }); const nn = map(names), nk = map(kinds), nc = map(cost); names.length = 0; names.push(...nn); kinds.length = 0; kinds.push(...nk); cost.length = 0; cost.push(...nc);
  }
  const st = primal(cost, M.maxi, out.lp); if (st !== 'optimal') return {...out, status: st};
  out.lpValue = cmzOf(cost).z; out.lpX = Array.from({length: n}, (_, j) => { const i = basis.indexOf(j); return i < 0 ? zero : b[i]; });
  for (let cut = 0; ; cut++) {
    const fr = b.map((v, i) => ({i, f: F.frac(v)})).filter(o => F.sgn(o.f) > 0);
    if (!fr.length) break;
    if (cut >= maxCuts) return {...out, status: 'limit'};
    const src = fr.reduce((p, o) => F.cmp(o.f, p.f) > 0 ? o : p), r = src.i, nonb = names.map((_, j) => j).filter(j => !basis.includes(j));
    const f = names.map((_, j) => basis.includes(j) ? zero : F.frac(A[r][j])), f0 = src.f, sName = 's' + (cut + 1);
    names.push(sName); kinds.push('g'); cost.push(zero); A.forEach(row => row.push(zero)); A.push([...f.map(v => F.sub(zero, v)), F.ONE]); b.push(F.sub(zero, f0)); basis.push(names.length - 1);
    const C = {k: cut + 1, src: r, srcVar: names[basis[r]], f, f0, srcRow: names.map((_, j) => j < A[r].length ? A[r][j] : zero), srcB: b[r], nonb, steps: []};
    for (;;) {                                                                   // dualny simpleks
      const T = snap(cost); const neg = b.map((v, i) => ({i, v})).filter(o => F.sgn(o.v) < 0);
      if (!neg.length) { C.steps.push(T); break; }
      if (pivots > maxPiv) { C.steps.push(T); out.cuts.push(C); return {...out, status: 'limit'}; }
      const lr = neg.reduce((p, o) => F.cmp(o.v, p.v) < 0 ? o : p).i, cols = names.map((_, j) => j).filter(j => !basis.includes(j) && F.sgn(A[lr][j]) < 0);
      if (!cols.length) { T.pr = lr; C.steps.push(T); out.cuts.push(C); return {...out, status: 'infeasible', reason: 'int'}; }
      const ratio = j => { const v = F.div(T.cmz[j], A[lr][j]); return F.sgn(v) < 0 ? F.sub(zero, v) : v; }, dr = names.map((_, j) => cols.includes(j) ? ratio(j) : null);
      const ec = cols.reduce((p, j) => F.cmp(dr[j], dr[p]) < 0 ? j : p); T.pr = lr; T.pc = ec; T.dratios = dr; C.steps.push(T); pivot(lr, ec);
    }
    if (opt.drop !== false) {                                                    // odcięcia nieaktywne (ich zmienna swobodna w bazie) usuwamy: wiersz i kolumnę
      const dropped = [];
      for (let i = A.length - 1; i >= 0; i--) if (kinds[basis[i]] === 'g') { const j = basis[i]; dropped.push(names[j]); A.splice(i, 1); b.splice(i, 1); basis.splice(i, 1);
        names.splice(j, 1); kinds.splice(j, 1); cost.splice(j, 1); A.forEach(row => row.splice(j, 1)); basis.forEach((bi, q) => { if (bi > j) basis[q] = bi - 1; }); }
      C.dropped = dropped.reverse();
    }
    out.cuts.push(C);
  }
  const final = snap(cost), x = Array.from({length: n}, (_, j) => { const i = basis.indexOf(j); return i < 0 ? zero : b[i]; });
  return {...out, status: 'optimal', final, x, z: final.z, xNum: x.map(F.toNum), zNum: F.toNum(final.z)};
}
