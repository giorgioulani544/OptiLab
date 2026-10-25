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
const failLP = (out, r, M, keep) => r.status === 'unbounded'
  ? fail(out, 'Problem nieograniczony – funkcję celu można poprawiać w nieskończoność. Sprawdź, czy brakuje ograniczenia z góry dla zmiennych o dodatnich współczynnikach celu.', M.c.map((_, j) => 'c' + j), keep)
  : fail(out, 'Brak obszaru dopuszczalnego – ograniczenia wzajemnie się wykluczają (np. x ≥ 5 oraz x ≤ 3). Zmień znak lub prawą stronę w jednym z ograniczeń.', M.b.map((_, i) => 'b' + i), keep);
