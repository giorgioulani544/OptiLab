/* ===== OptiLab – drzewo HTML raportu i eksport wyników do CSV – czysta logika bez DOM (testowalna w Node) =====
   Raporty modułów to gotowe teksty HTML (last[id]). HT.parse zamienia taki tekst na proste drzewo {tag, attrs, kids} / {text},
   z którego korzystają eksport do Excela (HT.reportCSV) i do Worda (js/docx.js). Parser obsługuje to, co generuje OptiLab:
   znaczniki puste (br, img, input), „/>” w SVG, encje (&amp; &nbsp; &#8722; …), komentarze, nadmiarowe znaczniki zamykające.
   Eksport CSV (polski Excel: średnik, przecinek dziesiętny, BOM): nagłówki sekcji, wszystkie tabele raportu (scalone komórki
   rozpisane na siatkę), ramki z wynikiem (.sum), komunikaty (.msg – np. brak rozwiązania, limit iteracji) i zdania interpretacji. */
const HT = (() => {
  const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'col', 'wbr', 'source', 'area', 'base', 'param', 'track', 'embed']);
  const ENT = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', minus: '−', ndash: '–', mdash: '—', hellip: '…', le: '≤', ge: '≥',
    ne: '≠', times: '×', middot: '·', deg: '°', infin: '∞', sum: '∑', radic: '√', plusmn: '±', laquo: '«', raquo: '»', bull: '•', rarr: '→', larr: '←', thinsp: ' '};
  const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] !== '#') return ENT[e] ?? ENT[e.toLowerCase()] ?? m;
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1);
    return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
  });
  function parse(html) {
    const root = {tag: '#root', attrs: {}, kids: []}, stack = [root];
    const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g;
    let m;
    while ((m = re.exec(String(html ?? '')))) {
      const tok = m[0], top = stack[stack.length - 1];
      if (tok.startsWith('<!--')) continue;
      if (!m[2]) { top.kids.push({text: decode(tok)}); continue; }
      const tag = m[2].toLowerCase();
      if (m[1]) { let i = stack.length - 1; while (i > 0 && stack[i].tag !== tag) i--; if (i > 0) stack.length = i; continue; }
      const attrs = {};
      m[3].replace(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g, (_, k, a, b, c) => { attrs[k.toLowerCase()] = decode(a ?? b ?? c ?? ''); return ''; });
      if ((tag === 'td' || tag === 'th') && /^t[dh]$/.test(top.tag)) stack.pop();          // <td> bez zamknięcia
      if (tag === 'tr') { const i = stack.map(x => x.tag).lastIndexOf('tr'), t = stack.map(x => x.tag).lastIndexOf('table'); if (i > t) stack.length = i; }
      if (tag === 'li') { const i = stack.map(x => x.tag).lastIndexOf('li'), u = Math.max(stack.map(x => x.tag).lastIndexOf('ul'), stack.map(x => x.tag).lastIndexOf('ol')); if (i > u) stack.length = i; }
      const node = {tag, attrs, kids: []};
      stack[stack.length - 1].kids.push(node);
      if (!VOID.has(tag) && !m[4]) stack.push(node);
    }
    return root;
  }
  const cls = (n, c) => !!n.attrs && (' ' + (n.attrs.class || '') + ' ').includes(' ' + c + ' ');
  const hidden = n => !!n.attrs && ('hidden' in n.attrs || /display\s*:\s*none/i.test(n.attrs.style || '') || n.attrs['aria-hidden'] === 'true' && n.tag !== 'svg');
  const SKIP = new Set(['script', 'style', 'button', 'input', 'select', 'textarea', 'svg', 'canvas', 'template', 'noscript', 'option']);
  /* tekst węzła tak, jak go widać (białe znaki zwinięte, <br> = nowa linia, bez ukrytych elementów i przycisków) */
  function text(n, nl = false) {                                    // nl: bloki (akapity, punkty listy, wiersze) w osobnych liniach
    let s = '';
    const walk = x => {
      if (x.text !== undefined) { s += x.text; return; }
      if (SKIP.has(x.tag) || hidden(x) || (x.tag === 'a' && cls(x, 'dl'))) return;
      if (x.tag === 'br') { s += '\n'; return; }
      if (x.tag === 'img') { s += x.attrs.alt || ''; return; }
      const blk = /^(p|div|li|tr|h[1-6]|table|ul|ol|summary|details|caption)$/.test(x.tag), sep = nl ? '\n' : ' ';
      if (blk && s && !/\s$/.test(s)) s += sep;
      x.kids.forEach(walk);
      if (x.tag === 'td' || x.tag === 'th') s += ' ';
      if (blk && s && !/\s$/.test(s)) s += sep;
    };
    walk(n);
    return s.replace(/[ \t\r\f\v ]+/g, ' ').replace(/ *\n */g, '\n').trim();
  }
  /* tabela → siatka wierszy z uwzględnieniem colspan/rowspan: [[{n: węzeł komórki, own: czy to komórka źródłowa, th}]] */
  function grid(table) {
    const rows = [];
    const collect = n => n.kids.forEach(k => { if (k.text !== undefined || hidden(k)) return; if (k.tag === 'tr') rows.push(k); else if (/^(thead|tbody|tfoot)$/.test(k.tag)) collect(k); });
    collect(table);
    const G = [], span = [];                                            // span[c] = {left: ile wierszy jeszcze, n}
    rows.forEach((tr, r) => {
      const row = []; let c = 0;
      const fillSpans = () => { while (span[c] && span[c].left > 0) { row.push({n: span[c].n, own: false, th: span[c].th, tr}); span[c].left--; c++; } };
      tr.kids.filter(k => k.tag === 'td' || k.tag === 'th').forEach(td => {
        fillSpans();
        const cs = Math.max(1, Math.min(100, +td.attrs.colspan || 1)), rs = Math.max(1, Math.min(500, +td.attrs.rowspan || 1));
        for (let k = 0; k < cs; k++) { row.push({n: td, own: k === 0, th: td.tag === 'th', cs: k === 0 ? cs : 0, rs, tr}); if (rs > 1) span[c] = {left: rs - 1, n: td, th: td.tag === 'th'}; c++; }
      });
      fillSpans();
      G[r] = row;
    });
    return {rows: G, tr: rows};
  }
  const caption = table => { const c = table.kids.find(k => k.tag === 'caption'); return c ? text(c) : ''; };
  /* ---------- eksport wyników do CSV ---------- */
  const isNumTxt = s => /^[−–+-]?\s?\d[\d\s ]*([,.]\d+)?(e[+-]?\d+)?\s?%?$/i.test(s);
  const csvCell = s => {
    let v = String(s ?? '').replace(/\s+/g, ' ').trim();
    if (isNumTxt(v)) v = v.replace(/^[−–]\s?/, '-');                    // minus typograficzny → zwykły (Excel rozpozna liczbę)
    else if (/^[=+@]./.test(v) || /^-[^\d\s.,]/.test(v)) v = "'" + v;     // tekst zaczynający się od „=”, „+”, „@” Excel wziąłby za formułę
    return /[;"\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  function reportCSV(sections, o = {}) {
    const L = [], line = cells => L.push(cells.map(csvCell).join(';')), gap = () => { if (L.length && L[L.length - 1] !== '') L.push(''); };
    if (o.title) line([o.title]); if (o.date) line([o.date]);
    sections.forEach(([title, html]) => {
      gap(); line([String(title).toUpperCase()]);
      const walk = n => {
        if (n.text !== undefined || SKIP.has(n.tag) || hidden(n) || (n.tag === 'a' && cls(n, 'dl'))) return;
        if (cls(n, 'hint') || cls(n, 'gctog') || cls(n, 'formula')) return;   // podpowiedzi i wzory pośrednie – nie są wynikami
        if (/^h[1-6]$/.test(n.tag) || n.tag === 'summary') { const t = text(n); if (t) { gap(); line([t]); } return; }
        if (n.tag === 'table') {
          const cap = caption(n), {rows} = grid(n); if (cap) line([cap]);
          rows.forEach(r => line(r.map(c => c.own ? text(c.n) : '')));
          gap(); return;
        }
        if (cls(n, 'sum') || cls(n, 'msg') || n.tag === 'li') {
          if (n.kids.some(k => k.tag === 'table')) { n.kids.forEach(walk); return; }
          text(n, true).split('\n').map(s => s.trim()).filter(Boolean).forEach((t, k) => line([(k === 0 && cls(n, 'msg') ? 'Uwaga: ' : '') + t])); return;
        }
        if (n.tag === 'p' && /^(ul|ol)$/.test(next(n)?.tag || '')) { const t = text(n); if (t) line([t]); return; }   // treść zadania: „Maksymalizuj Z = …” + lista ograniczeń
        n.kids.forEach(walk);
      };
      const par = new Map(), link = x => (x.kids || []).forEach(k => { par.set(k, x); link(k); });
      const next = n => { const sib = par.get(n)?.kids || [], i = sib.indexOf(n); for (let k = i + 1; k < sib.length; k++) { if (sib[k].text !== undefined && !sib[k].text.trim()) continue; return sib[k]; } return null; };
      const root = parse(html); link(root); walk(root);
    });
    while (L.length && L[L.length - 1] === '') L.pop();
    return '﻿' + L.join('\r\n') + '\r\n';
  }
  return {parse, decode, text, grid, caption, cls, hidden, reportCSV, SKIP};
})();
