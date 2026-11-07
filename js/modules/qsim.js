/* ===== OptiLab – moduł Symulacja kolejek =====
   Interfejs i raport dydaktyczny. Obliczenia: js/qsim/qsim-solver.js; porównanie z teorią: js/queue/queue-solver.js. */
const QSP = 'qsim-', QS_TAB = [{key: 'v', label: 'Wartość', type: 'num'}, {key: 'p', label: 'Prawdopodobieństwo', type: 'num'}];
const qsDF = pre => ({mean: {key: pre + 'Mean', label: 'Średnia', unit: 'jednostek czasu'}, a: {key: pre + 'A', label: 'Minimum a'}, b: {key: pre + 'B', label: 'Maksimum b'}, sd: {key: pre + 'Sd', label: 'Odchylenie standardowe'},
  k: {key: pre + 'K', label: 'Liczba faz k'}, val: {key: pre + 'Val', label: 'Wartość stała'}});
const qsDistFields = (pre, type) => { const F = qsDF(pre); return ({exp: [F.mean], uni: [F.a, F.b], norm: [F.mean, F.sd], erl: [F.mean, F.k], const: [F.val], emp: []})[type]; };
const QS_GEN = [{key: 's', label: 'Liczba stanowisk s'}, {key: 'K', label: 'Pojemność systemu K', unit: 'puste = bez limitu', blank: true}, {key: 'T', label: 'Czas symulacji (jednego powtórzenia)'},
  {key: 'warm', label: 'Okres rozgrzewki (pomijany w statystykach)'}, {key: 'R', label: 'Liczba powtórzeń'}, {key: 'seed', label: 'Ziarno generatora'}, {key: 'trace', label: 'Ile pierwszych zdarzeń pokazać'}];
const qsEx = (name, d) => ({name, data: {iaType: 'exp', svType: 'exp', iaMean: '1', svMean: '1', iaA: '', iaB: '', svA: '', svB: '', iaSd: '', svSd: '', iaK: '2', svK: '2', iaVal: '', svVal: '', iaTab: [{v: '1', p: '1'}], svTab: [{v: '1', p: '1'}],
  s: '1', K: '', T: '2000', warm: '100', R: '10', seed: '1', trace: '20', cmp: false, s2: '2', ...d}});
