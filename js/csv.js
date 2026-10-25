/* ===== OptiLab – import i eksport CSV (Excel) dla programowania liniowego =====
   Czyste funkcje bez DOM (testowalne w Node). Format (separator ; , lub tabulator; przecinek dziesiętny dozwolony):
     ;x1;x2;znak;prawa strona      ← nagłówek (opcjonalny)
     max;3;5                        ← funkcja celu: „max" lub „min" i współczynniki
     typ;c;i                        ← opcjonalnie: c ≥0, i całkowita, b binarna, u dowolna
     ograniczenie 1;1;0;<=;4        ← etykieta; współczynniki; znak (<=, >=, =, ≤, ≥); prawa strona
   Puste komórki współczynników traktujemy jak 0 (tak zapisuje je Excel). */
function parseLPcsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), firstIdx = lines.findIndex(l => l.trim());
  if (firstIdx < 0) throw new Error('plik jest pusty.');
  const f = lines[firstIdx], sep = f.includes(';') ? ';' : f.includes('\t') ? '\t' : ',';
  const num = (s, ln) => {
    let v = String(s ?? '').trim().replace(/\s/g, ''); if (sep !== ',') v = v.replace(',', '.');   // przecinek dziesiętny tylko gdy nie jest separatorem
    if (v === '') return 0;
    const x = Number(v); if (!isFinite(x)) throw new Error(`wiersz ${ln}: „${s}" nie jest liczbą.`); return x;
  };
  const relOf = s => ({'<=': '<=', '≤': '<=', '=<': '<=', '>=': '>=', '≥': '>=', '=>': '>=', '=': '=', '==': '='})[String(s).trim()];
  const typeOf = s => { const v = String(s).trim().toLowerCase();
    return /^(c|ciągła|ciagla|≥0|>=0)$/.test(v) ? 'c' : /^(i|całkowita|calkowita)$/.test(v) ? 'i' : /^(b|binarna)$/.test(v) ? 'b' : /^(u|dowolna)$/.test(v) ? 'u' : null; };
  let maxi = null, c = null, t = null, header = false; const rows = [];
  lines.forEach((raw, idx) => {
    const ln = idx + 1; if (!raw.trim()) return;
    const cells = raw.split(sep).map(s => s.trim().replace(/^"(.*)"$/, '$1'));
    while (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
    const head = cells[0].toLowerCase();
    if (/^(max|maks|min)/.test(head)) {
      if (c) throw new Error(`wiersz ${ln}: funkcja celu jest podana drugi raz.`);
      maxi = !head.startsWith('min'); c = cells.slice(1).map(s => num(s, ln));
      if (c.length < 1) throw new Error(`wiersz ${ln}: brak współczynników funkcji celu.`);
      return;
    }
    if (/^typ/.test(head)) {
      if (!c) throw new Error(`wiersz ${ln}: wiersz „typ" musi być po wierszu funkcji celu.`);
      t = cells.slice(1).map((s, j) => { const v = typeOf(s); if (!v) throw new Error(`wiersz ${ln}: nieznany typ zmiennej x${j + 1} „${s}" (użyj c, i, b lub u).`); return v; });
      return;
    }
    if (!c) {
      if (!header) { header = true; return; }                      // pierwszy wiersz bez „max/min" = nagłówek
      throw new Error(`wiersz ${ln}: przed ograniczeniami musi być wiersz funkcji celu zaczynający się od „max" lub „min".`);
    }
    const n = c.length, body = cells.slice(1);
    if (body.length < n + 2) throw new Error(`wiersz ${ln}: oczekiwano ${n} współczynników, znaku (<=, >= lub =) i prawej strony.`);
    const rel = relOf(body[n]); if (!rel) throw new Error(`wiersz ${ln}: nieznany znak „${body[n]}" – użyj <=, >= lub =.`);
    rows.push({a: body.slice(0, n).map(s => num(s, ln)), rel, b: num(body[n + 1], ln)});
  });
  if (!c) throw new Error('brak wiersza funkcji celu (zaczynającego się od „max" lub „min").');
  if (!rows.length) throw new Error('brak ograniczeń.');
  return {optilab: 1, maxi, c: c.map(String), t: t ? t.slice(0, c.length) : undefined,
    rows: rows.map(r => ({a: r.a.map(String), rel: r.rel, b: String(r.b)}))};
}
/* Eksport w formacie dla polskiego Excela: separator ;, przecinek dziesiętny, BOM (polskie znaki) */
function toLPcsv(md) {
  const v = s => String(s).replace('.', ',');
  const L = [['', ...md.c.map((_, j) => 'x' + (j + 1)), 'znak', 'prawa strona'], [md.maxi ? 'max' : 'min', ...md.c.map(v)]];
  if (md.t && md.t.some(x => x !== 'c')) L.push(['typ', ...md.t]);
  md.rows.forEach((r, i) => L.push(['ograniczenie ' + (i + 1), ...r.a.map(v), r.rel, v(r.b)]));
  return '\uFEFF' + L.map(r => r.join(';')).join('\r\n') + '\r\n';
}
