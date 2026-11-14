/* ===== OptiLab – moduł Lokalizacja i układ =====
   Interfejs i raport dydaktyczny. Obliczenia: js/loc/loc-solver.js. Mapa i układ – własny SVG (drukowalny). */
const LOP = 'loc-', LO_MAXP = 30, LO_MAXD = 10;
const LO_TYPES = {single: 'lokalizacja jednego obiektu', layout: 'układ działów (CRAFT)', pmed: 'p-mediana – kilka obiektów (zaawansowane)'};
const LO_KINDS = {rect: 'prostokątna (|Δx| + |Δy|)', euc: 'euklidesowa (w linii prostej)', sq: 'kwadrat euklidesowej (środek ciężkości)'};
const LO_PCOLS = [{key: 'name', label: 'Punkt', type: 'text'}, {key: 'x', label: 'x', type: 'num'}, {key: 'y', label: 'y', type: 'num'}, {key: 'w', label: 'Waga (np. ładunki)', type: 'num'}];
const LO_MCOLS = [...LO_PCOLS.slice(0, 3), {key: 'w', label: 'Popyt (waga)', type: 'num'}, {key: 'cand', label: 'Możliwe miejsce obiektu', type: 'sel', opts: [['tak', 'tak'], ['nie', 'nie']]}];
const LO_LCOLS = [{key: 'name', label: 'Miejsce', type: 'text'}, {key: 'x', label: 'x', type: 'num'}, {key: 'y', label: 'y', type: 'num'}, {key: 'dept', label: 'Dział na starcie', type: 'text'}];
const loP = (list) => list.map(([name, x, y, w, cand]) => ({name, x: String(x), y: String(y), w: String(w), ...(cand ? {cand} : {})}));
const LO_QUAIN = loP([['Chicago', 30, 120, 2000], ['Pittsburgh', 90, 110, 1000], ['Nowy Jork', 130, 130, 1000], ['Atlanta', 60, 40, 2000]]);
const LO_LAY = () => ({names: ['A', 'B', 'C', 'D', 'E', 'F'], locs: [['M1', 0, 0, 'A'], ['M2', 10, 0, 'C'], ['M3', 20, 0, 'E'], ['M4', 0, 10, 'F'], ['M5', 10, 10, 'B'], ['M6', 20, 10, 'D']].map(([name, x, y, dept]) => ({name, x: String(x), y: String(y), dept})),
  F: {cells: [[0, 5, 2, 4, 1, 0], [0, 0, 3, 0, 2, 2], [2, 0, 0, 0, 0, 5], [3, 0, 0, 0, 1, 0], [0, 2, 0, 0, 0, 10], [1, 1, 6, 0, 1, 0]].map(r => r.map(String))}});
const loEx = (name, d) => ({name, data: {type: 'single', kind: 'sq', pts: LO_QUAIN, lay: LO_LAY(), pm: {p: '2', pts: loP([['Gdańsk', 50, 100, 30, 'tak'], ['Szczecin', 0, 85, 20, 'tak'], ['Poznań', 30, 55, 25, 'tak'], ['Warszawa', 75, 55, 60, 'tak'], ['Wrocław', 25, 25, 25, 'tak'], ['Kraków', 60, 5, 30, 'tak'], ['Lublin', 95, 30, 15, 'nie']])}, ...d}});
const LO_EXAMPLES = [
  loEx('Środek ciężkości – sklepy Quain’s (Heizer i Render)', {kind: 'sq'}), loEx('Ta sama sieć – odległość prostokątna (mediana ważona)', {kind: 'rect'}), loEx('Ta sama sieć – odległość euklidesowa (Weiszfeld)', {kind: 'euc'}),
  loEx('Układ 6 działów – CRAFT', {type: 'layout', kind: 'rect'}), loEx('p-mediana: 2 magazyny dla 7 miast', {type: 'pmed', kind: 'euc'})];
