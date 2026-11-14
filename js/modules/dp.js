/* ===== OptiLab – moduł Programowanie dynamiczne =====
   Interfejs i raport dydaktyczny. Obliczenia: js/dp/dp-solver.js. Rysunek sieci etapowej: layeredSVG (netui.js). */
const DPP = 'dp-';
const DP_TYPES = {path: 'najkrótsza (najdłuższa) ścieżka etapowa', alloc: 'rozdział zasobów', knap: 'plecak', prod: 'produkcja i zapasy', repl: 'wymiana sprzętu'};
const DP_ARC = [{key: 'a', label: 'Z węzła', type: 'text'}, {key: 'b', label: 'Do węzła', type: 'text'}, {key: 'c', label: 'Koszt / zysk', type: 'num'}];
const DP_ITEM = () => [{key: 'name', label: 'Przedmiot', type: 'text'}, {key: 'w', label: 'Waga', type: 'num'}, {key: 'v', label: 'Wartość', type: 'num'}, ...(DPS.knap.kind === 'bounded' ? [{key: 'lim', label: 'Liczba sztuk', type: 'num'}] : [])];
const DP_PER = [{key: 'label', label: 'Okres', type: 'text'}, {key: 'D', label: 'Popyt', type: 'num'}, {key: 'cap', label: 'Moc produkcyjna', type: 'num'}, {key: 'K', label: 'Koszt uruchomienia', type: 'num'}, {key: 'c', label: 'Koszt jednostkowy', type: 'num'}, {key: 'h', label: 'Koszt magazynowania jednostki', type: 'num'}];
const DP_AGE = [{key: 'a', label: 'Wiek maszyny', type: 'text'}, {key: 'op', label: 'Koszt eksploatacji w roku', type: 'num', blank: true}, {key: 'sal', label: 'Wartość odsprzedaży', type: 'num', blank: true}];
const dpArcs = list => list.map(([a, b, c]) => ({a, b, c: String(c)}));
const DP_DEF = () => ({type: 'path', path: {arcs: dpArcs([['1', '2', 2], ['1', '3', 4], ['1', '4', 3], ['2', '5', 7], ['2', '6', 4], ['2', '7', 6], ['3', '5', 3], ['3', '6', 2], ['3', '7', 4], ['4', '5', 4], ['4', '6', 1], ['4', '7', 5], ['5', '8', 1], ['5', '9', 4], ['6', '8', 6], ['6', '9', 3], ['7', '8', 3], ['7', '9', 3], ['8', '10', 3], ['9', '10', 4]]), start: '1', end: '10', maxi: false, dir: 'back'},
  alloc: {R: '5', maxi: true, names: ['Kraj A', 'Kraj B', 'Kraj C'], ret: [[0, 45, 70, 90, 105, 120], [0, 20, 45, 75, 110, 150], [0, 50, 70, 80, 100, 130]].map(r => r.map(String))},
  knap: {W: '10', kind: '01', items: [{name: 'Namiot', w: '5', v: '20', lim: '1'}, {name: 'Śpiwór', w: '3', v: '12', lim: '1'}, {name: 'Kuchenka', w: '4', v: '15', lim: '1'}, {name: 'Aparat', w: '2', v: '9', lim: '1'}]},
  prod: {I0: '0', Iend: '0', Smax: '4', per: [{label: '1', D: '2', cap: '4', K: '3', c: '1', h: '0.5'}, {label: '2', D: '3', cap: '4', K: '3', c: '1', h: '0.5'}, {label: '3', D: '2', cap: '4', K: '3', c: '1', h: '0.5'}, {label: '4', D: '4', cap: '4', K: '3', c: '1', h: '0.5'}]},
  repl: {T: '5', a0: '1', P: '100', A: '4', rows: [['0', '20', ''], ['1', '25', '80'], ['2', '35', '60'], ['3', '50', '45'], ['4', '', '30']].map(([a, op, sal]) => ({a, op, sal}))}});
