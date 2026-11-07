/* ===== OptiLab – moduł Analiza decyzji =====
   Interfejs i raport dydaktyczny. Obliczenia: js/dec/decision-solver.js (gry – solverem LP z js/solver.js). */
const DCP = 'dec-', DC_MAX = 10, DC_TMAX = 60;
const DC_MODES = {table: 'tabela wypłat – kryteria decyzyjne', tree: 'drzewo decyzyjne', bayes: 'twierdzenie Bayesa i wartość informacji (EVSI)', game: 'gra dwuosobowa o sumie zerowej (zaawansowane)'};
const DC_TCOLS = [{key: 'name', label: 'Węzeł', type: 'name'}, {key: 'type', label: 'Rodzaj', type: 'sel', opts: [['D', 'decyzyjny □'], ['L', 'losowy ○'], ['K', 'końcowy ◁']]},
  {key: 'parent', label: 'Rodzic (puste = korzeń)', type: 'text'}, {key: 'prob', label: 'Prawdopodobieństwo gałęzi', type: 'num', blank: true}, {key: 'value', label: 'Wartość (wypłata / przepływ na gałęzi)', type: 'num', blank: true}];
const dcMat = (rn, cn, cells, xr) => ({rn, cn, cells: cells.map(r => r.map(String)), ...(xr ? {xr: xr.map(String)} : {})});
const dcNode = (name, type, parent, prob = '', value = '') => ({name, type, parent, prob: String(prob), value: String(value)});
const DC_TL = dcMat(['Duży zakład', 'Mały zakład', 'Nic nie robić'], ['Rynek korzystny', 'Rynek niekorzystny'], [[200000, -180000], [100000, -20000], [0, 0]], [0.5, 0.5]);
const dcEx = (name, d) => ({name, data: {kind: 'profit', alpha: '0.5', useP: true, util: false, R: '', st: DC_TL, like: dcMat(['Wynik pozytywny', 'Wynik negatywny'], DC_TL.cn, [[0.7, 0.2], [0.3, 0.8]]), infoCost: '10000',
  tree: [dcNode('Start', 'D', '')], game: dcMat(['A1', 'A2'], ['B1', 'B2', 'B3'], [[3, -1, 2], [-2, 4, 1]]), ...d}});
const TLtree = [dcNode('Decyzja', 'D', ''), dcNode('Bez badania', 'D', 'Decyzja'), dcNode('Duży (bez badania)', 'L', 'Bez badania'), dcNode('Korzystny 1', 'K', 'Duży (bez badania)', 0.5, 200000), dcNode('Niekorzystny 1', 'K', 'Duży (bez badania)', 0.5, -180000),
  dcNode('Mały (bez badania)', 'L', 'Bez badania'), dcNode('Korzystny 2', 'K', 'Mały (bez badania)', 0.5, 100000), dcNode('Niekorzystny 2', 'K', 'Mały (bez badania)', 0.5, -20000), dcNode('Nic (bez badania)', 'K', 'Bez badania', '', 0),
  dcNode('Badanie rynku', 'L', 'Decyzja', '', -10000), dcNode('Wynik +', 'D', 'Badanie rynku', 0.45), dcNode('Duży (+)', 'L', 'Wynik +'), dcNode('Korzystny 3', 'K', 'Duży (+)', 0.7778, 200000), dcNode('Niekorzystny 3', 'K', 'Duży (+)', 0.2222, -180000),
  dcNode('Mały (+)', 'L', 'Wynik +'), dcNode('Korzystny 4', 'K', 'Mały (+)', 0.7778, 100000), dcNode('Niekorzystny 4', 'K', 'Mały (+)', 0.2222, -20000), dcNode('Nic (+)', 'K', 'Wynik +', '', 0),
  dcNode('Wynik −', 'D', 'Badanie rynku', 0.55), dcNode('Duży (−)', 'L', 'Wynik −'), dcNode('Korzystny 5', 'K', 'Duży (−)', 0.2727, 200000), dcNode('Niekorzystny 5', 'K', 'Duży (−)', 0.7273, -180000),
  dcNode('Mały (−)', 'L', 'Wynik −'), dcNode('Korzystny 6', 'K', 'Mały (−)', 0.2727, 100000), dcNode('Niekorzystny 6', 'K', 'Mały (−)', 0.7273, -20000), dcNode('Nic (−)', 'K', 'Wynik −', '', 0)];
