/* ===== OptiLab – lekcje „Nauka” dla programowania liniowego (czyste funkcje, bez DOM – testowane w Node) =====
   Każda lekcja to lista kart (format: komentarz na górze js/lesson.js) budowana z wyniku solvera dla zadania lekcyjnego:
   metoda graficzna – wierzchołki z przecięć prostych (lpVertices) + kontrola simpleksem (solveM),
   simpleks – tablice c_j − z_j z tabSolve (js/lp-tab.js, ta sama metoda co „alternatywna metoda tabelaryczna” w zakładce Simpleks),
   metoda dwufazowa – tablice fazy I i II z gomSolve (js/lp-gomory.js, dokładne ułamki), duże M – tabSolve z symbolicznym M.
   Zadania lekcyjne (LPL_TASKS) to tylko DANE WEJŚCIOWE; wszystkie liczby na kartach, tabele i poprawne odpowiedzi liczą solvery.
   Pytania mają q.tag – opis, skąd pochodzi poprawna odpowiedź (testy porównują go z solverem). */
const LPL_TASKS = {
  graph: {
    warm: {maxi: true, c: [2, 3], A: [[1, 0], [0, 1], [1, 1]], rel: ['<=', '<=', '<='], b: [4, 3, 5]},
    test: {maxi: true, c: [3, 2], A: [[2, 1], [1, 1], [1, 0]], rel: ['<=', '<=', '<='], b: [10, 7, 4]},
    challenge: 'Minimalizacja kosztów (znaki ≥)'                      // przykład wbudowany w moduł (js/examples.js)
  },
  simplex: {
    warm: {maxi: true, c: [2, 1], A: [[1, 1], [1, 0]], rel: ['<=', '<='], b: [4, 3]},
    test: {maxi: true, c: [3, 5], A: [[1, 0], [0, 2], [3, 2]], rel: ['<=', '<=', '<='], b: [4, 12, 18]},   // Hillier i Lieberman (Wyndor)
    challenge: '3 zmienne (Simpleks)'
  },
  twophase: {
    warm: {maxi: false, c: [3, 2], A: [[1, 1], [0, 1]], rel: ['>=', '<='], b: [4, 3]},
    test: {maxi: true, c: [4, 3], A: [[1, 1], [2, 1], [0, 1]], rel: ['>=', '<=', '<='], b: [3, 8, 4]},
    challenge: 'Mieszanka paszowa (min, 3 zmienne, 3 ograniczenia)'
  },
  bigm: {
    warm: {maxi: false, c: [3, 2], A: [[1, 1], [0, 1]], rel: ['>=', '<='], b: [4, 3]},
    test: 'Minimalizacja kosztów (znaki ≥)',
    challenge: 'Mieszanka paszowa (min, 3 zmienne, 3 ograniczenia)'
  }
};
const LPL = (() => {
  const MI = '−', EPS = 1e-9;
  /* ---------- liczby i zapis ---------- */
  const nf = v => {                                     // liczba → „3”, „−5/2”, „0,1234” (ułamki o mianowniku ≤ 64 dokładnie)
    if (!isFinite(v)) return v > 0 ? '∞' : MI + '∞';
    if (Math.abs(v) < EPS) return '0';
    const s = v < 0 ? MI : '', a = Math.abs(v);
    if (Math.abs(a - Math.round(a)) < EPS * Math.max(1, a)) return s + Math.round(a);
    for (let d = 2; d <= 64; d++) { const n = Math.round(a * d); if (Math.abs(a - n / d) < EPS * Math.max(1, a)) return s + n + '/' + d; }
    return s + fmt(a);
  };
  const sf = v => {                                     // liczba z symbolicznym M: „−M + 3”, „2M − 30”, „−1/2·M + 1/2”
    if (typeof v === 'number') return nf(v);
    const a = Math.abs(v.a) < EPS ? 0 : v.a, m = Math.abs(v.m) < EPS ? 0 : v.m;
    if (!m) return nf(a);
    const mi = Math.abs(Math.abs(m) - Math.round(Math.abs(m))) < EPS, mt = (m === 1 ? '' : m === -1 ? MI : mi ? nf(m) : nf(m) + '·') + 'M';
    return a ? `${mt} ${a > 0 ? '+' : MI} ${nf(Math.abs(a))}` : mt;
  };
  const vn = s => String(s).replace(/^([a-z])(\d+)$/, (_, l, d) => `${l}<sub>${d}</sub>`);
  const sym = x => typeof x === 'number' ? {a: x, m: 0} : x;
  const better = (v, maxi) => maxi ? sSign(sym(v)) > 0 : sSign(sym(v)) < 0;
  const term = (a, j, first) => (a < 0 ? MI : first ? '' : '+') + (first ? '' : ' ') + (Math.abs(a) === 1 ? '' : nf(Math.abs(a))) + 'x' + sub(j + 1);
  const lin = a => a.map((v, j) => ({v, j})).filter(o => o.v).map((o, k) => term(o.v, o.j, k === 0)).join(' ') || '0';
  const rs = r => r === '<=' ? '≤' : r === '>=' ? '≥' : '=';
  const taskHTML = M => `<b>${M.maxi ? 'max' : 'min'}</b> Z = ${lin(M.c)}<br>` + M.A.map((a, i) => `<span data-hl="ogr${i + 1}">${lin(a)} ${rs(M.rel[i])} ${nf(M.b[i])}</span>`).join('<br>') + '<br>' + M.c.map((_, j) => 'x' + sub(j + 1)).join(', ') + ' ≥ 0';
  const model = t => {                                  // zadanie lekcji → model solvera; nazwa = przykład z js/examples.js
    if (typeof t === 'string') { const ex = EXAMPLES.find(e => e.name === t); if (!ex) throw new Error('brak przykładu ' + t);
      return {n: ex.c.length, maxi: ex.maxi, c: ex.c.slice(), A: ex.rows.map(r => r.slice(0, -2)), rel: ex.rows.map(r => r[r.length - 2]), b: ex.rows.map(r => r[r.length - 1]), t: ex.c.map(() => 'c'), example: ex.name}; }
    return {n: t.c.length, t: t.c.map(() => 'c'), ...t, A: t.A.map(r => r.slice())};
  };
  const toData = M => ({optilab: 1, maxi: M.maxi, c: M.c.map(String), rows: M.A.map((a, i) => ({a: a.map(String), rel: M.rel[i], b: String(M.b[i])}))});
  const pick = (arr, k) => arr[k % arr.length];

  /* ---------- tablice simpleksu w jednym zapisie (tabSolve: liczby + symboliczne M; gomSolve: ułamki dokładne) ---------- */
  const uTab = (R, k) => { const T = R.tables[k];
    return {names: R.names.map(vn), kinds: R.kinds, cost: R.cost, cB: T.cB, basis: T.basis, A: T.A, b: T.b, zj: T.zj, cmz: T.cmz, z: T.z, pc: T.pc, pr: T.pr, ratios: T.ratios}; };
  const uGom = (T, costMap) => { const N = FR.toNum, cost = T.cost.map(f => sym(N(f)));
    return {names: T.names.map(vn), kinds: T.kinds, cost, cB: T.basis.map(j => cost[j]), basis: T.basis, A: T.A.map(r => r.map(N)), b: T.b.map(N), zj: T.zj.map(f => sym(N(f))), cmz: T.cmz.map(f => sym(N(f))),
      z: sym(N(T.z)), pc: T.pc ?? -1, pr: T.pr ?? -1, ratios: T.ratios ? T.ratios.map(q => q ? N(q) : null) : null, ...(costMap || {})}; };
  const geo = U => { const N = U.names.length, m = U.A.length; return {col: j => 2 + j, b: N + 2, q: N + 3, zr: m, cr: m + 1}; };
  function tspec(U, o = {}) {
    const N = U.names.length, m = U.A.length, g = geo(U), mk = o.mark, rq = o.ratios && U.ratios && U.pc >= 0;
    const cls = (i, j) => !mk ? '' : i === U.pr && j === U.pc ? 'pivot' : i === U.pr ? 'pr' : j === U.pc ? 'pcol' : '';
    const head = [[{v: 'C<sub>j</sub>', span: 2, c: 0}, ...U.cost.map((c, j) => ({v: sf(c), c: g.col(j), cls: mk && j === U.pc ? 'pcol' : ''})), {v: 'b', rspan: 2, c: g.b}, ...(rq ? [{v: 'iloraz<br>b / a', rspan: 2, c: g.q}] : [])],
      [{v: 'C<sub>B</sub>', c: 0}, {v: 'Baza', c: 1}, ...U.names.map((n, j) => ({v: n, c: g.col(j), cls: mk && j === U.pc ? 'pcol' : ''}))]];
    const bl = (i, j) => o.blank && o.blank[0] === i && o.blank[1] === j;   // komórka ukryta – uczeń ma ją policzyć
    const rows = U.A.map((row, i) => [{v: sf(U.cB[i])}, {v: U.names[U.basis[i]], th: true}, ...row.map((v, j) => ({v: bl(i, j) ? '<b>?</b>' : nf(v), cls: cls(i, j)})), {v: bl(i, N) ? '<b>?</b>' : nf(U.b[i]), cls: mk && i === U.pr ? 'pr' : ''},
      ...(rq ? [{v: U.ratios[i] === null ? '–' : nf(U.ratios[i]) + (i === U.pr ? ' <b>min</b>' : ''), cls: mk && i === U.pr ? 'pivot' : ''}] : [])]);
    rows.push(['', {v: 'z<sub>j</sub>', th: true}, ...U.zj.map(v => sf(v)), {v: '<b>' + sf(U.z) + '</b>', cls: 'zval'}, ...(rq ? [''] : [])]);
    rows.push(['', {v: 'c<sub>j</sub> − z<sub>j</sub>', th: true}, ...U.cmz.map((v, j) => ({v: bl('c', j) ? '<b>?</b>' : sf(v), cls: mk && j === U.pc ? 'pivot' : ''})), '', ...(rq ? [''] : [])]);
    const rowCls = []; rowCls[m] = rowCls[m + 1] = 'zrow';
    return {head, rows, cls: 'tabcj', rowCls};
  }
  const nonBasic = U => U.names.map((_, j) => j).filter(j => !U.basis.includes(j));
  const valsOf = U => U.basis.map((j, i) => `${U.names[j]} = ${nf(U.b[i])}`).join(', ');

  /* ---------- karty jednej iteracji simpleksu ---------- */
  // ctx: {mode: 'guide' | 'test' | 'watch', it: numer, maxi, first, phase: '' | 'Faza I: ' …, tagBase: {...}}
  function enterQ(U, ctx, withEnd) {
    const maxi = ctx.maxi, best = U.cmz[U.pc], en = U.names[U.pc], word = maxi ? 'największe dodatnie' : 'najbardziej ujemne';
    const cand = nonBasic(U).filter(j => U.kinds[j] !== 'a' || j === U.pc), others = cand.filter(j => j !== U.pc).slice(0, withEnd ? 2 : 3);
    const ord = [U.pc, ...others].sort((a, b) => a - b);
    const opts = ord.map(j => ({t: `wchodzi ${U.names[j]}`, ok: j === U.pc, why: j === U.pc ? '' : better(U.cmz[j], maxi)
      ? `W kolumnie ${U.names[j]} c<sub>j</sub> − z<sub>j</sub> = ${sf(U.cmz[j])} też poprawia Z, ale wolniej niż ${sf(best)} w kolumnie ${en}. Bierzemy ${word}.`
      : `W kolumnie ${U.names[j]} c<sub>j</sub> − z<sub>j</sub> = ${sf(U.cmz[j])} – ${maxi ? 'nie jest dodatnie' : 'nie jest ujemne'}, więc zwiększanie ${U.names[j]} ${sSign(sym(U.cmz[j])) === 0 ? 'nie zmieniłoby Z' : maxi ? 'zmniejszałoby Z' : 'zwiększałoby koszt'}.`}));
    if (withEnd) opts.push({t: 'koniec – to już optimum', why: `Jeszcze nie: w kolumnie ${en} c<sub>j</sub> − z<sub>j</sub> = ${sf(best)} jest ${maxi ? 'dodatnie' : 'ujemne'}, więc Z da się jeszcze ${maxi ? 'zwiększyć' : 'zmniejszyć'}.`});
    return {type: 'choice', prompt: withEnd ? 'Co teraz?' : 'Która zmienna wchodzi do bazy?', options: opts, score: ctx.mode === 'test', tag: {t: 'enter', ...ctx.tag},
      explain: `${en} ma ${word} c<sub>j</sub> − z<sub>j</sub> (${sf(best)}), więc ${maxi ? 'najszybciej zwiększa Z' : 'najszybciej obniża koszt'}.`};
  }
  function leaveQ(U, ctx) {
    const en = U.names[U.pc], lv = U.names[U.basis[U.pr]], qmin = U.ratios[U.pr], rows = U.basis.map((_, i) => i).slice(0, 4);
    if (!rows.includes(U.pr)) rows[3] = U.pr;
    const opts = rows.map(i => { const a = U.A[i][U.pc], q = U.ratios[i], nm = U.names[U.basis[i]];
      return {t: `wychodzi ${nm}`, ok: i === U.pr, why: i === U.pr ? '' : q === null
        ? `W wierszu ${nm} element kolumny ${en} wynosi ${nf(a)} – ${Math.abs(a) < EPS ? 'zero' : 'jest ujemny'}. Zwiększanie ${en} nie zużywa tego zasobu${a < 0 ? ' (wręcz go zwalnia)' : ''}, więc ten wiersz niczego nie ogranicza – tu ilorazu nie liczymy.`
        : `Iloraz w wierszu ${nm} to ${nf(U.b[i])} / ${nf(a)} = ${nf(q)}, a w wierszu ${lv} tylko ${nf(qmin)}. Przy ${en} = ${nf(q)} zmienna ${lv} byłaby ujemna – zasób skończyłby się wcześniej. Bierzemy najmniejszy iloraz.`}; });
    return {type: 'choice', prompt: `${en} wchodzi. Która zmienna wychodzi z bazy?`, options: opts, score: ctx.mode === 'test', tag: {t: 'leave', ...ctx.tag},
      explain: `Ilorazy (tylko dla dodatnich elementów kolumny ${en}): ${U.ratios.map((q, i) => q === null ? null : `${U.names[U.basis[i]]}: ${nf(U.b[i])} / ${nf(U.A[i][U.pc])} = ${nf(q)}`).filter(Boolean).join('; ')}. Najmniejszy ma ${lv}.`};
  }
  // Pytanie o jedną liczbę nowej tablicy (wiersz inny niż centralny): poprawna z tablicy U2, typowe pomyłki z tych samych liczb
  function cellQ(U, U2, ctx) {
    const p = U.A[U.pr][U.pc], g = geo(U), N = U.names.length;
    let best = null;
    U.A.forEach((row, r) => { if (r === U.pr || Math.abs(row[U.pc]) < EPS) return;
      for (let j = 0; j <= N; j++) { if (j === U.pc || (j < N && U2.basis.includes(j))) continue;
        const old = j < N ? row[j] : U.b[r], nw = j < N ? U2.A[r][j] : U2.b[r], prow = j < N ? U.A[U.pr][j] : U.b[U.pr];
        if (Math.abs(old - nw) < EPS || Math.abs(prow) < EPS) continue;
        const score = (Math.abs(nw - Math.round(nw)) < EPS ? 0 : 1) + (j === N ? 0.5 : 0) + r * 0.01;
        if (!best || score < best.score) best = {r, j, old, nw, f: row[U.pc], prow, score}; } });
    if (!best) return null;
    const {r, j, old, nw, f, prow} = best, np = prow / p, nm = j < N ? U.names[j] : 'b', rn = U.names[U.basis[r]];
    const wrong = [{v: old, why: `To stara wartość. Wiersz ${rn} trzeba przekształcić: odjąć ${nf(f)} × nowy wiersz centralny.`},
      {v: old + f * np, why: `Uwaga na znak: od starego wiersza <b>odejmujemy</b> ${nf(f)} × nowy wiersz centralny, a nie dodajemy.`},
      ...(Math.abs(p - 1) > EPS ? [{v: old - f * prow, why: `Najpierw dzielimy wiersz centralny przez element centralny (${nf(p)}) – dopiero ten nowy wiersz mnożymy przez ${nf(f)}.`}] : [])]
      .filter((w, k, a) => Math.abs(w.v - nw) > 1e-6 && a.findIndex(z => Math.abs(z.v - w.v) < 1e-9) === k);
    return {q: {type: 'number', prompt: `Ile wyniesie nowa liczba w wierszu ${rn}, kolumna ${nm}?`, answer: nw, wrong, score: ctx.mode === 'test', tag: {t: 'cell', r, j, ...ctx.tag},
      explain: `nowa = stara − (element kolumny ${U.names[U.pc]}) × (nowy wiersz centralny) = ${nf(old)} − ${f < 0 ? `(${nf(f)})` : nf(f)} · ${np < 0 ? `(${nf(np)})` : nf(np)} = ${nf(nw)}.`},
      r, j, c: j < N ? g.col(j) : g.b, old, nw, f, np, rn, nm};
  }
  function iterCards(U, U2, ctx) {
    const en = U.names[U.pc], lv = U.names[U.basis[U.pr]], p = U.A[U.pr][U.pc], g = geo(U), maxi = ctx.maxi, out = [], ph = ctx.phase || '';
    const word = maxi ? 'największe dodatnie' : 'najbardziej ujemne', neg = U.A.map((r, i) => i).filter(i => U.ratios[i] === null);
    const cq = cellQ(U, U2, ctx), zWord = ctx.zName || 'Z';
    if (ctx.mode === 'guide' && ctx.first) {
      out.push({id: `kol${ctx.it}`, title: `${ph}Która zmienna wchodzi?`, say: maxi ? 'Szukam największej liczby w ostatnim wierszu!' : 'Przy minimum szukam najbardziej ujemnej liczby!',
        text: `Liczba c<sub>j</sub> − z<sub>j</sub> mówi, o ile zmieni się ${zWord}, gdy dana zmienna wzrośnie o 1. ${maxi ? 'Wybieramy największą dodatnią – ta zmienna najszybciej zwiększa wynik.' : 'Wybieramy najbardziej ujemną – ta zmienna najszybciej obniża koszt.'} To tak, jak wybór najbardziej opłacalnego produktu.`,
        table: tspec(U), hl: [{r: g.cr, tone: 'gray'}, {r: g.cr, c: g.col(U.pc), tone: 'gold', label: maxi ? 'największe' : 'najmniejsze'}, {c: g.col(U.pc), tone: 'blue'}], q: enterQ(U, ctx, false)});
      out.push({id: `ilo${ctx.it}`, title: `${ph}Iloraz – tylko z dodatnich`, say: 'Ile możemy dodać, zanim zabraknie zasobu?',
        text: `Iloraz b / a mówi, o ile możemy zwiększyć ${en}, zanim w tym wierszu skończy się zasób. Gdy element kolumny jest zerem albo ujemny, zwiększanie ${en} nie zużywa tego zasobu – taki wiersz nas nie ogranicza, więc go pomijamy. Najmniejszy iloraz to pierwszy zasób, który się skończy.`,
        table: tspec(U, {ratios: true}), hl: [{c: g.col(U.pc), tone: 'blue'}, ...neg.slice(0, 1).map(i => ({r: i, c: g.col(U.pc), tone: 'red', label: '≤ 0 – pomijamy'})), {r: U.pr, c: g.q, tone: 'green', label: 'najmniejszy'}],
        q: leaveQ(U, ctx)});
      out.push({id: `piv${ctx.it}`, title: `${ph}Element centralny (pivot)`, mood: 'point', say: 'To mój kuzyn – element centralny!',
        text: `Na przecięciu kolumny ${en} i wiersza ${lv} stoi element centralny: ${nf(p)}. Tu następuje wymiana: ${en} wchodzi do bazy na miejsce ${lv}. Baza to zmienne, które w danej chwili mają wartości – reszta jest równa 0.`,
        table: tspec(U, {mark: true, ratios: true}), hl: [{r: U.pr, c: g.col(U.pc), tone: 'gold', label: 'pivot'}]});
      const c = g.col(U.pc);
      out.push({id: `prz${ctx.it}`, title: `${ph}Przekształcenie wierszy`, say: 'Dwie proste reguły i nowa tablica gotowa.',
        text: `1) Wiersz centralny dzielimy przez ${nf(p)}, więc pivot zamienia się w 1. 2) Od każdego innego wiersza odejmujemy jego liczbę z kolumny ${en} razy nowy wiersz centralny – w kolumnie ${en} powstają zera.`,
        formula: cq ? `<span data-hl="f1">nowy wiersz ${lv} → ${en}: stary ÷ ${nf(p)}</span><br><span data-hl="f2">wiersz ${cq.rn}, kolumna ${cq.nm}: ${nf(cq.old)} − ${cq.f < 0 ? `(${nf(cq.f)})` : nf(cq.f)} · ${cq.np < 0 ? `(${nf(cq.np)})` : nf(cq.np)} = ?</span>` : `nowy wiersz ${en} = stary wiersz ${lv} ÷ ${nf(p)}`,
        table: tspec({...U2, pc: -1, pr: -1}, cq ? {blank: [cq.r, cq.j]} : {}), hl: [{r: U.pr, tone: 'green', label: 'wiersz centralny ÷ ' + nf(p)}, ...(cq ? [{r: cq.r, c: cq.c, tone: 'gold'}] : []), {el: 'f2'}],
        q: cq ? {...cq.q, back: `piv${ctx.it}`} : undefined});
      out.push({title: `${ph}Co się zmieniło?`, mood: 'surprise', say: maxi ? 'Wynik się poprawił!' : 'Koszt spadł!',
        text: `Kolumna ${en} jest teraz „czystą jedynką”: 1 w jej wierszu i zera wszędzie indziej – tak wygląda każda zmienna bazowa. Nowe wartości: ${valsOf(U2)}. Wiersze z<sub>j</sub> i c<sub>j</sub> − z<sub>j</sub> liczymy od nowa tym samym wzorem.`,
        table: tspec({...U2, pc: -1, pr: -1}), hl: [{c: g.col(U.pc), tone: 'blue', label: 'kolumna jednostkowa'}, {r: g.zr, c: g.b, tone: 'gold', label: zWord + ' = ' + sf(U2.z)}]});
      return out;
    }
    if (ctx.mode === 'guide') {
      out.push({title: `${ph}Iteracja ${ctx.it} – ten sam przepis`, say: 'Znasz już ten przepis!',
        text: `Znów szukamy ${word} c<sub>j</sub> − z<sub>j</sub>, potem najmniejszego ilorazu. Różdżką zaznaczam kolumnę i wiersz – element centralny jest na ich przecięciu.`,
        table: tspec(U, {ratios: true}), hl: [{r: g.cr, c: g.col(U.pc), tone: 'gold'}, {r: U.pr, c: g.q, tone: 'green'}, {r: U.pr, c: g.col(U.pc), tone: 'gold', label: 'pivot ' + nf(p)}], q: enterQ(U, ctx, false)});
      out.push({title: `${ph}Po przekształceniu`, say: 'Nowa tablica!', text: `${en} weszła do bazy, ${lv} wyszła. Teraz: ${valsOf(U2)}, a ${zWord} = ${sf(U2.z)}.`,
        table: tspec({...U2, pc: -1, pr: -1}), hl: [{r: U.pr, tone: 'green'}, {r: g.zr, c: g.b, tone: 'gold'}]});
      return out;
    }
    if (ctx.mode === 'test') {
      out.push({id: `co${ctx.it}`, title: `${ph}Tablica ${ctx.it}`, text: `Przyjrzyj się tablicy. Twój ruch!`, table: tspec({...U, pc: -1, pr: -1}), q: enterQ(U, ctx, true)});
      out.push({title: `${ph}Tablica ${ctx.it}: który wiersz?`, text: 'Wybierz wiersz, który ogranicza wzrost nowej zmiennej.', table: tspec({...U, pr: -1}), hl: [{c: g.col(U.pc), tone: 'blue'}], q: {...leaveQ(U, ctx), back: `co${ctx.it}`}});
      if (cq) out.push({title: `${ph}Tablica ${ctx.it}: przelicz`, text: `Element centralny to ${nf(p)} (${en} wchodzi, ${lv} wychodzi). Policz jedną liczbę następnej tablicy.`,
        table: tspec(U, {mark: true}), hl: [{r: U.pr, c: g.col(U.pc), tone: 'gold'}, {r: cq.r, c: cq.c, tone: 'blue', label: '?'}], q: cq.q});
      return out;
    }
    // watch – Wyzwanie: jedna karta na iterację
    out.push({title: `${ph}Iteracja ${ctx.it}`, mood: 'point', say: ctx.it === 1 ? 'Kolumna, iloraz, pivot – jak zawsze.' : pick(['Znów to samo!', 'Ten sam przepis.', 'I jeszcze raz!'], ctx.it),
      text: `Wchodzi ${en} (c<sub>j</sub> − z<sub>j</sub> = ${sf(U.cmz[U.pc])}), wychodzi ${lv} (najmniejszy iloraz ${nf(U.ratios[U.pr])}), element centralny = ${nf(p)}. Po przekształceniu ${zWord} = ${sf(U2.z)}.`,
      table: tspec(U, {mark: true, ratios: true}), hl: [{r: g.cr, c: g.col(U.pc), tone: 'gold'}, {r: U.pr, c: g.q, tone: 'green'}, {r: U.pr, c: g.col(U.pc), tone: 'gold', label: 'pivot'}],
      q: ctx.ask ? enterQ(U, ctx, false) : undefined});
    return out;
  }
  // karta „optimum” + odczyt wyniku + sprawdzenie samodzielne
  function endCards(U, M, ctx, x, z) {
    const g = geo(U), maxi = M.maxi, out = [], nb = nonBasic(U).filter(j => U.kinds[j] !== 'a');
    const opt = {title: 'Czy to już koniec?', say: 'Sprawdzam ostatni wiersz…',
      text: maxi ? 'Przy maksymalizacji kończymy, gdy żadne c<sub>j</sub> − z<sub>j</sub> nie jest dodatnie: zwiększenie dowolnej zmiennej spoza bazy nie podniesie już Z. Wyżej nie wejdziemy – to szczyt.'
        : 'Przy minimalizacji kończymy, gdy żadne c<sub>j</sub> − z<sub>j</sub> nie jest ujemne: zwiększenie dowolnej zmiennej spoza bazy nie obniży już kosztu. Niżej nie zejdziemy – to dno.',
      table: tspec(U), hl: [{r: g.cr, tone: 'green', label: maxi ? 'wszystkie ≤ 0' : 'wszystkie ≥ 0'}]};
    opt.q = {type: 'choice', prompt: 'Czy da się jeszcze poprawić Z?', score: ctx.mode === 'test', tag: {t: 'optimal'},
      options: [{t: 'nie – to optimum', ok: true}, ...nb.slice(0, 2).map(j => ({t: `tak – wprowadzając ${U.names[j]}`, why: `W kolumnie ${U.names[j]} c<sub>j</sub> − z<sub>j</sub> = ${sf(U.cmz[j])}. ${maxi ? 'Nie jest dodatnie' : 'Nie jest ujemne'}, więc ta zmiana nie poprawi Z.`}))],
      explain: `Wszystkie c<sub>j</sub> − z<sub>j</sub> są ${maxi ? '≤ 0' : '≥ 0'} – tablica jest optymalna.`};
    if (ctx.mode === 'test') { opt.text = 'Ostatnia tablica. Zdecyduj sam.'; opt.hl = []; opt.say = 'Twoja decyzja!'; }
    out.push(opt);
    const xs = x.map((v, j) => `x${sub(j + 1)} = ${nf(v)}`).join(', ');
    out.push({title: 'Odczyt wyniku', say: ctx.mode === 'test' ? 'Gdzie jest wynik?' : 'Wynik czytamy z kolumny b.',
      text: ctx.mode === 'test' ? 'Tablica jest optymalna. Odczytaj z niej wartość funkcji celu.' : `Wartości zmiennych bazowych stoją w kolumnie b, zmienne spoza bazy są równe 0. Wartość funkcji celu stoi w wierszu z<sub>j</sub> pod kolumną b.`,
      table: tspec(U), hl: ctx.mode === 'test' ? [] : [{c: g.b, tone: 'blue', label: 'wartości'}, {r: g.zr, c: g.b, tone: 'gold', label: 'Z'}],
      q: {type: 'number', prompt: 'Ile wynosi optymalna wartość Z?', answer: z, score: ctx.mode === 'test', tag: {t: 'z'},
        wrong: [...U.b.filter(v => Math.abs(v - z) > 1e-6).slice(0, 2).map(v => ({v, why: `${nf(v)} to wartość jednej ze zmiennych (kolumna b), a Z stoi w wierszu z<sub>j</sub> pod kolumną b.`})), ...(Math.abs(z) > EPS ? [{v: -z, why: 'Uważaj na znak – Z odczytujemy wprost z wiersza z<sub>j</sub>.'}] : [])].filter((w, k, a) => a.findIndex(q => Math.abs(q.v - w.v) < 1e-9) === k),
        explain: `Z = ${nf(z)} przy ${xs}.`}});
    const lhs = M.A.map(a => a.reduce((s, v, j) => s + v * x[j], 0));
    out.push({title: 'Sprawdź się sam', mood: 'surprise', say: 'Ciekawostka: wynik da się sprawdzić w minutę!',
      text: 'Podstaw wynik do każdego ograniczenia i do funkcji celu. Jeśli wszystko się zgadza, nie pomyliłeś się w żadnej tablicy.',
      formula: M.A.map((a, i) => `${a.map((v, j) => v ? `${nf(v)}·${nf(x[j])}` : null).filter(Boolean).join(' + ')} = ${nf(lhs[i])} ${rs(M.rel[i])} ${nf(M.b[i])} ✓`).join('<br>') +
        `<br><b>Z</b> = ${M.c.map((v, j) => `${nf(v)}·${nf(x[j])}`).join(' + ')} = <b>${nf(z)}</b>`});
    return out;
  }
  const resultCard = (x, z, say = 'Gotowe! Tak samo liczy OptiLab.') => ({title: 'Wynik', mood: 'happy', say,
    text: 'Tak wygląda rozwiązanie optymalne. Ten sam wynik pokazuje raport w zakładce.', result: {x: x.slice(), z, fx: x.map(nf), fz: nf(z)}});

  /* ---------- SIMPLEKS – podstawy (tabSolve) ---------- */
  function simplex(level) {
    const M = model(LPL_TASKS.simplex[level]), R = tabSolve(M), mode = {warm: 'guide', test: 'test', challenge: 'watch'}[level];
    if (R.status !== 'optimal') throw new Error('zadanie lekcji nie ma optimum (' + R.status + ')');
    const U0 = uTab(R, 0), g = geo(U0), m = M.A.length, steps = [];
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Wygląda groźnie? Zaraz zobaczysz, że to bułka z masłem.' : 'Cześć! Rozwiążmy to razem.',
      text: level === 'challenge' ? `To przykład „${M.example}” z zakładki Simpleks: ${M.n} zmienne i ${m} ograniczenia. Rysunek tu nie pomoże, ale simpleks liczy dokładnie tak samo jak w Rozgrzewce.` : `Szukamy takich x, przy których Z jest ${M.maxi ? 'największe' : 'najmniejsze'}, a wszystkie ograniczenia są spełnione. Simpleks robi to krokami: od jednego rozwiązania do lepszego.`,
      formula: taskHTML(M)});
    const sl = R.names.map((_, j) => j).filter(j => R.kinds[j] === 's');
    steps.push({id: 'swobodne', title: 'Zmienne swobodne', say: 'Najpierw zamieniam nierówności na równania.',
      text: mode === 'test' ? 'Simpleks pracuje na równaniach, a nie na nierównościach. Jak zamienić te ograniczenia na równania?' : `Simpleks pracuje na równaniach, więc do każdego ograniczenia „≤” dodajemy zmienną swobodną – to niewykorzystana część zasobu. Dzięki nim mamy gotowy start: x = 0, a zmienne swobodne równe prawym stronom.`,
      formula: mode === 'test' ? M.A.map((a, i) => `${lin(a)} ${rs(M.rel[i])} ${nf(M.b[i])}`).join('<br>') : M.A.map((a, i) => `${lin(a)} + <span data-hl="s${i}">${U0.names[sl[i]]}</span> = ${nf(M.b[i])}`).join('<br>'), hl: mode === 'test' ? [] : sl.map((_, i) => ({el: 's' + i})),
      q: mode === 'test' ? {type: 'number', prompt: 'Ile zmiennych swobodnych trzeba dodać?', answer: sl.length, score: true, tag: {t: 'slack'}, wrong: [{v: M.n, why: `${M.n} to liczba zmiennych decyzyjnych. Zmienna swobodna przypada na każde ograniczenie „≤”.`}].filter(w => w.v !== sl.length), explain: 'Jedna zmienna swobodna na każde ograniczenie „≤”.'} : undefined});
    const zx = U0.zj.map((_, j) => j)[0];
    steps.push({id: 'start', title: 'Tablica początkowa', say: 'Tak wygląda punkt startu.',
      text: `W bazie są zmienne swobodne – ich kolumny tworzą „schodki” z jedynek. Wiersz z<sub>j</sub> = Σ C<sub>B</sub>·a<sub>ij</sub> (współczynniki celu zmiennych bazowych razy kolumna), a c<sub>j</sub> − z<sub>j</sub> to zysk z dodania jednostki zmiennej.`,
      table: tspec(U0, mode === 'test' ? {blank: ['c', zx]} : {}), hl: [...sl.map(j => ({c: g.col(j), tone: 'green'})).slice(0, 1).map(h => ({...h, label: 'kolumny jednostkowe'})), ...sl.slice(1).map(j => ({c: g.col(j), tone: 'green'})), {r: g.cr, tone: 'gold'}],
      q: mode === 'guide' ? {type: 'number', prompt: `Ile wynosi ${U0.names[U0.basis[0]]} na starcie?`, answer: U0.b[0], tag: {t: 'start'}, wrong: [{v: 0, why: `0 mają zmienne spoza bazy (x). ${U0.names[U0.basis[0]]} jest w bazie – jej wartość stoi w kolumnie b.`}].filter(w => Math.abs(w.v - U0.b[0]) > EPS), explain: `Na starcie x = 0, więc cały zasób jest niewykorzystany: ${U0.names[U0.basis[0]]} = ${nf(U0.b[0])}.`}
        : mode === 'test' ? {type: 'number', prompt: `Ile wynosi c<sub>j</sub> − z<sub>j</sub> w kolumnie ${U0.names[zx]}?`, answer: sym(U0.cmz[zx]).a, score: true, tag: {t: 'cmz0'}, wrong: [{v: -sym(U0.cmz[zx]).a, why: 'Na starcie z<sub>j</sub> = 0, więc c<sub>j</sub> − z<sub>j</sub> = c<sub>j</sub> – bez zmiany znaku.'}].filter(w => Math.abs(w.v - sym(U0.cmz[zx]).a) > EPS), explain: 'Na starcie w bazie są same zmienne swobodne (C<sub>B</sub> = 0), więc z<sub>j</sub> = 0 i c<sub>j</sub> − z<sub>j</sub> = c<sub>j</sub>.'} : undefined});
    if (mode === 'watch') steps.push({title: 'Ten sam schemat', mood: 'surprise', say: 'Spójrz – to przepis z Rozgrzewki!',
      text: 'Każda iteracja to te same trzy ruchy: 1) kolumna z najlepszym c<sub>j</sub> − z<sub>j</sub>, 2) wiersz z najmniejszym ilorazem, 3) przekształcenie wokół elementu centralnego. Powtarzamy, aż w ostatnim wierszu nie będzie czego poprawiać.'});
    for (let k = 0; k < R.tables.length - 1; k++)
      steps.push(...iterCards(uTab(R, k), uTab(R, k + 1), {mode, it: k + 1, maxi: M.maxi, first: k === 0, tag: {it: k}, ask: k === 0}));
    const UL = uTab(R, R.tables.length - 1);
    steps.push(...endCards(UL, M, {mode}, R.x, R.z));
    steps.push(howApp('simplex', M, R));
    if (level === 'challenge') steps.push(features('simplex', M));
    steps.push(resultCard(R.x, R.z));
    return {title: 'Simpleks – ' + LESSON_LEVEL(level), steps, result: {x: R.x.slice(), z: R.z}, model: M};
  }
  function howApp(kind, M, R) {
    const t = {
      simplex: ['Jak liczy OptiLab?', 'Dokładnie tak samo: zamienia nierówności na równania, wybiera kolumnę z najlepszym c<sub>j</sub> − z<sub>j</sub> i najmniejszy iloraz, przekształca wiersze. Gdy baza się powtórzy, przechodzi na regułę Blanda, żeby nie krążyć w kółko, a liczby bliższe zeru niż 10<sup>−9</sup> traktuje jak zero.'],
      twophase: ['Jak liczy OptiLab?', 'W zakładce Simpleks metoda dwufazowa jest domyślna. Tam wiersz celu zapisany jest ze znakiem przeciwnym (−w, a potem Z), więc szukamy w nim najbardziej ujemnej liczby – to ta sama informacja co tutaj. Kolumny sztuczne w fazie II są ukryte.'],
      bigm: ['Jak liczy OptiLab?', 'W alternatywnej metodzie tabelarycznej M jest symbolem: liczby zapisujemy jako a + m·M i porównujemy najpierw część z M. Opcja „metoda dużego M” wstawia za M konkretną wielką liczbę – przy bardzo różnych skalach danych bywa to niedokładne, dlatego domyślna jest metoda dwufazowa.']
    }[kind];
    return {title: t[0], say: 'Zdradzę Ci, co robię w środku.', text: t[1],
      action: {label: 'Wczytaj to zadanie do zakładki Simpleks', tab: 'simplex', data: toData(M), method: kind === 'twophase' ? '2F' : 'TAB'}};
  }
  function features(tab, M) {
    const T = {
      simplex: 'Moduł potrafi więcej: zadanie dualne, analizę wrażliwości (jak w Excel Solver), analizę parametryczną, rozwiązania alternatywne i eksport wszystkich tablic do Excela. Przy dużych zadaniach wklej dane prosto z arkusza.',
      graph: 'W zakładce Metoda graficzna możesz przybliżać wykres palcami, stuknąć wierzchołek, żeby zobaczyć jego Z, i włączyć punkty całkowite – gwiazdka pokaże najlepszy z nich.'
    }[tab];
    return {title: 'Co jeszcze potrafi moduł?', mood: 'surprise', say: 'Ciekawostka: to dopiero początek!', text: T,
      action: {label: `Otwórz to zadanie w zakładce ${tab === 'graph' ? 'Metoda graficzna' : 'Simpleks'}`, tab, data: toData(M), method: tab === 'simplex' ? 'TAB' : undefined}};
  }

  /* ---------- METODA DWUFAZOWA (gomSolve: faza I i II w zapisie c_j − z_j, dokładne ułamki) ---------- */
  function artCards(M, names) {     // dlaczego zmienne sztuczne – wspólne dla dwóch faz i dużego M
    const i = M.rel.findIndex(r => r !== '<='), e = M.rel[i] === '>=';
    return {id: 'sztuczne', title: 'Dlaczego zmienne sztuczne?', say: 'Hmm, tu „≤” nie ma…', mood: 'think',
      text: `Przy „${rs(M.rel[i])}” zmienna swobodna nie da startu: ${e ? `nadwyżka ma znak minus, więc przy x = 0 wyszłoby −${names.e} = ${nf(M.b[i])}, czyli ${names.e} ujemne` : 'równanie nie ma zapasu'}. Dodajemy więc zmienną sztuczną ${names.a} ≥ 0 – to tymczasowe rusztowanie, dzięki któremu startujemy z ${names.a} = ${nf(M.b[i])}.`,
      formula: `${lin(M.A[i])}${e ? ` − ${names.e}` : ''} + <span data-hl="art">${names.a}</span> = ${nf(M.b[i])}`, hl: [{el: 'art'}]};
  }
  function twophase(level) {
    const M = model(LPL_TASKS.twophase[level]), mode = {warm: 'guide', test: 'test', challenge: 'watch'}[level];
    if (M.A.flat().concat(M.b).some(v => !Number.isInteger(v))) throw new Error('lekcja dwufazowa wymaga całkowitych współczynników (bez skalowania wierszy)');
    const G = gomSolve(M, {maxCuts: 0});
    if (!G.lpX) throw new Error('zadanie lekcji nie ma optimum (' + G.status + ')');
    const x = G.lpX.map(FR.toNum), z = FR.toNum(G.lpValue), P1 = G.phase1, P2 = G.lp, steps = [];
    // faza I to maksymalizacja −w: koszt −1 przy zmiennych sztucznych
    const u1 = T => uGom(T), U10 = u1(P1[0]), g1 = geo(U10), aIdx = U10.kinds.map((k, j) => k === 'a' ? j : -1).filter(j => j >= 0);
    const eIdx = U10.kinds.findIndex(k => k === 'e'), first = M.rel.findIndex(r => r !== '<=');
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Trzy zmienne sztuczne? Spokojnie, schemat ten sam.' : 'To zadanie ma haczyk – znak „≥”.',
      text: level === 'challenge' ? `To przykład „${M.example}” z zakładki Simpleks. Każde ograniczenie ma „≥”, więc każde potrzebuje zmiennej sztucznej – a metoda dwufazowa poradzi sobie z tym w dwóch prostych etapach.` : `Szukamy ${M.maxi ? 'maksimum' : 'minimum'} Z. Ograniczenie „≥” sprawia, że punkt x = 0 nie jest dopuszczalny, więc nie mamy skąd zacząć – za chwilę to naprawimy.`,
      formula: taskHTML(M)});
    steps.push(artCards(M, {e: U10.names[eIdx] || '', a: U10.names[aIdx[0]]}));
    steps.push({id: 'faza1', title: 'Faza I: cel pomocniczy', say: 'Najpierw pozbądźmy się rusztowania!',
      text: `W fazie I zapominamy o Z i minimalizujemy sumę zmiennych sztucznych w = ${aIdx.map(j => U10.names[j]).join(' + ')} (w tablicy: maksymalizacja −w, czyli koszt −1). Jeśli uda się zejść do w = 0, znaleźliśmy prawdziwy punkt startowy.`,
      table: tspec(U10), hl: [...aIdx.map((j, k) => ({c: g1.col(j), tone: 'red', ...(k ? {} : {label: 'sztuczne'})})), {r: 'h0', tone: 'gray'}],
      q: mode === 'guide' ? {type: 'number', prompt: `Ile wynosi w na starcie (suma zmiennych sztucznych)?`, answer: -U10.z.a, tag: {t: 'w0'}, wrong: [{v: U10.z.a, why: 'W tablicy stoi −w (maksymalizujemy −w). Samo w to ta liczba bez minusa.'}].filter(w => Math.abs(w.v + U10.z.a) > EPS), explain: `Na starcie ${aIdx.map(j => U10.names[j]).join(' + ')} = ${nf(-U10.z.a)}.`}
        : mode === 'test' ? {type: 'choice', prompt: 'Jaki współczynnik ma zmienna sztuczna w celu fazy I (maksymalizacja −w)?', score: true, tag: {t: 'cost1'}, options: [{t: '−1', ok: true}, {t: '0', why: 'Zero mają zmienne x i swobodne. Zmienne sztuczne chcemy wyzerować, więc „karzemy” je kosztem −1.'}, {t: '+1', why: 'Przy maksymalizacji −w koszt +1 nagradzałby zmienne sztuczne – a my chcemy się ich pozbyć.'}], explain: 'max −w = −(suma a) → każda zmienna sztuczna ma koszt −1.'} : undefined});
    for (let k = 0; k < P1.length - 1; k++) steps.push(...iterCards(u1(P1[k]), u1(P1[k + 1]), {mode, it: k + 1, maxi: true, first: k === 0, phase: 'Faza I: ', zName: '−w', tag: {ph: 1, it: k}, ask: k === 0}));
    const U1e = u1(P1[P1.length - 1]);
    steps.push({id: 'znikaja', title: 'Koniec fazy I: znikają kolumny sztuczne', mood: 'point', say: 'Rusztowanie zdejmujemy!',
      text: `w = 0: wszystkie zmienne sztuczne wypadły z bazy i są równe 0, a reszta zmiennych spełnia prawdziwe ograniczenia. Kolumny sztuczne nie są już potrzebne – gdybyśmy je zostawili, simpleks mógłby wprowadzić je z powrotem i rozwiązanie znów łamałoby oryginalne ograniczenia.`,
      table: tspec(U1e), hl: [...aIdx.map((j, k) => ({c: g1.col(j), tone: 'red', ...(k ? {} : {label: 'usuwamy'})})), {r: g1.zr, c: g1.b, tone: 'gold', label: '−w = 0'}],
      q: mode === 'watch' ? undefined : {type: 'choice', prompt: 'Co robimy z kolumnami zmiennych sztucznych?', score: mode === 'test', tag: {t: 'dropArt'},
        options: [{t: 'usuwamy je – były tylko rusztowaniem', ok: true},
          {t: 'zostawiamy z kosztem 0', why: 'Z kosztem 0 simpleks mógłby wprowadzić je z powrotem do bazy z dodatnią wartością – a wtedy x nie spełniałyby oryginalnych ograniczeń.'},
          {t: 'zostawiamy z kosztem −1', why: 'Koszt −1 był celem fazy I. W fazie II liczy się już tylko oryginalna funkcja celu Z.'}],
        explain: 'Po fazie I zmienne sztuczne są równe 0 i poza bazą, więc ich kolumny możemy usunąć bez zmiany rozwiązania.'}});
    const U20 = uGom(P2[0]), g2 = geo(U20);
    steps.push({id: 'faza2', title: 'Faza II: wracamy do Z', say: 'Teraz prawdziwy cel!',
      text: `Wpisujemy oryginalne współczynniki celu do wiersza C<sub>j</sub> i liczymy z<sub>j</sub> oraz c<sub>j</sub> − z<sub>j</sub> od nowa. Startujemy z punktu znalezionego w fazie I: ${valsOf(U20)}.`,
      table: tspec(U20), hl: [{r: 'h0', tone: 'blue', label: 'oryginalny cel'}, {r: g2.cr, tone: 'gold'}]});
    if (P2.length === 1) steps.push({title: 'Faza II: od razu optimum', mood: 'surprise', say: 'Ciekawostka: tym razem nie trzeba nic liczyć!',
      text: `Punkt z fazy I jest już optymalny: żadne c<sub>j</sub> − z<sub>j</sub> nie ${M.maxi ? 'jest dodatnie' : 'jest ujemne'}. Tak bywa – faza I czasem od razu trafia w najlepszy wierzchołek.`});
    for (let k = 0; k < P2.length - 1; k++) steps.push(...iterCards(uGom(P2[k]), uGom(P2[k + 1]), {mode, it: k + 1, maxi: M.maxi, first: k === 0 && mode !== 'watch' && P1.length < 2, phase: 'Faza II: ', tag: {ph: 2, it: k}, ask: false}));
    steps.push(...endCards(uGom(P2[P2.length - 1]), M, {mode}, x, z));
    steps.push(howApp('twophase', M));
    steps.push(resultCard(x, z));
    return {title: 'Metoda dwufazowa – ' + LESSON_LEVEL(level), steps, result: {x, z}, model: M, G};
  }

  /* ---------- METODA DUŻEGO M (tabSolve: M symboliczne) ---------- */
  function bigm(level) {
    const M = model(LPL_TASKS.bigm[level]), R = tabSolve(M), mode = {warm: 'guide', test: 'test', challenge: 'watch'}[level];
    if (R.status !== 'optimal') throw new Error('zadanie lekcji nie ma optimum (' + R.status + ')');
    const U0 = uTab(R, 0), g = geo(U0), aIdx = R.kinds.map((k, j) => k === 'a' ? j : -1).filter(j => j >= 0), eIdx = R.kinds.findIndex(k => k === 'e'), steps = [];
    steps.push({title: 'Zadanie', say: level === 'warm' ? 'Znasz to zadanie z lekcji o dwóch fazach?' : 'Znaki „≥” – potrzebne będą zmienne sztuczne.',
      text: `Szukamy ${M.maxi ? 'maksimum' : 'minimum'} Z. Ograniczenia „≥” wymagają zmiennych sztucznych. Tym razem pozbędziemy się ich jednym simpleksem – dzięki ogromnej karze M.`, formula: taskHTML(M)});
    steps.push(artCards(M, {e: U0.names[eIdx] || '', a: U0.names[aIdx[0]]}));
    const cm = aIdx.map(j => sf(R.cost[j]))[0];
    steps.push({id: 'kara', title: 'Kara M', say: 'M to liczba większa niż wszystko, co znasz!',
      text: `Zmienna sztuczna dostaje w funkcji celu współczynnik ${cm}: ${M.maxi ? 'przy maksymalizacji to ogromna strata' : 'przy minimalizacji to ogromny koszt'}. Simpleks sam będzie chciał ją wyrzucić z bazy. M zapisujemy jako symbol – nie wstawiamy konkretnej liczby.`,
      table: tspec(U0), hl: [...aIdx.map((j, k) => ({r: 'h0', c: g.col(j), tone: 'red', ...(k ? {} : {label: cm})})), {r: g.cr, tone: 'gold'}]});
    // porównanie dwóch liczb z M – z prawdziwego wiersza c_j − z_j
    const nb = nonBasic(U0).filter(j => R.kinds[j] !== 'a'), pair = nb.filter(j => Math.abs(sym(U0.cmz[j]).m) > EPS).slice(0, 2);
    if (pair.length === 2) {
      const [p, q] = pair, bt = better(sSub(U0.cmz[p], U0.cmz[q]), M.maxi) ? p : q, wt = bt === p ? q : p;
      steps.push({id: 'porownaj', title: 'Jak porównać liczby z M?', mood: 'think', say: 'Najpierw patrzę na M, potem na resztę.',
        text: `Liczba a + m·M jest tym większa, im większe m – część bez M liczy się dopiero przy remisie, bo M przewyższa każdą zwykłą liczbę. ${M.maxi ? 'Przy maksymalizacji wchodzi największe' : 'Przy minimalizacji wchodzi najbardziej ujemne'} c<sub>j</sub> − z<sub>j</sub>.`,
        table: tspec(U0), hl: [{r: g.cr, c: g.col(p), tone: 'blue'}, {r: g.cr, c: g.col(q), tone: 'blue'}],
        q: {type: 'choice', prompt: `Która liczba jest ${M.maxi ? 'większa' : 'mniejsza'}?`, score: mode === 'test', tag: {t: 'cmpM', j: bt, other: wt},
          options: [p, q].map(j => ({t: sf(U0.cmz[j]), ok: j === bt, why: j === bt ? '' : `Porównaj najpierw części z M: ${sf({a: 0, m: sym(U0.cmz[j]).m})} i ${sf({a: 0, m: sym(U0.cmz[bt]).m})}. ${Math.abs(sym(U0.cmz[j]).m - sym(U0.cmz[bt]).m) < EPS ? 'Są równe, więc decyduje część bez M.' : 'Decyduje część z M – zwykła liczba obok nie ma znaczenia.'}`})),
          explain: `${sf(U0.cmz[bt])} jest ${M.maxi ? 'większe' : 'mniejsze'} niż ${sf(U0.cmz[wt])}.`}});
    }
    for (let k = 0; k < R.tables.length - 1; k++) steps.push(...iterCards(uTab(R, k), uTab(R, k + 1), {mode, it: k + 1, maxi: M.maxi, first: k === 0, tag: {it: k}, ask: k === 0}));
    const UL = uTab(R, R.tables.length - 1), gL = geo(UL);
    steps.push({title: 'Zmienne sztuczne poza bazą', mood: 'surprise', say: 'Ciekawostka: one już nie wrócą!',
      text: `Wszystkie zmienne sztuczne wyszły z bazy, więc są równe 0. W ich kolumnach c<sub>j</sub> − z<sub>j</sub> zawiera ${M.maxi ? '−M' : '+M'} – wprowadzenie ich z powrotem byłoby ogromną stratą, więc simpleks nigdy tego nie zrobi.`,
      table: tspec(UL), hl: aIdx.map((j, k) => ({r: gL.cr, c: gL.col(j), tone: 'red', ...(k ? {} : {label: 'kara M'})}))});
    steps.push(...endCards(UL, M, {mode}, R.x, R.z));
    steps.push(howApp('bigm', M));
    steps.push(resultCard(R.x, R.z));
    return {title: 'Metoda dużego M – ' + LESSON_LEVEL(level), steps, result: {x: R.x.slice(), z: R.z}, model: M};
  }

  /* ---------- METODA GRAFICZNA ---------- */
  // Wierzchołki obszaru dopuszczalnego: przecięcia par prostych (ograniczenia + osie), które spełniają wszystkie ograniczenia
  function lpVertices(M, box) {
    const L = M.A.map((a, i) => ({a: a[0], b: a[1], r: M.b[i], rel: M.rel[i], k: i})), all = [...L, {a: 1, b: 0, r: 0, rel: '>=', k: 'x1'}, {a: 0, b: 1, r: 0, rel: '>=', k: 'x2'}];
    if (box) all.push({a: 1, b: 0, r: box, rel: '<=', k: 'bx'}, {a: 0, b: 1, r: box, rel: '<=', k: 'by'});
    const ok = (x, y) => all.every(l => { const v = l.a * x + l.b * y; return l.rel === '<=' ? v <= l.r + 1e-7 : l.rel === '>=' ? v >= l.r - 1e-7 : Math.abs(v - l.r) < 1e-7; });
    const P = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const p = all[i], q = all[j], d = p.a * q.b - q.a * p.b; if (Math.abs(d) < 1e-12) continue;
      const x = (p.r * q.b - q.r * p.b) / d, y = (p.a * q.r - q.a * p.r) / d;
      if (!ok(x, y)) continue;
      const v = P.find(u => Math.abs(u.x - x) < 1e-7 && Math.abs(u.y - y) < 1e-7);
      if (v) { v.on.add(p.k); v.on.add(q.k); } else P.push({x: Math.abs(x) < 1e-12 ? 0 : x, y: Math.abs(y) < 1e-12 ? 0 : y, on: new Set([p.k, q.k])});
    }
    const cx = P.reduce((s, p) => s + p.x, 0) / (P.length || 1), cy = P.reduce((s, p) => s + p.y, 0) / (P.length || 1);
    P.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    P.forEach(p => { p.z = M.c[0] * p.x + M.c[1] * p.y; p.on = [...p.on]; });
    return {P, pairs: all.length * (all.length - 1) / 2, lines: all.length};
  }
  const PAL = ['#d62828', '#1d4ed8', '#7b2cbf', '#e76f51', '#0b7a75', '#6b705c'];
  // Wykres SVG (czysta funkcja): o = {L, lines: [indeksy], region, vertices, level: [z…], half: i, pts: [{x, y, t, cls}], arrow}
  function graphSVG(M, o = {}) {
    const W = 340, H = 300, ml = 34, mb = 28, mt = 10, mr = 12, L = o.L, sx = x => ml + x / L * (W - ml - mr), sy = y => H - mb - y / L * (H - mb - mt);
    const step = [1, 2, 5, 10, 20, 50, 100].find(s => L / s <= 8) || Math.ceil(L / 8);
    let h = `<svg class="ls-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres metody graficznej"><defs><clipPath id="lsclip"><rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mb - mt}"/></clipPath>` +
      '<marker id="lsarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1b2a4e"/></marker></defs>';
    for (let t = 0; t <= L + 1e-9; t += step) h += `<line class="lg-grid" x1="${sx(t)}" y1="${sy(0)}" x2="${sx(t)}" y2="${sy(L)}"/><line class="lg-grid" x1="${sx(0)}" y1="${sy(t)}" x2="${sx(L)}" y2="${sy(t)}"/>` +
      `<text class="lg-tick" x="${sx(t)}" y="${H - mb + 16}" text-anchor="middle">${t}</text>` + (t ? `<text class="lg-tick" x="${ml - 6}" y="${sy(t) + 4}" text-anchor="end">${t}</text>` : '');
    h += `<line class="lg-axis" x1="${sx(0)}" y1="${sy(0)}" x2="${sx(L)}" y2="${sy(0)}"/><line class="lg-axis" x1="${sx(0)}" y1="${sy(0)}" x2="${sx(0)}" y2="${sy(L)}"/>` +
      `<text class="lg-ax" x="${W - mr}" y="${H - mb - 6}" text-anchor="end">x₁</text><text class="lg-ax" x="${ml + 6}" y="${mt + 12}">x₂</text><g clip-path="url(#lsclip)">`;
    if (o.half !== undefined) {                                   // półpłaszczyzna jednego ograniczenia
      const one = {n: 2, c: [0, 0], A: [M.A[o.half]], rel: [M.rel[o.half]], b: [M.b[o.half]]}, V = lpVertices(one, L).P;
      if (V.length) h += `<polygon class="lg-half" data-hl="pol${o.half + 1}" points="${V.map(p => sx(p.x) + ',' + sy(p.y)).join(' ')}"/>`;
    }
    if (o.region) { const V = lpVertices(M, L).P; if (V.length) h += `<polygon class="lg-reg" data-hl="obszar" points="${V.map(p => sx(p.x) + ',' + sy(p.y)).join(' ')}"/>`; }
    const seg = (a, b, r) => {                                    // odcinek prostej a·x + b·y = r w kwadracie [0, L]²
      const pts = [];
      if (Math.abs(b) > EPS) [0, L].forEach(x => { const y = (r - a * x) / b; if (y >= -1e-9 && y <= L + 1e-9) pts.push([x, y]); });
      if (Math.abs(a) > EPS) [0, L].forEach(y => { const x = (r - b * y) / a; if (x >= -1e-9 && x <= L + 1e-9) pts.push([x, y]); });
      const u = pts.filter((p, k) => pts.findIndex(q => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9) === k);
      if (u.length < 2) return null; u.sort((p, q) => p[0] - q[0] || p[1] - q[1]); return [u[0], u[u.length - 1]];
    };
    (o.level || []).forEach((z, k) => { const s = seg(M.c[0], M.c[1], z); if (s) h += `<line class="lg-lev${k === (o.level.length - 1) ? ' last' : ''}" data-hl="poziom${k}" x1="${sx(s[0][0])}" y1="${sy(s[0][1])}" x2="${sx(s[1][0])}" y2="${sy(s[1][1])}"/>`; });
    (o.lines || []).forEach(i => { const s = seg(M.A[i][0], M.A[i][1], M.b[i]); if (s) h += `<line class="lg-l" style="stroke:${PAL[i % PAL.length]}" data-hl="ogr${i + 1}" x1="${sx(s[0][0])}" y1="${sy(s[0][1])}" x2="${sx(s[1][0])}" y2="${sy(s[1][1])}"/>`; });
    h += '</g>';
    if (o.arrow) { const n = Math.hypot(M.c[0], M.c[1]), f = L * 0.22 * (M.maxi ? 1 : -1), x0 = o.arrow[0], y0 = o.arrow[1];
      h += `<line class="lg-arrow" data-hl="kierunek" x1="${sx(x0)}" y1="${sy(y0)}" x2="${sx(x0 + f * M.c[0] / n)}" y2="${sy(y0 + f * M.c[1] / n)}" marker-end="url(#lsarr)"/>`; }
    (o.lines || []).forEach(i => { const s = seg(M.A[i][0], M.A[i][1], M.b[i]); if (!s) return; const p = s[1][1] > L * 0.85 ? s[0] : s[1], q = [(s[0][0] * 0.35 + s[1][0] * 0.65), (s[0][1] * 0.35 + s[1][1] * 0.65)]; void p;
      h += `<text class="lg-lab" style="fill:${PAL[i % PAL.length]}" x="${Math.min(W - 40, sx(q[0]) + 4)}" y="${Math.max(mt + 10, sy(q[1]) - 5)}">(${i + 1})</text>`; });
    if (o.vertices) lpVertices(M).P.forEach((p, k) => { h += `<circle class="lg-v${o.best === k ? ' best' : ''}" data-hl="w${k + 1}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="${o.best === k ? 7 : 5}"/>` +
      `<text class="lg-vt" x="${sx(p.x) + 7}" y="${sy(p.y) - 7}">W${k + 1}</text>`; });
    (o.pts || []).forEach(p => { h += `<circle class="lg-p ${p.cls || ''}" data-hl="${p.key || ''}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="5"/><text class="lg-vt" x="${sx(p.x) + 7}" y="${sy(p.y) + 14}">${p.t || ''}</text>`; });
    return h + '</svg>';
  }
  const lineName = (M, k) => typeof k === 'number' ? `(${k + 1}) ${lin(M.A[k])} = ${nf(M.b[k])}` : k === 'x1' ? 'oś x₂ (x₁ = 0)' : 'oś x₁ (x₂ = 0)';
  const ptxt = p => `(${nf(p.x)}; ${nf(p.y)})`;
  function vertTable(M, V, best, withZ) {
    return {head: [[{v: 'Wierzchołek', c: 0}, {v: 'x<sub>1</sub>', c: 1}, {v: 'x<sub>2</sub>', c: 2}, ...(withZ ? [{v: 'Z = ' + lin(M.c), c: 3}] : [])]],
      rows: V.map((p, k) => [{v: 'W' + (k + 1), th: true}, nf(p.x), nf(p.y), ...(withZ ? [{v: nf(p.z), cls: k === best ? 'pivot' : ''}] : [])])};
  }
  function graph(level) {
    const M = model(LPL_TASKS.graph[level]), mode = {warm: 'guide', test: 'test', challenge: 'watch'}[level];
    if (M.n !== 2) throw new Error('metoda graficzna wymaga 2 zmiennych');
    const chk = solveM(M), {P: V, pairs, lines} = lpVertices(M);
    if (chk.status !== 'optimal' || !V.length) throw new Error('zadanie lekcji nie ma optimum (' + chk.status + ')');
    const zs = V.map(p => p.z), zopt = M.maxi ? Math.max(...zs) : Math.min(...zs), bi = zs.findIndex(z => Math.abs(z - zopt) < 1e-7), B = V[bi];
    if (Math.abs(zopt - chk.z) > 1e-6 * (1 + Math.abs(zopt))) throw new Error('wierzchołki i simpleks dają różne wyniki');
    const ext = Math.max(...V.map(p => Math.max(p.x, p.y)), ...M.A.map((a, i) => Math.max(a[0] ? M.b[i] / a[0] : 0, a[1] ? M.b[i] / a[1] : 0)));
    const L = Math.ceil(ext * 1.15 + 0.5), all = M.A.map((_, i) => i), unb = M.rel.some(r => r === '>=');
    const steps = [], S = o => graphSVG(M, {L, ...o});
    const ex = M.A.findIndex(a => a[0] && a[1]) >= 0 ? M.A.findIndex(a => a[0] && a[1]) : 0, a = M.A[ex], ix = a[0] ? M.b[ex] / a[0] : null, iy = a[1] ? M.b[ex] / a[1] : null;
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Minimum, znaki „≥”… Wygląda groźnie? Zobaczysz, że nie!' : 'Dwie zmienne? To można narysować!',
      text: level === 'challenge' ? `To przykład „${M.example}” z zakładki Metoda graficzna. Każdy punkt (x₁; x₂) to jeden możliwy plan, a my szukamy planu o najmniejszym koszcie Z.` : `Każdy punkt (x₁; x₂) na płaszczyźnie to jeden możliwy plan. Szukamy punktu, który spełnia wszystkie ograniczenia i daje ${M.maxi ? 'największe' : 'najmniejsze'} Z.`,
      formula: taskHTML(M)});
    steps.push({id: 'prosta', title: 'Skąd się bierze prosta?', mood: 'point', say: 'Zamieniam „≤” na „=” i mam prostą!',
      text: `Brzeg ograniczenia (${ex + 1}) to prosta ${lin(a)} = ${nf(M.b[ex])}. Najłatwiej narysować ją przez punkty na osiach: wstawiamy x₂ = 0, a potem x₁ = 0.`,
      svg: S({lines: [ex], pts: [...(ix !== null ? [{x: ix, y: 0, t: `(${nf(ix)}; 0)`, key: 'px'}] : []), ...(iy !== null ? [{x: 0, y: iy, t: `(0; ${nf(iy)})`, key: 'py'}] : [])]}), hl: [{el: 'ogr' + (ex + 1)}],
      q: ix === null ? undefined : {type: 'number', prompt: `W jakim punkcie prosta (${ex + 1}) przecina oś x₁ (podaj x₁)?`, answer: ix, score: mode === 'test', tag: {t: 'intercept', i: ex},
        wrong: [...(iy !== null && Math.abs(iy - ix) > EPS ? [{v: iy, why: `${nf(iy)} to przecięcie z osią x₂ (wtedy x₁ = 0). Na osi x₁ mamy x₂ = 0.`}] : []), ...(a[0] !== 1 ? [{v: M.b[ex] * a[0], why: `Wstawiamy x₂ = 0: ${nf(a[0])}·x₁ = ${nf(M.b[ex])}, więc dzielimy, a nie mnożymy: x₁ = ${nf(M.b[ex])} / ${nf(a[0])}.`}] : []), {v: 0, why: 'Zero to początek układu. Wstaw x₂ = 0 do równania prostej i wylicz x₁.'}].filter((w, k, arr) => Math.abs(w.v - ix) > EPS && arr.findIndex(q => Math.abs(q.v - w.v) < EPS) === k),
        explain: `x₂ = 0 ⇒ ${nf(a[0])}·x₁ = ${nf(M.b[ex])} ⇒ x₁ = ${nf(ix)}.`}});
    const sideOk = M.rel[ex] === '<=' ? 0 <= M.b[ex] : 0 >= M.b[ex];
    steps.push({id: 'strona', title: 'Po której stronie?', say: 'Sprawdzam jeden punkt – najlepiej (0; 0).',
      text: `Prosta dzieli płaszczyznę na dwie połowy; ograniczenie spełnia tylko jedna z nich. Wstawiamy punkt (0; 0): ${lin(a)} = 0 ${rs(M.rel[ex])} ${nf(M.b[ex])} jest ${sideOk ? 'prawdą, więc dobra jest połowa z początkiem układu' : 'fałszem, więc dobra jest połowa po drugiej stronie'}.`,
      svg: S({lines: [ex], half: ex}), hl: [{el: 'pol' + (ex + 1)}],
      q: {type: 'choice', prompt: `Czy punkt (0; 0) spełnia ograniczenie (${ex + 1})?`, score: mode === 'test', tag: {t: 'origin', i: ex, ans: sideOk},
        options: [{t: 'tak', ok: sideOk, why: `Wstaw: lewa strona = 0, a 0 ${rs(M.rel[ex])} ${nf(M.b[ex])} to fałsz.`}, {t: 'nie', ok: !sideOk, why: `Wstaw: lewa strona = 0, a 0 ${rs(M.rel[ex])} ${nf(M.b[ex])} to prawda.`}],
        explain: `0 ${rs(M.rel[ex])} ${nf(M.b[ex])} – ${sideOk ? 'prawda' : 'fałsz'}.`}});
    // punkt niedopuszczalny (punkt kratowy łamiący dokładnie jedno ograniczenie) – do Sprawdzianu
    let bad = null;
    for (let s = 1; s <= L && !bad; s++) for (let x = 0; x <= s && !bad; x++) { const y = s - x, br = M.A.map((r, i) => ({i, v: r[0] * x + r[1] * y})).filter(({i, v}) => M.rel[i] === '<=' ? v > M.b[i] + 1e-9 : M.rel[i] === '>=' ? v < M.b[i] - 1e-9 : Math.abs(v - M.b[i]) > 1e-9); if (br.length === 1 && x + y >= L / 3) bad = {x, y, i: br[0].i, v: br[0].v}; }
    steps.push({id: 'obszar', title: 'Obszar dopuszczalny', say: 'Część wspólna wszystkich połówek!',
      text: `Rysujemy wszystkie proste i dla każdej wybieramy dobrą stronę. Część wspólna to obszar dopuszczalny – każdy jego punkt spełnia wszystkie ograniczenia naraz${unb ? '. Tutaj obszar nie ma końca w górę i w prawo – to nic złego, bo szukamy minimum' : ''}.`,
      svg: S({lines: all, region: true, ...(bad && mode === 'test' ? {pts: [{x: bad.x, y: bad.y, t: ptxt(bad), cls: 'bad', key: 'pt'}]} : {})}), hl: [{el: 'obszar'}, ...(bad && mode === 'test' ? [{el: 'pt'}] : [])],
      q: mode === 'test' && bad ? {type: 'choice', prompt: `Czy punkt ${ptxt(bad)} jest dopuszczalny?`, score: true, tag: {t: 'feasible', p: [bad.x, bad.y], ans: false},
        options: [{t: 'tak', why: `Sprawdź ograniczenie (${bad.i + 1}): ${lin(M.A[bad.i])} = ${nf(bad.v)}, a ma być ${rs(M.rel[bad.i])} ${nf(M.b[bad.i])}. Wystarczy jedno złamane ograniczenie, by punkt odpadł.`}, {t: 'nie', ok: true}],
        explain: `Łamie ograniczenie (${bad.i + 1}): ${nf(bad.v)} ${rs(M.rel[bad.i]) === '≤' ? '>' : '<'} ${nf(M.b[bad.i])}.`} : undefined});
    const lv = [0.35, 0.7].map(f => zs.reduce((s, z) => M.maxi ? Math.min(s, z) : Math.max(s, z), zopt) * (1 - f) + zopt * f);
    steps.push({id: 'wierzcholek', title: 'Dlaczego wierzchołek?', mood: 'surprise', say: 'Ciekawostka: optimum zawsze siedzi w rogu!',
      text: `Punkty o tym samym Z leżą na jednej prostej – to linia poziomu. Przesuwamy ją w stronę ${M.maxi ? 'większego' : 'mniejszego'} Z (strzałka), aż ostatni raz dotknie obszaru – zawsze stanie się to w wierzchołku (albo na całej krawędzi, gdy jest do niej równoległa).`,
      svg: S({lines: all, region: true, level: [...lv, zopt], arrow: [V[0].x * 0.5 + B.x * 0.5, V[0].y * 0.5 + B.y * 0.5].map(v => Math.min(v, L * 0.6))}), hl: [{el: 'poziom2'}, {el: 'kierunek'}]});
    steps.push({id: 'tabw', title: 'Wierzchołki', mood: 'point', say: 'Każdy róg to przecięcie dwóch prostych.',
      text: `Wierzchołek to punkt, w którym przecinają się dwie proste (także osie). Współrzędne liczymy z układu dwóch równań. Tu obszar ma ${V.length} wierzchołki${V.length > 4 ? '' : ''}.`.replace(/ma (\d+) wierzchołki/, (s, n) => +n >= 5 ? `ma ${n} wierzchołków` : s),
      svg: S({lines: all, region: true, vertices: true}), table: vertTable(M, V, -1, false),
      q: (() => { // współrzędna wierzchołka z przecięcia dwóch ograniczeń (nie osi)
        const k = V.findIndex(p => p.on.filter(t => typeof t === 'number').length >= 2 && p.x > EPS && p.y > EPS); if (k < 0 || mode === 'watch') return undefined;
        const p = V[k], [i1, i2] = p.on.filter(t => typeof t === 'number');
        return {type: 'number', prompt: `Proste (${i1 + 1}) i (${i2 + 1}) przecinają się w W${k + 1}. Ile wynosi tam x₁?`, answer: p.x, score: mode === 'test', tag: {t: 'vertex', k, coord: 'x'},
          wrong: [{v: p.y, why: `${nf(p.y)} to x₂ tego punktu. Pytam o x₁ (pierwszą współrzędną).`}].filter(w => Math.abs(w.v - p.x) > EPS),
          explain: `Rozwiązujemy układ: ${lin(M.A[i1])} = ${nf(M.b[i1])} i ${lin(M.A[i2])} = ${nf(M.b[i2])} ⇒ x₁ = ${nf(p.x)}, x₂ = ${nf(p.y)}.`};
      })()});
    if (mode === 'test') steps.push({id: 'coteraz', title: 'Co teraz?', text: 'Masz obszar i jego wierzchołki.', svg: S({lines: all, region: true, vertices: true}),
      q: {type: 'choice', prompt: 'Co robimy dalej?', score: true, tag: {t: 'next-step'},
        options: [{t: 'liczymy Z w każdym wierzchołku', ok: true},
          {t: 'bierzemy punkt najdalej od (0; 0)', why: 'Odległość od początku układu nie ma nic wspólnego z Z. Liczy się wartość funkcji celu – ją trzeba policzyć.'},
          {t: 'bierzemy środek obszaru', why: 'Środek prawie nigdy nie jest optimum: linię poziomu da się z niego przesunąć dalej. Optimum leży w wierzchołku.'}],
        explain: 'Optimum leży w wierzchołku, więc wystarczy porównać Z we wszystkich wierzchołkach.'}});
    const qk = V.findIndex((p, k) => k !== bi && p.x > EPS && p.y > EPS), zq = qk >= 0 ? qk : (bi + 1) % V.length;
    steps.push({id: 'zwierz', title: 'Z w wierzchołkach', say: 'Liczę Z w każdym rogu.', text: `Wstawiamy współrzędne każdego wierzchołka do Z = ${lin(M.c)}.`,
      table: vertTable(M, V, mode === 'test' ? -1 : bi, true), hl: mode === 'test' ? [{r: zq, c: 3, tone: 'blue', label: '?'}] : [{r: bi, c: 3, tone: 'gold', label: M.maxi ? 'największe' : 'najmniejsze'}],
      q: mode === 'test' ? {type: 'number', prompt: `Ile wynosi Z w W${zq + 1} ${ptxt(V[zq])}?`, answer: V[zq].z, score: true, tag: {t: 'zv', k: zq}, wrong: [{v: M.c[0] * V[zq].y + M.c[1] * V[zq].x, why: 'Zamieniłeś współrzędne: c₁ mnożymy przez x₁, a c₂ przez x₂.'}].filter(w => Math.abs(w.v - V[zq].z) > EPS),
          explain: `Z = ${nf(M.c[0])}·${nf(V[zq].x)} + ${nf(M.c[1])}·${nf(V[zq].y)} = ${nf(V[zq].z)}.`}
        : {type: 'choice', prompt: `Który wierzchołek daje ${M.maxi ? 'największe' : 'najmniejsze'} Z?`, tag: {t: 'best', k: bi},
          options: V.map((p, k) => ({t: `W${k + 1} ${ptxt(p)}`, ok: k === bi, why: `Tu Z = ${nf(p.z)}, a w W${bi + 1} jest ${nf(zopt)} – ${M.maxi ? 'więcej' : 'mniej'}.`})).filter((o, k) => k === bi || k < 3).slice(0, 4),
          explain: `W${bi + 1}: Z = ${nf(zopt)}.`}});
    if (mode === 'test') steps.push({title: 'Najlepszy wierzchołek', table: vertTable(M, V, -1, true), text: 'Teraz cała tabela jest uzupełniona.',
      q: {type: 'choice', prompt: 'Który wierzchołek jest optymalny?', score: true, tag: {t: 'best', k: bi},
        options: V.map((p, k) => ({t: `W${k + 1} ${ptxt(p)}`, ok: k === bi, why: `W W${k + 1} Z = ${nf(p.z)}, a w W${bi + 1} jest ${nf(zopt)} – ${M.maxi ? 'więcej' : 'mniej'}.`})),
        explain: `W${bi + 1} ${ptxt(B)}: Z = ${nf(zopt)}.`}});
    steps.push({id: 'poziom', title: 'Linia poziomu przez optimum', mood: 'point', say: 'Cały obszar zostaje po jednej stronie!',
      text: `Prosta Z = ${nf(zopt)} przechodzi przez W${bi + 1} i dotyka obszaru tylko tam. Cała reszta obszaru leży po stronie ${M.maxi ? 'mniejszego' : 'większego'} Z – dlatego nie trzeba sprawdzać punktów w środku, wystarczą wierzchołki albo przesuwanie linii poziomu.`,
      svg: S({lines: all, region: true, vertices: true, best: bi, level: [zopt]}), hl: [{el: 'poziom0'}, {el: 'w' + (bi + 1)}],
      q: mode === 'test' ? {type: 'choice', prompt: 'Czy punkt wewnątrz obszaru może dać lepsze Z niż najlepszy wierzchołek?', score: true, tag: {t: 'interior'},
        options: [{t: 'nie', ok: true}, {t: 'tak, czasem', why: 'Z jest liniowe: z punktu wewnątrz zawsze da się przesunąć w stronę lepszego Z, aż do brzegu i dalej do wierzchołka. Środek nigdy nie wygrywa z najlepszym wierzchołkiem.'}],
        explain: 'Funkcja liniowa osiąga optimum na brzegu – w wierzchołku (czasem na całej krawędzi).'} : undefined});
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: `OptiLab przecina każdą parę prostych – ${lines} proste (z osiami) dają ${pairs} par – odrzuca punkty, które łamią któreś ograniczenie, i liczy Z w pozostałych. Na koniec sprawdza wynik simpleksem: jeśli obszar jest nieograniczony w stronę lepszego Z, mówi to wprost zamiast podawać wierzchołek.`,
      action: {label: 'Wczytaj to zadanie do zakładki Metoda graficzna', tab: 'graph', data: toData(M)}});
    if (level === 'challenge') steps.push(features('graph', M));
    if (mode === 'test') steps.push({title: 'Ostatnie pytanie', text: 'Podsumujmy zadanie jedną liczbą.',
      q: {type: 'number', prompt: `Ile wynosi Z<sub>opt</sub>?`, answer: zopt, score: true, tag: {t: 'z'}, wrong: [{v: B.x, why: 'To x₁ optymalnego wierzchołka, a pytam o wartość Z.'}, {v: B.y, why: 'To x₂ optymalnego wierzchołka, a pytam o wartość Z.'}].filter((w, k, arr) => Math.abs(w.v - zopt) > EPS && arr.findIndex(q => Math.abs(q.v - w.v) < EPS) === k), explain: `Z<sub>opt</sub> = ${nf(zopt)} w ${ptxt(B)}.`}});
    steps.push(resultCard([B.x, B.y], zopt));
    return {title: 'Metoda graficzna – ' + LESSON_LEVEL(level), steps, result: {x: [B.x, B.y], z: zopt}, model: M};
  }
  return {nf, sf, lin, model, uTab, uGom, tspec, lpVertices, graphSVG, graph, simplex, twophase, bigm, toData};
})();
const LESSON_LEVEL = l => ({warm: 'Rozgrzewka', test: 'Sprawdzian', challenge: 'Wyzwanie'})[l] || l;
/* Rejestracja tematów w menu „Czego chcesz się dziś nauczyć?” (zakładki modułu LP) */
(() => {
  const tabs = ['graph', 'simplex', 'ilp'];
  LESSON.register({id: 'lp-graph', title: 'Metoda graficzna', group: 'Metoda graficzna', note: 'proste, obszar, wierzchołki', tabs, build: LPL.graph});
  LESSON.register({id: 'lp-simplex', title: 'Simpleks – podstawy', group: 'Simpleks', note: 'tablica cⱼ − zⱼ, kolumna, iloraz, pivot', tabs, build: LPL.simplex});
  LESSON.register({id: 'lp-2f', title: 'Metoda dwufazowa', group: 'Simpleks', ext: true, note: 'znaki ≥ i =, zmienne sztuczne', tabs, build: LPL.twophase});
  LESSON.register({id: 'lp-bigm', title: 'Metoda dużego M', group: 'Simpleks', ext: true, note: 'kara M w funkcji celu', tabs, build: LPL.bigm});
  LESSON.register({id: 'lp-gomory', title: 'Odcięcia Gomory\'ego', group: 'Zadania całkowitoliczbowe', tabs, soon: true, build: () => { throw new Error('wkrótce'); }});
  LESSON.register({id: 'lp-bb', title: 'Podział i ograniczenia', group: 'Zadania całkowitoliczbowe', tabs, soon: true, build: () => { throw new Error('wkrótce'); }});
})();
