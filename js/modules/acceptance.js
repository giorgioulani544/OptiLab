/* ===== OptiLab – moduł Odbiór statystyczny (kontrola odbiorcza) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/qc/acceptance-solver.js. */
const ACP = 'acc-';
const AC_MODES = {single: 'ocena planu jednostopniowego (n, c)', design: 'dobór planu dla AQL i LTPD', double: 'plan dwustopniowy', sprt: 'plan sekwencyjny (SPRT Walda)', var: 'plan dla cech mierzalnych, znane σ (zaawansowane)'};
const AC_DISTS = {bin: 'dwumianowy (duża partia)', poi: 'Poissona (przybliżenie)', hyp: 'hipergeometryczny (dokładny dla partii N)'};
const AC_F = {n: {key: 'n', label: 'Liczebność próbki n'}, c: {key: 'c', label: 'Liczba akceptująca c (najwięcej wadliwych w próbce)'}, N: {key: 'N', label: 'Liczebność partii N', unit: 'puste = partia bardzo duża', blank: true},
  AQL: {key: 'AQL', label: 'AQL – akceptowalny poziom jakości', unit: 'frakcja, np. 0,01'}, alpha: {key: 'alpha', label: 'Ryzyko dostawcy α', unit: 'np. 0,05'}, LTPD: {key: 'LTPD', label: 'LTPD – graniczna frakcja wadliwych', unit: 'np. 0,06'}, beta: {key: 'beta', label: 'Ryzyko odbiorcy β', unit: 'np. 0,10'},
  n1: {key: 'n1', label: 'Pierwsza próbka n₁'}, c1: {key: 'c1', label: 'Liczba akceptująca c₁'}, n2: {key: 'n2', label: 'Druga próbka n₂'}, c2: {key: 'c2', label: 'Łączna liczba akceptująca c₂ (dla n₁ + n₂)'},
  p1: {key: 'p1', label: 'Frakcja dobra p₁ (jak AQL)'}, p2: {key: 'p2', label: 'Frakcja zła p₂ (jak LTPD)'}};
