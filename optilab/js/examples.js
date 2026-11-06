/* ===== OptiLab – przykładowe zadania =====
   Format: {name, maxi, c: [współczynniki celu], rows: [[a1, ..., an, znak, b], ...]}.
   Dodanie przykładu = dopisanie jednego wiersza do listy (pojawi się w „Opcjach zaawansowanych → Przykład"). */
const EXAMPLES = [
  {name: 'Produkcja (max, 2 zmienne)', maxi: true, c: [3, 5], rows: [[1, 0, '<=', 4], [0, 2, '<=', 12], [3, 2, '<=', 18]]},
  {name: 'Minimalizacja kosztów (znaki ≥)', maxi: false, c: [2, 3], rows: [[1, 1, '>=', 4], [1, 2, '>=', 6]]},
  {name: 'Całkowitoliczbowe (plecak)', maxi: true, c: [5, 4], rows: [[6, 4, '<=', 24], [1, 2, '<=', 6]]},
  {name: 'Alternatywne optimum', maxi: true, c: [1, 1], rows: [[1, 1, '<=', 4], [1, 0, '<=', 3]]},
  {name: '3 zmienne (Simpleks)', maxi: true, c: [3, 2, 4], rows: [[1, 1, 2, '<=', 4], [2, 0, 3, '<=', 5], [2, 1, 3, '<=', 7]]},
  {name: 'Zadanie sprzeczne (pokaz błędu)', maxi: true, c: [1, 1], rows: [[1, 0, '<=', 3], [1, 0, '>=', 5]]},
  {name: 'Zadanie nieograniczone (pokaz błędu)', maxi: true, c: [1, 1], rows: [[1, -1, '<=', 2]]},
];
// przykład -> ten sam format co „Kopiuj dane" i plik .json
const exampleToData = ex => ({optilab: 1, maxi: ex.maxi, c: ex.c.map(String),
  rows: ex.rows.map(r => ({a: r.slice(0, -2).map(String), rel: r[r.length - 2], b: String(r[r.length - 1])}))});
