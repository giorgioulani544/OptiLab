/* ===== OptiLab – moduł Programowanie kwadratowe =====
   Interfejs i raport dydaktyczny. Obliczenia: js/qp/qp-solver.js (algorytm Lemkego, wartości własne: js/linalg.js). Wykres: VZ.contour. */
const QPP = 'qp-', QP_MAXN = 6, QP_MAXM = 10;
const qpCon = (a, rel, b) => ({rel, b: String(b), ...Object.fromEntries(a.map((v, j) => ['a' + j, String(v)]))});
const qpEx = (name, n, maxi, Q, c, cons) => ({name, data: {n, maxi, Q: {rn: [], cn: [], cells: Q.map(r => r.map(String)), xr: c.map(String)}, cons: cons.map(([a, rel, b]) => qpCon(a, rel, b))}});
const QP_EXAMPLES = [
  qpEx('Hillier i Lieberman: max 15x₁ + 30x₂ + 4x₁x₂ − 2x₁² − 4x₂²', 2, true, [[-4, 4], [4, -8]], [15, 30], [[[1, 2], '<=', 30]]),
  qpEx('Portfel inwestycyjny (Markowitz): minimalne ryzyko', 3, false, [[0.08, 0.012, 0.004], [0.012, 0.18, 0.008], [0.004, 0.008, 0.02]], [0, 0, 0], [[[1, 1, 1], '=', 1], [[0.08, 0.12, 0.06], '>=', 0.09]]),
  qpEx('Najbliższy punkt obszaru (rzut punktu (4; 3))', 2, false, [[2, 0], [0, 2]], [-8, -6], [[[1, 1], '<=', 4], [[1, -1], '<=', 1]]),
  qpEx('Q półokreślona – nieskończenie wiele optimów', 2, false, [[2, 2], [2, 2]], [-4, -4], [[[1, 0], '<=', 3], [[0, 1], '<=', 3]]),
  qpEx('Zadanie niewypukłe (pokaz komunikatu)', 2, false, [[1, 3], [3, 1]], [0, 0], [[[1, 1], '<=', 4]]),
];
let QPS = qpNormalize(JSON.parse(JSON.stringify(QP_EXAMPLES[0].data)));
function qpNormalize(d) {
  if (!d || !d.Q || !Array.isArray(d.Q.cells)) throw new Error('to nie jest zadanie programowania kwadratowego (brak macierzy Q).');
  const n = Math.min(QP_MAXN, Math.max(1, +d.n || d.Q.cells.length)), S = v => String(v ?? '0'), names = Array.from({length: n}, (_, j) => 'x' + (j + 1));
  if ((d.cons || []).length > QP_MAXM) throw new Error(`za dużo ograniczeń (maksimum ${QP_MAXM}).`);
  return {n, maxi: !!d.maxi, Q: {rn: names, cn: names.slice(), cells: Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => S(d.Q.cells[i]?.[j]))), xr: Array.from({length: n}, (_, j) => S(d.Q.xr?.[j]))},
    cons: (d.cons || []).map(c => ({rel: ['<=', '>=', '='].includes(c.rel) ? c.rel : '<=', b: S(c.b), ...Object.fromEntries(names.map((_, j) => ['a' + j, S(c['a' + j])]))}))};
}
const qpCCols = () => [...Array.from({length: QPS.n}, (_, j) => ({key: 'a' + j, label: 'x' + (j + 1), type: 'num'})), {key: 'rel', label: 'Znak', type: 'sel', opts: [['<=', '≤'], ['>=', '≥'], ['=', '=']]}, {key: 'b', label: 'Prawa strona', type: 'num'}];
function qpRender() {
  $('#' + QPP + 'n').value = QPS.n; $('#' + QPP + 'maxi').value = QPS.maxi ? '1' : '0';
  $('#' + QPP + 'Q').innerHTML = matrixHTML(QPP + 'M', QPS.Q, {corner: 'Q', staticNames: true, noMsg: true, xrLabel: 'c (część liniowa)'});
  $('#' + QPP + 'cons').innerHTML = rowTableHTML(QPP + 'c', qpCCols(), QPS.cons, {addLabel: '+ ograniczenie', count: k => `${k} ograniczeń`});
  $('#' + QPP + 'cadd').onclick = () => { qpSync(); if (QPS.cons.length < QP_MAXM) QPS.cons.push({rel: '<=', b: '0', ...Object.fromEntries(Array.from({length: QPS.n}, (_, j) => ['a' + j, '0']))}); qpRender(); };
  matrixPolish($('#' + QPP + 'top'));
}
function qpSync() { if ($('#' + QPP + 'M')) matrixSync(QPP + 'M', QPS.Q); QPS.cons = rowTableSync(QPP + 'c', qpCCols(), QPS.cons); QPS.maxi = $('#' + QPP + 'maxi').value === '1'; }
function qpInit() {
  $('#' + QPP + 'top').innerHTML = `<div class="crow"><label for="${QPP}maxi">Cel</label><select id="${QPP}maxi"><option value="0">minimalizuj</option><option value="1">maksymalizuj</option></select><label for="${QPP}n">Liczba zmiennych</label><select id="${QPP}n">${Array.from({length: QP_MAXN}, (_, k) => `<option>${k + 1}</option>`).join('')}</select></div>
    ${netCopyHTML(QPP)}<h4>Funkcja celu f(x) = ½·xᵀQx + cᵀx</h4><div id="${QPP}Q"></div>
    <p class="hint">Jak wpisać wielomian: na przekątnej Q<sub>ii</sub> = 2 × współczynnik przy x<sub>i</sub>², poza przekątną Q<sub>ij</sub> = Q<sub>ji</sub> = współczynnik przy x<sub>i</sub>x<sub>j</sub>; c – współczynniki części liniowej. Np. 4x₁x₂ − 2x₁² daje Q₁₁ = −4, Q₁₂ = Q₂₁ = 4.</p>
    <h4>Ograniczenia liniowe (zmienne x ≥ 0)</h4><div id="${QPP}cons"></div><div id="${QPP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(QPP, QP_EXAMPLES)}</details>`;
  $('#' + QPP + 'n').onchange = () => { qpSync(); const n = +$('#' + QPP + 'n').value, Q = QPS.Q, names = Array.from({length: n}, (_, j) => 'x' + (j + 1));
    QPS.Q = {rn: names, cn: names.slice(), cells: Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => Q.cells[i]?.[j] ?? '0')), xr: Array.from({length: n}, (_, j) => Q.xr[j] ?? '0')}; QPS.n = n;
    QPS.cons.forEach(c => { for (let j = 0; j < n; j++) if (c['a' + j] === undefined) c['a' + j] = '0'; }); clearErr(); qpRender(); };
  $('#' + QPP + 'maxi').onchange = () => { qpSync(); };
  const top = $('#' + QPP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; qpSync(); QPS.cons.splice(+k, 1); clearErr(); qpRender(); });
  netToolsWire(QPP, {kind: 'qp', out: '#out-qp', examples: QP_EXAMPLES, normalize: qpNormalize, get: () => { qpSync(); return JSON.parse(JSON.stringify(QPS)); }, set: d => { QPS = d; qpRender(); },
    toCSV: d => { const q = v => String(v).replace('.', ','), xs = Array.from({length: d.n}, (_, j) => 'x' + (j + 1));
      return '\uFEFF' + [`cel;${d.maxi ? 'max' : 'min'}`, `zmienne;${d.n}`, '', ['Q', ...xs].join(';'), ...d.Q.cells.map((r, i) => [xs[i], ...r.map(q)].join(';')), ['c', ...d.Q.xr.map(q)].join(';'), '', ['Ograniczenie', ...xs, 'Znak', 'Prawa strona'].join(';'), ...d.cons.map((c, i) => ['O' + (i + 1), ...xs.map((_, j) => q(c['a' + j])), c.rel, q(c.b)].join(';'))].join('\r\n') + '\r\n'; },
    fromCSV: t => qpFromCSV(t)});
  $('#btn-qp').onclick = qpSolveUI;
  qpRender();
}
function qpFromCSV(text) {
  const d = {n: 0, maxi: false, Q: {cells: [], xr: []}, cons: []}; let sec = null; const num = (s, ln) => { const x = String(s ?? '').trim().replace(',', '.'); if (x === '' || !isFinite(Number(x))) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(Number(x)); };
  String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, k) => { if (!raw.trim()) return; const c = raw.split(';').map(s => s.trim()), ln = k + 1, key = c[0].toLowerCase();
    if (key === 'cel') d.maxi = c[1] === 'max'; else if (key === 'zmienne') d.n = +c[1]; else if (key === 'q') sec = 'Q'; else if (key === 'c') d.Q.xr = c.slice(1).map(v => num(v, ln)); else if (key === 'ograniczenie') sec = 'O';
    else if (sec === 'Q') d.Q.cells.push(c.slice(1).map(v => num(v, ln))); else if (sec === 'O') { const n = c.length - 3; d.cons.push({a: c.slice(1, n + 1).map(v => num(v, ln)), rel: c[n + 1], b: num(c[n + 2], ln), ...Object.fromEntries(c.slice(1, n + 1).map((v, j) => ['a' + j, num(v, ln)]))}); }
    else throw new Error(`wiersz ${ln}: nie rozpoznano danych (oczekiwane sekcje „Q;…”, „c;…”, „Ograniczenie;…”).`); });
  if (!d.Q.cells.length) throw new Error('brak macierzy Q w pliku.'); d.n = d.n || d.Q.cells.length; return d;
}
function qpRead() {
  clearErr(); qpSync();
  const out = '#out-qp', n = QPS.n, bad = [], num = (v, id) => { const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x) || Math.abs(x) > 1e9) { bad.push(id); return NaN; } return x; };
  const Q = QPS.Q.cells.map((r, i) => r.map((v, j) => num(v, `Mc${i}_${j}`))), c = QPS.Q.xr.map((v, j) => num(v, 'Mxr' + j)), A = QPS.cons.map((cc, i) => Array.from({length: n}, (_, j) => num(cc['a' + j], `ca${j}${i}`))), b = QPS.cons.map((cc, i) => num(cc.b, 'cb' + i));
  if (bad.length) return netFail(QPP, out, 'wpisz w zaznaczonych polach liczby.', bad);
  return {n, Q, c, A, rel: QPS.cons.map(cc => cc.rel), b, maxi: QPS.maxi};
}
function qpSolveUI() { const P = qpRead(); if (!P) return; const h = qpReportHTML(P); $('#out-qp').innerHTML = h; last.qp = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function qpPoly(Q, c) {                                                   // ½xᵀQx + cᵀx jako wielomian
  const n = c.length, terms = [], f = v => fmt(Math.round(v * 1e6) / 1e6), x = j => `x${sub(j + 1)}`;
  for (let i = 0; i < n; i++) { if (Q[i][i]) terms.push([Q[i][i] / 2, `${x(i)}²`]); for (let j = i + 1; j < n; j++) { const v = (Q[i][j] + Q[j][i]) / 2; if (v) terms.push([v, `${x(i)}${x(j)}`]); } }
  c.forEach((v, j) => { if (v) terms.push([v, x(j)]); });
  return terms.length ? terms.map(([v, t], k) => `${v < 0 ? (k ? ' − ' : '−') : (k ? ' + ' : '')}${Math.abs(v) === 1 ? '' : f(Math.abs(v))}${t}`).join('') : '0';
}
function qpReportHTML(P) {
  const R = qpSolve(P), S = R.prep, f = v => fmt(Math.round(v * 1e4) / 1e4), f6 = v => fmt(Math.round(v * 1e6) / 1e6), xs = j => `x${sub(j + 1)}`;
  let h = `<h3>Programowanie kwadratowe</h3><div class="formula">${P.maxi ? 'max' : 'min'} f(x) = ${qpPoly(P.Q, P.c)}</div>` + (P.A.length ? `<p>Ograniczenia: ${P.A.map((r, i) => `${r.map((v, j) => v ? `${v < 0 ? '−' : '+'}${Math.abs(v) === 1 ? '' : f(Math.abs(v))}${xs(j)}` : '').join(' ').replace(/^\+/, '') || '0'} ${sign(P.rel[i])} ${f(P.b[i])}`).join('; ')}; x ≥ 0.</p>` : '<p>Bez ograniczeń liniowych (tylko x ≥ 0).</p>');
  if (!S.sym) h += '<p class="note">Macierz Q nie była symetryczna – zastąpiliśmy ją (Q + Qᵀ)/2; funkcja celu się nie zmienia.</p>';
  h += `<h4>Krok 1. Wypukłość</h4><p>Wartości własne macierzy ${P.maxi ? '−Q (maksymalizujemy f, czyli minimalizujemy −f)' : 'Q'}: ${S.eig.map(f6).join('; ')}. ` +
    (!S.convex ? '<b>Jest wartość ujemna – zadanie nie jest wypukłe.</b></p>' : S.strict ? 'Wszystkie dodatnie – funkcja ściśle wypukła, więc punkt spełniający warunki KKT jest <b>jedynym minimum globalnym</b>.</p>' : 'Wszystkie nieujemne (jest zero) – funkcja wypukła, ale nie ściśle: minimum globalne istnieje (jeśli zadanie jest ograniczone), ale może nie być jedyne.</p>');
  if (R.status === 'nonconvex') return h + `<p class="msg">Zadanie jest niewypukłe – warunki KKT mogą mieć wiele rozwiązań (minima lokalne, punkty siodłowe), a metody programowania kwadratowego wypukłego nie gwarantują minimum globalnego. ${P.maxi ? 'Przy maksymalizacji funkcja celu musi być wklęsła. ' : ''}Do takich zadań użyj modułu Programowanie nieliniowe (wiele punktów startowych) albo sprawdź dane.</p>`;
  h += `<h4>Krok 2. Warunki KKT i zadanie komplementarności</h4><p class="hint">Dla zadania min ½xᵀQx + cᵀx przy Ax ≤ b, x ≥ 0 warunki Karusha-Kuhna-Tuckera to: Qx + c + Aᵀy − u = 0, Ax + v = b, x, y, u, v ≥ 0 oraz x<sub>j</sub>u<sub>j</sub> = 0, y<sub>i</sub>v<sub>i</sub> = 0 (komplementarność). To zadanie liniowe z warunkiem komplementarności, rozwiązywane algorytmem Lemkego: w = q + M·z, gdzie z = (x, y), w = (u, v), M = [[Q, Aᵀ], [−A, 0]], q = (c, b). ${S.A.length !== P.A.length ? 'Ograniczenia ≥ zapisujemy jako ≤ (mnożąc przez −1), a równości jako dwie nierówności.' : ''}</p>`;
  if (R.steps && R.steps.length) h += `<details class="adv"${R.steps.length <= 8 ? ' open' : ''}><summary>Kroki algorytmu Lemkego (${R.steps.length})</summary><div class="tw"><table><thead><tr><th>Krok</th><th>Wchodzi</th><th>Wychodzi</th><th>Baza i wartości</th></tr></thead>` +
    R.steps.map((s, k) => `<tr><td>${k}</td><td>${s.enter ? s.enter.replace(/(\d+)/, d => sub(d)) : '–'}</td><td>${s.leave ? s.leave.replace(/(\d+)/, d => sub(d)) : '–'}</td><td class="tl">${s.basis.map((nm, i) => `${nm.replace(/(\d+)/, d => sub(d))} = ${f(s.vals[i])}`).join(', ')}</td></tr>`).join('') +
    '</table></div><p class="hint">Na starcie do bazy wchodzi zmienna sztuczna z₀, a potem zawsze zmienna komplementarna do tej, która właśnie wyszła (x<sub>j</sub> ↔ u<sub>j</sub>, y<sub>i</sub> ↔ v<sub>i</sub>). Gdy z bazy wychodzi z₀, mamy rozwiązanie warunków KKT.</p></details>';
  if (R.status === 'infeasible') return h + '<p class="msg">Ograniczenia są sprzeczne – zadanie nie ma rozwiązań dopuszczalnych.</p>';
  if (R.status === 'unbounded') return h + `<p class="msg">Zadanie jest nieograniczone – funkcję celu można ${P.maxi ? 'zwiększać' : 'zmniejszać'} bez końca (Q jest tylko półokreślona i w pewnym kierunku f zmienia się liniowo). Dodaj ograniczenie.</p>`;
  if (R.status !== 'optimal') return h + '<p class="msg">Przekroczono limit kroków – wynik byłby niewiarygodny.</p>';
  h += `<h4>Krok 3. Rozwiązanie</h4><div class="formula">${R.x.map((v, j) => `${xs(j)} = <b>${f(v)}</b>`).join(', ')}; &nbsp; f(x) = <b>${f(R.obj)}</b></div>`;
  if (P.A.length) h += '<div class="tw"><table><thead><tr><th>Ograniczenie</th><th>Luz</th><th>Mnożnik Lagrange’a λ</th><th>Znaczenie</th></tr></thead>' +
    P.A.map((_, i) => `<tr><th>${i + 1}</th><td>${f(R.slack[i])}</td><td>${f(R.lam[i])}</td><td class="tl">${Math.abs(R.slack[i]) < 1e-7 ? `wiążące – zwiększenie prawej strony o 1 ${P.maxi ? 'zwiększy' : 'zmniejszy'} f o ok. ${f(Math.abs(R.lam[i]))}` : 'niewiążące – mnożnik 0'}</td></tr>`).join('') + '</table></div>';
  h += `<div class="tw"><table><thead><tr><th>Warunek KKT</th><th>Największe naruszenie</th></tr></thead><tr><th>Stacjonarność (gradient Lagrange’a)</th><td>${f6(R.kkt.stat)}</td></tr><tr><th>Dopuszczalność (Ax ≤ b, x ≥ 0)</th><td>${f6(R.kkt.primal)}</td></tr><tr><th>Nieujemność mnożników</th><td>${f6(R.kkt.dual)}</td></tr><tr><th>Komplementarność</th><td>${f6(R.kkt.comp)}</td></tr></table></div>`;
  h += `<div class="sum"><b>Wynik:</b> ${R.x.map((v, j) => `${xs(j)} = ${f(v)}`).join(', ')}, ${P.maxi ? 'największa' : 'najmniejsza'} wartość f = <b>${f(R.obj)}</b>. Warunki KKT spełnione${S.strict ? ' – to jedyne optimum globalne' : ' – to optimum globalne (może nie być jedyne, bo Q jest tylko półokreślona)'}.</div>`;
  if (P.n === 2) {
    const fn = (a, b2) => 0.5 * (P.Q[0][0] * a * a + (P.Q[0][1] + P.Q[1][0]) * a * b2 + P.Q[1][1] * b2 * b2) + P.c[0] * a + P.c[1] * b2, ints = P.A.flatMap((r, i) => [r[0] ? P.b[i] / r[0] : 0, r[1] ? P.b[i] / r[1] : 0]).filter(v => v > 0 && isFinite(v));
    const unc = S.strict ? LA.solve(P.Q.map(r => r.slice()), P.c.map(v => -v)) : null, X1 = Math.max(1, ...ints, R.x[0] * 1.6, unc ? Math.abs(unc[0]) * 1.2 : 0) * 1.1, Y1 = Math.max(1, ...ints, R.x[1] * 1.6, unc ? Math.abs(unc[1]) * 1.2 : 0) * 1.1;
    let poly = [[0, 0], [X1, 0], [X1, Y1], [0, Y1]];
    P.A.forEach((r, i) => { if (P.rel[i] === '=') return; const s = P.rel[i] === '<=' ? 1 : -1, g = p => s * (P.b[i] - r[0] * p[0] - r[1] * p[1]), o = []; poly.forEach((p, k) => { const q = poly[(k + 1) % poly.length], gp = g(p), gq = g(q); if (gp >= 0) o.push(p); if ((gp >= 0) !== (gq >= 0)) { const tt = gp / (gp - gq); o.push([p[0] + tt * (q[0] - p[0]), p[1] + tt * (q[1] - p[1])]); } }); poly = o; });
    h += '<h4>Poziomice funkcji celu (2 zmienne)</h4>' + VZ.contour(fn, {x0: 0, x1: X1, y0: 0, y1: Y1, levels: 14, poly, lines: P.A.map((r, i) => ({a: r[0], b: r[1], c: P.b[i], label: 'O' + (i + 1)})), points: [...(unc && (unc[0] >= 0 && unc[1] >= 0) && Math.hypot(unc[0] - R.x[0], unc[1] - R.x[1]) > 1e-6 ? [{x: unc[0], y: unc[1], label: 'bez ograniczeń', cls: 'u'}] : []), {x: R.x[0], y: R.x[1], label: 'optimum'}], title: 'Poziomice f'}) +
      '<p class="hint">Linie – poziomice f (elipsy dla funkcji ściśle wypukłej); zielony obszar – rozwiązania dopuszczalne. W optimum na brzegu poziomica jest styczna do wiążącego ograniczenia.</p>';
  }
  return h;
}
registerModule({id: 'qp', title: 'Programowanie kwadratowe', init: qpInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="5"/><ellipse cx="12" cy="12" rx="5" ry="2.5"/><path d="M3 20l18-16"/></svg>',
  html: '<div class="card"><div id="qp-top"></div><div><button id="btn-qp" type="button">Rozwiąż</button></div><div id="out-qp"></div></div>'});
