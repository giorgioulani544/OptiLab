/* ===== OptiLab – moduł Prognozowanie =====
   Interfejs i raport dydaktyczny. Obliczenia: js/fc/forecast-solver.js. Wykresy: js/viz.js. */
const FCP = 'fc-', FC_MAX = 400;
const FC_PF = {k: {key: 'k', label: 'Liczba okresów średniej k'}, alpha: {key: 'alpha', label: 'Stała wygładzania poziomu α', unit: 'od 0 do 1'}, beta: {key: 'beta', label: 'Stała wygładzania trendu β', unit: 'od 0 do 1'},
  gamma: {key: 'gamma', label: 'Stała wygładzania sezonowości γ', unit: 'od 0 do 1'}, L: {key: 'L', label: 'Długość sezonu s', unit: 'np. 4 kwartały, 12 miesięcy'}, h: {key: 'h', label: 'Prognoza na ile okresów naprzód', unit: 'okresów'}};
const fcFields = m => ({naive: ['h'], ma: ['k', 'h'], wma: ['h'], ses: ['alpha', 'h'], holt: ['alpha', 'beta', 'h'], hwa: ['L', 'alpha', 'beta', 'gamma', 'h'], hwm: ['L', 'alpha', 'beta', 'gamma', 'h'], reg: ['h']})[m].map(k => FC_PF[k]);
const FC_COLS = [{key: 'label', label: 'Okres', type: 'name'}, {key: 'y', label: 'Wartość', type: 'num'}];
const fcSer = (vals, lab = i => String(i + 1)) => vals.map((v, i) => ({label: lab(i), y: String(v)}));
const FC_EXAMPLES = [
  {name: 'Sprzedaż tygodniowa – wygładzanie wykładnicze', data: {method: 'ses', alpha: '0.3', h: '3', data: fcSer([84, 92, 87, 95, 101, 90, 98, 104, 99, 107, 103, 110], i => 'tydz. ' + (i + 1))}},
  {name: 'Popyt miesięczny z trendem – Holt', data: {method: 'holt', alpha: '0.4', beta: '0.3', h: '4', data: fcSer([120, 126, 131, 140, 143, 152, 158, 161, 170, 176, 181, 190], i => ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'][i])}},
  {name: 'Sprzedaż kwartalna z sezonowością – Holt-Winters', data: {method: 'hwm', L: '4', alpha: '0.3', beta: '0.1', gamma: '0.3', h: '4', data: fcSer([62, 41, 78, 115, 70, 46, 86, 128, 77, 52, 95, 140, 85, 57, 104, 152], i => `${2022 + Math.floor(i / 4)} K${i % 4 + 1}`)}},
  {name: 'Średnia ruchoma (k = 3)', data: {method: 'ma', k: '3', h: '1', data: fcSer([20, 22, 19, 24, 26, 23, 27, 25, 28, 30])}},
  {name: 'Ważona średnia ruchoma (wagi 1, 2, 3)', data: {method: 'wma', w: '1; 2; 3', h: '1', data: fcSer([20, 22, 19, 24, 26, 23, 27, 25, 28, 30])}},
  {name: 'Trend liniowy – regresja względem czasu', data: {method: 'reg', h: '3', data: fcSer([74, 79, 80, 90, 105, 142, 122], i => String(2019 + i))}},
];
let FC = fcNormalize(JSON.parse(JSON.stringify(FC_EXAMPLES[0].data)));
function fcNormalize(d) {
  if (!d || !FC_METHODS[d.method] || !Array.isArray(d.data) || !d.data.length) throw new Error('to nie jest zadanie prognozowania (brak metody lub danych).');
  if (d.data.length > FC_MAX) throw new Error(`za dużo okresów (${d.data.length}) – maksimum to ${FC_MAX}.`);
  const S = (v, def) => String(v ?? def);
  return {method: d.method, k: S(d.k, '3'), w: S(d.w, '1; 2; 3'), alpha: S(d.alpha, '0.3'), beta: S(d.beta, '0.2'), gamma: S(d.gamma, '0.3'), L: S(d.L, '4'), h: S(d.h, '3'), opt: !!d.opt, crit: ['MSE', 'MAD', 'MAPE', 'CFE'].includes(d.crit) ? d.crit : 'MSE',
    data: d.data.map((r, i) => ({label: S(r.label, i + 1), y: S(r.y, '')}))};
}
function fcRender() {
  $('#' + FCP + 'method').value = FC.method; $('#' + FCP + 'opt').checked = FC.opt; $('#' + FCP + 'crit').value = FC.crit;
  $('#' + FCP + 'params').innerHTML = paramFormHTML(FCP, fcFields(FC.method), FC) + (FC.method === 'wma' ? `<div class="crow pfr"><label for="${FCP}w">Wagi (od najstarszego do najnowszego okresu)</label><input class="tx" id="${FCP}w" value="${esc(FC.w)}" placeholder="np. 1; 2; 3"></div>` : '');
  $('#' + FCP + 'optbox').hidden = !['ses', 'holt', 'hwa', 'hwm'].includes(FC.method);
  const box = $('#' + FCP + 'grid'); box.innerHTML = rowTableHTML(FCP + 'd', FC_COLS, FC.data, {addLabel: '+ okres', count: n => `${n} okresów`});
  $('#' + FCP + 'dadd').onclick = () => { fcSync(); if (FC.data.length >= FC_MAX) return; FC.data.push({label: String(FC.data.length + 1), y: ''}); fcRender(); };
  matrixPolish($('#' + FCP + 'top'));
}
function fcSync() {
  paramSync(FCP, fcFields(FC.method), FC); const w = $('#' + FCP + 'w'); if (w) FC.w = w.value;
  FC.data = rowTableSync(FCP + 'd', FC_COLS, FC.data); FC.method = $('#' + FCP + 'method').value; FC.opt = $('#' + FCP + 'opt').checked; FC.crit = $('#' + FCP + 'crit').value;
}
function fcInit() {
  $('#' + FCP + 'top').innerHTML = `<div class="crow"><label for="${FCP}method">Metoda</label><select id="${FCP}method">${Object.entries(FC_METHODS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(FCP)}<div id="${FCP}params"></div><div id="${FCP}grid"></div><div id="${FCP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div id="${FCP}optbox" class="crow"><label class="chk"><input type="checkbox" id="${FCP}opt"> dobierz stałe wygładzania automatycznie</label><label for="${FCP}crit">kryterium</label><select id="${FCP}crit"><option value="MSE">MSE</option><option value="MAD">MAD</option><option value="MAPE">MAPE</option><option value="CFE">|CFE| (skumulowany błąd)</option></select></div>
     <div class="crow"><label for="${FCP}col">Wklej kolumnę liczb (np. z Excela)</label></div><textarea id="${FCP}col" rows="3" class="tx" style="width:100%" placeholder="np. 84 92 87 95 albo jedna liczba w wierszu"></textarea>
     <div class="crow"><button type="button" class="ghost" id="${FCP}colgo">Wstaw jako dane</button></div>
     ${netToolsHTML(FCP, FC_EXAMPLES)}</details>
    <p class="hint">Wpisz kolejne wartości szeregu (od najstarszej). Program policzy prognozy, błędy i prognozę na kolejne okresy.</p>`;
  ['method', 'opt', 'crit'].forEach(k => $('#' + FCP + k).onchange = () => { fcSync(); clearErr(); fcRender(); });
  $('#' + FCP + 'colgo').onclick = () => { fcSync(); const nums = String($('#' + FCP + 'col').value).replace(/\r/g, '').split(/[\n;\t ]+/).map(s => s.trim()).filter(Boolean);
    const vals = nums.map(s => Number(s.replace(/\s/g, '').replace(',', '.'))), badIx = vals.findIndex(v => !isFinite(v));
    if (!nums.length) return netFail(FCP, null, 'pole do wklejenia jest puste.', ['col']);
    if (badIx >= 0) return netFail(FCP, null, `pozycja ${badIx + 1}: „${esc(nums[badIx])}" nie jest liczbą.`, ['col']);
    if (vals.length > FC_MAX) return netFail(FCP, null, `za dużo wartości (${vals.length}) – maksimum to ${FC_MAX}.`, ['col']);
    clearErr(); FC.data = fcSer(vals); fcRender(); };
  const top = $('#' + FCP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; fcSync(); if (FC.data.length > 1) FC.data.splice(+k, 1); clearErr(); fcRender(); });
  netToolsWire(FCP, {kind: 'forecast', out: '#out-fc', examples: FC_EXAMPLES, normalize: fcNormalize,
    get: () => { fcSync(); return JSON.parse(JSON.stringify(FC)); }, set: d => { FC = d; fcRender(); },
    toCSV: d => rowsToCSV(FC_COLS, d.data, [['metoda', d.method], ['k', d.k], ['wagi', d.w], ['alfa', d.alpha], ['beta', d.beta], ['gamma', d.gamma], ['sezon', d.L], ['horyzont', d.h]]),
    fromCSV: t => { const r = rowsFromCSV(t, FC_COLS, ['metoda', 'k', 'wagi', 'alfa', 'beta', 'gamma', 'sezon', 'horyzont']), m = r.meta, un = v => v === undefined ? undefined : String(v).replace(',', '.');
      return {method: FC_METHODS[m.metoda] ? m.metoda : 'ses', k: un(m.k), w: m.wagi, alpha: un(m.alfa), beta: un(m.beta), gamma: un(m.gamma), L: un(m.sezon), h: un(m.horyzont), data: r.rows}; }});
  $('#btn-fc').onclick = fcSolveUI;
  fcRender();
}
function fcRead() {
  clearErr(); fcSync();
  const out = '#out-fc', m = FC.method, bad = [], num = (s, id) => { const t = String(s).trim().replace(',', '.'), x = Number(t); if (t === '' || !isFinite(x)) { bad.push(id); return NaN; } return x; };
  const y = FC.data.map((r, i) => num(r.y, 'dy' + i)); if (bad.length) return netFail(FCP, out, 'wpisz w zaznaczonych polach wartości szeregu (liczby).', bad);
  const n = y.length, P = {}, intIn = (id, lo, hi, msg) => { const x = Number(String(FC[id]).trim()); if (!(Number.isInteger(x) && x >= lo && x <= hi)) { netFail(FCP, out, msg, [id]); return null; } return x; };
  if (n < 2) return netFail(FCP, out, 'potrzebne są co najmniej 2 wartości szeregu.', ['dy0']);
  P.h = intIn('h', 0, 120, 'horyzont prognozy: liczba całkowita od 0 do 120.'); if (P.h === null) return null;
  for (const k of ['alpha', 'beta', 'gamma']) if (fcFields(m).some(f => f.key === k)) { const x = num(FC[k], k); if (!(x > 0 && x <= 1)) return netFail(FCP, out, 'stałe wygładzania muszą należeć do przedziału (0; 1].', [k]); P[k] = x; }
  if (m === 'ma') { P.k = intIn('k', 1, n - 1, `liczba okresów średniej: całkowita od 1 do ${n - 1} (musi być mniejsza od liczby danych).`); if (P.k === null) return null; }
  if (m === 'wma') { const w = String(FC.w).split(/[;\s]+/).filter(Boolean).map(s => Number(s.replace(',', '.')));
    if (!w.length || w.some(v => !(v >= 0)) || !(w.reduce((s, v) => s + v, 0) > 0)) return netFail(FCP, out, 'wagi: liczby nieujemne oddzielone średnikami, przynajmniej jedna dodatnia (np. 1; 2; 3).', ['w']);
    if (w.length >= n) return netFail(FCP, out, `liczba wag (${w.length}) musi być mniejsza od liczby danych (${n}).`, ['w']); P.w = w; }
  if (m === 'holt' && n < 3) return netFail(FCP, out, 'metoda Holta potrzebuje co najmniej 3 wartości.', ['dy0']);
  if (m === 'hwa' || m === 'hwm') { P.L = intIn('L', 2, 52, 'długość sezonu: liczba całkowita od 2 do 52.'); if (P.L === null) return null;
    if (n < 2 * P.L + 1) return netFail(FCP, out, `Holt-Winters potrzebuje co najmniej dwóch pełnych sezonów i jednego okresu więcej (${2 * P.L + 1} wartości), jest ${n}.`, ['L']);
    if (m === 'hwm' && y.some(v => v <= 0)) return netFail(FCP, out, 'model multiplikatywny wymaga wartości dodatnich – użyj modelu addytywnego.', y.map((v, i) => v <= 0 ? 'dy' + i : null).filter(Boolean)); }
  return {y, P, labels: FC.data.map((r, i) => String(r.label).trim() || String(i + 1))};
}
function fcSolveUI() {
  const I = fcRead(); if (!I) return;
  let opt = null; if (FC.opt && ['ses', 'holt', 'hwa', 'hwm'].includes(FC.method)) { opt = fcOptimize(I.y, FC.method, I.P, FC.crit); if (opt) Object.assign(I.P, opt.P); }
  const h = fcReportHTML(FC.method, I.y, I.P, I.labels, opt); $('#out-fc').innerHTML = h; last.fc = h;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function fcReportHTML(method, y, P, labels, opt = null) {
  const R = fcRun(y, method, P), E = R.err, f = v => v === null || !isFinite(v) ? '–' : fmt(Math.round(v * 1000) / 1000), n = y.length, lb = i => esc((labels || [])[i] ?? i + 1);
  const desc = {naive: 'Prognoza na okres t to wartość z okresu t − 1: F<sub>t</sub> = y<sub>t−1</sub>. Punkt odniesienia dla innych metod.',
    ma: `Prognoza to średnia z ${P.k} ostatnich wartości: F<sub>t</sub> = (y<sub>t−1</sub> + … + y<sub>t−${P.k}</sub>) / ${P.k}. Większe k – prognoza gładsza, ale wolniej reaguje na zmiany.`,
    wma: `Średnia ważona ostatnich ${P.w?.length} wartości z wagami ${(P.w || []).map(f).join(', ')} (ostatnia waga dla najnowszego okresu), podzielona przez sumę wag ${f((P.w || []).reduce((s, v) => s + v, 0))}.`,
    ses: `F<sub>t+1</sub> = α·y<sub>t</sub> + (1 − α)·F<sub>t</sub>, α = ${f(P.alpha)}. Start: F<sub>1</sub> = y<sub>1</sub>. Każda prognoza to średnia wszystkich danych z wagami malejącymi wykładniczo.`,
    holt: `Poziom L<sub>t</sub> = α·y<sub>t</sub> + (1 − α)(L<sub>t−1</sub> + T<sub>t−1</sub>), trend T<sub>t</sub> = β(L<sub>t</sub> − L<sub>t−1</sub>) + (1 − β)T<sub>t−1</sub>, prognoza F<sub>t+h</sub> = L<sub>t</sub> + h·T<sub>t</sub>; α = ${f(P.alpha)}, β = ${f(P.beta)}. Start: L<sub>1</sub> = y<sub>1</sub>, T<sub>1</sub> = y<sub>2</sub> − y<sub>1</sub>.`,
    hwa: `Poziom, trend i ${P.L} wskaźników sezonowych dodawanych do prognozy: F<sub>t</sub> = L<sub>t−1</sub> + T<sub>t−1</sub> + S<sub>t−s</sub>; α = ${f(P.alpha)}, β = ${f(P.beta)}, γ = ${f(P.gamma)}. Start: poziom = średnia pierwszego sezonu, trend = (średnia 2. sezonu − średnia 1.) / s, wskaźniki = wartości 1. sezonu − poziom.`,
    hwm: `Poziom, trend i ${P.L} wskaźników sezonowych mnożących prognozę: F<sub>t</sub> = (L<sub>t−1</sub> + T<sub>t−1</sub>)·S<sub>t−s</sub>; α = ${f(P.alpha)}, β = ${f(P.beta)}, γ = ${f(P.gamma)}. Start: poziom = średnia pierwszego sezonu, trend = (średnia 2. sezonu − średnia 1.) / s, wskaźniki = wartości 1. sezonu / poziom.`,
    reg: 'Prosta y = a + b·t dopasowana metodą najmniejszych kwadratów do wszystkich danych. Wartości „prognozy" w tabeli to dopasowanie w próbie (nie prognozy z wyprzedzeniem).'}[method];
  let h = `<h3>Prognozowanie – ${FC_METHODS[method]}</h3><p>${desc}</p>`;
  if (method === 'reg') h += `<div class="formula">b = Σ(t − t̄)(y − ȳ) / Σ(t − t̄)² = <b>${f(R.state.b)}</b>;&nbsp; a = ȳ − b·t̄ = <b>${f(R.state.a)}</b>;&nbsp; R² = ${f(R.state.r2)}</div>`;
  if (method === 'hwa' || method === 'hwm') h += `<p class="hint">Wskaźniki sezonowe po ostatnim okresie: ${Array.from({length: P.L}, (_, j) => f(R.state.S[n - P.L + j])).join('; ')}.</p>`;
  if (opt) h += `<div class="sum"><b>Dobór parametrów:</b> sprawdzono ${opt.tried} zestawów (krok ${f(opt.step)}); najmniejsze ${opt.crit === 'CFE' ? '|CFE|' : opt.crit} = ${f(opt.score)} dla ${['alpha', 'beta', 'gamma'].filter(k => opt.P[k] !== undefined && fcFields(method).some(x => x.key === k)).map(k => ({alpha: 'α', beta: 'β', gamma: 'γ'})[k] + ' = ' + f(opt.P[k])).join(', ')}.</div>`;
  h += `<div class="tw"><table><thead><tr><th>Okres</th><th>Wartość y</th><th>Prognoza F</th><th>Błąd e = y − F</th><th>|e|</th><th>e²</th><th>|e|/y</th><th>CFE</th><th>Sygnał kontrolny</th></tr></thead>` +
    y.map((v, i) => { const r = E.rows.find(x => x.t === i); return `<tr${r && Math.abs(r.ts) > 4 ? ' class="late"' : ''}><th>${lb(i)}</th><td>${f(v)}</td><td>${f(R.F[i])}</td>` + (r ? `<td>${f(r.e)}</td><td>${f(r.ae)}</td><td>${f(r.e2)}</td><td>${r.pe === null ? '–' : f(r.pe * 100) + '%'}</td><td>${f(r.cfe)}</td><td>${f(r.ts)}</td>` : '<td colspan="6" class="hint">– (okres startowy)</td>') + '</tr>'; }).join('') + '</table></div>';
  h += `<div class="sum"><b>Błędy</b> (z ${E.n} okresów): MAD = <b>${f(E.MAD)}</b>, MSE = <b>${f(E.MSE)}</b>, RMSE = ${f(E.RMSE)}, MAPE = <b>${f(E.MAPE)}%</b>${E.mapeSkipped ? ` (pominięto ${E.mapeSkipped} okr. z y = 0)` : ''}, obciążenie (średni błąd) = ${f(E.bias)}, CFE = ${f(E.CFE)}, sygnał kontrolny = ${f(E.TS)}.</div>`;
  h += Math.abs(E.TS) > 4 ? `<p class="msg">Sygnał kontrolny przekracza ±4 – prognoza systematycznie ${E.CFE > 0 ? 'zaniża' : 'zawyża'} wartości. Rozważ metodę z trendem lub sezonowością.</p>` :
    '<p class="hint">Sygnał kontrolny CFE / MAD mieści się w ±4 – nie ma oznak systematycznego błędu prognozy.</p>';
  if (R.fut.length) h += '<h4>Prognoza na kolejne okresy</h4><div class="tw"><table><thead><tr><th>Okres</th><th>Prognoza</th></tr></thead>' + R.fut.map((v, j) => `<tr><th>t = ${n + j + 1}</th><td><b>${f(v)}</b></td></tr>`).join('') + '</table></div>';
  const fitPts = R.F.map((v, i) => [i + 1, v]).filter(p => p[1] !== null && (method === 'reg' || p[0] - 1 >= R.start || method === 'ses'));
  h += VZ.line([{name: 'dane', pts: y.map((v, i) => [i + 1, v]), dots: true}, {name: method === 'reg' ? 'dopasowanie' : 'prognozy', pts: fitPts, cls: 'b'}, ...(R.fut.length ? [{name: 'prognoza naprzód', pts: [[n, method === 'reg' ? R.F[n - 1] : y[n - 1]], ...R.fut.map((v, j) => [n + j + 1, v])], cls: 'c', dots: true}] : [])],
    {title: 'Dane i prognozy', xLabel: 'okres t'});
  // porównanie metod przy obecnych parametrach
  const cmp = Object.keys(FC_METHODS).map(k => { try { const PP = {...P, k: P.k || Math.min(3, n - 1), w: P.w || [1, 2, 3].slice(0, Math.max(1, Math.min(3, n - 1))), alpha: P.alpha || 0.3, beta: P.beta || 0.2, gamma: P.gamma || 0.3, L: P.L || 4};
    if ((k === 'hwa' || k === 'hwm') && n < 2 * PP.L + 1) return null; if (k === 'hwm' && y.some(v => v <= 0)) return null; if (k === 'holt' && n < 3) return null; return {k, e: fcRun(y, k, PP).err}; } catch (e) { return null; } }).filter(Boolean);
  const best = Math.min(...cmp.map(x => x.e.MSE));
  h += '<details class="adv"><summary>Porównanie metod (te same dane i parametry)</summary><div class="tw"><table><thead><tr><th>Metoda</th><th>MAD</th><th>MSE</th><th>MAPE</th><th>Sygnał kontrolny</th></tr></thead>' +
    cmp.map(x => `<tr${x.k === method ? ' class="sel"' : ''}><th>${FC_METHODS[x.k]}</th><td>${f(x.e.MAD)}</td><td class="${Math.abs(x.e.MSE - best) < 1e-9 ? 'best' : ''}">${f(x.e.MSE)}</td><td>${f(x.e.MAPE)}%</td><td>${f(x.e.TS)}</td></tr>`).join('') + '</table></div><p class="hint">Metody liczą błędy z różnej liczby okresów (inny okres startowy), a regresja – w próbie; porównanie jest orientacyjne.</p></details>';
  return h;
}
registerModule({id: 'fc', title: 'Prognozowanie', init: fcInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l5-5 4 3 4-6"/><path d="M16 9l5-3" stroke-dasharray="2 2"/><path d="M3 21h18"/></svg>',
  html: '<div class="card"><div id="fc-top"></div><div><button id="btn-fc" type="button">Prognozuj</button></div><div id="out-fc"></div></div>'});
