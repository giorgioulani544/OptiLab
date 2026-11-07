// Moduł Kolejki: raporty wszystkich przykładów, niestabilność, analiza kosztów, CSV, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(QU_EXAMPLES))'), P = d => { const o = {}; ['lam', 'mu', 's', 'K', 'N', 'sigma', 'k', 't'].forEach(k => { o[k] = d[k] === '' ? null : +d[k]; }); return o; };
EX.forEach(e => { const d = e.data, h = c.quReportHTML(d.model, P(d), d.cost ? {Cs: +d.Cs, Cw: +d.Cw, Cb: 0, base: d.base} : null);
  t(`raport „${e.name}": wzory, tabela miar, prawo Little'a`, /class="formula"/.test(h) && /Średni czas oczekiwania w kolejce Wq/.test(h) && /prawo Little'a/.test(h) && (d.model.startsWith('m') && !['mg1', 'md1', 'mek1'].includes(d.model) ? /Diagram przejść/.test(h) && /Rozkład Pₙ/.test(h) : /Pollaczka-Chinczyna/.test(h))); });
let h = c.quReportHTML('mm1', {lam: 2, mu: 3, t: 1}); t('Arnold: L = 2, Wq = 0,6667, P(Wq > 1) i P(W > 1)', /<b>2<\/b>/.test(h) && /0,6667/.test(h) && /P\(Wq &gt; 1\)|P\(Wq > 1\)/.test(h));
h = c.quReportHTML('mms', {lam: 7, mu: 2, s: 3}); t('niestabilny system: komunikat zamiast miar, minimalna liczba stanowisk 4', /niestabilny/.test(h) && /co najmniej 4 stanowisk/.test(h) && !/Średni czas oczekiwania/.test(h));
h = c.quReportHTML('mms', {lam: 10, mu: 3, s: 4}, {Cs: 40, Cw: 25, Cb: 0, base: 'L'}); t('analiza kosztów: tabela, optimum, wykres', /Optymalna liczba stanowisk/.test(h) && /Koszty a liczba stanowisk/.test(h));
const csv = get(`paramsToCSV([['model','mms'],['lam','2.5'],['mu','3'],['s','2']])`), back = get(`paramsFromCSV(${JSON.stringify(csv)}, ['model','lam','mu','s'])`);
t('CSV: eksport → import (przecinek dziesiętny)', back.meta.model === 'mms' && back.meta.lam === '2.5' && /2,5/.test(csv));
const qb = c.paramsFromCSV('model;mms\nbase;Lq\nlam;2,5', ['model','base','lam'], null, ['model','base']).meta; t('CSV: import modelu i podstawy kosztu (tekst)', qb.model === 'mms' && qb.base === 'Lq' && qb.lam === '2.5');
let th = ''; try { get('quNormalize({model: "xx"})'); } catch (e) { th = e.message; } t('plik z nieznanym modelem odrzucony', /nieznany model/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'queue') && !SOON.some(s => s[0] === 'queue')"));
console.log(`Testy modułu Kolejki: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
