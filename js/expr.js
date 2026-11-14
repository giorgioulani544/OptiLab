/* ===== OptiLab – bezpieczny parser wyrażeń matematycznych (bez eval i new Function; testowalny w Node) =====
   Gramatyka: wyrażenie = składnik (± składnik)*; składnik = czynnik ((* | / | domyślne mnożenie) czynnik)*; czynnik = −czynnik | potęga;
   potęga = podstawa (^ czynnik)? (łączna prawostronnie: 2^3^2 = 2^9); podstawa = liczba | zmienna | stała | funkcja(wyrażenie) | (wyrażenie).
   Zmienne x1…xn (x = x1, y = x2, z = x3), stałe pi, e; funkcje: sin, cos, tan, exp, ln, log (dziesiętny), sqrt, abs.
   Liczby z kropką albo przecinkiem (2,5). Wynik: drzewo zamieniane na funkcję-domknięcie; żadna nazwa spoza listy nie przechodzi. */
const EX = (() => {
  const FN = {sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs}, CONST = {pi: Math.PI, e: Math.E}, ALIAS = {x: 1, y: 2, z: 3};
  function tokenize(src) {
    const s = String(src), out = []; let i = 0; if (s.length > 2000) throw new Error('wyrażenie jest za długie (maksimum 2000 znaków).');
    while (i < s.length) { const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9]/.test(ch) || ((ch === '.' || ch === ',') && /[0-9]/.test(s[i + 1] || ''))) { let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++;
        if ((s[j] === '.' || s[j] === ',') && /[0-9]/.test(s[j + 1] || '')) { j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        if (/[eE]/.test(s[j] || '') && /[0-9+-]/.test(s[j + 1] || '') && (/[0-9]/.test(s[j + 1]) || /[0-9]/.test(s[j + 2] || ''))) { j += 2; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        out.push({t: 'num', v: Number(s.slice(i, j).replace(',', '.')), p: i}); i = j; continue; }
      if (/[a-zA-Z_]/.test(ch)) { let j = i; while (j < s.length && /[a-zA-Z_]/.test(s[j])) j++; let name = s.slice(i, j).toLowerCase(), k = j;
        if ((name === 'x' || name === 'xx') && /[0-9]/.test(s[k] || '')) { while (k < s.length && /[0-9]/.test(s[k])) k++; out.push({t: 'var', v: Number(s.slice(j, k)), p: i}); i = k; continue; }
        if (name.length > 1 && !FN[name] && !CONST[name]) {                        // np. „xy” → x·y, „pix” → pi·x – tylko z dozwolonych nazw
          const parts = []; let rest = name; while (rest) { const m = ['sqrt', 'sin', 'cos', 'tan', 'exp', 'log', 'abs', 'ln', 'pi', 'x', 'y', 'z', 'e'].find(w => rest.startsWith(w)); if (!m) throw new Error(`nieznana nazwa „${s.slice(i, j)}” (pozycja ${i + 1}). Dozwolone: x1…xn, x, y, z, pi, e, sin, cos, tan, exp, ln, log, sqrt, abs.`); parts.push(m); rest = rest.slice(m.length); }
          parts.forEach(w => out.push(FN[w] ? {t: 'fn', v: w, p: i} : CONST[w] !== undefined ? {t: 'num', v: CONST[w], p: i, c: w} : {t: 'var', v: ALIAS[w], p: i})); i = j; continue; }
        if (FN[name]) out.push({t: 'fn', v: name, p: i}); else if (CONST[name] !== undefined) out.push({t: 'num', v: CONST[name], p: i, c: name}); else if (ALIAS[name]) out.push({t: 'var', v: ALIAS[name], p: i});
        else throw new Error(`nieznana nazwa „${s.slice(i, j)}” (pozycja ${i + 1}). Dozwolone: x1…xn, x, y, z, pi, e, sin, cos, tan, exp, ln, log, sqrt, abs.`);
        i = j; continue; }
      if ('+-*/^()'.includes(ch)) { out.push({t: ch, p: i}); i++; continue; }
      if (ch === '·' || ch === '×') { out.push({t: '*', p: i}); i++; continue; } if (ch === '−') { out.push({t: '-', p: i}); i++; continue; } if (ch === '²' || ch === '³') { out.push({t: '^', p: i}, {t: 'num', v: ch === '²' ? 2 : 3, p: i}); i++; continue; }
      throw new Error(`niedozwolony znak „${ch}” (pozycja ${i + 1}).`);
    }
    return out;
  }
  function parse(src) {
    const tk = tokenize(src); let i = 0; const peek = () => tk[i], take = t => { const x = tk[i]; if (!x || (t && x.t !== t)) throw new Error(x ? `nieoczekiwany symbol (pozycja ${x.p + 1}).` : 'wyrażenie urywa się – czegoś brakuje na końcu.'); i++; return x; };
    const startsBase = x => x && (x.t === 'num' || x.t === 'var' || x.t === 'fn' || x.t === '(');
    const expr = () => { let n = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const op = take().t; n = {op, a: n, b: term()}; } return n; };
    const term = () => { let n = unary(); for (;;) { const x = peek(); if (x && (x.t === '*' || x.t === '/')) { const op = take().t; n = {op, a: n, b: unary()}; } else if (startsBase(x)) n = {op: '*', a: n, b: power()}; else break; } return n; };
    const unary = () => { if (peek() && peek().t === '-') { take(); return {op: 'neg', a: unary()}; } if (peek() && peek().t === '+') { take(); return unary(); } return power(); };
    const power = () => { const b = base(); if (peek() && peek().t === '^') { take(); return {op: '^', a: b, b: unary()}; } return b; };
    const base = () => { const x = peek(); if (!x) throw new Error('wyrażenie urywa się – czegoś brakuje na końcu.');
      if (x.t === 'num') { take(); return {op: 'num', v: x.v}; } if (x.t === 'var') { take(); if (!(x.v >= 1)) throw new Error(`zmienna musi mieć numer od 1 (pozycja ${x.p + 1}).`); return {op: 'var', v: x.v}; }
      if (x.t === 'fn') { take(); if (!peek() || peek().t !== '(') throw new Error(`po funkcji ${x.v} potrzebny jest nawias, np. ${x.v}(x1) (pozycja ${x.p + 1}).`); take('('); const a = expr(); if (!peek() || peek().t !== ')') throw new Error('brak nawiasu zamykającego „)”.'); take(')'); return {op: 'fn', f: x.v, a}; }
      if (x.t === '(') { take(); const a = expr(); if (!peek() || peek().t !== ')') throw new Error('brak nawiasu zamykającego „)”.'); take(')'); return a; }
      throw new Error(`nieoczekiwany symbol „${x.t}” (pozycja ${x.p + 1}).`); };
    if (!tk.length) throw new Error('wyrażenie jest puste.');
    const ast = expr(); if (i < tk.length) throw new Error(tk[i].t === ')' ? `nadmiarowy nawias zamykający (pozycja ${tk[i].p + 1}).` : `nieoczekiwany symbol (pozycja ${tk[i].p + 1}).`);
    return ast;
  }
  const maxVar = n => !n ? 0 : n.op === 'var' ? n.v : Math.max(maxVar(n.a), maxVar(n.b));
  function compile(ast) {
    const c = n => { switch (n.op) {
      case 'num': { const v = n.v; return () => v; } case 'var': { const k = n.v - 1; return x => x[k]; }
      case 'neg': { const a = c(n.a); return x => -a(x); } case 'fn': { const a = c(n.a), f = FN[n.f]; return x => f(a(x)); }
      case '+': { const a = c(n.a), b = c(n.b); return x => a(x) + b(x); } case '-': { const a = c(n.a), b = c(n.b); return x => a(x) - b(x); }
      case '*': { const a = c(n.a), b = c(n.b); return x => a(x) * b(x); } case '/': { const a = c(n.a), b = c(n.b); return x => a(x) / b(x); }
      case '^': { const a = c(n.a), b = c(n.b); return x => Math.pow(a(x), b(x)); } default: throw new Error('błąd wewnętrzny parsera'); } };
    return c(ast);
  }
  function make(src, nvars = Infinity) {                                // → {f(x), n (najwyższy numer zmiennej)}
    const ast = parse(src), n = maxVar(ast); if (n > nvars) throw new Error(`wyrażenie używa x${n}, a zadanie ma tylko ${nvars} zmiennych.`);
    return {f: compile(ast), n, ast};
  }
  const grad = (f, x) => x.map((xi, i) => { const h = 1e-6 * Math.max(1, Math.abs(xi)), a = x.slice(), b = x.slice(); a[i] += h; b[i] -= h; return (f(a) - f(b)) / (2 * h); });
  const hess = (f, x) => { const n = x.length, H = Array.from({length: n}, () => Array(n).fill(0)), h = x.map(v => 1e-4 * Math.max(1, Math.abs(v)));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const e = (di, dj) => { const y = x.slice(); y[i] += di; y[j] += dj; return f(y); };
      const v = i === j ? (e(h[i], 0) - 2 * f(x) + e(-h[i], 0)) / (h[i] * h[i]) : (e(h[i], h[j]) - e(h[i], -h[j]) - e(-h[i], h[j]) + e(-h[i], -h[j])) / (4 * h[i] * h[j]); H[i][j] = H[j][i] = v; } return H; };
  return {tokenize, parse, compile, make, grad, hess};
})();
