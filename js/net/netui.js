/* ===== OptiLab – fundamenty modeli sieciowych (wspólne komponenty interfejsu) =====
   Edytor macierzy (koszty, nazwy, opcjonalna kolumna i wiersz dodatkowy – np. podaż i popyt), błędy przy polach,
   rysowanie sieci (SVG, drukuje się w PDF), narzędzia danych (kopiuj/wklej, .json, .csv, przykłady), CSV macierzy.
   Korzystają z tego moduły: Transport, a w kolejnych etapach Przydział, Najkrótsza ścieżka, Maksymalny przepływ. */
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);

/* ---------- edytor macierzy: st = {rn: nazwy wierszy, cn: nazwy kolumn, cells: [[tekst]], xc: kolumna dodatkowa, xr: wiersz dodatkowy} ---------- */
function matrixHTML(p, st, o) {
  // o: {corner, xcLabel, xrLabel, allowM, staticNames (nagłówki jako tekst), blank (pusta komórka = brak wartości), diag (przekątna wyłączona), noMsg}
  const cell = (id, v, extra = '') => `<input class="num" data-num${extra}${o.blank ? ' data-blank' : ''} inputmode="decimal" id="${p}${id}" value="${esc(v)}" aria-label="${id}">`;
  const name = (id, v, lbl) => o.staticNames ? esc(v) : `<input class="nm" id="${p}${id}" value="${esc(v)}" aria-label="${lbl}">`;
  let h = `<div class="tw"><table class="mx"><tr><th>${o.corner || ''}</th>` + st.cn.map((v, j) => `<th>${name('cn' + j, v, 'nazwa kolumny ' + (j + 1))}</th>`).join('') + (o.xcLabel ? `<th>${o.xcLabel}</th>` : '') + '</tr>';
  st.rn.forEach((r, i) => {
    h += `<tr><th>${name('rn' + i, r, 'nazwa wiersza ' + (i + 1))}</th>` + st.cn.map((_, j) => o.diag && i === j ? '<td class="diag">—</td>' : `<td>${cell(`c${i}_${j}`, st.cells[i][j], o.allowM ? ' data-m' : '')}</td>`).join('') +
      (o.xcLabel ? `<td class="xc">${cell('xc' + i, st.xc[i])}</td>` : '') + '</tr>';
  });
  if (o.xrLabel) h += `<tr><th>${o.xrLabel}</th>` + st.cn.map((_, j) => `<td class="xc">${cell('xr' + j, st.xr[j])}</td>`).join('') + (o.xcLabel ? '<td></td>' : '') + '</tr>';
  return h + '</table></div>' + (o.noMsg ? '' : `<div id="${p}msg"></div>`);
}
function matrixSync(p, st) {
  const g = (id, v) => $('#' + p + id)?.value ?? v;
  st.rn = st.rn.map((v, i) => g('rn' + i, v)); st.cn = st.cn.map((v, j) => g('cn' + j, v));
  st.cells = st.cells.map((r, i) => r.map((v, j) => g(`c${i}_${j}`, v)));
  if (st.xc) st.xc = st.xc.map((v, i) => g('xc' + i, v)); if (st.xr) st.xr = st.xr.map((v, j) => g('xr' + j, v));
}
function matrixResize(st, m, n, o) {
  const fit = (arr, len, f) => Array.from({length: len}, (_, k) => arr?.[k] ?? f(k));
  st.rn = fit(st.rn, m, k => o.rowPre + (k + 1)); st.cn = fit(st.cn, n, k => o.colPre + (k + 1));
  st.cells = fit(st.cells, m, () => []).map(r => fit(r, n, () => '0'));
  if (st.xc) st.xc = fit(st.xc, m, () => '0'); if (st.xr) st.xr = fit(st.xr, n, () => '0');
}
/* Zachowanie pól: jak w Excelu (zaznacz przy wejściu, „0" się czyści, puste wraca do 0), M = trasa zakazana,
   tryb zaznaczania tras zakazanych dotknięciem (bez klawiatury – wygodne na telefonie) */
