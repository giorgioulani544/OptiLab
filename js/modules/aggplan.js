/* ===== OptiLab – moduł Planowanie zagregowane =====
   Interfejs i raport dydaktyczny. Obliczenia: js/agg/agg-solver.js (model LP rozwiązywany naszym solverem). */
const AGP = 'agg-', AG_MAX = 36;
const AG_PF = [
  {key: 'k', label: 'Wydajność pracownika (jednostek w okresie)'}, {key: 'W0', label: 'Liczba pracowników na początku'}, {key: 'I0', label: 'Zapas początkowy', unit: 'szt.'}, {key: 'Iend', label: 'Wymagany zapas na koniec', unit: 'szt.', blank: true, ph: '0'},
  {key: 'wage', label: 'Płaca pracownika w okresie (czas normalny)', unit: 'zł'}, {key: 'cReg', label: 'Koszt jednostki w czasie normalnym (np. materiał)', unit: 'zł / szt.', blank: true, ph: '0'},
  {key: 'cOT', label: 'Koszt jednostki w nadgodzinach (z materiałem)', unit: 'zł / szt.'}, {key: 'otMax', label: 'Maks. nadgodzin na pracownika (jednostek w okresie)', unit: 'puste = bez limitu', blank: true},
  {key: 'cSub', label: 'Koszt jednostki z podwykonawstwa', unit: 'zł / szt.'}, {key: 'subMax', label: 'Maks. podwykonawstwa w okresie', unit: 'puste = bez limitu', blank: true},
  {key: 'cHire', label: 'Koszt zatrudnienia pracownika', unit: 'zł'}, {key: 'cFire', label: 'Koszt zwolnienia pracownika', unit: 'zł'},
  {key: 'h', label: 'Koszt utrzymania jednostki zapasu w okresie', unit: 'zł / szt.'}, {key: 'b', label: 'Koszt zaległości jednostki w okresie', unit: 'puste = braki niedozwolone', blank: true}];
