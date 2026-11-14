# OptiLab – postęp prac (stan między sesjami)

Na starcie każdej sesji przeczytaj ten plik i CLAUDE.md. Kontynuuj od pierwszego modułu, który nie jest „gotowy", w kolejności pakietów.
Statusy: **gotowy** / **w toku** / **nie zaczęty**.

## Zrobione wcześniej
Programowanie liniowe (graficzna, Simpleks, Całkowite), Transport, Przydział, Najkrótsza ścieżka, Maksymalny przepływ – gotowe.

## Fundamenty wspólne
| Plik | Status | Uwagi |
|---|---|---|
| js/stats.js | gotowy (2026-11-05) | rozkłady, odwrotne dystrybuanty, generator ze ziarnem, próbniki (Beta-PERT, gamma, Erlang…); tests/stats.test.js |
| js/viz.js | gotowy (2026-11-05) | Gantt, histogram, wykres liniowy/schodkowy (SVG, drukowalne) |
| js/linalg.js | gotowy (2026-11-07) | układy równań (LU z wyborem elementu), odwrotna, wyznacznik, Cholesky, test dodatniej określoności, potęga; tests/linalg.test.js |
| js/expr.js | nie zaczęty | potrzebny w pakiecie 5 (programowanie nieliniowe) |
| netui.js: rowTableHTML / rowsToCSV / rowsFromCSV | gotowy (2026-11-05) | edytor tabeli wierszy i CSV wierszowe |
| netui.js: paramFormHTML / paramsToCSV / paramsFromCSV | gotowy (2026-11-05) | formularz parametrów i CSV „parametr;wartość” + tabela |

## Pakiet 1 – Projekt i harmonogram
| Moduł | Status | Uwagi |
|---|---|---|
| PERT/CPM (`cpm`) | gotowy (2026-11-05) | rdzeń komplet; rozszerzenia: skracanie (LP + krzywa czas–koszt z dokładnymi punktami załamania, koszt pośredni), rezerwa niezależna, Monte Carlo (Beta-PERT, indeks krytyczności). NIE zrobione: podgląd sieci w zapisie czynności na łukach (AOA) z czynnościami pozornymi. |
| Harmonogramowanie (`sched`) | gotowy (2026-11-05) | rdzeń komplet (FCFS, SPT, WSPT, EDD, LPT, Moore-Hodgson, Johnson 2 i 3 maszyny); rozszerzenia: flow shop m maszyn (CDS, Palmer, Dannenbring, NEH + optimum przeglądem n ≤ 8), maszyny równoległe (LPT, McNaughton). NIE zrobione: job shop z regułami priorytetu, terminy gotowości zadań (release dates). |

## Pakiet 2 – Zapasy, prognozy, planowanie produkcji
| Moduł | Status | Uwagi |
|---|---|---|
| Zapasy (`inv`) | gotowy – rdzeń (2026-11-05) | EOQ, EPQ, planowane braki, rabaty (od całej ilości i przyrostowe; H stałe lub % ceny), punkt zamawiania z zapasem bezpieczeństwa (losowy popyt i czas dostawy, poziom wypełnienia), gazeciarz (normalny i dyskretny); wzory z liczbami, wykresy kosztów. Rozszerzenie zrobione (2026-11-07): zapotrzebowanie zmienne w czasie – porównanie reguł doboru partii, tablica Wagnera-Whitina, kroki Silvera-Meala. NIE zrobione: polityki (s, S) i (R, S), wiele towarów z ograniczeniem (Lagrange), analiza ABC. |
| Prognozowanie (`fc`) | gotowy – rdzeń (2026-11-06) | naiwna, średnia ruchoma, ważona średnia ruchoma, wygładzanie wykładnicze, Holt, Holt-Winters addytywny i multiplikatywny, regresja liniowa; MAD, MSE, RMSE, MAPE, CFE, obciążenie, sygnał kontrolny (ostrzeżenie > ±4); dobór α, β, γ siatką wg kryterium MSE/MAD/MAPE/CFE (jak w WinQSB, ale dla wszystkich stałych); porównanie metod; wklejanie kolumny z Excela. Konwencje inicjalizacji opisane w raporcie. NIE zrobione (rozszerzenia): dekompozycja sezonowa, przedziały prognozy, metoda Crostona, podział na zbiór uczący i testowy. |
| Planowanie zagregowane (`agg`) | gotowy – rdzeń + rozszerzenia (2026-11-07) | model LP (płace, czas normalny, nadgodziny z limitem, podwykonawstwo z limitem, zatrudnienia, zwolnienia, zapas, zaległości lub brak braków, zapas końcowy); porównanie strategii (pogoń za popytem, stałe zatrudnienie, plan optymalny), struktura kosztów, ceny dualne bilansu; rozszerzenia: całkowita liczba pracowników (B&B), limity zatrudnień i zwolnień w okresie. Test literaturowy: Red Tomato (Chopra i Meindl) 422 275 / 422 660. NIE zrobione: wiele produktów, druga zmiana. |
| MRP (`mrp`) | gotowy – rdzeń + rozszerzenia (2026-11-07) | BOM wielopoziomowa (wspólne składniki), kody niskiego poziomu, zapotrzebowanie brutto/netto, zapas początkowy, przyjęcia zaplanowane, czasy realizacji, reguły partii (L4L, FOQ, EOQ, POQ, min-max, Silver-Meal, LUC, PPB, Wagner-Whitin), tabele MRP, plan zamówień, rysunek struktury; rozszerzenia: zapas bezpieczeństwa, odpad (zamówienia w górę do pełnych sztuk), komunikaty przyspieszyć/opóźnić/anulować. NIE zrobione: kontrola zdolności produkcyjnej. |

