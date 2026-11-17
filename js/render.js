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
/* ===== Odcięcia Gomory'ego – raport =====
   gomReportHTML: relaksacja LP, podsumowanie WSZYSTKICH odcięć (z nierównościami), wynik i kontrola metodą podziału i ograniczeń.
   gomCutsHTML: osobna sekcja „Odcięcia krok po kroku” – każde odcięcie rozpisane w całości (bez zwijania), niezależnie od ich liczby.
   gomCutsShellHTML / gomCutsInfo: ramka tej sekcji na ekranie z przełącznikiem „dołącz do raportu i PDF” (sam przełącznik nie trafia do PDF). */
function gomHelpers() {
  const n4 = v => fmt(Math.round(FR.toNum(v) * 10000) / 10000), fr = v => FR.str(v).replace('-', '−'), fx = v => FR.isInt(v) ? fr(v) : `${fr(v)} ≈ ${n4(v)}`;
  const nm = s => s.replace(/^([xas])(\d+)$/, (_, l, d) => `${l}${sub(d)}`), neg = v => FR.sub(FR.Z, v);
  const tbl = (T, mode) => { const N = T.names.length, cls = (i, j) => i === T.pr && j === T.pc ? 'pivot' : i === T.pr ? 'pr' : j === T.pc ? 'pcol' : '';
    return `<div class="tw"><table class="tabcj"><thead><tr><th colspan="2">C<sub>j</sub></th>${T.cost.map((c, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${n4(c)}</th>`).join('')}<th rowspan="2">Rozwiązanie<br>b</th>${mode === 'p' && T.ratios ? '<th rowspan="2">Iloraz<br>b / a</th>' : ''}</tr>` +
      `<tr><th>C<sub>B</sub></th><th>Baza</th>${T.names.map((s, j) => `<th class="${j === T.pc ? 'pcol' : ''}">${nm(s)}</th>`).join('')}</tr></thead>` +
      T.A.map((row, i) => `<tr><td>${n4(T.cost[T.basis[i]])}</td><th>${nm(T.names[T.basis[i]])}</th>${row.map((v, j) => `<td class="${cls(i, j)}">${n4(v)}</td>`).join('')}<td class="${i === T.pr ? 'pr' : ''}${FR.sgn(T.b[i]) < 0 ? ' late' : ''}">${n4(T.b[i])}</td>` +
        (mode === 'p' && T.ratios ? `<td class="${i === T.pr ? 'pivot' : ''}">${T.ratios[i] ? n4(T.ratios[i]) + (i === T.pr ? ' min' : '') : '–'}</td>` : '') + '</tr>').join('') +
      `<tr class="zrow"><td></td><th>z<sub>j</sub></th>${T.zj.map(v => `<td>${n4(v)}</td>`).join('')}<td class="zval"><b>${n4(T.z)}</b></td>${mode === 'p' && T.ratios ? '<td></td>' : ''}</tr>` +
      `<tr class="zrow"><td></td><th>c<sub>j</sub> − z<sub>j</sub></th>${T.cmz.map((v, j) => `<td class="${j === T.pc ? 'pivot' : ''}">${n4(v)}</td>`).join('')}<td></td>${mode === 'p' && T.ratios ? '<td></td>' : ''}</tr>` +
      (T.dratios ? `<tr class="zrow"><td></td><th>|c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>|</th>${T.dratios.map((v, j) => `<td class="${j === T.pc ? 'pivot' : ''}">${v ? n4(v) + (j === T.pc ? ' min' : '') : '–'}</td>`).join('')}<td></td></tr>` : '') + '</table></div>'; };
  // kombinacja liniowa ze znakami: [[1, 'x2'], [−5/17, 'x5']] → x₂ − 5/17·x₅ (współczynnik 1 pomijamy)
  const lin = terms => terms.map(([v, s], q) => { const m = FR.sgn(v) < 0, a = m ? neg(v) : v;
    return (q ? (m ? ' − ' : ' + ') : (m ? '−' : '')) + (FR.cmp(a, FR.ONE) ? fr(a) + '·' : '') + nm(s); }).join('') || '0';
  const cutTerms = C => C.nonb.filter(j => FR.sgn(C.f[j]) > 0).map(j => [C.f[j], C.steps[0].names[j]]), ineq = C => `${lin(cutTerms(C))} ≥ ${fr(C.f0)}`;
  const xOf = (T, n) => Array.from({length: n}, (_, j) => { const i = T.basis.indexOf(T.names.indexOf('x' + (j + 1))); return i < 0 ? FR.Z : T.b[i]; });
  const done = C => C.steps[C.steps.length - 1].b.every(v => FR.sgn(v) >= 0);     // po odcięciu tablica znów dopuszczalna (nie przerwano, nie sprzeczne)
  const pl = (k, a, b, c) => k === 1 ? a : k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14) ? b : c;   // 1 odcięcie, 2 odcięcia, 5 odcięć
  return {n4, fr, fx, nm, neg, tbl, lin, cutTerms, ineq, xOf, done, pl};
}
function gomReportHTML(M, G, BB) {
  const {n4, fx, nm, tbl, ineq, xOf, done} = gomHelpers();
  let h = `<h3>Odcięcia Gomory'ego (dualna metoda simpleks)</h3><p class="hint">Najpierw rozwiązujemy zadanie bez wymogu całkowitości (relaksacja LP). Jeśli któraś zmienna bazowa jest ułamkowa, z jej wiersza budujemy <b>odcięcie</b> – nowe ograniczenie, które usuwa obecne rozwiązanie ułamkowe, ale nie usuwa żadnego punktu całkowitego. ` +
    `Po dodaniu odcięcia rozwiązanie przestaje być dopuszczalne (ujemne b), więc przywracamy dopuszczalność <b>dualną metodą simpleks</b>: wychodzi wiersz z ujemnym b, wchodzi kolumna z najmniejszym ilorazem |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| (tylko a<sub>rj</sub> &lt; 0). Powtarzamy, aż wszystkie zmienne będą całkowite. Obliczenia są dokładne (na ułamkach)${G.maxCuts ? `; limit: ${G.maxCuts} odcięć` : ''}.</p>`;
  const sc = G.scale.map((L, i) => L > 1n ? `ograniczenie ${i + 1} × ${L}` : null).filter(Boolean);
  if (sc.length) h += `<p><b>Przygotowanie:</b> odcięcie Gomory'ego zakłada, że wszystkie zmienne – także swobodne – są całkowite. Dlatego ograniczenia z ułamkowymi współczynnikami mnożymy tak, by stały się całkowite: ${sc.join(', ')}.</p>`;
  if (G.status === 'infeasible' && G.reason === 'lp') return h + '<p class="msg">Relaksacja LP nie ma rozwiązań dopuszczalnych – zadanie całkowitoliczbowe też ich nie ma.</p>';
  if (!G.lp.length || !G.lpX) return h + '<p class="msg">Nie udało się rozwiązać relaksacji LP (limit obliczeń).</p>';
  const lastLP = G.lp[G.lp.length - 1];
  h += `<h4>Krok 1. Relaksacja LP – ostatnia tablica simpleks</h4><p>Rozwiązanie bez wymogu całkowitości: ${G.lpX.map((v, j) => `x${sub(j + 1)} = ${fx(v)}`).join(', ')}; z = <b>${n4(G.lpValue)}</b>.</p>` + tbl(lastLP, 'p') +
    (G.lp.length > 1 ? `<details class="adv"><summary>Wszystkie tablice simpleks relaksacji LP (${G.lp.length})</summary>${G.lp.map((T, k) => `<h4>Tablica ${k + 1}</h4>` + tbl(T, 'p')).join('')}</details>` : '');
  if (!G.cuts.length && G.status === 'optimal') return h + `<div class="sum"><b>Wynik:</b> rozwiązanie relaksacji LP jest już całkowite – odcięcia nie są potrzebne. ${G.xNum.map((v, j) => `x${sub(j + 1)} = ${v}`).join(', ')}, z = <b>${fmt(G.zNum)}</b>.</div>`;
  h += `<h4>Krok 2. Odcięcia – podsumowanie (${G.cuts.length})</h4><p class="hint">Każdy wiersz to jedno odcięcie: z którego wiersza tablicy powstało, jaką nierówność dopisujemy i jakie rozwiązanie daje tablica po przywróceniu dopuszczalności. Pełne obliczenia każdego odcięcia – w części „Odcięcia krok po kroku”.</p>` +
    `<div class="tw"><table><thead><tr><th>Odcięcie</th><th>Z wiersza</th><th>Część ułamkowa f<sub>0</sub></th><th>Nierówność odcięcia</th><th>z po odcięciu</th><th>Rozwiązanie po odcięciu</th></tr></thead>` +
    G.cuts.map(C => { const T = C.steps[C.steps.length - 1], ok = done(C);
      return `<tr><td>${C.k}</td><td>${nm(C.srcVar)}</td><td>${n4(C.f0)}</td><td class="tl">${ineq(C)}</td><td>${ok ? n4(T.z) : '–'}</td><td class="tl">${ok ? xOf(T, G.n).map((v, j) => `x${sub(j + 1)} = ${n4(v)}`).join(', ') : G.status === 'infeasible' ? 'brak – zadanie bez rozwiązań całkowitych' : 'obliczenia przerwane (limit)'}</td></tr>`; }).join('') + '</table></div>';
  if (G.status === 'limit') return h + `<p class="msg">${G.limit === 'cuts' ? `Przerwano po ${G.maxCuts} odcięciach (limit odcięć)` : `Przerwano po przekroczeniu limitu obliczeń (${G.maxPiv} kroków simpleksu)`} – rozwiązanie nie jest jeszcze całkowite, więc nie podajemy go jako wyniku. ` +
    (BB && BB.status === 'optimal' ? `Dla porównania: metoda podziału i ograniczeń (pole „Metoda”) znajduje rozwiązanie optymalne z = ${fmt(Math.round(BB.bestZ * 1e6) / 1e6)}.` : 'Użyj metody podziału i ograniczeń.') + '</p>';
  if (G.status === 'infeasible') return h + '<p class="msg">Zadanie nie ma rozwiązań całkowitoliczbowych.</p>';
  h += tablesCSVLink([...G.lp, ...G.cuts.flatMap(C => C.steps)].map(T => ({...T, cB: T.basis.map(bi => T.cost[bi])})), v => String(Math.round(FR.toNum(v) * 1e6) / 1e6).replace('.', ','), 'tablice-gomory.csv', '⬇ Pobierz tablice (LP i odcięcia) do Excela (.csv)');
  h += `<div class="sum"><b>Rozwiązanie całkowitoliczbowe:</b> ${G.xNum.map((v, j) => `x${sub(j + 1)} = <b>${v}</b>`).join(', ')}; z = <b>${fmt(Math.round(G.zNum * 1e6) / 1e6)}</b> (relaksacja LP: ${n4(G.lpValue)}, różnica ${fmt(Math.round(Math.abs(FR.toNum(G.lpValue) - G.zNum) * 1e4) / 1e4)} – „koszt” wymogu całkowitości). Potrzebne odcięcia: ${G.cuts.length}.</div>`;
  if (BB && BB.status === 'optimal') h += Math.abs(BB.bestZ - G.zNum) < 1e-6 * (1 + Math.abs(G.zNum)) ? `<p class="hint">Kontrola: metoda podziału i ograniczeń daje tę samą wartość z = ${fmt(Math.round(BB.bestZ * 1e6) / 1e6)}${BB.best && BB.best.some((v, j) => Math.abs(v - G.xNum[j]) > 1e-6) ? ' przy innym rozwiązaniu – zadanie ma kilka rozwiązań całkowitych optymalnych' : ''}.</p>` : '<p class="msg">Uwaga: metoda podziału i ograniczeń daje inną wartość – zgłoś ten przykład.</p>';
  return h;
}
/* Wszystkie odcięcia krok po kroku – każde w pełnej postaci (wybór wiersza, wiersz źródłowy, części ułamkowe, odcięcie, dualny simpleks, wynik po odcięciu).
   Ogólne wyjaśnienia tylko przy pierwszym odcięciu, żeby długi raport (setki odcięć) nie powtarzał tych samych zdań. */
