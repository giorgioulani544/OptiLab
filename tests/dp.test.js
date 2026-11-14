// Programowanie dynamiczne: problem dyliżansu (Hillier i Lieberman: koszt 11, trzy trasy), przegląd wszystkich polityk dla każdego rodzaju zadania
const {load} = require('./helpers');
const c = load(['js/dp/dp-solver.js']);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b));
const HL = [['1', '2', 2], ['1', '3', 4], ['1', '4', 3], ['2', '5', 7], ['2', '6', 4], ['2', '7', 6], ['3', '5', 3], ['3', '6', 2], ['3', '7', 4], ['4', '5', 4], ['4', '6', 1], ['4', '7', 5],
  ['5', '8', 1], ['5', '9', 4], ['6', '8', 6], ['6', '9', 3], ['7', '8', 3], ['7', '9', 3], ['8', '10', 3], ['9', '10', 4]].map(([a, b, c2]) => ({a, b, c: c2}));
const S = c.dpPath(HL, '1', '10');
t('dyliżans (Hillier i Lieberman): koszt 11', S.status === 'optimal' && S.value === 11);
t('dyliżans: trzy trasy optymalne 1-3-5-8-10, 1-4-5-8-10, 1-4-6-9-10', S.routes.map(r => r.join('-')).sort().join(' | ') === '1-3-5-8-10 | 1-4-5-8-10 | 1-4-6-9-10');
const Sf = c.dpPath(HL, '1', '10', false, 'fwd'); t('dyliżans: rekurencja w przód daje ten sam koszt i te same trasy', Sf.value === 11 && Sf.routes.map(r => r.join('-')).sort().join() === S.routes.map(r => r.join('-')).sort().join());
t('dyliżans: f₄(8) = 3, f₃(5) = 4, f₂(4) = 8 (etapy wstecz)', S.stages.find(s => s.k === 4).rows.find(r => r.s === '8').best === 3 && S.stages.find(s => s.k === 3).rows.find(r => r.s === '5').best === 4 && S.stages.find(s => s.k === 2).rows.find(r => r.s === '4').best === 8);
let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let k = 0; k < 80; k++) {                                            // losowe sieci etapowe vs przegląd wszystkich tras
  const K = ri(2, 5), W = Array.from({length: K + 1}, (_, i) => i === 0 || i === K ? 1 : ri(1, 4)), name = (i, j) => i === 0 ? 'S' : i === K ? 'M' : `${i}.${j}`, arcs = [];
  for (let i = 0; i < K; i++) for (let a = 0; a < W[i]; a++) for (let b = 0; b < W[i + 1]; b++) if (rnd() < 0.8 || b === 0) arcs.push({a: name(i, a), b: name(i + 1, b), c: ri(1, 20)});
  const maxi = rnd() < 0.3, R = c.dpPath(arcs, 'S', 'M', maxi, rnd() < 0.5 ? 'back' : 'fwd'), all = [], go = (v, acc, cost) => { if (v === 'M') { all.push({p: [...acc, v], cost}); return; } arcs.filter(e => e.a === v).forEach(e => go(e.b, [...acc, v], cost + e.c)); };
  go('S', [], 0);
  const best = all.length ? (maxi ? Math.max : Math.min)(...all.map(x => x.cost)) : null;
  t(`#${k} sieć etapowa: wartość i wszystkie trasy optymalne = przegląd wszystkich tras`, best === null ? R.status !== 'optimal' : R.status === 'optimal' && near(R.value, best) && R.routes.map(r => r.join('-')).sort().join('|') === all.filter(x => near(x.cost, best)).map(x => x.p.join('-')).sort().join('|'));
}
for (let k = 0; k < 60; k++) {                                            // rozdział zasobów vs przegląd wszystkich podziałów
  const n = ri(1, 4), R = ri(0, 7), ret = Array.from({length: n}, () => { let s = 0; return Array.from({length: R + 1}, (_, x) => x ? (s += ri(-2, 9)) : ri(0, 3)); }), maxi = rnd() < 0.7;
  let best = null; const x = Array(n).fill(0), go = (i, left) => { if (i === n - 1) { x[i] = left; const v = x.reduce((s, xi, j) => s + ret[j][xi], 0); if (best === null || (maxi ? v > best : v < best)) best = v; return; } for (let a = 0; a <= left; a++) { x[i] = a; go(i + 1, left - a); } };
  go(0, R); const D = c.dpAlloc(ret, R, maxi); t(`#${k} rozdział zasobów: wartość = przegląd, polityka sumuje się do R i daje tę wartość`, near(D.value, best) && D.policy.reduce((s, p) => s + p.x, 0) === R && near(D.policy.reduce((s, p) => s + p.imm, 0), best));
}
for (let k = 0; k < 80; k++) {                                            // plecak 0/1, ograniczony i nieograniczony vs przegląd
  const n = ri(1, 5), W = ri(0, 25), kind = ri(0, 2), items = Array.from({length: n}, () => ({w: ri(1, 9), v: ri(0, 20), lim: kind === 0 ? 1 : kind === 1 ? ri(1, 3) : Infinity}));
  let best = 0; const x = Array(n).fill(0), go = (i, cap) => { if (i === n) { best = Math.max(best, x.reduce((s, xi, j) => s + xi * items[j].v, 0)); return; } for (let m = 0; m <= Math.min(items[i].lim, Math.floor(cap / items[i].w)); m++) { x[i] = m; go(i + 1, cap - m * items[i].w); } x[i] = 0; };
  go(0, W); const D = c.dpKnap(items, W); t(`#${k} plecak (${['0/1', 'ograniczony', 'nieograniczony'][kind]}): wartość = przegląd, polityka dopuszczalna`, D.value === best && D.policy.reduce((s, p, i) => s + p.x * items[i].w, 0) <= W && D.policy.every((p, i) => p.x <= items[i].lim) && D.policy.reduce((s, p) => s + p.imm, 0) === best);
}
for (let k = 0; k < 60; k++) {                                            // produkcja–zapasy vs przegląd wszystkich planów produkcji
  const T = ri(1, 4), per = Array.from({length: T}, () => ({D: ri(0, 4), cap: ri(1, 5), K: ri(0, 10), c: ri(1, 5), h: ri(0, 3)})), I0 = ri(0, 2), Iend = ri(0, 2), Smax = ri(2, 6);
  let best = null; const x = Array(T).fill(0), go = (i, s, cost) => { if (i === T) { if (s === Iend && (best === null || cost < best)) best = cost; return; } for (let q = 0; q <= per[i].cap; q++) { const e = s + q - per[i].D; if (e < 0 || e > Smax) continue; go(i + 1, e, cost + (q ? per[i].K + per[i].c * q : 0) + per[i].h * e); } };
  go(0, I0, 0); const D = c.dpProd(per, I0, Iend, Smax);
  t(`#${k} produkcja–zapasy: koszt = przegląd wszystkich planów (lub brak planu)`, best === null || I0 > Smax ? D.status === 'infeasible' : D.status === 'optimal' && near(D.value, best) && near(D.policy.reduce((s, p) => s + p.imm, 0), best));
}
for (let k = 0; k < 60; k++) {                                            // wymiana sprzętu vs przegląd wszystkich ciągów decyzji
  const T = ri(1, 6), A = ri(2, 5), P = ri(50, 120), op = Array.from({length: A}, (_, a) => 10 + a * ri(3, 12)), sal = Array.from({length: A + 1}, (_, a) => a ? Math.max(0, P - a * ri(10, 30)) : 0), a0 = ri(1, A);
  let best = Infinity; const go = (t2, a, cost) => { if (t2 === T) { best = Math.min(best, cost - sal[a]); return; } if (a < A) go(t2 + 1, a + 1, cost + op[a]); go(t2 + 1, 1, cost + P - sal[a] + op[0]); };
  go(0, a0, 0); const D = c.dpReplace(T, a0, P, op, sal, A);
  t(`#${k} wymiana sprzętu: koszt = przegląd wszystkich ciągów decyzji`, near(D.value, best) && near(D.policy.reduce((s, p) => s + p.imm, 0) - D.endSal, best));
}
t('sieć z cyklem odrzucona z komunikatem', c.dpPath([{a: 'A', b: 'B', c: 1}, {a: 'B', b: 'A', c: 1}, {a: 'B', b: 'C', c: 1}], 'A', 'C').status === 'error');
console.log(`Testy programowania dynamicznego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