function matrixWire(box, o = {}) {
  const mark = t => t.classList.toggle('forb', t.value === 'M');
  box.addEventListener('input', e => {
    const t = e.target; if (t.classList?.contains('nm')) growName(t); if (!t.hasAttribute('data-num')) return;
    let v = t.value;
    if (t.hasAttribute('data-m') && /^\s*[mM]\s*$/.test(v)) v = 'M';
    else { v = v.replace(/[^0-9,.\-]/g, '').replace(/(?!^)-/g, ''); const q = v.search(/[.,]/); if (q >= 0) v = v.slice(0, q + 1) + v.slice(q + 1).replace(/[.,]/g, ''); }
    t.value = v; grow(t); mark(t); t.classList.remove('bad');
  });
  box.addEventListener('pointerdown', e => {
    const t = e.target; if (!(o.forbidMode && o.forbidMode() && t.hasAttribute?.('data-m'))) return;
    e.preventDefault();
    if (t.value === 'M') t.value = t.dataset.prev || '0'; else { t.dataset.prev = t.value; t.value = 'M'; }
    mark(t); grow(t); t.classList.remove('bad');
  });
  box.addEventListener('focusin', e => {
    const t = e.target; if (t.tagName !== 'INPUT') return;
    if (t.hasAttribute('data-num') && ['0', '0.0', '0,0'].includes(t.value.trim())) { t.value = ''; grow(t); } else setTimeout(() => t.select(), 0);
  });
  box.addEventListener('focusout', e => { const t = e.target; if (t.hasAttribute?.('data-num') && !t.hasAttribute('data-blank') && t.value.trim() === '') { t.value = '0'; grow(t); } });
}
const growName = t => { t.style.width = Math.max(44, String(t.value).length * 9 + 26) + 'px'; };   // pole nazwy rośnie z tekstem
const matrixPolish = box => { box.querySelectorAll('input.num').forEach(t => { grow(t); t.classList.toggle('forb', t.value === 'M'); }); box.querySelectorAll('input.nm').forEach(growName); };

/* ---------- błąd: czerwone pola + komunikat pod tabelą danych ---------- */
function netFail(p, out, msg, ids = []) {
  clearErr();
  ids.forEach(id => $('#' + p + id)?.classList.add('bad'));
  $('#' + p + 'msg').innerHTML = `<div class="fmsg">Błąd: ${msg}</div>`;
  if (out) $(out).innerHTML = '';
  ($('#' + p + ids[0]) || $('#' + p + 'msg'))?.scrollIntoView?.({block: 'center'});
  return null;
}

