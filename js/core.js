/* ===== OptiLab – rdzeń =====
   Narzędzia wspólne: $, formatowanie liczb, indeksy <sub>, opisy wyrażeń. Bez zależności od reszty. */

/* =====================================================================
   1. NARZĘDZIA
   ===================================================================== */
const $ = s => document.querySelector(s);
let BIGM = 1e6;                       // stała „dużego M" dla zmiennych sztucznych
// Formatowanie liczb: max 4 miejsca po przecinku, bez krzaków przy dużych/małych wartościach
const fmt = v => {
  if (Math.abs(v) < 1e-9) return '0';
  if (Math.abs(v) >= 1e9) return v.toExponential(2).replace('.', ',');
  return String(Math.round(v * 1e4) / 1e4).replace('.', ',');
};
const sub = n => `<sub>${n}</sub>`;   // x<sub>1</sub> (Plotly też obsługuje <sub>)
const grow = t => { t.style.width = Math.max(window.innerWidth <= 480 ? 52 : 64, t.value.length * 10 + 26) + 'px'; };   // pole rośnie z liczbą cyfr (węższe na telefonie)   // pole rośnie z liczbą cyfr
const last = {};                        // ostatnie wyniki do raportu
let lastModel = null;

// Opis ograniczenia/celu słowami
const term = (a, j, first, pf = 'x') => (a < 0 ? '−' : first ? '' : '+') + (first ? '' : ' ') + (Math.abs(a) === 1 ? '' : fmt(Math.abs(a))) + pf + sub(j + 1);
const expr = (a, pf) => a.map((v, j) => v === 0 ? '' : term(v, j, false, pf)).filter(Boolean).join(' ').replace(/^\+ /, '') || '0';
const sign = r => r === '<=' ? '≤' : r === '>=' ? '≥' : '=';