const DC_EXAMPLES = [
  dcEx('Thompson Lumber – kryteria i EMV (Render i Stair)', {mode: 'table', alpha: '0.8'}),
  dcEx('Wybór dostawcy – tabela kosztów', {mode: 'table', kind: 'cost', alpha: '0.3', st: dcMat(['Dostawca A', 'Dostawca B', 'Dostawca C'], ['Popyt niski', 'Popyt średni', 'Popyt wysoki'], [[42, 55, 80], [50, 52, 61], [58, 58, 58]], [0.3, 0.5, 0.2])}),
  dcEx('Thompson Lumber – drzewo z badaniem rynku', {mode: 'tree', tree: TLtree}),
  dcEx('Thompson Lumber – Bayes i wartość badania (EVSI)', {mode: 'bayes'}),
  dcEx('Postawa wobec ryzyka – użyteczność wykładnicza', {mode: 'table', util: true, R: '100000'}),
  dcEx('Gra 2×3 – strategie mieszane (metoda graficzna)', {mode: 'game'}),
  dcEx('Gra 3×3 z punktem siodłowym', {mode: 'game', game: dcMat(['A1', 'A2', 'A3'], ['B1', 'B2', 'B3'], [[3, 1, 4], [2, -1, 0], [5, 0, 6]])}),
];
let DC = dcNormalize(JSON.parse(JSON.stringify(DC_EXAMPLES[0].data)));
function dcNormalize(d) {
  if (!d || !DC_MODES[d.mode]) throw new Error('to nie jest zadanie z modułu Analiza decyzji (nieznany tryb).');
  const mat = (m, def, xr) => { const s = m && Array.isArray(m.cells) && m.cells.length ? m : def; const R = Math.min(DC_MAX, s.cells.length), C = Math.min(DC_MAX, s.cells[0].length);
    return {rn: Array.from({length: R}, (_, i) => String(s.rn?.[i] ?? 'D' + (i + 1))), cn: Array.from({length: C}, (_, j) => String(s.cn?.[j] ?? 'S' + (j + 1))), cells: Array.from({length: R}, (_, i) => Array.from({length: C}, (_, j) => String(s.cells[i]?.[j] ?? '0'))), ...(xr ? {xr: Array.from({length: C}, (_, j) => String(s.xr?.[j] ?? ''))} : {})}; };
  const ex = DC_EXAMPLES[0].data;
  return {mode: d.mode, kind: d.kind === 'cost' ? 'cost' : 'profit', alpha: String(d.alpha ?? '0.5'), useP: d.useP !== false, util: !!d.util, R: String(d.R ?? ''), infoCost: String(d.infoCost ?? ''),
    st: mat(d.st, ex.st, true), like: mat(d.like, ex.like), game: mat(d.game, ex.game), tree: (Array.isArray(d.tree) && d.tree.length ? d.tree : ex.tree).slice(0, DC_TMAX).map(x => dcNode(String(x.name ?? ''), ['D', 'L', 'K'].includes(x.type) ? x.type : 'K', String(x.parent ?? ''), x.prob ?? '', x.value ?? ''))};
}
const dcSizeSel = (id, n, lo, label) => `<label for="${DCP}${id}">${label}</label><select id="${DCP}${id}">${Array.from({length: DC_MAX - lo + 1}, (_, k) => `<option${k + lo === n ? ' selected' : ''}>${k + lo}</option>`).join('')}</select>`;
function dcRender() {
  const m = DC.mode, box = $('#' + DCP + 'body'); $('#' + DCP + 'mode').value = m;
  if (m === 'tree') { box.innerHTML = `<div class="crow"><label for="${DCP}kind">Wartości to</label><select id="${DCP}kind"><option value="profit">zyski (maksymalizujemy)</option><option value="cost">koszty (minimalizujemy)</option></select></div>` +
      rowTableHTML(DCP + 't', DC_TCOLS, DC.tree, {addLabel: '+ węzeł', count: n => `${n} węzłów`}) + '<p class="hint">Każdy wiersz to węzeł i gałąź, która do niego prowadzi od rodzica. Gałęzie węzła losowego mają prawdopodobieństwa (suma 1). Wartość gałęzi to np. koszt badania (ujemna), a w węźle końcowym – wypłata.</p>';
    $('#' + DCP + 'tadd').onclick = () => { dcSync(); if (DC.tree.length < DC_TMAX) DC.tree.push(dcNode('W' + (DC.tree.length + 1), 'K', DC.tree[0]?.name || '')); dcRender(); }; }
  else if (m === 'game') box.innerHTML = `<div class="crow">${dcSizeSel('gr', DC.game.rn.length, 2, 'Strategie gracza A')}${dcSizeSel('gc', DC.game.cn.length, 2, 'Strategie gracza B')}</div>` +
      matrixHTML(DCP + 'G', DC.game, {corner: 'A \\ B', noMsg: true}) + '<p class="hint">W komórce – wypłata gracza A (wiersze) od gracza B (kolumny). Gracz A maksymalizuje, B minimalizuje.</p>';
  else { box.innerHTML = `<div class="crow"><label for="${DCP}kind">Wartości to</label><select id="${DCP}kind"><option value="profit">zyski (maksymalizujemy)</option><option value="cost">koszty (minimalizujemy)</option></select>` +
      `${dcSizeSel('sr', DC.st.rn.length, 2, 'Decyzje')}${dcSizeSel('sc', DC.st.cn.length, 2, 'Stany natury')}</div>` + matrixHTML(DCP + 'S', DC.st, {corner: 'decyzja \\ stan', noMsg: true, xrLabel: 'Prawdopodobieństwa'}) +
      (m === 'table' ? `<div class="crow pfr"><label for="${DCP}alpha">Współczynnik optymizmu Hurwicza α</label><input class="num" data-num id="${DCP}alpha" value="${esc(DC.alpha)}"><span class="hint">od 0 do 1</span></div><p class="hint">Prawdopodobieństwa można zostawić puste – wtedy liczymy tylko kryteria bez prawdopodobieństw.</p>` :
        `<h4>Wiarygodność badania: P(wynik | stan)</h4><div class="crow">${dcSizeSel('lr', DC.like.rn.length, 2, 'Możliwe wyniki badania')}</div>` + matrixHTML(DCP + 'L', {...DC.like, cn: DC.st.cn}, {corner: 'wynik \\ stan', noMsg: true, staticCols: true}) +
        `<div class="crow pfr"><label for="${DCP}infoCost">Koszt badania (informacji)</label><input class="num" data-num data-blank id="${DCP}infoCost" value="${esc(DC.infoCost)}"></div><p class="hint">W każdej kolumnie prawdopodobieństwa wyników muszą sumować się do 1.</p>`); }
  const kd = $('#' + DCP + 'kind'); if (kd) kd.value = DC.kind;
  ['sr', 'sc', 'gr', 'gc', 'lr'].forEach(id => { const el = $('#' + DCP + id); if (el) el.onchange = () => { dcSync(); dcResize(id, +el.value); clearErr(); dcRender(); }; });
  $('#' + DCP + 'util').checked = DC.util; $('#' + DCP + 'R').value = DC.R; $('#' + DCP + 'utilbox').hidden = m !== 'table';
  matrixPolish($('#' + DCP + 'top'));
}
function dcResize(id, n) {
  const fit = (mm, R, C, def) => { mm.rn = Array.from({length: R}, (_, i) => mm.rn[i] ?? def + (i + 1)); mm.cn = Array.from({length: C}, (_, j) => mm.cn[j] ?? 'S' + (j + 1)); mm.cells = Array.from({length: R}, (_, i) => Array.from({length: C}, (_, j) => mm.cells[i]?.[j] ?? '0')); if (mm.xr) mm.xr = Array.from({length: C}, (_, j) => mm.xr[j] ?? ''); };
  if (id === 'sr') fit(DC.st, n, DC.st.cn.length, 'D'); if (id === 'sc') { fit(DC.st, DC.st.rn.length, n, 'D'); fit(DC.like, DC.like.rn.length, n, 'W'); }
  if (id === 'lr') fit(DC.like, n, DC.st.cn.length, 'W'); if (id === 'gr') fit(DC.game, n, DC.game.cn.length, 'A'); if (id === 'gc') { fit(DC.game, DC.game.rn.length, n, 'A'); DC.game.cn = DC.game.cn.map((v, j) => /^S\d+$/.test(v) ? 'B' + (j + 1) : v); }
}
function dcSync() {
  const m = DC.mode, kd = $('#' + DCP + 'kind'); if (kd) DC.kind = kd.value;
  if (m === 'tree' && $('#' + DCP + 'tname0')) DC.tree = rowTableSync(DCP + 't', DC_TCOLS, DC.tree);
  if (m === 'game' && $('#' + DCP + 'G')) matrixSync(DCP + 'G', DC.game);
  if ((m === 'table' || m === 'bayes') && $('#' + DCP + 'S')) matrixSync(DCP + 'S', DC.st);
  if (m === 'bayes' && $('#' + DCP + 'L')) { const L = {...DC.like, cn: DC.st.cn}; matrixSync(DCP + 'L', L); DC.like.rn = L.rn; DC.like.cells = L.cells; }
  const a = $('#' + DCP + 'alpha'); if (a) DC.alpha = a.value; const ic = $('#' + DCP + 'infoCost'); if (ic) DC.infoCost = ic.value;
  DC.util = $('#' + DCP + 'util').checked; DC.R = $('#' + DCP + 'R').value;
}
function dcInit() {
  $('#' + DCP + 'top').innerHTML = `<div class="crow"><label for="${DCP}mode">Rodzaj zadania</label><select id="${DCP}mode">${Object.entries(DC_MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(DCP)}<div id="${DCP}body"></div><div id="${DCP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div id="${DCP}utilbox"><div class="crow"><label class="chk"><input type="checkbox" id="${DCP}util"> funkcja użyteczności wykładnicza U(x) = 1 − e<sup>−x/R</sup></label></div>
     <div class="crow pfr"><label for="${DCP}R">Tolerancja ryzyka R</label><input class="num" data-num data-blank id="${DCP}R"><span class="hint">większe R – mniejsza niechęć do ryzyka</span></div></div>${netToolsHTML(DCP, DC_EXAMPLES)}</details>
    <p class="hint">Tabela wypłat: wiersze – decyzje, kolumny – stany natury (np. sytuacja na rynku). Program porówna kryteria i wskaże najlepszą decyzję.</p>`;
  $('#' + DCP + 'mode').onchange = () => { dcSync(); DC.mode = $('#' + DCP + 'mode').value; clearErr(); dcRender(); };
  const top = $('#' + DCP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined || DC.mode !== 'tree') return; dcSync(); if (DC.tree.length > 1) DC.tree.splice(+k, 1); clearErr(); dcRender(); });
  netToolsWire(DCP, {kind: 'decision', out: '#out-dec', examples: DC_EXAMPLES, normalize: dcNormalize, get: () => { dcSync(); return JSON.parse(JSON.stringify(DC)); }, set: d => { DC = d; dcRender(); },
    toCSV: d => dcToCSV(d), fromCSV: t => dcFromCSV(t)});
  $('#btn-dec').onclick = dcSolveUI;
  dcRender();
}
function dcToCSV(d) {
  const q = s => String(s).replace('.', ','), mat = (m, head, xr) => [[head, ...m.cn].join(';'), ...m.rn.map((r, i) => [r, ...m.cells[i].map(q)].join(';')), ...(xr && m.xr ? [['Prawdopodobieństwa', ...m.xr.map(q)].join(';')] : [])];
  const L = [`tryb;${d.mode}`, `rodzaj;${d.kind}`];
  if (d.mode === 'tree') return rowsToCSV(DC_TCOLS, d.tree, [['tryb', 'tree'], ['rodzaj', d.kind]]);
  if (d.mode === 'game') L.push(...mat(d.game, 'Gracz A'));
  else { L.push(`alfa;${q(d.alpha)}`, ...mat(d.st, 'Decyzja', true)); if (d.mode === 'bayes') L.push(...mat({...d.like, cn: d.st.cn}, 'Wynik badania'), `koszt informacji;${q(d.infoCost)}`); }
  return '\uFEFF' + L.join('\r\n') + '\r\n';
}
function dcFromCSV(text) {
  const T = String(text).replace(/^\uFEFF/, ''); if (/^tryb;tree/m.test(T) && /W[ęe]ze[łl];/.test(T)) { const r = rowsFromCSV(T, DC_TCOLS, ['tryb', 'rodzaj']); return {mode: 'tree', kind: r.meta.rodzaj === 'cost' ? 'cost' : 'profit', tree: r.rows}; }
  const d = {mode: 'table', kind: 'profit'}; let sec = null, cur = null; const num = (s, ln) => { const x = String(s ?? '').trim().replace(',', '.'); if (x === '') return ''; if (!isFinite(Number(x))) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(Number(x)); };
  String(T).split(/\r?\n/).forEach((raw, k) => { if (!raw.trim()) return; const c = raw.split(';').map(s => s.trim()), ln = k + 1, key = c[0].toLowerCase();
    if (key === 'tryb') d.mode = c[1]; else if (key === 'rodzaj') d.kind = c[1]; else if (key === 'alfa') d.alpha = num(c[1], ln); else if (key === 'koszt informacji') d.infoCost = num(c[1], ln);
    else if (['decyzja', 'gracz a', 'wynik badania'].includes(key)) { sec = key === 'decyzja' ? 'st' : key === 'gracz a' ? 'game' : 'like'; cur = d[sec] = {rn: [], cn: c.slice(1), cells: []}; }
    else if (key === 'prawdopodobieństwa') { if (!cur) throw new Error(`wiersz ${ln}: prawdopodobieństwa przed tabelą.`); cur.xr = c.slice(1).map(v => num(v, ln)); }
    else { if (!cur) throw new Error(`wiersz ${ln}: nie rozpoznano danych (brak nagłówka tabeli).`); if (c.length - 1 !== cur.cn.length) throw new Error(`wiersz ${ln}: liczba wartości (${c.length - 1}) różni się od liczby kolumn (${cur.cn.length}).`); cur.rn.push(c[0]); cur.cells.push(c.slice(1).map(v => num(v, ln))); } });
  if (!d.st && !d.game) throw new Error('brak tabeli w pliku.'); return d;
}
function dcRead() {
  clearErr(); dcSync();
  const out = '#out-dec', m = DC.mode, bad = [], num = (s, id, blank) => { const t = String(s).trim().replace(',', '.'); if (t === '' && blank) return null; const x = Number(t); if (t === '' || !isFinite(x) || Math.abs(x) > 1e12) { bad.push(id); return NaN; } return x; };
  const matNum = (mm, pre) => mm.cells.map((r, i) => r.map((v, j) => num(v, `${pre}c${i}_${j}`)));
  if (m === 'tree') {
    const names = DC.tree.map(x => String(x.name).trim()), dup = names.findIndex((s, i) => !s || names.indexOf(s) !== i);
    if (dup >= 0) return netFail(DCP, out, names[dup] ? `nazwa węzła „${esc(names[dup])}" powtarza się.` : 'każdy węzeł musi mieć nazwę.', ['tname' + dup]);
    const nodes = DC.tree.map((x, i) => { const pn = String(x.parent).trim(), p = pn === '' ? -1 : names.indexOf(pn); if (pn !== '' && p < 0) bad.push('tparent' + i);
      return {name: names[i], type: x.type, parent: p, prob: num(x.prob, 'tprob' + i, true), value: num(x.value, 'tvalue' + i, true) ?? 0}; });
    if (bad.length) return netFail(DCP, out, 'popraw zaznaczone pola: rodzic musi być nazwą istniejącego węzła, liczby wpisz cyframi.', bad);
    nodes.forEach((x, i) => { if (x.parent >= 0 && nodes[x.parent].type === 'L' && !(x.prob >= 0 && x.prob <= 1)) bad.push('tprob' + i); });
    if (bad.length) return netFail(DCP, out, 'gałęzie wychodzące z węzła losowego muszą mieć prawdopodobieństwo od 0 do 1.', bad);
    const E = decTreeCheck(nodes); if (E.length) return netFail(DCP, out, esc(E[0].msg), E.map(e => 't' + e.field + e.i));
    return {mode: m, nodes, kind: DC.kind};
  }
  if (m === 'game') { const A = matNum(DC.game, 'G'); if (bad.length) return netFail(DCP, out, 'wpisz w zaznaczonych komórkach liczby.', bad); return {mode: m, A, rn: DC.game.rn, cn: DC.game.cn}; }
  const V = matNum(DC.st, 'S'); if (bad.length) return netFail(DCP, out, 'wpisz w zaznaczonych komórkach tabeli wypłat liczby.', bad);
  const pr = DC.st.xr.map((v, j) => num(v, 'Sxr' + j, true)), X = {mode: m, V, rn: DC.st.rn, cn: DC.st.cn, kind: DC.kind};
  if (pr.some(v => v !== null) || m === 'bayes') { if (pr.some(v => !(v >= 0 && v <= 1))) return netFail(DCP, out, 'prawdopodobieństwa stanów: liczby od 0 do 1 (dla wszystkich stanów).', pr.map((v, j) => 'Sxr' + j));
    if (Math.abs(pr.reduce((s, v) => s + v, 0) - 1) > 1e-6) return netFail(DCP, out, 'prawdopodobieństwa stanów muszą sumować się do 1.', pr.map((_, j) => 'Sxr' + j)); X.P = pr; }
  if (m === 'table') { X.alpha = num(DC.alpha, 'alpha'); if (!(X.alpha >= 0 && X.alpha <= 1)) return netFail(DCP, out, 'współczynnik Hurwicza α musi należeć do [0; 1].', ['alpha']);
    if (DC.util) { const R = Number(String(DC.R).replace(',', '.')); if (!X.P) return netFail(DCP, out, 'użyteczność oczekiwana wymaga prawdopodobieństw stanów.', DC.st.xr.map((_, j) => 'Sxr' + j)); if (!(R > 0)) return netFail(DCP, out, 'tolerancja ryzyka R musi być dodatnia.', ['R']); X.R = R; } }
  if (m === 'bayes') { const L = matNum(DC.like, 'L'); if (bad.length) return netFail(DCP, out, 'wpisz w tabeli wiarygodności liczby.', bad);
    const badc = DC.st.cn.map((_, j) => Math.abs(L.reduce((s, r) => s + r[j], 0) - 1) > 1e-6 || L.some(r => r[j] < 0) ? j : -1).filter(j => j >= 0);
    if (badc.length) return netFail(DCP, out, `w kolumnie „${esc(DC.st.cn[badc[0]])}" prawdopodobieństwa wyników badania muszą być nieujemne i sumować się do 1.`, DC.like.rn.flatMap((_, i) => badc.map(j => `Lc${i}_${j}`)));
    X.L = L; X.ln = DC.like.rn; X.cost = num(DC.infoCost, 'infoCost', true) ?? 0; }
  return X;
}
function dcSolveUI() { const X = dcRead(); if (!X) return; const h = dcReportHTML(X); $('#out-dec').innerHTML = h; last.dec = h; }
/* rysunek drzewa: □ decyzja, ○ los, ◁ koniec; gałęzie optymalne pogrubione, odrzucone decyzje przekreślone */
function dcTreeSVG(nodes, T) {
  const kids = T.kids, depth = Array(nodes.length).fill(0), order = []; let leaf = 0; const yv = Array(nodes.length).fill(0);
  const lay = (i, d) => { depth[i] = d; if (!kids[i].length) { yv[i] = leaf++; return; } kids[i].forEach(k => lay(k, d + 1)); yv[i] = (yv[kids[i][0]] + yv[kids[i][kids[i].length - 1]]) / 2; };
  lay(T.root, 0); const D = Math.max(...depth), W = 140 + D * 170, H = 40 + leaf * 46, X = i => 40 + depth[i] * 170, Y = i => 30 + yv[i] * 46, f = v => fmt(Math.round(v * 100) / 100);
  const onBest = new Set(); const mark = i => { onBest.add(i); const x = nodes[i]; if (x.type === 'D' && T.choice[i] >= 0) mark(T.choice[i]); else if (x.type === 'L') kids[i].forEach(mark); }; mark(T.root);
  let s = '';
  nodes.forEach((x, i) => { if (x.parent < 0) return; const p = x.parent, cut = nodes[p].type === 'D' && T.choice[p] !== i, best = onBest.has(i) && onBest.has(p), x1 = X(p) + 12, y1 = Y(p), x2 = X(i) - 12, y2 = Y(i);
    s += `<path class="dte${best ? ' best' : ''}" d="M${x1} ${y1} L${x1 + 30} ${y2} L${x2} ${y2}"/><text class="vzt" x="${x1 + 36}" y="${y2 - 5}">${esc(x.name)}${x.prob !== null && nodes[p].type === 'L' ? ` (${f(x.prob)})` : ''}${x.value && x.type !== 'K' ? ` [${f(x.value)}]` : ''}</text>` +
      (cut ? `<text class="dtcut" x="${x1 + 60}" y="${y2 + 4}">||</text>` : ''); });
  nodes.forEach((x, i) => { const cx = X(i), cy = Y(i);
    s += x.type === 'D' ? `<rect class="dtn d" x="${cx - 10}" y="${cy - 10}" width="20" height="20"/>` : x.type === 'L' ? `<circle class="dtn l" cx="${cx}" cy="${cy}" r="10"/>` : `<path class="dtn k" d="M${cx - 9} ${cy} L${cx + 7} ${cy - 8} L${cx + 7} ${cy + 8} Z"/>`;
    s += x.type === 'K' ? `<text class="vzt b" x="${cx + 12}" y="${cy + 4}">${f(x.value)}</text>` : `<text class="vzt b" x="${cx - 12}" y="${cy - 14}">${f(T.ev[i])}</text>`; });
  return `<div class="tw"><svg class="vzsvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="Drzewo decyzyjne">${s}</svg></div>`;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function dcReportHTML(X) {
  const f = v => fmt(Math.round(v * 100) / 100), f4 = v => fmt(Math.round(v * 10000) / 10000), pc = v => fmt(Math.round(v * 1000) / 10) + '%';
  if (X.mode === 'game') {
    const A = X.A, G = gameSolve(A), rn = X.rn.map(esc), cn = X.cn.map(esc);
    let h = `<h3>Gra dwuosobowa o sumie zerowej</h3><p class="hint">Gracz A wybiera wiersz i chce wygrać jak najwięcej; gracz B wybiera kolumnę i chce przegrać jak najmniej. Najpierw szukamy punktu siodłowego: maximin z minimów wierszy = minimax z maksimów kolumn.</p>` +
      `<div class="tw"><table><thead><tr><th>A \\ B</th>${cn.map(c => `<th>${c}</th>`).join('')}<th>Min wiersza</th></tr></thead>` + A.map((r, i) => `<tr><th>${rn[i]}</th>${r.map((v, j) => `<td class="${G.saddle && G.saddle.cells.some(([a, b]) => a === i && b === j) ? 'best' : ''}">${f(v)}</td>`).join('')}<td class="${Math.abs(G.rowMin[i] - G.lo) < 1e-9 ? 'sel' : ''}">${f(G.rowMin[i])}</td></tr>`).join('') +
      `<tr><th>Maks. kolumny</th>${G.colMax.map(v => `<td class="${Math.abs(v - G.hi) < 1e-9 ? 'sel' : ''}">${f(v)}</td>`).join('')}<td></td></tr></table></div>`;
    h += `<div class="formula">maximin = ${f(G.lo)}, minimax = ${f(G.hi)} → ${G.saddle ? `<b>punkt siodłowy</b>: gra ma rozwiązanie w strategiach czystych, wartość gry v = ${f(G.saddle.v)}` : 'brak punktu siodłowego – gracze powinni losować strategie (strategie mieszane), wartość gry leży między tymi liczbami'}</div>`;
    if (G.dom.length) h += '<h4>Dominacja</h4><ul>' + G.dom.map(d => `<li>${d.who === 'A' ? `Strategia ${rn[d.out]} gracza A jest zdominowana przez ${rn[d.by]} (daje A nie więcej w każdej kolumnie) – usuwamy ją.` : `Strategia ${cn[d.out]} gracza B jest zdominowana przez ${cn[d.by]} (B traci przy niej nie mniej w każdym wierszu) – usuwamy ją.`}</li>`).join('') + '</ul>';
    if (G.status !== 'ok') return h + '<p class="msg">Nie udało się rozwiązać programu liniowego gry.</p>';
    if (!G.saddle) h += `<h4>Strategie mieszane (programowanie liniowe)</h4><p class="hint">Do wszystkich wypłat dodajemy ${f(G.shift)}, by były dodatnie. Gracz A: min Σx<sub>i</sub> przy Σ<sub>i</sub> x<sub>i</sub>a<sub>ij</sub> ≥ 1 dla każdej kolumny; wartość gry v = 1/Σx<sub>i</sub> − ${f(G.shift)}, a p<sub>i</sub> = x<sub>i</sub>·(v + ${f(G.shift)}). Gracz B – zadanie dualne.</p>`;
    h += `<div class="sum"><b>Wartość gry v = ${f4(G.v)}.</b> Gracz A: ${G.p.map((v, i) => `${rn[i]} z prawdopodobieństwem ${f4(v)}`).join(', ')}. Gracz B: ${G.q.map((v, j) => `${cn[j]} – ${f4(v)}`).join(', ')}.</div>`;
    if (A.length === 2 && !G.saddle) { const pts = cn.map((_, j) => ({name: X.cn[j], pts: [[0, A[1][j]], [1, A[0][j]]], cls: ['', 'b', 'c', 'd', 'e', 'f', 'g'][j % 7]}));
      h += '<h4>Metoda graficzna (2 × n)</h4>' + VZ.line(pts, {title: 'Wypłata A w zależności od p = P(A gra ' + X.rn[0] + ')', xLabel: 'p', marks: [{x: G.p[0], y: G.v, label: 'v = ' + f(G.v)}]}) +
        '<p class="hint">Każda linia to oczekiwana wypłata A, gdy B gra daną kolumnę. B wybiera najgorszą dla A linię (dolna obwiednia), a A – punkt, w którym ta obwiednia jest najwyżej.</p>'; }
    return h;
  }
  if (X.mode === 'tree') {
    const T = decTree(X.nodes, X.kind), nodes = X.nodes, nm = i => esc(nodes[i].name);
    let h = `<h3>Drzewo decyzyjne</h3><p class="hint">Liczymy od końca (rollback): w węźle losowym wartość oczekiwana = Σ prawdopodobieństwo × (wartość następnika + przepływ na gałęzi); w węźle decyzyjnym wybieramy gałąź ${X.kind === 'profit' ? 'o największej' : 'o najmniejszej'} wartości. Odrzucone gałęzie decyzji oznaczamy „||”.</p>`;
    h += dcTreeSVG(nodes, T) + '<div class="tw"><table><thead><tr><th>Węzeł</th><th>Rodzaj</th><th>Wartość oczekiwana</th><th>Wybór</th></tr></thead>' +
      nodes.map((x, i) => x.type === 'K' ? '' : `<tr${T.best.includes(i) || i === T.root ? ' class="sel"' : ''}><th>${nm(i)}</th><td>${x.type === 'D' ? 'decyzyjny' : 'losowy'}</td><td>${f(T.ev[i])}</td><td>${x.type === 'D' ? nm(T.choice[i]) : '–'}</td></tr>`).join('') + '</table></div>';
    return h + `<div class="sum"><b>Strategia optymalna:</b> ${T.best.map(i => `w węźle ${esc(nodes[nodes[i].parent].name)} wybierz <b>${nm(i)}</b>`).join('; ')}. Wartość oczekiwana: <b>${f(T.value)}</b>.</div>`;
  }
  const V = X.V, rn = X.rn.map(esc), cn = X.cn.map(esc), prof = X.kind === 'profit';
  if (X.mode === 'bayes') {
    const E = decEVSI(V, X.P, X.L, X.kind, X.cost), ln = X.ln.map(esc);
    let h = `<h3>Twierdzenie Bayesa i wartość informacji z badania</h3><p class="hint">Badanie daje wynik o zależnym od stanu natury rozkładzie P(wynik | stan). Po poznaniu wyniku poprawiamy prawdopodobieństwa stanów: P(stan | wynik) = P(wynik | stan)·P(stan) / P(wynik).</p>`;
    h += '<h4>Prawdopodobieństwa a posteriori</h4><div class="tw"><table><thead><tr><th>Wynik badania</th><th>P(wynik)</th>' + cn.map(c => `<th>P(${c} | wynik)</th>`).join('') + '<th>Najlepsza decyzja</th><th>Wartość oczekiwana</th></tr></thead>' +
      E.branch.map((b, o) => `<tr><th>${ln[o]}</th><td>${f4(b.p)}</td>${E.post[o].map(v => `<td>${f4(v)}</td>`).join('')}<td><b>${rn[b.idx]}</b></td><td>${f(b.best)}</td></tr>`).join('') + '</table></div>';
    h += `<div class="formula">P(wynik) = Σ P(wynik | stan)·P(stan); np. P(${ln[0]}) = ${X.L[0].map((v, j) => `${f4(v)}·${f4(X.P[j])}`).join(' + ')} = ${f4(E.po[0])}</div>`;
    h += `<div class="tw"><table><tbody><tr><th>EMV bez badania</th><td>${f(E.emv)}</td></tr><tr><th>Wartość oczekiwana z badaniem (EVwSI)</th><td>${f(E.evwsi)}</td></tr><tr><th>Wartość informacji z badania EVSI = |EVwSI − EMV|</th><td><b>${f(E.evsi)}</b></td></tr>` +
      `<tr><th>Wartość doskonałej informacji EVPI</th><td>${f(E.evpi)}</td></tr><tr><th>Sprawność badania EVSI / EVPI</th><td>${E.eff === null ? '–' : pc(E.eff)}</td></tr><tr><th>Koszt badania</th><td>${f(X.cost)}</td></tr></tbody></table></div>`;
    return h + `<div class="sum"><b>${E.worth ? 'Badanie się opłaca' : 'Badanie się nie opłaca'}:</b> wartość informacji ${f(E.evsi)} ${E.worth ? '>' : '≤'} koszt ${f(X.cost)}. ${E.worth ? `Po badaniu: ${E.branch.map((b, o) => `przy wyniku „${ln[o]}” wybierz ${rn[b.idx]}`).join('; ')}.` : ''}</div>`;
  }
  const C = decCriteria(V, X.kind, X.alpha, X.P || null), win = (k, i) => C[k].idx.includes(i) ? ' class="best"' : '';
  let h = `<h3>Tabela ${prof ? 'wypłat (zyski)' : 'kosztów'} – kryteria decyzyjne</h3><p class="hint">${prof ? 'Zyski: im więcej, tym lepiej.' : 'Koszty: im mniej, tym lepiej (kryteria „odwrócone”).'} Kryterium Walda – ostrożne (najlepszy z najgorszych wyników), maximax – optymistyczne, Hurwicza – ważone α·najlepszy + (1 − α)·najgorszy, Laplace'a – średnia (stany jednakowo prawdopodobne), Savage'a – najmniejszy z maksymalnych żali.</p>`;
  h += '<div class="tw"><table><thead><tr><th>Decyzja</th>' + cn.map(c => `<th>${c}</th>`).join('') + `<th>Wald</th><th>${prof ? 'Maximax' : 'Minimin'}</th><th>Hurwicz (α = ${f4(X.alpha)})</th><th>Laplace</th><th>Maks. żal</th>${C.emv ? `<th>${prof ? 'EMV' : 'Oczekiwany koszt'}</th><th>EOL</th>` : ''}</tr></thead>` +
    V.map((r, i) => `<tr><th>${rn[i]}</th>${r.map(v => `<td>${f(v)}</td>`).join('')}<td${win('wald', i)}>${f(C.wald.vals[i])}</td><td${win('maximax', i)}>${f(C.maximax.vals[i])}</td><td${win('hurwicz', i)}>${f(C.hurwicz.vals[i])}</td><td${win('laplace', i)}>${f(C.laplace.vals[i])}</td><td${win('savage', i)}>${f(C.savage.vals[i])}</td>` +
      (C.emv ? `<td${win('emv', i)}>${f(C.emv.vals[i])}</td><td${win('eol', i)}>${f(C.eol.vals[i])}</td>` : '') + '</tr>').join('') + (X.P ? `<tr><th>Prawdopodobieństwo</th>${X.P.map(p => `<td>${f4(p)}</td>`).join('')}<td colspan="${C.emv ? 7 : 5}"></td></tr>` : '') + '</table></div>';
  h += '<h4>Macierz żalu (straty możliwości)</h4><p class="hint">Żal = różnica między najlepszym wynikiem w danym stanie a wynikiem decyzji.</p><div class="tw"><table><thead><tr><th>Decyzja</th>' + cn.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' + C.regret.map((r, i) => `<tr><th>${rn[i]}</th>${r.map(v => `<td>${f(v)}</td>`).join('')}</tr>`).join('') + '</table></div>';
  const lst = (k, t) => `<li>${t}: <b>${C[k].idx.map(i => rn[i]).join(', ')}</b> (${f(C[k].best)})</li>`;
  h += '<div class="sum"><b>Najlepsze decyzje według kryteriów:</b><ul>' + lst('wald', 'Wald') + lst('maximax', prof ? 'maximax' : 'minimin') + lst('hurwicz', 'Hurwicz') + lst('laplace', 'Laplace') + lst('savage', 'Savage') + (C.emv ? lst('emv', prof ? 'EMV' : 'najmniejszy oczekiwany koszt') : '') + '</ul></div>';
  if (C.emv) { h += `<div class="formula">EVwPI = Σ p<sub>j</sub>·najlepszy wynik w stanie j = ${f(C.evwpi)};&nbsp; EVPI = |EVwPI − ${prof ? 'EMV' : 'oczekiwany koszt'}*| = <b>${f(C.evpi)}</b> = najmniejszy EOL</div><p class="hint">EVPI to maksymalna kwota, jaką warto zapłacić za doskonałą informację o stanie natury.</p>`;
    h += VZ.bars(X.rn, C.emv.vals, {title: prof ? 'EMV decyzji' : 'Oczekiwany koszt decyzji', valueText: true, cls: C.emv.vals.map((_, i) => C.emv.idx.includes(i) ? 'c' : '')});
    if (V[0].length === 2) { const sg = decSens2(V, X.kind);
      h += '<h4>Analiza wrażliwości: prawdopodobieństwo pierwszego stanu</h4>' + VZ.line(V.map((r, i) => ({name: X.rn[i], pts: [[0, r[1]], [1, r[0]]], cls: ['', 'b', 'c', 'd', 'e', 'f', 'g'][i % 7]})), {title: `EMV w zależności od p = P(${X.cn[0]})`, xLabel: 'p', marks: sg.slice(1).map(s => ({x: s.from, y: V[s.i][0] * s.from + V[s.i][1] * (1 - s.from), label: 'p = ' + f4(s.from)}))}) +
        '<ul>' + sg.map(s => `<li>dla p od ${f4(s.from)} do ${f4(s.to)} najlepsza jest decyzja <b>${rn[s.i]}</b></li>`).join('') + '</ul>'; }
    if (X.R) { const U = decUtility(V, X.P, X.R);
      h += `<h4>Użyteczność oczekiwana (R = ${f(X.R)})</h4><p class="hint">U(x) = 1 − e<sup>−x/R</sup> wyraża niechęć do ryzyka. Równoważnik pewności CE to pewna kwota, którą decydent uznaje za równie dobrą jak dana loteria.</p><div class="tw"><table><thead><tr><th>Decyzja</th><th>Użyteczność oczekiwana</th><th>Równoważnik pewności</th><th>EMV</th></tr></thead>` +
        V.map((_, i) => `<tr${i === U.idx ? ' class="sel"' : ''}><th>${rn[i]}</th><td>${f4(U.eu[i])}</td><td>${f(U.ce[i])}</td><td>${f(C.emv.vals[i])}</td></tr>`).join('') + `</table></div><div class="sum"><b>Przy niechęci do ryzyka</b> najlepsza jest decyzja <b>${rn[U.idx]}</b>${C.emv.idx.includes(U.idx) ? ' – tak samo jak według EMV' : ` (według EMV: ${rn[C.emv.idx[0]]})`}.</div>`; } }
  return h;
}
registerModule({id: 'dec', title: 'Analiza decyzji', init: dcInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="10" width="5" height="5"/><circle cx="14" cy="5.5" r="2.5"/><path d="M7 12.5l5-6M7 12.5l5 6"/><path d="M15 17l6-2v4z"/></svg>',
  html: '<div class="card"><div id="dec-top"></div><div><button id="btn-dec" type="button">Analizuj</button></div><div id="out-dec"></div></div>'});
