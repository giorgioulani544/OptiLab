/* ===== OptiLab – moduł Kolejki (teoria masowej obsługi) =====
   Interfejs i raport dydaktyczny. Obliczenia: js/queue/queue-solver.js. */
const QUP = 'queue-';
const QU_F = {lam: {key: 'lam', label: 'Intensywność napływu λ', unit: 'klientów na jednostkę czasu'}, lamN: {key: 'lam', label: 'Intensywność zgłoszeń jednego klienta λ', unit: 'na jednostkę czasu'},
  mu: {key: 'mu', label: 'Intensywność obsługi μ (jedno stanowisko)', unit: 'klientów na jednostkę czasu'}, s: {key: 's', label: 'Liczba stanowisk s'}, K: {key: 'K', label: 'Pojemność systemu K (obsługiwani + czekający)'},
  N: {key: 'N', label: 'Liczebność populacji N'}, sigma: {key: 'sigma', label: 'Odchylenie standardowe czasu obsługi σ', unit: 'jednostek czasu'}, k: {key: 'k', label: 'Liczba faz k rozkładu Erlanga'},
  t: {key: 't', label: 'Czas t dla P(W > t) i P(Wq > t) (opcjonalnie)', unit: 'jednostek czasu', blank: true}};
const quFields = m => ({mm1: ['lam', 'mu', 't'], mms: ['lam', 'mu', 's', 't'], mm1k: ['lam', 'mu', 'K'], mmsk: ['lam', 'mu', 's', 'K'], mg1: ['lam', 'mu', 'sigma'], md1: ['lam', 'mu'], mek1: ['lam', 'mu', 'k'], mmsn: ['lamN', 'mu', 's', 'N']})[m].map(k => QU_F[k]);
const QU_CF = [{key: 'Cs', label: 'Koszt jednego stanowiska na jednostkę czasu', unit: 'zł'}, {key: 'Cw', label: 'Koszt oczekiwania klienta na jednostkę czasu', unit: 'zł'}, {key: 'Cb', label: 'Koszt utraconego (odrzuconego) klienta', unit: 'zł, modele z pojemnością K', blank: true}];
const quEx = (name, d) => ({name, data: {cost: false, base: 'L', Cs: '', Cw: '', Cb: '', t: '', s: '2', K: '5', N: '5', sigma: '', k: '3', ...d}});
const QU_EXAMPLES = [
  quEx('Warsztat Arnolda – M/M/1 (Render i Stair)', {model: 'mm1', lam: '2', mu: '3', t: '1'}),
  quEx('Warsztat Arnolda – dwa stanowiska M/M/2', {model: 'mms', lam: '2', mu: '3', s: '2', t: '0.5'}),
  quEx('Infolinia: ile konsultantów? (koszty)', {model: 'mms', lam: '10', mu: '3', s: '4', cost: true, Cs: '40', Cw: '25', t: '0.25'}),
  quEx('Centrala bez kolejki – Erlang B (M/M/5/5)', {model: 'mmsk', lam: '2', mu: '1', s: '5', K: '5'}),
  quEx('Parking z miejscami oczekiwania – M/M/1/K', {model: 'mm1k', lam: '6', mu: '5', K: '4'}),
  quEx('Myjnia automatyczna – M/D/1 (Garcia-Golding)', {model: 'md1', lam: '8', mu: '12'}),
  quEx('Obsługa o dowolnym rozkładzie – M/G/1', {model: 'mg1', lam: '0.5', mu: '1', sigma: '1.5'}),
  quEx('Obsługa trzyfazowa – M/E₃/1', {model: 'mek1', lam: '0.6', mu: '1', k: '3'}),
  quEx('Serwis 5 drukarek – populacja skończona', {model: 'mmsn', lam: '0.05', mu: '0.5', s: '1', N: '5'}),
];
let QU = quNormalize(JSON.parse(JSON.stringify(QU_EXAMPLES[0].data)));
function quNormalize(d) {
  if (!d || !QU_MODELS[d.model]) throw new Error('to nie jest zadanie z modułu Kolejki (nieznany model).');
  const o = {model: d.model, cost: !!d.cost, base: d.base === 'Lq' ? 'Lq' : 'L'}; ['lam', 'mu', 's', 'K', 'N', 'sigma', 'k', 't', 'Cs', 'Cw', 'Cb'].forEach(k => { o[k] = String(d[k] ?? ''); }); return o;
}
function quRender() {
  $('#' + QUP + 'model').value = QU.model; $('#' + QUP + 'cost').checked = QU.cost; $('#' + QUP + 'base').value = QU.base;
  $('#' + QUP + 'params').innerHTML = paramFormHTML(QUP, quFields(QU.model), QU); $('#' + QUP + 'costp').innerHTML = paramFormHTML(QUP, QU_CF, QU); $('#' + QUP + 'costbox').hidden = !QU.cost;
  matrixPolish($('#' + QUP + 'top'));
}
function quSync() { paramSync(QUP, quFields(QU.model), QU); paramSync(QUP, QU_CF, QU); QU.model = $('#' + QUP + 'model').value; QU.cost = $('#' + QUP + 'cost').checked; QU.base = $('#' + QUP + 'base').value; }
function quInit() {
  $('#' + QUP + 'top').innerHTML = `<div class="crow"><label for="${QUP}model">Model</label><select id="${QUP}model">${Object.entries(QU_MODELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${netCopyHTML(QUP)}<div id="${QUP}params"></div><div id="${QUP}msg"></div>
    <details class="adv"><summary>Opcje zaawansowane</summary><div class="crow"><label class="chk"><input type="checkbox" id="${QUP}cost"> analiza kosztów: optymalna liczba stanowisk</label></div>
     <div id="${QUP}costbox"><div id="${QUP}costp"></div><div class="crow"><label for="${QUP}base">Koszt oczekiwania liczony od</label><select id="${QUP}base"><option value="L">klientów w systemie (L)</option><option value="Lq">klientów w kolejce (Lq)</option></select></div></div>
     ${netToolsHTML(QUP, QU_EXAMPLES)}</details>
    <p class="hint">Notacja Kendalla A/B/s/K/N: rozkład napływu / rozkład obsługi / liczba stanowisk / pojemność / populacja. M – rozkład wykładniczy (napływ Poissona), D – stały czas, G – dowolny, Eₖ – Erlanga.</p>`;
  ['model', 'cost', 'base'].forEach(k => $('#' + QUP + k).onchange = () => { quSync(); clearErr(); quRender(); });
  matrixWire($('#' + QUP + 'top'));
  const keys = ['model', 'lam', 'mu', 's', 'K', 'N', 'sigma', 'k', 't', 'Cs', 'Cw', 'Cb', 'base'];
  netToolsWire(QUP, {kind: 'queue', out: '#out-queue', examples: QU_EXAMPLES, normalize: quNormalize, get: () => { quSync(); return JSON.parse(JSON.stringify(QU)); }, set: d => { QU = d; quRender(); },
    toCSV: d => paramsToCSV(keys.map(k => [k, d[k]]).filter(([, v]) => v !== '' && v !== undefined)), fromCSV: t => { const r = paramsFromCSV(t, keys, null, ['model', 'base']); return {...r.meta, model: r.meta.model, cost: !!(r.meta.Cs && r.meta.Cw)}; }});
  $('#btn-queue').onclick = quSolveUI;
  quRender();
}
function quRead() {
  clearErr(); quSync();
  const out = '#out-queue', m = QU.model, P = {}, bad = [];
  quFields(m).forEach(f => { const s = String(QU[f.key]).trim().replace(',', '.'); if (s === '' && f.blank) { P[f.key] = null; return; } const x = Number(s); if (s === '' || !isFinite(x) || x < 0 || x > 1e9) bad.push(f.key); P[f.key] = x; });
  if (bad.length) return netFail(QUP, out, 'wpisz w zaznaczonych polach liczby nieujemne.', bad);
  if (!(P.lam > 0)) return netFail(QUP, out, 'intensywność napływu λ musi być dodatnia.', ['lam']); if (!(P.mu > 0)) return netFail(QUP, out, 'intensywność obsługi μ musi być dodatnia.', ['mu']);
  const intOK = (k, lo, hi, msg) => { if (P[k] !== undefined && !(Number.isInteger(P[k]) && P[k] >= lo && P[k] <= hi)) { netFail(QUP, out, msg, [k]); return false; } return true; };
  if (!intOK('s', 1, 200, 'liczba stanowisk: liczba całkowita od 1 do 200.') || !intOK('N', 1, 2000, 'liczebność populacji: liczba całkowita od 1 do 2000.') || !intOK('k', 1, 100, 'liczba faz: liczba całkowita od 1 do 100.')) return null;
  if (P.K !== undefined) { const s = m === 'mm1k' ? 1 : P.s; if (!(Number.isInteger(P.K) && P.K >= s && P.K <= 5000)) return netFail(QUP, out, `pojemność systemu K: liczba całkowita od ${s} (liczby stanowisk) do 5000.`, ['K']); }
  if (m === 'mmsn' && P.s > P.N) return netFail(QUP, out, 'liczba stanowisk nie może przekraczać liczebności populacji.', ['s', 'N']);
  const X = {P};
  if (QU.cost) { const C = {}; QU_CF.forEach(f => { const s = String(QU[f.key]).trim().replace(',', '.'); if (s === '' && f.blank) { C[f.key] = 0; return; } const x = Number(s); if (s === '' || !isFinite(x) || x < 0) bad.push(f.key); C[f.key] = x; });
    if (bad.length) return netFail(QUP, out, 'analiza kosztów: wpisz koszty (liczby nieujemne).', bad); if (!['mms', 'mmsk', 'mmsn'].includes(m)) return netFail(QUP, out, 'analiza kosztów zmienia liczbę stanowisk – wybierz model M/M/s, M/M/s/K albo M/M/s//N.', []); X.C = C; }
  return X;
}
function quSolveUI() { const X = quRead(); if (!X) return; const h = quReportHTML(QU.model, X.P, X.C ? {...X.C, base: QU.base} : null); $('#out-queue').innerHTML = h; last.queue = h; }
/* ---------- raport dydaktyczny (czysty HTML) ---------- */
function quReportHTML(m, P, C = null) {
  const R = quSolve(m, P), f = v => v === null || v === undefined || !isFinite(v) ? '–' : fmt(Math.round(v * 10000) / 10000), pc = v => fmt(Math.round(v * 10000) / 100) + '%', s = R.s;
  const desc = {mm1: 'Jedno stanowisko, napływ Poissona, wykładniczy czas obsługi, kolejka nieograniczona.', mms: `${s} identycznych stanowisk, wspólna kolejka, napływ Poissona, wykładniczy czas obsługi.`,
    mm1k: `Jedno stanowisko; w systemie mieści się najwyżej K = ${P.K} klientów – kolejni odchodzą (są odrzucani).`, mmsk: `${s} stanowisk i najwyżej K = ${P.K} klientów w systemie.${P.K === s ? ' Gdy K = s, nie ma kolejki – to system ze stratami (wzór Erlanga B).' : ''}`,
    mg1: 'Jedno stanowisko, napływ Poissona, dowolny rozkład czasu obsługi (średnia 1/μ, odchylenie σ).', md1: 'Jedno stanowisko, stały czas obsługi 1/μ (np. automat).', mek1: `Czas obsługi ma rozkład Erlanga z k = ${P.k} fazami (mniejsza zmienność niż wykładniczy).`,
    mmsn: `Populacja ${P.N} klientów (np. maszyn); każdy zgłasza się z intensywnością λ, gdy nie jest w systemie, więc napływ maleje, gdy w systemie jest więcej klientów.`}[m];
  let h = `<h3>Model ${QU_MODELS[m]}</h3><p>${desc}</p>`;
  if (R.status === 'unstable') return h + `<p class="msg">System jest niestabilny: ρ = λ / (s·μ) = ${f(P.lam)} / (${s}·${f(P.mu)}) = ${f(R.rho)} ≥ 1. Klienci przychodzą szybciej, niż mogą być obsłużeni, więc kolejka rośnie bez końca i średnie miary nie istnieją. Potrzeba co najmniej ${Math.floor(P.lam / P.mu + 1e-12) + 1} stanowisk (albo szybszej obsługi).</p>`;
  const fm = [];
  if (m === 'mm1') fm.push(`ρ = λ/μ = ${f(P.lam)}/${f(P.mu)} = <b>${f(R.rho)}</b>`, `L = ρ/(1 − ρ) = <b>${f(R.L)}</b>`, `Lq = ρ²/(1 − ρ) = <b>${f(R.Lq)}</b>`, `W = 1/(μ − λ) = <b>${f(R.W)}</b>`, `Wq = ρ/(μ − λ) = <b>${f(R.Wq)}</b>`);
  else if (m === 'mms') fm.push(`a = λ/μ = ${f(R.a)}, ρ = a/s = <b>${f(R.rho)}</b>`, `P₀ = [Σ<sub>n=0</sub><sup>s−1</sup> aⁿ/n! + aˢ/(s!(1 − ρ))]⁻¹ = <b>${f(R.P0)}</b>`, `P(oczekiwania) = aˢ/(s!(1 − ρ))·P₀ = <b>${f(R.Pwait)}</b> (wzór Erlanga C)`,
    `Lq = P(oczekiwania)·ρ/(1 − ρ) = <b>${f(R.Lq)}</b>`, `L = Lq + a = <b>${f(R.L)}</b>`, `Wq = Lq/λ = <b>${f(R.Wq)}</b>, W = Wq + 1/μ = <b>${f(R.W)}</b>`);
  else if (['mg1', 'md1', 'mek1'].includes(m)) fm.push(`ρ = λ/μ = <b>${f(R.rho)}</b>, wariancja czasu obsługi σ² = ${f(R.sig2)}${m === 'mek1' ? ' = 1/(k·μ²)' : m === 'md1' ? ' (czas stały)' : ''}`,
    `Lq = (λ²σ² + ρ²) / (2(1 − ρ)) = (${f(P.lam)}²·${f(R.sig2)} + ${f(R.rho)}²) / (2·(1 − ${f(R.rho)})) = <b>${f(R.Lq)}</b> (wzór Pollaczka-Chinczyna)`, `L = Lq + ρ = <b>${f(R.L)}</b>, Wq = Lq/λ = <b>${f(R.Wq)}</b>, W = Wq + 1/μ = <b>${f(R.W)}</b>`);
  else fm.push(`Proces narodzin i śmierci: Pₙ = P₀·Π (λ<sub>k</sub> / μ<sub>k+1</sub>), gdzie λₙ = ${m === 'mmsn' ? '(N − n)·λ' : 'λ dla n < K, 0 dla n = K'}, μₙ = min(n, s)·μ`, `P₀ = <b>${f(R.P0)}</b>${R.Pblock !== null ? `, P(system pełny) = P<sub>${P.K}</sub> = <b>${f(R.Pblock)}</b>${m === 'mmsk' && P.K === s ? ' (Erlang B)' : ''}` : ''}`,
    `efektywna intensywność napływu λ<sub>ef</sub> = Σ λₙ·Pₙ = <b>${f(R.lamEff)}</b>; W = L/λ<sub>ef</sub>, Wq = Lq/λ<sub>ef</sub>`);
  h += fm.map(x => `<div class="formula">${x}</div>`).join('');
  h += `<div class="tw"><table><tbody><tr><th>Wykorzystanie stanowisk ρ</th><td>${pc(R.util)}</td></tr><tr><th>Prawdopodobieństwo pustego systemu P₀</th><td>${f(R.P0)}</td></tr>` +
    `<tr><th>Średnia liczba klientów w systemie L</th><td><b>${f(R.L)}</b></td></tr><tr><th>Średnia liczba klientów w kolejce Lq</th><td><b>${f(R.Lq)}</b></td></tr>` +
    `<tr><th>Średni czas w systemie W</th><td><b>${f(R.W)}</b> (${f(R.W * 60)} min, jeśli jednostką jest godzina)</td></tr><tr><th>Średni czas oczekiwania w kolejce Wq</th><td><b>${f(R.Wq)}</b> (${f(R.Wq * 60)} min)</td></tr>` +
    `<tr><th>Prawdopodobieństwo, że klient czeka</th><td>${pc(R.Pwait)}</td></tr>` + (R.Pblock !== null && R.Pblock !== undefined ? `<tr><th>Prawdopodobieństwo odrzucenia (system pełny)</th><td>${pc(R.Pblock)}</td></tr><tr><th>Efektywna intensywność napływu λ<sub>ef</sub></th><td>${f(R.lamEff)}</td></tr>` : '') +
    (m === 'mmsn' ? `<tr><th>Efektywna intensywność zgłoszeń λ<sub>ef</sub></th><td>${f(R.lamEff)}</td></tr>` : '') + '</tbody></table></div>';
  h += `<div class="sum"><b>Wynik:</b> średnio <b>${f(R.Lq)}</b> klientów czeka w kolejce, a oczekiwanie trwa średnio <b>${f(R.Wq)}</b> jednostek czasu; stanowiska są zajęte przez ${pc(R.util)} czasu.</div>`;
  h += `<p class="hint">Sprawdzenie (prawo Little'a): L = λ<sub>ef</sub>·W → ${f(R.L)} = ${f(R.lamEff)}·${f(R.W)} = ${f(R.lamEff * R.W)}; Lq = λ<sub>ef</sub>·Wq → ${f(R.Lq)} = ${f(R.lamEff * R.Wq)}.</p>`;
  if (R.pWq && P.t !== null && P.t !== undefined) h += `<div class="formula">P(Wq > ${f(P.t)}) = P(oczekiwania)·e<sup>−(sμ − λ)t</sup> = <b>${pc(R.pWq(P.t))}</b>;&nbsp; P(W > ${f(P.t)}) = <b>${pc(R.pW(P.t))}</b></div>`;
  if (R.Pn) {
    const nShow = Math.min(R.Pn.length, 30); let cum = 0;
    h += '<h4>Rozkład liczby klientów w systemie</h4><div class="tw"><table><thead><tr><th>n</th><th>Pₙ</th><th>P(N ≤ n)</th></tr></thead>' + R.Pn.slice(0, nShow).map((v, n) => { cum += v; return `<tr><td>${n}</td><td>${f(v)}</td><td>${f(cum)}</td></tr>`; }).join('') + '</table></div>' +
      (R.Pn.length > nShow ? `<p class="hint">Pokazano ${nShow} pierwszych stanów.</p>` : '') + VZ.bars(R.Pn.slice(0, nShow).map((_, n) => String(n)), R.Pn.slice(0, nShow), {title: 'Rozkład Pₙ', pct: true, xLabel: 'n – liczba klientów w systemie', cls: R.Pn.slice(0, nShow).map((_, n) => n >= s ? 'b' : '')}) +
      `<p class="hint">Czerwone słupki – stany, w których przychodzący klient musi czekać (n ≥ ${s}).</p>`;
    const nn = Math.min(R.Pn.length - 1, 6), lamN = n => m === 'mmsn' ? `${P.N - n}λ` : 'λ', muN = n => Math.min(n, s) === 1 ? 'μ' : `${Math.min(n, s)}μ`;
    const E = []; for (let n = 0; n < nn; n++) { E.push({a: n, b: n + 1, label: lamN(n), cls: 'c'}); E.push({a: n + 1, b: n, label: muN(n + 1), cls: 'b'}); }
    h += '<h4>Diagram przejść (proces narodzin i śmierci)</h4>' + VZ.stateGraph(Array.from({length: nn + 1}, (_, n) => n === nn && R.Pn.length - 1 > nn ? n + '…' : String(n)), E, {layout: 'line', title: 'Diagram przejść'}) +
      '<p class="hint">Stan = liczba klientów w systemie. Zielone łuki – przyjście klienta, czerwone – zakończenie obsługi. W równowadze przepływ „w prawo" między sąsiednimi stanami równa się przepływowi „w lewo".</p>';
  } else h += '<p class="hint">Dla dowolnego rozkładu obsługi (M/G/1) nie ma prostego wzoru na pełny rozkład Pₙ; znamy P₀ = 1 − ρ i średnie z wzoru Pollaczka-Chinczyna. Rozkład można zbadać w module Symulacja kolejek.</p>';
  if (C) {
    const K = quCost(m, P, C.Cs, C.Cw, C.base, C.Cb);
    h += `<h3>Analiza kosztów – liczba stanowisk</h3><p class="hint">Koszt całkowity = s·C<sub>s</sub> + C<sub>w</sub>·${C.base}${C.Cb ? ' + C<sub>b</sub>·λ·P(odrzucenia)' : ''}. Więcej stanowisk to wyższy koszt obsługi, ale krótsze oczekiwanie.</p><div class="tw"><table><thead><tr><th>s</th><th>${C.base}</th><th>Koszt stanowisk</th><th>Koszt oczekiwania</th>${C.Cb ? '<th>Koszt odrzuceń</th>' : ''}<th>Koszt całkowity</th></tr></thead>` +
      K.rows.map(r => `<tr${r === K.best ? ' class="sel"' : ''}><td>${r.s}</td><td>${f(C.base === 'L' ? r.R.L : r.R.Lq)}</td><td>${f(r.serv)}</td><td>${f(r.wait)}</td>${C.Cb ? `<td>${f(r.lost)}</td>` : ''}<td class="${r === K.best ? 'best' : ''}">${f(r.total)}</td></tr>`).join('') + '</table></div>';
    if (K.best) h += `<div class="sum"><b>Optymalna liczba stanowisk: ${K.best.s}</b>, koszt całkowity ${f(K.best.total)} na jednostkę czasu.</div>` + VZ.line([{name: 'koszt całkowity', pts: K.rows.map(r => [r.s, r.total]), dots: true}, {name: 'koszt stanowisk', pts: K.rows.map(r => [r.s, r.serv]), cls: 'c'}, {name: 'koszt oczekiwania', pts: K.rows.map(r => [r.s, r.wait]), cls: 'b'}], {title: 'Koszty a liczba stanowisk', xLabel: 'liczba stanowisk s', marks: [{x: K.best.s, y: K.best.total, label: 'optimum'}]});
  }
  return h;
}
registerModule({id: 'queue', title: 'Kolejki', init: quInit,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><rect x="18" y="8" width="4" height="8" rx="1"/></svg>',
  html: '<div class="card"><div id="queue-top"></div><div><button id="btn-queue" type="button">Oblicz</button></div><div id="out-queue"></div></div>'});
