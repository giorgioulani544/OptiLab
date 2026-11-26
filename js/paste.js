/* ===== OptiLab – wklejanie ze schowka (Excel, CSV, tekst) – czysta logika bez DOM (testowalna w Node) =====
   1) PASTE.parse(tekst) – dzieli tekst na wiersze i komórki. Separator rozpoznawany sam: tabulator (kopiowanie z Excela),
      średnik (CSV z polskiego Excela), przecinek (CSV angielski – gdy wiersz ma kilka przecinków, „, ” albo liczby z kropką),
      spacje (liczby przepisane z PDF lub strony), w ostateczności jedna kolumna. Cudzysłowy jak w CSV („"a;b"”, „""”).
   2) PASTE.num(komórka) – liczba z zapisu polskiego lub angielskiego: przecinek dziesiętny, spacje/twarde spacje/apostrof
      jako separatory tysięcy, 1.234,5 i 1,234.5, procenty (15% = 0,15), minus z Worda (−), zapis wykładniczy. Bez Number('0x1F').
   3) PASTE.plan(blok, siatka, r0, c0) – rozkłada blok na komórki tabeli „jak w Excelu”: od wskazanej komórki w prawo i w dół.
      Siatka = to, co widać na ekranie (wiersz nagłówka, kolumna nazw, komórki, kolumna/wiersz dodatkowy), każda komórka
      {k: 'num'|'text'|'sel', m (wolno M), blank (puste = brak), opts: [[wartość, etykieta]]} albo null (nie do edycji).
      Wiersz nagłówka i kolumna nazw z Excela trafiają na nagłówki tabeli albo są pomijane; kolumna ze znakiem (≤, ≥, =)
      jest pomijana, gdy blok jej nie ma (A | b). Najpierw sprawdzamy wszystko – przy błędzie nie zmieniamy niczego.
   Moduł DOM (js/paste-ui.js) odczytuje siatkę z tabeli, powiększa tabelę, wpisuje wartości i pokazuje błędy przy polach. */
