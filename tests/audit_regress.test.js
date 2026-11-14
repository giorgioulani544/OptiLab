// Regresje z audytu 2026-11-13: (1) tabela edytora macierzy ma id = prefiks – inaczej moduły pomijały ręczną edycję macierzy;
// każdy moduł, który przed matrixSync sprawdza $('#' + prefiks), musi ten element dostać; (2) podziałki osi i wykresy dla serii stałej z szumem zaokrągleń
const fs = require('fs'), path = require('path'), vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/viz.js', 'js/net/netui.js']), VZ = vm.runInContext('VZ', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const h = c.matrixHTML('zz-M', {rn: ['a', 'b'], cn: ['x', 'y'], cells: [['1', '2'], ['3', '4']]}, {noMsg: true});
t('matrixHTML: tabela ma id równe prefiksowi (na nim opierają się zabezpieczenia przed matrixSync)', /<table class="mx" id="zz-M">/.test(h) && /id="zz-Mc1_1"/.test(h));
// statycznie: każdy warunek $('#' + P + 'X') stojący przed matrixSync(P + 'X', …) odnosi się do macierzy rysowanej przez matrixHTML(P + 'X', …)
const dir = path.join(__dirname, '../js/modules'); let guards = 0;
fs.readdirSync(dir).forEach(f => { const src = fs.readFileSync(path.join(dir, f), 'utf8');
  [...src.matchAll(/\$\('#' \+ (\w+) \+ '(\w+)'\)\)[\s\S]{0,600}?matrixSync\(\1 \+ '\2'/g)].forEach(m => { guards++;
    t(`${f}: zabezpieczenie #${m[1]}+'${m[2]}' ma odpowiadające matrixHTML(${m[1]} + '${m[2]}', …)`, new RegExp(`matrixHTML\\(${m[1]} \\+ '${m[2]}'`).test(src)); }); });
t(`znaleziono zabezpieczenia macierzy w modułach: ${guards} (decyzje ×3, karty, dynamiczne, kwadratowe, lokalizacja)`, guards >= 7);
t('ticks: zakres mniejszy niż dokładność liczb nie zapętla się', VZ.ticks(64.58333333333331, 64.58333333333334).length <= 12 && VZ.ticks(1e17, 1e17).length <= 12 && VZ.ticks(0, 0).length <= 12);
t('ticks: wartości nieskończone i NaN → pusta lista, zwykły zakres bez zmian', VZ.ticks(NaN, 1).length === 0 && VZ.ticks(0, Infinity).length === 0 && VZ.ticks(0, 10).join() === '0,2,4,6,8,10');
const g = VZ.line([{name: 'W', pts: [1, 2, 3, 4, 5, 6].map((x, i) => [x, i === 5 ? 64.58333333333331 : 64.58333333333333])}], {title: 'stała seria'});
const ys = [...g.matchAll(/L[0-9.]+ ([0-9.]+)/g)].map(m => +m[1]);
t('wykres liniowy: seria stała z szumem zaokrągleń rysowana jako płaska linia', g.length > 500 && ys.length >= 4 && Math.max(...ys) - Math.min(...ys) < 0.5);
const k = VZ.control(Array(8).fill(5), Array(8).fill(5), Array(8).fill(5.000000000000001), Array(8).fill(5), {title: 'stała karta'});
t('karta kontrolna: dane stałe (zerowy rozrzut) nie zawieszają wykresu', typeof k === 'string' && k.length > 300);
console.log(`Testy regresji z audytu: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
