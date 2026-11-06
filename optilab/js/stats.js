/* ===== OptiLab – funkcje statystyczne (czysta matematyka, bez DOM, testowalna w Node) =====
   Rozkłady: normalny, t, chi-kwadrat, Poissona, dwumianowy, hipergeometryczny, wykładniczy, Erlanga/gamma, beta.
   Dystrybuanty, gęstości, odwrotne dystrybuanty; generator liczb losowych ze stałym ziarnem (mulberry32) i próbniki rozkładów.
   Wspólny fundament dla PERT, kolejek, zapasów, kart kontrolnych, odbioru statystycznego i symulacji. */
const ST = (() => {
  const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(x) {                                                   // ln Γ(x), aproksymacja Lanczosa (x > 0)
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGamma(1 - x);
    x -= 1; let a = LANCZOS[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  const gamma = x => Math.exp(lnGamma(x));
  function gammaP(a, x) {                                                 // regularyzowana niekompletna funkcja gamma P(a, x)
    if (x <= 0) return 0;
    if (x < a + 1) { let s = 1 / a, t = s; for (let n = 1; n < 500; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < Math.abs(s) * 1e-15) break; } return s * Math.exp(-x + a * Math.log(x) - lnGamma(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;                        // ułamek łańcuchowy dla Q
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
  }
  function betaI(a, b, x) {                                               // regularyzowana niekompletna funkcja beta I_x(a, b)
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    const cf = (a, b, x) => { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
      for (let m = 1; m < 500; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; } return h; };
    return x < (a + 1) / (a + b + 2) ? bt * cf(a, b, x) / a : 1 - bt * cf(b, a, 1 - x) / b;
  }
  const erf = x => { const t = gammaP(0.5, x * x); return x >= 0 ? t : -t; };
  const normPdf = (x, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const normCdf = (x, mu = 0, s = 1) => { const z = (x - mu) / s; return z < 0 ? 0.5 * (1 - gammaP(0.5, z * z / 2)) : 0.5 * (1 + gammaP(0.5, z * z / 2)); };
  function normInv(p, mu = 0, s = 1) {                                    // Acklam + jedno poprawienie Newtona (błąd ~1e-15)
    if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239],
      b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1],
      c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    let q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    const e = normCdf(x) - p; x = x - e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2) / (1 + x * e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2) / 2);
    return mu + s * x;
  }
  const tCdf = (t, v) => { const x = v / (v + t * t), ib = 0.5 * betaI(v / 2, 0.5, x); return t >= 0 ? 1 - ib : ib; };
  const chi2Cdf = (x, k) => x <= 0 ? 0 : gammaP(k / 2, x / 2);
  const invByBisection = (cdf, p, lo, hi) => { for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
  const tInv = (p, v) => invByBisection(t => tCdf(t, v), p, -1e4, 1e4);
  const chi2Inv = (p, k) => invByBisection(x => chi2Cdf(x, k), p, 0, Math.max(100, 10 * k));
  const lnChoose = (n, k) => lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
  const poissonPmf = (k, lam) => k < 0 ? 0 : Math.exp(-lam + k * Math.log(lam) - lnGamma(k + 1));
  const poissonCdf = (k, lam) => k < 0 ? 0 : 1 - gammaP(Math.floor(k) + 1, lam);
  const binomPmf = (k, n, p) => k < 0 || k > n ? 0 : p === 0 ? +(k === 0) : p === 1 ? +(k === n) : Math.exp(lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  const binomCdf = (k, n, p) => { if (k < 0) return 0; if (k >= n) return 1; let s = 0; for (let i = 0; i <= k; i++) s += binomPmf(i, n, p); return Math.min(1, s); };
  const hyperPmf = (k, N, K, n) => k < Math.max(0, n - (N - K)) || k > Math.min(n, K) ? 0 : Math.exp(lnChoose(K, k) + lnChoose(N - K, n - k) - lnChoose(N, n));
  const hyperCdf = (k, N, K, n) => { let s = 0; for (let i = 0; i <= k; i++) s += hyperPmf(i, N, K, n); return Math.min(1, s); };
  const expCdf = (x, lam) => x <= 0 ? 0 : 1 - Math.exp(-lam * x);
  const erlangCdf = (x, k, lam) => x <= 0 ? 0 : gammaP(k, lam * x);
  /* generator liczb losowych ze stałym ziarnem i próbniki */
  function rng(seed = 12345) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let spare = null;
    const normal = (mu = 0, s = 1) => { if (spare !== null) { const z = spare; spare = null; return mu + s * z; }
      let x, y, r; do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0); const f = Math.sqrt(-2 * Math.log(r) / r); spare = y * f; return mu + s * x * f; };
    const gammaS = (k, th = 1) => { if (k < 1) return gammaS(k + 1, th) * Math.pow(u(), 1 / k);   // Marsaglia–Tsang
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = normal(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const uu = u();
        if (uu < 1 - 0.0331 * x ** 4 || Math.log(uu) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * th; } };
    const beta = (a, b) => { const x = gammaS(a), y = gammaS(b); return x / (x + y); };
    return {u, normal, gamma: gammaS, beta, exp: lam => -Math.log(1 - u()) / lam, uniform: (a, b) => a + (b - a) * u(),
      erlang: (k, lam) => gammaS(k, 1 / lam), triangular: (a, m, b) => { const f = (m - a) / (b - a), x = u(); return x < f ? a + Math.sqrt(x * (b - a) * (m - a)) : b - Math.sqrt((1 - x) * (b - a) * (b - m)); },
      betaPert: (a, m, b) => { if (b - a < 1e-12) return m; const al = 1 + 4 * (m - a) / (b - a), be = 1 + 4 * (b - m) / (b - a); return a + (b - a) * beta(al, be); }};
  }
  return {lnGamma, gamma, gammaP, betaI, erf, normPdf, normCdf, normInv, tCdf, tInv, chi2Cdf, chi2Inv, poissonPmf, poissonCdf, binomPmf, binomCdf, hyperPmf, hyperCdf, expCdf, erlangCdf, rng};
})();
