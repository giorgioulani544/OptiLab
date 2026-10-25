/* ===== OptiLab – formularze =====
   Stan i formularz każdego modułu, walidacja w locie, kopiuj/wklej dane, błędy przy polach. */
/* =====================================================================
   2. FORMULARZ I WALIDACJA „W LOCIE"
   ===================================================================== */
// Każdy moduł ma własny formularz i własny stan (teksty wpisane przez użytkownika)
const MODS = ['graph', 'simplex', 'ilp'], MAXN = 12, MAXC = 12;
const T0 = k => k === 'ilp' ? 'i' : 'c';
const TYPES = {simplex: [['c', '≥ 0'], ['u', 'dowolna']], ilp: [['c', 'ciągła'], ['i', 'całkowita'], ['b', 'binarna'], ['u', 'dowolna']]};
const defModel = k => ({n: 2, maxi: true, c: ['3', '5'], t: [T0(k), T0(k)],
  rows: [{a:['1','0'],rel:'<=',b:'4'}, {a:['0','2'],rel:'<=',b:'12'}, {a:['3','2'],rel:'<=',b:'18'}]});
const models = {}; MODS.forEach(k => models[k] = defModel(k));
let sharedData = null;                       // zapasowa kopia, gdy przeglądarka zablokuje schowek
const flash = (btn, txt, bad) => {           // chwilowy komunikat na samym przycisku
  const o = btn.dataset.o || btn.textContent; btn.dataset.o = o; btn.textContent = txt; btn.classList.toggle('bad', !!bad);
  setTimeout(() => { btn.textContent = o; btn.classList.remove('bad'); }, 1800);
};
function renderForm(k) {
  const md = models[k], n = md.n, p = k + '-';
  let h = `<div class="crow"><select id="${p}maxi"><option value="1">Maksymalizuj</option><option value="0">Minimalizuj</option></select><span>Z =</span>`;
  for (let j = 0; j < n; j++)
    h += `<input class="num" id="${p}c${j}" data-num inputmode="decimal" value="${md.c[j] ?? ''}" aria-label="współczynnik x${j+1}"><label for="${p}c${j}">x${sub(j+1)}${j<n-1?' +':''}</label>`;
  h += '</div><h3>Ograniczenia</h3>';
  md.rows.forEach((r, i) => {
    h += `<div class="crow">`;
    for (let j = 0; j < n; j++)
      h += `<input class="num" id="${p}a${i}_${j}" data-num inputmode="decimal" value="${r.a[j] ?? ''}" aria-label="ograniczenie ${i+1}, x${j+1}"><label for="${p}a${i}_${j}">x${sub(j+1)}${j<n-1?' +':''}</label>`;
    h += `<select id="${p}rel${i}" aria-label="znak">${['<=','>=','='].map(s=>`<option value="${s}" ${r.rel===s?'selected':''}>${s==='<='?'≤':s==='>='?'≥':'='}</option>`).join('')}</select>
      <input class="num" id="${p}b${i}" data-num inputmode="decimal" value="${r.b}" aria-label="prawa strona ${i+1}">
      <button type="button" class="ghost" data-del="${i}" aria-label="usuń ograniczenie ${i+1}">✕</button></div>`;
  });
  $('#' + p + 'form').innerHTML = h;
  let th = '';                                // typy zmiennych – tylko w opcjach zaawansowanych
  if (TYPES[k]) {
    th = '<div class="crow"><span class="hint">Typ zmiennych:</span>';
    for (let j = 0; j < n; j++) th += `<label for="${p}t${j}">x${sub(j+1)}</label><select id="${p}t${j}">${TYPES[k].map(([v, l]) => `<option value="${v}" ${md.t[j] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    th += '</div>';
  }
  $('#' + p + 'types').innerHTML = th;
  $('#' + p + 'maxi').value = md.maxi ? '1' : '0';
  $('#' + p + 'nvars').value = n;
  $('#' + p + 'addc').disabled = md.rows.length >= MAXC;
  document.querySelectorAll('#' + p + 'form input.num').forEach(grow);
  if (k === 'simplex') fillPar();               // lista zmiennych/ograniczeń w analizie parametrycznej
}
function sync(k) {                           // przepisuje pola do modelu
  const md = models[k], p = k + '-';
  md.maxi = $('#' + p + 'maxi').value === '1';
  md.c = Array.from({length: md.n}, (_, j) => $('#' + p + 'c' + j).value);
  md.t = Array.from({length: md.n}, (_, j) => $('#' + p + 't' + j)?.value ?? T0(k));
  md.rows = md.rows.map((_, i) => ({
    a: Array.from({length: md.n}, (_, j) => $('#' + p + `a${i}_${j}`).value),
    rel: $('#' + p + 'rel' + i).value, b: $('#' + p + 'b' + i).value }));
}
function initModule(k) {
  const p = k + '-', md = () => models[k];
  $('#' + p + 'top').innerHTML = `<div class="crow"><label for="${p}nvars">Zmienne</label>
    <select id="${p}nvars">${Array.from({length: MAXN - 1}, (_, i) => `<option>${i + 2}</option>`).join('')}</select>
    <button id="${p}addc" class="ghost" type="button">+ ograniczenie</button>
    <button id="${p}copy" class="ghost" type="button">Kopiuj dane</button>
    <button id="${p}paste" class="ghost" type="button">Wklej dane</button></div>
    <div id="${p}form"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div id="${p}types"></div><div id="${p}advbody"></div></details><p class="hint">Zmienne są nieujemne (x ≥ 0). Przecinek lub kropka jako separator. „Kopiuj dane" i „Wklej dane" przenoszą zadanie między modułami.${k === 'ilp' ? ' Wszystkie zmienne są domyślnie całkowite.' : ''}</p>`;
  const f = $('#' + p + 'form');
  // Blokada liter: zostają cyfry, jeden minus na początku i jeden separator dziesiętny
  f.addEventListener('input', e => {
    if (!e.target.hasAttribute('data-num')) return;
    let v = e.target.value.replace(/[^0-9,.\-]/g, '').replace(/(?!^)-/g, '');
    const q = v.search(/[.,]/);
    if (q >= 0) v = v.slice(0, q + 1) + v.slice(q + 1).replace(/[.,]/g, '');
    e.target.value = v; grow(e.target); e.target.classList.remove('bad'); e.target.closest('.crow')?.querySelector('.fmsg')?.remove();
  });
  f.addEventListener('click', e => {
    const d = e.target.dataset.del; if (d === undefined) return;
    if (md().rows.length <= 1) return flash(e.target, '!', true);
    sync(k); md().rows.splice(+d, 1); renderForm(k);
  });
  // Excel-like: focus zaznacza całość (z opóźnieniem – działa na dotyku), „0"/„0.0" czyścimy, puste pole po blur wraca do 0
  f.addEventListener('focusin', e => {
    const t = e.target; if (!t.hasAttribute('data-num')) return;
    if (['0', '0.0', '0,0'].includes(t.value.trim())) { t.value = ''; grow(t); } else setTimeout(() => t.select(), 0);
  });
  f.addEventListener('focusout', e => { const t = e.target; if (t.hasAttribute('data-num') && t.value.trim() === '') { t.value = '0'; grow(t); } });
  $('#' + p + 'addc').onclick = () => { sync(k); md().rows.push({a: Array(md().n).fill('0'), rel: '<=', b: '0'}); renderForm(k); };
  $('#' + p + 'nvars').onchange = e => {
    clearErr(); sync(k); const n = +e.target.value, fit = arr => Array.from({length: n}, (_, j) => arr[j] ?? '0');
    md().n = n; md().c = fit(md().c); md().t = Array.from({length: n}, (_, j) => md().t[j] ?? T0(k)); md().rows.forEach(r => r.a = fit(r.a)); renderForm(k);
  };
  $('#' + p + 'copy').onclick = async e => {
    sync(k); const txt = JSON.stringify({optilab: 1, ...md()}); sharedData = txt;
    try { await navigator.clipboard.writeText(txt); } catch (_) {}
    flash(e.target, 'Skopiowano ✓');
  };
  $('#' + p + 'paste').onclick = async e => {
    let txt = null; try { txt = await navigator.clipboard.readText(); } catch (_) {}
    const load = t => {                      // walidacja wklejonych danych
      const d = JSON.parse(t); if (!d.optilab || !Array.isArray(d.c) || !Array.isArray(d.rows) || !d.rows.length) throw 0;
      const n = Math.min(MAXN, Math.max(2, d.c.length));
      return {n, maxi: !!d.maxi, c: Array.from({length: n}, (_, j) => String(d.c[j] ?? '0')),
        t: Array.from({length: n}, (_, j) => (TYPES[k] || [['c']]).some(([v]) => v === d.t?.[j]) ? d.t[j] : T0(k)),
        rows: d.rows.slice(0, MAXC).map(r => ({a: Array.from({length: n}, (_, j) => String(r.a?.[j] ?? '0')),
          rel: ['<=', '>=', '='].includes(r.rel) ? r.rel : '<=', b: String(r.b ?? '0')}))};
    };
    let m = null; try { m = load(txt); } catch (_) { try { m = load(sharedData); } catch (_) {} }
    if (!m) return flash(e.target, 'Brak skopiowanych danych', true);
    clearErr(); models[k] = m; renderForm(k); flash(e.target, 'Wklejono ✓');   // liczba zmiennych ustawia się sama
  };
  renderForm(k);
  // przenosimy dodatkowe kontrolki modułu do „Opcji zaawansowanych"
  const extra = {graph: ['g-int-wrap'], simplex: ['btn-dual', 'par-box'], ilp: ['ilp-opts']}[k]; extra.forEach(id => $('#' + p + 'advbody').append($('#' + id)));
}
/* Odczyt i walidacja. Błąd => czerwone pola + komunikat edukacyjny, zwraca null */
const clearErr = () => {
  document.querySelectorAll('.bad').forEach(x => x.classList.remove('bad'));
  document.querySelectorAll('.fmsg').forEach(x => x.remove());
};
let K = 'graph';                             // moduł, którego dotyczy bieżący błąd
/* Błąd = czerwone pole + komunikat w wierszu tego pola. Zwraca null. */
function fail(out, msg, ids = [], keep = false) {
  clearErr();
  ids.forEach(id => $('#' + K + '-' + id)?.classList.add('bad'));
  const row = ids.length ? $('#' + K + '-' + ids[0])?.closest('.crow') : null;
  if (row) row.insertAdjacentHTML('beforeend', `<div class="fmsg">Błąd: ${msg}</div>`);
  if (!keep) $(out).innerHTML = '';
  row?.scrollIntoView({block: 'center'});
  return null;
}
function readModel(k) {
  K = k; const out = '#out-' + k, p = k + '-'; clearErr(); sync(k);
  const md = models[k], bad = [];
  const num = id => {
    const s = $('#' + p + id).value.trim().replace(',', '.'), v = Number(s);
    if (s === '' || s === '-' || s === '.' || !isFinite(v) || Math.abs(v) > 1e9) { bad.push(id); return NaN; }
    return v;
  };
  const n = md.n, m = md.rows.length;
  const c = Array.from({length: n}, (_, j) => num('c' + j));
  const A = md.rows.map((_, i) => Array.from({length: n}, (_, j) => num(`a${i}_${j}`)));
  const b = md.rows.map((_, i) => num('b' + i)), rel = md.rows.map(r => r.rel);
  if (bad.length) return fail(out, 'wpisz w zaznaczonych polach poprawne liczby (np. 3 lub -2,5; maks. 10⁹).', bad);
  if (c.every(v => v === 0)) return fail(out, 'funkcja celu ma same zera – nie ma czego optymalizować.', c.map((_, j) => 'c' + j));
  for (let i = 0; i < m; i++) if (A[i].every(v => v === 0)) {
    const ok = rel[i] === '<=' ? 0 <= b[i] : rel[i] === '>=' ? 0 >= b[i] : b[i] === 0;
    if (!ok) return fail(out, `ograniczenie ${i+1} ma same zera po lewej stronie, więc 0 ${rel[i]} ${fmt(b[i])} nigdy nie jest prawdą.`, [`a${i}_0`, 'b' + i]);
  }
  lastModel = {n, c, A, rel, b, maxi: md.maxi, t: md.t.slice()};
  return lastModel;
}
