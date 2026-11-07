/* ===== OptiLab – moduł Procesy Markowa =====
   Interfejs i raport dydaktyczny. Obliczenia: js/markov/markov-solver.js (algebra: js/linalg.js). */
const MKP = 'markov-', MK_MAX = 12;
const mkSt = (names, rows, p0) => ({rn: names.slice(), cn: names.slice(), cells: rows.map(r => r.map(String)), xr: (p0 || names.map((_, i) => +(i === 0))).map(String)});
const MK_EXAMPLES = [
  {name: 'Pogoda: słońce, chmury, deszcz', data: {mode: 'dtmc', n: '3', st: mkSt(['Słońce', 'Chmury', 'Deszcz'], [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0.2, 0.4, 0.4]], [1, 0, 0])}},
  {name: 'Lojalność klientów: trzy marki', data: {mode: 'dtmc', n: '5', st: mkSt(['Marka A', 'Marka B', 'Marka C'], [[0.8, 0.1, 0.1], [0.07, 0.9, 0.03], [0.083, 0.067, 0.85]], [0.4, 0.3, 0.3])}},
  {name: 'Studia: lata, absolwent, rezygnacja (pochłaniający)', data: {mode: 'dtmc', n: '4', st: mkSt(['Rok 1', 'Rok 2', 'Rok 3', 'Absolwent', 'Rezygnacja'],
    [[0.1, 0.75, 0, 0, 0.15], [0, 0.1, 0.8, 0, 0.1], [0, 0, 0.1, 0.85, 0.05], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]], [1, 0, 0, 0, 0])}},
  {name: 'Ruina gracza (kapitał 0–4, p = 0,4)', data: {mode: 'dtmc', n: '10', st: mkSt(['0', '1', '2', '3', '4'], [[1, 0, 0, 0, 0], [0.6, 0, 0.4, 0, 0], [0, 0.6, 0, 0.4, 0], [0, 0, 0.6, 0, 0.4], [0, 0, 0, 0, 1]], [0, 0, 1, 0, 0])}},
  {name: 'Łańcuch okresowy (okres 3)', data: {mode: 'dtmc', n: '4', st: mkSt(['X', 'Y', 'Z'], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [1, 0, 0])}},
  {name: 'Maszyna: praca, przegląd, awaria (czas ciągły)', data: {mode: 'ctmc', n: '1', st: mkSt(['Praca', 'Przegląd', 'Awaria'], [[0, 0.1, 0.05], [2, 0, 0], [0.5, 0, 0]])}},
];
let MK = mkNormalize(JSON.parse(JSON.stringify(MK_EXAMPLES[0].data)));
function mkNormalize(d) {
  if (!d || !d.st || !Array.isArray(d.st.cells) || d.st.cells.length < 2) throw new Error('to nie jest zadanie z modułu Procesy Markowa (brak macierzy przejść).');
  const n = d.st.cells.length; if (n > MK_MAX) throw new Error(`za dużo stanów (${n}) – maksimum to ${MK_MAX}.`);
  if (d.st.cells.some(r => !Array.isArray(r) || r.length !== n)) throw new Error('macierz przejść musi być kwadratowa.');
  const names = Array.from({length: n}, (_, i) => String(d.st.rn?.[i] ?? 'S' + (i + 1)));
  return {mode: d.mode === 'ctmc' ? 'ctmc' : 'dtmc', n: String(d.n ?? '3'), st: {rn: names, cn: names.slice(), cells: d.st.cells.map(r => r.map(v => String(v))), xr: Array.from({length: n}, (_, i) => String(d.st.xr?.[i] ?? +(i === 0)))}};
}
function mkRender() {
  const n = MK.st.rn.length; $('#' + MKP + 'mode').value = MK.mode; $('#' + MKP + 'size').value = n; $('#' + MKP + 'names').value = MK.st.rn.join(', '); $('#' + MKP + 'n').value = MK.n;
  $('#' + MKP + 'nbox').hidden = MK.mode !== 'dtmc';
  $('#' + MKP + 'grid').innerHTML = matrixHTML(MKP, MK.st, {corner: MK.mode === 'dtmc' ? 'z \\ do' : 'intensywność z \\ do', staticNames: true, noMsg: true, diag: MK.mode === 'ctmc', ...(MK.mode === 'dtmc' ? {xrLabel: 'Rozkład początkowy'} : {})});
  matrixPolish($('#' + MKP + 'top'));
}
function mkSync() {
  matrixSync(MKP, MK.st); MK.mode = $('#' + MKP + 'mode').value; MK.n = $('#' + MKP + 'n').value;
  const nm = String($('#' + MKP + 'names').value).split(',').map(s => s.trim()); MK.st.rn = MK.st.rn.map((v, i) => nm[i] || v); MK.st.cn = MK.st.rn.slice();
}
function mkResize(n) { const o = MK.st, old = o.rn.length; o.rn = Array.from({length: n}, (_, i) => o.rn[i] ?? 'S' + (i + 1)); o.cn = o.rn.slice();
  o.cells = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => o.cells[i]?.[j] ?? (i === j && i >= old ? (MK.mode === 'dtmc' ? '1' : '0') : '0'))); o.xr = Array.from({length: n}, (_, i) => o.xr?.[i] ?? '0'); }
