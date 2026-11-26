// Wklejanie ze schowka (js/paste.js): rozpoznanie separatora, cudzysłowy, liczby w zapisie polskim i angielskim,
// rozkład bloku na tabelę jak w Excelu (nagłówki, kolumna znaku, rozrost, błędy z miejscem). Wartości oczekiwane wpisane ręcznie.
const {load} = require('./helpers');
const c = load(['js/paste.js']), P = require('vm').runInContext('PASTE', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const J = x => JSON.stringify(x);
const throws = (f, re) => { try { f(); return false; } catch (e) { return re.test(e.message); } };

/* ---------- PASTE.parse: separatory i cudzysłowy ---------- */
let p = P.parse('D1\t10\t2\r\nD2\t12\t7\r\n');
t('Excel: tabulator, CRLF, końcowy pusty wiersz', p.sep === '\t' && J(p.rows) === J([['D1', '10', '2'], ['D2', '12', '7']]) && p.R === 2 && p.C === 3);
p = P.parse('1,5;2\n3;4,25');
t('średnik z przecinkiem dziesiętnym', p.sep === ';' && J(p.rows) === J([['1,5', '2'], ['3', '4,25']]));
p = P.parse('1.5,2,3\n4,5,6');
t('CSV angielski (przecinek, kropka dziesiętna)', p.sep === ',' && J(p.rows) === J([['1.5', '2', '3'], ['4', '5', '6']]));
p = P.parse('1,5\n2,25\n3');
t('jedna kolumna z przecinkiem dziesiętnym', p.sep === '' && J(p.rows) === J([['1,5'], ['2,25'], ['3']]));
p = P.parse('3,5');
t('jedna komórka „3,5” = liczba 3,5 (nie dwie kolumny)', p.sep === '' && p.R === 1 && p.C === 1 && P.num(p.rows[0][0]) === 3.5);
p = P.parse('1, 2, 3');
t('„, ” = separator', p.sep === ',' && J(p.rows) === J([['1', '2', '3']]));
p = P.parse('3 5 7\n1  0 2');
t('spacje (tekst z PDF)', p.sep === ' ' && J(p.rows) === J([['3', '5', '7'], ['1', '0', '2']]));
p = P.parse('a\t"x\ny"\tb\n1\t2\t3');
t('Excel: komórka z nową linią w cudzysłowie', p.sep === '\t' && J(p.rows) === J([['a', 'x\ny', 'b'], ['1', '2', '3']]));
p = P.parse('"Magazyn ""A""";5\n"x;y";6');
t('cudzysłów podwojony i średnik w cudzysłowie', p.sep === ';' && J(p.rows) === J([['Magazyn "A"', '5'], ['x;y', '6']]));
p = P.parse('﻿\n\n1;2;3\n4\n\n');
t('BOM, puste wiersze na początku i końcu, wyrównanie krótkich wierszy', J(p.rows) === J([['1', '2', '3'], ['4', '', '']]));
p = P.parse('1\t2', {sep: ';'});
t('wymuszony separator (tabulator zostaje w komórce)', p.sep === ';' && J(p.rows) === J([['1\t2']]));
t('błąd: pusty schowek', throws(() => P.parse('  \n\t\n'), /schowek jest pusty/));
t('błąd: niezamknięty cudzysłów', throws(() => P.parse('a;"b\n1;2'), /niezamknięty cudzysłów/));
t('błąd: za duży blok (501 wierszy)', throws(() => P.parse(Array(501).fill('1').join('\n')), /za duży \(501 × 1\)/));
t('nazwa separatora do komunikatu', P.parse('1\t2').sepName === 'tabulator' && P.parse('1;2').sepName === 'średnik');

/* ---------- PASTE.num: liczby ---------- */
const N = [['1 234,5', 1234.5], ['1 234,5', 1234.5], ['1 234,5', 1234.5], ['1.234,5', 1234.5], ['1,234.5', 1234.5], ['1,234,567', 1234567],
  ['1.234.567', 1234567], ['12,5%', 0.125], ['7%', 0.07], ['−3', -3], ['–2,5', -2.5], ['1,5E-3', 0.0015], ['2e3', 2000], ['.5', 0.5], ['+4', 4],
  ["1'000", 1000], ['-0,25', -0.25], ['0', 0], ['  42  ', 42], ['10.', 10]];
N.forEach(([s, v]) => t(`liczba „${s}” = ${v}`, P.num(s) === v));
['0x1F', 'abc', '', 'Infinity', '1,2,3', '12.34.5', '1.2345,6', '1,23.4', '5 kg', '--3', '1e', 'NaN', '3-'].forEach(s => t(`„${s}” to nie liczba`, isNaN(P.num(s))));

/* ---------- PASTE.rel i PASTE.cell ---------- */
t('znaki ograniczeń', P.rel('≤') === '<=' && P.rel('=>') === '>=' && P.rel(' == ') === '=' && P.rel('<') === null && P.rel('⩾') === '>=');
const num = {k: 'num'}, numM = {k: 'num', m: true}, numB = {k: 'num', blank: true}, txt = {k: 'text'};
const relSel = {k: 'sel', opts: [['<=', '≤'], ['>=', '≥'], ['=', '=']]};
const nodes = {k: 'sel', opts: [['0', 'A'], ['1', 'B'], ['2', 'C']]};
t('pusta komórka: 0 albo puste pole', P.cell(num, '').v === '0' && P.cell(numB, '').v === '');
t('M tylko tam, gdzie wolno', P.cell(numM, 'm').v === 'M' && /„M” nie jest liczbą$/.test(P.cell(num, 'M').err));
t('liczba zapisana jako tekst JS', P.cell(num, '1 234,5').v === '1234.5' && P.cell(num, '-0,5').v === '-0.5');
t('komunikat o M przy polu z M', /nie jest liczbą ani M/.test(P.cell(numM, 'x').err));
t('lista: etykieta, wartość, znak', P.cell(nodes, 'b').v === '1' && P.cell(relSel, '≥').v === '>=' && P.cell(relSel, '>=').v === '>=' && P.cell(nodes, '2').v === '2');
t('lista: pusta komórka pomijana', P.cell(nodes, '').skip === true);
t('lista: zła wartość z listą dozwolonych', /„D” – w tej kolumnie wybierz jedną z wartości: „A”, „B”, „C”/.test(P.cell(nodes, 'D').err));
t('tekst bez zmian (przycięty)', P.cell(txt, '  Magazyn A ').v === 'Magazyn A');
t('rozpoznanie listy znaków', P.isRelSel(relSel) && !P.isRelSel(nodes));

/* ---------- PASTE.plan: transport jak na ekranie (nazwy edytowalne, podaż, popyt) ---------- */
const T = txt, NM = numM;
const tr = () => [[null, T, T, T, null], [T, NM, NM, NM, num], [T, NM, NM, NM, num], [null, num, num, num, null]];
const at = (pl, r, cc) => (pl.fills.find(f => f.r === r && f.c === cc) || {}).v;
let pl = P.plan([['10', '2', '20'], ['12', '7', '9']], tr(), 1, 1);
t('koszty 2×3 od komórki (1,1)', pl.fills.length === 6 && at(pl, 1, 1) === '10' && at(pl, 2, 3) === '9' && !pl.need && !pl.errs.length);
pl = P.plan([['Od \\ Do', 'O1', 'O2', 'O3', 'Podaż'], ['D1', '10', '2', '20', '15'], ['D2', '12', '7', '9', '25'], ['Popyt', '5', '15', '15', '']], tr(), 1, 1);
t('tabela z Excela z nagłówkiem i nazwami trafia na nagłówki', pl.fills.length === 16 && at(pl, 0, 1) === 'O1' && at(pl, 1, 0) === 'D1' && at(pl, 2, 4) === '25' && at(pl, 3, 3) === '15' && pl.skipped === 0 && J(pl.anchor) === '[0,0]');
pl = P.plan([['1', '2', '3', '4'], ['5', '6', '7', '8'], ['9', '10', '11', '12']], tr(), 1, 1);
t('blok 3×4: koszty, podaż, popyt (narożnik pominięty)', pl.fills.length === 11 && at(pl, 1, 4) === '4' && at(pl, 3, 1) === '9' && pl.skipped === 1 && /pominięto 1 komórkę/.test(pl.notes.join()));
pl = P.plan(Array.from({length: 4}, () => ['1', '2', '3', '4', '5']), tr(), 1, 1);
t('blok 4×5 – trzeba powiększyć tabelę o 1 wiersz i 1 kolumnę', J(pl.need) === J({rows: 1, cols: 1}) && !pl.fills.length);
pl = P.plan([['1', '2', '', '', '', ''], ['3', '4', '', '', '', '']], tr(), 1, 1);
t('puste komórki czyszczą pola (0), a wystające poza tabelę jej nie powiększają', !pl.need && pl.fills.length === 8 && at(pl, 1, 3) === '0' && at(pl, 2, 4) === '0');
pl = P.plan([['10', 'abc'], ['1', '2']], tr(), 1, 1);
t('wiersz z liczbą to nie nagłówek – błąd przy „abc”', pl.errs.length === 1 && pl.errs[0].i === 1 && pl.errs[0].j === 2 && pl.errs[0].r === 1 && pl.errs[0].c === 2);
pl = P.plan([['1', 'x'], ['y', '4']], [[num, num], [num, num]], 0, 0);
t('dwa błędy z miejscami w schowku', pl.errs.length === 2 && J(pl.errs.map(e => [e.i, e.j])) === '[[1,2],[2,1]]' && !pl.fills.length === false);
t('opis błędu dla użytkownika', P.errText(pl.errs) === 'wiersz 1, kolumna 2 wklejonych danych: „x” nie jest liczbą. Takich komórek jest jeszcze 1 – zaznaczono je na czerwono. Nic nie zostało zmienione.');
pl = P.plan([['a', 'b'], ['1', '2'], ['3', '4']], [[null, T, T], [T, num, num], [T, num, num], [T, num, num]], 2, 1);
t('nagłówek wklejony niżej niż pierwszy wiersz – pominięty, błędy liczone z nagłówkiem', pl.fills.length === 4 && at(pl, 2, 1) === '1' && at(pl, 3, 2) === '4' && /pominięto wiersz nagłówka/.test(pl.notes.join()));
pl = P.plan([['', '5', ''], ['a', 'b', 'c']], [[num, num, num], [num, num, num]], 0, 0);
t('błąd w drugim wierszu (tekst bez liczb niżej to nie nagłówek)', pl.errs.length === 3 && pl.errs[0].i === 2);

/* ---------- przekątna i stałe nazwy (np. macierz przepływów, najkrótsza ścieżka) ---------- */
const sq = [[null, null, null, null], [null, null, numB, numB], [null, numB, null, numB], [null, numB, numB, null]];
pl = P.plan([['', 'A', 'B', 'C'], ['A', '0', '4', ''], ['B', '4', '0', '2'], ['C', '', '2', '0']], sq, 1, 1);
t('macierz z nazwami z Excela: nazwy stałe i przekątna pominięte', pl.fills.length === 6 && at(pl, 1, 2) === '4' && at(pl, 1, 3) === '' && at(pl, 3, 2) === '2' && pl.skipped === 3);

/* ---------- tabela wierszy (czynności): nagłówek z etykietami, dodanie wiersza ---------- */
const rt = n => [[null, null, null, null], ...Array.from({length: n}, () => [T, T, num, null])];
const act = [['Czynność', 'Poprzednicy', 'Czas'], ['A', '', '3'], ['B', 'A', '4'], ['C', 'A,B', '2,5']];
pl = P.plan(act, rt(2), 1, 0);
t('tabela czynności z nagłówkiem: brakuje 1 wiersza', J(pl.need) === J({rows: 1, cols: 0}));
pl = P.plan(act, rt(3), 1, 0);
t('po dodaniu wiersza: 9 pól, przecinek dziesiętny', pl.fills.length === 9 && at(pl, 3, 1) === 'A,B' && at(pl, 3, 2) === '2.5' && at(pl, 1, 1) === '');
pl = P.plan([['A', 'B', 'C', 'D', 'E']], rt(1), 1, 0);
t('za dużo kolumn (kolumna usuwania nie jest polem)', pl.need && pl.need.cols === 1);

/* ---------- programowanie liniowe: kolumna znaku pomijana dla układu A | b ---------- */
const lp = [[num, num], [num, num, relSel, num], [num, num, relSel, num]];
pl = P.plan([['1', '0', '4'], ['0', '2', '12']], lp, 1, 0);
t('A | b bez znaków: znak bez zmian, b na swoim miejscu', pl.fills.length === 6 && at(pl, 1, 3) === '4' && at(pl, 2, 3) === '12' && at(pl, 1, 2) === undefined);
pl = P.plan([['1', '0', '<=', '4'], ['0', '2', '≥', '12']], lp, 1, 0);
t('A | znak | b', pl.fills.length === 8 && at(pl, 1, 2) === '<=' && at(pl, 2, 2) === '>=');
pl = P.plan([['3', '5', ''], ['1', '0', '4'], ['0', '2', '12']], lp, 0, 0);
t('cel i ograniczenia jednym blokiem', pl.fills.length === 8 && at(pl, 0, 1) === '5' && at(pl, 2, 3) === '12');
pl = P.plan([['1', '0', '<>', '4']], lp, 1, 0);
t('zły znak – czytelny błąd', pl.errs.length === 1 && /„<>” – w tej kolumnie wybierz jedną z wartości: „≤”, „≥”, „=”/.test(pl.errs[0].msg));

/* ---------- lista łuków (listy węzłów) ---------- */
pl = P.plan([['A', 'C', '5'], ['b', 'a', '1,5']], [[null, null, null, null], [nodes, nodes, num, null], [nodes, nodes, num, null]], 1, 0);
t('lista łuków: nazwy węzłów z listy', pl.fills.length === 6 && at(pl, 1, 1) === '2' && at(pl, 2, 0) === '1' && at(pl, 2, 2) === '1.5');

/* ---------- nagłówek taki jak w tabeli (np. okresy 1, 2, 3 albo jednostki zasobu 0, 1, 2) ---------- */
const dpG = [[null, T, T, T], [T, num, num, num], [T, num, num, num]], dpL = [['działanie \\ jednostki', '0', '1', '2'], ['D1', '0', '0', '0'], ['D2', '0', '0', '0']];
pl = P.plan([['działanie \\ jednostki', '0', '1', '2'], ['D1', '0', '5', '9'], ['D2', '0', '4', '7']], dpG, 1, 0, dpL);
t('liczbowy nagłówek zgodny z tabelą – rozpoznany (wklejone na nazwę wiersza)', pl.fills.length === 11 && at(pl, 1, 2) === '5' && at(pl, 2, 3) === '7' && at(pl, 0, 1) === '0');
const mrG = [[null, null, null, null], [null, num, num, num], [null, num, num, num]], mrL = [['Pozycja \\ okres', '1', '2', '3'], ['A', '0', '0', '0'], ['B', '0', '0', '0']];
pl = P.plan([['Pozycja', '1', '2', '3'], ['A', '10', '0', '20'], ['B', '0', '5', '0']], mrG, 1, 1, mrL);
t('okresy 1, 2, 3 jako nagłówek + kolumna pozycji (stałe nazwy)', pl.fills.length === 6 && at(pl, 1, 1) === '10' && at(pl, 2, 2) === '5' && !pl.need && J(pl.anchor) === '[0,0]');
pl = P.plan([['1', '2', '3'], ['10', '0', '20'], ['0', '5', '0']], mrG, 1, 1, mrL);
t('nagłówek 1, 2, 3 bez kolumny pozycji', pl.fills.length === 6 && at(pl, 1, 3) === '20' && J(pl.anchor) === '[0,1]');
pl = P.plan([['7', '8', '9'], ['10', '0', '20']], mrG, 1, 1, mrL);
t('liczby inne niż nagłówek – zwykłe dane', pl.fills.length === 6 && at(pl, 1, 1) === '7' && at(pl, 2, 3) === '20');

/* ---------- macierz z wyłączoną przekątną: pierwsze pole 1. wiersza stoi za przekątną ---------- */
pl = P.plan([['0', '4', '1'], ['4', '0', '2'], ['1', '2', '0']], sq, 1, 2, [['Od \\ Do', 'A', 'B', 'C'], ['A', '—', '', ''], ['B', '', '—', ''], ['C', '', '', '—']]);
t('pełna macierz 3×3 wklejona w pierwsze pole (za przekątną) – od przekątnej', pl.fills.length === 6 && at(pl, 1, 2) === '4' && at(pl, 1, 3) === '1' && at(pl, 3, 2) === '2' && !pl.need);
pl = P.plan([['4', '1']], sq, 1, 2);
t('fragment wiersza za przekątną – bez przesunięcia', pl.fills.length === 2 && at(pl, 1, 2) === '4' && at(pl, 1, 3) === '1');
pl = P.plan([['Od \\ Do', 'A', 'B', 'C'], ['A', '—', '4', ''], ['B', '4', '—', '2'], ['C', '', '2', '—']], sq, 1, 2, [['Od \\ Do', 'A', 'B', 'C'], ['A', '—', '', ''], ['B', '', '—', ''], ['C', '', '', '—']]);
t('tabela z ekranu (nazwy, „—” na przekątnej) wklejona w pierwsze pole', pl.fills.length === 6 && at(pl, 1, 2) === '4' && at(pl, 2, 3) === '2' && !pl.errs.length && J(pl.anchor) === '[0,0]');

/* ---------- inne ---------- */
pl = P.plan([['', ''], ['', '']], [[num]], 0, 0);
t('pusty blok – komunikat', pl.errs.length === 1 && /nie zawiera żadnych wartości/.test(pl.errs[0].msg));
t('Excel: puste komórki na końcu wierszy i puste wiersze nie przechodzą do CSV', P.toSemicolon('LSL\t73,95\t\t\n\t\t\t\nCel\tx1\tx2\t\n') === 'LSL;73,95\n\nCel;x1;x2\n');
t('tabulatory → średniki (import CSV modułów)', P.toSemicolon('a\tb\n1,5\t2') === 'a;b\n1,5;2' && P.toSemicolon('a\t"b\nc"\n1\t2') === 'a;"b\nc"\n1;2' && P.toSemicolon('x;y\t1') === 'x;y\t1' && P.toSemicolon('p;1') === 'p;1');

console.log(`Testy wklejania: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
