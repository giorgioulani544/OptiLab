// Eksport wyników do CSV (js/htmltree.js): parser HTML raportu, scalone komórki, encje, pomijanie elementów interfejsu,
// format polskiego Excela. Oczekiwane wyniki wpisane ręcznie; na końcu raport z modułu Transport (Taha: koszt 435).
const vm = require('vm'), {order, load} = require('./helpers');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const c0 = load(['js/htmltree.js']), HT = vm.runInContext('HT', c0);

/* ---------- parser ---------- */
let r = HT.parse('<p class="a b">x &amp; y&nbsp;&lt;3&#8722;1&#x2264;<br>z</p><!-- k --><img src="a.png" alt="wykres"><svg><path d="M0 0"/><text>A</text></svg>');
t('parser: węzły, klasy, encje, br, img, svg z „/>”', r.kids.length === 3 && r.kids[0].tag === 'p' && HT.cls(r.kids[0], 'b') && HT.text(r.kids[0]) === 'x & y <3−1≤\nz' && r.kids[1].tag === 'img' && r.kids[2].kids.length === 2);
r = HT.parse('<table><tr><td>1<td>2</tr><tr><th>3</table><p>po');
t('parser: niezamknięte td i tabela', r.kids[0].kids.length === 2 && r.kids[0].kids[0].kids.length === 2 && r.kids[1].tag === 'p');
r = HT.parse('<ul><li>a<li>b</ul></div><b>c</b>');
t('parser: niezamknięte li, nadmiarowe </div>', r.kids[0].kids.length === 2 && HT.text(r.kids[0].kids[1]) === 'b' && r.kids[1].tag === 'b');
t('tekst: bez przycisków, ukrytych i linków pobierania', HT.text(HT.parse('<div>A<button>klik</button><span hidden>X</span><span style="display:none">Y</span><a class="ghost dl" href="#">pobierz</a> B</div>')) === 'A B');
t('tekst: komórki i bloki rozdzielone spacją', HT.text(HT.parse('<div><p>a</p><p>b</p></div><table><tr><td>1</td><td>2</td></tr></table>')) === 'a b 1 2');
t('tekst: indeksy dolne', HT.text(HT.parse('x<sub>1</sub> + x<sub>2</sub>')) === 'x1 + x2');

/* ---------- siatka tabeli (colspan, rowspan) ---------- */
let g = HT.grid(HT.parse('<table><thead><tr><th rowspan="2">A</th><th colspan="2">B</th></tr><tr><th>b1</th><th>b2</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>3</td></tr></tbody></table>').kids[0]);
const show = G => G.rows.map(row => row.map(x => x.own ? HT.text(x.n) : '·').join(',')).join('|');
t('siatka: rowspan i colspan', show(g) === 'A,B,·|·,b1,b2|1,2,3');
g = HT.grid(HT.parse('<table><tr><td rowspan="3">x</td><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>').kids[0]);
t('siatka: rowspan przez 3 wiersze', show(g) === 'x,1|·,2|·,3');

/* ---------- CSV ---------- */
const html = '<h3>Wynik</h3><p class="hint">To jest podpowiedź.</p><div class="sum"><b>Optimum:</b> Z = 36; x<sub>1</sub> = 2</div>' +
  '<div class="tw"><table><caption>Tablica końcowa</caption><tr><th>Baza</th><th>x<sub>1</sub></th><th>b</th></tr><tr><td>x<sub>1</sub></td><td>1</td><td>2,5</td></tr><tr><td>s<sub>2</sub></td><td>−3</td><td>1e+9</td></tr></table></div>' +
  '<p class="msg">Przekroczono limit iteracji – wynik nie jest optymalny.</p><div class="formula">Z = 3·2 + 5·6</div><ul class="interp"><li>Zasób „A” jest wykorzystany w całości.</li></ul><p><a class="ghost dl" href="data:x">⬇ Pobierz</a></p><svg><text>1</text></svg>';
