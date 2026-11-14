# OptiLab – kontekst projektu dla Claude Code

## Zasady pracy (z promptu głównego – obowiązują w każdej sesji)
- README.md to strona powitalna dla odwiedzających GitHub (emotki, ton przyjazny, ale profesjonalny). W KAŻDEJ sesji zaktualizuj: tabele modułów, odznaki (liczba gotowych modułów, liczba testów), sekcję „W przygotowaniu”. Struktura plików i informacje techniczne są w DOKUMENTACJA-TECHNICZNA.md (tam dopisuj nowe pliki).
- Stan prac jest w PROGRESS.md: na starcie przeczytaj, kontynuuj od pierwszego niegotowego modułu (kolejność pakietów jak w PROGRESS.md), na końcu zaktualizuj.
- Najpierw fundamenty wspólne potrzebne dla pakietu, potem moduły po kolei; każdy moduł skończ w 100% przed następnym. Rdzeń całego pakietu przed rozszerzeniami (rozszerzenia = Opcje zaawansowane). Lepiej mniej modułów w pełni gotowych niż więcej po łebkach.
- Definicja ukończenia modułu: logika bez DOM + niezależne testy (literatura wpisana ręcznie – bez wymyślania liczb, przegląd wszystkich możliwości, wzory zamknięte, Monte Carlo ze ziarnem; NIGDY porównanie dwóch fragmentów kodu OptiLab i NIGDY dopasowywanie testów do kodu); interfejs z walidacją przy polach, kopiuj/wklej, przykłady, .json, .csv; raport dydaktyczny z krokami po polsku, kolorami i wykresami SVG; eksport PDF tylko bieżącej zakładki bez rozciętych tabel; zrzuty ekranu komputer (1280 px) i telefon (390 px) obejrzane w Playwright i usterki poprawione, PDF obejrzany; rejestracja (registerModule, usunięcie z SOON, ?v=N); README/CLAUDE/INSTRUKCJA/PROGRESS zaktualizowane; wszystkie stare testy przechodzą.
- Statusy wyników: optimal / infeasible / unbounded / limit / niepewny – przerwanie, limit lub brak zbieżności NIGDY nie jest pokazywane jako poprawny wynik. Bez zmiennych globalnych modyfikowanych przez obliczenia. Wszystkie dane użytkownika w HTML przez esc(); bez eval i new Function na danych użytkownika.
- Dla każdego modułu krótkie wyszukiwanie: czego brakuje w odpowiednim module WinQSB; sensowne luki uwzględnić.
- Koniec sesji: wszystkie testy (suma), optilab.zip i optilab-telefon.zip (tools/bundle.py), tabela modułów, pliki, testy, ograniczenia, opis zmian do commita, sugestia na kolejną sesję.

Aplikacja webowa „OptiLab – Badania Operacyjne”: nowoczesna, mobile-first alternatywa dla WinQSB (nie używamy nazw QSB/WinQSB w interfejsie).
Autor: Aleksander Kruszelnicki. Stopka: „Made by Aleksander Kruszelnicki”. Język interfejsu i komunikacji: polski.
Hosting: GitHub Pages (statyczne pliki, bez backendu i bez bundlera). Wykresy: Plotly z CDN.

