/* ===== OptiLab – moduł Programowanie liniowe =====
   Zakładki: Simpleks (raport, analiza parametryczna, dual), Metoda graficzna, Całkowitoliczbowe (Branch & Bound). */
/* =====================================================================
   4. ZAKŁADKA: SIMPLEKS
   ===================================================================== */
/* Raport końcowy jak w QSB: koszty zredukowane, luzy, ceny dualne i zakresy analizy wrażliwości.
   Zakresy liczymy z końcowej tablicy (baza ma pozostać optymalna). */
/* Alternatywne optimum: wprowadzamy do bazy zmienną spoza bazy o koszcie zredukowanym 0 (jeden dodatkowy pivot) */
function altOptimum(M, s) {
  if (M.t.some(t => t === 'u')) return null;
  const T = s.T.map(r => r.slice()), m = M.A.length, N = T[0].length - 1, basis = s.basis.slice();
  for (let k = 0; k < N; k++) {
    if (basis.includes(k) || s.names[k][0] === 'a' || Math.abs(T[m][k]) > 1e-6) continue;
    let pr = -1, best = Infinity;
    for (let i = 0; i < m; i++) if (T[i][k] > 1e-9 && T[i][N] / T[i][k] < best - 1e-12) { best = T[i][N] / T[i][k]; pr = i; }
    if (pr < 0 || best < 1e-9) continue;
    const p = T[pr][k]; for (let j = 0; j <= N; j++) T[pr][j] /= p;
    for (let i = 0; i <= m; i++) if (i !== pr) { const f = T[i][k]; for (let j = 0; j <= N; j++) T[i][j] -= f * T[pr][j]; }
    basis[pr] = k; const x = Array(M.n).fill(0); basis.forEach((q, i) => { if (q < M.n) x[q] = T[i][N]; });
    return x;
  }
  return null;
}
function qsbReport(M, r, rec) {
  const S = lpSensitivity(M, r, rec), rg = (lo, hi) => `${isFinite(lo) ? fmt(lo) : '−∞'} … ${isFinite(hi) ? fmt(hi) : '+∞'}`;   // obliczenia: js/solver.js
  let alt = S.vars.some(v => !v.basic && v.rc < 1e-6);
  let h = '<details class="adv"><summary>Raport końcowy i analiza wrażliwości</summary><div class="tw"><table><tr><th>Zmienna</th><th>Wartość</th><th>Współcz. celu</th><th>Wkład w Z</th><th>Koszt zredukowany</th><th>Zakres współcz. celu</th></tr>';
  S.vars.forEach((v, j) => { const c = M.c[j];
    h += `<tr><th>x${sub(j+1)}</th><td>${fmt(r.x[j])}</td><td>${fmt(c)}</td><td>${fmt(c * r.x[j])}</td><td>${fmt(v.rc)}</td><td>${M.t[j] === 'u' ? '–' : rg(v.lo, v.hi)}</td></tr>`; });
  h += '</table></div><div class="tw"><table><tr><th>Ograniczenie</th><th>Lewa str.</th><th>Znak</th><th>Prawa str.</th><th>Luz / nadwyżka</th><th>Cena dualna</th><th>Zakres prawej strony</th></tr>';
  S.rows.forEach((q, i) => {
    h += `<tr><th>Ogr. ${i+1}</th><td>${fmt(q.lhs)}</td><td>${sign(M.rel[i])}</td><td>${fmt(M.b[i])}</td><td>${fmt(Math.abs(M.b[i] - q.lhs))}</td><td>${fmt(q.y)}</td><td>${rg(q.lo, q.hi)}</td></tr>`;
  });
  h += '</table></div><p class="hint">Cena dualna: o ile zmieni się Z, gdy prawa strona wzrośnie o 1. Koszt zredukowany: o ile pogorszy się Z po wymuszeniu 1 jednostki zmiennej spoza bazy. Zakresy: w tych granicach obecna baza pozostaje optymalna.</p>' +
    (r.degenerate ? '<p class="note">Rozwiązanie jest zdegenerowane (któraś zmienna bazowa ma wartość 0). Ceny dualne mogą wtedy nie być jednoznaczne – przy zwiększaniu i przy zmniejszaniu prawej strony mogą być różne – a niektóre zakresy kurczą się do jednej wartości.</p>' : '');
  const ax = altOptimum(M, S.s); alt = alt || !!ax;
  return h + (alt ? '<p class="note">Uwaga: zmienna spoza bazy ma koszt zredukowany 0 – ' + (ax ? 'istnieją' : 'mogą istnieć') + ' alternatywne rozwiązania optymalne.' +
    (ax ? ` Drugie rozwiązanie optymalne: ${ax.map((v, j) => `x${sub(j+1)} = ${fmt(v)}`).join(', ')} (to samo Z = ${fmt(r.z)}); każda kombinacja wypukła obu rozwiązań też jest optymalna.` : '') + '</p>' : '') + '</details>';
}
/* Analiza parametryczna: parametr θ (prawa strona wybranego ograniczenia albo współczynnik celu) zmienia się od–do.
   Próbkujemy zakres, wykrywamy zmianę bazy optymalnej, a punkty załamania doprecyzowujemy bisekcją. */
