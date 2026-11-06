/* ===== OptiLab – moduł PERT/CPM (zarządzanie projektem) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/pm/cpm-solver.js. Wykresy: js/viz.js. Wspólne komponenty: js/net/netui.js. */
const CPP = 'cpm-', CP_MAX = 60;
const cpAct = (name, preds, t, a = '', m = '', b = '', dc = '', cn = '', cc = '') => ({name, preds, t: String(t), a: String(a), m: String(m), b: String(b), dc: String(dc), cn: String(cn), cc: String(cc)});
const CP_EXAMPLES = [
  {name: 'Budowa domu (Hillier i Lieberman, 44 tygodnie)', data: {mode: 'pert', acts: [
    cpAct('A', '', 2, 1, 2, 3), cpAct('B', 'A', 4, 2, 3.5, 8), cpAct('C', 'B', 10, 6, 9, 18), cpAct('D', 'C', 6, 4, 5.5, 10), cpAct('E', 'C', 4, 1, 4.5, 5), cpAct('F', 'E', 5, 4, 4, 10), cpAct('G', 'D', 7, 5, 6.5, 11),
    cpAct('H', 'E, G', 9, 5, 8, 17), cpAct('I', 'C', 7, 3, 7.5, 9), cpAct('J', 'F, I', 8, 3, 9, 9), cpAct('K', 'J', 4, 4, 4, 4), cpAct('L', 'J', 5, 1, 5.5, 7), cpAct('M', 'H', 2, 1, 2, 3), cpAct('N', 'K, L', 6, 5, 5.5, 9)], tq: '47', pq: '0.95'}},
  {name: 'Wdrożenie systemu (CPM, dwie ścieżki krytyczne)', data: {mode: 'cpm', acts: [cpAct('Analiza', '', 3), cpAct('Projekt', 'Analiza', 4), cpAct('Sprzęt', 'Analiza', 6), cpAct('Program', 'Projekt', 5), cpAct('Instalacja', 'Sprzęt', 3), cpAct('Testy', 'Program, Instalacja', 2), cpAct('Szkolenie', 'Projekt', 2), cpAct('Start', 'Testy, Szkolenie', 1)]}},
  {name: 'Skracanie projektu (czas i koszt)', data: {mode: 'cpm', crash: true, target: '14', overhead: '400', acts: [
    cpAct('A', '', 4, '', '', '', 2, 1000, 1400), cpAct('B', '', 6, '', '', '', 4, 1500, 2300), cpAct('C', 'A', 5, '', '', '', 3, 800, 1300), cpAct('D', 'A', 3, '', '', '', 2, 600, 900),
    cpAct('E', 'B, C', 4, '', '', '', 3, 1200, 1500), cpAct('F', 'D', 6, '', '', '', 4, 900, 1500), cpAct('G', 'E, F', 3, '', '', '', 2, 700, 1000)]}},
  {name: 'Wydarzenie (PERT + symulacja Monte Carlo)', data: {mode: 'pert', mc: true, N: '20000', seed: '7', tq: '30', pq: '0.9', acts: [
    cpAct('Sala', '', '', 2, 4, 8), cpAct('Prelegenci', '', '', 5, 8, 15), cpAct('Program', 'Prelegenci', '', 3, 5, 9), cpAct('Druk', 'Program', '', 2, 3, 6), cpAct('Promocja', 'Program, Sala', '', 6, 10, 18), cpAct('Rejestracja', 'Promocja', '', 3, 4, 7), cpAct('Catering', 'Sala', '', 4, 6, 12)]}},
  {name: 'Cykl w poprzednikach (pokaz błędu)', data: {mode: 'cpm', acts: [cpAct('A', 'C', 2), cpAct('B', 'A', 3), cpAct('C', 'B', 4)]}},
];
let CP = cpNormalize(JSON.parse(JSON.stringify(CP_EXAMPLES[0].data)));
function cpNormalize(d) {
  if (!d || !Array.isArray(d.acts) || !d.acts.length) throw new Error('to nie jest zadanie PERT/CPM (brak listy czynności).');
  if (d.acts.length > CP_MAX) throw new Error(`za dużo czynności (${d.acts.length}) – maksimum to ${CP_MAX}.`);
  const S = v => String(v ?? '');
  return {mode: d.mode === 'pert' ? 'pert' : 'cpm', crash: !!d.crash, mc: !!d.mc, indep: !!d.indep, target: S(d.target), overhead: S(d.overhead), N: S(d.N || '10000'), seed: S(d.seed || '1'), tq: S(d.tq), pq: S(d.pq || '0.95'),
    acts: d.acts.map(a => cpAct(S(a.name), S(a.preds), S(a.t), S(a.a), S(a.m), S(a.b), S(a.dc), S(a.cn), S(a.cc)))};
}
const cpCols = () => [{key: 'name', label: 'Czynność', type: 'name'}, {key: 'preds', label: 'Poprzedniki', type: 'text', ph: 'np. A, B'},
  ...(CP.mode === 'pert' ? [{key: 'a', label: 'a (optymist.)', type: 'num'}, {key: 'm', label: 'm (najbardziej prawd.)', type: 'num'}, {key: 'b', label: 'b (pesymist.)', type: 'num'}] : [{key: 't', label: 'Czas', type: 'num'}]),
  ...(CP.mode === 'cpm' && CP.crash ? [{key: 'dc', label: 'Czas skrócony', type: 'num'}, {key: 'cn', label: 'Koszt normalny', type: 'num'}, {key: 'cc', label: 'Koszt skrócony', type: 'num'}] : [])];