const acFields = I => ({single: ['n', 'c', 'N'], design: ['AQL', 'alpha', 'LTPD', 'beta', ...(I.dist === 'hyp' ? ['N'] : [])], double: ['n1', 'c1', 'n2', 'c2', 'N'], sprt: ['p1', 'p2', 'alpha', 'beta'], var: ['AQL', 'alpha', 'LTPD', 'beta']})[I.mode].map(k => AC_F[k]);
const acEx = (name, d) => ({name, data: {dist: 'bin', n: '89', c: '2', N: '10000', AQL: '0.01', alpha: '0.05', LTPD: '0.06', beta: '0.1', n1: '50', c1: '1', n2: '100', c2: '3', p1: '0.01', p2: '0.06', seq: '', ...d}});
const AC_EXAMPLES = [
  acEx('Plan n = 89, c = 2 (Montgomery) – krzywa OC, AOQ, ATI', {mode: 'single'}),
  acEx('Dobór planu: AQL 1%, LTPD 6%, α = 5%, β = 10%', {mode: 'design'}),
  acEx('Mała partia N = 200 – rozkład hipergeometryczny', {mode: 'single', dist: 'hyp', n: '32', c: '1', N: '200'}),
  acEx('Plan dwustopniowy (50, 1; 100, 3)', {mode: 'double'}),
  acEx('Plan sekwencyjny z przebiegiem kontroli', {mode: 'sprt', seq: '0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'}),
  acEx('Cechy mierzalne – plan k (znane σ)', {mode: 'var'}),
];
let AC = acNormalize(JSON.parse(JSON.stringify(AC_EXAMPLES[0].data)));
function acNormalize(d) {
  if (!d || !AC_MODES[d.mode]) throw new Error('to nie jest zadanie z modułu Odbiór statystyczny (nieznany rodzaj planu).');
  const o = {mode: d.mode, dist: AC_DISTS[d.dist] ? d.dist : 'bin', seq: String(d.seq ?? '')}; Object.keys(AC_F).forEach(k => { o[k] = String(d[k] ?? ''); }); return o;
}
function acRender() {
  $('#' + ACP + 'mode').value = AC.mode; $('#' + ACP + 'dist').value = AC.dist; $('#' + ACP + 'distbox').hidden = ['sprt', 'var'].includes(AC.mode);
  $('#' + ACP + 'dist').querySelectorAll('option').forEach(o => { o.disabled = AC.mode === 'double' && o.value === 'hyp'; });
  $('#' + ACP + 'params').innerHTML = paramFormHTML(ACP, acFields(AC), AC); $('#' + ACP + 'seqbox').hidden = AC.mode !== 'sprt'; $('#' + ACP + 'seq').value = AC.seq;
  matrixPolish($('#' + ACP + 'top'));
}
function acSync() { paramSync(ACP, acFields(AC), AC); AC.mode = $('#' + ACP + 'mode').value; AC.dist = $('#' + ACP + 'dist').value; AC.seq = $('#' + ACP + 'seq').value; if (AC.mode === 'double' && AC.dist === 'hyp') AC.dist = 'bin'; }
function acInit() {
  $('#' + ACP + 'top').innerHTML = `<div class="crow"><label for="${ACP}mode">Zadanie</label><select id="${ACP}mode">${Object.entries(AC_MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="crow" id="${ACP}distbox"><label for="${ACP}dist">Rozkład liczby wadliwych</label><select id="${ACP}dist">${Object.entries(AC_DISTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(ACP)}<div id="${ACP}params"></div><div id="${ACP}seqbox"><div class="crow"><label for="${ACP}seq">Przebieg kontroli (opcjonalnie): 0 – dobry, 1 – wadliwy</label></div><textarea id="${ACP}seq" rows="2" class="tx" style="width:100%" placeholder="np. 0 0 1 0 0 0 …"></textarea></div><div id="${ACP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary>${netToolsHTML(ACP, AC_EXAMPLES)}</details>
    <p class="hint">Z partii pobieramy n sztuk; jeśli wadliwych jest najwyżej c – partię przyjmujemy, w przeciwnym razie odrzucamy (i np. kontrolujemy w całości). Krzywa OC pokazuje, jak często plan przyjmie partię o danej frakcji wadliwych.</p>`;
  ['mode', 'dist'].forEach(k => $('#' + ACP + k).onchange = () => { acSync(); clearErr(); acRender(); });
  matrixWire($('#' + ACP + 'top'));
  const keys = ['mode', 'dist', ...Object.keys(AC_F), 'seq'];
  netToolsWire(ACP, {kind: 'acceptance', out: '#out-acc', examples: AC_EXAMPLES, normalize: acNormalize, get: () => { acSync(); return JSON.parse(JSON.stringify(AC)); }, set: d => { AC = d; acRender(); },
    toCSV: d => paramsToCSV(keys.map(k => [k, d[k]]).filter(([, v]) => v !== '')), fromCSV: t => paramsFromCSV(t, keys, null, ['mode', 'dist', 'seq']).meta});
  $('#btn-acc').onclick = acSolveUI;
  acRender();
}
function acRead() {
  clearErr(); acSync();
  const out = '#out-acc', bad = [], X = {mode: AC.mode, dist: AC.dist};
  acFields(AC).forEach(f => { const s = String(AC[f.key]).trim().replace(',', '.'); if (s === '' && f.blank) { X[f.key] = null; return; } const x = Number(s); if (s === '' || !isFinite(x) || x < 0) bad.push(f.key); X[f.key] = x; });
  if (bad.length) return netFail(ACP, out, 'wpisz w zaznaczonych polach liczby nieujemne.', bad);
  const int = (k, lo) => { if (!(Number.isInteger(X[k]) && X[k] >= lo)) bad.push(k); }, frac = k => { if (!(X[k] > 0 && X[k] < 1)) bad.push(k); };
  if (X.mode === 'single') { int('n', 1); int('c', 0); if (!bad.length && X.c >= X.n) bad.push('c'); if (X.N !== null && !(Number.isInteger(X.N) && X.N >= X.n)) bad.push('N'); if (X.dist === 'hyp' && X.N === null) bad.push('N'); }
  if (X.mode === 'double') { int('n1', 1); int('c1', 0); int('n2', 1); int('c2', 0); if (!bad.length && !(X.c2 > X.c1 && X.c2 < X.n1 + X.n2)) bad.push('c2'); if (X.N !== null && !(Number.isInteger(X.N) && X.N >= X.n1 + X.n2)) bad.push('N'); }
  if (['design', 'var'].includes(X.mode)) { ['AQL', 'alpha', 'LTPD', 'beta'].forEach(frac); if (!bad.length && !(X.LTPD > X.AQL)) bad.push('LTPD'); if (X.mode === 'design' && X.dist === 'hyp' && !(Number.isInteger(X.N) && X.N >= 2)) bad.push('N'); }
  if (X.mode === 'sprt') { ['p1', 'p2', 'alpha', 'beta'].forEach(frac); if (!bad.length && !(X.p2 > X.p1)) bad.push('p2');
    const items = String(AC.seq).split(/[\s,;]+/).filter(Boolean); if (items.some(v => v !== '0' && v !== '1')) return netFail(ACP, out, 'przebieg kontroli: wpisz tylko 0 (dobry) i 1 (wadliwy), rozdzielone spacjami.', ['seq']); X.items = items.map(Number); }
  if (bad.length) return netFail(ACP, out, 'popraw zaznaczone pola: n – całkowite dodatnie, c < n (c₂ > c₁), frakcje i ryzyka między 0 a 1, LTPD > AQL (p₂ > p₁), N ≥ n.', bad);
  return X;
}
function acSolveUI() { const X = acRead(); if (!X) return; const h = acReportHTML(X); $('#out-acc').innerHTML = h; last.acc = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function acReportHTML(X) {
  const f = v => fmt(Math.round(v * 10000) / 10000), pc = v => fmt(Math.round(v * 10000) / 100) + '%', dn = {bin: 'rozkład dwumianowy', poi: 'rozkład Poissona (λ = n·p)', hyp: `rozkład hipergeometryczny (partia N = ${X.N})`}[X.dist];
  const ocTable = (rows, extra) => '<div class="tw"><table><thead><tr><th>Frakcja wadliwych p</th><th>P<sub>a</sub> (przyjęcie)</th>' + (extra ? '<th>AOQ</th><th>ATI</th>' : '') + '</tr></thead>' +
    rows.filter((_, k) => k % 10 === 0).map(r => `<tr><td>${f(r.p)}</td><td>${f(r.Pa)}</td>${extra ? `<td>${f(r.AOQ)}</td><td>${r.ATI === null ? '–' : fmt(Math.round(r.ATI))}</td>` : ''}</tr>`).join('') + '</table></div>';
  if (X.mode === 'single') {
    const S = accSingle(X.n, X.c, X.N, X.dist);
    let h = `<h3>Plan jednostopniowy n = ${X.n}, c = ${X.c}</h3><p class="hint">P<sub>a</sub>(p) = P(liczba wadliwych w próbce ≤ c) – ${dn}. AOQ = P<sub>a</sub>·p·(N − n)/N – średnia jakość wychodząca, gdy odrzucone partie kontrolujemy w całości i wymieniamy wadliwe; ATI = n + (1 − P<sub>a</sub>)(N − n) – średnia liczba kontrolowanych sztuk na partię.</p>`;
    h += `<div class="formula">P<sub>a</sub>(p) = Σ<sub>d=0</sub><sup>${X.c}</sup> C(${X.n}, d)·p<sup>d</sup>·(1 − p)<sup>${X.n}−d</sup>${X.dist === 'bin' ? '' : ' (tu: ' + dn + ')'}</div>` + ocTable(S.rows, true);
    h += VZ.line([{name: 'P_a', pts: S.rows.map(r => [r.p, r.Pa])}], {title: 'Krzywa operacyjno-charakterystyczna (OC)', xLabel: 'frakcja wadliwych p', yLabel: 'P(przyjęcia partii)'});
    h += VZ.line([{name: 'AOQ', pts: S.rows.map(r => [r.p, r.AOQ]), cls: 'b'}], {title: 'Średnia jakość wychodząca AOQ', xLabel: 'frakcja wadliwych p', marks: [{x: S.pAOQL, y: S.AOQL, label: 'AOQL = ' + f(S.AOQL)}]});
    if (X.N) h += VZ.line([{name: 'ATI', pts: S.rows.map(r => [r.p, r.ATI]), cls: 'c'}], {title: 'Średnia liczba kontrolowanych sztuk ATI', xLabel: 'frakcja wadliwych p'});
    return h + `<div class="sum"><b>Wynik:</b> przy frakcji wadliwych 1% plan przyjmuje partię z prawdopodobieństwem ${pc(accPa(X.n, X.c, 0.01, X.dist, X.N))}; najgorsza średnia jakość wychodząca AOQL = <b>${pc(S.AOQL)}</b> (przy p = ${pc(S.pAOQL)}).</div>`;
  }
  if (X.mode === 'design') {
    const D = accDesign(X.AQL, X.alpha, X.LTPD, X.beta, X.dist, X.N);
    let h = `<h3>Dobór planu jednostopniowego</h3><p class="hint">Szukamy najmniejszej próbki, dla której partia dobra (p = AQL = ${pc(X.AQL)}) jest przyjmowana z prawdopodobieństwem co najmniej 1 − α = ${pc(1 - X.alpha)}, a partia zła (p = LTPD = ${pc(X.LTPD)}) – najwyżej z prawdopodobieństwem β = ${pc(X.beta)}. Dla kolejnych c wyznaczamy najmniejsze n spełniające warunek LTPD i sprawdzamy warunek AQL; pierwsze c, które przechodzi, daje najmniejsze n.</p>`;
    h += '<div class="tw"><table><thead><tr><th>c</th><th>Najmniejsze n dla LTPD</th><th>P<sub>a</sub>(AQL)</th><th>P<sub>a</sub>(LTPD)</th><th>Warunek AQL</th></tr></thead>' + D.steps.map(s => s.n === null ? `<tr><td>${s.c}</td><td colspan="4">brak n</td></tr>` : `<tr${s.ok ? ' class="sel"' : ''}><td>${s.c}</td><td>${s.n}</td><td>${f(s.pa1)}</td><td>${f(s.pa2)}</td><td>${s.ok ? 'spełniony' : 'nie'}</td></tr>`).join('') + '</table></div>';
    if (D.status !== 'ok') return h + '<p class="msg">Nie znaleziono planu (sprawdź, czy LTPD jest wyraźnie większe od AQL).</p>';
    const S = accSingle(D.n, D.c, X.N, X.dist, Math.min(1, X.LTPD * 2));
    return h + `<div class="sum"><b>Plan: n = ${D.n}, c = ${D.c}</b> – P<sub>a</sub>(AQL) = ${f(D.pa1)} ≥ ${f(1 - X.alpha)}, P<sub>a</sub>(LTPD) = ${f(D.pa2)} ≤ ${f(X.beta)}.</div>` +
      VZ.line([{name: 'P_a', pts: S.rows.map(r => [r.p, r.Pa])}], {title: 'Krzywa OC dobranego planu', xLabel: 'frakcja wadliwych p', marks: [{x: X.AQL, y: D.pa1, label: 'AQL'}, {x: X.LTPD, y: D.pa2, label: 'LTPD'}]});
  }
  if (X.mode === 'double') {
    const top = Math.min(1, Math.max(0.05, 4 * (X.c2 + 1) / (X.n1 + X.n2))), rows = Array.from({length: 101}, (_, k) => { const p = top * k / 100; return {p, ...accDouble(X.n1, X.c1, X.n2, X.c2, p, X.dist)}; });
    let h = `<h3>Plan dwustopniowy</h3><p class="hint">Pobieramy n₁ = ${X.n1}: jeśli wadliwych d₁ ≤ c₁ = ${X.c1} – przyjmujemy; jeśli d₁ > c₂ = ${X.c2} – odrzucamy; w przeciwnym razie pobieramy n₂ = ${X.n2} i przyjmujemy, gdy d₁ + d₂ ≤ c₂. ` +
      `P<sub>a</sub> = P(d₁ ≤ c₁) + Σ<sub>d₁=c₁+1</sub><sup>c₂</sup> P(d₁)·P(d₂ ≤ c₂ − d₁); ASN = n₁ + n₂·P(c₁ < d₁ ≤ c₂) – średnia liczebność próbki.</p>`;
    h += '<div class="tw"><table><thead><tr><th>p</th><th>P<sub>a</sub></th><th>P(decyzja po 1. próbce)</th><th>ASN</th></tr></thead>' + rows.filter((_, k) => k % 10 === 0).map(r => `<tr><td>${f(r.p)}</td><td>${f(r.Pa)}</td><td>${f(1 - r.Psecond)}</td><td>${f(r.ASN)}</td></tr>`).join('') + '</table></div>';
    h += VZ.line([{name: 'P_a', pts: rows.map(r => [r.p, r.Pa])}], {title: 'Krzywa OC planu dwustopniowego', xLabel: 'frakcja wadliwych p'}) + VZ.line([{name: 'ASN', pts: rows.map(r => [r.p, r.ASN]), cls: 'b'}], {title: 'Średnia liczebność próbki ASN', xLabel: 'frakcja wadliwych p'});
    return h + `<div class="sum"><b>Wynik:</b> średnia liczebność próbki wynosi od ${f(Math.min(...rows.map(r => r.ASN)))} do ${f(Math.max(...rows.map(r => r.ASN)))} – plan dwustopniowy zwykle wymaga mniej kontroli niż jednostopniowy o podobnej krzywej OC.</div>`;
  }
  if (X.mode === 'sprt') {
    const S = accSPRT(X.p1, X.p2, X.alpha, X.beta), nmax = Math.max(40, Math.ceil(3 * Math.max(S.ASN1, S.ASN2)), X.items.length), seq = X.items.length ? accSequence(S, X.items) : null;
    let h = `<h3>Plan sekwencyjny (SPRT Walda)</h3><p class="hint">Sprawdzamy sztuki pojedynczo i po każdej porównujemy liczbę wadliwych d z dwiema prostymi: przyjmujemy, gdy d ≤ −h₁ + s·n, odrzucamy, gdy d ≥ h₂ + s·n, a pomiędzy – kontrolujemy dalej.</p>` +
      `<div class="formula">k = ln(p₂(1 − p₁)/(p₁(1 − p₂))) = ${f(S.k)};&nbsp; h₁ = ln((1 − α)/β)/k = <b>${f(S.h1)}</b>;&nbsp; h₂ = ln((1 − β)/α)/k = <b>${f(S.h2)}</b>;&nbsp; s = ln((1 − p₁)/(1 − p₂))/k = <b>${f(S.s)}</b></div>`;
    h += `<p>Średnia liczba sprawdzonych sztuk (przybliżenie Walda): przy p = p₁ – ${f(S.ASN1)}, przy p = p₂ – ${f(S.ASN2)}.</p>`;
    const ns = Array.from({length: Math.min(nmax, 200)}, (_, k) => k + 1);
    h += VZ.line([{name: 'linia przyjęcia', pts: ns.map(n => [n, S.accept(n)]), cls: 'c'}, {name: 'linia odrzucenia', pts: ns.map(n => [n, S.reject(n)]), cls: 'b'}, ...(seq ? [{name: 'przebieg d', pts: seq.path.map(q => [q.n, q.d]), step: true, dots: seq.path.length <= 60}] : [])], {title: 'Wykres decyzji sekwencyjnych', xLabel: 'liczba sprawdzonych sztuk n', yLabel: 'wadliwe d'});
    h += '<details class="adv"><summary>Tabela liczb przyjęcia i odrzucenia</summary><div class="tw"><table><thead><tr><th>n</th><th>Przyjmij, gdy d ≤</th><th>Odrzuć, gdy d ≥</th></tr></thead>' + ns.slice(0, 60).map(n => { const a = Math.floor(S.accept(n) + 1e-9), r = Math.ceil(S.reject(n) - 1e-9); return `<tr><td>${n}</td><td>${a < 0 ? '–' : a}</td><td>${r}</td></tr>`; }).join('') + '</table></div></details>';
    if (seq) h += `<div class="sum"><b>Przebieg kontroli:</b> ${seq.decision === 'accept' ? `partię <b>przyjęto</b> po ${seq.at} sztukach` : seq.decision === 'reject' ? `partię <b>odrzucono</b> po ${seq.at} sztukach` : `po ${seq.at} sztukach nadal brak decyzji – trzeba kontrolować dalej`} (wadliwych: ${seq.path[seq.path.length - 1].d}).</div>`;
    return h;
  }
  const V = accVariables(X.AQL, X.alpha, X.LTPD, X.beta), ps = Array.from({length: 101}, (_, k) => Math.max(1e-6, X.LTPD * 2 * k / 100));
  return `<h3>Plan dla cech mierzalnych (znane σ, jedna granica tolerancji)</h3><p class="hint">Mierzymy n sztuk i liczymy wskaźnik (USL − x̄)/σ (albo (x̄ − LSL)/σ); partię przyjmujemy, gdy jest on co najmniej k. Plan potrzebuje dużo mniejszej próbki niż kontrola alternatywna (dobry/wadliwy).</p>` +
    `<div class="formula">n = ((z<sub>α</sub> + z<sub>β</sub>)/(z<sub>AQL</sub> − z<sub>LTPD</sub>))² = ${f(V.nExact)} → <b>n = ${V.n}</b>;&nbsp; k = (z<sub>AQL</sub>·z<sub>β</sub> + z<sub>LTPD</sub>·z<sub>α</sub>)/(z<sub>α</sub> + z<sub>β</sub>) = <b>${f(V.k)}</b></div>` +
    `<div class="sum"><b>Plan:</b> zmierz ${V.n} sztuk, przyjmij partię, gdy (USL − x̄)/σ ≥ ${f(V.k)}. P<sub>a</sub>(AQL) = ${f(V.pa1)}, P<sub>a</sub>(LTPD) = ${f(V.pa2)}.</div>` +
    VZ.line([{name: 'P_a', pts: ps.map(p => [p, V.Pa(p)])}], {title: 'Krzywa OC planu dla cech mierzalnych', xLabel: 'frakcja wadliwych p', marks: [{x: X.AQL, y: V.pa1, label: 'AQL'}, {x: X.LTPD, y: V.pa2, label: 'LTPD'}]});
}
registerModule({id: 'acc', title: 'Odbiór statystyczny', init: acInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="14" height="16" rx="2"/><path d="M7 9h6M7 13h4"/><path d="M15 17l2.5 2.5L22 15"/></svg>',
  html: '<div class="card"><div id="acc-top"></div><div><button id="btn-acc" type="button">Oblicz</button></div><div id="out-acc"></div></div>'});
