// Zakładka Całkowite – odcięcia Gomory'ego w interfejsie (atrapa DOM): limit 500 odcięć w module, osobna sekcja „Odcięcia krok po kroku”
// w raporcie i w danych do PDF (last.ilpCuts), wybór „pomiń” zapamiętany, brak starych odcięć po zmianie metody albo błędzie danych.
// Wynik zadania sprawdzany przeglądem wszystkich punktów całkowitych (napisanym tutaj).
const vm = require('vm'), {order, load} = require('./helpers');
const el = (value = '') => new Proxy({value, innerHTML: '', addEventListener() {}, classList: {add() {}, remove() {}, toggle() {}}}, {get: (t, k) => k in t ? t[k] : () => el(), set: (t, k, v) => (t[k] = v, true)});
const st = {}; const $ = q => st[q] || (st[q] = el());
const ctx = {$: null, document: {querySelector: $, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {newPlot() {}}, setTimeout, console};
const c = load(order, ctx), run = s => vm.runInContext(s, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
// zadanie wymagające ok. 490 odcięć (przy dawnym limicie 200 kończyło się „limitem”)
const Q = {n: 3, c: [11, 17, 19], A: [[12, 9, 40], [11, 24, 23], [35, 16, 40]], rel: ['<=', '<=', '<='], b: [178, 129, 161], maxi: true, t: ['i', 'i', 'i']};
let best = -Infinity; for (let a = 0; a <= 13; a++) for (let b = 0; b <= 5; b++) for (let d = 0; d <= 4; d++)
  if (Q.A.every((r, i) => r[0] * a + r[1] * b + r[2] * d <= Q.b[i])) best = Math.max(best, 11 * a + 17 * b + 19 * d);
run(`readModel = () => (${JSON.stringify(Q)}); fail = (o, m) => { document.querySelector(o).innerHTML = ''; return null; };`);
st['#ilp-method'] = el('gom'); const out = $('#out-ilp'), solve = () => st['#btn-ilp'].onclick(), last = () => run('last');
solve(); let h = out.innerHTML, N = +((h.match(/Potrzebne odcięcia: (\d+)/) || [])[1]);
t(`limit 500 w module: zadanie z ${N} odcięciami rozwiązane, z = ${best} (przegląd)`, N > 200 && N <= 500 && h.includes(`z = <b>${best}</b>`));
t('sekcja „Odcięcia krok po kroku” na ekranie: przełącznik zaznaczony, wszystkie odcięcia', h.includes('class="gctog" checked') && (h.match(/class="step gcut"/g) || []).length === N);
t('dane do PDF: raport główny bez szczegółów + osobno wszystkie odcięcia', last().ilp && !last().ilp.includes('gcut') && (last().ilpCuts.match(/class="step gcut"/g) || []).length === N && last().ilpCutsAll === last().ilpCuts);
out.dataset = {cuts: 'off'}; solve(); h = out.innerHTML;          // użytkownik wcześniej odznaczył „dołącz do raportu i PDF”
t('wybór „pomiń” zapamiętany: sekcja bez odcięć, do PDF nie trafiają, ale są gotowe do włączenia', !h.includes('class="step gcut"') && h.includes('Pominięte') && last().ilpCuts === null && (last().ilpCutsAll.match(/class="step gcut"/g) || []).length === N);
out.dataset = {cuts: 'on'}; st['#ilp-method'] = el('bb'); st['#ilp-branch'] = el('most'); st['#ilp-search'] = el('best'); solve();
t('po zmianie metody na podział i ograniczenia: brak starych odcięć w danych do PDF', last().ilp && last().ilpCuts === null && last().ilpCutsAll === null && !out.innerHTML.includes('gcut'));
st['#ilp-method'] = el('gom'); solve(); run('readModel = () => null;'); solve();
t('błąd danych po obliczeniach: do PDF nie trafia stary raport ani odcięcia', last().ilp === null && last().ilpCuts === null && last().ilpCutsAll === null);
console.log(`Testy interfejsu odcięć Gomory'ego: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