/* ---------- rysowanie sieci (SVG): węzły-prostokąty, krawędzie ze strzałkami i etykietami ---------- */
let netSvgId = 0;
function networkSVG(nodes, edges, o) {
  const id = 'ns' + (++netSvgId), r1 = v => Math.round(v * 10) / 10;
  let s = `<svg class="netsvg" viewBox="0 0 ${o.width} ${o.height}" style="max-width:${Math.max(o.width, 560)}px" role="img" aria-label="${esc(o.title || 'Sieć')}"><defs>${['', 'other', 'path', 'neg'].map(v => `<marker id="${id}${v}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah ${v}"/></marker>`).join('')}</defs>`;
  const clip = (nd, dx, dy) => {
    if (nd.round) { const L = Math.hypot(dx, dy) || 1; return [nd.x + dx / L * nd.w / 2, nd.y + dy / L * nd.w / 2]; }
    const t = Math.min(nd.w / 2 / (Math.abs(dx) || 1e-9), nd.h / 2 / (Math.abs(dy) || 1e-9)); return [nd.x + dx * t, nd.y + dy * t];
  };
  const edge = e => {                                                      // e.curve: przesunięcie łuku w bok (px), e.arrow === false: bez strzałki
    const A = nodes[e.a], Bn = nodes[e.b], mx = (A.x + Bn.x) / 2, my = (A.y + Bn.y) / 2, L = Math.hypot(Bn.x - A.x, Bn.y - A.y) || 1;
    const cx = mx - (Bn.y - A.y) / L * (e.curve || 0), cy = my + (Bn.x - A.x) / L * (e.curve || 0);
    const [x1, y1] = clip(A, cx - A.x, cy - A.y), [x2, y2] = clip(Bn, cx - Bn.x, cy - Bn.y), arrow = e.arrow === false ? '' : ` marker-end="url(#${id}${/neg/.test(e.cls || '') ? 'neg' : /path/.test(e.cls || '') ? 'path' : /other/.test(e.cls || '') ? 'other' : ''})"`;
    s += e.curve ? `<path class="ed ${e.cls || ''}" d="M${r1(x1)} ${r1(y1)}Q${r1(cx)} ${r1(cy)} ${r1(x2)} ${r1(y2)}" stroke-width="${r1(e.width || 1.5)}"${arrow}/>`
      : `<line class="ed ${e.cls || ''}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke-width="${r1(e.width || 1.5)}"${arrow}/>`;
    if (e.label) {
      const t = e.at ?? .5, qx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * (e.curve ? cx : (x1 + x2) / 2) + t * t * x2, qy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (e.curve ? cy : (y1 + y2) / 2) + t * t * y2;
      s += `<text class="el ${e.cls || ''}" x="${r1(qx)}" y="${r1(qy - 4)}" text-anchor="middle">${esc(e.label)}</text>`;
    }
  };
  edges.filter(e => !/path|tree/.test(e.cls || '')).forEach(edge); edges.filter(e => /path|tree/.test(e.cls || '')).forEach(edge);   // wyróżnione na wierzchu
  nodes.forEach(nd => {
    if (nd.round) { s += `<circle class="nd ${nd.cls || ''}" cx="${r1(nd.x)}" cy="${r1(nd.y)}" r="${nd.w / 2}"/><text x="${r1(nd.x)}" y="${r1(nd.y + 4)}" text-anchor="middle">${esc(nd.label)}</text>` + (nd.sub ? `<text class="sub" x="${r1(nd.x)}" y="${r1(nd.y + nd.w / 2 + 13)}" text-anchor="middle">${esc(nd.sub)}</text>` : ''); return; }
    s += `<rect class="nd ${nd.cls || ''}" x="${r1(nd.x - nd.w / 2)}" y="${r1(nd.y - nd.h / 2)}" width="${nd.w}" height="${nd.h}" rx="10"/>` +
      `<text x="${r1(nd.x)}" y="${r1(nd.y + (nd.sub ? -3 : 4))}" text-anchor="middle">${esc(nd.label)}</text>` + (nd.sub ? `<text class="sub" x="${r1(nd.x)}" y="${r1(nd.y + 12)}" text-anchor="middle">${esc(nd.sub)}</text>` : '');
  });
  return '<div class="tw">' + s + '</svg></div>';                       // na telefonie rysunek przewija się poziomo zamiast maleć
}
function bipartiteSVG(L, R, edges, o = {}) {                            // lewa kolumna → prawa kolumna (np. dostawcy → odbiorcy)
  const W = 680, bw = 150, bh = 40, H = 30 + Math.max(L.length, R.length) * 62, pos = (k, c) => 20 + (k + .5) * (H - 40) / c;
  const nodes = [...L.map((nd, k) => ({...nd, x: 20 + bw / 2, y: pos(k, L.length), w: bw, h: bh})), ...R.map((nd, k) => ({...nd, x: W - 20 - bw / 2, y: pos(k, R.length), w: bw, h: bh}))];
  // etykiety rozsuwamy wzdłuż krawędzi: k-ta krawędź danego źródła dostaje etykietę dalej od niego (mniej nakładania)
  const rank = edges.map(e => edges.filter(f => f.a === e.a && f.b < e.b).length);
  return networkSVG(nodes, edges.map((e, k) => ({...e, b: L.length + e.b, at: Math.min(.8, .14 + .2 * rank[k])})), {width: W, height: H, title: o.title});
}

