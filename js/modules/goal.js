/* ===== OptiLab – moduł Programowanie celowe =====
   Interfejs i raport dydaktyczny. Obliczenia: js/goal/goal-solver.js (LP: js/solver.js, cele całkowite: js/ilp-solver.js). */
const GPP = 'goal-', GP_MAXN = 10, GP_MAXG = 20;
const GP_TYPES = [['>=', '≥ co najmniej (niepożądany niedobór d⁻)'], ['<=', '≤ co najwyżej (niepożądany nadmiar d⁺)'], ['=', '= dokładnie (oba odchylenia)']], GP_REL = [['<=', '≤'], ['>=', '≥'], ['=', '=']];
const GP_METHODS = {lex: 'priorytety (cele P1 ważniejsze od P2, P2 od P3 …)', weighted: 'wagi (najmniejsza suma ważonych odchyleń)', minimax: 'minimax – najmniejsze największe odchylenie (zaawansowane)'};
const gpGoal = (name, a, type, b, P = 1, w = 1) => ({name, type, b: String(b), P: String(P), w: String(w), ...Object.fromEntries(a.map((v, j) => ['a' + j, String(v)]))});
const gpHard = (a, rel, b) => ({rel, b: String(b), ...Object.fromEntries(a.map((v, j) => ['a' + j, String(v)]))});
const GP_EXAMPLES = [
  {name: 'Beaver Creek Pottery (Taylor) – priorytety', data: {n: 2, method: 'lex', goals: [gpGoal('Robocizna – bez przestojów', [1, 2], '>=', 40, 1), gpGoal('Zysk co najmniej 1600', [40, 50], '>=', 1600, 2), gpGoal('Glina co najwyżej 120 kg', [4, 3], '<=', 120, 3), gpGoal('Robocizna – mało nadgodzin', [1, 2], '<=', 40, 4)], hard: []}},
  {name: 'Beaver Creek – wagi zamiast priorytetów', data: {n: 2, method: 'weighted', goals: [gpGoal('Robocizna – bez przestojów', [1, 2], '>=', 40, 1, 5), gpGoal('Zysk co najmniej 1600', [40, 50], '>=', 1600, 1, 1), gpGoal('Glina co najwyżej 120 kg', [4, 3], '<=', 120, 1, 2), gpGoal('Robocizna – mało nadgodzin', [1, 2], '<=', 40, 1, 1)], hard: []}},
  {name: 'Kampania reklamowa – 3 media, budżet twardy', data: {n: 3, method: 'lex', goals: [gpGoal('Zasięg ≥ 180 (tys. osób)', [20, 12, 6], '>=', 180, 1), gpGoal('Młodzi ≥ 60', [4, 8, 2], '>=', 60, 2), gpGoal('Najwyżej 4 emisje TV', [1, 0, 0], '<=', 4, 3), gpGoal('Prasa co najmniej 5 razy', [0, 0, 1], '>=', 5, 3)], hard: [gpHard([10, 4, 2], '<=', 120)]}},
  {name: 'Minimax – zrównoważone niedobory', data: {n: 2, method: 'minimax', goals: [gpGoal('Wyrób A ≥ 30', [1, 0], '>=', 30, 1, 1), gpGoal('Wyrób B ≥ 20', [0, 1], '>=', 20, 1, 1), gpGoal('Moc maszyny = 100', [2, 3], '=', 100, 1, 1)], hard: [gpHard([2, 3], '<=', 100)]}},
  {name: 'Obsada zmian – cele całkowitoliczbowe', data: {n: 2, method: 'weighted', int: true, goals: [gpGoal('Obsada rano ≥ 7,5 etatu', [1, 0.5], '>=', 7.5, 1, 3), gpGoal('Obsada po południu ≥ 5,5', [0.5, 1], '>=', 5.5, 1, 2), gpGoal('Koszt ≤ 40', [4, 3], '<=', 40, 1, 1)], hard: [gpHard([1, 1], '<=', 12)]}},
];
let GPS = gpNormalize(JSON.parse(JSON.stringify(GP_EXAMPLES[0].data)));
function gpNormalize(d) {
  if (!d || !Array.isArray(d.goals) || !d.goals.length) throw new Error('to nie jest zadanie programowania celowego (brak listy celów).');
  const n = Math.min(GP_MAXN, Math.max(1, +d.n || 2)); if (d.goals.length > GP_MAXG) throw new Error(`za dużo celów (${d.goals.length}) – maksimum to ${GP_MAXG}.`);
  const S = v => String(v ?? ''), coef = r => Object.fromEntries(Array.from({length: n}, (_, j) => ['a' + j, S(r['a' + j] ?? r.a?.[j] ?? '0')]));
  return {n, method: GP_METHODS[d.method] ? d.method : 'lex', int: !!d.int, norm: !!d.norm,
    goals: d.goals.map((g, i) => ({name: S(g.name || 'Cel ' + (i + 1)), type: ['>=', '<=', '='].includes(g.type) ? g.type : '>=', b: S(g.b), P: S(g.P ?? '1'), w: S(g.w ?? '1'), ...coef(g)})),
    hard: (Array.isArray(d.hard) ? d.hard : []).map(h => ({rel: ['<=', '>=', '='].includes(h.rel) ? h.rel : '<=', b: S(h.b), ...coef(h)}))};
}
const gpXcols = () => Array.from({length: GPS.n}, (_, j) => ({key: 'a' + j, label: 'x' + (j + 1), type: 'num'}));
const gpGCols = () => [{key: 'name', label: 'Cel', type: 'text'}, ...gpXcols(), {key: 'type', label: 'Rodzaj', type: 'sel', opts: GP_TYPES}, {key: 'b', label: 'Wartość docelowa', type: 'num'}, {key: 'P', label: 'Priorytet P', type: 'num'}, {key: 'w', label: 'Waga w', type: 'num'}];
const gpHCols = () => [...gpXcols(), {key: 'rel', label: 'Znak', type: 'sel', opts: GP_REL}, {key: 'b', label: 'Prawa strona', type: 'num'}];
function gpRender() {
  $('#' + GPP + 'n').value = GPS.n; $('#' + GPP + 'method').value = GPS.method; $('#' + GPP + 'int').checked = GPS.int; $('#' + GPP + 'norm').checked = GPS.norm;
  $('#' + GPP + 'goals').innerHTML = rowTableHTML(GPP + 'g', gpGCols(), GPS.goals, {addLabel: '+ cel', count: k => `${k} celów`});
  $('#' + GPP + 'hard').innerHTML = rowTableHTML(GPP + 'h', gpHCols(), GPS.hard, {addLabel: '+ ograniczenie twarde', count: k => `${k} ograniczeń twardych`});
  $('#' + GPP + 'gadd').onclick = () => { gpSync(); if (GPS.goals.length < GP_MAXG) GPS.goals.push({name: 'Cel ' + (GPS.goals.length + 1), type: '>=', b: '0', P: '1', w: '1', ...Object.fromEntries(Array.from({length: GPS.n}, (_, j) => ['a' + j, '0']))}); gpRender(); };
  $('#' + GPP + 'hadd').onclick = () => { gpSync(); GPS.hard.push({rel: '<=', b: '0', ...Object.fromEntries(Array.from({length: GPS.n}, (_, j) => ['a' + j, '0']))}); gpRender(); };
  $('#' + GPP + 'wbox').hidden = GPS.method === 'lex' ? false : false;
  matrixPolish($('#' + GPP + 'top'));
}
function gpSync() {
  if ($('#' + GPP + 'gname0')) GPS.goals = rowTableSync(GPP + 'g', gpGCols(), GPS.goals); GPS.hard = rowTableSync(GPP + 'h', gpHCols(), GPS.hard);
  GPS.method = $('#' + GPP + 'method').value; GPS.int = $('#' + GPP + 'int').checked; GPS.norm = $('#' + GPP + 'norm').checked;
}
function gpInit() {
  $('#' + GPP + 'top').innerHTML = `<div class="crow"><label for="${GPP}method">Metoda</label><select id="${GPP}method">${Object.entries(GP_METHODS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="crow"><label for="${GPP}n">Liczba zmiennych decyzyjnych</label><select id="${GPP}n">${Array.from({length: GP_MAXN}, (_, k) => `<option>${k + 1}</option>`).join('')}</select></div>
    ${netCopyHTML(GPP)}<h4>Cele</h4><div id="${GPP}goals"></div><p class="hint" id="${GPP}wbox">Priorytet: 1 – najważniejszy (przy metodzie priorytetów cele z niższym numerem są w pełni ważniejsze). Waga: względne znaczenie celów na tym samym poziomie (albo wszystkich – przy metodzie wag).</p>
    <h4>Ograniczenia twarde (muszą być spełnione – opcjonalnie)</h4><div id="${GPP}hard"></div><div id="${GPP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label class="chk"><input type="checkbox" id="${GPP}int"> zmienne decyzyjne całkowite (cele całkowitoliczbowe – metoda podziału i ograniczeń)</label></div>
     <div class="crow"><label class="chk"><input type="checkbox" id="${GPP}norm"> normalizuj odchylenia (liczone jako ułamek wartości docelowej – porównywalne cele o różnych jednostkach)</label></div>${netToolsHTML(GPP, GP_EXAMPLES)}</details>
    <p class="hint">Każdy cel zapisujemy jak ograniczenie, ale z odchyleniami: niedoborem d⁻ i nadmiarem d⁺. Zamiast żądać spełnienia wszystkich celów (co bywa niemożliwe), minimalizujemy niepożądane odchylenia.</p>`;
  $('#' + GPP + 'n').onchange = () => { gpSync(); GPS.n = +$('#' + GPP + 'n').value; const fit = r => { for (let j = 0; j < GPS.n; j++) if (r['a' + j] === undefined) r['a' + j] = '0'; }; GPS.goals.forEach(fit); GPS.hard.forEach(fit); clearErr(); gpRender(); };
  ['method', 'int', 'norm'].forEach(k => $('#' + GPP + k).onchange = () => { gpSync(); clearErr(); gpRender(); });
  const top = $('#' + GPP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; gpSync(); if (e.target.closest('#' + GPP + 'goals')) { if (GPS.goals.length > 1) GPS.goals.splice(+k, 1); } else GPS.hard.splice(+k, 1); clearErr(); gpRender(); });
  netToolsWire(GPP, {kind: 'goal', out: '#out-goal', examples: GP_EXAMPLES, normalize: gpNormalize, get: () => { gpSync(); return JSON.parse(JSON.stringify(GPS)); }, set: d => { GPS = d; gpRender(); },
    toCSV: d => { const q = v => String(v).replace('.', ','), xs = Array.from({length: d.n}, (_, j) => 'x' + (j + 1));
      return '\uFEFF' + [`metoda;${d.method}`, `zmienne;${d.n}`, `całkowite;${d.int ? 1 : 0}`, `normalizacja;${d.norm ? 1 : 0}`, '', ['Cel', ...xs, 'Rodzaj', 'Wartość docelowa', 'Priorytet', 'Waga'].join(';'),
        ...d.goals.map(g => [g.name, ...xs.map((_, j) => q(g['a' + j])), g.type, q(g.b), q(g.P), q(g.w)].join(';')), '', ['Ograniczenie', ...xs, 'Znak', 'Prawa strona'].join(';'),
        ...d.hard.map((h, i) => ['O' + (i + 1), ...xs.map((_, j) => q(h['a' + j])), h.rel, q(h.b)].join(';'))].join('\r\n') + '\r\n'; },
    fromCSV: t => gpFromCSV(t)});
  $('#btn-goal').onclick = gpSolveUI;
  gpRender();
}
function gpFromCSV(text) {
  const d = {n: 2, method: 'lex', goals: [], hard: []}; let sec = null, n = 0; const num = (s, ln) => { const x = String(s ?? '').trim().replace(',', '.'); if (x === '' || !isFinite(Number(x))) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(Number(x)); };
  String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, k) => { if (!raw.trim()) return; const c = raw.split(';').map(s => s.trim()), ln = k + 1, key = c[0].toLowerCase();
    if (key === 'metoda') d.method = c[1]; else if (key === 'zmienne') d.n = +c[1]; else if (key === 'całkowite') d.int = c[1] === '1'; else if (key === 'normalizacja') d.norm = c[1] === '1';
    else if (key === 'cel') { sec = 'g'; n = c.length - 5; } else if (key === 'ograniczenie') { sec = 'h'; n = c.length - 3; }
    else if (sec === 'g') { if (c.length !== n + 5) throw new Error(`wiersz ${ln}: oczekiwano ${n + 5} kolumn.`); if (!['>=', '<=', '='].includes(c[n + 1])) throw new Error(`wiersz ${ln}: rodzaj celu musi być ≥ (>=), ≤ (<=) albo =.`);
      d.goals.push({name: c[0], a: c.slice(1, n + 1).map(v => num(v, ln)), type: c[n + 1], b: num(c[n + 2], ln), P: num(c[n + 3], ln), w: num(c[n + 4], ln)}); }
    else if (sec === 'h') { d.hard.push({a: c.slice(1, n + 1).map(v => num(v, ln)), rel: c[n + 1], b: num(c[n + 2], ln)}); }
    else throw new Error(`wiersz ${ln}: nie rozpoznano danych (oczekiwane nagłówki „Cel;…” i „Ograniczenie;…”).`); });
  if (!d.goals.length) throw new Error('brak celów w pliku.'); return d;
}
function gpRead() {
  clearErr(); gpSync();
  const out = '#out-goal', n = GPS.n, bad = [], num = (v, id) => { const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x) || Math.abs(x) > 1e12) { bad.push(id); return NaN; } return x; };
  const goals = GPS.goals.map((g, i) => ({name: String(g.name).trim() || 'Cel ' + (i + 1), type: g.type, a: Array.from({length: n}, (_, j) => num(g['a' + j], `ga${j}${i}`)), b: num(g.b, 'gb' + i), P: num(g.P, 'gP' + i), w: num(g.w, 'gw' + i)}));
  const hard = GPS.hard.map((h, i) => ({rel: h.rel, a: Array.from({length: n}, (_, j) => num(h['a' + j], `ha${j}${i}`)), b: num(h.b, 'hb' + i)}));
  if (bad.length) return netFail(GPP, out, 'wpisz w zaznaczonych polach liczby.', bad);
  goals.forEach((g, i) => { if (!(Number.isInteger(g.P) && g.P >= 1 && g.P <= 20)) bad.push('gP' + i); if (!(g.w > 0)) bad.push('gw' + i); });
  if (bad.length) return netFail(GPP, out, 'priorytet: liczba całkowita od 1 do 20; waga: liczba dodatnia.', bad);
  const zero = goals.map((g, i) => g.a.every(v => v === 0) ? 'gname' + i : null).filter(Boolean); if (zero.length) return netFail(GPP, out, 'cel musi zależeć od co najmniej jednej zmiennej (same zera we współczynnikach).', zero);
  return {n, goals, hard, int: GPS.int, norm: GPS.norm, method: GPS.method};
}
function gpSolveUI() { const P = gpRead(); if (!P) return; const h = gpReportHTML(P); $('#out-goal').innerHTML = h; last.goal = h; }
/* rysunek dla 2 zmiennych: linie celów (przerywane), ograniczenia twarde i obszar dopuszczalny, rozwiązanie */
function gpChartSVG(P, x) {
  const lines = [...P.goals.map((g, i) => ({a: g.a, b: g.b, cls: 'goal', lbl: 'C' + (i + 1)})), ...P.hard.map((h, i) => ({a: h.a, b: h.b, rel: h.rel, cls: 'hard', lbl: 'O' + (i + 1)}))];
  const ints = lines.flatMap(l => [l.a[0] ? l.b / l.a[0] : 0, l.a[1] ? l.b / l.a[1] : 0]).filter(v => v > 0 && isFinite(v));
  const X = Math.max(1, ...ints, x[0]) * 1.15, Y = Math.max(1, ...ints, x[1]) * 1.15, W = 460, H = 380, L = 46, B = 34, T = 12, R = 14;
  const px = v => L + (W - L - R) * v / X, py = v => H - B - (H - B - T) * v / Y, r1 = v => Math.round(v * 10) / 10;
  let poly = [[0, 0], [X, 0], [X, Y], [0, Y]];
  P.hard.filter(h => h.rel !== '=').forEach(h => { const s = h.rel === '<=' ? 1 : -1, f = p => s * (h.b - h.a[0] * p[0] - h.a[1] * p[1]), out = [];
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length], fp = f(p), fq = f(q); if (fp >= 0) out.push(p); if ((fp >= 0) !== (fq >= 0)) { const tt = fp / (fp - fq); out.push([p[0] + tt * (q[0] - p[0]), p[1] + tt * (q[1] - p[1])]); } }); poly = out; });
  let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
  if (poly.length > 2) s += `<path class="gpreg" d="M${poly.map(p => r1(px(p[0])) + ' ' + r1(py(p[1]))).join('L')}Z"/>`;
  lines.forEach((l, k) => { const pts = []; if (Math.abs(l.a[1]) > 1e-12) { [0, X].forEach(u => pts.push([u, (l.b - l.a[0] * u) / l.a[1]])); } else if (Math.abs(l.a[0]) > 1e-12) pts.push([l.b / l.a[0], 0], [l.b / l.a[0], Y]);
    if (pts.length === 2) { s += `<line class="gpl ${l.cls}" x1="${r1(px(pts[0][0]))}" y1="${r1(py(pts[0][1]))}" x2="${r1(px(pts[1][0]))}" y2="${r1(py(pts[1][1]))}"/>`;
      const lx = Math.abs(l.a[1]) > 1e-12 ? Math.min(X * 0.92, Math.max(X * 0.05, l.a[0] ? (l.b - l.a[1] * Y * 0.85) / l.a[0] : X * 0.1 + k * X * 0.08)) : pts[0][0], ly = Math.abs(l.a[1]) > 1e-12 ? (l.b - l.a[0] * lx) / l.a[1] : Y * (0.9 - k * 0.07);
      if (ly >= 0 && ly <= Y) s += `<text class="vzt b" x="${r1(px(lx) + 4)}" y="${r1(py(ly) - 4)}">${l.lbl}</text>`; } });
  VZ.ticks(0, X, 6).forEach(v => { if (v <= X) s += `<text class="vzt" x="${r1(px(v))}" y="${H - B + 14}" text-anchor="middle">${fmt(v)}</text>`; });
  VZ.ticks(0, Y, 6).forEach(v => { if (v <= Y) s += `<text class="vzt" x="${L - 6}" y="${r1(py(v) + 4)}" text-anchor="end">${fmt(v)}</text>`; });
  s += `<circle class="vzmark" cx="${r1(px(x[0]))}" cy="${r1(py(x[1]))}" r="7"/><text class="vzt b" x="${r1(px(x[0]) + 10)}" y="${r1(py(x[1]) + 14)}">(${fmt(Math.round(x[0] * 100) / 100)}; ${fmt(Math.round(x[1] * 100) / 100)})</text>`;
  s += `<text class="vzt" x="${W - R}" y="${H - 4}" text-anchor="end">x₁</text><text class="vzt" x="${L + 4}" y="${T + 10}">x₂</text>`;
  return `<div class="tw"><svg class="vzsvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="Wykres celów">${s}</svg></div>`;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function gpReportHTML(P) {
  const R = gpSolve(P, P.method), f = v => fmt(Math.round(v * 10000) / 10000), xs = j => `x${sub(j + 1)}`, d = (s, i) => `d${sub(i + 1)}<sup>${s}</sup>`;
  const lhs = a => a.map((v, j) => v ? `${v < 0 ? '− ' : '+ '}${Math.abs(v) === 1 ? '' : f(Math.abs(v))}${xs(j)}` : '').filter(Boolean).join(' ').replace(/^\+ /, '').replace(/^− /, '−'), gn = i => esc(P.goals[i].name);
  const undes = (g, i) => g.type === '>=' ? d('−', i) : g.type === '<=' ? d('+', i) : `${d('−', i)} + ${d('+', i)}`, w = (g, i) => `${g.w === 1 ? '' : f(g.w) + '·'}${P.norm ? `(${undes(g, i)})/${f(Math.abs(g.b))}` : undes(g, i)}`;
  let h = `<h3>Programowanie celowe – ${GP_METHODS[P.method].split(' (')[0]}</h3><p class="hint">Każdy cel to równanie z odchyleniami: d<sup>−</sup> – niedobór (wynik poniżej wartości docelowej), d<sup>+</sup> – nadmiar (powyżej). Odchylenia są nieujemne; w rozwiązaniu co najwyżej jedno z pary jest dodatnie. Minimalizujemy tylko odchylenia niepożądane.</p>`;
  h += '<div class="tw"><table><thead><tr><th>Cel</th><th>Równanie celu</th><th>Minimalizujemy</th>' + (P.method === 'lex' ? '<th>Priorytet</th>' : '') + '<th>Waga</th></tr></thead>' +
    P.goals.map((g, i) => `<tr><th>${gn(i)}</th><td class="tl">${lhs(g.a)} + ${d('−', i)} − ${d('+', i)} = ${f(g.b)}</td><td>${undes(g, i)}</td>${P.method === 'lex' ? `<td>P${g.P}</td>` : ''}<td>${f(g.w)}</td></tr>`).join('') + '</table></div>';
  if (P.hard.length) h += `<p>Ograniczenia twarde (muszą być spełnione): ${P.hard.map(hh => `${lhs(hh.a)} ${sign(hh.rel)} ${f(hh.b)}`).join('; ')}.</p>`;
  if (P.method === 'lex') { const lv = [...new Set(P.goals.map(g => g.P))].sort((a, b) => a - b);
    h += `<div class="formula">min ${lv.map(L => `P${L}·(${P.goals.map((g, i) => g.P === L ? w(g, i) : null).filter(Boolean).join(' + ')})`).join(' + ')}</div><p class="hint">Priorytety rozwiązujemy po kolei: najpierw minimalizujemy odchylenia P1; osiągniętej wartości nie wolno potem pogorszyć. Następnie P2 itd. Każdy poziom to osobne zadanie LP rozwiązane naszym simpleksem.</p>`; }
  else if (P.method === 'weighted') h += `<div class="formula">min ${P.goals.map((g, i) => w(g, i)).join(' + ')}</div><p class="hint">Wszystkie odchylenia trafiają do jednej funkcji celu; wagi wyrażają, ile „kosztuje” jednostka odchylenia od danego celu. Wynik zależy od skali celów – przy różnych jednostkach warto włączyć normalizację.</p>`;
  else h += '<div class="formula">min D &nbsp; przy &nbsp; w<sub>i</sub>·(niepożądane odchylenie celu i) ≤ D dla każdego celu</div><p class="hint">Minimax nie pozwala „poświęcić” jednego celu dla reszty – minimalizuje największe (ważone) odchylenie, więc rozkłada niedobory równomiernie.</p>';
  if (R.status !== 'optimal') return h + `<p class="msg">${R.status === 'infeasible' ? 'Ograniczenia twarde są sprzeczne – nie istnieje żadne dopuszczalne rozwiązanie (cele nigdy nie powodują sprzeczności, bo odchylenia ją pochłaniają).' : 'Obliczenia przerwano (limit) – wynik byłby niewiarygodny.'}</p>`;
  if (P.method === 'lex') h += '<h4>Kolejne priorytety</h4><div class="tw"><table><thead><tr><th>Krok</th><th>Poziom</th><th>Cele</th><th>Najmniejsza suma odchyleń</th><th>Wynik</th></tr></thead>' +
    R.stages.map((s, k) => `<tr><td>${k + 1}</td><td>P${s.L}</td><td class="tl">${s.goals.map(gn).join(', ')}</td><td>${f(s.z)}</td><td>${s.z <= 1e-9 ? 'cele w pełni osiągnięte – odchylenia ustalamy na 0' : 'osiągnięcie zachowujemy w dalszych krokach'}</td></tr>`).join('') + '</table></div>';
  h += `<h4>Rozwiązanie</h4><div class="formula">${R.x.map((v, j) => `${xs(j)} = <b>${f(v)}</b>`).join(', ')}${P.int ? ' (zmienne całkowite)' : ''}</div>`;
  h += '<div class="tw"><table><thead><tr><th>Cel</th><th>Wartość docelowa</th><th>Osiągnięto</th><th>d<sup>−</sup> (niedobór)</th><th>d<sup>+</sup> (nadmiar)</th><th>Ocena</th></tr></thead>' +
    R.ach.map((a, i) => { const g = P.goals[i]; return `<tr${a.ok ? '' : ' class="late"'}><th>${gn(i)}</th><td>${sign(g.type)} ${f(g.b)}</td><td>${f(a.val)}</td><td>${f(a.dm)}</td><td>${f(a.dp)}</td><td>${a.ok ? '✓ osiągnięty' : `✗ ${a.dm > a.dp ? 'niedobór ' + f(a.dm) : 'nadmiar ' + f(a.dp)}`}</td></tr>`; }).join('') + '</table></div>';
  const miss = R.ach.filter(a => !a.ok);
  h += `<div class="sum"><b>Wynik:</b> ${miss.length ? `osiągnięto ${R.ach.length - miss.length} z ${R.ach.length} celów; nie udało się: ${miss.map(a => `${gn(a.i)} (${a.dm > a.dp ? 'brakuje ' + f(a.dm) : 'przekroczono o ' + f(a.dp)})`).join(', ')}.` : 'wszystkie cele osiągnięte.'}${P.method === 'lex' && miss.length ? ' Cele o wyższym priorytecie mają pierwszeństwo – ich spełnienie wymusiło odchylenia celów niższych.' : ''}</div>`;
  if (P.n === 2) h += '<h4>Rysunek (2 zmienne)</h4>' + gpChartSVG(P, R.x) + '<p class="hint">Przerywane linie – cele (C1, C2, …), ciągłe – ograniczenia twarde (O1, …); zacieniony obszar – rozwiązania dopuszczalne; punkt – rozwiązanie.</p>';
  return h;
}
registerModule({id: 'goal', title: 'Programowanie celowe', init: gpInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  html: '<div class="card"><div id="goal-top"></div><div><button id="btn-goal" type="button">Rozwiąż</button></div><div id="out-goal"></div></div>'});