let LS = loNormalize(JSON.parse(JSON.stringify(LO_EXAMPLES[0].data)));
function loNormalize(d) {
  if (!d || !LO_TYPES[d.type]) throw new Error('to nie jest zadanie lokalizacji (nieznany rodzaj zadania).');
  const S = v => String(v ?? ''), def = LO_EXAMPLES[0].data, lay = d.lay || def.lay, n = Math.min(LO_MAXD, Math.max(2, (lay.names || []).length));
  if ((d.pts || []).length > LO_MAXP || (d.pm?.pts || []).length > LO_MAXP) throw new Error(`za dużo punktów (maksimum ${LO_MAXP}).`);
  return {type: d.type, kind: LO_KINDS[d.kind] ? d.kind : 'rect', pts: (d.pts || def.pts).map(p => ({name: S(p.name), x: S(p.x), y: S(p.y), w: S(p.w)})),
    lay: {names: Array.from({length: n}, (_, i) => S(lay.names[i] ?? String.fromCharCode(65 + i))), locs: Array.from({length: n}, (_, i) => { const l = lay.locs?.[i] || {}; return {name: S(l.name || 'M' + (i + 1)), x: S(l.x ?? 0), y: S(l.y ?? 0), dept: S(l.dept ?? lay.names?.[i] ?? '')}; }),
      F: {cells: Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => S(lay.F?.cells?.[i]?.[j] ?? '0')))}},
    pm: {p: S(d.pm?.p ?? '2'), pts: (d.pm?.pts || def.pm.pts).map(p => ({name: S(p.name), x: S(p.x), y: S(p.y), w: S(p.w), cand: p.cand === 'nie' ? 'nie' : 'tak'}))}};
}
function loRender() {
  const t = LS.type, box = $('#' + LOP + 'body'); $('#' + LOP + 'type').value = t; $('#' + LOP + 'kind').value = LS.kind;
  if (t === 'single') box.innerHTML = rowTableHTML(LOP + 'p', LO_PCOLS, LS.pts, {addLabel: '+ punkt', count: k => `${k} punktów`}) + '<p class="hint">Punkty, które obiekt ma obsługiwać (sklepy, odbiorcy, stanowiska), ich współrzędne i wagi – np. liczba dostaw. Szukamy miejsca o najmniejszej sumie waga × odległość.</p>';
  else if (t === 'pmed') box.innerHTML = `<div class="crow"><label for="${LOP}pp">Liczba obiektów p</label><input class="num" data-num id="${LOP}pp" value="${esc(LS.pm.p)}"></div>` + rowTableHTML(LOP + 'm', LO_MCOLS, LS.pm.pts, {addLabel: '+ punkt', count: k => `${k} punktów`}) + '<p class="hint">Wybieramy p miejsc spośród oznaczonych „tak”; każdy punkt obsługuje najbliższy obiekt. Przeglądamy wszystkie zestawy p miejsc (dokładne dla małych zadań).</p>';
  else { const L = LS.lay, n = L.names.length; box.innerHTML = `<div class="crow"><label for="${LOP}nd">Liczba działów</label><select id="${LOP}nd">${Array.from({length: LO_MAXD - 1}, (_, k) => `<option${k + 2 === n ? ' selected' : ''}>${k + 2}</option>`).join('')}</select></div><h4>Przepływy między działami (z wiersza do kolumny)</h4>` +
      matrixHTML(LOP + 'F', {rn: L.names, cn: L.names, cells: L.F.cells}, {corner: 'z \\ do', noMsg: true, diag: true}) + '<h4>Miejsca i układ początkowy</h4>' + rowTableHTML(LOP + 'l', LO_LCOLS, L.locs, {noAdd: true, count: k => `${k} miejsc`}) +
      '<p class="hint">Każdy dział zajmuje jedno miejsce (działy o podobnej powierzchni). Koszt układu = Σ przepływ × odległość między miejscami działów. Nazwy działów w macierzy przepływów można edytować.</p>';
    $('#' + LOP + 'nd').onchange = () => { loSync(); const k = +$('#' + LOP + 'nd').value, old = LS.lay; LS.lay = {names: Array.from({length: k}, (_, i) => old.names[i] ?? String.fromCharCode(65 + i)), locs: Array.from({length: k}, (_, i) => old.locs[i] ?? {name: 'M' + (i + 1), x: String(10 * (i % 3)), y: String(10 * Math.floor(i / 3)), dept: String.fromCharCode(65 + i)}), F: {cells: Array.from({length: k}, (_, i) => Array.from({length: k}, (_, j) => old.F.cells[i]?.[j] ?? '0'))}}; LS.lay.locs.forEach((l, i) => { if (!LS.lay.names.includes(l.dept)) l.dept = LS.lay.names[i]; }); loRender(); }; }
  const add = $('#' + LOP + 'padd') || $('#' + LOP + 'madd'); if (add) add.onclick = () => { loSync(); const arr = LS.type === 'single' ? LS.pts : LS.pm.pts; if (arr.length < LO_MAXP) arr.push({name: 'P' + (arr.length + 1), x: '0', y: '0', w: '1', ...(LS.type === 'pmed' ? {cand: 'tak'} : {})}); loRender(); };
  $('#' + LOP + 'kindrow').hidden = false; matrixPolish($('#' + LOP + 'top'));
}
function loSync() {
  LS.kind = $('#' + LOP + 'kind').value;
  if (LS.type === 'single' && $('#' + LOP + 'pname0')) LS.pts = rowTableSync(LOP + 'p', LO_PCOLS, LS.pts);
  if (LS.type === 'pmed' && $('#' + LOP + 'pp')) { LS.pm.p = $('#' + LOP + 'pp').value; LS.pm.pts = rowTableSync(LOP + 'm', LO_MCOLS, LS.pm.pts); }
  if (LS.type === 'layout' && $('#' + LOP + 'F')) { const st = {rn: LS.lay.names.slice(), cn: LS.lay.names.slice(), cells: LS.lay.F.cells}; matrixSync(LOP + 'F', st); LS.lay.names = st.rn; LS.lay.F.cells = st.cells; LS.lay.locs = rowTableSync(LOP + 'l', LO_LCOLS, LS.lay.locs); }
}
function loInit() {
  $('#' + LOP + 'top').innerHTML = `<div class="crow"><label for="${LOP}type">Zadanie</label><select id="${LOP}type">${Object.entries(LO_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="crow" id="${LOP}kindrow"><label for="${LOP}kind">Odległość</label><select id="${LOP}kind">${Object.entries(LO_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(LOP)}<div id="${LOP}body"></div><div id="${LOP}msg"></div><details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(LOP, LO_EXAMPLES)}</details>`;
  $('#' + LOP + 'type').onchange = () => { loSync(); LS.type = $('#' + LOP + 'type').value; clearErr(); loRender(); };
  $('#' + LOP + 'kind').onchange = () => { loSync(); };
  const top = $('#' + LOP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; loSync(); const arr = LS.type === 'single' ? LS.pts : LS.pm.pts; if (arr.length > 1) arr.splice(+k, 1); clearErr(); loRender(); });
  netToolsWire(LOP, {kind: 'loc', out: '#out-loc', examples: LO_EXAMPLES, normalize: loNormalize, get: () => { loSync(); return JSON.parse(JSON.stringify(LS)); }, set: d => { LS = d; loRender(); },
    toCSV: d => d.type === 'single' ? rowsToCSV(LO_PCOLS, d.pts, [['zadanie', 'single'], ['odległość', d.kind]]) : d.type === 'pmed' ? rowsToCSV(LO_MCOLS, d.pm.pts, [['zadanie', 'pmed'], ['odległość', d.kind], ['p', d.pm.p]])
      : '\uFEFF' + [`zadanie;layout`, `odległość;${d.kind}`, '', ['Przepływy', ...d.lay.names].join(';'), ...d.lay.F.cells.map((r, i) => [d.lay.names[i], ...r].join(';')), '', 'Miejsce;x;y;Dział na starcie', ...d.lay.locs.map(l => [l.name, l.x, l.y, l.dept].join(';'))].join('\r\n') + '\r\n',
    fromCSV: t => loFromCSV(t)});
  $('#btn-loc').onclick = loSolveUI;
  loRender();
}
function loFromCSV(text) {
  const kind = (String(text).match(/zadanie;(\w+)/) || [])[1], kd = (String(text).match(/odległość;(\w+)/) || [])[1] || 'rect', base = JSON.parse(JSON.stringify(LO_EXAMPLES[0].data));
  if (kind === 'single') { const r = rowsFromCSV(text, LO_PCOLS, ['zadanie', 'odległość'], ['zadanie', 'odległość']); return {...base, type: 'single', kind: kd, pts: r.rows}; }
  if (kind === 'pmed') { const r = rowsFromCSV(text, LO_MCOLS, ['zadanie', 'odległość', 'p'], ['zadanie', 'odległość']); return {...base, type: 'pmed', kind: kd, pm: {p: String(r.meta.p ?? '1'), pts: r.rows}}; }
  if (kind !== 'layout') throw new Error('w pliku brakuje wiersza „zadanie;single|layout|pmed”.');
  const L = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).map(s => s.split(';').map(q => q.trim())), hi = L.findIndex(r => r[0].toLowerCase() === 'przepływy'), li = L.findIndex(r => r[0].toLowerCase() === 'miejsce'); if (hi < 0 || li < 0) throw new Error('brak sekcji „Przepływy;…” albo „Miejsce;x;y;…”.');
  const names = L[hi].slice(1), n = names.length, num = (s, ln) => { const x = String(s).replace(',', '.'); if (x === '' || !isFinite(Number(x))) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return String(Number(x)); };
  const cells = L.slice(hi + 1, hi + 1 + n).map((r, i) => r.slice(1, n + 1).map(v => num(v, hi + 2 + i))), locs = L.slice(li + 1, li + 1 + n).map((r, i) => ({name: r[0], x: num(r[1], li + 2 + i), y: num(r[2], li + 2 + i), dept: r[3] || names[i]}));
  return {...base, type: 'layout', kind: kd, lay: {names, F: {cells}, locs}};
}
function loRead() {
  clearErr(); loSync();
  const out = '#out-loc', bad = [], num = (v, id, o = {}) => { const s = String(v).trim().replace(',', '.'), x = Number(s); if (s === '' || !isFinite(x) || Math.abs(x) > 1e9 || (o.min !== undefined && x < o.min) || (o.pos && !(x > 0))) { bad.push(id); return NaN; } return x; };
  if (LS.type === 'single' || LS.type === 'pmed') {
    const arr = LS.type === 'single' ? LS.pts : LS.pm.pts, pf = LS.type === 'single' ? 'p' : 'm', pts = arr.map((p, i) => ({name: String(p.name).trim() || 'P' + (i + 1), x: num(p.x, pf + 'x' + i), y: num(p.y, pf + 'y' + i), w: num(p.w, pf + 'w' + i, {min: 0}), cand: p.cand !== 'nie'}));
    if (bad.length) return netFail(LOP, out, 'współrzędne – liczby; wagi – liczby nieujemne.', bad); if (!pts.some(p => p.w > 0)) return netFail(LOP, out, 'co najmniej jeden punkt musi mieć dodatnią wagę.', arr.map((_, i) => pf + 'w' + i));
    if (LS.type === 'single') return {t: 'single', kind: LS.kind, pts};
    const p = num(LS.pm.p, 'pp'), cands = pts.filter(q => q.cand); if (!(Number.isInteger(p) && p >= 1 && p <= cands.length)) return netFail(LOP, out, `liczba obiektów p: liczba całkowita od 1 do ${cands.length} (liczby możliwych miejsc).`, ['pp']);
    let comb = 1; for (let k = 0; k < p; k++) comb = comb * (cands.length - k) / (k + 1); if (comb > 2e5) return netFail(LOP, out, `za dużo zestawów do przejrzenia (${Math.round(comb)}) – zmniejsz liczbę możliwych miejsc albo p.`, ['pp']);
    return {t: 'pmed', kind: LS.kind, pts, cands, p};
  }
  const L = LS.lay, n = L.names.length, names = L.names.map(s => String(s).trim()), F = L.F.cells.map((r, i) => r.map((v, j) => num(v, `Fc${i}_${j}`, {min: 0}))), locs = L.locs.map((l, i) => ({name: String(l.name).trim() || 'M' + (i + 1), x: num(l.x, 'lx' + i), y: num(l.y, 'ly' + i)}));
  if (bad.length) return netFail(LOP, out, 'przepływy – liczby nieujemne; współrzędne miejsc – liczby.', bad);
  if (new Set(names).size !== n || names.some(s => !s)) return netFail(LOP, out, 'nazwy działów muszą być niepuste i różne.', []);
  const start = L.locs.map((l, i) => names.indexOf(String(l.dept).trim())); const miss = start.map((k, i) => k < 0 ? 'ldept' + i : null).filter(Boolean); if (miss.length) return netFail(LOP, out, `wpisz w kolumnie „Dział na starcie” nazwę działu (${names.map(esc).join(', ')}).`, miss);
  if (new Set(start).size !== n) return netFail(LOP, out, 'każdy dział musi stać w dokładnie jednym miejscu (w układzie początkowym dział się powtarza).', L.locs.map((_, i) => 'ldept' + i));
  const perm = Array(n); start.forEach((dept, loc) => { perm[dept] = loc; });
  return {t: 'layout', kind: LS.kind, names, F, locs, perm, D: locs.map(a => locs.map(b => locDist([a.x, a.y], [b.x, b.y], LS.kind)))};
}
function loSolveUI() { const X = loRead(); if (!X) return; const h = loReportHTML(X); $('#out-loc').innerHTML = h; last.loc = h; }
/* mapa: punkty (koło ∝ √waga), obiekty (★), linie obsługi, ścieżka Weiszfelda, zbiór optymalny (prostokąt) */
function loMapSVG(pts, fac, o = {}) {
  const all = [...pts.map(p => [p.x, p.y]), ...fac.map(f => [f.x, f.y]), ...(o.path || [])], xs = all.map(p => p[0]), ys = all.map(p => p[1]), padx = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * 0.12), pady = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.12);
  const x0 = Math.min(...xs) - padx, x1 = Math.max(...xs) + padx, y0 = Math.min(...ys) - pady, y1 = Math.max(...ys) + pady, W = 460, H = Math.max(260, Math.min(460, 400 * (y1 - y0) / (x1 - x0) + 60)), L = 40, B = 28, T = 10, R = 12;
  const X = v => L + (W - L - R) * (v - x0) / (x1 - x0), Y = v => H - B - (H - B - T) * (v - y0) / (y1 - y0), r1 = v => Math.round(v * 10) / 10, wm = Math.max(...pts.map(p => p.w), 1);
  let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
  if (o.rect) s += `<rect class="ctreg" x="${r1(X(o.rect[0]))}" y="${r1(Y(o.rect[3]))}" width="${Math.max(2, r1(X(o.rect[2]) - X(o.rect[0])))}" height="${Math.max(2, r1(Y(o.rect[1]) - Y(o.rect[3])))}"/>`;
  (o.links || []).forEach(([p, f]) => { s += `<line class="lolink" x1="${r1(X(p.x))}" y1="${r1(Y(p.y))}" x2="${r1(X(f.x))}" y2="${r1(Y(f.y))}"/>`; });
  if (o.path && o.path.length > 1) s += `<path class="ctpath" d="M${o.path.map(p => r1(X(p[0])) + ' ' + r1(Y(p[1]))).join('L')}"/>`;
  pts.forEach(p => { s += `<circle class="lopt" cx="${r1(X(p.x))}" cy="${r1(Y(p.y))}" r="${r1(4 + 10 * Math.sqrt(p.w / wm))}"/><text class="vzt" x="${r1(X(p.x))}" y="${r1(Y(p.y) - 6 - 10 * Math.sqrt(p.w / wm))}" text-anchor="middle">${esc(p.name)}</text>`; });
  fac.forEach(f => { s += `<text class="lostar" x="${r1(X(f.x))}" y="${r1(Y(f.y) + 7)}" text-anchor="middle">★</text>` + (f.label ? `<text class="vzt b" x="${r1(X(f.x) + 12)}" y="${r1(Y(f.y) + 16)}">${esc(f.label)}</text>` : ''); });
  VZ.ticks(x0, x1, 6).forEach(v => { if (v >= x0 && v <= x1) s += `<text class="vzt" x="${r1(X(v))}" y="${H - B + 14}" text-anchor="middle">${fmt(v)}</text>`; }); VZ.ticks(y0, y1, 6).forEach(v => { if (v >= y0 && v <= y1) s += `<text class="vzt" x="${L - 5}" y="${r1(Y(v) + 4)}" text-anchor="end">${fmt(v)}</text>`; });
  return `<div class="tw"><svg class="vzsvg" viewBox="0 0 ${W} ${r1(H)}" style="max-width:${W}px" role="img" aria-label="${esc(o.title || 'Mapa')}">${s}</svg></div>`;
}
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function loReportHTML(X) {
  const f = v => fmt(Math.round(v * 1e4) / 1e4), f2 = v => fmt(Math.round(v * 100) / 100), pt = x => `(${f2(x[0])}; ${f2(x[1])})`, KN = {rect: 'prostokątna', euc: 'euklidesowa', sq: 'kwadrat euklidesowej'};
  if (X.t === 'single') {
    const P = X.pts, R = locSingle(P, X.kind); let h = `<h3>Lokalizacja jednego obiektu – odległość ${KN[X.kind]}</h3><div class="formula">min Σ w<sub>i</sub>·d((x, y), (x<sub>i</sub>, y<sub>i</sub>)), &nbsp; d = ${X.kind === 'rect' ? '|x − x<sub>i</sub>| + |y − y<sub>i</sub>|' : X.kind === 'euc' ? '√((x − x<sub>i</sub>)² + (y − y<sub>i</sub>)²)' : '(x − x<sub>i</sub>)² + (y − y<sub>i</sub>)²'}</div>`;
    if (X.kind === 'sq') h += `<p>Dla kwadratu odległości minimum leży w środku ciężkości: x* = Σw<sub>i</sub>x<sub>i</sub> / Σw<sub>i</sub> = ${f(P.reduce((s, q) => s + q.w * q.x, 0))} / ${f(R.W)} = <b>${f(R.x[0])}</b>, y* = Σw<sub>i</sub>y<sub>i</sub> / Σw<sub>i</sub> = ${f(P.reduce((s, q) => s + q.w * q.y, 0))} / ${f(R.W)} = <b>${f(R.x[1])}</b>.</p><p class="hint">Środek ciężkości jest prosty do policzenia, ale „przyciągają” go odległe punkty (odległość liczy się w kwadracie). Dlatego to dobre przybliżenie, a nie minimum sumy rzeczywistych odległości.</p>`;
    else if (X.kind === 'rect') { const tab = (M, ax) => `<div class="tw"><table><thead><tr><th>${ax} (rosnąco)</th><th>Waga</th><th>Waga skumulowana</th></tr></thead>` + M.steps.map(s2 => `<tr${s2.v >= M.lo && s2.v <= M.hi ? ' class="best"' : ''}><td>${f(s2.v)}</td><td>${f(s2.w)}</td><td>${f(s2.cum)}</td></tr>`).join('') + '</table></div>';
      h += `<p class="hint">Odległość prostokątna rozkłada się na osie: x i y wybieramy niezależnie jako <b>medianę ważoną</b> – pierwszą współrzędną, przy której waga skumulowana przekracza połowę sumy wag (${f(R.W / 2)}). Jeśli dokładnie ją osiąga, optymalny jest cały odcinek do następnej współrzędnej.</p><h4>Oś x</h4>${tab(R.mx, 'x')}<h4>Oś y</h4>${tab(R.my, 'y')}`;
      h += R.unique ? '' : `<p class="note">Rozwiązanie nie jest jedyne: optymalny jest każdy punkt prostokąta x ∈ [${f(R.mx.lo)}; ${f(R.mx.hi)}], y ∈ [${f(R.my.lo)}; ${f(R.my.hi)}] (na mapie zacieniony); podajemy jego środek.</p>`; }
    else { h += `<p class="hint">Dla odległości euklidesowej nie ma wzoru – stosujemy <b>algorytm Weiszfelda</b>: zaczynamy w środku ciężkości i powtarzamy x ← Σ(w<sub>i</sub>x<sub>i</sub>/d<sub>i</sub>) / Σ(w<sub>i</sub>/d<sub>i</sub>) (punkty bliższe „ciągną” mocniej). Najpierw sprawdzamy warunek Kuhna: punkt danych jest optimum, gdy wypadkowa „sił ciągnących” pozostałych punktów nie przekracza jego wagi.</p>`;
      if (R.vertex !== undefined) h += `<p class="note">Warunek Kuhna spełniony w punkcie ${esc(P[R.vertex].name)}: wypadkowa sił pozostałych ${f(R.kuhn[R.vertex].pull)} ≤ waga ${f(R.kuhn[R.vertex].w)} – optimum leży dokładnie w tym punkcie (bez iteracji).</p>`;
      else h += '<div class="tw"><table><thead><tr><th>k</th><th>x</th><th>y</th><th>Koszt Σ w·d</th><th>Przesunięcie</th></tr></thead>' + (R.rows.length > 30 ? [...R.rows.slice(0, 22), null, ...R.rows.slice(-5)] : R.rows).map(r => r ? `<tr><td>${r.k}</td><td>${f(r.x[0])}</td><td>${f(r.x[1])}</td><td>${f(r.cost)}</td><td>${r.ch ? r.ch.toExponential(2).replace('.', ',') : '0'}</td></tr>` : '<tr><td colspan="5" class="hint">…</td></tr>').join('') + '</table></div>';
      if (R.status !== 'optimal') return h + '<p class="msg">Algorytm nie zbiegł w limicie iteracji – wynik niewiarygodny.</p>'; }
    const alts = ['rect', 'euc', 'sq'].map(k => ({k, x: locSingle(P, k).x}));
    h += `<div class="sum"><b>Wynik:</b> obiekt w punkcie <b>${pt(R.x)}</b>; suma waga × odległość (${KN[X.kind]}) = <b>${f(R.cost)}</b>.</div>`;
    h += '<h4>Porównanie kryteriów</h4><div class="tw"><table><thead><tr><th>Optimum dla odległości</th><th>Punkt</th><th>Koszt – prostokątna</th><th>Koszt – euklidesowa</th><th>Koszt – kwadrat</th></tr></thead>' +
      alts.map(a => `<tr${a.k === X.kind ? ' class="best"' : ''}><th>${KN[a.k]}</th><td>${pt(a.x)}</td>${['rect', 'euc', 'sq'].map(k => `<td>${f(locCost(P, a.x, k))}</td>`).join('')}</tr>`).join('') + '</table></div><p class="hint">Każdy punkt jest najlepszy dla „swojej” miary odległości (najmniejsza wartość w kolumnie). Odległość prostokątna pasuje do ulic w siatce i korytarzy hali, euklidesowa – do transportu w linii prostej (np. przewody, suwnice).</p>';
    return h + '<h4>Mapa</h4>' + loMapSVG(P, [{x: R.x[0], y: R.x[1], label: 'obiekt'}], {links: P.map(p => [p, {x: R.x[0], y: R.x[1]}]), path: X.kind === 'euc' && R.path.length > 2 ? R.path : null, rect: X.kind === 'rect' && !R.unique ? [R.mx.lo, R.my.lo, R.mx.hi, R.my.hi] : null, title: 'Mapa lokalizacji'}) +
      '<p class="hint">Wielkość kółka – waga punktu; ★ – obiekt; cienkie linie – obsługa punktów' + (X.kind === 'euc' ? '; czerwona linia – kolejne kroki algorytmu Weiszfelda od środka ciężkości' : '') + '.</p>';
  }
  if (X.t === 'pmed') {
    const R = pMedian(X.pts, X.cands, X.p, X.kind), fac = R.set.map(j => X.cands[j]);
    let h = `<h3>p-mediana – ${X.p} ${X.p === 1 ? 'obiekt' : 'obiekty'}, odległość ${KN[X.kind]}</h3><p class="hint">Każdy punkt obsługuje najbliższy z wybranych obiektów. Przejrzeliśmy wszystkie ${R.count} zestawy ${X.p} spośród ${X.cands.length} możliwych miejsc – wynik jest optymalny.</p>`;
    h += '<div class="tw"><table><thead><tr><th>Punkt</th><th>Popyt</th><th>Obsługiwany przez</th><th>Odległość</th><th>Popyt × odległość</th></tr></thead>' + X.pts.map((q, i) => `<tr><th>${esc(q.name)}</th><td>${f(q.w)}</td><td>${esc(X.cands[R.assign[i]].name)}</td><td>${f(R.D[i][R.assign[i]])}</td><td>${f(q.w * R.D[i][R.assign[i]])}</td></tr>`).join('') + '</table></div>';
    return h + `<div class="sum"><b>Wynik:</b> obiekty w miejscach <b>${fac.map(c => esc(c.name)).join(', ')}</b>; łączny koszt (popyt × odległość) = <b>${f(R.cost)}</b>.</div>` + '<h4>Mapa</h4>' + loMapSVG(X.pts, fac.map(c => ({x: c.x, y: c.y, label: ''})), {links: X.pts.map((q, i) => [q, X.cands[R.assign[i]]]), title: 'Mapa p-mediany'});
  }
  const n = X.names.length, C = layCRAFT(X.F, X.D, X.perm), c0 = layCost(X.F, X.D, X.perm), nm = i => esc(X.names[i]);
  let h = `<h3>Układ działów – metoda CRAFT (wymiana par), odległość ${KN[X.kind]}</h3><div class="formula">koszt układu = Σ<sub>i</sub> Σ<sub>j</sub> przepływ(i → j) × odległość(miejsce działu i, miejsce działu j)</div>`;
  h += '<h4>Odległości między miejscami</h4><div class="tw"><table><thead><tr><th></th>' + X.locs.map(l => `<th>${esc(l.name)}</th>`).join('') + '</tr></thead>' + X.locs.map((l, i) => `<tr><th>${esc(l.name)}</th>${X.D[i].map(v => `<td>${f(v)}</td>`).join('')}</tr>`).join('') + '</table></div>';
  h += `<p>Układ początkowy: ${X.perm.map((loc, d) => `${nm(d)} → ${esc(X.locs[loc].name)}`).join(', ')}; koszt = <b>${f(c0)}</b>.</p><p class="hint">W każdej iteracji sprawdzamy wszystkie zamiany miejsc dwóch działów (${n * (n - 1) / 2} par) i wykonujemy tę, która najbardziej obniża koszt. Kończymy, gdy żadna zamiana nie pomaga.</p>`;
  C.steps.forEach(st => { h += `<h4>Iteracja ${st.it} (koszt ${f(st.cost)})</h4><div class="tw"><table><thead><tr><th>Zamiana</th><th>Koszt po zamianie</th><th>Zmiana</th></tr></thead>` + st.cand.map(q => `<tr${st.best && q.i === st.best.i && q.j === st.best.j ? ' class="best"' : ''}><td>${nm(q.i)} ↔ ${nm(q.j)}</td><td>${f(q.cost)}</td><td>${f(q.cost - st.cost)}</td></tr>`).join('') + '</table></div>' +
    `<p>${st.best ? `Zamieniamy ${nm(st.best.i)} ↔ ${nm(st.best.j)}: koszt spada o ${f(st.cost - st.best.cost)}.` : 'Żadna zamiana nie obniża kosztu – koniec (optimum lokalne).'}</p>`; });
  const B = n <= 8 ? layBrute(X.F, X.D) : null;
  h += `<div class="sum"><b>Wynik CRAFT:</b> ${C.perm.map((loc, d) => `${nm(d)} → ${esc(X.locs[loc].name)}`).join(', ')}; koszt <b>${f(C.cost)}</b> (początkowo ${f(c0)}, spadek o ${f(c0 - C.cost)}${c0 > 0 ? ` = ${fmt(Math.round((c0 - C.cost) / c0 * 1000) / 10)}%` : ''}).</div>`;
  if (B) h += B.cost < C.cost - 1e-9 ? `<p class="note">Sprawdzenie przeglądem wszystkich ${B.count} układów: najlepszy ma koszt ${f(B.cost)} (${B.perm.map((loc, d) => `${nm(d)} → ${esc(X.locs[loc].name)}`).join(', ')}). CRAFT to heurystyka – zatrzymał się w optimum lokalnym; warto spróbować innego układu początkowego.</p>` : `<p class="hint">Sprawdzenie przeglądem wszystkich ${B.count} układów: CRAFT znalazł układ optymalny.</p>`;
  const flows = []; X.F.forEach((r, i) => r.forEach((v, j) => { if (v > 0 && i !== j) flows.push([i, j, v]); })); const fm = Math.max(1, ...flows.map(q => q[2]));
  const P = X.locs.map(l => ({name: '', x: l.x, y: l.y, w: 0}));
  return h + '<h4>Układ końcowy</h4>' + loMapSVG(P.map(p => ({...p, w: 1})), C.perm.map((loc, d) => ({x: X.locs[loc].x, y: X.locs[loc].y, label: X.names[d]})), {links: flows.filter(q => q[2] >= fm / 3).map(([i, j]) => [{x: X.locs[C.perm[i]].x, y: X.locs[C.perm[i]].y}, {x: X.locs[C.perm[j]].x, y: X.locs[C.perm[j]].y}]), title: 'Układ działów'}) +
    '<p class="hint">★ – działy w miejscach po optymalizacji; linie – większe przepływy (od ⅓ największego). Działy z dużym przepływem powinny stać blisko siebie.</p>';
}
registerModule({id: 'loc', title: 'Lokalizacja i układ', init: loInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
  html: '<div class="card"><div id="loc-top"></div><div><button id="btn-loc" type="button">Rozwiąż</button></div><div id="out-loc"></div></div>'});
