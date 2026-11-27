// Lekcje „Nauka” dla zadań całkowitoliczbowych (js/lessons/ilp-lessons.js): odcięcia Gomory'ego i podział i ograniczenia.
// Niezależne kontrole: pełne przeszukanie punktów całkowitych (napisane tutaj), literatura (Taha, „Badania operacyjne”: max 7x1 + 10x2 → (4; 3), Z = 58),
// usunięte odcięcia w lekcji = usunięte odcięcia w raporcie zakładki Całkowite (gomCutsHTML), decyzje w drzewie = decyzje ilpSolve.
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/core.js', 'js/solver.js', 'js/lp-tab.js', 'js/lp-gomory.js', 'js/ilp-solver.js', 'js/render.js', 'js/examples.js', 'js/pivot-svg.js', 'js/lesson.js', 'js/lessons/lp-lessons.js', 'js/lessons/ilp-lessons.js'], {console});
const G_ = n => vm.runInContext(n, c), LESSON = G_('LESSON'), ILPL = G_('ILPL'), TASKS = G_('ILPL_TASKS'), FR = G_('FR');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
const strip = h => String(h).replace(/<sub>(\d+)<\/sub>/g, '$1').replace(/<[^>]+>/g, '').trim();
const optOf = q => q.options.find(o => o.ok);
// pełne przeszukanie punktów całkowitych 0…30 (zadania lekcyjne są małe)
function brute(M) {
  const n = M.c.length; let best = null; const x = Array(n).fill(0);
  const go = j => { if (j === n) { if (M.A.every((a, i) => { const v = a.reduce((s, q, k) => s + q * x[k], 0); return M.rel[i] === '<=' ? v <= M.b[i] + 1e-9 : M.rel[i] === '>=' ? v >= M.b[i] - 1e-9 : Math.abs(v - M.b[i]) < 1e-9; })) {
      const z = M.c.reduce((s, q, k) => s + q * x[k], 0); if (!best || (M.maxi ? z > best.z + 1e-9 : z < best.z - 1e-9)) best = {z, x: x.slice()}; } return; }
    for (let v = 0; v <= 30; v++) { x[j] = v; go(j + 1); } };
  go(0); return best;
}
const LIMIT = {'lp-gomory': {warm: 22, test: 22, challenge: 18}, 'lp-bb': {warm: 14, test: 14, challenge: 16}};
for (const id of ['lp-gomory', 'lp-bb']) for (const lv of ['warm', 'test', 'challenge']) {
  const nm = `${id}/${lv}`; let L;
  try { L = LESSON.build(id, lv); } catch (e) { t(`${nm}: generowanie bez błędu (${e.message})`, false); continue; }
  t(`${nm}: generowanie bez błędu`, true);
  const pr = LESSON.validate(L); t(`${nm}: format kart poprawny ${pr.join('; ')}`, !pr.length);
  t(`${nm}: najwyżej ${LIMIT[id][lv]} kart (jest ${L.steps.length})`, L.steps.length <= LIMIT[id][lv]);
  const M = L.model, B = brute(M), last = L.steps[L.steps.length - 1];
  t(`${nm}: Z = pełne przeszukanie punktów całkowitych (${B.z})`, near(L.result.z, B.z));
  t(`${nm}: x całkowite i dopuszczalne`, L.result.x.every(v => Math.abs(v - Math.round(v)) < 1e-9) && near(M.c.reduce((s, q, k) => s + q * L.result.x[k], 0), B.z) &&
    M.A.every((a, i) => a.reduce((s, q, k) => s + q * L.result.x[k], 0) <= M.b[i] + 1e-9));
  t(`${nm}: ostatnia karta = wynik`, last.result && near(last.result.z, L.result.z) && last.result.x.every((v, j) => near(v, L.result.x[j])));
  const qs = L.steps.filter(s => s.q).map(s => s.q);
  t(`${nm}: pytania (${qs.length})`, qs.length >= (lv === 'challenge' ? 2 : 4));
  if (lv === 'test') t(`${nm}: Sprawdzian punktowany`, qs.filter(q => q.score).length >= 6); else t(`${nm}: bez punktacji poza Sprawdzianem`, qs.every(q => !q.score));
  const BBc = c.ilpSolve(M, {rule: 'most', search: 'best'}); t(`${nm}: zgodne z podziałem i ograniczeniami (raport)`, BBc.status === 'optimal' && near(BBc.bestZ, L.result.z));
  if (id === 'lp-gomory') {
    const G = c.gomSolve(M, {maxCuts: 500, maxPiv: 20000}), rep = c.gomReportHTML(M, G, BBc), cuts = c.gomCutsHTML(G);
    t(`${nm}: raport Całkowite (Gomory) pokazuje z = ${G.zNum}`, rep.includes(`z = <b>${G_('fmt')(Math.round(G.zNum * 1e6) / 1e6)}</b>`) && near(G.zNum, L.result.z));
    // usunięte odcięcia: lekcja (karty z tagiem inactive) = C.dropped = podpowiedź w raporcie „Odcięcia krok po kroku”
    const lessonDrop = {}; qs.filter(q => q.tag && (q.tag.t === 'inactive' || q.tag.t === 'zdrop')).forEach(q => { (lessonDrop[q.tag.k] = lessonDrop[q.tag.k] || new Set()).add(q.tag.v); });
    const repDrop = {}; cuts.split('<div class="step gcut">').slice(1).forEach((h, k) => { const m = h.match(/Zmienn[ae] (.*?) odcię(?:cia|ć) (?:jest|są) w bazie/); if (m) repDrop[k + 1] = new Set(strip(m[1]).split(', ')); });
    const solDrop = {}; G.cuts.forEach(C => { if (C.dropped && C.dropped.length) solDrop[C.k] = new Set(C.dropped); });
    const same = (A, Bs) => Object.keys(A).length === Object.keys(Bs).length && Object.keys(A).every(k => Bs[k] && [...A[k]].sort().join() === [...Bs[k]].sort().join());
    t(`${nm}: usunięte odcięcia w lekcji = C.dropped (${JSON.stringify(Object.fromEntries(Object.entries(solDrop).map(([k, v]) => [k, [...v]])))})`, same(lessonDrop, solDrop));
    t(`${nm}: usunięte odcięcia w lekcji = raport „Odcięcia krok po kroku”`, same(lessonDrop, repDrop));
    t(`${nm}: lekcja pokazuje znikanie wierszy i kolumn`, Object.keys(solDrop).length > 0 && L.steps.some(s => /wiersz i kolumna znikają/.test(s.title)));
    // tablica „po usunięciu” = tablica solvera przed kolejnym odcięciem (bez jego nowego wiersza i kolumny)
    G.cuts.forEach((C, q) => (C.dropped || []).forEach(dn => {
      const step = L.steps.find(s => s.q && s.q.tag && s.q.tag.t === 'zdrop' && s.q.tag.v === dn && s.q.tag.k === C.k) || L.steps.find(s => s.id === `zdejmij${C.k}${dn}`);
      const tbl = step.table, rows = tbl.rows.slice(0, -2), nx = G.cuts[q + 1] ? G.cuts[q + 1].steps[0] : G.final;
      const rowsNext = nx.A.slice(0, G.cuts[q + 1] ? -1 : undefined), width = G.cuts[q + 1] ? nx.names.length - 1 : nx.names.length;
      const okRows = rows.length === rowsNext.length && rows.every((r, i) => r.slice(2, 2 + width).every((cell, j) => strip(cell.v) === FR.str(rowsNext[i][j]).replace('-', '−')) && strip(r[2 + width].v) === FR.str(nx.b[i]).replace('-', '−'));
      t(`${nm}: odcięcie ${C.k}, po usunięciu ${dn}: tablica = stan solvera (bez wiersza i kolumny ${dn})`, okRows && !tbl.head[1].some(h => strip(h.v) === dn.replace(/\D+/, 's')));
      const before = L.steps.find(s => s.id === `plot${C.k}${dn}`), zb = strip(before.table.rows[before.table.rows.length - 2][2 + before.table.head[1].length - 2].v), za = strip(tbl.rows[tbl.rows.length - 2][2 + tbl.head[1].length - 2].v);
      t(`${nm}: odcięcie ${C.k}: Z przed i po usunięciu ${dn} takie samo (${zb})`, zb !== '' && (zb === za || (za === '?' && step.q && near(step.q.answer, FR.toNum(C.steps[C.steps.length - 1].z)) && zb === FR.str(C.steps[C.steps.length - 1].z).replace('-', '−'))));
      t(`${nm}: odcięcie ${C.k}: różdżka zakreśla przed (wiersz + kolumna ${dn}) i po`, before.hl.some(h => h.r !== undefined && h.c === undefined) && before.hl.some(h => h.c !== undefined && h.r === undefined) && step.hl.length >= 1);
    }));
    qs.forEach((q, k) => { const tg = q.tag || {}, w = `${nm}: pytanie ${k + 1} (${tg.t})`, C = G.cuts[(tg.k || 1) - 1];
      if (tg.t === 'scale') t(`${w}: NWW = ${G.scale[tg.i]}`, q.answer === Number(G.scale[tg.i]));
      else if (tg.t === 'scale1') t(`${w}: nic nie mnożymy`, G.scale.every(v => v === 1n) && strip(optOf(q).t) === 'nie');
      else if (tg.t === 'lpfrac') t(`${w}: LP ułamkowe`, G.lpX.some(v => !FR.isInt(v)) && strip(optOf(q).t) === 'nie');
      else if (tg.t === 'lpz') t(`${w}: Z relaksacji`, near(q.answer, FR.toNum(G.lpValue)));
      else if (tg.t === 'f0') t(`${w}: f0 = ${FR.str(C.f0)}`, near(q.answer, FR.toNum(C.f0)) && near(FR.toNum(C.f0), FR.toNum(C.srcB) - Math.floor(FR.toNum(C.srcB))));
      else if (tg.t === 'srcrow') t(`${w}: wiersz ${C.srcVar} (największe f)`, strip(optOf(q).t).startsWith(C.srcVar) && C.cand.every(o => FR.cmp(o.f, C.f0) <= 0));
      else if (tg.t === 'fj') { const a = FR.toNum(C.srcRow[tg.j]); t(`${w}: f = a − ⌊a⌋ (a = ${a})`, near(q.answer, a - Math.floor(a)) && q.answer >= 0 && q.answer < 1); }
      else if (tg.t === 'method') t(`${w}: dualny simpleks`, strip(optOf(q).t) === 'dualnym simpleksem');
      else if (tg.t === 'dualin') { const T = C.steps[tg.s]; t(`${w}: wchodzi ${T.names[T.pc]}`, strip(optOf(q).t) === 'wchodzi ' + T.names[T.pc] && FR.sgn(T.A[T.pr][T.pc]) < 0); }
      else if (tg.t === 'zcut') t(`${w}: Z po odcięciu`, near(q.answer, FR.toNum(C.steps[C.steps.length - 1].z)));
      else if (tg.t === 'inactive') { const T = C.steps[C.steps.length - 1], j = T.names.indexOf(tg.v), i = T.basis.indexOf(j); t(`${w}: ${tg.v} w bazie z wartością > 0`, i >= 0 && FR.sgn(T.b[i]) > 0 && strip(optOf(q).t).startsWith('nie')); }
      else if (tg.t === 'zdrop') t(`${w}: Z bez zmian`, near(q.answer, FR.toNum(C.steps[C.steps.length - 1].z)));
      else if (tg.t === 'z') t(`${w}: Z = ${B.z}`, near(q.answer, B.z));
      else t(`${w}: pytanie ma opis pochodzenia odpowiedzi`, false); });
  } else {
    const R = c.ilpSolve(M, {rule: 'first', search: 'dfs'}), ev = L.events, nodes = [], walk = nd => { nodes.push(nd); nd.kids.forEach(walk); }; walk(R.root);
    t(`${nm}: drzewo lekcji = drzewo ilpSolve (${R.count} węzłów)`, nodes.length === R.count && near(R.bestZ, L.result.z));
    // odtworzona kolejność zdarzeń zgodna z decyzjami solvera
    t(`${nm}: każdy węzeł utworzony dokładnie raz`, nodes.every(nd => ev.filter(e => e.act === 'create' && e.nd.id === nd.id).length === 1));
    nodes.forEach(nd => { const cr = ev.find(e => e.act === 'create' && e.nd.id === nd.id), pr = ev.find(e => e.act === 'process' && e.nd.id === nd.id);
      const exp = nd.r.status !== 'optimal' ? 'inf' : nd.cls === 'int' ? 'int' : nd.kids.length ? 'branch' : /po znalezieniu/.test(nd.res) ? 'late' : 'bound';
      const got = cr.type === 'open' ? (pr ? pr.type : 'brak') : cr.type;
      t(`${nm}: węzeł W${nd.id} – decyzja ${exp}`, got === exp); });
    qs.forEach((q, k) => { const tg = q.tag || {}, w = `${nm}: pytanie ${k + 1} (${tg.t})`;
      if (tg.t === 'bound0' || tg.t === 'prune-rule') t(`${w}: „nie”`, strip(optOf(q).t).startsWith('nie'));
      else if (tg.t === 'split') { const v = R.root.r.x[tg.j]; t(`${w}: ⌊${v}⌋ i ⌈${v}⌉`, Math.abs(v - Math.round(v)) > 1e-6 && strip(optOf(q).t) === `x${tg.j + 1} ≤ ${Math.floor(v)} i x${tg.j + 1} ≥ ${Math.floor(v) + 1}` && R.root.r.x.findIndex(u => Math.abs(u - Math.round(u)) > 1e-6) === tg.j); }
      else if (tg.t === 'node') { const nd = nodes.find(n2 => n2.id === tg.id), exp = nd.r.status !== 'optimal' ? 'inf' : nd.cls === 'int' ? 'int' : nd.kids.length || /po znalezieniu/.test(nd.res) ? 'open' : 'bound';
        t(`${w}: W${tg.id} → ${exp}`, tg.type === exp && strip(optOf(q).t).startsWith({open: 'zostawiamy', int: 'zapisujemy', bound: 'odcinamy – nie pobije', inf: 'odcinamy – brak'}[exp])); }
      else if (tg.t === 'branchvar') { const nd = nodes.find(n2 => n2.id === tg.id); t(`${w}: pierwsza ułamkowa`, nd.r.x.findIndex(u => Math.abs(u - Math.round(u)) > 1e-6) === tg.j && strip(optOf(q).t).startsWith(`x${tg.j + 1} `)); }
      else if (tg.t === 'z') t(`${w}: Z = ${B.z}`, near(q.answer, B.z));
      else t(`${w}: pytanie ma opis pochodzenia odpowiedzi`, false); });
  }
}
// literatura: Taha – Sprawdzian podziału i ograniczeń
const T = LESSON.build('lp-bb', 'test');
t('Taha (max 7x1 + 10x2, −x1 + 3x2 ≤ 6, 7x1 + x2 ≤ 35): relaksacja (9/2; 7/2) Z = 133/2, całkowite (4; 3) Z = 58',
  near(T.R.root.r.z, 66.5) && near(T.R.root.r.x[0], 4.5) && near(T.R.root.r.x[1], 3.5) && near(T.result.z, 58) && T.result.x.join() === '4,3');
