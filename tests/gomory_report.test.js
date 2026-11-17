// Odcięcia Gomory'ego – raport krok po kroku (2026-11-17): KAŻDE odcięcie rozpisane w osobnej sekcji (bez zwijania), podsumowanie wszystkich odcięć,
// limity (odcięć i kroków simpleksu) nigdy pokazane jako wynik, zadanie bez rozwiązań całkowitych, przełącznik sekcji, odmiana liczebników.
// Wartości oczekiwane: przykład Taha (max 7x1 + 10x2; −x1 + 3x2 ≤ 6; 7x1 + x2 ≤ 35) przeliczony ręcznie (wiersze tablic, części ułamkowe, odcięcia),
// wyniki dużych zadań – przegląd wszystkich punktów całkowitych napisany tutaj (niezależnie od kodu OptiLab).
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const count = (h, re) => (h.match(re) || []).length, X = i => `x<sub>${i}</sub>`, S = i => `s<sub>${i}</sub>`;
// przegląd: najlepsza wartość celu po wszystkich punktach całkowitych x ≥ 0 spełniających A·x ≤ b (wszystkie a_ij > 0, więc pudełko jest skończone)
const brute = (cc, A, b) => { const n = cc.length, ub = A[0].map((_, j) => Math.floor(Math.min(...A.map((r, i) => b[i] / r[j])))), x = Array(n).fill(0); let best = -Infinity;
  const go = j => { if (j === n) { if (A.every((r, i) => r.reduce((s, v, q) => s + v * x[q], 0) <= b[i] + 1e-9)) best = Math.max(best, cc.reduce((s, v, q) => s + v * x[q], 0)); return; }
    for (let v = 0; v <= ub[j]; v++) { x[j] = v; go(j + 1); } x[j] = 0; }; go(0); return best; };

// 1. Przykład Taha – dwa odcięcia, każdy krok jak w obliczeniach ręcznych
const MT = {n: 2, c: [7, 10], A: [[-1, 3], [7, 1]], rel: ['<=', '<='], b: [6, 35], maxi: true}, GT = c.gomSolve(MT, {maxCuts: 500});
const main = c.gomReportHTML(MT, GT, {status: 'optimal', bestZ: 58, best: [4, 3]}), cuts = c.gomCutsHTML(GT);
t('Taha: sekcja ma oba odcięcia, każde w osobnym bloku, nic nie jest zwinięte', count(cuts, /class="step gcut"/g) === 2 && !/<details/.test(cuts) && cuts.includes('Odcięcie 1 z 2') && cuts.includes('Odcięcie 2 z 2'));
t('Taha: odcięcie 1 – wybór wiersza: x1 = 9/2 i x2 = 7/2 mają f = 1/2 (remis)', cuts.includes(`${X(2)} = 7/2 ≈ 3,5 (f = 1/2)`) && cuts.includes(`${X(1)} = 9/2 ≈ 4,5 (f = 1/2)`) && cuts.includes('przy remisie'));
t('Taha: odcięcie 1 – wiersz x2 + 7/22·x3 + 1/22·x4 = 7/2', cuts.includes(`${X(2)} + 7/22·${X(3)} + 1/22·${X(4)} = 7/2`));
t('Taha: odcięcie 1 – 7/22·x3 + 1/22·x4 ≥ 1/2 → −7/22·x3 − 1/22·x4 + s1 = −1/2', cuts.includes(`7/22·${X(3)} + 1/22·${X(4)} ≥ 1/2 &nbsp;→&nbsp; −7/22·${X(3)} − 1/22·${X(4)} + ${S(1)} = −1/2`));
t('Taha: po odcięciu 1 x1 = 32/7, x2 = 3, z = 62; dalej odcięcie 2', cuts.includes(`6. Wynik po odcięciu 1:</b> ${X(1)} = 32/7 ≈ 4,5714, ${X(2)} = 3; z = 62. Nadal są ułamkowe zmienne bazowe – budujemy odcięcie 2.`));
// odcięcie 2: wiersz x1 (x1 + 1/7·x4 − 1/7·s1 = 32/7) albo wiersz x3 (x3 + 1/7·x4 − 22/7·s1 = 11/7) – remis f = 4/7; oba dają 1/7·x4 + 6/7·s1 ≥ 4/7
const row2 = cuts.includes(`${X(1)} + 1/7·${X(4)} − 1/7·${S(1)} = 32/7`) ? 'x1' : cuts.includes(`${X(3)} + 1/7·${X(4)} − 22/7·${S(1)} = 11/7`) ? 'x3' : null;
t('Taha: odcięcie 2 – wiersz źródłowy jak w obliczeniach ręcznych (x1 albo x3)', row2 !== null);
t('Taha: odcięcie 2 – część ułamkowa współczynnika ujemnego: ⌊−1/7⌋ = −1 (albo ⌊−22/7⌋ = −4), f = 6/7',
  row2 === 'x1' ? /<tr><th>a<\/th><td>1\/7<\/td><td>−1\/7<\/td><td>32\/7<\/td><\/tr><tr><th>⌊a⌋<\/th><td>0<\/td><td>−1<\/td><td>4<\/td><\/tr>/.test(cuts) : /<td>−22\/7<\/td><td>11\/7<\/td><\/tr><tr><th>⌊a⌋<\/th><td>0<\/td><td>−4<\/td><td>1<\/td><\/tr>/.test(cuts));
