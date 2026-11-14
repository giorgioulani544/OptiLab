// Moduł Programowanie kwadratowe: raporty przykładów (wielomian, wypukłość, KKT, kroki Lemkego, poziomice), komunikat niewypukłości, CSV, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(QP_EXAMPLES.map(e => ({name: e.name, data: qpNormalize(e.data)}))))');
const toP = d => ({n: d.n, maxi: d.maxi, Q: d.Q.cells.map(r => r.map(Number)), c: d.Q.xr.map(Number), A: d.cons.map(cc => Array.from({length: d.n}, (_, j) => +cc['a' + j])), rel: d.cons.map(cc => cc.rel), b: d.cons.map(cc => +cc.b)});
EX.forEach((e, k) => { const h = c.qpReportHTML(toP(e.data)); t(`raport „${e.name}"`, k === 4 ? /zadanie nie jest wypukłe/.test(h) && !/Krok 3/.test(h) : /Wartości własne/.test(h) && /Warunki KKT/.test(h) && /class="sum"/.test(h) && (e.data.n !== 2 || /aria-label="Poziomice f"/.test(h))); });
let h = c.qpReportHTML(toP(EX[0].data)); t('Hillier i Lieberman: wielomian, x = (12; 9), f = 270', /15x<sub>1<\/sub> \+ 30x<sub>2<\/sub>/.test(h.replace(/− /g, '−')) || /−2x<sub>1<\/sub>²/.test(h)) && t('— wartości', /<b>12<\/b>/.test(h) && /<b>9<\/b>/.test(h) && /<b>270<\/b>/.test(h));
h = c.qpReportHTML(toP(EX[3].data)); t('Q półokreślona: komunikat „może nie być jedyne”', /może nie być jedyne/.test(h));
const back = c.qpFromCSV('cel;max\nzmienne;2\n\nQ;x1;x2\nx1;-4;4\nx2;4;-8\nc;15;30\n\nOgraniczenie;x1;x2;Znak;Prawa strona\nO1;1;2;<=;30'); t('CSV: Q, c i ograniczenia wracają', back.maxi && back.Q.cells[1][1] === '-8' && back.Q.xr[1] === '30' && back.cons[0].b === '30');
let th = ''; try { c.qpFromCSV('Q;x1\nx1;abc'); } catch (e) { th = e.message; } t('CSV: błąd z numerem wiersza', /wiersz 2: „abc"/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'qp') && !SOON.some(s => s[0] === 'qp')"));
console.log(`Testy modułu Programowanie kwadratowe: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
