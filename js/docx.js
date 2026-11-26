/* ===== OptiLab – raport do Worda (.docx) – czysta logika bez DOM (testowalna w Node) =====
   DOCX.build(sekcje, o) zamienia HTML raportu (to samo, co trafia do PDF) na dokument Word: nagłówki, akapity,
   pogrubienia, indeksy dolne i górne, listy, prawdziwe tabele Worda (scalone komórki, powtarzany wiersz nagłówka,
   wiersze nierozcinane między stronami, małe tabele w całości na jednej stronie) z kolorami raportu (nagłówek kolumn,
   element centralny, wiersz wybrany, wynik najlepszy), ramki „Wynik” (zielone), komunikaty (czerwone), wzory, obrazy PNG
   (wykresy SVG przerabia na PNG js/export.js w przeglądarce – tutaj przychodzą jako <img src="data:image/png;base64,…">).
   DOCX.zip(pliki) składa archiwum ZIP (bez kompresji albo z gotowymi danymi „deflate” – przeglądarka kompresuje sama).
   Strona A4 pionowo, marginesy 15 mm, stopka „OptiLab · Made by Aleksander Kruszelnicki · strona N z M”. */
const DOCX = (() => {
  const W = 11906, H = 16838, MAR = 850, TW = W - 2 * MAR;                  // A4 w twipach (1/20 pt), szerokość tekstu
  const EMU_PX = 9525, MAXW_EMU = Math.round(TW / 1440 * 914400);          // 1 px CSS = 9525 EMU
  const C = {ink: '1B2A4E', line: 'C9CBD8', th: 'EAF0F5', pivot: 'FFB703', pivotB: '8A5A00', sel: 'FFF6D8', best: 'E7F5EF', ok: '2E7D32', err: 'C0261B', errBg: 'FDECEA', errInk: '8E1B1B', zval: 'FFF6C4', formula: 'F7F5EF', note: '6B7390'};
  const x = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '');
  /* ---------- pomocnicze: UTF-8, base64, CRC-32, rozmiar PNG ---------- */
  const utf8 = s => { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    const out = []; for (const ch of s) { let c = ch.codePointAt(0); if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63); else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63); } return Uint8Array.from(out); };
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(s) {
    const t = String(s).replace(/[^A-Za-z0-9+/]/g, ''), out = new Uint8Array(Math.floor(t.length * 3 / 4)); let o = 0;
    for (let i = 0; i + 1 < t.length; i += 4) {
      const n = B64.indexOf(t[i]) << 18 | B64.indexOf(t[i + 1]) << 12 | (i + 2 < t.length ? B64.indexOf(t[i + 2]) : 0) << 6 | (i + 3 < t.length ? B64.indexOf(t[i + 3]) : 0);
      out[o++] = n >> 16 & 255; if (i + 2 < t.length) out[o++] = n >> 8 & 255; if (i + 3 < t.length) out[o++] = n & 255;
    }
    return out.slice(0, o);
  }
  const CRC = (() => { const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; T[n] = c >>> 0; } return T; })();
  const crc32 = d => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; };
  const pngSize = d => d.length > 24 && d[0] === 0x89 && d[1] === 0x50 && d[12] === 0x49 && d[13] === 0x48 ? {w: (d[16] << 24 | d[17] << 16 | d[18] << 8 | d[19]) >>> 0, h: (d[20] << 24 | d[21] << 16 | d[22] << 8 | d[23]) >>> 0} : null;
  /* ---------- ZIP: files = [{name, data: Uint8Array, comp?: Uint8Array (deflate-raw)}] ---------- */
  function zip(files) {
    const parts = [], cd = []; let off = 0;
    const u16 = v => [v & 255, v >> 8 & 255], u32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255];
    const dt = new Date(2026, 0, 1), time = 0, date = (dt.getFullYear() - 1980) << 9 | (dt.getMonth() + 1) << 5 | dt.getDate();
    files.forEach(f => {
      const name = utf8(f.name), crc = crc32(f.data), method = f.comp ? 8 : 0, body = f.comp || f.data;
      const head = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(time), ...u16(date), ...u32(crc), ...u32(body.length), ...u32(f.data.length), ...u16(name.length), ...u16(0)]);
      parts.push(head, name, body);
      cd.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(time), ...u16(date), ...u32(crc), ...u32(body.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
      off += head.length + name.length + body.length;
    });
    const cdLen = cd.reduce((s, p) => s + p.length, 0);
    const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(off), ...u16(0)]);
    const all = [...parts, ...cd, end], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let o = 0;
    all.forEach(p => { out.set(p, o); o += p.length; });
    return out;
  }
  /* ---------- przebiegi tekstu (runs) ---------- */
  const rPr = f => {
    let s = '';
    if (f.mono) s += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
    else if (f.serif) s += '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/>';
    if (f.b) s += '<w:b/><w:bCs/>'; if (f.i) s += '<w:i/><w:iCs/>';
    if (f.color) s += `<w:color w:val="${f.color}"/>`; if (f.sz) s += `<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`; if (f.u) s += '<w:u w:val="single"/>';
    if (f.sub) s += '<w:vertAlign w:val="subscript"/>'; else if (f.sup) s += '<w:vertAlign w:val="superscript"/>';
    return s ? `<w:rPr>${s}</w:rPr>` : '';
  };
  const run = (t, f) => t === '\n' ? `<w:r>${rPr(f)}<w:br/></w:r>` : `<w:r>${rPr(f)}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  /* inline: zbiera [{t, f}] z węzła (tekst ze zwiniętymi białymi znakami) */
  function inlines(n, f, out, ctx) {
    if (n.text !== undefined) { out.push({t: n.text.replace(/[ \t\r\n\f\v]+/g, ' '), f}); return; }
    if (HT.SKIP.has(n.tag) && n.tag !== 'svg' || HT.hidden(n) || (n.tag === 'a' && HT.cls(n, 'dl'))) return;
    if (n.tag === 'svg') { out.push({t: '[rysunek]', f: {...f, i: true, color: C.note}}); return; }
    if (n.tag === 'br') { out.push({t: '\n', f}); return; }
    if (n.tag === 'img') { out.push({img: n}); return; }
    const g = {...f}, a = n.attrs;
    if (/^(b|strong|th)$/.test(n.tag)) g.b = true; if (/^(i|em|var|cite)$/.test(n.tag)) g.i = true; if (n.tag === 'u') g.u = true;
    // wygląd z raportu na ekranie: js/export.js dopisuje data-fg/data-b/data-i/data-small/data-abs z obliczonych stylów; bez nich – klasy raportów
    if (a['data-fg']) g.color = a['data-fg']; if (a['data-b'] === '1') g.b = true; else if (a['data-b'] === '0' && n.tag === 'span') g.b = false;
    if (a['data-i'] === '1') g.i = true; if (a['data-small'] && f.sz) g.sz = Math.max(10, Math.round(f.sz * +a['data-small']));
    if (!a['data-fg'] && (HT.cls(n, 'cc') || HT.cls(n, 'dd'))) { g.color = '7B8296'; if (f.sz) g.sz = Math.max(10, Math.round(f.sz * .8)); }
    if (!a['data-fg'] && HT.cls(n, 'sg')) { g.color = C.err; g.b = true; }
    if (n.tag === 'sub') { g.sub = true; g.sup = false; } if (n.tag === 'sup') { g.sup = true; g.sub = false; }
    if (/^(code|kbd|samp|tt)$/.test(n.tag)) g.mono = true;
    if (HT.cls(n, 'bad') || HT.cls(n, 'err') || HT.cls(n, 'neg')) g.color = C.err;
    if (HT.cls(n, 'ok')) g.color = C.ok;
    n.kids.forEach(k => inlines(k, g, out, ctx));
    if (a['data-abs'] === '1' || (!('data-abs' in a) && (HT.cls(n, 'cc') || HT.cls(n, 'sg')))) out.push({t: ' ', f});   // element „w rogu” komórki – odstęp od reszty
  }
  const BLOCK = /^(p|div|h[1-6]|ul|ol|li|table|details|summary|section|article|header|footer|figure|figcaption|blockquote|pre|hr|caption|dl|dt|dd)$/;
  const isBlock = n => n.text === undefined && (BLOCK.test(n.tag) || n.tag === 'img' || n.tag === 'svg' || n.tag === 'canvas');
  /* ---------- budowa dokumentu ---------- */
  function build(sections, o = {}) {
    const body = [], media = [], ctx = {img: 0, pid: 1};
    const pPr = p => {
      let s = '';
      if (p.style) s += `<w:pStyle w:val="${p.style}"/>`;
      if (p.keep) s += '<w:keepNext/>';
      if (p.keepLines) s += '<w:keepLines/>';                                  // kolejność elementów jak w schemacie OOXML (Word jej pilnuje)
      if (p.cell) s += '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>';
      if (p.ind) s += `<w:ind w:left="${p.ind}" w:hanging="${p.hang || 0}"/>`;
      if (p.jc) s += `<w:jc w:val="${p.jc}"/>`;
      return s ? `<w:pPr>${s}</w:pPr>` : '';
    };
    const imgXML = n => {
      const m = /^data:image\/png;base64,(.*)$/s.exec(n.attrs.src || ''); if (!m) return '';
      const data = b64(m[1]), sz = pngSize(data); if (!sz) return '';
      let w = +n.attrs['data-w'] || +n.attrs.width || sz.w, h = +n.attrs['data-h'] || +n.attrs.height || Math.round(sz.h * w / sz.w);
      let cx = Math.round(w * EMU_PX), cy = Math.round(h * EMU_PX);
      if (cx > MAXW_EMU) { cy = Math.round(cy * MAXW_EMU / cx); cx = MAXW_EMU; }
      const maxH = Math.round((H - 2 * MAR - 1400) / 1440 * 914400); if (cy > maxH) { cx = Math.round(cx * maxH / cy); cy = maxH; }
      const k = ++ctx.img, rid = 'rIdImg' + k, id = ctx.pid++; media.push({name: `word/media/image${k}.png`, data, rid});
      const alt = x(n.attrs.alt || n.attrs['aria-label'] || 'Wykres');
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Obraz ${k}" descr="${alt}"/>` +
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="image${k}.png" descr="${alt}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    };
    /* akapit z listy przebiegów; zwraca XML albo '' (pusty akapit pomijamy, chyba że keepEmpty) */
    const para = (items, p = {}, keepEmpty = false) => {
      const its = items.slice(); while (its.length && its[0].t !== undefined && /^\s*$/.test(its[0].t) && its[0].t !== '\n') its.shift();
      while (its.length && its[its.length - 1].t !== undefined && /^\s*$/.test(its[its.length - 1].t) && its[its.length - 1].t !== '\n') its.pop();
      if (its.length && its[0].t) its[0] = {...its[0], t: its[0].t.replace(/^\s+/, '')};
      const L = its.length - 1; if (L >= 0 && its[L].t) its[L] = {...its[L], t: its[L].t.replace(/\s+$/, '')};
      let s = '', prevSp = false;
      its.forEach(it => { if (it.img) { s += imgXML(it.img); prevSp = false; return; }
        let t = it.t; if (prevSp && t.startsWith(' ')) t = t.slice(1); if (!t) return; prevSp = t.endsWith(' '); s += run(t, it.f); });
      if (!s && !keepEmpty) return '';
      return `<w:p>${pPr(p)}${s}</w:p>`;
    };
    const textOf = n => HT.text(n);
    const numLike = (s, th) => /^[−–+-]?\s?\d[\d\s\u00a0]*([,.]\d+)?(e[+-]?\d+)?\s?%?$/i.test(s) || /^[−-]?∞$/.test(s) || !th && (s === 'M' || s === '—' || s === '–');   // „M” w nagłówku wiersza to nazwa
    /* tabela Worda */
    const table = (tn, base) => {
      const {rows} = HT.grid(tn); if (!rows.length) return '';
      const nc = Math.max(...rows.map(r => r.length)); if (!nc) return '';
      const cap = HT.caption(tn), out = [];
      if (cap) out.push(para([{t: cap, f: {i: true}}], {style: 'Caption', keep: true}));
      // szerokości kolumn ~ najdłuższy tekst (ze scalonymi komórkami podzielonymi po równo), czcionka mniejsza dla szerokich tabel
      const len = Array(nc).fill(2);
      rows.forEach(r => r.forEach((c, j) => { if (!c.own) return; const t = textOf(c.n), cs = c.cs || 1, l = Math.min(40, Math.max(...t.split('\n').map(s => s.length), 1)) / cs; for (let k = 0; k < cs; k++) len[j + k] = Math.max(len[j + k] || 2, l); }));
      const colW = (l, sz) => l * sz * 6.4 + 200, need = sz => len.reduce((s, l) => s + colW(l, sz), 0);   // twipy przy rozmiarze sz (półpunkty)
      let sz = 18; while (sz > 11 && need(sz) > TW) sz--;
      const tot = need(sz), scale = tot > TW ? TW / tot : 1, cw = len.map(l => Math.max(300, Math.round(colW(l, sz) * scale)));
      const tw = cw.reduce((a, b) => a + b, 0);
      const headN = (() => { let k = 0; while (k < rows.length && rows[k].every(c => c.th) && (k === 0 || rows[k].every(c => c.th))) k++; return Math.min(k, 3) < rows.length ? Math.min(k, 3) : 0; })();
      const keepAll = rows.length <= 18;                                    // mała tabela w całości na jednej stronie
      let s = `<w:tbl><w:tblPr><w:tblStyle w:val="OptiTable"/><w:tblW w:w="${tw}" w:type="dxa"/>` +
        `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="${C.line}"/>`).join('')}</w:tblBorders>` +
        '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>' +
        `<w:tblGrid>${cw.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
      rows.forEach((r, i) => {
        const tr = r[0]?.tr, trSel = tr && (HT.cls(tr, 'sel') || HT.cls(tr, 'late')), trBest = tr && HT.cls(tr, 'best'), trZ = tr && HT.cls(tr, 'zrow');
        s += `<w:tr><w:trPr><w:cantSplit/>${i < headN ? '<w:tblHeader/>' : ''}</w:trPr>`;
        for (let j = 0; j < nc; j++) {
          const c = r[j];
          if (!c) { s += `<w:tc><w:tcPr><w:tcW w:w="${cw[j]}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`; continue; }
          if (!c.own && c.n === r[j - 1]?.n) continue;                     // część colspan – pomijamy (gridSpan)
          const n = c.n, cs = c.own ? (c.cs || 1) : (() => { let k = 1; while (r[j + k] && r[j + k].n === n && !r[j + k].own) k++; return k; })();
          const w = cw.slice(j, j + cs).reduce((a, b) => a + b, 0);
          let fill = c.th ? C.th : null, bold = c.th, fg;
          if (n.attrs['data-bg'] !== undefined) { fill = n.attrs['data-bg'] || null; bold = n.attrs['data-b'] === '1'; fg = n.attrs['data-fg']; }   // wygląd z ekranu
          else {                                                            // bez przeglądarki: klasy raportów (css/style.css)
            if (trSel) fill = C.sel;
            if (trBest || HT.cls(n, 'best')) { fill = C.best; bold = true; }
            if (HT.cls(n, 'pivot')) { fill = C.pivot; bold = true; }
            if (HT.cls(n, 'zval')) fill = C.zval; if (HT.cls(n, 'pr') || HT.cls(n, 'pcol')) fill = 'FFF1C2'; if (HT.cls(n, 'forb')) fill = C.errBg; if (HT.cls(n, 'cov')) fill = 'E4E9F2';
            if (HT.cls(n, 'out') || HT.cls(n, 'diag') || HT.cls(n, 'dm')) fg = '9AA3B5'; if (HT.cls(n, 'mn') || HT.cls(n, 'bad')) { fg = C.err; bold = true; }
          }
          const vm = (+n.attrs.rowspan || 1) > 1 ? (c.own ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '';   // scalenie w pionie (rowspan)
          const top = trZ ? `<w:tcBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="${C.line}"/></w:tcBorders>` : '';
          const pv = HT.cls(n, 'pivot') ? `<w:tcBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="${C.pivotB}"/><w:left w:val="single" w:sz="12" w:space="0" w:color="${C.pivotB}"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="${C.pivotB}"/><w:right w:val="single" w:sz="12" w:space="0" w:color="${C.pivotB}"/></w:tcBorders>` : top;
          s += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${cs > 1 ? `<w:gridSpan w:val="${cs}"/>` : ''}${vm}${pv}${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>`;
          if (c.own) {
            const t = textOf(n), jc = HT.cls(n, 'tl') ? 'left' : numLike(t, c.th) ? 'right' : t.length <= 3 ? 'center' : 'left';
            const items = []; n.kids.forEach(k => inlines(k, {b: bold, sz, color: fg, i: n.attrs['data-i'] === '1' || (!n.attrs['data-bg'] && HT.cls(n, 'dm'))}, items, ctx));
            const ps = blocksOf(items, {cell: true, jc, keep: keepAll && i < rows.length - 1});
            s += ps || `<w:p>${pPr({cell: true})}</w:p>`;
          } else s += `<w:p>${pPr({cell: true})}</w:p>`;
          s += '</w:tc>';
          j += cs - 1;
        }
        s += '</w:tr>';
      });
      s += '</w:tbl>';
      out.push(s, `<w:p>${pPr({style: 'AfterTable'})}</w:p>`);
      return out.join('');
    };
    /* przebiegi z obrazami: obraz zawsze w osobnym akapicie */
    const blocksOf = (items, p) => {
      const out = []; let cur = [];
      items.forEach(it => { if (it.img) { if (cur.length) out.push(para(cur, p)); cur = []; out.push(para([it], {...p, jc: 'center'})); } else cur.push(it); });
      if (cur.length) out.push(para(cur, p));
      return out.join('');
    };
    /* bloki: przepływ akapitów z przebiegów, bloki zagnieżdżone osobno */
    const flow = (n, st) => {
      const out = []; let cur = [];
      const flush = (p = st) => { if (cur.length) out.push(blocksOf(cur, p)); cur = []; };
      const kids = n.kids;
      kids.forEach((k, idx) => {
        if (!isBlock(k)) { inlines(k, st.f || {}, cur, ctx); return; }
        const nextIsContent = () => { for (let q = idx + 1; q < kids.length; q++) { const z = kids[q]; if (z.text !== undefined && !z.text.trim()) continue; return z.tag === 'table' || HT.cls(z, 'tw') || z.tag === 'img' || z.tag === 'svg' || HT.cls(z, 'formula'); } return false; };
        flush();
        out.push(blockXML(k, st, nextIsContent()));
      });
      flush();
      return out.join('');
    };
    const blockXML = (n, st, beforeContent) => {
      if (HT.SKIP.has(n.tag) && n.tag !== 'svg' || HT.hidden(n) || HT.cls(n, 'gctog') || n.tag === 'canvas') return '';
      if (n.tag === 'svg') return para([{t: '[rysunek – w raporcie PDF]', f: {i: true, color: C.note}}], {style: 'Hint'});
      if (n.tag === 'img') return blocksOf([{img: n}], {});
      if (n.tag === 'hr') return '';
      if (/^h[1-6]$/.test(n.tag)) { const items = []; inlines(n, {}, items, ctx); return para(items, {style: 'Heading' + Math.min(4, +n.tag[1]), keep: true}); }
      if (n.tag === 'summary') { const items = []; inlines(n, {}, items, ctx); return para(items, {style: 'Heading4', keep: true}); }
      if (n.tag === 'table') return table(n, st);
      if (n.tag === 'ul' || n.tag === 'ol') {                          // listy (też drzewo podziału i ograniczeń) – wcięcie wg poziomu zagnieżdżenia
        const lvl = st.lvl || 0; let k = 0;
        return n.kids.filter(z => z.tag === 'li').map(li => { k++;
          const items = [{t: (n.tag === 'ol' ? k + '.' : lvl % 2 ? '◦' : '•') + '\t', f: {}}]; const nested = [];
          li.kids.forEach(z => { if (isBlock(z) && z.tag !== 'li') nested.push(z); else inlines(z, {}, items, ctx); });
          return para(items, {style: 'ListPara', ind: 360 + 360 * Math.min(lvl, 8), hang: 240}) + nested.map(z => blockXML(z, {...st, lvl: lvl + 1}, false)).join(''); }).join('');
      }
      if (n.tag === 'pre') { const t = n.kids.map(z => HT.text(z)).join(''); return t.split('\n').map(l => para([{t: l || ' ', f: {mono: true}}], {style: 'Formula'})).join(''); }
      let style = st.style;
      if (HT.cls(n, 'sum')) style = 'Sum'; else if (HT.cls(n, 'msg')) style = 'Msg'; else if (HT.cls(n, 'formula')) style = 'Formula';
      else if (HT.cls(n, 'hint') || HT.cls(n, 'note')) style = 'Hint';
      const hasBlocks = n.kids.some(isBlock);
      if (!hasBlocks) { const items = []; n.kids.forEach(k => inlines(k, {}, items, ctx)); const short = HT.text(n).length <= 160;
        return blocksOf(items, {style, keep: beforeContent || (n.tag === 'p' && short && /:$/.test(HT.text(n)))}); }
      return flow(n, {...st, style});
    };
    // sekcje: tytuł raportu, data, potem [tytuł sekcji, HTML]
    if (o.title) body.push(para([{t: o.title, f: {}}], {style: 'Title'}));
    if (o.date) body.push(para([{t: o.date, f: {color: C.note}}], {}));
    sections.forEach(([title, html]) => {
      body.push(para([{t: title, f: {}}], {style: 'Heading2', keep: true}));
      body.push(flow(HT.parse(html), {}));
    });
    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body.join('')}` +
      `<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="${W}" w:h="${H}"/><w:pgMar w:top="${MAR}" w:right="${MAR}" w:bottom="${MAR}" w:left="${MAR}" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const fld = code => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
    const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ${NS}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:jc w:val="center"/></w:pPr>` +
      `<w:r><w:t xml:space="preserve">${x(o.footer || 'OptiLab – Badania Operacyjne · Made by Aleksander Kruszelnicki')} · strona </w:t></w:r>${fld('PAGE')}<w:r><w:t xml:space="preserve"> z </w:t></w:r>${fld('NUMPAGES')}</w:p></w:ftr>`;
    const rPrD = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:color w:val="${C.ink}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="pl-PL"/>`;
    const box = (c, bg, left) => `<w:pBdr>${left ? `<w:left w:val="single" w:sz="18" w:space="6" w:color="${c}"/>` : ['top', 'left', 'bottom', 'right'].map(b => `<w:${b} w:val="single" w:sz="8" w:space="4" w:color="${c}"/>`).join('')}</w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`;
    const st = (id, name, ppr, rpr, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>${extra}<w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:docDefaults><w:rPrDefault><w:rPr>${rPrD}</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      st('Title', 'Title', '<w:keepNext/><w:spacing w:before="0" w:after="60"/>', `<w:b/><w:color w:val="${C.ink}"/><w:sz w:val="34"/><w:szCs w:val="34"/>`) +
      st('Heading1', 'heading 1', '<w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="32"/><w:szCs w:val="32"/>') +
      st('Heading2', 'heading 2', `<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${C.ink}"/></w:pBdr><w:spacing w:before="260" w:after="120"/><w:outlineLvl w:val="1"/>`, '<w:b/><w:sz w:val="28"/><w:szCs w:val="28"/>') +
      st('Heading3', 'heading 3', '<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/>', '<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/>') +
      st('Heading4', 'heading 4', '<w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="3"/>', '<w:b/><w:sz w:val="21"/><w:szCs w:val="21"/>') +
      st('Sum', 'OptiLab – wynik', `<w:keepLines/>${box(C.ok, C.best)}<w:spacing w:before="80" w:after="120"/><w:ind w:left="120" w:right="120"/>`, '') +
      st('Msg', 'OptiLab – komunikat', `<w:keepLines/>${box(C.err, C.errBg)}<w:spacing w:before="80" w:after="120"/><w:ind w:left="120" w:right="120"/>`, `<w:color w:val="${C.errInk}"/>`) +
      st('Formula', 'OptiLab – wzór', `<w:keepLines/>${box(C.ink, C.formula, true)}<w:spacing w:before="40" w:after="80"/><w:ind w:left="200"/>`, '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:sz w:val="21"/><w:szCs w:val="21"/>') +
      st('Hint', 'OptiLab – podpowiedź', '<w:spacing w:after="80"/>', `<w:color w:val="${C.note}"/><w:sz w:val="18"/><w:szCs w:val="18"/>`) +
      st('ListPara', 'OptiLab – punkt listy', '<w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="240"/>', '') +
      st('Caption', 'caption', '<w:keepNext/><w:spacing w:before="60" w:after="40"/>', `<w:i/><w:color w:val="${C.note}"/><w:sz w:val="18"/><w:szCs w:val="18"/>`) +
      st('AfterTable', 'OptiLab – odstęp po tabeli', '<w:spacing w:before="0" w:after="60" w:line="120" w:lineRule="exact"/>', '<w:sz w:val="8"/>') +
      st('Footer', 'footer', '<w:spacing w:after="0"/>', `<w:color w:val="${C.note}"/><w:sz w:val="16"/><w:szCs w:val="16"/>`) +
      `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>` +
      `<w:style w:type="table" w:styleId="OptiTable"><w:name w:val="OptiLab – tabela"/><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="${C.line}"/>`).join('')}</w:tblBorders></w:tblPr></w:style>` +
      '</w:styles>';
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
      media.map(m => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.name.slice(5)}"/>`).join('') + '</Relationships>';
    const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="708"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat><w:themeFontLang w:val="pl-PL"/></w:settings>`;
    const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
    const iso = (o.when || new Date(2026, 0, 1)).toISOString().replace(/\.\d+Z$/, 'Z');
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
      `<dc:title>${x(o.title || 'Raport OptiLab')}</dc:title><dc:creator>OptiLab</dc:creator><dc:language>pl-PL</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
    const app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>OptiLab – Badania Operacyjne</Application></Properties>';
    return [
      {name: '[Content_Types].xml', data: utf8(types)}, {name: '_rels/.rels', data: utf8(rootRels)},
      {name: 'word/document.xml', data: utf8(doc)}, {name: 'word/styles.xml', data: utf8(styles)}, {name: 'word/settings.xml', data: utf8(settings)},
      {name: 'word/footer1.xml', data: utf8(footer)}, {name: 'word/_rels/document.xml.rels', data: utf8(rels)},
      {name: 'docProps/core.xml', data: utf8(core)}, {name: 'docProps/app.xml', data: utf8(app)},
      ...media.map(m => ({name: m.name, data: m.data, png: true}))];
  }
  return {build, zip, crc32, b64, pngSize, utf8, TW};
})();
