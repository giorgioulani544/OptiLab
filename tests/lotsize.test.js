// Dobór partii: Wagner-Whitin vs przegląd wszystkich planów zamówień; heurystyki vs niezależne implementacje z definicji; pokrycie zapotrzebowania
const {load} = require('./helpers');
const c = load(['js/inv/lotsize.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
// koszt planu liczony niezależnie: zapas na koniec okresu × H + liczba zamówień × S
const cost = (r, rec, S, H) => { let inv = 0, h = 0, n = 0, okk = true; r.forEach((x, k) => { if (rec[k] > 1e-9) n++; inv += rec[k] - x; if (inv < -1e-7) okk = false; h += H * Math.max(0, inv); }); return okk ? n * S + h : Infinity; };
// przegląd: każdy podzbiór okresów zamówień; zamówienie pokrywa okresy do następnego zamówienia
const brute = (r, S, H) => { const T = r.length; let best = Infinity;
  for (let m = 0; m < 1 << T; m++) { const rec = Array(T).fill(0); let last = -1, okk = true;
    for (let k = 0; k < T; k++) { if (m >> k & 1) last = k; if (r[k] > 0) { if (last < 0) { okk = false; break; } rec[last] += r[k]; } }
    if (okk) best = Math.min(best, cost(r, rec, S, H)); } return best; };
// heurystyki z definicji (niezależnie od kodu OptiLab)
const heur = (r, S, H, kind) => { const T = r.length, rec = Array(T).fill(0); let t = 0;
  while (t < T) { if (!r[t]) { t++; continue; } let best = t, bestV = null, cum = 0, pp = 0, units = 0;
    for (let j = t; j < T; j++) { pp += (j - t) * r[j]; units += r[j]; const v = kind === 'SM' ? (S + H * pp) / (j - t + 1) : (S + H * pp) / units;
      if (bestV !== null && v > bestV + 1e-12) break; bestV = v; best = j; }
    for (let j = t; j <= best; j++) rec[t] += r[j]; t = best + 1; } return rec; };
let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 150; k++) {
  const T = ri(1, 10), r = Array.from({length: T}, () => rnd() < 0.2 ? 0 : ri(1, 120)), S = ri(10, 400), H = ri(1, 6), Q = ri(20, 150), P = ri(1, 4), mn = ri(0, 30), mx = mn + ri(20, 150);
  const W = c.lotSize(r, 'WW', {S, H}), B = brute(r, S, H);
  t(`#${k} Wagner-Whitin = optimum z przeglądu wszystkich planów`, near(W.total, B) && near(cost(r, W.rec, S, H), B));
  for (const [rule, prm] of [['L4L', {}], ['FOQ', {Q}], ['EOQ', {S, H}], ['POQ', {P}], ['MINMAX', {min: mn, max: mx}], ['SM', {S, H}], ['LUC', {S, H}], ['PPB', {S, H}]]) {
    const R = c.lotSize(r, rule, {S, H, ...prm});
    t(`#${k} ${rule}: pokrywa zapotrzebowanie, koszt policzony poprawnie, nie lepszy od optimum`, !R.short && isFinite(cost(r, R.rec, S, H)) && near(R.total, cost(r, R.rec, S, H)) && R.total >= W.total - 1e-7);
    if (rule === 'L4L') t(`#${k} L4L: partie = zapotrzebowanie`, R.rec.every((q, j) => q === r[j]));
    if (rule === 'FOQ') t(`#${k} FOQ: partie są wielokrotnościami Q`, R.rec.every(q => Math.abs(q / Q - Math.round(q / Q)) < 1e-9));
    if (rule === 'POQ') t(`#${k} POQ: każda partia pokrywa najwyżej P okresów od zamówienia`, R.steps.every(s => s.j - s.t + 1 <= P));
    if (rule === 'SM' || rule === 'LUC') t(`#${k} ${rule} = implementacja z definicji`, R.rec.every((q, j) => near(q, heur(r, S, H, rule)[j])));
  }
}
// przykład liczony ręcznie: r = 10, 20, 0, 30; S = 50; H = 1 → WW: zamówienia 30 (okr. 1) i 30 (okr. 4): koszt 2·50 + 20 = 120
const E = c.lotSize([10, 20, 0, 30], 'WW', {S: 50, H: 1}); t('przykład ręczny: Wagner-Whitin 30 + 30, koszt 120', E.rec.join() === '30,0,0,30' && near(E.total, 120));
console.log(`Testy doboru partii: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
