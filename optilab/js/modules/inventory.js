/* ===== OptiLab – moduł Zapasy =====
   Interfejs i raport dydaktyczny. Obliczenia: js/inv/inventory-solver.js. Wykresy: js/viz.js. */
const IVP = 'inv-';
const IV_MODELS = {eoq: 'EOQ – ekonomiczna wielkość zamówienia', epq: 'EPQ – produkcja ze skończoną wydajnością', back: 'EOQ z planowanymi brakami', disc: 'Rabaty ilościowe', rop: 'Punkt zamawiania i zapas bezpieczeństwa', news: 'Model gazeciarza (jeden okres)'};
const IV_F = {
  D: {key: 'D', label: 'Popyt w okresie D', unit: 'szt. / okres'}, S: {key: 'S', label: 'Koszt jednego zamówienia S', unit: 'zł'}, H: {key: 'H', label: 'Koszt utrzymania jednostki H', unit: 'zł / szt. / okres'},
  c: {key: 'c', label: 'Cena jednostki (opcjonalnie)', unit: 'zł', blank: true}, L: {key: 'L', label: 'Czas dostawy (opcjonalnie)', unit: 'dni', blank: true}, days: {key: 'days', label: 'Dni roboczych w okresie (gdy podano czas dostawy)', unit: 'dni', blank: true, ph: '365'},
  p: {key: 'p', label: 'Wydajność produkcji p', unit: 'szt. / okres'}, b: {key: 'b', label: 'Koszt braku jednostki b', unit: 'zł / szt. / okres'},
  i: {key: 'i', label: 'Koszt utrzymania jako ułamek ceny i', unit: 'np. 0,2 = 20%'},
  mu: {key: 'mu', label: 'Średni popyt dzienny', unit: 'szt. / dzień'}, sd: {key: 'sd', label: 'Odchylenie standardowe popytu dziennego', unit: 'szt.'}, Ld: {key: 'Ld', label: 'Czas dostawy L', unit: 'dni'},
  sdL: {key: 'sdL', label: 'Odchylenie czasu dostawy (opcjonalnie)', unit: 'dni', blank: true}, alpha: {key: 'alpha', label: 'Poziom obsługi α', unit: 'np. 0,95'}, Q: {key: 'Q', label: 'Wielkość zamówienia Q (opcjonalnie – poziom wypełnienia)', unit: 'szt.', blank: true},
  pr: {key: 'pr', label: 'Cena sprzedaży', unit: 'zł / szt.'}, cost: {key: 'cost', label: 'Koszt zakupu', unit: 'zł / szt.'}, v: {key: 'v', label: 'Wartość odzysku niesprzedanej sztuki', unit: 'zł / szt.', blank: true, ph: '0'},
  g: {key: 'g', label: 'Koszt utraconej sprzedaży (opcjonalnie)', unit: 'zł / szt.', blank: true, ph: '0'}, nmu: {key: 'nmu', label: 'Średni popyt w okresie μ', unit: 'szt.'}, nsd: {key: 'nsd', label: 'Odchylenie standardowe popytu σ', unit: 'szt.'}};
const ivFields = I => ({eoq: ['D', 'S', 'H', 'c', 'L', 'days'], epq: ['D', 'S', 'H', 'p', 'c'], back: ['D', 'S', 'H', 'b', 'c'], disc: ['D', 'S', I.hMode === 'rate' ? 'i' : 'H'], rop: ['mu', 'sd', 'Ld', 'sdL', 'alpha', 'Q'],
  news: ['pr', 'cost', 'v', 'g', ...(I.dist === 'normal' ? ['nmu', 'nsd'] : [])]})[I.model].map(k => IV_F[k]);