const us = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
function fillPar() {
  const md = models.simplex, what = $('#par-what').value, sel = $('#par-idx'), cur = sel.value;
  const items = what === 'b' ? md.rows.map((_, i) => 'ograniczenie ' + (i + 1)) : md.c.map((_, j) => 'x' + us(j + 1));
  sel.innerHTML = items.map((t, i) => `<option value="${i}">${t}</option>`).join('');
  if (cur !== '' && +cur < items.length) sel.value = cur;
}
$('#par-what').onchange = fillPar;
$('#par-box').addEventListener('input', e => { if (e.target.hasAttribute('data-num')) e.target.value = e.target.value.replace(/[^0-9,.\-]/g, '').replace(/(?!^)-/g, ''); });
$('#simplex-par-dir').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^0-9,.\-; ]/g, ''); });
$('#btn-par').onclick = () => {
  const M = readModel('simplex'); if (!M) return;
  const out = '#out-par', what = $('#par-what').value, idx = +$('#par-idx').value, len = what === 'b' ? M.A.length : M.n;
  const num = id => { const v = $('#simplex-par-' + id).value.trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
  const lo = num('from'), hi = num('to');
  if (!isFinite(lo) || !isFinite(hi)) return fail(out, 'wpisz liczby w polach „od" i „do".', ['par-from', 'par-to'], true);
  if (hi <= lo) return fail(out, 'wartość „do" musi być większa niż „od".', ['par-to'], true);
  const dirTxt = $('#simplex-par-dir').value.trim(), base = (what === 'b' ? M.b : M.c).slice();
  let d, label, caption = '';
  if (dirTxt) {                                          // tryb kierunku: wiele wartości naraz, parametr θ = przyrost
    d = dirTxt.split(';').map(v => v.trim()).filter(v => v !== '').map(v => Number(v.replace(',', '.')));
    if (d.length !== len || d.some(v => !isFinite(v))) return fail(out, `kierunek musi mieć dokładnie ${len} liczb oddzielonych średnikami (np. ${Array.from({length: len}, (_, i) => i ? 0 : 1).join('; ')}).`, ['par-dir'], true);
    if (d.every(v => v === 0)) return fail(out, 'kierunek nie może składać się z samych zer.', ['par-dir'], true);
    label = 'θ'; caption = `<p class="hint">${what}(θ) = ${what} + θ·d, gdzie d = (${d.map(fmt).join('; ')}).</p>`;
  } else {                                               // tryb prosty: parametrem jest sama wybrana wartość
    d = Array(len).fill(0); d[idx] = 1; base[idx] = 0; label = `${what}<sub>${idx + 1}</sub>`;
  }
  const R = parametric(M, what, base, d, lo, hi);
  if (R.error === 'limit') return fail(out, 'analizy nie dokończono – simpleks przekroczył limit iteracji dla któregoś parametru, więc wynik byłby niewiarygodny. Zawęź zakres albo sprawdź dane.', ['par-from', 'par-to'], true);
  if (R.error) return fail(out, 'zadanie nie ma rozwiązań dopuszczalnych, więc analiza parametryczna nie ma sensu.', M.b.map((_, i) => 'b' + i), true);
  const xs = x => '(' + x.map(fmt).join('; ') + ')', badTxt = what === 'b' ? 'brak rozwiązania dopuszczalnego' : 'zadanie nieograniczone';
  let h = `<h3>Analiza parametryczna: ${label} od ${fmt(lo)} do ${fmt(hi)}</h3>${caption}<div class="tw"><table><tr><th>Przedział ${label}</th><th>Z jako funkcja ${label}</th><th>Plan x${what === 'b' ? ' (początek → koniec)' : ''}</th></tr>`;
  R.segments.forEach(g => {
    h += `<tr><td>${fmt(g.start)} … ${fmt(g.end)}</td>` + (g.status !== 'optimal' ? `<td colspan="2">${badTxt}</td></tr>`
      : `<td>Z = ${fmt(g.alpha)} ${g.beta < 0 ? '−' : '+'} ${fmt(Math.abs(g.beta))}·${label}</td><td>${xs(g.x0)}${what === 'b' ? ' → ' + xs(g.x1) : ''}</td></tr>`);
  });
  h += '</table></div><p class="hint">Granice przedziałów to punkty załamania wyznaczone dokładnie (przecięcia prostych). W jednym przedziale Z zmienia się liniowo.</p><div id="par-plot" style="height:260px"></div>';
  $(out).innerHTML = h; last.par = h.replace(/<div id="par-plot"[^>]*><\/div>/, '');
  const opt = R.segments.filter(g => g.status === 'optimal'), px = [], py = [], bx = [], by = [];
  opt.forEach(g => { px.push(g.start, g.end, null); py.push(g.alpha + g.beta * g.start, g.alpha + g.beta * g.end, null); });
  R.segments.forEach((g, i) => { const q = R.segments[i - 1]; if (i && g.status === 'optimal' && q.status === 'optimal') { bx.push(g.start); by.push(g.alpha + g.beta * g.start); } });
  Plotly.newPlot('par-plot', [
    {x: px, y: py, mode: 'lines', line: {color: '#1b2a4e', width: 2}, hoverinfo: 'skip', showlegend: false},
    {x: bx, y: by, mode: 'markers+text', text: bx.map(t => fmt(t)), textposition: 'top center', marker: {size: 9, color: '#ffb703', line: {color: '#1b2a4e', width: 1.5}}, hoverinfo: 'skip', showlegend: false}],
    {xaxis: {title: label}, yaxis: {title: 'Z'}, margin: {l: 55, r: 10, t: 10, b: 45}}, {staticPlot: true, responsive: true});
};
/* Zadanie dualne: zapis + rozwiązanie (kontrola: W_opt = Z_opt) */
$('#btn-dual').onclick = () => {
  const M = readModel('simplex'); if (!M) return;
  const D = dualOf(M), r = solveM(D);
  let h = '<h3>Zadanie dualne</h3>' + dualHTML(D);
  h += r.status === 'optimal' ? `<div class="sum"><b>Wynik dualny:</b> ${r.x.map((v, i) => `y${sub(i+1)} = ${fmt(v)}`).join(', ')}; W<sub>opt</sub> = <b>${fmt(r.z)}</b>. Z twierdzenia o dualności W<sub>opt</sub> = Z<sub>opt</sub> zadania pierwotnego.</div>`
    : r.status === 'limit' ? '<p class="msg">Zadania dualnego nie rozwiązano – przekroczono limit iteracji simpleksu, więc wynik byłby niewiarygodny.</p>'
    : `<p class="note">Zadanie dualne ${r.status === 'unbounded' ? 'jest nieograniczone, więc pierwotne nie ma rozwiązań dopuszczalnych' : 'jest sprzeczne, więc pierwotne jest nieograniczone lub sprzeczne'}.</p>`;
  $('#out-dual').innerHTML = h; last.dual = h;
};
$('#btn-simplex').onclick = () => {
  const out = '#out-simplex', M = readModel('simplex'); if (!M) return;
  const rec = [], r = solveM(M, [], rec);
  let h = infoHTML(M);
  rec.forEach((s, k) => h += `<div class="step"><h4>Krok ${k + 1}</h4><p>${s.text}</p>${tableHTML(s)}</div>`);
  if (r.status !== 'optimal') { $(out).innerHTML = h; last.simplex = h; failLP(out, r, M, true); return; }
  h += `<div class="sum"><b>Wynik:</b> ${r.x.map((v, j) => `x${sub(j+1)} = ${fmt(v)}`).join(', ')}; Z<sub>opt</sub> = <b>${fmt(r.z)}</b></div>`;
  h += qsbReport(M, r, rec);
  $(out).innerHTML = h; last.simplex = h;
};

/* =====================================================================
   5. ZAKŁADKA: METODA GRAFICZNA (2 zmienne)
   Wierzchołki = przecięcia par prostych (w tym osi), które spełniają wszystkie ograniczenia.
   ===================================================================== */
/* Własna obsługa gestów na wykresie: 1 palec/mysz = przesuwanie, 2 palce = zoom, kółko = zoom.
   Zakresy osi ustawiamy przez Plotly.relayout; współrzędne ekranu przeliczamy na ułamki obszaru wykresu. */
function enableTouch(gd, Lmax) {
  gd._home = Lmax;                                   // zakres „Reset widoku" (aktualizowany przy każdym rysowaniu)
  if (gd._touch) return; gd._touch = true;
  const ptr = new Map(); let lastD = 0, on = true;
  const ax = () => [gd._fullLayout.xaxis, gd._fullLayout.yaxis];
  const apply = (xr, yr) => Plotly.relayout(gd, {'xaxis.range': xr, 'yaxis.range': yr});
  const frac = (X, Y, cx, cy) => { const r = gd.getBoundingClientRect(); return [(cx - r.left - X._offset) / X._length, (cy - r.top - Y._offset) / Y._length]; };
  const zoom = (f, fx, fy) => {                      // f < 1 przybliża wokół punktu (fx, fy) ∈ [0,1]
    const [X, Y] = ax(), [x0, x1] = X.range, [y0, y1] = Y.range, px = x0 + fx * (x1 - x0), py = y0 + (1 - fy) * (y1 - y0);
    apply([px - (px - x0) * f, px + (x1 - px) * f], [py - (py - y0) * f, py + (y1 - py) * f]);
  };
  gd.addEventListener('pointerdown', e => { if (on) { ptr.set(e.pointerId, [e.clientX, e.clientY]); lastD = 0; } });
  gd.addEventListener('pointermove', e => {
    if (!on || !ptr.has(e.pointerId)) return;
    const [X, Y] = ax(), [px, py] = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) {
      const [x0, x1] = X.range, [y0, y1] = Y.range, dx = (e.clientX - px) / X._length * (x1 - x0), dy = (e.clientY - py) / Y._length * (y1 - y0);
      apply([x0 - dx, x1 - dx], [y0 + dy, y1 + dy]);
    } else if (ptr.size === 2) {
      const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (lastD) zoom(lastD / d, ...frac(X, Y, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
      lastD = d;
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => gd.addEventListener(t, e => { ptr.delete(e.pointerId); lastD = 0; }));
  gd.addEventListener('wheel', e => { if (!on) return; e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, ...frac(...ax(), e.clientX, e.clientY)); }, {passive: false});
  $('#z-in').onclick = () => zoom(0.7, .5, .5);
  $('#z-out').onclick = () => zoom(1 / 0.7, .5, .5);
  $('#z-reset').onclick = () => apply([0, gd._home], [0, gd._home]);
  $('#z-lock').onclick = e => {                      // przełącznik: przesuwanie wykresu / przewijanie strony
    on = !on; ptr.clear(); gd.style.touchAction = on ? 'none' : 'pan-y';
    e.target.textContent = 'Przesuwanie: ' + (on ? 'wł.' : 'wył.'); e.target.setAttribute('aria-pressed', on);
  };
}
$('#btn-graph').onclick = () => {
  const out = '#out-graph', M = readModel('graph'); if (!M) return;
  if (M.n !== 2) return fail(out, 'metoda graficzna działa dla dokładnie 2 zmiennych. Ustaw liczbę zmiennych na 2 albo użyj zakładki Simpleks.', ['nvars']);
  const L = M.A.map((a, i) => ({a: a[0], b: a[1], r: M.b[i], rel: M.rel[i], name: 'Ogr. ' + (i + 1)}));
  const all = [...L, {a: 1, b: 0, r: 0, rel: '>='}, {a: 0, b: 1, r: 0, rel: '>='}];
  const ok = (x, y) => all.every(l => { const v = l.a * x + l.b * y;
    return l.rel === '<=' ? v <= l.r + 1e-7 : l.rel === '>=' ? v >= l.r - 1e-7 : Math.abs(v - l.r) < 1e-7; });
  let P = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const p = all[i], q = all[j], d = p.a * q.b - q.a * p.b; if (Math.abs(d) < 1e-12) continue;
    const x = (p.r * q.b - q.r * p.b) / d, y = (p.a * q.r - q.a * p.r) / d;
    if (ok(x, y) && !P.some(u => Math.abs(u[0] - x) < 1e-6 && Math.abs(u[1] - y) < 1e-6)) P.push([x, y]);
  }
  if (!P.length) return fail(out, 'Brak obszaru dopuszczalnego – żaden punkt nie spełnia wszystkich ograniczeń naraz. Sprawdź znaki nierówności i prawe strony.', M.b.map((_, i) => 'b' + i));
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
  P.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  const Z = P.map(p => M.c[0] * p[0] + M.c[1] * p[1]);
  const zopt = M.maxi ? Math.max(...Z) : Math.min(...Z);
  const Lmax = Math.max(1, ...P.flat()) * 1.4;
  const lineTr = (l, color, dash, name) => {                              // prosta + etykieta z równaniem
    const pts = []; let lx = [], ly = [];
    if (Math.abs(l.b) > 1e-12) for (let k = 0; k <= 40; k++) { const x = Lmax * k / 40, y = (l.r - l.a * x) / l.b; lx.push(x); ly.push(y); if (y >= 0 && y <= Lmax) pts.push([x, y]); }
    else { lx = [l.r / l.a, l.r / l.a]; ly = [0, Lmax]; pts.push([lx[0], Lmax * .5]); }
    const lab = pts[Math.floor(pts.length / 2)] || [null, null];
    return [{x: lx, y: ly, mode: 'lines', name, line: {color, dash, width: 2}, hoverinfo: 'name'},
            {x: [lab[0]], y: [lab[1]], mode: 'text', text: [`${name}: ${expr([l.a, l.b])} ${sign(l.rel)} ${fmt(l.r)}`], textposition: 'top right', showlegend: false, hoverinfo: 'skip', textfont: {color}}];
  };
  const pal = ['#d62828', '#1d4ed8', '#7b2cbf', '#e76f51', '#0b7a75', '#6b705c', '#bc6c25', '#264653'];
  let tr = [{x: [...P.map(p => p[0]), P[0][0]], y: [...P.map(p => p[1]), P[0][1]], fill: 'toself', fillcolor: 'rgba(26,111,214,.22)', line: {color: 'rgba(26,111,214,.9)', width: 1}, name: 'Obszar dopuszczalny', hoverinfo: 'skip'}];
  L.forEach((l, i) => tr.push(...lineTr(l, pal[i % 8], 'solid', l.name)));
  if (Math.abs(M.c[0]) + Math.abs(M.c[1]) > 0) tr.push(lineTr({a: M.c[0], b: M.c[1], r: zopt}, '#111', 'dash', 'Z = ' + fmt(zopt))[0]);
  let intBest = null, intNote = '';                                       // punkty kratowe wewnątrz obszaru
  if ($('#g-int').checked) {
    if (Lmax > 80) intNote = 'Zakres jest zbyt duży, by narysować punkty całkowite (limit: wartości do ok. 80).';
    else {
      const ip = [];
      for (let x = 0; x <= Math.ceil(Lmax); x++) for (let y = 0; y <= Math.ceil(Lmax); y++) if (ok(x, y)) {
        const z = M.c[0] * x + M.c[1] * y; ip.push([x, y, z]);
        if (!intBest || (M.maxi ? z > intBest[2] : z < intBest[2])) intBest = [x, y, z];
      }
      tr.push({x: ip.map(q => q[0]), y: ip.map(q => q[1]), customdata: ip.map(q => q[2]), mode: 'markers', name: 'Punkty całkowite', marker: {size: 5, color: '#7b8296'},
        hovertemplate: '(%{x}; %{y})<br>Z = %{customdata:.3f}<extra>Punkt całkowity</extra>'});
      if (intBest) tr.push({x: [intBest[0]], y: [intBest[1]], mode: 'markers', name: 'Optimum całkowite', marker: {size: 15, symbol: 'star', color: '#c0261b', line: {color: '#fff', width: 1}}, hoverinfo: 'name'});
    }
  }
  tr.push({x: P.map(p => p[0]), y: P.map(p => p[1]), customdata: Z, mode: 'markers', name: 'Wierzchołki',
    marker: {size: Z.map(z => Math.abs(z - zopt) < 1e-7 ? 16 : 10), color: Z.map(z => Math.abs(z - zopt) < 1e-7 ? '#ffb703' : '#1b2a4e'), line: {color: '#fff', width: 2}},
    hovertemplate: '(%{x:.3f}; %{y:.3f})<br>Z = %{customdata:.3f}<extra>Wierzchołek</extra>'});
  Plotly.newPlot('plot', tr, {dragmode: false, xaxis: {title: 'x<sub>1</sub>', range: [0, Lmax]}, yaxis: {title: 'x<sub>2</sub>', range: [0, Lmax]}, legend: {orientation: 'h', y: -0.25}, margin: {l: 45, r: 10, t: 10, b: 40}}, {responsive: true, displaylogo: false, displayModeBar: false});
  enableTouch($('#plot'), Lmax);
  const chk = solveM(M);
  let h = infoHTML(M) + '<div class="tw"><table><tr><th>Wierzchołek</th><th>x₁</th><th>x₂</th><th>Z</th></tr>' +
    P.map((p, i) => `<tr><th>W${i+1}</th><td>${fmt(p[0])}</td><td>${fmt(p[1])}</td><td class="${Math.abs(Z[i] - zopt) < 1e-7 ? 'pivot' : ''}">${fmt(Z[i])}</td></tr>`).join('') + '</table></div>';
  if (chk.status === 'unbounded') { h += '<p class="note">Obszar jest nieograniczony – wierzchołki poniżej nie są optimum.</p>'; }
  else h += `<div class="sum"><b>Wynik:</b> optimum w wierzchołku (${fmt(P[Z.findIndex(z => Math.abs(z - zopt) < 1e-7)][0])}; ${fmt(P[Z.findIndex(z => Math.abs(z - zopt) < 1e-7)][1])}), Z<sub>opt</sub> = <b>${fmt(zopt)}</b>. Wierzchołek optymalny jest wyróżniony na złoto.</div>`;
  if (intBest) h += `<div class="sum"><b>Optimum całkowitoliczbowe:</b> (${intBest[0]}; ${intBest[1]}), Z = <b>${fmt(intBest[2])}</b> (czerwona gwiazdka).</div>`;
  if (intNote) h += `<p class="note">${intNote}</p>`;
  $(out).innerHTML = h; last.graph = h;
  if (chk.status === 'unbounded') failLP(out, chk, M, true);
};

/* =====================================================================
   6. ZAKŁADKA: PROGRAMOWANIE CAŁKOWITOLICZBOWE – BRANCH & BOUND
   Węzeł = relaksacja LP z dodatkowymi granicami zmiennych. Wybieramy pierwszą
   ułamkową zmienną x_j i dzielimy na x_j ≤ ⌊v⌋ oraz x_j ≥ ⌊v⌋+1.
   ===================================================================== */
$('#btn-ilp').onclick = () => {
  const out = '#out-ilp', M = readModel('ilp'); if (!M) return;
  const R = ilpSolve(M, {rule: $('#ilp-branch').value, search: $('#ilp-search').value});   // obliczenia: js/ilp-solver.js
  if (R.status === 'unbounded_relax') return fail(out, 'relaksacja LP (zadanie bez wymogu całkowitości) jest nieograniczona. Wtedy zadanie całkowitoliczbowe jest nieograniczone albo nie ma rozwiązań całkowitych – Branch & Bound tego nie rozstrzygnie. Dodaj ograniczenie z góry dla zmiennych o dodatnich współczynnikach celu.', M.c.map((_, j) => 'c' + j));
  if (R.status === 'limit') return failLP(out, {status: 'limit'}, M);
  const li = nd => `<li class="${nd.cls || ''}"><b>Węzeł ${nd.id}</b> ${nd.label ? '[' + nd.label + ']' : '(relaksacja LP problemu)'}${nd.info ? ': ' + nd.info : ''}<br>${nd.res}` +
    (nd.kids.length ? '<ul>' + nd.kids.map(li).join('') + '</ul>' : '') + '</li>';
  let h = infoHTML(M) + `<p>Branch &amp; Bound: ${R.dfs ? 'przeszukiwanie w głąb' : 'najlepsza granica'}, podział po zmiennej ${R.rule === 'first' ? 'pierwszej ułamkowej' : 'najbardziej ułamkowej'}. Każdy węzeł to LP rozwiązane simpleksem.</p><ul>` + li(R.root) + '</ul>';
  const why = [R.trunc ? `przeszukiwanie przerwano po ${R.limit} węzłach` : '', R.stopped ? 'simpleks przekroczył limit iteracji w jednym z węzłów' : '',
    R.warn.length ? `w węzłach ${R.warn.join(', ')} relaksacja LP była nieograniczona i nie dało się ich ani odciąć, ani podzielić` : ''].filter(Boolean).join('; ');
  const sol = () => `${R.best.map((v, j) => `x${sub(j+1)} = ${fmt(v)}`).join(', ')}; Z<sub>opt</sub> = <b>${fmt(R.bestZ)}</b>`;
  if (R.status === 'optimal') h += `<div class="sum"><b>Wynik:</b> ${sol()}. Liczba węzłów: ${R.count}.</div>`;
  else if (R.status === 'uncertain') h += `<div class="sum"><b>Najlepsze znalezione rozwiązanie:</b> ${sol()}.</div><p class="msg">Uwaga: ${why}. To rozwiązanie jest całkowite i dopuszczalne, ale <b>nie ma gwarancji, że jest optymalne</b>.</p>`;
  else if (R.status === 'unknown') h += `<p class="msg">Nie znaleziono rozwiązania całkowitego, ale ${why} – <b>nie wiadomo, czy takie rozwiązanie istnieje</b>.</p>`;
  $(out).innerHTML = h; last.ilp = h;
  if (R.status === 'infeasible') fail(out, 'Brak rozwiązania całkowitego spełniającego wszystkie ograniczenia (wszystkie gałęzie odcięte).', M.b.map((_, i) => 'b' + i), true);
};
