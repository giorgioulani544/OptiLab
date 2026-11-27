/* ===== OptiLab – lekcje „Nauka” dla modeli sieciowych: Transport i Przydział (czyste funkcje, bez DOM – testowane w Node) =====
   Transport: wszystko z transportSolve (js/net/transport-solver.js) – kroki planu początkowego (initial.steps: przydział, skreślenia, kary VAM),
   iteracje metody potencjałów (iters: u, v, d, trasa wchodząca, cykl, θ), fikcyjny dostawca/odbiorca. Przydział: z assignmentSolve
   (js/net/assignment-solver.js) – redukcje, pokrycie zer liniami, korekty k, wybór zer. Zadania lekcyjne (NETL_TASKS) to tylko dane wejściowe;
   „Wyzwanie” korzysta z przykładów wbudowanych w moduły (TR_EXAMPLES, AS_EXAMPLES). Pytania mają q.tag (testy porównują z solverem),
   a w Sprawdzianie i Wyzwaniu karta nie pokazuje odpowiedzi (zasłonięte komórki „?”, q.tag.cell = [wiersz, kolumna] zasłoniętej komórki). */
const NETL_TASKS = {
  transport: {
    warm: {cost: [[1, 4, 2], [2, 1, 2]], supply: [10, 10], demand: [5, 10, 5]},
    test: {cost: [[2, 7, 1], [6, 5, 1], [1, 2, 1]], supply: [5, 15, 10], demand: [10, 10, 10]},
    challenge: 'Popyt większy od podaży'
  },
  start: {
    warm: {cost: [[6, 2, 1], [3, 5, 4]], supply: [10, 15], demand: [5, 15, 5], init: 'lc'},
    test: {cost: [[3, 7, 4], [1, 10, 5], [2, 2, 1]], supply: [15, 10, 35], demand: [5, 20, 35], init: 'vam'},
    challenge: 'Podręcznikowy 3 × 4 (Taha, optimum 435)'                 // Taha: kąt NW 520, minimalny element 475, VAM 475, optimum 435
  },
  assign: {
    warm: 'Podręcznikowy 3 × 3 (Taha, koszt 27)',
    test: {cost: [[5, 1, 8], [9, 6, 7], [8, 9, 7]]},
    challenge: 'Maksymalizacja (sprzedawcy i rejony)'
  }
};
const NETL = (() => {
  const {nf} = LPL, E = s => LESSON.esc(s), MODE = {warm: 'guide', test: 'test', challenge: 'watch'}, MI = '−';
  const LV = l => ({warm: 'Rozgrzewka', test: 'Sprawdzian', challenge: 'Wyzwanie'})[l];
  const num = v => { const s = String(v).trim().replace(',', '.'); return /^m$/i.test(s) ? null : Number(s); };
  /* zadanie lekcji → dane solvera (nazwa = przykład z modułu) */
  function trTask(t) {
    if (typeof t === 'string') { const ex = (typeof TR_EXAMPLES !== 'undefined' ? TR_EXAMPLES : []).find(e => e.name === t); if (!ex) throw new Error('brak przykładu ' + t);
      const d = ex.data; return {maxi: !!d.maxi, cost: d.cells.map(r => r.map(num)), supply: d.xc.map(num), demand: d.xr.map(num), sNames: d.rn.slice(), dNames: d.cn.slice(), example: ex.name}; }
    return {maxi: false, cost: t.cost.map(r => r.slice()), supply: t.supply.slice(), demand: t.demand.slice(), sNames: t.supply.map((_, i) => 'D' + (i + 1)), dNames: t.demand.map((_, j) => 'O' + (j + 1)), init: t.init};
  }
  function asTask(t) {
    if (typeof t === 'string') { const ex = (typeof AS_EXAMPLES !== 'undefined' ? AS_EXAMPLES : []).find(e => e.name === t); if (!ex) throw new Error('brak przykładu ' + t);
      const d = ex.data; return {maxi: !!d.maxi, cost: d.cells.map(r => r.map(num)), rNames: d.rn.slice(), cNames: d.cn.slice(), example: ex.name}; }
    return {maxi: false, cost: t.cost.map(r => r.slice()), rNames: t.cost.map((_, i) => 'W' + (i + 1)), cNames: t.cost[0].map((_, j) => 'Z' + (j + 1))};
  }
  const trData = P => ({maxi: P.maxi, rn: P.sNames.slice(), cn: P.dNames.slice(), cells: P.cost.map(r => r.map(v => v === null ? 'M' : String(v))), xc: P.supply.map(String), xr: P.demand.map(String)});
  const asData = P => ({maxi: P.maxi, rn: P.rNames.slice(), cn: P.cNames.slice(), cells: P.cost.map(r => r.map(v => v === null ? 'M' : String(v)))});
  const sumv = a => a.reduce((s, v) => s + v, 0);
  const key = (i, j) => i + ',' + j;

  /* ================= TABELA TRANSPORTOWA ================= */
  // o: {x, B, u, v, d, a, b (pozostała podaż/popyt), rowOut, colOut, cycle, blank: {x: Set, u: Set, v: Set, d: Set, a: Set, b: Set}, pen: {row, col}}
  // współrzędne: wiersz i = dostawca, m = popyt, m + 1 = v; kolumna 0 = nazwa, 1..n = trasy, n + 1 = podaż, n + 2 = u (albo kara)
  function trTable(R, o = {}) {
    const m = R.m, n = R.n, bl = o.blank || {}, has = (s, k) => s && s.has(k), cyc = new Map((o.cycle || []).map(c => [key(c.i, c.j), c.s]));
    const extra = o.u ? 'u' : o.pen ? 'pen' : null;
    const head = [[{v: 'Od \\ Do', c: 0}, ...R.dNames.map((nm, j) => ({v: E(nm), c: j + 1})), {v: o.a ? 'Zostało<br>podaży' : 'Podaż', c: n + 1}, ...(extra ? [{v: extra === 'u' ? 'u<sub>i</sub>' : 'kara', c: n + 2}] : [])]];
    const rows = R.sNames.map((nm, i) => [{v: E(nm), th: true}, ...R.cost[i].map((c, j) => {
      const basic = o.B && o.B[i][j], s = cyc.get(key(i, j)), dd = o.d && o.d[i][j];
      let v = `<span class="lc">${c === null ? 'M' : nf(c)}</span>`;
      if (basic) v += `<b class="lx">${has(bl.x, key(i, j)) ? '?' : nf(o.x[i][j])}</b>`;
      else if (o.d && dd !== null && dd !== undefined) v += `<i class="ld${dd < -1e-9 && !has(bl.d, key(i, j)) ? ' neg' : ''}">${has(bl.d, key(i, j)) ? '?' : nf(dd)}</i>`;
      else v += '<b class="lx"> </b>';
      if (s) v += `<span class="cy ${s > 0 ? 'p' : 'm'}">${s > 0 ? '+' : MI}</span>`;
      return {v, cls: 'tcell' + ((o.rowOut && o.rowOut[i]) || (o.colOut && o.colOut[j]) ? ' dim' : '') + (basic ? ' bas' : '')};
    }), {v: has(bl.a, i) ? '<b>?</b>' : nf(o.a ? o.a[i] : R.supply[i]), cls: o.rowOut && o.rowOut[i] ? 'dim' : ''},
    ...(extra === 'u' ? [{v: has(bl.u, i) ? '<b>?</b>' : nf(o.u[i])}] : extra === 'pen' ? [{v: o.pen.row[i] === null ? '–' : has(bl.pr, i) ? '<b>?</b>' : nf(o.pen.row[i])}] : [])]);
    rows.push([{v: o.b ? 'Zostało<br>popytu' : 'Popyt', th: true}, ...R.demand.map((d, j) => ({v: has(bl.b, j) ? '<b>?</b>' : nf(o.b ? o.b[j] : d), cls: o.colOut && o.colOut[j] ? 'dim' : ''})), {v: nf(sumv(R.supply))}, ...(extra ? [''] : [])]);
    if (o.v) rows.push([{v: 'v<sub>j</sub>', th: true}, ...o.v.map((v, j) => has(bl.v, j) ? '<b>?</b>' : nf(v)), '', ...(extra ? [''] : [])]);
    if (o.pen) rows.push([{v: 'kara', th: true}, ...o.pen.col.map((p, j) => p === null ? '–' : has(bl.pc, j) ? '<b>?</b>' : nf(p)), '', '']);
    return {head, rows, cls: 'ltr'};
  }
  const route = (R, i, j) => `${E(R.sNames[i])} → ${E(R.dNames[j])}`;
  const planTxt = (R, x) => { const L = []; x.forEach((r, i) => r.forEach((q, j) => { if (q > 1e-9) L.push(`${route(R, i, j)}: ${nf(q)}`); })); return L.join(', '); };
  const costSum = (R, x) => { const L = []; x.forEach((r, i) => r.forEach((q, j) => { if (q > 1e-9 && R.cost[i][j] !== null) L.push(`${nf(R.cost[i][j])}·${nf(q)}`); })); return L.join(' + '); };
  const trResult = (R) => ({x: [], z: R.t, plan: R.x.map(r => r.slice()), html: `${planTxt(R, R.x)}; ${R.maxi ? 'zysk' : 'koszt'} = <b>${nf(R.t)}</b>`});
  const trResultCard = (R, say = 'Gotowe! Tak samo liczy OptiLab.') => ({title: 'Wynik', mood: 'happy', say, text: 'To plan optymalny. Ten sam wynik pokazuje raport w zakładce Transport.', result: trResult(R)});

  /* ---------- karty jednej iteracji metody potencjałów ---------- */
  function modiCards(R, k, mode, first) {
    const It = R.iters[k], Nx = R.iters[k + 1], m = R.m, n = R.n, out = [], exam = mode !== 'guide', score = mode === 'test';
    const nb = []; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (!It.B[i][j]) nb.push([i, j]);
    const en = It.enter, enTxt = route(R, en.i, en.j), base = {x: It.x, B: It.B};
    // potencjały: pytamy o v ostatniej kolumny (z komórki bazowej w tej kolumnie)
    // pytany potencjał: kolumna, której trasa z planu leży w wierszu > 1 (trzeba przejść łańcuch od u₁ = 0), a v ≠ 0 i ≠ u₁
    const jc = Array.from({length: n}, (_, j) => n - 1 - j), jv = jc.find(j => It.B.some((r, i) => r[j] && i > 0) && Math.abs(It.v[j]) > 1e-9) ?? n - 1;
    const iv = It.B.map((r, i) => i).filter(i => It.B[i][jv]).sort((p, q) => q - p)[0], uvBlank = exam ? {u: new Set(Array.from({length: m}, (_, i) => i).filter(i => i > 0)), v: new Set(Array.from({length: n}, (_, j) => j))} : {v: new Set([jv])};
    if (first || mode === 'guide' || mode === 'test') {
      if (first) out.push({id: `pot${k}`, title: 'Potencjały u i v', mood: 'point', say: first && mode === 'guide' ? 'Każdej trasie w planie daję „cenę” u + v.' : 'Policz potencjały.',
        text: first && !exam ? `Każdemu dostawcy dajemy liczbę u, a każdemu odbiorcy liczbę v tak, by na każdej trasie z planu u + v = koszt. Równań jest o jedno mniej niż niewiadomych, więc zaczynamy od u₁ = 0. Dalej idziemy od trasy do trasy: znając u, liczymy v, i odwrotnie.`
          : `Na trasach z planu u + v = koszt, a u₁ = 0. Policz potencjały po kolei, od trasy do trasy.`,
        table: trTable(R, {...base, u: It.u, v: It.v, blank: uvBlank}), hl: exam ? [] : [{r: iv, c: jv + 1, tone: 'gold', label: 'u + v = koszt'}, {r: m + 1, c: jv + 1, tone: 'blue'}],
        q: {type: 'number', prompt: `Ile wynosi v${sub(jv + 1)} (${E(R.dNames[jv])})?`, answer: It.v[jv], score, tag: {t: 'pot', it: k, j: jv, cell: [m + 1, jv + 1]},
          wrong: [{v: R.w[iv][jv] + It.u[iv], why: `Uwaga na znak: v = koszt − u, a nie koszt + u.`}, {v: R.w[iv][jv], why: `To sam koszt trasy ${route(R, iv, jv)}. Trzeba jeszcze odjąć u tego dostawcy.`}].filter(w => Math.abs(w.v - It.v[jv]) > 1e-9),
          explain: `Trasa ${route(R, iv, jv)} jest w planie: v${sub(jv + 1)} = ${nf(R.w[iv][jv])} − u${sub(iv + 1)} = ${nf(R.w[iv][jv])} − ${nf(It.u[iv])} = ${nf(It.v[jv])}.`}});
      // wskaźnik d dla jednej trasy spoza planu (w Rozgrzewce – trasa wchodząca, w egzaminie – inna)
      const dq = mode === 'guide' ? [en.i, en.j] : (nb.find(([i, j]) => !(i === en.i && j === en.j) && Math.abs(It.d[i][j]) > 1e-9) || [en.i, en.j]);
      const dBlank = exam ? new Set(nb.map(([i, j]) => key(i, j))) : new Set([key(dq[0], dq[1])]);
      if (first || score) out.push({id: `d${k}`, title: first ? 'Wskaźniki d – czy warto zmienić trasę?' : `Iteracja ${k + 1}: wskaźniki`, say: first && !exam ? 'd mówi, ile zmieni się koszt na jednostkę.' : 'Policz wskaźnik.',
        text: first && !exam ? 'Dla trasy spoza planu liczymy d = koszt − (u + v). To zmiana kosztu, gdy przewieziemy tą trasą jedną jednostkę (resztę planu poprawiamy tak, by sumy się zgadzały). Ujemne d oznacza oszczędność.'
          : 'Dla tras spoza planu d = koszt − (u + v).',
        table: trTable(R, {...base, u: It.u, v: It.v, d: It.d, blank: {d: dBlank}}), hl: exam ? [] : [{r: dq[0], c: dq[1] + 1, tone: 'gold', label: 'd = ?'}],
        q: {type: 'number', prompt: `Ile wynosi d dla trasy ${route(R, dq[0], dq[1])}?`, answer: It.d[dq[0]][dq[1]], score, tag: {t: 'dij', it: k, i: dq[0], j: dq[1], cell: [dq[0], dq[1] + 1]},
          wrong: [{v: R.w[dq[0]][dq[1]] + It.u[dq[0]] + It.v[dq[1]], why: 'Odejmujemy obie liczby: d = koszt − u − v.'}, {v: It.u[dq[0]] + It.v[dq[1]] - R.w[dq[0]][dq[1]], why: 'Odwrotnie: d = koszt − (u + v), a nie (u + v) − koszt.'}].filter((w, q2, a) => Math.abs(w.v - It.d[dq[0]][dq[1]]) > 1e-9 && a.findIndex(z => Math.abs(z.v - w.v) < 1e-9) === q2),
          explain: `d = ${nf(R.w[dq[0]][dq[1]])} − (${nf(It.u[dq[0]])} + ${nf(It.v[dq[1]])}) = ${nf(It.d[dq[0]][dq[1]])}.`}});
    }
    // wybór trasy wchodzącej
    const cand = nb.slice().sort((p, q) => It.d[p[0]][p[1]] - It.d[q[0]][q[1]]).slice(0, 3);
    if (!cand.some(([i, j]) => i === en.i && j === en.j)) cand[0] = [en.i, en.j];
    const enterQ = {type: 'choice', prompt: 'Która trasa wchodzi do planu?', score, tag: {t: 'tenter', it: k},
      options: [...cand.map(([i, j]) => ({t: route(R, i, j), ok: i === en.i && j === en.j, why: It.d[i][j] >= -1e-9 ? `Tu d = ${nf(It.d[i][j])} – nie jest ujemne, więc ta trasa nie obniży kosztu.` : `Tu d = ${nf(It.d[i][j])} też obniża koszt, ale mniej niż ${nf(en.d)} na trasie ${enTxt}. Bierzemy najbardziej ujemne d.`})),
        {t: 'żadna – plan jest optymalny', why: `Jeszcze nie: trasa ${enTxt} ma d = ${nf(en.d)} < 0, więc koszt da się obniżyć.`}],
      explain: `${enTxt}: najbardziej ujemne d = ${nf(en.d)} – każda przewieziona tędy jednostka obniża koszt o ${nf(-en.d)}.`};
    const minus = It.cycle.filter(c => c.s < 0), plus = It.cycle.filter(c => c.s > 0 && !(c.i === en.i && c.j === en.j));
    const thetaQ = {type: 'number', prompt: 'Ile jednostek przesuwamy po cyklu (θ)?', answer: It.theta, score, tag: {t: 'theta', it: k},
      wrong: [{v: Math.max(...minus.map(c => It.x[c.i][c.j])), why: 'Bierzemy NAJMNIEJSZĄ liczbę w komórkach z minusem – przy większej któraś trasa miałaby ujemny przewóz.'},
        ...(plus.length ? [{v: Math.min(...plus.map(c => It.x[c.i][c.j])), why: 'Komórki z plusem dostają towar, więc niczego nie ograniczają. Liczy się minimum w komórkach z minusem.'}] : [])].filter((w, q2, a) => Math.abs(w.v - It.theta) > 1e-9 && a.findIndex(z => Math.abs(z.v - w.v) < 1e-9) === q2),
      explain: `θ = min(${minus.map(c => nf(It.x[c.i][c.j])).join('; ')}) = ${nf(It.theta)} – z planu wypada trasa ${route(R, It.leave.i, It.leave.j)}.`};
    const costQ = {type: 'number', prompt: 'Ile wynosi koszt nowego planu?', answer: Nx.t, score, tag: {t: 'tcost', it: k},
      wrong: [{v: It.t - It.theta, why: `Koszt spada o θ·|d| = ${nf(It.theta)}·${nf(-en.d)}, a nie o samo θ.`}, {v: It.t + It.theta * -en.d, why: 'Ujemne d oznacza spadek kosztu, nie wzrost.'}].filter(w => Math.abs(w.v - Nx.t) > 1e-9),
      explain: `${nf(It.t)} − ${nf(It.theta)}·${nf(-en.d)} = ${nf(Nx.t)} (albo wprost: ${costSum(R, Nx.x)}).`};
    if (mode === 'guide' && first) {
      out.push({id: `we${k}`, title: 'Która trasa wchodzi?', say: 'Szukam najbardziej ujemnego d.', text: 'Gdy wszystkie d są ≥ 0, plan jest optymalny. Jeśli nie, wprowadzamy trasę z najbardziej ujemnym d – ona najszybciej obniża koszt.',
        table: trTable(R, {...base, u: It.u, v: It.v, d: It.d}), hl: [{r: en.i, c: en.j + 1, tone: 'gold', label: 'najmniejsze d'}], q: enterQ});
      out.push({id: `cy${k}`, title: 'Cykl: przesuwamy towar w kółko', mood: 'point', say: 'Plus, minus, plus, minus – sumy się nie zmienią!',
        text: `Od trasy ${enTxt} rysujemy zamkniętą drogę, która skręca tylko w komórkach z planu. Znaki + i − zmieniają się na przemian, więc w każdym wierszu i kolumnie tyle samo dodajemy, ile odejmujemy – podaż i popyt dalej się zgadzają. Przesuwamy θ = najmniejszy przewóz w komórkach z minusem.`,
        table: trTable(R, {...base, cycle: It.cycle}), hl: [...minus.map((c, q2) => ({r: c.i, c: c.j + 1, tone: 'red', ...(q2 ? {} : {label: '−'})})), {r: en.i, c: en.j + 1, tone: 'green', label: '+'}], q: thetaQ});
      out.push({id: `np${k}`, title: 'Nowy plan', mood: 'surprise', say: 'Taniej!', text: `Do komórek z plusem dodajemy ${nf(It.theta)}, z komórek z minusem odejmujemy ${nf(It.theta)}. Trasa ${route(R, It.leave.i, It.leave.j)} spada do zera i wypada z planu.`,
        table: trTable(R, {x: Nx.x, B: Nx.B}), hl: [{r: en.i, c: en.j + 1, tone: 'green', label: 'nowa trasa'}], q: costQ});
      return out;
    }
    if (mode === 'guide') {
      out.push({title: `Iteracja ${k + 1} – ten sam przepis`, say: 'Znów: potencjały, d, cykl.', text: `Najbardziej ujemne d = ${nf(en.d)} ma trasa ${enTxt}. Cykl przesuwa θ = ${nf(It.theta)}, a koszt spada do ${nf(Nx.t)}.`,
        table: trTable(R, {...base, u: It.u, v: It.v, d: It.d, cycle: It.cycle}), hl: [{r: en.i, c: en.j + 1, tone: 'gold'}], q: enterQ});
      return out;
    }
    if (mode === 'test') {
      out.push({id: `we${k}`, title: `Iteracja ${k + 1}: Twój ruch`, text: 'Wskaźniki są policzone. Co teraz?', table: trTable(R, {...base, u: It.u, v: It.v, d: It.d}), q: enterQ});
      out.push({title: `Iteracja ${k + 1}: cykl`, text: `${enTxt} wchodzi do planu. Cykl jest zaznaczony znakami + i −.`, table: trTable(R, {...base, cycle: It.cycle}), q: thetaQ});
      out.push({title: `Iteracja ${k + 1}: nowy plan`, text: `Koszt obecnego planu: ${nf(It.t)}. Przesuń towar po cyklu i policz koszt nowego planu.`, table: trTable(R, {...base, cycle: It.cycle}), q: costQ});
      return out;
    }
    // Wyzwanie: pytanie na czystej tablicy, potem podsumowanie iteracji
    if (first) out.push({title: `Iteracja ${k + 1}: Twój ruch`, mood: 'think', say: 'Którą trasę wprowadzisz?', text: 'Wskaźniki d są policzone tak samo jak w Rozgrzewce.', table: trTable(R, {...base, u: It.u, v: It.v, d: It.d}), q: enterQ});
    out.push({title: `Iteracja ${k + 1}`, mood: 'point', say: k ? 'Ten sam przepis!' : 'Cykl i przesunięcie.', text: `Wchodzi ${enTxt} (d = ${nf(en.d)}), po cyklu przesuwamy θ = ${nf(It.theta)} i wypada ${route(R, It.leave.i, It.leave.j)}. Koszt: ${nf(It.t)} → ${nf(Nx.t)}.`,
      table: trTable(R, {...base, cycle: It.cycle, u: It.u, v: It.v, d: It.d}), hl: [{r: en.i, c: en.j + 1, tone: 'gold', label: 'wchodzi'}, {r: It.leave.i, c: It.leave.j + 1, tone: 'red', label: 'wypada'}],
      q: k === R.iters.length - 2 ? {...costQ, prompt: 'Ile wynosi koszt po tej iteracji?'} : undefined});
    if (k === R.iters.length - 2) out[out.length - 1].text = `Wchodzi ${enTxt} (d = ${nf(en.d)}), po cyklu przesuwamy θ = ${nf(It.theta)} i wypada ${route(R, It.leave.i, It.leave.j)}.`;
    return out;
  }
  function optCard(R, mode) {
    const F = R.iters[R.iters.length - 1], exam = mode !== 'guide';
    const nb = []; for (let i = 0; i < R.m; i++) for (let j = 0; j < R.n; j++) if (!F.B[i][j]) nb.push([i, j]);
    return {id: 'opt', title: 'Czy to już optimum?', say: exam ? 'Twoja decyzja!' : 'Sprawdzam wszystkie d…', text: exam ? 'Potencjały i wskaźniki dla nowego planu są policzone.' : 'Liczymy potencjały i wskaźniki od nowa. Gdy żadne d nie jest ujemne, żadna zmiana trasy nie obniży kosztu – to plan optymalny.',
      table: trTable(R, {x: F.x, B: F.B, u: F.u, v: F.v, d: F.d}), hl: exam ? [] : nb.map(([i, j], q) => ({r: i, c: j + 1, tone: 'green', ...(q ? {} : {label: 'd ≥ 0'})})),
      q: {type: 'choice', prompt: 'Czy plan można jeszcze poprawić?', score: mode === 'test', tag: {t: 'topt'},
        options: [{t: 'nie – to optimum', ok: true}, ...nb.slice(0, 2).map(([i, j]) => ({t: `tak – trasą ${route(R, i, j)}`, why: `Tu d = ${nf(F.d[i][j])} ≥ 0: ta trasa nie obniży kosztu.`}))],
        explain: 'Wszystkie wskaźniki d ≥ 0 – plan jest optymalny.'}};
  }
  function checkCard(R) {
    const rs = R.x.map(r => sumv(r)), cs = R.demand.map((_, j) => sumv(R.x.map(r => r[j])));
    return {title: 'Sprawdź się sam', mood: 'surprise', say: 'Ciekawostka: plan sprawdzisz w minutę!', text: 'Suma w każdym wierszu musi dać podaż, a w każdej kolumnie – popyt. Koszt to suma koszt × ilość po wszystkich trasach.',
      formula: R.sNames.map((nm, i) => `${E(nm)}: ${R.x[i].map(nf).join(' + ')} = ${nf(rs[i])} ✓`).join('<br>') + '<br>' + R.dNames.map((nm, j) => `${E(nm)}: ${nf(cs[j])} ✓`).join(', ') + `<br><b>koszt</b> = ${costSum(R, R.x)} = <b>${nf(R.t)}</b>`};
  }
  /* ================= LEKCJA: ZAGADNIENIE TRANSPORTOWE (kąt NW + metoda potencjałów) ================= */
  function transport(level) {
    const P = trTask(NETL_TASKS.transport[level]), mode = MODE[level], exam = mode !== 'guide', score = mode === 'test';
    const R = transportSolve(P, 'nw');
    if (R.status !== 'optimal' || R.epsCells.length) throw new Error('zadanie lekcji: brak optimum albo degeneracja');
    const I0 = R.initial, st = I0.steps, steps = [], S = sumv(P.supply), D = sumv(P.demand), m = R.m, n = R.n;
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Przykład z modułu – popytu jest więcej niż towaru!' : 'Przewieźmy towar jak najtaniej.',
      text: level === 'challenge' ? `To przykład „${E(P.example)}” z zakładki Transport. W komórkach są koszty przewozu jednej sztuki, z boku podaż dostawców, na dole popyt odbiorców.` : 'Dostawcy mają towar (podaż), odbiorcy go potrzebują (popyt). W komórkach są koszty przewozu jednej sztuki, a my szukamy planu o najmniejszym łącznym koszcie.',
      table: trTable({...R, sNames: P.sNames, dNames: P.dNames, cost: P.cost, supply: P.supply, demand: P.demand, m: P.supply.length, n: P.demand.length}, {}), hl: [{r: P.supply.length, tone: 'green', label: 'popyt'}, {c: P.demand.length + 1, tone: 'blue', label: 'podaż'}]});
    if (R.dummy) steps.push({id: 'bilans', title: 'Bilans: fikcyjny dostawca', mood: 'think', say: exam ? 'Policz, czego brakuje.' : 'Brakuje towaru – dopisuję „dostawcę-ducha”.',
      text: exam ? `Łączna podaż to ${nf(S)}, a łączny popyt ${nf(D)}. Metoda wymaga równych sum, więc dopisujemy fikcyjnego dostawcę z kosztem 0 – to towar, którego naprawdę nikt nie dostarczy.`
        : `Łączna podaż ${nf(S)} < popyt ${nf(D)}. Dopisujemy fikcyjnego dostawcę z podażą ${nf(D - S)} i kosztem 0 – „dostawa” od niego oznacza, że odbiorca tyle nie dostanie.`,
      table: trTable(R, {blank: exam ? {a: new Set([m - 1])} : {}}), hl: [{r: m - 1, tone: 'gray'}],
      q: {type: 'number', prompt: 'Ile jednostek ma fikcyjny dostawca?', answer: R.dummy.amount, score, tag: {t: 'dummy', cell: [m - 1, n + 1]}, wrong: [{v: D, why: 'To cały popyt. Fikcyjny dostawca uzupełnia tylko brakującą różnicę.'}, {v: S, why: 'To podaż prawdziwych dostawców. Potrzebna jest różnica popyt − podaż.'}],
        explain: `${nf(D)} − ${nf(S)} = ${nf(R.dummy.amount)}.`}});
    else steps.push({id: 'bilans', title: 'Bilans', say: 'Najpierw sprawdzam sumy.', text: 'Metoda wymaga, żeby łączna podaż była równa łącznemu popytowi. Gdyby tak nie było, dopisalibyśmy fikcyjnego dostawcę lub odbiorcę z kosztem 0.',
      formula: `podaż: ${P.supply.map(nf).join(' + ')} = ${exam ? '?' : nf(S)}<br>popyt: ${P.demand.map(nf).join(' + ')} = ${nf(D)}`,
      q: {type: 'number', prompt: 'Ile wynosi łączna podaż?', answer: S, score, tag: {t: 'tsum'}, wrong: [{v: P.supply[0], why: 'To podaż tylko pierwszego dostawcy – zsumuj wszystkich.'}], explain: `${P.supply.map(nf).join(' + ')} = ${nf(S)} = popyt, zadanie jest zbilansowane.`}});
    // kąt północno-zachodni
    const s0 = st[0];
    steps.push({id: 'nw', title: 'Plan startowy: kąt północno-zachodni', say: 'Zaczynam w lewym górnym rogu.',
      text: 'Bierzemy lewą górną wolną komórkę i przewozimy tyle, ile się da: min(podaż, popyt). Skreślamy wiersz albo kolumnę, która się wyczerpała, i idziemy dalej w prawo lub w dół. Ta metoda nie patrzy na koszty – daje szybko jakiś poprawny plan, zwykle drogi.',
      table: trTable(R, {x: s0.x, B: s0.B, blank: exam ? {x: new Set([key(s0.i, s0.j)])} : {x: new Set([key(s0.i, s0.j)])}}), hl: [{r: s0.i, c: s0.j + 1, tone: 'gold', label: 'start'}],
      q: mode === 'watch' ? undefined : {type: 'number', prompt: `Ile przewozimy na trasie ${route(R, s0.i, s0.j)}?`, answer: s0.q, score, tag: {t: 'nwq', k: 0, cell: [s0.i, s0.j + 1]},
        wrong: [{v: Math.max(R.supply[s0.i], R.demand[s0.j]), why: 'Bierzemy MNIEJSZĄ z liczb – nie można wysłać więcej, niż ma dostawca, ani więcej, niż chce odbiorca.'}].filter(w => w.v !== s0.q), explain: `min(${nf(R.supply[s0.i])}; ${nf(R.demand[s0.j])}) = ${nf(s0.q)}.`}});
    if (score && st.length > 2) {                                              // Sprawdzian: dokończ plan – pytanie o przydział w środku
      const k = Math.min(2, st.length - 2), pr = st[k - 1], cur = st[k];
      steps.push({title: 'Kąt NW: kolejny krok', text: 'Część planu już jest. Zostało tyle podaży i popytu, ile pokazują ostatni wiersz i kolumna.',
        table: trTable(R, {x: pr.x, B: pr.B, a: pr.a, b: pr.b, rowOut: pr.rowOut, colOut: pr.colOut}),
        q: {type: 'number', prompt: `Ile przewozimy w następnym kroku (${route(R, cur.i, cur.j)})?`, answer: cur.q, score, tag: {t: 'nwq', k},
          wrong: [{v: Math.max(pr.a[cur.i], pr.b[cur.j]), why: 'Bierzemy mniejszą z liczb: pozostałej podaży i pozostałego popytu.'}, {v: Math.min(R.supply[cur.i], R.demand[cur.j]), why: 'Liczy się to, co ZOSTAŁO po poprzednich krokach, a nie pierwotna podaż i popyt.'}].filter((w, q2, a) => w.v !== cur.q && a.findIndex(z => z.v === w.v) === q2),
          explain: `min(${nf(pr.a[cur.i])}; ${nf(pr.b[cur.j])}) = ${nf(cur.q)}.`}});
    }
    steps.push({id: 'plan0', title: 'Plan startowy gotowy', say: exam ? 'Policz koszt tego planu.' : 'Mamy plan – ale ile kosztuje?',
      text: exam ? 'Kąt północno-zachodni dał plan startowy. Policz jego koszt: koszt × ilość na każdej trasie.' : `Plan ma ${m + n - 1} tras = m + n − 1 (dostawcy + odbiorcy − 1) – tyle tras ma każdy dobry plan bazowy. Koszt to suma koszt × ilość na wszystkich trasach.`,
      table: trTable(R, {x: I0.x, B: I0.B}), hl: exam ? [] : I0.B.flatMap((r, i) => r.map((b, j) => b ? {r: i, c: j + 1, tone: 'blue'} : null)).filter(Boolean),
      q: {type: 'number', prompt: 'Ile kosztuje plan startowy?', answer: I0.t, score, tag: {t: 'tcost0'}, wrong: [{v: sumv(I0.x.flat()), why: 'To łączna ilość towaru. Każdą ilość trzeba pomnożyć przez koszt trasy.'}].filter(w => w.v !== I0.t),
        explain: `${costSum(R, I0.x)} = ${nf(I0.t)}.`}});
    for (let k = 0; k < R.iters.length - 1; k++) steps.push(...modiCards(R, k, mode, k === 0));
    steps.push(optCard(R, mode));
    if (mode === 'guide') steps.push(checkCard(R));
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: 'Dokładnie tak samo: plan startowy (kąt NW, minimalny element albo VAM), potem potencjały, wskaźniki i cykle, aż wszystkie d będą ≥ 0. Gdy podaż i popyt się różnią, dopisuję fikcyjnego dostawcę lub odbiorcę, trasę zakazaną traktuję jak koszt M, a przydział zerowy (ε) dodaję przy degeneracji.',
      action: {label: 'Wczytaj to zadanie do zakładki Transport', tab: 'transport', data: trData(P), sets: {'transport-init': 'nw'}}});
    if (level === 'challenge') steps.push({title: 'Co jeszcze potrafi moduł?', mood: 'surprise', say: 'Ciekawostka: to dopiero początek!',
      text: 'Raport porównuje trzy metody startowe, pokazuje rozwiązania alternatywne i zakresy kosztów, w których plan zostaje optymalny. Trasę zakazaną zaznaczysz dotknięciem komórki, a dane wkleisz prosto z Excela.'});
    steps.push(trResultCard(R));
    return {title: 'Zagadnienie transportowe – ' + LV(level), steps, result: {z: R.t, plan: R.x.map(r => r.slice())}, P, R};
  }

  /* ================= LEKCJA: METODY STARTOWE (minimalny element, VAM) ================= */
  function start(level) {
    const P = trTask(NETL_TASKS.start[level]), mode = MODE[level], exam = mode !== 'guide', score = mode === 'test';
    const init = P.init || 'vam', R = transportSolve(P, init), NW = transportSolve(P, 'nw'), LC = transportSolve(P, 'lc'), VA = transportSolve(P, 'vam');
    if (R.status !== 'optimal') throw new Error('zadanie lekcji bez optimum');
    const steps = [], m = R.m, n = R.n, st = R.initial.steps;
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Klasyk z podręcznika Taha – trzy metody naraz!' : 'Lepszy start = mniej pracy później.',
      text: level === 'challenge' ? `To przykład „${E(P.example)}” z zakładki Transport. Porównamy trzy metody startowe i zobaczymy, ile pracy zostaje metodzie potencjałów.` : 'Kąt północno-zachodni nie patrzy na koszty. Teraz zbudujemy plan startowy sprytniej – od razu tanimi trasami.',
      table: trTable(R, {}), hl: []});
    if (init === 'lc') {                                                          // Rozgrzewka: minimalny element
      const s0 = st[0], open0 = []; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) open0.push([i, j]);
      const opts = open0.slice().sort((p, q) => R.cost[p[0]][p[1]] - R.cost[q[0]][q[1]]).slice(0, 3);
      steps.push({id: 'lc', title: 'Metoda minimalnego elementu', say: 'Najpierw najtańsza trasa!', text: 'Wybieramy najtańszą wolną trasę i przewozimy nią tyle, ile się da: min(podaż, popyt). Skreślamy wyczerpany wiersz lub kolumnę i powtarzamy wśród pozostałych komórek.',
        table: trTable(R, {}), hl: [{r: s0.i, c: s0.j + 1, tone: 'gold', label: 'najtańsza'}],
        q: {type: 'choice', prompt: 'Która trasa idzie pierwsza?', tag: {t: 'lcfirst'}, options: opts.map(([i, j]) => ({t: `${route(R, i, j)} (koszt ${nf(R.cost[i][j])})`, ok: i === s0.i && j === s0.j, why: `Koszt ${nf(R.cost[i][j])} jest wyższy niż ${nf(R.cost[s0.i][s0.j])} na trasie ${route(R, s0.i, s0.j)}.`})),
          explain: `${route(R, s0.i, s0.j)}: koszt ${nf(R.cost[s0.i][s0.j])}, przewozimy min(${nf(R.supply[s0.i])}; ${nf(R.demand[s0.j])}) = ${nf(s0.q)}.`}});
      steps.push({id: 'lcplan', title: 'Plan krok po kroku', mood: 'point', say: 'Kolejne najtańsze trasy.', text: 'Powtarzamy wybór najtańszej trasy wśród nieskreślonych komórek, aż cały towar będzie rozdzielony.',
        formula: st.map((s, k) => `${k + 1}. ${route(R, s.i, s.j)} (koszt ${nf(R.cost[s.i][s.j])}): ${nf(s.q)}`).join('<br>'), table: trTable(R, {x: R.initial.x, B: R.initial.B}),
        q: {type: 'number', prompt: 'Ile kosztuje ten plan?', answer: R.initial.t, tag: {t: 'lccost'}, explain: `${costSum(R, R.initial.x)} = ${nf(R.initial.t)}.`}});
      steps.push({id: 'por', title: 'Porównanie z kątem NW', mood: 'surprise', say: 'Ciekawostka: ten sam towar, inny koszt!',
        text: `Kąt północno-zachodni daje plan za ${nf(NW.initial.t)}, a minimalny element za ${nf(LC.initial.t)}. Metoda potencjałów potrzebuje potem ${NW.iters.length - 1} ${NW.iters.length - 1 === 1 ? 'iteracji' : 'iteracji'} od kąta NW i ${LC.iters.length - 1} od minimalnego elementu.`,
        q: {type: 'choice', prompt: 'Który start lepiej wybrać?', tag: {t: 'cmpbest', among: ['nw', 'lc']}, options: [{t: 'minimalny element', ok: LC.initial.t <= NW.initial.t}, {t: 'kąt północno-zachodni', ok: LC.initial.t > NW.initial.t, why: `Kąt NW jest prostszy, ale tu jego plan kosztuje ${nf(NW.initial.t)} – więcej niż ${nf(LC.initial.t)}.`}],
          explain: 'Tańszy start zwykle oznacza mniej iteracji metody potencjałów.'}});
      steps.push({id: 'vamz', title: 'Zapowiedź: VAM', say: 'Jeszcze sprytniej? Jest sposób!', text: 'Minimalny element bywa krótkowzroczny: bierze tanią trasę, a potem zostają same drogie. Metoda VAM (Vogla) patrzy, gdzie stracimy najwięcej, jeśli nie wybierzemy najtańszej trasy – o tym w Sprawdzianie.'});
    } else {
      // VAM: pierwsze dwa kroki z karami
      const vs = st.filter(s => s.rowPen), v0 = vs[0];
      if (level === 'challenge') {
        steps.push({id: 'nw3', title: 'Start 1: kąt północno-zachodni', mood: 'point', say: 'Najprostszy start – policz jego koszt.', text: 'Plan z kąta NW jest gotowy. Ta metoda nie patrzy na koszty.',
          table: trTable(R, {x: NW.initial.x, B: NW.initial.B}),
          q: {type: 'number', prompt: 'Ile kosztuje plan z kąta NW?', answer: NW.initial.t, tag: {t: 'nwcost'}, wrong: [{v: sumv(NW.initial.x.flat()), why: 'To łączna ilość towaru – pomnóż każdą ilość przez koszt trasy.'}], explain: `${costSum(R, NW.initial.x)} = ${nf(NW.initial.t)}.`}});
        steps.push({title: 'Start 2: minimalny element', say: 'Najtańsze trasy najpierw.', text: `Minimalny element daje plan za ${nf(LC.initial.t)} – taniej niż kąt NW, bo od razu korzysta z tanich tras.`, table: trTable(R, {x: LC.initial.x, B: LC.initial.B})});
      }
      steps.push({id: 'kara', title: 'VAM: kara za zły wybór', mood: 'think', say: exam ? 'Policz karę.' : 'Kara = ile stracę, jeśli nie wezmę najtańszej trasy.',
        text: 'W każdym wierszu i kolumnie liczymy karę: różnicę między dwoma najniższymi kosztami. Duża kara znaczy: jeśli tu nie użyjemy najtańszej trasy, zapłacimy dużo więcej. Dlatego zaczynamy od linii z największą karą.',
        table: trTable(R, {pen: {row: v0.rowPen, col: v0.colPen}, blank: {pr: new Set(Array.from({length: m}, (_, i) => i)), pc: new Set(Array.from({length: n}, (_, j) => j))}}),
        q: (() => { const i = v0.rowPen.findIndex(p => p !== null), costs = R.cost[i].slice().sort((a, b) => a - b);
          return {type: 'number', prompt: `Ile wynosi kara wiersza ${E(R.sNames[i])}?`, answer: v0.rowPen[i], score, tag: {t: 'pen', row: i, cell: [i, n + 2]},
            wrong: [{v: costs[costs.length - 1] - costs[0], why: 'To różnica najwyższego i najniższego kosztu. Kara to różnica DWÓCH NAJNIŻSZYCH kosztów.'}, {v: costs[0], why: 'To najniższy koszt. Kara to różnica między dwoma najniższymi.'}].filter((w, q2, a) => Math.abs(w.v - v0.rowPen[i]) > 1e-9 && a.findIndex(z => z.v === w.v) === q2),
            explain: `Dwa najniższe koszty w wierszu: ${nf(costs[0])} i ${nf(costs[1])} → kara ${nf(costs[1])} − ${nf(costs[0])} = ${nf(v0.rowPen[i])}.`}; })()});
      vs.slice(0, 2).forEach((v, k) => {
        const lt = v.line.type === 'row' ? `wiersz ${E(R.sNames[v.line.k])}` : `kolumna ${E(R.dNames[v.line.k])}`, pr = k ? vs[k - 1] : null;
        const lines = [...v.rowPen.map((p, i) => p === null ? null : {type: 'row', k: i, p}), ...v.colPen.map((p, j) => p === null ? null : {type: 'col', k: j, p})].filter(Boolean).sort((a, b) => b.p - a.p).slice(0, 4);
        if (!lines.some(L => L.type === v.line.type && L.k === v.line.k)) lines[3] = {type: v.line.type, k: v.line.k, p: v.line.type === 'row' ? v.rowPen[v.line.k] : v.colPen[v.line.k]};
        const prevState = pr ? {x: pr.x, B: pr.B, a: pr.a, b: pr.b, rowOut: pr.rowOut, colOut: pr.colOut} : {};
        steps.push({id: `vl${k}`, title: k ? 'VAM: kary od nowa' : 'VAM: która linia?', say: k ? 'Po skreśleniu kary się zmieniają!' : 'Szukam największej kary.',
          text: k ? 'Po skreśleniu linii liczymy kary od nowa – tylko z nieskreślonych komórek.' : 'Kary wszystkich wierszy i kolumn są policzone.',
          table: trTable(R, {...prevState, pen: {row: v.rowPen, col: v.colPen}}), hl: [],
          q: {type: 'choice', prompt: 'W której linii jest największa kara?', score, tag: {t: 'penline', k},
            options: lines.map(L => ({t: `${L.type === 'row' ? 'wiersz ' + E(R.sNames[L.k]) : 'kolumna ' + E(R.dNames[L.k])} (kara ${nf(L.p)})`, ok: L.type === v.line.type && L.k === v.line.k, why: `Kara ${nf(L.p)} jest mniejsza niż ${nf(v.line.type === 'row' ? v.rowPen[v.line.k] : v.colPen[v.line.k])}.`})),
            explain: `Największa kara: ${lt}.`}});
        steps.push({id: `vq${k}`, title: `VAM: przydział w linii (${k + 1})`, mood: 'point', say: 'W tej linii biorę najtańszą trasę.', text: `W wybranej linii (${lt}) bierzemy najtańszą trasę i przewozimy nią tyle, ile się da.`,
          table: trTable(R, {...prevState, a: pr ? pr.a : R.supply, b: pr ? pr.b : R.demand}), hl: [v.line.type === 'row' ? {r: v.line.k, tone: 'blue'} : {c: v.line.k + 1, tone: 'blue'}],
          q: {type: 'number', prompt: 'Ile przewozimy w tym kroku?', answer: v.q, score, tag: {t: 'vamq', k},
            wrong: [{v: Math.max((pr ? pr.a : R.supply)[v.i], (pr ? pr.b : R.demand)[v.j]), why: 'Bierzemy mniejszą z liczb: pozostałej podaży i pozostałego popytu.'}].filter(w => w.v !== v.q),
            explain: `Najtańsza trasa w linii: ${route(R, v.i, v.j)} (koszt ${nf(R.cost[v.i][v.j])}) → min(${nf((pr ? pr.a : R.supply)[v.i])}; ${nf((pr ? pr.b : R.demand)[v.j])}) = ${nf(v.q)}.`}});
      });
      const z0 = st.find(s => s.q === 0), degTxt = z0 ? ` Przydział 0 na trasie ${route(R, z0.i, z0.j)} to degeneracja: trasa zostaje w planie, żeby plan miał m + n − 1 tras.` : '';
      steps.push({id: 'vplan', title: 'Plan VAM gotowy', say: exam ? 'Policz koszt planu.' : 'Reszta idzie jak z płatka.', text: (exam ? 'Gdy zostaje jedna linia, rozdzielamy w niej resztę towaru. Policz koszt planu.' : 'Gdy zostaje jedna nieskreślona linia, rozdzielamy w niej resztę towaru. Oto cały plan.') + degTxt,
        formula: st.map((s, k) => `${k + 1}. ${route(R, s.i, s.j)}: ${nf(s.q)}`).join('<br>'), table: trTable(R, {x: R.initial.x, B: R.initial.B}),
        q: {type: 'number', prompt: 'Ile kosztuje plan VAM?', answer: R.initial.t, score, tag: {t: 'vamcost'}, wrong: [{v: NW.initial.t, why: 'To koszt planu z kąta NW.'}].filter(w => w.v !== R.initial.t), explain: `${costSum(R, R.initial.x)} = ${nf(R.initial.t)}.`}});
      const best = [['kąt NW', NW.initial.t], ['minimalny element', LC.initial.t], ['VAM', VA.initial.t]], mn = Math.min(...best.map(b => b[1])), winners = best.filter(b => b[1] === mn).map(b => b[0]);
      const ans = winners.length > 1 ? 'remis: ' + winners.join(' i ') : winners[0];
      steps.push({id: 'cmp', title: 'Porównanie startów', mood: 'surprise', say: 'Ciekawostka: dobry start oszczędza pracę!', text: score ? 'Porównaj koszt planu VAM, który właśnie policzyłeś, z kosztami dwóch pozostałych startów.' : `Kąt NW: ${nf(NW.initial.t)}, minimalny element: ${nf(LC.initial.t)}, VAM: ${nf(VA.initial.t)}. Optimum to ${nf(R.t)}.`,
        formula: `kąt NW: ${nf(NW.initial.t)} (iteracji potem: ${NW.iters.length - 1})<br>minimalny element: ${nf(LC.initial.t)} (iteracji: ${LC.iters.length - 1})<br>VAM: ${score ? '? (Twój wynik)' : `${nf(VA.initial.t)} (iteracji: ${VA.iters.length - 1})`}`,
        q: level === 'challenge' ? {type: 'number', prompt: `O ile metoda potencjałów obniża koszt najlepszego startu (${nf(mn)})?`, answer: mn - R.t, tag: {t: 'saving'}, wrong: [{v: R.t, why: 'To samo optimum. Pytam o różnicę: najlepszy start − optimum.'}, {v: NW.initial.t - R.t, why: 'To różnica dla kąta NW. Pytam o najlepszy start.'}].filter(w => w.v !== mn - R.t),
            explain: `${nf(mn)} − ${nf(R.t)} = ${nf(mn - R.t)}.` + (/Taha/.test(P.example || '') ? ' Te same liczby podaje podręcznik Taha.' : '')}
          : {type: 'choice', prompt: 'Która metoda dała najtańszy start?', score, tag: {t: 'cmpbest', ans},
            options: [...best.map(([nm, t]) => ({t: nm, ok: winners.length === 1 && nm === ans, why: winners.length > 1 && winners.includes(nm) ? 'Ten sam koszt ma też inna metoda – to remis.' : `Plan „${nm}” kosztuje ${nf(t)}, a najtańszy ${nf(mn)}.`})), ...(winners.length > 1 ? [{t: ans, ok: true}] : [])],
            explain: `${ans}: ${nf(mn)}.`}});
    }
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: 'W opcjach zaawansowanych zakładki Transport wybierasz metodę startową, a raport porównuje wszystkie trzy. Przy remisie w minimalnym elemencie biorę trasę z większym możliwym przewozem, a w VAM – linię z tańszą trasą.',
      action: {label: 'Wczytaj to zadanie do zakładki Transport', tab: 'transport', data: trData(P), sets: {'transport-init': init}}});
    steps.push({...trResultCard(R), text: R.iters.length > 1 ? `Metoda potencjałów poprawia plan startowy do optimum za ${nf(R.t)}. Ten sam wynik pokazuje raport w zakładce Transport.` : 'Ten plan startowy jest od razu optymalny – metoda potencjałów to potwierdza. Ten sam wynik pokazuje raport w zakładce Transport.'});
    return {title: 'Metody startowe – ' + LV(level), steps, result: {z: R.t, plan: R.x.map(r => r.slice())}, P, R, NW, LC, VA};
  }

  /* ================= LEKCJA: PRZYDZIAŁ – METODA WĘGIERSKA ================= */
  // macierz: o = {A, mins: {row|col: []}, cover: {cr, cc}, zero: bool, star: assign, blank: Set('i,j'), blankRow: Set, blankCol: Set}
  function asTable(R, A, o = {}) {
    const n = R.n, bl = o.blank || new Set(), big = v => Math.abs(v) >= R.BIG / 2;
    const head = [[{v: 'Kto \\ Co', c: 0}, ...R.cNames.map((nm, j) => ({v: E(nm), c: j + 1})), ...(o.rowMin ? [{v: 'min', c: n + 1}] : [])]];
    const rows = A.map((r, i) => [{v: E(R.rNames[i]), th: true}, ...r.map((v, j) => ({v: bl.has(key(i, j)) ? '<b>?</b>' : big(v) ? 'M' : nf(v),
      cls: (o.star && o.star[i] === j ? 'pivot' : o.zero && Math.abs(v) < 1e-9 && !bl.has(key(i, j)) ? 'zero' : '') + (o.cover && (o.cover.cr[i] || o.cover.cc[j]) ? ' cov' : '')})),
      ...(o.rowMin ? [{v: o.blankRow && o.blankRow.has(i) ? '<b>?</b>' : nf(o.rowMin[i]), cls: 'pcol'}] : [])]);
    if (o.colMin) rows.push([{v: 'min', th: true}, ...o.colMin.map((v, j) => ({v: o.blankCol && o.blankCol.has(j) ? '<b>?</b>' : nf(v), cls: 'pcol'})), ...(o.rowMin ? [''] : [])]);
    return {head, rows, cls: 'las'};
  }
  const perms = n => { const out = [], p = [], used = Array(n).fill(false); const go = () => { if (p.length === n) { out.push(p.slice()); return; } for (let j = 0; j < n; j++) if (!used[j]) { used[j] = true; p.push(j); go(); p.pop(); used[j] = false; } }; go(); return out; };
  function assign(level) {
    const P = asTask(NETL_TASKS.assign[level]), mode = MODE[level], exam = mode !== 'guide', score = mode === 'test';
    const R = assignmentSolve(P); if (R.status !== 'optimal') throw new Error('zadanie lekcji bez optimum');
    const n = R.n, S = R.steps, steps = [], st = k => S.filter(s => s.kind === k), W = R.maxi ? 'zysk' : 'koszt';
    const asg = (a) => a.map((j, i) => `${E(R.rNames[i])} → ${E(R.cNames[j])}`).join(', ');
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Tym razem maksymalizujemy zysk!' : 'Każdy dostaje dokładnie jedno zadanie.',
      text: level === 'challenge' ? `To przykład „${E(P.example)}” z zakładki Przydział: każdy sprzedawca dostaje jeden rejon, a w komórkach jest zysk. Szukamy przydziału o największym łącznym zysku.` : `Każdy wykonawca dostaje dokładnie jedno zadanie, a każde zadanie – jednego wykonawcę. W komórkach jest ${W}, a my szukamy przydziału o najmniejszej sumie.`,
      table: asTable(R, R.cost)});
    // zachłanny wybór najtańszych w wierszach – konflikt?
    if (!R.maxi) {
      const g = R.cost.map(r => r.indexOf(Math.min(...r))), clash = g.findIndex((j, i) => g.indexOf(j) !== i);
      steps.push({id: 'ile', title: 'Dlaczego nie „każdemu najtańsze”?', mood: 'think', say: 'Hmm, dwie osoby chcą tego samego zadania…',
        text: clash >= 0 ? `Najtańsze zadanie ${E(R.rNames[g.indexOf(g[clash])])} i ${E(R.rNames[clash])} to to samo: ${E(R.cNames[g[clash]])} – a dostać je może tylko jeden. Sprawdzanie wszystkich możliwości szybko się nie opłaca: dla ${n} osób jest ich n! = ${exam ? '?' : perms(n).length}, a dla 10 osób już ponad 3,6 miliona.`
          : `Gdy każdy wybiera swoje najtańsze zadanie, łatwo o konflikt. Sprawdzanie wszystkich możliwości szybko się nie opłaca: dla ${n} osób jest ich n! = ${exam ? '?' : perms(n).length}, a dla 10 osób już ponad 3,6 miliona.`,
        table: asTable(R, R.cost), hl: clash >= 0 ? [{r: g.indexOf(g[clash]), c: g[clash] + 1, tone: 'red'}, {r: clash, c: g[clash] + 1, tone: 'red', label: 'konflikt'}] : [],
        q: mode === 'watch' ? undefined : {type: 'number', prompt: `Ile jest wszystkich przydziałów dla ${n} osób (n!)?`, answer: perms(n).length, score, tag: {t: 'nfact'}, wrong: [{v: n * n, why: `n·n to liczba komórek. Przydziałów jest n! = ${Array.from({length: n}, (_, k) => n - k).join('·')}.`}], explain: `${n}! = ${Array.from({length: n}, (_, k) => n - k).join('·')} = ${perms(n).length}.`}});
    } else {
      const st0 = S[0], mx = Math.max(...R.cost.flat().filter(v => v !== null)), qi = 1, qj = 2;
      steps.push({id: 'strata', title: 'Zysk → strata', mood: 'think', say: exam ? 'Zamień zysk na stratę.' : 'Maksimum zysku = minimum straty!',
        text: `Metoda węgierska szuka minimum, więc zamieniamy zyski na straty: strata = największy zysk w tabeli (${nf(mx)}) − zysk. Najmniejsza łączna strata to największy łączny zysk.`,
        table: asTable(R, st0.A, {blank: new Set([key(qi, qj)])}),
        q: {type: 'number', prompt: `Ile wynosi strata dla ${E(R.rNames[qi])} → ${E(R.cNames[qj])} (zysk ${nf(R.cost[qi][qj])})?`, answer: st0.A[qi][qj], score, tag: {t: 'loss', i: qi, j: qj, cell: [qi, qj + 1]},
          wrong: [{v: R.cost[qi][qj] - mx, why: 'Odwrotnie: strata = największy zysk − zysk (liczba nieujemna).'}, {v: R.cost[qi][qj], why: 'To zysk. Strata to różnica do największego zysku.'}], explain: `${nf(mx)} − ${nf(R.cost[qi][qj])} = ${nf(st0.A[qi][qj])}.`}});
    }
    const rs = st('rows')[0], cs = st('cols')[0], A0 = S[0].A;
    const ri = rs.rowMin.findIndex((v, i) => v > 0 && i > 0) >= 0 ? rs.rowMin.findIndex((v, i) => v > 0 && i > 0) : 0;
    steps.push({id: 'rows', title: 'Redukcja wierszy', mood: 'point', say: exam ? 'Policz minimum wiersza.' : 'Od każdego wiersza odejmuję jego minimum.',
      text: 'Od każdego wiersza odejmujemy jego najmniejszy element. To uczciwe: każdy przydział bierze z każdego wiersza dokładnie jedną komórkę, więc koszt KAŻDEGO przydziału maleje o tyle samo – najlepszy przydział zostaje najlepszy. W każdym wierszu pojawia się zero.',
      table: asTable(R, A0, {rowMin: rs.rowMin, blankRow: exam ? new Set(Array.from({length: n}, (_, i) => i)) : new Set([ri])}), hl: exam ? [] : [{r: ri, tone: 'blue'}],
      q: {type: 'number', prompt: `Ile odejmujemy od wiersza ${E(R.rNames[ri])}?`, answer: rs.rowMin[ri], score, tag: {t: 'rowmin', i: ri, cell: [ri, n + 1]},
        wrong: [{v: Math.max(...A0[ri]), why: 'Odejmujemy NAJMNIEJSZY element wiersza – inaczej powstałyby liczby ujemne.'}].filter(w => w.v !== rs.rowMin[ri]), explain: `min(${A0[ri].map(nf).join('; ')}) = ${nf(rs.rowMin[ri])}.`}});
    const Ar = rs.A, cj = cs.colMin.findIndex(v => v > 0) >= 0 ? cs.colMin.findIndex(v => v > 0) : 0;
    steps.push({id: 'cols', title: 'Redukcja kolumn', say: exam ? 'Teraz kolumny.' : 'To samo z kolumnami.',
      text: 'Teraz od każdej kolumny odejmujemy jej najmniejszy element – z tego samego powodu. Po obu redukcjach zero jest w każdym wierszu i w każdej kolumnie, a żadna liczba nie jest ujemna.',
      table: asTable(R, Ar, {colMin: cs.colMin, blankCol: exam ? new Set(Array.from({length: n}, (_, j) => j)) : new Set([cj])}), hl: exam ? [] : [{c: cj + 1, tone: 'blue'}],
      q: {type: 'number', prompt: `Ile odejmujemy od kolumny ${E(R.cNames[cj])}?`, answer: cs.colMin[cj], score, tag: {t: 'colmin', j: cj, cell: [n, cj + 1]},
        wrong: [{v: Math.min(...A0.map(r => r[cj])), why: 'Kolumnę redukujemy w macierzy PO redukcji wierszy, a nie w pierwotnej.'}].filter(w => w.v !== cs.colMin[cj]), explain: `W macierzy po redukcji wierszy minimum kolumny ${E(R.cNames[cj])} to ${nf(cs.colMin[cj])}.`}});
    steps.push({id: 'zera', title: 'Zera to „darmowe” przydziały', mood: 'surprise', say: 'Ciekawostka: zero to najlepsze, co może być!',
      text: `Wszystkie liczby są teraz ≥ 0. Jeśli znajdziemy ${n} zer, po jednym w każdym wierszu i kolumnie (zera niezależne), dają one sumę 0 – mniej się nie da, więc to przydział optymalny.`,
      table: asTable(R, cs.A, {zero: true})});
    const covers = st('cover'), adjs = st('adjust');
    covers.forEach((cv, k) => {
      const lineRings = [...cv.cr.map((f, i) => f ? {r: i, tone: 'blue'} : null), ...cv.cc.map((f, j) => f ? {c: j + 1, tone: 'blue'} : null)].filter(Boolean);
      const showLines = !exam;
      steps.push({id: `cov${k}`, title: k ? `Pokrycie po korekcie ${k}` : 'Pokrycie zer liniami', mood: showLines ? 'point' : 'think', say: showLines ? 'Kreślę jak najmniej linii przez wszystkie zera.' : 'Ile linii wystarczy?',
        text: k === 0 && !exam ? `Przekreślamy wszystkie zera jak najmniejszą liczbą linii (wierszy i kolumn). Ta najmniejsza liczba linii to dokładnie tyle, ile da się wybrać zer niezależnych (twierdzenie Königa). Potrzeba ${n} linii, żeby wybrać przydział.`
          : `Przekreśl wszystkie zera jak najmniejszą liczbą linii (wierszy i kolumn). Jeśli wystarczy mniej niż ${n}, trzeba poprawić macierz.`,
        table: asTable(R, cv.A, {zero: true, cover: showLines ? cv : null}), hl: showLines ? lineRings : [],
        q: k > 0 && mode === 'guide' ? undefined : {type: 'number', prompt: 'Ile linii wystarczy, by pokryć wszystkie zera?', answer: cv.lines, score, tag: {t: 'lines', k},
          wrong: [{v: n, why: `Spróbuj mniejszą liczbą: wystarczy ${cv.lines} linii. ${n} to liczba wierszy.`}, {v: cv.A.flat().filter(v => Math.abs(v) < 1e-9).length, why: 'To liczba zer. Jedna linia może pokryć kilka zer naraz.'}].filter((w, q2, a) => w.v !== cv.lines && a.findIndex(z => z.v === w.v) === q2),
          explain: `Wystarczą ${cv.lines} linie: ${[...cv.cr.map((f, i) => f ? 'wiersz ' + E(R.rNames[i]) : null), ...cv.cc.map((f, j) => f ? 'kolumna ' + E(R.cNames[j]) : null)].filter(Boolean).join(', ')}. ${cv.lines === n ? 'To tyle, ile wierszy – można wybierać przydział.' : `To mniej niż ${n} – potrzebna korekta.`}`}});
      const ad = adjs[k];
      if (!ad) return;
      const both = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (cv.cr[i] && cv.cc[j]) both.push([i, j]);
      const unc = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!cv.cr[i] && !cv.cc[j]) unc.push(cv.A[i][j]);
      steps.push({id: `k${k}`, title: 'Korekta macierzy', mood: 'point', say: exam ? 'Znajdź najmniejszą liczbę bez linii.' : 'Robię nowe zero w miejscu bez linii.',
        text: exam ? 'Linie są zaznaczone. Znajdź najmniejszy element, przez który nie przechodzi żadna linia (k).' : 'Bierzemy najmniejszy element bez linii (k). Odejmujemy k od wszystkich elementów bez linii, dodajemy k na skrzyżowaniach dwóch linii, resztę zostawiamy. To tak, jakby odjąć k od wierszy bez linii i dodać k do kolumn z linią – uczciwe jak redukcja, a powstaje nowe zero.',
        table: asTable(R, cv.A, {zero: true, cover: cv}), hl: lineRings,
        q: {type: 'number', prompt: 'Ile wynosi k (najmniejszy element bez linii)?', answer: ad.k, score, tag: {t: 'kadj', k},
          wrong: [{v: Math.min(...cv.A.flat().filter(v => v > 1e-9)), why: 'Szukamy najmniejszego elementu, przez który NIE przechodzi żadna linia.'}].filter(w => Math.abs(w.v - ad.k) > 1e-9), explain: `Elementy bez linii: ${unc.map(nf).join(', ')} → k = ${nf(ad.k)}.`}});
      if (both.length && (k === 0 || mode !== 'watch')) {
        const [bi, bj] = both[0];
        steps.push({id: `kk${k}`, title: 'Po korekcie', say: 'Skrzyżowania rosną o k.', text: exam ? 'Zastosuj korektę z k.' : `Elementy bez linii zmalały o ${nf(ad.k)}, skrzyżowania urosły o ${nf(ad.k)}. Mamy nowe zero.`,
          table: asTable(R, ad.A, {zero: true, blank: new Set([key(bi, bj)])}), hl: [{r: bi, c: bj + 1, tone: 'gold', label: 'skrzyżowanie'}],
          q: {type: 'number', prompt: `Ile wynosi teraz element ${E(R.rNames[bi])} → ${E(R.cNames[bj])} (był ${nf(cv.A[bi][bj])})?`, answer: ad.A[bi][bj], score, tag: {t: 'acell', k, i: bi, j: bj, cell: [bi, bj + 1]},
            wrong: [{v: cv.A[bi][bj] - ad.k, why: 'Na skrzyżowaniu dwóch linii DODAJEMY k, a odejmujemy tylko tam, gdzie nie ma żadnej linii.'}, {v: cv.A[bi][bj], why: 'Bez zmian zostają elementy z jedną linią. Na skrzyżowaniu dwóch linii dodajemy k.'}], explain: `${nf(cv.A[bi][bj])} + ${nf(ad.k)} = ${nf(ad.A[bi][bj])}.`}});
      }
    });
    const fin = S[S.length - 1], A = fin.A, a = R.assign;
    const zc = A.map(r => r.filter(v => Math.abs(v) < 1e-9).length), pi = zc.findIndex(c => c === 1) >= 0 ? zc.findIndex(c => c === 1) : 0;
    steps.push({id: 'pick', title: 'Wybór zer niezależnych', mood: exam ? 'think' : 'point', say: exam ? 'Wybierz zera.' : 'Zaczynam od wiersza z jednym zerem.',
      text: exam ? `Teraz da się wybrać ${n} zer niezależnych: po jednym w każdym wierszu i kolumnie.` : 'Zaczynamy od wiersza (albo kolumny), w którym jest tylko jedno zero – tam nie ma wyboru. Skreślamy jego kolumnę i powtarzamy.',
      table: asTable(R, A, {zero: true}), hl: exam ? [] : [{r: pi, tone: 'gold', label: 'jedno zero'}],
      q: {type: 'choice', prompt: `Które zadanie dostaje ${E(R.rNames[pi])}?`, score, tag: {t: 'pick', i: pi},
        options: R.cNames.map((nm, j) => ({t: E(nm), ok: j === a[pi], why: Math.abs(A[pi][j]) > 1e-9 ? `W tej komórce jest ${nf(A[pi][j])}, a wybieramy tylko zera.` : 'To też zero, ale jego kolumna jest potrzebna innemu wierszowi, który ma tylko to jedno zero – przydziały nie mogą się powtarzać.'})).slice(0, 4),
        explain: `${E(R.rNames[pi])} → ${E(R.cNames[a[pi]])}.`}});
    const tot = R.total, orig = a.map((j, i) => R.cost[i][j]);
    steps.push({id: 'suma', title: R.maxi ? 'Łączny zysk' : 'Łączny koszt', say: exam ? 'Policz wynik.' : 'Liczę z PIERWOTNEJ tabeli!',
      text: `Przydział: ${asg(a)}. ${exam ? 'Policz ' + (R.maxi ? 'łączny zysk' : 'łączny koszt') + ' z pierwotnej tabeli.' : 'Sumę liczymy z pierwotnej tabeli, a nie z macierzy po redukcjach (tam byłyby same zera).'}`,
      table: asTable(R, R.cost, {star: exam ? null : a}), hl: exam ? [] : a.map((j, i) => ({r: i, c: j + 1, tone: 'gold'})),
      q: {type: 'number', prompt: `Ile wynosi łączny ${W}?`, answer: tot, score, tag: {t: 'atotal'},
        wrong: [{v: 0, why: 'Zero to suma w macierzy po redukcjach. Weź liczby z pierwotnej tabeli.'}, ...(R.maxi ? [{v: a.reduce((s, j, i) => s + S[0].A[i][j], 0), why: 'To suma strat. Pytam o zysk – weź liczby z pierwotnej tabeli zysków.'}] : [])].filter(w => Math.abs(w.v - tot) > 1e-9),
        explain: `${orig.map(nf).join(' + ')} = ${nf(tot)}.`}});
    if (n <= 3 && !R.maxi) steps.push({id: 'wszystkie', title: 'Sprawdź się sam', mood: 'surprise', say: 'Ciekawostka: przy 3 osobach sprawdzisz wszystko!', text: `Dla ${n} osób jest tylko ${perms(n).length} przydziałów – można je wypisać. Najmniejsza suma to właśnie wynik metody węgierskiej.`,
      table: {head: [[{v: 'Przydział', c: 0}, {v: 'Suma', c: 1}]], rows: perms(n).map(p => { const s = p.reduce((t, j, i) => t + R.cost[i][j], 0);
        return [{v: p.map((j, i) => `${E(R.rNames[i])} → ${E(R.cNames[j])}`).join('<br>'), cls: 'tl'}, {v: `${p.map((j, i) => nf(R.cost[i][j])).join(' + ')} = ${s === tot ? `<b>${nf(s)}</b> ✓` : nf(s)}`, cls: s === tot ? 'pivot' : ''}]; }), cls: 'lperm'}});
    if (R.alt) steps.push({title: 'Rozwiązanie alternatywne', mood: 'surprise', say: 'Ciekawostka: są dwa najlepsze przydziały!', text: `Zera w końcowej macierzy pozwalają wybrać też inny przydział: ${asg(R.alt.assign)} – z tym samym wynikiem ${nf(R.alt.total)}. OptiLab pokazuje to w raporcie.`});
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: 'Dokładnie tak: redukcje, pokrycie zer najmniejszą liczbą linii, korekty i wybór zer. Macierz prostokątną uzupełniam fikcyjnymi wierszami lub kolumnami z zerami, zakazany przydział to M, a przy maksymalizacji zamieniam zyski na straty.',
      action: {label: 'Wczytaj to zadanie do zakładki Przydział', tab: 'assign', data: asData(P)}});
    steps.push({title: 'Wynik', mood: 'happy', say: 'Gotowe! Tak samo liczy OptiLab.', text: 'To przydział optymalny. Ten sam wynik pokazuje raport w zakładce Przydział.',
      result: {x: [], z: tot, assign: a.slice(), html: `${asg(a)}; ${W} = <b>${nf(tot)}</b>`}});
    return {title: 'Metoda węgierska – ' + LV(level), steps, result: {z: tot, assign: a.slice()}, P, R};
  }
  return {transport, start, assign, trTable, asTable, trTask, asTask, perms};
})();
(() => {
  LESSON.register({id: 'tr-modi', title: 'Zagadnienie transportowe', group: 'Transport', note: 'bilans, kąt NW, potencjały, cykl', tabs: ['transport'], build: NETL.transport});
  LESSON.register({id: 'tr-start', title: 'Metody startowe: minimalny element i VAM', group: 'Transport', ext: true, note: 'tańszy plan startowy, kary Vogla', tabs: ['transport'], build: NETL.start});
  LESSON.register({id: 'as-hung', title: 'Metoda węgierska', group: 'Przydział', note: 'redukcje, zera, linie, korekta', tabs: ['assign'], build: NETL.assign});
})();