## Struktura i zasady kodu
- Klasyczne skrypty (NIE moduły ES), wspólny zasięg globalny. Kolejność `<script>` w `index.html` ma znaczenie: core → stats → viz → solver → parametric → ilp-solver → render → examples → csv → forms → registry → modules/lp → net/netui → net/transport-solver → modules/transport → net/assignment-solver → modules/assignment → net/shortestpath-solver → modules/shortestpath → net/maxflow-solver → modules/maxflow → pm/cpm-solver → modules/cpm → pm/sched-solver → modules/scheduling → inv/inventory-solver → modules/inventory → fc/forecast-solver → modules/forecast → agg/agg-solver → modules/aggplan → mrp/mrp-solver → modules/mrp → queue/queue-solver → modules/queue → markov/markov-solver → modules/markov → qsim/qsim-solver → modules/qsim → dec/decision-solver → modules/decision → qc/spc-solver → modules/spc → qc/acceptance-solver → modules/acceptance → goal/goal-solver → modules/goal → dp/dp-solver → modules/dp → qp/qp-solver → modules/qp → nlp/nlp-solver → modules/nlp → loc/loc-solver → modules/loc → app → bg (expr.js zaraz po linalg) (lp-tab zaraz po solver) (inv/lotsize zaraz po inv/inventory-solver; linalg zaraz po viz).
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
- Kolory (ustalone 2026-11-14): beżowe tło (--paper) z animowaną siecią zamiast kratki, pastelowy pomarańcz jako akcent (--or, --or-pale, --or-deep: przycisk główny z granatowym tekstem, fokus pól, aktywna zakładka, panel „Opcje zaawansowane”), granat (#1b2a4e) dla tekstu i raportów, złoty pivot, zielone podsumowania. Raporty (#out-…, #print-area) zachowują dotychczasowy wygląd – nowe style formularzy nie mogą na nie wpływać. Raport PDF (`@media print`, A4 pionowo) musi zachować kolory.
- Dane między modułami: Kopiuj/Wklej dane, zapis/wczytanie .json, przykłady (`js/examples.js`).
- Mobile-first: dotyk min. 44 px, tabele w `.tw` z przewijaniem poziomym, wykres z własnymi gestami (pinch/pan).

## Plan (kolejność)
1. Zrobione: metoda dwufazowa (wybór w Opcjach zaawansowanych Simpleksa), import/eksport CSV, limit 30×30.
2. Modele sieciowe – zrobione: Transport, Przydział (metoda węgierska), Najkrótsza ścieżka (Dijkstra, Bellman-Ford), Maksymalny przepływ (Edmonds-Karp, sieć rezydualna, przekrój minimalny, superźródło).
- `layeredSVG` (netui.js) rysuje graf warstwami od startu; klasy krawędzi: tree, path, other, neg. Test w przeglądarce: `python3 tests/browser_check.py` (wymaga playwright).
3. Zarządzanie projektem – zrobione: PERT/CPM, Harmonogramowanie. Wszystkie pakiety (1–5) zrobione – lista SOON jest pusta. Dalej: poprawki z uwag użytkowników (PROGRESS.md).
- Simpleks: opcja „alternatywna metoda tabelaryczna” (value TAB) ustawia model.tab = true, a model.method zostaje '2F' – solver traktuje każdą metodę ≠ '2F' jak duże M, więc nigdy nie przekazuj mu 'TAB'.
- CSV parametrów: paramsFromCSV(text, keys, cols, textKeys) – parametry tekstowe (model, rozkład) podaj w textKeys; klucze dopasowywane najpierw dokładnie (n ≠ N).
- Całkowite: wybór metody #ilp-method (bb | gom). Gomory: js/lp-gomory.js (gomSolve, FR – ułamki BigInt), skalowanie wierszy do liczb całkowitych, nieaktywne odcięcia usuwane; kontrola wyniku przez ilpSolve w raporcie.
- Raport końcowy LP (qsbReport): otwarty domyślnie, kolumny jak w Excel Solver (dopuszczalny spadek/wzrost), interpretacja słowna lpInterpretHTML, legenda „Jak czytać”; eksport tablic tablesCSVLink (render.js).
- expr.js: NIGDY eval/new Function – test tests/expr.test.js sprawdza to w kodzie źródłowym; nowe funkcje dopisuj do białej listy FN.
- NLP: status 'limit'/'diverge' nie jest wynikiem (raport nie pokazuje ramki „Wynik”); kryterium zbieżności względem ‖∇f(x₀)‖ + próg dokładności różniczkowania numerycznego.
- Testy w Node: funkcje zadeklarowane przez const (np. locDist, layCost) pobieraj przez vm.runInContext('nazwa', c), nie c.nazwa.
- Pułapka: „a(), b = …” w jednej instrukcji tworzy zmienną globalną – rozdzielaj średnikiem.
- matrixHTML(p, …) nadaje tabeli id = p. Moduły sprawdzają $('#' + p) przed matrixSync – NIE usuwaj tego id (bez niego wpisy użytkownika w macierzy są po cichu pomijane). Test: tests/audit_regress.test.js.
- Testy interfejsu muszą WPISYWAĆ wartości (Playwright fill), a nie tylko wczytywać przykłady – inaczej nie wykryją zerwanego połączenia pole → stan (tests/browser_check.py, „Edycja macierzy”).
- VZ.ticks i wykresy: zakres osi może być zerowy albo mniejszy niż dokładność liczb – zawsze przez tolerancję względną.
- Lista SOON w registry.js: usuwając moduł, sprawdź też ostatni element (bez przecinka po nim).
- Wykresy: VZ.control (karta kontrolna, zmienne granice, strefy σ), VZ.pareto.
- Wspólne: js/linalg.js (LA.solve, LA.inv, LA.det, LA.chol, LA.isPD, LA.mul, LA.vecMul, LA.pow); VZ.bars (wykres słupkowy), VZ.stateGraph (graf stanów: układ 'circle' albo 'line'); serie wykresu liniowego: klasy '', b, c, d, e, f, g; legenda zawija się po 4 pozycjach.
- Dobór partii: js/inv/lotsize.js (lotSize(r, reguła, {S, H, Q, P, min, max}), LOT_RULES) – wspólny dla Zapasów i MRP.
- Pasek modułów: na komputerze przeciąganie myszą, kółko, strzałki .navarrow (app.js); na dotyku – zwykłe przewijanie.
- rowsToCSV: parametry liczbowe (meta) zapisywane z przecinkiem; importy zamieniają przecinek na kropkę.
- Formularz parametrów: paramFormHTML/paramSync, CSV parametrów: paramsToCSV/paramsFromCSV (netui.js); wzory w raporcie w <div class="formula">.
- Wspólne: js/stats.js (ST.normCdf, ST.normInv, ST.rng(seed) …), js/viz.js (VZ.gantt, VZ.hist, VZ.line), netui.js: rowTableHTML/rowTableSync (tabela wierszy), rowsToCSV/rowsFromCSV.
- Uwaga CSS: [hidden] ma display:none!important (klasy z display:flex nie nadpiszą ukrycia).
- Rysunki tej samej sieci w kilku krokach: policz raz `layeredLayout(...)` i przekaż `{layout}` do `layeredSVG`, żeby węzły stały w tych samych miejscach.
- Telefon (≤ 480 px): ukryta nazwa zakładki w nagłówku, mniejsze marginesy; `grow()` ma minimum 52 px – wiersz LP z 2 zmiennymi mieści się w jednej linii.
- Tło: js/bg.js (canvas #bgnet, position:fixed, z-index:-1, pointer-events:none) – węzły dryfują ok. 3 px/s, wyładowanie co 1,4–3,2 s (najwyżej 4, na telefonie 2), limit 30 klatek/s, pauza w ukrytej karcie, prefers-reduced-motion = obraz statyczny, w druku ukryte. Ma być wolne i dyskretne – nie przyspieszaj. Bez zależności od reszty kodu.
- Ramki formularzy używają --fline (ciepła), tabele raportów --line (chłodna) – nie łącz ich z powrotem.
