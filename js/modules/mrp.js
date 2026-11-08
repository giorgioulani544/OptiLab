/* ===== OptiLab – moduł MRP (planowanie potrzeb materiałowych) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/mrp/mrp-solver.js i js/inv/lotsize.js. */
const MRP = 'mrp-', MR_MAXI = 25, MR_MAXT = 26;
const MR_PARAM = {L4L: ['', ''], FOQ: ['Q (wielkość partii)', ''], EOQ: ['S (koszt zamówienia)', 'H (koszt utrzymania)'], POQ: ['P (liczba okresów)', ''], MINMAX: ['min', 'max'],
  SM: ['S (koszt zamówienia)', 'H (koszt utrzymania)'], LUC: ['S (koszt zamówienia)', 'H (koszt utrzymania)'], PPB: ['S (koszt zamówienia)', 'H (koszt utrzymania)'], WW: ['S (koszt zamówienia)', 'H (koszt utrzymania)']};
const mrCols = () => [{key: 'code', label: 'Kod pozycji', type: 'name'}, {key: 'lt', label: 'Czas realizacji (okresy)', type: 'num'}, {key: 'onHand', label: 'Zapas początkowy', type: 'num'},
  {key: 'rule', label: 'Reguła partii', type: 'sel', opts: Object.entries(LOT_RULES)}, {key: 'p1', label: 'Parametr 1', type: 'num', blank: true}, {key: 'p2', label: 'Parametr 2', type: 'num', blank: true},
  ...(MR.adv ? [{key: 'ss', label: 'Zapas bezpieczeństwa', type: 'num', blank: true}, {key: 'scrap', label: 'Odpad %', type: 'num', blank: true}] : [])];
const MR_BOM = [{key: 'parent', label: 'Pozycja nadrzędna', type: 'text'}, {key: 'child', label: 'Składnik', type: 'text'}, {key: 'qty', label: 'Ilość na sztukę', type: 'num'}];
const mrItem = (code, lt, onHand, rule = 'L4L', p1 = '', p2 = '', ss = '', scrap = '') => ({code, lt: String(lt), onHand: String(onHand), rule, p1: String(p1), p2: String(p2), ss: String(ss), scrap: String(scrap)});
const mrMat = (codes, T, rows = {}) => ({rn: codes.slice(), cn: Array.from({length: T}, (_, k) => String(k + 1)), cells: codes.map(c => Array.from({length: T}, (_, k) => String(rows[c]?.[k] ?? 0)))});
const mrEx = (name, T, items, bom, indep, sr = {}, adv = false) => ({name, data: {T, adv, items, bom: bom.map(([parent, child, qty]) => ({parent, child, qty: String(qty)})), indep: mrMat(items.map(i => i.code), T, indep), sr: mrMat(items.map(i => i.code), T, sr)}});
const MR_EXAMPLES = [
  mrEx('Stół: blat, nogi, wkręty (wspólny składnik)', 8, [mrItem('Stół', 1, 10), mrItem('Blat', 2, 5), mrItem('Noga', 1, 20, 'FOQ', 100), mrItem('Wkręt', 1, 200, 'POQ', 2)],
    [['Stół', 'Blat', 1], ['Stół', 'Noga', 4], ['Stół', 'Wkręt', 8], ['Blat', 'Wkręt', 4]], {'Stół': [0, 0, 20, 0, 30, 0, 25, 0]}, {'Blat': [0, 10, 0, 0, 0, 0, 0, 0]}),
  mrEx('Rower: trzy poziomy, reguły kosztowe', 10, [mrItem('Rower', 1, 0), mrItem('Rama', 2, 5, 'WW', 200, 2), mrItem('Koło', 1, 10, 'SM', 150, 1), mrItem('Obręcz', 2, 30, 'LUC', 120, 0.5), mrItem('Szprycha', 1, 500, 'EOQ', 80, 0.02)],
    [['Rower', 'Rama', 1], ['Rower', 'Koło', 2], ['Koło', 'Obręcz', 1], ['Koło', 'Szprycha', 32]], {'Rower': [0, 10, 15, 0, 20, 10, 0, 25, 15, 10], 'Koło': [0, 0, 4, 0, 0, 4, 0, 0, 4, 0]}),
  mrEx('Zapas bezpieczeństwa i odpad, komunikaty', 8, [mrItem('Zestaw', 1, 5, 'L4L', '', '', 5), mrItem('Obudowa', 3, 20, 'MINMAX', 20, 80, 10, 5), mrItem('Płytka', 1, 0, 'L4L', '', '', '', 10)],
    [['Zestaw', 'Obudowa', 1], ['Zestaw', 'Płytka', 2]], {'Zestaw': [10, 10, 15, 15, 10, 10, 20, 20]}, {'Obudowa': [0, 30, 0, 0, 0, 0, 40, 0]}, true),
];
let MR = mrNormalize(JSON.parse(JSON.stringify(MR_EXAMPLES[0].data)));
function mrNormalize(d) {
  if (!d || !Array.isArray(d.items) || !d.items.length) throw new Error('to nie jest zadanie MRP (brak listy pozycji).');
  if (d.items.length > MR_MAXI) throw new Error(`za dużo pozycji (${d.items.length}) – maksimum to ${MR_MAXI}.`);
  const T = Math.min(MR_MAXT, Math.max(2, +d.T || 8)), items = d.items.map(i => mrItem(String(i.code ?? ''), i.lt ?? 0, i.onHand ?? 0, LOT_RULES[i.rule] ? i.rule : 'L4L', i.p1 ?? '', i.p2 ?? '', i.ss ?? '', i.scrap ?? ''));
  const mat = m => { const o = mrMat(items.map(i => i.code), T); (m?.cells || []).forEach((r, a) => r.forEach((v, b) => { if (a < items.length && b < T) o.cells[a][b] = String(v); })); return o; };
  return {T, adv: !!d.adv, items, bom: (Array.isArray(d.bom) ? d.bom : []).map(e => ({parent: String(e.parent ?? ''), child: String(e.child ?? ''), qty: String(e.qty ?? '')})), indep: mat(d.indep), sr: mat(d.sr)};
}
function mrFitMats() { const codes = MR.items.map(i => i.code); [MR.indep, MR.sr].forEach(m => { m.rn = codes.slice(); m.cn = Array.from({length: MR.T}, (_, k) => String(k + 1));
  m.cells = codes.map((_, a) => Array.from({length: MR.T}, (_, b) => m.cells[a]?.[b] ?? '0')); }); }
