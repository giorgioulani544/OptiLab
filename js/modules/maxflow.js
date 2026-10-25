/* ===== OptiLab – moduł Maksymalny przepływ (Ford-Fulkerson / Edmonds-Karp) =====
   Interfejs (lista łuków lub macierz przepustowości), raport z siecią rezydualną w każdej iteracji, przekrój minimalny.
   Obliczenia: js/net/maxflow-solver.js. Wspólne komponenty: js/net/netui.js. */
const MF_MAX = 30, MFP = 'mf-';
const mfData = (directed, names, edges, src, snk, extra = {}) => ({directed, names, src: names.indexOf(src), snk: names.indexOf(snk), multi: false, sources: [], sinks: [], ...extra,
  edges: edges.map(([a, b, c]) => ({a: names.indexOf(a), b: names.indexOf(b), c: String(c)}))});
const MF_EXAMPLES = [
  {name: 'Sieć z podręcznika (Cormen i in., przepływ 23)', data: mfData(true, ['s', 'v1', 'v2', 'v3', 'v4', 't'], [['s', 'v1', 16], ['s', 'v2', 13], ['v1', 'v3', 12], ['v2', 'v1', 4], ['v2', 'v4', 14], ['v3', 'v2', 9], ['v3', 't', 20], ['v4', 'v3', 7], ['v4', 't', 4]], 's', 't')},
  {name: 'Przykład Edmondsa-Karpa (przepływ 5)', data: mfData(true, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], [['A', 'B', 3], ['A', 'D', 3], ['B', 'C', 4], ['C', 'A', 3], ['C', 'D', 1], ['C', 'E', 2], ['D', 'E', 2], ['D', 'F', 6], ['E', 'B', 1], ['E', 'G', 1], ['F', 'G', 9]], 'A', 'G')},
  {name: 'Przepływ wsteczny (cofanie przepływu)', data: mfData(true, ['s', 'a', 'b', 'c', 'd', 't'], [['s', 'a', 1], ['a', 'b', 1], ['b', 't', 1], ['s', 'c', 1], ['c', 'b', 1], ['a', 'd', 1], ['d', 't', 1]], 's', 't')},
  {name: 'Sieć wodociągowa (graf nieskierowany)', data: mfData(false, ['Ujęcie', 'A', 'B', 'C', 'D', 'Miasto'], [['Ujęcie', 'A', 10], ['Ujęcie', 'B', 8], ['A', 'B', 5], ['A', 'C', 7], ['B', 'D', 10], ['C', 'D', 3], ['C', 'Miasto', 8], ['D', 'Miasto', 10]], 'Ujęcie', 'Miasto')},
  {name: 'Wiele źródeł i ujść (superźródło)', data: mfData(true, ['Fabryka 1', 'Fabryka 2', 'Węzeł A', 'Węzeł B', 'Sklep 1', 'Sklep 2'], [['Fabryka 1', 'Węzeł A', 8], ['Fabryka 1', 'Węzeł B', 3], ['Fabryka 2', 'Węzeł B', 9], ['Węzeł A', 'Węzeł B', 4], ['Węzeł A', 'Sklep 1', 6], ['Węzeł B', 'Sklep 1', 5], ['Węzeł B', 'Sklep 2', 7]], 'Fabryka 1', 'Sklep 1', {multi: true, sources: [0, 1], sinks: [4, 5]})},
  {name: 'Przepustowość nieograniczona (M)', data: mfData(true, ['s', 'a', 'b', 't'], [['s', 'a', 'M'], ['a', 't', 7], ['s', 'b', 4], ['b', 't', 'M']], 's', 't')},
];
let MF = {...JSON.parse(JSON.stringify(MF_EXAMPLES[0].data)), mode: 'list'};
function mfNormalize(d) {
  if (!d || !Array.isArray(d.names) || !Array.isArray(d.edges)) throw new Error('to nie jest zadanie maksymalnego przepływu.');
  const n = d.names.length; if (n < 2 || n > MF_MAX) throw new Error(`dozwolone jest od 2 do ${MF_MAX} węzłów (jest ${n}).`);
  const idx = v => Number.isInteger(v) && v >= 0 && v < n;
  if (d.edges.some(e => !idx(e.a) || !idx(e.b))) throw new Error('łuk wskazuje na nieistniejący węzeł.');
  return {directed: !!d.directed, names: d.names.map(String), edges: d.edges.map(e => ({a: e.a, b: e.b, c: String(e.c ?? '0')})),
    src: idx(d.src) ? d.src : 0, snk: idx(d.snk) ? d.snk : n - 1, multi: !!d.multi, sources: (d.sources || []).filter(idx), sinks: (d.sinks || []).filter(idx), mode: MF.mode};
}
/* CSV: „węzły;…", „graf;…", „źródła;…", „ujścia;…", potem „od;do;przepustowość" (M = nieograniczona) */
function mfToCSV(d) {
  const v = s => String(s).replace('.', ','), so = d.multi ? d.sources : [d.src], si = d.multi ? d.sinks : [d.snk];
  const L = [['węzły', ...d.names], ['graf', d.directed ? 'skierowany' : 'nieskierowany'], ['źródła', ...so.map(k => d.names[k])], ['ujścia', ...si.map(k => d.names[k])], ['od', 'do', 'przepustowość'], ...d.edges.map(e => [d.names[e.a], d.names[e.b], v(e.c)])];
  return '\uFEFF' + L.map(r => r.join(';')).join('\r\n') + '\r\n';
}
function mfFromCSV(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), first = lines.find(l => l.trim());
  if (!first) throw new Error('plik jest pusty.');
  const sep = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
  const d = {directed: true, names: [], edges: [], multi: false, sources: [], sinks: []}, id = s => { let k = d.names.indexOf(s); if (k < 0) { d.names.push(s); k = d.names.length - 1; } return k; };
  let so = [], si = [];
  lines.forEach((raw, k) => {
    if (!raw.trim()) return; const c = raw.split(sep).map(s => s.trim()), h = c[0].toLowerCase(), ln = k + 1;
    if (h === 'węzły' || h === 'wezly') { c.slice(1).filter(Boolean).forEach(id); return; }
    if (h === 'graf') { d.directed = !/^nie/i.test(c[1] || ''); return; }
    if (/^źród|^zrod/.test(h)) { so = c.slice(1).filter(Boolean); return; } if (/^ujśc|^ujsc/.test(h)) { si = c.slice(1).filter(Boolean); return; }
    if (h === 'od') return;
    if (c.length < 3 || !c[0] || !c[1]) throw new Error(`wiersz ${ln}: oczekiwano „od; do; przepustowość".`);
    const raw3 = (c[2] || '').replace(/\s/g, ''), w = /^m$/i.test(raw3) ? 'M' : Number(sep === ',' ? raw3 : raw3.replace(',', '.'));
    if (w !== 'M' && (raw3 === '' || !isFinite(w))) throw new Error(`wiersz ${ln}: przepustowość „${c[2]}" nie jest liczbą ani M.`);
    d.edges.push({a: id(c[0]), b: id(c[1]), c: String(w)});
  });
  if (!d.edges.length) throw new Error('brak łuków (wierszy „od; do; przepustowość").');
  const look = (arr, what) => arr.map(s => { const k = d.names.indexOf(s); if (k < 0) throw new Error(`${what} „${s}" nie jest węzłem sieci.`); return k; });
  const S = look(so, 'źródło'), T = look(si, 'ujście');
  d.src = S[0] ?? 0; d.snk = T[0] ?? d.names.length - 1;
  if (S.length > 1 || T.length > 1) { d.multi = true; d.sources = S; d.sinks = T; }
  return d;
}
/* ---------- formularz ---------- */
const mfOpts = sel => MF.names.map((nm, k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(nm)}</option>`).join('');
function mfRender() {
  const n = MF.names.length;
  $('#' + MFP + 'n').value = n; $('#' + MFP + 'dir').value = MF.directed ? '1' : '0'; $('#' + MFP + 'mode').value = MF.mode; $('#' + MFP + 'multi').checked = MF.multi;
  $('#' + MFP + 'src').innerHTML = mfOpts(MF.src); $('#' + MFP + 'snk').innerHTML = mfOpts(MF.snk);
  $('#' + MFP + 'src').disabled = $('#' + MFP + 'snk').disabled = MF.multi;
  $('#' + MFP + 'multibox').innerHTML = MF.multi ? ['so', 'si'].map(t => `<div class="crow"><span class="hint">${t === 'so' ? 'Źródła' : 'Ujścia'}:</span>` + MF.names.map((nm, k) =>
    `<label class="chk"><input type="checkbox" id="${MFP}${t}${k}"${(t === 'so' ? MF.sources : MF.sinks).includes(k) ? ' checked' : ''}> ${esc(nm)}</label>`).join('') + '</div>').join('') : '';
  $('#' + MFP + 'names').innerHTML = '<span class="hint">Nazwy węzłów:</span>' + MF.names.map((nm, k) => `<input class="nm" id="${MFP}nm${k}" value="${esc(nm)}" aria-label="nazwa węzła ${k + 1}">`).join('');
  const box = $('#' + MFP + 'edges');
  if (MF.mode === 'matrix') {
    const cells = Array.from({length: n}, () => Array(n).fill(''));
    MF.edges.forEach(e => { if (e.a !== e.b) { cells[e.a][e.b] = e.c; if (!MF.directed) cells[e.b][e.a] = e.c; } });
    box.innerHTML = matrixHTML(MFP, {rn: MF.names, cn: MF.names, cells}, {corner: 'Od \\ Do', staticNames: true, blank: true, diag: true, noMsg: true, allowM: true}) +
      `<p class="hint">Puste pole = brak łuku, M = przepustowość nieograniczona.${MF.directed ? '' : ' W sieci nieskierowanej wystarczy wypełnić jedno z pól (A, B) lub (B, A).'}</p>`;
  } else {
    box.innerHTML = '<div class="tw"><table class="mx elist"><tr><th>Od</th><th>Do</th><th>Przepustowość</th><th></th></tr>' + MF.edges.map((e, k) =>
      `<tr><td><select id="${MFP}a${k}" aria-label="łuk ${k + 1}: od">${mfOpts(e.a)}</select></td><td><select id="${MFP}b${k}" aria-label="łuk ${k + 1}: do">${mfOpts(e.b)}</select></td>` +
      `<td><input class="num" data-num data-m inputmode="decimal" id="${MFP}w${k}" value="${esc(e.c)}" aria-label="łuk ${k + 1}: przepustowość"></td><td><button type="button" class="ghost" data-del="${k}" aria-label="usuń łuk ${k + 1}">✕</button></td></tr>`).join('') +
      `</table></div><div class="crow"><button id="${MFP}add" type="button" class="ghost">+ ${MF.directed ? 'łuk' : 'krawędź'}</button><span class="hint">${MF.edges.length} ${MF.directed ? (MF.edges.length === 1 ? 'łuk' : 'łuków') : (MF.edges.length === 1 ? 'krawędź' : 'krawędzi')}</span></div>`;
    $('#' + MFP + 'add').onclick = () => { mfSync(); MF.edges.push({a: 0, b: Math.min(1, n - 1), c: '1'}); mfRender(); };
  }
  matrixPolish(box); $('#' + MFP + 'names').querySelectorAll('input.nm').forEach(growName);
}
function mfSync() {
  const n = MF.names.length;
  MF.names = MF.names.map((v, k) => $('#' + MFP + 'nm' + k)?.value ?? v);
  MF.directed = $('#' + MFP + 'dir').value === '1'; MF.src = +$('#' + MFP + 'src').value; MF.snk = +$('#' + MFP + 'snk').value; MF.multi = $('#' + MFP + 'multi').checked;
  if ($('#' + MFP + 'so0')) { MF.sources = MF.names.map((_, k) => $('#' + MFP + 'so' + k)?.checked ? k : -1).filter(k => k >= 0); MF.sinks = MF.names.map((_, k) => $('#' + MFP + 'si' + k)?.checked ? k : -1).filter(k => k >= 0); }
  if (MF.mode === 'matrix') {
    if (!$('#' + MFP + 'c0_1')) return;
    const E = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue; const v = $('#' + MFP + `c${i}_${j}`).value.trim(); if (v === '') continue;
      if (!MF.directed) { const u = $('#' + MFP + `c${j}_${i}`).value.trim(); if (j < i && u !== '') continue; }
      E.push({a: i, b: j, c: v, id: `c${i}_${j}`});
    }
    MF.edges = E;
  } else if ($('#' + MFP + 'w0') || !MF.edges.length) MF.edges = MF.edges.map((e, k) => ({a: +($('#' + MFP + 'a' + k)?.value ?? e.a), b: +($('#' + MFP + 'b' + k)?.value ?? e.b), c: $('#' + MFP + 'w' + k)?.value ?? e.c, id: 'w' + k}));
}
function mfInit() {
  const opts = Array.from({length: MF_MAX - 1}, (_, k) => `<option>${k + 2}</option>`).join('');
  $('#' + MFP + 'top').innerHTML = `<div class="crow"><label for="${MFP}n">Węzły</label><select id="${MFP}n">${opts}</select><select id="${MFP}dir" aria-label="Rodzaj sieci"><option value="1">sieć skierowana (łuki)</option><option value="0">sieć nieskierowana (krawędzie)</option></select></div>
    <div class="crow"><label for="${MFP}src">Źródło</label><select id="${MFP}src"></select><label for="${MFP}snk">Ujście</label><select id="${MFP}snk"></select></div>
    ${netCopyHTML(MFP)}<div class="crow" id="${MFP}names"></div><div id="${MFP}edges"></div><div id="${MFP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div class="crow"><label for="${MFP}mode">Wpisywanie łuków</label><select id="${MFP}mode"><option value="list">lista łuków</option><option value="matrix">macierz przepustowości</option></select></div>
     <div class="crow"><label><input type="checkbox" id="${MFP}multi" style="width:20px;height:20px;min-height:0"> wiele źródeł i ujść (superźródło S* i superujście T*)</label></div><div id="${MFP}multibox"></div>
     ${netToolsHTML(MFP, MF_EXAMPLES)}</details>
    <p class="hint">Wpisz łuki z przepustowościami (np. tony na godzinę, pojazdy na godzinę). M oznacza przepustowość nieograniczoną. Program wyznaczy największy możliwy przepływ ze źródła do ujścia i wąskie gardło sieci (przekrój minimalny).</p>`;
  $('#' + MFP + 'n').onchange = e => {
    mfSync(); const n = +e.target.value;
    MF.names = Array.from({length: n}, (_, k) => MF.names[k] ?? spName(k)); MF.edges = MF.edges.filter(x => x.a < n && x.b < n);
    MF.sources = MF.sources.filter(k => k < n); MF.sinks = MF.sinks.filter(k => k < n); if (MF.src >= n) MF.src = 0; if (MF.snk >= n) MF.snk = n - 1; clearErr(); mfRender();
  };
  ['dir', 'mode'].forEach(k => $('#' + MFP + k).onchange = () => { mfSync(); MF.mode = $('#' + MFP + 'mode').value; clearErr(); mfRender(); });
  $('#' + MFP + 'multi').onchange = () => { mfSync(); if (MF.multi && !MF.sources.length) { MF.sources = [MF.src]; MF.sinks = [MF.snk]; } clearErr(); mfRender(); };
  $('#' + MFP + 'names').addEventListener('change', () => { mfSync(); mfRender(); });
  $('#' + MFP + 'names').addEventListener('input', e => growName(e.target));
  const box = $('#' + MFP + 'edges'); matrixWire(box);
  box.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; mfSync(); MF.edges.splice(+k, 1); clearErr(); mfRender(); });
  netToolsWire(MFP, {kind: 'maxflow', out: '#out-mf', examples: MF_EXAMPLES, normalize: mfNormalize,
    get: () => { mfSync(); const {mode, ...d} = JSON.parse(JSON.stringify(MF)); d.edges = d.edges.map(({a, b, c}) => ({a, b, c})); return d; },
    set: d => { MF = d; mfRender(); }, toCSV: mfToCSV, fromCSV: mfFromCSV});
  $('#btn-mf').onclick = mfSolve;
  mfRender();
}
function mfRead() {
  clearErr(); mfSync();
  const out = '#out-mf', names = MF.names.map((s, k) => String(s).trim() || spName(k));
  const dup = names.find((s, k) => names.indexOf(s) !== k);
  if (dup !== undefined) return netFail(MFP, out, `nazwy węzłów muszą być różne – powtarza się „${esc(dup)}".`, names.map((s, k) => s === dup ? 'nm' + k : null).filter(Boolean));
  if (!MF.edges.length) return netFail(MFP, out, 'dodaj co najmniej jeden łuk.', MF.mode === 'list' ? ['add'] : []);
  const bad = [], neg = [], loops = [], edges = MF.edges.map(e => {
    const s = String(e.c).trim().replace(',', '.'), c = /^m$/i.test(s) ? Infinity : Number(s);
    if (s === '' || Number.isNaN(c) || (isFinite(c) && Math.abs(c) > 1e9)) bad.push(e.id); else if (c < 0) neg.push(e.id);
    if (e.a === e.b) loops.push(MF.mode === 'list' ? e.id.replace('w', 'a') : e.id);
    return {a: e.a, b: e.b, c, id: e.id};
  });
  if (bad.length) return netFail(MFP, out, 'wpisz w zaznaczonych polach przepustowości (liczby albo M – bez ograniczenia).', bad);
  if (neg.length) return netFail(MFP, out, 'przepustowość nie może być ujemna.', neg);
  if (loops.length) return netFail(MFP, out, 'łuk nie może łączyć węzła z nim samym (pętla).', loops);
  if (!MF.directed && MF.mode === 'matrix') {
    const clash = edges.filter(e => { const u = $('#' + MFP + `c${e.b}_${e.a}`)?.value.trim(); return u && u !== String(MF.edges.find(x => x.id === e.id).c).trim(); });
    if (clash.length) return netFail(MFP, out, 'w sieci nieskierowanej wartości w polach (A, B) i (B, A) muszą być równe – albo wypełnij tylko jedno z nich.', clash.flatMap(e => [e.id, `c${e.b}_${e.a}`]));
  }
  let sources = [MF.src], sinks = [MF.snk];
  if (MF.multi) {
    sources = MF.sources; sinks = MF.sinks;
    if (!sources.length || !sinks.length) return netFail(MFP, out, 'zaznacz co najmniej jedno źródło i jedno ujście.', [...names.map((_, k) => 'so' + k), ...names.map((_, k) => 'si' + k)]);
    const both = sources.filter(k => sinks.includes(k));
    if (both.length) return netFail(MFP, out, `węzeł nie może być jednocześnie źródłem i ujściem (${both.map(k => esc(names[k])).join(', ')}).`, both.flatMap(k => ['so' + k, 'si' + k]));
  } else if (MF.src === MF.snk) return netFail(MFP, out, 'źródło i ujście muszą być różnymi węzłami.', ['src', 'snk']);
  return {n: names.length, names, directed: MF.directed, edges, sources, sinks};
}
function mfSolve() {
  const G = mfRead(); if (!G) return;
  const R = maxflowSolve(G), h = mfReportHTML(G, R);
  $('#out-mf').innerHTML = h; last.mf = h;
  if (R.status === 'unbounded') netFail(MFP, null, 'istnieje ścieżka ze źródła do ujścia złożona wyłącznie z łuków o przepustowości nieograniczonej (M) – przepływ jest nieograniczony. Nadaj któremuś z tych łuków skończoną przepustowość.', R.iters[R.iters.length - 1].path.filter(p => p.edge < G.edges.length).map(p => G.edges[p.edge].id));
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function mfReportHTML(G, R) {
  const nm = k => esc(R.names[k]), cap = c => isFinite(c) ? fmt(c) : 'M', E = R.edges, sep = G.directed ? '→' : '–';
  const eTxt = k => `${nm(E[k].a)} ${E[k].sup ? '→' : sep} ${nm(E[k].b)}`;
  const fDesc = (k, f) => G.directed || E[k].sup ? fmt(f) : Math.abs(f) <= 1e-9 ? '0' : `${fmt(Math.abs(f))} w stronę ${f > 0 ? nm(E[k].b) : nm(E[k].a)}`;   // krawędź nieskierowana: wartość i kierunek
  const layout = layeredLayout(R.names.length, E.map(e => ({a: e.a, b: e.b, arrow: G.directed || e.sup})), R.s);   // ten sam układ węzłów na wszystkich rysunkach
  const drawing = (edgesOut, cls, title) => layeredSVG(R.names, edgesOut, R.s, {cls, title, layout});
  const sideCls = S => R.names.map((_, k) => k === R.s || (!R.multi && G.sources.includes(k)) ? 'src' : k === R.t ? 'dst' : S && S[k] ? 'sside' : R.multi && G.sources.includes(k) ? 'sside' : '');
  const m = G.edges.length;
  let h = `<h3>Maksymalny przepływ – algorytm Forda-Fulkersona (Edmondsa-Karpa)</h3><p>Sieć ${G.directed ? 'skierowana' : 'nieskierowana'}: ${G.n} węzłów, ${m} ${G.directed ? (m === 1 ? 'łuk' : 'łuków') : (m === 1 ? 'krawędź' : 'krawędzi')}. ` +
    (R.multi ? `Źródła: ${G.sources.map(nm).join(', ')}; ujścia: ${G.sinks.map(nm).join(', ')}. Dodajemy superźródło S* połączone ze wszystkimi źródłami i superujście T*, do którego prowadzą łuki ze wszystkich ujść – oba o przepustowości nieograniczonej. Szukamy przepływu z S* do T*.`
      : `Źródło: <b>${nm(R.s)}</b>, ujście: <b>${nm(R.t)}</b>.`) + (G.directed ? '' : ' Krawędź nieskierowana przepuszcza przepływ w dowolną stronę, do swojej przepustowości.') + '</p>';
  h += '<p class="hint">W każdej iteracji szukamy w sieci rezydualnej ścieżki powiększającej o najmniejszej liczbie łuków (przeszukiwanie wszerz). Przepustowość rezydualna łuku to ile jeszcze można nim przesłać; łuk wsteczny pozwala cofnąć wcześniejszy przepływ. Przez ścieżkę przesyłamy δ = najmniejszą przepustowość rezydualną na niej. Gdy ścieżki już nie ma, przepływ jest maksymalny.</p>';
  const resDraw = (rn, path, S, title) => drawing(rn.map(x => {
    const onPath = path && path.some(p => p.u === x.u && p.v === x.v), isBack = !G.directed ? false : !E.some(e => e.a === x.u && e.b === x.v);
    return {a: x.u, b: x.v, label: cap(x.r), cls: onPath ? 'path' : isBack ? 'tree' : 'other'};
  }), sideCls(S), title);
  R.iters.forEach((it, k) => {
    const nodes = [it.path[0].u, ...it.path.map(p => p.v)].map(nm).join(' → ');
    let txt = `Ścieżka powiększająca (${it.path.length} ${it.path.length === 1 ? 'łuk' : it.path.length < 5 ? 'łuki' : 'łuków'}): <b>${nodes}</b>. Przepustowości rezydualne na ścieżce: ` +
      it.path.map(p => `${nm(p.u)}→${nm(p.v)}: ${cap(p.r)}${p.back ? ' (łuk wsteczny)' : ''}`).join(', ') + '. ';
    if (it.delta === Infinity) txt += 'Wszystkie mają przepustowość nieograniczoną, więc przepływ jest <b>nieograniczony</b>.';
    else {
      txt += `δ = ${fmt(it.delta)}. Zmiany przepływu: ` + it.path.map(p => `${eTxt(p.edge)}: ${fDesc(p.edge, it.before[p.edge])} → ${fDesc(p.edge, it.after[p.edge])}` +
        (p.back ? ' – <b>przepływ wsteczny</b>: cofamy część wcześniejszego przepływu, przekierowując go inną drogą' : '')).join('; ') + `. Łączny przepływ: <b>${fmt(it.total)}</b>.`;
    }
    h += `<div class="step"><h4>Iteracja ${k + 1}</h4><p>${txt}</p><details class="adv"><summary>Sieć rezydualna przed iteracją ${k + 1}</summary>${resDraw(it.residual, it.path, null, 'Sieć rezydualna')}</details></div>`;
  });
  if (R.status === 'unbounded') return h + '<p class="note">Przepływ jest nieograniczony – szczegóły przy tabeli danych.</p>';
  h += `<div class="step"><h4>${R.iters.length ? 'Koniec' : 'Start'}</h4><p>W sieci rezydualnej nie ma ${R.iters.length ? 'już ' : ''}ścieżki ze ${R.multi ? 'S*' : 'źródła'} do ${R.multi ? 'T*' : 'ujścia'} – przepływ jest maksymalny. Węzły osiągalne ze ${R.multi ? 'S*' : 'źródła'} (zielone) tworzą zbiór S przekroju minimalnego.</p>` +
    `<details class="adv"><summary>Końcowa sieć rezydualna</summary>${resDraw(R.finalResidual, null, R.S, 'Końcowa sieć rezydualna')}</details></div>`;
  h += `<div class="sum"><b>Wynik:</b> maksymalny przepływ = <b>${fmt(R.F)}</b>.</div>`;
  const cutSet = new Set(R.cut.map(c => c.k));
  h += '<h4>Przepływ na łukach</h4><div class="tw"><table><tr><th>' + (G.directed ? 'Łuk' : 'Krawędź') + '</th><th>Przepływ</th><th>Przepustowość</th><th>Wykorzystanie</th></tr>' + G.edges.map((e, k) => {
    const f = R.flow[k], dir = G.directed || f >= 0 ? `${nm(e.a)} → ${nm(e.b)}` : `${nm(e.b)} → ${nm(e.a)}`, full = isFinite(e.c) && Math.abs(Math.abs(f) - e.c) <= 1e-9 && e.c > 0;
    return `<tr${cutSet.has(k) ? ' class="sel"' : ''}><th>${G.directed ? dir : `${nm(e.a)} – ${nm(e.b)}${Math.abs(f) > 1e-9 ? ` <span class="dd">(płynie ${dir})</span>` : ''}`}</th><td>${fmt(Math.abs(f))}</td><td>${cap(e.c)}</td><td>${isFinite(e.c) && e.c > 0 ? fmt(Math.round(Math.abs(f) / e.c * 1000) / 10) + '%' : '–'}${full ? ' (nasycony)' : ''}</td></tr>`;
  }).join('') + '</table></div>';
  h += '<h4>Bilans w węzłach</h4><div class="tw"><table><tr><th>Węzeł</th><th>Dopływ</th><th>Odpływ</th><th>Bilans</th></tr>' + G.names.map((_, v) => {
    const bal = R.outF[v] - R.inF[v], role = G.sources.includes(v) ? 'źródło' : G.sinks.includes(v) ? 'ujście' : '';
    return `<tr><th>${nm(v)}${role ? ` <span class="dd">(${role})</span>` : ''}</th><td>${fmt(R.inF[v])}</td><td>${fmt(R.outF[v])}</td><td>${role === 'źródło' ? fmt(bal) + ' wypływa' : role === 'ujście' ? fmt(-bal) + ' dopływa' : Math.abs(bal) <= 1e-9 ? '0 ✓' : fmt(bal)}</td></tr>`;
  }).join('') + '</table></div><p class="hint">W każdym węźle pośrednim dopływ równa się odpływowi (zachowanie przepływu). Suma wypływu ze źródeł = suma dopływu do ujść = maksymalny przepływ.</p>';
  const Sn = R.names.map((_, k) => k).filter(k => R.S[k] && k < G.n), Tn = R.names.map((_, k) => k).filter(k => !R.S[k] && k < G.n);
  h += `<h4>Przekrój minimalny</h4><p>S = {${Sn.map(nm).join(', ')}}, T = {${Tn.map(nm).join(', ')}}. ${G.directed ? 'Łuki' : 'Krawędzie'} przekroju (z S do T): ` +
    (R.cut.length ? R.cut.map(c => `${nm(c.from)} → ${nm(c.to)} (${cap(c.c)})`).join(', ') : 'brak') + `. Suma przepustowości = <b>${fmt(R.cutCap)}</b> = maksymalny przepływ – zgodnie z twierdzeniem Forda-Fulkersona o maksymalnym przepływie i minimalnym przekroju. ` +
    'To wąskie gardło sieci: większy przepływ wymaga zwiększenia przepustowości któregoś z tych łuków (zwiększenie innych nic nie da).</p>';
  const out = G.edges.map((e, k) => { const f = R.flow[k], rev = !G.directed && f < -1e-9;
    return {a: rev ? e.b : e.a, b: rev ? e.a : e.b, label: `${fmt(Math.abs(f))}/${cap(e.c)}`, arrow: G.directed || Math.abs(f) > 1e-9, cls: cutSet.has(k) ? 'neg' : Math.abs(f) > 1e-9 ? 'tree' : 'other'}; });
  if (R.multi) E.forEach((e, k) => { if (e.sup) out.push({a: e.a, b: e.b, label: fmt(Math.abs(R.flow[k])), cls: 'dummy'}); });
  h += '<h3>Sieć z przepływem</h3><p class="hint">Etykieta: przepływ / przepustowość. Niebieskie – łuki z przepływem, czerwone – przekrój minimalny, szare – nieużywane. Zielone węzły – zbiór S przekroju.</p>' + drawing(out, sideCls(R.S), 'Sieć z przepływem');
  return h;
}
registerModule({id: 'mf', title: 'Maksymalny przepływ', init: mfInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><path d="M6 11c4-5 8-5 12 0M6 13c4 5 8 5 12 0M10 12h4"/></svg>',
  html: '<div class="card"><div id="mf-top"></div><div><button id="btn-mf" type="button">Wyznacz przepływ</button></div><div id="out-mf"></div></div>'});
