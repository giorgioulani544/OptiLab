/* ===== OptiLab – algebra liniowa (czysta matematyka, bez DOM, testowalna w Node) =====
   Układy równań (eliminacja Gaussa z częściowym wyborem elementu głównego), macierz odwrotna, wyznacznik,
   rozkład Choleskiego i test dodatniej określoności, mnożenie i potęga macierzy. Macierz osobliwa → null (nigdy „wynik" z dzielenia przez zero). */
const LA = (() => {
  const EPS = 1e-12, copy = A => A.map(r => r.slice()), I = n => Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => +(i === j)));
  const scale = A => Math.max(1e-300, ...A.flat().map(Math.abs));
  function lu(A) {                                                      // PA = LU (w miejscu); zwraca null dla macierzy osobliwej
    const n = A.length, M = copy(A), p = [...Array(n).keys()], tol = EPS * scale(A) * n; let sign = 1;
    for (let k = 0; k < n; k++) {
      let piv = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
      if (Math.abs(M[piv][k]) <= tol) return null;
      if (piv !== k) { [M[k], M[piv]] = [M[piv], M[k]]; [p[k], p[piv]] = [p[piv], p[k]]; sign = -sign; }
      for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; M[i][k] = f; for (let j = k + 1; j < n; j++) M[i][j] -= f * M[k][j]; }
    }
    return {M, p, sign};
  }
  function luSolve(F, b) { const n = F.M.length, y = F.p.map(i => b[i]);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) y[i] -= F.M[i][j] * y[j];
    for (let i = n - 1; i >= 0; i--) { for (let j = i + 1; j < n; j++) y[i] -= F.M[i][j] * y[j]; y[i] /= F.M[i][i]; } return y; }
  const solve = (A, b) => { const F = lu(A); return F ? luSolve(F, b) : null; };
  const inv = A => { const F = lu(A); if (!F) return null; const n = A.length, cols = I(n).map(e => luSolve(F, e)); return cols[0].map((_, i) => cols.map(c => c[i])); };
  const det = A => { const F = lu(A); if (!F) return 0; return F.M.reduce((s, r, i) => s * r[i], F.sign); };
  function chol(A) {                                                    // A = L·Lᵀ dla macierzy symetrycznej dodatnio określonej, inaczej null
    const n = A.length, L = Array.from({length: n}, () => Array(n).fill(0)), tol = EPS * scale(A) * n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.abs(A[i][j] - A[j][i]) > 1e-9 * scale(A)) return null;
    for (let j = 0; j < n; j++) { let s = A[j][j]; for (let k = 0; k < j; k++) s -= L[j][k] ** 2; if (s <= tol) return null; L[j][j] = Math.sqrt(s);
      for (let i = j + 1; i < n; i++) { let t = A[i][j]; for (let k = 0; k < j; k++) t -= L[i][k] * L[j][k]; L[i][j] = t / L[j][j]; } }
    return L;
  }
  const isPD = A => chol(A) !== null;
  const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const vecMul = (v, A) => A[0].map((_, j) => v.reduce((s, x, k) => s + x * A[k][j], 0));
  const pow = (A, n) => { let R = I(A.length), B = copy(A); while (n > 0) { if (n & 1) R = mul(R, B); B = mul(B, B); n >>= 1; } return R; };
  return {solve, inv, det, chol, isPD, mul, vecMul, pow, I, lu};
})();
