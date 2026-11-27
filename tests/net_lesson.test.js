// Lekcje „Nauka” dla Transportu i Przydziału (js/lessons/net-lessons.js).
// Niezależne kontrole (napisane tutaj, bez solverów OptiLab): pełne przeszukanie całkowitych planów przewozu (dla danych całkowitych optimum LP
// zadania transportowego jest całkowite) i wszystkich permutacji przydziału; literatura: Taha – zagadnienie transportowe 3 × 4: kąt NW 520,
// minimalny element 475, VAM 475, optimum 435; przydział 3 × 3: koszt 27. Każda odpowiedź sprawdzona rachunkiem z danych zadania
// (potencjały: u + v = koszt na trasach planu, cykl: naprzemienne znaki i zachowane sumy, pokrycie zer: najmniejsza liczba linii przeglądem).
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/lp-tab.js', 'js/lp-gomory.js', 'js/ilp-solver.js', 'js/examples.js', 'js/registry.js', 'js/net/netui.js', 'js/net/transport-solver.js', 'js/modules/transport.js',
  'js/net/assignment-solver.js', 'js/modules/assignment.js', 'js/pivot-svg.js', 'js/lesson.js', 'js/lessons/lp-lessons.js', 'js/lessons/ilp-lessons.js', 'js/lessons/net-lessons.js'], {console, document: {querySelector: () => null}});