## Pakiet 3 – Modele probabilistyczne
| Moduł | Status | Uwagi |
|---|---|---|
| Kolejki (`queue`) | gotowy – rdzeń + analiza kosztów (2026-11-07) | M/M/1, M/M/s, M/M/1/K, M/M/s/K (Erlang B), M/G/1, M/D/1, M/Eₖ/1, M/M/s//N; ρ, P₀, Pₙ (tabela, wykres), L, Lq, W, Wq, P(oczekiwania), P(W > t), P(Wq > t), λ_ef, diagram narodzin i śmierci, prawo Little'a, niestabilność ρ ≥ 1; koszty i optymalna liczba stanowisk. Testy: Render i Stair (Arnold M/M/1 i M/M/2, Garcia-Golding M/D/1, Department of Commerce), równania równowagi, Monte Carlo. NIE zrobione: priorytety, sieci Jacksona, rezygnacje (rozszerzenia). |
| Procesy Markowa (`markov`) | gotowy – rdzeń + rozszerzenia (2026-11-07) | walidacja macierzy, rozkład po n krokach, Pⁿ, wykres zbieżności, rozkład stacjonarny (jednoznaczność, okresowość, średni czas powrotu), klasy komunikujące, stany pochłaniające/powracające/chwilowe, okres, macierz fundamentalna N, B = N·R, t = N·1, czasy pierwszego przejścia, graf stanów; rozszerzenia: łańcuch z czasem ciągłym (generator Q, π, czasy przebywania, łańcuch skoków). |
| Symulacja kolejek (`qsim`) | gotowy – rdzeń + wspólne liczby losowe (2026-11-07) | symulacja zdarzeń dyskretnych, s stanowisk, pojemność K, rozkłady: wykładniczy, jednostajny, normalny obcięty, Erlanga, stały, empiryczny; ziarno, rozgrzewka, powtórzenia z przedziałem ufności t, tabela zdarzeń, porównanie z teorią (moduł Kolejki), histogram Wq, przebieg liczby klientów, wykorzystanie stanowisk; porównanie dwóch liczb stanowisk na wspólnych liczbach losowych. NIE zrobione: klasy priorytetowe. |