const QS_EXAMPLES = [
  qsEx('Okienko w banku – M/M/1 (λ = 0,8, μ = 1)', {iaMean: '1.25', svMean: '1'}),
  qsEx('Myjnia – stały czas obsługi (M/D/1)', {iaMean: '1.5', svType: 'const', svVal: '1'}),
  qsEx('Trzy kasy – obsługa o rozkładzie jednostajnym', {iaMean: '0.5', svType: 'uni', svA: '0.8', svB: '2.2', s: '3'}),
  qsEx('Warsztat – rozkłady empiryczne z obserwacji', {iaType: 'emp', iaTab: [{v: '1', p: '0.2'}, {v: '2', p: '0.3'}, {v: '3', p: '0.35'}, {v: '4', p: '0.15'}], svType: 'emp', svTab: [{v: '1', p: '0.25'}, {v: '2', p: '0.45'}, {v: '3', p: '0.3'}], T: '1000', trace: '25'}),
  qsEx('Centrala bez kolejki (K = s = 3) – odrzucenia', {iaMean: '0.5', svMean: '1', s: '3', K: '3'}),
  qsEx('1 czy 2 stanowiska? (wspólne liczby losowe)', {iaMean: '1.4286', svMean: '1', cmp: true, s2: '2', R: '12'}),
];
let QS = qsNormalize(JSON.parse(JSON.stringify(QS_EXAMPLES[0].data)));
function qsNormalize(d) {
  if (!d || !QS_DISTS[d.iaType] || !QS_DISTS[d.svType]) throw new Error('to nie jest zadanie z modułu Symulacja kolejek (nieznany rozkład).');
  const o = {iaType: d.iaType, svType: d.svType, cmp: !!d.cmp}; ['iaMean', 'svMean', 'iaA', 'iaB', 'svA', 'svB', 'iaSd', 'svSd', 'iaK', 'svK', 'iaVal', 'svVal', 's', 'K', 'T', 'warm', 'R', 'seed', 'trace', 's2'].forEach(k => { o[k] = String(d[k] ?? ''); });
  ['iaTab', 'svTab'].forEach(k => { o[k] = (Array.isArray(d[k]) && d[k].length ? d[k] : [{v: '', p: ''}]).map(r => ({v: String(r.v ?? ''), p: String(r.p ?? '')})); }); return o;
}
function qsRender() {
  ['ia', 'sv'].forEach(pre => { $('#' + QSP + pre + 'Type').value = QS[pre + 'Type']; $('#' + QSP + pre + 'P').innerHTML = paramFormHTML(QSP, qsDistFields(pre, QS[pre + 'Type']), QS) +
    (QS[pre + 'Type'] === 'emp' ? rowTableHTML(QSP + pre + 't', QS_TAB, QS[pre + 'Tab'], {addLabel: '+ wartość', count: n => `${n} wartości`}) : '');
    const add = $('#' + QSP + pre + 'tadd'); if (add) add.onclick = () => { qsSync(); QS[pre + 'Tab'].push({v: '', p: ''}); qsRender(); }; });
  $('#' + QSP + 'gen').innerHTML = paramFormHTML(QSP, QS_GEN, QS); $('#' + QSP + 'cmp').checked = QS.cmp; $('#' + QSP + 's2').value = QS.s2; $('#' + QSP + 's2box').hidden = !QS.cmp;
  matrixPolish($('#' + QSP + 'top'));
}
function qsSync() {
  ['ia', 'sv'].forEach(pre => { paramSync(QSP, qsDistFields(pre, QS[pre + 'Type']), QS); if (QS[pre + 'Type'] === 'emp' && $('#' + QSP + pre + 'tv0')) QS[pre + 'Tab'] = rowTableSync(QSP + pre + 't', QS_TAB, QS[pre + 'Tab']); QS[pre + 'Type'] = $('#' + QSP + pre + 'Type').value; });
  paramSync(QSP, QS_GEN, QS); QS.cmp = $('#' + QSP + 'cmp').checked; QS.s2 = $('#' + QSP + 's2').value;
}
function qsInit() {
  const sel = pre => `<select id="${QSP}${pre}Type">${Object.entries(QS_DISTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>`;
  $('#' + QSP + 'top').innerHTML = `${netCopyHTML(QSP)}<h4>Czas między kolejnymi przyjściami klientów</h4><div class="crow"><label for="${QSP}iaType">Rozkład</label>${sel('ia')}</div><div id="${QSP}iaP"></div>
    <h4>Czas obsługi jednego klienta</h4><div class="crow"><label for="${QSP}svType">Rozkład</label>${sel('sv')}</div><div id="${QSP}svP"></div><h4>System i przebieg symulacji</h4><div id="${QSP}gen"></div><div id="${QSP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label class="chk"><input type="checkbox" id="${QSP}cmp"> porównaj z inną liczbą stanowisk (wspólne liczby losowe)</label></div>
     <div class="crow" id="${QSP}s2box"><label for="${QSP}s2">Liczba stanowisk do porównania</label><input class="num" data-num inputmode="numeric" id="${QSP}s2"></div>${netToolsHTML(QSP, QS_EXAMPLES)}</details>
    <p class="hint">Program losuje kolejne przyjścia i czasy obsługi, odtwarza pracę systemu zdarzenie po zdarzeniu i mierzy kolejkę. Kilka powtórzeń z różnymi ziarnami daje przedziały ufności.</p>`;
  ['iaType', 'svType', 'cmp'].forEach(k => $('#' + QSP + k).onchange = () => { qsSync(); clearErr(); qsRender(); });
  const top = $('#' + QSP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; qsSync(); const pre = e.target.closest('#' + QSP + 'iaP') ? 'ia' : 'sv'; if (QS[pre + 'Tab'].length > 1) QS[pre + 'Tab'].splice(+k, 1); clearErr(); qsRender(); });
  const keys = ['iaType', 'svType', 'iaMean', 'svMean', 'iaA', 'iaB', 'svA', 'svB', 'iaSd', 'svSd', 'iaK', 'svK', 'iaVal', 'svVal', 's', 'K', 'T', 'warm', 'R', 'seed', 'trace', 's2', 'iaTab', 'svTab'];
  netToolsWire(QSP, {kind: 'qsim', out: '#out-qsim', examples: QS_EXAMPLES, normalize: qsNormalize, get: () => { qsSync(); return JSON.parse(JSON.stringify(QS)); }, set: d => { QS = d; qsRender(); },
    toCSV: d => paramsToCSV(keys.map(k => [k, /Tab$/.test(k) ? d[k].map(r => `${r.v}:${r.p}`).join('|') : d[k]]).filter(([, v]) => v !== '')),
    fromCSV: t => { const lines = String(t).replace(/^\uFEFF/, '').split(/\r?\n/), tabs = {}; const rest = lines.filter(l => { const m = l.match(/^(iaTab|svTab);(.*)$/); if (m) { tabs[m[1]] = m[2]; return false; } return true; }).join('\n');
      const r = paramsFromCSV(rest, keys.filter(k => !/Tab$/.test(k))), o = {...r.meta};
      Object.entries(tabs).forEach(([k, v]) => { o[k] = v.split('|').filter(Boolean).map((x, i) => { const [a, b] = x.split(':'); const na = Number(String(a).replace(',', '.')), nb = Number(String(b).replace(',', '.')); if (!isFinite(na) || !isFinite(nb)) throw new Error(`parametr ${k}, pozycja ${i + 1}: „${x}" – oczekiwano „wartość:prawdopodobieństwo".`); return {v: String(na), p: String(nb)}; }); });
      return {...o, cmp: false}; }});
  $('#btn-qsim').onclick = qsSolveUI;
  qsRender();
}
function qsRead() {
  clearErr(); qsSync();
  const out = '#out-qsim', bad = [], num = (k, blank) => { const s = String(QS[k]).trim().replace(',', '.'); if (s === '' && blank) return null; const x = Number(s); if (s === '' || !isFinite(x) || x < 0) { bad.push(k); return NaN; } return x; };
  const dist = pre => { const t = QS[pre + 'Type'], d = {type: t};
    if (t === 'exp') { d.mean = num(pre + 'Mean'); if (!(d.mean > 0)) bad.push(pre + 'Mean'); }
    if (t === 'uni') { d.a = num(pre + 'A'); d.b = num(pre + 'B'); if (!(d.b > d.a)) bad.push(pre + 'B'); }
    if (t === 'norm') { d.mean = num(pre + 'Mean'); d.sd = num(pre + 'Sd'); if (!(d.sd > 0)) bad.push(pre + 'Sd'); if (!(d.mean > 0)) bad.push(pre + 'Mean'); }
    if (t === 'erl') { d.mean = num(pre + 'Mean'); d.k = num(pre + 'K'); if (!(d.mean > 0)) bad.push(pre + 'Mean'); if (!(Number.isInteger(d.k) && d.k >= 1 && d.k <= 50)) bad.push(pre + 'K'); }
    if (t === 'const') { d.value = num(pre + 'Val'); if (!(d.value > 0)) bad.push(pre + 'Val'); }
    if (t === 'emp') { d.table = QS[pre + 'Tab'].map((r, i) => { const v = Number(String(r.v).replace(',', '.')), p = Number(String(r.p).replace(',', '.')); if (String(r.v).trim() === '' || !(v >= 0)) bad.push(`${pre}tv${i}`); if (String(r.p).trim() === '' || !(p >= 0 && p <= 1)) bad.push(`${pre}tp${i}`); return {v, p}; });
      if (!bad.length && Math.abs(d.table.reduce((s, x) => s + x.p, 0) - 1) > 1e-6) bad.push(...d.table.map((_, i) => `${pre}tp${i}`)); if (!bad.length && !(qsMoments(d).m > 0)) bad.push(`${pre}tv0`); }
    return d; };
  const arr = dist('ia'); if (bad.length) return netFail(QSP, out, 'czas między przyjściami: popraw zaznaczone pola (średnia dodatnia, b > a, prawdopodobieństwa w tabeli sumują się do 1).', bad);
  const svc = dist('sv'); if (bad.length) return netFail(QSP, out, 'czas obsługi: popraw zaznaczone pola (średnia dodatnia, b > a, prawdopodobieństwa w tabeli sumują się do 1).', bad);
  const P = {arr, svc, s: num('s'), K: num('K', true), T: num('T'), warm: num('warm'), trace: num('trace')}, R = num('R'), seed = num('seed');
  if (bad.length) return netFail(QSP, out, 'wpisz w zaznaczonych polach liczby nieujemne.', bad);
  if (!(Number.isInteger(P.s) && P.s >= 1 && P.s <= 50)) return netFail(QSP, out, 'liczba stanowisk: liczba całkowita od 1 do 50.', ['s']);
  if (P.K !== null && !(Number.isInteger(P.K) && P.K >= P.s)) return netFail(QSP, out, 'pojemność systemu: liczba całkowita nie mniejsza niż liczba stanowisk (albo puste pole).', ['K']);
  if (!(P.T > 0 && P.warm < P.T)) return netFail(QSP, out, 'czas symulacji musi być dodatni i dłuższy niż okres rozgrzewki.', ['T', 'warm']);
  if (!(Number.isInteger(R) && R >= 2 && R <= 100)) return netFail(QSP, out, 'liczba powtórzeń: od 2 do 100 (co najmniej 2, by policzyć przedział ufności).', ['R']);
  if (!Number.isInteger(seed)) return netFail(QSP, out, 'ziarno: liczba całkowita.', ['seed']); if (!(Number.isInteger(P.trace) && P.trace <= 500)) return netFail(QSP, out, 'liczba pokazywanych zdarzeń: od 0 do 500.', ['trace']);
  const ex = P.T / qsMoments(arr).m * R; if (ex > 3e6) return netFail(QSP, out, `symulacja byłaby zbyt długa (ok. ${Math.round(ex).toLocaleString('pl-PL')} klientów) – skróć czas symulacji lub zmniejsz liczbę powtórzeń.`, ['T', 'R']);
  let s2 = null; if (QS.cmp) { s2 = Number(QS.s2); if (!(Number.isInteger(s2) && s2 >= 1 && s2 <= 50 && s2 !== P.s && (P.K === null || s2 <= P.K))) return netFail(QSP, out, 'liczba stanowisk do porównania: inna niż obecna, od 1 do 50 (i nie większa niż K).', ['s2']); }
  return {P, R, seed, s2};
}
function qsSolveUI() { const X = qsRead(); if (!X) return; const h = qsReportHTML(X); $('#out-qsim').innerHTML = h; last.qsim = h; }
/* teoria dla porównania (gdy istnieje wzór) */
function qsTheory(P) {
  const A = qsMoments(P.arr), S = qsMoments(P.svc), lam = 1 / A.m, mu = 1 / S.m;
  if (P.arr.type !== 'exp') return null;
  if (P.svc.type === 'exp') return quSolve(P.K !== null ? (P.s === 1 ? 'mm1k' : 'mmsk') : (P.s === 1 ? 'mm1' : 'mms'), {lam, mu, s: P.s, K: P.K});
  if (P.s === 1 && P.K === null) return P.svc.type === 'const' ? quSolve('md1', {lam, mu}) : P.svc.type === 'erl' ? quSolve('mek1', {lam, mu, k: P.svc.k}) : quSolve('mg1', {lam, mu, sigma: Math.sqrt(S.v)});
  return null;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function qsReportHTML(X) {
  const {P, R, seed} = X, f = v => !isFinite(v) ? '–' : fmt(Math.round(v * 10000) / 10000), pc = v => !isFinite(v) ? '–' : fmt(Math.round(v * 1000) / 10) + '%', A = qsMoments(P.arr), S = qsMoments(P.svc), rho = S.m / (P.s * A.m);
  const dd = d => `${QS_DISTS[d.type]} (średnia ${f(qsMoments(d).m)}${qsMoments(d).v > 0 ? `, odchylenie ${f(Math.sqrt(qsMoments(d).v))}` : ''})`;
  const Rep = qsReplicate(P, R, seed), first = Rep.runs[0], names = {L: 'Średnia liczba klientów w systemie L', Lq: 'Średnia liczba klientów w kolejce Lq', W: 'Średni czas w systemie W', Wq: 'Średni czas oczekiwania Wq', util: 'Wykorzystanie stanowisk', Pwait: 'Odsetek klientów, którzy czekali', rejFrac: 'Odsetek odrzuconych klientów'};
  let h = `<h3>Symulacja kolejki – ${P.s} ${P.s === 1 ? 'stanowisko' : 'stanowiska'}${P.K !== null ? `, pojemność ${P.K}` : ''}</h3><p>Przyjścia: ${dd(P.arr)}; obsługa: ${dd(P.svc)}. Obciążenie ρ = E[obsługa] / (s·E[odstęp]) = ${f(S.m)} / (${P.s}·${f(A.m)}) = <b>${f(rho)}</b>. ` +
    `${R} powtórzeń po ${f(P.T)} jednostek czasu, statystyki od chwili ${f(P.warm)} (rozgrzewka usuwa wpływ pustego systemu na starcie), ziarna ${seed}…${seed + R - 1}.</p>`;
  if (rho >= 1 && P.K === null) h += '<p class="msg">System jest przeciążony (ρ ≥ 1): kolejka rośnie przez całą symulację, a wyniki zależą od jej długości – nie są to wartości ustalone.</p>';
  if (first.trace.length) h += `<h4>Pierwsze zdarzenia (powtórzenie 1)</h4><div class="tw"><table><thead><tr><th>Czas</th><th>Zdarzenie</th><th>Klient</th><th>W kolejce</th><th>W systemie</th><th>Zajęte stanowiska</th></tr></thead>` +
    first.trace.map(e => `<tr${e.type === 'odrzucenie' ? ' class="late"' : ''}><td>${f(e.t)}</td><td>${e.type}</td><td>${e.c + 1}</td><td>${e.q}</td><td>${e.sys}</td><td>${e.busy}</td></tr>`).join('') + '</table></div>';
  h += '<h4>Wyniki powtórzeń</h4><div class="tw"><table><thead><tr><th>Powtórzenie</th><th>L</th><th>Lq</th><th>W</th><th>Wq</th><th>Wykorzystanie</th><th>Czekało</th>' + (P.K !== null ? '<th>Odrzuceni</th>' : '') + '</tr></thead>' +
    Rep.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${f(r.L)}</td><td>${f(r.Lq)}</td><td>${f(r.W)}</td><td>${f(r.Wq)}</td><td>${pc(r.util)}</td><td>${pc(r.Pwait)}</td>${P.K !== null ? `<td>${pc(r.rejFrac)}</td>` : ''}</tr>`).join('') + '</table></div>';
  const T = qsTheory(P), th = T && T.status === 'ok' ? {L: T.L, Lq: T.Lq, W: T.W, Wq: T.Wq, util: T.util, Pwait: T.Pwait, rejFrac: T.Pblock ?? 0} : null;
  h += `<h4>Średnie z przedziałami ufności 95%</h4><p class="hint">Przedział: średnia ± t<sub>0,975; ${R - 1}</sub>·s/√R, gdzie t = ${f(Rep.tq)}, s – odchylenie standardowe wyników powtórzeń. ${th ? `Model teoretyczny: ${QU_MODELS[T.m]}.` : 'Dla tych rozkładów nie ma prostego wzoru teoretycznego – symulacja jest jedynym narzędziem.'}</p>`;
  h += `<div class="tw"><table><thead><tr><th>Miara</th><th>Symulacja</th><th>Przedział ufności</th>${th ? '<th>Teoria</th><th>Teoria w przedziale?</th>' : ''}</tr></thead>` +
    Object.keys(names).filter(k => k !== 'rejFrac' || P.K !== null).map(k => { const c = Rep.ci[k], isP = ['util', 'Pwait', 'rejFrac'].includes(k), g = isP ? pc : f, inside = th ? Math.abs(th[k] - c.m) <= c.h : null;
      return `<tr><th>${names[k]}</th><td><b>${g(c.m)}</b></td><td>${g(c.m - c.h)} – ${g(c.m + c.h)}</td>${th ? `<td>${g(th[k])}</td><td class="${inside ? 'best' : ''}">${inside ? 'tak' : 'nie'}</td>` : ''}</tr>`; }).join('') + '</table></div>';
  h += `<div class="sum"><b>Wynik:</b> klient czeka średnio <b>${f(Rep.ci.Wq.m)}</b> (95%: ${f(Rep.ci.Wq.m - Rep.ci.Wq.h)} – ${f(Rep.ci.Wq.m + Rep.ci.Wq.h)}), w kolejce stoi średnio ${f(Rep.ci.Lq.m)} osób, stanowiska pracują przez ${pc(Rep.ci.util.m)} czasu.</div>`;
  if (th && Object.keys(names).some(k => (k !== 'rejFrac' || P.K !== null) && Math.abs(th[k] - Rep.ci[k].m) > Rep.ci[k].h)) h += '<p class="hint">Pojedyncze wartości teoretyczne poza przedziałem są normalne (przy 95% ufności średnio co dwudziesty przedział nie obejmuje prawdy); duże i systematyczne różnice oznaczają za krótką symulację lub za krótką rozgrzewkę.</p>';
  const wq = Rep.runs.flatMap(r => r.wq).slice(0, 20000);
  if (wq.length > 5 && Math.max(...wq) > 0) h += VZ.hist(wq, {title: 'Rozkład czasu oczekiwania w kolejce', xLabel: 'czas oczekiwania Wq', marks: [{x: Rep.ci.Wq.m, label: 'średnia'}]});
  h += VZ.line([{name: 'liczba klientów w systemie', pts: first.path, step: true}], {title: 'Przebieg liczby klientów (powtórzenie 1, początek)', xLabel: 'czas'});
  if (P.s > 1) h += VZ.bars(first.utilK.map((_, k) => 'Stanowisko ' + (k + 1)), first.utilK, {title: 'Wykorzystanie stanowisk (powtórzenie 1)', pct: true, valueText: true});
  if (X.s2) { const C = qsCompare(P, X.s2, R, seed);
    h += `<h3>Porównanie: ${P.s} czy ${X.s2} stanowisk (wspólne liczby losowe)</h3><p class="hint">Obie konfiguracje dostają te same ciągi liczb losowych (te same przyjścia i czasy obsługi), więc różnica wyników wynika z konfiguracji, a nie z losowości. Przedział ufności liczymy dla różnic w parach powtórzeń.</p>` +
      `<div class="tw"><table><thead><tr><th>Miara</th><th>s = ${P.s}</th><th>s = ${X.s2}</th></tr></thead><tr><th>Wq</th><td>${f(C.A.ci.Wq.m)}</td><td>${f(C.B.ci.Wq.m)}</td></tr><tr><th>Lq</th><td>${f(C.A.ci.Lq.m)}</td><td>${f(C.B.ci.Lq.m)}</td></tr><tr><th>Wykorzystanie</th><td>${pc(C.A.ci.util.m)}</td><td>${pc(C.B.ci.util.m)}</td></tr></table></div>` +
      `<div class="sum"><b>Różnica Wq (s = ${P.s} minus s = ${X.s2}):</b> ${f(C.d.m)} ± ${f(C.d.h)} → ${C.d.m - C.d.h > 0 ? `konfiguracja z ${X.s2} stanowiskami ma istotnie krótsze oczekiwanie` : C.d.m + C.d.h < 0 ? `konfiguracja z ${P.s} stanowiskami ma istotnie krótsze oczekiwanie` : 'różnica nie jest istotna statystycznie (przedział obejmuje 0)'}.</div>`; }
  return h;
}
registerModule({id: 'qsim', title: 'Symulacja kolejek', init: qsInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="10.5" cy="12" r="2"/><path d="M15 7h6v10h-6z"/><path d="M18 3v2M16.5 4.5l3 0"/></svg>',
  html: '<div class="card"><div id="qsim-top"></div><div><button id="btn-qsim" type="button">Symuluj</button></div><div id="out-qsim"></div></div>'});
