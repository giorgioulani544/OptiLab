/* ===== OptiLab – widoki HTML =====
   Funkcje budujące HTML tablic, opisu zadania, zadania dualnego i komunikatów błędów LP. */
/* Typy zmiennych: c = ≥0, i = całkowita, b = binarna, u = dowolna (x = x⁺ − x⁻), n = ≤0 (tylko w dualnym) */
const TL = {c: '≥ 0', i: 'całkowita ≥ 0', b: 'binarna', u: 'dowolna', n: '≤ 0'};
const typesLine = M => `<li>${M.t.every(t => t === 'c') ? 'x ≥ 0' : M.t.map((t, j) => `x${sub(j+1)} ${TL[t]}`).join(', ')}</li>`;
const dualHTML = D => `<p><b>${D.maxi ? 'Maksymalizuj' : 'Minimalizuj'}</b> W = ${expr(D.c, 'y')}</p><ul>${D.A.map((a, j) => `<li>${expr(a, 'y')} ${sign(D.rel[j])} ${fmt(D.b[j])}</li>`).join('')}<li>${D.t.map((t, i) => `y${sub(i+1)} ${t === 'c' ? '≥ 0' : t === 'n' ? '≤ 0' : 'dowolne'}`).join(', ')}</li></ul>`;
function tableHTML(s) {
  const m = s.T.length - 1, N = s.T[0].length - 1, show = j => !(s.hide || []).includes(j);   // w fazie II kolumny sztuczne są pomijane
  let h = '<div class="tw"><table><tr><th>Baza</th>' + s.names.map((x, j) => show(j) ? `<th>${x}</th>` : '').join('') + '<th>Prawa str.</th></tr>';
  for (let i = 0; i <= m; i++) {
    h += `<tr><th>${i < m ? s.names[s.basis[i]] : (s.zl || 'Z')}</th>`;
    for (let j = 0; j <= N; j++) {
      if (j < N && !show(j)) continue;
      const cls = i === s.pr && j === s.pc ? 'pivot' : i === s.pr ? 'pr' : j === s.pc ? 'pcol' : '';
      h += `<td class="${cls}">${fmt(s.T[i][j])}</td>`;
    }
    h += '</tr>';
  }
  return h + '</table></div>';
}
function infoHTML(M) {
  const rows = M.A.map((a, i) => `<li>${expr(a)} ${sign(M.rel[i])} ${fmt(M.b[i])}</li>`).join('');
  return `<p><b>${M.maxi ? 'Maksymalizuj' : 'Minimalizuj'}</b> Z = ${expr(M.c)}</p><ul>${rows}${typesLine(M)}</ul>`;
}
const failLP = (out, r, M, keep) => r.status === 'limit'
  ? fail(out, `przekroczono limit iteracji simpleksu${r.maxIt ? ' (' + r.maxIt + ')' : ''} – obliczenia przerwano, więc wynik nie jest wiarygodny. Sprawdź dane (bardzo duże lub bardzo małe liczby?) albo spróbuj metody dwufazowej.`, M.c.map((_, j) => 'c' + j), keep)
  : r.status === 'unbounded'
  ? fail(out, 'Problem nieograniczony – funkcję celu można poprawiać w nieskończoność. Sprawdź, czy brakuje ograniczenia z góry dla zmiennych o dodatnich współczynnikach celu.', M.c.map((_, j) => 'c' + j), keep)
  : fail(out, 'Brak obszaru dopuszczalnego – ograniczenia wzajemnie się wykluczają (np. x ≥ 5 oraz x ≤ 3). Zmień znak lub prawą stronę w jednym z ograniczeń.', M.b.map((_, i) => 'b' + i), keep);

