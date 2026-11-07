/* ===== OptiLab – wykresy SVG (wspólne dla modułów) =====
   Wykres Gantta, histogram, wykres liniowy/schodkowy. Czysty SVG: drukuje się w PDF bez JavaScriptu, skaluje się do szerokości. */
const VZ = (() => {
  const r1 = v => Math.round(v * 10) / 10, E = s => String(s ?? '').replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
  const nf = v => String(Math.round(v * 1000) / 1000).replace('.', ',');
  function ticks(lo, hi, n = 6) {                                         // „ładne" podziałki osi
    if (!(hi > lo)) hi = lo + 1;
    const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= raw) || 10 * p;
    const out = []; for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-9; v += st) out.push(Math.round(v / st) * st); return out;
  }
  const wrap = (W, H, body, title) => `<div class="tw"><svg class="vzsvg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${E(title || 'Wykres')}">${body}</svg></div>`;
  /* rows: [{label, bars: [{s, e, cls, text}]}]; o: {tmax, title, marks: [{t, label, cls}], unit} */
  function gantt(rows, o = {}) {
    const L = 120, W = 760, rh = 26, top = 18, H = top + rows.length * rh + 34, tmax = o.tmax || Math.max(1, ...rows.flatMap(r => r.bars.map(b => b.e)));
    const X = t => L + (W - L - 16) * t / tmax; let s = '';
    ticks(0, tmax, 8).forEach(v => { s += `<line class="vzg" x1="${r1(X(v))}" y1="${top - 4}" x2="${r1(X(v))}" y2="${top + rows.length * rh}"/><text class="vzt" x="${r1(X(v))}" y="${top + rows.length * rh + 14}" text-anchor="middle">${nf(v)}</text>`; });
    rows.forEach((r, i) => {
      const y = top + i * rh; s += `<text class="vzl" x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end">${E(r.label)}</text>`;
      r.bars.forEach(b => { const x1 = X(b.s), w = Math.max(0.5, X(b.e) - x1);
        s += `<rect class="vzb ${b.cls || ''}" x="${r1(x1)}" y="${y + 4}" width="${r1(w)}" height="${rh - 8}" rx="3"/>` + (b.text && w > 7 * String(b.text).length ? `<text class="vzbt" x="${r1(x1 + w / 2)}" y="${y + rh / 2 + 4}" text-anchor="middle">${E(b.text)}</text>` : ''); });
    });
    (o.marks || []).forEach(m => { s += `<line class="vzm ${m.cls || ''}" x1="${r1(X(m.t))}" y1="${top - 8}" x2="${r1(X(m.t))}" y2="${top + rows.length * rh + 2}"/><text class="vzt" x="${r1(X(m.t))}" y="${top - 9}" text-anchor="middle">${E(m.label)}</text>`; });
    s += `<text class="vzt" x="${W - 16}" y="${H - 4}" text-anchor="end">${E(o.unit || 'czas')}</text>`;
    return wrap(W, H, s, o.title);
  }
  /* values: liczby; o: {bins, title, xLabel, marks: [{x, label, cls}], curve: x => gęstość (rysowana jako linia skalowana do histogramu)} */
  function hist(values, o = {}) {
    const W = 680, H = 300, L = 54, B = 40, T = 16, R = 14, n = values.length, lo = Math.min(...values), hi0 = Math.max(...values), hi = hi0 > lo ? hi0 : lo + 1;
    const k = o.bins || Math.min(40, Math.max(8, Math.ceil(Math.log2(n) + 1))), w = (hi - lo) / k, cnt = Array(k).fill(0);
    values.forEach(v => { cnt[Math.min(k - 1, Math.floor((v - lo) / w))]++; });
    const ymax = Math.max(...cnt) / n, X = x => L + (W - L - R) * (x - lo) / (hi - lo), Y = p => T + (H - T - B) * (1 - p / (ymax * 1.08));
    let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    cnt.forEach((c, i) => { const x1 = X(lo + i * w), x2 = X(lo + (i + 1) * w); s += `<rect class="vzh" x="${r1(x1)}" y="${r1(Y(c / n))}" width="${r1(Math.max(0.5, x2 - x1 - 1))}" height="${r1(H - B - Y(c / n))}"/>`; });
    if (o.curve) { let d = ''; for (let i = 0; i <= 100; i++) { const x = lo + (hi - lo) * i / 100; d += (i ? 'L' : 'M') + r1(X(x)) + ' ' + r1(Y(o.curve(x) * w)); } s += `<path class="vzc" d="${d}"/>`; }
    ticks(lo, hi, 7).forEach(v => { if (v >= lo && v <= hi) s += `<text class="vzt" x="${r1(X(v))}" y="${H - B + 15}" text-anchor="middle">${nf(v)}</text>`; });
    ticks(0, ymax * 1.08, 4).forEach(v => { s += `<text class="vzt" x="${L - 6}" y="${r1(Y(v) + 4)}" text-anchor="end">${nf(v * 100)}%</text>`; });
    (o.marks || []).forEach(m => { if (m.x >= lo && m.x <= hi) s += `<line class="vzm ${m.cls || ''}" x1="${r1(X(m.x))}" y1="${T}" x2="${r1(X(m.x))}" y2="${H - B}"/><text class="vzt" x="${r1(X(m.x) + 4)}" y="${T + 10}">${E(m.label)}</text>`; });
    if (o.xLabel) s += `<text class="vzt" x="${W - R}" y="${H - 6}" text-anchor="end">${E(o.xLabel)}</text>`;
    return wrap(W, H, s, o.title);
  }
  /* series: [{name, pts: [[x, y]], cls, step, dots}]; o: {title, xLabel, yLabel, marks: [{x, y, label}]} */
  function line(series, o = {}) {
    const legRows = series.length > 1 ? Math.ceil(series.length / 4) : 1, W = 680, H = 300 + 14 * (legRows - 1), L = 62, B = 40, T = 18 + 14 * (legRows - 1), R = 16, all = series.flatMap(s => s.pts);
    const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0])), y0 = Math.min(...all.map(p => p[1])), y1 = Math.max(...all.map(p => p[1]));
    const xl = x0, xh = x1 > x0 ? x1 : x0 + 1, pad = (y1 - y0) * 0.08 || Math.abs(y1) * 0.1 || 1, yl = y0 - pad, yh = y1 + pad;
    const X = x => L + (W - L - R) * (x - xl) / (xh - xl), Y = y => T + (H - T - B) * (1 - (y - yl) / (yh - yl));
    let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    ticks(xl, xh, 7).forEach(v => { if (v >= xl - 1e-9 && v <= xh + 1e-9) s += `<line class="vzg" x1="${r1(X(v))}" y1="${T}" x2="${r1(X(v))}" y2="${H - B}"/><text class="vzt" x="${r1(X(v))}" y="${H - B + 15}" text-anchor="middle">${nf(v)}</text>`; });
    ticks(yl, yh, 5).forEach(v => { if (v >= yl && v <= yh) s += `<line class="vzg" x1="${L}" y1="${r1(Y(v))}" x2="${W - R}" y2="${r1(Y(v))}"/><text class="vzt" x="${L - 6}" y="${r1(Y(v) + 4)}" text-anchor="end">${nf(v)}</text>`; });
    series.forEach(sr => { let d = ''; sr.pts.forEach((p, i) => { if (i && sr.step) d += `L${r1(X(p[0]))} ${r1(Y(sr.pts[i - 1][1]))}`; d += (i ? 'L' : 'M') + r1(X(p[0])) + ' ' + r1(Y(p[1])); });
      s += `<path class="vzline ${sr.cls || ''}" d="${d}"/>` + (sr.dots ? sr.pts.map(p => `<circle class="vzdot ${sr.cls || ''}" cx="${r1(X(p[0]))}" cy="${r1(Y(p[1]))}" r="3.5"/>`).join('') : ''); });
    (o.marks || []).forEach(m => { s += `<circle class="vzmark" cx="${r1(X(m.x))}" cy="${r1(Y(m.y))}" r="6"/><text class="vzt b" x="${r1(X(m.x) + 8)}" y="${r1(Y(m.y) - 8)}">${E(m.label)}</text>`; });
    if (series.length > 1) series.forEach((sr, i) => { const lx = L + 10 + (i % 4) * 150, ly = 6 + 14 * Math.floor(i / 4); s += `<rect class="vzleg ${sr.cls || ''}" x="${lx}" y="${ly}" width="14" height="4"/><text class="vzt" x="${lx + 18}" y="${ly + 5}">${E(sr.name)}</text>`; });
    if (o.xLabel) s += `<text class="vzt" x="${W - R}" y="${H - 6}" text-anchor="end">${E(o.xLabel)}</text>`;
    if (o.yLabel) s += `<text class="vzt" x="${L + 4}" y="${T + 10}">${E(o.yLabel)}</text>`;
    return wrap(W, H, s, o.title);
  }
  /* labels, values: słupki; o: {title, yLabel, pct (wartości jako %), cls: [klasa słupka], valueText} */
  function bars(labels, values, o = {}) {
    const n = values.length, W = Math.max(380, Math.min(760, 70 + n * 34)), H = 280, L = 54, B = 46, T = 18, R = 12, ymax = Math.max(1e-12, ...values) * 1.12;
    const bw = (W - L - R) / n, Y = v => T + (H - T - B) * (1 - v / ymax), fv = v => o.pct ? nf(Math.round(v * 1000) / 10) + '%' : nf(Math.round(v * 1000) / 1000);
    let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    ticks(0, ymax, 4).forEach(v => { if (v <= ymax) s += `<line class="vzg" x1="${L}" y1="${r1(Y(v))}" x2="${W - R}" y2="${r1(Y(v))}"/><text class="vzt" x="${L - 6}" y="${r1(Y(v) + 4)}" text-anchor="end">${fv(v)}</text>`; });
    values.forEach((v, i) => { const x = L + i * bw + bw * 0.15, w = bw * 0.7;
      s += `<rect class="vzbar ${(o.cls || [])[i] || ''}" x="${r1(x)}" y="${r1(Y(v))}" width="${r1(w)}" height="${r1(H - B - Y(v))}"/><text class="vzt" x="${r1(x + w / 2)}" y="${H - B + 14}" text-anchor="middle">${E(labels[i])}</text>` +
        (o.valueText && n <= 16 ? `<text class="vzt" x="${r1(x + w / 2)}" y="${r1(Y(v) - 4)}" text-anchor="middle">${fv(v)}</text>` : ''); });
    if (o.yLabel) s += `<text class="vzt" x="${L + 4}" y="${T + 10}">${E(o.yLabel)}</text>`;
    if (o.xLabel) s += `<text class="vzt" x="${W - R}" y="${H - 6}" text-anchor="end">${E(o.xLabel)}</text>`;
    return wrap(W, H, s, o.title);
  }
  /* graf stanów: names, edges [{a, b, label, cls}]; o: {layout: 'circle' | 'line', cls: [klasa węzła], title}. Pętle własne, łuki w obie strony wygięte */
  function stateGraph(names, edges, o = {}) {
    const n = names.length, line = o.layout === 'line', R = 21;
    const W = line ? Math.max(360, 70 + n * 96) : Math.max(360, Math.min(720, 220 + n * 46)), H = line ? 190 : Math.max(300, Math.min(640, 200 + n * 40));
    const pos = names.map((_, i) => line ? {x: 50 + i * (W - 100) / Math.max(1, n - 1), y: H / 2} : {x: W / 2 + (W / 2 - 60) * Math.cos(2 * Math.PI * i / n - Math.PI / 2), y: H / 2 + (H / 2 - 60) * Math.sin(2 * Math.PI * i / n - Math.PI / 2)});
    const has = new Set(edges.map(e => e.a + '>' + e.b)); let s = '<defs><marker id="sgarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="sgah"/></marker></defs>';
    edges.forEach(e => {
      const A = pos[e.a], Bp = pos[e.b];
      if (e.a === e.b) { const cx = A.x, cy = A.y - (line ? 1 : 1) * (R + 14), lx = cx, ly = cy - 18;
        s += `<path class="sge ${e.cls || ''}" d="M${r1(A.x - 9)} ${r1(A.y - R + 3)} C ${r1(cx - 30)} ${r1(cy - 26)}, ${r1(cx + 30)} ${r1(cy - 26)}, ${r1(A.x + 9)} ${r1(A.y - R + 3)}" marker-end="url(#sgarr)"/>` + (e.label !== undefined ? `<text class="sgl" x="${r1(lx)}" y="${r1(ly)}" text-anchor="middle">${E(e.label)}</text>` : ''); return; }
      const dx = Bp.x - A.x, dy = Bp.y - A.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, bend = (has.has(e.b + '>' + e.a) ? 0.22 : line ? 0 : 0.08) * d;
      const mx = (A.x + Bp.x) / 2 + nx * bend, my = (A.y + Bp.y) / 2 + ny * bend;
      const sx = A.x + (mx - A.x) / Math.hypot(mx - A.x, my - A.y) * R, sy = A.y + (my - A.y) / Math.hypot(mx - A.x, my - A.y) * R;
      const ex = Bp.x + (mx - Bp.x) / Math.hypot(mx - Bp.x, my - Bp.y) * (R + 2), ey = Bp.y + (my - Bp.y) / Math.hypot(mx - Bp.x, my - Bp.y) * (R + 2);
      s += `<path class="sge ${e.cls || ''}" d="M${r1(sx)} ${r1(sy)} Q ${r1(mx)} ${r1(my)} ${r1(ex)} ${r1(ey)}" marker-end="url(#sgarr)"/>` +
        (e.label !== undefined ? `<text class="sgl" x="${r1((A.x + Bp.x) / 4 + mx / 2)}" y="${r1((A.y + Bp.y) / 4 + my / 2 + (ny > 0 ? 12 : -4))}" text-anchor="middle">${E(e.label)}</text>` : '');
    });
    names.forEach((nm, i) => { s += `<circle class="sgn ${(o.cls || [])[i] || ''}" cx="${r1(pos[i].x)}" cy="${r1(pos[i].y)}" r="${R}"/><text class="sgt" x="${r1(pos[i].x)}" y="${r1(pos[i].y + 4)}" text-anchor="middle">${E(nm)}</text>`; });
    return wrap(W, H, s, o.title);
  }
  /* karta kontrolna: v – wartości, cl/ucl/lcl – tablice (granice mogą się zmieniać), o: {flags: Set indeksów, sig: tablica σ (strefy ±1σ, ±2σ), title, yLabel, start (numer pierwszego punktu)} */
  function control(v, cl, ucl, lcl, o = {}) {
    const n = v.length, W = 720, H = 300, L = 62, B = 34, T = 16, R = 70, st = o.start ?? 1, all = [...v, ...ucl, ...lcl].filter(isFinite);
    const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 1, y0 = lo - pad, y1 = hi + pad;
    const X = i => L + (W - L - R) * (n > 1 ? i / (n - 1) : 0.5), Y = y => T + (H - T - B) * (1 - (y - y0) / (y1 - y0)), path = arr => arr.map((y, i) => (i ? 'L' : 'M') + r1(X(i)) + ' ' + r1(Y(y))).join('');
    const step = arr => { let d = ''; arr.forEach((y, i) => { const xa = n > 1 ? X(Math.max(0, i - 0.5)) : L, xb = n > 1 ? X(Math.min(n - 1, i + 0.5)) : W - R; d += (i ? 'L' : 'M') + r1(xa) + ' ' + r1(Y(y)) + 'L' + r1(xb) + ' ' + r1(Y(y)); }); return d; };
    let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
    if (o.sig) [1, 2].forEach(k => { s += `<path class="vzzone" d="${step(cl.map((c, i) => c + k * o.sig[i]))}"/><path class="vzzone" d="${step(cl.map((c, i) => c - k * o.sig[i]))}"/>`; });
    s += `<path class="vzlim" d="${step(ucl)}"/><path class="vzlim" d="${step(lcl)}"/><path class="vzcl" d="${step(cl)}"/><path class="vzline" d="${path(v)}"/>`;
    v.forEach((y, i) => { const f = o.flags && o.flags.has(i); s += `<circle class="vzdot${f ? ' b' : ''}" cx="${r1(X(i))}" cy="${r1(Y(y))}" r="${f ? 5 : 3.2}"/>`; });
    [['UCL', ucl[n - 1]], ['CL', cl[n - 1]], ['LCL', lcl[n - 1]]].forEach(([t, y]) => { s += `<text class="vzt b" x="${W - R + 6}" y="${r1(Y(y) + 4)}">${t} ${nf(Math.round(y * 1000) / 1000)}</text>`; });
    ticks(y0, y1, 5).forEach(y => { if (y >= y0 && y <= y1) s += `<text class="vzt" x="${L - 6}" y="${r1(Y(y) + 4)}" text-anchor="end">${nf(y)}</text>`; });
    const every = Math.max(1, Math.ceil(n / 15)); v.forEach((_, i) => { if (i % every === 0 || i === n - 1) s += `<text class="vzt" x="${r1(X(i))}" y="${H - B + 14}" text-anchor="middle">${st + i}</text>`; });
    if (o.yLabel) s += `<text class="vzt" x="${L + 4}" y="${T + 10}">${E(o.yLabel)}</text>`;
    return wrap(W, H, s, o.title);
  }
  /* Pareto: słupki malejąco + linia skumulowanego udziału (oś prawa 0–100%) */
  function pareto(items, o = {}) {
    const n = items.length, W = Math.max(420, Math.min(760, 90 + n * 60)), H = 300, L = 54, B = 56, T = 16, R = 50, ymax = Math.max(...items.map(x => x.v)) * 1.1, bw = (W - L - R) / n;
    const Y = v => T + (H - T - B) * (1 - v / ymax), Yp = p => T + (H - T - B) * (1 - p);
    let s = `<line class="vza" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="vza" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/><line class="vza" x1="${W - R}" y1="${T}" x2="${W - R}" y2="${H - B}"/>`;
    s += `<line class="vzm ok" x1="${L}" y1="${r1(Yp(0.8))}" x2="${W - R}" y2="${r1(Yp(0.8))}"/><text class="vzt" x="${W - R + 4}" y="${r1(Yp(0.8) + 4)}">80%</text>`;
    items.forEach((x, i) => { const x0 = L + i * bw + bw * 0.15, w = bw * 0.7; s += `<rect class="vzbar${x.cum - x.share < 0.8 - 1e-9 ? ' b' : ''}" x="${r1(x0)}" y="${r1(Y(x.v))}" width="${r1(w)}" height="${r1(H - B - Y(x.v))}"/>` +
      `<text class="vzt" x="${r1(x0 + w / 2)}" y="${H - B + 14}" text-anchor="middle">${E(String(x.nm).slice(0, 12))}</text>`; });
    s += `<path class="vzline c" d="${items.map((x, i) => (i ? 'L' : 'M') + r1(L + (i + 0.5) * bw) + ' ' + r1(Yp(x.cum))).join('')}"/>` + items.map((x, i) => `<circle class="vzdot c" cx="${r1(L + (i + 0.5) * bw)}" cy="${r1(Yp(x.cum))}" r="3.5"/>`).join('');
    [0, 0.25, 0.5, 0.75, 1].forEach(p => { s += `<text class="vzt" x="${W - R + 4}" y="${r1(Yp(p) + 4 - (p === 0.75 ? 0 : 0))}">${p === 0.75 ? '' : Math.round(p * 100) + '%'}</text>`; });
    ticks(0, ymax, 4).forEach(v => { if (v <= ymax) s += `<text class="vzt" x="${L - 6}" y="${r1(Y(v) + 4)}" text-anchor="end">${nf(v)}</text>`; });
    return wrap(W, H, s, o.title);
  }
  return {gantt, hist, line, ticks, bars, stateGraph, control, pareto};
})();
