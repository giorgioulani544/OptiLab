#!/usr/bin/env python3
"""Skleja projekt w jeden plik HTML (do podglądu na telefonie lub wgrania jako index.html).
Użycie: python3 tools/bundle.py   ->   tworzy optilab-jeden-plik.html w folderze projektu"""
import re, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
h = re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)[^"]*">', lambda m: '<style>\n' + rd(m.group(1)) + '</style>', rd('index.html'))
def inline(m):
    js = rd(m.group(1)); assert '</script' not in js
    return '<script>\n' + js + '</script>'
h = re.sub(r'<script src="(js/[^"?]+)[^"]*"></script>', inline, h)
out = os.path.join(root, 'optilab-jeden-plik.html'); open(out, 'w', encoding='utf-8').write(h); print('OK ->', out)
