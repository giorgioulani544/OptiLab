// Moduł Programowanie celowe: raporty przykładów (model, kroki priorytetów, tabela celów, rysunek), CSV, walidacja, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const EX = get('JSON.parse(JSON.stringify(GP_EXAMPLES.map(e => ({name: e.name, data: gpNormalize(e.data)}))))');
const toP = d => ({n: d.n, method: d.method, int: d.int, norm: d.norm, goals: d.goals.map(g => ({name: g.name, type: g.type, a: Array.from({length: d.n}, (_, j) => +g['a' + j]), b: +g.b, P: +g.P, w: +g.w})), hard: d.hard.map(h => ({rel: h.rel, a: Array.from({length: d.n}, (_, j) => +h['a' + j]), b: +h.b}))});
EX.forEach(e => { const P = toP(e.data), h = c.gpReportHTML(P); t(`raport „${e.name}": model, tabela celów, wynik${P.n === 2 ? ', rysunek' : ''}`, /Równanie celu/.test(h) && /Osiągnięto/.test(h) && /class="sum"/.test(h) && (P.n !== 2 || /aria-label="Wykres celów"/.test(h))); });
let h = c.gpReportHTML(toP(EX[0].data)); t('Beaver Creek: kroki P1–P4, nadgodziny 15', /Kolejne priorytety/.test(h) && (h.match(/<tr><td>\d<\/td><td>P\d<\/td>/g) || []).length === 4 && /nadmiar 15/.test(h));
h = c.gpReportHTML({...toP(EX[2].data), hard: [{rel: '<=', a: [1, 0, 0], b: -1}]}); t('sprzeczne ograniczenia twarde → komunikat', /Ograniczenia twarde są sprzeczne/.test(h));
const csv = get(`(() => { const d = gpNormalize(JSON.parse(JSON.stringify(GP_EXAMPLES[2].data))); const q = v => String(v).replace('.', ','), xs = ['x1','x2','x3']; return ['metoda;lex','zmienne;3','',['Cel',...xs,'Rodzaj','Wartość docelowa','Priorytet','Waga'].join(';'),...d.goals.map(g => [g.name,...xs.map((_,j) => q(g['a'+j])),g.type,q(g.b),q(g.P),q(g.w)].join(';')),'',['Ograniczenie',...xs,'Znak','Prawa strona'].join(';'),...d.hard.map((hh,i) => ['O'+(i+1),...xs.map((_,j) => q(hh['a'+j])),hh.rel,q(hh.b)].join(';'))].join('\\n'); })()`);
const back = c.gpFromCSV(csv); t('CSV: cele i ograniczenia twarde wracają (3 zmienne)', back.goals.length === 4 && back.hard.length === 1 && back.goals[0].a.join() === '20,12,6' && back.hard[0].b === '120');
let th = ''; try { c.gpFromCSV('metoda;lex\nCel;x1;x2;Rodzaj;Wartość docelowa;Priorytet;Waga\nA;1;x;>=;5;1;1'); } catch (e) { th = e.message; } t('CSV: błąd z numerem wiersza', /wiersz 3: „x"/.test(th));
th = ''; try { get('gpNormalize({goals: []})'); } catch (e) { th = e.message; } t('plik bez celów odrzucony', /brak listy celów/.test(th));
h = c.gpReportHTML({n: 1, method: 'weighted', goals: [{name: '<img src=x>', type: '>=', a: [1], b: 5, P: 1, w: 1}], hard: []}); t('nazwy celów bezpiecznie wyświetlane', !/<img src=x>/.test(h));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'goal') && !SOON.some(s => s[0] === 'goal')"));
console.log(`Testy modułu Programowanie celowe: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