const AG_ADV = [{key: 'hireMax', label: 'Maks. zatrudnień w okresie', unit: 'puste = bez limitu', blank: true}, {key: 'fireMax', label: 'Maks. zwolnień w okresie', unit: 'puste = bez limitu', blank: true}];
const AG_COLS = [{key: 'label', label: 'Okres', type: 'name'}, {key: 'D', label: 'Popyt', type: 'num'}];
const agEx = (name, D, labels, p) => ({name, data: {data: D.map((d, i) => ({label: labels[i], D: String(d)})), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]))}});
const AG_EXAMPLES = [
  agEx('Red Tomato Tools (Chopra i Meindl), 6 miesięcy', [1600, 3000, 3200, 3800, 2200, 2200], ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze'], {k: 40, W0: 80, I0: 1000, Iend: 500, wage: 640, cReg: 10, cOT: 34, otMax: 2.5, cSub: 30, subMax: '', cHire: 300, cFire: 500, h: 2, b: 5}),
  agEx('Zakład sezonowy, 4 kwartały, bez braków', [1800, 3200, 4600, 2200], ['K1', 'K2', 'K3', 'K4'], {k: 100, W0: 25, I0: 200, Iend: 200, wage: 6000, cReg: 15, cOT: 95, otMax: 20, cSub: 110, subMax: 600, cHire: 2500, cFire: 4000, h: 8, b: ''}),
  agEx('Rok z sezonem letnim, 12 miesięcy', [420, 380, 450, 600, 780, 950, 1020, 980, 760, 560, 430, 400], ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
    {k: 20, W0: 25, I0: 50, Iend: 50, wage: 4200, cReg: 30, cOT: 290, otMax: 4, cSub: 330, subMax: 150, cHire: 3000, cFire: 3500, h: 12, b: 60}),
];
let AG = agNormalize(JSON.parse(JSON.stringify(AG_EXAMPLES[0].data)));
function agNormalize(d) {
  if (!d || !Array.isArray(d.data) || !d.data.length) throw new Error('to nie jest zadanie planowania zagregowanego (brak okresów z popytem).');
  if (d.data.length > AG_MAX) throw new Error(`za dużo okresów (${d.data.length}) – maksimum to ${AG_MAX}.`);
  const o = {intW: !!d.intW, data: d.data.map((r, i) => ({label: String(r.label ?? i + 1), D: String(r.D ?? '')}))}; [...AG_PF, ...AG_ADV].forEach(f => { o[f.key] = String(d[f.key] ?? ''); }); return o;
}
function agRender() {
  $('#' + AGP + 'params').innerHTML = paramFormHTML(AGP, AG_PF, AG); $('#' + AGP + 'advp').innerHTML = paramFormHTML(AGP, AG_ADV, AG); $('#' + AGP + 'intW').checked = AG.intW;
  const box = $('#' + AGP + 'grid'); box.innerHTML = rowTableHTML(AGP + 'd', AG_COLS, AG.data, {addLabel: '+ okres', count: n => `${n} okresów`});
  $('#' + AGP + 'dadd').onclick = () => { agSync(); if (AG.data.length >= AG_MAX) return; AG.data.push({label: String(AG.data.length + 1), D: ''}); agRender(); };
  matrixPolish($('#' + AGP + 'top'));
}
function agSync() { paramSync(AGP, [...AG_PF, ...AG_ADV], AG); AG.data = rowTableSync(AGP + 'd', AG_COLS, AG.data); AG.intW = $('#' + AGP + 'intW').checked; }
function agInit() {
  $('#' + AGP + 'top').innerHTML = `${netCopyHTML(AGP)}<h4>Popyt w okresach</h4><div id="${AGP}grid"></div><h4>Parametry</h4><div id="${AGP}params"></div><div id="${AGP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label class="chk"><input type="checkbox" id="${AGP}intW"> całkowita liczba pracowników (metoda podziału i ograniczeń)</label></div><div id="${AGP}advp"></div>${netToolsHTML(AGP, AG_EXAMPLES)}</details>
    <p class="hint">Plan produkcji i zatrudnienia na kolejne okresy: ile produkować w czasie normalnym i w nadgodzinach, ile zlecić podwykonawcom, kogo zatrudnić lub zwolnić i ile trzymać w zapasie. Program porówna trzy strategie i wyznaczy plan najtańszy.</p>`;
  const top = $('#' + AGP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; agSync(); if (AG.data.length > 1) AG.data.splice(+k, 1); clearErr(); agRender(); });
  const keys = [...AG_PF, ...AG_ADV].map(f => f.key);
  netToolsWire(AGP, {kind: 'aggregate', out: '#out-agg', examples: AG_EXAMPLES, normalize: agNormalize,
    get: () => { agSync(); return JSON.parse(JSON.stringify(AG)); }, set: d => { AG = d; agRender(); },
    toCSV: d => rowsToCSV(AG_COLS, d.data, keys.map(k => [k, d[k]])),
    fromCSV: t => { const r = rowsFromCSV(t, AG_COLS, keys.map(k => k.toLowerCase())), o = {data: r.rows}; keys.forEach(k => { const v = r.meta[k.toLowerCase()]; o[k] = v === undefined ? '' : String(v).replace(',', '.'); }); return o; }});
  $('#btn-agg').onclick = agSolveUI;
  agRender();
}
function agRead() {
  clearErr(); agSync();
  const out = '#out-agg', bad = [], P = {}, num = (s, id, blank) => { const t = String(s).trim().replace(',', '.'); if (t === '' && blank) return null; const x = Number(t); if (t === '' || !isFinite(x) || x < 0 || x > 1e12) { bad.push(id); return NaN; } return x; };
  P.D = AG.data.map((r, i) => num(r.D, 'dD' + i)); if (bad.length) return netFail(AGP, out, 'wpisz w zaznaczonych polach popyt (liczby nieujemne).', bad);
  [...AG_PF, ...AG_ADV].forEach(f => { P[f.key] = num(AG[f.key], f.key, f.blank); }); if (bad.length) return netFail(AGP, out, 'wpisz w zaznaczonych polach liczby nieujemne.', bad);
  if (!(P.k > 0)) return netFail(AGP, out, 'wydajność pracownika musi być dodatnia.', ['k']);
  P.Iend = P.Iend ?? 0; P.cReg = P.cReg ?? 0;
  return P;
}
function agSolveUI() {
  const P = agRead(); if (!P) return;
  const res = {opt: aggSolve(P, 'opt'), chase: aggSolve(P, 'chase'), level: aggSolve(P, 'level'), int: AG.intW ? aggSolve(P, 'opt', {intW: true}) : null};
  const h = agReportHTML(P, res, AG.data.map((r, i) => String(r.label).trim() || String(i + 1))); $('#out-agg').innerHTML = h; last.agg = h;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function agReportHTML(P, res, labels) {
  const f = v => fmt(Math.round(v * 100) / 100), T = P.D.length, lb = i => esc((labels || [])[i] ?? i + 1), O = res.opt;
  const NAMES = {W: 'płace (czas normalny)', H: 'zatrudnienia', F: 'zwolnienia', R: 'produkcja w czasie normalnym', O: 'nadgodziny', S: 'podwykonawstwo', I: 'utrzymanie zapasu', B: 'zaległości'};
  let h = `<h3>Planowanie zagregowane – ${T} okresów</h3><p class="hint">Model programowania liniowego: w każdym okresie decydujemy o liczbie pracowników W (z zatrudnieniami H i zwolnieniami F), produkcji w czasie normalnym R ≤ ${f(P.k)}·W, w nadgodzinach O${P.otMax !== null ? ` ≤ ${f(P.otMax)}·W` : ''}, podwykonawstwie S${P.subMax !== null ? ` ≤ ${f(P.subMax)}` : ''}, zapasie I i zaległościach B. ` +
    `Bilans okresu: zapas poprzedni − zaległości poprzednie + R + O + S − popyt = I − B. ${P.b === null ? 'Braki są niedozwolone. ' : 'Zaległości muszą być nadrobione do końca horyzontu. '}Na koniec zapas ≥ ${f(P.Iend)}. Model ma ${O.model.M.n} zmiennych i ${O.model.M.A.length} ograniczeń; rozwiązujemy go naszą metodą simpleks (dwufazową).</p>`;
  if (O.status !== 'optimal') return h + `<p class="msg">${O.status === 'infeasible' ? 'Nie istnieje plan spełniający wszystkie ograniczenia – zwiększ limity (nadgodziny, podwykonawstwo, zatrudnienia) albo dopuść zaległości.' : 'Obliczenia przerwano (limit iteracji) – wynik byłby niewiarygodny.'}</p>`;
  const S = [['chase', 'Pogoń za popytem', 'zatrudnienie dopasowane do popytu, bez zapasów, nadgodzin i podwykonawstwa'], ['level', 'Stały poziom zatrudnienia', 'ta sama liczba pracowników przez cały horyzont, wahania popytu pokrywa zapas'], ['opt', 'Plan optymalny (mieszany)', 'najtańsze połączenie wszystkich możliwości']];
  h += '<h4>Porównanie strategii</h4><div class="tw"><table><thead><tr><th>Strategia</th><th>Na czym polega</th><th>Koszt całkowity</th><th>Różnica do optimum</th></tr></thead>' +
    S.map(([k, n, d]) => { const r = res[k]; return `<tr${k === 'opt' ? ' class="sel"' : ''}><th>${n}</th><td class="tl">${d}</td>` + (r.status === 'optimal' ? `<td class="${Math.abs(r.z - O.z) < 1e-6 * (1 + O.z) ? 'best' : ''}">${f(r.z)}</td><td>${f(r.z - O.z)} (${fmt(Math.round((r.z / O.z - 1) * 1000) / 10)}%)</td>` : '<td colspan="2">niedostępna przy tych ograniczeniach</td>') + '</tr>'; }).join('') + '</table></div>';
  const series = S.filter(([k]) => res[k].status === 'optimal').map(([k, n], i) => ({name: n, pts: res[k].plan.map((p, t) => [t + 1, p.W]), cls: ['b', 'c', ''][i], dots: true}));
  h += VZ.line(series, {title: 'Liczba pracowników w strategiach', xLabel: 'okres', yLabel: 'pracownicy'});
  const same = ['chase', 'level'].filter(k => res[k].status === 'optimal' && res[k].plan.every((p, t) => Math.abs(p.W - O.plan[t].W) < 1e-6));
  if (same.length) h += `<p class="hint">Plan optymalny ma takie samo zatrudnienie jak strategia „${same.map(k => k === 'chase' ? 'pogoń za popytem' : 'stały poziom zatrudnienia').join('” i „')}” – ich linie na wykresie się pokrywają.</p>`;
  const tab = (R, title) => '<h4>' + title + '</h4><div class="tw"><table><thead><tr><th>Okres</th><th>Popyt</th><th>Pracownicy W</th><th>Zatrudnienia H</th><th>Zwolnienia F</th><th>Produkcja normalna R</th><th>Nadgodziny O</th><th>Podwykonawstwo S</th><th>Zapas I</th><th>Zaległości B</th></tr></thead>' +
    R.plan.map(p => `<tr><th>${lb(p.t)}</th><td>${f(p.D)}</td><td>${f(p.W)}</td><td>${f(p.H)}</td><td>${f(p.F)}</td><td>${f(p.R)}</td><td>${f(p.O)}</td><td>${f(p.S)}</td><td>${f(p.I)}</td><td>${f(p.B)}</td></tr>`).join('') +
    `<tr class="sel"><th>Razem</th><td>${f(P.D.reduce((s, v) => s + v, 0))}</td><td>–</td>${['H', 'F', 'R', 'O', 'S', 'I', 'B'].map(k => `<td>${f(R.plan.reduce((s, p) => s + p[k], 0))}</td>`).join('')}</tr></table></div>`;
  h += tab(O, 'Plan optymalny');
  h += '<h4>Struktura kosztów planu optymalnego</h4><div class="tw"><table><thead><tr><th>Składnik</th><th>Koszt</th><th>Udział</th></tr></thead>' +
    AG_VARS.filter(k => O.parts[k] > 1e-9).map(k => `<tr><th>${NAMES[k]}</th><td>${f(O.parts[k])}</td><td>${fmt(Math.round(O.parts[k] / O.z * 1000) / 10)}%</td></tr>`).join('') + `<tr class="sel"><th>Razem</th><td><b>${f(O.z)}</b></td><td>100%</td></tr></table></div>`;
  h += `<div class="sum"><b>Wynik:</b> najtańszy plan kosztuje <b>${f(O.z)}</b>${res.chase.status === 'optimal' && res.level.status === 'optimal' ? `; pogoń za popytem kosztowałaby ${f(res.chase.z)}, a stałe zatrudnienie ${f(res.level.z)}` : ''}.</div>`;
  h += VZ.line([{name: 'popyt', pts: O.plan.map((p, t) => [t + 1, p.D]), dots: true}, {name: 'produkcja razem (R + O + S)', pts: O.plan.map((p, t) => [t + 1, p.R + p.O + p.S]), cls: 'b', dots: true}, {name: 'zapas − zaległości', pts: O.plan.map((p, t) => [t + 1, p.I - p.B]), cls: 'c'}], {title: 'Popyt, produkcja i zapas w planie optymalnym', xLabel: 'okres'});
  if (O.duals) h += '<h4>Ceny dualne: koszt krańcowy popytu</h4><p class="hint">O ile wzrośnie koszt planu, gdy popyt w danym okresie zwiększy się o jedną jednostkę (z końcowej tablicy simpleksa). Pokazuje, które okresy są „wąskim gardłem".</p><div class="tw"><table><thead><tr><th>Okres</th><th>Koszt dodatkowej jednostki popytu</th></tr></thead>' +
    O.duals.map(d => `<tr><th>${lb(d.t)}</th><td>${f(d.y)}</td></tr>`).join('') + '</table></div>' + (O.degenerate ? '<p class="note">Rozwiązanie jest zdegenerowane – ceny dualne mogą nie być jednoznaczne (inna cena przy zwiększaniu i przy zmniejszaniu popytu).</p>' : '');
  if (O.plan.some(p => Math.abs(p.W - Math.round(p.W)) > 1e-6)) h += `<p class="note">Model LP dopuszcza ułamkową liczbę pracowników (np. ${f(O.plan.find(p => Math.abs(p.W - Math.round(p.W)) > 1e-6).W)}). Można ją interpretować jako etaty, a dokładny plan z całymi pracownikami daje opcja zaawansowana „całkowita liczba pracowników".</p>`;
  if (res.int) { const I = res.int;
    h += '<h3>Plan z całkowitą liczbą pracowników</h3>' + (I.status === 'optimal' ? `<div class="sum"><b>Koszt:</b> <b>${f(I.z)}</b> (o ${f(I.z - O.z)} więcej niż plan LP z ułamkami); przeszukano ${I.ilp.count} węzłów drzewa.</div>` + tab(I, 'Plan całkowitoliczbowy') :
      `<p class="msg">${I.status === 'infeasible' ? 'Brak planu z całkowitą liczbą pracowników.' : 'Przeszukiwanie przerwano (limit węzłów) – najlepszy znaleziony plan nie musi być optymalny, dlatego go nie pokazujemy jako wyniku.'}</p>`); }
  return h;
}
registerModule({id: 'agg', title: 'Planowanie zagregowane', init: agInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="3.5" height="8"/><rect x="8.5" y="8" width="3.5" height="12"/><rect x="14" y="5" width="3.5" height="15"/><path d="M3 9l6-4 5 3 7-5"/></svg>',
  html: '<div class="card"><div id="agg-top"></div><div><button id="btn-agg" type="button">Wyznacz plan</button></div><div id="out-agg"></div></div>'});
