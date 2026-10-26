# OptiLab – kontekst projektu dla Claude Code

Aplikacja webowa „OptiLab – Badania Operacyjne”: nowoczesna, mobile-first alternatywa dla WinQSB (nie używamy nazw QSB/WinQSB w interfejsie).
Autor: Aleksander Kruszelnicki. Stopka: „Made by Aleksander Kruszelnicki”. Język interfejsu i komunikacji: polski.
Hosting: GitHub Pages (statyczne pliki, bez backendu i bez bundlera). Wykresy: Plotly z CDN.

## Struktura i zasady kodu
- Klasyczne skrypty (NIE moduły ES), wspólny zasięg globalny. Kolejność `<script>` w `index.html` ma znaczenie: core → solver → parametric → ilp-solver → render → examples → csv → forms → registry → modules/lp → net/netui → net/transport-solver → modules/transport → net/assignment-solver → modules/assignment → net/shortestpath-solver → modules/shortestpath → net/maxflow-solver → modules/maxflow → app.
- `js/solver.js`, `js/parametric.js` to czysta matematyka bez DOM (testowalna w Node). Logika liczenia nie może zależeć od DOM.
- Nowy moduł = plik w `js/modules/` z `registerModule({id, title, icon, html, init})` + linia `<script>` w `index.html` (po registry.js, przed app.js) + usunięcie z listy SOON. Zakładka, sekcja i eksport PDF (`last[id]`) powstają automatycznie.
- Modele sieciowe korzystają ze wspólnych komponentów `js/net/netui.js`: `matrixHTML/matrixSync/matrixWire` (edytor macierzy, M = trasa zakazana), `netFail` (błąd pod tabelą), `networkSVG/bipartiteSVG` (rysunek sieci), `netToolsHTML/netToolsWire` (kopiuj/wklej, przykłady, .json, .csv), `matrixToCSV/matrixFromCSV`. Raport modułu to czysta funkcja zwracająca HTML (testowalna).
- Po każdej zmianie plików `.css`/`.js` podnieś `?v=N` w `index.html` (cache na GitHub Pages).
- `python3 tools/bundle.py` skleja wszystko w jeden plik (podgląd/wgrywanie z telefonu).
- Testy: `for t in tests/*.test.js; do node $t; done` – muszą przechodzić przed commitem. `tests/reference.test.js` jest niezależny od kodu OptiLab (wartości z literatury, przegląd wierzchołków, pełne przeszukiwanie) – nie zmieniaj go, żeby „pasował” do kodu.
- Solver LP: domyślnie metoda dwufazowa (duże M tylko jako opcja dydaktyczna – bywa niedokładne przy różnych skalach liczb). Statusy: optimal | unbounded | infeasible | limit; `limit` nigdy nie jest traktowany jak optimum. Przy powtórzeniu bazy simpleks przechodzi na regułę Blanda. Ceny dualne `r.y` liczone z tablicy, analiza wrażliwości w `lpSensitivity()` (solver.js), Branch & Bound w `js/ilp-solver.js`. Nowa funkcja liczeniowa = nowy test (najlepiej porównanie z wynikiem z WinQSB lub podręcznika).

## Decyzje UX (ustalone z autorem)
- Prostota: laik ma widzieć tylko to, co musi wypełnić. Funkcje dodatkowe tylko w „Opcjach zaawansowanych” (zwijane `details.adv`).
- Błędy: czerwone podświetlenie pola + komunikat w wierszu tego pola (`fail()` w forms.js), nigdy komunikat „jak w konsoli” na dole.
- Zmienne z indeksami dolnymi (`x<sub>1</sub>`), liczby formatowane przez `fmt()` (max 4 miejsca po przecinku).
- Dolny pasek zakładek przewijany poziomo; zakładki „wkrótce” pokazują komunikat o przyszłej aktualizacji.
- Pola liczbowe: szerokość 64 px, rosną z wpisem; focus zaznacza zawartość, „0” się czyści, puste pole po blur wraca do 0.
- Kolory: kremowe tło z kratką, granat (#1b2a4e), złoty pivot, zielone podsumowania. Raport PDF (`@media print`, A4 pionowo) musi zachować kolory.
- Dane między modułami: Kopiuj/Wklej dane, zapis/wczytanie .json, przykłady (`js/examples.js`).
- Mobile-first: dotyk min. 44 px, tabele w `.tw` z przewijaniem poziomym, wykres z własnymi gestami (pinch/pan).

## Plan (kolejność)
1. Zrobione: metoda dwufazowa (wybór w Opcjach zaawansowanych Simpleksa), import/eksport CSV, limit 30×30.
2. Modele sieciowe – zrobione: Transport, Przydział (metoda węgierska), Najkrótsza ścieżka (Dijkstra, Bellman-Ford), Maksymalny przepływ (Edmonds-Karp, sieć rezydualna, przekrój minimalny, superźródło).
- `layeredSVG` (netui.js) rysuje graf warstwami od startu; klasy krawędzi: tree, path, other, neg. Test w przeglądarce: `python3 tests/browser_check.py` (wymaga playwright).
3. Dalej (lista SOON w registry.js): PERT/CPM, zapasy, kolejki, prognozowanie, analiza decyzji i pozostałe.
- Rysunki tej samej sieci w kilku krokach: policz raz `layeredLayout(...)` i przekaż `{layout}` do `layeredSVG`, żeby węzły stały w tych samych miejscach.
- Telefon (≤ 480 px): ukryta nazwa zakładki w nagłówku, mniejsze marginesy; `grow()` ma minimum 52 px – wiersz LP z 2 zmiennymi mieści się w jednej linii.
