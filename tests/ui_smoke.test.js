// Test dymny interfejsu analizy parametrycznej: uruchamia handler na atrapie DOM (tryb prosty i tryb kierunku)
const {order, load} = require('./helpers');
const el = (value = '') => new Proxy({value, innerHTML: '', addEventListener() {}, classList: {add() {}, remove() {}, toggle() {}}}, {get: (t, k) => k in t ? t[k] : () => el(), set: (t, k, v) => (t[k] = v, true)});
const st = {}; const $ = q => st[q] || (st[q] = el());
Object.assign(st, {'#par-what': el('b'), '#par-idx': el('1'), '#simplex-par-from': el('0'), '#simplex-par-to': el('40'), '#simplex-par-dir': el('')});
const ctx = {$: null, document: {querySelector: $, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {newPlot() {}}, setTimeout, console};
const c = load(order, ctx);
require('vm').runInContext("readModel = () => ({n:2,c:[3,5],A:[[1,0],[0,2],[3,2]],rel:['<=','<=','<='],b:[4,12,18],maxi:true,t:['c','c']}); fail = (o,m)=>{ throw new Error('fail: '+m) };", c);
const run = () => { st['#btn-par'].onclick(); return st['#out-par'].innerHTML.replace(/<\/tr>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/ +/g, ' '); };
console.log(run().split('\n').slice(0, 5).join('\n'));
st['#simplex-par-dir'].value = '0; 1; 1'; st['#simplex-par-from'].value = '-5'; st['#simplex-par-to'].value = '15';
console.log(run().split('\n').slice(0, 6).join('\n'));
// Simpleks metodą dwufazową: kroki faz, tabele bez kolumn sztucznych w fazie II, raport końcowy
require('vm').runInContext("readModel = () => ({n:2,c:[2,3],A:[[1,1],[1,2]],rel:['>=','>='],b:[4,6],maxi:false,t:['c','c'],method:'2F'});", c);
st['#btn-simplex'].onclick();
const o = st['#out-simplex'].innerHTML, last = o.slice(o.lastIndexOf('<div class="step">'));
const ok = /Faza I, iteracja 1/.test(o) && /Faza II:/.test(o) && /Raport końcowy/.test(o) && !/<th>a<sub>/.test(last) && /Z<sub>opt<\/sub> = <b>10<\/b>/.test(o);
console.log(ok ? 'Simpleks dwufazowy w interfejsie: OK' : 'BŁĄD: Simpleks dwufazowy w interfejsie'); if (!ok) process.exit(1);
