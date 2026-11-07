// Moduł Karty kontrolne: raporty wszystkich przykładów (granice, reguły, faza I, zdolność, CUSUM/EWMA, Pareto), CSV, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(QC_EXAMPLES))'), N = s => +String(s).replace(',', '.'), nb = s => s === '' ? null : N(s);
const toX = d => { const X = {type: d.type, rules: d.rules.split('').map(Number), phase1: d.phase1, LSL: nb(d.LSL), USL: nb(d.USL)};
  if (['xr', 'xs'].includes(d.type)) X.D = {sub: d.sub.cells.map(r => r.map(N))}; else if (d.type === 'imr') X.D = {x: d.rows.map(r => N(r.v))};
  else X.D = {n: d.rows.map(r => ['p', 'np', 'u'].includes(d.type) ? N(r.n) : 1), c: d.rows.map(r => N(r.c)), names: d.rows.map(r => r.label)};
  if (d.cusum || d.ewma) X.adv = {cusum: d.cusum, ewma: d.ewma, mu0: nb(d.mu0), sg: nb(d.sg), K: N(d.K), H: N(d.H), lam: N(d.lam), Lw: N(d.Lw)}; return X; };
EX.forEach(e => { const h = c.qcReportHTML(toX(e.data)); t(`raport „${e.name}"`, e.data.type === 'pareto' ? /Wykres Pareto/.test(h) && /odpowiada za/.test(h) : /class="formula"/.test(h) && /aria-label="Karta /.test(h) && /statystycznie uregulowany/.test(h)); });
let h = c.qcReportHTML(toX(EX[0].data)); t('pierścienie tłokowe: stałe, zdolność procesu, histogram, ARL', /d<sub>2<\/sub> = 2,3259/.test(h) && /Zdolność procesu/.test(h) && /Histogram z rozkładem normalnym/.test(h) && /ARL/.test(h));
h = c.qcReportHTML(toX(EX[2].data)); t('I-MR z przesunięciem: sygnały reguł Nelsona, CUSUM i EWMA z pierwszym sygnałem', /Reguła/.test(h) && /Pierwszy sygnał w próbce/.test(h) && /Pierwszy sygnał EWMA/.test(h));
h = c.qcReportHTML(toX(EX[3].data)); t('karta p z fazą I: punkt 7 usunięty', /Faza I:<\/b> krok 1 – usunięto punkty 7/.test(h));
const csv = get(`rowsToCSV(QC_COLS.p, ${JSON.stringify(EX[3].data.rows)}, [['karta','p']])`); t('CSV karty p: eksport z wierszem „karta;p”', /karta;p/.test(csv) && /Liczebność n;Wadliwe d/.test(csv));
let th = ''; try { get('qcNormalize({type: "zz"})'); } catch (e) { th = e.message; } t('plik z nieznaną kartą odrzucony', /nieznany rodzaj karty/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'qc') && !SOON.some(s => s[0] === 'qc')"));
console.log(`Testy modułu Karty kontrolne: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
