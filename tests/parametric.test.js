// Testy analizy parametrycznej: przykłady z podręcznika + porównanie z gęstym próbkowaniem na losowych zadaniach
const vm = require('vm'), {load, order} = require('./helpers');
const c = load(order.filter(f => /core|solver|parametric/.test(f)));
const dualOf = vm.runInContext('dualOf', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) < 1e-6 * (1 + Math.abs(b));
const W = {n: 2, c: [3, 5], A: [[1, 0], [0, 2], [3, 2]], rel: ['<=', '<=', '<='], b: [4, 12, 18], maxi: true, t: ['c', 'c']};
let R = c.parametric(W, 'b', [4, 0, 18], [0, 1, 0], 0, 40).segments;
t('b₂: 3 przedziały', R.length === 3);
t('b₂: granice 6 i 18', near(R[0].end, 6) && near(R[1].end, 18));
t('b₂: Z=12+2,5b, 18+1,5b, 45', near(R[0].alpha, 12) && near(R[0].beta, 2.5) && near(R[1].alpha, 18) && near(R[1].beta, 1.5) && near(R[2].alpha, 45) && near(R[2].beta, 0));
R = c.parametric(W, 'c', [0, 5], [1, 0], 0, 12).segments;
t('c₁: załamanie w 7,5', R.length === 2 && near(R[0].end, 7.5) && near(R[0].beta, 2) && near(R[1].beta, 4));
R = c.parametric(W, 'b', [4, 12, 18], [0, 0, 1], -30, 30).segments;     // zakres częściowo niedopuszczalny
t('b₃(θ): brak rozwiązań poniżej −18', R[0].status === 'infeasible' && near(R[0].end, -18));
// losowe zadania: kawałkami liniowa funkcja musi zgadzać się z rozwiązaniem w gęstych próbkach
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
for (let trial = 0; trial < 40; trial++) {
  const n = ri(2, 3), m = ri(2, 3), maxi = rnd() < .6, mode = rnd() < .5 ? 'b' : 'c';
  const A = Array.from({length: m}, () => Array.from({length: n}, () => ri(0, 5))); A.push(Array(n).fill(1));
  const b = Array.from({length: m}, () => ri(3, 30)); b.push(ri(10, 40));
  const M = {n, c: Array.from({length: n}, () => ri(1, 9)), A, rel: A.map(() => '<='), b, maxi, t: Array(n).fill('c')};
  const len = mode === 'b' ? m + 1 : n, d = Array.from({length: len}, () => ri(-3, 3)); if (d.every(v => v === 0)) d[0] = 1;
  const base = (mode === 'b' ? b : M.c).slice(), lo = -10, hi = 25;
  const res = c.parametric(M, mode, base, d, lo, hi);
  let good = true;
  for (let k = 0; k <= 60 && good; k++) {
    const th = lo + (hi - lo) * (k + 0.37) / 61.3, g = res.segments.find(s => th >= s.start && th <= s.end);
    const m2 = {...M, b: b.slice(), c: M.c.slice()}; (mode === 'b' ? m2.b : m2.c).forEach((_, i, arr) => arr[i] = base[i] + th * d[i]);
    const r = c.solveM(m2);
    if (!g) { good = false; break; }
    if (g.status === 'optimal') good = r.status === 'optimal' && near(r.z, g.alpha + g.beta * th); else good = r.status === (mode === 'b' ? 'infeasible' : 'unbounded');
  }
  t('losowe #' + trial + ' (' + mode + ')', good);
}
console.log(`Testy parametryczne: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