function gomCutsHTML(G) {
  if (!G || !G.cuts || !G.cuts.length) return '';
  const {n4, fr, fx, nm, neg, tbl, lin, cutTerms, xOf, done} = gomHelpers(), N = G.cuts.length;
  return G.cuts.map((C, q) => {
    const names = C.steps[0].names, cand = C.cand || [], tie = cand.filter(o => FR.cmp(o.f, C.f0) === 0).length > 1, T = C.steps[C.steps.length - 1];
    const cols = C.nonb.filter(j => FR.sgn(C.srcRow[j])), terms = cutTerms(C), where = q ? `tablicy po odcięciu ${C.k - 1}` : 'ostatniej tablicy relaksacji LP';
    let h = `<div class="step gcut"><h4>Odcięcie ${C.k} z ${N} – wiersz ${nm(C.srcVar)}</h4><p><b>1. Wybór wiersza.</b> ` + (cand.length > 1
      ? `W ${where} ułamkowe są zmienne bazowe: ${cand.map(o => `${nm(o.v)} = ${fx(o.b)} (f = ${fr(o.f)})`).join('; ')}. Odcięcie budujemy z wiersza o największej części ułamkowej${tie ? ' (przy remisie – z pierwszego takiego wiersza tablicy)' : ''}: <b>${nm(C.srcVar)}</b>.`
      : `W ${where} jedyną ułamkową zmienną bazową jest ${nm(C.srcVar)} = ${fx(C.srcB)} (f = ${fr(C.f0)}) – z jej wiersza budujemy odcięcie.`) + '</p>';
    h += `<p><b>2. Wiersz ${nm(C.srcVar)} jako równanie</b>${q ? '' : ' (pozostałe zmienne bazowe mają w nim współczynnik 0)'}:</p><div class="formula">${lin([[FR.ONE, C.srcVar], ...cols.map(j => [C.srcRow[j], names[j]])])} = ${fr(C.srcB)}</div>`;
    h += `<p><b>3. Części ułamkowe</b> f = a − ⌊a⌋${q ? '' : ', gdzie ⌊a⌋ to największa liczba całkowita nie większa od a (liczbę ujemną zaokrąglamy w dół: ⌊−1/4⌋ = −1, więc f = −1/4 − (−1) = 3/4)'}:</p>` +
      `<div class="tw"><table class="gfr"><thead><tr><th></th>${cols.map(j => `<th>${nm(names[j])}</th>`).join('')}<th>b</th></tr></thead><tbody>` +
      `<tr><th>a</th>${cols.map(j => `<td>${fr(C.srcRow[j])}</td>`).join('')}<td>${fr(C.srcB)}</td></tr>` +
      `<tr><th>⌊a⌋</th>${cols.map(j => `<td>${fr(FR.floor(C.srcRow[j]))}</td>`).join('')}<td>${fr(FR.floor(C.srcB))}</td></tr>` +
      `<tr><th>f = a − ⌊a⌋</th>${cols.map(j => `<td class="${FR.sgn(C.f[j]) ? 'best' : ''}">${fr(C.f[j])}</td>`).join('')}<td class="best">${fr(C.f0)}</td></tr></tbody></table></div>`;
    h += `<p><b>4. Odcięcie</b>${q ? ` i jego postać do tablicy (nowa zmienna swobodna ${nm('s' + C.k)} ≥ 0)` : ` – nierówność Σ f<sub>j</sub>·x<sub>j</sub> ≥ f<sub>0</sub> po zmiennych niebazowych. Obecne rozwiązanie jej nie spełnia (zmienne niebazowe są w nim równe 0, więc lewa strona = 0 &lt; f<sub>0</sub>), a każdy punkt całkowity – spełnia. Do tablicy dopisujemy ją pomnożoną przez −1, z nową zmienną swobodną ${nm('s' + C.k)} ≥ 0`}:</p>` +
      `<div class="formula">${lin(terms)} ≥ ${fr(C.f0)} &nbsp;→&nbsp; ${lin([...terms.map(([v, s]) => [neg(v), s]), [FR.ONE, 's' + C.k]])} = −${fr(C.f0)}</div>`;
    h += `<p><b>5. Dualna metoda simpleks.</b>${q ? '' : ' Wiersz odcięcia ma ujemne b, więc tablica przestaje być dopuszczalna (optymalność c<sub>j</sub> − z<sub>j</sub> zostaje). Z bazy wychodzi zmienna z wiersza o najbardziej ujemnym b, wchodzi kolumna z najmniejszym ilorazem |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| (tylko a<sub>rj</sub> &lt; 0). Powtarzamy, aż wszystkie b ≥ 0.'}</p>` +
      C.steps.map(S => `<p>${S.pr >= 0 && S.pc >= 0 ? `Wiersz <b>${nm(S.names[S.basis[S.pr]])}</b> ma ujemne b = ${n4(S.b[S.pr])} – zmienna wychodzi z bazy. Najmniejszy iloraz |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| ma kolumna <b>${nm(S.names[S.pc])}</b> – zmienna wchodzi; element wiodący = ${n4(S.A[S.pr][S.pc])}.` :
        S.pr >= 0 ? 'W wierszu z ujemnym b nie ma ujemnych współczynników – zadanie całkowitoliczbowe nie ma rozwiązań.' : 'Wszystkie b ≥ 0 – tablica znów dopuszczalna.'}</p>` + tbl(S, 'd')).join('');
    if (C.dropped && C.dropped.length) h += `<p class="hint">${C.dropped.length === 1 ? `Zmienna ${nm(C.dropped[0])} odcięcia jest w bazie (odcięcie nieaktywne) – usuwamy jej wiersz i kolumnę` : `Zmienne ${C.dropped.map(nm).join(', ')} odcięć są w bazie (odcięcia nieaktywne) – usuwamy ich wiersze i kolumny`}, by tablica nie rosła.</p>`;
    if (done(C)) h += `<p><b>6. Wynik po odcięciu ${C.k}:</b> ${xOf(T, G.n).map((v, j) => `x${sub(j + 1)} = ${fx(v)}`).join(', ')}; z = ${fx(T.z)}. ` + (q < N - 1 ? `Nadal są ułamkowe zmienne bazowe – budujemy odcięcie ${C.k + 1}.`
      : G.status === 'optimal' ? 'Wszystkie zmienne są całkowite – koniec: to rozwiązanie optymalne zadania całkowitoliczbowego.' : G.status === 'limit' ? `Nadal są ułamkowe zmienne bazowe, ale osiągnięto limit ${G.maxCuts} odcięć – obliczenia przerwano.` : '') + '</p>';
    else if (G.status === 'limit') h += '<p class="msg">Obliczenia przerwano w trakcie tego odcięcia – przekroczono limit kroków simpleksu.</p>';
    return h + '</div>';
  }).join('');
}
function gomCutsInfo(N, tabs, on) {
  const {pl} = gomHelpers();
  return on ? `${N} ${pl(N, 'odcięcie', 'odcięcia', 'odcięć')}, ${tabs} ${pl(tabs, 'tablica', 'tablice', 'tablic')} – każde odcięcie rozpisane w całości: wybór wiersza, części ułamkowe, nowe ograniczenie i dualna metoda simpleks. Ta część trafia też do PDF jako osobny rozdział.`
    : `Pominięte – raport i PDF zawierają tylko podsumowanie odcięć (krok 2). Zaznacz „dołącz do raportu i PDF”, aby rozpisać ${N === 1 ? 'to odcięcie' : `wszystkie ${N} ${pl(N, 'odcięcie', 'odcięcia', 'odcięć')}`} krok po kroku.`;
}
function gomCutsShellHTML(G, on, body) {   // body: HTML z gomCutsHTML (gdy sekcja włączona) albo ''
  const N = G.cuts.length, tabs = G.cuts.reduce((s, C) => s + C.steps.length, 0);
  return `<section class="gcuts" data-n="${N}" data-t="${tabs}"><div class="gchead"><h3>Odcięcia krok po kroku</h3><label class="chk"><input type="checkbox" class="gctog"${on ? ' checked' : ''}> dołącz do raportu i PDF</label></div>` +
    `<p class="hint gcinfo">${gomCutsInfo(N, tabs, on)}</p><div class="gcbody">${on ? body : ''}</div></section>`;
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