t('Taha: odcięcie 2 – 1/7·x4 + 6/7·s1 ≥ 4/7', cuts.includes(`1/7·${X(4)} + 6/7·${S(1)} ≥ 4/7`));
t('Taha: koniec – x = (4, 3), z = 58, rozwiązanie optymalne', cuts.includes(`6. Wynik po odcięciu 2:</b> ${X(1)} = 4, ${X(2)} = 3; z = 58. Wszystkie zmienne są całkowite`));
t('Taha: raport główny – podsumowanie obu odcięć z nierównościami, bez szczegółów kroków', main.includes(`7/22·${X(3)} + 1/22·${X(4)} ≥ 1/2`) && main.includes(`1/7·${X(4)} + 6/7·${S(1)} ≥ 4/7`) && !main.includes('1. Wybór wiersza') && /z = <b>58<\/b>/.test(main));

// 2. Zadanie ze 124 odcięciami (ok. 140 stron A4): wszystkie rozpisane, wynik = przegląd
const M124 = {n: 2, c: [8, 11], A: [[2, 16], [39, 26]], rel: ['<=', '<='], b: [51, 203], maxi: true}, G124 = c.gomSolve(M124, {maxCuts: 500, maxPiv: 20000});
const N124 = G124.cuts.length, h124 = c.gomCutsHTML(G124), m124 = c.gomReportHTML(M124, G124, null);
t(`${N124} odcięć: wynik z = ${G124.zNum} = przegląd wszystkich punktów całkowitych`, G124.status === 'optimal' && Math.abs(G124.zNum - brute(M124.c, M124.A, M124.b)) < 1e-9 && N124 > 100);
t(`${N124} odcięć: każde rozpisane (osobny blok, nagłówek „Odcięcie k z ${N124}”), bez zwijania`, count(h124, /class="step gcut"/g) === N124 && !/<details/.test(h124) && G124.cuts.every(C => h124.includes(`Odcięcie ${C.k} z ${N124} –`)));
t(`${N124} odcięć: każde ma wszystkie kroki 1–5 i wynik 6`, ['1. Wybór wiersza', '2. Wiersz ', '3. Części ułamkowe', '4. Odcięcie', '5. Dualna metoda simpleks', '6. Wynik po odcięciu'].every(s => count(h124, new RegExp(s.replace('.', '\\.'), 'g')) === N124));
t(`${N124} odcięć: w raporcie głównym tabela podsumowania ma wiersz każdego odcięcia`, G124.cuts.every(C => m124.includes(`<tr><td>${C.k}</td>`)) && !m124.includes('Wybór wiersza'));
t(`${N124} odcięć: tablice w sekcji = suma kroków wszystkich odcięć`, count(h124, /<table class="tabcj">/g) === G124.cuts.reduce((s, C) => s + C.steps.length, 0));

// 3. Limit 500 odcięć: zadanie wymagające ponad 500 odcięć – status „limit”, bez wyniku, a wszystkie 500 odcięć i tak rozpisane
const ML = {n: 3, c: [26, 24, 1], A: [[25, 6, 13], [38, 18, 2], [26, 37, 8]], rel: ['<=', '<=', '<='], b: [246, 259, 234], maxi: true}, GL = c.gomSolve(ML, {maxCuts: 500, maxPiv: 20000});
const BL = c.ilpSolve({...ML, t: ['i', 'i', 'i']}, {rule: 'most', search: 'best'}), mL = c.gomReportHTML(ML, GL, BL), hL = c.gomCutsHTML(GL);
t('limit odcięć: status „limit” (limit odcięć), dokładnie 500 odcięć, brak wyniku', GL.status === 'limit' && GL.limit === 'cuts' && GL.cuts.length === 500 && !GL.x);
t('limit odcięć: raport mówi o przerwaniu i nie pokazuje ramki z wynikiem', mL.includes('Przerwano po 500 odcięciach (limit odcięć)') && !mL.includes('class="sum"') && !mL.includes('Rozwiązanie całkowitoliczbowe'));
t('limit odcięć: dla porównania wynik metody podziału i ograniczeń = przegląd', BL.status === 'optimal' && Math.abs(BL.bestZ - brute(ML.c, ML.A, ML.b)) < 1e-9 && mL.includes(`optymalne z = ${brute(ML.c, ML.A, ML.b)}.`));   // cele całkowite – wartość bez części ułamkowej
t('limit odcięć: sekcja ma wszystkie 500 odcięć, ostatnie kończy się informacją o limicie (nie o optimum)', count(hL, /class="step gcut"/g) === 500 && hL.includes('osiągnięto limit 500 odcięć – obliczenia przerwano') && !hL.includes('rozwiązanie optymalne'));

