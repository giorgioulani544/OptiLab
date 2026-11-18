/* ===== OptiLab – składanie raportu do druku i PDF (tylko obszar wydruku, bez wpływu na obliczenia) =====
   Safari (iPhone, iPad, Mac) słabo dzieli długie raporty na strony: nie powtarza nagłówków tabel (thead), tnie wiersze tabel w połowie
   i ignoruje „nie łam strony zaraz po nagłówku” (break-after: avoid). Szanuje natomiast „nie dziel tego bloku” (break-inside: avoid)
   i wymuszony podział strony. Dlatego przed drukiem sami składamy obszar wydruku:
   1) rozwijane <details> zamieniamy na zwykłe bloki z nagłówkiem, usuwamy linki do pobierania (w druku i tak niewidoczne);
   2) tabele wyższe niż strona dzielimy na kawałki z powtórzonym nagłówkiem kolumn (podpis „ciąg dalszy tabeli”) – pierwszy kawałek
      dobieramy do miejsca na bieżącej stronie, kolejne do pełnej strony; wszystkie kawałki mają te same szerokości kolumn;
   3) nagłówki i krótkie wprowadzenia (np. „3. Części ułamkowe …:”) sklejamy z następnym blokiem w niepodzielną grupę (.keep);
   4) nagłówek, którego nie da się skleić (po nim duży blok), a wypadłby na sam dół strony – zaczyna nową stronę.
   Kawałki i grupy są niepodzielne i niższe niż strona, więc przy złym oszacowaniu przeglądarka przenosi je na następną stronę – nigdy nie tnie.
   Obszar treści strony A4 w px CSS (96 px = 1 cal): Chrome i Firefox z @page margin 12 mm – 703 × 1032 px (mierzymy przy 690 px, jak wcześniej);
   Safari na iPhonie dokłada własne marginesy na stopkę z adresem i numerem strony – ok. 660 × 950 px (zmierzone w PDF z iOS 26). */