const CP_CSV_COLS = [{key: 'name', label: 'Czynność', type: 'name'}, {key: 'preds', label: 'Poprzedniki', type: 'text', blank: true}, {key: 't', label: 'Czas', type: 'num', blank: true},
  {key: 'a', label: 'a', type: 'num', blank: true}, {key: 'm', label: 'm', type: 'num', blank: true}, {key: 'b', label: 'b', type: 'num', blank: true},
  {key: 'dc', label: 'Czas skrócony', type: 'num', blank: true}, {key: 'cn', label: 'Koszt normalny', type: 'num', blank: true}, {key: 'cc', label: 'Koszt skrócony', type: 'num', blank: true}];
function cpRender() {
  $('#' + CPP + 'mode').value = CP.mode; $('#' + CPP + 'crash').checked = CP.crash; $('#' + CPP + 'mc').checked = CP.mc; $('#' + CPP + 'indep').checked = CP.indep;
  ['target', 'overhead', 'N', 'seed', 'tq', 'pq'].forEach(k => { $('#' + CPP + k).value = CP[k]; });
  $('#' + CPP + 'pertbox').hidden = CP.mode !== 'pert'; $('#' + CPP + 'crashbox').hidden = !(CP.crash && CP.mode === 'cpm'); $('#' + CPP + 'mcbox').hidden = !(CP.mc && CP.mode === 'pert');
  $('#' + CPP + 'crashnote').hidden = !(CP.crash && CP.mode === 'pert'); $('#' + CPP + 'mcnote').hidden = !(CP.mc && CP.mode === 'cpm');
  const box = $('#' + CPP + 'grid'); box.innerHTML = rowTableHTML(CPP, cpCols(), CP.acts, {addLabel: '+ czynność', count: n => `${n} ${n === 1 ? 'czynność' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'czynności' : 'czynności'}`});
  $('#' + CPP + 'add').onclick = () => { cpSync(); if (CP.acts.length >= CP_MAX) return; CP.acts.push(cpAct(spName(CP.acts.length), '', 1, 1, 1, 1)); cpRender(); };
  matrixPolish(box);
}
function cpSync() {
  CP.acts = rowTableSync(CPP, cpCols(), CP.acts); CP.mode = $('#' + CPP + 'mode').value; CP.crash = $('#' + CPP + 'crash').checked; CP.mc = $('#' + CPP + 'mc').checked; CP.indep = $('#' + CPP + 'indep').checked;
  ['target', 'overhead', 'N', 'seed', 'tq', 'pq'].forEach(k => { CP[k] = $('#' + CPP + k).value; });
}
function cpInit() {
  const num = (id, ph) => `<input class="num" data-num data-blank inputmode="decimal" id="${CPP}${id}"${ph ? ` placeholder="${ph}"` : ''}>`;
  $('#' + CPP + 'top').innerHTML = `<div class="crow"><label for="${CPP}mode">Czasy czynności</label><select id="${CPP}mode"><option value="cpm">jeden czas (CPM)</option><option value="pert">trzy oszacowania a, m, b (PERT)</option></select></div>
    ${netCopyHTML(CPP)}<div id="${CPP}grid"></div><div id="${CPP}msg"></div>
    <div id="${CPP}pertbox" class="crow"><label for="${CPP}tq">Termin t</label>${num('tq', 'np. 47')}<label for="${CPP}pq">Prawdopodobieństwo p</label>${num('pq', '0,95')}</div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div class="crow"><label class="chk"><input type="checkbox" id="${CPP}indep"> pokaż rezerwę niezależną</label></div>
     <div class="crow"><label class="chk"><input type="checkbox" id="${CPP}crash"> skracanie czasu projektu (koszt)</label></div>
     <p class="hint" id="${CPP}crashnote">Skracanie liczymy dla czasów deterministycznych – przełącz „Czasy czynności" na CPM.</p>
     <div id="${CPP}crashbox" class="crow"><label for="${CPP}target">Termin docelowy</label>${num('target')}<label for="${CPP}overhead">Koszt pośredni na jednostkę czasu</label>${num('overhead', '0')}</div>
     <div class="crow"><label class="chk"><input type="checkbox" id="${CPP}mc"> symulacja Monte Carlo (rozkład Beta-PERT)</label></div>
     <p class="hint" id="${CPP}mcnote">Symulacja wymaga trzech oszacowań – przełącz „Czasy czynności" na PERT.</p>
     <div id="${CPP}mcbox" class="crow"><label for="${CPP}N">Liczba symulacji</label>${num('N')}<label for="${CPP}seed">Ziarno</label>${num('seed')}</div>
     ${netToolsHTML(CPP, CP_EXAMPLES)}</details>
    <p class="hint">Wpisz czynności projektu, ich bezpośrednich poprzedników (nazwy po przecinku, puste = brak) i czasy. Program wyznaczy harmonogram, rezerwy i ścieżkę krytyczną.</p>`;
  $('#' + CPP + 'mode').onchange = () => { cpSync(); CP.mode = $('#' + CPP + 'mode').value;
    if (CP.mode === 'pert') CP.acts.forEach(a => { if (a.a === '' && a.m === '' && a.b === '') a.a = a.m = a.b = a.t; }); else CP.acts.forEach(a => { if (a.t === '' && a.m !== '') a.t = a.m; });
    clearErr(); cpRender(); };
  ['crash', 'mc'].forEach(k => $('#' + CPP + k).onchange = () => { cpSync(); clearErr(); cpRender(); });
  const box = $('#' + CPP + 'grid'); matrixWire(box);
  box.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; cpSync(); if (CP.acts.length > 1) CP.acts.splice(+k, 1); clearErr(); cpRender(); });
  matrixWire($('#' + CPP + 'top'));
  netToolsWire(CPP, {kind: 'cpm', out: '#out-cpm', examples: CP_EXAMPLES, normalize: cpNormalize,
    get: () => { cpSync(); return JSON.parse(JSON.stringify(CP)); }, set: d => { CP = d; cpRender(); },
    toCSV: d => rowsToCSV(CP_CSV_COLS, d.acts, [['tryb', d.mode]]),
    fromCSV: t => { const r = rowsFromCSV(t, CP_CSV_COLS, ['tryb']); return {mode: /pert/i.test(r.meta['tryb'] || '') || r.rows.some(x => x.a !== '' && x.t === '') ? 'pert' : 'cpm', acts: r.rows}; }});
  $('#btn-cpm').onclick = cpSolveUI;
  cpRender();
}
/* odczyt i walidacja → zadanie dla solvera (null = błąd przy polach) */
function cpRead() {
  clearErr(); cpSync();
  const out = '#out-cpm', A = CP.acts, chk = cpmCheck(A.map(a => a.name), A.map(a => a.preds));
  if (chk.errors.length) { const e = chk.errors[0]; return netFail(CPP, out, `wiersz ${e.i + 1}: ${esc(e.msg)}`, chk.errors.map(x => x.field + x.i)); }
  if (chk.cycle) return netFail(CPP, out, `poprzedniki tworzą cykl: ${chk.cycle.map(i => esc(A[i].name)).join(' → ')}. W sieci projektu czynność nie może pośrednio poprzedzać samej siebie.`, chk.cycle.slice(0, -1).map(i => 'preds' + i));
  const bad = [], val = (v, id) => { const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x) || x < 0 || x > 1e9) { bad.push(id); return NaN; } return x; };
  const P = {names: A.map(a => a.name.trim()), preds: chk.preds};
  if (CP.mode === 'pert') {
    P.pert = A.map((a, i) => ({a: val(a.a, 'a' + i), m: val(a.m, 'm' + i), b: val(a.b, 'b' + i)}));
    if (bad.length) return netFail(CPP, out, 'wpisz w zaznaczonych polach czasy (liczby nieujemne).', bad);
    const ord = P.pert.map((q, i) => q.a <= q.m && q.m <= q.b ? null : i).filter(i => i !== null);
    if (ord.length) return netFail(CPP, out, `oszacowania muszą spełniać a ≤ m ≤ b (wiersz ${ord[0] + 1}: ${esc(A[ord[0]].name)}).`, ord.flatMap(i => ['a' + i, 'm' + i, 'b' + i]));
  } else {
    P.d = A.map((a, i) => val(a.t, 't' + i));
    if (bad.length) return netFail(CPP, out, 'wpisz w zaznaczonych polach czasy (liczby nieujemne).', bad);
  }
  const X = {};
  if (CP.mode === 'pert') {
    if (CP.tq.trim() !== '') { X.tq = val(CP.tq, 'tq'); if (bad.length) return netFail(CPP, out, 'termin t musi być liczbą nieujemną.', bad); }
    const pq = Number(String(CP.pq).replace(',', '.')); if (CP.pq.trim() !== '') { if (!(pq > 0 && pq < 1)) return netFail(CPP, out, 'prawdopodobieństwo p musi być liczbą z przedziału (0; 1), np. 0,95.', ['pq']); X.pq = pq; }
    if (CP.mc) { const N = Number(CP.N), seed = Number(CP.seed); if (!(Number.isInteger(N) && N >= 100 && N <= 200000)) return netFail(CPP, out, 'liczba symulacji: liczba całkowita od 100 do 200 000.', ['N']); if (!Number.isInteger(seed)) return netFail(CPP, out, 'ziarno musi być liczbą całkowitą.', ['seed']); X.mc = {N, seed}; }
  }
  if (CP.mode === 'cpm' && CP.crash) {
    const cr = A.map((a, i) => ({dc: val(a.dc === '' ? a.t : a.dc, 'dc' + i), cn: val(a.cn === '' ? '0' : a.cn, 'cn' + i), cc: val(a.cc === '' ? (a.cn || '0') : a.cc, 'cc' + i)}));
    if (bad.length) return netFail(CPP, out, 'skracanie: wpisz w zaznaczonych polach liczby nieujemne.', bad);
    const e1 = cr.map((q, i) => q.dc > P.d[i] ? 'dc' + i : null).filter(Boolean); if (e1.length) return netFail(CPP, out, 'czas skrócony nie może być dłuższy niż czas normalny.', e1);
    const e2 = cr.map((q, i) => q.cc < q.cn ? 'cc' + i : null).filter(Boolean); if (e2.length) return netFail(CPP, out, 'koszt skrócony nie może być mniejszy niż koszt normalny.', e2);
    const tg = CP.target.trim() === '' ? NaN : val(CP.target, 'target'); if (bad.length) return netFail(CPP, out, 'termin docelowy musi być liczbą nieujemną.', bad);
    const oh = CP.overhead.trim() === '' ? 0 : val(CP.overhead, 'overhead'); if (bad.length) return netFail(CPP, out, 'koszt pośredni musi być liczbą nieujemną.', bad);
    X.crash = {cr, target: tg, overhead: oh};
  }
  return {P, X};
}
function cpSolveUI() {
  const IN = cpRead(); if (!IN) return;
  const R = cpmSolve(IN.P); if (R.status !== 'ok') return netFail(CPP, '#out-cpm', 'nie udało się ułożyć czynności w kolejności (cykl).', []);
  const extra = {};
  if (IN.X.crash) { const tg = isFinite(IN.X.crash.target) ? IN.X.crash.target : R.T; extra.crash = {...cpmCrash(IN.P, R, IN.X.crash.cr, tg, IN.X.crash.overhead), target: tg, cr: IN.X.crash.cr, overhead: IN.X.crash.overhead}; }
  if (IN.X.mc) extra.mc = cpmMonteCarlo(IN.P, R, IN.X.mc.N, IN.X.mc.seed);
  const h = cpReportHTML(IN.P, R, {...IN.X, ...extra, indep: CP.indep}); $('#out-cpm').innerHTML = h; last.cpm = h;
  if (extra.crash && extra.crash.status === 'infeasible') netFail(CPP, null, `termin ${fmt(extra.crash.target)} jest krótszy niż najkrótszy możliwy czas projektu (${fmt(extra.crash.Tmin)}) – nawet po maksymalnym skróceniu wszystkich czynności.`, ['target']);
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function cpReportHTML(P, R, X = {}) {
  const n = R.n, nm = i => esc(P.names[i]), pert = !!P.pert, pc = v => fmt(Math.round(v * 10000) / 100) + '%';
  let h = `<h3>Harmonogram projektu – metoda ${pert ? 'PERT' : 'ścieżki krytycznej (CPM)'}</h3><p>${n} ${n === 1 ? 'czynność' : 'czynności'}. Czas trwania projektu: <b>${fmt(R.T)}</b>.` +
    (pert ? ' Czasy oczekiwane liczymy ze wzoru t<sub>e</sub> = (a + 4m + b) / 6, a wariancje σ² = ((b − a) / 6)².' : '') + '</p>';
  // krok 1–2: przejście w przód i wstecz
  const fw = R.fwd.map(s => `<tr><th>${nm(s.j)}</th><td class="tl">${s.from.length ? 'max(' + s.from.map(([i, v]) => `EF<sub>${nm(i)}</sub> = ${fmt(v)}`).join('; ') + ')' : 'brak poprzedników → 0'}</td><td>${fmt(R.ES[s.j])}</td><td>${fmt(R.ES[s.j])} + ${fmt(R.d[s.j])} = <b>${fmt(R.EF[s.j])}</b></td></tr>`).join('');
  const bw = R.bwd.map(s => `<tr><th>${nm(s.i)}</th><td class="tl">${s.to.length ? 'min(' + s.to.map(([j, v]) => `LS<sub>${nm(j)}</sub> = ${fmt(v)}`).join('; ') + ')' : `brak następników → czas projektu ${fmt(R.T)}`}</td><td>${fmt(R.LF[s.i])}</td><td>${fmt(R.LF[s.i])} − ${fmt(R.d[s.i])} = <b>${fmt(R.LS[s.i])}</b></td></tr>`).join('');
  h += `<details class="adv"${n <= 15 ? ' open' : ''}><summary>Krok 1. Przejście w przód (najwcześniejsze terminy)</summary><p class="hint">Czynność może się zacząć dopiero, gdy skończą się wszystkie jej poprzedniki: ES = max EF poprzedników, EF = ES + czas.</p>` +
    `<div class="tw"><table><thead><tr><th>Czynność</th><th>Skąd ES</th><th>ES</th><th>EF = ES + czas</th></tr></thead>${fw}</table></div></details>`;
  h += `<details class="adv"${n <= 15 ? ' open' : ''}><summary>Krok 2. Przejście wstecz (najpóźniejsze terminy)</summary><p class="hint">Idziemy od końca: czynność musi się skończyć, zanim musi się zacząć którykolwiek następnik: LF = min LS następników, LS = LF − czas.</p>` +
    `<div class="tw"><table><thead><tr><th>Czynność</th><th>Skąd LF</th><th>LF</th><th>LS = LF − czas</th></tr></thead>${bw}</table></div></details>`;
  // krok 3: rezerwy i ścieżki krytyczne
  h += `<h4>Krok 3. Rezerwy i ścieżka krytyczna</h4><p class="hint">Rezerwa całkowita LS − ES: o ile można opóźnić czynność bez opóźnienia projektu. Rezerwa swobodna: o ile można ją opóźnić, nie opóźniając żadnego następnika.${X.indep ? ' Rezerwa niezależna: zapas dostępny nawet wtedy, gdy poprzedniki skończą się najpóźniej, a następniki zaczną najwcześniej.' : ''} Czynności z rezerwą całkowitą 0 są krytyczne.</p>`;
  h += `<div class="tw"><table><thead><tr><th>Czynność</th><th>Czas</th>${pert ? '<th>σ²</th>' : ''}<th>ES</th><th>EF</th><th>LS</th><th>LF</th><th>Rezerwa całkowita</th><th>Rezerwa swobodna</th>${X.indep ? '<th>Rezerwa niezależna</th>' : ''}<th>Krytyczna</th></tr></thead>` +
    R.order.map(i => `<tr${R.crit[i] ? ' class="sel"' : ''}><th>${nm(i)}</th><td>${fmt(R.d[i])}</td>${pert ? `<td>${fmt(R.vr[i])}</td>` : ''}<td>${fmt(R.ES[i])}</td><td>${fmt(R.EF[i])}</td><td>${fmt(R.LS[i])}</td><td>${fmt(R.LF[i])}</td><td>${fmt(R.TF[i])}</td><td>${fmt(R.FF[i])}</td>${X.indep ? `<td>${fmt(R.IF[i])}</td>` : ''}<td>${R.crit[i] ? 'tak' : '–'}</td></tr>`).join('') + '</table></div>';
  h += `<div class="sum"><b>Wynik:</b> czas projektu = <b>${fmt(R.T)}</b>. ${R.paths.length === 1 ? 'Ścieżka krytyczna' : `Ścieżki krytyczne (${R.paths.length}${R.truncated ? '+' : ''})`}: ${R.paths.slice(0, 10).map(p => '<b>' + p.map(nm).join(' → ') + '</b>').join('; ')}${R.paths.length > 10 ? ' …' : ''}.</div>`;
  if (R.paths.length > 1) h += '<p class="note">Jest więcej niż jedna ścieżka krytyczna – opóźnienie czynności na którejkolwiek z nich opóźni cały projekt, a skrócenie projektu wymaga skrócenia wszystkich tych ścieżek.</p>';
  if (R.d.some(v => v === 0)) h += '<p class="hint">Czynności o czasie 0 (np. kamienie milowe) mogą tworzyć dodatkowe, równoległe ścieżki krytyczne o tej samej długości.</p>';
  // wykres Gantta i sieć
  const rows = R.order.slice().sort((a, b) => R.ES[a] - R.ES[b] || a - b).map(i => ({label: P.names[i], bars: [{s: R.ES[i], e: R.EF[i], cls: R.crit[i] ? 'crit' : '', text: fmt(R.d[i])}, ...(R.TF[i] > 1e-9 ? [{s: R.EF[i], e: R.LF[i], cls: 'slack'}] : [])]}));
  h += '<h3>Wykres Gantta</h3><p class="hint">Czerwone – czynności krytyczne, niebieskie – pozostałe; szary prostokąt – rezerwa (do najpóźniejszego zakończenia LF).</p>' + VZ.gantt(rows, {tmax: R.T, title: 'Wykres Gantta', marks: [{t: R.T, label: 'koniec ' + fmt(R.T)}]});
  const nn = n + 2, names = ['Start', ...P.names, 'Koniec'], E = [];
  P.preds.forEach((ps, j) => { if (!ps.length) E.push({a: 0, b: j + 1, cls: R.crit[j] && R.ES[j] === 0 ? 'path' : 'other'}); ps.forEach(i => E.push({a: i + 1, b: j + 1, cls: R.crit[i] && R.crit[j] && Math.abs(R.EF[i] - R.ES[j]) < 1e-9 ? 'path' : 'other'})); });
  R.succ.forEach((sc, i) => { if (!sc.length) E.push({a: i + 1, b: nn - 1, cls: R.crit[i] && Math.abs(R.EF[i] - R.T) < 1e-9 ? 'path' : 'other'}); });
  h += '<h3>Sieć czynności</h3><p class="hint">Czynności w węzłach (pod węzłem: ES – EF). Pogrubione strzałki – ścieżka krytyczna.</p>' +
    layeredSVG(names, E, 0, {sub: ['', ...P.names.map((_, i) => `${fmt(R.ES[i])} – ${fmt(R.EF[i])}`), fmt(R.T)], cls: names.map((_, k) => k === 0 ? 'src' : k === nn - 1 ? 'dst' : R.crit[k - 1] ? 'crit' : ''), title: 'Sieć czynności'});
  // PERT
  if (pert) {
    const w = R.worst, mu = R.T, sg = R.sigma;
    h += `<h3>Analiza PERT</h3><p>Czas projektu jest sumą czasów czynności na ścieżce krytycznej, więc (z centralnego twierdzenia granicznego) przyjmujemy rozkład normalny ze średnią μ = ${fmt(mu)} i wariancją σ² = suma wariancji czynności krytycznych` +
      (w >= 0 ? `: ${R.paths[w].map(i => fmt(R.vr[i])).join(' + ')} = <b>${fmt(R.pathVar[w])}</b>, σ = ${fmt(sg)}.` : '.') + (R.paths.length > 1 ? ' Spośród ścieżek krytycznych wybieramy tę o największej wariancji (najbardziej niepewną).' : '') + '</p>';
    if (X.tq !== undefined) { const z = sg > 0 ? (X.tq - mu) / sg : NaN, p = cpmProb(R, X.tq);
      h += `<div class="sum"><b>P(T ≤ ${fmt(X.tq)})</b> = ${sg > 0 ? `Φ((${fmt(X.tq)} − ${fmt(mu)}) / ${fmt(sg)}) = Φ(${fmt(Math.round(z * 1e4) / 1e4)}) = ` : ''}<b>${pc(p)}</b> – prawdopodobieństwo ukończenia projektu w terminie ${fmt(X.tq)}.</div>`; }
    if (X.pq !== undefined && sg > 0) h += `<p>Termin, który zostanie dotrzymany z prawdopodobieństwem ${pc(X.pq)}: t = μ + z·σ = ${fmt(mu)} + ${fmt(Math.round(ST.normInv(X.pq) * 1e4) / 1e4)} · ${fmt(sg)} = <b>${fmt(Math.round(cpmTimeFor(R, X.pq) * 1e4) / 1e4)}</b>.</p>`;
    if (sg > 0) { const pts = []; for (let k = 0; k <= 80; k++) { const x = mu - 4 * sg + 8 * sg * k / 80; pts.push([x, ST.normPdf(x, mu, sg)]); }
      h += VZ.line([{name: 'gęstość czasu projektu', pts}], {title: 'Rozkład czasu projektu', xLabel: 'czas', marks: [...(X.tq !== undefined ? [{x: X.tq, y: ST.normPdf(X.tq, mu, sg), label: 't = ' + fmt(X.tq)}] : [])]}); }
    h += '<p class="hint">Uwaga: rozkład normalny uwzględnia tylko jedną ścieżkę krytyczną; gdy inne ścieżki są prawie tak długie, rzeczywiste ryzyko opóźnienia jest większe – pokazuje to symulacja Monte Carlo (Opcje zaawansowane).</p>';
  }
  // skracanie
  if (X.crash) {
    const C = X.crash;
    h += `<h3>Skracanie czasu projektu</h3><p class="hint">Koszt skrócenia o jednostkę czasu = (koszt skrócony − koszt normalny) / (czas normalny − czas skrócony). Najtańsze skrócenie do terminu wyznacza program liniowy rozwiązywany naszym solverem (zmienne: terminy rozpoczęcia i skrócenia czynności).</p>`;
    h += '<div class="tw"><table><thead><tr><th>Czynność</th><th>Czas normalny</th><th>Czas skrócony</th><th>Koszt skrócenia o 1</th></tr></thead>' + C.cr.map((q, i) => `<tr><th>${nm(i)}</th><td>${fmt(R.d[i])}</td><td>${fmt(q.dc)}</td><td>${R.d[i] - q.dc > 1e-9 ? fmt(C.slope[i]) : '–'}</td></tr>`).join('') + '</table></div>';
    h += `<p>Najkrótszy możliwy czas projektu (wszystkie czynności skrócone maksymalnie): <b>${fmt(C.Tmin)}</b>. Koszt przy czasach normalnych: ${fmt(C.base)}.</p>`;
    if (C.status === 'optimal') {
      h += `<div class="sum"><b>Skrócenie do ${fmt(C.target)}:</b> minimalny koszt bezpośredni = <b>${fmt(Math.round(C.cost * 1e4) / 1e4)}</b> (dopłata ${fmt(Math.round((C.cost - C.base) * 1e4) / 1e4)}).</div>`;
      const used = C.plan.map((y, i) => [i, y]).filter(([, y]) => y > 1e-9);
      h += used.length ? '<div class="tw"><table><thead><tr><th>Skracana czynność</th><th>O ile</th><th>Nowy czas</th><th>Dopłata</th></tr></thead>' + used.map(([i, y]) => `<tr><th>${nm(i)}</th><td>${fmt(Math.round(y * 1e4) / 1e4)}</td><td>${fmt(Math.round((R.d[i] - y) * 1e4) / 1e4)}</td><td>${fmt(Math.round(y * C.slope[i] * 1e4) / 1e4)}</td></tr>`).join('') + '</table></div>' : '<p>Termin jest osiągalny bez skracania.</p>';
    } else if (C.status === 'infeasible') h += `<p class="msg">Termin ${fmt(C.target)} jest nieosiągalny: najkrótszy możliwy czas projektu to ${fmt(C.Tmin)}.</p>`;
    else h += '<p class="msg">Nie udało się rozwiązać zadania skracania (limit obliczeń) – wynik byłby niewiarygodny.</p>';
    if (C.curve) {
      h += '<h4>Krzywa czas – koszt</h4><p class="hint">Każdy punkt to najtańszy plan dla danego czasu projektu; między punktami koszt rośnie liniowo. Punkty załamania wyznaczono dokładnie analizą parametryczną.</p>' +
        '<div class="tw"><table><thead><tr><th>Czas projektu</th><th>Koszt bezpośredni</th>' + (X.crash.overhead > 0 ? '<th>Koszt pośredni</th><th>Koszt całkowity</th>' : '') + '</tr></thead>' +
        C.curve.map(([x, y]) => `<tr${C.best && Math.abs(C.best.T - x) < 1e-9 ? ' class="sel"' : ''}><td>${fmt(Math.round(x * 1e4) / 1e4)}</td><td>${fmt(Math.round(y * 1e4) / 1e4)}</td>` + (X.crash.overhead > 0 ? `<td>${fmt(Math.round(X.crash.overhead * x * 1e4) / 1e4)}</td><td>${fmt(Math.round((y + X.crash.overhead * x) * 1e4) / 1e4)}</td>` : '') + '</tr>').join('') + '</table></div>';
      const series = [{name: 'koszt bezpośredni', pts: C.curve, dots: true}]; if (X.crash.overhead > 0) series.push({name: 'koszt całkowity', pts: C.curve.map(([x, y]) => [x, y + X.crash.overhead * x]), cls: 'b', dots: true});
      h += VZ.line(series, {title: 'Krzywa czas – koszt', xLabel: 'czas projektu', yLabel: 'koszt', marks: C.best ? [{x: C.best.T, y: C.best.tot, label: 'minimum ' + fmt(Math.round(C.best.tot * 100) / 100)}] : []});
      if (C.best) h += `<div class="sum"><b>Optimum kosztu całkowitego</b> (z kosztem pośrednim ${fmt(X.crash.overhead)} na jednostkę czasu): czas <b>${fmt(Math.round(C.best.T * 1e4) / 1e4)}</b>, koszt całkowity <b>${fmt(Math.round(C.best.tot * 100) / 100)}</b>.</div>`;
    }
  }
  // Monte Carlo
  if (X.mc) {
    const M = X.mc, f = v => fmt(Math.round(v * 1000) / 1000);
    h += `<h3>Symulacja Monte Carlo</h3><p class="hint">${M.N} razy losujemy czasy czynności z rozkładu Beta-PERT(a, m, b) (ziarno ${M.seed}) i liczymy czas projektu. Uwzględnia to wszystkie ścieżki, nie tylko krytyczną.</p>`;
    h += `<p>Średni czas projektu: <b>${f(M.mean)}</b> (PERT: ${f(R.T)}), odchylenie standardowe ${f(M.sd)} (PERT: ${f(R.sigma)}). Percentyle: 50% – ${f(M.pct(0.5))}, 80% – ${f(M.pct(0.8))}, 90% – ${f(M.pct(0.9))}, 95% – ${f(M.pct(0.95))}.</p>`;
    if (X.tq !== undefined) h += `<div class="sum"><b>P(T ≤ ${fmt(X.tq)})</b>: symulacja <b>${pc(M.prob(X.tq))}</b>, rozkład normalny PERT ${pc(cpmProb(R, X.tq))}.</div>`;
    h += VZ.hist(M.times, {title: 'Rozkład czasu projektu (symulacja)', xLabel: 'czas projektu', curve: R.sigma > 0 ? x => ST.normPdf(x, R.T, R.sigma) : null, marks: X.tq !== undefined ? [{x: X.tq, label: 't = ' + fmt(X.tq)}] : []});
    h += '<p class="hint">Linia – rozkład normalny z analizy PERT. Przesunięcie histogramu w prawo oznacza, że ścieżki niekrytyczne też mogą wydłużyć projekt.</p><div class="tw"><table><thead><tr><th>Czynność</th><th>Indeks krytyczności</th></tr></thead>' +
      R.order.map(i => `<tr${M.crit[i] > 0.5 ? ' class="sel"' : ''}><th>${nm(i)}</th><td>${pc(M.crit[i])}</td></tr>`).join('') + '</table></div><p class="hint">Indeks krytyczności – w jakiej części symulacji czynność była krytyczna.</p>';
  }
  return h;
}
registerModule({id: 'cpm', title: 'PERT / CPM', init: cpInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="3" rx="1"/><rect x="9" y="10.5" width="9" height="3" rx="1"/><rect x="6" y="16" width="12" height="3" rx="1"/></svg>',
  html: '<div class="card"><div id="cpm-top"></div><div><button id="btn-cpm" type="button">Wyznacz harmonogram</button></div><div id="out-cpm"></div></div>'});