/* Układ warstwowy: kolumny według liczby krawędzi od startu (BFS), węzły nieosiągalne na końcu.
   Wynik można zapamiętać i użyć dla kilku rysunków tej samej sieci (np. sieci rezydualnych kolejnych iteracji). */
function layeredLayout(n, edges, src) {
  const adj = Array.from({length: n}, () => []);
  edges.forEach(e => { adj[e.a].push(e.b); if (e.arrow === false) adj[e.b].push(e.a); });
  const lev = Array(n).fill(-1); lev[src] = 0; const q = [src];
  while (q.length) { const u = q.shift(); adj[u].forEach(v => { if (lev[v] < 0) { lev[v] = lev[u] + 1; q.push(v); } }); }
  const maxL = Math.max(0, ...lev); lev.forEach((l, k) => { if (l < 0) lev[k] = maxL + 1; });
  const cols = Math.max(...lev) + 1, per = Array.from({length: cols}, (_, c) => lev.map((l, k) => l === c ? k : -1).filter(k => k >= 0));
  const rows = Math.max(...per.map(p => p.length)), W = Math.max(420, 60 + cols * 130), H = 50 + rows * 90, pos = [];
  per.forEach((list, c) => list.forEach((k, r) => { pos[k] = {x: 40 + c * (W - 80) / Math.max(1, cols - 1) + (list.length > 1 && cols > 1 ? (r % 2 ? 24 : -24) : 0), y: 30 + (r + .5) * (H - 50) / list.length + (c % 2 ? 14 : 0)}; }));
  if (cols === 1) pos.forEach(p => { p.x = W / 2; });
  return {pos, W, H};
}
function layeredSVG(names, edges, src, o = {}) {      // names: etykiety węzłów; edges: [{a, b, label, cls, arrow}]; o: {sub, cls, title, layout}
  const L = o.layout || layeredLayout(names.length, edges, src);
  const nodes = names.map((nm, k) => ({...L.pos[k], w: 44, h: 44, round: true, label: nm, sub: o.sub?.[k] ?? '', cls: (o.cls?.[k]) || ''}));
  const pair = new Set(edges.map(e => e.a + '>' + e.b));
  return networkSVG(nodes, edges.map(e => ({...e, curve: e.arrow !== false && pair.has(e.b + '>' + e.a) ? 22 : 0})), {width: L.W, height: L.H + 10, title: o.title});
}

/* ---------- narzędzia danych modułu: kopiuj/wklej, przykłady, .json, .csv ---------- */
const netShared = {};
const netCopyHTML = p => `<div class="crow"><button id="${p}copy" class="ghost" type="button">Kopiuj dane</button><button id="${p}paste" class="ghost" type="button">Wklej dane</button></div>`;
const netToolsHTML = (p, examples) => `<div class="crow"><label for="${p}ex">Przykład</label><select id="${p}ex"><option value="">– wybierz –</option>${examples.map((e, i) => `<option value="${i}">${esc(e.name)}</option>`).join('')}</select></div>
  <div class="crow"><button id="${p}open" class="ghost" type="button">Wczytaj z pliku (.json / .csv)</button><input type="file" id="${p}file" accept=".json,.csv,.txt,application/json,text/csv" hidden></div>
  <div class="crow"><button id="${p}save" class="ghost" type="button">Zapisz (.json)</button><button id="${p}csv" class="ghost" type="button">Eksport do Excela (.csv)</button></div>`;