// 4. Limit kroków simpleksu: w relaksacji LP (raport bez błędu JS) i w trakcie odcięcia
const G0 = c.gomSolve(MT, {maxPiv: 0}); let r0 = ''; try { r0 = c.gomReportHTML(MT, G0, null); } catch (e) { r0 = 'WYJĄTEK ' + e.message; }
t('limit kroków w relaksacji LP: status „limit”, raport bez błędu, bez wyniku', G0.status === 'limit' && G0.limit === 'pivots' && r0.includes('Nie udało się rozwiązać relaksacji LP (limit obliczeń)') && !r0.includes('class="sum"'));
let GP = null; for (let p = 0; p < 20 && !GP; p++) { const G = c.gomSolve(MT, {maxPiv: p}); if (G.status === 'limit' && G.cuts.length) GP = G; }
const mP = GP ? c.gomReportHTML(MT, GP, null) : '', hP = GP ? c.gomCutsHTML(GP) : '';
t('limit kroków w trakcie odcięcia: przerwane odcięcie oznaczone, bez wyniku', GP && GP.limit === 'pivots' && mP.includes('limitu obliczeń') && mP.includes('obliczenia przerwane (limit)') && !mP.includes('class="sum"') && hP.includes('Obliczenia przerwano w trakcie tego odcięcia'));

// 5. Brak rozwiązań całkowitych: 2x1 + 2x2 = 1 → wiersz x + y = 1/2, części ułamkowe współczynników 0 → odcięcie 0 ≥ 1/2 (sprzeczne)
const MI = {n: 2, c: [1, 1], A: [[2, 2]], rel: ['='], b: [1], maxi: true}, GI = c.gomSolve(MI), hI = c.gomCutsHTML(GI), mI = c.gomReportHTML(MI, GI, null);
t('brak rozwiązań całkowitych: odcięcie 0 ≥ 1/2, komunikat zamiast wyniku', GI.status === 'infeasible' && hI.includes('0 ≥ 1/2') && hI.includes('nie ma rozwiązań') && mI.includes('Zadanie nie ma rozwiązań całkowitoliczbowych') && mI.includes('brak – zadanie bez rozwiązań całkowitych') && !mI.includes('class="sum"'));

// 6. Ramka sekcji z przełącznikiem i odmiana liczebników
const on = c.gomCutsShellHTML(GT, true, cuts), off = c.gomCutsShellHTML(GT, false, cuts);
t('przełącznik włączony: zaznaczony, sekcja z odcięciami', /class="gctog" checked/.test(on) && count(on, /class="step gcut"/g) === 2 && on.includes('2 odcięcia, 4 tablice'));
t('przełącznik wyłączony: niezaznaczony, bez odcięć, informacja „Pominięte”', !/checked/.test(off) && !/class="step gcut"/.test(off) && off.includes('Pominięte') && off.includes('wszystkie 2 odcięcia'));
const pl = [[1, '1 odcięcie, 1 tablica'], [2, '2 odcięcia, 2 tablice'], [5, '5 odcięć, 5 tablic'], [12, '12 odcięć, 12 tablic'], [22, '22 odcięcia, 22 tablice'], [112, '112 odcięć, 112 tablic'], [124, '124 odcięcia, 124 tablice'], [500, '500 odcięć, 500 tablic']];
t('odmiana: 1 odcięcie, 2 odcięcia, 5/12/112/500 odcięć, 22/124 odcięcia (i tablic)', pl.every(([k, s]) => c.gomCutsInfo(k, k, true).startsWith(s)) && c.gomCutsInfo(1, 1, false).includes('to odcięcie'));
console.log(`Testy raportu odcięć Gomory'ego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
