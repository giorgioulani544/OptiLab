# OptiLab – dokumentacja techniczna
Struktura plików, kolejność skryptów i informacje dla osób rozwijających projekt. Opis dla użytkowników: README.md.

Lekcje „Nauka” z maskotką Pivot (moduł LP): metoda graficzna, simpleks, metoda dwufazowa, duże M, odcięcia Gomory'ego, podział i ograniczenia (testy: tests/lesson.test.js, tests/ilp_lesson.test.js).

Moduły: Planowanie zagregowane, Prognozowanie, Zapasy, PERT/CPM, Harmonogramowanie, Metoda graficzna, Simpleks (duże M / dwufazowa, dual, analiza wrażliwości i parametryczna), Programowanie całkowitoliczbowe (Branch & Bound), Transport, Przydział, Najkrótsza ścieżka, Maksymalny przepływ.

## Struktura
```
index.html              powłoka: nagłówek, dolny pasek zakładek, sekcje modułów
css/style.css           wszystkie style (w tym druk do PDF)
css/lesson.css          style lekcji „Nauka”: nakładka z kartami, dymek i animacje Pivota (mruganie, różdżka, skok, potrząśnięcie; prefers-reduced-motion = bez animacji), kółka różdżki, pytania, menu; telefon = pełny ekran
assets/pivot_maskotka.svg  maskotka Pivot – JEDYNE źródło postaci (grupy poza-explain/point/think/surprise/happy/oops; klasy pv-eyes, pv-wand, pv-star, pv-fx do animacji)
js/core.js              narzędzia wspólne (formatowanie liczb, indeksy <sub>)
js/solver.js            matematyka bez DOM: simpleks, typy zmiennych, dual (testowalne)
js/ilp-solver.js        Branch & Bound (statusy węzłów, limity, wynik niepewny) – bez DOM, testowalne
js/parametric.js        analiza parametryczna: dokładne punkty załamania (bez DOM, testowalne)
js/render.js            HTML tablic, opisu zadania, zadania dualnego
js/examples.js          przykładowe zadania (wystarczy dopisać wiersz)
js/csv.js               import/eksport CSV (Excel) – bez DOM, testowalne
js/paste.js             wklejanie ze schowka – bez DOM, testowalne (tests/paste.test.js): PASTE.parse (tabulator / średnik / przecinek / spacje, cudzysłowy), PASTE.num (przecinek dziesiętny, separatory tysięcy, %, minus z Worda), PASTE.plan (blok → komórki tabeli jak w Excelu: nagłówki z Excela, kolumna znaku pomijana dla A | b, przekątna, rozrost, błędy z miejscem), PASTE.toSemicolon (tekst z Excela → CSV modułu)
js/forms.js             formularze, walidacja, kopiuj/wklej dane, błędy przy polach
js/modules/lp.js        moduł Programowanie liniowe (graficzna, Simpleks, Całkowite)
js/net/netui.js         fundamenty modeli sieciowych: edytor macierzy, rysunek sieci (SVG), pliki/CSV, błędy przy polach
js/paste-ui.js          wklejanie w interfejsie: Ctrl+V / „Wklej” w komórce każdej table.mx i formularza LP ([data-lp]); rozrost tabeli przez listy rozmiaru (matrixHTML: o.grow = {r, c} lub {sq} → data-gr/data-gc/data-sq) albo przycisk „+ wiersz” (rowTableHTML: data-p, data-add); przy błędzie cofnięcie rozrostu i czerwone pola
js/net/transport-solver.js  zagadnienie transportowe (NW, min. element, VAM, MODI) – bez DOM, testowalne
js/modules/transport.js moduł Transport: formularz i raport dydaktyczny
js/net/assignment-solver.js  metoda węgierska (kroki, pokrycie zer, rozwiązania alternatywne) – bez DOM
js/modules/assignment.js     moduł Przydział
js/net/shortestpath-solver.js  Dijkstra i Bellman-Ford (ujemne cykle, ścieżki alternatywne) – bez DOM
js/modules/shortestpath.js   moduł Najkrótsza ścieżka (lista krawędzi lub macierz wag)
js/stats.js             rozkłady statystyczne, odwrotne dystrybuanty, generator liczb losowych ze ziarnem
js/viz.js               wykresy SVG: Gantt, histogram, liniowy (drukowalne)
js/pm/cpm-solver.js     PERT/CPM: harmonogram, rezerwy, ścieżki krytyczne, PERT, skracanie (LP), Monte Carlo – bez DOM
js/modules/cpm.js       moduł PERT/CPM
js/pm/sched-solver.js   harmonogramowanie: reguły jednej maszyny, Johnson, CDS, Palmer, Dannenbring, NEH, LPT, McNaughton – bez DOM
js/modules/scheduling.js  moduł Harmonogramowanie
js/inv/inventory-solver.js  zapasy: EOQ, EPQ, braki, rabaty, zapas bezpieczeństwa, gazeciarz – bez DOM
js/modules/inventory.js moduł Zapasy
js/inv/lotsize.js       dobór partii: L4L, FOQ, EOQ, POQ, min-max, Silver-Meal, LUC, PPB, Wagner-Whitin – bez DOM (Zapasy i MRP)
js/mrp/mrp-solver.js    MRP: BOM, kody niskiego poziomu, bilansowanie, przesunięcie o czas realizacji, komunikaty – bez DOM
js/modules/mrp.js       moduł MRP
js/linalg.js            algebra liniowa: układy równań, macierz odwrotna, wyznacznik, Cholesky (LA.*) – bez DOM
js/queue/queue-solver.js  kolejki: M/M/1, M/M/s, M/M/s/K, M/G/1, M/D/1, M/Eₖ/1, populacja skończona, Erlang B/C, koszty – bez DOM
js/modules/queue.js     moduł Kolejki
js/markov/markov-solver.js  łańcuchy Markowa: klasyfikacja, rozkład stacjonarny, pochłanianie, czasy przejść, czas ciągły – bez DOM
js/modules/markov.js    moduł Procesy Markowa
js/qsim/qsim-solver.js  symulacja zdarzeń dyskretnych kolejek, powtórzenia, przedziały ufności, wspólne liczby losowe – bez DOM
js/modules/qsim.js      moduł Symulacja kolejek
js/expr.js              bezpieczny parser wyrażeń (tokenizer + zejście rekurencyjne → domknięcia, bez eval/new Function), gradient i hesjan numeryczny
js/goal/goal-solver.js   programowanie celowe: priorytety (kolejne LP), wagi, minimax, normalizacja, cele całkowite – bez DOM
js/modules/goal.js       moduł Programowanie celowe (rysunek 2D: gpChartSVG)
js/dp/dp-solver.js       programowanie dynamiczne: ścieżka etapowa, rozdział zasobów, plecak, produkcja–zapasy, wymiana sprzętu – bez DOM
js/modules/dp.js         moduł Programowanie dynamiczne
js/qp/qp-solver.js       programowanie kwadratowe: wypukłość (LA.eigSym), algorytm Lemkego (leksykograficznie), KKT – bez DOM
js/modules/qp.js         moduł Programowanie kwadratowe (poziomice: VZ.contour)
js/nlp/nlp-solver.js     programowanie nieliniowe: 1D (bisekcja, złoty podział, Fibonacci, Newton), gradient/Newton/BFGS z Armijo, kara i rozszerzony Lagrange – bez DOM
js/modules/nlp.js        moduł Programowanie nieliniowe
js/loc/loc-solver.js     lokalizacja: mediana ważona, Weiszfeld z warunkiem Kuhna, środek ciężkości, CRAFT, przegląd n!, p-mediana – bez DOM
js/modules/loc.js        moduł Lokalizacja i układ (mapa SVG: loMapSVG)
docs/img/                zrzuty ekranu do README
js/lp-gomory.js         odcięcia Gomory'ego + dualny simpleks na dokładnych ułamkach (FR, BigInt), usuwanie nieaktywnych odcięć – bez DOM; raport: gomReportHTML (relaksacja, podsumowanie, wynik) i gomCutsHTML (każde odcięcie krok po kroku, osobna sekcja z przełącznikiem gomCutsShellHTML) w js/render.js
js/lp-tab.js            alternatywna metoda tabelaryczna simpleksu (cj − zj, kolumna ilorazów, symboliczne M) – bez DOM; raport: tabReportHTML w js/render.js
js/dec/decision-solver.js  analiza decyzji: kryteria, EMV/EOL/EVPI, drzewa, Bayes i EVSI, użyteczność, gry (LP) – bez DOM
js/modules/decision.js  moduł Analiza decyzji
js/qc/spc-solver.js     karty kontrolne: stałe ze wzorów, X̄-R, X̄-s, I-MR, p, np, c, u, reguły Nelsona, faza I, zdolność, CUSUM, EWMA, ARL – bez DOM
js/modules/spc.js       moduł Karty kontrolne
js/qc/acceptance-solver.js  odbiór statystyczny: OC, AOQ, AOQL, ATI, dobór planu, plany dwustopniowe, SPRT, cechy mierzalne – bez DOM
js/modules/acceptance.js  moduł Odbiór statystyczny
js/fc/forecast-solver.js    prognozowanie: 8 metod, miary błędów, dobór parametrów – bez DOM
js/modules/forecast.js  moduł Prognozowanie
js/agg/agg-solver.js    planowanie zagregowane: model LP, strategie, ceny dualne – bez DOM
js/modules/aggplan.js   moduł Planowanie zagregowane
PROGRESS.md             stan prac nad kolejnymi modułami
js/net/maxflow-solver.js     Ford-Fulkerson / Edmonds-Karp, przekrój minimalny, superźródło – bez DOM
js/modules/maxflow.js        moduł Maksymalny przepływ (sieć rezydualna w każdej iteracji)
js/registry.js          rejestr modułów (registerModule) i lista modułów „wkrótce"
js/htmltree.js          drzewo HTML raportu (HT.parse, HT.text, HT.grid – siatka tabeli z colspan/rowspan) i eksport wyników do CSV (HT.reportCSV: nagłówki, tabele, ramki .sum/.msg, treść zadania; polski Excel) – bez DOM, testowalne (tests/export_csv.test.js)
js/docx.js              raport do Worda bez bibliotek – bez DOM, testowalne (tests/docx.test.js): DOCX.build (WordprocessingML: style Title/Heading/Sum/Msg/Formula/Hint/ListPara, tabele z gridSpan/vMerge, powtarzany nagłówek, cantSplit, kolory z data-bg/data-fg albo klas raportu, obrazy PNG, stopka ze stroną), DOCX.zip (ZIP z CRC-32, bez kompresji lub deflate)
js/export.js            eksport w przeglądarce: wygląd komórek z CSS (data-*), SVG → PNG (canvas 2×), kompresja CompressionStream, pobranie .docx / .csv
js/pivot-svg.js         PLIK GENEROWANY z assets/pivot_maskotka.svg (python3 tools/pivot_svg.py) – SVG wstawiane do strony, by przełączać pozy po id także z file:// i w jednym pliku; test pilnuje zgodności
js/lesson.js            silnik lekcji „Nauka” (LESSON): format lekcji opisany w komentarzu na górze pliku, rejestr tematów (LESSON.register), menu startowe i wybór poziomu, karty z Wstecz/Dalej/postępem, pytania (wybór, liczba; wyjaśnienia typowych pomyłek, pokaż odpowiedź, po 3 błędach powrót), wynik Sprawdzianu, różdżka (ramki SVG na komórkach data-r/data-c, podświetlenie data-hl), przełącznik maskotki w localStorage; czyste funkcje parseNum/numMatch/check/tableHTML/validate testowane w Node
js/lessons/lp-lessons.js  lekcje LP (LPL) – czyste funkcje bez DOM: metoda graficzna (lpVertices, graphSVG), simpleks (tabSolve), metoda dwufazowa (gomSolve: faza I i II), duże M (tabSolve, symboliczne M); zadania lekcyjne w LPL_TASKS (tylko dane wejściowe – liczby na kartach liczą solvery), q.tag = skąd odpowiedź (testy)
js/lessons/ilp-lessons.js  lekcje zadań całkowitoliczbowych (ILPL) – czyste: odcięcia Gomory'ego z gomSolve (NWW, części ułamkowe, odcięcie, dualny simpleks, znikające odcięcia z C.dropped – withoutVar), podział i ograniczenia z ilpSolve (bbEvents – kolejność zdarzeń przeszukiwania w głąb, treeSVG – drzewo, nodeSVG – obszar węzła z granicami gałęzi); zadania w ILPL_TASKS
js/print.js             składanie wydruku/PDF (PRINT.geom, PRINT.paginate): długie tabele na kawałki z powtórzonym nagłówkiem, nagłówki sklejone z treścią (.keep) – działa też w Safari na iPhonie
js/app.js               zakładki, przycisk „Eksportuj raport” z menu (PDF – druk jak dotąd, Word, CSV; reportSections = sekcje bieżącej zakładki), start
js/bg.js                tło: powolna animowana sieć z pomarańczowymi wyładowaniami (canvas #bgnet; tylko ozdoba, ładowany ostatni)
tests/                  testy w Node (solver, metoda dwufazowa, parametryczna, CSV, wklejanie, eksport CSV i DOCX, przykłady, ładowanie, interfejs); tests/browser_check.py – przeglądarka (Playwright), w tym prawdziwe Ctrl+V i pobrane pliki .docx/.csv sprawdzane zipfile/XML/LibreOffice; odcięcia Gomory'ego: gomory.test.js (solver), gomory_report.test.js (raport krok po kroku, limity), gomory_ui.test.js (zakładka Całkowite, dane do PDF)
tools/pivot_svg.py      generuje js/pivot-svg.js z assets/pivot_maskotka.svg (uruchom po każdej zmianie maskotki)
tools/bundle.py         skleja projekt w jeden plik (podgląd na telefonie / wgranie z telefonu)
manifest.webmanifest, icon-192.png, icon-512.png   ikona skrótu na telefonie/komputerze
```
Uruchom testy: `for t in tests/*.test.js; do node $t; done`.
Kolejność plików w `index.html` ma znaczenie (każdy kolejny korzysta z poprzednich).

