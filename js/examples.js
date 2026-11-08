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
  {name: 'Laboratorium Z6 (max, 3 zmienne)', maxi: true, c: [2.9, 5.5, 3.1], rows: [[2, 2, 1, '<=', 8800], [4.5, 4, 3, '<=', 20000], [2.1, 6.3, 3.2, '<=', 12000]]},
  {name: 'Laboratorium Z9 (max, 3 zmienne)', maxi: true, c: [2.5, 5, 2], rows: [[0, 5, 2, '<=', 7500], [1.1, 0.5, 1, '<=', 4500], [3, 7, 2, '<=', 20000]]},
  {name: 'Laboratorium Z15 (max, 3 zmienne)', maxi: true, c: [16, 23, 18], rows: [[2.4, 2, 1.2, '<=', 1100], [1, 0, 2.5, '<=', 550], [2, 3.5, 2.8, '<=', 2000]]},
  {name: 'Mieszanka paszowa (min, 3 zmienne, 3 ograniczenia)', maxi: false, c: [2, 3, 2.5], rows: [[4, 2, 3, '>=', 60], [2, 5, 3, '>=', 80], [1, 1, 2, '>=', 30]]},
];
// przykład -> ten sam format co „Kopiuj dane" i plik .json
const exampleToData = ex => ({optilab: 1, maxi: ex.maxi, c: ex.c.map(String),
  rows: ex.rows.map(r => ({a: r.slice(0, -2).map(String), rel: r[r.length - 2], b: String(r[r.length - 1])}))});
