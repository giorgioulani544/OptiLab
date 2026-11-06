/* ===== OptiLab – moduł Najkrótsza ścieżka (Dijkstra, Bellman-Ford) =====
   Interfejs (lista krawędzi lub macierz), raport z tabelą etykiet, rysunek grafu z wyróżnioną ścieżką.
   Obliczenia: js/net/shortestpath-solver.js. Wspólne komponenty: js/net/netui.js. */
const SP_MAX = 30, SPP = 'sp-';
const spName = k => k < 26 ? String.fromCharCode(65 + k) : 'V' + (k + 1);
const spData = (directed, names, edges, src, dst, algo = 'dijkstra') => ({directed, names, src, dst, algo,
  edges: edges.map(([a, b, w]) => ({a: names.indexOf(a), b: names.indexOf(b), w: String(w)}))});
const SP_EXAMPLES = [
  {name: 'Park Seervada (Hillier i Lieberman, O → T = 13)', data: spData(false, ['O', 'A', 'B', 'C', 'D', 'E', 'T'], [['O', 'A', 2], ['O', 'B', 5], ['O', 'C', 4], ['A', 'B', 2], ['A', 'D', 7], ['B', 'C', 1], ['B', 'D', 4], ['B', 'E', 3], ['C', 'E', 4], ['D', 'E', 1], ['D', 'T', 5], ['E', 'T', 7]], 0, 6)},
  {name: 'Graf skierowany (Cormen i in.)', data: spData(true, ['s', 't', 'x', 'y', 'z'], [['s', 't', 10], ['s', 'y', 5], ['t', 'x', 1], ['t', 'y', 2], ['y', 't', 3], ['y', 'x', 9], ['y', 'z', 2], ['x', 'z', 4], ['z', 'x', 6], ['z', 's', 7]], 0, 2)},
  {name: 'Trasa Poznań → Warszawa (przybliżone km)', data: spData(false, ['Poznań', 'Bydgoszcz', 'Toruń', 'Konin', 'Łódź', 'Wrocław', 'Warszawa'], [['Poznań', 'Bydgoszcz', 130], ['Bydgoszcz', 'Toruń', 50], ['Toruń', 'Warszawa', 210], ['Poznań', 'Konin', 110], ['Konin', 'Łódź', 125], ['Łódź', 'Warszawa', 135], ['Konin', 'Toruń', 125], ['Poznań', 'Wrocław', 180], ['Wrocław', 'Łódź', 220]], 0, 6)},
  {name: 'Wagi ujemne – Bellman-Ford (Cormen i in.)', data: spData(true, ['s', 't', 'x', 'y', 'z'], [['s', 't', 6], ['s', 'y', 7], ['t', 'x', 5], ['t', 'y', 8], ['t', 'z', -4], ['x', 't', -2], ['y', 'x', -3], ['y', 'z', 9], ['z', 's', 2], ['z', 'x', 7]], 0, -1, 'bf')},
  {name: 'Ujemny cykl (pokaz komunikatu)', data: spData(true, ['A', 'B', 'C', 'D'], [['A', 'B', 4], ['B', 'C', -2], ['C', 'D', 3], ['D', 'B', -3]], 0, 3, 'bf')},
  {name: 'Węzeł nieosiągalny', data: spData(true, ['A', 'B', 'C', 'D'], [['A', 'B', 3], ['B', 'C', 2], ['D', 'A', 1]], 0, 3)},
];
let SPS = {...JSON.parse(JSON.stringify(SP_EXAMPLES[0].data)), mode: 'list'};
function spNormalize(d) {
  if (!d || !Array.isArray(d.names) || !Array.isArray(d.edges)) throw new Error('to nie jest zadanie najkrótszej ścieżki.');
  const n = d.names.length; if (n < 2 || n > SP_MAX) throw new Error(`dozwolone jest od 2 do ${SP_MAX} węzłów (jest ${n}).`);
  const idx = v => Number.isInteger(v) && v >= 0 && v < n;
  if (d.edges.some(e => !idx(e.a) || !idx(e.b))) throw new Error('krawędź wskazuje na nieistniejący węzeł.');
  return {directed: !!d.directed, names: d.names.map(String), edges: d.edges.map(e => ({a: e.a, b: e.b, w: String(e.w ?? '0')})),
    src: idx(d.src) ? d.src : 0, dst: idx(d.dst) ? d.dst : -1, algo: d.algo === 'bf' ? 'bf' : 'dijkstra', mode: SPS.mode};
}
/* CSV: wiersze „od;do;waga", opcjonalnie „węzły;…", „graf;skierowany|nieskierowany", „start;…", „cel;…" */
function spToCSV(d) {
  const v = s => String(s).replace('.', ',');
  const L = [['węzły', ...d.names], ['graf', d.directed ? 'skierowany' : 'nieskierowany'], ['start', d.names[d.src]], ...(d.dst >= 0 ? [['cel', d.names[d.dst]]] : []), ['od', 'do', 'waga'], ...d.edges.map(e => [d.names[e.a], d.names[e.b], v(e.w)])];
  return '\uFEFF' + L.map(r => r.join(';')).join('\r\n') + '\r\n';
}
function spFromCSV(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), first = lines.find(l => l.trim());
  if (!first) throw new Error('plik jest pusty.');
  const sep = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
  const d = {directed: true, names: [], edges: [], src: 0, dst: -1}, id = s => { let k = d.names.indexOf(s); if (k < 0) { d.names.push(s); k = d.names.length - 1; } return k; };
  let start = null, goal = null;
  lines.forEach((raw, k) => {
    if (!raw.trim()) return; const c = raw.split(sep).map(s => s.trim()), h = c[0].toLowerCase(), ln = k + 1;
    if (h === 'węzły' || h === 'wezly') { c.slice(1).filter(Boolean).forEach(id); return; }
    if (h === 'graf') { d.directed = !/^nie/i.test(c[1] || ''); return; }
    if (h === 'start') { start = c[1]; return; } if (h === 'cel') { goal = c[1]; return; }
    if (h === 'od') return;
    if (c.length < 3 || !c[0] || !c[1]) throw new Error(`wiersz ${ln}: oczekiwano „od; do; waga".`);
    const w = Number((c[2] || '').replace(/\s/g, '').replace(sep === ',' ? /$^/ : ',', '.'));
    if (c[2] === '' || !isFinite(w)) throw new Error(`wiersz ${ln}: waga „${c[2]}" nie jest liczbą.`);
    d.edges.push({a: id(c[0]), b: id(c[1]), w: String(w)});
  });
  if (!d.edges.length) throw new Error('brak krawędzi (wierszy „od; do; waga").');
  if (start !== null) { if (d.names.indexOf(start) < 0) throw new Error(`start „${start}" nie jest węzłem grafu.`); d.src = d.names.indexOf(start); }
  if (goal !== null) { if (d.names.indexOf(goal) < 0) throw new Error(`cel „${goal}" nie jest węzłem grafu.`); d.dst = d.names.indexOf(goal); }
  return d;
}
/* ---------- formularz ---------- */
const spOpts = (sel, extra = '') => extra + SPS.names.map((nm, k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(nm)}</option>`).join('');
function spRender() {
  const n = SPS.names.length;
  $('#' + SPP + 'n').value = n; $('#' + SPP + 'dir').value = SPS.directed ? '1' : '0'; $('#' + SPP + 'mode').value = SPS.mode; $('#' + SPP + 'algo').value = SPS.algo;
  $('#' + SPP + 'src').innerHTML = spOpts(SPS.src); $('#' + SPP + 'dst').innerHTML = spOpts(SPS.dst, `<option value="-1"${SPS.dst < 0 ? ' selected' : ''}>wszystkie węzły</option>`);
  $('#' + SPP + 'names').innerHTML = '<span class="hint">Nazwy węzłów:</span>' + SPS.names.map((nm, k) => `<input class="nm" id="${SPP}nm${k}" value="${esc(nm)}" aria-label="nazwa węzła ${k + 1}">`).join('');
  const box = $('#' + SPP + 'edges');
  if (SPS.mode === 'matrix') {
    const cells = Array.from({length: n}, () => Array(n).fill(''));
    SPS.edges.forEach(e => { if (e.a !== e.b) { cells[e.a][e.b] = e.w; if (!SPS.directed) cells[e.b][e.a] = e.w; } });
    box.innerHTML = matrixHTML(SPP, {rn: SPS.names, cn: SPS.names, cells}, {corner: 'Od \\ Do', staticNames: true, blank: true, diag: true, noMsg: true}) +
      `<p class="hint">Puste pole = brak krawędzi.${SPS.directed ? '' : ' W grafie nieskierowanym wystarczy wypełnić jedno z pól (A, B) lub (B, A).'}</p>`;
  } else {
    box.innerHTML = '<div class="tw"><table class="mx elist"><tr><th>Od</th><th>Do</th><th>Waga</th><th></th></tr>' + SPS.edges.map((e, k) =>
      `<tr><td><select id="${SPP}a${k}" aria-label="krawędź ${k + 1}: od">${spOpts(e.a)}</select></td><td><select id="${SPP}b${k}" aria-label="krawędź ${k + 1}: do">${spOpts(e.b)}</select></td>` +
      `<td><input class="num" data-num inputmode="decimal" id="${SPP}w${k}" value="${esc(e.w)}" aria-label="krawędź ${k + 1}: waga"></td><td><button type="button" class="ghost" data-del="${k}" aria-label="usuń krawędź ${k + 1}">✕</button></td></tr>`).join('') +
      `</table></div><div class="crow"><button id="${SPP}add" type="button" class="ghost">+ krawędź</button><span class="hint">${SPS.edges.length} ${SPS.edges.length === 1 ? 'krawędź' : 'krawędzi'}</span></div>`;
    $('#' + SPP + 'add').onclick = () => { spSync(); SPS.edges.push({a: 0, b: Math.min(1, n - 1), w: '1'}); spRender(); };
  }
  matrixPolish(box); $('#' + SPP + 'names').querySelectorAll('input.nm').forEach(growName);
}
function spSync() {                                                  // formularz → SPS (krawędzie z listy albo z macierzy)
  const n = SPS.names.length;
  SPS.names = SPS.names.map((v, k) => $('#' + SPP + 'nm' + k)?.value ?? v);
  SPS.directed = $('#' + SPP + 'dir').value === '1'; SPS.src = +$('#' + SPP + 'src').value; SPS.dst = +$('#' + SPP + 'dst').value; SPS.algo = $('#' + SPP + 'algo').value;
  if (SPS.mode === 'matrix') {
    if (!$('#' + SPP + 'c0_1')) return;
    const E = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue; const v = $('#' + SPP + `c${i}_${j}`).value.trim(); if (v === '') continue;
      if (!SPS.directed) { const u = $('#' + SPP + `c${j}_${i}`).value.trim(); if (j < i && u !== '') continue; }
      E.push({a: i, b: j, w: v, id: `c${i}_${j}`});
    }
    SPS.edges = E;
  } else if ($('#' + SPP + 'w0') || !SPS.edges.length) SPS.edges = SPS.edges.map((e, k) => ({a: +($('#' + SPP + 'a' + k)?.value ?? e.a), b: +($('#' + SPP + 'b' + k)?.value ?? e.b), w: $('#' + SPP + 'w' + k)?.value ?? e.w, id: 'w' + k}));
}
function spInit() {
  const opts = Array.from({length: SP_MAX - 1}, (_, k) => `<option>${k + 2}</option>`).join('');
  $('#' + SPP + 'top').innerHTML = `<div class="crow"><label for="${SPP}n">Węzły</label><select id="${SPP}n">${opts}</select><select id="${SPP}dir" aria-label="Rodzaj grafu"><option value="1">graf skierowany</option><option value="0">graf nieskierowany</option></select></div>
    <div class="crow"><label for="${SPP}src">Start</label><select id="${SPP}src"></select><label for="${SPP}dst">Cel</label><select id="${SPP}dst"></select></div>
    ${netCopyHTML(SPP)}<div class="crow" id="${SPP}names"></div><div id="${SPP}edges"></div><div id="${SPP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>
     <div class="crow"><label for="${SPP}mode">Wpisywanie krawędzi</label><select id="${SPP}mode"><option value="list">lista krawędzi</option><option value="matrix">macierz wag</option></select></div>
     <div class="crow"><label for="${SPP}algo">Algorytm</label><select id="${SPP}algo"><option value="dijkstra">Dijkstry (wagi nieujemne)</option><option value="bf">Bellmana-Forda (dopuszcza wagi ujemne)</option></select></div>
     ${netToolsHTML(SPP, SP_EXAMPLES)}</details>
    <p class="hint">Wpisz krawędzie z wagami (odległość, czas, koszt). Program wyznaczy najkrótsze ścieżki ze startu do celu i do wszystkich pozostałych węzłów.</p>`;
  $('#' + SPP + 'n').onchange = e => {
    spSync(); const n = +e.target.value;
    SPS.names = Array.from({length: n}, (_, k) => SPS.names[k] ?? spName(k)); SPS.edges = SPS.edges.filter(x => x.a < n && x.b < n);
    if (SPS.src >= n) SPS.src = 0; if (SPS.dst >= n) SPS.dst = -1; clearErr(); spRender();
  };
  ['dir', 'mode'].forEach(k => $('#' + SPP + k).onchange = () => { spSync(); SPS.mode = $('#' + SPP + 'mode').value; clearErr(); spRender(); });
  $('#' + SPP + 'names').addEventListener('change', () => { spSync(); spRender(); });
  $('#' + SPP + 'names').addEventListener('input', e => growName(e.target));
  const box = $('#' + SPP + 'edges'); matrixWire(box);
  box.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; spSync(); SPS.edges.splice(+k, 1); clearErr(); spRender(); });
  netToolsWire(SPP, {kind: 'sp', out: '#out-sp', examples: SP_EXAMPLES, normalize: spNormalize,
    get: () => { spSync(); const {mode, ...d} = JSON.parse(JSON.stringify(SPS)); d.edges = d.edges.map(({a, b, w}) => ({a, b, w})); return d; },
    set: d => { SPS = d; spRender(); }, toCSV: spToCSV, fromCSV: spFromCSV});
  $('#btn-sp').onclick = spSolve;
  spRender();
}
function spRead() {
  clearErr(); spSync();
  const out = '#out-sp', names = SPS.names.map((s, k) => String(s).trim() || spName(k));
  const dup = names.find((s, k) => names.indexOf(s) !== k);
  if (dup !== undefined) return netFail(SPP, out, `nazwy węzłów muszą być różne – powtarza się „${esc(dup)}".`, names.map((s, k) => s === dup ? 'nm' + k : null).filter(Boolean));
  if (!SPS.edges.length) return netFail(SPP, out, 'dodaj co najmniej jedną krawędź.', SPS.mode === 'list' ? ['add'] : []);
  const bad = [], loops = [], edges = SPS.edges.map(e => {
    const s = String(e.w).trim().replace(',', '.'), w = Number(s);
    if (s === '' || !isFinite(w) || Math.abs(w) > 1e9) bad.push(e.id); if (e.a === e.b) loops.push(SPS.mode === 'list' ? e.id.replace('w', 'a') : e.id);
    return {a: e.a, b: e.b, w, id: e.id};
  });
  if (bad.length) return netFail(SPP, out, 'wpisz w zaznaczonych polach wagi będące liczbami.', bad);
  if (loops.length) return netFail(SPP, out, 'krawędź nie może łączyć węzła z nim samym (pętla).', loops);
  if (!SPS.directed && SPS.mode === 'matrix') {
    const clash = edges.filter(e => { const u = $('#' + SPP + `c${e.b}_${e.a}`)?.value.trim(); return u && u !== '' && Number(u.replace(',', '.')) !== e.w; });
    if (clash.length) return netFail(SPP, out, 'w grafie nieskierowanym wartości w polach (A, B) i (B, A) muszą być równe – albo wypełnij tylko jedno z nich.', clash.flatMap(e => [e.id, `c${e.b}_${e.a}`]));
  }
  const neg = edges.filter(e => e.w < 0);
  if (neg.length && SPS.algo === 'dijkstra') return netFail(SPP, out, `algorytm Dijkstry wymaga wag nieujemnych, a ujemne wagi mają: ${neg.map(e => `${esc(names[e.a])} → ${esc(names[e.b])} (${fmt(e.w)})`).join(', ')}. ` +
    'Wybierz algorytm Bellmana-Forda w Opcjach zaawansowanych – dopuszcza wagi ujemne i wykrywa ujemne cykle.', neg.map(e => e.id));
  return {n: names.length, names, directed: SPS.directed, src: SPS.src, dst: SPS.dst, algo: SPS.algo, edges};
}
function spSolve() {
  const G = spRead(); if (!G) return;
  const R = G.algo === 'bf' ? bellmanFord(G) : dijkstra(G), h = spReportHTML(G, R);
  $('#out-sp').innerHTML = h; last.sp = h;
  if (R.status === 'negcycle') {
    const ids = []; for (let k = 0; k + 1 < R.cycle.length; k++) { const e = G.edges.find(x => (x.a === R.cycle[k] && x.b === R.cycle[k + 1]) || (!G.directed && x.b === R.cycle[k] && x.a === R.cycle[k + 1])); if (e) ids.push(e.id); }
    netFail(SPP, null, `graf zawiera ujemny cykl ${R.cycle.map(k => esc(G.names[k])).join(' → ')} o sumie wag ${fmt(R.cycleSum)}. Krążąc po nim, można dowolnie skracać „długość", więc najkrótsza ścieżka nie istnieje.`, ids);
  }
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function spReportHTML(G, R) {
  const nm = k => esc(G.names[k]), dv = v => isFinite(v) ? fmt(v) : '∞', lab = (d, p) => dv(d) + (p >= 0 && isFinite(d) ? ` <span class="dd">(${nm(p)})</span>` : '');
  const m = G.edges.length;
  let h = `<h3>Najkrótsza ścieżka – algorytm ${R.algo === 'bf' ? 'Bellmana-Forda' : 'Dijkstry'}</h3><p>Graf ${G.directed ? 'skierowany' : 'nieskierowany'}: ${G.n} węzłów, ${m} ${m === 1 ? 'krawędź' : m % 10 >= 2 && m % 10 <= 4 && (m % 100 < 10 || m % 100 >= 20) ? 'krawędzie' : 'krawędzi'}. Start: <b>${nm(G.src)}</b>.</p>`;
  const head = '<tr><th>' + (R.algo === 'bf' ? 'Przebieg' : 'Krok') + '</th>' + (R.algo === 'bf' ? '' : '<th>Utrwalony</th>') + G.names.map((_, k) => `<th>${nm(k)}</th>`).join('') + '</tr>';
  if (R.algo === 'dijkstra') {
    h += '<p class="hint">Każdy węzeł ma etykietę: długość najkrótszej znanej ścieżki ze startu (w nawiasie – poprzednik). W każdym kroku etykieta tymczasowa o najmniejszej wartości staje się stała (złote pole), a potem poprawiamy etykiety jej sąsiadów (niebieskie pola). Puste pola – węzły już utrwalone.</p>';
    h += `<details class="adv"${R.steps.length <= 12 ? ' open' : ''}><summary>Opis kroków (${R.steps.length})</summary>` + R.steps.map((s, k) => `<div class="step"><h4>Krok ${k + 1}</h4><p>${s.text}</p></div>`).join('') + '</details>';
    h += '<h4>Tabela etykiet</h4><div class="tw"><table class="tt lab">' + head + R.steps.map((s, k) => {
      const before = k ? R.steps[k - 1].perm : Array(G.n).fill(false), upd = new Set(s.upd.filter(q => q.better).map(q => q.v));
      return `<tr><th>${k + 1}</th><td>${nm(s.u)}</td>` + G.names.map((_, v) => before[v] ? '<td class="out"></td>' : v === s.u ? `<td class="pivot">${lab(s.d[v], s.pred[v])} ✓</td>` : `<td class="${upd.has(v) ? 'pr' : ''}">${lab(s.d[v], s.pred[v])}</td>`).join('') + '</tr>';
    }).join('') + '</table></div>';
  } else {
    h += '<p class="hint">Bellman-Ford w każdym przebiegu sprawdza wszystkie łuki i poprawia etykiety (niebieskie pola). Po co najwyżej n − 1 przebiegach etykiety są ostateczne. Jeśli w kolejnym przebiegu nadal coś się poprawia – w grafie jest ujemny cykl.</p>';
    h += '<div class="tw"><table class="tt lab">' + head + R.iters.map((s, k) => { const imp = new Set(s.imp.map(q => q.v)); return `<tr><th>${k}</th>` + G.names.map((_, v) => `<td class="${imp.has(v) ? 'pr' : ''}">${lab(s.d[v], s.pred[v])}</td>`).join('') + '</tr>'; }).join('') + '</table></div>';
    h += '<details class="adv"><summary>Opis przebiegów</summary>' + R.iters.map((s, k) => `<div class="step"><h4>${k ? 'Przebieg ' + k : 'Start'}</h4><p>${s.text}</p></div>`).join('') + '</details>';
    if (R.status === 'negcycle') {
      const cyc = new Set(); for (let k = 0; k + 1 < R.cycle.length; k++) cyc.add(R.cycle[k] + '>' + R.cycle[k + 1]);
      h += `<p class="note">Po ${G.n - 1} przebiegach łuk nadal poprawia etykietę, więc graf zawiera <b>ujemny cykl</b>: ${R.cycle.map(nm).join(' → ')} (suma wag ${fmt(R.cycleSum)}). Najkrótsza ścieżka nie istnieje – każdy kolejny obieg cyklu skraca „długość".</p>`;
      return h + '<h3>Graf</h3>' + layeredSVG(G.names, G.edges.map(e => ({a: e.a, b: e.b, label: fmt(e.w), arrow: G.directed, cls: cyc.has(e.a + '>' + e.b) || (!G.directed && cyc.has(e.b + '>' + e.a)) ? 'path neg' : 'other'})), G.src, {cls: G.names.map((_, k) => k === G.src ? 'src' : '')});
    }
  }
  // wyniki
  const pathTxt = p => p.map(nm).join(' → ');
  h += '<h4>Najkrótsze ścieżki ze startu</h4><div class="tw"><table><tr><th>Węzeł</th><th>Odległość</th><th>Najkrótsza ścieżka</th></tr>' + G.names.map((_, v) => {
    if (v === G.src) return `<tr><th>${nm(v)}</th><td>0</td><td class="tl">start</td></tr>`;
    if (!isFinite(R.d[v])) return `<tr><th>${nm(v)}</th><td>∞</td><td class="tl">brak ścieżki – węzeł nieosiągalny</td></tr>`;
    const P = R.paths[v]; return `<tr${v === G.dst ? ' class="sel"' : ''}><th>${nm(v)}</th><td>${fmt(R.d[v])}</td><td class="tl">${P.paths.map(pathTxt).join('<br>')}${P.count > P.paths.length ? `<br><span class="dd">… i jeszcze ${P.count - P.paths.length}</span>` : ''}${P.count > 1 ? ` <span class="dd">(${P.count} najkrótsze ścieżki)</span>` : ''}</td></tr>`;
  }).join('') + '</table></div>';
  let pathEdges = new Set();
  if (G.dst >= 0 && G.dst !== G.src) {
    if (!isFinite(R.d[G.dst])) h += `<div class="sum"><b>Wynik:</b> z węzła ${nm(G.src)} nie da się dojść do ${nm(G.dst)} – brak ścieżki.</div>`;
    else {
      const P = R.paths[G.dst], p = P.paths[0]; for (let k = 1; k < p.length; k++) pathEdges.add(p[k - 1] + '>' + p[k]);
      h += `<div class="sum"><b>Wynik:</b> najkrótsza ścieżka ${nm(G.src)} → ${nm(G.dst)}: <b>${pathTxt(p)}</b>, długość <b>${fmt(R.d[G.dst])}</b>.</div>` +
        (P.count > 1 ? `<p class="note">Istnieją ścieżki alternatywne o tej samej długości (razem ${P.count}): ${P.paths.slice(1).map(pathTxt).join('; ')}${P.count > P.paths.length ? ' …' : ''}.</p>` : '');
    }
  } else h += `<div class="sum"><b>Wynik:</b> wyznaczono najkrótsze ścieżki z ${nm(G.src)} do wszystkich węzłów – na rysunku drzewo najkrótszych ścieżek.</div>`;
  if (R.unreachable.length) h += `<p>Węzły nieosiągalne ze startu: ${R.unreachable.map(nm).join(', ')}.</p>`;
  // rysunek: drzewo najkrótszych ścieżek (niebieskie), ścieżka do celu (pogrubiona)
  const tree = new Set(R.pred.map((p, v) => p >= 0 ? p + '>' + v : null).filter(Boolean)), used = new Set();
  const cls = e => {                                                  // tylko krawędzie „napięte" (d[a] + w = d[b]) mogą należeć do drzewa i ścieżki
    const f = e.a + '>' + e.b, r = e.b + '>' + e.a, tight = (x, y) => isFinite(R.d[x]) && Math.abs(R.d[x] + e.w - R.d[y]) <= 1e-9 * (1 + Math.abs(R.d[y]));
    const onPath = (pathEdges.has(f) && tight(e.a, e.b)) || (!G.directed && pathEdges.has(r) && tight(e.b, e.a));
    const onTree = (tree.has(f) && tight(e.a, e.b)) || (!G.directed && tree.has(r) && tight(e.b, e.a));
    if (!onPath && !onTree) return 'other';
    const key = [e.a, e.b].sort((x, y) => x - y).join('-'); if (used.has(key)) return 'other'; used.add(key);   // krawędzie równoległe: wyróżniamy jedną
    return onPath ? 'path' : 'tree';
  };
  h += '<h3>Graf</h3><p class="hint">Niebieskie – drzewo najkrótszych ścieżek, pogrubione – ścieżka do celu, szare – pozostałe krawędzie. Pod węzłem: odległość od startu.</p>' +
    layeredSVG(G.names, G.edges.map(e => ({a: e.a, b: e.b, label: fmt(e.w), arrow: G.directed, cls: cls(e)})), G.src,
      {sub: R.d.map(v => 'd = ' + dv(v)), cls: G.names.map((_, k) => k === G.src ? 'src' : k === G.dst ? 'dst' : !isFinite(R.d[k]) ? 'dummy' : ''), title: 'Graf z najkrótszymi ścieżkami'});
  return h;
}
registerModule({id: 'sp', title: 'Najkrótsza ścieżka', init: spInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="20" cy="15" r="2"/><path d="M5.3 15.5l5.4-7M13.6 8.2l5 5.4"/></svg>',
  html: '<div class="card"><div id="sp-top"></div><div><button id="btn-sp" type="button">Wyznacz ścieżki</button></div><div id="out-sp"></div></div>'});