## Dodawanie modułu
1. Utwórz `js/modules/nazwa.js`, który wywołuje `registerModule({id, title, icon, html, init})`. Obliczenia trzymaj w osobnym pliku bez DOM (np. `js/net/...-solver.js`), żeby dało się je testować w Node.
2. Dodaj `<script src="...?v=N">` w `index.html` po `js/registry.js`, a przed `js/app.js`.
3. Usuń moduł z listy `SOON` w `js/registry.js`. Zakładka, sekcja i eksport do PDF (`last[id]`) powstają automatycznie.
4. Dopisz testy w `tests/` (najlepiej porównanie z podręcznikiem lub z innym solverem).

## Dodawanie lekcji „Nauka” dla kolejnej metody
1. Utwórz `js/lessons/nazwa-lessons.js` z czystą funkcją `build(level)` (level: `warm` | `test` | `challenge`), która rozwiązuje zadanie lekcyjne istniejącym solverem i zwraca `{title, steps, result}` w formacie z komentarza na górze `js/lesson.js`. Liczby, tabele i poprawne odpowiedzi biorą się z wyniku solvera; zadanie lekcyjne to tylko dane wejściowe.
2. Zarejestruj temat: `LESSON.register({id, title, group, note, tabs: ['id-zakładki'], build})`. Przycisk „Nauka” pojawi się w podanych zakładkach, a temat w menu.
3. Dodaj `<script>` po `js/lesson.js` (przed `js/app.js`) i podnieś `?v=N`.
4. Testy (wzór: `tests/lesson.test.js`): `LESSON.validate` bez uwag, limit kart, każde pytanie z `q.tag` porównane z solverem lub niezależnym przeglądem, ostatnia karta = wynik raportu modułu.

## Aktualizacja na GitHub Pages
Wgraj cały folder (zachowaj podfoldery). Po zmianie pliku podnieś numer `?v=1` → `?v=2` w `index.html`,
żeby przeglądarki nie używały starej wersji z pamięci podręcznej.
Szczegółowa instrukcja: `INSTRUKCJA-GITHUB.md`.