const G = n => vm.runInContext(n, c), LESSON = G('LESSON'), TASKS = G('NETL_TASKS'), NETL = G('NETL');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
const strip = h => String(h ?? '').replace(/<sub>(\d+)<\/sub>/g, '$1').replace(/<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const optOf = q => q.options.find(o => o.ok), cellV = x => strip(x && typeof x === 'object' ? x.v : x);
const sum = a => a.reduce((s, v) => s + v, 0);

/* ---------- niezależne przeszukania ---------- */
function bruteTransport(cost, supply, demand) {            // min Σ c·x, wiersze = podaż, kolumny = popyt (zadanie zbilansowane), x całkowite ≥ 0
  const m = supply.length, n = demand.length, b = demand.slice(); let best = Infinity, cur = 0;
  const go = (i, j, left) => {
    if (i === m) { if (b.every(v => v === 0)) best = Math.min(best, cur); return; }
    if (j === n - 1) { const q = left; if (q > b[j]) return; b[j] -= q; cur += q * cost[i][j]; go(i + 1, 0, i + 1 < m ? supply[i + 1] : 0); cur -= q * cost[i][j]; b[j] += q; return; }
    for (let q = Math.min(left, b[j]); q >= 0; q--) { b[j] -= q; cur += q * cost[i][j]; if (cur < best) go(i, j + 1, left - q); cur -= q * cost[i][j]; b[j] += q; }
  };
  go(0, 0, supply[0]); return best;
}
function balanced(P) {                                       // dopisanie fikcyjnego dostawcy / odbiorcy (koszt 0) – niezależnie od solvera
  const S = sum(P.supply), D = sum(P.demand), cost = P.cost.map(r => r.slice()), s = P.supply.slice(), d = P.demand.slice();
  if (S > D) { d.push(S - D); cost.forEach(r => r.push(0)); } else if (D > S) { s.push(D - S); cost.push(d.map(() => 0)); }
  return {cost, s, d};
}
const perms = n => { const o = [], p = [], u = Array(n).fill(false); const go = () => { if (p.length === n) { o.push(p.slice()); return; } for (let j = 0; j < n; j++) if (!u[j]) { u[j] = true; p.push(j); go(); p.pop(); u[j] = false; } }; go(); return o; };
const bruteAssign = (cost, maxi) => perms(cost.length).map(p => sum(p.map((j, i) => cost[i][j]))).reduce((a, v) => maxi ? Math.max(a, v) : Math.min(a, v));
function minLines(A) {                                       // najmniejsza liczba linii pokrywających wszystkie zera – przegląd wszystkich podzbiorów
  const n = A.length; let best = Infinity;
  for (let mask = 0; mask < 1 << (2 * n); mask++) { const r = i => mask >> i & 1, cc = j => mask >> (n + j) & 1;
    if (A.every((row, i) => row.every((v, j) => Math.abs(v) > 1e-9 || r(i) || cc(j)))) best = Math.min(best, [...Array(2 * n).keys()].filter(k => mask >> k & 1).length); }
  return best;
}

/* ---------- każda lekcja ---------- */
const LIMIT = {warm: 16, test: 18, challenge: 18};
for (const id of ['tr-modi', 'tr-start', 'as-hung']) for (const lv of ['warm', 'test', 'challenge']) {
  const nm = `${id}/${lv}`; let L;
  try { L = LESSON.build(id, lv); } catch (e) { t(`${nm}: generowanie bez błędu (${e.message})`, false); continue; }
  t(`${nm}: generowanie bez błędu`, true);
  const pr = LESSON.validate(L); t(`${nm}: format kart poprawny ${pr.join('; ')}`, !pr.length);
  t(`${nm}: najwyżej ${LIMIT[lv]} kart (jest ${L.steps.length})`, L.steps.length <= LIMIT[lv]);
  const last = L.steps[L.steps.length - 1], qs = L.steps.filter(s => s.q).map(s => s.q), exam = lv !== 'warm';
  t(`${nm}: ostatnia karta = wynik lekcji`, last.result && near(last.result.z, L.result.z));
  t(`${nm}: pytania (${qs.length})`, qs.length >= (lv === 'challenge' ? 3 : 3));
  if (lv === 'test') t(`${nm}: Sprawdzian punktowany`, qs.filter(q => q.score).length >= 5); else t(`${nm}: bez punktacji poza Sprawdzianem`, qs.every(q => !q.score));
  t(`${nm}: każde pytanie ma opis pochodzenia odpowiedzi (q.tag)`, qs.every(q => q.tag && q.tag.t));
  if (id !== 'as-hung') {
    const P = L.P, R = L.R, B = balanced(P), opt = bruteTransport(B.cost, B.s, B.d);
    t(`${nm}: koszt = pełne przeszukanie planów (${opt})`, near(L.result.z, opt));
    const X = L.result.plan; t(`${nm}: plan spełnia podaż i popyt`, X.every((r, i) => near(sum(r), B.s[i])) && B.d.every((d, j) => near(sum(X.map(r => r[j])), d)) && near(sum(X.flatMap((r, i) => r.map((q, j) => q * B.cost[i][j]))), L.result.z));
    const rep = G('trReportHTML')(R, []), mR = rep.match(/Wynik:<\/b> minimalny koszt = <b>([^<]+)<\/b>/);
    t(`${nm}: raport zakładki Transport podaje ten sam koszt (${mR && mR[1]})`, mR && near(+mR[1].replace(',', '.'), L.result.z));
    const NW = c.transportSolve(P, 'nw');
    qs.forEach((q, k) => { const tg = q.tag, w = `${nm}: pytanie ${k + 1} (${tg.t})`;
      const It = tg.it !== undefined ? R.iters[tg.it] : null;
      if (tg.t === 'tsum') t(`${w}: suma podaży`, near(q.answer, sum(P.supply)));
      else if (tg.t === 'dummy') t(`${w}: fikcyjny = |podaż − popyt|`, near(q.answer, Math.abs(sum(P.supply) - sum(P.demand))));
      else if (tg.t === 'nwq') { const s = NW.initial.steps[tg.k], a = tg.k ? NW.initial.steps[tg.k - 1].a : R.supply, b = tg.k ? NW.initial.steps[tg.k - 1].b : R.demand;
        const fi = a.findIndex((v, i) => !(tg.k ? NW.initial.steps[tg.k - 1].rowOut[i] : false)), fj = b.findIndex((v, j) => !(tg.k ? NW.initial.steps[tg.k - 1].colOut[j] : false));
        t(`${w}: kąt NW = lewa górna wolna komórka, min(podaż, popyt)`, s.i === fi && s.j === fj && near(q.answer, Math.min(a[fi], b[fj]))); }
      else if (tg.t === 'tcost0') t(`${w}: koszt planu z kąta NW`, near(q.answer, sum(NW.initial.x.flatMap((r, i) => r.map((v, j) => v * B.cost[i][j])))));
      else if (tg.t === 'pot') { const ok2 = It.B.every((r, i) => r.every((b, j) => !b || near(It.u[i] + It.v[j], B.cost[i][j]))) && It.u[0] === 0;
        t(`${w}: u + v = koszt na trasach planu, u1 = 0, v${tg.j + 1} = ${It.v[tg.j]}`, ok2 && near(q.answer, It.v[tg.j])); }
      else if (tg.t === 'dij') t(`${w}: d = koszt − u − v`, !It.B[tg.i][tg.j] && near(q.answer, B.cost[tg.i][tg.j] - It.u[tg.i] - It.v[tg.j]));
      else if (tg.t === 'tenter') { let mn = Infinity, cell = null; It.B.forEach((r, i) => r.forEach((b, j) => { if (!b) { const d = B.cost[i][j] - It.u[i] - It.v[j]; if (d < mn - 1e-9) { mn = d; cell = [i, j]; } } }));
        t(`${w}: wchodzi trasa z najbardziej ujemnym d`, mn < 0 && strip(optOf(q).t) === strip(`${R.sNames[cell[0]]} → ${R.dNames[cell[1]]}`)); }
      else if (tg.t === 'theta') { const cy = It.cycle, rows = {}, cols = {}; cy.forEach(e => { rows[e.i] = (rows[e.i] || 0) + e.s; cols[e.j] = (cols[e.j] || 0) + e.s; });
        const valid = Object.values(rows).every(v => v === 0) && Object.values(cols).every(v => v === 0) && cy.slice(1).every(e => It.B[e.i][e.j]);
        t(`${w}: cykl poprawny (sumy bez zmian, skręty w trasach planu), θ = min w komórkach z minusem`, valid && near(q.answer, Math.min(...cy.filter(e => e.s < 0).map(e => It.x[e.i][e.j])))); }
      else if (tg.t === 'tcost') { const Nx = R.iters[tg.it + 1].x; t(`${w}: koszt nowego planu`, near(q.answer, sum(Nx.flatMap((r, i) => r.map((v, j) => v * B.cost[i][j]))))); }
      else if (tg.t === 'topt') { const F = R.iters[R.iters.length - 1]; t(`${w}: wszystkie d ≥ 0`, F.B.every((r, i) => r.every((b, j) => b || B.cost[i][j] - F.u[i] - F.v[j] >= -1e-9)) && strip(optOf(q).t).startsWith('nie')); }
      else if (tg.t === 'lcfirst') { let mn = Infinity; B.cost.forEach(r => r.forEach(v => { mn = Math.min(mn, v); })); t(`${w}: najtańsza trasa (${mn})`, strip(optOf(q).t).endsWith(`(koszt ${mn})`)); }
      else if (tg.t === 'lccost' || tg.t === 'vamcost') t(`${w}: koszt planu startowego`, near(q.answer, sum(R.initial.x.flatMap((r, i) => r.map((v, j) => v * B.cost[i][j])))));
      else if (tg.t === 'pen') { const cs = B.cost[tg.row].slice().sort((a, b) => a - b); t(`${w}: kara = różnica dwóch najniższych kosztów`, near(q.answer, cs[1] - cs[0])); }
      else if (tg.t === 'penline') { const vs = R.initial.steps.filter(s => s.rowPen), v = vs[tg.k], pv = tg.k ? vs[tg.k - 1] : null;
        const live = (arr, out) => arr.map((x, k2) => out && out[k2] ? null : x), rowsOut = pv ? pv.rowOut : B.s.map(() => false), colsOut = pv ? pv.colOut : B.d.map(() => false);
        const pen = vals => { const s2 = vals.slice().sort((a, b) => a - b); return s2.length > 1 ? s2[1] - s2[0] : s2[0]; };
        const rp = B.cost.map((r, i) => rowsOut[i] ? null : pen(r.filter((_, j) => !colsOut[j]))), cp = B.d.map((_, j) => colsOut[j] ? null : pen(B.cost.filter((_, i) => !rowsOut[i]).map(r => r[j])));
        const mx = Math.max(...[...rp, ...cp].filter(x => x !== null)), lab = v.line.type === 'row' ? 'wiersz ' + R.sNames[v.line.k] : 'kolumna ' + R.dNames[v.line.k];
        t(`${w}: największa kara (${mx}) – policzona tutaj od nowa`, (v.line.type === 'row' ? rp[v.line.k] : cp[v.line.k]) === mx && strip(optOf(q).t).startsWith(lab) && live(rp, rowsOut).join() === v.rowPen.join()); }
      else if (tg.t === 'vamq') { const vs = R.initial.steps.filter(s => s.rowPen), v = vs[tg.k], pv = tg.k ? vs[tg.k - 1] : null, a = pv ? pv.a : B.s, b = pv ? pv.b : B.d;
        t(`${w}: min(pozostała podaż, pozostały popyt)`, near(q.answer, Math.min(a[v.i], b[v.j]))); }
      else if (tg.t === 'cmpbest') { const cs = [['kąt NW', c.transportSolve(P, 'nw').initial.t, 'nw'], ['minimalny element', c.transportSolve(P, 'lc').initial.t, 'lc'], ['VAM', c.transportSolve(P, 'vam').initial.t, 'vam']].filter(x => !tg.among || tg.among.includes(x[2])), mn = Math.min(...cs.map(x => x[1]));
        t(`${w}: najtańszy start`, cs.filter(x => x[1] === mn).every(x => strip(optOf(q).t).includes(x[0].replace('kąt NW', 'NW')) || strip(optOf(q).t).includes(x[0]))); }
      else if (tg.t === 'nwcost') t(`${w}: koszt planu z kąta NW`, near(q.answer, sum(NW.initial.x.flatMap((r, i) => r.map((v, j) => v * B.cost[i][j])))));
      else if (tg.t === 'saving') { const best = Math.min(...['nw', 'lc', 'vam'].map(k2 => c.transportSolve(P, k2).initial.t)); t(`${w}: najlepszy start − optimum`, near(q.answer, best - opt)); }
      else t(`${w}: znany rodzaj pytania`, false); });
  } else {
    const P = L.P, R = L.R, n = R.n, opt = bruteAssign(P.cost, P.maxi);
    t(`${nm}: wynik = przegląd wszystkich ${perms(n).length} przydziałów (${opt})`, near(L.result.z, opt) && near(sum(L.result.assign.map((j, i) => P.cost[i][j])), opt) && new Set(L.result.assign).size === n);
    const rep = G('asReportHTML')(R), mR = rep.match(/Wynik:<\/b> (?:minimalny koszt|maksymalny zysk) = <b>([^<]+)<\/b>/);
    t(`${nm}: raport zakładki Przydział podaje ten sam wynik (${mR && mR[1]})`, mR && near(+mR[1].replace(',', '.'), L.result.z));
    const mx = Math.max(...P.cost.flat()), A0 = P.cost.map(r => r.map(v => P.maxi ? mx - v : v)), rowMin = A0.map(r => Math.min(...r)), Ar = A0.map((r, i) => r.map(v => v - rowMin[i]));
    const colMin = Ar[0].map((_, j) => Math.min(...Ar.map(r => r[j])));
    const covers = R.steps.filter(s => s.kind === 'cover'), adjs = R.steps.filter(s => s.kind === 'adjust');
    qs.forEach((q, k) => { const tg = q.tag, w = `${nm}: pytanie ${k + 1} (${tg.t})`;
      if (tg.t === 'nfact') t(`${w}: n!`, q.answer === perms(n).length);
      else if (tg.t === 'loss') t(`${w}: strata = największy zysk − zysk`, near(q.answer, mx - P.cost[tg.i][tg.j]));
      else if (tg.t === 'rowmin') t(`${w}: minimum wiersza`, near(q.answer, rowMin[tg.i]));
      else if (tg.t === 'colmin') t(`${w}: minimum kolumny po redukcji wierszy`, near(q.answer, colMin[tg.j]));
      else if (tg.t === 'lines') t(`${w}: najmniejsza liczba linii (przegląd podzbiorów) = ${minLines(covers[tg.k].A)}`, q.answer === minLines(covers[tg.k].A));
      else if (tg.t === 'kadj') { const cv = covers[tg.k], A = cv.A, unc = []; A.forEach((r, i) => r.forEach((v, j) => { if (!cv.cr[i] && !cv.cc[j]) unc.push(v); }));
        t(`${w}: k = najmniejszy element bez linii, pokrycie ma ${minLines(A)} linii`, near(q.answer, Math.min(...unc)) && cv.cr.filter(Boolean).length + cv.cc.filter(Boolean).length === minLines(A)); }
      else if (tg.t === 'acell') { const cv = covers[tg.k]; t(`${w}: skrzyżowanie + k`, cv.cr[tg.i] && cv.cc[tg.j] && near(q.answer, cv.A[tg.i][tg.j] + adjs[tg.k].k) && near(adjs[tg.k].A[tg.i][tg.j], q.answer)); }
      else if (tg.t === 'pick') { const fin = R.steps[R.steps.length - 1].A, j = R.assign[tg.i]; t(`${w}: wybrane zero należy do przydziału optymalnego`, Math.abs(fin[tg.i][j]) < 1e-9 && strip(optOf(q).t) === strip(R.cNames[j])); }
      else if (tg.t === 'atotal') t(`${w}: suma z pierwotnej tabeli = optimum`, near(q.answer, opt));
      else t(`${w}: znany rodzaj pytania`, false); });
  }
  // efekt egzaminu: w Sprawdzianie i Wyzwaniu odpowiedzi nie da się odczytać z karty, na której pada pytanie
  if (exam) {
    const leaks = [];
    L.steps.forEach(s => { if (!s.q) return; const tg = s.q.tag, T = s.table, txt = strip(s.text) + ' ' + strip(s.say) + ' ' + (s.hl || []).map(h => h.label || '').join(' ');
      const f = m => leaks.push(`${strip(s.title)} (${tg.t}): ${m}`);
      if (tg.cell && T && !cellV(T.rows[tg.cell[0]][tg.cell[1]]).endsWith('?')) f('pytana komórka nie jest zasłonięta');   // komórka trasy: koszt w rogu + „?” w miejscu przewozu / d
      if (s.q.type === 'number') { const a = G('LPL').nf(s.q.answer); if (new RegExp('(^|[^\\w/,_(])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\w/,)]|$)').test(txt)) f('liczba z odpowiedzią w tekście'); }
      if (['tenter', 'pick', 'lines', 'atotal', 'topt'].includes(tg.t) && (s.hl || []).length) f('różdżka wskazuje odpowiedź');
      if (tg.t === 'lines' && T && T.rows.some(r => r.some(x => x && x.cls && /cov/.test(x.cls)))) f('widać linie pokrycia');
      if ((tg.t === 'atotal' || tg.t === 'pick') && T && T.rows.some(r => r.some(x => x && x.cls && /pivot/.test(x.cls)))) f('zaznaczony przydział');
      if (tg.t === 'vamcost' || tg.t === 'cmpbest') { if (s.formula && new RegExp('VAM: ' + G('LPL').nf(L.R.initial.t)).test(strip(s.formula)) && lv === 'test') f('widać koszt VAM'); }
    });
    t(`${nm}: efekt egzaminu – odpowiedzi nie widać na karcie ${leaks.join('; ')}`, !leaks.length);
  }
}
/* ---------- literatura ---------- */
const TS = LESSON.build('tr-start', 'challenge');
t('Taha 3 × 4: kąt NW 520, minimalny element 475, VAM 475, optimum 435', TS.NW.initial.t === 520 && TS.LC.initial.t === 475 && TS.VA.initial.t === 475 && TS.result.z === 435);
t('Taha 3 × 4: optimum 435 także w pełnym przeszukaniu', bruteTransport([[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]], [15, 25, 10], [5, 15, 15, 15]) === 435);
t('Taha – przydział 3 × 3: koszt 27', LESSON.build('as-hung', 'warm').result.z === 27);
t('Wyzwanie transportu: fikcyjny dostawca (popyt > podaż)', LESSON.build('tr-modi', 'challenge').R.dummy.type === 'row');
/* ---------- liczby nie są wpisane na stałe ---------- */
const save = JSON.stringify(TASKS.transport.warm); TASKS.transport.warm.supply = [10, 15]; TASKS.transport.warm.demand = [10, 10, 5];
let L2; try { L2 = LESSON.build('tr-modi', 'warm'); } catch (e) { L2 = null; }
t('zmienione dane → nowy wynik (pełne przeszukanie)', L2 && near(L2.result.z, bruteTransport(L2.P.cost, L2.P.supply, L2.P.demand)) && !LESSON.validate(L2).length);
Object.assign(TASKS.transport.warm, JSON.parse(save)); t('przywrócone dane → koszt 25', LESSON.build('tr-modi', 'warm').result.z === 25);
/* ---------- menu i przycisk ---------- */
t('tematy w zakładkach Transport i Przydział', LESSON.hasLessons('transport') && LESSON.hasLessons('assign') && !LESSON.hasLessons('sp'));
t('NET_LOAD: wspólny punkt wczytywania danych do modułów sieciowych', typeof G('NET_LOAD') === 'object');
console.log(`Testy lekcji „Nauka” (Transport i Przydział): ${ok} OK, ${bad} błędów`); if (bad) process.exit(1);
