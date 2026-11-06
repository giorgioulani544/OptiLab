// Harmonogramowanie: reguły optymalne sprawdzane przeglądem wszystkich permutacji; heurystyki – poprawność i granice
const {load} = require('./helpers');
const c = load(['js/pm/sched-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b));
let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
// niezależne miary (bez kodu OptiLab)
const meas = (p, d, w, seq) => { let tt = 0, F = 0, maxL = -Infinity, nT = 0, wc = 0; seq.forEach(j => { tt += p[j]; F += tt; maxL = Math.max(maxL, tt - d[j]); if (tt > d[j]) nT++; wc += w[j] * tt; }); return {F, maxL, nT, wc}; };
const perms = n => { const out = [], a = [], u = Array(n).fill(false); const go = () => { if (a.length === n) { out.push(a.slice()); return; } for (let j = 0; j < n; j++) if (!u[j]) { u[j] = true; a.push(j); go(); a.pop(); u[j] = false; } }; go(); return out; };
for (let k = 0; k < 120; k++) {
  const n = ri(1, 7), p = Array.from({length: n}, () => ri(1, 15)), d = Array.from({length: n}, () => ri(1, 40)), w = Array.from({length: n}, () => ri(1, 5)), P = perms(n);
  const best = f => Math.min(...P.map(f));
  t(`#${k} SPT minimalizuje średni czas przepływu`, near(meas(p, d, w, c.scRule(p, d, w, 'SPT').seq).F, best(s => meas(p, d, w, s).F)));
  t(`#${k} WSPT minimalizuje ważony czas zakończenia`, near(meas(p, d, w, c.scRule(p, d, w, 'WSPT').seq).wc, best(s => meas(p, d, w, s).wc)));
  t(`#${k} EDD minimalizuje maksymalne opóźnienie`, near(meas(p, d, w, c.scRule(p, d, w, 'EDD').seq).maxL, best(s => meas(p, d, w, s).maxL)));
  t(`#${k} Moore-Hodgson minimalizuje liczbę spóźnionych`, meas(p, d, w, c.scRule(p, d, w, 'MH').seq).nT === best(s => meas(p, d, w, s).nT));
  const M = c.scMeasures(p, d, w, c.scRule(p, d, w, 'EDD').seq), X = meas(p, d, w, c.scRule(p, d, w, 'EDD').seq);
  t(`#${k} miary w tabeli zgodne z niezależnym liczeniem`, near(M.meanF * n, X.F) && near(M.maxL, X.maxL) && M.nTardy === X.nT && near(M.sumWC, X.wc));
}
// niezależny makespan flow shop
const cmax = (Pm, seq) => { const m = Pm[0].length, f = Array(m).fill(0); seq.forEach(j => { for (let q = 0; q < m; q++) f[q] = Math.max(f[q], q ? f[q - 1] : 0) + Pm[j][q]; }); return f[m - 1]; };
for (let k = 0; k < 120; k++) {
  const n = ri(1, 7), Pm = Array.from({length: n}, () => [ri(1, 12), ri(1, 12)]), P = perms(n), opt = Math.min(...P.map(s => cmax(Pm, s)));
  t(`#${k} Johnson (2 maszyny) daje optimum`, cmax(Pm, c.scJohnson(Pm.map(r => r[0]), Pm.map(r => r[1])).seq) === opt);
}
for (let k = 0; k < 80; k++) {
  const n = ri(2, 6), mid = Array.from({length: n}, () => ri(1, 5)), Pm = mid.map(v => rnd() < .5 ? [ri(5, 12), v, ri(1, 12)] : [ri(1, 12), v, ri(5, 12)]);
  const J = c.scJohnson3(Pm), opt = Math.min(...perms(n).map(s => cmax(Pm, s)));
  if (J.exact) t(`#${k} Johnson (3 maszyny, warunek spełniony) daje optimum`, cmax(Pm, J.seq) === opt);
}
for (let k = 0; k < 80; k++) {
  const n = ri(2, 6), m = ri(2, 5), Pm = Array.from({length: n}, () => Array.from({length: m}, () => ri(1, 15))), opt = Math.min(...perms(n).map(s => cmax(Pm, s)));
  const H = [c.scCDS(Pm), c.scPalmer(Pm), c.scDannenbring(Pm), c.scNEH(Pm)];
  t(`#${k} heurystyki CDS, Palmer, Dannenbring, NEH: permutacje poprawne, makespan policzony dobrze, ≥ optimum`, H.every(h => h.seq.slice().sort().join() === [...Array(n).keys()].join() && h.Cmax === cmax(Pm, h.seq) && h.Cmax >= opt));
  const B = c.scBrute(n, s => c.scFlow(Pm, s).Cmax); t(`#${k} przegląd permutacji OptiLab = niezależny przegląd`, B.v === opt);
}
for (let k = 0; k < 80; k++) {
  const n = ri(1, 8), m = ri(1, 4), p = Array.from({length: n}, () => ri(1, 20)), Mc = c.scMcNaughton(p, m), L = c.scLPT(p, m);
  const lb = Math.max(Math.max(...p), p.reduce((s, v) => s + v, 0) / m);
  // optimum bez podziału: przegląd przydziałów zadań do maszyn
  let opt = Infinity; const ld = Array(m).fill(0), go = j => { if (j === n) { opt = Math.min(opt, Math.max(...ld)); return; } for (let q = 0; q < m; q++) { ld[q] += p[j]; go(j + 1); ld[q] -= p[j]; } }; go(0);
  const covered = p.every((pj, j) => near(Mc.parts.filter(x => x.j === j).reduce((s, x) => s + x.e - x.s, 0), pj));
  const noOverlap = Mc.parts.every(a => Mc.parts.every(b => a === b || a.j !== b.j || a.e <= b.s + 1e-9 || b.e <= a.s + 1e-9));
  t(`#${k} McNaughton: Cmax = max(max p, Σp/m), zadania kompletne, ten sam fragment zadania nie biegnie równolegle`, near(Mc.Cmax, lb) && covered && noOverlap);
  t(`#${k} LPT: Cmax ≥ optimum i ≤ (4/3 − 1/(3m))·optimum (twierdzenie Grahama)`, L.Cmax >= opt - 1e-9 && L.Cmax <= (4 / 3 - 1 / (3 * m)) * opt + 1e-9);
}
console.log(`Testy harmonogramowania: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