function mrRender() {
  mrFitMats(); $('#' + MRP + 'T').value = MR.T; $('#' + MRP + 'adv').checked = MR.adv;
  $('#' + MRP + 'items').innerHTML = rowTableHTML(MRP + 'i', mrCols(), MR.items, {addLabel: '+ pozycja', count: n => `${n} pozycji`});
  $('#' + MRP + 'bom').innerHTML = rowTableHTML(MRP + 'b', MR_BOM, MR.bom.length ? MR.bom : [], {addLabel: '+ składnik w strukturze', count: n => `${n} powiązań`});
  $('#' + MRP + 'indep').innerHTML = matrixHTML(MRP + 'g', MR.indep, {corner: 'Pozycja \\ okres', staticNames: true, noMsg: true});
  $('#' + MRP + 'sr').innerHTML = matrixHTML(MRP + 's', MR.sr, {corner: 'Pozycja \\ okres', staticNames: true, noMsg: true});
  $('#' + MRP + 'iadd').onclick = () => { mrSync(); if (MR.items.length >= MR_MAXI) return; MR.items.push(mrItem('P' + (MR.items.length + 1), 1, 0)); mrRender(); };
  $('#' + MRP + 'badd').onclick = () => { mrSync(); MR.bom.push({parent: MR.items[0]?.code || '', child: '', qty: '1'}); mrRender(); };
  matrixPolish($('#' + MRP + 'top'));
}
function mrSync() {
  MR.items = rowTableSync(MRP + 'i', mrCols(), MR.items); MR.bom = rowTableSync(MRP + 'b', MR_BOM, MR.bom); matrixSync(MRP + 'g', MR.indep); matrixSync(MRP + 's', MR.sr);
  MR.T = +$('#' + MRP + 'T').value; MR.adv = $('#' + MRP + 'adv').checked;
}
function mrInit() {
  $('#' + MRP + 'top').innerHTML = `<div class="crow"><label for="${MRP}T">Liczba okresów</label><select id="${MRP}T">${Array.from({length: MR_MAXT - 1}, (_, k) => `<option>${k + 2}</option>`).join('')}</select></div>
    ${netCopyHTML(MRP)}<h4>Pozycje (wyroby, podzespoły, materiały)</h4><div id="${MRP}items"></div>
    <p class="hint">Parametry reguł: FOQ – Q; POQ – P (okresy); min-max – min i max; EOQ, Silver-Meal, LUC, PPB, Wagner-Whitin – S (koszt zamówienia) i H (koszt utrzymania jednostki w okresie).</p>
    <h4>Struktura wyrobu (BOM)</h4><div id="${MRP}bom"></div><h4>Zapotrzebowanie niezależne (harmonogram główny)</h4><div id="${MRP}indep"></div><h4>Przyjęcia zaplanowane (zamówienia już w drodze)</h4><div id="${MRP}sr"></div><div id="${MRP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label class="chk"><input type="checkbox" id="${MRP}adv"> zapas bezpieczeństwa i odpad (%) dla pozycji</label></div>${netToolsHTML(MRP, MR_EXAMPLES)}</details>
    <p class="hint">Wpisz pozycje, strukturę wyrobu (ile składnika na sztukę pozycji nadrzędnej) i zapotrzebowanie na wyroby gotowe. Program rozwinie zapotrzebowanie przez wszystkie poziomy i ułoży plan zamówień.</p>`;
  ['T', 'adv'].forEach(k => $('#' + MRP + k).onchange = () => { mrSync(); clearErr(); mrRender(); });
  const top = $('#' + MRP + 'top'); matrixWire(top);
  top.addEventListener('change', e => { if (e.target.id?.startsWith(MRP + 'icode')) { mrSync(); mrRender(); } });
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; mrSync();
    if (e.target.closest('#' + MRP + 'items')) { if (MR.items.length > 1) { MR.items.splice(+k, 1); [MR.indep, MR.sr].forEach(m => m.cells.splice(+k, 1)); } } else MR.bom.splice(+k, 1);
    clearErr(); mrRender(); });
  netToolsWire(MRP, {kind: 'mrp', out: '#out-mrp', examples: MR_EXAMPLES, normalize: mrNormalize, get: () => { mrSync(); return JSON.parse(JSON.stringify(MR)); }, set: d => { MR = d; mrRender(); },
    toCSV: d => { const head = ['Kod pozycji', 'Czas realizacji', 'Zapas początkowy', 'Reguła partii', 'Parametr 1', 'Parametr 2', 'Zapas bezpieczeństwa', 'Odpad %'], q = v => String(v).replace('.', ',');
      return '\uFEFF' + [`okresy;${d.T}`, '', head.join(';'), ...d.items.map(i => [i.code, i.lt, i.onHand, i.rule, i.p1, i.p2, i.ss, i.scrap].map(q).join(';')), '', 'Pozycja nadrzędna;Składnik;Ilość na sztukę', ...d.bom.map(e => [e.parent, e.child, q(e.qty)].join(';')),
        '', 'Zapotrzebowanie niezależne;' + d.indep.cn.join(';'), ...d.indep.rn.map((r, a) => [r, ...d.indep.cells[a].map(q)].join(';')), '', 'Przyjęcia zaplanowane;' + d.sr.cn.join(';'), ...d.sr.rn.map((r, a) => [r, ...d.sr.cells[a].map(q)].join(';'))].join('\r\n') + '\r\n'; },
    fromCSV: t => mrFromCSV(t)});
  $('#btn-mrp').onclick = mrSolveUI;
  mrRender();
}
function mrFromCSV(text) {
  const L = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), d = {T: 8, items: [], bom: [], indep: {cells: []}, sr: {cells: []}}; let sec = null, codes = [];
  const num = (s, ln) => { const x = String(s ?? '').trim().replace(',', '.'); if (x === '') return ''; if (!isFinite(Number(x))) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(Number(x)); };
  L.forEach((raw, k) => { const c = raw.split(';').map(s => s.trim()), ln = k + 1; if (!raw.trim()) return;
    if (/^okresy$/i.test(c[0])) { d.T = +num(c[1], ln); return; }
    if (/^kod pozycji$/i.test(c[0])) { sec = 'items'; return; } if (/^pozycja nadrzędna$/i.test(c[0])) { sec = 'bom'; return; }
    if (/^zapotrzebowanie niezależne$/i.test(c[0])) { sec = 'indep'; return; } if (/^przyjęcia zaplanowane$/i.test(c[0])) { sec = 'sr'; return; }
    if (sec === 'items') { d.items.push({code: c[0], lt: num(c[1], ln), onHand: num(c[2], ln), rule: c[3] || 'L4L', p1: num(c[4], ln), p2: num(c[5], ln), ss: num(c[6], ln), scrap: num(c[7], ln)}); codes.push(c[0]); }
    else if (sec === 'bom') d.bom.push({parent: c[0], child: c[1], qty: num(c[2], ln)});
    else if (sec === 'indep' || sec === 'sr') { const a = codes.indexOf(c[0]); if (a < 0) throw new Error(`wiersz ${ln}: nieznana pozycja „${c[0]}".`); d[sec].cells[a] = c.slice(1).map(v => num(v, ln) || '0'); }
    else throw new Error(`wiersz ${ln}: nie rozpoznano sekcji pliku (oczekiwane: okresy, Kod pozycji, Pozycja nadrzędna, Zapotrzebowanie niezależne, Przyjęcia zaplanowane).`); });
  if (!d.items.length) throw new Error('brak pozycji w pliku.');
  d.indep.cells = codes.map((_, a) => d.indep.cells[a] || []); d.sr.cells = codes.map((_, a) => d.sr.cells[a] || []); return d;
}
function mrRead() {
  clearErr(); mrSync();
  const out = '#out-mrp', I = MR.items, bad = [], num = (s, id, blank, int) => { const t = String(s).trim().replace(',', '.'); if (t === '' && blank) return null; const x = Number(t); if (t === '' || !isFinite(x) || x < 0 || x > 1e12 || (int && !Number.isInteger(x))) { bad.push(id); return NaN; } return x; };
  const ch = mrpCheck(I.map(i => i.code), MR.bom.map(e => ({...e, qty: Number(String(e.qty).replace(',', '.'))})));
  const e1 = ch.errors.find(e => e.where === 'item'); if (e1) return netFail(MRP, out, `pozycja ${e1.i + 1}: ${esc(e1.msg)}`, ch.errors.filter(e => e.where === 'item').map(e => 'icode' + e.i));
  const e2 = ch.errors.find(e => e.where === 'bom'); if (e2) return netFail(MRP, out, `struktura wyrobu, wiersz ${e2.i + 1}: ${esc(e2.msg)}`, [`b${e2.field}${e2.i}`]);
  if (ch.cycle) return netFail(MRP, out, `struktura wyrobu zawiera cykl: ${ch.cycle.map(k => esc(I[k].code)).join(' → ')}.`, []);
  const items = I.map((it, k) => {
    const o = {code: it.code.trim(), lt: num(it.lt, 'ilt' + k, false, true), onHand: num(it.onHand, 'ionHand' + k), rule: it.rule, ss: MR.adv ? num(it.ss, 'iss' + k, true) ?? 0 : 0, scrap: MR.adv ? (num(it.scrap, 'iscrap' + k, true) ?? 0) / 100 : 0};
    const p1 = num(it.p1, 'ip1' + k, true), p2 = num(it.p2, 'ip2' + k, true), need = (v, id, okf) => { if (v === null || !okf(v)) bad.push(id); return v; };
    if (it.rule === 'FOQ') o.Q = need(p1, 'ip1' + k, v => v > 0);
    if (it.rule === 'POQ') o.P = need(p1, 'ip1' + k, v => Number.isInteger(v) && v >= 1);
    if (it.rule === 'MINMAX') { o.min = need(p1, 'ip1' + k, v => v >= 0); o.max = need(p2, 'ip2' + k, v => v > 0 && v >= (p1 ?? 0)); }
    if (['EOQ', 'SM', 'LUC', 'PPB', 'WW'].includes(it.rule)) { o.S = need(p1, 'ip1' + k, v => v >= 0); o.H = need(p2, 'ip2' + k, v => v > 0); }
    if (o.scrap >= 1) bad.push('iscrap' + k);
    return o; });
  if (bad.length) return netFail(MRP, out, 'popraw zaznaczone pola: czas realizacji – liczba całkowita ≥ 0; liczby nieujemne; parametry reguł jak w podpowiedzi (np. FOQ wymaga Q > 0, POQ – całkowitego P ≥ 1, min-max – min ≤ max, reguły kosztowe – H > 0); odpad poniżej 100%.', bad);
  const mat = (m, pre) => m.cells.map((r, a) => r.map((v, b) => { const x = num(v, `${pre}c${a}_${b}`); return x; }));
  const indep = mat(MR.indep, 'g'), sr = mat(MR.sr, 's'); if (bad.length) return netFail(MRP, out, 'w tabelach zapotrzebowania i przyjęć wpisz liczby nieujemne.', bad);
  return {T: MR.T, items, edges: ch.edges, indep, sr};
}
function mrSolveUI() { const P = mrRead(); if (!P) return; const h = mrReportHTML(P, mrpSolve(P)); $('#out-mrp').innerHTML = h; last.mrp = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function mrReportHTML(P, S) {
  const f = v => fmt(Math.round(v * 1000) / 1000), n = P.items.length, T = P.T, code = i => esc(P.items[i].code), per = Array.from({length: T}, (_, k) => k + 1);
  let h = `<h3>MRP – ${n} pozycji, ${T} okresów</h3><p class="hint">Zapotrzebowanie rozwijamy od wyrobów gotowych w dół struktury. Każdą pozycję liczymy dopiero wtedy, gdy znane są planowane zamówienia wszystkich pozycji nadrzędnych – dlatego idziemy według kodów niskiego poziomu (najniższy poziom, na którym pozycja występuje w strukturze). Wspólny składnik liczymy raz, sumując zapotrzebowanie ze wszystkich miejsc.</p>`;
  const maxL = Math.max(...S.llc), per2 = Array.from({length: maxL + 1}, (_, c) => S.llc.map((l, k) => l === c ? k : -1).filter(k => k >= 0)), rows = Math.max(...per2.map(p => p.length));
  const W = Math.max(420, 60 + (maxL + 1) * 150), H = 50 + rows * 80, pos = []; per2.forEach((list, cc) => list.forEach((k, r) => { pos[k] = {x: maxL ? 50 + cc * (W - 100) / maxL : W / 2, y: 30 + (r + .5) * (H - 50) / list.length}; }));
  h += '<h4>Struktura wyrobu</h4>' + layeredSVG(P.items.map(i => i.code), P.edges.map(e => ({a: e.p, b: e.c, label: '×' + f(e.qty), cls: 'other'})), 0, {layout: {pos, W, H}, sub: S.llc.map(l => 'poziom ' + l), title: 'Struktura wyrobu'}) +
    '<p class="hint">Kolumny to kody niskiego poziomu; przy strzałkach – ilość składnika na sztukę pozycji nadrzędnej.</p>';
  S.order.forEach(i => {
    const it = P.items[i], X = S.R[i], parents = P.edges.filter(e => e.c === i), cell = (v, cls = '') => `<td${cls ? ` class="${cls}"` : ''}>${Math.abs(v) < 1e-9 ? '' : f(v)}</td>`;
    h += `<h4>${code(i)} – poziom ${S.llc[i]}, czas realizacji ${it.lt}, zapas początkowy ${f(it.onHand)}${it.ss ? `, zapas bezpieczeństwa ${f(it.ss)}` : ''}${it.scrap ? `, odpad ${f(it.scrap * 100)}% (zamówienie = przyjęcie / ${f(1 - it.scrap)}, w górę do pełnych sztuk)` : ''}; partie: ${LOT_RULES[it.rule]}</h4>`;
    if (parents.length) h += `<p class="hint">Zapotrzebowanie brutto = ${P.indep[i].some(v => v > 0) ? 'niezależne + ' : ''}${parents.map(e => `${f(e.qty)} × planowane zamówienia ${code(e.p)}`).join(' + ')}.</p>`;
    h += `<div class="tw"><table><thead><tr><th>Okres</th><th>pocz.</th>${per.map(k => `<th>${k}</th>`).join('')}</tr></thead>` +
      `<tr><th>Zapotrzebowanie brutto</th><td></td>${X.gross.map(v => cell(v)).join('')}</tr><tr><th>Przyjęcia zaplanowane</th><td></td>${P.sr[i].map(v => cell(v)).join('')}</tr>` +
      `<tr><th>Zapas dysponowany</th><td>${f(it.onHand)}</td>${X.pab.map(v => `<td>${f(v)}</td>`).join('')}</tr><tr><th>Zapotrzebowanie netto</th><td></td>${X.net.map(v => cell(v)).join('')}</tr>` +
      `<tr class="sel"><th>Planowane przyjęcia</th><td></td>${X.rec.map(v => cell(v)).join('')}</tr><tr class="sel"><th>Planowane zamówienia</th><td></td>${X.rel.map((v, t) => cell(v, t === 0 && S.messages.some(m => m.kind === 'late' && m.i === i) ? 'late' : '')).join('')}</tr></table></div>`;
    if (it.S !== undefined) h += `<p class="hint">Koszt partii: ${X.lot.setups} zamówień × ${f(it.S)} + utrzymanie ${f(X.lot.hold)} = <b>${f(X.lot.total)}</b>${X.lot.Q ? ` (EOQ = ${f(X.lot.Q)})` : ''}.</p>`;
  });
  const late = S.messages.filter(m => m.kind === 'late'), dl = S.messages.filter(m => m.kind === 'delay'), cn = S.messages.filter(m => m.kind === 'cancel');
  h += '<h3>Plan zamówień (do uruchomienia)</h3><div class="tw"><table><thead><tr><th>Pozycja</th>' + per.map(k => `<th>${k}</th>`).join('') + '</tr></thead>' +
    S.order.map(i => `<tr><th>${code(i)}</th>${S.R[i].rel.map(v => `<td>${Math.abs(v) < 1e-9 ? '' : '<b>' + f(v) + '</b>'}</td>`).join('')}</tr>`).join('') + '</table></div>';
  const orders = S.order.map(i => ({i, k: S.R[i].rel.filter(v => v > 1e-9).length, t1: S.R[i].rel.findIndex(v => v > 1e-9)})).filter(o => o.k);
  h += `<div class="sum"><b>Wynik:</b> plan obejmuje ${orders.reduce((s2, o) => s2 + o.k, 0)} zamówień dla ${orders.length} z ${n} pozycji (${orders.map(o => `${code(o.i)}: ${o.k}, pierwsze w okresie ${o.t1 + 1}`).join('; ')}).${late.length || dl.length || cn.length ? ` Do wyjaśnienia: ${late.length + dl.length + cn.length} komunikat(y) – zob. niżej.` : ''}</div>`;
  h += late.length || dl.length || cn.length ? '<h4>Komunikaty</h4><ul>' + [...late.map(m => `<li class="msg">Przyspieszyć: ${code(m.i)} – przyjęcie ${f(m.qty)} w okresie ${m.t + 1} wymagało zamówienia w okresie ${m.rt + 1} (przed horyzontem). Zamówienie wpisano do okresu 1 – trzeba skrócić czas realizacji albo przesunąć zapotrzebowanie.</li>`),
    ...dl.map(m => `<li>Opóźnić: ${code(m.i)} – przyjęcie zaplanowane ${f(m.qty)} w okresie ${m.t + 1} jest potrzebne dopiero w okresie ${m.u + 1}.</li>`),
    ...cn.map(m => `<li>Anulować lub przesunąć: ${code(m.i)} – przyjęcie zaplanowane ${f(m.qty)} w okresie ${m.t + 1} nie jest potrzebne w horyzoncie planowania.</li>`)].join('') + '</ul>'
    : '<div class="sum"><b>Plan wykonalny:</b> wszystkie zamówienia mieszczą się w horyzoncie, przyjęcia zaplanowane są potrzebne w swoich terminach.</div>';
  return h;
}
registerModule({id: 'mrp', title: 'MRP', init: mrInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="15" width="6" height="4" rx="1"/><rect x="15" y="15" width="6" height="4" rx="1"/><path d="M12 7v4M6 15v-4h12v4"/></svg>',
  html: '<div class="card"><div id="mrp-top"></div><div><button id="btn-mrp" type="button">Wyznacz plan MRP</button></div><div id="out-mrp"></div></div>'});
