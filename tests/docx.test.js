// Raport do Worda (js/docx.js): ZIP sprawdzany niezależnym czytnikiem (zlib: CRC-32 i inflate), wartości kontrolne CRC-32
// i base64 z dokumentacji, poprawność XML (własny sprawdzacz znaczników), tabele jako tabele Worda (scalenia, wiersz nagłówka,
// kolory raportu), style ramek, obrazy PNG. Na końcu prawdziwy raport modułu Transport (Taha: koszt 435).
const vm = require('vm'), zlib = require('zlib'), {order, load} = require('./helpers');
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const c0 = load(['js/htmltree.js', 'js/docx.js']), D = vm.runInContext('DOCX', c0);
const txt = u => Buffer.from(u).toString('utf8');

/* ---------- CRC-32, base64, PNG ---------- */
t('CRC-32 wartość kontrolna „123456789” = CBF43926', D.crc32(Buffer.from('123456789')) === 0xCBF43926);
t('CRC-32 zgodne z zlib.crc32', D.crc32(Buffer.from('Zażółć gęślą jaźń')) === zlib.crc32(Buffer.from('Zażółć gęślą jaźń')));
t('base64: „TWFu” = Man, „SGVsbG8=” = Hello, „YQ==” = a', txt(D.b64('TWFu')) === 'Man' && txt(D.b64('SGVsbG8=')) === 'Hello' && txt(D.b64('YQ==')) === 'a');
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
t('rozmiar PNG z nagłówka (1 × 1)', JSON.stringify(D.pngSize(D.b64(PNG1))) === '{"w":1,"h":1}' && D.pngSize(Buffer.from('GIF89a')) === null);
t('UTF-8 jak w Node', Buffer.compare(Buffer.from(D.utf8('ąę€𝄞')), Buffer.from('ąę€𝄞')) === 0);

/* ---------- ZIP: niezależny czytnik (nagłówki lokalne + katalog centralny) ---------- */
function unzip(buf) {
  const b = Buffer.from(buf), eocd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), n = b.readUInt16LE(eocd + 10), out = {};
  let p = b.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('zły katalog centralny');
    const method = b.readUInt16LE(p + 10), crc = b.readUInt32LE(p + 16), cs = b.readUInt32LE(p + 20), us = b.readUInt32LE(p + 24), nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nl).toString('utf8');
    if (b.readUInt32LE(off) !== 0x04034b50) throw new Error('zły nagłówek lokalny ' + name);
    const start = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), raw = b.slice(start, start + cs);
    const data = method === 8 ? zlib.inflateRawSync(raw) : raw;
    if (data.length !== us || zlib.crc32(data) !== crc) throw new Error('zła suma CRC lub rozmiar ' + name);
    out[name] = data; p += 46 + nl + el + cl;
  }
  return out;
}
const Z = unzip(D.zip([{name: 'a.txt', data: D.utf8('ala ma kota')}, {name: 'katalog/żółw.xml', data: D.utf8('<x/>'.repeat(50)), comp: zlib.deflateRawSync(Buffer.from('<x/>'.repeat(50)))}]));
t('ZIP: plik bez kompresji i skompresowany, polska nazwa, CRC', txt(Z['a.txt']) === 'ala ma kota' && txt(Z['katalog/żółw.xml']) === '<x/>'.repeat(50));

/* ---------- sprawdzacz XML (zrównoważone znaczniki, encje) ---------- */
function wellFormed(s) {
  const st = []; const re = /<\?[^?]*\?>|<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)|<(?![\w/?!])/gi; let m;
  while ((m = re.exec(s))) {
    if (m[0][0] === '&' || m[0] === '<') return 'goły znak ' + m[0] + ' przy ' + s.slice(m.index - 30, m.index + 30);
    if (!m[2]) continue;
    if (m[1]) { if (st.pop() !== m[2]) return 'niezamknięty ' + m[2]; } else if (!m[4]) st.push(m[2]);
  }
  return st.length ? 'otwarte: ' + st.join(',') : '';
}
const files = arr => Object.fromEntries(arr.map(f => [f.name, f]));

