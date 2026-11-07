/* ===== OptiLab – symulacja kolejek: symulacja zdarzeń dyskretnych (bez DOM, testowalna w Node; korzysta z ST.rng) =====
   s stanowisk, kolejka FIFO, opcjonalna pojemność systemu K (odrzucenia), rozkłady: wykładniczy, jednostajny, normalny obcięty przy 0, Erlanga, stały, empiryczny.
   Okres rozgrzewki (statystyki od chwili warm), horyzont T, wiele powtórzeń z przedziałem ufności t-Studenta, porównanie konfiguracji na wspólnych liczbach losowych. */
const QS_DISTS = {exp: 'wykładniczy', uni: 'jednostajny', norm: 'normalny (obcięty przy 0)', erl: 'Erlanga', const: 'stały', emp: 'empiryczny (tabela)'};
function qsMoments(d) {                                                 // średnia i wariancja rozkładu (normalny obcięty – dokładnie)
  if (d.type === 'exp') return {m: d.mean, v: d.mean ** 2}; if (d.type === 'uni') return {m: (d.a + d.b) / 2, v: (d.b - d.a) ** 2 / 12};
  if (d.type === 'erl') return {m: d.mean, v: d.mean ** 2 / d.k}; if (d.type === 'const') return {m: d.value, v: 0};
  if (d.type === 'emp') { const m = d.table.reduce((s, x) => s + x.v * x.p, 0); return {m, v: d.table.reduce((s, x) => s + x.p * (x.v - m) ** 2, 0)}; }
  const a = -d.mean / d.sd, Z = 1 - ST.normCdf(a), lam = ST.normPdf(a) / Z; return {m: d.mean + d.sd * lam, v: d.sd ** 2 * (1 + a * lam - lam * lam)};
}
function qsSampler(d, g) {
  if (d.type === 'exp') return () => g.exp(1 / d.mean); if (d.type === 'uni') return () => g.uniform(d.a, d.b);
  if (d.type === 'erl') return () => g.erlang(d.k, d.k / d.mean); if (d.type === 'const') return () => d.value;
  if (d.type === 'emp') { const cum = []; let s = 0; d.table.forEach(x => { s += x.p; cum.push(s); }); return () => { const u = g.u() * s; const i = cum.findIndex(c => u < c); return d.table[i < 0 ? d.table.length - 1 : i].v; }; }
  return () => { let x; do { x = g.normal(d.mean, d.sd); } while (x < 0); return x; };
}
/* P: {arr, svc, s, K|null, T, warm, trace}; osobne strumienie dla napływu i obsługi (wspólne liczby losowe przy porównaniu konfiguracji) */
function qsRun(P, seed) {
  const gA = ST.rng(seed * 2 + 1), gS = ST.rng(seed * 2 + 2), nextA = qsSampler(P.arr, gA), nextS = qsSampler(P.svc, gS), s = P.s, K = P.K ?? Infinity;
  const busy = Array(s).fill(null), busyT = Array(s).fill(0), queue = [], cust = [], trace = [], path = [];
  let t = 0, tA = nextA(), nSys = 0, areaL = 0, areaQ = 0, lastT = 0, arrivals = 0, rejected = 0, maxQ = 0;
  const acc = tt => { const a = Math.max(lastT, P.warm), b = Math.min(tt, P.T); if (b > a) { areaL += nSys * (b - a); areaQ += queue.length * (b - a); busy.forEach((c, k) => { if (c !== null) busyT[k] += b - a; }); } lastT = tt; };
  const log = (type, c) => { if (trace.length < P.trace) trace.push({t, type, c, q: queue.length, sys: nSys, busy: busy.filter(x => x !== null).length}); if (path.length < 400) path.push([t, nSys]); };
  while (true) {
    let k = -1, tD = Infinity; busy.forEach((c, i) => { if (c !== null && cust[c].end < tD) { tD = cust[c].end; k = i; } });
    const tn = Math.min(tA, tD); if (tn > P.T) { acc(P.T); break; }
    acc(tn); t = tn;
    if (tA <= tD) {                                                       // przyjście klienta
      arrivals++; const c = cust.length; cust.push({arr: t, start: null, end: null, srv: null, rej: false});
      if (nSys >= K) { cust[c].rej = true; rejected += t >= P.warm ? 1 : 0; log('odrzucenie', c); }
      else { nSys++; const free = busy.indexOf(null); if (free >= 0) { busy[free] = c; Object.assign(cust[c], {start: t, srv: free, end: t + nextS()}); } else { queue.push(c); maxQ = Math.max(maxQ, queue.length); } log('przyjście', c); }
      tA = t + nextA();
    } else {                                                              // koniec obsługi
      const c = busy[k]; nSys--; busy[k] = null; log('koniec obsługi', c);
      if (queue.length) { const q = queue.shift(); busy[k] = q; Object.assign(cust[q], {start: t, srv: k, end: t + nextS()}); }
    }
  }
  const span = P.T - P.warm, done = cust.filter(c => !c.rej && c.arr >= P.warm && c.end !== null && c.end <= P.T), wq = done.map(c => c.start - c.arr), w = done.map(c => c.end - c.arr);
  const counted = cust.filter(c => c.arr >= P.warm && c.arr <= P.T);
  return {L: areaL / span, Lq: areaQ / span, W: w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN, Wq: wq.length ? wq.reduce((a, b) => a + b, 0) / wq.length : NaN,
    util: busyT.reduce((a, b) => a + b, 0) / (s * span), utilK: busyT.map(b => b / span), Pwait: wq.length ? wq.filter(x => x > 1e-12).length / wq.length : NaN,
    rejFrac: counted.length ? rejected / counted.length : 0, served: done.length, maxQ, wq, trace, path, lamEff: done.length / span};
}
function qsReplicate(P, R, seed0, alpha = 0.05) {
  const runs = Array.from({length: R}, (_, r) => qsRun(P, seed0 + r)), keys = ['L', 'Lq', 'W', 'Wq', 'util', 'Pwait', 'rejFrac'], tq = R > 1 ? ST.tInv(1 - alpha / 2, R - 1) : NaN, ci = {};
  keys.forEach(k => { const v = runs.map(x => x[k]).filter(isFinite), m = v.reduce((a, b) => a + b, 0) / v.length, sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) : NaN; ci[k] = {m, sd, h: tq * sd / Math.sqrt(v.length)}; });
  return {runs, ci, tq};
}
function qsCompare(P, s2, R, seed0, alpha = 0.05) {                     // wspólne liczby losowe: te same ziarna, różnica sparowana
  const A = qsReplicate(P, R, seed0, alpha), B = qsReplicate({...P, s: s2}, R, seed0, alpha), d = A.runs.map((x, r) => x.Wq - B.runs[r].Wq), m = d.reduce((a, b) => a + b, 0) / R;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / (R - 1)); return {A, B, d: {m, sd, h: A.tq * sd / Math.sqrt(R)}};
}
