/* ===== OptiLab – moduł Karty kontrolne (statystyczne sterowanie procesem) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/qc/spc-solver.js. Wykresy: VZ.control, VZ.pareto, VZ.hist. */
const QCP = 'qc-', QC_MAXS = 100;
const QC_TYPES = {xr: 'X̄-R (średnia i rozstęp)', xs: 'X̄-s (średnia i odchylenie)', imr: 'I-MR (pomiary indywidualne)', p: 'p (frakcja wadliwych)', np: 'np (liczba wadliwych)', c: 'c (liczba wad)', u: 'u (wady na jednostkę)', pareto: 'wykres Pareto (przyczyny wad)'};
const QC_COLS = {imr: [{key: 'label', label: 'Pomiar', type: 'name'}, {key: 'v', label: 'Wartość', type: 'num'}], p: [{key: 'label', label: 'Próbka', type: 'name'}, {key: 'n', label: 'Liczebność n', type: 'num'}, {key: 'c', label: 'Wadliwe d', type: 'num'}],
  np: [{key: 'label', label: 'Próbka', type: 'name'}, {key: 'n', label: 'Liczebność n', type: 'num'}, {key: 'c', label: 'Wadliwe d', type: 'num'}], c: [{key: 'label', label: 'Próbka', type: 'name'}, {key: 'c', label: 'Liczba wad c', type: 'num'}],
  u: [{key: 'label', label: 'Próbka', type: 'name'}, {key: 'n', label: 'Liczba jednostek n', type: 'num'}, {key: 'c', label: 'Liczba wad', type: 'num'}], pareto: [{key: 'label', label: 'Przyczyna', type: 'name'}, {key: 'c', label: 'Liczba wystąpień', type: 'num'}]};
const qcSub = rows => ({rn: rows.map((_, i) => String(i + 1)), cn: rows[0].map((_, j) => 'x' + (j + 1)), cells: rows.map(r => r.map(String))});
const qcRows = (arr, f) => arr.map((r, i) => ({label: String(i + 1), ...f(r)}));
const QC_DEF = {phase1: false, rules: '12345678', LSL: '', USL: '', cusum: false, ewma: false, mu0: '', sg: '', K: '0.5', H: '5', lam: '0.2', Lw: '3'};
const qcEx = (name, d) => ({name, data: {...QC_DEF, sub: qcSub([[0, 0]]), rows: [{label: '1', v: '', n: '', c: ''}], ...d}});
const PISTON = [[74.030, 74.002, 74.019, 73.992, 74.008], [73.995, 73.992, 74.001, 74.011, 74.004], [73.988, 74.024, 74.021, 74.005, 74.002], [74.002, 73.996, 73.993, 74.015, 74.009], [73.992, 74.007, 74.015, 73.989, 74.014],
  [74.009, 73.994, 73.997, 73.985, 73.993], [73.995, 74.006, 73.994, 74.000, 74.005], [73.985, 74.003, 73.993, 74.015, 73.988], [74.008, 73.995, 74.009, 74.005, 74.004], [73.998, 74.000, 73.990, 74.007, 73.995],
  [73.994, 73.998, 73.994, 73.995, 73.990], [74.004, 74.000, 74.007, 74.000, 73.996], [73.983, 74.002, 73.998, 73.997, 74.012], [74.006, 73.967, 73.994, 74.000, 73.984], [74.012, 74.014, 73.998, 73.999, 74.007]];