/* ---------- dokument z typowymi elementami raportu ---------- */
const html = '<h3>Wynik &amp; analiza</h3><p>Funkcja celu: Z = 3x<sub>1</sub> + 5x<sub>2</sub>, x<sup>2</sup> <b>pogrubione</b><br>druga linia</p>' +
  '<div class="sum"><b>Wynik:</b> Z = 36</div><p class="msg">Uwaga: limit iteracji</p><div class="formula">Z = 3·2 + 5·6</div><p class="hint">podpowiedź</p>' +
  '<ul><li>pierwszy</li><li>drugi <i>kursywa</i></li></ul><p>Tablica:</p>' +
  '<div class="tw"><table><caption>Tablica końcowa</caption><thead><tr><th rowspan="2">Baza</th><th colspan="2">Zmienne</th></tr><tr><th>x<sub>1</sub></th><th>x<sub>2</sub></th></tr></thead>' +
  '<tbody><tr><th>x<sub>1</sub></th><td class="pivot">1</td><td>2,5</td></tr><tr class="sel"><th>s<sub>2</sub></th><td>−3</td><td class="tl">tekst &lt;b&gt;</td></tr></tbody></table></div>' +
  `<img src="data:image/png;base64,${PNG1}" data-w="400" data-h="300" alt="wykres testowy"><svg viewBox="0 0 10 10"><text>x</text></svg><button>Przycisk</button><a class="ghost dl" href="#">⬇ pobierz</a>`;
