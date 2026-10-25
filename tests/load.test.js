// Test kolejności ładowania: wykonuje wszystkie pliki js/ na „udawanym" DOM i sprawdza, że nic się nie wysypuje
const {order, load} = require('./helpers');
const stub = new Proxy(function () {}, {get: (t, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const ctx = {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console};
try { load(order, ctx); console.log('Kolejność ładowania OK:', order.join(' → ')); }
catch (e) { console.log('BŁĄD ładowania:', e.message); process.exit(1); }
