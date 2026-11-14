# OptiLab – dokumentacja techniczna
Struktura plików, kolejność skryptów i informacje dla osób rozwijających projekt. Opis dla użytkowników: README.md.

Moduły: Planowanie zagregowane, Prognozowanie, Zapasy, PERT/CPM, Harmonogramowanie, Metoda graficzna, Simpleks (duże M / dwufazowa, dual, analiza wrażliwości i parametryczna), Programowanie całkowitoliczbowe (Branch & Bound), Transport, Przydział, Najkrótsza ścieżka, Maksymalny przepływ.

## Struktura
```
index.html              powłoka: nagłówek, dolny pasek zakładek, sekcje modułów
css/style.css           wszystkie style (w tym druk do PDF)
js/core.js              narzędzia wspólne (formatowanie liczb, indeksy <sub>)
js/solver.js            matematyka bez DOM: simpleks, typy zmiennych, dual (testowalne)
js/ilp-solver.js        Branch & Bound (statusy węzłów, limity, wynik niepewny) – bez DOM, testowalne
js/parametric.js        analiza parametryczna: dokładne punkty załamania (bez DOM, testowalne)
js/render.js            HTML tablic, opisu zadania, zadania dualnego
js/examples.js          przykładowe zadania (wystarczy dopisać wiersz)
js/csv.js               import/eksport CSV (Excel) – bez DOM, testowalne
js/forms.js             formularze, walidacja, kopiuj/wklej dane, błędy przy polach
js/modules/lp.js        moduł Programowanie liniowe (graficzna, Simpleks, Całkowite)
js/net/netui.js         fundamenty modeli sieciowych: edytor macierzy, rysunek sieci (SVG), pliki/CSV, błędy przy polach
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
js/lp-gomory.js         odcięcia Gomory'ego + dualny simpleks na dokładnych ułamkach (FR, BigInt), usuwanie nieaktywnych odcięć – bez DOM; raport: gomReportHTML w js/render.js
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
js/app.js               zakładki, eksport PDF, start (ładowany ostatni)
tests/                  testy w Node (solver, metoda dwufazowa, parametryczna, CSV, przykłady, ładowanie, interfejs)
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

## Aktualizacja na GitHub Pages
Wgraj cały folder (zachowaj podfoldery). Po zmianie pliku podnieś numer `?v=1` → `?v=2` w `index.html`,
żeby przeglądarki nie używały starej wersji z pamięci podręcznej.
Szczegółowa instrukcja: `INSTRUKCJA-GITHUB.md`.
