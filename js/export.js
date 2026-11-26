/* ===== OptiLab – eksport raportu do Worda (.docx) i wyników do Excela (.csv) w przeglądarce =====
   Ten sam raport, który trafia do PDF (sekcje bieżącej zakładki – reportSections w app.js). Przed budową pliku Word raport
   jest na chwilę wstawiany poza ekranem, żeby: (1) odczytać jego wygląd z css/style.css (tło i kolor komórek, pogrubienia,
   małe liczby w rogu komórek) – dopisujemy go jako data-bg/data-fg/data-b…, które czyta js/docx.js; (2) zamienić rysunki SVG
   (sieci, wykresy, Gantt) na obrazy PNG (canvas, skala 2×). Tabele zostają tabelami Worda – nie są zrzutami.
   Pliki XML są kompresowane (CompressionStream „deflate-raw”), a gdy przeglądarka tego nie umie – zapisywane bez kompresji. */
const EXPORT = (() => {
  const today = () => new Date().toISOString().slice(0, 10);
  const hex = c => { const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/.exec(c || ''); if (!m || m[4] === '0') return '';
    return [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const fade = (h, o) => o >= 1 ? h : h.match(/../g).map(v => Math.round(parseInt(v, 16) * o + 255 * (1 - o)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const INK = '1B2A4E';
  /* wygląd komórek i wyróżnień z obliczonych stylów (tak jak na ekranie) */
  function annotate(box) {
    box.querySelectorAll('td, th').forEach(el => {
      const cs = getComputedStyle(el), op = +cs.opacity || 1; let bg = hex(cs.backgroundColor);
      if (!bg && /gradient/.test(cs.backgroundImage)) bg = 'FDECEA';      // komórka zakazana (paski)
      if (bg === 'FFFFFF') bg = '';
      el.dataset.bg = bg ? fade(bg, op) : '';
      const fg = fade(hex(cs.color) || INK, op); if (fg !== INK) el.dataset.fg = fg;
      el.dataset.b = +cs.fontWeight >= 600 ? '1' : '0'; if (cs.fontStyle === 'italic') el.dataset.i = '1';
    });
    box.querySelectorAll('span').forEach(el => {
      const cs = getComputedStyle(el), pc = getComputedStyle(el.parentElement), fg = hex(cs.color);
      if (fg && fg !== hex(pc.color)) el.dataset.fg = fg;
      const r = parseFloat(cs.fontSize) / (parseFloat(pc.fontSize) || 1); if (r < .95) el.dataset.small = r.toFixed(2);
      if ((+cs.fontWeight >= 600) !== (+pc.fontWeight >= 600)) el.dataset.b = +cs.fontWeight >= 600 ? '1' : '0';
      if (cs.fontStyle === 'italic' && pc.fontStyle !== 'italic') el.dataset.i = '1';
      el.dataset.abs = cs.position === 'absolute' ? '1' : '0';
    });
  }
  const SVGP = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-family', 'font-size',
    'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'paint-order', 'visibility', 'display', 'letter-spacing'];
  function inlineSVG(src, dst) {                                      // style z CSS → atrybut style (obraz SVG nie widzi arkusza strony)
    const a = [src, ...src.querySelectorAll('*')], b = [dst, ...dst.querySelectorAll('*')];
    a.forEach((el, i) => { const cs = getComputedStyle(el); b[i].setAttribute('style', SVGP.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';')); });
  }
  async function rasterize(box) {
    for (const svg of [...box.querySelectorAll('svg')]) {
      try {
        const r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
        const w = Math.round(r.width || (vb && vb.width) || 600), h = Math.round(r.height || (vb && vb.height) || 400); if (!w || !h) continue;
        const cl = svg.cloneNode(true); inlineSVG(svg, cl);
        cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', w); cl.setAttribute('height', h); cl.removeAttribute('class');
        const img = new Image();
        await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl)); });
        const k = 2, cv = document.createElement('canvas'); cv.width = w * k; cv.height = h * k;
        const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.scale(k, k); g.drawImage(img, 0, 0, w, h);
        const im = document.createElement('img'); im.src = cv.toDataURL('image/png'); im.dataset.w = w; im.dataset.h = h; im.alt = svg.getAttribute('aria-label') || 'Rysunek';
        svg.replaceWith(im);
      } catch (_) { /* rysunek, którego nie da się zamienić, w Wordzie opisujemy słowami */ }
    }
  }
  /* raport poza ekranem → HTML z opisem wyglądu i rysunkami PNG */
  async function prepare(sec) {
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:-10000px;top:0;width:690px;background:#fff;color:var(--ink)';
    box.innerHTML = sec.map(([, body], k) => `<section data-k="${k}">${body}</section>`).join('');
    document.body.append(box);
    try {
      box.querySelectorAll('details').forEach(d => { d.open = true; });
      annotate(box); await rasterize(box);
      return sec.map(([ti], k) => [ti, box.querySelector(`section[data-k="${k}"]`).innerHTML]);
    } finally { box.remove(); }
  }
  const deflate = async u8 => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  async function docx(sec, t, title) {
    const files = DOCX.build(await prepare(sec), {title, date: new Date().toLocaleDateString('pl-PL'), when: new Date()});
    if (typeof CompressionStream !== 'undefined') try { for (const f of files) if (!f.png) f.comp = await deflate(f.data); } catch (_) { files.forEach(f => { delete f.comp; }); }
    download(DOCX.zip(files), `optilab-${t}-raport-${today()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
  function csv(sec, t, title) {
    download(HT.reportCSV(sec, {title, date: new Date().toLocaleDateString('pl-PL')}), `optilab-${t}-wyniki-${today()}.csv`, 'text/csv');
  }
  return {docx, csv, prepare};
})();
