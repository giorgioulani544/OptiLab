/* ===== OptiLab – wklejanie ze schowka w interfejsie (Ctrl+V albo „Wklej” po przytrzymaniu palcem w komórce) =====
   Działa w każdej tabeli danych (matrixHTML, rowTableHTML, listy łuków – table.mx) i w formularzu programowania liniowego.
   Blok skopiowany z Excela (lub CSV, tekstu) trafia do tabeli od komórki, w której wklejamy – w prawo i w dół, jak w Excelu.
   Gdy blok jest większy, tabela sama się powiększa: przez listę rozmiaru (atrybuty tabeli data-gr / data-gc / data-sq = id listy)
   albo przycisk „+ wiersz” (data-add). Najpierw sprawdzamy wszystkie komórki (PASTE.plan, js/paste.js) – przy błędzie tabela
   wraca do poprzedniego rozmiaru, pola z błędem są czerwone, a komunikat stoi pod tabelą. Pojedyncza liczba wklejona
   do pola liczbowego jest zamieniana z zapisu Excela (1 234,5; 12%; −3) na liczbę – zamiast obcinania znaków. */
const PASTEUI = (() => {
  const pl3 = (n, a, b, c) => `${n} ${n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c}`;
  const specOf = el => el.tagName === 'SELECT' ? {k: 'sel', opts: [...el.options].map(o => [o.value, o.textContent.trim()])}
    : el.hasAttribute('data-num') ? {k: 'num', m: el.hasAttribute('data-m'), blank: el.hasAttribute('data-blank')} : {k: 'text'};
  const editable = td => { const e = td.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=file]),select'); return e && !e.disabled ? e : null; };
  const label = (td, e) => e ? (e.tagName === 'SELECT' ? (e.selectedOptions[0]?.textContent || '') : e.value) : td.textContent;
  function tableGrid(tb) {                                            // pola, typy pól i teksty komórek (do rozpoznania nagłówków z Excela)
    const tds = [...tb.rows].map(tr => [...tr.cells]), els = tds.map(r => r.map(editable));
    return {els, specs: els.map(r => r.map(e => e ? specOf(e) : null)), labels: tds.map((r, i) => r.map((td, j) => label(td, els[i][j]).trim()))};
  }
  const posOf = (els, t) => { for (let r = 0; r < els.length; r++) { const c = els[r].indexOf(t); if (c >= 0) return [r, c]; } return null; };
  /* błąd: czerwone pola + komunikat pod tabelą (albo w wierszu pola formularza) */
  function showErr(anchor, msg, bad = []) {
    clearErr(); bad.forEach(e => e.classList.add('bad'));
    const h = `<div class="fmsg">Błąd: ${esc(msg)}</div>`, tw = anchor.closest('table.mx')?.closest('.tw'), row = anchor.closest('.crow');
    if (tw) tw.insertAdjacentHTML('afterend', h); else if (row) row.insertAdjacentHTML('beforeend', h); else anchor.insertAdjacentHTML('afterend', h);
    (bad[0] || anchor).scrollIntoView?.({block: 'center'});
    return null;
  }
  let noteTimer = null;
  function note(anchor, msg) {                                        // krótka informacja o udanym wklejeniu (znika sama)
    document.querySelectorAll('.pnote').forEach(x => x.remove()); clearTimeout(noteTimer);
    const h = `<div class="pnote" role="status">${esc(msg)}</div>`, tw = anchor.closest('table.mx')?.closest('.tw'), row = anchor.closest('.crow');
    if (tw) tw.insertAdjacentHTML('afterend', h); else if (row) row.insertAdjacentHTML('beforeend', h);
    noteTimer = setTimeout(() => document.querySelectorAll('.pnote').forEach(x => x.remove()), 6000);
  }
  function put(el, v) {
    el.value = v; el.classList.remove('bad');
    if (el.tagName !== 'INPUT') return;
    if (el.classList.contains('num')) { grow(el); el.classList.toggle('forb', v === 'M'); }
    else if (el.classList.contains('nm')) growName(el);
  }
  const summary = (blk, pl, extra) => `Wklejono blok ${blk.R} × ${blk.C} (separator: ${blk.sepName}).` + (extra ? ' ' + extra : '') + (pl.notes.length ? ' Uwaga: ' + pl.notes.join('; ') + '.' : '');
  const tooBig = need => `wklejony blok nie mieści się w tabeli – od zaznaczonej komórki brakuje ${[need.rows ? pl3(need.rows, 'wiersza', 'wierszy', 'wierszy') : '', need.cols ? pl3(need.cols, 'kolumny', 'kolumn', 'kolumn') : ''].filter(Boolean).join(' i ')}`;
  /* powiększenie tabeli: lista rozmiaru (zmiana wywołuje kod modułu, który zachowuje wpisane wartości) albo „+ wiersz”; zwraca cofnięcie */
  function growTable(tb, need) {
    const sel = tb.id ? '#' + CSS.escape(tb.id) : tb.dataset.p ? `table.mx[data-p="${CSS.escape(tb.dataset.p)}"]` : null, d = {...tb.dataset}, undo = [];
    const cur = () => sel && document.querySelector(sel);
    const bumpOK = (id, k) => { const s = document.getElementById(id); if (!s) return `brak listy rozmiaru`; const v = +s.value + k;
      return [...s.options].some(o => +o.value === v) ? null : `tabela może mieć najwyżej ${Math.max(...[...s.options].map(o => +o.value))} – zmniejsz wklejany blok`; };
    const bump = (id, k) => { const s = document.getElementById(id), old = s.value; s.value = String(+s.value + k); s.dispatchEvent(new Event('change', {bubbles: true}));
      undo.unshift(() => { const x = document.getElementById(id); if (x) { x.value = old; x.dispatchEvent(new Event('change', {bubbles: true})); } }); };
    const R = need.rows, C = need.cols;
    if (d.sq) { const k = Math.max(R, C), e = bumpOK(d.sq, k); if (e) return {err: `${tooBig(need)}, a ${e}.`}; bump(d.sq, k); }
    else {
      if (R && !d.gr && !d.add) return {err: `${tooBig(need)}. Liczbę wierszy tej tabeli ustala inna część formularza – wklej mniejszy fragment.`};
      if (C && !d.gc) return {err: `${tooBig(need)}. Ta tabela ma stałe kolumny – sprawdź, czy kopiujesz właściwe kolumny (i od właściwej komórki).`};
      const e = (R && d.gr && bumpOK(d.gr, R)) || (C && bumpOK(d.gc, C)); if (e) return {err: `${tooBig(need)}, a ${e}.`};
      if (R && d.gr) bump(d.gr, R);
      else if (R) for (let k = 0; k < R; k++) {
        const t0 = cur(), before = t0 ? t0.rows.length : 0, btn = t0 && document.getElementById(t0.dataset.add);
        if (!btn) { undo.forEach(f => f()); return {err: `${tooBig(need)}. Tej tabeli nie da się powiększyć – wklej mniejszy fragment.`}; }
        btn.click();
        const t1 = cur(), after = t1 ? t1.rows.length : 0;
        if (after <= before) { undo.forEach(f => f()); return {err: `${tooBig({rows: R - k, cols: 0})}, a tabela ma już największą dozwoloną liczbę wierszy (${before - 1}).`}; }
        const idx = after - 2; undo.unshift(() => { const b = cur()?.querySelector(`[data-del="${idx}"]`); if (b) b.click(); });
      }
      if (C) bump(d.gc, C);
    }
    return {tb: cur(), undo: () => undo.forEach(f => f())};
  }
  function tablePaste(tb, t, text) {
    let blk; try { blk = PASTE.parse(text); } catch (err) { return showErr(t, err.message, [t]); }
    let g = tableGrid(tb); const pos = posOf(g.els, t); if (!pos) return;
    let pl = PASTE.plan(blk.rows, g.specs, pos[0], pos[1], g.labels), grown = null;
    if (pl.need) {
      grown = growTable(tb, pl.need); if (grown.err) return showErr(t, grown.err, [t]);
      tb = grown.tb; if (!tb) return; g = tableGrid(tb); pl = PASTE.plan(blk.rows, g.specs, pos[0], pos[1], g.labels);
      if (pl.need) { grown.undo(); const t2 = document.getElementById(t.id) || t; return showErr(t2, tooBig(pl.need) + '.', [t2]); }
    }
    if (pl.errs.length) {
      const bad = pl.errs.map(x => g.els[x.r]?.[x.c]).filter(Boolean), ids = bad.map(e => e.id);
      if (grown) { grown.undo(); const t2 = document.getElementById(t.id) || t; return showErr(t2, PASTE.errText(pl.errs), ids.map(id => document.getElementById(id)).filter(Boolean)); }
      return showErr(t, PASTE.errText(pl.errs), bad);
    }
    clearErr(); pl.fills.forEach(f => put(g.els[f.r][f.c], f.v));
    note(tb, summary(blk, pl, grown ? 'Tabelę powiększono, żeby zmieścić cały blok.' : ''));
  }
  /* programowanie liniowe: wiersz celu (c), wiersze ograniczeń (a…, znak, b); liczba zmiennych z kolumny znaku, ograniczenia dodawane same */
  function lpPaste(k, t, text) {
    let blk; try { blk = PASTE.parse(text); } catch (err) { return showErr(t, err.message, [t]); }
    let B = blk.rows; const p = k + '-';
    if (B.some(r => /^(max|maks|min)/i.test(r[0]))) {                   // całe zadanie w układzie CSV (wiersz „max”/„min”, ograniczenia z etykietą)
      let m; try { m = parseModel(k, parseLPcsv(text)); } catch (err) { return showErr(t, 'wklejony tekst wygląda jak całe zadanie (wiersz „max” lub „min”), ale ' + (err.message === 'format' ? 'nie udało się go odczytać.' : err.message), [t]); }
      clearErr(); models[k] = m; renderForm(k); $('#out-' + k).innerHTML = '';
      return note($('#' + p + 'c0'), `Wczytano zadanie: ${pl3(m.n, 'zmienna', 'zmienne', 'zmiennych')}, ${pl3(m.rows.length, 'ograniczenie', 'ograniczenia', 'ograniczeń')} (${m.maxi ? 'maksymalizacja' : 'minimalizacja'}).`);
    }
    const id = t.id.slice(p.length); let m0;
    if ((m0 = /^c(\d+)$/.exec(id))) m0 = [0, +m0[1]]; else if ((m0 = /^a(\d+)_(\d+)$/.exec(id))) m0 = [+m0[1] + 1, +m0[2]]; else if ((m0 = /^b(\d+)$/.exec(id))) m0 = [+m0[1] + 1, -1]; else return;
    const notes = [], isN = s => s !== '' && !isNaN(PASTE.num(s)), isText = s => s !== '' && !isN(s) && !PASTE.rel(s);
    if (B.length >= 2 && B[0].some(isText) && !B[0].some(isN) && B.slice(1).some(r => r.some(isN))) { B = B.slice(1); notes.push('pominięto wiersz nagłówka'); }
    if (B.some(r => isText(r[0])) && B.every(r => r[0] === '' || isText(r[0])) && B.some(r => r.slice(1).some(isN))) { B = B.map(r => r.slice(1)); notes.push('pominięto kolumnę opisów'); }
    sync(k); const snap = JSON.parse(JSON.stringify(models[k])), md = models[k];
    const restore = () => { models[k] = snap; renderForm(k); };
    let j0 = m0[1] < 0 ? md.n : m0[1];                                   // wklejanie od prawej strony b: blok ma tylko b
    const cons = m0[0] === 0 ? B.slice(1) : B, signs = cons.map(r => r.findIndex(s => PASTE.rel(s))).filter(x => x >= 0);
    if (new Set(signs).size > 1) return showErr(t, 'znaki ograniczeń (≤, ≥, =) są w różnych kolumnach – w każdym wierszu znak musi stać w tej samej kolumnie, przed prawą stroną.', [t]);
    let nNeed = md.n;
    if (m0[1] >= 0 && signs.length) nNeed = Math.max(nNeed, j0 + signs[0]);
    if (m0[0] === 0) { const w = B[0].reduce((a, s, j) => s !== '' ? j + 1 : a, 0); nNeed = Math.max(nNeed, j0 + w); }
    if (nNeed > MAXN) return showErr(t, `wklejone dane mają ${nNeed} zmiennych – maksimum to ${MAXN}.`, [t]);
    if (nNeed > md.n) { const fit = a => Array.from({length: nNeed}, (_, j) => a[j] ?? '0'); md.n = nNeed; md.c = fit(md.c); md.t = Array.from({length: nNeed}, (_, j) => md.t[j] ?? T0(k)); md.rows.forEach(r => r.a = fit(r.a)); renderForm(k); }
    const grid = () => { const n = models[k].n, el = s => $('#' + p + s);
      const els = [Array.from({length: n}, (_, j) => el('c' + j)), ...models[k].rows.map((_, i) => [...Array.from({length: n}, (_, j) => el(`a${i}_${j}`)), el('rel' + i), el('b' + i)])];
      return {els, specs: els.map(r => r.map(e => e ? specOf(e) : null))}; };
    const pos = [m0[0], m0[1] < 0 ? models[k].n + 1 : m0[1]];
    let g = grid(), pl = PASTE.plan(B, g.specs, pos[0], pos[1]);
    if (pl.need && pl.need.rows && !pl.need.cols) {
      const add = pl.need.rows; if (models[k].rows.length + add > MAXC) { restore(); return showErr($('#' + t.id) || t, `wklejone dane wymagają ${models[k].rows.length + add} ograniczeń – maksimum to ${MAXC}.`, []); }
      for (let i = 0; i < add; i++) models[k].rows.push({a: Array(models[k].n).fill('0'), rel: '<=', b: '0'});
      renderForm(k); g = grid(); pl = PASTE.plan(B, g.specs, pos[0], pos[1]);
    }
    if (pl.need) { restore(); const t2 = $('#' + t.id) || t; return showErr(t2, `za dużo wartości w wierszu – przy ${pl3(snap.n, 'zmiennej', 'zmiennych', 'zmiennych')} wiersz ograniczenia ma ${snap.n} współczynniki, znak i prawą stronę. Dodaj kolumnę ze znakiem (≤, ≥, =) – liczba zmiennych ustawi się sama – albo zwiększ ją na liście „Zmienne”.`, [t2]); }
    if (pl.errs.length) { const ids = pl.errs.map(x => g.els[x.r]?.[x.c]?.id).filter(Boolean); restore(); const t2 = $('#' + t.id) || t; return showErr(t2, PASTE.errText(pl.errs).replace(/wiersz (\d+), kolumna (\d+)/, (_, a, b) => `wiersz ${+a + (notes.includes('pominięto wiersz nagłówka') ? 1 : 0)}, kolumna ${+b + (notes.includes('pominięto kolumnę opisów') ? 1 : 0)}`), ids.map(i => $('#' + i)).filter(Boolean)); }
    clearErr(); pl.fills.forEach(f => put(g.els[f.r][f.c], f.v));
    const grownTxt = models[k].n !== snap.n || models[k].rows.length !== snap.rows.length ? `Zadanie ma teraz ${pl3(models[k].n, 'zmienną', 'zmienne', 'zmiennych')} i ${pl3(models[k].rows.length, 'ograniczenie', 'ograniczenia', 'ograniczeń')}.` : '';
    pl.notes.unshift(...notes); note($('#' + t.id) || $('#' + p + 'c0'), summary(blk, pl, grownTxt));
  }
  /* jedna wartość do pola liczbowego: zapis z Excela → liczba; tekst, który liczbą nie jest – błąd przy polu */
  function single(t, text) {
    let s = String(text ?? '').trim();
    if (/[\t\n;]/.test(s)) { let blk; try { blk = PASTE.parse(s); } catch (err) { return showErr(t, err.message, [t]); }
      if (blk.R * blk.C > 1) return showErr(t, `to pole przyjmuje jedną wartość, a wklejono blok ${blk.R} × ${blk.C}. Bloki komórek wklejaj do tabel.`, [t]); s = blk.rows[0][0]; }
    const x = PASTE.cell(specOf(t), s);
    if (x.err) return showErr(t, x.err + '.', [t]);
    t.closest('.crow')?.querySelector('.fmsg')?.remove(); put(t, x.v);
  }
  function onPaste(e) {
    const t = e.target; if (!t || t.tagName !== 'INPUT' || /^(checkbox|radio|file)$/i.test(t.type)) return;
    const cd = e.clipboardData, text = cd ? (cd.getData('text/plain') || cd.getData('text') || '') : '';
    if (!text) return;
    const tb = t.closest('table.mx'), lp = t.closest('[data-lp]'), many = /[\t\n;]/.test(text.replace(/[\r\n]+$/, ''));
    if (!many || (!tb && !lp)) { if (!t.hasAttribute('data-num')) return; e.preventDefault(); return single(t, text); }
    e.preventDefault();
    if (lp) lpPaste(lp.dataset.lp, t, text); else tablePaste(tb, t, text);
  }
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('paste', onPaste, true);
  return {tableGrid, onPaste};
})();
