// Moduły Przydział i Najkrótsza ścieżka: raporty dydaktyczne, CSV, walidacja plików, bezpieczeństwo nazw, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
// --- Przydział ---
let h = c.asReportHTML(c.assignmentSolve({cost: [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]], rNames: ['W1', 'W2', 'W3', 'W4'], cNames: ['Z1', 'Z2', 'Z3', 'Z4']}));
t('przydział: wszystkie kroki metody węgierskiej', ['Redukcja wierszy', 'Redukcja kolumn', 'Pokrycie zer liniami', 'Wybór niezależnych zer'].every(s => h.includes(s)));
t('przydział: wynik 13 i rysunek', /minimalny koszt = <b>13<\/b>/.test(h) && /<svg class="netsvg"/.test(h));
h = c.asReportHTML(c.assignmentSolve({cost: [[1, 2, 3], [2, 4, 6], [3, 6, 10]]}));
t('przydział: korekta macierzy, gdy linii jest za mało', /Korekta macierzy/.test(h) && /iteracja 2/.test(h));
h = c.asReportHTML(c.assignmentSolve({maxi: true, cost: [[5, 1], [1, 5], [3, 3]], rNames: ['A', 'B', 'C'], cNames: ['X', 'Y']}));
t('przydział max niekwadratowy: straty, fikcyjne zadanie, kto bez zadania', /Straty/.test(h) && /Fikcyjne zadanie 1/.test(h) && /C pozostaje bez zadania/.test(h) && /maksymalny zysk = <b>10<\/b>/.test(h));
h = c.asReportHTML(c.assignmentSolve({cost: [[3, 3, 6], [3, 3, 7], [5, 6, 4]]}));
t('przydział: rozwiązanie alternatywne opisane', /Istnieje rozwiązanie alternatywne/.test(h));
h = c.asReportHTML(c.assignmentSolve({cost: [[1, 2], [3, 4]], rNames: ['<i>x</i>', 'y'], cNames: ['a', 'b']}));
t('przydział: nazwy bezpiecznie wyświetlane', !/<i>x<\/i>/.test(h) && /&lt;i&gt;x/.test(h));
const as = {maxi: false, rn: ['Jan', 'Ewa'], cn: ['A', 'B', 'C'], cells: [['4', 'M', '2.5'], ['1', '2', '3']]};
t('przydział CSV: eksport → import bez zmian', JSON.stringify(get(`matrixFromCSV(matrixToCSV(${JSON.stringify(as)}, asCsvOpt), asCsvOpt)`)) === JSON.stringify({...as, xc: [], xr: null}) || (() => { const b = get(`matrixFromCSV(matrixToCSV(${JSON.stringify(as)}, asCsvOpt), asCsvOpt)`); return JSON.stringify([b.rn, b.cn, b.cells, b.maxi]) === JSON.stringify([as.rn, as.cn, as.cells, as.maxi]); })());
let threw = ''; try { get('asNormalize({cells: [[1, 2], [3]]})'); } catch (e) { threw = e.message; } t('przydział: plik z nierównymi wierszami odrzucony', /różną długość/.test(threw));
// --- Najkrótsza ścieżka ---
const park = get("JSON.parse(JSON.stringify(SP_EXAMPLES[0].data))"), G = d => ({n: d.names.length, names: d.names, directed: d.directed, src: d.src, dst: d.dst, edges: d.edges.map(e => ({a: e.a, b: e.b, w: +e.w}))});
let g = G(park); h = c.spReportHTML(g, c.dijkstra(g));
t('ścieżka: tabela etykiet, kroki, wynik 13, alternatywa, rysunek', /Tabela etykiet/.test(h) && /Krok 7/.test(h) && /długość <b>13<\/b>/.test(h) && /ścieżki alternatywne/.test(h) && /class="ed path"/.test(h));
t('ścieżka: krawędzie nieskierowane bez strzałek', !/<line class="ed path"[^>]*marker-end/.test(h));
g = G(get("SP_EXAMPLES[3].data")); h = c.spReportHTML(g, c.bellmanFord(g));
t('Bellman-Ford: tabela przebiegów i wynik', /Przebieg/.test(h) && /wszystkich węzłów/.test(h));
g = G(get("SP_EXAMPLES[4].data")); const R = c.bellmanFord(g); h = c.spReportHTML(g, R);
t('ujemny cykl: komunikat i czerwony cykl na rysunku', R.status === 'negcycle' && /ujemny cykl/.test(h) && /ed path neg/.test(h));
g = G(get("SP_EXAMPLES[5].data")); h = c.spReportHTML(g, c.dijkstra(g));
t('węzeł nieosiągalny opisany', /nie da się dojść/.test(h) && /nieosiągalne/.test(h));
const csv = get(`spToCSV(${JSON.stringify(park)})`), back = get(`spFromCSV(${JSON.stringify(csv)})`);
t('ścieżka CSV: eksport → import (węzły, graf, start, cel, krawędzie)', JSON.stringify([back.names, back.directed, back.src, back.dst, back.edges]) === JSON.stringify([park.names, park.directed, park.src, park.dst, park.edges]));
threw = ''; try { get(`spFromCSV("od;do;waga\\nA;B;x")`); } catch (e) { threw = e.message; } t('ścieżka CSV: błędna waga z numerem wiersza', /wiersz 2: waga „x"/.test(threw));
threw = ''; try { get('spNormalize({names: ["A","B"], edges: [{a: 0, b: 5, w: 1}]})'); } catch (e) { threw = e.message; } t('ścieżka: plik z krawędzią do nieistniejącego węzła odrzucony', /nieistniejący/.test(threw));
t('moduły zarejestrowane, usunięte z listy „wkrótce"', get("['transport','assign','sp'].every(id => MODULES.some(m => m.id === id)) && !SOON.some(s => s[0] === 'assign' || s[0] === 'sp')"));
console.log(`Testy modułów Przydział i Najkrótsza ścieżka: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