function netToolsWire(p, cfg) {                                        // cfg: {kind, get, set, normalize, examples, toCSV, fromCSV, out}
  const date = () => new Date().toISOString().slice(0, 10), wrap = d => JSON.stringify({optilab: cfg.kind, ...d});
  const load = d => { cfg.set(cfg.normalize(d)); clearErr(); $(cfg.out).innerHTML = ''; };
  $('#' + p + 'copy').onclick = async e => { const t = wrap(cfg.get()); netShared[cfg.kind] = t; try { await navigator.clipboard.writeText(t); } catch (_) {} flash(e.target, 'Skopiowano ✓'); };
  $('#' + p + 'paste').onclick = async e => {
    let t = null; try { t = await navigator.clipboard.readText(); } catch (_) {}
    for (const src of [t, netShared[cfg.kind]]) { try { const d = JSON.parse(src); if (d && d.optilab === cfg.kind) { load(d); flash(e.target, 'Wklejono ✓'); return; } } catch (_) {} }
    flash(e.target, 'Brak skopiowanych danych', true);
  };
  $('#' + p + 'ex').onchange = e => { if (e.target.value === '') return; load(JSON.parse(JSON.stringify(cfg.examples[+e.target.value].data))); e.target.value = ''; };
  $('#' + p + 'save').onclick = e => { download(wrap(cfg.get()), `optilab-${cfg.kind}-${date()}.json`, 'application/json'); flash(e.target, 'Zapisano ✓'); };
  $('#' + p + 'csv').onclick = e => { download(cfg.toCSV(cfg.get()), `optilab-${cfg.kind}-${date()}.csv`, 'text/csv'); flash(e.target, 'Zapisano ✓'); };
  $('#' + p + 'open').onclick = () => $('#' + p + 'file').click();
  $('#' + p + 'file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const btn = $('#' + p + 'open');
    try {
      const txt = await f.text(); let d;
      if (txt.trim().startsWith('{')) { d = JSON.parse(txt); if (d.optilab !== cfg.kind) throw new Error('to plik z innego modułu OptiLab.'); }
      else d = cfg.fromCSV(txt);
      load(d); flash(btn, 'Wczytano ✓');
    } catch (err) { netFail(p, null, `nie udało się wczytać pliku „${esc(f.name)}" – ${err instanceof SyntaxError ? 'plik JSON jest uszkodzony.' : err.message}`, ['open']); }
    e.target.value = '';
  };
}