const F = files(D.build([['Metoda simpleks', html]], {title: 'Raport z obliczeń – Simpleks', date: '26.11.2026'}));
const doc = txt(F['word/document.xml'].data);
['word/document.xml', 'word/styles.xml', 'word/settings.xml', 'word/footer1.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'docProps/app.xml']
  .forEach(n => { const e = wellFormed(txt(F[n].data)); t('XML poprawny: ' + n + (e ? ' – ' + e : ''), !e); });
t('nagłówki: tytuł, sekcja (Heading2), Heading3 z encją', /<w:pStyle w:val="Title"\/>.*Raport z obliczeń – Simpleks/.test(doc) && /<w:pStyle w:val="Heading2"\/>.*Metoda simpleks/.test(doc) && /<w:pStyle w:val="Heading3"\/><w:keepNext\/><\/w:pPr><w:r><w:t xml:space="preserve">Wynik &amp; analiza/.test(doc));
t('indeks dolny, górny, pogrubienie, łamanie linii', /<w:vertAlign w:val="subscript"\/><\/w:rPr><w:t xml:space="preserve">1</.test(doc) && /<w:vertAlign w:val="superscript"\/>/.test(doc) && /<w:b\/><w:bCs\/><\/w:rPr><w:t xml:space="preserve">pogrubione/.test(doc) && /<w:br\/>/.test(doc));
t('ramki: wynik, komunikat, wzór, podpowiedź', ['Sum', 'Msg', 'Formula', 'Hint'].every(s => doc.includes(`<w:pStyle w:val="${s}"/>`)));
t('lista punktowana', /<w:pStyle w:val="ListPara"\/><w:ind w:left="360" w:hanging="240"\/><\/w:pPr><w:r><w:t xml:space="preserve">•\t/.test(doc) && (doc.match(/ListPara/g) || []).length === 2);
const nest = txt(files(D.build([['D', '<ul><li>Węzeł 1<ul><li>Węzeł 2</li><li>Węzeł 3<ul><li>Węzeł 4</li></ul></li></ul></li></ul>']]))['word/document.xml'].data);
t('drzewo (listy zagnieżdżone): wcięcie rośnie z poziomem', /w:left="360"[^]*Węzeł 1[^]*w:left="720"[^]*◦\t[^]*Węzeł 2[^]*w:left="1080"[^]*Węzeł 4/.test(nest));
t('akapit przed tabelą trzyma się tabeli (keepNext)', /<w:keepNext\/><\/w:pPr><w:r><w:t xml:space="preserve">Tablica:/.test(doc));
t('jedna tabela Worda z podpisem', (doc.match(/<w:tbl>/g) || []).length === 1 && /<w:pStyle w:val="Caption"\/>.*Tablica końcowa/.test(doc));
const tbl = doc.slice(doc.indexOf('<w:tbl>'), doc.indexOf('</w:tbl>'));
t('tabela: 4 wiersze, 3 kolumny siatki', (tbl.match(/<w:tr>/g) || []).length === 4 && (tbl.match(/<w:gridCol /g) || []).length === 3);
t('tabela: colspan → gridSpan, rowspan → vMerge', /<w:gridSpan w:val="2"\/>/.test(tbl) && /<w:vMerge w:val="restart"\/>/.test(tbl) && /<w:vMerge\/>/.test(tbl));
t('tabela: dwa wiersze nagłówka powtarzane na stronach, wiersze nierozcinane', (tbl.match(/<w:tblHeader\/>/g) || []).length === 2 && (tbl.match(/<w:cantSplit\/>/g) || []).length === 4);
t('tabela: kolory raportu (nagłówek, element centralny, wiersz wybrany)', /w:fill="EAF0F5"/.test(tbl) && /w:fill="FFB703"/.test(tbl) && /w:fill="FFF6D8"/.test(tbl));
t('tabela: liczby do prawej, tekst do lewej, znaki < > zakodowane', /<w:jc w:val="right"\/><\/w:pPr><w:r><w:rPr><w:b\/><w:bCs\/><w:sz w:val="\d+"\/><w:szCs w:val="\d+"\/><\/w:rPr><w:t xml:space="preserve">1</.test(tbl) && /<w:jc w:val="left"\/>.*tekst &lt;b&gt;/.test(tbl));
t('mała tabela w całości na stronie (keepNext w wierszach poza ostatnim)', (tbl.match(/<w:keepNext\/>/g) || []).length >= 3);
t('obraz PNG: rysunek, wymiary z data-w/h (400 × 300 px)', /<wp:extent cx="3810000" cy="2857500"\/>/.test(doc) && /descr="wykres testowy"/.test(doc) && F['word/media/image1.png'] && D.pngSize(F['word/media/image1.png'].data).w === 1);
t('powiązanie obrazu i typ PNG', /Id="rIdImg1"[^>]*Target="media\/image1.png"/.test(txt(F['word/_rels/document.xml.rels'].data)) && /Extension="png"/.test(txt(F['[Content_Types].xml'].data)));
t('SVG bez obrazu → opis zamiast rysunku; bez przycisków i linków pobierania', /\[rysunek – w raporcie PDF\]/.test(doc) && !/Przycisk|pobierz/.test(doc));
t('stopka z autorem i numerem strony', /Made by Aleksander Kruszelnicki · strona <\/w:t><\/w:r><w:r><w:fldChar w:fldCharType="begin"\/>.* PAGE .* NUMPAGES /.test(txt(F['word/footer1.xml'].data)));
t('A4 pionowo, marginesy 15 mm', /<w:pgSz w:w="11906" w:h="16838"\/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/.test(doc));
t('kolejność rPr zgodna ze schematem (kolor przed rozmiarem, rozmiar przed vertAlign)', !/<w:sz [^>]*\/>(<w:szCs [^>]*\/>)?<w:color/.test(doc) && !/<w:vertAlign[^>]*\/><w:sz/.test(doc));
const Z2 = unzip(D.zip(D.build([['Metoda simpleks', html]], {}).map(f => f.data && /xml|rels/.test(f.name) ? {...f, comp: zlib.deflateRawSync(Buffer.from(f.data))} : f)));
t('cały .docx czytelny niezależnym czytnikiem ZIP (XML skompresowane)', Object.keys(Z2).length === 10 && /<w:document/.test(txt(Z2['word/document.xml'])));

/* ---------- prawdziwy raport (Transport, Taha: koszt 435) ---------- */
const stub = new Proxy(function () {}, {get: (tt, k) => k === 'forEach' ? () => {} : k === Symbol.toPrimitive ? () => '' : stub, set: () => true, apply: () => stub});
const c = load(order, {document: {querySelector: () => stub, querySelectorAll: () => []}, window: {scrollTo() {}}, navigator: {}, Plotly: {}, setTimeout, console});
const TAHA = {supply: [15, 25, 10], demand: [5, 15, 15, 15], cost: [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]], sNames: ['D1', 'D2', 'D3'], dNames: ['O1', 'O2', 'O3', 'O4']};
const R = c.transportSolve(TAHA, 'vam'), rep = c.trReportHTML(R, ['nw', 'lc', 'vam'].map(k => { const x = c.transportSolve(TAHA, k); return {k, start: x.initial, iters: x.iters.length - 1, t: x.t, status: x.status}; }));
const F2 = files(vm.runInContext('DOCX', c).build([['Zagadnienie transportowe', rep]], {title: 'Raport'})), d2 = txt(F2['word/document.xml'].data);
t('Transport: XML poprawny', !wellFormed(d2));
t('Transport: tyle tabel Worda, ile tabel w raporcie', (d2.match(/<w:tbl>/g) || []).length === (rep.match(/<table/g) || []).length);
t('Transport: wynik 435 w ramce „Wynik”', /<w:pStyle w:val="Sum"\/>.*minimalny koszt = <\/w:t><\/w:r><w:r><w:rPr><w:b\/><w:bCs\/><\/w:rPr><w:t xml:space="preserve">435/.test(d2));
t('Transport: koszt w rogu komórki oddzielony od przydziału', !/>215</.test(d2));
console.log(`Testy eksportu DOCX: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
