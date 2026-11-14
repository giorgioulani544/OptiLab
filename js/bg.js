/* ===== OptiLab – tło: powolna „sieć neuronowa” z pomarańczowymi wyładowaniami (tylko ozdoba, bez wpływu na obliczenia) ===== */
(function () {
  if (typeof document === 'undefined' || !document.body) return;
  const cv = document.createElement('canvas'); cv.id = 'bgnet'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  const cx = cv.getContext('2d'); if (!cx) return;
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let W = 0, H = 0, R = 150, nodes = [], pulses = [], raf = 0, last = 0, nextPulse = 0, builtW = 0, builtH = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function build() {
    size(); builtW = W; builtH = H; R = W < 600 ? 120 : 165;
    const n = Math.max(12, Math.min(64, Math.round(W * H / (W < 600 ? 15000 : 21000))));
    nodes = []; pulses = [];
    for (let i = 0; i < n; i++) nodes.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-1, 1) * 3.2, vy: rnd(-1, 1) * 3.2, r: rnd(1.6, 3.1), glow: 0 });
  }
  function neighbours(i, skip) {
    const a = nodes[i], out = [];
    for (let j = 0; j < nodes.length; j++) { if (j === i || j === skip) continue; const dx = nodes[j].x - a.x, dy = nodes[j].y - a.y; if (dx * dx + dy * dy < R * R) out.push(j); }
    return out;
  }
  function spawn(from, skip, hops) {
    const nb = neighbours(from, skip); if (!nb.length) return;
    pulses.push({ a: from, b: nb[Math.floor(Math.random() * nb.length)], t: 0, hops: hops });
  }
  function draw(dt) {
    cx.clearRect(0, 0, W, H);
    for (const p of nodes) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.glow = Math.max(0, p.glow - dt * 0.7);
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }
    cx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      cx.strokeStyle = 'rgba(150,118,84,' + (0.20 * (1 - Math.sqrt(d2) / R)).toFixed(3) + ')';
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
    }
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k], a = nodes[p.a], b = nodes[p.b], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      p.t += dt * 62 / len;                                   // ok. 62 px/s – spokojnie
      if (len > R * 1.35) { pulses.splice(k, 1); continue; }   // węzły się rozeszły – wyładowanie gaśnie
      const t1 = Math.min(1, p.t), t0 = Math.max(0, t1 - 46 / len);
      const x0 = a.x + (b.x - a.x) * t0, y0 = a.y + (b.y - a.y) * t0, x1 = a.x + (b.x - a.x) * t1, y1 = a.y + (b.y - a.y) * t1;
      const g = cx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(232,137,84,0)'); g.addColorStop(1, 'rgba(232,137,84,.85)');
      cx.strokeStyle = g; cx.lineWidth = 1.8; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); cx.lineWidth = 1;
      const h = cx.createRadialGradient(x1, y1, 0, x1, y1, 9); h.addColorStop(0, 'rgba(240,150,96,.75)'); h.addColorStop(1, 'rgba(240,150,96,0)');
      cx.fillStyle = h; cx.beginPath(); cx.arc(x1, y1, 9, 0, 6.2832); cx.fill();
      if (p.t >= 1) { b.glow = 1; pulses.splice(k, 1); if (p.hops > 0 && Math.random() < 0.72) spawn(p.b, p.a, p.hops - 1); }
    }
    for (const p of nodes) {
      if (p.glow > 0) {
        const h = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16); h.addColorStop(0, 'rgba(238,146,92,' + (0.55 * p.glow).toFixed(3) + ')'); h.addColorStop(1, 'rgba(238,146,92,0)');
        cx.fillStyle = h; cx.beginPath(); cx.arc(p.x, p.y, 16, 0, 6.2832); cx.fill();
      }
      cx.fillStyle = p.glow > 0.05 ? 'rgba(222,128,78,' + (0.45 + 0.5 * p.glow).toFixed(3) + ')' : 'rgba(160,128,94,.42)';
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.2832); cx.fill();
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;                               // najwyżej ok. 30 klatek/s
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (now > nextPulse && pulses.length < (W < 600 ? 2 : 4)) { spawn(Math.floor(Math.random() * nodes.length), -1, 4); nextPulse = now + rnd(1400, 3200); }
    draw(dt);
  }
  function start() { cancelAnimationFrame(raf); raf = 0; if (reduce.matches || document.hidden) { draw(0); return; } last = performance.now(); raf = requestAnimationFrame(frame); }
  build(); start();
  let rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(function () {
      // pasek adresu na telefonie zmienia wysokość okna – wtedy tylko dopasowujemy płótno, bez budowania sieci od nowa
      if (window.innerWidth !== builtW || Math.abs(window.innerHeight - builtH) > 160) build(); else size();
      start();
    }, 150);
  });
  document.addEventListener('visibilitychange', start);
  if (reduce.addEventListener) reduce.addEventListener('change', start);
})();