## Pakiet 4 – Decyzje i jakość
| Moduł | Status | Uwagi |
|---|---|---|
| Analiza decyzji (`dec`) | gotowy – rdzeń + rozszerzenia (2026-11-08) | tabela wypłat/kosztów: Wald, maximax, Hurwicz, Laplace, Savage, macierz żalu, EMV, EOL, EVPI, progi opłacalności (2 stany, wykres); drzewa decyzyjne (tabela węzłów, rollback, rysunek z optymalną ścieżką); Bayes i EVSI (sprawność, opłacalność badania); rozszerzenia: użyteczność wykładnicza (CE), gry o sumie zerowej (punkt siodłowy, dominacja, LP, metoda graficzna 2×n). Testy: Thompson Lumber (Render i Stair), EVSI liczone ręcznie, drzewa vs przegląd strategii, gry vs warunki optymalności. NIE zrobione: scoring wielokryterialny, tabela użyteczności. |
| Karty kontrolne (`qc`) | gotowy – rdzeń + rozszerzenia (2026-11-08) | X̄-R, X̄-s, I-MR, p (zmienna liczebność), np, c, u; stałe d2, d3, c4 i pochodne wyznaczane całkowaniem (zgodne z tablicami Montgomery'ego); reguły Nelsona 1–8 z oznaczeniem punktów; faza I; Cp, Cpk, Pp, Ppk, ppm, histogram z rozkładem normalnym; wykres Pareto; rozszerzenia: CUSUM tabelaryczny, EWMA, ARL; wklejanie z Excela. |
| Odbiór statystyczny (`acc`) | gotowy – rdzeń + rozszerzenia (2026-11-08) | plany (n, c): OC (dwumianowy, Poissona, hipergeometryczny), AOQ, AOQL, ATI; dobór najmniejszego planu dla AQL, α, LTPD, β (minimalność potwierdzona przeglądem); plany dwustopniowe (OC, ASN); SPRT (linie, tabela, przebieg kontroli 0/1); rozszerzenie: plan dla cech mierzalnych przy znanym σ. NIE zrobione: kontrola z poprawianiem jako osobny tryb (AOQ/ATI są w ocenie planu). |

## Pakiet 5 – Programowanie matematyczne i lokalizacja
| Moduł | Status | Uwagi |
|---|---|---|
| Programowanie celowe | gotowy – rdzeń + rozszerzenia (2026-11-12) | odchylenia d⁻/d⁺, priorytety leksykograficznie (kolejne LP, poziom w pełni osiągnięty utrwalany dokładnie), wagi, minimax, normalizacja, cele całkowite (B&B), rysunek 2D. Testy: Beaver Creek (Taylor), przegląd wierzchołków dla każdego poziomu, siatka dla celów całkowitych. NIE zrobione: analiza wrażliwości wag. |
| Programowanie dynamiczne | gotowy – rdzeń (2026-11-12) | ścieżka etapowa wstecz i w przód (wszystkie trasy optymalne, rysunek sieci), rozdział zasobów (cały zasób), plecak 0/1 / ograniczony / nieograniczony, produkcja–zapasy, wymiana sprzętu; tablice f(s) z decyzjami optymalnymi. Testy: dyliżans (Hillier i Lieberman), przegląd wszystkich polityk. NIE zrobione: programowanie dynamiczne stochastyczne. |
| Programowanie kwadratowe | gotowy – rdzeń + rozszerzenia (2026-11-12) | wypukłość z wartości własnych (Jacobi), KKT, algorytm Lemkego z regułą leksykograficzną, mnożniki, sprawdzenie KKT, poziomice; sprzeczność/nieograniczoność rozstrzygana LP. Testy: Hillier i Lieberman (12, 9; 270), przegląd zbiorów aktywnych, Q = 0 vs wierzchołki. NIE zrobione: zmienne bez znaku (tylko x ≥ 0), QP całkowitoliczbowe. |
| Programowanie nieliniowe | gotowy – rdzeń + rozszerzenia (2026-11-12) | parser expr.js (bez eval, testy ataków), 1D: bisekcja, złoty podział, Fibonacci, Newton; wiele zmiennych: gradient, Newton (modyfikacja hesjanu), BFGS z Armijo; ograniczenia: kara zewnętrzna, rozszerzony Lagrange (mnożniki); poziomice ze ścieżką i krzywymi ograniczeń, wykres zbieżności. Testy: funkcje kwadratowe (analitycznie), Rosenbrock, funkcja Boyda (siatka), zadania z KKT liczonymi ręcznie. |
| Lokalizacja i układ | gotowy – rdzeń + rozszerzenia (2026-11-12) | mediana ważona (zbiór optymalny), Weiszfeld z warunkiem Kuhna, środek ciężkości, porównanie kryteriów, CRAFT (wymiana par) z przeglądem n! (n ≤ 8), p-mediana (przegląd), mapy SVG. Testy: Quain’s (Heizer i Render), przegląd współrzędnych, siatka, n!, przegląd zestawów. NIE zrobione: działy o różnych powierzchniach, bilansowanie linii. |

## Zaległości do dokończenia przy okazji (rozszerzenia)
- Zapasy: (s, S), (R, S), wiele towarów z ograniczeniem, ABC.
- MRP: kontrola zdolności produkcyjnej.
- Prognozowanie: dekompozycja sezonowa, przedziały prognozy, Croston, zbiór uczący/testowy.
- Interfejs (2026-11-07): pasek modułów przewijany na komputerze (przeciąganie, kółko, strzałki). README przebudowane na stronę powitalną; dokumentacja techniczna w DOKUMENTACJA-TECHNICZNA.md.
- Kolejki: priorytety (M/M/1 bez wywłaszczania), sieci Jacksona, rezygnacje. Symulacja kolejek: klasy priorytetowe.
- Simpleks (2026-11-08): alternatywna metoda tabelaryczna (js/lp-tab.js + tabReportHTML w render.js) – tablica C_B | baza | x | b | iloraz, wiersze z_j i c_j − z_j, max i min, ≥ i = przez zmienne sztuczne z symbolicznym M, reguła Blanda; wybór w opcjach zaawansowanych Simpleksu (model.tab = true, obliczenia pomocnicze zawsze dwufazowe). Testy: przykład z materiałów z zajęć krok po kroku, zadania Z6, Z9, Z15, przegląd wierzchołków.
- Poprawka (2026-11-08, zgłoszona z telefonu): reguły Nelsona porównują z tolerancją 1e-9 – punkt równy średniej (z błędem zaokrągleń) nie jest „po jednej stronie”; komunikat „proces nie jest uregulowany” jest czerwony; lista sygnałów posortowana wg reguł.
- Audyt (2026-11-10): przegląd w przeglądarce wszystkich przykładów wszystkich modułów (komputer i telefon) – brak błędów JS i wartości NaN/undefined; naprawione: na telefonie długie listy wyboru i opisy pól wychodziły poza ekran (6 modułów); podsumowania wyniku dodane w Procesach Markowa i MRP; wybór metody widoczny w Simpleksie i Całkowitych.
- Pod zadania z laboratorium (Simpleks, sprawozdanie): odcięcia Gomory'ego z dualnym simpleksem (zakładka Całkowite), raport końcowy z analizą wrażliwości OFC/RHS jak w Excel Solver (otwarty domyślnie), interpretacja słowna wyników, legenda „gdzie odczytać wyniki”, eksport tablic do Excela, przykłady Z6, Z9, Z15 i minimalizacja 3×3.
- Pakiet 5 (2026-11-12): programowanie celowe, dynamiczne, kwadratowe, nieliniowe (z parserem expr.js), lokalizacja i układ; README ze zrzutami ekranu (docs/img).
- Audyt (2026-11-13): 1195 prób z błędnymi wpisami i 1076 prób edycji pól we wszystkich modułach. Naprawione: (1) WAŻNE – ręczna edycja macierzy była ignorowana w Analizie decyzji (tabela wypłat, gra), Kartach kontrolnych (pomiary), Programowaniu kwadratowym (Q i c), dynamicznym (rozdział zasobów) i Lokalizacji (przepływy): moduły sprawdzały element #prefiks, którego matrixHTML nie tworzył – tabela dostała id = prefiks; przykłady, wklejanie i pliki działały, dlatego testy tego nie wykryły; (2) błąd JS (RangeError w VZ.ticks) przy wykresie serii stałej z szumem zaokrągleń, np. planowanie zagregowane z limitem zatrudnień 0; (3) drobne: nieużywane pole N w planie dwustopniowym, koszt zakupu D·c w EPQ i modelu z brakami, przekątna macierzy przepływów wyłączona; (4) Bayes: tabela wartości oczekiwanych wszystkich decyzji. Testy: tests/audit_regress.test.js + wpisywanie z klawiatury w tests/browser_check.py.
- Kolejna sesja: wszystkie moduły gotowe – poprawki z uwag użytkowników; ewentualnie DP stochastyczne, wrażliwość wag w programowaniu celowym, działy o różnych powierzchniach w CRAFT.
- PERT/CPM: podgląd sieci AOA z czynnościami pozornymi.
- Harmonogramowanie: job shop (reguły SPT, FIFO, MWKR, Gantt), terminy gotowości zadań.
- Interfejs (2026-11-14, gałąź UI): odświeżony wygląd bez zmian w obliczeniach i raportach – beż + pastelowy pomarańcz (akcent), animowane tło-sieć z pomarańczowymi wyładowaniami (js/bg.js) zamiast kratki, przycisk główny pomarańczowy z granatowym tekstem, miękki fokus pól, panel „Opcje zaawansowane” ze strzałką, cień karty, znacznik aktywnej zakładki, nazwa modułu jako pigułka. Sprawdzone: 12 701 testów, browser_check.py (wynik identyczny jak przed zmianą), 24 moduły na 1280 px i 390 px (brak błędów JS i wychodzenia poza ekran, dotyk ≥ 44 px), PDF (bez tła, raport jak dotąd). Do rozważenia: tryb ciemny, ocieplenie nagłówków tabel w formularzach.
