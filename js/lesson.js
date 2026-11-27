/* ===== OptiLab – silnik lekcji „Nauka” z maskotką Pivot =====
   Nakładka z kartami: jedna myśl na kartę, Wstecz/Dalej, pasek postępu, wyjście w każdej chwili (✕, Esc), strzałki ← →.
   Lekcja to DANE – generuje je czysta funkcja modułu z wyniku solvera (np. js/lessons/lp-lessons.js). Ten plik tylko je pokazuje.

   ── Rejestracja tematu ─────────────────────────────────────────────────────────────────────────────
   LESSON.register({
     id: 'lp-simplex',              // unikalny identyfikator (postęp zapamiętany w przeglądarce)
     title: 'Simpleks – podstawy',  // nazwa w menu
     group: 'Simpleks',             // grupa w menu (np. „Simpleks”: podstawy + rozszerzenia)
     ext: true,                     // (opcjonalnie) rozszerzenie – w menu wcięte pod podstawą grupy
     note: 'zadania z ≤',           // (opcjonalnie) krótki dopisek w menu
     tabs: ['graph', 'simplex', 'ilp'],   // zakładki, w których przycisk „Nauka” pokazuje ten temat
     soon: false,                   // true = w menu jako „wkrótce” (nieaktywne)
     build: level => lekcja         // level: 'warm' (Rozgrzewka) | 'test' (Sprawdzian) | 'challenge' (Wyzwanie)
   })

   ── Lekcja ───────────────────────────────────────────────────────────────────────────────────────────
   {title: 'Simpleks – Rozgrzewka', steps: [krok, …], result: {x: [...], z: liczba}}   // result – do testów (zgodność z raportem)

   ── Krok (karta) ────────────────────────────────────────────────────────────────────────────────────
   {
     id: 'kolumna-1',          // (opcjonalnie) nazwa karty – cel przycisku „wróć do wyjaśnienia” (q.back)
     title: 'Która kolumna?',  // krótki nagłówek karty
     mood: 'explain',          // mina Pivota: explain | point | think | surprise | happy | oops
                               //   (domyślnie: think przy pytaniu, point gdy jest hl, w pozostałych explain)
     say: 'Patrz tutaj!',      // dymek Pivota – jedno krótkie zdanie
     text: 'HTML',             // treść karty: 2–3 krótkie zdania
     formula: 'HTML',          // (opcjonalnie) wzór; fragmenty do zakreślenia: <span data-hl="klucz">…</span>
     svg: '<svg …>',           // (opcjonalnie) wykres; elementy do podświetlenia mają data-hl="klucz"
     table: {                  // (opcjonalnie) tabela – silnik nadaje komórkom data-r / data-c (do zakreślania różdżką)
       head: [[komórka, …], …],   // wiersze nagłówka; komórka nagłówka może mieć c (numer kolumny) i span (colspan)
       rows: [[komórka, …], …],   // wiersze danych; komórka: 'tekst' albo {v: 'HTML', th: true, cls: 'pivot' | 'pcol' | 'pr' | 'zval' | 'dim'}
       cls: 'tabcj'               // (opcjonalnie) klasa tabeli
     },
     hl: [                     // (opcjonalnie) co zakreśla różdżka; kolejne kółka pojawiają się po sobie
       {r: 1, c: 3, label: 'element centralny', tone: 'gold'},   // komórka
       {c: 3, tone: 'blue'},   // cała kolumna (z nagłówkiem)      tone: gold | blue | green | red | gray
       {r: 2, tone: 'green'},  // cały wiersz
       {el: 'ogr1'}            // element wykresu/wzoru z data-hl="ogr1" (pulsujące podświetlenie)
     ],
     q: {                      // (opcjonalnie) pytanie – poprawna odpowiedź odblokowuje „Dalej”
       type: 'choice', prompt: 'HTML',
       options: [{t: 'HTML', ok: true}, {t: 'HTML', why: 'konkretne wyjaśnienie tej pomyłki'}],
       // albo: type: 'number', answer: 3.5, wrong: [{v: 7, why: 'typowa pomyłka: …'}], unit: 'zł'
       why: 'ogólne wyjaśnienie błędu (gdy pomyłka nie ma własnego)',
       explain: 'HTML – pokazywane po poprawnej odpowiedzi (albo po „pokaż odpowiedź”)',
       back: 'kolumna-1',      // karta z wyjaśnieniem – po 3 błędach Pivot proponuje powrót
       score: true             // liczone do wyniku Sprawdzianu (poprawnie za pierwszym razem)
     },
     action: {label: 'Wczytaj to zadanie do zakładki', tab: 'simplex', data: {...}, sets: {'simplex-method': 'TAB'}},   // (opcjonalnie) przycisk: dane do zakładki + wartości pól (id → wartość), potem „Rozwiąż”
     result: {x: [...], z: liczba}   // (opcjonalnie) karta z wynikiem – ostatnia karta lekcji ma ten sam wynik co raport
   }
   Liczby, tabele i poprawne odpowiedzi pochodzą z solvera – lekcja nie zawiera wyników wpisanych na stałe.
   Maskotka: assets/pivot_maskotka.svg (grupy poza-explain, poza-point, poza-think, poza-surprise, poza-happy, poza-oops);
   js/pivot-svg.js jest generowany z tego pliku przez tools/pivot_svg.py (test pilnuje zgodności). */
