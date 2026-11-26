// Lekcje „Nauka” (js/lesson.js + js/lessons/lp-lessons.js): silnik (sprawdzanie odpowiedzi, format kart), maskotka,
// a dla każdej lekcji: generowanie bez błędu, poprawne odpowiedzi zgodne z solverem, ostatni krok = wynik raportu, limity kroków.
// Kontrola wyników jest niezależna od lekcji: przegląd wierzchołków napisany tutaj + wartości z literatury (Hillier i Lieberman: Wyndor 36 w (2; 6)).
const fs = require('fs'), path = require('path'), vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/lp-tab.js', 'js/lp-gomory.js', 'js/render.js', 'js/examples.js', 'js/pivot-svg.js', 'js/lesson.js', 'js/lessons/lp-lessons.js'], {console});
const G = n => vm.runInContext(n, c), LESSON = G('LESSON'), LPL = G('LPL'), TASKS = G('LPL_TASKS'), FR = G('FR'), sFmt = G('sFmt');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const strip = h => String(h).replace(/<sub>(\d+)<\/sub>/g, '$1').replace(/<[^>]+>/g, '').trim();

/* ---------- silnik: odpowiedzi liczbowe i wyboru ---------- */
const P = LESSON.parseNum, NM = LESSON.numMatch;
t('parseNum: 12, 1,5, −3/2, 2 500, pusty', P('12') === 12 && P('1,5') === 1.5 && P('−3/2') === -1.5 && P('2 500') === 2500 && isNaN(P('')) && isNaN(P('abc')) && isNaN(P('1/0')));
t('numMatch: ułamek = dziesiętny, zaokrąglenie do 2 miejsc, ale nie do 1', NM('3/2', 1.5) && NM('1,5', 1.5) && NM('0,33', 1 / 3) && NM('0,333', 1 / 3) && !NM('0,3', 1 / 3) && !NM('0,34', 1 / 3 - 0.01) && NM('0,67', 2 / 3));
t('numMatch: duże liczby bez luzu', NM('18000', 18000) && !NM('18001', 18000));
const qn = {type: 'number', answer: 6, wrong: [{v: 12, why: 'pomyłka A'}], why: 'ogólne'};
t('check liczby: dobra, typowa pomyłka z własnym wyjaśnieniem, inna z ogólnym, pusty wpis', LESSON.check(qn, '6').ok && LESSON.check(qn, '12').why === 'pomyłka A' && LESSON.check(qn, '7').why === 'ogólne' && LESSON.check(qn, '').empty);
const qc = {type: 'choice', options: [{t: 'a', why: 'bo A'}, {t: 'b', ok: true}]};
t('check wyboru: dobra i zła z konkretnym wyjaśnieniem', LESSON.check(qc, 1).ok && !LESSON.check(qc, 0).ok && LESSON.check(qc, 0).why === 'bo A');
t('validate: wykrywa dwie poprawne odpowiedzi, brak wyjaśnienia, za długi tekst, zły q.back',
  LESSON.validate({steps: [{text: 'a', q: {type: 'choice', options: [{t: 1, ok: true}, {t: 2, ok: true}]}}]}).length === 1 &&
  LESSON.validate({steps: [{text: 'a', q: {type: 'choice', options: [{t: 1, ok: true}, {t: 2}]}}]}).length === 1 &&
  LESSON.validate({steps: [{text: 'Raz. Dwa. Trzy. Cztery.'}]}).length === 1 &&
  LESSON.validate({steps: [{text: 'a', q: {type: 'number', answer: 1, back: 'nie-ma'}}]}).length === 1);
const th = LESSON.tableHTML({head: [[{v: 'A', c: 0}, {v: 'B', c: 1}]], rows: [[{v: 'x', th: true}, {v: '1', cls: 'pivot'}]]});
t('tabela karty: data-r / data-c na komórkach (cel różdżki)', /<th data-r="h0" data-c="1">B<\/th>/.test(th) && /<td data-r="0" data-c="1" class="pivot">1<\/td>/.test(th));

/* ---------- maskotka: jedno źródło (assets/pivot_maskotka.svg), sześć póz ---------- */
const svg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'pivot_maskotka.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim();
t('js/pivot-svg.js = assets/pivot_maskotka.svg (uruchom tools/pivot_svg.py po zmianie SVG)', G('PIVOT_SVG') === svg);
t('maskotka ma grupy poza-explain/point/think/surprise/happy/oops', ['explain', 'point', 'think', 'surprise', 'happy', 'oops'].every(p => svg.includes(`id="poza-${p}"`)));

