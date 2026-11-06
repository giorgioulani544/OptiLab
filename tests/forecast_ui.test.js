// Moduł Prognozowanie: raporty dla przykładów, dobór parametrów, sygnał kontrolny, CSV, bezpieczeństwo etykiet, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(FC_EXAMPLES))');
EX.forEach(e => { const d = e.data, y = d.data.map(r => +r.y), P = {h: +d.h, k: +(d.k || 3), w: d.w ? d.w.split(';').map(Number) : undefined, alpha: +d.alpha || undefined, beta: +d.beta || undefined, gamma: +d.gamma || undefined, L: +d.L || undefined};
  const h = c.fcReportHTML(d.method, y, P, d.data.map(r => r.label));
  t(`raport „${e.name}": tabela błędów, miary, prognoza naprzód, wykres, porównanie metod`, /Sygnał kontrolny/.test(h) && /MAD = <b>/.test(h) && /Prognoza na kolejne okresy/.test(h) && /class="vzsvg"/.test(h) && /Porównanie metod/.test(h)); });
const y = EX[2].data.data.map(r => +r.y), O = c.fcOptimize(y, 'hwm', {L: 4, h: 4}, 'MSE');
let h = c.fcReportHTML('hwm', y, {L: 4, h: 4, ...O.P}, null, O); t('dobór parametrów opisany w raporcie', /Dobór parametrów:<\/b> sprawdzono 729 zestawów/.test(h) && /α = /.test(h));
h = c.fcReportHTML('naive', [10, 20, 30, 40, 50, 60, 70], {h: 1}, ['a', 'b', 'c', 'd', 'e', 'f', 'g']); t('trend przy metodzie naiwnej: sygnał kontrolny > 4 → ostrzeżenie', /Sygnał kontrolny przekracza ±4 – prognoza systematycznie zaniża/.test(h));
h = c.fcReportHTML('ses', [1, 2, 3], {alpha: 0.5, h: 1}, ['<img src=x>', 'b', 'c']); t('etykiety okresów bezpiecznie wyświetlane', !/<img src=x>/.test(h) && /&lt;img/.test(h));
const csv = get(`rowsToCSV(FC_COLS, ${JSON.stringify(EX[2].data.data)}, [['metoda','hwm'],['alfa','0.3'],['sezon','4']])`), back = get(`rowsFromCSV(${JSON.stringify(csv)}, FC_COLS, ['metoda','alfa','sezon'])`);
t('CSV: eksport → import (metoda, parametry, 16 okresów)', back.meta.metoda === 'hwm' && back.meta.sezon === '4' && back.rows.length === 16 && back.rows[3].label === '2022 K4');
let th = ''; try { get('fcNormalize({method: "abc", data: []})'); } catch (e) { th = e.message; } t('plik bez danych odrzucony', /brak metody lub danych/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'fc') && !SOON.some(s => s[0] === 'fc')"));
console.log(`Testy modułu Prognozowanie: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
