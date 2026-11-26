# Opcjonalny test w prawdziwej przeglądarce (wymaga: pip install playwright && playwright install chromium)
# Uruchom: python3 tests/browser_check.py
import asyncio, pathlib, re
URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/plotly-*.js', lambda r: r.fulfill(body='window.Plotly={newPlot(){},Plots:{resize(){}},toImage:async()=>""};', content_type='text/javascript'))
        await pg.goto(URL)
        await pg.click('nav button[data-tab=simplex]'); await pg.click('#btn-simplex')
        print('Simpleks:', 'OK' if 'Z<sub>opt</sub> = <b>36</b>' in await pg.inner_html('#out-simplex') else 'BŁĄD')
        await pg.click('nav button[data-tab=ilp]'); await pg.click('#btn-ilp')
        print('Całkowite:', 'OK' if 'Wynik' in await pg.inner_html('#out-ilp') else 'BŁĄD')
        await pg.click('nav button[data-tab=transport]')
        await pg.click('#transport-top details.adv summary'); await pg.check('#transport-forbid')
        await pg.tap('#transport-c0_2')                      # dotknięcie komórki w trybie tras zakazanych
        print('Trasa zakazana dotknięciem:', await pg.input_value('#transport-c0_2'))
        await pg.uncheck('#transport-forbid'); await pg.fill('#transport-xc0', '-5')
        await pg.click('#btn-transport')
        msg = await pg.inner_text('#transport-msg'); bad = await pg.get_attribute('#transport-xc0', 'class')
        print('Błąd przy polu:', 'OK' if 'Błąd' in msg and 'bad' in bad else 'BŁĄD', '|', msg[:80])
        await pg.fill('#transport-xc0', '15'); await pg.click('#btn-transport')
        print('Transport z trasą M:', 'OK' if 'minimalny koszt' in await pg.inner_html('#out-transport') else 'BŁĄD')
        await pg.select_option('#transport-m', '5'); print('Zmiana wymiaru:', await pg.eval_on_selector_all('#transport-grid input[id^=transport-xc]', 'e => e.length'), 'wierszy')
        await pg.click('nav button[data-tab=assign]'); await pg.click('#btn-assign')
        print('Przydział:', 'OK' if 'minimalny koszt = <b>27</b>' in await pg.inner_html('#out-assign') else 'BŁĄD')
        await pg.click('nav button[data-tab=sp]'); await pg.click('#btn-sp')
        print('Najkrótsza ścieżka:', 'OK' if 'długość <b>13</b>' in await pg.inner_html('#out-sp') else 'BŁĄD')
        await pg.click('nav button[data-tab=mf]'); await pg.click('#btn-mf')
        print('Maksymalny przepływ:', 'OK' if 'maksymalny przepływ = <b>23</b>' in await pg.inner_html('#out-mf') else 'BŁĄD')
        await pg.evaluate("window.print = () => {}"); await pg.click('nav button[data-tab=transport]'); await pg.click('#btn-transport')
        await pg.click('nav button[data-tab=sp]'); await pg.click('#btn-export'); await pg.click('[data-exp=pdf]'); pa = await pg.inner_html('#print-area')
        print('Eksport tylko bieżącej zakładki:', 'OK' if 'Najkrótsza ścieżka' in pa and 'Zagadnienie transportowe' not in pa else 'BŁĄD')
        print('Nagłówki tabel powtarzane (thead):', 'OK' if '<thead>' in pa else 'BŁĄD')
        await pg.click('nav button[data-tab=cpm]'); await pg.click('#btn-cpm')
        print('PERT/CPM:', 'OK' if 'czas projektu = <b>44</b>' in await pg.inner_html('#out-cpm') else 'BŁĄD')
        await pg.click('nav button[data-tab=sched]'); await pg.click('#btn-sched')
        print('Harmonogramowanie:', 'OK' if 'Harmonogramowanie na jednej maszynie' in await pg.inner_html('#out-sched') else 'BŁĄD')
        await pg.click('nav button[data-tab=inv]'); await pg.click('#btn-inv')
        print('Zapasy:', 'OK' if 'zamawiaj po <b>200</b>' in await pg.inner_html('#out-inv') else 'BŁĄD')
        await pg.click('nav button[data-tab=fc]'); await pg.click('#btn-fc')
        print('Prognozowanie:', 'OK' if 'Prognozowanie – wygładzanie wykładnicze' in await pg.inner_html('#out-fc') else 'BŁĄD')
        await pg.click('nav button[data-tab=agg]'); await pg.click('#btn-agg')
        print('Planowanie zagregowane:', 'OK' if 'najtańszy plan kosztuje <b>422275</b>' in (await pg.inner_html('#out-agg')).replace('\u00a0', '').replace(' ', '') .replace('najtańszyplankosztuje', 'najtańszy plan kosztuje ') else 'BŁĄD')
        await pg.click('nav button[data-tab=mrp]'); await pg.click('#btn-mrp')
        print('MRP:', 'OK' if 'Plan zamówień' in await pg.inner_html('#out-mrp') else 'BŁĄD')
        nb = await pg.evaluate("(() => { const n = document.querySelector('nav'); n.scrollLeft = 0; n.dispatchEvent(new WheelEvent('wheel', {deltaY: 300, bubbles: true, cancelable: true})); return n.scrollLeft; })()")
        print('Pasek modułów przewijany kółkiem:', 'OK' if nb > 0 else 'BŁĄD')
        for tab, txt in (('queue', 'Średni czas oczekiwania w kolejce Wq'), ('markov', 'Rozkład stacjonarny'), ('qsim', 'Średnie z przedziałami ufności 95%')):
            await pg.click(f'nav button[data-tab={tab}]'); await pg.click(f'#btn-{tab}'); await pg.wait_for_timeout(200)
            print(tab + ':', 'OK' if txt in await pg.inner_html(f'#out-{tab}') else 'BŁĄD')
        for tab, txt in (('dec', 'Macierz żalu'), ('qc', 'statystycznie uregulowany'), ('acc', 'AOQL = <b>')):
            await pg.click(f'nav button[data-tab={tab}]'); await pg.click(f'#btn-{tab}'); await pg.wait_for_timeout(200)
            print(tab + ':', 'OK' if txt in await pg.inner_html(f'#out-{tab}') else 'BŁĄD')
        await pg.click('nav button[data-tab=simplex]')
        await pg.evaluate("""() => { models.simplex = parseModel('simplex', {optilab: 1, maxi: true, c: ['30', '20'], t: ['c', 'c'], rows: [{a: ['2', '1'], rel: '<=', b: '1000'}, {a: ['3', '3'], rel: '<=', b: '2400'}, {a: ['1.5', '0'], rel: '<=', b: '600'}]}); renderForm('simplex'); document.querySelector('#simplex-method').value = 'TAB'; }""")
        await pg.click('#btn-simplex'); await pg.wait_for_timeout(200); th = (await pg.inner_html('#out-simplex')).replace('\u00a0', '').replace(' ', '')
        print('Alternatywna metoda tabelaryczna:', 'OK' if 'Alternatywnametodatabelaryczna' in th and '18000' in th and '400min' in th else 'BŁĄD')
        await pg.evaluate("document.querySelector('#simplex-method').value = '2F'")
        await pg.click('nav button[data-tab=ilp]')
        await pg.evaluate("(() => { const s = document.getElementById('ilp-ex'); s.value = '8'; s.dispatchEvent(new Event('change')); document.getElementById('ilp-method').value = 'gom'; })()")
        await pg.click('#btn-ilp'); await pg.wait_for_timeout(300); gh = (await pg.inner_html('#out-ilp')).replace('\u00a0', '').replace(' ', '')
        print('Odcięcia Gomory\'ego (Z9):', 'OK' if 'z=<b>15578</b>' in gh and 'tęsamąwartość' in gh else 'BŁĄD')
        # Odcięcia krok po kroku (2026-11-17): każde odcięcie rozpisane w osobnej sekcji; przełącznik „dołącz do raportu i PDF” decyduje o PDF
        await pg.evaluate("window.print = () => {}")
        async def export():
            await pg.click('#btn-export'); await pg.click('[data-exp=pdf]'); await pg.wait_for_function("!document.querySelector('#btn-export').disabled")
            return await pg.evaluate("[document.querySelectorAll('#print-area .gcut').length, [...document.querySelectorAll('#print-area h2')].map(h => h.textContent).join('|'), document.querySelectorAll('#print-area input').length]")
        n = int(re.search(r'Potrzebne odcięcia: (\d+)', await pg.inner_text('#out-ilp')).group(1))
        cnt = await pg.eval_on_selector_all('#out-ilp .gcut', 'e => e.length'); dets = await pg.eval_on_selector_all('#out-ilp .gcbody details', 'e => e.length')
        print('Odcięcia krok po kroku – wszystkie rozpisane:', 'OK' if cnt == n > 2 and dets == 0 else 'BŁĄD', f'({cnt}/{n})')
        pa = await export(); print('PDF z odcięciami krok po kroku:', 'OK' if pa[0] == n and "Odcięcia Gomory'ego krok po kroku" in pa[1] and pa[2] == 0 else 'BŁĄD', pa)
        await pg.uncheck('#out-ilp .gctog'); pa = await export()
        empty = await pg.eval_on_selector_all('#out-ilp .gcut', 'e => e.length') == 0 and 'Pominięte' in await pg.inner_text('#out-ilp')
        print('Przełącznik wyłączony – bez odcięć na ekranie i w PDF:', 'OK' if empty and pa[0] == 0 and 'Odcięcia Gomory' not in pa[1] and 'Programowanie całkowitoliczbowe' in pa[1] else 'BŁĄD', pa)
        await pg.click('#btn-ilp'); await pg.wait_for_timeout(300)
        print('Wybór „pomiń” zapamiętany przy kolejnym liczeniu:', 'OK' if not await pg.is_checked('#out-ilp .gctog') and await pg.eval_on_selector_all('#out-ilp .gcut', 'e => e.length') == 0 else 'BŁĄD')
        await pg.check('#out-ilp .gctog'); pa = await export()
        print('Przełącznik włączony ponownie – odcięcia wracają (ekran i PDF):', 'OK' if await pg.eval_on_selector_all('#out-ilp .gcut', 'e => e.length') == n and pa[0] == n else 'BŁĄD')
        await pg.evaluate("document.getElementById('ilp-method').value = 'bb'"); await pg.click('#btn-ilp'); await pg.wait_for_timeout(200); pa = await export()
        print('Po zmianie metody na B&B – w PDF brak starych odcięć:', 'OK' if pa[0] == 0 and 'Odcięcia Gomory' not in pa[1] else 'BŁĄD', pa)
        # limit 500 odcięć: zadanie wymagające ok. 490 odcięć WPISANE z klawiatury; wynik = przegląd wszystkich punktów całkowitych (liczony tutaj)
        await pg.evaluate("(() => { const s = document.getElementById('ilp-ex'); s.value = '9'; s.dispatchEvent(new Event('change')); document.getElementById('ilp-method').value = 'gom'; })()")
        for k, v in {'c0': '11', 'c1': '17', 'c2': '19', 'a0_0': '12', 'a0_1': '9', 'a0_2': '40', 'b0': '178', 'a1_0': '11', 'a1_1': '24', 'a1_2': '23', 'b1': '129', 'a2_0': '35', 'a2_1': '16', 'a2_2': '40', 'b2': '161'}.items():
            await pg.fill('#ilp-' + k, v)
        await pg.click('#btn-ilp'); await pg.wait_for_timeout(500); gt = await pg.inner_text('#out-ilp')
        best = max(11 * a + 17 * b2 + 19 * d for a in range(15) for b2 in range(6) for d in range(5) if 12 * a + 9 * b2 + 40 * d <= 178 and 11 * a + 24 * b2 + 23 * d <= 129 and 35 * a + 16 * b2 + 40 * d <= 161)
        m = re.search(r'Potrzebne odcięcia: (\d+)', gt); n = int(m.group(1)) if m else 0
        print('Limit 500 odcięć (zadanie wpisane z klawiatury):', 'OK' if f'z = {best} (' in gt and 200 < n <= 500 and await pg.eval_on_selector_all('#out-ilp .gcut', 'e => e.length') == n else 'BŁĄD', f'(odcięć: {n}, z* = {best})')
        await pg.evaluate("document.getElementById('ilp-method').value = 'bb'")
        for tab, txt in (('goal', 'nadmiar 15'), ('dp', 'Trasy optymalne (3)'), ('qp', '<b>270</b>'), ('nlp', 'minimum w x'), ('loc', '(66,67; 93,33)')):
            await pg.click(f'nav button[data-tab={tab}]'); await pg.click(f'#btn-{tab}'); await pg.wait_for_timeout(250)
            print(tab + ':', 'OK' if txt in await pg.inner_html(f'#out-{tab}') else 'BŁĄD')
        # regresja z audytu 2026-11-13: wartość wpisana z klawiatury w komórkę macierzy musi dotrzeć do raportu
        for tab, ex, cell, val in (('qp', None, 'qp-Mc0_0', '-10'), ('dec', None, 'dec-Sc0_0', '777777'), ('qc', None, 'qc-Sc0_0', '99.5'), ('dp', '2', 'dp-Mc0_1', '4444'), ('loc', '3', 'loc-Fc0_1', '500')):
            await pg.click(f'nav button[data-tab={tab}]')
            await pg.evaluate("([t, k]) => { const s = document.getElementById(t + '-ex'); s.value = k ?? '0'; s.dispatchEvent(new Event('change')); }", [tab, ex])
            await pg.click(f'#btn-{tab}'); await pg.wait_for_timeout(150); before = await pg.inner_text(f'#out-{tab}')
            await pg.fill('#' + cell, val); await pg.click(f'#btn-{tab}'); await pg.wait_for_timeout(150)
            print(f'Edycja macierzy ({tab}):', 'OK' if await pg.inner_text(f'#out-{tab}') != before else 'BŁĄD')
        # Wklejanie ze schowka i eksport (2026-11-26): prawdziwe Ctrl+V (schowek przeglądarki), tabela z Excela (tabulatory, przecinek dziesiętny),
        # rozrost tabeli, błąd przy polu bez zmian w danych, „Wklej dane”, eksport do Worda i CSV sprawdzany niezależnie (zipfile, XML, LibreOffice)
        cctx = await b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); await cctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        cp = await cctx.new_page(); cp.on('pageerror', lambda e: errs.append('Schowek: ' + str(e)))
        await cp.route('**/plotly-*.js', lambda r: r.fulfill(body='window.Plotly={newPlot(){},Plots:{resize(){}},toImage:async()=>""};', content_type='text/javascript'))
        await cp.goto(URL); await cp.evaluate("(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; })()")   # bez „(() => …)()” Playwright wywołałby zwróconą funkcję
        async def ctrlv(sel, text):
            await cp.evaluate('t => navigator.clipboard.writeText(t)', text); await cp.click(sel); await cp.keyboard.press('Control+V'); await cp.wait_for_timeout(80)
        await cp.click('nav button[data-tab=transport]')
        taha = 'Od \\ Do\tO1\tO2\tO3\tO4\tPodaż\r\nD1\t10\t2\t20\t11\t15\r\nD2\t12\t7\t9\t20\t25\r\nD3\t4\t14\t16\t18\t10\r\nPopyt\t5\t15\t15\t15\t\r\n'
        await cp.select_option('#transport-m', '2'); await cp.select_option('#transport-n', '2')
        await ctrlv('#transport-c0_0', taha)          # tabela z ekranu skopiowana do Excela i z powrotem (Taha: optimum 435)
        dims = (await cp.input_value('#transport-m'), await cp.input_value('#transport-n'), await cp.input_value('#transport-cn3'), await cp.input_value('#transport-xr3'))
        await cp.click('#btn-transport'); await cp.wait_for_timeout(150)
        print('Wklejanie tabeli z Excela (Ctrl+V, nagłówki, powiększenie 2×2 → 3×4):', 'OK' if dims == ('3', '4', 'O4', '15') and 'minimalny koszt = <b>435</b>' in await cp.inner_html('#out-transport') else 'BŁĄD', dims)
        await ctrlv('#transport-c0_0', '1\t2\t3\t4\t5\t6\n7\t8\t9\t10\t11\tabc\n1\t1\t1\t1\t1\t1\n1\t1\t1\t1\t1\t1\n1\t1\t1\t1\t1\t1')
        msg = await cp.inner_text('#tab-transport .fmsg') if await cp.query_selector('#tab-transport .fmsg') else ''
        print('Błąd wklejania: komunikat z miejscem, tabela bez zmian:', 'OK' if 'wiersz 2, kolumna 6 wklejonych danych: „abc”' in msg and 'Nic nie zostało zmienione' in msg and await cp.input_value('#transport-m') == '3' and await cp.input_value('#transport-c0_0') == '10' and await cp.query_selector('#transport-c0_0') else 'BŁĄD', msg[:90])
        await ctrlv('#transport-xc0', '1 234,5'); v1 = await cp.input_value('#transport-xc0'); await ctrlv('#transport-xc0', '12,5%'); v2 = await cp.input_value('#transport-xc0')
        print('Wklejenie liczby w zapisie Excela (1 234,5; 12,5%):', 'OK' if (v1, v2) == ('1234.5', '0.125') else 'BŁĄD', (v1, v2))
        await cp.click('nav button[data-tab=simplex]')
        await ctrlv('#simplex-a0_0', '2\t1\t3\t<=\t10\n1\t4\t1\t>=\t8\n1\t1\t1\t=\t6\n0\t2\t1\t<=\t7')
        await cp.fill('#simplex-c2', '4'); md = await cp.evaluate("(sync('simplex'), models.simplex)")
        print('Programowanie liniowe: blok A | znak | b ustawia 3 zmienne i 4 ograniczenia:', 'OK' if md['n'] == 3 and len(md['rows']) == 4 and md['rows'][1]['rel'] == '>=' and md['rows'][3]['b'] == '7' and md['c'][2] == '4' else 'BŁĄD')
        await cp.click('nav button[data-tab=cpm]')
        n0 = await cp.eval_on_selector_all('#tab-cpm table.mx tr', 'e => e.length')
        await ctrlv('#cpm-name0', 'Czynność\tPoprzedniki\ta\tm\tb\n' + '\n'.join(f'Z{k}\t\t1\t2,5\t4' for k in range(n0 + 1)))
        n1 = await cp.eval_on_selector_all('#tab-cpm table.mx tr', 'e => e.length'); last = await cp.input_value(f'#cpm-m{n0}')
        print('Tabela czynności: nagłówek pominięty, dodane wiersze, przecinek dziesiętny:', 'OK' if n1 == n0 + 2 and last == '2.5' and await cp.input_value('#cpm-name0') == 'Z0' else 'BŁĄD', (n0, n1, last))
        await cp.click('nav button[data-tab=sp]'); await cp.click('#tab-sp details.adv summary'); await cp.select_option('#sp-mode', 'matrix'); await cp.select_option('#sp-n', '3')
        await ctrlv('#sp-c0_1', '0\t4\t1\n4\t0\t2\n1\t2\t0')          # pełna macierz wklejona w pierwsze pole (za przekątną)
        sv = [await cp.input_value(f'#sp-c{a}_{b2}') for a, b2 in ((0, 1), (0, 2), (1, 2), (2, 0))]
        print('Macierz z przekątną: blok n × n wklejony w pierwsze pole trafia od przekątnej:', 'OK' if sv == ['4', '1', '2', '1'] else 'BŁĄD', sv)
        await cp.click('nav button[data-tab=assign]'); await cp.click('#tab-assign details.adv summary')
        await cp.evaluate("t => navigator.clipboard.writeText(t)", '\tZ1\tZ2\tZ3\r\nW1\t9\t2\t7\r\nW2\t6\t4\t3\r\nW3\t5\t8\t1\r\ncel\tmin\r\n')
        await cp.click('#assign-paste'); await cp.wait_for_timeout(150); await cp.click('#btn-assign'); await cp.wait_for_timeout(150)
        print('„Wklej dane” z tabelą z Excela (Przydział):', 'OK' if await cp.input_value('#assign-c2_2') == '1' and 'minimalny koszt = <b>9</b>' in await cp.inner_html('#out-assign') else 'BŁĄD')
        await cp.evaluate("t => navigator.clipboard.writeText(t)", 'a\tb\n1\tx'); await cp.click('#assign-paste'); await cp.wait_for_timeout(100)
        print('„Wklej dane” – czytelny błąd złego formatu:', 'OK' if 'nie udało się odczytać wklejonej tabeli' in await cp.inner_text('#assign-msg') else 'BŁĄD')
        # eksport: jeden przycisk – PDF (druk), Word, CSV
        await cp.click('nav button[data-tab=transport]'); await cp.fill('#transport-xc0', '15'); await cp.click('#btn-transport'); await cp.wait_for_timeout(150)
        await cp.click('#btn-export'); menu = await cp.is_visible('#exp-menu'); await cp.click('[data-exp=pdf]'); await cp.wait_for_timeout(100)
        pr = (await cp.evaluate('window.__printed'), 'Zagadnienie transportowe' in await cp.inner_html('#print-area'))
        print('Eksport: menu i PDF (druk) jak dotąd:', 'OK' if menu and pr == (1, True) else 'BŁĄD', pr)
        import zipfile, xml.dom.minidom, io, shutil, subprocess, tempfile
        await cp.click('#btn-export')
        async with cp.expect_download() as dl: await cp.click('[data-exp=docx]')
        d = await dl.value; dp = tempfile.mkdtemp(); fn = pathlib.Path(dp) / 'raport.docx'; await d.save_as(fn)
        z = zipfile.ZipFile(fn); okz = z.testzip() is None; [xml.dom.minidom.parseString(z.read(n)) for n in z.namelist() if n.endswith(('.xml', '.rels'))]
        docx = z.read('word/document.xml').decode(); ntab = (await cp.inner_html('#out-transport')).count('<table')
        print('Eksport do Worda: poprawny ZIP i XML, tabele Worda, obraz sieci, wynik 435:', 'OK' if okz and docx.count('<w:tbl>') == ntab and any(n.startswith('word/media/') for n in z.namelist()) and '435' in docx and d.suggested_filename.endswith('.docx') else 'BŁĄD', f'({docx.count("<w:tbl>")}/{ntab} tabel)')
        if shutil.which('soffice'):
            subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', dp, str(fn)], capture_output=True, timeout=180)
            txt = subprocess.run(['pdftotext', '-layout', str(fn.with_suffix('.pdf')), '-'], capture_output=True, text=True).stdout if fn.with_suffix('.pdf').exists() else ''
            print('Eksport do Worda: plik otwiera LibreOffice (tekst raportu w PDF):', 'OK' if 'minimalny koszt = 435' in txt and 'Made by Aleksander Kruszelnicki' in txt else 'BŁĄD')
        await cp.wait_for_timeout(2000); await cp.click('#btn-export')
        async with cp.expect_download() as dl: await cp.click('[data-exp=csv]')
        d = await dl.value; await d.save_as(pathlib.Path(dp) / 'w.csv'); csv = (pathlib.Path(dp) / 'w.csv').read_text('utf-8-sig')
        print('Eksport wyników do CSV (średnik, przecinek dziesiętny, wynik):', 'OK' if 'minimalny koszt = 435' in csv and ';Podaż' in csv and d.suggested_filename.endswith('.csv') else 'BŁĄD')
        shutil.rmtree(dp, ignore_errors=True); await cctx.close()
        # Wydruk w Safari (2026-11-18): Safari (iPhone) nie powtarza nagłówków tabel, tnie wiersze tabel i ignoruje „nie łam po nagłówku”.
        # Emulacja w Chromium: agent użytkownika iPhone'a + wyłączone te trzy mechanizmy + marginesy strony jak w PDF z iOS 26.
        # Składanie wydruku (js/print.js) ma dać: tabelę odcięć w kawałkach z nagłówkiem, nagłówki sklejone z treścią, brak <details>.
        WEBKIT_CSS = ('@page{size:A4;margin:13mm 17.7mm 32.3mm 17.7mm} @media print{#print-area thead{display:table-row-group!important}'
                      '#print-area tr{break-inside:auto!important;page-break-inside:auto!important}'
                      '#print-area h1,#print-area h2,#print-area h3,#print-area h4{break-after:auto!important;page-break-after:auto!important}}')
        sctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
                                   user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1')
        sp = await sctx.new_page(); sp.on('pageerror', lambda e: errs.append('Safari: ' + str(e)))
        await sp.route('**/plotly-*.js', lambda r: r.fulfill(body='window.Plotly={newPlot(){},Plots:{resize(){}},toImage:async()=>""};', content_type='text/javascript'))
        await sp.goto(URL); await sp.add_style_tag(content=WEBKIT_CSS); await sp.evaluate("window.print = () => { window.__printed = (window.__printed || 0) + 1; }")
        await sp.click('nav button[data-tab=ilp]')
        await sp.evaluate("(() => { const s = document.getElementById('ilp-ex'); s.value = '9'; s.dispatchEvent(new Event('change')); document.getElementById('ilp-method').value = 'gom'; })()")
        await sp.click('#btn-ilp'); await sp.wait_for_timeout(300); ncut = int(re.search(r'Potrzebne odcięcia: (\d+)', await sp.inner_text('#out-ilp')).group(1))
        await sp.click('#btn-export'); await sp.click('[data-exp=pdf]'); await sp.wait_for_function('window.__printed >= 1')
        r = await sp.evaluate("""() => { const pa = document.querySelector('#print-area'), G = PRINT.geom(); pa.style.cssText = `display:block;position:absolute;left:-9999px;width:${G.W}px;font-size:10pt`;
            const ch = [...pa.querySelectorAll('table')].filter(t => t.tHead && /Nierówność odcięcia/.test(t.tHead.textContent));
            const r = {W: G.W, CH: G.CH, n: ch.length, rows: ch.reduce((s, t) => s + t.tBodies[0].rows.length, 0), maxH: Math.max(...ch.map(t => t.closest('.tw').getBoundingClientRect().height)),
              caps: pa.querySelectorAll('caption.pcont').length, det: pa.querySelectorAll('details').length, lone: pa.querySelectorAll('.gcut > h4').length,
              krok2: [...pa.querySelectorAll('.keep h4')].some(h => h.textContent.startsWith('Krok 2') && h.closest('.keep').querySelector('caption, thead'))};
            pa.style.cssText = ''; return r; }""")
        print('Wydruk Safari – tabela odcięć w kawałkach z nagłówkiem kolumn:', 'OK' if r['W'] == 660 and r['n'] >= 2 and r['rows'] == ncut and r['caps'] == r['n'] - 1 and r['maxH'] <= r['CH'] else 'BŁĄD', r)
        print('Wydruk Safari – nagłówki sklejone z treścią, bez <details>:', 'OK' if r['krok2'] and r['lone'] == 0 and r['det'] == 0 else 'BŁĄD')
        import shutil, subprocess, tempfile
        if shutil.which('pdftotext'):                    # sprawdzenie gotowego PDF (gdy jest poppler): nagłówek kolumn na każdej stronie z tabelą odcięć, żaden nagłówek nie kończy strony
            heads = await sp.evaluate("[...document.querySelectorAll('#print-area h1,#print-area h2,#print-area h3,#print-area h4')].map(h => h.textContent.replace(/\\s+/g, ' ').trim())")
            await sp.emulate_media(media='print'); f = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False); f.close()
            await sp.pdf(path=f.name, prefer_css_page_size=True, print_background=True)
            pages = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout.split('\f')[:-1]; pathlib.Path(f.name).unlink()
            row = re.compile(r'^\s*\d+\s+[xs]\s*\d+\s+0,\d+\s.*[·≥]', re.M); sq = lambda x: re.sub(r'\s+', '', x); hs = {sq(h) for h in heads}
            bad = [k + 1 for k, t in enumerate(pages) if row.search(t) and 'Nierówność odcięcia' not in t]
            orph = [k + 1 for k, t in enumerate(pages[:-1]) if (ls := [l for l in t.split('\n') if l.strip()]) and sq(ls[-1]) in hs]
            print('Wydruk Safari – PDF: nagłówki kolumn i brak osieroconych nagłówków:', 'OK' if pages and not bad and not orph else 'BŁĄD', f'(stron {len(pages)}, bez nagłówka: {bad}, osierocone: {orph})')
        await sctx.close()
        # Nauka (lekcje z maskotką Pivot, js/lesson.js): przycisk, menu, Wstecz/Dalej, zła i dobra odpowiedź, ukrywanie maskotki
        for vw, vh in ((1280, 860), (390, 844)):
            lp = await b.new_page(viewport={'width': vw, 'height': vh}, has_touch=vw < 500); lp.on('pageerror', lambda e: errs.append(str(e)))
            await lp.route('**/plotly-*.js', lambda r: r.fulfill(body='window.Plotly={newPlot(){},Plots:{resize(){}},toImage:async()=>"",relayout(){}};', content_type='text/javascript'))
            await lp.goto(URL); await lp.evaluate("localStorage.removeItem('optilab.nauka.hidePivot')"); await lp.reload()
            vis = {}
            for tab in ('graph', 'simplex', 'ilp', 'transport'):
                await lp.click(f'nav button[data-tab={tab}]'); vis[tab] = await lp.is_visible('#btn-learn')
            print(f'Nauka {vw}px – przycisk tylko w LP:', 'OK' if vis == {'graph': True, 'simplex': True, 'ilp': True, 'transport': False} else 'BŁĄD', vis)
            await lp.click('nav button[data-tab=simplex]'); await lp.click('#btn-learn')
            menu = await lp.inner_text('.ls-main'); bub = await lp.inner_text('.ls-bubble')
            print(f'Nauka {vw}px – menu startowe:', 'OK' if 'Czego chcesz się dziś nauczyć?' in bub and all(t in menu for t in ('Metoda graficzna', 'Simpleks', 'Metoda dwufazowa', 'Metoda dużego M', "Odcięcia Gomory'ego", 'Podział i ograniczenia')) else 'BŁĄD')
            await lp.click('.ls-topic[data-id=lp-simplex]'); lv = await lp.inner_text('.ls-main')
            print(f'Nauka {vw}px – wybór poziomu:', 'OK' if all(t in lv for t in ('Rozgrzewka', 'Sprawdzian', 'Wyzwanie')) and await lp.get_attribute('.ls-lvl.rec', 'data-l') == 'warm' else 'BŁĄD')
            await lp.click('.ls-lvl[data-l=warm]'); t1 = await lp.inner_text('.ls-card h3')
            await lp.click('.ls-next'); t2 = await lp.inner_text('.ls-card h3'); await lp.keyboard.press('ArrowLeft'); t3 = await lp.inner_text('.ls-card h3')
            await lp.keyboard.press('ArrowRight'); await lp.click('.ls-next'); await lp.wait_for_timeout(300)
            print(f'Nauka {vw}px – Dalej / Wstecz / strzałki:', 'OK' if t1 == 'Zadanie' and t2 == 'Zmienne swobodne' and t3 == 'Zadanie' and await lp.inner_text('.ls-card h3') == 'Tablica początkowa' else 'BŁĄD', t1, t2, t3)
            locked = await lp.is_disabled('.ls-next')
            await lp.fill('.ls-num input', '0'); await lp.click('.ls-chk'); fb = await lp.inner_text('.ls-fb'); pose = await lp.get_attribute('.ls-pivot', 'data-pose')
            still = await lp.is_disabled('.ls-next'); show = await lp.is_visible('.ls-show')
            for _ in range(2): await lp.fill('.ls-num input', '0'); await lp.click('.ls-chk')
            back = await lp.is_visible('.ls-goback')
            await lp.fill('.ls-num input', '4'); await lp.click('.ls-chk'); ok = await lp.inner_text('.ls-fb'); pose2 = await lp.get_attribute('.ls-pivot', 'data-pose')
            print(f'Nauka {vw}px – zła odpowiedź (wyjaśnienie, mina ups, pokaż odpowiedź, po 3 błędach powrót):', 'OK' if locked and still and 'kolumnie b' in fb and pose == 'oops' and show and back else 'BŁĄD', fb[:80])
            print(f'Nauka {vw}px – dobra odpowiedź odblokowuje Dalej:', 'OK' if 'Dobrze' in ok and pose2 == 'happy' and not await lp.is_disabled('.ls-next') else 'BŁĄD')
            await lp.click('.ls-next'); await lp.click('.ls-opt >> text=wchodzi x')                 # wybór: pierwsza opcja to x₂? sprawdzamy zaznaczenie
            wrong = await lp.eval_on_selector_all('.ls-opt.bad', 'e => e.length'); good = await lp.eval_on_selector_all('.ls-opt.good', 'e => e.length')
            print(f'Nauka {vw}px – pytanie wyboru (oznaczenie odpowiedzi):', 'OK' if wrong + good == 1 else 'BŁĄD')
            rings = await lp.eval_on_selector_all('.ls-ring', 'e => e.length')
            print(f'Nauka {vw}px – różdżka zakreśla tabelę:', 'OK' if rings >= 2 else 'BŁĄD', rings)
            await lp.click('.ls-pvtog'); hid = await lp.is_hidden('.ls-pivot'); await lp.keyboard.press('Escape'); closed = await lp.is_hidden('#lesson')
            await lp.reload(); await lp.click('nav button[data-tab=graph]'); await lp.click('#btn-learn'); hid2 = await lp.is_hidden('.ls-pivot')
            await lp.click('.ls-pvtog'); shown = await lp.is_visible('.ls-pivot')
            print(f'Nauka {vw}px – ukrywanie maskotki (zapamiętane), Esc zamyka:', 'OK' if hid and closed and hid2 and shown else 'BŁĄD', hid, closed, hid2, shown)
            await lp.click('.ls-topic[data-id=lp-graph]'); await lp.click('.ls-lvl[data-l=test]')
            ov = await lp.evaluate("(() => { const b = document.querySelector('.ls-body'); return b.scrollWidth > b.clientWidth + 1; })()")
            print(f'Nauka {vw}px – bez poziomego przewijania karty:', 'OK' if not ov else 'BŁĄD')
            await lp.close()
        # Nauka – etap 2: Gomory (znikanie wierszy i kolumn zakreślone przed i po) i podział i ograniczenia (drzewo), wczytanie do zakładki Całkowite
        for vw, vh in ((1280, 860), (390, 844)):
            lp = await b.new_page(viewport={'width': vw, 'height': vh}, has_touch=vw < 500); lp.on('pageerror', lambda e: errs.append(str(e)))
            await lp.route('**/plotly-*.js', lambda r: r.fulfill(body='window.Plotly={newPlot(){},Plots:{resize(){}},toImage:async()=>"",relayout(){}};', content_type='text/javascript'))
            await lp.goto(URL); await lp.click('nav button[data-tab=ilp]'); await lp.click('#btn-learn')
            act = await lp.eval_on_selector_all('.ls-topic[data-id=lp-gomory]:not([disabled]), .ls-topic[data-id=lp-bb]:not([disabled])', 'e => e.length')
            await lp.click('.ls-topic[data-id=lp-gomory]'); await lp.click('.ls-lvl[data-l=warm]')
            seen = {}
            for _ in range(30):
                cur = await lp.evaluate("LESSON.current() && LESSON.current().id || ''")
                if cur.startswith('plot') or cur.startswith('zdejmij'):
                    await lp.wait_for_timeout(1400); seen[cur[:4]] = {'rings': await lp.eval_on_selector_all('.ls-ring', 'e => e.length'), 'pose': await lp.get_attribute('.ls-pivot', 'data-pose'), 'rows': await lp.eval_on_selector_all('.ls-table tr', 'e => e.length')}
                if cur.startswith('wolno'): break
                if await lp.is_disabled('.ls-next'):
                    await lp.evaluate("(() => { const q = LESSON.current().q; if (q.type === 'choice') document.querySelectorAll('.ls-opt')[q.options.findIndex(o => o.ok)].click(); else { const i = document.querySelector('.ls-num input'); i.value = String(q.answer); document.querySelector('.ls-chk').click(); } })()")
                await lp.click('.ls-next')
            okg = 'plot' in seen and 'zdej' in seen and seen['plot']['rings'] >= 2 and seen['zdej']['rings'] >= 1 and seen['plot']['pose'] == 'point' and seen['zdej']['pose'] == 'point' and seen['zdej']['rows'] == seen['plot']['rows'] - 1
            print(f'Nauka {vw}px – Gomory: tematy aktywne, odcięcie zakreślone przed i po usunięciu (wiersz mniej):', 'OK' if act == 2 and okg else 'BŁĄD', seen)
            await lp.keyboard.press('Escape'); await lp.click('#btn-learn'); await lp.click('.ls-topic[data-id=lp-bb]'); await lp.click('.ls-lvl[data-l=challenge]')
            tn = 0
            for _ in range(30):
                tn = max(tn, await lp.eval_on_selector_all('.ls-tree .lt-n', 'e => e.length'))
                if await lp.query_selector('.ls-action'): break
                if await lp.is_disabled('.ls-next'):
                    await lp.evaluate("(() => { const q = LESSON.current().q; if (q.type === 'choice') document.querySelectorAll('.ls-opt')[q.options.findIndex(o => o.ok)].click(); else { const i = document.querySelector('.ls-num input'); i.value = String(q.answer); document.querySelector('.ls-chk').click(); } })()")
                await lp.click('.ls-next')
            await lp.click('.ls-action'); await lp.wait_for_timeout(300)
            out = await lp.inner_html('#out-ilp'); tab = await lp.evaluate('curTab')
            print(f'Nauka {vw}px – B&B: drzewo z 5 węzłami, wczytanie zadania do zakładki Całkowite liczy ten sam wynik:', 'OK' if tn == 5 and tab == 'ilp' and 'Z<sub>opt</sub> = <b>10</b>' in out and not await lp.is_visible('#lesson') else 'BŁĄD', tab)
            await lp.close()
        print('Błędy JS:', errs or 'brak'); await b.close()
asyncio.run(main())
