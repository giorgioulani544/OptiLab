// Moduł Programowanie nieliniowe: raporty przykładów (opis metody, przebieg, wynik, wykresy), brak zbieżności bez wyniku, błędy wyrażeń przy polu, rejestracja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c), EX = get('EX');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const E = get('JSON.parse(JSON.stringify(NL_EXAMPLES.map(e => ({name: e.name, data: nlNormalize(e.data)}))))'), num = s => Number(String(s).replace(',', '.'));
const toX = d => { const F = EX.make(d.f), base = {mode: d.mode, method: d.method, fs: d.f, maxi: d.maxi, tol: num(d.tol), maxIt: num(d.maxIt)};
  if (d.mode === '1d') return {...base, a: num(d.a), b: num(d.b), x0: num(d.x0), f: x => F.f([x])};
  const cons = d.cons.map(q => { const G = EX.make(q.e); return {g: G.f, n: G.n, type: q.rel, rhs: num(q.rhs), e: q.e}; }), x0 = d.x0.split(';').map(num); return {...base, n: x0.length, x0, f: F.f, cons}; };
E.forEach((e, k) => { const h = c.nlReportHTML(toX(e.data)); t(`raport „${e.name}"`, k === 3 ? /Brak zbieżności w limicie iteracji/.test(h) && !/class="sum"/.test(h) : /Przebieg obliczeń/.test(h) && /class="sum"/.test(h) && /class="vzsvg"/.test(h)); });
let h = c.nlReportHTML(toX(E[2].data)); t('Rosenbrock (BFGS): minimum (1; 1), poziomice ze ścieżką, wykres zbieżności', /x = <b>\(1; 1\)<\/b>/.test(h) && /aria-label="Poziomice f i ścieżka"/.test(h) && /Zbieżność: logarytm normy gradientu/.test(h));
h = c.nlReportHTML(toX(E[5].data)); t('rozszerzony Lagrange: (1; 1), mnożniki 2/3', /x = <b>\(1; 1\)<\/b>/.test(h) && /λ<sub>1<\/sub> = 0,666/.test(h));
h = c.nlReportHTML({mode: 'free', method: 'bfgs', fs: '<b>x</b>', maxi: false, tol: 1e-6, maxIt: 100, n: 1, x0: [0], f: x => (x[0] - 1) ** 2, cons: []}); t('treść wyrażenia bezpiecznie wyświetlana', !/<b>x<\/b>/.test(h));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'nlp') && !SOON.some(s => s[0] === 'nlp')"));
console.log(`Testy modułu Programowanie nieliniowe: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
