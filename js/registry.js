/* ===== OptiLab – rejestr modułów =====
   Rejestr modułów i lista modułów zapowiedzianych.
   Nowy moduł = jeden plik w js/modules/ wywołujący registerModule({id, title, icon, html, init}) + jedna linia <script> w index.html
   (przed app.js). Zakładka na dolnym pasku, sekcja i eksport do PDF (last[id]) powstają automatycznie. */
const MODULES = [];
function registerModule(md) { MODULES.push(md); }
/* Moduły zapowiedziane (lista z oryginalnego QSB) – na razie bez funkcji, tylko komunikat */
const SOON = [['pert', 'PERT / CPM'], ['goal', 'Programowanie celowe'], ['dp', 'Programowanie dynamiczne'],
  ['qp', 'Programowanie kwadratowe'], ['nlp', 'Programowanie nieliniowe'], ['queue', 'Kolejki'], ['qsim', 'Symulacja kolejek'],
  ['inv', 'Zapasy'], ['fc', 'Prognozowanie'], ['dec', 'Analiza decyzji'], ['mk', 'Procesy Markowa'], ['agg', 'Planowanie zagregowane'],
  ['mrp', 'MRP'], ['job', 'Harmonogramowanie zadań'], ['loc', 'Lokalizacja i układ'], ['qc', 'Karty kontrolne'], ['acc', 'Odbiór statystyczny']];
const SOON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg>';