const csv = HT.reportCSV([['Metoda simpleks', html]], {title: 'OptiLab – raport: Simpleks', date: '26.11.2026'});
const want = '﻿OptiLab – raport: Simpleks\r\n26.11.2026\r\n\r\nMETODA SIMPLEKS\r\n\r\nWynik\r\n"Optimum: Z = 36; x1 = 2"\r\nTablica końcowa\r\nBaza;x1;b\r\nx1;1;2,5\r\ns2;-3;1e+9\r\n\r\nUwaga: Przekroczono limit iteracji – wynik nie jest optymalny.\r\nZasób „A” jest wykorzystany w całości.\r\n';
t('CSV: nagłówki, wynik, tabela, komunikat, interpretacja; bez podpowiedzi, wzorów, linków i rysunków', csv === want);
if (csv !== want) console.log(JSON.stringify(csv), '\n', JSON.stringify(want));
const csv2 = HT.reportCSV([['T', '<table><tr><th colspan="2">Koszt</th></tr><tr><td>=1+1</td><td>+48 123</td></tr><tr><td>"cyt"</td><td>a;b</td></tr><tr><td>@x</td><td>-x</td></tr></table>']]);
t('CSV: scalona komórka, cudzysłowy, średnik, ochrona przed formułami', csv2 === '﻿T\r\nKoszt;\r\n\'=1+1;+48 123\r\n"""cyt""";"a;b"\r\n\'@x;\'-x\r\n');
if (!/Koszt;\r\n/.test(csv2)) console.log(JSON.stringify(csv2));
const csv3 = HT.reportCSV([['LP', '<p><b>Maksymalizuj</b> Z = 3x<sub>1</sub> + 5x<sub>2</sub></p><ul><li>x<sub>1</sub> ≤ 4</li></ul><p>Zwykły opis kroku.</p><div class="sum"><b>Najlepsze decyzje:</b><ul><li>Wald: A</li><li>EMV: B</li></ul></div>']]);
t('CSV: treść zadania (akapit przed listą), ramka z listą – punkty w osobnych wierszach, bez zwykłych opisów', csv3 === '\uFEFFLP\r\nMaksymalizuj Z = 3x1 + 5x2\r\nx1 ≤ 4\r\nNajlepsze decyzje:\r\nWald: A\r\nEMV: B\r\n');
if (!/Wald: A\r\nEMV/.test(csv3)) console.log(JSON.stringify(csv3));
t('CSV: pusta sekcja', HT.reportCSV([['Pusto', '']]) === '﻿PUSTO\r\n');

/* ---------- prawdziwy raport modułu (Transport, Taha: koszt 435) ---------- */
const stub = new Proxy(function () {}, {get: (tt, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const TAHA = {supply: [15, 25, 10], demand: [5, 15, 15, 15], cost: [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]], sNames: ['D1', 'D2', 'D3'], dNames: ['O1', 'O2', 'O3', 'O4']};
const R = c.transportSolve(TAHA, 'vam'), rep = c.trReportHTML(R, ['nw', 'lc', 'vam'].map(k => { const x = c.transportSolve(TAHA, k); return {k, start: x.initial, iters: x.iters.length - 1, t: x.t, status: x.status}; }));
const tc = vm.runInContext('HT', c).reportCSV([['Zagadnienie transportowe', rep]]), lines = tc.split('\r\n');
const nTables = (rep.match(/<table/g) || []).length, nCap = (rep.match(/<caption/g) || []).length;
t('Transport: wynik 435 w CSV', lines.some(l => /minimalny koszt = 435/.test(l)));
t('Transport: każda tabela raportu w CSV (blok wierszy po pustej linii)', tc.split('\r\n\r\n').length >= nTables);
t('Transport: brak znaczników i encji w CSV', !/[<>]|&[a-z]+;/.test(tc.replace(/[≤≥]/g, '')));
t('Transport: liczby z przecinkiem dziesiętnym, bez typograficznego minusa w liczbach', !lines.some(l => l.split(';').some(x => /^−\d/.test(x))));
console.log(`Testy eksportu CSV: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
