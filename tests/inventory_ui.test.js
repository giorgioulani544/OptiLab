// Moduł Zapasy: przykład z podręcznika (Heizer i Render – rabaty), raporty dla wszystkich modeli, CSV, walidacja
const vm = require('vm'), {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const get = code => vm.runInContext(code, c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
// Heizer i Render: D = 5000, S = 49, i = 20%, ceny 5,00 / 4,80 (od 1000) / 4,75 (od 2000) → Q = 1000, koszt 24 725 (warianty 25 700 i 24 822,5)
const R = c.invDisc({D: 5000, S: 49, i: 0.2, hMode: 'rate', type: 'all', tiers: [{from: 0, price: 5}, {from: 1000, price: 4.8}, {from: 2000, price: 4.75}]});
t('Heizer i Render: zamówienie 1000, koszt 24 725', Math.abs(R.best.Qadj - 1000) < 1e-6 && Math.abs(R.best.TC - 24725) < 1e-6);
t('Heizer i Render: koszty wariantów 25 700 i 24 822,5', Math.abs(R.rows[0].TC - 25700) < 1e-6 && Math.abs(R.rows[2].TC - 24822.5) < 1e-6);
const EX = get('JSON.parse(JSON.stringify(IV_EXAMPLES))'), num = v => v === '' ? null : Number(v);
const X = d => { const o = {}; Object.keys(d).forEach(k => { o[k] = /^-?[\d.]+$/.test(d[k]) ? num(d[k]) : d[k]; }); ['c', 'L', 'days', 'sdL', 'Q', 'v', 'g', 'Ql', 'Pl'].forEach(k => { if (o[k] === undefined || o[k] === '') o[k] = null; });
  o.tiers = d.tiers.map(x => ({from: +x.from, price: +x.price})); o.table = d.table.map(x => ({d: +x.d, p: +x.p})); o.req = (d.req || []).map(x => +x.r); o.labels = (d.req || []).map(x => x.label); return o; };
const expect = ['Q* = √(2·D·S / H)', 'Q* = √(2·D·S / H)', 'Zapas maksymalny Q*(1 − D/p)', 'maksymalny brak', 'Ilość do oceny', 'R<sub>k</sub>', 'zapas bezpieczeństwa SS', 'Q* = μ + z·σ', 'Wagner-Whitin – tablica programowania dynamicznego', 'P(popyt ≤ Q)'];
EX.forEach((e, k) => { const h = c.ivReportHTML(e.data.model, X(e.data), e.data); t(`raport „${e.name}": wzór, wynik i wykres`, h.includes(expect[k]) && /class="sum"/.test(h) && /class="vzsvg"/.test(h)); });
let h = c.ivReportHTML('eoq', X(EX[0].data), EX[0].data); t('EOQ: Q* = 200 i punkt zamawiania 20', /<b>200<\/b>/.test(h) && /<b>20<\/b> szt\./.test(h) && /Krzywa kosztu jest płaska/.test(h));
h = c.ivReportHTML('news', X(EX[9].data), EX[9].data); t('gazeciarz dyskretny: wybór Q = 50 (P ≥ wskaźnik krytyczny)', /zamów <b>50<\/b>/.test(h));
h = c.ivReportHTML('lot', X(EX[8].data), EX[8].data); const W = c.lotSize([50, 60, 70, 60, 95, 75, 60, 55], 'WW', {S: 120, H: 1});
t('dobór partii: porównanie 8 reguł, optimum Wagnera-Whitina wyróżnione', (h.match(/<tr( class="sel")?><th>/g) || []).length >= 9 && h.includes(`kosztuje <b>${String(W.total).replace('.', ',')}</b>`) && /Silver-Meal – kroki/.test(h));
const csv = get(`paramsToCSV([['model','disc'],['D','5000'],['S','49']], IV_TIER, [{from:'0',price:'5'},{from:'1000',price:'4.8'}])`), back = get(`paramsFromCSV(${JSON.stringify(csv)}, ['model','D','S'], [...IV_TIER, ...IV_DISC])`);
t('CSV: eksport → import (parametry i progi, przecinek dziesiętny)', back.meta.model === 'disc' && back.meta.D === '5000' && back.rows.length === 2 && back.rows[1].price === '4.8' && /4,8/.test(csv));
let th = ''; try { get('paramsFromCSV("model;eoq\\nD;abc", ["model","D"])'); } catch (e) { th = e.message; } t('CSV: błąd z numerem wiersza', /wiersz 2: „abc"/.test(th));
th = ''; try { get('ivNormalize({model: "xyz"})'); } catch (e) { th = e.message; } t('plik z nieznanym modelem odrzucony', /nieznany model/.test(th));
t('moduł zarejestrowany i usunięty z listy „wkrótce"', get("MODULES.some(m => m.id === 'inv') && !SOON.some(s => s[0] === 'inv')"));
console.log(`Testy modułu Zapasy: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
