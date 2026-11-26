#!/usr/bin/env python3
"""Generuje js/pivot-svg.js z assets/pivot_maskotka.svg (jedyne źródło postaci Pivota).
Po każdej zmianie pliku SVG uruchom: python3 tools/pivot_svg.py  (test tests/lesson.test.js pilnuje zgodności).
Plik JS jest potrzebny, bo SVG wstawiamy do strony bezpośrednio (przełączanie póz po id działa także z file:// i w optilab-jeden-plik.html)."""
import json, os, re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
svg = open(os.path.join(root, 'assets', 'pivot_maskotka.svg'), encoding='utf-8').read()
for pose in ('explain', 'point', 'think', 'surprise', 'happy', 'oops'):
    assert f'id="poza-{pose}"' in svg, f'brak grupy poza-{pose} w assets/pivot_maskotka.svg'
body = re.sub(r'<!--.*?-->', '', svg, flags=re.S).strip()
js = ('/* ===== OptiLab – maskotka Pivot (PLIK GENEROWANY – nie edytuj ręcznie) =====\n'
      '   Źródło: assets/pivot_maskotka.svg. Po zmianie SVG uruchom: python3 tools/pivot_svg.py */\n'
      'const PIVOT_SVG = ' + json.dumps(body, ensure_ascii=False) + ';\n')
open(os.path.join(root, 'js', 'pivot-svg.js'), 'w', encoding='utf-8').write(js)
print('OK -> js/pivot-svg.js', len(js), 'B')