/* ---------- niezależny przegląd wierzchołków (dowolne n, ≤ ≥ =, x ≥ 0) ---------- */
function brute(M) {
  const n = M.c.length, rows = [], rhs = [];
  M.A.forEach((a, i) => { if (M.rel[i] !== '>=') { rows.push(a); rhs.push(M.b[i]); } if (M.rel[i] !== '<=') { rows.push(a.map(v => -v)); rhs.push(-M.b[i]); } });
  for (let j = 0; j < n; j++) { const e = Array(n).fill(0); e[j] = -1; rows.push(e); rhs.push(0); }
  let best = null; const pick = [];
  const go = (s, left) => {
    if (!left) { const A = pick.map(i => [...rows[i], rhs[i]]);
      for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i; if (Math.abs(A[p][k]) < 1e-10) return; [A[k], A[p]] = [A[p], A[k]];
        for (let i = 0; i < n; i++) if (i !== k) { const f = A[i][k] / A[k][k]; for (let j = k; j <= n; j++) A[i][j] -= f * A[k][j]; } }
      const x = A.map((r, k) => r[n] / r[k]);
      if (rows.every((r, i) => r.reduce((s2, v, j) => s2 + v * x[j], 0) <= rhs[i] + 1e-7)) { const z = M.c.reduce((s2, v, j) => s2 + v * x[j], 0); if (!best || (M.maxi ? z > best.z + 1e-9 : z < best.z - 1e-9)) best = {x, z}; }
      return; }
    for (let i = s; i <= rows.length - left; i++) { pick.push(i); go(i + 1, left - 1); pick.pop(); }
  };
  go(0, n); return best;
}