const LESSON = (() => {
  const LEVELS = [['warm', 'Rozgrzewka', 'bardzo proste zadanie, prowadzę Cię krok po kroku'],
    ['test', 'Sprawdzian', 'zadanie średnie – na każdym rozdrożu Ty decydujesz, na końcu wynik'],
    ['challenge', 'Wyzwanie', 'większe zadanie z modułu – oglądasz, że to ten sam schemat']];
  const MOODS = ['explain', 'point', 'think', 'surprise', 'happy', 'oops'];
  const topics = [];
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);

  /* ---------- czyste funkcje (bez DOM, testowane w Node) ---------- */
  // Liczba wpisana przez ucznia: przecinek lub kropka, minus z Worda, ułamek „3/2”, spacje w tysiącach
  function parseNum(s) {
    const t = String(s ?? '').trim().replace(/[−–]/g, '-').replace(/\s+/g, '').replace(',', '.');
    if (!t) return NaN;
    const m = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? +t : NaN;
  }
  // Czy wpis pasuje do wartości: dokładnie (z tolerancją, także jako ułamek 1/3) albo – gdy odpowiedź ma nieskończone rozwinięcie
  // dziesiętne (1/3 = 0,333…, 2/3 = 0,666…) – jako jej przybliżenie z co najmniej 1 miejscem po przecinku: ucięte (0,6) lub zaokrąglone (0,7).
  // Liczby o skończonym rozwinięciu (1,5; 2,25) trzeba wpisać dokładnie – „2,2” albo „2,3” dla 2,25 nie przechodzi.
  function numMatch(s, v) {
    const x = parseNum(s); if (!isFinite(x) || !isFinite(v)) return false;
    if (Math.abs(x - v) <= 1e-6 * Math.max(1, Math.abs(v))) return true;
    const t = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, '').replace(',', '.'), d = /\//.test(t) ? 0 : (t.split('.')[1] || '').length;
    const p = 1e6, a = Math.abs(v), repeating = Math.abs(a * p - Math.round(a * p)) > 1e-6 * Math.max(1, a * p) / 1e3;
    if (d < 1 || !repeating || Math.sign(x) !== Math.sign(v)) return false;
    const k = Math.pow(10, d), cand = [Math.trunc(a * k + 1e-9) / k, Math.round(a * k) / k];
    return cand.some(c => Math.abs(Math.abs(x) - c) < 1e-9 * Math.max(1, c));
  }
  // liczba → [licznik, mianownik] (mianownik ≤ 1000) albo null – do pola-ułamka i podpowiedzi
  function toFrac(v) {
    if (!isFinite(v) || Math.abs(v - Math.round(v)) < 1e-9) return null;
    for (let d = 2; d <= 1000; d++) { const n = Math.round(v * d); if (Math.abs(v - n / d) < 1e-9 * Math.max(1, Math.abs(v))) return [n, d]; }
    return null;
  }
  // Sprawdzenie odpowiedzi: {ok, why} – why: konkretne wyjaśnienie pomyłki (osobne dla typowych błędów)
  function check(q, input) {
    if (q.type === 'choice') {
      const o = q.options[input]; if (!o) return {ok: false, why: 'Wybierz jedną z odpowiedzi.'};
      return o.ok ? {ok: true} : {ok: false, why: o.why || q.why || 'To nie ta odpowiedź – spróbuj jeszcze raz.'};
    }
    if (!isFinite(parseNum(input))) return {ok: false, empty: true, why: 'Wpisz liczbę (np. 12, 1,5 albo 3/2).'};
    if (numMatch(input, q.answer)) return {ok: true};
    const w = (q.wrong || []).find(w => numMatch(input, w.v));
    return {ok: false, why: w ? w.why : q.why || 'Ta liczba się nie zgadza – policz jeszcze raz.'};
  }
  const answerText = q => { if (q.type === 'choice') return q.options.find(o => o.ok).t; const f = toFrac(q.answer);
    return (f ? `${f[0] < 0 ? '−' : ''}${Math.abs(f[0])}/${f[1]} ≈ ${fmtA(q.answer)}` : fmtA(q.answer)) + (q.unit ? ' ' + q.unit : ''); };
  const fmtA = v => typeof fmt === 'function' ? fmt(v) : String(v);
  // Tabela karty → HTML z data-r / data-c (komórki do zakreślenia)
  function tableHTML(t) {
    const cell = (x, tag, r, c) => {
      const o = x !== null && typeof x === 'object' ? x : {v: x}, tg = o.th || tag === 'th' ? 'th' : 'td';
      return `<${tg} data-r="${r}" data-c="${o.c ?? c}"${o.span ? ` colspan="${o.span}"` : ''}${o.rspan ? ` rowspan="${o.rspan}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}>${o.v ?? ''}</${tg}>`;
    };
    return `<div class="tw"><table class="ls-table ${t.cls || ''}">` +
      (t.head || []).map((row, i) => `<tr class="ls-head">${row.map((x, c) => cell(x, 'th', 'h' + i, c)).join('')}</tr>`).join('') +
      t.rows.map((row, r) => `<tr${t.rowCls && t.rowCls[r] ? ` class="${t.rowCls[r]}"` : ''}>${row.map((x, c) => cell(x, 'td', r, c)).join('')}</tr>`).join('') + '</table></div>';
  }
  // Kontrola formatu lekcji (testy i tryb deweloperski): lista problemów, pusta = OK
  function validate(L) {
    const bad = [], ids = new Set((L.steps || []).map(s => s.id).filter(Boolean));
    if (!L || !Array.isArray(L.steps) || !L.steps.length) return ['brak kroków'];
    L.steps.forEach((s, i) => {
      const w = m => bad.push(`krok ${i + 1}${s.title ? ` („${s.title.replace(/<[^>]+>/g, '')}”)` : ''}: ${m}`);
      if (!s.text && !s.q) w('brak treści');
      if (s.mood && !MOODS.includes(s.mood)) w('nieznana mina ' + s.mood);
      const sentences = (s.text || '').replace(/<[^>]+>/g, '').replace(/\d[.,]\d/g, '0').split(/[.!?](?:\s|$)/).filter(x => x.trim()).length;
      if (sentences > 3) w(`za długi tekst (${sentences} zdania, maks. 3)`);
      if (s.say && s.say.replace(/<[^>]+>/g, '').length > 90) w('za długi dymek');
      (s.hl || []).forEach(h => { if (h.el === undefined && h.r === undefined && h.c === undefined) w('pusty hl'); if ((h.r !== undefined || h.c !== undefined) && !s.table) w('hl tabeli bez tabeli'); });
      if (s.table) (s.hl || []).forEach(h => { if (typeof h.r === 'number' && !s.table.rows[h.r]) w('hl poza tabelą (wiersz ' + h.r + ')'); });
      if (s.q) {
        const q = s.q;
        if (q.type === 'choice') { const ok = q.options.filter(o => o.ok).length; if (ok !== 1) w(`pytanie ma ${ok} poprawnych odpowiedzi`); if (q.options.some(o => !o.ok && !o.why && !q.why)) w('błędna odpowiedź bez wyjaśnienia'); }
        else if (q.type === 'number') { if (!isFinite(q.answer)) w('pytanie liczbowe bez odpowiedzi'); if ((q.wrong || []).some(x => numMatch(String(x.v), q.answer))) w('typowa pomyłka równa poprawnej odpowiedzi'); }
        else w('nieznany typ pytania');
        if (q.back && !ids.has(q.back)) w('q.back wskazuje nieistniejącą kartę ' + q.back);
      }
    });
    return bad;
  }
  const register = t => { const i = topics.findIndex(x => x.id === t.id); if (i >= 0) topics[i] = t; else topics.push(t); };
  const build = (id, level) => { const t = topics.find(x => x.id === id); if (!t || t.soon) throw new Error('brak lekcji ' + id); return t.build(level); };
  const store = {                                  // pamięć w przeglądarce (może być niedostępna – wtedy po prostu nie pamiętamy)
    get(k, d) { try { const v = localStorage.getItem('optilab.nauka.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('optilab.nauka.' + k, JSON.stringify(v)); } catch (e) { /* brak pamięci – bez zapisu */ } }
  };

  /* ---------- interfejs (DOM) ---------- */
  let root = null, S = null, lastFocus = null;
  const q$ = s => root.querySelector(s);
  const BUBBLE = {explain: 'Posłuchaj…', point: 'Spójrz tutaj!', think: 'Jak myślisz?', surprise: 'Ciekawostka!', happy: 'Świetnie!', oops: 'Ups!'};
  function shell() {
    if (root) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="lesson" class="ls-ov" hidden><div class="ls-panel" role="dialog" aria-modal="true" aria-labelledby="ls-title">
      <div class="ls-top"><div class="ls-tt"><b id="ls-title">Nauka</b><span id="ls-sub"></span></div>
        <button type="button" class="ghost ls-pvtog" aria-pressed="false">Ukryj Pivota</button><button type="button" class="ghost ls-x" aria-label="Zamknij lekcję">✕</button></div>
      <div class="ls-prog" aria-hidden="true"><i></i></div>
      <div class="ls-body" tabindex="-1">
        <div class="ls-talk"><div class="ls-pivot" data-pose="explain" aria-hidden="true">${typeof PIVOT_SVG === 'string' ? PIVOT_SVG : ''}</div><div class="ls-bubble"><svg class="ls-tail" viewBox="0 0 14 22" aria-hidden="true"><path class="f" d="M14 0L1 11L14 22Z"/><path class="s" d="M14 .8L1.4 11L14 21.2"/></svg><span class="ls-say" aria-live="polite"></span></div></div>
        <div class="ls-main"></div></div>
      <div class="ls-foot"><button type="button" class="ghost ls-back">← Wstecz</button><span class="ls-cnt"></span><button type="button" class="ls-next">Dalej →</button></div>
    </div></div>`);
    root = document.getElementById('lesson');
    q$('.ls-x').onclick = close;
    q$('.ls-back').onclick = () => S && S.back();
    q$('.ls-next').onclick = () => S && S.next();
    q$('.ls-pvtog').onclick = () => { store.set('hidePivot', !root.classList.contains('nopv')); applyPv(); };
    root.addEventListener('keydown', onKey);
    root.addEventListener('click', e => { if (e.target === root) close(); });
    window.addEventListener('resize', () => { if (!root.hidden) { clearTimeout(root._rt); root._rt = setTimeout(drawRings, 120); } });
    applyPv();
  }
  function applyPv() {
    const off = !!store.get('hidePivot', false); root.classList.toggle('nopv', off);
    const b = q$('.ls-pvtog'); b.textContent = off ? 'Pokaż Pivota' : 'Ukryj Pivota'; b.setAttribute('aria-pressed', String(off));
  }
  function pose(mood, say) {
    const pv = q$('.ls-pivot'), m = MOODS.includes(mood) ? mood : 'explain';
    if (pv.dataset.pose !== m) { pv.dataset.pose = m; pv.classList.remove('pv-anim'); void pv.offsetWidth; pv.classList.add('pv-anim'); }
    q$('.ls-say').innerHTML = say ?? BUBBLE[m];
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const inField = e.target.tagName === 'INPUT';
    if (!S || inField) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); S.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.back(); }
    else if (e.key === 'Tab') {                                     // fokus nie ucieka spod nakładki
      const f = [...root.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled])')].filter(x => x.offsetParent !== null);
      if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function openOv() {
    shell(); lastFocus = document.activeElement;
    root.hidden = false; document.documentElement.classList.add('ls-lock');
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true; S = null; document.documentElement.classList.remove('ls-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const setNav = (back, next, cnt = '', nextTxt = 'Dalej →') => {
    const b = q$('.ls-back'), n = q$('.ls-next');
    b.hidden = !back; n.hidden = !next; if (next) { n.disabled = next === 'locked'; n.textContent = nextTxt; }
    q$('.ls-cnt').textContent = cnt;
  };
  const progress = f => { q$('.ls-prog i').style.width = Math.round(f * 100) + '%'; };
  const visibleTopics = tab => topics.filter(t => !tab || !t.tabs || t.tabs.includes(tab));
  const hasLessons = tab => visibleTopics(tab).length > 0;
  /* Menu startowe: „Czego chcesz się dziś nauczyć?” */
  function open(tab) {
    openOv(); S = null; const list = visibleTopics(tab);
    q$('#ls-title').textContent = 'Nauka z Pivotem'; q$('#ls-sub').textContent = '';
    pose('explain', 'Cześć, jestem Pivot! Czego chcesz się dziś nauczyć?'); progress(0); setNav(false, false);
    const done = store.get('done', {}), groups = [];
    list.forEach(t => { let g = groups.find(x => x.name === (t.group || t.title)); if (!g) groups.push(g = {name: t.group || t.title, items: []}); g.items.push(t); });
    let n = 0;
    q$('.ls-main').innerHTML = '<h3 class="ls-h">Wybierz temat</h3><div class="ls-menu">' + groups.map(g => {
      const one = g.items.length === 1 && !g.items[0].ext;
      return `<div class="ls-grp">${one ? '' : `<div class="ls-gname">${++n}. ${esc(g.name)}</div>`}` + g.items.map(t => {
        const d = (done[t.id] || []).length;
        return `<button type="button" class="ghost ls-topic${t.ext ? ' ext' : ''}" data-id="${esc(t.id)}"${t.soon ? ' disabled' : ''}>` +
          `<b>${one ? ++n + '. ' : ''}${t.ext ? '<span class="ls-ext">rozszerzenie</span> ' : ''}${esc(t.title)}</b>` +
          `<span>${t.soon ? 'wkrótce – w kolejnej aktualizacji' : esc(t.note || '') + (d ? ` · ukończone poziomy: ${d}/3` : '')}</span></button>`;
      }).join('') + '</div>';
    }).join('') + '</div>';
    q$('.ls-main').querySelectorAll('.ls-topic').forEach(b => b.onclick = () => levels(b.dataset.id, tab));
    const pick = q$('.ls-topic:not([disabled])'); if (pick) pick.focus();
    q$('.ls-body').scrollTop = 0;
  }
  /* Wybór poziomu: domyślnie pierwszy nieukończony (po kolei) */
  function levels(id, tab) {
    const t = topics.find(x => x.id === id), done = store.get('done', {})[id] || [], def = (LEVELS.find(([k]) => !done.includes(k)) || LEVELS[0])[0];
    q$('#ls-title').textContent = t.title; q$('#ls-sub').textContent = '';
    pose('think', 'Na jakim poziomie zaczynamy?'); setNav(false, false);
    q$('.ls-main').innerHTML = '<h3 class="ls-h">Wybierz poziom</h3><div class="ls-menu">' + LEVELS.map(([k, name, d], i) =>
      `<button type="button" class="ghost ls-lvl${k === def ? ' rec' : ''}" data-l="${k}"><b>${i + 1}. ${name}${done.includes(k) ? ' <span class="ls-done">✓ ukończony</span>' : ''}${k === def ? ' <span class="ls-rec">polecam</span>' : ''}</b><span>${d}</span></button>`).join('') +
      '</div><button type="button" class="ghost ls-menu-back">← Zmień temat</button>';
    q$('.ls-main').querySelectorAll('.ls-lvl').forEach(b => b.onclick = () => start(id, b.dataset.l, tab));
    q$('.ls-menu-back').onclick = () => open(tab);
    q$('.ls-lvl.rec').focus();
  }
  /* Przebieg lekcji */
  function start(id, level, tab) {
    openOv(); let L;
    try { L = build(id, level); } catch (err) {
      console.error(err); pose('oops', 'Coś poszło nie tak.');
      q$('.ls-main').innerHTML = `<p class="msg">Nie udało się przygotować lekcji: ${esc(err.message)}</p><button type="button" class="ghost ls-menu-back">← Menu</button>`;
      q$('.ls-menu-back').onclick = () => open(tab); return;
    }
    const t = topics.find(x => x.id === id), lvName = LEVELS.find(([k]) => k === level)[1];
    q$('#ls-title').textContent = t.title; q$('#ls-sub').textContent = ' · ' + lvName;
    const steps = L.steps, st = steps.map(() => ({done: false, tries: 0, first: false, shown: false}));
    let i = 0;
    const scored = () => steps.map((s, k) => [s, st[k]]).filter(([s]) => s.q && s.q.score);
    S = {
      next() { if (i < steps.length && steps[i].q && !st[i].done) return; if (i < steps.length) { i++; render(); } },
      back() { if (i > 0) { i--; render(); } },
      go(k) { i = Math.max(0, Math.min(steps.length, k)); render(); },
      step: () => steps[i]
    };
    function finish() {
      const sc = scored(), good = sc.filter(([, x]) => x.first).length, all = store.get('done', {});
      all[id] = [...new Set([...(all[id] || []), level])]; store.set('done', all);
      const nx = LEVELS[LEVELS.findIndex(([k]) => k === level) + 1];
      pose('happy', sc.length ? `Twój wynik: ${good}/${sc.length}!` : 'Brawo, lekcja ukończona!');
      progress(1); setNav(true, false, '');
      q$('.ls-main').innerHTML = `<div class="ls-card ls-end"><h3>Koniec lekcji „${esc(t.title)}” – ${lvName}</h3>` +
        (sc.length ? `<p class="ls-score"><b>${good}/${sc.length}</b> poprawnych odpowiedzi za pierwszym razem.</p><p>${good === sc.length ? 'Bezbłędnie – możesz śmiało liczyć samodzielnie!' : good >= sc.length * 0.6 ? 'Dobra robota! Pomyłki są wyjaśnione na kartach – warto do nich wrócić.' : 'Spokojnie – wróć do Rozgrzewki albo przejrzyj karty jeszcze raz.'}</p>` : '<p>Masz już cały schemat w głowie. Teraz spróbuj na własnych danych w zakładce.</p>') +
        `<div class="ls-acts">${nx ? `<button type="button" class="ls-nextlvl">Dalej: ${nx[1]}</button>` : ''}<button type="button" class="ghost ls-again">Powtórz</button><button type="button" class="ghost ls-menu-back">Inny temat</button><button type="button" class="ghost ls-close2">Zamknij</button></div></div>`;
      if (nx) q$('.ls-nextlvl').onclick = () => start(id, nx[0], tab);
      q$('.ls-again').onclick = () => start(id, level, tab);
      q$('.ls-menu-back').onclick = () => open(tab);
      q$('.ls-close2').onclick = close;
      (q$('.ls-nextlvl') || q$('.ls-again')).focus();
    }
    function render() {
      if (i >= steps.length) return finish();
      const s = steps[i], x = st[i], q = s.q, mood = s.mood || (q ? 'think' : s.hl && s.hl.length ? 'point' : 'explain');
      progress(i / steps.length);
      let h = `<div class="ls-card" data-step="${i}">${s.title ? `<h3>${s.title}</h3>` : ''}${s.text ? `<p class="ls-text">${s.text}</p>` : ''}`;
      if (s.formula || s.svg || s.table) h += `<div class="ls-vis">${s.formula ? `<div class="formula ls-formula">${s.formula}</div>` : ''}${s.svg ? `<div class="ls-svg">${s.svg}</div>` : ''}${s.table ? tableHTML(s.table) : ''}</div>`;
      if (s.result) h += `<div class="sum ls-result"><b>Wynik:</b> ${s.result.x.map((v, j) => `x${sub(j + 1)} = ${s.result.fx ? s.result.fx[j] : fmtA(v)}`).join(', ')}; Z<sub>opt</sub> = <b>${s.result.fz || fmtA(s.result.z)}</b></div>`;
      if (q) {
        h += `<div class="ls-q"><p class="ls-prompt">${q.prompt}</p>`;
        if (q.type === 'choice') h += `<div class="ls-opts">${q.options.map((o, k) => `<button type="button" class="ghost ls-opt" data-k="${k}">${o.t}</button>`).join('')}</div>`;
        else h += `<div class="ls-num"><div class="ls-frac"><input class="ls-nn" type="text" inputmode="decimal" autocomplete="off" aria-label="Twoja odpowiedź: liczba albo licznik ułamka" placeholder="?"><i aria-hidden="true"></i>` +
          `<input class="ls-dd" type="text" inputmode="numeric" autocomplete="off" aria-label="Mianownik ułamka (puste = 1)" placeholder="1"></div>${q.unit ? `<span>${q.unit}</span>` : ''}<button type="button" class="ls-chk">Sprawdź</button>` +
          '<p class="ls-numhint">Liczba (np. 1,5) albo ułamek – mianownik pod kreską. Przybliżenie (np. 0,33) też jest dobre.</p></div>';
        h += '<div class="ls-fb" aria-live="polite"></div><div class="ls-help"><button type="button" class="ghost ls-show" hidden>Pokaż odpowiedź</button><button type="button" class="ghost ls-goback" hidden></button></div></div>';
      }
      if (s.action) h += `<div class="ls-acts"><button type="button" class="ghost ls-action">${s.action.label}</button></div>`;
      q$('.ls-main').innerHTML = h + '</div>';
      pose(mood, s.say);
      setNav(i > 0, q && !x.done ? 'locked' : true, `${i + 1} / ${steps.length}`, i === steps.length - 1 ? 'Zakończ ✓' : 'Dalej →');
      q$('.ls-body').scrollTop = 0;
      if (q) wireQ(s, x);
      if (s.action) q$('.ls-action').onclick = () => runAction(s.action);
      requestAnimationFrame(drawRings);
      const f = q && !x.done ? q$('.ls-opt, .ls-nn') : q$('.ls-next:not([hidden]):not([disabled])');
      if (f) f.focus({preventScroll: true});
    }
    function wireQ(s, x) {
      const q = s.q, fb = q$('.ls-fb'), show = q$('.ls-show'), gb = q$('.ls-goback');
      const backIdx = () => { const k = q.back ? steps.findIndex(z => z.id === q.back) : -1; if (k >= 0) return k; for (let j = i - 1; j >= 0; j--) if (!steps[j].q) return j; return -1; };
      const solved = (how) => {
        x.done = true; q$('.ls-card').classList.add('solved');
        if (q.type === 'choice') q$('.ls-main').querySelectorAll('.ls-opt').forEach(b => { b.disabled = true; if (q.options[+b.dataset.k].ok) b.classList.add('good'); });
        else { const nn = q$('.ls-nn'), dd = q$('.ls-dd'), fr = toFrac(q.answer);
          if (how === 'shown' || !nn.value) { if (fr) { nn.value = String(fr[0]).replace('-', '−'); dd.value = String(fr[1]); } else { nn.value = fmtA(q.answer); dd.value = ''; } }
          [nn, dd].forEach(e => { e.disabled = true; e.classList.add('good'); }); q$('.ls-chk').disabled = true; }
        fb.className = 'ls-fb ok'; fb.innerHTML = (how === 'shown' ? `<b>Poprawna odpowiedź:</b> ${answerText(q)}. ` : '<b>Dobrze!</b> ') + (q.explain || '');
        show.hidden = true; gb.hidden = true; setNav(i > 0, true, `${i + 1} / ${steps.length}`, i === steps.length - 1 ? 'Zakończ ✓' : 'Dalej →');
      };
      if (x.done) { solved(x.shown ? 'shown' : 'ok'); pose(x.shown ? 'explain' : 'happy', x.shown ? 'Zapamiętaj to – przyda się!' : 'To już masz!'); return; }
      const attempt = input => {
        const r = check(q, input);
        if (r.empty) { fb.className = 'ls-fb bad'; fb.textContent = r.why; return; }
        x.tries++;
        if (r.ok) { if (x.tries === 1) x.first = true; solved('ok'); pose('happy', x.tries === 1 ? ['Brawo!', 'Świetnie!', 'Dokładnie tak!', 'Super!'][i % 4] : 'Teraz się zgadza!'); q$('.ls-next').focus(); return; }
        pose('oops', x.tries >= 3 ? 'Nic nie szkodzi – wróćmy na chwilę do wyjaśnienia.' : ['Ups! Prawie.', 'Hmm, nie tym razem.', 'Spróbuj jeszcze raz!'][x.tries % 3]);
        fb.className = 'ls-fb bad'; fb.innerHTML = `<b>Nie.</b> ${r.why}`;
        show.hidden = false;
        if (x.tries >= 3) { const k = backIdx(); if (k >= 0) { gb.hidden = false; gb.textContent = `↩ Wróć do wyjaśnienia: ${(steps[k].title || 'poprzednia karta').replace(/<[^>]+>/g, '')}`; gb.onclick = () => S.go(k); } }
      };
      if (q.type === 'choice') q$('.ls-main').querySelectorAll('.ls-opt').forEach(b => b.onclick = () => { if (b.disabled) return; attempt(+b.dataset.k); if (!x.done) { b.disabled = true; b.classList.add('bad'); } });
      else { const nn = q$('.ls-nn'), dd = q$('.ls-dd');
        const val = () => { const a = nn.value.trim(), b = dd.value.trim(); return b && a ? `${a}/${b}` : a; };   // pusty mianownik = 1
        q$('.ls-chk').onclick = () => attempt(val());
        [nn, dd].forEach(e => e.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); attempt(val()); } })); }
      show.onclick = () => { x.shown = true; solved('shown'); pose('explain', 'Zapamiętaj to – przyda się!'); };
    }
    render();
  }
  /* Różdżka: kółka/ramki wokół fragmentów tabeli, podświetlenie elementów wykresu i wzoru */
  function drawRings() {
    if (!root || root.hidden) return;
    root.querySelectorAll('.ls-ring, .ls-tag').forEach(e => e.remove());
    root.querySelectorAll('.ls-on').forEach(e => e.classList.remove('ls-on', 'tone-gold', 'tone-blue', 'tone-green', 'tone-red', 'tone-gray'));
    if (S && S.step) ringsFor(S.step());
  }
  // Właściwe rysowanie – krok przekazany jawnie (render wywołuje przez requestAnimationFrame)
  function ringsFor(step) {
    const card = q$('.ls-card[data-step]'); if (!card || !step || !step.hl) return;
    const tw = card.querySelector('.ls-vis .tw'), table = tw && tw.querySelector('table');
    step.hl.forEach((h, k) => {
      const tone = 'tone-' + (h.tone || 'gold');
      if (h.el !== undefined) { card.querySelectorAll(`[data-hl~="${h.el}"]`).forEach(e => e.classList.add('ls-on', tone)); return; }
      if (!table) return;
      const sel = h.r !== undefined && h.c !== undefined ? `[data-r="${h.r}"][data-c="${h.c}"]` : h.r !== undefined ? `[data-r="${h.r}"]` : `[data-c="${h.c}"]`;
      const els = [...table.querySelectorAll(sel)]; if (!els.length) return;
      const tr = tw.getBoundingClientRect(), R = els.map(e => e.getBoundingClientRect());
      const L = Math.min(...R.map(r => r.left)) - tr.left + tw.scrollLeft - 4, T = Math.min(...R.map(r => r.top)) - tr.top + tw.scrollTop - 4;
      const W = Math.max(...R.map(r => r.right)) - tr.left + tw.scrollLeft + 4 - L, H = Math.max(...R.map(r => r.bottom)) - tr.top + tw.scrollTop + 4 - T;
      const one = els.length === 1, rx = one ? Math.min(W, H) / 2 : 10;
      tw.insertAdjacentHTML('beforeend', `<svg class="ls-ring ${tone}" style="left:${L}px;top:${T}px;width:${W}px;height:${H}px;animation-delay:${k * 0.45}s" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
        `<rect x="2" y="2" width="${Math.max(0, W - 4)}" height="${Math.max(0, H - 4)}" rx="${rx}" pathLength="100" style="animation-delay:${k * 0.45}s"/></svg>`);
      if (h.label) {                                   // etykieta: nad ramką; przy pojedynczej komórce obok niej, jeśli jest miejsce; nigdy poza tabelą
        tw.insertAdjacentHTML('beforeend', `<span class="ls-tag ${tone}" style="animation-delay:${k * 0.45 + 0.4}s">${h.label}</span>`);
        const tg = tw.lastElementChild, tW = tg.offsetWidth, tH = tg.offsetHeight, maxL = Math.max(0, tw.scrollWidth - tW - 2);
        let x = L, y = T - tH - 2;
        if (one && L + W + tW + 4 <= tw.scrollWidth) { x = L + W + 2; y = T + H / 2 - tH / 2; }
        else if (one && L - tW - 4 >= 0) { x = L - tW - 2; y = T + H / 2 - tH / 2; }
        tg.style.left = Math.min(Math.max(0, x), maxL) + 'px'; tg.style.top = Math.max(0, y) + 'px';
      }
      if (k === 0 && (L < tw.scrollLeft || L + W > tw.scrollLeft + tw.clientWidth)) tw.scrollLeft = Math.max(0, L + W / 2 - tw.clientWidth / 2);
    });
  }
  function runAction(a) {
    if (a.tab && typeof models !== 'undefined' && typeof parseModel === 'function') {
      models[a.tab] = parseModel(a.tab, a.data); renderForm(a.tab);
      Object.entries(a.sets || {}).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });   // np. metoda w zakładce
      close(); if (typeof goTab === 'function') goTab(a.tab);
      const b = document.getElementById('btn-' + a.tab); if (b) b.click();
    }
  }
  return {LEVELS, MOODS, topics, register, build, open, start, close, hasLessons, parseNum, numMatch, toFrac, check, tableHTML, validate, answerText, esc,
    get active() { return !!(root && !root.hidden); }, current: () => (S && S.step ? S.step() : null)};
})();
/* Przycisk „Nauka” w nagłówku – widoczny w zakładkach, dla których są lekcje (app.js woła LESSON_TAB przy zmianie zakładki) */
function LESSON_TAB(t) { const b = typeof document !== 'undefined' && document.getElementById && document.getElementById('btn-learn'); if (b) b.hidden = !LESSON.hasLessons(t); }
if (typeof document !== 'undefined' && document.getElementById) {
  const b = document.getElementById('btn-learn'); if (b && b.addEventListener) b.addEventListener('click', () => LESSON.open(typeof curTab === 'string' ? curTab : 'graph'));
}