const QC_EXAMPLES = [
  qcEx('Średnica pierścieni tłokowych – X̄-R (15 próbek po 5)', {type: 'xr', sub: qcSub(PISTON), LSL: '73.95', USL: '74.05'}),
  qcEx('Średnica pierścieni – X̄-s', {type: 'xs', sub: qcSub(PISTON), LSL: '73.95', USL: '74.05'}),
  qcEx('Pomiary indywidualne z przesunięciem – I-MR, reguły Nelsona', {type: 'imr', rows: qcRows([10.2, 9.8, 10.1, 10.4, 9.7, 10.0, 10.3, 9.9, 10.1, 10.2, 10.5, 10.6, 10.4, 10.7, 10.5, 10.8, 10.6, 10.9, 10.7, 11.6], v => ({v: String(v)})), cusum: true, ewma: true, mu0: '10', sg: '0.3'}),
  qcEx('Frakcja wadliwych – karta p, zmienna liczebność', {type: 'p', rows: qcRows([[120, 6], [100, 4], [150, 9], [120, 5], [90, 7], [110, 4], [130, 18], [100, 5], [140, 6], [120, 4]], ([n, c]) => ({n: String(n), c: String(c)})), phase1: true}),
  qcEx('Liczba wadliwych – karta np (n = 50)', {type: 'np', rows: qcRows([3, 2, 4, 1, 5, 2, 3, 6, 2, 3, 1, 4], c => ({n: '50', c: String(c)}))}),
  qcEx('Wady na płytkach – karta c', {type: 'c', rows: qcRows([21, 24, 16, 12, 15, 5, 28, 20, 31, 25, 20, 24, 16, 19, 10, 17, 13, 22, 18, 39], c => ({c: String(c)})), phase1: true}),
  qcEx('Wady na jednostkę – karta u', {type: 'u', rows: qcRows([[10, 14], [8, 12], [12, 20], [10, 11], [9, 16], [11, 15], [10, 25], [8, 9]], ([n, c]) => ({n: String(n), c: String(c)}))}),
  qcEx('Przyczyny reklamacji – wykres Pareto', {type: 'pareto', rows: [['Rysy', 42], ['Złe wymiary', 115], ['Pęknięcia', 18], ['Brak elementu', 64], ['Przebarwienia', 9], ['Inne', 12]].map(([l, c]) => ({label: l, c: String(c)}))}),
];
let QC = qcNormalize(JSON.parse(JSON.stringify(QC_EXAMPLES[0].data)));
function qcNormalize(d) {
  if (!d || !QC_TYPES[d.type]) throw new Error('to nie jest zadanie z modułu Karty kontrolne (nieznany rodzaj karty).');
  const o = {type: d.type}; Object.keys(QC_DEF).forEach(k => { o[k] = typeof QC_DEF[k] === 'boolean' ? !!d[k] : String(d[k] ?? QC_DEF[k]); });
  const sub = d.sub && Array.isArray(d.sub.cells) && d.sub.cells.length ? d.sub : QC_EXAMPLES[0].data.sub; if (sub.cells.length > QC_MAXS) throw new Error(`za dużo próbek (${sub.cells.length}) – maksimum to ${QC_MAXS}.`);
  o.sub = {rn: sub.cells.map((_, i) => String(sub.rn?.[i] ?? i + 1)), cn: sub.cells[0].map((_, j) => 'x' + (j + 1)), cells: sub.cells.map(r => r.map(String))};
  o.rows = (Array.isArray(d.rows) && d.rows.length ? d.rows : [{label: '1'}]).slice(0, 500).map((r, i) => ({label: String(r.label ?? i + 1), v: String(r.v ?? ''), n: String(r.n ?? ''), c: String(r.c ?? '')})); return o;
}
const qcVar = () => ['xr', 'xs'].includes(QC.type);
function qcRender() {
  const t = QC.type, box = $('#' + QCP + 'data'); $('#' + QCP + 'type').value = t;
  if (qcVar()) box.innerHTML = `<div class="crow"><label for="${QCP}ns">Liczba próbek</label><select id="${QCP}ns">${Array.from({length: QC_MAXS - 1}, (_, k) => `<option${k + 2 === QC.sub.rn.length ? ' selected' : ''}>${k + 2}</option>`).join('')}</select>` +
      `<label for="${QCP}nn">Liczność próbki n</label><select id="${QCP}nn">${Array.from({length: 24}, (_, k) => `<option${k + 2 === QC.sub.cn.length ? ' selected' : ''}>${k + 2}</option>`).join('')}</select></div>` + matrixHTML(QCP + 'S', QC.sub, {corner: 'próbka \\ pomiar', staticNames: true, noMsg: true});
  else box.innerHTML = rowTableHTML(QCP + 'r', QC_COLS[t], QC.rows, {addLabel: t === 'pareto' ? '+ przyczyna' : '+ próbka', count: n => `${n} wierszy`});
  ['ns', 'nn'].forEach(id => { const el = $('#' + QCP + id); if (el) el.onchange = () => { qcSync(); const R = +$('#' + QCP + 'ns').value, C = +$('#' + QCP + 'nn').value;
    QC.sub = {rn: Array.from({length: R}, (_, i) => String(i + 1)), cn: Array.from({length: C}, (_, j) => 'x' + (j + 1)), cells: Array.from({length: R}, (_, i) => Array.from({length: C}, (_, j) => QC.sub.cells[i]?.[j] ?? ''))}; clearErr(); qcRender(); }; });
  const add = $('#' + QCP + 'radd'); if (add) add.onclick = () => { qcSync(); if (QC.rows.length < 500) QC.rows.push({label: String(QC.rows.length + 1), v: '', n: QC.rows[QC.rows.length - 1]?.n || '', c: ''}); qcRender(); };
  $('#' + QCP + 'specbox').hidden = !(qcVar() || t === 'imr'); $('#' + QCP + 'p1box').hidden = t === 'pareto'; $('#' + QCP + 'advbox').hidden = t !== 'imr' && !qcVar();
  ['phase1', 'cusum', 'ewma'].forEach(k => { $('#' + QCP + k).checked = QC[k]; }); ['LSL', 'USL', 'mu0', 'sg', 'K', 'H', 'lam', 'Lw'].forEach(k => { $('#' + QCP + k).value = QC[k]; });
  for (let r = 1; r <= 8; r++) $('#' + QCP + 'rule' + r).checked = QC.rules.includes(String(r));
  matrixPolish($('#' + QCP + 'top'));
}
function qcSync() {
  if (qcVar() && $('#' + QCP + 'S')) matrixSync(QCP + 'S', QC.sub); else if ($('#' + QCP + 'rlabel0')) QC.rows = rowTableSync(QCP + 'r', QC_COLS[QC.type], QC.rows);
  QC.type = $('#' + QCP + 'type').value; ['phase1', 'cusum', 'ewma'].forEach(k => { QC[k] = $('#' + QCP + k).checked; }); ['LSL', 'USL', 'mu0', 'sg', 'K', 'H', 'lam', 'Lw'].forEach(k => { QC[k] = $('#' + QCP + k).value; });
  QC.rules = [1, 2, 3, 4, 5, 6, 7, 8].filter(r => $('#' + QCP + 'rule' + r).checked).join('');
}
function qcInit() {
  const num = (id, ph) => `<input class="num" data-num data-blank inputmode="decimal" id="${QCP}${id}"${ph ? ` placeholder="${ph}"` : ''}>`;
  $('#' + QCP + 'top').innerHTML = `<div class="crow"><label for="${QCP}type">Rodzaj karty</label><select id="${QCP}type">${Object.entries(QC_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(QCP)}<div id="${QCP}data"></div>
    <div class="crow"><label for="${QCP}paste">Wklej dane z Excela</label></div><textarea id="${QCP}paste" rows="2" class="tx" style="width:100%" placeholder="wiersze = próbki (pomiary rozdzielone tabulatorem, średnikiem lub spacją)"></textarea><div class="crow"><button type="button" class="ghost" id="${QCP}pastego">Wstaw dane</button></div>
    <div id="${QCP}specbox" class="crow"><label for="${QCP}LSL">Dolna granica tolerancji LSL</label>${num('LSL')}<label for="${QCP}USL">Górna USL</label>${num('USL')}</div>
    <div id="${QCP}p1box" class="crow"><label class="chk"><input type="checkbox" id="${QCP}phase1"> faza I: usuń punkty poza granicami i przelicz granice</label></div><div id="${QCP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow">Reguły Nelsona: ${[1, 2, 3, 4, 5, 6, 7, 8].map(r => `<label class="chk" title="${esc(SPC_NELSON[r - 1])}"><input type="checkbox" id="${QCP}rule${r}"> ${r}</label>`).join(' ')}</div>
     <div id="${QCP}advbox"><div class="crow"><label class="chk"><input type="checkbox" id="${QCP}cusum"> karta CUSUM (tabelaryczna)</label><label class="chk"><input type="checkbox" id="${QCP}ewma"> karta EWMA</label></div>
      <div class="crow"><label for="${QCP}mu0">Wartość docelowa μ₀</label>${num('mu0', 'z danych')}<label for="${QCP}sg">σ procesu</label>${num('sg', 'z danych')}</div>
      <div class="crow"><label for="${QCP}K">CUSUM: K</label>${num('K')}<label for="${QCP}H">H</label>${num('H')}<label for="${QCP}lam">EWMA: λ</label>${num('lam')}<label for="${QCP}Lw">L</label>${num('Lw')}</div></div>
     ${netToolsHTML(QCP, QC_EXAMPLES)}</details>
    <p class="hint">Karty kontrolne pokazują, czy proces jest stabilny (zmienność tylko losowa), czy działa przyczyna specjalna. Punkty poza granicami i nielosowe układy punktów (reguły Nelsona) oznaczamy na czerwono.</p>`;
  $('#' + QCP + 'type').onchange = () => { qcSync(); clearErr(); qcRender(); };
  $('#' + QCP + 'pastego').onclick = () => { qcSync(); const lines = String($('#' + QCP + 'paste').value).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean), cells = lines.map(l => l.split(/[;\t ]+/).filter(Boolean));
    const badI = cells.findIndex(r => r.some(v => !isFinite(Number(v.replace(',', '.'))))); if (!lines.length) return netFail(QCP, null, 'pole do wklejenia jest puste.', ['paste']);
    if (badI >= 0) return netFail(QCP, null, `wiersz ${badI + 1}: „${esc(cells[badI].find(v => !isFinite(Number(v.replace(',', '.')))))}" nie jest liczbą.`, ['paste']);
    const nr = cells.map(r => r.map(v => String(Number(v.replace(',', '.')))));
    if (qcVar()) { const w = nr[0].length; if (w < 2 || nr.some(r => r.length !== w)) return netFail(QCP, null, 'każdy wiersz (próbka) musi mieć tyle samo pomiarów, co najmniej 2.', ['paste']); if (nr.length > QC_MAXS) return netFail(QCP, null, `za dużo próbek (maksimum ${QC_MAXS}).`, ['paste']); QC.sub = qcSub(nr); }
    else { const cols = QC_COLS[QC.type].slice(1); QC.rows = (nr.length === 1 && cols.length === 1 ? nr[0].map(v => [v]) : nr).map((r, i) => { const o = {label: String(i + 1), v: '', n: '', c: ''}; cols.forEach((col, k) => { o[col.key] = r[k] ?? ''; }); return o; }); }
    clearErr(); qcRender(); };
  const top = $('#' + QCP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; qcSync(); if (QC.rows.length > 1) QC.rows.splice(+k, 1); clearErr(); qcRender(); });
  netToolsWire(QCP, {kind: 'spc', out: '#out-qc', examples: QC_EXAMPLES, normalize: qcNormalize, get: () => { qcSync(); return JSON.parse(JSON.stringify(QC)); }, set: d => { QC = d; qcRender(); },
    toCSV: d => { const meta = [['karta', d.type], ...['LSL', 'USL', 'mu0', 'sg'].filter(k => d[k] !== '').map(k => [k, d[k]])];
      if (['xr', 'xs'].includes(d.type)) return rowsToCSV([{key: 'label', label: 'Próbka', type: 'name'}, ...d.sub.cn.map((c, j) => ({key: 'm' + j, label: c, type: 'num'}))], d.sub.cells.map((r, i) => ({label: d.sub.rn[i], ...Object.fromEntries(r.map((v, j) => ['m' + j, v]))})), meta);
      return rowsToCSV(QC_COLS[d.type], d.rows, meta); },
    fromCSV: t => { const kind = (String(t).match(/karta;(\w+)/) || [])[1]; if (!QC_TYPES[kind]) throw new Error('w pliku brakuje wiersza „karta;…” z rodzajem karty.');
      const metaK = ['karta', 'lsl', 'usl', 'mu0', 'sg'], un = v => v === undefined ? '' : String(v).replace(',', '.');
      if (['xr', 'xs'].includes(kind)) { const head = String(t).replace(/^\uFEFF/, '').split(/\r?\n/).find(l => /^Próbka;/.test(l)); if (!head) throw new Error('brak nagłówka „Próbka;x1;x2;…”.'); const k = head.split(';').length - 1;
        const r = rowsFromCSV(t, [{key: 'label', label: 'Próbka', type: 'name'}, ...Array.from({length: k}, (_, j) => ({key: 'm' + j, label: 'x' + (j + 1), type: 'num'}))], metaK);
        return {type: kind, sub: qcSub(r.rows.map(x => Array.from({length: k}, (_, j) => x['m' + j]))), LSL: un(r.meta.lsl), USL: un(r.meta.usl), mu0: un(r.meta.mu0), sg: un(r.meta.sg)}; }
      const r = rowsFromCSV(t, QC_COLS[kind], metaK); return {type: kind, rows: r.rows, mu0: un(r.meta.mu0), sg: un(r.meta.sg)}; }});
  $('#btn-qc').onclick = qcSolveUI;
  qcRender();
}
function qcRead() {
  clearErr(); qcSync();
  const out = '#out-qc', t = QC.type, bad = [], num = (s, id, blank) => { const x0 = String(s).trim().replace(',', '.'); if (x0 === '' && blank) return null; const x = Number(x0); if (x0 === '' || !isFinite(x)) { bad.push(id); return NaN; } return x; };
  const X = {type: t, rules: QC.rules.split('').map(Number), phase1: QC.phase1};
  if (qcVar()) { X.D = {sub: QC.sub.cells.map((r, i) => r.map((v, j) => num(v, `Sc${i}_${j}`)))}; if (bad.length) return netFail(QCP, out, 'wpisz w zaznaczonych komórkach pomiary (liczby).', bad);
    if (X.D.sub.length < 2) return netFail(QCP, out, 'potrzebne są co najmniej 2 próbki.', []); }
  else { const R = QC.rows; if (R.length < (t === 'pareto' ? 1 : 2)) return netFail(QCP, out, 'potrzebne są co najmniej 2 wiersze danych.', []);
    if (t === 'imr') { X.D = {x: R.map((r, i) => num(r.v, 'rv' + i))}; if (bad.length) return netFail(QCP, out, 'wpisz w zaznaczonych polach pomiary (liczby).', bad); }
    else { X.D = {n: R.map((r, i) => ['p', 'np', 'u'].includes(t) ? num(r.n, 'rn' + i) : 1), c: R.map((r, i) => num(r.c, 'rc' + i)), names: R.map(r => r.label)};
      if (bad.length) return netFail(QCP, out, 'wpisz w zaznaczonych polach liczby.', bad);
      X.D.n.forEach((n, i) => { if (!(n > 0) || (t !== 'u' && !Number.isInteger(n))) bad.push('rn' + i); }); X.D.c.forEach((c, i) => { if (!(c >= 0) || (t !== 'pareto' && !Number.isInteger(c))) bad.push('rc' + i); if (['p', 'np'].includes(t) && c > X.D.n[i]) bad.push('rc' + i); });
      if (bad.length) return netFail(QCP, out, 'liczebności – liczby całkowite dodatnie; liczby wadliwych i wad – całkowite nieujemne (wadliwych nie więcej niż n).', bad);
      if (t === 'np' && new Set(X.D.n).size > 1) return netFail(QCP, out, 'karta np wymaga stałej liczebności próbek – przy zmiennej użyj karty p.', X.D.n.map((_, i) => 'rn' + i));
      if (t !== 'pareto' && X.D.c.every(v => v === 0)) return netFail(QCP, out, 'wszystkie liczby wad są zerowe – karta nie ma sensu (granice równe 0).', X.D.c.map((_, i) => 'rc' + i)); } }
  const LSL = num(QC.LSL, 'LSL', true), USL = num(QC.USL, 'USL', true); if (bad.length) return netFail(QCP, out, 'granice tolerancji muszą być liczbami.', bad);
  if (LSL !== null && USL !== null && !(USL > LSL)) return netFail(QCP, out, 'górna granica tolerancji musi być większa od dolnej.', ['LSL', 'USL']); X.LSL = LSL; X.USL = USL;
  if (QC.cusum || QC.ewma) { X.adv = {cusum: QC.cusum, ewma: QC.ewma, mu0: num(QC.mu0, 'mu0', true), sg: num(QC.sg, 'sg', true), K: num(QC.K, 'K'), H: num(QC.H, 'H'), lam: num(QC.lam, 'lam'), Lw: num(QC.Lw, 'Lw')};
    if (bad.length || !(X.adv.lam > 0 && X.adv.lam <= 1) || !(X.adv.K > 0 && X.adv.H > 0 && X.adv.Lw > 0) || (X.adv.sg !== null && !(X.adv.sg > 0))) return netFail(QCP, out, 'parametry CUSUM/EWMA: K, H, L dodatnie, 0 < λ ≤ 1, σ > 0.', [...bad, 'K', 'H', 'lam', 'Lw']); }
  return X;
}
function qcSolveUI() { const X = qcRead(); if (!X) return; const h = qcReportHTML(X); $('#out-qc').innerHTML = h; last.qc = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function qcReportHTML(X) {
  const f = v => fmt(Math.round(v * 10000) / 10000), t = X.type;
  if (t === 'pareto') { const P = spcPareto(X.D.names, X.D.c), k80 = P.findIndex(p => p.cum >= 0.8 - 1e-9);
    return '<h3>Wykres Pareto</h3><p class="hint">Przyczyny porządkujemy malejąco. Zasada Pareto: zwykle niewiele przyczyn (ok. 20%) odpowiada za większość problemów (ok. 80%) – od nich warto zacząć poprawę.</p>' +
      '<div class="tw"><table><thead><tr><th>Przyczyna</th><th>Liczba</th><th>Udział</th><th>Udział skumulowany</th></tr></thead>' + P.map((p, i) => `<tr${i <= k80 ? ' class="sel"' : ''}><th>${esc(p.nm)}</th><td>${f(p.v)}</td><td>${fmt(Math.round(p.share * 1000) / 10)}%</td><td>${fmt(Math.round(p.cum * 1000) / 10)}%</td></tr>`).join('') + '</table></div>' +
      VZ.pareto(P, {title: 'Wykres Pareto'}) + `<div class="sum"><b>Wynik:</b> ${k80 + 1} z ${P.length} przyczyn (${P.slice(0, k80 + 1).map(p => esc(p.nm)).join(', ')}) odpowiada za ${fmt(Math.round(P[k80].cum * 1000) / 10)}% wszystkich przypadków.</div>`; }
  const ph = X.phase1 ? spcPhase1(t, X.D) : null, L = ph ? ph.L : spcLimits(t, X.D), keep = ph ? ph.keep : null;
  let h = `<h3>Karta ${QC_TYPES[t]}</h3>`;
  if (L.K && t !== 'imr') { const K = L.K; h += `<p class="hint">Stałe dla n = ${K.n} (wyznaczone wzorami, nie z tabeli): d<sub>2</sub> = ${f(K.d2)} (średni rozstęp n obserwacji N(0, 1)), d<sub>3</sub> = ${f(K.d3)}, c<sub>4</sub> = ${f(K.c4)} = √(2/(n − 1))·Γ(n/2)/Γ((n − 1)/2).</p>`; }
  const M = L.main, fm = {xr: `X̄̄ = ${f(M.cl[0])}, R̄ = ${f(L.dbar)}; UCL<sub>X̄</sub> = X̄̄ + A<sub>2</sub>R̄ = ${f(M.cl[0])} + ${f(L.K?.A2 ?? 0)}·${f(L.dbar)} = <b>${f(M.ucl[0])}</b>, LCL<sub>X̄</sub> = <b>${f(M.lcl[0])}</b>; karta R: UCL = D<sub>4</sub>R̄ = <b>${f(L.disp?.ucl[0] ?? 0)}</b>, LCL = D<sub>3</sub>R̄ = <b>${f(L.disp?.lcl[0] ?? 0)}</b>`,
    xs: `X̄̄ = ${f(M.cl[0])}, s̄ = ${f(L.dbar)}; UCL<sub>X̄</sub> = X̄̄ + A<sub>3</sub>s̄ = <b>${f(M.ucl[0])}</b>, LCL<sub>X̄</sub> = <b>${f(M.lcl[0])}</b>; karta s: UCL = B<sub>4</sub>s̄ = <b>${f(L.disp?.ucl[0] ?? 0)}</b>, LCL = B<sub>3</sub>s̄ = <b>${f(L.disp?.lcl[0] ?? 0)}</b>`,
    imr: `x̄ = ${f(M.cl[0])}, M̄R = ${f(L.dbar)}, σ̂ = M̄R/d<sub>2</sub> = ${f(L.sigmaW)}; UCL = x̄ + 3σ̂ = <b>${f(M.ucl[0])}</b>, LCL = <b>${f(M.lcl[0])}</b>; karta MR: UCL = 3,267·M̄R = <b>${f(L.disp?.ucl[0] ?? 0)}</b>`,
    p: `p̄ = Σd / Σn = <b>${f(L.center)}</b>; granice p̄ ± 3√(p̄(1 − p̄)/n<sub>i</sub>) – zależą od liczebności próbki`, np: `n·p̄ = <b>${f(M.cl[0])}</b>; UCL = np̄ + 3√(np̄(1 − p̄)) = <b>${f(M.ucl[0])}</b>, LCL = <b>${f(M.lcl[0])}</b>`,
    c: `c̄ = <b>${f(M.cl[0])}</b>; UCL = c̄ + 3√c̄ = <b>${f(M.ucl[0])}</b>, LCL = max(0, c̄ − 3√c̄) = <b>${f(M.lcl[0])}</b>`, u: `ū = Σc / Σn = <b>${f(L.center)}</b>; granice ū ± 3√(ū/n<sub>i</sub>)`}[t];
  h += `<div class="formula">${fm}</div>`;
  if (ph) h += ph.steps.length ? `<p><b>Faza I:</b> ${ph.steps.map((s2, k) => `krok ${k + 1} – usunięto punkty ${s2.removed.map(i => i + 1).join(', ')}`).join('; ')}; granice przeliczono bez nich${ph.converged ? '' : ' (przerwano – zbyt wiele punktów poza granicami)'}. Przyczyny tych punktów trzeba znaleźć i usunąć z procesu.</p>` : '<p><b>Faza I:</b> żaden punkt nie wychodzi poza granice – granice można przyjąć do bieżącej kontroli (faza II).</p>';
  const V = spcRules(M, X.rules), flags = new Set(V.flatMap(v => v.idx)), Vd = L.disp ? spcRules({...L.disp, sigma: L.disp.stat.map(() => 0)}, [1]) : [], fd = new Set(Vd.flatMap(v => v.idx));
  if (keep) keep.forEach((k, i) => { if (!k) flags.add(i); });
  h += VZ.control(M.stat, M.cl, M.ucl, M.lcl, {flags, sig: M.sigma, title: 'Karta ' + M.name, yLabel: M.name});
  if (L.disp) h += VZ.control(L.disp.stat, L.disp.cl, L.disp.ucl, L.disp.lcl, {flags: fd, title: 'Karta ' + L.disp.name, yLabel: L.disp.name, start: 1 + (L.disp.offset || 0)});
  h += V.length || Vd.length ? '<h4>Sygnały rozregulowania</h4><ul>' + V.slice().sort((a, b) => a.rule - b.rule || a.idx[0] - b.idx[0]).map(v => `<li class="msg">Reguła ${v.rule} (${SPC_NELSON[v.rule - 1]}): ${v.idx.length === 1 ? 'punkt' : 'punkty'} ${v.idx.map(i => i + 1).join(', ')}.</li>`).join('') +
      Vd.map(v => `<li class="msg">Karta ${L.disp.name}: punkty ${v.idx.map(i => i + 1 + (L.disp.offset || 0)).join(', ')} poza granicami – zmienność się zmieniła.</li>`).join('') + '</ul><div class="msg"><b>Proces nie jest statystycznie uregulowany</b> – działają przyczyny specjalne, które trzeba zidentyfikować.</div>'
    : '<div class="sum"><b>Proces jest statystycznie uregulowany</b> – brak punktów poza granicami i nielosowych układów punktów (wybrane reguły Nelsona).</div>';
  if ((qcVar() || t === 'imr') && (X.LSL !== null || X.USL !== null)) {
    const all = qcVar() ? X.D.sub.flat() : X.D.x, C = spcCapability(all, L.sigmaW, X.LSL, X.USL);
    h += `<h4>Zdolność procesu</h4><p class="hint">C<sub>p</sub>, C<sub>pk</sub> liczymy z σ wewnątrz próbek (${f(C.sigmaW)}), P<sub>p</sub>, P<sub>pk</sub> – z odchylenia wszystkich danych (${f(C.sigmaO)}). C<sub>pk</sub> uwzględnia przesunięcie średniej względem środka tolerancji; zwykle wymaga się co najmniej 1,33.</p>` +
      `<div class="tw"><table><tbody>${C.Cp !== undefined ? `<tr><th>C<sub>p</sub> = (USL − LSL)/6σ</th><td><b>${f(C.Cp)}</b></td></tr>` : ''}<tr><th>C<sub>pk</sub> = min(USL − μ, μ − LSL)/3σ</th><td><b>${f(C.Cpk)}</b></td></tr>${C.Pp !== undefined ? `<tr><th>P<sub>p</sub></th><td>${f(C.Pp)}</td></tr>` : ''}<tr><th>P<sub>pk</sub></th><td>${f(C.Ppk)}</td></tr><tr><th>Przewidywane braki (rozkład normalny)</th><td>${fmt(Math.round(C.ppm))} ppm</td></tr></tbody></table></div>` +
      VZ.hist(all, {title: 'Histogram z rozkładem normalnym', xLabel: 'wartość', curve: x => ST.normPdf(x, C.mu, C.sigmaO), marks: [...(X.LSL !== null ? [{x: X.LSL, label: 'LSL'}] : []), ...(X.USL !== null ? [{x: X.USL, label: 'USL'}] : [])]}) +
      `<div class="sum"><b>Ocena zdolności:</b> C<sub>pk</sub> = ${f(C.Cpk)} – ${C.Cpk >= 1.33 ? 'proces zdolny' : C.Cpk >= 1 ? 'proces na granicy zdolności' : 'proces niezdolny – część wyrobów będzie poza tolerancją'}.</div>`; }
  if (qcVar()) h += '<h4>ARL – średnia liczba próbek do sygnału</h4><div class="tw"><table><thead><tr><th>Przesunięcie średniej</th><th>0</th><th>0,5σ</th><th>1σ</th><th>1,5σ</th><th>2σ</th><th>3σ</th></tr></thead><tr><th>ARL karty X̄ (n = ' + L.n + ')</th>' +
    [0, 0.5, 1, 1.5, 2, 3].map(d => `<td>${f(spcARL(d, L.n))}</td>`).join('') + '</tr></table></div><p class="hint">ARL₀ ≈ 370 – przy stabilnym procesie fałszywy alarm średnio raz na 370 próbek.</p>';
  if (X.adv && (qcVar() || t === 'imr')) { const x = qcVar() ? M.stat : X.D.x, mu0 = X.adv.mu0 ?? M.cl[0], sg = X.adv.sg ?? (qcVar() ? L.sigmaW / Math.sqrt(L.n) : L.sigmaW);
    if (X.adv.cusum) { const Cu = spcCusum(x, mu0, sg, X.adv.K, X.adv.H), first = Cu.find(r => r.sig);
      h += `<h4>CUSUM tabelaryczny</h4><p class="hint">C⁺<sub>i</sub> = max(0, x<sub>i</sub> − (μ₀ + K·σ) + C⁺<sub>i−1</sub>), C⁻<sub>i</sub> = max(0, (μ₀ − K·σ) − x<sub>i</sub> + C⁻<sub>i−1</sub>); sygnał, gdy któraś suma przekroczy H·σ = ${f(Cu[0].h)}. μ₀ = ${f(mu0)}, σ = ${f(sg)}. CUSUM szybciej niż karta Shewharta wykrywa małe, trwałe przesunięcia.</p>` +
        VZ.line([{name: 'C⁺', pts: Cu.map(r => [r.i + 1, r.cp]), dots: true}, {name: 'C⁻', pts: Cu.map(r => [r.i + 1, r.cm]), cls: 'c', dots: true}, {name: 'H', pts: [[1, Cu[0].h], [Cu.length, Cu[0].h]], cls: 'b'}], {title: 'CUSUM', xLabel: 'próbka'}) +
        `<p>${first ? `<b>Pierwszy sygnał w próbce ${first.i + 1}</b> (${first.cp > first.cm ? 'wzrost' : 'spadek'} średniej).` : 'Brak sygnału CUSUM.'}</p>`; }
    if (X.adv.ewma) { const Ew = spcEwma(x, mu0, sg, X.adv.lam, X.adv.Lw), first = Ew.find(r => r.sig);
      h += `<h4>EWMA</h4><p class="hint">z<sub>i</sub> = λx<sub>i</sub> + (1 − λ)z<sub>i−1</sub>, z₀ = μ₀; granice μ₀ ± Lσ√(λ/(2 − λ)·(1 − (1 − λ)<sup>2i</sup>)), λ = ${f(X.adv.lam)}, L = ${f(X.adv.Lw)}.</p>` +
        VZ.control(Ew.map(r => r.z), Ew.map(() => mu0), Ew.map(r => r.ucl), Ew.map(r => r.lcl), {flags: new Set(Ew.filter(r => r.sig).map(r => r.i)), title: 'EWMA', yLabel: 'z'}) + `<p>${first ? `<b>Pierwszy sygnał EWMA w próbce ${first.i + 1}.</b>` : 'Brak sygnału EWMA.'}</p>`; } }
  return h;
}
registerModule({id: 'qc', title: 'Karty kontrolne', init: qcInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M3 19h18" stroke-dasharray="3 2"/><path d="M3 12h18" /><path d="M4 13l3-4 3 5 3-3 3 2 3-6 2 3"/></svg>',
  html: '<div class="card"><div id="qc-top"></div><div><button id="btn-qc" type="button">Wyznacz kartę</button></div><div id="out-qc"></div></div>'});