/* ---------- każda lekcja ---------- */
const LIMIT = {warm: 18, test: 20, challenge: 16};     // Rozgrzewka i Sprawdzian w niewielu krokach (kartach)
const optOf = q => q.options.find(o => o.ok);
for (const [id, key] of [['lp-graph', 'graph'], ['lp-simplex', 'simplex'], ['lp-2f', 'twophase'], ['lp-bigm', 'bigm']]) for (const lv of ['warm', 'test', 'challenge']) {
  const nm = `${id}/${lv}`; let L;
  try { L = LESSON.build(id, lv); } catch (e) { t(`${nm}: generowanie bez błędu (${e.message})`, false); continue; }
  t(`${nm}: generowanie bez błędu`, true);
  const pr = LESSON.validate(L); t(`${nm}: format kart poprawny ${pr.join('; ')}`, !pr.length);
  t(`${nm}: najwyżej ${LIMIT[lv]} kart (jest ${L.steps.length})`, L.steps.length <= LIMIT[lv]);
  const M = L.model, B = brute(M), last = L.steps[L.steps.length - 1];
  const X = L.result.x, lhs = M.A.map(a => a.reduce((s, v, j) => s + v * X[j], 0));
  t(`${nm}: wynik lekcji = przegląd wierzchołków (Z = ${B && B.z})`, B && near(L.result.z, B.z) && near(M.c.reduce((s, cc, k) => s + cc * X[k], 0), B.z));
  t(`${nm}: x z lekcji spełnia ograniczenia`, X.every(v => v >= -1e-9) && lhs.every((v, i) => M.rel[i] === '<=' ? v <= M.b[i] + 1e-7 : M.rel[i] === '>=' ? v >= M.b[i] - 1e-7 : near(v, M.b[i])));
  t(`${nm}: ostatnia karta pokazuje ten sam wynik`, last.result && near(last.result.z, L.result.z) && last.result.x.every((v, j) => near(v, L.result.x[j])));
  const qs = L.steps.filter(s => s.q).map(s => s.q);
  t(`${nm}: są pytania (${qs.length})`, qs.length >= (lv === 'challenge' ? 2 : 4));
  if (lv === 'test') t(`${nm}: Sprawdzian liczy wynik (pytania punktowane: ${qs.filter(q => q.score).length})`, qs.filter(q => q.score).length >= 6);
  else t(`${nm}: poza Sprawdzianem brak punktacji`, qs.every(q => !q.score));
  // wynik z raportu modułu
  if (key === 'simplex' || key === 'bigm') {
    const R = c.tabSolve(M), rep = c.tabReportHTML(M, R), lt = R.tables[R.tables.length - 1];
    t(`${nm}: raport (alternatywna metoda tabelaryczna) pokazuje Z = ${sFmt(lt.z, G('fmt'))} – jak lekcja`, rep.includes(`Z = ${sFmt(lt.z, G('fmt'))}.`) && near(R.z, L.result.z));
    const r2 = c.solveM({...M, method: '2F'}); t(`${nm}: zgodność z metodą dwufazową z zakładki Simpleks`, r2.status === 'optimal' && near(r2.z, L.result.z));
  }
  if (key === 'twophase') { const r2 = c.solveM({...M, method: '2F'}); t(`${nm}: wynik = raport metody dwufazowej (solveM)`, r2.status === 'optimal' && near(r2.z, L.result.z) && r2.x.every((v, j) => near(v, L.result.x[j]))); }
  if (key === 'graph') { const r2 = c.solveM(M); t(`${nm}: wynik = kontrola simpleksem z raportu metody graficznej`, r2.status === 'optimal' && near(r2.z, L.result.z)); }
  // poprawne odpowiedzi zgodne z solverem (q.tag mówi, skąd pochodzi odpowiedź)
  const R = key === 'simplex' || key === 'bigm' ? c.tabSolve(M) : null, GM = key === 'twophase' ? c.gomSolve(M, {maxCuts: 0}) : null;
  const tab = tg => { if (R) { const T = R.tables[tg.it]; return {names: R.names, T, next: R.tables[tg.it + 1], num: v => v}; }
    const arr = tg.ph === 1 ? GM.phase1 : GM.lp, T = arr[tg.it]; return {names: T.names, T, next: arr[tg.it + 1], num: FR.toNum}; };
  let checked = 0;
  qs.forEach((q, k) => {
    const tg = q.tag || {}, w = `${nm}: pytanie ${k + 1} (${tg.t})`;
    if (tg.t === 'enter') { const X = tab(tg); t(`${w}: wchodzi ${X.names[X.T.pc]}`, strip(optOf(q).t) === 'wchodzi ' + X.names[X.T.pc]); checked++; }
    else if (tg.t === 'leave') { const X = tab(tg); t(`${w}: wychodzi ${X.names[X.T.basis[X.T.pr]]}`, strip(optOf(q).t) === 'wychodzi ' + X.names[X.T.basis[X.T.pr]]); checked++; }
    else if (tg.t === 'cell') { const X = tab(tg), N = X.names.length, v = tg.j < N ? X.num(X.next.A[tg.r][tg.j]) : X.num(X.next.b[tg.r]);
      t(`${w}: liczba nowej tablicy = ${v}`, near(q.answer, v)); t(`${w}: typowe pomyłki różne od odpowiedzi`, (q.wrong || []).every(x => !near(x.v, v))); checked++; }
    else if (tg.t === 'z') { t(`${w}: Z = ${B.z}`, near(q.answer, B.z)); checked++; }
    else if (tg.t === 'optimal') { t(`${w}: „nie – to optimum”`, strip(optOf(q).t).startsWith('nie')); checked++; }
    else if (tg.t === 'slack') { t(`${w}: liczba zmiennych swobodnych`, q.answer === M.rel.filter(r => r === '<=').length); checked++; }
    else if (tg.t === 'start') { t(`${w}: wartość startowa = prawa strona`, near(q.answer, M.b[0])); checked++; }
    else if (tg.t === 'cmz0') { t(`${w}: c_j − z_j na starcie = c_j`, near(q.answer, M.c[0])); checked++; }
    else if (tg.t === 'w0') { const s = M.b.filter((_, i) => M.rel[i] !== '<=').reduce((a, b) => a + b, 0); t(`${w}: w na starcie = ${s}`, near(q.answer, s)); checked++; }
    else if (tg.t === 'cost1') { t(`${w}: koszt −1`, strip(optOf(q).t) === '−1'); checked++; }
    else if (tg.t === 'dropArt') { t(`${w}: kolumny sztuczne usuwamy`, strip(optOf(q).t).startsWith('usuwamy')); checked++; }
    else if (tg.t === 'cmpM') { const T0 = R.tables[0], d = G('sCmp')(T0.cmz[tg.j], T0.cmz[tg.other]);
      t(`${w}: ${M.maxi ? 'większa' : 'mniejsza'} liczba z M (porównanie: najpierw część z M)`, M.maxi ? d > 0 : d < 0); checked++; }
    else if (tg.t === 'intercept') { const a = M.A[tg.i]; t(`${w}: przecięcie z osią x₁ = b/a₁`, near(q.answer, M.b[tg.i] / a[0])); checked++; }
    else if (tg.t === 'origin') { const v = 0, ok2 = M.rel[tg.i] === '<=' ? v <= M.b[tg.i] : v >= M.b[tg.i]; t(`${w}: (0; 0) ${ok2 ? 'spełnia' : 'nie spełnia'}`, strip(optOf(q).t) === (ok2 ? 'tak' : 'nie')); checked++; }
    else if (tg.t === 'feasible') { const [x, y] = tg.p, okp = M.A.every((a, i) => { const v = a[0] * x + a[1] * y; return M.rel[i] === '<=' ? v <= M.b[i] + 1e-9 : M.rel[i] === '>=' ? v >= M.b[i] - 1e-9 : Math.abs(v - M.b[i]) < 1e-9; });
      t(`${w}: punkt (${x}; ${y}) ${okp ? '' : 'nie'}dopuszczalny`, strip(optOf(q).t) === (okp ? 'tak' : 'nie')); checked++; }
    else if (tg.t === 'vertex' || tg.t === 'zv' || tg.t === 'best') {
      const V = LPL.lpVertices(M).P, p = V[tg.k], feas = M.A.every((a, i) => { const v = a[0] * p.x + a[1] * p.y; return M.rel[i] === '<=' ? v <= M.b[i] + 1e-7 : v >= M.b[i] - 1e-7; });
      t(`${w}: wierzchołek W${tg.k + 1} jest dopuszczalny`, feas && p.x >= -1e-9 && p.y >= -1e-9);
      if (tg.t === 'vertex') t(`${w}: x₁ wierzchołka`, near(q.answer, p.x));
      if (tg.t === 'zv') t(`${w}: Z w wierzchołku = c·x`, near(q.answer, M.c[0] * p.x + M.c[1] * p.y));
      if (tg.t === 'best') t(`${w}: najlepszy wierzchołek ma Z = ${B.z}`, near(M.c[0] * p.x + M.c[1] * p.y, B.z) && strip(optOf(q).t).startsWith(`W${tg.k + 1} `));
      checked++; }
    else if (tg.t === 'next-step' || tg.t === 'interior') { t(`${w}: odpowiedź pojęciowa`, !!optOf(q)); checked++; }
    else t(`${w}: pytanie ma opis pochodzenia odpowiedzi (q.tag)`, false);
  });
  t(`${nm}: sprawdzono wszystkie pytania (${checked}/${qs.length})`, checked === qs.length);
}

