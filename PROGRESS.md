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
| Analiza decyzji | nie zaczęty | |
| Karty kontrolne | nie zaczęty | |
| Odbiór statystyczny | nie zaczęty | |

## Pakiet 5 – Programowanie matematyczne i lokalizacja
| Moduł | Status | Uwagi |
|---|---|---|
| Programowanie celowe | nie zaczęty | |
| Programowanie dynamiczne | nie zaczęty | |
| Programowanie kwadratowe | nie zaczęty | |
| Programowanie nieliniowe | nie zaczęty | |
| Lokalizacja i układ | nie zaczęty | |

## Zaległości do dokończenia przy okazji (rozszerzenia)
- Zapasy: (s, S), (R, S), wiele towarów z ograniczeniem, ABC.
- MRP: kontrola zdolności produkcyjnej.
- Prognozowanie: dekompozycja sezonowa, przedziały prognozy, Croston, zbiór uczący/testowy.
- Interfejs (2026-11-07): pasek modułów przewijany na komputerze (przeciąganie, kółko, strzałki). README przebudowane na stronę powitalną; dokumentacja techniczna w DOKUMENTACJA-TECHNICZNA.md.
- Kolejki: priorytety (M/M/1 bez wywłaszczania), sieci Jacksona, rezygnacje. Symulacja kolejek: klasy priorytetowe.
- Kolejna sesja: pakiet 4 – Analiza decyzji (drzewa decyzyjne, Bayes, EVSI; gry z LP), Karty kontrolne (stałe c4, d2 wzorami; reguły Nelsona), Odbiór statystyczny.
- PERT/CPM: podgląd sieci AOA z czynnościami pozornymi.
- Harmonogramowanie: job shop (reguły SPT, FIFO, MWKR, Gantt), terminy gotowości zadań.
