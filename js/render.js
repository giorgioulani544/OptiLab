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
  if (R.status === 'optimal') { const last = R.tables[R.tables.length - 1];
    if (R.alt.length) h += `<p class="note">Zmienne niebazowe ${R.alt.map(nm).join(', ')} mają c<sub>j</sub> − z<sub>j</sub> = 0 – istnieją rozwiązania alternatywne o tej samej wartości funkcji celu.</p>`;
    if (R.degenerate) h += '<p class="note">Któraś zmienna bazowa ma wartość 0 – rozwiązanie zdegenerowane.</p>';
    if (last.basis.some((j, i) => R.kinds[j] === 'a')) h += '<p class="hint">W bazie została zmienna sztuczna o wartości 0 – nie wpływa na wynik (ograniczenie jest zależne od pozostałych).</p>'; }
  return h;
}
