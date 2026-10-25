/* ===== OptiLab – moduł Transport (zagadnienie transportowe) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/net/transport-solver.js. Wspólne komponenty: js/net/netui.js.
   Moduł rejestruje się sam (registerModule) – zakładka i sekcja powstają automatycznie. */
const TR_MAX = 20, TRP = 'transport-';
const TR_METHOD = {nw: 'metoda kąta północno-zachodniego', lc: 'metoda minimalnego elementu', vam: 'metoda VAM (aproksymacji Vogla)'};
const trData = (maxi, rn, cn, cells, xc, xr) => ({maxi, rn, cn, cells: cells.map(r => r.map(String)), xc: xc.map(String), xr: xr.map(String)});
const TR_EXAMPLES = [
  {name: 'Podręcznikowy 3 × 4 (Taha, optimum 435)', data: trData(false, ['D1', 'D2', 'D3'], ['O1', 'O2', 'O3', 'O4'], [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]], [15, 25, 10], [5, 15, 15, 15])},
  {name: 'Podaż większa od popytu', data: trData(false, ['Magazyn A', 'Magazyn B', 'Magazyn C'], ['Sklep 1', 'Sklep 2', 'Sklep 3'], [[4, 8, 8], [16, 24, 16], [8, 16, 24]], [76, 82, 77], [72, 102, 41])},
  {name: 'Popyt większy od podaży', data: trData(false, ['Fabryka 1', 'Fabryka 2'], ['Hurtownia 1', 'Hurtownia 2', 'Hurtownia 3'], [[5, 7, 3], [4, 6, 9]], [20, 15], [15, 20, 10])},
  {name: 'Trasa zakazana (M)', data: trData(false, ['D1', 'D2', 'D3'], ['O1', 'O2', 'O3', 'O4'], [[10, 2, 'M', 11], [12, 7, 9, 20], [4, 14, 16, 18]], [15, 25, 10], [5, 15, 15, 15])},
  {name: 'Maksymalizacja zysku', data: trData(true, ['Zakład 1', 'Zakład 2', 'Zakład 3'], ['Rynek 1', 'Rynek 2', 'Rynek 3'], [[12, 9, 7], [8, 11, 10], [6, 9, 13]], [40, 30, 30], [35, 35, 30])},
  {name: 'Zadanie zdegenerowane', data: trData(false, ['D1', 'D2'], ['O1', 'O2'], [[4, 6], [5, 3]], [20, 30], [20, 30])},
  {name: 'Rozwiązania alternatywne', data: trData(false, ['D1', 'D2'], ['O1', 'O2'], [[2, 3], [4, 5]], [10, 10], [10, 10])},
];
let TS = JSON.parse(JSON.stringify(TR_EXAMPLES[0].data));
function trNormalize(d) {
  if (!d || !Array.isArray(d.cells) || !Array.isArray(d.xc) || !Array.isArray(d.xr)) throw new Error('to nie jest zadanie transportowe.');
  const m = d.xc.length, n = d.xr.length;
  if (m < 1 || n < 1 || m > TR_MAX || n > TR_MAX) throw new Error(`dozwolone jest od 1 do ${TR_MAX} dostawców i odbiorców (jest ${m} × ${n}).`);
  if (d.cells.length !== m || d.cells.some(r => !Array.isArray(r) || r.length !== n)) throw new Error('tabela kosztów ma inny wymiar niż podaż i popyt.');
  const S = v => v === null ? 'M' : String(v ?? '0');
  return {maxi: !!d.maxi, rn: Array.from({length: m}, (_, i) => String(d.rn?.[i] ?? 'D' + (i + 1))), cn: Array.from({length: n}, (_, j) => String(d.cn?.[j] ?? 'O' + (j + 1))),
    cells: d.cells.map(r => r.map(S)), xc: d.xc.map(S), xr: d.xr.map(S)};
}
const trCsvOpt = {xc: 'podaż', xr: 'popyt', allowM: true};
const trTopHTML = () => {
  const opts = Array.from({length: TR_MAX}, (_, k) => `<option>${k + 1}</option>`).join('');
  return `<div class="crow"><label for="${TRP}m">Dostawcy</label><select id="${TRP}m">${opts}</select><label for="${TRP}n">Odbiorcy</label><select id="${TRP}n">${opts}</select></div>
  <div class="crow"><select id="${TRP}goal" aria-label="Cel"><option value="min">Minimalizuj koszt</option><option value="max">Maksymalizuj zysk</option></select></div>
  ${netCopyHTML(TRP)}<div id="${TRP}grid"></div>
  <details class="adv"><summary>Opcje zaawansowane</summary>
   <div class="crow"><label for="${TRP}init">Rozwiązanie początkowe</label><select id="${TRP}init"><option value="nw">${TR_METHOD.nw}</option><option value="lc">${TR_METHOD.lc}</option><option value="vam">${TR_METHOD.vam}</option></select></div>
   <div class="crow"><label><input type="checkbox" id="${TRP}forbid" style="width:20px;height:20px;min-height:0"> zaznaczanie tras zakazanych dotknięciem komórki</label></div>
   ${netToolsHTML(TRP, TR_EXAMPLES)}</details>
  <p class="hint">W komórkach wpisz koszt przewozu jednostki (przy maksymalizacji – zysk). Trasa zakazana: wpisz M albo włącz zaznaczanie w opcjach zaawansowanych. Gdy podaż ≠ popyt, program sam doda fikcyjnego dostawcę lub odbiorcę.</p>`;
};
function trRender() {
  $('#' + TRP + 'grid').innerHTML = matrixHTML(TRP, TS, {corner: 'Od \\ Do', xcLabel: 'Podaż', xrLabel: 'Popyt', allowM: true});
  $('#' + TRP + 'm').value = TS.rn.length; $('#' + TRP + 'n').value = TS.cn.length; $('#' + TRP + 'goal').value = TS.maxi ? 'max' : 'min';
  matrixPolish($('#' + TRP + 'grid'));
}
const trSync = () => { matrixSync(TRP, TS); TS.maxi = $('#' + TRP + 'goal').value === 'max'; };
function trInit() {
  $('#' + TRP + 'top').innerHTML = trTopHTML();
  const resize = () => { trSync(); matrixResize(TS, +$('#' + TRP + 'm').value, +$('#' + TRP + 'n').value, {rowPre: 'D', colPre: 'O'}); clearErr(); trRender(); };
  $('#' + TRP + 'm').onchange = resize; $('#' + TRP + 'n').onchange = resize;
  matrixWire($('#' + TRP + 'grid'), {forbidMode: () => $('#' + TRP + 'forbid').checked});
  netToolsWire(TRP, {kind: 'transport', out: '#out-transport', examples: TR_EXAMPLES, normalize: trNormalize,
    get: () => { trSync(); return JSON.parse(JSON.stringify(TS)); }, set: d => { TS = d; trRender(); },
    toCSV: d => matrixToCSV(d, trCsvOpt), fromCSV: t => matrixFromCSV(t, trCsvOpt)});
  $('#btn-transport').onclick = trSolve;
  trRender();
}
/* Odczyt i walidacja danych z formularza → zadanie dla solvera (null = błąd pokazany przy polach) */
function trRead() {
  clearErr(); trSync();
  const bad = [], num = (v, id, allowM) => {
    const s = String(v).trim().replace(',', '.'); if (allowM && /^m$/i.test(s)) return null;
    const x = Number(s); if (s === '' || !isFinite(x) || Math.abs(x) > 1e9) { bad.push(id); return NaN; } return x;
  };
  const cost = TS.cells.map((r, i) => r.map((v, j) => num(v, `c${i}_${j}`, true)));
  const supply = TS.xc.map((v, i) => num(v, 'xc' + i)), demand = TS.xr.map((v, j) => num(v, 'xr' + j)), out = '#out-transport';
  if (bad.length) return netFail(TRP, out, 'wpisz w zaznaczonych komórkach liczby (w kosztach możesz też wpisać M – trasa zakazana).', bad);
  const neg = [...supply.map((v, i) => v < 0 ? 'xc' + i : null), ...demand.map((v, j) => v < 0 ? 'xr' + j : null)].filter(Boolean);
  if (neg.length) return netFail(TRP, out, 'podaż i popyt nie mogą być ujemne.', neg);
  if (!supply.some(v => v > 0) || !demand.some(v => v > 0)) return netFail(TRP, out, 'łączna podaż i łączny popyt muszą być większe od zera.', [...supply.map((_, i) => 'xc' + i), ...demand.map((_, j) => 'xr' + j)]);
  const names = (arr, pre) => arr.map((s, i) => String(s).trim() || pre + (i + 1));
  return {maxi: TS.maxi, supply, demand, cost, sNames: names(TS.rn, 'D'), dNames: names(TS.cn, 'O')};
}
function trSolve() {
  const P = trRead(); if (!P) return;
  const init = $('#' + TRP + 'init').value, R = transportSolve(P, init);
  const cmp = ['nw', 'lc', 'vam'].map(k => { const r = k === init ? R : transportSolve(P, k); return {k, start: r.initial, iters: r.iters.length - 1, t: r.t, status: r.status}; });
  const h = trReportHTML(R, cmp);
  $('#out-transport').innerHTML = h; last.transport = h;
  const real = f => f.i < P.supply.length && f.j < P.demand.length;
  if (R.status === 'infeasible') netFail(TRP, null, 'brak rozwiązania dopuszczalnego – bez tras zakazanych nie da się zrealizować przewozów. Plan musiałby użyć: ' +
    R.forbiddenUsed.map(f => `${esc(R.sNames[f.i])} → ${esc(R.dNames[f.j])} (${fmt(f.q)} jedn.)`).join(', ') + '. Odblokuj którąś z tras albo zmień podaż lub popyt.', R.forbiddenUsed.filter(real).map(f => `c${f.i}_${f.j}`));
  else if (R.status === 'limit') netFail(TRP, null, 'przekroczono limit iteracji metody potencjałów – sprawdź dane (zbyt duże liczby?).', []);
}