const dpEx = (name, patch) => ({name, data: (() => { const d = DP_DEF(); Object.entries(patch).forEach(([k, v]) => { d[k] = typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object' ? {...d[k], ...v} : v; }); return d; })()});
const DP_EXAMPLES = [
  dpEx('Problem dyliżansu (Hillier i Lieberman)', {type: 'path'}),
  dpEx('Dyliżans – rekurencja w przód', {type: 'path', path: {dir: 'fwd'}}),
  dpEx('Rozdział 5 zespołów między 3 kraje', {type: 'alloc'}),
  dpEx('Plecak 0/1 (pojemność 10)', {type: 'knap'}),
  dpEx('Plecak nieograniczony (cięcie pręta)', {type: 'knap', knap: {W: '12', kind: 'unbounded', items: [{name: 'Odcinek 2 m', w: '2', v: '5', lim: ''}, {name: 'Odcinek 3 m', w: '3', v: '8', lim: ''}, {name: 'Odcinek 5 m', w: '5', v: '14', lim: ''}]}}),
  dpEx('Produkcja i zapasy – 4 okresy', {type: 'prod'}),
  dpEx('Wymiana maszyny – 5 lat', {type: 'repl'}),
];
let DPS = dpNormalize(JSON.parse(JSON.stringify(DP_EXAMPLES[0].data)));
function dpNormalize(d) {
  if (!d || !DP_TYPES[d.type]) throw new Error('to nie jest zadanie programowania dynamicznego (nieznany rodzaj zadania).');
  const base = DP_DEF(), S = v => String(v ?? ''), o = {type: d.type};
  o.path = {...base.path, ...(d.path || {})}; o.path.arcs = (o.path.arcs || []).slice(0, 200).map(e => ({a: S(e.a), b: S(e.b), c: S(e.c)})); o.path.maxi = !!o.path.maxi; o.path.dir = o.path.dir === 'fwd' ? 'fwd' : 'back';
  o.alloc = {...base.alloc, ...(d.alloc || {})}; o.alloc.names = (o.alloc.names || []).map(S); o.alloc.ret = (o.alloc.ret || []).map(r => r.map(S)); o.alloc.maxi = o.alloc.maxi !== false;
  o.knap = {...base.knap, ...(d.knap || {})}; o.knap.kind = ['01', 'bounded', 'unbounded'].includes(o.knap.kind) ? o.knap.kind : '01'; o.knap.items = (o.knap.items || []).map(it => ({name: S(it.name), w: S(it.w), v: S(it.v), lim: S(it.lim)}));
  o.prod = {...base.prod, ...(d.prod || {})}; o.prod.per = (o.prod.per || []).map(p => ({label: S(p.label), D: S(p.D), cap: S(p.cap), K: S(p.K), c: S(p.c), h: S(p.h)}));
  o.repl = {...base.repl, ...(d.repl || {})}; o.repl.rows = (o.repl.rows || []).map(r => ({a: S(r.a), op: S(r.op), sal: S(r.sal)}));
  ['R', 'W', 'I0', 'Iend', 'Smax', 'T', 'a0', 'P', 'A'].forEach(k => { ['alloc', 'knap', 'prod', 'repl'].forEach(g => { if (o[g][k] !== undefined) o[g][k] = S(o[g][k]); }); });
  return o;
}
const dpNum = (id, v, ph = '') => `<input class="num" data-num inputmode="decimal" id="${DPP}${id}" value="${esc(v)}"${ph ? ` placeholder="${ph}"` : ''}>`;
function dpRender() {
  const t = DPS.type, box = $('#' + DPP + 'body'); $('#' + DPP + 'type').value = t;
  if (t === 'path') { const P = DPS.path; box.innerHTML = `<div class="crow"><label for="${DPP}start">Węzeł początkowy</label><input class="tx" id="${DPP}start" value="${esc(P.start)}" style="width:90px"><label for="${DPP}end">Węzeł końcowy</label><input class="tx" id="${DPP}end" value="${esc(P.end)}" style="width:90px"></div>` +
      `<div class="crow"><label for="${DPP}maxi">Cel</label><select id="${DPP}maxi"><option value="0">najmniejszy koszt (najkrótsza)</option><option value="1">największy zysk (najdłuższa)</option></select><label for="${DPP}dir">Rekurencja</label><select id="${DPP}dir"><option value="back">wstecz (od końca)</option><option value="fwd">w przód (od startu)</option></select></div>` +
      rowTableHTML(DPP + 'a', DP_ARC, P.arcs, {addLabel: '+ łuk', count: k => `${k} łuków`}) + '<p class="hint">Łuki prowadzą z etapu do etapu (sieć bez cykli). Etapy wyznaczamy automatycznie: etap węzła = największa liczba łuków od startu.</p>';
    $('#' + DPP + 'maxi').value = P.maxi ? '1' : '0'; $('#' + DPP + 'dir').value = P.dir; }
  else if (t === 'alloc') { const A = DPS.alloc, R = Math.max(0, Math.min(20, +A.R || 0));
    box.innerHTML = `<div class="crow"><label for="${DPP}R">Liczba jednostek zasobu R</label><select id="${DPP}R">${Array.from({length: 21}, (_, k) => `<option${k === R ? ' selected' : ''}>${k}</option>`).join('')}</select><label for="${DPP}na">Liczba działań</label><select id="${DPP}na">${Array.from({length: 8}, (_, k) => `<option${k + 1 === A.names.length ? ' selected' : ''}>${k + 1}</option>`).join('')}</select>` +
      `<label for="${DPP}amaxi">Cel</label><select id="${DPP}amaxi"><option value="1">maksymalizuj efekt</option><option value="0">minimalizuj koszt</option></select></div>` +
      matrixHTML(DPP + 'M', {rn: A.names, cn: Array.from({length: R + 1}, (_, x) => String(x)), cells: A.names.map((_, i) => Array.from({length: R + 1}, (_, x) => A.ret[i]?.[x] ?? '0'))}, {corner: 'działanie \\ jednostki', noMsg: true}) +
      '<p class="hint">W komórce: efekt działania przy danej liczbie przydzielonych jednostek. Rozdzielamy cały zasób – jeśli część może zostać niewykorzystana, dodaj działanie „rezerwa” z efektem 0.</p>';
    $('#' + DPP + 'amaxi').value = A.maxi ? '1' : '0'; }
  else if (t === 'knap') { const K = DPS.knap; box.innerHTML = `<div class="crow"><label for="${DPP}W">Pojemność plecaka W</label>${dpNum('W', K.W)}<label for="${DPP}kind">Rodzaj</label><select id="${DPP}kind"><option value="01">0/1 (każdy przedmiot raz)</option><option value="bounded">ograniczony (zadana liczba sztuk)</option><option value="unbounded">nieograniczony (dowolnie wiele)</option></select></div>` +
      rowTableHTML(DPP + 'i', DP_ITEM(), K.items, {addLabel: '+ przedmiot', count: k => `${k} przedmiotów`}) + '<p class="hint">Wagi i pojemność – liczby całkowite (stan = wolne miejsce w plecaku).</p>'; $('#' + DPP + 'kind').value = K.kind; }
  else if (t === 'prod') { const P = DPS.prod; box.innerHTML = `<div class="crow"><label for="${DPP}I0">Zapas początkowy</label>${dpNum('I0', P.I0)}<label for="${DPP}Iend">Zapas końcowy</label>${dpNum('Iend', P.Iend)}<label for="${DPP}Smax">Pojemność magazynu</label>${dpNum('Smax', P.Smax)}</div>` +
      rowTableHTML(DPP + 'p', DP_PER, P.per, {addLabel: '+ okres', count: k => `${k} okresów`}) + '<p class="hint">Koszt okresu = koszt uruchomienia (gdy produkujemy) + koszt jednostkowy × produkcja + koszt magazynowania × zapas na koniec okresu. Ilości całkowite.</p>'; }
  else { const P = DPS.repl; box.innerHTML = `<div class="crow"><label for="${DPP}T">Horyzont (lata)</label>${dpNum('T', P.T)}<label for="${DPP}a0">Wiek maszyny na starcie</label>${dpNum('a0', P.a0)}<label for="${DPP}P">Cena nowej maszyny</label>${dpNum('P', P.P)}<label for="${DPP}A">Maksymalny wiek</label>${dpNum('A', P.A)}</div>` +
      rowTableHTML(DPP + 'r', DP_AGE, P.rows, {addLabel: '+ wiek', count: k => `${k} wierszy`}) + '<p class="hint">Koszt eksploatacji w roku, w którym maszyna ma dany wiek (od 0 do maksymalnego − 1); wartość odsprzedaży maszyny w danym wieku (od 1 do maksymalnego). Maszynę w maksymalnym wieku trzeba wymienić; na końcu horyzontu sprzedajemy ją.</p>'; }
  const add = $('#' + DPP + 'aadd') || $('#' + DPP + 'iadd') || $('#' + DPP + 'padd') || $('#' + DPP + 'radd');
  if (add) add.onclick = () => { dpSync(); ({path: () => DPS.path.arcs.push({a: '', b: '', c: '0'}), knap: () => DPS.knap.items.push({name: 'P' + (DPS.knap.items.length + 1), w: '1', v: '0', lim: '1'}), prod: () => DPS.prod.per.push({label: String(DPS.prod.per.length + 1), D: '0', cap: '0', K: '0', c: '0', h: '0'}), repl: () => DPS.repl.rows.push({a: String(DPS.repl.rows.length), op: '', sal: ''})})[DPS.type](); dpRender(); };
  ['R', 'na'].forEach(id => { const el = $('#' + DPP + id); if (el) el.onchange = () => { dpSync(); const A = DPS.alloc; if (id === 'na') { const k = +el.value; A.names = Array.from({length: k}, (_, i) => A.names[i] ?? 'Działanie ' + (i + 1)); A.ret = Array.from({length: k}, (_, i) => A.ret[i] ?? []); } else A.R = el.value; dpRender(); }; });
  const kd = $('#' + DPP + 'kind'); if (kd) kd.onchange = () => { dpSync(); DPS.knap.kind = kd.value; dpRender(); };
  matrixPolish($('#' + DPP + 'top'));
}
function dpSync() {
  const t = DPS.type, v = id => $('#' + DPP + id)?.value;
  if (t === 'path' && $('#' + DPP + 'start')) { DPS.path.start = v('start'); DPS.path.end = v('end'); DPS.path.maxi = v('maxi') === '1'; DPS.path.dir = v('dir'); DPS.path.arcs = rowTableSync(DPP + 'a', DP_ARC, DPS.path.arcs); }
  if (t === 'alloc' && $('#' + DPP + 'M')) { const R = +v('R'), st = {rn: DPS.alloc.names.slice(), cn: Array.from({length: R + 1}, (_, x) => String(x)), cells: DPS.alloc.names.map((_, i) => Array.from({length: R + 1}, (_, x) => DPS.alloc.ret[i]?.[x] ?? '0'))};
    matrixSync(DPP + 'M', st); DPS.alloc.names = st.rn; DPS.alloc.ret = st.cells; DPS.alloc.R = String(R); DPS.alloc.maxi = v('amaxi') === '1'; }
  if (t === 'knap' && $('#' + DPP + 'W')) { DPS.knap.W = v('W'); DPS.knap.kind = v('kind'); DPS.knap.items = rowTableSync(DPP + 'i', DP_ITEM(), DPS.knap.items); }
  if (t === 'prod' && $('#' + DPP + 'I0')) { ['I0', 'Iend', 'Smax'].forEach(k => { DPS.prod[k] = v(k); }); DPS.prod.per = rowTableSync(DPP + 'p', DP_PER, DPS.prod.per); }
  if (t === 'repl' && $('#' + DPP + 'T')) { ['T', 'a0', 'P', 'A'].forEach(k => { DPS.repl[k] = v(k); }); DPS.repl.rows = rowTableSync(DPP + 'r', DP_AGE, DPS.repl.rows); }
}
function dpInit() {
  $('#' + DPP + 'top').innerHTML = `<div class="crow"><label for="${DPP}type">Rodzaj zadania</label><select id="${DPP}type">${Object.entries(DP_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(DPP)}<div id="${DPP}body"></div><div id="${DPP}msg"></div><details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(DPP, DP_EXAMPLES)}</details>
    <p class="hint">Programowanie dynamiczne dzieli zadanie na etapy. W każdym etapie dla każdego stanu zapisujemy najlepszą wartość f(s) od tego miejsca do końca – i wykorzystujemy ją w etapie poprzednim (zasada optymalności Bellmana).</p>`;
  $('#' + DPP + 'type').onchange = () => { dpSync(); DPS.type = $('#' + DPP + 'type').value; clearErr(); dpRender(); };
  const top = $('#' + DPP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; dpSync(); const arr = {path: DPS.path.arcs, knap: DPS.knap.items, prod: DPS.prod.per, repl: DPS.repl.rows}[DPS.type]; if (arr && arr.length > 1) arr.splice(+k, 1); clearErr(); dpRender(); });
  netToolsWire(DPP, {kind: 'dp', out: '#out-dp', examples: DP_EXAMPLES, normalize: dpNormalize, get: () => { dpSync(); return JSON.parse(JSON.stringify(DPS)); }, set: d => { DPS = d; dpRender(); },
    toCSV: d => dpToCSV(d), fromCSV: t => dpFromCSV(t)});
  $('#btn-dp').onclick = dpSolveUI;
  dpRender();
}
function dpToCSV(d) {
  const t = d.type;
  if (t === 'path') return rowsToCSV(DP_ARC, d.path.arcs, [['zadanie', 'path'], ['start', d.path.start], ['koniec', d.path.end], ['cel', d.path.maxi ? 'max' : 'min'], ['rekurencja', d.path.dir]]);
  if (t === 'knap') return rowsToCSV([{key: 'name', label: 'Przedmiot', type: 'text'}, {key: 'w', label: 'Waga', type: 'num'}, {key: 'v', label: 'Wartość', type: 'num'}, {key: 'lim', label: 'Liczba sztuk', type: 'num'}], d.knap.items, [['zadanie', 'knap'], ['pojemność', d.knap.W], ['rodzaj', d.knap.kind]]);
  if (t === 'prod') return rowsToCSV(DP_PER, d.prod.per, [['zadanie', 'prod'], ['zapas początkowy', d.prod.I0], ['zapas końcowy', d.prod.Iend], ['magazyn', d.prod.Smax]]);
  if (t === 'repl') return rowsToCSV(DP_AGE, d.repl.rows, [['zadanie', 'repl'], ['horyzont', d.repl.T], ['wiek początkowy', d.repl.a0], ['cena', d.repl.P], ['wiek maksymalny', d.repl.A]]);
  const R = +d.alloc.R, cols = [{key: 'name', label: 'Działanie', type: 'text'}, ...Array.from({length: R + 1}, (_, x) => ({key: 'x' + x, label: String(x), type: 'num'}))];
  return rowsToCSV(cols, d.alloc.names.map((nm, i) => ({name: nm, ...Object.fromEntries(Array.from({length: R + 1}, (_, x) => ['x' + x, d.alloc.ret[i]?.[x] ?? '0']))})), [['zadanie', 'alloc'], ['zasób', R], ['cel', d.alloc.maxi ? 'max' : 'min']]);
}
function dpFromCSV(text) {
  const kind = (String(text).match(/zadanie;(\w+)/) || [])[1]; if (!DP_TYPES[kind]) throw new Error('w pliku brakuje wiersza „zadanie;…” z rodzajem zadania.');
  const d = DP_DEF(), un = v => v === undefined ? '' : String(v).replace(',', '.'); d.type = kind;
  if (kind === 'path') { const r = rowsFromCSV(text, DP_ARC, ['zadanie', 'start', 'koniec', 'cel', 'rekurencja']); d.path = {arcs: r.rows, start: r.meta.start, end: r.meta.koniec, maxi: r.meta.cel === 'max', dir: r.meta.rekurencja === 'fwd' ? 'fwd' : 'back'}; }
  else if (kind === 'knap') { const r = rowsFromCSV(text, [{key: 'name', label: 'Przedmiot', type: 'text'}, {key: 'w', label: 'Waga', type: 'num'}, {key: 'v', label: 'Wartość', type: 'num'}, {key: 'lim', label: 'Liczba sztuk', type: 'num', blank: true}], ['zadanie', 'pojemność', 'rodzaj']); d.knap = {W: un(r.meta['pojemność']), kind: r.meta.rodzaj, items: r.rows}; }
  else if (kind === 'prod') { const r = rowsFromCSV(text, DP_PER, ['zadanie', 'zapas początkowy', 'zapas końcowy', 'magazyn']); d.prod = {I0: un(r.meta['zapas początkowy']), Iend: un(r.meta['zapas końcowy']), Smax: un(r.meta.magazyn), per: r.rows}; }
  else if (kind === 'repl') { const r = rowsFromCSV(text, DP_AGE, ['zadanie', 'horyzont', 'wiek początkowy', 'cena', 'wiek maksymalny']); d.repl = {T: un(r.meta.horyzont), a0: un(r.meta['wiek początkowy']), P: un(r.meta.cena), A: un(r.meta['wiek maksymalny']), rows: r.rows}; }
  else { const head = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).find(l => /^Działanie;/.test(l)); if (!head) throw new Error('brak nagłówka „Działanie;0;1;…”.'); const R = head.split(';').length - 2;
    const r = rowsFromCSV(text, [{key: 'name', label: 'Działanie', type: 'text'}, ...Array.from({length: R + 1}, (_, x) => ({key: 'x' + x, label: String(x), type: 'num'}))], ['zadanie', 'zasób', 'cel']);
    d.alloc = {R: String(R), maxi: r.meta.cel !== 'min', names: r.rows.map(x => x.name), ret: r.rows.map(x => Array.from({length: R + 1}, (_, k) => x['x' + k]))}; }
  return d;
}
function dpRead() {
  clearErr(); dpSync();
  const out = '#out-dp', t = DPS.type, bad = [], num = (v, id, o = {}) => { const s = String(v).trim().replace(',', '.'); if (s === '' && o.blank) return null; const x = Number(s); if (s === '' || !isFinite(x) || (o.int && !Number.isInteger(x)) || (o.min !== undefined && x < o.min) || (o.max !== undefined && x > o.max)) { bad.push(id); return NaN; } return x; };
  if (t === 'path') { const P = DPS.path, arcs = P.arcs.map((e, i) => { const a = String(e.a).trim(), b = String(e.b).trim(); if (!a) bad.push('aa' + i); if (!b) bad.push('ab' + i); if (a && a === b) bad.push('ab' + i); return {a, b, c: num(e.c, 'ac' + i)}; });
    if (bad.length) return netFail(DPP, out, 'każdy łuk: dwa różne węzły i liczba (koszt lub zysk).', bad);
    const st = String(P.start).trim(), en = String(P.end).trim(); if (!st || !en || st === en) return netFail(DPP, out, 'podaj różne węzły początkowy i końcowy.', ['start', 'end']);
    const dup = arcs.findIndex((e, i) => arcs.findIndex(f => f.a === e.a && f.b === e.b) !== i); if (dup >= 0) return netFail(DPP, out, `łuk ${esc(arcs[dup].a)} → ${esc(arcs[dup].b)} występuje dwa razy.`, ['aa' + dup, 'ab' + dup]);
    return {t, arcs, start: st, end: en, maxi: P.maxi, dir: P.dir}; }
  if (t === 'alloc') { const A = DPS.alloc, R = +A.R, ret = A.ret.map((r, i) => Array.from({length: R + 1}, (_, x) => num(r[x], `Mc${i}_${x}`)));
    if (bad.length) return netFail(DPP, out, 'wpisz w zaznaczonych komórkach liczby (efekty działań).', bad); if (!A.names.length) return netFail(DPP, out, 'dodaj co najmniej jedno działanie.', []);
    return {t, R, ret, names: A.names, maxi: A.maxi}; }
  if (t === 'knap') { const K = DPS.knap, W = num(K.W, 'W', {int: true, min: 0, max: 2000}); if (bad.length) return netFail(DPP, out, 'pojemność: liczba całkowita od 0 do 2000.', bad);
    const items = K.items.map((it, i) => ({name: String(it.name).trim() || 'P' + (i + 1), w: num(it.w, 'iw' + i, {int: true, min: 1}), v: num(it.v, 'iv' + i), lim: K.kind === '01' ? 1 : K.kind === 'unbounded' ? Infinity : num(it.lim, 'ilim' + i, {int: true, min: 0})}));
    if (bad.length) return netFail(DPP, out, 'wagi: liczby całkowite ≥ 1; wartości: liczby; liczba sztuk: całkowita ≥ 0.', bad); return {t, W, items, kind: K.kind}; }
  if (t === 'prod') { const P = DPS.prod, I0 = num(P.I0, 'I0', {int: true, min: 0}), Iend = num(P.Iend, 'Iend', {int: true, min: 0}), Smax = num(P.Smax, 'Smax', {int: true, min: 0, max: 500});
    const per = P.per.map((p, i) => ({label: String(p.label).trim() || String(i + 1), D: num(p.D, 'pD' + i, {int: true, min: 0}), cap: num(p.cap, 'pcap' + i, {int: true, min: 0, max: 500}), K: num(p.K, 'pK' + i, {min: 0}), c: num(p.c, 'pc' + i, {min: 0}), h: num(p.h, 'ph' + i, {min: 0})}));
    if (bad.length) return netFail(DPP, out, 'popyt, moc i zapasy – liczby całkowite nieujemne (moc i magazyn do 500); koszty – nieujemne.', bad);
    if (I0 > Smax) return netFail(DPP, out, 'zapas początkowy nie może przekraczać pojemności magazynu.', ['I0', 'Smax']); if (Iend > Smax) return netFail(DPP, out, 'zapas końcowy nie może przekraczać pojemności magazynu.', ['Iend', 'Smax']);
    return {t, per, I0, Iend, Smax}; }
  const P = DPS.repl, T = num(P.T, 'T', {int: true, min: 1, max: 40}), A = num(P.A, 'A', {int: true, min: 1, max: 30}), a0 = num(P.a0, 'a0', {int: true, min: 1}), Pr = num(P.P, 'P', {min: 0});
  if (bad.length) return netFail(DPP, out, 'horyzont 1–40, maksymalny wiek 1–30, wiek startowy ≥ 1 – liczby całkowite; cena nieujemna.', bad); if (a0 > A) return netFail(DPP, out, 'wiek maszyny na starcie nie może przekraczać maksymalnego wieku.', ['a0', 'A']);
  const op = Array(A).fill(NaN), sal = Array(A + 1).fill(0), ages = P.rows.map((r, i) => num(r.a, 'ra' + i, {int: true, min: 0, max: A})); if (bad.length) return netFail(DPP, out, `wiek w tabeli: liczby całkowite od 0 do ${A}.`, bad);
  P.rows.forEach((r, i) => { const a = ages[i]; if (a < A) { const v = num(r.op, 'rop' + i, {min: 0}); op[a] = v; } if (a >= 1) { const v = num(r.sal, 'rsal' + i, {min: 0}); sal[a] = v; } });
  if (bad.length) return netFail(DPP, out, 'koszty eksploatacji i wartości odsprzedaży – liczby nieujemne.', bad);
  const miss = op.map((v, a) => isNaN(v) ? a : -1).filter(a => a >= 0); if (miss.length) return netFail(DPP, out, `brak kosztu eksploatacji dla wieku ${miss.join(', ')} – tabela musi obejmować wiek od 0 do ${A - 1}.`, []);
  return {t, T, a0, P: Pr, A, op, sal};
}
function dpSolveUI() { const X = dpRead(); if (!X) return; const h = dpReportHTML(X); $('#out-dp').innerHTML = h; last.dp = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function dpStageTable(st, sName, xName, fName, maxCols = 21) {
  const xs = [...new Set(st.rows.flatMap(r => r.opts.map(o => o.x)))], cut = xs.length > maxCols, xsh = cut ? xs.slice(0, maxCols) : xs, f = v => v === null || !isFinite(v) ? '–' : fmt(Math.round(v * 1e4) / 1e4);
  return '<div class="tw"><table><thead><tr><th>' + sName + '</th>' + xsh.map(x => `<th>${xName} = ${esc(String(x))}</th>`).join('') + `<th>${fName}</th><th>decyzja optymalna</th></tr></thead>` +
    st.rows.map(r => `<tr><th>${esc(String(r.s))}</th>${xsh.map(x => { const o = r.opts.find(q => q.x === x); return `<td class="${o && r.xs.includes(x) ? 'best' : ''}">${o ? f(o.val) : '–'}</td>`; }).join('')}<td><b>${f(r.best)}</b></td><td>${r.xs.length ? r.xs.map(x => esc(String(x))).join(', ') : 'brak'}</td></tr>`).join('') + '</table></div>' + (cut ? `<p class="hint">Pokazano ${maxCols} z ${xs.length} decyzji.</p>` : '');
}
function dpReportHTML(X) {
  const f = v => fmt(Math.round(v * 1e4) / 1e4), stagesHTML = (R, label, sName, xName, rows = 60) => R.stages.map(st => { const short = st.rows.length > rows; const s2 = short ? {...st, rows: [...st.rows.slice(0, rows / 2), ...st.rows.slice(-rows / 2)]} : st;
    return `<h4>${label(st.k)}</h4>` + dpStageTable(s2, sName, xName, `f<sub>${st.k}</sub>(s)`) + (short ? `<p class="hint">Pokazano ${rows} z ${st.rows.length} stanów (początek i koniec tabeli).</p>` : ''); }).join('');
  if (X.t === 'path') {
    const R = dpPath(X.arcs, X.start, X.end, X.maxi, X.dir), back = X.dir === 'back', opt = X.maxi ? 'max' : 'min';
    let h = `<h3>Ścieżka etapowa – rekurencja ${back ? 'wstecz' : 'w przód'}</h3><div class="formula">${back ? `f<sub>n</sub>(s) = ${opt}<sub>x</sub> [ c(s, x) + f<sub>n+1</sub>(x) ], f(${esc(X.end)}) = 0` : `g<sub>n</sub>(s) = ${opt}<sub>x</sub> [ g<sub>n−1</sub>(x) + c(x, s) ], g(${esc(X.start)}) = 0`}</div>` +
      `<p class="hint">${back ? 'Zaczynamy od ostatniego etapu: dla każdego węzła liczymy najlepszy koszt dojścia do celu, wykorzystując już policzone wartości węzłów następnych.' : 'Zaczynamy od startu: dla każdego węzła liczymy najlepszy koszt dojścia ze startu, wykorzystując wartości węzłów poprzednich.'} Kolumny tabel to możliwe ${back ? 'następne' : 'poprzednie'} węzły x; zielone pola – decyzje optymalne.</p>`;
    if (R.status === 'error') return h + `<p class="msg">${esc(R.msg)}</p>`;
    if (R.unreach?.length) h += `<p class="note">Węzły nieosiągalne ze startu pominięto: ${R.unreach.map(esc).join(', ')}.</p>`;
    h += stagesHTML(R, k => `Etap ${k}`, 'Węzeł s', back ? 'następny' : 'poprzedni');
    if (R.status !== 'optimal') return h + `<p class="msg">Z węzła ${esc(X.start)} nie da się dojść do ${esc(X.end)}.</p>`;
    h += `<div class="sum"><b>Wynik:</b> ${X.maxi ? 'największy zysk' : 'najmniejszy koszt'} = <b>${f(R.value)}</b>. ${R.routes.length === 1 ? 'Trasa optymalna' : `Trasy optymalne (${R.routes.length})`}: ${R.routes.map(r => '<b>' + r.map(esc).join(' → ') + '</b>').join('; ')}.</div>`;
    const names = [...R.lev.keys()].filter(v => !R.unreach?.includes(v)), idx = new Map(names.map((v, i) => [v, i])), maxL = Math.max(...names.map(v => R.lev.get(v))), cols = Array.from({length: maxL + 1}, (_, c) => names.filter(v => R.lev.get(v) === c));
    const W = Math.max(420, 80 + maxL * 140), H = 60 + Math.max(...cols.map(c => c.length)) * 70, pos = []; cols.forEach((list, c) => list.forEach((v, r) => { pos[idx.get(v)] = {x: maxL ? 50 + c * (W - 100) / maxL : W / 2, y: 30 + (r + .5) * (H - 50) / list.length}; }));
    const onR = new Set(R.routes.flatMap(r => r.slice(1).map((v, i) => r[i] + '>' + v))), E = X.arcs.filter(e => idx.has(e.a) && idx.has(e.b)).map(e => ({a: idx.get(e.a), b: idx.get(e.b), label: f(e.c), cls: onR.has(e.a + '>' + e.b) ? 'path' : 'other'}));
    const fv = new Map(R.stages.flatMap(s => s.rows.map(r => [r.s, r.best])));
    return h + '<h4>Sieć etapowa</h4>' + layeredSVG(names, E, idx.get(X.start), {layout: {pos, W, H}, sub: names.map(v => v === (back ? X.end : X.start) ? '0' : fv.has(v) && fv.get(v) !== null ? 'f = ' + f(fv.get(v)) : ''), cls: names.map(v => v === X.start ? 'src' : v === X.end ? 'dst' : ''), title: 'Sieć etapowa'}) +
      '<p class="hint">Pogrubione strzałki – trasy optymalne; pod węzłem – wartość f (najlepszy koszt od węzła do celu albo od startu do węzła).</p>';
  }
  if (X.t === 'alloc') {
    const R = dpAlloc(X.ret, X.R, X.maxi), opt = X.maxi ? 'max' : 'min';
    let h = `<h3>Rozdział zasobów – ${X.R} jednostek między ${X.names.length} działań</h3><div class="formula">f<sub>n</sub>(s) = ${opt}<sub>0 ≤ x ≤ s</sub> [ r<sub>n</sub>(x) + f<sub>n+1</sub>(s − x) ], f<sub>${X.names.length + 1}</sub>(0) = 0</div><p class="hint">Etap n = działanie n, stan s = liczba jednostek jeszcze do rozdziału (dla działań n, n+1, …), decyzja x = ile dać działaniu n. Idziemy od ostatniego działania.</p>`;
    h += stagesHTML(R, k => `Etap ${k}: ${esc(X.names[k - 1])}`, 'Stan s (jednostki)', 'x');
    h += '<h4>Odtworzenie decyzji (od pierwszego działania)</h4><div class="tw"><table><thead><tr><th>Działanie</th><th>Do rozdziału</th><th>Przydział x</th><th>Efekt</th></tr></thead>' + R.policy.map(p => `<tr><th>${esc(X.names[p.k - 1])}</th><td>${p.s}</td><td><b>${p.x}</b></td><td>${f(p.imm)}</td></tr>`).join('') + '</table></div>';
    return h + `<div class="sum"><b>Wynik:</b> ${R.policy.map(p => `${esc(X.names[p.k - 1])} – ${p.x}`).join(', ')}; łączny ${X.maxi ? 'efekt' : 'koszt'} = <b>${f(R.value)}</b>.${R.alt ? ' Istnieją też inne podziały o tej samej wartości (kilka decyzji optymalnych w tabelach).' : ''}</div>`;
  }
  if (X.t === 'knap') {
    const R = dpKnap(X.items, X.W), kindTxt = {'01': '0/1 (każdy przedmiot co najwyżej raz)', bounded: 'ograniczony (zadana liczba sztuk)', unbounded: 'nieograniczony'}[X.kind];
    let h = `<h3>Plecak ${kindTxt}, pojemność ${X.W}</h3><div class="formula">f<sub>n</sub>(s) = max<sub>m</sub> [ m·v<sub>n</sub> + f<sub>n+1</sub>(s − m·w<sub>n</sub>) ], 0 ≤ m ≤ ${X.kind === '01' ? '1' : X.kind === 'bounded' ? 'limit' : '⌊s / w<sub>n</sub>⌋'}, m·w<sub>n</sub> ≤ s</div><p class="hint">Etap n = przedmiot n, stan s = wolne miejsce w plecaku, decyzja m = ile sztuk przedmiotu n zabieramy.</p>`;
    h += stagesHTML(R, k => `Etap ${k}: ${esc(X.items[k - 1].name)} (waga ${f(X.items[k - 1].w)}, wartość ${f(X.items[k - 1].v)})`, 'Wolne miejsce s', 'm');
    h += '<h4>Odtworzenie decyzji</h4><div class="tw"><table><thead><tr><th>Przedmiot</th><th>Wolne miejsce</th><th>Sztuk</th><th>Wartość</th></tr></thead>' + R.policy.map(p => `<tr><th>${esc(X.items[p.k - 1].name)}</th><td>${p.s}</td><td><b>${p.x}</b></td><td>${f(p.imm)}</td></tr>`).join('') + '</table></div>';
    return h + `<div class="sum"><b>Wynik:</b> zabieramy ${R.policy.filter(p => p.x).map(p => `${esc(X.items[p.k - 1].name)}${p.x > 1 ? ` × ${p.x}` : ''}`).join(', ') || 'nic'}; wartość = <b>${f(R.value)}</b>, zajęte miejsce ${R.used} z ${X.W}.</div>`;
  }
  if (X.t === 'prod') {
    const R = dpProd(X.per, X.I0, X.Iend, X.Smax);
    let h = `<h3>Produkcja i zapasy – ${X.per.length} okresów</h3><div class="formula">f<sub>t</sub>(s) = min<sub>x</sub> [ K<sub>t</sub>·[x > 0] + c<sub>t</sub>·x + h<sub>t</sub>·(s + x − D<sub>t</sub>) + f<sub>t+1</sub>(s + x − D<sub>t</sub>) ], f<sub>T+1</sub>(${X.Iend}) = 0</div><p class="hint">Stan s = zapas na początku okresu, decyzja x = produkcja; zapas na koniec okresu (s + x − popyt) musi mieścić się w magazynie (0…${X.Smax}), a produkcja w mocy.</p>`;
    h += stagesHTML(R, k => `Okres ${esc(X.per[k - 1].label)} (popyt ${X.per[k - 1].D}, moc ${X.per[k - 1].cap})`, 'Zapas s', 'x');
    if (R.status !== 'optimal') return h + '<p class="msg">Nie istnieje plan spełniający popyt przy tych mocach i pojemności magazynu.</p>';
    h += '<h4>Plan produkcji</h4><div class="tw"><table><thead><tr><th>Okres</th><th>Zapas początkowy</th><th>Produkcja</th><th>Popyt</th><th>Zapas końcowy</th><th>Koszt okresu</th></tr></thead>' + R.policy.map(p => `<tr><th>${esc(X.per[p.k - 1].label)}</th><td>${p.s}</td><td><b>${p.x}</b></td><td>${X.per[p.k - 1].D}</td><td>${p.e}</td><td>${f(p.imm)}</td></tr>`).join('') + '</table></div>';
    return h + `<div class="sum"><b>Wynik:</b> produkcja ${R.policy.map(p => p.x).join(', ')} w kolejnych okresach; łączny koszt = <b>${f(R.value)}</b>.</div>`;
  }
  const R = dpReplace(X.T, X.a0, X.P, X.op, X.sal, X.A);
  let h = `<h3>Wymiana sprzętu – ${X.T} lat</h3><div class="formula">f<sub>t</sub>(a) = min { zatrzymaj: e(a) + f<sub>t+1</sub>(a + 1); wymień: P − s(a) + e(0) + f<sub>t+1</sub>(1) }, f<sub>T+1</sub>(a) = −s(a)</div><p class="hint">Stan a = wiek maszyny na początku roku; e(a) – koszt eksploatacji w roku, s(a) – wartość odsprzedaży, P = ${f(X.P)} – cena nowej. Maszyny w wieku ${X.A} nie można dalej używać. Na końcu horyzontu sprzedajemy maszynę (stąd −s(a)).</p>`;
  h += stagesHTML(R, k => `Rok ${k}`, 'Wiek a', 'decyzja');
  h += '<h4>Polityka optymalna</h4><div class="tw"><table><thead><tr><th>Rok</th><th>Wiek na początku</th><th>Decyzja</th><th>Koszt roku</th></tr></thead>' + R.policy.map(p => `<tr><th>${p.k}</th><td>${p.s}</td><td><b>${p.x}</b></td><td>${f(p.imm)}</td></tr>`).join('') + `<tr><th>koniec</th><td>${R.endAge}</td><td>sprzedaż</td><td>−${f(R.endSal)}</td></tr></table></div>`;
  return h + `<div class="sum"><b>Wynik:</b> ${R.policy.filter(p => p.x === 'wymień').length ? 'wymieniamy maszynę w latach ' + R.policy.filter(p => p.x === 'wymień').map(p => p.k).join(', ') : 'nie wymieniamy maszyny'}; łączny koszt netto = <b>${f(R.value)}</b>.</div>`;
}
registerModule({id: 'dp', title: 'Programowanie dynamiczne', init: dpInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="20" cy="12" r="2"/><path d="M6 11l4-4M6 13l4 4M14 7l4 4M14 17l4-4"/></svg>',
  html: '<div class="card"><div id="dp-top"></div><div><button id="btn-dp" type="button">Rozwiąż</button></div><div id="out-dp"></div></div>'});
