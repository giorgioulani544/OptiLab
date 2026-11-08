// Raport LP: analiza wrażliwości jak w Excel Solver (dopuszczalny spadek/wzrost = różnice do granic zakresów), interpretacja słowna,
// „gdzie odczytać wynik” i eksport tablic do Excela w alternatywnej metodzie tabelarycznej, raport Gomory'ego
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const M = {n: 3, c: [2.9, 5.5, 3.1], A: [[2, 2, 1], [4.5, 4, 3], [2.1, 6.3, 3.2]], rel: ['<=', '<=', '<='], b: [8800, 20000, 12000], maxi: true, t: ['c', 'c', 'c'], method: '2F'};
const rec = [], r = c.solveM(M, [], rec), S = c.lpSensitivity(M, r, rec), h = c.qsbReport(M, r, rec);
t('raport końcowy otwarty domyślnie, sekcje OFC i RHS', /<details class="adv" open>/.test(h) && /współczynników funkcji celu \(OFC\)/.test(h) && /prawych stron \(RHS\)/.test(h));
const num = s => +s.replace(/\s/g, '').replace(',', '.'), row = (lbl) => { const m = h.match(new RegExp(`<tr><th>${lbl}</th>(.*?)</tr>`)); return m ? [...m[1].matchAll(/<td>(.*?)<\/td>/g)].map(x => x[1]) : []; };
const r2 = row('Ogr. 2'), q = S.rows[1];
t('dopuszczalny spadek/wzrost RHS = prawa strona − dolna granica / górna granica − prawa strona', Math.abs(num(r2[5]) - (M.b[1] - q.lo)) < 1e-3 && (r2[6] === '∞' ? !isFinite(q.hi) : Math.abs(num(r2[6]) - (q.hi - M.b[1])) < 1e-3));
t('interpretacja: wiążące ograniczenia z ceną dualną, niewiążące z luzem, zakresy OFC', /Interpretacja wyników/.test(h) && /jest <b>wiążące<\/b>/.test(h) && /Rozwiązanie pozostaje optymalne, dopóki współczynnik celu przy x/.test(h));
const Mn = {n: 2, c: [4, 3], A: [[1, 1], [2, 1], [1, 0]], rel: ['>=', '>=', '<='], b: [10, 14, 20], maxi: false, t: ['c', 'c'], method: '2F'}, recm = [], Rm = c.solveM(Mn, [], recm), hm = c.qsbReport(Mn, Rm, recm);
t('minimalizacja: koszt (Z), niewiążące ograniczenie z luzem', /koszt \(Z\)/.test(hm) && /nie jest wiążące/.test(hm));
const T = c.tabSolve(M), ht = c.tabReportHTML(M, T);
t('metoda tabelaryczna: „gdzie odczytać wynik” i link do pobrania tablic CSV', /Gdzie odczytać wynik w ostatniej tablicy/.test(ht) && /download="tablice-simpleks\.csv"/.test(ht) && /Ceny dualne \(ceny cieni\)/.test(ht));
const csv = decodeURIComponent(ht.match(/href="data:text\/csv;charset=utf-8,([^"]+)"/)[1]); t('CSV tablic: nagłówek Cj, CB/Baza, zj, cj-zj, przecinek dziesiętny', /Tablica 1/.test(csv) && /;Cj;2,9;5,5;3,1/.test(csv) && /CB;Baza;x1;x2;x3;x4;x5;x6;b/.test(csv) && /;cj-zj;/.test(csv));
const Mm = {n: 2, c: [4, 3], A: [[1, 1], [2, 1]], rel: ['>=', '>='], b: [10, 14], maxi: false, t: ['c', 'c']}, csvM = decodeURIComponent(c.tabReportHTML(Mm, c.tabSolve(Mm)).match(/href="data:text\/csv;charset=utf-8,([^"]+)"/)[1]);
t('CSV tablic z symbolicznym M (np. „M”, „−3M + 4”)', /;M;M/.test(csvM) && /-3M \+ 4/.test(csvM));
const G = c.gomSolve({n: 2, c: [7, 10], A: [[-1, 3], [7, 1]], rel: ['<=', '<='], b: [6, 35], maxi: true}), hg = c.gomReportHTML({n: 2, c: [7, 10], A: [[-1, 3], [7, 1]], rel: ['<=', '<='], b: [6, 35], maxi: true}, G, {status: 'optimal', bestZ: 58, best: [4, 3]});
t('raport Gomory\'ego: relaksacja, podsumowanie odcięć, odcięcie z ułamkami, wynik, kontrola, eksport', /Relaksacja LP/.test(hg) && /Odcięcia – podsumowanie/.test(hg) && /7\/22·x/.test(hg) && /x<sub>1<\/sub> = <b>4<\/b>, x<sub>2<\/sub> = <b>3<\/b>; z = <b>58<\/b>/.test(hg) && /tę samą wartość/.test(hg) && /tablice-gomory\.csv/.test(hg));
console.log(`Testy raportów LP (wrażliwość, interpretacja, Gomory): ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
