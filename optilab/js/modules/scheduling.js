/* ===== OptiLab – moduł Harmonogramowanie zadań =====
   Interfejs i raport dydaktyczny. Obliczenia: js/pm/sched-solver.js. Wykresy: js/viz.js. */
const SCP = 'sched-', SC_MAX = 40, SC_RULES = {FCFS: 'FCFS – kolejność zgłoszeń', SPT: 'SPT – najkrótszy czas', WSPT: 'WSPT – najkrótszy czas / waga', EDD: 'EDD – najwcześniejszy termin', LPT: 'LPT – najdłuższy czas', MH: 'Moore-Hodgson'};
const SC_MODES = {single: 'jedna maszyna', two: 'dwie maszyny (reguła Johnsona)', flow: 'flow shop – m maszyn (zaawansowane)', par: 'maszyny równoległe (zaawansowane)'};
const scJob = (name, p, d = '', w = '1', mt = []) => ({name, p: String(p), d: String(d), w: String(w), mt: mt.map(String)});
const SC_EXAMPLES = [
  {name: 'Jedna maszyna: 6 zleceń z terminami', data: {mode: 'single', rule: 'SPT', jobs: [scJob('Z1', 6, 8, 2), scJob('Z2', 2, 6, 1), scJob('Z3', 8, 18, 3), scJob('Z4', 3, 15, 1), scJob('Z5', 9, 23, 2), scJob('Z6', 2, 4, 1)]}},
  {name: 'Moore-Hodgson: minimum spóźnionych', data: {mode: 'single', rule: 'MH', jobs: [scJob('A', 4, 5), scJob('B', 3, 6), scJob('C', 2, 7), scJob('D', 5, 11), scJob('E', 6, 12)]}},
  {name: 'Dwie maszyny – reguła Johnsona', data: {mode: 'two', jobs: [scJob('A', '', '', '', [5, 2]), scJob('B', '', '', '', [1, 6]), scJob('C', '', '', '', [9, 7]), scJob('D', '', '', '', [3, 8]), scJob('E', '', '', '', [10, 4])]}},
  {name: 'Trzy maszyny (warunek Johnsona spełniony)', data: {mode: 'two', three: true, jobs: [scJob('A', '', '', '', [8, 2, 4]), scJob('B', '', '', '', [6, 3, 7]), scJob('C', '', '', '', [7, 1, 5]), scJob('D', '', '', '', [9, 2, 3])]}},
  {name: 'Flow shop: 5 zadań, 4 maszyny', data: {mode: 'flow', adv: true, m: 4, jobs: [scJob('J1', '', '', '', [5, 7, 4, 6]), scJob('J2', '', '', '', [3, 8, 6, 2]), scJob('J3', '', '', '', [6, 2, 9, 5]), scJob('J4', '', '', '', [7, 5, 3, 8]), scJob('J5', '', '', '', [4, 6, 7, 3])]}},
  {name: 'Maszyny równoległe: 7 zadań, 3 maszyny', data: {mode: 'par', adv: true, m: 3, jobs: [scJob('A', 7), scJob('B', 5), scJob('C', 6), scJob('D', 3), scJob('E', 4), scJob('F', 8), scJob('G', 2)]}},
];
let SC = scNormalize(JSON.parse(JSON.stringify(SC_EXAMPLES[0].data)));
function scNormalize(d) {
  if (!d || !Array.isArray(d.jobs) || !d.jobs.length) throw new Error('to nie jest zadanie harmonogramowania (brak listy zadań).');
  if (d.jobs.length > SC_MAX) throw new Error(`za dużo zadań (${d.jobs.length}) – maksimum to ${SC_MAX}.`);
  const mode = SC_MODES[d.mode] ? d.mode : 'single', m = Math.min(8, Math.max(2, +d.m || 3));
  return {mode, rule: SC_RULES[d.rule] ? d.rule : 'SPT', three: !!d.three, adv: !!d.adv || mode === 'flow' || mode === 'par', m,
    jobs: d.jobs.map((j, i) => scJob(String(j.name ?? 'Z' + (i + 1)), String(j.p ?? ''), String(j.d ?? ''), String(j.w ?? '1'), Array.from({length: 8}, (_, k) => String(j.mt?.[k] ?? ''))))};
}
const scMachines = () => SC.mode === 'two' ? (SC.three ? 3 : 2) : SC.mode === 'flow' ? SC.m : 0;
const scCols = () => [{key: 'name', label: 'Zadanie', type: 'name'}, ...(SC.mode === 'single' ? [{key: 'p', label: 'Czas p', type: 'num'}, {key: 'd', label: 'Termin d', type: 'num'}, {key: 'w', label: 'Waga w', type: 'num'}]
  : SC.mode === 'par' ? [{key: 'p', label: 'Czas p', type: 'num'}] : Array.from({length: scMachines()}, (_, k) => ({key: 'mt' + k, label: 'M' + (k + 1), type: 'num'})))];
