// Moduł Odbiór statystyczny: raporty wszystkich trybów, przebieg SPRT, CSV, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(AC_EXAMPLES))'), N = s => s === '' ? null : +String(s).replace(',', '.');
const toX = d => { const X = {mode: d.mode, dist: d.dist}; ['n', 'c', 'N', 'AQL', 'alpha', 'LTPD', 'beta', 'n1', 'c1', 'n2', 'c2', 'p1', 'p2'].forEach(k => { X[k] = N(d[k]); }); X.items = d.seq.split(/\s+/).filter(Boolean).map(Number); return X; };
const exp = [/AOQL = <b>/, /Plan: n = \d+, c = \d+/, /hipergeometryczny/, /Średnia liczebność próbki ASN/, /partię <b>przyjęto<\/b>/, /zmierz \d+ sztuk/];
EX.forEach((e, k) => { const h = c.acReportHTML(toX(e.data)); t(`raport „${e.name}"`, exp[k].test(h) && /class="vzsvg"/.test(h)); });
let h = c.acReportHTML(toX(EX[0].data)); t('plan (89, 2): Pa przy p = 1% = 93,97%', /93,97%/.test(h));
const csv = get(`paramsToCSV([['mode','single'],['n','89'],['c','2'],['N','10000']])`), back = get(`paramsFromCSV(${JSON.stringify(csv)}, ['mode','n','c','N'], null, ['mode'])`).meta;
t('CSV: eksport → import planu', back.mode === 'single' && back.n === '89' && back.c === '2');
let th = ''; try { get('acNormalize({mode: "abc"})'); } catch (e) { th = e.message; } t('plik z nieznanym planem odrzucony', /nieznany rodzaj planu/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'acc') && !SOON.some(s => s[0] === 'acc')"));
console.log(`Testy modułu Odbiór statystyczny: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