/* ---------- CSV macierzy (Excel): nagłówek z nazwami kolumn, wiersze z nazwą, wiersz dodatkowy i „cel" ---------- */
function matrixToCSV(st, o) {
  const v = s => String(s).replace('.', ','), q = c => /[;"\r\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c;
  const L = [['', ...st.cn, ...(o.xc ? [o.xc] : [])], ...st.rn.map((r, i) => [r, ...st.cells[i].map(v), ...(o.xc ? [v(st.xc[i])] : [])])];
  if (o.xr) L.push([o.xr, ...st.xr.map(v)]);
  L.push(['cel', st.maxi ? 'max' : 'min']);
  return '\uFEFF' + L.map(r => r.map(q).join(';')).join('\r\n') + '\r\n';
}
function matrixFromCSV(text, o) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), first = lines.findIndex(l => l.trim());
  if (first < 0) throw new Error('plik jest pusty.');
  const sep = lines[first].includes(';') ? ';' : lines[first].includes('\t') ? '\t' : ',';
  const split = l => { const c = l.split(sep).map(s => s.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"')); while (c.length > 1 && c[c.length - 1] === '') c.pop(); return c; };
  const head = split(lines[first]), hasXC = !!o.xc && head[head.length - 1].toLowerCase() === o.xc;
  const cn = head.slice(1, hasXC ? -1 : undefined), n = cn.length;
  if (n < 1) throw new Error(`wiersz ${first + 1}: brak nazw kolumn w nagłówku.`);
  const val = (s, ln, allowM) => { const t = String(s ?? '').replace(/\s/g, ''); if (t === '') return '0'; if (allowM && /^m$/i.test(t)) return 'M';
    const x = Number(sep === ',' ? t : t.replace(',', '.')); if (!isFinite(x)) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą${allowM ? ' ani M' : ''}.`); return String(x); };
  const st = {maxi: false, rn: [], cn, cells: [], xc: [], xr: null};
  for (let k = first + 1; k < lines.length; k++) {
    if (!lines[k].trim()) continue;
    const c = split(lines[k]), ln = k + 1, h = c[0].toLowerCase();
    if (h === 'cel') { st.maxi = /^max|^maks/i.test(c[1] || ''); continue; }
    if (o.xr && h === o.xr) { st.xr = cn.map((_, j) => val(c[j + 1], ln)); continue; }
    if (c.length - 1 < n + (hasXC ? 1 : 0)) throw new Error(`wiersz ${ln}: oczekiwano ${n} wartości${hasXC ? ' i ' + o.xc : ''}.`);
    st.rn.push(c[0] || 'W' + (st.rn.length + 1)); st.cells.push(cn.map((_, j) => val(c[j + 1], ln, o.allowM)));
    if (hasXC) st.xc.push(val(c[n + 1], ln));
  }
  if (!st.rn.length) throw new Error('brak wierszy z danymi.');
  if (o.xc && !hasXC) throw new Error(`ostatnia kolumna nagłówka musi nazywać się „${o.xc}".`);
  if (o.xr && !st.xr) throw new Error(`brak wiersza „${o.xr}".`);
  return st;
}

/* ---------- edytor tabeli wierszy (czynności, zadania): cols = [{key, label, type: 'name'|'text'|'num', blank}] ---------- */
function rowTableHTML(p, cols, rows, o = {}) {
  const inp = (c, r, i) => c.type === 'sel' ? `<select id="${p}${c.key}${i}" aria-label="${esc(c.label)} ${i + 1}">${c.opts.map(([v, t]) => `<option value="${esc(v)}"${String(r[c.key]) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`
    : c.type === 'num'
    ? `<input class="num" data-num${c.blank ? ' data-blank' : ''} inputmode="decimal" id="${p}${c.key}${i}" value="${esc(r[c.key] ?? '')}" aria-label="${esc(c.label)} ${i + 1}">`
    : `<input class="${c.type === 'name' ? 'nm' : 'tx'}" id="${p}${c.key}${i}" value="${esc(r[c.key] ?? '')}" aria-label="${esc(c.label)} ${i + 1}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>`;
  return `<div class="tw"><table class="mx rt"><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}<th></th></tr>` +
    rows.map((r, i) => '<tr>' + cols.map(c => `<td>${inp(c, r, i)}</td>`).join('') + `<td><button type="button" class="ghost" data-del="${i}" aria-label="usuń wiersz ${i + 1}">✕</button></td></tr>`).join('') +
    `</table></div><div class="crow"><button id="${p}add" type="button" class="ghost">${o.addLabel || '+ wiersz'}</button><span class="hint">${o.count ? o.count(rows.length) : rows.length}</span></div>`;
}
const rowTableSync = (p, cols, rows) => rows.map((r, i) => { const o = {...r}; cols.forEach(c => { const el = $('#' + p + c.key + i); if (el) o[c.key] = el.value; }); return o; });
/* CSV tabeli wierszy (polski Excel): najpierw wiersze „klucz;wartość" (np. tryb), potem nagłówek i dane */
function rowsToCSV(cols, rows, meta = []) {
  const q = s => /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s, v = (x, c) => c.type === 'num' ? String(x ?? '').replace('.', ',') : String(x ?? '');
  const mv = x => /^-?\d+\.\d+$/.test(String(x)) ? String(x).replace('.', ',') : String(x);   // liczby w parametrach też z przecinkiem (polski Excel)
  return '\uFEFF' + [...meta.map(([k, x]) => [k, mv(x)]), cols.map(c => c.label), ...rows.map(r => cols.map(c => v(r[c.key], c)))].map(r => r.map(x => q(String(x))).join(';')).join('\r\n') + '\r\n';
}
function rowsFromCSV(text, cols, metaKeys = []) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), first = lines.find(l => l.trim());
  if (!first) throw new Error('plik jest pusty.');
  const sep = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
  const split = l => { const out = []; let cur = '', qq = false; for (let i = 0; i < l.length; i++) { const ch = l[i];
    if (qq) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') qq = false; else cur += ch; } else if (ch === '"') qq = true; else if (ch === sep) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim(), meta = {}, rows = []; let map = null;
  lines.forEach((raw, k) => {
    if (!raw.trim()) return; const c = split(raw), ln = k + 1;
    if (!map) {
      const hit = c.map(x => cols.findIndex(col => norm(col.label) === norm(x)));
      if (hit.filter(x => x >= 0).length >= Math.min(2, cols.length)) { map = hit; const miss = cols.filter((col, ci) => !col.blank && col.req !== false && !hit.includes(ci)); if (miss.length) throw new Error(`wiersz ${ln}: brak kolumny „${miss[0].label}".`); return; }
      const key = norm(c[0] || ''); if (metaKeys.includes(key)) meta[key] = c.slice(1).join(';'); else throw new Error(`wiersz ${ln}: nie rozpoznano nagłówka tabeli (oczekiwane kolumny: ${cols.map(x => x.label).join(', ')}).`);
      return;
    }
    const r = {}; cols.forEach(col => { r[col.key] = ''; });
    map.forEach((ci, pos) => { if (ci < 0) return; const col = cols[ci]; let v = (c[pos] ?? '').trim();
      if (col.type === 'num' && v !== '') { const x = Number((sep === ',' ? v : v.replace(',', '.')).replace(/\s/g, '')); if (!isFinite(x)) throw new Error(`wiersz ${ln}: „${v}" w kolumnie „${col.label}" nie jest liczbą.`); v = String(x); }
      r[col.key] = v; });
    rows.push(r);
  });
  if (!map) throw new Error('nie znaleziono wiersza nagłówka tabeli.');
  if (!rows.length) throw new Error('brak wierszy z danymi.');
  return {meta, rows};
}

/* ---------- formularz parametrów liczbowych: fields = [{key, label, unit, blank, ph}] ---------- */
const paramFormHTML = (p, fields, vals) => '<div class="pf">' + fields.map(f => `<div class="crow pfr"><label for="${p}${f.key}">${f.label}</label><input class="num" data-num${f.blank ? ' data-blank' : ''} inputmode="decimal" id="${p}${f.key}" value="${esc(vals[f.key] ?? '')}"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>${f.unit ? `<span class="hint">${f.unit}</span>` : ''}</div>`).join('') + '</div>';
const paramSync = (p, fields, vals) => { fields.forEach(f => { const el = $('#' + p + f.key); if (el) vals[f.key] = el.value; }); return vals; };
/* CSV „parametr;wartość" + opcjonalna tabela (np. progi rabatowe) */
function paramsToCSV(meta, cols = null, rows = null) {
  const v = x => /^-?\d+(\.\d+)?$/.test(String(x)) ? String(x).replace('.', ',') : String(x);
  return '\uFEFF' + [...meta.map(([k, x]) => `${k};${v(x)}`), ...(cols && rows && rows.length ? ['', cols.map(c => c.label).join(';'), ...rows.map(r => cols.map(c => v(r[c.key] ?? '')).join(';'))] : [])].join('\r\n') + '\r\n';
}
function paramsFromCSV(text, keys, cols = null) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), meta = {}, rows = []; let inTable = false, map = null;
  const num = (s, ln, what) => { const t = String(s).trim().replace(/\s/g, '').replace(',', '.'); if (t === '') return ''; const x = Number(t); if (!isFinite(x)) throw new Error(`wiersz ${ln}: „${s}" (${what}) nie jest liczbą.`); return String(x); };
  lines.forEach((raw, k) => {
    if (!raw.trim()) return; const c = raw.split(';').map(s => s.trim()), ln = k + 1, key = c[0].toLowerCase();
    if (cols && !inTable && cols.some(col => col.label.toLowerCase() === key)) { inTable = true; map = c.map(x => cols.findIndex(col => col.label.toLowerCase() === x.toLowerCase())); return; }
    if (inTable) { const r = {}; map.forEach((ci, pos) => { if (ci >= 0) r[cols[ci].key] = num(c[pos] ?? '', ln, cols[ci].label); }); rows.push(r); return; }
    const kk = keys.find(x => x.toLowerCase() === key); if (!kk) throw new Error(`wiersz ${ln}: nieznany parametr „${c[0]}".`);
    meta[kk] = kk === 'model' || kk.startsWith('typ') || kk.startsWith('rodzaj') ? (c[1] || '') : num(c[1] ?? '', ln, kk);
  });
  return {meta, rows};
}