const IV_TIER = [{key: 'from', label: 'Od ilości', type: 'num'}, {key: 'price', label: 'Cena jednostki', type: 'num'}], IV_DISC = [{key: 'd', label: 'Popyt', type: 'num'}, {key: 'p', label: 'Prawdopodobieństwo', type: 'num'}];
const ivEx = (name, d) => ({name, data: {hMode: 'const', type: 'all', dist: 'normal', tiers: [{from: '0', price: '5'}], table: [{d: '10', p: '0.5'}, {d: '20', p: '0.5'}], ...d}});
const IV_EXAMPLES = [
  ivEx('EOQ – hurtownia (D = 1000, S = 10, H = 0,5)', {model: 'eoq', D: '1000', S: '10', H: '0.5', c: '4', L: '5', days: '250'}),
  ivEx('EOQ – Hillier i Lieberman (D = 8000, S = 12 000, H = 0,3)', {model: 'eoq', D: '8000', S: '12000', H: '0.3'}),
  ivEx('EPQ – produkcja (D = 200, p = 1000)', {model: 'epq', D: '200', S: '100', H: '5', p: '1000'}),
  ivEx('Planowane braki (b = 1,1)', {model: 'back', D: '8000', S: '12000', H: '0.3', b: '1.1'}),
  ivEx('Rabaty od całej ilości (Heizer i Render)', {model: 'disc', D: '5000', S: '49', i: '0.2', hMode: 'rate', type: 'all', tiers: [{from: '0', price: '5'}, {from: '1000', price: '4.8'}, {from: '2000', price: '4.75'}]}),
  ivEx('Rabaty przyrostowe', {model: 'disc', D: '6000', S: '120', i: '0.25', hMode: 'rate', type: 'inc', tiers: [{from: '0', price: '10'}, {from: '500', price: '9.5'}, {from: '1500', price: '9'}]}),
  ivEx('Zapas bezpieczeństwa (poziom obsługi 95%)', {model: 'rop', mu: '20', sd: '4', Ld: '9', alpha: '0.95', Q: '200'}),
  ivEx('Gazeciarz – popyt normalny (Gallego)', {model: 'news', pr: '4', cost: '1', nmu: '100', nsd: '30', dist: 'normal'}),
  ivEx('Gazeciarz – popyt dyskretny', {model: 'news', pr: '12', cost: '5', v: '1', dist: 'discrete', table: [{d: '20', p: '0.1'}, {d: '30', p: '0.2'}, {d: '40', p: '0.3'}, {d: '50', p: '0.25'}, {d: '60', p: '0.15'}]}),
];
let IV = ivNormalize(JSON.parse(JSON.stringify(IV_EXAMPLES[0].data)));
function ivNormalize(d) {
  if (!d || !IV_MODELS[d.model]) throw new Error('to nie jest zadanie z modułu Zapasy (nieznany model).');
  const o = {model: d.model, hMode: d.hMode === 'rate' ? 'rate' : 'const', type: d.type === 'inc' ? 'inc' : 'all', dist: d.dist === 'discrete' ? 'discrete' : 'normal'};
  Object.keys(IV_F).forEach(k => { o[k] = String(d[k] ?? ''); });
  o.tiers = (Array.isArray(d.tiers) && d.tiers.length ? d.tiers : [{from: '0', price: ''}]).map(t => ({from: String(t.from ?? ''), price: String(t.price ?? '')}));
  o.table = (Array.isArray(d.table) && d.table.length ? d.table : [{d: '', p: ''}]).map(t => ({d: String(t.d ?? ''), p: String(t.p ?? '')}));
  return o;
}
function ivRender() {
  $('#' + IVP + 'model').value = IV.model; $('#' + IVP + 'hmode').value = IV.hMode; $('#' + IVP + 'type').value = IV.type; $('#' + IVP + 'dist').value = IV.dist;
  $('#' + IVP + 'discbox').hidden = IV.model !== 'disc'; $('#' + IVP + 'distbox').hidden = IV.model !== 'news';
  $('#' + IVP + 'params').innerHTML = paramFormHTML(IVP, ivFields(IV), IV);
  const tb = $('#' + IVP + 'table');
  if (IV.model === 'disc') tb.innerHTML = '<h4>Progi cenowe</h4>' + rowTableHTML(IVP + 't', IV_TIER, IV.tiers, {addLabel: '+ próg', count: n => `${n} progów`});
  else if (IV.model === 'news' && IV.dist === 'discrete') tb.innerHTML = '<h4>Rozkład popytu</h4>' + rowTableHTML(IVP + 't', IV_DISC, IV.table, {addLabel: '+ wartość popytu', count: n => `${n} wartości`});
  else tb.innerHTML = '';
  const add = $('#' + IVP + 'tadd'); if (add) add.onclick = () => { ivSync(); (IV.model === 'disc' ? IV.tiers : IV.table).push(IV.model === 'disc' ? {from: '', price: ''} : {d: '', p: ''}); ivRender(); };
  matrixPolish($('#' + IVP + 'top'));
}
function ivSync() {
  paramSync(IVP, ivFields(IV), IV);
  if (IV.model === 'disc' && $('#' + IVP + 'tfrom0')) IV.tiers = rowTableSync(IVP + 't', IV_TIER, IV.tiers);
  if (IV.model === 'news' && IV.dist === 'discrete' && $('#' + IVP + 'td0')) IV.table = rowTableSync(IVP + 't', IV_DISC, IV.table);
  IV.model = $('#' + IVP + 'model').value; IV.hMode = $('#' + IVP + 'hmode').value; IV.type = $('#' + IVP + 'type').value; IV.dist = $('#' + IVP + 'dist').value;
}
function ivInit() {
  $('#' + IVP + 'top').innerHTML = `<div class="crow"><label for="${IVP}model">Model</label><select id="${IVP}model">${Object.entries(IV_MODELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="crow" id="${IVP}discbox"><label for="${IVP}type">Rodzaj rabatu</label><select id="${IVP}type"><option value="all">od całej ilości</option><option value="inc">przyrostowy (tylko na nadwyżkę)</option></select>
      <label for="${IVP}hmode">Koszt utrzymania</label><select id="${IVP}hmode"><option value="const">stały H</option><option value="rate">procent ceny i</option></select></div>
    <div class="crow" id="${IVP}distbox"><label for="${IVP}dist">Rozkład popytu</label><select id="${IVP}dist"><option value="normal">normalny</option><option value="discrete">dyskretny (tabela)</option></select></div>
    ${netCopyHTML(IVP)}<div id="${IVP}params"></div><div id="${IVP}table"></div><div id="${IVP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(IVP, IV_EXAMPLES)}</details>
    <p class="hint">Wybierz model i wpisz dane. Jednostki czasu muszą być zgodne (np. popyt roczny i koszt utrzymania na rok). Program pokaże wzory z podstawionymi liczbami i wykres kosztów.</p>`;
  ['model', 'hmode', 'type', 'dist'].forEach(k => $('#' + IVP + k).onchange = () => { ivSync(); clearErr(); ivRender(); });
  const top = $('#' + IVP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; ivSync(); const arr = IV.model === 'disc' ? IV.tiers : IV.table; if (arr.length > 1) arr.splice(+k, 1); clearErr(); ivRender(); });
  const keys = ['model', 'typ rabatu', 'rodzaj kosztu utrzymania', 'rozkład', ...Object.keys(IV_F)];
  netToolsWire(IVP, {kind: 'inventory', out: '#out-inv', examples: IV_EXAMPLES, normalize: ivNormalize,
    get: () => { ivSync(); return JSON.parse(JSON.stringify(IV)); }, set: d => { IV = d; ivRender(); },
    toCSV: d => paramsToCSV([['model', d.model], ['typ rabatu', d.type], ['rodzaj kosztu utrzymania', d.hMode], ['rozkład', d.dist], ...ivFields(d).map(f => [f.key, d[f.key]]).filter(([, x]) => x !== '')],
      d.model === 'disc' ? IV_TIER : d.model === 'news' && d.dist === 'discrete' ? IV_DISC : null, d.model === 'disc' ? d.tiers : d.table),
    fromCSV: t => { const r = paramsFromCSV(t, keys, [...IV_TIER, ...IV_DISC]); const m = r.meta;
      return {...m, model: m.model, type: m['typ rabatu'], hMode: m['rodzaj kosztu utrzymania'], dist: m['rozkład'], tiers: r.rows.filter(x => x.from !== undefined), table: r.rows.filter(x => x.d !== undefined)}; }});
  $('#btn-inv').onclick = ivSolveUI;
  ivRender();
}
function ivRead() {
  clearErr(); ivSync();
  const out = '#out-inv', bad = [], F = ivFields(IV), X = {};
  F.forEach(f => { const s = String(IV[f.key]).trim().replace(',', '.'); if (s === '' && f.blank) { X[f.key] = null; return; } const x = Number(s); if (s === '' || !isFinite(x) || x < 0 || x > 1e12) bad.push(f.key); X[f.key] = x; });
  if (bad.length) return netFail(IVP, out, 'wpisz w zaznaczonych polach liczby nieujemne.', bad);
  const pos = k => { if (!(X[k] > 0)) bad.push(k); };
  if (['eoq', 'epq', 'back', 'disc'].includes(IV.model)) { pos('D'); pos('S'); pos(IV.model === 'disc' && IV.hMode === 'rate' ? 'i' : 'H'); }
  if (IV.model === 'back') pos('b'); if (IV.model === 'epq') pos('p');
  if (IV.model === 'rop') { pos('Ld'); if (!(X.alpha > 0 && X.alpha < 1)) bad.push('alpha'); }
  if (IV.model === 'news') { pos('pr'); pos('cost'); if (IV.dist === 'normal') { pos('nmu'); pos('nsd'); } }
  if (bad.length) return netFail(IVP, out, 'zaznaczone wartości muszą być dodatnie (poziom obsługi – między 0 a 1, np. 0,95).', bad);
  if (IV.model === 'eoq' && X.L !== null && !(X.days > 0)) return netFail(IVP, out, 'gdy podajesz czas dostawy, podaj też liczbę dni roboczych w okresie (np. 250 albo 365).', ['days']);
  if (IV.model === 'epq' && !(X.p > X.D)) return netFail(IVP, out, `wydajność produkcji (${fmt(X.p)}) musi być większa od popytu (${fmt(X.D)}) – inaczej zapas nigdy nie powstaje.`, ['p', 'D']);
  if (IV.model === 'news') { if (!(X.pr > X.cost)) return netFail(IVP, out, 'cena sprzedaży musi być wyższa od kosztu zakupu – inaczej nie opłaca się niczego zamawiać.', ['pr', 'cost']);
    if ((X.v ?? 0) >= X.cost) return netFail(IVP, out, 'wartość odzysku musi być mniejsza od kosztu zakupu.', ['v']); }
  if (IV.model === 'disc') {
    const T = IV.tiers.map((t, k) => ({from: Number(String(t.from).replace(',', '.')), price: Number(String(t.price).replace(',', '.')), k}));
    const e = T.filter(t => !(isFinite(t.from) && t.from >= 0 && String(IV.tiers[t.k].from).trim() !== '')).map(t => 'tfrom' + t.k).concat(T.filter(t => !(t.price > 0)).map(t => 'tprice' + t.k));
    if (e.length) return netFail(IVP, out, 'progi: „od ilości" – liczby nieujemne, ceny – dodatnie.', e);
    const s = T.slice().sort((a, b) => a.from - b.from);
    if (s.some((t, k) => k && t.from === s[k - 1].from)) return netFail(IVP, out, 'dwa progi mają tę samą ilość „od".', T.map(t => 'tfrom' + t.k));
    if (s[0].from > 1) return netFail(IVP, out, 'pierwszy próg musi zaczynać się od 0 (albo 1) – inaczej nie wiadomo, ile kosztują mniejsze zamówienia.', ['tfrom' + s[0].k]);
    X.tiers = s.map(t => ({from: t.from, price: t.price}));
  }
  if (IV.model === 'news' && IV.dist === 'discrete') {
    const T = IV.table.map((t, k) => ({d: Number(String(t.d).replace(',', '.')), p: Number(String(t.p).replace(',', '.')), k}));
    const e = T.filter(t => !(isFinite(t.d) && t.d >= 0 && String(IV.table[t.k].d).trim() !== '')).map(t => 'td' + t.k).concat(T.filter(t => !(t.p >= 0 && t.p <= 1 && String(IV.table[t.k].p).trim() !== '')).map(t => 'tp' + t.k));
    if (e.length) return netFail(IVP, out, 'rozkład: popyt – liczby nieujemne, prawdopodobieństwa – od 0 do 1.', e);
    const sum = T.reduce((s, t) => s + t.p, 0); if (Math.abs(sum - 1) > 1e-6) return netFail(IVP, out, `prawdopodobieństwa muszą sumować się do 1 (teraz ${fmt(Math.round(sum * 1e6) / 1e6)}).`, T.map(t => 'tp' + t.k));
    if (new Set(T.map(t => t.d)).size < T.length) return netFail(IVP, out, 'wartości popytu w tabeli powtarzają się – połącz je w jeden wiersz.', T.map(t => 'td' + t.k));
    X.table = T.map(t => ({d: t.d, p: t.p}));
  }
  return X;
}
function ivSolveUI() { const X = ivRead(); if (!X) return; const h = ivReportHTML(IV.model, X, IV); $('#out-inv').innerHTML = h; last.inv = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function ivReportHTML(model, X, opt = {}) {
  const f = v => fmt(Math.round(v * 100) / 100), f4 = v => fmt(Math.round(v * 10000) / 10000), pc = v => fmt(Math.round(v * 1000) / 10) + '%';
  const curve = (tc, Q, parts, title) => { const pts = [], ord = [], hold = []; for (let k = 1; k <= 60; k++) { const q = Q * (0.15 + 2.85 * k / 60); pts.push([q, tc(q)]); if (parts) { ord.push([q, parts[0](q)]); hold.push([q, parts[1](q)]); } }
    return VZ.line([{name: 'koszt całkowity', pts}, ...(parts ? [{name: 'koszt zamawiania', pts: ord, cls: 'b'}, {name: 'koszt utrzymania', pts: hold, cls: 'c'}] : [])], {title, xLabel: 'wielkość zamówienia Q', yLabel: 'koszt w okresie', marks: [{x: Q, y: tc(Q), label: 'Q* = ' + f(Q)}]}); };
  const flat = (tc, Q) => `<p class="hint">Krzywa kosztu jest płaska wokół optimum: zamówienie o 20% większe podnosi koszt tylko o ${pc(tc(1.2 * Q) / tc(Q) - 1)}, a o 20% mniejsze – o ${pc(tc(0.8 * Q) / tc(Q) - 1)}. Dlatego zaokrąglenie Q* (np. do pełnych opakowań) prawie nic nie kosztuje.</p>`;
  let h = `<h3>${IV_MODELS[model]}</h3>`;
  if (model === 'eoq') {
    const R = invEOQ({D: X.D, S: X.S, H: X.H, c: X.c ?? 0, L: X.L, days: X.days});
    h += `<p class="hint">Zamawiamy stałą ilość Q, gdy zapas spada do zera (lub do punktu zamawiania). Koszt zamawiania D·S/Q maleje, a koszt utrzymania H·Q/2 rośnie z Q – optimum jest tam, gdzie oba są równe.</p>` +
      `<div class="formula">Q* = √(2·D·S / H) = √(2 · ${f(X.D)} · ${f(X.S)} / ${f(X.H)}) = <b>${f(R.Q)}</b></div>` +
      `<div class="tw"><table><tbody><tr><th>Liczba zamówień w okresie D / Q*</th><td>${f(R.N)}</td></tr><tr><th>Czas cyklu Q* / D</th><td>${f4(R.T)} okresu${X.days ? ` (≈ ${f(R.T * X.days)} dni)` : ''}</td></tr><tr><th>Zapas maksymalny / średni</th><td>${f(R.Imax)} / ${f(R.Iavg)}</td></tr>` +
      `<tr><th>Koszt zamawiania D·S/Q*</th><td>${f(R.order)}</td></tr><tr><th>Koszt utrzymania H·Q*/2</th><td>${f(R.hold)}</td></tr><tr><th>Koszt zamawiania i utrzymania</th><td><b>${f(R.TCv)}</b></td></tr>` +
      (X.c ? `<tr><th>Z kosztem zakupu D·c</th><td>${f(R.TC)}</td></tr>` : '') + (R.rop !== null ? `<tr><th>Punkt ponownego zamawiania d·L = ${f(X.D)} / ${f(X.days)} · ${f(X.L)}</th><td><b>${f(R.rop)}</b> szt.</td></tr>` : '') + '</tbody></table></div>' +
      `<div class="sum"><b>Wynik:</b> zamawiaj po <b>${f(R.Q)}</b> szt., ${f(R.N)} razy w okresie${R.rop !== null ? `, gdy zapas spadnie do ${f(R.rop)} szt.` : ''}; koszt zamawiania i utrzymania ${f(R.TCv)}.</div>` +
      curve(q => R.tc(q) - X.D * (X.c ?? 0), R.Q, [q => X.D * X.S / q, q => X.H * q / 2], 'Koszty zamawiania i utrzymania w zależności od Q') + flat(q => R.tc(q) - X.D * (X.c ?? 0), R.Q);
  } else if (model === 'epq') {
    const R = invEPQ({D: X.D, S: X.S, H: X.H, p: X.p, c: X.c ?? 0});
    h += `<p class="hint">Partia jest produkowana stopniowo z wydajnością p, a jednocześnie zużywana z prędkością D, więc zapas rośnie tylko w tempie p − D i nigdy nie osiąga Q.</p>` +
      `<div class="formula">Q* = √(2·D·S / (H·(1 − D/p))) = √(2 · ${f(X.D)} · ${f(X.S)} / (${f(X.H)} · (1 − ${f(X.D)}/${f(X.p)}))) = <b>${f(R.Q)}</b></div>` +
      `<div class="tw"><table><tbody><tr><th>Zapas maksymalny Q*(1 − D/p)</th><td>${f(R.Imax)}</td></tr><tr><th>Czas produkcji partii Q*/p</th><td>${f4(R.tp)} okresu</td></tr><tr><th>Czas cyklu Q*/D</th><td>${f4(R.T)} okresu</td></tr>` +
      `<tr><th>Liczba uruchomień w okresie</th><td>${f(R.N)}</td></tr><tr><th>Koszt uruchomień</th><td>${f(R.order)}</td></tr><tr><th>Koszt utrzymania H·Imax/2</th><td>${f(R.hold)}</td></tr><tr><th>Koszt łączny</th><td><b>${f(R.TCv)}</b></td></tr></tbody></table></div>` +
      `<div class="sum"><b>Wynik:</b> partia produkcyjna <b>${f(R.Q)}</b> szt., zapas maksymalny ${f(R.Imax)}, koszt ${f(R.TCv)}.</div>` + curve(q => R.tc(q) - X.D * (X.c ?? 0), R.Q, [q => X.D * X.S / q, q => X.H * q * (1 - X.D / X.p) / 2], 'Koszty uruchomień i utrzymania w zależności od wielkości partii') + flat(q => R.tc(q) - X.D * (X.c ?? 0), R.Q);
  } else if (model === 'back') {
    const R = invBack({D: X.D, S: X.S, H: X.H, b: X.b, c: X.c ?? 0});
    h += `<p class="hint">Dopuszczamy zaległości: część popytu czeka na dostawę (koszt b za jednostkę i okres). Opłaca się, gdy utrzymanie zapasu jest drogie w porównaniu z kosztem braku.</p>` +
      `<div class="formula">Q* = √(2·D·S/H · (H + b)/b) = <b>${f(R.Q)}</b>;&nbsp; maksymalny brak S* = Q*·H/(H + b) = <b>${f(R.Smax)}</b></div>` +
      `<div class="tw"><table><tbody><tr><th>Zapas maksymalny Q* − S*</th><td>${f(R.Imax)}</td></tr><tr><th>Część cyklu z brakiem S*/Q*</th><td>${pc(R.frac)}</td></tr><tr><th>Czas cyklu</th><td>${f4(R.T)} okresu</td></tr>` +
      `<tr><th>Koszt zamawiania</th><td>${f(R.order)}</td></tr><tr><th>Koszt utrzymania</th><td>${f(R.hold)}</td></tr><tr><th>Koszt braków</th><td>${f(R.short)}</td></tr><tr><th>Koszt łączny</th><td><b>${f(R.TCv)}</b></td></tr></tbody></table></div>` +
      `<div class="sum"><b>Wynik:</b> zamawiaj po <b>${f(R.Q)}</b> szt., dopuszczając zaległości do <b>${f(R.Smax)}</b> szt.; koszt ${f(R.TCv)} (bez braków: ${f(invEOQ({D: X.D, S: X.S, H: X.H}).TCv)}).</div>` + curve(q => R.tc(q) - X.D * (X.c ?? 0), R.Q, null, 'Koszt zamawiania, utrzymania i braków (przy optymalnym braku dla każdego Q)');
  } else if (model === 'disc') {
    const R = invDisc({D: X.D, S: X.S, H: X.H ?? 0, i: X.i ?? 0, tiers: X.tiers, type: opt.type, hMode: opt.hMode});
    h += `<p class="hint">${opt.type === 'all' ? 'Rabat od całej ilości: niższa cena obowiązuje dla wszystkich sztuk w zamówieniu.' : 'Rabat przyrostowy: niższa cena dotyczy tylko sztuk powyżej progu, więc część zamówienia nadal kosztuje więcej.'} ` +
      `Dla każdego progu liczymy EOQ (${opt.hMode === 'rate' ? 'z kosztem utrzymania H = i·cena' : 'ze stałym H'}${opt.type === 'inc' ? ' i stałą R<sub>k</sub> – nadwyżką ceny za sztuki z niższych progów' : ''}); gdy wypada poza zakres progu, bierzemy najbliższą dopuszczalną ilość. Wybieramy najtańszy wariant łącznie z kosztem zakupu.</p>`;
    h += `<div class="tw"><table><thead><tr><th>Próg</th><th>Zakres ilości</th><th>Cena</th>${opt.type === 'inc' ? '<th>R<sub>k</sub></th>' : ''}<th>EOQ progu</th><th>W zakresie?</th><th>Ilość do oceny</th><th>Koszt całkowity</th></tr></thead>` +
      R.rows.map(r => `<tr${r === R.best ? ' class="sel"' : ''}><td>${r.k + 1}</td><td>${f(r.from)} – ${r.to === Infinity ? '∞' : f(r.to - (opt.type === 'all' ? 1 : 0))}</td><td>${f4(r.price)}</td>${opt.type === 'inc' ? `<td>${f(r.R)}</td>` : ''}<td>${f(r.Qeoq)}</td><td>${r.inRange ? 'tak' : 'nie'}</td><td>${f(r.Qadj)}</td><td>${f(r.TC)}</td></tr>`).join('') + '</table></div>';
    h += `<div class="sum"><b>Wynik:</b> zamawiaj po <b>${f(R.best.Qadj)}</b> szt. (próg ${R.best.k + 1}, cena ${f4(R.best.price)}); koszt całkowity z zakupem <b>${f(R.best.TC)}</b> w okresie.</div>`;
    const qmax = Math.max(R.best.Qadj * 2.2, ...X.tiers.map(t => t.from * 1.3)), pts = []; for (let k = 1; k <= 160; k++) { const q = qmax * k / 160; pts.push([q, R.tc(q)]); }
    h += VZ.line([{name: 'koszt całkowity', pts}], {title: 'Koszt całkowity z rabatami', xLabel: 'wielkość zamówienia Q', yLabel: 'koszt w okresie', marks: [{x: R.best.Qadj, y: R.best.TC, label: 'optimum'}]}) +
      '<p class="hint">Przy rabacie od całej ilości krzywa ma skoki w progach – optimum często leży dokładnie na progu.</p>';
  } else if (model === 'rop') {
    const R = invROP({mu: X.mu, sd: X.sd, L: X.Ld, sdL: X.sdL ?? 0, alpha: X.alpha, Q: X.Q});
    h += `<p class="hint">Popyt w czasie dostawy jest losowy. Zapas bezpieczeństwa chroni przed brakiem: przy poziomie obsługi α brak w cyklu zdarza się z prawdopodobieństwem 1 − α.</p>` +
      `<div class="formula">σ<sub>LT</sub> = √(L·σ<sub>d</sub>² + μ<sub>d</sub>²·σ<sub>L</sub>²) = √(${f(X.Ld)}·${f(X.sd)}² + ${f(X.mu)}²·${f(X.sdL ?? 0)}²) = ${f4(R.sLT)}</div>` +
      `<div class="formula">z = Φ<sup>−1</sup>(${f4(X.alpha)}) = ${f4(R.z)};&nbsp; zapas bezpieczeństwa SS = z·σ<sub>LT</sub> = <b>${f(R.SS)}</b>;&nbsp; punkt zamawiania ROP = μ<sub>d</sub>·L + SS = ${f(R.dLT)} + ${f(R.SS)} = <b>${f(R.ROP)}</b></div>` +
      `<div class="tw"><table><tbody><tr><th>Średni popyt w czasie dostawy</th><td>${f(R.dLT)}</td></tr><tr><th>Oczekiwany brak w cyklu σ<sub>LT</sub>·L(z)</th><td>${f4(R.ES)} szt.</td></tr>` +
      (R.fill !== null ? `<tr><th>Poziom wypełnienia popytu 1 − brak/Q</th><td>${pc(R.fill)}</td></tr>` : '') + '</tbody></table></div>' +
      `<div class="sum"><b>Wynik:</b> zamawiaj, gdy zapas spadnie do <b>${f(R.ROP)}</b> szt. (w tym zapas bezpieczeństwa ${f(R.SS)}). Prawdopodobieństwo braku w cyklu: ${pc(1 - X.alpha)}.</div>`;
    const pts = []; for (let k = 0; k <= 80; k++) { const x = R.dLT - 4 * R.sLT + 8 * R.sLT * k / 80; pts.push([x, ST.normPdf(x, R.dLT, R.sLT)]); }
    if (R.sLT > 0) h += VZ.line([{name: 'popyt w czasie dostawy', pts}], {title: 'Rozkład popytu w czasie dostawy', xLabel: 'popyt w czasie dostawy', marks: [{x: R.ROP, y: ST.normPdf(R.ROP, R.dLT, R.sLT), label: 'ROP'}]}) + '<p class="hint">Pole pod krzywą na prawo od ROP to prawdopodobieństwo braku (1 − α).</p>';
  } else {
    const R = invNews({p: X.pr, c: X.cost, v: X.v ?? 0, g: X.g ?? 0, ...(opt.dist === 'discrete' ? {discrete: X.table} : {normal: {mu: X.nmu, sd: X.nsd}})});
    h += `<p class="hint">Zamawiamy raz na okres (gazety, pieczywo, towar sezonowy). Za mało – tracimy marżę C<sub>u</sub>, za dużo – tracimy C<sub>o</sub> na każdej niesprzedanej sztuce. Optimum: P(popyt ≤ Q) = C<sub>u</sub> / (C<sub>u</sub> + C<sub>o</sub>).</p>` +
      `<div class="formula">C<sub>u</sub> = cena − koszt + koszt utraconej sprzedaży = ${f(R.Cu)};&nbsp; C<sub>o</sub> = koszt − odzysk = ${f(R.Co)};&nbsp; wskaźnik krytyczny = ${f(R.Cu)} / (${f(R.Cu)} + ${f(R.Co)}) = <b>${f4(R.CR)}</b></div>`;
    if (opt.dist === 'discrete') {
      h += '<div class="tw"><table><thead><tr><th>Ilość Q</th><th>P(popyt = Q)</th><th>P(popyt ≤ Q)</th><th>Oczekiwana sprzedaż</th><th>Oczekiwana nadwyżka</th><th>Oczekiwany zysk</th></tr></thead>' +
        R.table.map(r => `<tr${r.q === R.Q ? ' class="sel"' : ''}><td>${f(r.q)}</td><td>${f4(r.f)}</td><td class="${r.F >= R.CR - 1e-12 && r.q === R.Q ? 'best' : ''}">${f4(r.F)}</td><td>${f(r.sales)}</td><td>${f(r.left)}</td><td>${f(r.profit)}</td></tr>`).join('') + '</table></div>' +
        `<div class="sum"><b>Wynik:</b> zamów <b>${f(R.Q)}</b> szt. – najmniejsza ilość, dla której P(popyt ≤ Q) ≥ ${f4(R.CR)}; oczekiwany zysk <b>${f(R.pick.profit)}</b> (najwyższy w tabeli).</div>` +
        VZ.line([{name: 'oczekiwany zysk', pts: R.table.map(r => [r.q, r.profit]), dots: true}], {title: 'Oczekiwany zysk dla możliwych zamówień', xLabel: 'zamówienie Q', marks: [{x: R.Q, y: R.pick.profit, label: 'Q*'}]});
    } else {
      h += `<div class="formula">z = Φ<sup>−1</sup>(${f4(R.CR)}) = ${f4(R.z)};&nbsp; Q* = μ + z·σ = ${f(X.nmu)} + ${f4(R.z)}·${f(X.nsd)} = <b>${f(R.Q)}</b></div>` +
        `<div class="tw"><table><tbody><tr><th>Oczekiwana sprzedaż</th><td>${f(R.sales)}</td></tr><tr><th>Oczekiwana nadwyżka</th><td>${f(R.left)}</td></tr><tr><th>Oczekiwany niedobór σ·L(z)</th><td>${f(R.short)}</td></tr>` +
        `<tr><th>Poziom wypełnienia popytu</th><td>${pc(R.fill)}</td></tr><tr><th>Oczekiwany koszt niedopasowania</th><td>${f(R.mismatch)}</td></tr></tbody></table></div>` +
        `<div class="sum"><b>Wynik:</b> zamów <b>${f(R.Q)}</b> szt.; oczekiwany zysk <b>${f(R.profit)}</b>.</div>`;
      const pts = []; for (let k = 0; k <= 60; k++) { const q = Math.max(0, X.nmu - 3 * X.nsd) + 6 * X.nsd * k / 60; const z = (q - X.nmu) / X.nsd, sh = X.nsd * invLoss(z), sales = X.nmu - sh; pts.push([q, X.pr * sales + (X.v ?? 0) * (q - sales) - X.cost * q - (X.g ?? 0) * sh]); }
      h += VZ.line([{name: 'oczekiwany zysk', pts}], {title: 'Oczekiwany zysk w zależności od zamówienia', xLabel: 'zamówienie Q', marks: [{x: R.Q, y: R.profit, label: 'Q*'}]});
    }
  }
  return h;
}
registerModule({id: 'inv', title: 'Zapasy', init: ivInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18M5 20V9l7-4 7 4v11"/><rect x="9" y="13" width="6" height="7"/></svg>',
  html: '<div class="card"><div id="inv-top"></div><div><button id="btn-inv" type="button">Oblicz</button></div><div id="out-inv"></div></div>'});
