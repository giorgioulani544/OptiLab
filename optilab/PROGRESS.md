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
| js/linalg.js | nie zaczęty | potrzebny w pakietach 3 i 5 |
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
| Zapasy (`inv`) | gotowy – rdzeń (2026-11-05) | EOQ, EPQ, planowane braki, rabaty (od całej ilości i przyrostowe; H stałe lub % ceny), punkt zamawiania z zapasem bezpieczeństwa (losowy popyt i czas dostawy, poziom wypełnienia), gazeciarz (normalny i dyskretny); wzory z liczbami, wykresy kosztów. NIE zrobione (rozszerzenia): polityki (s, S) i (R, S), wiele towarów z ograniczeniem (Lagrange), analiza ABC, zapotrzebowanie zmienne w czasie (Wagner-Whitin, Silver-Meal, partia na partię, PPB). |
| Prognozowanie (`fc`) | gotowy – rdzeń (2026-11-06) | naiwna, średnia ruchoma, ważona średnia ruchoma, wygładzanie wykładnicze, Holt, Holt-Winters addytywny i multiplikatywny, regresja liniowa; MAD, MSE, RMSE, MAPE, CFE, obciążenie, sygnał kontrolny (ostrzeżenie > ±4); dobór α, β, γ siatką wg kryterium MSE/MAD/MAPE/CFE (jak w WinQSB, ale dla wszystkich stałych); porównanie metod; wklejanie kolumny z Excela. Konwencje inicjalizacji opisane w raporcie. NIE zrobione (rozszerzenia): dekompozycja sezonowa, przedziały prognozy, metoda Crostona, podział na zbiór uczący i testowy. |
| Planowanie zagregowane | nie zaczęty | |
| MRP | nie zaczęty | |

## Pakiet 3 – Modele probabilistyczne
| Moduł | Status | Uwagi |
|---|---|---|
| Kolejki | nie zaczęty | |
| Procesy Markowa | nie zaczęty | |
| Symulacja kolejek | nie zaczęty | |

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
- Zapasy: (s, S), (R, S), wiele towarów z ograniczeniem, ABC, Wagner-Whitin / Silver-Meal / L4L / PPB (przyda się też w MRP).
- Prognozowanie: dekompozycja sezonowa, przedziały prognozy, Croston, zbiór uczący/testowy.
- Kolejna sesja: zacznij od modułu Planowanie zagregowane (pakiet 2), potem MRP (z metodami doboru partii: L4L, stała, POQ, EOQ; Wagner-Whitin i Silver-Meal wspólne z rozszerzeniem Zapasów).
- PERT/CPM: podgląd sieci AOA z czynnościami pozornymi.
- Harmonogramowanie: job shop (reguły SPT, FIFO, MWKR, Gantt), terminy gotowości zadań.