const PASTE = (() => {
  const MAXR = 500, MAXC = 200;
  const SEPN = {'\t': 'tabulator', ';': 'średnik', ',': 'przecinek', ' ': 'spacja', '': 'jedna kolumna'};
  const unq = t => t.replace(/"(?:[^"]|"")*"/g, '""');                      // bez treści w cudzysłowach (do rozpoznania separatora)
  function detect(text) {
    const t = unq(text), lines = t.split('\n').filter(l => l.trim());
    if (t.includes('\t')) return '\t';
    if (t.includes(';')) return ';';
    if (t.includes(',') && (lines.some(l => (l.match(/,/g) || []).length > 1) || /,[ ]/.test(t) || /\d\.\d/.test(t) || /"/.test(text))) return ',';
    if (lines.some(l => /\S +\S/.test(l.trim()))) return ' ';
    return '';
  }
  function split(text, sep) {
    if (sep === ' ') return text.split('\n').map(l => l.trim() === '' ? [''] : l.trim().split(/ +/));
    if (sep === '') return text.split('\n').map(l => [l.trim().replace(/^"(.*)"$/s, '$1').replace(/""/g, '"')]);
    const rows = []; let row = [], cur = '', q = false, start = true;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"' && start && cur.trim() === '') { q = true; cur = ''; start = false; continue; }
      if (ch === sep) { row.push(cur); cur = ''; start = true; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; start = true; continue; }
      cur += ch; if (ch !== ' ') start = false;
    }
    if (q) throw new Error('niezamknięty cudzysłów w wklejonym tekście – sprawdź, czy skopiowano cały fragment.');
    row.push(cur); rows.push(row); return rows;
  }
  /* tekst → {rows: [[komórki]], sep, sepName, R, C}; wiersze wyrównane do tej samej liczby kolumn ('' = pusta komórka) */
  function parse(text, o = {}) {
    let t = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    if (!t.trim()) throw new Error('schowek jest pusty – zaznacz komórki w Excelu, skopiuj je (Ctrl+C) i wklej ponownie.');
    const sep = o.sep ?? detect(t);
    let rows = split(t, sep).map(r => r.map(c => c.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim()));
    const empty = r => r.every(c => c === '');
    while (rows.length && empty(rows[rows.length - 1])) rows.pop();
    while (rows.length && empty(rows[0])) rows.shift();
    const C = Math.max(...rows.map(r => r.length));
    if (rows.length > MAXR || C > MAXC) throw new Error(`wklejony blok jest za duży (${rows.length} × ${C}) – najwyżej ${MAXR} wierszy i ${MAXC} kolumn.`);
    rows = rows.map(r => r.concat(Array(C - r.length).fill('')));
    return {rows, sep, sepName: SEPN[sep], R: rows.length, C};
  }
  /* liczba z komórki; NaN gdy to nie jest liczba (pusta komórka też NaN – o pustych decyduje typ pola) */
  function num(s) {
    let t = String(s ?? '').trim(); if (t === '') return NaN;
    t = t.replace(/^[−‒–—]/, '-').replace(/^\+/, '');
    let pct = false; if (/%$/.test(t)) { pct = true; t = t.slice(0, -1).trim(); }
    t = t.replace(/[\s    ']/g, '');
    const c = t.lastIndexOf(','), d = t.lastIndexOf('.');
    if (c >= 0 && d >= 0) {
      const dec = Math.max(c, d), int = t.slice(0, dec), th = c > d ? '.' : ',';
      if (!new RegExp('^-?\\d{1,3}(\\' + th + '\\d{3})+$').test(int)) return NaN;
      t = int.split(th).join('') + '.' + t.slice(dec + 1);
    } else if (c >= 0 || d >= 0) {
      const ch = c >= 0 ? ',' : '.', parts = t.split(ch);
      if (parts.length > 2) { if (!new RegExp('^-?\\d{1,3}(\\' + ch + '\\d{3})+$').test(t)) return NaN; t = parts.join(''); }
      else t = parts.join('.');
    }
    if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return NaN;
    const x = Number(t); if (!isFinite(x)) return NaN;
    return pct ? Number((x / 100).toPrecision(15)) : x;
  }
  const REL = {'<=': '<=', '=<': '<=', '≤': '<=', '⩽': '<=', '>=': '>=', '=>': '>=', '≥': '>=', '⩾': '>=', '=': '=', '==': '='};
  const rel = s => REL[String(s ?? '').trim()] || null;
  const isRelSel = sp => !!sp && sp.k === 'sel' && sp.opts.length >= 2 && sp.opts.every(([v]) => v in {'<=': 1, '>=': 1, '=': 1});
  const isM = (sp, s) => !!sp && sp.m && /^m$/i.test(String(s).trim());
  /* komórka schowka → wartość pola: {v} | {skip: true} | {err: 'opis'} */
  function cell(sp, s) {
    const t = String(s ?? '').trim();
    if (sp.k === 'num') {
      if (t === '') return {v: sp.blank ? '' : '0'};
      if (isM(sp, t)) return {v: 'M'};
      const x = num(t); if (isNaN(x)) return {err: `„${t}” nie jest liczbą${sp.m ? ' ani M (pole zakazane)' : ''}`};
      return {v: String(x)};
    }
    if (sp.k === 'sel') {
      if (t === '') return {skip: true};
      const low = t.toLowerCase(), r = rel(t);
      const hit = sp.opts.find(([, l]) => String(l).trim().toLowerCase() === low) || sp.opts.find(([v]) => String(v).toLowerCase() === low) ||
        (r && sp.opts.find(([v]) => v === r)) || sp.opts.find(([, l]) => String(l).trim().toLowerCase().split(/[\s(]/)[0] === low);
      if (!hit) { const L = sp.opts.map(([, l]) => `„${String(l).trim()}”`); return {err: `„${t}” – w tej kolumnie wybierz jedną z wartości: ${L.slice(0, 8).join(', ')}${L.length > 8 ? '…' : ''}`}; }
      return {v: String(hit[0])};
    }
    return {v: t};
  }
  const nonNum = (sp, s) => s !== '' && isNaN(num(s)) && !isM(sp, s);
  /* blok (wiersze komórek) → plan wpisania w siatkę od komórki (r0, c0).
     Wynik: {fills: [{r, c, v}], errs: [{i, j, r, c, msg}] (i, j – wiersz i kolumna schowka od 1), need: {rows, cols} | null,
     skipped (komórki nie do edycji), notes, size: [R, C]} */
  function plan(block, grid, r0, c0, labels) {   // labels – teksty komórek tabeli (nagłówki, nazwy), np. okresy „1, 2, 3” jako nagłówek
    const at = (r, c) => grid[r]?.[c] ?? null, notes = [], lab = labels || [];
    let B = block.map(r => r.slice()), di = 0, dj = 0;
    const width = r => { let k = r.length; while (k > 0 && r[k - 1] === '') k--; return k; };
    if (!B.length || B.every(r => width(r) === 0)) return {fills: [], errs: [{i: 1, j: 1, r: r0, c: c0, msg: 'schowek nie zawiera żadnych wartości'}], need: null, skipped: 0, notes, size: [0, 0]};
    const hasNum = row => row.some(sp => sp && sp.k === 'num'), noNumCol = c => !grid.some(row => row && row[c] && row[c].k === 'num');
    const norm = x => String(x ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const same = (cells, L) => {                                       // komórki bloku = teksty tabeli (co najmniej 60%, min. 2 przy dłuższych)
      const P = cells.map((s, k) => [s, L(k)]).filter(([s]) => s !== ''), hit = P.filter(([s, l]) => norm(l) !== '' && norm(s) === norm(l)).length;
      return P.length > 0 && hit >= Math.max(P.length > 1 ? 2 : 1, Math.ceil(P.length * 0.6));
    };
    let ar = r0, ac = c0, names = false;
    // wiersz nagłówka z Excela: (a) taki sam jak nagłówek tabeli (także liczby, np. okresy 1, 2, 3 – z kolumną nazw albo bez),
    // (b) wszystkie komórki, które trafiłyby na pola liczbowe, to tekst, a niżej są liczby
    const above = r0 > 0 && !hasNum(grid[r0 - 1] || []);
    if (B.length >= 2 && above) for (let off = 0; off >= -c0; off--) if (ar === r0 && same(B[0], k => lab[r0 - 1]?.[c0 + off + k])) { ar = r0 - 1; if (off) { ac = c0 + off; names = noNumCol(ac); } }
    const top = B[0].map((s, j) => [s, at(r0, c0 + j), j]).filter(([s, sp]) => s !== '' && sp && sp.k === 'num');
    if (ar === r0 && B.length >= 2 && top.length && top.every(([s, sp]) => nonNum(sp, s)) && top.some(([, sp, j]) => B.slice(1).some(row => row[j] !== '' && !nonNum(sp, row[j])))) {
      if (above) ar = r0 - 1; else { B = B.slice(1); di = 1; notes.push('pominięto wiersz nagłówka'); }
    }
    // kolumna nazw z Excela: taka jak nazwy wierszy tabeli albo tekst tam, gdzie tabela oczekuje liczb (a obok są liczby)
    const rr = i => ar + i;
    const left = B.map((row, i) => [row[0], at(rr(i), c0), i]).filter(([s, sp]) => s !== '' && sp && sp.k === 'num');
    if (!names && (B[0]?.length || 0) >= 2 && ((c0 > 0 && noNumCol(c0 - 1) && same(B.map(r => r[0]), i => lab[rr(i)]?.[c0 - 1])) ||
        (left.length && left.every(([s, sp]) => nonNum(sp, s)) && left.some(([, , i]) => B[i].slice(1).some(s => s !== '' && !isNaN(num(s))))))) {
      if (c0 > 0 && noNumCol(c0 - 1)) ac = c0 - 1; else { B = B.map(r => r.slice(1)); dj = 1; notes.push('pominięto kolumnę nazw'); }
    }
    const R = B.length, C = Math.max(0, ...B.map(r => r.length));
    // kolumny bloku → kolumny siatki; kolumna znaku (≤, ≥, =) pominięta, gdy w bloku są tam liczby (układ A | b)
    const mapCols = a => { const m = []; let shift = 0;
      for (let j = 0; j < C; j++) {
        let g = a + j + shift;
        const rows = B.map((row, i) => [row[j], at(rr(i), g)]).filter(([s, sp]) => s !== '' && isRelSel(sp));
        if (rows.length && rows.every(([s]) => !rel(s) && !isNaN(num(s)))) { shift++; g++; }
        m.push(g);
      }
      return m; };
    // czy blok się mieści (puste komórki poza tabelą pomijamy; nowe wiersze mają szerokość ostatniego)
    const fit = m => { let nr = 0, nc = 0;
      B.forEach((row, i) => row.forEach((s, j) => {
        if (s === '') return; const r = rr(i), g = m[j], w = (grid[Math.min(r, grid.length - 1)] || []).length;
        if (r >= grid.length) nr = Math.max(nr, r - grid.length + 1);
        if (g >= w) nc = Math.max(nc, g - w + 1);
      }));
      return [nr, nc]; };
    let cmap = mapCols(ac), [needR, needC] = fit(cmap);
    // macierz z wyłączoną przekątną: w 1. wierszu pierwsze pole do wklejenia stoi za przekątną – pełny wiersz (z przekątną) zaczynamy od przekątnej
    if (needC && ac === c0 && ar === r0) {
      let a = c0; while (a > 0 && a > c0 - needC && !at(r0, a - 1) && !noNumCol(a - 1)) a--;
      if (a < c0) { const m2 = mapCols(a), f2 = fit(m2); if (f2[1] < needC) { ac = a; cmap = m2; [needR, needC] = f2; } }
    }
    if (needR || needC) return {fills: [], errs: [], need: {rows: needR, cols: needC}, skipped: 0, notes, size: [R, C], anchor: [ar, ac]};
    const fills = [], errs = []; let skipped = 0;
    B.forEach((row, i) => row.forEach((s, j) => {
      const r = rr(i), g = cmap[j], sp = at(r, g);
      if (r >= grid.length || g >= (grid[r] || []).length) return;   // puste komórki poza tabelą
      if (!sp) { if (s !== '' && r >= r0 && g >= c0) skipped++; return; }   // nagłówki z Excela na stałych nazwach tabeli – bez uwag
      const x = cell(sp, s);
      if (x.err) errs.push({i: i + 1 + di, j: j + 1 + dj, r, c: g, msg: x.err});
      else if (!x.skip) fills.push({r, c: g, v: x.v});
    }));
    if (skipped) notes.push(`pominięto ${skipped} ${skipped === 1 ? 'komórkę' : 'komórek'} bez pola do wpisania (np. przekątna, stałe nazwy)`);
    return {fills, errs, need: null, skipped, notes, size: [R, C], anchor: [ar, ac]};
  }
  /* tekst z tabulatorami (Excel) → ten sam tekst ze średnikami (format CSV modułów); inny tekst bez zmian */
  function toSemicolon(text) {
    const t = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n'), first = t.split('\n').find(l => l.trim()) || '';
    if (!first.includes('\t') || first.includes(';')) return String(text ?? '');
    const q = c => /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    // Excel kopiuje prostokąt: puste komórki na końcu wiersza (i całe puste wiersze) to tylko wypełnienie – usuwamy je
    return split(t, '\t').map(r => { const c = r.map(x => x.trim()); while (c.length && c[c.length - 1] === '') c.pop(); return c.map(q).join(';'); }).join('\n');
  }
  /* opis błędów planu dla użytkownika (pierwszy błąd + liczba pozostałych) */
  function errText(errs) {
    const e = errs[0], more = errs.length - 1;
    return `wiersz ${e.i}, kolumna ${e.j} wklejonych danych: ${e.msg}.` + (more > 0 ? ` Takich komórek jest jeszcze ${more} – zaznaczono je na czerwono.` : '') + ' Nic nie zostało zmienione.';
  }
  return {parse, num, rel, cell, plan, toSemicolon, errText, isRelSel, SEPN, MAXR, MAXC};
})();
