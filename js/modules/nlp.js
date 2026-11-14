/* ===== OptiLab – moduł Programowanie nieliniowe =====
   Interfejs i raport dydaktyczny. Funkcje wpisywane jako wyrażenia (js/expr.js – bez eval), obliczenia: js/nlp/nlp-solver.js. */
const NLP = 'nlp-', NL_MAXC = 8;
const NL_MODES = {'1d': 'jedna zmienna na przedziale', free: 'wiele zmiennych bez ograniczeń', con: 'z ograniczeniami'};
const NL_METHODS = {'1d': {golden: 'złoty podział', fib: 'metoda Fibonacciego', bisect: 'bisekcja (na pochodnej)', newton: 'metoda Newtona'}, free: {bfgs: 'BFGS (quasi-Newton)', newton: 'metoda Newtona', grad: 'spadek gradientu'}, con: {auglag: 'rozszerzony Lagrange (metoda mnożników)', penalty: 'zewnętrzna funkcja kary'}};
const NL_CCOLS = [{key: 'e', label: 'Ograniczenie g(x)', type: 'text'}, {key: 'rel', label: 'Znak', type: 'sel', opts: [['<=', '≤'], ['>=', '≥'], ['=', '=']]}, {key: 'rhs', label: 'Prawa strona', type: 'num'}];
const nlEx = (name, d) => ({name, data: {maxi: false, a: '0', b: '1', x0: '0; 0', tol: '1e-6', maxIt: '500', cons: [], ...d}});
const NL_EXAMPLES = [
  nlEx('Jedna zmienna – złoty podział: x⁴ − 14x³ + 60x² − 70x na [0; 2]', {mode: '1d', method: 'golden', f: 'x^4 - 14x^3 + 60x^2 - 70x', a: '0', b: '2'}),
  nlEx('Jedna zmienna – metoda Newtona: x² − 2·sin(x)', {mode: '1d', method: 'newton', f: 'x^2 - 2sin(x)', a: '0', b: '2', x0: '1'}),
  nlEx('Funkcja Rosenbrocka – BFGS', {mode: 'free', method: 'bfgs', f: '(1 - x1)^2 + 100(x2 - x1^2)^2', x0: '-1,2; 1'}),
  nlEx('Rosenbrock – spadek gradientu (wolna zbieżność)', {mode: 'free', method: 'grad', f: '(1 - x1)^2 + 100(x2 - x1^2)^2', x0: '-1,2; 1', maxIt: '300'}),
  nlEx('Funkcja kwadratowa – metoda Newtona (jeden krok)', {mode: 'free', method: 'newton', f: '(x1 - 3)^2 + 2(x2 + 1)^2 + x1x2', x0: '0; 0'}),
  nlEx('Z ograniczeniami – rozszerzony Lagrange', {mode: 'con', method: 'auglag', f: '(x1 - 2)^2 + (x2 - 1)^2', x0: '0; 0', cons: [{e: 'x1^2 - x2', rel: '<=', rhs: '0'}, {e: 'x1 + x2', rel: '<=', rhs: '2'}]}),
  nlEx('Z ograniczeniem – funkcja kary: min x1 + x2 przy x1² + x2² ≤ 2', {mode: 'con', method: 'penalty', f: 'x1 + x2', x0: '0; 0', cons: [{e: 'x1^2 + x2^2', rel: '<=', rhs: '2'}]}),
];
let NL = nlNormalize(JSON.parse(JSON.stringify(NL_EXAMPLES[0].data)));
function nlNormalize(d) {
  if (!d || !NL_MODES[d.mode] || typeof d.f !== 'string') throw new Error('to nie jest zadanie programowania nieliniowego (brak funkcji celu lub rodzaju zadania).');
  const S = v => String(v ?? ''); if ((d.cons || []).length > NL_MAXC) throw new Error(`za dużo ograniczeń (maksimum ${NL_MAXC}).`);
  return {mode: d.mode, method: NL_METHODS[d.mode][d.method] ? d.method : Object.keys(NL_METHODS[d.mode])[0], f: S(d.f).slice(0, 2000), maxi: !!d.maxi, a: S(d.a), b: S(d.b), x0: S(d.x0), tol: S(d.tol || '1e-6'), maxIt: S(d.maxIt || '500'),
    cons: (d.cons || []).map(c => ({e: S(c.e), rel: ['<=', '>=', '='].includes(c.rel) ? c.rel : '<=', rhs: S(c.rhs)}))};
}
function nlRender() {
  $('#' + NLP + 'mode').value = NL.mode; $('#' + NLP + 'method').innerHTML = Object.entries(NL_METHODS[NL.mode]).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''); $('#' + NLP + 'method').value = NL.method;
  ['f', 'a', 'b', 'x0', 'tol', 'maxIt'].forEach(k => { $('#' + NLP + k).value = NL[k]; }); $('#' + NLP + 'maxi').value = NL.maxi ? '1' : '0';
  $('#' + NLP + 'ab').hidden = NL.mode !== '1d'; $('#' + NLP + 'x0box').hidden = NL.mode === '1d' && NL.method !== 'newton'; $('#' + NLP + 'consbox').hidden = NL.mode !== 'con';
  $('#' + NLP + 'x0lab').textContent = NL.mode === '1d' ? 'Punkt startowy x₀' : 'Punkt startowy x₀ (współrzędne po średniku)';
  $('#' + NLP + 'cons').innerHTML = rowTableHTML(NLP + 'c', NL_CCOLS, NL.cons, {addLabel: '+ ograniczenie', count: k => `${k} ograniczeń`});
  $('#' + NLP + 'cadd').onclick = () => { nlSync(); if (NL.cons.length < NL_MAXC) NL.cons.push({e: '', rel: '<=', rhs: '0'}); nlRender(); };
  matrixPolish($('#' + NLP + 'top'));
}
function nlSync() { ['f', 'a', 'b', 'x0', 'tol', 'maxIt'].forEach(k => { NL[k] = $('#' + NLP + k).value; }); NL.maxi = $('#' + NLP + 'maxi').value === '1'; NL.mode = $('#' + NLP + 'mode').value; NL.method = $('#' + NLP + 'method').value; if ($('#' + NLP + 'ce0') || NL.cons.length === 0) NL.cons = rowTableSync(NLP + 'c', NL_CCOLS, NL.cons); }
function nlInit() {
  $('#' + NLP + 'top').innerHTML = `<div class="crow"><label for="${NLP}mode">Zadanie</label><select id="${NLP}mode">${Object.entries(NL_MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><label for="${NLP}method">Metoda</label><select id="${NLP}method"></select></div>
    ${netCopyHTML(NLP)}<div class="crow"><label for="${NLP}maxi">Cel</label><select id="${NLP}maxi"><option value="0">minimalizuj</option><option value="1">maksymalizuj</option></select></div>
    <div class="crow pfr"><label for="${NLP}f">Funkcja celu f(x)</label><input class="tx" id="${NLP}f" style="flex:1 1 320px;min-width:200px" spellcheck="false" autocomplete="off"></div>
    <p class="hint">Zmienne: x1, x2, … (przy jednej zmiennej – x). Działania + − * / ^, mnożenie można pominąć (2x1x2); funkcje sin, cos, tan, exp, ln, log, sqrt, abs; stałe pi, e; liczby z kropką lub przecinkiem.</p>
    <div class="crow" id="${NLP}ab"><label for="${NLP}a">Przedział od a</label><input class="num" data-num id="${NLP}a"><label for="${NLP}b">do b</label><input class="num" data-num id="${NLP}b"></div>
    <div class="crow pfr" id="${NLP}x0box"><label for="${NLP}x0" id="${NLP}x0lab">Punkt startowy</label><input class="tx" id="${NLP}x0" style="width:160px"></div>
    <div id="${NLP}consbox"><h4>Ograniczenia</h4><div id="${NLP}cons"></div></div><div id="${NLP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label for="${NLP}tol">Tolerancja</label><input class="tx" id="${NLP}tol" style="width:90px"><label for="${NLP}maxIt">Limit iteracji</label><input class="num" data-num id="${NLP}maxIt"></div>${netToolsHTML(NLP, NL_EXAMPLES)}</details>`;
  $('#' + NLP + 'mode').onchange = () => { nlSync(); NL.method = Object.keys(NL_METHODS[NL.mode])[0]; clearErr(); nlRender(); };
  $('#' + NLP + 'method').onchange = () => { nlSync(); clearErr(); nlRender(); };
  const top = $('#' + NLP + 'top'); matrixWire(top);
  top.addEventListener('click', e => { const k = e.target.dataset?.del; if (k === undefined) return; nlSync(); NL.cons.splice(+k, 1); clearErr(); nlRender(); });
  netToolsWire(NLP, {kind: 'nlp', out: '#out-nlp', examples: NL_EXAMPLES, normalize: nlNormalize, get: () => { nlSync(); return JSON.parse(JSON.stringify(NL)); }, set: d => { NL = d; nlRender(); },
    toCSV: d => '\uFEFF' + [['zadanie', d.mode], ['metoda', d.method], ['cel', d.maxi ? 'max' : 'min'], ['funkcja', d.f], ['a', d.a], ['b', d.b], ['start', d.x0], ['tolerancja', d.tol], ['limit', d.maxIt]].map(r => r.join(';')).join('\r\n') + '\r\n\r\nOgraniczenie;Znak;Prawa strona\r\n' + d.cons.map(c => [c.e, c.rel, c.rhs].join(';')).join('\r\n') + '\r\n',
    fromCSV: t => { const d = {cons: []}; let sec = false; String(t).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, k) => { if (!raw.trim()) return; const c = raw.split(';'), key = c[0].trim().toLowerCase();
      if (key === 'ograniczenie') { sec = true; return; } if (sec) { if (c.length < 3) throw new Error(`wiersz ${k + 1}: ograniczenie potrzebuje 3 pól (wyrażenie;znak;prawa strona).`); d.cons.push({e: c[0], rel: c[1].trim(), rhs: c[2].trim()}); return; }
      const map = {zadanie: 'mode', metoda: 'method', funkcja: 'f', a: 'a', b: 'b', start: 'x0', tolerancja: 'tol', limit: 'maxIt'}; if (key === 'cel') d.maxi = c[1].trim() === 'max'; else if (map[key]) d[map[key]] = c.slice(1).join(';').trim(); else throw new Error(`wiersz ${k + 1}: nieznany parametr „${c[0]}”.`); }); return d; }});
  $('#btn-nlp').onclick = nlSolveUI;
  nlRender();
}
function nlRead() {
  clearErr(); nlSync();
  const out = '#out-nlp', m = NL.mode; let F;
  try { F = EX.make(NL.f); } catch (e) { return netFail(NLP, out, 'funkcja celu: ' + esc(e.message), ['f']); }
  if (m === '1d' && F.n > 1) return netFail(NLP, out, 'przy jednej zmiennej używaj tylko x (albo x1).', ['f']);
  const num = s => Number(String(s).trim().replace(',', '.')), tol = num(NL.tol), maxIt = num(NL.maxIt);
  if (!(tol > 0 && tol < 1)) return netFail(NLP, out, 'tolerancja: liczba z przedziału (0; 1), np. 1e-6.', ['tol']); if (!(Number.isInteger(maxIt) && maxIt >= 1 && maxIt <= 100000)) return netFail(NLP, out, 'limit iteracji: liczba całkowita od 1 do 100 000.', ['maxIt']);
  const X = {mode: m, method: NL.method, fs: NL.f, maxi: NL.maxi, tol, maxIt};
  if (m === '1d') { X.a = num(NL.a); X.b = num(NL.b); if (!isFinite(X.a) || !isFinite(X.b) || !(X.b > X.a)) return netFail(NLP, out, 'przedział: liczby a < b.', ['a', 'b']); X.f = x => F.f([x]);
    if (NL.method === 'newton') { X.x0 = num(NL.x0); if (!isFinite(X.x0)) return netFail(NLP, out, 'podaj punkt startowy x₀ (liczbę).', ['x0']); }
    if (!isFinite(X.f(X.a)) || !isFinite(X.f(X.b))) return netFail(NLP, out, 'funkcja nie ma skończonej wartości na końcu przedziału (np. ln 0, dzielenie przez 0).', ['a', 'b']); return X; }
  const x0 = String(NL.x0).split(/;|\s+/).map(s => s.trim()).filter(Boolean).map(num), cons = [];
  for (let i = 0; i < (m === 'con' ? NL.cons.length : 0); i++) { const c = NL.cons[i]; let G; try { G = EX.make(c.e); } catch (e) { return netFail(NLP, out, `ograniczenie ${i + 1}: ${esc(e.message)}`, ['ce' + i]); } const r = num(c.rhs); if (!isFinite(r)) return netFail(NLP, out, `ograniczenie ${i + 1}: prawa strona musi być liczbą.`, ['crhs' + i]); cons.push({g: G.f, n: G.n, type: c.rel, rhs: r, e: c.e}); }
  if (m === 'con' && !cons.length) return netFail(NLP, out, 'dodaj co najmniej jedno ograniczenie (albo wybierz zadanie bez ograniczeń).', []);
  const n = Math.max(F.n, ...cons.map(c => c.n), 1);
  if (x0.length !== n || x0.some(v => !isFinite(v))) return netFail(NLP, out, `punkt startowy: podaj ${n} ${n === 1 ? 'liczbę' : 'liczby'} rozdzielone średnikiem (zadanie ma ${n} ${n === 1 ? 'zmienną' : 'zmienne'}).`, ['x0']);
  if (!isFinite(F.f(x0))) return netFail(NLP, out, 'funkcja celu nie ma skończonej wartości w punkcie startowym – wybierz inny.', ['x0']);
  return {...X, n, x0, f: F.f, cons};
}
function nlSolveUI() { const X = nlRead(); if (!X) return; const h = nlReportHTML(X); $('#out-nlp').innerHTML = h; last.nlp = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function nlReportHTML(X) {
  const f4 = v => !isFinite(v) ? '–' : fmt(Math.round(v * 1e6) / 1e6), fe = v => !isFinite(v) ? '–' : Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2).replace('.', ',') : fmt(Math.round(v * 1e6) / 1e6), xs = x => `(${x.map(f4).join('; ')})`, MX = X.maxi ? 'maksimum' : 'minimum';
  const cut = (rows, row) => rows.length > 34 ? rows.slice(0, 25).map(row).join('') + `<tr><td colspan="9" class="hint">… pominięto ${rows.length - 30} wierszy …</td></tr>` + rows.slice(-5).map(row).join('') : rows.map(row).join('');
  let h = `<h3>Programowanie nieliniowe – ${NL_METHODS[X.mode][X.method]}</h3><div class="formula">${X.maxi ? 'max' : 'min'} f(x) = ${esc(X.fs)}${X.mode === '1d' ? `, x ∈ [${f4(X.a)}; ${f4(X.b)}]` : ''}</div>`;
  if (X.cons && X.cons.length) h += `<p>Ograniczenia: ${X.cons.map(c => `${esc(c.e)} ${sign(c.type)} ${f4(c.rhs)}`).join('; ')}.</p>`;
  const desc = {golden: 'W każdym kroku porównujemy f w dwóch punktach dzielących przedział w złotym stosunku (0,618) i odrzucamy część, w której optimum być nie może. Jeden z punktów przechodzi do następnego kroku, więc liczymy tylko jedną nową wartość. Wymaga funkcji unimodalnej na przedziale.',
    fib: 'Jak złoty podział, ale punkty dzielą przedział w stosunkach kolejnych liczb Fibonacciego; liczba kroków wynika z żądanej dokładności – to najlepsza możliwa strategia przy ustalonej liczbie obliczeń f.',
    bisect: 'Szukamy punktu, w którym pochodna f′ = 0: dzielimy przedział na pół i zostawiamy połowę, na której końcach pochodna ma przeciwne znaki. Pochodną liczymy numerycznie.', newton: 'Przybliżamy f parabolą (rozwinięcie Taylora drugiego rzędu) i skaczemy do jej wierzchołka: x ← x − f′(x)/f″(x). Zbieżność bardzo szybka w pobliżu optimum, ale wymaga dobrego startu.',
    grad: 'Idziemy w kierunku przeciwnym do gradientu (najszybszy spadek); długość kroku dobieramy regułą Armijo (połowimy krok, aż spadek f jest wystarczający). Prosta metoda, ale w „wąskich dolinach” bardzo wolna.',
    bfgs: 'Metoda quasi-Newtona: z kolejnych gradientów buduje przybliżenie odwrotności hesjanu (wzór BFGS), więc działa prawie tak szybko jak Newton, bez liczenia drugich pochodnych.',
    auglag: 'Ograniczenia trafiają do funkcji Lagrange’a z karą: L(x, λ, μ) = f(x) + Σ λ·g(x) + (μ/2)·Σ g(x)². Po każdej minimalizacji (BFGS) poprawiamy mnożniki λ; nie trzeba nieskończenie dużej kary, a mnożniki na końcu to mnożniki KKT.',
    penalty: 'Do funkcji celu dodajemy karę μ·Σ(naruszenie)² i minimalizujemy bez ograniczeń (BFGS), zwiększając μ dziesięciokrotnie, aż naruszenie spadnie poniżej tolerancji. Rozwiązania pośrednie leżą lekko poza obszarem dopuszczalnym.'};
  if (X.method === 'newton' && X.mode === 'free') desc.newton = 'Kierunek z układu H·d = −∇f (hesjan H liczony numerycznie). Gdy H nie jest dodatnio określony, dodajemy μ·I (modyfikacja Levenberga), by kierunek prowadził w dół; krok z regułą Armijo.';
  h += `<p class="hint">${desc[X.method]}</p>`;
  const fail = R => R.status === 'nobracket' ? `<p class="msg">${esc(R.msg)}</p>` : R.status === 'diverge' ? `<p class="msg">Obliczenia rozbiegły się (wartości nieskończone albo f maleje bez końca) – zadanie może być nieograniczone. ${X.maxi ? 'Maksimum' : 'Minimum'} nie istnieje albo trzeba dodać ograniczenia.</p>` :
    `<p class="msg">Brak zbieżności w limicie iteracji${R.msg ? ' (' + esc(R.msg) + ')' : ''} – wynik byłby niewiarygodny, więc go nie podajemy jako rozwiązania${R.x ? `; ostatni punkt: ${Array.isArray(R.x) ? xs(R.x) : f4(R.x)}` : ''}. Zwiększ limit iteracji, zmień punkt startowy albo metodę.</p>`;
  if (X.mode === '1d') {
    const R = nlp1D(X.f, X.method, {a: X.a, b: X.b, x0: X.x0, tol: X.tol, maxIt: X.maxIt, maxi: X.maxi});
    const head = X.method === 'newton' ? '<th>k</th><th>x</th><th>f′(x)</th><th>f″(x)</th><th>f(x)</th>' : X.method === 'bisect' ? '<th>k</th><th>a</th><th>b</th><th>środek</th><th>f′(środek)</th>' : '<th>k</th><th>a</th><th>b</th><th>x₁</th><th>x₂</th><th>f(x₁)</th><th>f(x₂)</th>';
    const row = r => X.method === 'newton' ? `<tr><td>${r.k}</td><td>${f4(r.x)}</td><td>${fe(r.d)}</td><td>${f4(r.dd)}</td><td>${f4(r.fx)}</td></tr>` : X.method === 'bisect' ? `<tr><td>${r.k}</td><td>${f4(r.a)}</td><td>${f4(r.b)}</td><td>${f4(r.x)}</td><td>${fe(r.d)}</td></tr>` : `<tr><td>${r.k}</td><td>${f4(r.a)}</td><td>${f4(r.b)}</td><td>${f4(r.x1)}</td><td>${f4(r.x2)}</td><td>${f4(r.f1)}</td><td>${f4(r.f2)}</td></tr>`;
    if (R.rows.length) h += `<h4>Przebieg obliczeń</h4><div class="tw"><table><thead><tr>${head}</tr></thead>${cut(R.rows, row)}</table></div>`;
    if (R.status !== 'optimal') return h + fail(R);
    const pts = []; for (let k = 0; k <= 120; k++) { const x = X.a + (X.b - X.a) * k / 120, v = X.f(x); if (isFinite(v)) pts.push([x, v]); }
    if (X.method === 'newton' && (X.maxi ? R.curv > 0 : R.curv < 0)) h += `<p class="note">Uwaga: druga pochodna w znalezionym punkcie ma ${X.maxi ? 'dodatni' : 'ujemny'} znak – metoda Newtona znalazła punkt stacjonarny, ale to ${X.maxi ? 'minimum' : 'maksimum'}, a nie szukane ${MX}.</p>`;
    return h + `<div class="sum"><b>Wynik:</b> ${MX} w x = <b>${f4(R.x)}</b>, f(x) = <b>${f4(R.fx)}</b> (${R.rows.length} ${X.method === 'fib' ? 'kroków, liczba Fibonacciego F' + sub(R.N) : 'iteracji'}${X.method === 'newton' || X.method === 'bisect' ? '' : `; końcowa długość przedziału < ${fe(X.tol)}`}).</div>` +
      VZ.line([{name: 'f(x)', pts}], {title: 'Wykres funkcji', xLabel: 'x', marks: [{x: R.x, y: R.fx, label: MX}]});
  }
  const R = X.mode === 'free' ? nlpMin(X.f, X.x0, X.method, {tol: X.tol, maxIt: X.maxIt, maxi: X.maxi}) : nlpCon(X.f, X.x0, X.cons.map(c => ({g: c.g, type: c.type, rhs: c.rhs})), X.method, {tol: X.tol, maxi: X.maxi});
  if (X.mode === 'free') h += `<h4>Przebieg obliczeń</h4><div class="tw"><table><thead><tr><th>k</th><th>x</th><th>f(x)</th><th>‖∇f‖</th><th>krok α</th></tr></thead>` + cut(R.rows, r => `<tr><td>${r.k}</td><td>${xs(r.x)}</td><td>${f4(r.fx)}</td><td>${fe(r.gn)}</td><td>${r.alphaNext === undefined ? '–' : fe(r.alphaNext)}</td></tr>`) + '</table></div>' +
    (R.mods ? `<p class="hint">Hesjan nie był dodatnio określony w ${R.mods} iteracjach – dodano μ·I (kierunek spadku zachowany).</p>` : '');
  else h += `<h4>Przebieg obliczeń (iteracje zewnętrzne)</h4><div class="tw"><table><thead><tr><th>k</th><th>μ</th><th>x</th><th>f(x)</th><th>Największe naruszenie</th>${X.method === 'auglag' ? '<th>Mnożniki λ</th>' : ''}<th>Kroki BFGS</th></tr></thead>` +
    R.rows.map(r => `<tr><td>${r.k}</td><td>${fe(r.mu)}</td><td>${xs(r.x)}</td><td>${f4(r.fx)}</td><td>${fe(r.viol)}</td>${X.method === 'auglag' ? `<td>${r.lam.map(v => f4(X.maxi ? -v : v)).join('; ')}</td>` : ''}<td>${r.inner}</td></tr>`).join('') + '</table></div>';
  if (R.status !== 'optimal') return h + fail(R);
  h += `<div class="sum"><b>Wynik:</b> ${MX} w x = <b>${xs(R.x)}</b>, f(x) = <b>${f4(R.fx)}</b>${X.mode === 'free' ? ` (${R.rows.length - 1} iteracji, ‖∇f‖ = ${fe(R.rows[R.rows.length - 1].gn)})` : ''}.${R.lam ? ` Mnożniki Lagrange’a (KKT): ${R.lam.map((v, i) => `λ${sub(i + 1)} = ${f4(v)}`).join(', ')} – dodatni mnożnik oznacza ograniczenie wiążące.` : ''}</div>` +
    '<p class="hint">Metody gradientowe znajdują minimum lokalne. Dla funkcji wypukłej (i wypukłego obszaru) to minimum globalne; w innym razie warto sprawdzić kilka punktów startowych.</p>';
  if (X.n === 2) { const P = R.path, xsP = P.map(p => p[0]), ysP = P.map(p => p[1]), pad = q => Math.max(1, Math.abs(q)) * 0.6;
    const x0 = Math.min(...xsP) - pad(Math.max(...xsP) - Math.min(...xsP)), x1 = Math.max(...xsP) + pad(Math.max(...xsP) - Math.min(...xsP)), y0 = Math.min(...ysP) - pad(Math.max(...ysP) - Math.min(...ysP)), y1 = Math.max(...ysP) + pad(Math.max(...ysP) - Math.min(...ysP));
    const fn = (a, b) => X.f([a, b]), fl = (() => { const v = []; for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) { const q = fn(x0 + (x1 - x0) * i / 30, y0 + (y1 - y0) * j / 30); if (isFinite(q)) v.push(q); } v.sort((a, b) => a - b); const fs = R.fx * (X.maxi ? 1 : 1); return Array.from({length: 14}, (_, k) => v[0] + (v[Math.floor(v.length * 0.7)] - v[0]) * ((k + 1) / 15) ** 2).concat(fs + 1e-9); })();
    h += '<h4>Poziomice i ścieżka iteracji</h4>' + VZ.contour(fn, {x0, x1, y0, y1, levels: fl, path: P.length > 400 ? P.filter((_, i) => i % Math.ceil(P.length / 400) === 0).concat([P[P.length - 1]]) : P, zero: (X.cons || []).map(c => (a, b) => c.g([a, b]) - c.rhs), points: [{x: X.x0[0], y: X.x0[1], label: 'start', cls: 'u'}, {x: R.x[0], y: R.x[1], label: MX}], title: 'Poziomice f i ścieżka'}) +
      `<p class="hint">Czerwona linia – kolejne punkty metody${X.mode === 'con' ? ' (łącznie z minimalizacjami pomocniczymi); czarne krzywe – brzegi ograniczeń g(x) = prawa strona' : ''}.</p>`; }
  if (X.mode === 'free' && R.rows.length > 2) h += VZ.line([{name: 'log₁₀‖∇f‖', pts: R.rows.filter(r => r.gn > 0).map(r => [r.k, Math.log10(r.gn)])}], {title: 'Zbieżność: logarytm normy gradientu', xLabel: 'iteracja'});
  return h;
}
registerModule({id: 'nlp', title: 'Programowanie nieliniowe', init: nlInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c3-10 6-12 9-6s6 4 9-6"/><circle cx="12" cy="12.5" r="1.6"/></svg>',
  html: '<div class="card"><div id="nlp-top"></div><div><button id="btn-nlp" type="button">Rozwiąż</button></div><div id="out-nlp"></div></div>'});