const scRowsOut = () => SC.jobs.map(j => { const o = {name: j.name, p: j.p, d: j.d, w: j.w}; j.mt.forEach((v, k) => { o['mt' + k] = v; }); return o; });
function scRender() {
  const sel = $('#' + SCP + 'mode'); sel.innerHTML = Object.entries(SC_MODES).filter(([k]) => SC.adv || (k !== 'flow' && k !== 'par')).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  if (!SC.adv && (SC.mode === 'flow' || SC.mode === 'par')) SC.mode = 'single';
  sel.value = SC.mode; $('#' + SCP + 'adv').checked = SC.adv; $('#' + SCP + 'three').checked = SC.three; $('#' + SCP + 'rule').value = SC.rule; $('#' + SCP + 'm').value = SC.m;
  $('#' + SCP + 'rulebox').hidden = SC.mode !== 'single'; $('#' + SCP + 'threebox').hidden = SC.mode !== 'two'; $('#' + SCP + 'mbox').hidden = !(SC.mode === 'flow' || SC.mode === 'par');
  const box = $('#' + SCP + 'grid'); box.innerHTML = rowTableHTML(SCP, scCols(), scRowsOut(), {addLabel: '+ zadanie', count: n => `${n} zadań`});
  $('#' + SCP + 'add').onclick = () => { scSync(); if (SC.jobs.length >= SC_MAX) return; SC.jobs.push(scJob('Z' + (SC.jobs.length + 1), 1, 10, 1, Array(8).fill('1'))); scRender(); };
  matrixPolish(box);
}
function scSync() {
  const rows = rowTableSync(SCP, scCols(), scRowsOut());
  SC.jobs = rows.map((r, i) => ({name: r.name, p: r.p, d: r.d, w: r.w, mt: Array.from({length: 8}, (_, k) => r['mt' + k] ?? SC.jobs[i]?.mt[k] ?? '')}));
  SC.mode = $('#' + SCP + 'mode').value; SC.rule = $('#' + SCP + 'rule').value; SC.three = $('#' + SCP + 'three').checked; SC.adv = $('#' + SCP + 'adv').checked; SC.m = +$('#' + SCP + 'm').value;
}
function scInit() {
  $('#' + SCP + 'top').innerHTML = `<div class="crow"><label for="${SCP}mode">Problem</label><select id="${SCP}mode"></select></div>
    <div class="crow" id="${SCP}rulebox"><label for="${SCP}rule">Szczegóły reguły</label><select id="${SCP}rule">${Object.entries(SC_RULES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="crow" id="${SCP}threebox"><label class="chk"><input type="checkbox" id="${SCP}three"> trzy maszyny (szczególny przypadek reguły Johnsona)</label></div>
    <div class="crow" id="${SCP}mbox"><label for="${SCP}m">Liczba maszyn</label><select id="${SCP}m">${[2, 3, 4, 5, 6, 7, 8].map(k => `<option>${k}</option>`).join('')}</select></div>
    ${netCopyHTML(SCP)}<div id="${SCP}grid"></div><div id="${SCP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div class="crow"><label class="chk"><input type="checkbox" id="${SCP}adv"> więcej typów problemów: flow shop dla m maszyn (CDS, Palmer, Dannenbring, NEH) i maszyny równoległe (LPT, McNaughton)</label></div>
     ${netToolsHTML(SCP, SC_EXAMPLES)}</details>
    <p class="hint">Jedna maszyna: czas wykonania p, termin d i waga w (ważność) każdego zadania. Program porówna reguły kolejności i pokaże harmonogram wybranej.</p>`;
  ['mode', 'three', 'adv', 'm'].forEach(k => $('#' + SCP + k).onchange = () => { scSync(); clearErr(); scRender(); });
  const box = $('#' + SCP + 'grid'); matrixWire(box);
  box.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; scSync(); if (SC.jobs.length > 1) SC.jobs.splice(+k, 1); clearErr(); scRender(); });
  const csvCols = () => scCols().map(c => ({...c, blank: c.key === 'w' || c.key === 'd'}));
  netToolsWire(SCP, {kind: 'sched', out: '#out-sched', examples: SC_EXAMPLES, normalize: scNormalize,
    get: () => { scSync(); return JSON.parse(JSON.stringify(SC)); }, set: d => { SC = d; scRender(); },
    toCSV: () => { scSync(); return rowsToCSV(csvCols(), scRowsOut(), [['problem', SC.mode], ['maszyny', scMachines() || SC.m]]); },
    fromCSV: t => { const allCols = [{key: 'name', label: 'Zadanie', type: 'name'}, {key: 'p', label: 'Czas p', type: 'num', blank: true}, {key: 'd', label: 'Termin d', type: 'num', blank: true}, {key: 'w', label: 'Waga w', type: 'num', blank: true},
        ...Array.from({length: 8}, (_, k) => ({key: 'mt' + k, label: 'M' + (k + 1), type: 'num', blank: true}))];
      const r = rowsFromCSV(t, allCols, ['problem', 'maszyny']), mode = SC_MODES[r.meta.problem] ? r.meta.problem : r.rows[0].mt0 !== '' ? 'two' : 'single', mm = +r.meta.maszyny || 3;
      return {mode, m: mm, three: mode === 'two' && mm === 3, adv: mode === 'flow' || mode === 'par', jobs: r.rows.map(x => ({name: x.name, p: x.p, d: x.d, w: x.w || '1', mt: Array.from({length: 8}, (_, k) => x['mt' + k])}))}; }});
  $('#btn-sched').onclick = scSolveUI;
  scRender();
}
function scRead() {
  clearErr(); scSync();
  const out = '#out-sched', J = SC.jobs, bad = [], names = J.map((j, i) => String(j.name).trim() || 'Z' + (i + 1));
  const dup = names.find((s, k) => names.indexOf(s) !== k); if (dup !== undefined) return netFail(SCP, out, `nazwy zadań muszą być różne – powtarza się „${esc(dup)}".`, names.map((s, k) => s === dup ? 'name' + k : null).filter(Boolean));
  const val = (v, id, pos) => { const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x) || x < 0 || (pos && x === 0) || x > 1e9) { bad.push(id); return NaN; } return x; };
  if (SC.mode === 'single') {
    const p = J.map((j, i) => val(j.p, 'p' + i, true)), d = J.map((j, i) => val(j.d === '' ? '1e9' : j.d, 'd' + i)), w = J.map((j, i) => val(j.w === '' ? '1' : j.w, 'w' + i, true));
    if (bad.length) return netFail(SCP, out, 'wpisz w zaznaczonych polach liczby: czas i waga dodatnie, termin nieujemny (pusty termin = brak terminu).', bad);
    return {mode: 'single', names, p, d, w};
  }
  if (SC.mode === 'par') { const p = J.map((j, i) => val(j.p, 'p' + i, true)); if (bad.length) return netFail(SCP, out, 'wpisz w zaznaczonych polach dodatnie czasy.', bad); return {mode: 'par', names, p, m: SC.m}; }
  const m = scMachines(), P = J.map((j, i) => Array.from({length: m}, (_, k) => val(j.mt[k], `mt${k}${i}`)));
  if (bad.length) return netFail(SCP, out, 'wpisz w zaznaczonych polach czasy na maszynach (liczby nieujemne).', bad);
  return {mode: SC.mode, names, P, m};
}
function scSolveUI() { const I = scRead(); if (!I) return; const h = scReportHTML(I, SC.rule); $('#out-sched').innerHTML = h; last.sched = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function scReportHTML(I, rule = 'SPT') {
  const nm = j => esc(I.names[j]), n = I.names.length, r2 = v => fmt(Math.round(v * 1000) / 1000);
  let h = '';
  if (I.mode === 'single') {
    const RULES = ['FCFS', 'SPT', 'WSPT', 'EDD', 'LPT', 'MH'], res = RULES.map(k => ({k, ...scRule(I.p, I.d, I.w, k)})).map(r => ({...r, M: scMeasures(I.p, I.d, I.w, r.seq)}));
    const noDue = I.d.every(v => v >= 1e9), cols = [['meanF', 'Średni czas przepływu', 'SPT'], ['avgInSystem', 'Średnia liczba zadań w systemie', 'SPT'], ['sumWC', 'Ważony czas zakończenia Σw·C', 'WSPT'],
      ...(noDue ? [] : [['meanT', 'Średnie spóźnienie', ''], ['maxL', 'Maksymalne opóźnienie', 'EDD'], ['nTardy', 'Liczba spóźnionych', 'MH']])];
    h += `<h3>Harmonogramowanie na jednej maszynie</h3><p>${n} zadań, łączny czas ${r2(I.p.reduce((s, v) => s + v, 0))} (makespan jest taki sam dla każdej kolejności – zmienia się tylko to, kiedy kończą się poszczególne zadania).</p>` +
      '<p class="hint">Zielone pole – najlepsza wartość miary. Teoria: SPT minimalizuje średni czas przepływu (i liczbę zadań w systemie), WSPT – ważony czas zakończenia, EDD – maksymalne opóźnienie, Moore-Hodgson – liczbę spóźnionych zadań.</p>';
    h += `<div class="tw"><table><thead><tr><th>Reguła</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>Kolejność</th></tr></thead>` + res.map(r => `<tr${r.k === rule ? ' class="sel"' : ''}><th>${SC_RULES[r.k]}</th>` +
      cols.map(([key]) => { const best = Math.min(...res.map(x => x.M[key])); return `<td class="${Math.abs(r.M[key] - best) < 1e-9 ? 'best' : ''}">${r2(r.M[key])}</td>`; }).join('') + `<td class="tl">${r.seq.map(nm).join(' → ')}</td></tr>`).join('') + '</table></div>';
    const R = res.find(x => x.k === rule), M = R.M;
    h += `<h4>Szczegóły reguły ${SC_RULES[rule]}</h4><p>` + ({FCFS: 'Zadania wykonujemy w kolejności zgłoszenia (wpisania).', SPT: 'Sortujemy zadania rosnąco według czasu wykonania p.', LPT: 'Sortujemy zadania malejąco według czasu wykonania p.',
      WSPT: 'Sortujemy rosnąco według ilorazu p / w (krótkie i ważne zadania najpierw).', EDD: 'Sortujemy rosnąco według terminu d.',
      MH: 'Zaczynamy od kolejności EDD. Gdy któreś zadanie się spóźnia, usuwamy z dotychczasowej listy zadanie najdłuższe i przenosimy je na koniec (i tak będzie spóźnione). Daje to najmniejszą możliwą liczbę spóźnionych zadań.'})[rule] +
      (rule === 'WSPT' ? ' Ilorazy: ' + R.seq.map(j => `${nm(j)}: ${r2(I.p[j] / I.w[j])}`).join(', ') + '.' : '') + '</p>';
    if (rule === 'MH' && R.steps.length) h += '<ol>' + R.steps.map(s => `<li>Zadanie ${nm(s.j)} kończyłoby się po terminie – usuwamy najdłuższe zadanie ${nm(s.k)} (p = ${r2(I.p[s.k])}); czas bieżący spada do ${r2(s.t)}.</li>`).join('') + '</ol>';
    h += `<div class="tw"><table><thead><tr><th>Poz.</th><th>Zadanie</th><th>p</th><th>Start</th><th>Koniec C</th><th>Przepływ F</th>${noDue ? '' : '<th>Termin d</th><th>Opóźnienie L = C − d</th><th>Spóźnienie T</th>'}</tr></thead>` +
      M.rows.map((x, k) => `<tr${x.T > 1e-9 ? ' class="late"' : ''}><td>${k + 1}</td><th>${nm(x.j)}</th><td>${r2(I.p[x.j])}</td><td>${r2(x.S)}</td><td>${r2(x.C)}</td><td>${r2(x.F)}</td>${noDue ? '' : `<td>${r2(I.d[x.j])}</td><td>${r2(x.L)}</td><td>${r2(x.T)}</td>`}</tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Wynik (${SC_RULES[rule]}):</b> średni czas przepływu ${r2(M.meanF)}${noDue ? '' : `, średnie spóźnienie ${r2(M.meanT)}, maks. opóźnienie ${r2(M.maxL)}, spóźnionych ${M.nTardy} z ${n}`}.</div>`;
    h += '<h3>Wykres Gantta</h3>' + VZ.gantt([{label: 'Maszyna', bars: M.rows.map(x => ({s: x.S, e: x.C, cls: x.T > 1e-9 ? 'late' : '', text: I.names[x.j]}))}], {tmax: M.Cmax, title: 'Wykres Gantta – jedna maszyna'}) +
      (noDue ? '' : '<p class="hint">Żółte – zadania spóźnione.</p>');
    return h;
  }
  if (I.mode === 'par') {
    const L = scLPT(I.p, I.m), Mc = scMcNaughton(I.p, I.m), lb = Mc.Cmax;
    h += `<h3>Maszyny równoległe (${I.m} identyczne maszyny)</h3><p>Dolne ograniczenie czasu zakończenia: max(najdłuższe zadanie ${r2(Math.max(...I.p))}; Σp / m = ${r2(I.p.reduce((s, v) => s + v, 0))} / ${I.m} = ${r2(I.p.reduce((s, v) => s + v, 0) / I.m)}) = <b>${r2(lb)}</b>.</p>`;
    h += '<h4>Bez dzielenia zadań – heurystyka LPT</h4><p class="hint">Zadania od najdłuższego przydzielamy kolejno do maszyny, która najwcześniej się zwalnia. To heurystyka: jej wynik jest co najwyżej (4/3 − 1/(3m)) razy gorszy od optimum (twierdzenie Grahama).</p><ol>' +
      L.parts.map(x => `<li>${nm(x.j)} (p = ${r2(I.p[x.j])}) → maszyna ${x.k + 1}, od ${r2(x.s)} do ${r2(x.e)}</li>`).join('') + '</ol>';
    h += `<div class="sum"><b>LPT:</b> czas zakończenia <b>${r2(L.Cmax)}</b>${L.Cmax - lb < 1e-9 ? ' = dolne ograniczenie, więc to optimum' : ` (dolne ograniczenie ${r2(lb)})`}.</div>` +
      VZ.gantt(Array.from({length: I.m}, (_, k) => ({label: 'Maszyna ' + (k + 1), bars: L.parts.filter(x => x.k === k).map(x => ({s: x.s, e: x.e, text: I.names[x.j]}))})), {tmax: Math.max(L.Cmax, lb), title: 'LPT'});
    h += `<h4>Z dzieleniem zadań – metoda McNaughtona (optimum)</h4><p class="hint">Gdy zadanie można przerwać i dokończyć na innej maszynie, wypełniamy maszyny kolejno do poziomu ${r2(lb)}; nadwyżkę przenosimy na następną maszynę. Fragmenty jednego zadania nie wykonują się równocześnie.</p>` +
      `<div class="sum"><b>McNaughton:</b> czas zakończenia <b>${r2(Mc.Cmax)}</b> (optimum).</div>` + VZ.gantt(Array.from({length: I.m}, (_, k) => ({label: 'Maszyna ' + (k + 1), bars: Mc.parts.filter(x => x.k === k).map(x => ({s: x.s, e: x.e, cls: 'alt', text: I.names[x.j]}))})), {tmax: lb, title: 'McNaughton'});
    return h;
  }
  // flow shop: Johnson (2 lub 3 maszyny) albo m maszyn
  const m = I.m, P = I.P, brute = n <= 8 ? scBrute(n, s => scFlow(P, s).Cmax) : null;
  const ganttFlow = (seq, title) => { const F = scFlow(P, seq); return VZ.gantt(Array.from({length: m}, (_, k) => ({label: 'M' + (k + 1), bars: seq.map((j, r) => ({s: F.C[r][k] - P[j][k], e: F.C[r][k], text: I.names[j]}))})), {tmax: F.Cmax, title}); };
  if (I.mode === 'two' && m === 2) {
    const J = scJohnson(P.map(r => r[0]), P.map(r => r[1])), F = scFlow(P, J.seq);
    h += '<h3>Dwie maszyny – reguła Johnsona</h3><p class="hint">Każde zadanie przechodzi najpierw przez M1, potem przez M2. W każdym kroku szukamy najkrótszego nieprzydzielonego czasu: jeśli jest na M1, zadanie idzie na najbliższe wolne miejsce od początku; jeśli na M2 – na najbliższe wolne miejsce od końca. Reguła daje minimalny czas zakończenia (makespan).</p>';
    h += '<div class="tw"><table><thead><tr><th>Krok</th><th>Najkrótszy czas</th><th>Zadanie</th><th>Maszyna</th><th>Miejsce</th></tr></thead>' + J.steps.map((s, k) => `<tr><td>${k + 1}</td><td>${r2(s.v)}</td><th>${nm(s.j)}</th><td>M${s.m}</td><td>${s.m === 1 ? 'od początku' : 'od końca'}</td></tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Kolejność:</b> ${J.seq.map(nm).join(' → ')}; czas zakończenia (makespan) = <b>${r2(F.Cmax)}</b>.${brute ? (Math.abs(brute.v - F.Cmax) < 1e-9 ? ' Przegląd wszystkich kolejności potwierdza optimum.' : ` Uwaga: przegląd daje ${r2(brute.v)}.`) : ''}</div>`;
    const idle = F.Cmax - P.reduce((s, r) => s + r[1], 0); h += `<p>Przestoje maszyny M2: ${r2(idle)} (czekanie na zadania z M1).</p>` + '<h3>Wykres Gantta</h3>' + ganttFlow(J.seq, 'Reguła Johnsona');
    return h;
  }
  if (I.mode === 'two' && m === 3) {
    const J = scJohnson3(P), F = scFlow(P, J.seq), p1 = P.map(r => r[0]), p2 = P.map(r => r[1]), p3 = P.map(r => r[2]);
    h += `<h3>Trzy maszyny – rozszerzenie reguły Johnsona</h3><p>Warunek: min p<sub>1</sub> = ${r2(Math.min(...p1))} ≥ max p<sub>2</sub> = ${r2(Math.max(...p2))} albo min p<sub>3</sub> = ${r2(Math.min(...p3))} ≥ max p<sub>2</sub>. ` +
      (J.exact ? '<b>Warunek jest spełniony</b> – regułę Johnsona stosujemy do czasów pomocniczych p<sub>1</sub> + p<sub>2</sub> i p<sub>2</sub> + p<sub>3</sub> i otrzymujemy optimum.' : '<b>Warunek nie jest spełniony</b> – reguła daje wtedy tylko rozwiązanie przybliżone (heurystykę).') + '</p>';
    h += '<div class="tw"><table><thead><tr><th>Zadanie</th><th>M1</th><th>M2</th><th>M3</th><th>p<sub>1</sub> + p<sub>2</sub></th><th>p<sub>2</sub> + p<sub>3</sub></th></tr></thead>' + P.map((r, j) => `<tr><th>${nm(j)}</th><td>${r2(r[0])}</td><td>${r2(r[1])}</td><td>${r2(r[2])}</td><td>${r2(r[0] + r[1])}</td><td>${r2(r[1] + r[2])}</td></tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Kolejność:</b> ${J.seq.map(nm).join(' → ')}; makespan = <b>${r2(F.Cmax)}</b>.${brute ? (Math.abs(brute.v - F.Cmax) < 1e-9 ? ' Przegląd wszystkich kolejności potwierdza optimum.' : ` Optimum (przegląd wszystkich kolejności): ${r2(brute.v)} dla ${brute.seq.map(nm).join(' → ')}.`) : ''}</div>`;
    return h + '<h3>Wykres Gantta</h3>' + ganttFlow(J.seq, 'Trzy maszyny');
  }
  // flow shop m maszyn
  const C = scCDS(P), Pa = scPalmer(P), D = scDannenbring(P), N = scNEH(P), all = [['CDS (Campbell, Dudek, Smith)', C], ['Palmer', Pa], ['Dannenbring', D], ['NEH (Nawaz, Enscore, Ham)', N]];
  const best = all.reduce((a, b) => b[1].Cmax < a[1].Cmax - 1e-9 ? b : a);
  h += `<h3>Flow shop – ${n} zadań, ${m} maszyn</h3><p class="hint">Dla m > 2 maszyn nie ma prostej reguły optymalnej, dlatego porównujemy heurystyki. ${brute ? 'Dla n ≤ 8 sprawdzamy też optimum przeglądem wszystkich kolejności.' : 'Dla n > 8 przegląd wszystkich kolejności byłby zbyt długi.'}</p>`;
  h += '<div class="tw"><table><thead><tr><th>Metoda</th><th>Kolejność</th><th>Makespan</th></tr></thead>' + all.map(([t, r]) => `<tr${r === best[1] ? ' class="sel"' : ''}><th>${t}</th><td class="tl">${r.seq.map(nm).join(' → ')}</td><td class="${brute && Math.abs(r.Cmax - brute.v) < 1e-9 ? 'best' : ''}">${r2(r.Cmax)}</td></tr>`).join('') +
    (brute ? `<tr><th>Optimum (przegląd ${n}! kolejności)</th><td class="tl">${brute.seq.map(nm).join(' → ')}</td><td class="best">${r2(brute.v)}</td></tr>` : '') + '</table></div>';
  h += '<details class="adv"><summary>Jak działają heurystyki</summary><p><b>CDS:</b> tworzymy m − 1 zadań dwumaszynowych (suma czasów na k pierwszych maszynach i na k ostatnich), każde rozwiązujemy regułą Johnsona i bierzemy najlepszą kolejność:</p><div class="tw"><table><thead><tr><th>k</th><th>Kolejność</th><th>Makespan</th></tr></thead>' +
    C.subs.map(s => `<tr${s.k === C.k ? ' class="sel"' : ''}><td>${s.k}</td><td class="tl">${s.seq.map(nm).join(' → ')}</td><td>${r2(s.Cmax)}</td></tr>`).join('') + '</table></div>' +
    `<p><b>Palmer:</b> indeks nachylenia s = Σ (2k − m − 1)·p<sub>k</sub> (zadania szybkie na początku i wolne na końcu idą wcześniej); kolejność malejąco: ${Pa.seq.map(j => `${nm(j)} (${r2(Pa.idx[j])})`).join(', ')}.</p>` +
    '<p><b>Dannenbring:</b> czasy pomocnicze a = Σ (m − k + 1)·p<sub>k</sub>, b = Σ k·p<sub>k</sub>, potem reguła Johnsona.</p><p><b>NEH:</b> zadania od największej sumy czasów wstawiamy kolejno w najlepsze miejsce dotychczasowej kolejności:</p><ol>' +
    N.steps.map(s => `<li>${nm(s.j)} na pozycję ${s.pos + 1}: ${s.seq.map(nm).join(' → ')} (makespan ${r2(s.Cmax)})</li>`).join('') + '</ol></details>';
  h += `<div class="sum"><b>Najlepsza heurystyka:</b> ${best[0]}, makespan <b>${r2(best[1].Cmax)}</b>${brute ? (Math.abs(best[1].Cmax - brute.v) < 1e-9 ? ' – równy optimum.' : ` (optimum ${r2(brute.v)}).`) : '.'}</div>`;
  return h + '<h3>Wykres Gantta</h3>' + ganttFlow(brute ? brute.seq : best[1].seq, brute ? 'Harmonogram optymalny' : 'Najlepsza heurystyka');
}
registerModule({id: 'sched', title: 'Harmonogramowanie', init: scInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/><rect x="5" y="4.5" width="5" height="3" rx="1"/><rect x="11" y="10.5" width="7" height="3" rx="1"/><rect x="7" y="16.5" width="6" height="3" rx="1"/></svg>',
  html: '<div class="card"><div id="sched-top"></div><div><button id="btn-sched" type="button">Ułóż harmonogram</button></div><div id="out-sched"></div></div>'});
