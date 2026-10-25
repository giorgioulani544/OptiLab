/* ===== OptiLab – moduł Przydział (metoda węgierska) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/net/assignment-solver.js. Wspólne komponenty: js/net/netui.js. */
const AS_MAX = 20, ASP = 'assign-';
const asData = (maxi, rn, cn, cells) => ({maxi, rn, cn, cells: cells.map(r => r.map(String))});
const AS_EXAMPLES = [
  {name: 'Podręcznikowy 3 × 3 (Taha, koszt 27)', data: asData(false, ['Jan', 'Ewa', 'Piotr'], ['Koszenie', 'Malowanie', 'Mycie aut'], [[15, 10, 9], [9, 15, 10], [10, 12, 8]])},
  {name: 'Klasyczny 4 × 4 (koszt 13)', data: asData(false, ['W1', 'W2', 'W3', 'W4'], ['Z1', 'Z2', 'Z3', 'Z4'], [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]])},
  {name: 'Więcej zadań niż wykonawców (3 × 4)', data: asData(false, ['Ania', 'Bartek', 'Celina'], ['Raport', 'Prezentacja', 'Analiza', 'Szkolenie'], [[8, 6, 5, 7], [6, 5, 3, 4], [7, 8, 4, 6]])},
  {name: 'Przydziały zakazane (M)', data: asData(false, ['Maszyna 1', 'Maszyna 2', 'Maszyna 3'], ['Detal A', 'Detal B', 'Detal C'], [['M', 4, 6], [5, 'M', 3], [4, 7, 'M']])},
  {name: 'Maksymalizacja (sprzedawcy i rejony)', data: asData(true, ['Sprzedawca 1', 'Sprzedawca 2', 'Sprzedawca 3', 'Sprzedawca 4'], ['Północ', 'Południe', 'Wschód', 'Zachód'], [[42, 35, 28, 21], [30, 25, 20, 15], [30, 25, 20, 15], [24, 20, 16, 12]])},
  {name: 'Rozwiązania alternatywne', data: asData(false, ['W1', 'W2', 'W3'], ['Z1', 'Z2', 'Z3'], [[3, 3, 6], [3, 3, 7], [5, 6, 4]])},
];
let AS = JSON.parse(JSON.stringify(AS_EXAMPLES[0].data));
function asNormalize(d) {
  if (!d || !Array.isArray(d.cells) || !d.cells.length || !Array.isArray(d.cells[0])) throw new Error('to nie jest zadanie przydziału.');
  const m = d.cells.length, n = d.cells[0].length;
  if (m > AS_MAX || n < 1 || n > AS_MAX) throw new Error(`dozwolone jest od 1 do ${AS_MAX} wykonawców i zadań (jest ${m} × ${n}).`);
  if (d.cells.some(r => !Array.isArray(r) || r.length !== n)) throw new Error('wiersze macierzy mają różną długość.');
  return {maxi: !!d.maxi, rn: Array.from({length: m}, (_, i) => String(d.rn?.[i] ?? 'W' + (i + 1))), cn: Array.from({length: n}, (_, j) => String(d.cn?.[j] ?? 'Z' + (j + 1))),
    cells: d.cells.map(r => r.map(v => v === null ? 'M' : String(v ?? '0')))};
}
const asCsvOpt = {allowM: true};
function asRender() {
  $('#' + ASP + 'grid').innerHTML = matrixHTML(ASP, AS, {corner: 'Kto \\ Co', allowM: true});
  $('#' + ASP + 'm').value = AS.rn.length; $('#' + ASP + 'n').value = AS.cn.length; $('#' + ASP + 'goal').value = AS.maxi ? 'max' : 'min';
  matrixPolish($('#' + ASP + 'grid'));
}
const asSync = () => { matrixSync(ASP, AS); AS.maxi = $('#' + ASP + 'goal').value === 'max'; };
function asInit() {
  const opts = Array.from({length: AS_MAX}, (_, k) => `<option>${k + 1}</option>`).join('');
  $('#' + ASP + 'top').innerHTML = `<div class="crow"><label for="${ASP}m">Wykonawcy</label><select id="${ASP}m">${opts}</select><label for="${ASP}n">Zadania</label><select id="${ASP}n">${opts}</select></div>
    <div class="crow"><select id="${ASP}goal" aria-label="Cel"><option value="min">Minimalizuj koszt (czas)</option><option value="max">Maksymalizuj zysk (efekt)</option></select></div>
    ${netCopyHTML(ASP)}<div id="${ASP}grid"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div class="crow"><label><input type="checkbox" id="${ASP}forbid" style="width:20px;height:20px;min-height:0"> zaznaczanie przydziałów zakazanych dotknięciem komórki</label></div>
     ${netToolsHTML(ASP, AS_EXAMPLES)}</details>
    <p class="hint">Każdy wykonawca dostaje dokładnie jedno zadanie, a każde zadanie – jednego wykonawcę. W komórce wpisz koszt lub czas (przy maksymalizacji – zysk) wykonania zadania przez wykonawcę; M = przydział zakazany. Gdy wykonawców i zadań jest różna liczba, program doda fikcyjne wiersze lub kolumny.</p>`;
  const resize = () => { asSync(); matrixResize(AS, +$('#' + ASP + 'm').value, +$('#' + ASP + 'n').value, {rowPre: 'W', colPre: 'Z'}); clearErr(); asRender(); };
  $('#' + ASP + 'm').onchange = resize; $('#' + ASP + 'n').onchange = resize;
  matrixWire($('#' + ASP + 'grid'), {forbidMode: () => $('#' + ASP + 'forbid').checked});
  netToolsWire(ASP, {kind: 'assign', out: '#out-assign', examples: AS_EXAMPLES, normalize: asNormalize,
    get: () => { asSync(); return JSON.parse(JSON.stringify(AS)); }, set: d => { AS = d; asRender(); },
    toCSV: d => matrixToCSV(d, asCsvOpt), fromCSV: t => matrixFromCSV(t, asCsvOpt)});
  $('#btn-assign').onclick = asSolve;
  asRender();
}
function asRead() {
  clearErr(); asSync();
  const bad = [], cost = AS.cells.map((r, i) => r.map((v, j) => {
    const s = String(v).trim().replace(',', '.'); if (/^m$/i.test(s)) return null;
    const x = Number(s); if (s === '' || !isFinite(x) || Math.abs(x) > 1e9) { bad.push(`c${i}_${j}`); return NaN; } return x;
  }));
  if (bad.length) return netFail(ASP, '#out-assign', 'wpisz w zaznaczonych komórkach liczby (albo M – przydział zakazany).', bad);
  if (cost.flat().every(v => v === null)) return netFail(ASP, '#out-assign', 'wszystkie przydziały są zakazane – nie ma czego liczyć.', []);
  const names = (arr, pre) => arr.map((s, i) => String(s).trim() || pre + (i + 1));
  return {maxi: AS.maxi, cost, rNames: names(AS.rn, 'W'), cNames: names(AS.cn, 'Z')};
}
function asSolve() {
  const P = asRead(); if (!P) return;
  const R = assignmentSolve(P), h = asReportHTML(R);
  $('#out-assign').innerHTML = h; last.assign = h;
  if (R.status === 'infeasible') netFail(ASP, null, 'nie da się przydzielić wszystkich zadań bez przydziałów zakazanych. Plan musiałby użyć: ' +
    R.forbiddenUsed.map(f => `${esc(R.rNames[f.i])} → ${esc(R.cNames[f.j])}`).join(', ') + '. Odblokuj któryś przydział.', R.forbiddenUsed.filter(f => !R.isDummy(f.i, f.j)).map(f => `c${f.i}_${f.j}`));
  else if (R.status === 'limit') netFail(ASP, null, 'przekroczono limit iteracji – sprawdź dane.', []);
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function asReportHTML(R) {
  const n = R.n, word = R.maxi ? 'zysk' : 'koszt', Word = R.maxi ? 'Zysk' : 'Koszt';
  const cv = (i, j) => R.cost[i][j] === null ? 'M' : fmt(R.cost[i][j]), mv = v => v >= R.BIG / 2 ? 'M' : fmt(v);
  const dR = i => i >= R.r0, dC = j => j >= R.c0;
  const mat = (A, s = {}, val = mv) => {
    let t = '<div class="tw"><table class="tt am"><tr><th></th>' + R.cNames.map((c, j) => `<th class="${dC(j) ? 'dm' : ''}">${esc(c)}</th>`).join('') + (s.rowMin ? '<th>min</th>' : '') + '</tr>';
    for (let i = 0; i < n; i++) {
      t += `<tr><th class="${dR(i) ? 'dm' : ''}">${esc(R.rNames[i])}</th>`;
      for (let j = 0; j < n; j++) {
        const cov = (s.cr?.[i] ? 1 : 0) + (s.cc?.[j] ? 1 : 0), pick = s.assign && s.assign[i] === j, z = Math.abs(A[i][j]) <= 1e-9;
        t += `<td class="${pick ? 'pivot' : cov === 2 ? 'cov2' : cov ? 'cov' : ''}${R.cost[i][j] === null ? ' forb' : ''}">${z && !s.raw ? '<b>0</b>' : val(A[i][j])}</td>`;
      }
      t += (s.rowMin ? `<td class="mn">${mv(s.rowMin[i])}</td>` : '') + '</tr>';
    }
    if (s.colMin) t += '<tr><th>min</th>' + s.colMin.map(v => `<td class="mn">${mv(v)}</td>`).join('') + '</tr>';
    return t + '</table></div>';
  };
  let h = `<h3>Zagadnienie przydziału – metoda węgierska (${R.maxi ? 'maksymalizacja zysku' : 'minimalizacja kosztu'})</h3>` +
    `<p class="hint">Metoda węgierska zmienia macierz tak, by nie zmieniać przydziału optymalnego: odejmowanie stałej od całego wiersza lub kolumny obniża ${word} każdego przydziału o tyle samo. Szukamy ${n} „niezależnych" zer – po jednym w każdym wierszu i kolumnie. Szare pola to linie pokrywające zera, ciemniejsze – przecięcia dwóch linii.</p>`;
  let it = 0;
  R.steps.forEach(s => {
    const title = {start: 'Macierz wyjściowa', rows: 'Krok 1. Redukcja wierszy', cols: 'Krok 2. Redukcja kolumn', final: 'Wybór niezależnych zer'}[s.kind] || (s.kind === 'cover' ? `Krok 3. Pokrycie zer liniami${++it > 1 ? ` (iteracja ${it})` : ''}` : 'Krok 4. Korekta macierzy');
    const pre = s.kind === 'start' && R.maxi ? '<p>Zyski:</p>' + mat(R.cost.map(r => r.map(v => v === null ? R.BIG : v)), {raw: true}) + '<p>Straty (największy zysk − zysk):</p>' : '';
    h += `<div class="step"><h4>${title}</h4>${s.text ? `<p>${s.text}</p>` : ''}${pre}${mat(s.A, {cr: s.cr, cc: s.cc, rowMin: s.kind === 'rows' ? s.rowMin : null, colMin: s.kind === 'cols' ? s.colMin : null, assign: s.kind === 'final' ? s.assign : null, raw: s.kind === 'start'})}</div>`;
  });
  if (R.status !== 'optimal') return h + `<p class="note">${R.status === 'infeasible' ? 'Bez przydziałów zakazanych nie da się obsadzić wszystkich zadań – szczegóły przy tabeli danych.' : 'Przerwano po limicie iteracji.'}</p>`;
  const real = R.assign.map((j, i) => [i, j]).filter(([i, j]) => !dR(i) && !dC(j));
  h += `<div class="sum"><b>Wynik:</b> ${R.maxi ? 'maksymalny zysk' : 'minimalny koszt'} = <b>${fmt(R.total)}</b>.</div>`;
  h += `<div class="tw"><table><tr><th>Wykonawca</th><th>Zadanie</th><th>${Word}</th></tr>` + real.map(([i, j]) => `<tr><th>${esc(R.rNames[i])}</th><td>${esc(R.cNames[j])}</td><td>${cv(i, j)}</td></tr>`).join('') + `<tr><th>Razem</th><td></td><td><b>${fmt(R.total)}</b></td></tr></table></div>`;
  const left = R.assign.map((j, i) => dR(i) && !dC(j) ? `zadanie ${esc(R.cNames[j])} pozostaje nieprzydzielone` : !dR(i) && dC(j) ? `${esc(R.rNames[i])} pozostaje bez zadania` : null).filter(Boolean);
  if (left.length) h += `<p>Fikcyjne wiersze lub kolumny: ${left.join('; ')}.</p>`;
  if (R.alt) h += `<p class="note">Istnieje rozwiązanie alternatywne o tym samym ${R.maxi ? 'zysku' : 'koszcie'} (${fmt(R.alt.total)}): ` + R.alt.assign.map((j, i) => [i, j]).filter(([i, j]) => !dR(i) && !dC(j)).map(([i, j]) => `${esc(R.rNames[i])} → ${esc(R.cNames[j])}`).join(', ') + '. W końcowej macierzy da się wybrać inny zestaw niezależnych zer.</p>';
  h += '<h3>Przydziały</h3>' + bipartiteSVG(R.rNames.map((r, i) => ({label: r, cls: dR(i) ? 'dummy' : ''})), R.cNames.map((c, j) => ({label: c, cls: dC(j) ? 'dummy' : ''})),
    R.assign.map((j, i) => ({a: i, b: j, label: dR(i) || dC(j) ? '' : `${word} ${cv(i, j)}`, width: 2.5, cls: dR(i) || dC(j) ? 'dummy' : ''})), {title: 'Przydziały'});
  return h;
}
registerModule({id: 'assign', title: 'Przydział', init: asInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6.8l10 10.4M7 17.2l10-10.4"/></svg>',
  html: '<div class="card"><div id="assign-top"></div><div><button id="btn-assign" type="button">Rozwiąż</button></div><div id="out-assign"></div></div>'});
