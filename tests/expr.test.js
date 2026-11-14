// Parser wyrażeń: wartości liczone ręcznie, kolejność działań, mnożenie domyślne, przecinek dziesiętny, błędy z pozycją, BEZPIECZEŃSTWO (próby wstrzyknięcia kodu odrzucone), pochodne numeryczne
const vm = require('vm'), {load} = require('./helpers');
const c = load(['js/expr.js']), EX = vm.runInContext('EX', c);
let ok = 0, bad = 0; const t = (n, v) => { v ? ok++ : (bad++, console.log('BŁĄD:', n)); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b)), val = (s, x = []) => EX.make(s).f(x);
const cases = [['2 + 3*4', [], 14], ['(2 + 3)*4', [], 20], ['2^3^2', [], 512], ['-2^2', [], -4], ['(-2)^2', [], 4], ['2,5 * 4', [], 10], ['10 / 4 / 5', [], 0.5], ['2 - 3 - 4', [], -5],
  ['x1^2 + 3x2', [2, 5], 19], ['2x1x2', [3, 4], 24], ['3(x1 + 1)', [2], 9], ['x*y', [3, 7], 21], ['sqrt(16) + abs(-3)', [], 7], ['ln(e) + log(1000)', [], 4], ['sin(pi/2) + cos(0)', [], 2],
  ['exp(0)*5', [], 5], ['x1²+x2³', [3, 2], 17], ['−x1 + 4', [1], 3], ['2·x1 × 3', [2], 12], ['(x1-1)^2 + 100*(x2 - x1^2)^2', [1, 1], 0], ['1e3 + 2.5e-1', [], 1000.25], ['xy', [2, 5], 10], ['2pi', [], 2 * Math.PI]];
cases.forEach(([s, x, v]) => t(`„${s}” = ${v}`, near(val(s, x), v)));
const err = s => { try { EX.make(s); return null; } catch (e) { return e.message; } };
t('błąd: nieznana nazwa z pozycją', /nieznana nazwa „foo” \(pozycja 3\)/.test(err('x+foo(2)') || ''));
t('błąd: brak nawiasu zamykającego', /brak nawiasu zamykającego/.test(err('(x1 + 2') || ''));
t('błąd: nadmiarowy nawias', /nadmiarowy nawias zamykający/.test(err('x1 + 2)') || ''));
t('błąd: wyrażenie urywa się', /urywa się/.test(err('x1 +') || ''));
t('błąd: funkcja bez nawiasu', /potrzebny jest nawias/.test(err('sin x1') || ''));
t('błąd: za dużo zmiennych dla zadania', (() => { try { EX.make('x3 + 1', 2); return false; } catch (e) { return /x3/.test(e.message); } })());
// bezpieczeństwo: każda próba wykonania kodu musi zostać odrzucona już w tokenizerze/parserze
const attacks = ['constructor', 'x1.constructor', '__proto__', 'alert(1)', 'this', 'globalThis', 'process.exit()', '`${1}`', 'x1; 1', "'a'", '"a"', '[1]', '{a:1}', 'x1 = 2', 'Function("return 1")()', 'eval("1")', 'require("fs")', 'x1 => 1', '1 && 2', 'x1 > 2', 'new Date()', 'prototype', 'sin.call', 'Math.max(1,2)', '\\u0061lert(1)', 'x1\u200b+1'];
attacks.forEach(s => t(`atak odrzucony: ${JSON.stringify(s)}`, err(s) !== null));
t('parser nie używa eval ani new Function (kod źródłowy)', !/\beval\s*\(|new\s+Function/.test(require('fs').readFileSync(require('path').join(__dirname, '../js/expr.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
// pochodne numeryczne vs analityczne
const f = EX.make('x1^3 + 2x1x2 + sin(x2)').f, g = EX.grad(f, [1.5, 0.7]); t('gradient numeryczny ≈ analityczny (3x1² + 2x2; 2x1 + cos x2)', near(g[0], 3 * 2.25 + 1.4, 1e-6) && near(g[1], 3 + Math.cos(0.7), 1e-6));
const Hs = EX.hess(f, [1.5, 0.7]); t('hesjan numeryczny ≈ analityczny ([6x1, 2; 2, −sin x2])', near(Hs[0][0], 9, 1e-4) && near(Hs[0][1], 2, 1e-4) && near(Hs[1][1], -Math.sin(0.7), 1e-4));
console.log(`Testy parsera wyrażeń: ${ok} OK, ${bad} błędów`); process.exit(bad ? 1 : 0);
