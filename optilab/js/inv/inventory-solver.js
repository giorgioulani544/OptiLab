/* ===== OptiLab – zapasy: solver (czysta matematyka, bez DOM, testowalny w Node) =====
   EOQ, EPQ (skończona wydajność), planowane braki, rabaty ilościowe (od całej ilości i przyrostowe; koszt utrzymania stały lub proporcjonalny do ceny),
   punkt ponownego zamawiania z zapasem bezpieczeństwa (popyt i czas dostawy losowe), model gazeciarza (rozkład normalny i dyskretny).
   Jednostki czasu: jak w danych (np. popyt roczny i koszt utrzymania na rok). */
const INV_EPS = 1e-12;
const invLoss = z => ST.normPdf(z) - z * (1 - ST.normCdf(z));          // standaryzowana funkcja strat L(z) = E[(Z − z)⁺]
function invEOQ({D, S, H, c = 0, L = null, days = null}) {
  const Q = Math.sqrt(2 * D * S / H), TCv = D * S / Q + H * Q / 2;
  const rop = L !== null && days ? D / days * L : null;
  return {Q, N: D / Q, T: Q / D, Imax: Q, Iavg: Q / 2, order: D * S / Q, hold: H * Q / 2, TCv, TC: TCv + D * c, rop, tc: q => D * S / q + H * q / 2 + D * c};
}
function invEPQ({D, S, H, p, c = 0}) {
  if (!(p > D)) return {status: 'infeasible'};
  const k = 1 - D / p, Q = Math.sqrt(2 * D * S / (H * k)), Imax = Q * k, TCv = D * S / Q + H * Imax / 2;
  return {status: 'ok', Q, Imax, tp: Q / p, T: Q / D, N: D / Q, order: D * S / Q, hold: H * Imax / 2, TCv, TC: TCv + D * c, tc: q => D * S / q + H * q * k / 2 + D * c};
}
function invBack({D, S, H, b, c = 0}) {
  const Q = Math.sqrt(2 * D * S / H * (H + b) / b), Smax = Q * H / (H + b), Imax = Q - Smax;
  const order = D * S / Q, hold = H * Imax ** 2 / (2 * Q), short = b * Smax ** 2 / (2 * Q);
  return {Q, Smax, Imax, T: Q / D, N: D / Q, order, hold, short, TCv: order + hold + short, TC: order + hold + short + D * c, frac: H / (H + b),
    tc: q => { const s = q * H / (H + b); return D * S / q + H * (q - s) ** 2 / (2 * q) + b * s * s / (2 * q) + D * c; }};
}
/* Rabaty: tiers = [{from, price}] rosnąco wg „od ilości" (pierwszy od 0 lub 1); type 'all' (od całej ilości) | 'inc' (przyrostowe); hMode 'const' (H) | 'rate' (i · cena) */
function invDisc({D, S, H = 0, i = 0, tiers, type = 'all', hMode = 'const'}) {
  const T = tiers.map((t, k) => ({...t, to: k + 1 < tiers.length ? tiers[k + 1].from : Infinity}));
  const R = T.map((t, k) => { let s = 0; for (let j = 0; j < k; j++) s += (T[j].price - t.price) * (T[j].to - T[j].from); return s; });   // stała przyrostowa
  const purchase = q => { if (type === 'all') { const k = T.findIndex(t => q >= t.from && q < t.to); return q * T[Math.max(0, k)].price; }
    let s = 0; T.forEach(t => { if (q > t.from) s += (Math.min(q, t.to) - t.from) * t.price; }); return s; };
  const tc = q => { const pc = purchase(q); return D * S / q + (hMode === 'rate' ? i * pc / 2 : H * q / 2) + D * pc / q; };
  const rows = T.map((t, k) => {
    const hk = hMode === 'rate' ? i * t.price : H, num = 2 * D * (S + (type === 'inc' ? R[k] : 0));
    const Qeoq = Math.sqrt(num / hk), lo = Math.max(t.from, INV_EPS), hi = t.to === Infinity ? Infinity : t.to - (type === 'all' ? 1e-9 : 0);
    const Qadj = Math.min(Math.max(Qeoq, lo), hi);
    return {k, from: t.from, to: t.to, price: t.price, R: R[k], Qeoq, Qadj, inRange: Qeoq >= lo - 1e-9 && Qeoq <= hi + 1e-9, TC: tc(Qadj)};
  });
  const best = rows.reduce((a, b) => b.TC < a.TC - 1e-9 ? b : a);
  return {rows, best, tc, purchase};
}
/* Punkt ponownego zamawiania: popyt dzienny ~ N(mu, sd), czas dostawy L (± sdL), poziom obsługi alpha; opcjonalnie Q – poziom wypełnienia */
function invROP({mu, sd, L, sdL = 0, alpha, Q = null}) {
  const sLT = Math.sqrt(L * sd * sd + mu * mu * sdL * sdL), z = ST.normInv(alpha), SS = z * sLT, ROP = mu * L + SS, ES = sLT * invLoss(z);
  return {sLT, z, SS, ROP, dLT: mu * L, ES, fill: Q ? 1 - ES / Q : null};
}
/* Gazeciarz: cena p, koszt c, wartość odzysku v, koszt utraconej sprzedaży g; popyt normalny {mu, sd} albo dyskretny [{d, p}] */
function invNews({p, c, v = 0, g = 0, normal = null, discrete = null}) {
  const Cu = p - c + g, Co = c - v, CR = Cu / (Cu + Co);
  if (normal) {
    const {mu, sd} = normal, z = ST.normInv(CR), Q = mu + z * sd, Lz = invLoss(z), short = sd * Lz, sales = mu - short, left = Q - sales;
    return {Cu, Co, CR, z, Q, short, sales, left, fill: sales / mu, profit: p * sales + v * left - c * Q - g * short, mismatch: (Cu + Co) * sd * ST.normPdf(z)};
  }
  const D = discrete.slice().sort((a, b) => a.d - b.d); let F = 0;
  const table = D.map(x => { F += x.p;
    const q = x.d, sales = D.reduce((s, y) => s + y.p * Math.min(y.d, q), 0), short = D.reduce((s, y) => s + y.p * Math.max(0, y.d - q), 0), left = q - sales;
    return {q, f: x.p, F, sales, short, left, profit: p * sales + v * left - c * q - g * short}; });
  const pick = table.find(r => r.F >= CR - 1e-12) || table[table.length - 1], best = table.reduce((a, b) => b.profit > a.profit + 1e-9 ? b : a);
  return {Cu, Co, CR, table, Q: pick.q, pick, best};
}
