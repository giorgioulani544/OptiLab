# Opcjonalny test w prawdziwej przeglądarce (wymaga: pip install playwright && playwright install chromium)
# Uruchom: python3 tests/browser_check.py
import asyncio, pathlib
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
        print('Błędy JS:', errs or 'brak'); await b.close()
asyncio.run(main())