/* ---------- literatura: Wyndor (Hillier i Lieberman) – Sprawdzian simpleksu ---------- */
const W = LESSON.build('lp-simplex', 'test');
t('Wyndor (Hillier i Lieberman): x = (2; 6), Z = 36', near(W.result.z, 36) && near(W.result.x[0], 2) && near(W.result.x[1], 6));
const enters = W.steps.filter(s => s.q && s.q.tag && s.q.tag.t === 'enter').map(s => strip(optOf(s.q).t));
t('Wyndor: najpierw wchodzi x2 (c−z = 5), potem x1 – jak w podręczniku', enters.join() === 'wchodzi x2,wchodzi x1');

/* ---------- liczby nie są wpisane na stałe: zmiana danych zadania zmienia lekcję ---------- */
const save = JSON.stringify(TASKS.simplex.warm);
TASKS.simplex.warm.b = [6, 2]; const L2 = LESSON.build('lp-simplex', 'warm'); const B2 = brute(LPL.model(TASKS.simplex.warm));
t('zmienione dane Rozgrzewki → nowy wynik z solvera (Z = 8)', near(L2.result.z, B2.z) && near(L2.result.z, 8) && !LESSON.validate(L2).length);
Object.assign(TASKS.simplex.warm, JSON.parse(save));
t('przywrócone dane → Z = 7', near(LESSON.build('lp-simplex', 'warm').result.z, 7));

/* ---------- menu: tematy i poziomy ---------- */
const ids = LESSON.topics.map(x => x.id);
t('menu: metoda graficzna, simpleks (+ dwie fazy, duże M), Gomory i B&B (wkrótce)', ['lp-graph', 'lp-simplex', 'lp-2f', 'lp-bigm', 'lp-gomory', 'lp-bb'].every(i => ids.includes(i)) && LESSON.topics.filter(x => x.soon).length === 2);
t('poziomy: Rozgrzewka, Sprawdzian, Wyzwanie (po kolei)', LESSON.LEVELS.map(l => l[1]).join() === 'Rozgrzewka,Sprawdzian,Wyzwanie');
t('przycisk Nauka tylko w zakładkach LP', LESSON.hasLessons('graph') && LESSON.hasLessons('simplex') && LESSON.hasLessons('ilp') && !LESSON.hasLessons('transport'));
// bez eval / new Function w nowych plikach
t('lekcje bez eval i new Function', ['js/lesson.js', 'js/lessons/lp-lessons.js'].every(f => !/\beval\s*\(|new\s+Function/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))));
console.log(`Testy lekcji „Nauka”: ${ok} OK, ${bad} błędów`); if (bad) process.exit(1);
