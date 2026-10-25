# OptiLab – Badania Operacyjne
Made by Aleksander Kruszelnicki

Moduły: Metoda graficzna, Simpleks (duże M / dwufazowa, dual, analiza wrażliwości i parametryczna), Programowanie całkowitoliczbowe (Branch & Bound), Transport, Przydział, Najkrótsza ścieżka, Maksymalny przepływ.

## Struktura
```
index.html              powłoka: nagłówek, dolny pasek zakładek, sekcje modułów
css/style.css           wszystkie style (w tym druk do PDF)
js/core.js              narzędzia wspólne (formatowanie liczb, indeksy <sub>)
js/solver.js            matematyka bez DOM: simpleks, typy zmiennych, dual (testowalne)
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