const PRINT = (() => {
  const ua = () => (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const webkit = () => /AppleWebKit/.test(ua()) && !/Chrome|Chromium|Edg|OPR/.test(ua());   // Safari i każda przeglądarka na iPhonie (wszystkie mają silnik WebKit)
  const geom = () => webkit() ? {W: 660, H: 940, CH: 860} : {W: 690, H: 1030, CH: 990};    // W – szerokość, H – wysokość strony, CH – największy kawałek tabeli
  const UNBREAK = '.keep, .tw, table, .sum, .formula, img, svg, li, pre, canvas, p.msg';    // bloki, których przeglądarka nie dzieli
  const CONTENT = '.tw, table, .formula, .sum, img, svg, ul, ol, pre, canvas, .keep';         // bloki, które zwykle poprzedza wprowadzenie
  const SAFE = 28, CAP = 16;                                                                  // zapas na błędy oszacowania; podpis „ciąg dalszy”
  const isHead = e => /^H[1-6]$/.test(e.tagName);
  const isLead = e => isHead(e) || (e.tagName === 'P' && !e.classList.contains('msg') && !!e.nextElementSibling &&
    (e.nextElementSibling.matches(CONTENT) || e.textContent.trim().length <= 120));
  const keep = els => { const d = document.createElement('div'); d.className = 'keep'; els[0].before(d); els.forEach(e => d.appendChild(e)); };
  const pageEnd = (t, H) => (Math.floor(t / H) + 1) * H;
  /* Symulacja podziału na strony: niepodzielny blok, który nie mieści się do końca strony (a jest niższy od strony), przechodzi na następną;
     wymuszony podział (data-pb) zaczyna nową stronę. Zwraca położenie na wydruku (px od początku) elementów z `targets`. */
  function simulate(pa, H, targets) {
    const base = pa.getBoundingClientRect().top, pos = new Map(); let shift = 0;
    const holds = el => { for (const t of targets) if (t !== el && el.contains(t)) return true; return false; };
    const walk = el => { for (const ch of el.children) {
      const r = ch.getBoundingClientRect(); if (!r.height && !r.width) continue;               // niewidoczne
      let t = r.top - base + shift;
      if (ch.dataset.pb && t % H > 1) { shift += pageEnd(t, H) - t; t = r.top - base + shift; }
      if (ch.matches(UNBREAK) && !holds(ch)) {
        if (r.height <= H && t + r.height > pageEnd(t, H) + 1) { shift += pageEnd(t, H) - t; t = r.top - base + shift; }
        if (targets.has(ch)) pos.set(ch, t);
      } else { if (targets.has(ch)) pos.set(ch, t); walk(ch); }
    } };
    walk(pa); return pos;
  }
  /* Tabela wyższa niż strona → kawałki z nagłówkiem kolumn; wprowadzenie (nagłówek sekcji, opis) sklejone z pierwszym kawałkiem */
  function chunk(pa, G, tw) {
    const tb = tw.tagName === 'TABLE' ? tw : tw.children.length === 1 && tw.firstElementChild.tagName === 'TABLE' ? tw.firstElementChild : null, head = tb && tb.tHead;
    if (!head || tb.querySelector('table')) return false;
    const rows = [...tb.tBodies].flatMap(b => [...b.rows]);
    if (rows.length < 4 || rows.some(r => [...r.cells].some(c => c.rowSpan > 1))) return false;
    const ref = rows.find(r => [...r.cells].every(c => c.colSpan === 1)); if (!ref) return false;
    const widths = [...ref.cells].map(c => c.getBoundingClientRect().width), tableW = tb.getBoundingClientRect().width;
    const hh = head.getBoundingClientRect().height, rh = rows.map(r => r.getBoundingClientRect().height);
    const lead = []; for (let e = tw.previousElementSibling; e && isLead(e); e = e.previousElementSibling) lead.unshift(e);
    const first = lead[0] || tw, leadH = tw.getBoundingClientRect().top - first.getBoundingClientRect().top, start = simulate(pa, G.H, new Set([first])).get(first) || 0;
    const fits = avail => { let s = hh, k = 0; while (k < rows.length && s + rh[k] <= avail) s += rh[k++]; return k; };
    let avail = Math.min(G.CH, pageEnd(start, G.H) - start) - leadH - SAFE;
    if (fits(avail) < Math.min(3, rows.length)) avail = G.CH - leadH - SAFE;                  // za mało miejsca – tabela (z wprowadzeniem) od nowej strony
    const parts = []; let i = 0;
    while (i < rows.length) { let s = hh + (parts.length ? CAP : 0), j = i;
      while (j < rows.length && (j === i || s + rh[j] <= avail)) s += rh[j++];
      parts.push(rows.slice(i, j)); i = j; avail = G.CH - SAFE; }
    if (parts.length < 2) return false;
    const pieces = parts.map((rs, k) => {
      const t = tb.cloneNode(false); t.style.tableLayout = 'fixed'; t.style.width = tableW + 'px';
      if (k) { const c = document.createElement('caption'); c.className = 'pcont'; c.textContent = 'ciąg dalszy tabeli'; t.appendChild(c); }
      const cg = document.createElement('colgroup'); widths.forEach(w => { const col = document.createElement('col'); col.style.width = w + 'px'; cg.appendChild(col); }); t.appendChild(cg);
      t.appendChild(head.cloneNode(true)); const body = document.createElement('tbody'); rs.forEach(r => body.appendChild(r)); t.appendChild(body);
      if (tw === tb) return t; const w = tw.cloneNode(false); w.appendChild(t); return w;
    });
    tw.replaceWith(...pieces);
    if (lead.length) keep([...lead, pieces[0]]);
    return true;
  }
  /* Nagłówki i wprowadzenia sklejone z następnym blokiem; zwraca nagłówki, których nie dało się skleić (po nich duży blok) */
  function group(pa, G) {
    const groups = [], lone = [];
    const scan = el => { const kids = [...el.children];
      for (let i = 0; i < kids.length; i++) { const e = kids[i];
        if (isLead(e)) { let j = i; while (j < kids.length && isLead(kids[j])) j++;
          if (j < kids.length) { const g = kids.slice(i, j + 1), h = g[g.length - 1].getBoundingClientRect().bottom - g[0].getBoundingClientRect().top;
            if (h <= G.CH - SAFE) { groups.push(g); i = j; continue; } }
          kids.slice(i, j).forEach(x => { if (isHead(x)) lone.push(x); }); i = j - 1; continue; }
        if (!e.matches(UNBREAK)) scan(e);
      } };
    scan(pa); groups.forEach(keep); return lone;
  }
  function paginate(pa, G) {
    pa.querySelectorAll('a.dl').forEach(a => { const p = a.parentElement; a.remove(); if (p && p.tagName === 'P' && !p.textContent.trim() && !p.children.length) p.remove(); });
    pa.querySelectorAll('details').forEach(d => {
      const div = document.createElement('div'), s = [...d.children].find(c => c.tagName === 'SUMMARY'); div.className = 'pdet';
      if (s) { const h = document.createElement('h4'); h.innerHTML = s.innerHTML; div.appendChild(h); s.remove(); }
      while (d.firstChild) div.appendChild(d.firstChild); d.replaceWith(div);
    });
    for (let n = 0; n < 1000; n++) {                                                          // długie tabele po kolei – każdy podział przesuwa dalszą treść
      const tw = [...pa.querySelectorAll('.tw, table')].find(e => !e.dataset.pdone && !e.parentElement.closest('table') &&
        !(e.tagName === 'TABLE' && e.parentElement.classList.contains('tw')) && e.getBoundingClientRect().height > G.CH);
      if (!tw) break;
      tw.dataset.pdone = '1'; chunk(pa, G, tw);
    }
    group(pa, G).forEach(h => {                                                               // osierocony nagłówek na dole strony → nowa strona
      const p = simulate(pa, G.H, new Set([h])).get(h); if (p == null || p % G.H <= 1) return;
      if (pageEnd(p, G.H) - p - h.getBoundingClientRect().height < Math.min(180, G.H * 0.2)) { h.dataset.pb = '1'; h.style.breakBefore = 'page'; h.style.pageBreakBefore = 'always'; }
    });
  }
  return {geom, paginate, simulate};
})();
