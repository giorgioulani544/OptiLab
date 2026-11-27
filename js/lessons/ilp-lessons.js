/* ===== OptiLab – lekcje „Nauka” dla zadań całkowitoliczbowych (czyste funkcje, bez DOM – testowane w Node) =====
   Odcięcia Gomory'ego: wszystko z gomSolve (js/lp-gomory.js – te same ustawienia co raport w zakładce Całkowite): skalowanie wierszy (G.scale),
   tablice relaksacji (G.lp), odcięcia (C.cand, C.f, C.f0, C.steps – dualny simpleks) i usunięte odcięcia (C.dropped); kontrola: ilpSolve.
   Podział i ograniczenia: drzewo z ilpSolve (js/ilp-solver.js, ustawienia domyślne zakładki: pierwsza ułamkowa, w głąb). Kolejność zdarzeń
   (utworzenie węzła, zbadanie, odcięcie) odtwarzamy z drzewa (bbEvents) – test sprawdza zgodność z decyzjami solvera.
   Zadania lekcyjne (ILPL_TASKS) to tylko dane wejściowe; korzysta z pomocników LPL (js/lessons/lp-lessons.js). */
const ILPL_TASKS = {
  gomory: {
    warm: {maxi: true, c: [2, 3], A: [[1, 2], [2, 1]], rel: ['<=', '<='], b: [4, 4]},
    test: {maxi: true, c: [2, 3], A: [[1, 2], [1, 0.5]], rel: ['<=', '<='], b: [6, 4]},        // ułamek 1/2 – pokaz mnożenia przez NWW
    challenge: 'Całkowitoliczbowe (plecak)'
  },
  bb: {
    warm: {maxi: true, c: [1, 2], A: [[1, 1], [0, 3]], rel: ['<=', '<='], b: [3, 2]},
    test: {maxi: true, c: [7, 10], A: [[-1, 3], [7, 1]], rel: ['<=', '<='], b: [6, 35]},      // Taha, „Badania operacyjne”: (4; 3), Z = 58
    challenge: '3 zmienne (Simpleks)'
  }
};
const ILPL = (() => {
  const {nf, vn, lin, rs, taskHTML, model, uGom, geo, tspec, valsOf, graphSVG, resultCard, toData} = LPL, EPS = 1e-9, MI = '−';
  const GOM_OPT = {maxCuts: 500, maxPiv: 20000};                     // jak w zakładce Całkowite (GOM_MAX_CUTS, js/modules/lp.js)
  const imodel = t => { const M = model(t); M.t = M.c.map(() => 'i'); return M; };
  const MODE = {warm: 'guide', test: 'test', challenge: 'watch'};
  const xs = x => x.map((v, j) => `x${sub(j + 1)} = ${nf(v)}`).join(', ');
  const fr = v => FR.str(v).replace('-', MI);
  const near = (a, b) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));

  /* ================= ODCIĘCIA GOMORY'EGO ================= */
  // tablica bez wiersza i kolumny usuniętej zmiennej odcięcia (to samo robi gomSolve – tu tylko do pokazania „po”)
  function withoutVar(U, j) {
    const i = U.basis.indexOf(j), keep = k => k !== j, idx = U.names.map((_, k) => k).filter(keep), map = k => idx.indexOf(k);
    return {...U, names: idx.map(k => U.names[k]), kinds: idx.map(k => U.kinds[k]), cost: idx.map(k => U.cost[k]), cB: U.cB.filter((_, q) => q !== i),
      basis: U.basis.filter((_, q) => q !== i).map(map), A: U.A.filter((_, q) => q !== i).map(r => idx.map(k => r[k])), b: U.b.filter((_, q) => q !== i),
      zj: idx.map(k => U.zj[k]), cmz: idx.map(k => U.cmz[k]), pc: -1, pr: -1, ratios: null, dratios: null};
  }
  function gomory(level) {
    const M = imodel(ILPL_TASKS.gomory[level]), mode = MODE[level], score = mode === 'test', exam = mode !== 'guide';
    if (M.rel.some(r => r !== '<=')) throw new Error('lekcja Gomory\'ego: tylko ograniczenia ≤');
    const G = gomSolve(M, GOM_OPT), BB = ilpSolve(M, {rule: 'most', search: 'best'});
    if (G.status !== 'optimal' || !G.cuts.length) throw new Error('zadanie lekcji: odcięcia nie dały wyniku (' + G.status + ')');
    const steps = [], lastLP = uGom(G.lp[G.lp.length - 1]), gl = geo(lastLP), z = G.zNum, x = G.xNum.slice(), sc = G.scale.map(Number);
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Plecak z modułu – zobaczysz, że to ten sam przepis.' : 'Tym razem x muszą być całkowite!',
      text: `Szukamy ${M.maxi ? 'maksimum' : 'minimum'} Z, ale zmienne muszą być liczbami całkowitymi – nie da się wyprodukować 4/3 stołu. Metoda odcięć dokłada ograniczenia, które odcinają ułamkowe rozwiązania, aż simpleks sam trafi w punkt całkowity.`,
      formula: taskHTML(M).replace(/≥ 0$/, '≥ 0, całkowite')});
    // 1. NWW mianowników – zmienne swobodne też muszą być całkowite
    const si = sc.findIndex(L => L > 1);
    if (si >= 0) {
      const a = M.A[si], r = M.b[si];
      let pt = null; for (let s2 = 0; s2 <= 12 && !pt; s2++) for (let x1 = 0; x1 <= s2 && !pt; x1++) { const p = [x1, s2 - x1], slack = r - a[0] * p[0] - a[1] * p[1]; if (slack >= 0 && Math.abs(slack - Math.round(slack)) > EPS) pt = {p, slack}; }
      steps.push({id: 'nww', title: 'Najpierw: mnożymy przez NWW', mood: 'think', say: 'Ułamek w ograniczeniu? Najpierw go usunę!',
        text: `Odcięcie Gomory'ego działa tylko wtedy, gdy WSZYSTKIE zmienne w tablicy są całkowite – także zmienne swobodne. ${pt ? `Tu przy całkowitym x = (${pt.p.join('; ')}) zapas ograniczenia (${si + 1}) wynosi ${nf(pt.slack)} – ułamek!` : ''} ${score ? 'Jak temu zaradzić?' : 'Mnożymy więc ograniczenie przez NWW mianowników, a zapas staje się liczbą całkowitą.'}`,
        formula: `<span data-hl="przed">${lin(a)} ≤ ${nf(r)}</span> &nbsp;| · ${score ? '?' : sc[si]}${score ? '' : `<br><span data-hl="po">${lin(G.rows[si].a.map(FR.toNum))} ≤ ${nf(FR.toNum(G.rows[si].b))}</span>`}`, hl: score ? [{el: 'przed'}] : [{el: 'po'}],
        q: {type: 'number', prompt: `Przez jaką liczbę mnożymy ograniczenie (${si + 1})?`, answer: sc[si], score, tag: {t: 'scale', i: si},
          wrong: [{v: 1 / sc[si], why: 'Mnożymy przez NWW mianowników (liczbę całkowitą), a nie przez sam ułamek.'}], explain: `NWW mianowników = ${sc[si]}: po pomnożeniu wszystkie współczynniki i prawa strona są całkowite.`}});
    } else steps.push({id: 'nww', title: 'Najpierw: czy trzeba mnożyć?', say: 'Sprawdzam, czy są ułamki w ograniczeniach.',
      text: 'Odcięcie Gomory\'ego działa tylko wtedy, gdy wszystkie zmienne w tablicy są całkowite – także zmienne swobodne (zapas zasobu). Dlatego ograniczenia z ułamkami mnożymy przez NWW mianowników. Tu wszystkie liczby są już całkowite, więc zapas przy całkowitych x też jest całkowity.',
      q: mode === 'watch' ? undefined : {type: 'choice', prompt: 'Czy w tym zadaniu trzeba mnożyć ograniczenia?', score, tag: {t: 'scale1'},
        options: [{t: 'nie', ok: true}, {t: 'tak', why: 'Wszystkie współczynniki i prawe strony są całkowite – NWW mianowników = 1, nie ma czego mnożyć.'}], explain: 'NWW = 1 – nic nie zmieniamy.'}});
    // 2. relaksacja LP
    steps.push({id: 'lp', title: 'Krok 1: relaksacja LP', say: 'Najpierw zwykły simpleks – bez całkowitości.',
      text: score ? 'Rozwiązujemy zadanie tak, jakby ułamki były dozwolone (jak w lekcji simpleksu). Wynik relaksacji to „sufit”: rozwiązanie całkowite nie może być lepsze.' : `Rozwiązujemy zadanie tak, jakby ułamki były dozwolone (jak w lekcji simpleksu). Wychodzi ${xs(G.lpX.map(FR.toNum))} i Z = ${fr(G.lpValue)}. To „sufit”: rozwiązanie całkowite nie może być lepsze.`,
      table: tspec(lastLP, score ? {blank: ['z', 0]} : {}), hl: score ? [{c: gl.b, tone: 'blue', label: 'ułamki'}] : [{c: gl.b, tone: 'blue', label: 'ułamki'}, {r: gl.zr, c: gl.b, tone: 'gold'}],
      q: mode === 'guide' ? {type: 'choice', prompt: 'Czy to rozwiązanie spełnia wymóg całkowitości?', tag: {t: 'lpfrac'}, options: [{t: 'nie', ok: true}, {t: 'tak', why: `Spójrz na kolumnę b: ${valsOf(lastLP)} – są tam ułamki.`}], explain: 'Ułamkowe zmienne bazowe – potrzebne odcięcie.'}
        : score ? {type: 'number', prompt: 'Ile wynosi Z relaksacji LP?', answer: FR.toNum(G.lpValue), score, tag: {t: 'lpz'}, explain: `Z<sub>LP</sub> = ${fr(G.lpValue)} – wynik całkowity będzie co najwyżej taki.`} : undefined});
    // 3. odcięcia
    G.cuts.forEach((C, q) => {
      const first = q === 0, T0 = C.steps[0], U0 = uGom(T0), g0 = geo(U0), names = T0.names, srcPrev = first ? lastLP : uGom(G.cuts[q - 1].steps[G.cuts[q - 1].steps.length - 1]);
      const gp = geo(srcPrev), srcRow = srcPrev.basis.findIndex(j => T0.names[j] === C.srcVar), cols = C.nonb.filter(j => FR.sgn(C.srcRow[j]));
      const tie = C.cand.filter(o => FR.cmp(o.f, C.f0) === 0).length > 1, sname = vn('s' + C.k);
      const terms = cols.filter(j => FR.sgn(C.f[j])).map(j => `${FR.cmp(C.f[j], FR.ONE) ? fr(C.f[j]) + '·' : ''}${vn(names[j])}`).join(' + ');
      if (mode === 'watch' && !first) {
        const L = C.steps[C.steps.length - 1];
        steps.push({title: `Odcięcie ${C.k}`, mood: 'point', say: pick(['Kolejny płot!', 'I jeszcze jedno cięcie.'], q),
          text: `Wiersz ${vn(C.srcVar)} (f = ${fr(C.f0)}) daje odcięcie ${terms} ≥ ${fr(C.f0)}. Po ${C.steps.length - 1} ${C.steps.length - 1 === 1 ? 'kroku' : 'krokach'} dualnego simpleksu: ${xs(G.n ? xOf(L, G.n) : [])}, Z = ${fr(L.z)}.`,
          table: tspec(uGom(L)), hl: [{r: geo(uGom(L)).zr, c: geo(uGom(L)).b, tone: 'gold'}]});
      } else {
        // a) wybór wiersza – część ułamkowa
        steps.push({id: `wiersz${C.k}`, title: `Odcięcie ${C.k}: który wiersz?`, say: first ? 'Szukam największej części ułamkowej.' : 'Znów ułamki – kolejny płot!',
          text: `Część ułamkowa f = a − ⌊a⌋ to „to, co wystaje ponad liczbę całkowitą”: ${exPos(C)}. ${first ? `Uwaga przy ujemnych: ${exNeg(C)}. ` : ''}Odcięcie budujemy z wiersza o największym f – zwykle tnie najgłębiej${tie ? '; przy remisie OptiLab bierze pierwszy taki wiersz' : ''}.`,
          table: {head: [[{v: 'Zmienna bazowa', c: 0}, {v: 'wartość b', c: 1}, {v: '⌊b⌋', c: 2}, {v: 'f = b − ⌊b⌋', c: 3}]],
            rows: C.cand.map(o => [{v: vn(o.v), th: true}, fr(o.b), fr(FR.floor(o.b)), {v: exam ? '<b>?</b>' : fr(o.f), cls: o.v === C.srcVar && !exam ? 'pivot' : ''}])},
          hl: exam ? [] : [{r: C.cand.findIndex(o => o.v === C.srcVar), c: 3, tone: 'gold', label: tie ? 'pierwszy z remisu' : 'największe f'}],
          q: mode === 'watch' && !first ? undefined : tie || mode === 'watch'
            ? {type: 'number', prompt: `Ile wynosi część ułamkowa f<sub>0</sub> wiersza ${vn(C.srcVar)} (b = ${fr(C.srcB)})?`, answer: FR.toNum(C.f0), score, tag: {t: 'f0', k: C.k},
              wrong: [{v: FR.toNum(FR.floor(C.srcB)), why: `${fr(FR.floor(C.srcB))} to część całkowita ⌊b⌋. Część ułamkowa to b − ⌊b⌋.`}, {v: 1 - FR.toNum(C.f0), why: 'Odwrotnie: f to odległość od liczby całkowitej W DÓŁ (b − ⌊b⌋), a nie do następnej liczby całkowitej.'}].filter(w => !near(w.v, FR.toNum(C.f0))),
              explain: `f<sub>0</sub> = ${fr(C.srcB)} − ${fr(FR.floor(C.srcB))} = ${fr(C.f0)}${tie ? '. Remis – bierzemy pierwszy wiersz tablicy.' : '.'}`}
            : {type: 'choice', prompt: 'Z którego wiersza budujemy odcięcie?', score, tag: {t: 'srcrow', k: C.k},
              options: C.cand.map(o => ({t: `${vn(o.v)} (b = ${fr(o.b)})`, ok: o.v === C.srcVar, why: `Tu f = ${fr(o.f)}, a w wierszu ${vn(C.srcVar)} f = ${fr(C.f0)} – więcej. Bierzemy największą część ułamkową.`})).slice(0, 4),
              explain: `${vn(C.srcVar)}: f = ${fr(C.f0)} – największa część ułamkowa.`}});
        // b) wzór odcięcia
        // pytanie o f przy ujemnym współczynniku – tylko gdy typowa pomyłka (część ułamkowa |a|) daje inną liczbę
        const trap = j => FR.sgn(C.srcRow[j]) < 0 && FR.sgn(C.f[j]) && FR.cmp(FR.frac(FR.sub(FR.Z, C.srcRow[j])), C.f[j]) !== 0;
        const negj = cols.find(trap), qj = negj !== undefined ? negj : cols.find(j => FR.sgn(C.f[j]) && FR.cmp(C.f[j], C.f0) !== 0);
        steps.push({id: `wzor${C.k}`, title: `Odcięcie ${C.k}: wzór`, say: first ? 'Zostawiam same części ułamkowe.' : 'Ten sam wzór co poprzednio.', mood: first ? 'point' : 'explain',
          text: first ? `Wiersz tablicy to równanie. Rozbijamy każdy współczynnik na część całkowitą i ułamkową; dla punktów całkowitych części całkowite dają liczbę całkowitą, więc suma części ułamkowych musi „dobić” do f<sub>0</sub>. Stąd odcięcie: Σ f<sub>j</sub>·x<sub>j</sub> ≥ f<sub>0</sub> po zmiennych spoza bazy.`
            : `Z wiersza ${vn(C.srcVar)} bierzemy części ułamkowe współczynników przy zmiennych spoza bazy.`,
          formula: `<span data-hl="row">${vn(C.srcVar)}${cols.map(j => ` ${FR.sgn(C.srcRow[j]) < 0 ? MI : '+'} ${FR.cmp(FR.sgn(C.srcRow[j]) < 0 ? FR.sub(FR.Z, C.srcRow[j]) : C.srcRow[j], FR.ONE) ? fr(FR.sgn(C.srcRow[j]) < 0 ? FR.sub(FR.Z, C.srcRow[j]) : C.srcRow[j]) + '·' : ''}${vn(names[j])}`).join('')} = ${fr(C.srcB)}</span><br>` +
            `<span data-hl="cut">${mode === 'test' && qj !== undefined ? cols.filter(j => FR.sgn(C.f[j])).map(j => `<b>?</b>·${vn(names[j])}`).join(' + ') : terms} ≥ ${fr(C.f0)}</span>`,
          table: {head: [[{v: '', c: 0}, ...cols.map((j, k) => ({v: vn(names[j]), c: k + 1})), {v: 'b', c: cols.length + 1}]],
            rows: [[{v: 'a', th: true}, ...cols.map(j => fr(C.srcRow[j])), fr(C.srcB)], [{v: '⌊a⌋', th: true}, ...cols.map(j => fr(FR.floor(C.srcRow[j]))), fr(FR.floor(C.srcB))],
              [{v: 'f = a − ⌊a⌋', th: true}, ...cols.map(j => ({v: mode === 'test' && qj !== undefined ? '<b>?</b>' : fr(C.f[j]), cls: 'pcol'})), {v: fr(C.f0), cls: 'pcol'}]]},
          hl: [{r: 2, tone: 'green', label: 'części ułamkowe'}, {el: 'cut'}],
          q: qj === undefined || (mode === 'watch') || (!first && mode === 'guide') ? undefined : {type: 'number', prompt: `Ile wynosi f przy ${vn(names[qj])} (a = ${fr(C.srcRow[qj])})?`, answer: FR.toNum(C.f[qj]), score, tag: {t: 'fj', k: C.k, j: qj},
            wrong: [{v: Math.abs(FR.toNum(C.srcRow[qj])) - Math.floor(Math.abs(FR.toNum(C.srcRow[qj]))), why: `Przy liczbie ujemnej zaokrąglamy W DÓŁ: ⌊${fr(C.srcRow[qj])}⌋ = ${fr(FR.floor(C.srcRow[qj]))}, więc f = ${fr(C.srcRow[qj])} − (${fr(FR.floor(C.srcRow[qj]))}). Część ułamkowa jest zawsze między 0 a 1.`},
              {v: FR.toNum(C.srcRow[qj]), why: 'To cały współczynnik a. Część ułamkowa to a − ⌊a⌋ (liczba od 0 do 1).'}].filter((w, k, arr) => !near(w.v, FR.toNum(C.f[qj])) && arr.findIndex(z2 => near(z2.v, w.v)) === k),
            explain: `f = ${fr(C.srcRow[qj])} − (${fr(FR.floor(C.srcRow[qj]))}) = ${fr(C.f[qj])}.`}});
        if (first) steps.push({id: 'uczciwe', title: 'Dlaczego odcięcie jest uczciwe?', mood: 'surprise', say: 'Ciekawostka: żaden punkt całkowity nie ucierpi!',
          text: `W obecnym rozwiązaniu zmienne spoza bazy są równe 0, więc lewa strona odcięcia to 0 – a 0 < ${fr(C.f0)}: ten ułamkowy punkt zostaje odcięty. Każdy punkt całkowity spełnia odcięcie, bo wyprowadziliśmy je z równań prawdziwych dla wszystkich punktów całkowitych. Tniemy więc tylko „ułamkowy kawałek” obszaru.`,
          formula: `${terms} ≥ ${fr(C.f0)}<br>teraz: ${cols.filter(j => FR.sgn(C.f[j])).map(() => '0').join(' + ')} = 0 &lt; ${fr(C.f0)} ✗`});
        // c) dopisanie do tablicy + dlaczego dualny simpleks
        const gz = geo(U0), ci = U0.A.length - 1;
        steps.push({id: `dual${C.k}`, title: `Odcięcie ${C.k} w tablicy`, say: first ? 'Ujemne b? To robota dla dualnego simpleksu!' : 'Nowy wiersz, ujemne b.',
          text: score ? `Dopisujemy odcięcie ze zmienną swobodną ${sname} ≥ 0. Spójrz na nowe b i na wiersz c<sub>j</sub> − z<sub>j</sub>.` : first ? `Odcięcie mnożymy przez −1 i dodajemy zmienną swobodną ${sname} ≥ 0: nowy wiersz ma ujemne b, więc rozwiązanie przestaje być dopuszczalne. Wiersz c<sub>j</sub> − z<sub>j</sub> się nie zmienia – optymalność zostaje. Dualny simpleks naprawia dopuszczalność, nie psując optymalności.`
            : `Dopisujemy wiersz ${sname}: ${cols.filter(j => FR.sgn(C.f[j])).map(j => `${MI}${fr(C.f[j])}·${vn(names[j])}`).join(' ')} + ${sname} = ${MI}${fr(C.f0)}.`,
          table: tspec(U0, {negb: true}), hl: [{r: ci, tone: 'green', label: 'odcięcie'}, {r: ci, c: gz.b, tone: 'red', label: 'b < 0'}, {r: gz.cr, tone: 'blue'}],
          q: mode === 'watch' || (!first && mode === 'guide') ? undefined : {type: 'choice', prompt: 'Jak teraz przywrócić dopuszczalność?', score, tag: {t: 'method', k: C.k},
            options: [{t: 'dualnym simpleksem', ok: true}, {t: 'zwykłym simpleksem', why: 'Zwykły simpleks wymaga dopuszczalnej tablicy (b ≥ 0). Tu b < 0, a za to c<sub>j</sub> − z<sub>j</sub> są już optymalne – to dokładnie sytuacja dla dualnego simpleksu.'},
              {t: 'liczymy wszystko od nowa', why: 'Szkoda pracy: optymalność wiersza c<sub>j</sub> − z<sub>j</sub> zostaje, wystarczy kilka kroków dualnego simpleksu.'}],
            explain: 'b < 0 (brak dopuszczalności), c<sub>j</sub> − z<sub>j</sub> optymalne → dualny simpleks.'}});
        // d) kroki dualnego simpleksu
        C.steps.forEach((T, k) => {
          if (T.pr === undefined || T.pc === undefined || T.pr < 0 || T.pc < 0) return;
          const U = uGom(T), g = geo(U), lv = U.names[U.basis[T.pr]], en = U.names[T.pc], negC = U.names.map((_, j) => j).filter(j => !U.basis.includes(j) && U.A[T.pr][j] < -EPS);
          const posC = U.names.map((_, j) => j).find(j => !U.basis.includes(j) && U.A[T.pr][j] > EPS);
          if (mode === 'watch' || (!first && mode === 'guide')) { steps.push({title: `Dualny simpleks${C.steps.length > 2 ? ` – krok ${k + 1}` : ''}`, mood: 'point', say: 'Wiersz z ujemnym b, najmniejszy iloraz.',
            text: `Wychodzi ${lv} (b = ${nf(U.b[T.pr])} < 0), wchodzi ${en} – najmniejszy iloraz |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| = ${nf(U.dratios[T.pc])}.`,
            table: tspec(U, {mark: true, dual: true, negb: true}), hl: [{r: T.pr, c: g.b, tone: 'red'}, {r: T.pr, c: g.col(T.pc), tone: 'gold', label: 'pivot'}]}); return; }
          steps.push({id: `ds${C.k}_${k}`, title: `Dualny simpleks: wiersz i kolumna`, mood: 'point', say: 'Odwrotnie niż zwykle: najpierw wiersz!',
            text: first && k === 0 && !score ? `Najpierw wiersz: wychodzi zmienna z najbardziej ujemnym b (${lv}). Potem kolumna: tylko a<sub>rj</sub> < 0 (tylko one zmienią znak b na dodatni), a spośród nich najmniejszy iloraz |c<sub>j</sub> − z<sub>j</sub>| / |a<sub>rj</sub>| – inaczej któreś c<sub>j</sub> − z<sub>j</sub> stałoby się ${M.maxi ? 'dodatnie' : 'ujemne'} i stracilibyśmy optymalność.`
              : `Wychodzi ${lv} (ujemne b). Wybierz kolumnę.`,
            table: tspec(U, {dual: mode !== 'test', negb: true}), hl: [{r: T.pr, c: g.b, tone: 'red', label: 'wychodzi'}, ...(mode !== 'test' ? [{r: g.cr + 1, c: g.col(T.pc), tone: 'gold', label: 'min'}] : [])],
            q: {type: 'choice', prompt: 'Która zmienna wchodzi do bazy?', score, tag: {t: 'dualin', k: C.k, s: k},
              options: [...negC, ...(posC !== undefined ? [posC] : [])].slice(0, 4).map(j => ({t: `wchodzi ${U.names[j]}`, ok: j === T.pc, why: U.A[T.pr][j] > 0
                ? `W wierszu ${lv} przy ${U.names[j]} stoi ${nf(U.A[T.pr][j])} > 0. Dzieląc przez liczbę dodatnią, b nadal byłoby ujemne – bierzemy tylko a<sub>rj</sub> < 0.`
                : `Iloraz dla ${U.names[j]} = ${nf(U.dratios[j])}, a dla ${en} = ${nf(U.dratios[T.pc])} – mniej. Większy iloraz zepsułby optymalność wiersza c<sub>j</sub> − z<sub>j</sub>.`})),
              explain: `${en}: najmniejszy iloraz ${nf(U.dratios[T.pc])} wśród a<sub>rj</sub> < 0.`}});
        });
        const L = uGom(C.steps[C.steps.length - 1]), gL = geo(L);
        steps.push({title: `Po odcięciu ${C.k}`, say: G.cuts.length > q + 1 ? 'Lepiej, ale jeszcze nie całkowite.' : 'Same liczby całkowite!', mood: G.cuts.length > q + 1 ? 'explain' : 'happy',
          text: score && q === G.cuts.length - 1 ? 'Tablica znów jest dopuszczalna, a wszystkie zmienne bazowe są całkowite – to optimum zadania całkowitoliczbowego.' : `Tablica znów jest dopuszczalna: ${valsOf(L)}, Z = ${nf(L.z.a)}. ${G.cuts.length > q + 1 ? 'Wciąż są ułamki – potrzebne następne odcięcie.' : 'Wszystkie zmienne bazowe są całkowite – to optimum zadania całkowitoliczbowego.'}`,
          table: tspec(L, score && q === G.cuts.length - 1 ? {blank: ['z', 0]} : {}), hl: score && q === G.cuts.length - 1 ? [{c: gL.b, tone: 'green'}] : [{c: gL.b, tone: G.cuts.length > q + 1 ? 'blue' : 'green'}, {r: gL.zr, c: gL.b, tone: 'gold', label: 'Z = ' + nf(L.z.a)}],
          q: score && q === G.cuts.length - 1 ? {type: 'number', prompt: 'Ile wynosi Z po ostatnim odcięciu?', answer: L.z.a, score, tag: {t: 'zcut', k: C.k}, explain: `Z = ${nf(L.z.a)}.`} : undefined});
      }
      // e) ZNIKANIE WIERSZY I KOLUMN – odcięcia nieaktywne (C.dropped)
      (C.dropped || []).forEach(dn => {
        const Lb = uGom(C.steps[C.steps.length - 1]), j = C.steps[C.steps.length - 1].names.indexOf(dn), i = Lb.basis.indexOf(j), g = geo(Lb), val = Lb.b[i], dv = vn(dn), k0 = dn.slice(1);
        steps.push({id: `plot${C.k}${dn}`, title: exam ? `Odcięcie ${k0} – co z nim?` : `Odcięcie ${k0} już nie przeszkadza`, mood: 'point', say: exam ? 'Zakreślam wiersz i kolumnę odcięcia.' : 'Ten płot stoi daleko – zakreślam go!',
          text: exam ? `Zmienna ${dv} – zapas odcięcia ${k0}, czyli odległość od niego – weszła do bazy. Spójrz na jej wiersz i kolumnę: ile wynosi zapas i co to znaczy dla odcięcia?`
            : `Zmienna ${dv} weszła do bazy i ma wartość ${nf(val)} > 0: to zapas odcięcia ${k0}, czyli odległość od niego. Odcięcie jest jak płot, który stoi daleko od nas – nie dotyka obecnego rozwiązania i niczego już nie ogranicza. Jego kolumna to „czysta jedynka”: 1 w jego własnym wierszu, 0 wszędzie indziej (także w c<sub>j</sub> − z<sub>j</sub>).`,
          table: tspec(Lb), hl: exam ? [{r: i, tone: 'green'}, {c: g.col(j), tone: 'blue'}] : [{r: i, tone: 'green', label: `${dv} = ${nf(val)} > 0`}, {c: g.col(j), tone: 'blue', label: 'czysta jedynka'}, {r: i, c: g.col(j), tone: 'gold'}],
          q: {type: 'choice', prompt: `Czy odcięcie ${k0} ogranicza teraz rozwiązanie?`, score, tag: {t: 'inactive', k: C.k, v: dn},
            options: [{t: 'nie – stoi daleko (zapas > 0)', ok: true}, {t: 'tak – jest w tablicy, więc ogranicza', why: `Ograniczenie „trzyma” rozwiązanie tylko wtedy, gdy jego zapas jest równy 0. Tu ${dv} = ${nf(val)} > 0 – rozwiązanie nawet go nie dotyka.`}],
            explain: `${dv} = ${nf(val)} > 0 – odcięcie nieaktywne: jak płot, który stoi daleko od nas, nie dotyka rozwiązania i niczego nie ogranicza. Jego kolumna to „czysta jedynka” (1 tylko we własnym wierszu).`}});
        const La = withoutVar(Lb, j), ga = geo(La);
        steps.push({id: `zdejmij${C.k}${dn}`, title: 'Zdejmujemy płot: wiersz i kolumna znikają', mood: 'point', say: exam ? 'Ciach! Wiersz i kolumna znikają.' : 'Ciach! Tablica mniejsza, wynik ten sam.',
          text: `Usuwamy wiersz i kolumnę ${dv}. Kolumna miała jedynkę tylko we własnym wierszu, więc żaden inny wiersz ani c<sub>j</sub> − z<sub>j</sub> się nie zmienia${score ? '' : `: nadal ${valsOf(La)}, a Z = ${nf(La.z.a)}`}. Tablica nie puchnie przy kolejnych odcięciach.`,
          table: tspec(La, score ? {blank: ['z', 0]} : {}), hl: [{c: ga.b, tone: 'blue', label: 'te same wartości'}, ...(score ? [] : [{r: ga.zr, c: ga.b, tone: 'gold', label: 'Z = ' + nf(La.z.a)}])],
          q: mode === 'watch' ? undefined : {type: 'number', prompt: 'Ile wynosi Z po usunięciu wiersza i kolumny?', answer: La.z.a, score, tag: {t: 'zdrop', k: C.k, v: dn},
            wrong: [{v: La.z.a - val, why: `Nie odejmujemy wartości ${dv}: ta zmienna ma koszt 0, więc nie wpływała na Z.`}].filter(w => !near(w.v, La.z.a)), explain: `Z bez zmian: ${nf(La.z.a)}.`}});
        steps.push({id: `wolno${C.k}${dn}`, title: 'Czy wolno tak zrobić?', mood: 'surprise', say: 'Ciekawostka: płot zawsze można postawić z powrotem.',
          text: 'Tak. Usunięte odcięcie było poprawne – nie wycinało żadnego punktu całkowitego – więc bez niego nie zgubimy rozwiązania. W najgorszym razie simpleks znów trafi w ułamek i dołożymy nowe odcięcie, jak nowy płot.'});
      });
    });
    // 4. wynik i kontrola metodą podziału i ograniczeń
    steps.push({id: 'kontrola', title: 'Kontrola: podział i ograniczenia', mood: 'surprise', say: 'Ciekawostka: inna metoda, ten sam wynik!',
      text: exam ? 'Metoda podziału i ograniczeń to zupełnie inna droga do wyniku. Jeśli da to samo Z, usuwanie nieaktywnych odcięć niczego nie zepsuło.' : `Metoda podziału i ograniczeń (zupełnie inna droga) daje Z = ${nf(BB.bestZ)}${BB.best.some((v, j) => !near(v, x[j])) ? ` przy x = (${BB.best.map(nf).join('; ')}) – to inne rozwiązanie o tej samej wartości` : ' przy tych samych x'}. Usuwanie nieaktywnych odcięć nie zepsuło więc wyniku.`,
      ...(exam ? {} : {formula: `odcięcia Gomory'ego: Z = <b>${nf(z)}</b><br>podział i ograniczenia: Z = <b>${nf(BB.bestZ)}</b>`}),
      q: {type: 'number', prompt: 'Ile wynosi optymalne Z całkowite?', answer: z, score, tag: {t: 'z'},
        wrong: [{v: FR.toNum(G.lpValue), why: `${fr(G.lpValue)} to wynik relaksacji LP (z ułamkami). Wynik całkowity jest niższy.`}].filter(w => !near(w.v, z)), explain: `Odcięcia Gomory'ego: Z = ${nf(z)}; podział i ograniczenia: Z = ${nf(BB.bestZ)} – to samo.`}});
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: `Liczę na dokładnych ułamkach (bez zaokrągleń), mnożę ograniczenia przez NWW, wybieram wiersz o największej części ułamkowej i dualnym simpleksem przywracam dopuszczalność. Nieaktywne odcięcia usuwam, a wynik sprawdzam metodą podziału i ograniczeń; limit to ${GOM_OPT.maxCuts} odcięć – po nim nie podaję wyniku.`,
      action: {label: 'Wczytaj to zadanie do zakładki Całkowite', tab: 'ilp', data: toData(M), sets: {'ilp-method': 'gom'}}});
    steps.push(resultCard(x, z));
    return {title: 'Odcięcia Gomory\'ego – ' + LESSON_LEVEL(level), steps, result: {x, z}, model: M, G, BB};
  }
  const pick = (arr, k) => arr[k % arr.length];
  // przykłady części ułamkowej do tekstu – nigdy równe odpowiedzi z bieżącego odcięcia (żeby nie podpowiadać)
  const exPos = C => { const used = [C.f0, ...C.f].map(v => FR.str(v)); const e = [['7/4', '3/4'], ['5/2', '1/2'], ['10/3', '1/3']].find(([, f]) => !used.includes(f)); return `dla ${e[0]} jest to ${e[1]}`; };
  const exNeg = C => { const used = [C.f0, ...C.f].map(v => FR.str(v)); const e = [['−1/4', '3/4', '1/4'], ['−2/5', '3/5', '2/5'], ['−1/6', '5/6', '1/6']].find(([, f]) => !used.includes(f)); return `⌊${e[0]}⌋ = −1, więc f = ${e[0]} − (−1) = ${e[1]}, a nie ${e[2]}`; };
  const xOf = (T, n) => Array.from({length: n}, (_, j) => { const i = T.basis.indexOf(T.names.indexOf('x' + (j + 1))); return i < 0 ? 0 : FR.toNum(T.b[i]); });

  /* ================= PODZIAŁ I OGRANICZENIA ================= */
  // Kolejność zdarzeń przy przeszukiwaniu w głąb (jak ilpSolve z search 'dfs'): węzły dzieci tworzone parami (≤, potem ≥),
  // gałąź „≤” badana przed „≥”. Zdarzenia: create (int | inf | bound | open) oraz process (branch | late). inc – najlepsze całkowite w tej chwili.
  function bbEvents(R, M) {
    const sg = M.maxi ? 1 : -1, isInt = x => x.every((v, k) => !(M.t[k] === 'i' || M.t[k] === 'b') || Math.abs(v - Math.round(v)) <= 1e-6), ev = [];
    let inc = -Infinity, best = null;
    const create = nd => { const e = {nd, act: 'create', inc: inc === -Infinity ? null : sg * inc, best};
      if (nd.r.status !== 'optimal') e.type = 'inf'; else if (sg * nd.r.z <= inc + 1e-9) e.type = 'bound';
      else if (isInt(nd.r.x)) { e.type = 'int'; inc = sg * nd.r.z; best = nd; } else e.type = 'open';
      ev.push(e); return e.type === 'open'; };
    const process = nd => {
      if (sg * nd.r.z <= inc + 1e-9) { ev.push({nd, act: 'process', type: 'late', inc: sg * inc, best}); return; }
      ev.push({nd, act: 'process', type: 'branch', inc: inc === -Infinity ? null : sg * inc, best});
      const open = nd.kids.filter(create); open.forEach(process);
    };
    if (create(R.root)) process(R.root);
    return ev;
  }
  const treeLayout = root => {                                       // pozycje węzłów: liście po kolei, rodzic nad środkiem dzieci
    const pos = {}; let leaf = 0, depth = 0;
    const go = (nd, d) => { depth = Math.max(depth, d); if (!nd.kids.length) pos[nd.id] = {x: leaf++, d}; else { nd.kids.forEach(k => go(k, d + 1)); pos[nd.id] = {x: (pos[nd.kids[0].id].x + pos[nd.kids[nd.kids.length - 1].id].x) / 2, d}; } };
    go(root, 0); return {pos, leaves: leaf, depth};
  };
  // Drzewo B&B jako SVG (czysta funkcja): st – stan węzłów w danej chwili {id: typ}, cur – omawiany węzeł
  function treeSVG(R, st, cur, M) {
    const {pos, leaves, depth} = treeLayout(R.root), W = 118, H = 92, bw = 106, bh = 56, n = M.n;
    const w = Math.max(1, leaves) * W + 8, h = (depth + 1) * H;
    let s = `<svg class="ls-tree" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Drzewo podziału i ograniczeń">`;
    const cx = id => 4 + pos[id].x * W + W / 2, cy = id => pos[id].d * H + 6 + bh / 2;
    const walk = (nd, f) => { f(nd); nd.kids.forEach(k => walk(k, f)); };
    walk(R.root, nd => nd.kids.forEach(k => { if (!(k.id in st)) return;
      s += `<line class="lt-e" x1="${cx(nd.id)}" y1="${cy(nd.id) + bh / 2}" x2="${cx(k.id)}" y2="${cy(k.id) - bh / 2}"/><text class="lt-lab" x="${(cx(nd.id) + cx(k.id)) / 2 + (cx(k.id) < cx(nd.id) ? -4 : 4)}" y="${(cy(nd.id) + cy(k.id)) / 2 + 4}" text-anchor="${cx(k.id) < cx(nd.id) ? 'end' : 'start'}">${k.label.replace(/<sub>(\d+)<\/sub>/g, (_, d) => '₀₁₂₃₄₅₆₇₈₉'[d])}</text>`; }));
    walk(R.root, nd => { if (!(nd.id in st)) return; const t = st[nd.id], ok = nd.r.status === 'optimal', X = cx(nd.id) - bw / 2, Y = cy(nd.id) - bh / 2;
      const xx = ok ? '(' + nd.r.x.map(v => nf(v)).join('; ') + ')' : 'brak rozwiązań';
      s += `<g class="lt-n ${t}${nd.id === cur ? ' cur' : ''}" data-hl="n${nd.id}"><rect x="${X}" y="${Y}" width="${bw}" height="${bh}" rx="10"/>` +
        `<text x="${X + 8}" y="${Y + 16}" class="lt-id">W${nd.id}</text><text x="${X + bw - 8}" y="${Y + 16}" text-anchor="end" class="lt-tag">${{open: 'do zbadania', branch: 'podział', int: 'całkowite', inf: 'sprzeczne', bound: 'odcięty', late: 'odcięty', best: 'najlepsze', ask: 'decyzja?'}[t] || ''}</text>` +
        `<text x="${X + bw / 2}" y="${Y + 34}" text-anchor="middle" class="lt-z">${ok ? 'Z = ' + nf(nd.r.z) : '✕'}</text><text x="${X + bw / 2}" y="${Y + 49}" text-anchor="middle" class="lt-x"${n > 2 ? ' style="font-size:9px"' : ''}>${xx}</text></g>`; });
    return `<div class="tw ls-treew">${s}</svg></div>`;
  }
  // wykres węzła (2 zmienne): obszar z dodatkowymi granicami gałęzi, punkty kratowe
  function nodeSVG(M, nd, L, extra = {}) {
    const rows = [], rel = [], b = [];
    nd.lb.forEach((v, j) => { if (v > 0) { rows.push(j ? [0, 1] : [1, 0]); rel.push('>='); b.push(v); } });
    nd.ub.forEach((v, j) => { if (isFinite(v)) { rows.push(j ? [0, 1] : [1, 0]); rel.push('<='); b.push(v); } });
    const MM = {...M, A: [...M.A, ...rows], rel: [...M.rel, ...rel], b: [...M.b, ...b]};
    return graphSVG(MM, {L, lines: M.A.map((_, i) => i), region: true, lattice: true, dashed: rows.map((r, k) => [r[0], r[1], b[k]]),
      pts: nd.r.status === 'optimal' ? [{x: nd.r.x[0], y: nd.r.x[1], t: `LP: (${nf(nd.r.x[0])}; ${nf(nd.r.x[1])})`, key: 'lp', cls: 'lp'}] : [], ...extra});
  }
  function bb(level) {
    const M = imodel(ILPL_TASKS.bb[level]), mode = MODE[level], score = mode === 'test', exam = mode !== 'guide', two = M.n === 2, sg = M.maxi ? 1 : -1;
    const R = ilpSolve(M, {rule: 'first', search: 'dfs'});            // ustawienia domyślne zakładki Całkowite
    if (R.status !== 'optimal') throw new Error('zadanie lekcji: B&B bez wyniku (' + R.status + ')');
    const ev = bbEvents(R, M), steps = [], st = {}, z = R.bestZ, x = R.best.slice(), root = R.root;
    const L = two ? Math.ceil(Math.max(...LPL.lpVertices(M).P.map(p => Math.max(p.x, p.y))) * 1.2 + 0.6) : 0;
    const word = M.maxi ? 'największe' : 'najmniejsze', better = M.maxi ? 'większe' : 'mniejsze', worse = M.maxi ? 'mniejsze' : 'większe';
    steps.push({title: 'Zadanie', say: level === 'challenge' ? 'Trzy zmienne? Rysunku nie będzie, ale drzewo tak!' : 'Szukamy najlepszego punktu całkowitego.',
      text: `Szukamy ${word} Z, ale x muszą być całkowite. Metoda podziału i ograniczeń dzieli zadanie na coraz mniejsze kawałki (gałęzie) i rozwiązuje w każdym zwykłe LP. Sprytne odcinanie gałęzi sprawia, że nie trzeba sprawdzać wszystkich punktów.`,
      formula: taskHTML(M).replace(/≥ 0$/, '≥ 0, całkowite')});
    // relaksacja = granica
    const fj = root.r.x.findIndex(v => Math.abs(v - Math.round(v)) > 1e-6), fv = root.r.x[fj], fl = Math.floor(fv + 1e-9);
    steps.push({id: 'granica', title: 'Relaksacja LP – granica z góry', mood: 'point', say: M.maxi ? 'To nasz „sufit” – wyżej się nie da!' : 'To nasza „podłoga” – niżej się nie da!',
      text: exam ? `Najpierw pomijamy całkowitość i liczymy zwykłe LP: x = (${root.r.x.map(nf).join('; ')}), Z = ${nf(root.r.z)}. Co ta liczba mówi o rozwiązaniach całkowitych?`
        : `Najpierw pomijamy całkowitość i liczymy zwykłe LP: x = (${root.r.x.map(nf).join('; ')}), Z = ${nf(root.r.z)}. Punkty całkowite leżą wewnątrz tego samego obszaru, więc żaden nie da Z ${better} niż ${nf(root.r.z)} – to ${M.maxi ? 'górne' : 'dolne'} ograniczenie. Drugie ograniczenie to najlepsze znalezione rozwiązanie całkowite – na razie żadnego.`,
      ...(two ? {svg: nodeSVG(M, root, L)} : {}), hl: two ? [{el: 'lp'}] : [],
      q: {type: 'choice', prompt: `Czy jakieś rozwiązanie całkowite może mieć Z ${better} niż ${nf(root.r.z)}?`, score, tag: {t: 'bound0'},
        options: [{t: 'nie', ok: true}, {t: 'tak', why: `Każdy punkt całkowity spełnia te same ograniczenia, a LP szukało najlepszego punktu w całym obszarze. Skoro LP dało ${nf(root.r.z)}, punkt całkowity nie może być lepszy.`}],
        explain: `Punkty całkowite leżą w tym samym obszarze, więc żaden nie da Z ${better} niż ${nf(root.r.z)} – wartość LP to ${M.maxi ? 'górne' : 'dolne'} ograniczenie. Drugie to najlepsze znalezione rozwiązanie całkowite (rekord).`}});
    st[root.id] = 'branch';
    steps.push({id: 'podzial', title: 'Rozgałęzienie', mood: 'point', say: 'Tnę pas, w którym nie ma liczb całkowitych!',
      text: exam ? `x${sub(fj + 1)} = ${nf(fv)} jest ułamkiem, więc dzielimy zadanie na dwie gałęzie. Granice gałęzi wybieramy tak, żeby nie zgubić żadnego punktu całkowitego.`
        : `x${sub(fj + 1)} = ${nf(fv)} jest ułamkiem. Dzielimy zadanie na dwie gałęzie: x${sub(fj + 1)} ≤ ${fl} oraz x${sub(fj + 1)} ≥ ${fl + 1}. Wycinamy tylko pas ${fl} < x${sub(fj + 1)} < ${fl + 1}, w którym nie ma żadnej liczby całkowitej – nic dobrego nie tracimy.`,
      ...(two ? {svg: graphSVG(M, {L, lines: M.A.map((_, i) => i), region: true, lattice: true, ...(exam ? {} : {strip: [fj, fl, fl + 1]}), pts: [{x: root.r.x[0], y: root.r.x[1], t: 'LP', key: 'lp', cls: 'lp'}]})} : {}), hl: two ? [{el: 'pas'}] : [],
      q: mode === 'watch' ? undefined : {type: 'choice', prompt: `Na jakie gałęzie dzielimy x${sub(fj + 1)} = ${nf(fv)}?`, score, tag: {t: 'split', j: fj, lo: fl},
        options: [{t: `x${sub(fj + 1)} ≤ ${fl} i x${sub(fj + 1)} ≥ ${fl + 1}`, ok: true},
          {t: `x${sub(fj + 1)} ≤ ${fl} i x${sub(fj + 1)} ≥ ${fl}`, why: `Wtedy druga gałąź nadal zawierałaby ułamkowy punkt LP x${sub(fj + 1)} = ${nf(fv)}, a wartość ${fl} należałaby do obu gałęzi. Druga gałąź zaczyna się od następnej liczby całkowitej: ${fl + 1}.`},
          {t: `x${sub(fj + 1)} ≤ ${nf(fv)} i x${sub(fj + 1)} ≥ ${nf(fv)}`, why: `Wtedy punkt LP x${sub(fj + 1)} = ${nf(fv)} zostałby w obu gałęziach – nic byśmy nie odcięli. Dzielimy na liczbach całkowitych ${fl} i ${fl + 1}.`}],
        explain: `Gałęzie x${sub(fj + 1)} ≤ ${fl} i x${sub(fj + 1)} ≥ ${fl + 1}: wycinamy tylko pas ${fl} < x${sub(fj + 1)} < ${fl + 1}, w którym nie ma żadnej liczby całkowitej.`}});
    // kolejne zdarzenia (bez korzenia)
    const DEC = {int: 'zapisujemy – nowy rekord (całkowite)', inf: 'odcinamy – brak rozwiązań', bound: 'odcinamy – nie pobije rekordu', open: 'zostawiamy do zbadania (podział)'};
    const decQ = (e, prompt) => ({type: 'choice', prompt, score, tag: {t: 'node', id: e.nd.id, type: e.type},
      options: ['open', 'int', 'bound', 'inf'].map(k => ({t: DEC[k], ok: k === e.type, why: ({
        open: e.type === 'inf' ? 'W tej gałęzi LP nie ma rozwiązań – nie ma czego dzielić.' : `Węzeł nie wymaga podziału: ${e.type === 'int' ? 'LP dało już liczby całkowite' : 'nawet jego LP nie bije rekordu'}.`,
        int: e.type === 'inf' ? 'LP w tej gałęzi jest sprzeczne – nie ma żadnego rozwiązania, więc nie ma rekordu.' : e.type === 'bound' ? `Nawet jeśli to liczby całkowite, Z = ${nf(e.nd.r.z)} nie jest ${better} od rekordu ${nf(e.inc)} – nowego rekordu nie ma.` : 'W rozwiązaniu LP są ułamki – to jeszcze nie rozwiązanie całkowite.',
        bound: e.type === 'inf' ? 'Tu nie ma nawet czego porównać – LP jest sprzeczne.' : e.inc === null ? 'Nie mamy jeszcze żadnego rekordu, więc nie ma z czym porównać.' : `Z = ${nf(e.nd.r.z)} jest ${better} od rekordu ${nf(e.inc)} – ta gałąź może dać coś lepszego.`,
        inf: 'LP w tej gałęzi ma rozwiązanie (patrz Z) – gałąź nie jest sprzeczna.'})[k]})),
      explain: ({int: `Same liczby całkowite i Z = ${nf(e.nd.r.z)} ${e.inc === null ? '– pierwszy rekord' : `${better} od ${nf(e.inc)}`}.`, inf: 'Dodatkowa granica sprzeczna z ograniczeniami – brak rozwiązań.',
        bound: `Z = ${nf(e.nd.r.z)} nie jest ${better} od rekordu ${nf(e.inc)} – nawet z ułamkami ta gałąź przegrywa.`, open: 'Ułamki i Z lepsze od rekordu – trzeba podzielić dalej.'})[e.type]});
    ev.forEach((e, k) => {
      if (e.nd === root) return;
      const nd = e.nd, Zt = nd.r.status === 'optimal' ? `x = (${nd.r.x.map(nf).join('; ')}), Z = ${nf(nd.r.z)}` : 'brak rozwiązań';
      if (e.act === 'create') {
        st[nd.id] = e.type === 'open' ? 'open' : e.type;
        const why = {int: `Same liczby całkowite, ${e.inc === null ? 'to pierwsze rozwiązanie całkowite' : `a Z = ${nf(nd.r.z)} jest ${better} od dotychczasowego ${nf(e.inc)}`} – zapisujemy rekord. Dalej tej gałęzi nie dzielimy: lepszego punktu całkowitego w niej nie będzie.`,
          inf: 'Nowa granica kłóci się z ograniczeniami – w tej gałęzi nie ma żadnego punktu. Odcinamy ją.',
          bound: `Nawet z ułamkami Z = ${nf(nd.r.z)}, a mamy już rekord ${nf(e.inc)}. Dzieląc dalej, możemy tylko pogorszyć Z – odcinamy gałąź${nd.r.x && nd.r.x.every(v => Math.abs(v - Math.round(v)) < 1e-6) ? ' (choć to punkt całkowity, nie jest lepszy)' : ''}.`,
          open: `Są ułamki, a Z = ${nf(nd.r.z)}${e.inc === null ? '' : ` jest ${better} od rekordu ${nf(e.inc)}`} – ta gałąź może kryć lepsze rozwiązanie, więc zostaje do zbadania.`}[e.type];
        const card = {id: `w${nd.id}`, title: `Węzeł W${nd.id}: ${nd.label}`, mood: {int: 'happy', inf: 'oops', bound: 'explain', open: 'think'}[e.type],
          say: {int: 'Mamy punkt całkowity!', inf: 'Pusto – tu nic nie ma.', bound: 'Ta gałąź nie ma szans.', open: 'Hmm, znów ułamki…'}[e.type],
          text: mode === 'test' ? `LP z dodatkową granicą ${nd.label}: ${Zt}. ${e.inc === null ? 'Rekordu jeszcze nie ma.' : `Rekord: Z = ${nf(e.inc)}.`}` : `LP z granicą ${nd.label}: ${Zt}. ${why}`,
          svg: (two && mode !== 'watch' ? nodeSVG(M, nd, L) : '') + treeSVG(R, mode === 'test' ? {...st, [nd.id]: 'ask'} : st, nd.id, M), hl: [{el: 'n' + nd.id}],
          q: score || (mode === 'guide' && e.type === 'bound') ? decQ(e, `Co robimy z węzłem W${nd.id}?`) : undefined};
        steps.push(card);
      } else if (e.type === 'branch') {
        st[nd.id] = 'branch';
        const j = nd.r.x.findIndex((v, q) => Math.abs(v - Math.round(v)) > 1e-6), v = nd.r.x[j], f = Math.floor(v + 1e-9), fracs = nd.r.x.map((u, q) => q).filter(q => Math.abs(nd.r.x[q] - Math.round(nd.r.x[q])) > 1e-6);
        steps.push({id: `p${nd.id}`, title: `Badamy W${nd.id}: podział`, mood: 'point', say: 'W głąb! Najpierw gałąź „≤”.',
          text: score ? `Przeszukujemy w głąb: bierzemy ostatnio utworzony węzeł do zbadania (W${nd.id}). Jego LP: x = (${nd.r.x.map(nf).join('; ')}). Trzeba go podzielić.`
            : `Przeszukujemy w głąb: bierzemy ostatnio utworzony węzeł do zbadania (W${nd.id}). x${sub(j + 1)} = ${nf(v)} to pierwsza ułamkowa zmienna, więc dzielimy na x${sub(j + 1)} ≤ ${f} i x${sub(j + 1)} ≥ ${f + 1}.`,
          svg: treeSVG(R, st, nd.id, M), hl: [{el: 'n' + nd.id}],
          q: score && fracs.length + nd.r.x.length > 2 ? {type: 'choice', prompt: `Po której zmiennej dzielimy W${nd.id} (reguła: pierwsza ułamkowa)?`, score, tag: {t: 'branchvar', id: nd.id, j},
            options: nd.r.x.map((u, q) => ({t: `x${sub(q + 1)} = ${nf(u)}`, ok: q === j, why: Math.abs(u - Math.round(u)) <= 1e-6 ? `x${sub(q + 1)} jest już całkowite – po niej nie dzielimy.` : `x${sub(q + 1)} też jest ułamkowa, ale reguła „pierwsza ułamkowa” wybiera x${sub(j + 1)} (wcześniejszą).`})),
            explain: `x${sub(j + 1)} = ${nf(v)} – pierwsza ułamkowa.`} : undefined});
      } else {
        st[nd.id] = 'late';
        steps.push({id: `l${nd.id}`, title: `W${nd.id}: odcięty po czasie`, mood: 'surprise', say: 'Ciekawostka: rekord poprawił się w międzyczasie!',
          text: `Gdy W${nd.id} powstał, mógł jeszcze kryć coś lepszego. Zanim do niego wróciliśmy, rekord wzrósł do Z = ${nf(e.inc)}, a LP tego węzła daje tylko ${nf(nd.r.z)} – odcinamy go bez dzielenia.`,
          svg: treeSVG(R, st, nd.id, M), hl: [{el: 'n' + nd.id}]});
      }
    });
    steps.push({id: 'odcinanie', title: 'Kiedy odcinamy gałąź?', mood: 'surprise', say: 'Trzy powody – i każdy uczciwy!',
      text: `1) LP gałęzi nie ma rozwiązań – nie ma tam żadnego punktu. 2) LP gałęzi nie jest ${better} od rekordu – ułamki są „sufitem”, więc punkt całkowity też nie będzie lepszy. 3) LP dało liczby całkowite – to najlepszy punkt w gałęzi, dalsze dzielenie nic nie da.`,
      q: mode === 'guide' ? {type: 'choice', prompt: `Rekord Z = ${nf(z)}. Czy warto dzielić gałąź, w której LP daje Z = ${nf(M.maxi ? z - 1 : z + 1)}?`, tag: {t: 'prune-rule'},
        options: [{t: 'nie – i tak nie pobije rekordu', ok: true}, {t: 'tak – może kryć punkt całkowity', why: `Punkt całkowity w tej gałęzi da najwyżej Z = ${nf(M.maxi ? z - 1 : z + 1)} (granica LP), czyli nie ${better} od ${nf(z)}. Szkoda czasu.`}],
        explain: 'Granica LP gałęzi nie bije rekordu → odcinamy.'} : undefined});
    const bestEv = ev.filter(e => e.type === 'int').pop(), fin = {}; Object.keys(st).forEach(id => { fin[id] = st[id]; }); fin[bestEv.nd.id] = 'best';
    steps.push({id: 'koniec', title: 'Koniec: drzewo zbadane', mood: 'happy', say: 'Wszystkie gałęzie zamknięte!',
      text: exam ? `Nie ma już węzłów do zbadania, więc najlepszy zapisany rekord jest optimum. Zbadaliśmy ${R.count} węzłów zamiast sprawdzać wszystkie punkty całkowite.` : `Nie ma już węzłów do zbadania, więc rekord jest optimum: x = (${x.map(nf).join('; ')}), Z = ${nf(z)}. Zbadaliśmy ${R.count} węzłów zamiast sprawdzać wszystkie punkty całkowite.`,
      svg: treeSVG(R, exam ? st : fin, exam ? -1 : bestEv.nd.id, M), hl: exam ? [] : [{el: 'n' + bestEv.nd.id}],
      q: {type: 'number', prompt: 'Ile wynosi optymalne Z całkowite?', answer: z, score, tag: {t: 'z'},
        wrong: [{v: root.r.z, why: `${nf(root.r.z)} to wynik relaksacji LP w korzeniu (z ułamkami), a pytam o najlepsze rozwiązanie całkowite.`}].filter(w => !near(w.v, z)), explain: `Z = ${nf(z)} (węzeł W${bestEv.nd.id}).`}});
    const G = M.A.flat().concat(M.b).every(Number.isInteger) && M.rel.every(r => r === '<=') ? gomSolve(M, GOM_OPT) : null;
    steps.push({title: 'Jak liczy OptiLab?', say: 'Zdradzę Ci, co robię w środku.',
      text: `W zakładce Całkowite wybierasz regułę podziału (pierwsza lub najbardziej ułamkowa) i kolejność (w głąb albo najlepsza granica); każdy węzeł to LP rozwiązane simpleksem. Po ${R.limit} węzłach przerywam i mówię, że wynik nie jest pewny${G && G.status === 'optimal' ? `; odcięcia Gomory'ego dają tu to samo Z = ${nf(G.zNum)}` : ''}.`,
      action: {label: 'Wczytaj to zadanie do zakładki Całkowite', tab: 'ilp', data: toData(M), sets: {'ilp-method': 'bb', 'ilp-branch': 'first', 'ilp-search': 'dfs'}}});
    steps.push(resultCard(x, z));
    return {title: 'Podział i ograniczenia – ' + LESSON_LEVEL(level), steps, result: {x, z}, model: M, R, events: ev};
  }
  return {gomory, bb, bbEvents, treeSVG, withoutVar};
})();
(() => {
  const tabs = ['graph', 'simplex', 'ilp'];
  LESSON.register({id: 'lp-gomory', title: 'Odcięcia Gomory\'ego', group: 'Zadania całkowitoliczbowe', note: 'części ułamkowe, dualny simpleks, znikające odcięcia', tabs, build: ILPL.gomory});
  LESSON.register({id: 'lp-bb', title: 'Podział i ograniczenia', group: 'Zadania całkowitoliczbowe', note: 'drzewo, granice, odcinanie gałęzi', tabs, build: ILPL.bb});
})();
