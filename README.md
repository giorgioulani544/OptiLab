# OptiLab – Badania Operacyjne
Made by Aleksander Kruszelnicki

## Struktura
```
index.html              powłoka: nagłówek, dolny pasek zakładek, sekcje modułów
css/style.css           wszystkie style (w tym druk do PDF)
js/core.js              narzędzia wspólne (formatowanie liczb, indeksy <sub>)
js/solver.js            matematyka bez DOM: simpleks, typy zmiennych, dual (testowalne)
js/parametric.js        analiza parametryczna: dokładne punkty załamania (bez DOM, testowalne)
js/render.js            HTML tablic, opisu zadania, zadania dualnego
js/forms.js             formularze, walidacja, kopiuj/wklej dane, błędy przy polach
js/modules/lp.js        moduł Programowanie liniowe (graficzna, Simpleks, Całkowite)
js/registry.js          lista modułów „wkrótce"
js/app.js               zakładki, eksport PDF, start (ładowany ostatni)
tests/                  testy w Node: solver.test.js, parametric.test.js, load.test.js, ui_smoke.test.js
tools/bundle.py         skleja projekt w jeden plik (podgląd na telefonie / wgranie z telefonu)
manifest.webmanifest, icon-192.png, icon-512.png   ikona skrótu na telefonie/komputerze
```
Uruchom testy: `for t in tests/*.test.js; do node $t; done`.
Kolejność plików w `index.html` ma znaczenie (każdy kolejny korzysta z poprzednich).

## Dodawanie modułu
1. Utwórz `js/modules/nazwa.js` (solver bez DOM trzymaj osobno, żeby dało się go testować).
2. Dodaj `<script src="js/modules/nazwa.js?v=1">` w `index.html` przed `registry.js`.
3. Usuń moduł z listy `SOON` w `js/registry.js` i dodaj jego zakładkę oraz sekcję w `index.html`.

## Aktualizacja na GitHub Pages
Wgraj cały folder (zachowaj podfoldery). Po zmianie pliku podnieś numer `?v=1` → `?v=2` w `index.html`,
żeby przeglądarki nie używały starej wersji z pamięci podręcznej.
Szczegółowa instrukcja: `INSTRUKCJA-GITHUB.md`.
