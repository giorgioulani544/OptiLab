// Moduł Procesy Markowa: raporty przykładów (graf, klasyfikacja, rozkłady, pochłanianie, czasy przejść, czas ciągły), CSV, walidacja, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(MK_EXAMPLES))'), X = d => ({mode: d.mode, names: d.st.rn, P: d.st.cells.map(r => r.map(Number)), n: +d.n, p0: d.st.xr.map(Number)});
const exp = [/Średnie czasy pierwszego przejścia/, /Średnie czasy pierwszego przejścia/, /Macierz fundamentalna N/, /Macierz fundamentalna N/, /okres 3 – rozkład po n krokach nie ma granicy/, /Generator Q/];
EX.forEach((e, k) => { const h = c.mkReportHTML(X(e.data)); t(`raport „${e.name}": graf i treść właściwa dla łańcucha`, /class="vzsvg"/.test(h) && exp[k].test(h)); });
let h = c.mkReportHTML(X(EX[2].data)); t('studia: rezygnacja i absolwent jako stany pochłaniające, wynik z prawdopodobieństwami', (h.match(/stan pochłaniający/g) || []).length === 2 && /trafia do Absolwent z prawdopodobieństwem/.test(h));
h = c.mkReportHTML(X(EX[0].data)); t('pogoda: łańcuch regularny, rozkład zbiega do π, wykres zbieżności', /dąży do π/.test(h) && /Zbieżność rozkładu/.test(h));
const csv = get(`(() => { const d = JSON.parse(JSON.stringify(MK_EXAMPLES[0].data)); const q = s => String(s).replace('.', ','); return [ 'tryb;dtmc', 'kroki;3', ['stan', ...d.st.cn].join(';'), ...d.st.rn.map((r, i) => [r, ...d.st.cells[i].map(q)].join(';')), ['Rozkład początkowy', ...d.st.xr].join(';')].join('\\n'); })()`);
const back = c.mkFromCSV(csv); t('CSV: import macierzy z przecinkiem dziesiętnym i rozkładem początkowym', back.st.rn.length === 3 && back.st.cells[0][1] === '0.3' && back.st.xr[0] === '1' && back.n === '3');
let th = ''; try { c.mkFromCSV('stan;A;B\nA;0,5\nB;0,5;0,5'); } catch (e) { th = e.message; } t('CSV: błąd liczby wartości z numerem wiersza', /wiersz 2: liczba wartości/.test(th));
th = ''; try { get('mkNormalize({st: {cells: [[1]]}})'); } catch (e) { th = e.message; } t('plik z macierzą 1×1 odrzucony', /brak macierzy przejść/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'markov') && !SOON.some(s => s[0] === 'mk')"));
console.log(`Testy modułu Procesy Markowa: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