// Rozgrzewka Gomory'ego: odcięcie 1 znika po odcięciu 2 (płot daleko: s1 = 1 > 0)
const W = LESSON.build('lp-gomory', 'warm');
t('Gomory/Rozgrzewka: s1 usunięte po odcięciu 2', W.G.cuts.length === 2 && (W.G.cuts[1].dropped || []).join() === 's1');
// liczby nie są wpisane na stałe: zmiana danych zmienia lekcję
const save = JSON.stringify(TASKS.bb.warm); TASKS.bb.warm.b = [4, 2];
const L2 = LESSON.build('lp-bb', 'warm'); t('zmienione dane → nowy wynik z solvera', near(L2.result.z, brute(L2.model).z) && !LESSON.validate(L2).length);
Object.assign(TASKS.bb.warm, JSON.parse(save));
t('menu: Gomory i B&B dostępne (bez „wkrótce”)', ['lp-gomory', 'lp-bb'].every(i => LESSON.topics.some(x => x.id === i && !x.soon)) && !LESSON.topics.some(x => x.soon));
t('Sprawdzian B&B: bieżący węzeł bez podpowiedzi (stan „decyzja?”)', LESSON.build('lp-bb', 'test').steps.filter(s => s.q && s.q.tag && s.q.tag.t === 'node').every(s => /lt-n ask cur/.test(s.svg) && !new RegExp(`lt-n (open|int|bound|inf)( cur)?" data-hl="n${s.q.tag.id}"`).test(s.svg)));
t('drzewo SVG: węzły z data-hl', /data-hl="n1"/.test(ILPL.treeSVG(T.R, {1: 'branch'}, 1, T.model)));
// Efekt egzaminu (Sprawdzian i Wyzwanie): odpowiedzi nie da się odczytać z karty, na której pada pytanie – dla każdego rodzaju pytania osobna kontrola
const cellV = x => strip(x && typeof x === 'object' ? x.v : x);
for (const id of ['lp-graph', 'lp-simplex', 'lp-2f', 'lp-bigm', 'lp-gomory', 'lp-bb']) for (const lv of ['test', 'challenge']) {
  const L = LESSON.build(id, lv), bad2 = [];
  L.steps.forEach(s => { if (!s.q || !s.q.tag) return; const tg = s.q.tag, T = s.table, text = strip(s.text) + ' ' + strip(s.title) + ' ' + strip(s.say), labels = (s.hl || []).filter(h => h.label).length;
    const zcell = T && T.rows.flat().find(x => x && typeof x === 'object' && x.cls === 'zval');
    const fail = m => bad2.push(`${strip(s.title)} (${tg.t}): ${m}`);
    if (['z', 'zcut', 'zdrop', 'lpz'].includes(tg.t) && zcell && cellV(zcell) !== '?') fail('widać Z w tablicy');
    if (tg.t === 'zv' && cellV(T.rows[tg.k][3]) !== '?') fail('widać Z wierzchołka');
    if (tg.t === 'vertex' && cellV(T.rows[tg.k][1]) !== '?') fail('widać współrzędną');
    if (tg.t === 'best' && T && T.head[0].length > 3 && cellV(T.rows[tg.k][3]) !== '?') fail('widać Z najlepszego wierzchołka');
    if (tg.t === 'enter' && (T.rows.flat().some(x => x && x.cls && /pivot|pcol/.test(x.cls)) || (s.hl || []).length)) fail('zaznaczona kolumna wejściowa');
    if (tg.t === 'origin' && (/lg-half/.test(s.svg) || /prawdą|fałszem/.test(text))) fail('widać dobrą stronę prostej');
    if (tg.t === 'feasible' && /lg-reg/.test(s.svg)) fail('narysowany obszar');
    if (tg.t === 'intercept' && /lg-p/.test(s.svg)) fail('podpisane punkty na osiach');
    if (tg.t === 'split' && (new RegExp('≤ ' + tg.lo + '\\b').test(text) || /lg-strip/.test(s.svg))) fail('podane gałęzie');
    if (tg.t === 'bound0' && /żaden/.test(text)) fail('podany werdykt');
    if (tg.t === 'branchvar' && /pierwsza ułamkowa zmienna/.test(text)) fail('podana zmienna');
    if (tg.t === 'inactive' && (/nie ogranicza|daleko/.test(text) || labels)) fail('podany werdykt o odcięciu');
    if (tg.t === 'dropArt' && (/znikają|nie są już potrzebne/.test(text) || labels)) fail('podane, co z kolumnami');
    if (tg.t === 'optimal' && labels) fail('etykieta z odpowiedzią');
    if ((tg.t === 'srcrow' || tg.t === 'f0') && T && T.rows.some(r => cellV(r[3]) !== '?')) fail('widać części ułamkowe');
  });
  t(`${id}/${lv}: efekt egzaminu – odpowiedzi nie da się odczytać z karty ${bad2.join('; ')}`, !bad2.length);
}
// Sprawdzian nie podpowiada: odpowiedź liczbowa nie stoi w treści karty ani w etykietach różdżki (wszystkie tematy)
const LPL = G_('LPL'), txt = h => String(h || '').replace(/<sub>(\d+)<\/sub>/g, '_$1').replace(/<[^>]+>/g, ' ');
for (const id of ['lp-graph', 'lp-simplex', 'lp-2f', 'lp-bigm', 'lp-gomory', 'lp-bb']) for (const lvl of ['test', 'challenge']) {
  const L = LESSON.build(id, lvl), leaks = L.steps.filter(s => s.q && s.q.type === 'number').filter(s => {
    const a = LPL.nf(s.q.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp('(^|[^\\w/,_(])' + a + '([^\\w/,)]|$)');
    return re.test(txt(s.text) + ' ' + txt(s.say) + ' ' + (s.hl || []).map(h => h.label || '').join(' ')); }).map(s => s.title);
  t(`${id}/${lvl}: karty nie zdradzają odpowiedzi liczbowej w tekście ${leaks.join('; ')}`, !leaks.length);
}
console.log(`Testy lekcji „Nauka” (całkowitoliczbowe): ${ok} OK, ${bad} błędów`); if (bad) process.exit(1);