function mkInit() {
  $('#' + MKP + 'top').innerHTML = `<div class="crow"><label for="${MKP}mode">Rodzaj łańcucha</label><select id="${MKP}mode"><option value="dtmc">dyskretny (prawdopodobieństwa przejść)</option><option value="ctmc">z czasem ciągłym (intensywności przejść) – zaawansowane</option></select></div>
    <div class="crow"><label for="${MKP}size">Liczba stanów</label><select id="${MKP}size">${Array.from({length: MK_MAX - 1}, (_, k) => `<option>${k + 2}</option>`).join('')}</select></div>
    <div class="crow pfr"><label for="${MKP}names">Nazwy stanów (po przecinku)</label><input class="tx" id="${MKP}names" style="min-width:240px"></div>
    ${netCopyHTML(MKP)}<div id="${MKP}grid"></div><div id="${MKP}nbox" class="crow"><label for="${MKP}n">Liczba kroków n</label><input class="num" data-num inputmode="numeric" id="${MKP}n"></div><div id="${MKP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(MKP, MK_EXAMPLES)}</details>
    <p class="hint">Wiersz i – stan obecny, kolumna j – stan następny; w komórce prawdopodobieństwo przejścia (suma wiersza = 1). W łańcuchu z czasem ciągłym wpisujemy intensywności przejść (na jednostkę czasu).</p>`;
  $('#' + MKP + 'mode').onchange = () => { mkSync(); MK.mode = $('#' + MKP + 'mode').value; clearErr(); mkRender(); };
  $('#' + MKP + 'size').onchange = () => { mkSync(); mkResize(+$('#' + MKP + 'size').value); clearErr(); mkRender(); };
  $('#' + MKP + 'names').onchange = () => { mkSync(); mkRender(); };
  matrixWire($('#' + MKP + 'top'));
  netToolsWire(MKP, {kind: 'markov', out: '#out-markov', examples: MK_EXAMPLES, normalize: mkNormalize, get: () => { mkSync(); return JSON.parse(JSON.stringify(MK)); }, set: d => { MK = d; mkRender(); },
    toCSV: d => { const q = s => String(s).replace('.', ','); return '\uFEFF' + [`tryb;${d.mode}`, `kroki;${d.n}`, ['stan', ...d.st.cn].join(';'), ...d.st.rn.map((r, i) => [r, ...d.st.cells[i].map(q)].join(';')), ...(d.mode === 'dtmc' ? [['Rozkład początkowy', ...d.st.xr.map(q)].join(';')] : [])].join('\r\n') + '\r\n'; },
    fromCSV: t => mkFromCSV(t)});
  $('#btn-markov').onclick = mkSolveUI;
  mkRender();
}
function mkFromCSV(text) {
  const L = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).map((l, k) => ({c: l.split(';').map(s => s.trim()), ln: k + 1})).filter(x => x.c.join('') !== '');
  const d = {mode: 'dtmc', n: '3', st: {rn: [], cells: [], xr: []}}, num = (s, ln) => { const x = Number(String(s).replace(',', '.')); if (s === '' || !isFinite(x)) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(x); };
  let head = null;
  L.forEach(({c, ln}) => { const k = c[0].toLowerCase();
    if (k === 'tryb') d.mode = c[1] === 'ctmc' ? 'ctmc' : 'dtmc'; else if (k === 'kroki') d.n = c[1];
    else if (k === 'stan') head = c.slice(1); else if (k === 'rozkład początkowy') d.st.xr = c.slice(1).map(v => num(v, ln));
    else { if (!head) throw new Error(`wiersz ${ln}: brak nagłówka „stan;…" z nazwami stanów.`); if (c.length - 1 !== head.length) throw new Error(`wiersz ${ln}: liczba wartości (${c.length - 1}) różni się od liczby stanów (${head.length}).`);
      d.st.rn.push(c[0]); d.st.cells.push(c.slice(1).map(v => num(v, ln))); } });
  if (!head || d.st.cells.length !== head.length) throw new Error('macierz musi być kwadratowa (tyle wierszy, ile stanów w nagłówku).');
  return d;
}
function mkRead() {
  clearErr(); mkSync();
  const out = '#out-markov', n = MK.st.rn.length, bad = [], P = MK.st.cells.map((r, i) => r.map((v, j) => { if (MK.mode === 'ctmc' && i === j) return 0; const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x)) bad.push(`c${i}_${j}`); return x; }));
  if (bad.length) return netFail(MKP, out, 'wpisz w zaznaczonych komórkach liczby.', bad);
  const names = MK.st.rn.map(s => s.trim()); if (new Set(names).size < n || names.some(s => !s)) return netFail(MKP, out, 'nazwy stanów muszą być niepuste i różne (wpisz je po przecinku).', ['names']);
  const E = mkCheck(P, MK.mode === 'ctmc');
  if (E.length) { const e = E[0]; return netFail(MKP, out, esc(e.msg), E.flatMap(x => x.row ? MK.st.cn.map((_, j) => `c${x.i}_${j}`) : [`c${x.i}_${x.j}`])); }
  const X = {P, names, mode: MK.mode};
  if (MK.mode === 'dtmc') { const nn = Number(MK.n); if (!(Number.isInteger(nn) && nn >= 0 && nn <= 1000)) return netFail(MKP, out, 'liczba kroków: liczba całkowita od 0 do 1000.', ['n']); X.n = nn;
    const p0 = MK.st.xr.map((v, j) => { const x = Number(String(v).replace(',', '.')); if (!(x >= 0 && x <= 1)) bad.push('xr' + j); return x; });
    if (bad.length) return netFail(MKP, out, 'rozkład początkowy: prawdopodobieństwa od 0 do 1.', bad);
    if (Math.abs(p0.reduce((s, v) => s + v, 0) - 1) > MK_TOL) return netFail(MKP, out, 'rozkład początkowy musi sumować się do 1.', MK.st.cn.map((_, j) => 'xr' + j)); X.p0 = p0; }
  return X;
}
function mkSolveUI() { const X = mkRead(); if (!X) return; const h = mkReportHTML(X); $('#out-markov').innerHTML = h; last.markov = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function mkReportHTML(X) {
  const P = X.P, n = P.length, nm = i => esc(X.names[i]), f = v => !isFinite(v) ? '∞' : fmt(Math.round(v * 10000) / 10000), mat = (M, rowsL = X.names, colsL = X.names, cls = () => '') => '<div class="tw"><table><thead><tr><th></th>' + colsL.map(c => `<th>${esc(c)}</th>`).join('') + '</tr></thead>' +
    M.map((r, i) => `<tr><th>${esc(rowsL[i])}</th>${r.map((v, j) => `<td class="${cls(i, j)}">${f(v)}</td>`).join('')}</tr>`).join('') + '</table></div>';
  if (X.mode === 'ctmc') {
    const R = mkCTMC(P);
    let h = `<h3>Łańcuch Markowa z czasem ciągłym – ${n} stanów</h3><p class="hint">Generator Q: poza przekątną intensywności przejść q<sub>ij</sub>, na przekątnej q<sub>ii</sub> = −Σ q<sub>ij</sub>. Rozkład stacjonarny spełnia π·Q = 0 i Σπ = 1. Czas przebywania w stanie i ma rozkład wykładniczy ze średnią 1/(−q<sub>ii</sub>).</p>`;
    h += '<h4>Generator Q</h4>' + mat(R.Q, X.names, X.names, (i, j) => i === j ? 'sel' : '');
    h += VZ.stateGraph(X.names, P.flatMap((r, i) => r.map((v, j) => ({a: i, b: j, v})).filter(e => e.a !== e.b && e.v > 0).map(e => ({a: e.a, b: e.b, label: f(e.v)}))), {title: 'Graf przejść (intensywności)'});
    if (!R.pi) return h + '<p class="msg">Łańcuch ma więcej niż jedną klasę zamkniętą – rozkład stacjonarny nie jest jednoznaczny (zależy od stanu początkowego).</p>';
    h += '<h4>Rozkład stacjonarny</h4><div class="tw"><table><thead><tr><th>Stan</th><th>π</th><th>Średni czas przebywania 1/(−q<sub>ii</sub>)</th></tr></thead>' + R.pi.map((v, i) => `<tr><th>${nm(i)}</th><td><b>${f(v)}</b></td><td>${f(R.hold[i])}</td></tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Wynik:</b> w długim okresie proces przebywa ${R.pi.map((v, i) => `w stanie ${nm(i)} przez ${fmt(Math.round(v * 1000) / 10)}% czasu`).join(', ')}.</div>` + VZ.bars(X.names, R.pi, {title: 'Rozkład stacjonarny', pct: true, valueText: true});
    return h + '<h4>Łańcuch skoków (prawdopodobieństwa następnego stanu)</h4>' + mat(R.jump);
  }
  const R = mkAnalyze(P, X.p0, X.n), C = R.classes, kind = i => { const k = C.comps[C.cls[i]]; return k.absorbing ? 'abs' : k.closed ? 'rec' : 'tr'; };
  let h = `<h3>Łańcuch Markowa – ${n} stanów</h3>`;
  h += VZ.stateGraph(X.names, P.flatMap((r, i) => r.map((v, j) => ({a: i, b: j, v})).filter(e => e.v > 0).map(e => ({a: e.a, b: e.b, label: f(e.v)}))), {cls: X.names.map((_, i) => kind(i)), title: 'Graf przejść'}) +
    '<p class="hint">Zielone – stany powracające, czerwone – pochłaniające, żółte – chwilowe. Przy strzałkach – prawdopodobieństwa przejścia w jednym kroku.</p>';
  h += '<h4>Klasyfikacja stanów</h4><p class="hint">Stany komunikują się, gdy z każdego da się dojść do drugiego. Klasa zamknięta (nie da się jej opuścić) składa się ze stanów powracających; z klasy otwartej proces kiedyś odejdzie na zawsze – jej stany są chwilowe. Okres to NWD długości dróg powrotu do stanu.</p>' +
    '<div class="tw"><table><thead><tr><th>Klasa</th><th>Stany</th><th>Rodzaj</th><th>Okres</th></tr></thead>' + C.comps.map((k, q) => `<tr><td>${q + 1}</td><td>${k.states.map(nm).join(', ')}</td><td>${k.absorbing ? 'stan pochłaniający' : k.closed ? 'zamknięta – stany powracające' : 'otwarta – stany chwilowe'}</td><td>${k.period === null ? '–' : k.period === 1 ? '1 (nieokresowa)' : k.period}</td></tr>`).join('') + '</table></div>';
  if (R.pn) { h += `<h4>Rozkład po n = ${X.n} krokach</h4><div class="formula">p<sup>(n)</sup> = p<sup>(0)</sup>·Pⁿ</div><div class="tw"><table><thead><tr><th>Stan</th><th>p<sup>(0)</sup></th><th>p<sup>(${X.n})</sup></th></tr></thead>` +
      R.pn.map((v, i) => `<tr><th>${nm(i)}</th><td>${f(X.p0[i])}</td><td><b>${f(v)}</b></td></tr>`).join('') + '</table></div>' + `<details class="adv"><summary>Macierz P<sup>${X.n}</sup></summary>${mat(R.Pn)}</details>`;
    h += VZ.line(X.names.map((s, i) => ({name: s, pts: R.seq.map((p, k) => [k, p[i]]), cls: ['', 'b', 'c', 'd', 'e', 'f', 'g'][i % 7], dots: R.seq.length <= 25})), {title: 'Zbieżność rozkładu w kolejnych krokach', xLabel: 'krok n', yLabel: 'prawdopodobieństwo'}); }
  h += '<h4>Rozkład stacjonarny</h4>';
  if (R.unique) { const k = C.comps.find(q => q.closed);
    h += `<p class="hint">Rozwiązujemy układ π·P = π, Σπ = 1. Jest jedna klasa zamknięta, więc rozwiązanie jest jednoznaczne.${R.regular ? ' Łańcuch jest nieprzywiedlny i nieokresowy – rozkład po n krokach dąży do π niezależnie od stanu początkowego.' : k.period > 1 ? ` Klasa ma okres ${k.period} – rozkład po n krokach nie ma granicy (oscyluje), ale π opisuje średni udział czasu w stanach.` : ' Stany spoza klasy zamkniętej są chwilowe – w długim okresie ich prawdopodobieństwo maleje do 0.'}</p>` +
      '<div class="tw"><table><thead><tr><th>Stan</th><th>π</th>' + (R.mfpt ? '<th>Średni czas powrotu 1/π</th>' : '') + '</tr></thead>' + R.pi.map((v, i) => `<tr><th>${nm(i)}</th><td><b>${f(v)}</b></td>${R.mfpt ? `<td>${f(1 / v)}</td>` : ''}</tr>`).join('') + '</table></div>' +
      VZ.bars(X.names, R.pi, {title: 'Rozkład stacjonarny', pct: true, valueText: true});
  } else h += `<p class="note">Łańcuch ma ${R.stat.length} klasy zamknięte – rozkład stacjonarny nie jest jednoznaczny: każda kombinacja wypukła poniższych rozkładów jest stacjonarna, a to, gdzie proces „utknie", zależy od stanu początkowego.</p>` +
    mat(R.stat.map(s => s.pi), R.stat.map((s, q) => 'klasa ' + s.k.states.map(i => X.names[i]).join(', ')));
  if (R.abs) { const cl = R.abs.closed.map(k => k.states.map(i => X.names[i]).join(', ')), tn = R.abs.tr.map(i => X.names[i]);
    h += '<h4>Analiza pochłaniania</h4><p class="hint">Dzielimy macierz na część Q (przejścia między stanami chwilowymi) i R (przejścia do klas zamkniętych). Macierz fundamentalna N = (I − Q)⁻¹ podaje średnią liczbę wizyt w stanach chwilowych; t = N·1 – średnią liczbę kroków do pochłonięcia; B = N·R – prawdopodobieństwa, w której klasie proces skończy.</p>' +
      '<h4>Macierz fundamentalna N</h4>' + mat(R.abs.N, tn, tn) + '<h4>Prawdopodobieństwa pochłonięcia B i średnia liczba kroków t</h4><div class="tw"><table><thead><tr><th>Start</th>' + cl.map(c => `<th>→ ${esc(c)}</th>`).join('') + '<th>Średnia liczba kroków t</th></tr></thead>' +
      R.abs.B.map((r, i) => `<tr><th>${esc(tn[i])}</th>${r.map(v => `<td>${f(v)}</td>`).join('')}<td><b>${f(R.abs.t[i])}</b></td></tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Wynik:</b> ${R.abs.tr.map((i, r) => `ze stanu ${nm(i)} proces trafia ${R.abs.B[r].map((v, q) => `do ${esc(cl[q])} z prawdopodobieństwem ${fmt(Math.round(v * 1000) / 10)}%`).join(', ')} (średnio po ${f(R.abs.t[r])} krokach)`).join('; ')}.</div>`; }
  if (R.mfpt) h += '<h4>Średnie czasy pierwszego przejścia</h4><p class="hint">m<sub>ij</sub> – średnia liczba kroków, by z i po raz pierwszy dojść do j: m<sub>ij</sub> = 1 + Σ<sub>k≠j</sub> P<sub>ik</sub>·m<sub>kj</sub>. Na przekątnej – średni czas powrotu 1/π<sub>j</sub>.</p>' + mat(R.mfpt, X.names, X.names, (i, j) => i === j ? 'sel' : '');
  return h;
}
registerModule({id: 'markov', title: 'Procesy Markowa', init: mkInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="7" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6.5h6M16.5 9.5l-3 6M7.5 9.5l3 6"/></svg>',
  html: '<div class="card"><div id="markov-top"></div><div><button id="btn-markov" type="button">Analizuj łańcuch</button></div><div id="out-markov"></div></div>'});