/* ---------- raport dydaktyczny (czysty HTML, bez DOM – testowalny) ---------- */
function trReportHTML(R, cmp) {
  const m = R.m, n = R.n, sg = R.maxi ? -1 : 1, wordIns = R.maxi ? 'zyskiem' : 'kosztem', word = R.maxi ? 'zysk' : 'koszt', Word = R.maxi ? 'Zysk' : 'Koszt';
  const cv = (i, j) => R.cost[i][j] === null ? 'M' : fmt(R.cost[i][j]), route = (i, j) => `${esc(R.sNames[i])} → ${esc(R.dNames[j])}`;
  const big = v => Math.abs(v) >= R.BIG / 2, dv = v => big(v) ? (sg * v < 0 ? '−M' : 'M') : fmt(sg * v), pv = v => big(v) ? 'M' : fmt(v);
  const tot = s => fmt(s.t) + (s.Mq > TR_EPS ? ` + ${fmt(s.Mq)}·M` : '');
  const dumR = i => R.dummy && R.dummy.type === 'row' && i === m - 1, dumC = j => R.dummy && R.dummy.type === 'col' && j === n - 1;
  const eps = new Set(R.epsCells.map(c => c.i + ',' + c.j));
  const table = (st, o = {}) => {
    const cyc = new Map((o.cycle || []).map(c => [c.i + ',' + c.j, c.s]));
    let t = `<div class="tw"><table class="tt"><tr><th></th>` + R.dNames.map((d, j) => `<th class="${dumC(j) ? 'dm' : ''}">${esc(d)}</th>`).join('') + (o.pen ? '<th>Kara</th>' : '') + `<th>${o.rem ? 'Pozostała podaż' : 'Podaż'}</th>${o.uv ? '<th>u<sub>i</sub></th>' : ''}</tr>`;
    for (let i = 0; i < m; i++) {
      t += `<tr><th class="${dumR(i) ? 'dm' : ''}">${esc(R.sNames[i])}</th>`;
      for (let j = 0; j < n; j++) {
        const s = cyc.get(i + ',' + j), basic = st.B[i][j], here = (c) => c && c.i === i && c.j === j;
        const cls = here(o.pick) || here(o.enter) ? 'pivot' : s ? 'pr' : o.out && (o.out.rowOut[i] || o.out.colOut[j]) ? 'out' : '';
        const body = basic ? `<b>${o.eps && eps.has(i + ',' + j) ? 'ε' : fmt(st.x[i][j])}</b>` : st.d && st.d[i][j] !== null ? `<span class="dd">${dv(st.d[i][j])}</span>` : '';
        t += `<td class="${cls}${R.cost[i][j] === null ? ' forb' : ''}"><span class="cc">${cv(i, j)}</span>${body}${s ? `<span class="sg">${s > 0 ? '+' : '−'}</span>` : ''}</td>`;
      }
      if (o.pen) t += `<td>${o.pen.rowPen[i] === null ? '' : pv(o.pen.rowPen[i])}</td>`;
      t += `<td>${fmt(o.rem ? o.rem.a[i] : R.supply[i])}</td>${o.uv ? `<td>${dv(st.u[i])}</td>` : ''}</tr>`;
    }
    t += `<tr><th>${o.rem ? 'Pozostały popyt' : 'Popyt'}</th>` + R.demand.map((v, j) => `<td>${fmt(o.rem ? o.rem.b[j] : v)}</td>`).join('') + (o.pen ? '<td></td>' : '') + `<td></td>${o.uv ? '<td></td>' : ''}</tr>`;
    if (o.pen) t += '<tr><th>Kara</th>' + o.pen.colPen.map(v => `<td>${v === null ? '' : pv(v)}</td>`).join('') + '<td></td><td></td></tr>';
    if (o.uv) t += '<tr><th>v<sub>j</sub></th>' + st.v.map(v => `<td>${dv(v)}</td>`).join('') + `<td></td><td></td></tr>`;
    return t + '</table></div>';
  };
  // 1. dane i bilans
  const S = R.supply.reduce((a, b) => a + b, 0) - (R.dummy?.type === 'row' ? R.dummy.amount : 0), D = R.demand.reduce((a, b) => a + b, 0) - (R.dummy?.type === 'col' ? R.dummy.amount : 0);
  let h = `<h3>Zagadnienie transportowe – ${R.maxi ? 'maksymalizacja zysku' : 'minimalizacja kosztu'}</h3><p>` + (!R.dummy ? `Łączna podaż ${fmt(S)} = łączny popyt ${fmt(D)} – zadanie jest zbilansowane.`
    : R.dummy.type === 'col' ? `Łączna podaż ${fmt(S)} > łączny popyt ${fmt(D)}. Dodajemy fikcyjnego odbiorcę z popytem ${fmt(R.dummy.amount)} i ${wordIns} 0 – trafi do niego niewykorzystana podaż.`
    : `Łączny popyt ${fmt(D)} > łączna podaż ${fmt(S)}. Dodajemy fikcyjnego dostawcę z podażą ${fmt(R.dummy.amount)} i ${wordIns} 0 – jego „dostawy" oznaczają popyt, którego nie da się zaspokoić.`) +
    (R.maxi ? ' Maksymalizujemy zysk: w tabelach są zyski jednostkowe, a wskaźniki liczymy dla zysku.' : '') +
    (R.cost.flat().includes(null) ? ' Trasy zakazane (M) mają w obliczeniach ogromny ' + word + ', więc metoda ich unika.' : '') + '</p>';
  // 2. rozwiązanie początkowe
  const ini = R.initial;
  h += `<h3>Krok 1. Rozwiązanie początkowe – ${TR_METHOD[ini.method]}</h3><p class="hint">Mała liczba w rogu komórki to ${word} jednostkowy, pogrubiona – przydział. Złota komórka to bieżący przydział, wyszarzone – skreślone linie.</p>`;
  const cards = ini.steps.map((s, k) => `<div class="step"><h4>Przydział ${k + 1}</h4><p>${s.text}</p>${table(s, {pick: s, out: s, rem: s, pen: s.rowPen ? s : null})}</div>`).join('');
  h += `<details class="adv"${ini.steps.length <= 12 ? ' open' : ''}><summary>Kolejne przydziały (${ini.steps.length})</summary>${cards}</details>`;
  if (R.epsCells.length) h += `<p>Rozwiązanie jest zdegenerowane: ma mniej niż m + n − 1 = ${m + n - 1} zmiennych bazowych. Dodajemy przydziały zerowe ε na trasach: ${R.epsCells.map(c => route(c.i, c.j)).join(', ')} (nie tworzą cyklu, więc da się policzyć potencjały).</p>`;
  h += `<p>Rozwiązanie początkowe: <b>${word} = ${tot(ini)}</b>, zmiennych bazowych: ${m + n - 1}.</p>` + table(ini, {eps: true});
  // 3. MODI
  h += `<h3>Krok 2. Optymalizacja metodą potencjałów (MODI)</h3><p class="hint">Dla tras bazowych (pogrubione) ${word} c<sub>ij</sub> = u<sub>i</sub> + v<sub>j</sub>, przyjmujemy u<sub>1</sub> = 0. Dla pozostałych tras liczymy wskaźnik d<sub>ij</sub> = c<sub>ij</sub> − u<sub>i</sub> − v<sub>j</sub> (szare liczby). ` +
    (R.maxi ? 'Plan jest optymalny, gdy wszystkie d<sub>ij</sub> ≤ 0; trasa z największym dodatnim d zwiększa zysk.' : 'Plan jest optymalny, gdy wszystkie d<sub>ij</sub> ≥ 0; trasa z najbardziej ujemnym d obniża koszt.') + ' Znaki + i − pokazują cykl, wzdłuż którego przesuwamy towar.</p>';
  R.iters.forEach((s, k) => {
    let txt = `Potencjały: ${s.u.map((v, i) => `u<sub>${i + 1}</sub> = ${dv(v)}`).join(', ')}; ${s.v.map((v, j) => `v<sub>${j + 1}</sub> = ${dv(v)}`).join(', ')}. ${Word} planu: ${tot(s)}. `;
    if (s.optimal) txt += `Wszystkie wskaźniki d<sub>ij</sub> są ${R.maxi ? '≤ 0' : '≥ 0'} – żadna nieużywana trasa nie ${R.maxi ? 'zwiększy zysku' : 'obniży kosztu'}. <b>Plan jest optymalny.</b>`;
    else if (s.enter) {
      const e = s.enter, gain = Math.abs(e.d), nxt = R.iters[k + 1];
      txt += `${R.maxi ? 'Największy dodatni' : 'Najbardziej ujemny'} wskaźnik: d<sub>${e.i + 1},${e.j + 1}</sub> = ${dv(e.d)} na trasie ${route(e.i, e.j)} – każda przewieziona nią jednostka ${R.maxi ? 'zwiększa zysk' : 'obniża koszt'} o ${big(e.d) ? 'M' : fmt(gain)}. ` +
        `Cykl: ${s.cycle.map(c => `${route(c.i, c.j)} (${c.s > 0 ? '+' : '−'})`).join(', ')}. θ = najmniejszy przydział w komórkach „−" = ${fmt(s.theta)}. ` +
        (s.theta <= TR_EPS ? `θ = 0 – iteracja zdegenerowana: zmienia się baza, ale nie przewozy ani ${word}. ` : `Przesuwamy ${fmt(s.theta)} jedn. wzdłuż cyklu (w komórkach „+" dodajemy, w „−" odejmujemy). `) +
        `Trasa ${route(s.leave.i, s.leave.j)} opuszcza bazę.` + (nxt && s.theta > TR_EPS ? ` Nowy ${word}: ${tot(nxt)}.` : '');
    }
    h += `<div class="step"><h4>${s.optimal ? 'Test optymalności' : 'Iteracja ' + (k + 1)}</h4><p>${txt}</p>${table(s, {uv: true, cycle: s.cycle, enter: s.enter})}</div>`;
  });
  if (R.status !== 'optimal') return h + `<p class="note">${R.status === 'infeasible' ? 'Zadanie nie ma rozwiązania dopuszczalnego bez tras zakazanych – szczegóły przy tabeli danych.' : 'Przerwano po limicie iteracji.'}</p>`;
  // 4. wynik
  const routes = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (R.x[i][j] > TR_EPS && !dumR(i) && !dumC(j)) routes.push([i, j]);
  h += `<div class="sum"><b>Wynik:</b> ${R.maxi ? 'maksymalny zysk' : 'minimalny koszt'} = <b>${fmt(R.t)}</b> (${routes.length} ${routes.length === 1 ? 'trasa' : 'tras'} w użyciu).</div>`;
  h += `<div class="tw"><table><tr><th>Trasa</th><th>Ilość</th><th>${Word} jedn.</th><th>${Word}</th></tr>` + routes.map(([i, j]) => `<tr><th>${route(i, j)}</th><td>${fmt(R.x[i][j])}</td><td>${cv(i, j)}</td><td>${fmt(R.x[i][j] * R.cost[i][j])}</td></tr>`).join('') +
    `<tr><th>Razem</th><td>${fmt(routes.reduce((a, [i, j]) => a + R.x[i][j], 0))}</td><td></td><td><b>${fmt(R.t)}</b></td></tr></table></div>`;
  if (R.dummy) {
    const rest = [];
    if (R.dummy.type === 'col') for (let i = 0; i < m; i++) { if (R.x[i][n - 1] > TR_EPS) rest.push(`${esc(R.sNames[i])}: ${fmt(R.x[i][n - 1])} jedn. podaży zostaje niewykorzystane`); }
    else for (let j = 0; j < n; j++) if (R.x[m - 1][j] > TR_EPS) rest.push(`${esc(R.dNames[j])}: ${fmt(R.x[m - 1][j])} jedn. popytu pozostaje niezaspokojone`);
    h += `<p>Fikcyjny ${R.dummy.type === 'col' ? 'odbiorca' : 'dostawca'}: ${rest.join('; ')}.</p>`;
  }
  if (R.alt) h += `<p class="note">Istnieje rozwiązanie alternatywne o tym samym ${R.maxi ? 'zysku' : 'koszcie'} (${fmt(R.alt.t)}): trasa ${route(R.alt.via.i, R.alt.via.j)} ma wskaźnik d = 0, więc można przesunąć wzdłuż jej cyklu ${fmt(R.alt.theta)} jedn. Każda kombinacja obu planów też jest optymalna.</p>` +
    table({x: R.alt.x, B: R.alt.x.map(r => r.map(v => v > TR_EPS))});
  // 5. analiza wrażliwości
  const rg = q => `${isFinite(q.lo) ? fmt(q.lo) : '−∞'} … ${isFinite(q.hi) ? fmt(q.hi) : '+∞'}`;
  let sens = `<div class="tw"><table><tr><th>Trasa</th><th>Przewóz</th><th>${Word} jedn.</th><th>Wskaźnik d<sub>ij</sub></th><th>Zakres ${word}u, w którym plan jest optymalny</th></tr>`;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (R.ranges[i][j]) sens += `<tr><th>${route(i, j)}</th><td>${R.B[i][j] ? fmt(R.x[i][j]) : '–'}</td><td>${cv(i, j)}</td><td>${R.B[i][j] ? 'baza' : dv(R.d[i][j])}</td><td>${rg(R.ranges[i][j])}</td></tr>`;
  sens += `</table></div><p class="hint">Wskaźnik d<sub>ij</sub> trasy nieużywanej mówi, o ile musiałby ${R.maxi ? 'wzrosnąć zysk' : 'spaść koszt'} jednostkowy, żeby opłacało się ją uruchomić. Potencjały to ceny dualne: ${S === D ? 'zwiększenie podaży dostawcy i i popytu odbiorcy j o 1 zmienia ' + word + ' o u<sub>i</sub> + v<sub>j</sub>.' : 'w zadaniu niezbilansowanym interpretujemy je łącznie z fikcyjnym dostawcą lub odbiorcą.'}</p>` +
    `<p>${R.u.map((v, i) => `u<sub>${i + 1}</sub> (${esc(R.sNames[i])}) = ${dv(v)}`).join(', ')}; ${R.v.map((v, j) => `v<sub>${j + 1}</sub> (${esc(R.dNames[j])}) = ${dv(v)}`).join(', ')}.</p>`;
  h += `<details class="adv"><summary>Analiza wrażliwości: wskaźniki, zakresy ${word}ów i ceny dualne</summary>${sens}</details>`;
  // 6. sieć przewozów
  const flows = []; let qmax = 0;
  R.x.forEach((r, i) => r.forEach((q, j) => { if (q > TR_EPS) { flows.push({a: i, b: j, q}); qmax = Math.max(qmax, q); } }));
  h += '<h3>Sieć przewozów</h3>' + bipartiteSVG(R.sNames.map((s, i) => ({label: s, sub: `podaż ${fmt(R.supply[i])}`, cls: dumR(i) ? 'dummy' : ''})),
    R.dNames.map((d, j) => ({label: d, sub: `popyt ${fmt(R.demand[j])}`, cls: dumC(j) ? 'dummy' : ''})),
    flows.map(f => ({a: f.a, b: f.b, label: `${fmt(f.q)} × ${cv(f.a, f.b)}`, width: 1.5 + 4 * f.q / qmax, cls: dumR(f.a) || dumC(f.b) ? 'dummy' : ''})), {title: 'Sieć przewozów'});
  // 7. porównanie metod startowych
  h += `<details class="adv"><summary>Porównanie metod rozwiązania początkowego</summary><div class="tw"><table><tr><th>Metoda</th><th>${Word} początkowy</th><th>Iteracje MODI</th><th>${Word} optymalny</th></tr>` +
    cmp.map(c => `<tr><th>${TR_METHOD[c.k]}</th><td>${tot(c.start)}</td><td>${c.iters}</td><td>${c.status === 'optimal' ? fmt(c.t) : '–'}</td></tr>`).join('') +
    `</table></div><p class="hint">Im lepsze rozwiązanie początkowe, tym mniej iteracji metody potencjałów. VAM zwykle startuje najbliżej optimum.</p></details>`;
  return h;
}
registerModule({id: 'transport', title: 'Transport', init: trInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="6" height="5" rx="1.5"/><rect x="2" y="15" width="6" height="5" rx="1.5"/><rect x="16" y="9.5" width="6" height="5" rx="1.5"/><path d="M8 6.5l8 5M8 17.5l8-5"/></svg>',
  html: '<div class="card"><div id="transport-top"></div><div><button id="btn-transport" type="button">Rozwiąż</button></div><div id="out-transport"></div></div>'});
