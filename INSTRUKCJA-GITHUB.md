# Jak podmienić stronę na GitHubie (bez utraty starej wersji)

GitHub zapamiętuje każdą wersję plików (zakładka **History** przy pliku), więc stara wersja nie przepada.

## Wariant A – z komputera (zalecany, pełna struktura plików)
1. Rozpakuj `optilab.zip`. W środku jest folder `optilab`.
2. Wejdź w swoje repozytorium → **Add file → Upload files**.
3. Przeciągnij **zawartość** folderu `optilab` (pliki `index.html`, `manifest.webmanifest`, ikony oraz foldery `css`, `js` – razem z podfolderami `js/modules` i `js/net` – `tests`, `tools`) do okna. Pliki o tych samych nazwach zostaną podmienione.
4. Na dole wpisz opis zmiany (np. „OptiLab v2: dokładna analiza parametryczna") i kliknij **Commit changes**.
5. Poczekaj 1–2 minuty i otwórz stronę `https://TWOJA-NAZWA.github.io/NAZWA-REPOZYTORIUM/`. Odśwież z pominięciem pamięci podręcznej (Ctrl+Shift+R; na telefonie otwórz w karcie prywatnej).

## Wariant B – tylko z telefonu (jeden plik, bez folderów)
1. Rozpakuj `optilab-telefon.zip` w aplikacji Pliki. Są w nim 4 pliki: `index.html`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.
2. Na github.com (widok „wersja na komputer") wejdź w repozytorium → **Add file → Upload files**, wybierz te 4 pliki → **Commit changes**.
3. Ta wersja działa tak samo, ale cały kod jest sklejony w `index.html`. Przy kolejnych aktualizacjach dostaniesz od mnie nową paczkę.

## Gdy coś pójdzie nie tak
Otwórz plik `index.html` w repozytorium → **History** → wybierz poprzedni zapis → **…** → **View file** → **Raw**, skopiuj całość, wróć do `index.html` → ikona ołówka → wklej → **Commit changes**.
Jeśli układ strony jest rozbity (brak kolorów), prawie zawsze oznacza to, że folder `css` lub `js` nie został wgrany razem z `index.html`.

## Przy każdej kolejnej zmianie kodu
W `index.html` podnieś numer `?v=7` do `?v=8` przy plikach `.css` i `.js`, żeby przeglądarki pobrały nową wersję.