/* ===== Alternatywna metoda tabelaryczna: tablice C_B | Baza | x | b | iloraz z wierszami z_j i c_j − z_j ===== */
function tabReportHTML(M, R) {
  const nm = j => R.names[j].replace(/^([xa])(\d+)$/, (_, l, d) => `${l}${sub(d)}`), sf = v => sFmt(v, fmt), N = R.names.length;
  const kindTxt = {s: 'zmienna swobodna (niewykorzystany zasób)', e: 'zmienna nadwyżkowa', a: 'zmienna sztuczna'};
  const extra = R.names.map((_, j) => j).filter(j => j >= M.n);
  let h = `<h3>Alternatywna metoda tabelaryczna</h3><p class="hint">Tablica w układzie: C<sub>B</sub> (współczynniki funkcji celu zmiennych bazowych), baza, współczynniki a<sub>ij</sub>, rozwiązanie b i kolumna ilorazów. ` +
    `Wiersz z<sub>j</sub> = Σ C<sub>B</sub>·a<sub>ij</sub>, wiersz indeksu c<sub>j</sub> − z<sub>j</sub>. ${M.maxi ? 'Rozwiązanie jest optymalne, gdy wszystkie c<sub>j</sub> − z<sub>j</sub> ≤ 0; do bazy wchodzi zmienna z największym dodatnim c<sub>j</sub> − z<sub>j</sub>.' : 'Przy minimalizacji rozwiązanie jest optymalne, gdy wszystkie c<sub>j</sub> − z<sub>j</sub> ≥ 0; do bazy wchodzi zmienna z najbardziej ujemnym c<sub>j</sub> − z<sub>j</sub>.'} ` +
    `Z bazy wychodzi zmienna z wiersza o najmniejszym ilorazie b<sub>i</sub> / a<sub>ik</sub> (liczonym tylko dla a<sub>ik</sub> > 0).</p>`;
  if (extra.length) h += '<p><b>Postać kanoniczna:</b> ' + extra.map(j => `${nm(j)} – ${kindTxt[R.kinds[j]]}${R.kinds[j] === 'a' ? ` (c = ${sf(R.cost[j])})` : ''}`).join('; ') + '.' +
    (R.kinds.includes('a') ? ` Zmienne sztuczne mają w funkcji celu współczynnik ${M.maxi ? '−M' : 'M'} – bardzo dużą karę, która wypycha je z bazy (M zapisujemy symbolicznie).` : '') + (R.rows.some(r => r.flipped) ? ' Ograniczenia z ujemną prawą stroną pomnożono przez −1.' : '') + '</p>';
  R.tables.forEach((T, k) => {
    let txt;
    if (T.pc >= 0) { const rr = T.ratios.map((q, i) => q === null ? null : `${nm(T.basis[i])}: ${fmt(T.b[i])} / ${fmt(T.A[i][T.pc])} = ${fmt(q)}`).filter(Boolean).join('; ');
      txt = `${T.bland ? 'Baza się powtórzyła – aby uniknąć cyklu, stosujemy regułę Blanda (zmienna o najmniejszym indeksie). ' : ''}W wierszu indeksu ${M.maxi ? 'największa dodatnia' : 'najbardziej ujemna'} wartość to c<sub>j</sub> − z<sub>j</sub> = <b>${sf(T.cmz[T.pc])}</b> w kolumnie <b>${nm(T.pc)}</b> – ta zmienna wchodzi do bazy. ` +
        (T.pr >= 0 ? `Ilorazy: ${rr}. Najmniejszy iloraz ma wiersz <b>${nm(T.basis[T.pr])}</b> – ta zmienna wychodzi z bazy; element wiodący = ${fmt(T.A[T.pr][T.pc])}. ` +
          'Następna tablica: wiersz wiodący dzielimy przez element wiodący, od pozostałych wierszy odejmujemy jego wielokrotność tak, by w kolumnie wiodącej powstały zera.' + (T.tie ? ' Remis w ilorazach – rozwiązanie będzie zdegenerowane.' : '')
          : 'Żaden element tej kolumny nie jest dodatni, więc nie da się policzyć ilorazu – funkcję celu można poprawiać bez końca (zadanie nieograniczone).'); }
    else txt = R.status === 'optimal' ? `Wszystkie c<sub>j</sub> − z<sub>j</sub> są ${M.maxi ? '≤ 0' : '≥ 0'} – rozwiązanie jest optymalne.` : T.artStuck || R.status === 'infeasible' ? 'Żadna zmiana bazy nie usuwa już zmiennej sztucznej o dodatniej wartości – zadanie nie ma rozwiązań dopuszczalnych.' : 'Przerwano obliczenia (limit iteracji) – wynik byłby niewiarygodny.';
    h += `<div class="step"><h4>Tablica ${k + 1}${k === 0 ? ' (pierwsza)' : ''}</h4><p>${txt}</p><div class="tw"><table class="tabcj"><thead>` +
      `<tr><th colspan="2">C<sub>j</sub></th>${R.cost.map((c, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${sf(c)}</th>`).join('')}<th rowspan="2">Rozwiązanie<br>b</th>${T.ratios ? '<th rowspan="2">Iloraz<br>b / a</th>' : ''}</tr>` +
      `<tr><th>C<sub>B</sub></th><th>Baza</th>${R.names.map((_, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${nm(j)}</th>`).join('')}</tr></thead>` +
      T.A.map((row, i) => `<tr><td>${sf(T.cB[i])}</td><th>${nm(T.basis[i])}</th>${row.map((v, j) => `<td class="${i === T.pr && j === T.pc ? 'pivot' : i === T.pr ? 'pr' : j === T.pc ? 'pcol' : ''}">${fmt(v)}</td>`).join('')}<td class="${i === T.pr ? 'pr' : ''}">${fmt(T.b[i])}</td>` +
        (T.ratios ? `<td class="${i === T.pr ? 'pivot' : ''}">${T.ratios[i] === null ? '–' : fmt(T.ratios[i]) + (i === T.pr ? ' min' : '')}</td>` : '') + '</tr>').join('') +
      `<tr class="zrow"><td></td><th>z<sub>j</sub></th>${T.zj.map(v => `<td>${sf(v)}</td>`).join('')}<td class="zval"><b>${sf(T.z)}</b></td>${T.ratios ? '<td></td>' : ''}</tr>` +
      `<tr class="zrow"><td></td><th>c<sub>j</sub> − z<sub>j</sub></th>${T.cmz.map((v, j) => `<td class="${j === T.pc ? 'pivot' : ''}">${sf(v)}${j === T.pc ? (M.maxi ? ' max' : ' min') : ''}</td>`).join('')}<td></td>${T.ratios ? '<td></td>' : ''}</tr></table></div></div>`;
  });
  if (R.status === 'optimal') { const last = R.tables[R.tables.length - 1], sl = R.names.map((_, j) => j).filter(j => R.kinds[j] === 's' || R.kinds[j] === 'e');
    h += `<h4>Gdzie odczytać wynik w ostatniej tablicy</h4><ol class="interp"><li><b>Wartości zmiennych bazowych</b> – kolumna b: ${last.basis.map((j, i) => `${nm(j)} = ${fmt(last.b[i])}`).join(', ')}. Zmienne spoza bazy są równe 0.</li>` +
      `<li><b>Wartość funkcji celu</b> – w wierszu z<sub>j</sub> pod kolumną b (pole żółte): Z = ${sf(last.z)}.</li>` +
      (sl.length ? `<li><b>Ceny dualne (ceny cieni)</b> – wiersz z<sub>j</sub> w kolumnach zmiennych swobodnych: ${sl.map(j => `${nm(j)}: ${sf(last.zj[j])}`).join(', ')}${R.kinds.includes('e') ? ' (dla zmiennej nadwyżkowej ze znakiem przeciwnym)' : ''}. Mówią, o ile zmieni się Z, gdy dany zasób wzrośnie o 1.</li>` : '') +
      `<li><b>Koszty zredukowane</b> – wiersz c<sub>j</sub> − z<sub>j</sub> w kolumnach zmiennych niebazowych (o ile pogorszy się Z po wprowadzeniu 1 jednostki).</li></ol>` +
      tablesCSVLink(R.tables.map(T => ({...T, names: R.names, cost: R.cost})), v => { const d = x => String(Math.round(x * 1e6) / 1e6).replace('.', ','); return typeof v === 'number' ? d(v) : sFmt(v, d); }, 'tablice-simpleks.csv', '⬇ Pobierz wszystkie tablice do Excela (.csv)');
    if (R.alt.length) h += `<p class="note">Zmienne niebazowe ${R.alt.map(nm).join(', ')} mają c<sub>j</sub> − z<sub>j</sub> = 0 – istnieją rozwiązania alternatywne o tej samej wartości funkcji celu.</p>`;
    if (R.degenerate) h += '<p class="note">Któraś zmienna bazowa ma wartość 0 – rozwiązanie zdegenerowane.</p>';
    if (last.basis.some((j, i) => R.kinds[j] === 'a')) h += '<p class="hint">W bazie została zmienna sztuczna o wartości 0 – nie wpływa na wynik (ograniczenie jest zależne od pozostałych).</p>'; }
  return h;
}

/* ===== Odcięcia Gomory'ego: raport z tablicami c_j − z_j, odcięciami i krokami dualnego simpleksu ===== */
function gomReportHTML(M, G, BB) {
  const n4 = v => fmt(Math.round(FR.toNum(v) * 10000) / 10000), fx = v => FR.isInt(v) ? String(v.n) : `${FR.str(v)} ≈ ${n4(v)}`, nm = s => s.replace(/^([xas])(\d+)$/, (_, l, d) => `${l}${sub(d)}`);
  const tbl = (T, mode) => { const N = T.names.length, cls = (i, j) => i === T.pr && j === T.pc ? 'pivot' : i === T.pr ? 'pr' : j === T.pc ? 'pcol' : '';
    return `<div class="tw"><table class="tabcj"><thead><tr><th colspan="2">C<sub>j</sub></th>${T.cost.map((c, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${n4(c)}</th>`).join('')}<th rowspan="2">Rozwiązanie<br>b</th>${mode === 'p' && T.ratios ? '<th rowspan="2">Iloraz<br>b / a</th>' : ''}</tr>` +
      `<tr><th>C<sub>B</sub></th><th>Baza</th>${T.names.map((s, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${nm(s)}</th>`).join('')}</tr></thead>` +
      T.A.map((row, i) => `<tr><td>${n4(T.cost[T.basis[i]])}</td><th>${nm(T.names[T.basis[i]])}</th>${row.map((v, j) => `<td class="${cls(i, j)}">${n4(v)}</td>`).join('')}<td class="${i === T.pr ? 'pr' : ''}${FR.sgn(T.b[i]) < 0 ? ' late' : ''}">${n4(T.b[i])}</td>` +
        (mode === 'p' && T.ratios ? `<td class="${i === T.pr ? 'pivot' : ''}">${T.ratios[i] ? n4(T.ratios[i]) + (i === T.pr ? ' min' : '') : '–'}</td>` : '') + '</tr>').join('') +
      `<tr class="zrow"><td></td><th>z<sub>j</sub></th>${T.zj.map(v => `<td>${n4(v)}</td>`).join('')}<td class="zval"><b>${n4(T.z)}</b></td>${mode === 'p' && T.ratios ? '<td></td>' : ''}</tr>` +
      `<tr class="zrow"><td></td><th>c<sub>j</sub> − z<sub>j</sub></th>${T.cmz.map((v, j) => `<td class="${j === T.pc ? 'pivot' : ''}">${n4(v)}</td>`).join('')}<td></td>${mode === 'p' && T.ratios ? '<td></td>' : ''}</tr>` +
      (T.dratios ? `<tr class="zrow"><td></td><th>|c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>|</th>${T.dratios.map((v, j) => `<td class="${j === T.pc ? 'pivot' : ''}">${v ? n4(v) + (j === T.pc ? ' min' : '') : '–'}</td>`).join('')}<td></td></tr>` : '') + '</table></div>'; };
  let h = `<h3>Odcięcia Gomory'ego (dualna metoda simpleks)</h3><p class="hint">Najpierw rozwiązujemy zadanie bez wymogu całkowitości (relaksacja LP). Jeśli któraś zmienna bazowa jest ułamkowa, z jej wiersza budujemy <b>odcięcie</b> – nowe ograniczenie, które usuwa obecne rozwiązanie ułamkowe, ale nie usuwa żadnego punktu całkowitego. ` +
    `Po dodaniu odcięcia rozwiązanie przestaje być dopuszczalne (ujemne b), więc przywracamy dopuszczalność <b>dualną metodą simpleks</b>: wychodzi wiersz z ujemnym b, wchodzi kolumna z najmniejszym ilorazem |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| (tylko a<sub>rj</sub> &lt; 0). Powtarzamy, aż wszystkie zmienne będą całkowite. Obliczenia są dokładne (na ułamkach).</p>`;
  const sc = G.scale.map((L, i) => L > 1n ? `ograniczenie ${i + 1} × ${L}` : null).filter(Boolean);
  if (sc.length) h += `<p><b>Przygotowanie:</b> odcięcie Gomory'ego zakłada, że wszystkie zmienne – także swobodne – są całkowite. Dlatego ograniczenia z ułamkowymi współczynnikami mnożymy tak, by stały się całkowite: ${sc.join(', ')}.</p>`;
  if (G.status === 'infeasible' && G.reason === 'lp') return h + '<p class="msg">Relaksacja LP nie ma rozwiązań dopuszczalnych – zadanie całkowitoliczbowe też ich nie ma.</p>';
  if (!G.lp.length) return h + '<p class="msg">Nie udało się rozwiązać relaksacji LP (limit obliczeń).</p>';
  const lastLP = G.lp[G.lp.length - 1];
  h += `<h4>Krok 1. Relaksacja LP – ostatnia tablica simpleks</h4><p>Rozwiązanie bez wymogu całkowitości: ${G.lpX.map((v, j) => `x${sub(j + 1)} = ${fx(v)}`).join(', ')}; z = <b>${n4(G.lpValue)}</b>.</p>` + tbl(lastLP, 'p') +
    (G.lp.length > 1 ? `<details class="adv"><summary>Wszystkie tablice simpleks relaksacji LP (${G.lp.length})</summary>${G.lp.map((T, k) => `<h4>Tablica ${k + 1}</h4>` + tbl(T, 'p')).join('')}</details>` : '');
  if (!G.cuts.length && G.status === 'optimal') return h + `<div class="sum"><b>Wynik:</b> rozwiązanie relaksacji LP jest już całkowite – odcięcia nie są potrzebne. ${G.xNum.map((v, j) => `x${sub(j + 1)} = ${v}`).join(', ')}, z = <b>${fmt(G.zNum)}</b>.</div>`;
  const zAfter = C => C.steps[C.steps.length - 1].z, xAfter = C => { const T = C.steps[C.steps.length - 1]; return Array.from({length: G.n}, (_, j) => { const i = T.basis.indexOf(T.names.indexOf('x' + (j + 1))); return i < 0 ? FR.Z : T.b[i]; }); };
  h += `<h4>Krok 2. Odcięcia – podsumowanie (${G.cuts.length})</h4><div class="tw"><table><thead><tr><th>Odcięcie</th><th>Z wiersza</th><th>Część ułamkowa f<sub>0</sub></th><th>z po odcięciu</th><th>Rozwiązanie po odcięciu</th></tr></thead>` +
    G.cuts.map(C => `<tr><td>${C.k}</td><td>${nm(C.srcVar)}</td><td>${n4(C.f0)}</td><td>${n4(zAfter(C))}</td><td class="tl">${xAfter(C).map((v, j) => `x${sub(j + 1)} = ${n4(v)}`).join(', ')}</td></tr>`).join('') + '</table></div>';
  const show = new Set([0, 1, G.cuts.length - 1]);
  G.cuts.forEach((C, q) => {
    const terms = C.nonb.filter(j => FR.sgn(C.f[j]) > 0).map(j => `${FR.str(C.f[j])}·${nm(C.steps[0].names[j])}`), body =
      `<p>Wiersz zmiennej <b>${nm(C.srcVar)}</b> ma b = ${fx(C.srcB)}; część ułamkowa f<sub>0</sub> = ${fx(C.f0)} (największa). Części ułamkowe współczynników przy zmiennych niebazowych: ${C.nonb.map(j => `${nm(C.steps[0].names[j])}: ${FR.str(C.f[j])}`).join(', ')}.</p>` +
      `<div class="formula">Odcięcie: ${terms.join(' + ') || '0'} ≥ ${FR.str(C.f0)} &nbsp;→&nbsp; −(${terms.join(' + ')}) + ${nm('s' + C.k)} = −${FR.str(C.f0)}</div>` +
      C.steps.map((T, s) => `<p>${T.pr >= 0 && T.pc >= 0 ? `Dualny simpleks: wiersz <b>${nm(T.names[T.basis[T.pr]])}</b> ma ujemne b = ${n4(T.b[T.pr])} – zmienna wychodzi z bazy. Najmniejszy iloraz |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| ma kolumna <b>${nm(T.names[T.pc])}</b> – zmienna wchodzi; element wiodący = ${n4(T.A[T.pr][T.pc])}.` :
        T.pr >= 0 ? 'W wierszu z ujemnym b nie ma ujemnych współczynników – zadanie całkowitoliczbowe nie ma rozwiązań.' : 'Wszystkie b ≥ 0 – tablica znów dopuszczalna.'}</p>` + tbl(T, 'd')).join('') +
      (C.dropped && C.dropped.length ? `<p class="hint">Zmienne ${C.dropped.map(nm).join(', ')} odcięć są w bazie (odcięcie nieaktywne) – usuwamy ich wiersze i kolumny, by tablica nie rosła.</p>` : '');
    h += show.has(q) ? `<h4>Odcięcie ${C.k}</h4>` + body : `<details class="adv"><summary>Odcięcie ${C.k}: z wiersza ${nm(C.srcVar)}, z = ${n4(zAfter(C))}</summary>${body}</details>`;
  });
  if (G.status === 'limit') return h + '<p class="msg">Przerwano po osiągnięciu limitu odcięć – rozwiązanie nie jest jeszcze całkowite, więc nie podajemy go jako wyniku. Użyj metody podziału i ograniczeń.</p>';
  if (G.status === 'infeasible') return h + '<p class="msg">Zadanie nie ma rozwiązań całkowitoliczbowych.</p>';
  h += tablesCSVLink([...G.lp, ...G.cuts.flatMap(C => C.steps)].map(T => ({...T, cB: T.basis.map(bi => T.cost[bi])})), v => String(Math.round(FR.toNum(v) * 1e6) / 1e6).replace('.', ','), 'tablice-gomory.csv', '⬇ Pobierz tablice (LP i odcięcia) do Excela (.csv)');
  h += `<div class="sum"><b>Rozwiązanie całkowitoliczbowe:</b> ${G.xNum.map((v, j) => `x${sub(j + 1)} = <b>${v}</b>`).join(', ')}; z = <b>${fmt(Math.round(G.zNum * 1e6) / 1e6)}</b> (relaksacja LP: ${n4(G.lpValue)}, różnica ${fmt(Math.round(Math.abs(FR.toNum(G.lpValue) - G.zNum) * 1e4) / 1e4)} – „koszt” wymogu całkowitości). Potrzebne odcięcia: ${G.cuts.length}.</div>`;
  if (BB && BB.status === 'optimal') h += Math.abs(BB.bestZ - G.zNum) < 1e-6 * (1 + Math.abs(G.zNum)) ? `<p class="hint">Kontrola: metoda podziału i ograniczeń daje tę samą wartość z = ${fmt(Math.round(BB.bestZ * 1e6) / 1e6)}${BB.best && BB.best.some((v, j) => Math.abs(v - G.xNum[j]) > 1e-6) ? ' przy innym rozwiązaniu – zadanie ma kilka rozwiązań całkowitych optymalnych' : ''}.</p>` : '<p class="msg">Uwaga: metoda podziału i ograniczeń daje inną wartość – zgłoś ten przykład.</p>';
  return h;
}

/* ===== Interpretacja wyniku LP – gotowa odpowiedź słowna (zasoby, ceny dualne, koszty zredukowane, zakresy) ===== */
function lpInterpretHTML(M, r, S) {
  const f = v => fmt(Math.round(v * 1e4) / 1e4), rg = (lo, hi) => `od ${isFinite(lo) ? f(lo) : '−∞'} do ${isFinite(hi) ? f(hi) : '+∞'}`, Z = M.maxi ? 'zysk (Z)' : 'koszt (Z)', L = [];
  L.push(`Optymalne rozwiązanie: ${r.x.map((v, j) => `x${sub(j + 1)} = <b>${f(v)}</b>`).join(', ')}; wartość funkcji celu Z = <b>${f(r.z)}</b>.`);
  S.rows.forEach((q, i) => { const slack = Math.abs(M.b[i] - q.lhs), bind = slack < 1e-7 * (1 + Math.abs(M.b[i]));
    L.push(bind ? `Ograniczenie ${i + 1} jest <b>wiążące</b> (wykorzystane w całości: ${f(q.lhs)} ${sign(M.rel[i])} ${f(M.b[i])}). Cena dualna ${f(q.y)}: zwiększenie prawej strony o 1 zmieni ${Z} o ${f(q.y)}${Math.abs(q.y) < 1e-9 ? ' (zero – ograniczenie zdegenerowane)' : ''}; obowiązuje to, dopóki prawa strona mieści się ${rg(q.lo, q.hi)}.`
      : `Ograniczenie ${i + 1} <b>nie jest wiążące</b>: ${M.rel[i] === '>=' ? 'nadwyżka' : 'niewykorzystany zapas (luz)'} = ${f(slack)}. Zmiana jego prawej strony w zakresie ${rg(q.lo, q.hi)} nie zmienia Z (cena dualna 0).`); });
  S.vars.forEach((v, j) => { if (M.t[j] === 'u') return; const x = r.x[j];
    L.push(Math.abs(x) < 1e-9 && !v.basic ? `x${sub(j + 1)} = 0 (zmienna niebazowa): ${Math.abs(v.rc) < 1e-9 ? 'koszt zredukowany 0 – istnieją rozwiązania alternatywne z x' + sub(j + 1) + ' > 0' : `wprowadzenie 1 jednostki pogorszy Z o ${f(Math.abs(v.rc))}; zmienna opłaci się, gdy jej współczynnik celu ${M.maxi ? 'wzrośnie' : 'spadnie'} o więcej niż ${f(Math.abs(v.rc))}`}.`
      : `Rozwiązanie pozostaje optymalne, dopóki współczynnik celu przy x${sub(j + 1)} (teraz ${f(M.c[j])}) mieści się ${rg(v.lo, v.hi)}.`); });
  return '<h4>Interpretacja wyników (odpowiedź do zadania)</h4><ul class="interp">' + L.map(s => `<li>${s}</li>`).join('') + '</ul><p class="hint">Te zdania można przenieść do sprawozdania, podmieniając „ograniczenie 1” na nazwę zasobu z treści zadania (np. „surowiec S1”), a x<sub>1</sub> na nazwę wyrobu.</p>';
}
/* eksport tablic simpleksu do Excela (CSV: średnik, przecinek dziesiętny) – link z danymi w raporcie */
function tablesCSVLink(tables, fv, fname, label) {   // fv: wartość → tekst do komórki Excela
  const q = fv, L = [];
  tables.forEach((T, k) => { const nm = T.names; L.push(`Tablica ${k + 1}`); L.push(['', 'Cj', ...T.cost.map(q), ''].join(';')); L.push(['CB', 'Baza', ...nm, 'b'].join(';'));
    T.A.forEach((row, i) => L.push([q(T.cB ? T.cB[i] : T.cost[T.basis[i]]), nm[T.basis[i]], ...row.map(q), q(T.b[i])].join(';')));
    L.push(['', 'zj', ...T.zj.map(q), q(T.z)].join(';')); L.push(['', 'cj-zj', ...T.cmz.map(q), ''].join(';')); L.push(''); });
  return `<p><a class="ghost dl" download="${fname}" href="data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFF' + L.join('\r\n'))}">${label}</a></p>`;
}
