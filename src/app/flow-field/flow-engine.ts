import { FlowSettings } from './flow-settings';
import { curl, noise3 } from './noise';

interface TimedPoint { x: number; y: number; t: number }
interface Pulse extends TimedPoint { a: number }
export interface QuietRect { l: number; t: number; r: number; b: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; max: number; life: number;
  seed: number; depth: number; tint: boolean; hist: number[]; focus: number;
  dir: number; tx: number; ty: number;
}
type Palette = { white: string; light: string; mid: string };

function simulation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, initial: FlowSettings) {
  let state = { ...initial, contact: false };
  let W = 0, H = 0, quietRect: QuietRect | null = null;
  const TAU = Math.PI * 2;

  function quietAt(x: number, y: number) {
    if (!state.quiet || !quietRect) return 1;
    const dx = Math.max(quietRect.l - x, 0, x - quietRect.r);
    const dy = Math.max(quietRect.t - y, 0, y - quietRect.b);
    const k = Math.min(1, Math.hypot(dx, dy) / 140);
    return 0.18 + 0.82 * k * k * (3 - 2 * k);
  }

  // ---------- Pointer ----------
  const ptr = { x: -9999, y: -9999, str: 0, target: 0, last: 0 };

  // Recent cursor positions, so a reveal can linger along the path the mouse took.
  const MEMORY_MS = 1800, trailPts: TimedPoint[] = [];
  function pointerMove(x: number, y: number, now: number) {
    ptr.x = x; ptr.y = y; ptr.last = now; ptr.target = 1;
    if (!state.memory) return;
    const prev = trailPts[trailPts.length - 1];
    if (!prev || Math.hypot(prev.x - ptr.x, prev.y - ptr.y) > 14) trailPts.push({ x, y, t: now });
  }
  function pointerLeave() { ptr.target = 0; }
  const ZERO = [0, 0];
  const smooth = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  function memoryWeight(pt: TimedPoint, now: number) { const a = 1 - (now - pt.t) / MEMORY_MS; return a > 0 ? a * a * 0.85 : 0; }

  // 0..1: how strongly a point is "lit" by the cursor now, or by where it recently passed.
  function revealAt(x: number, y: number, now: number, R: number) {
    let v = smooth(1 - Math.hypot(x - ptr.x, y - ptr.y) / R) * ptr.str;
    if (state.memory) {
      const r2 = R * 0.75;
      for (const pt of trailPts) {
        const w = memoryWeight(pt, now);
        if (w <= v) continue;
        const dx = x - pt.x, dy = y - pt.y;
        if (dx * dx + dy * dy > r2 * r2) continue;
        v = Math.max(v, smooth(1 - Math.hypot(dx, dy) / r2) * w);
      }
    }
    return v;
  }

  function pointerForce(x: number, y: number) {
    if (state.cursor === 'none' || ptr.str < 0.01) return ZERO;
    const dx = x - ptr.x, dy = y - ptr.y, d2 = dx * dx + dy * dy, R = state.radius;
    if (d2 > R * R) return ZERO;
    const d = Math.sqrt(d2) || 1, f = 1 - d / R, k = f * f * ptr.str;
    if (state.cursor === 'wake') return [dx / d * k * 1.4, dy / d * k * 1.4];
    if (state.cursor === 'attract') return [-dx / d * k * 0.7 - dy / d * k * 0.5, -dy / d * k * 0.7 + dx / d * k * 0.5];
    return [-dy / d * k * 1.6 + dx / d * k * 0.25, dx / d * k * 1.6 + dy / d * k * 0.25];
  }

  // Circuit particles only steer at junctions, so they need a stronger, wider-reaching bias to show the cursor.
  function circuitBias(x: number, y: number) {
    if (state.cursor === 'none' || ptr.str < 0.01) return ZERO;
    const dx = x - ptr.x, dy = y - ptr.y, R = state.radius * 1.4, d = Math.hypot(dx, dy) || 1;
    if (d > R) return ZERO;
    const w = (1 - d / R) * ptr.str * 3.2;
    if (state.cursor === 'wake') return [dx / d * w, dy / d * w];
    if (state.cursor === 'attract') return d < GRID * 0.75 ? ZERO : [-dx / d * w, -dy / d * w];
    return [-dy / d * w, dx / d * w];
  }

  // ---------- Motion fields (pixels per frame at speed 1) ----------
  const eddies = Array.from({ length: 5 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: 0.16 + Math.random() * 0.12,
    spin: (i % 2 ? 1 : -1) * (0.9 + Math.random() * 0.5),
    vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006,
  }));
  function field(x: number, y: number, t: number) {
    switch (state.motion) {
      case 'curl': {
        const c = curl(x, y, t * 0.035, 0.0015);
        return [c[0] * 0.38 + 0.06, c[1] * 0.38];
      }
      case 'laminar': {
        const a = noise3(x * 0.0011, y * 0.0024, t * 0.045) * 0.5 + 0.07 * Math.sin(t * 0.18 + x * 0.002);
        const m = 0.55 + 0.22 * noise3(x * 0.002 + 71, y * 0.002, t * 0.05);
        return [Math.cos(a) * m, Math.sin(a) * m];
      }
      case 'eddies': {
        const c = curl(x, y, t * 0.02, 0.002), S = Math.max(W, H);
        let vx = c[0] * 0.1 + 0.05, vy = c[1] * 0.1;
        for (const e of eddies) {
          const dx = x - e.x * W, dy = y - e.y * H, r = e.r * S;
          const gk = Math.exp(-(dx * dx + dy * dy) / (r * r)) * e.spin * 1.3 / r;
          vx += -dy * gk; vy += dx * gk;
        }
        return [vx, vy];
      }
      case 'tide': {
        const n = noise3(x * 0.001, y * 0.001, t * 0.02);
        const sway = Math.sin(t * 0.32 + y * 0.0035 + n * 1.6);
        const c = curl(x, y, t * 0.03, 0.0018);
        return [sway * 0.6 + c[0] * 0.12, 0.1 * Math.cos(t * 0.21 + x * 0.003) + c[1] * 0.12];
      }
      case 'thermal':
        return [0.32 * noise3(x * 0.0028, y * 0.0028, t * 0.07),
                -(0.32 + 0.14 * noise3(x * 0.002 + 30, y * 0.002, t * 0.05))];
    }
    return ZERO;
  }

  // Circuit: travel along a grid and pick a turn at each junction.
  const GRID = 44, DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function initCircuit(p: Particle) {
    p.x = Math.round(p.x / GRID) * GRID; p.y = Math.round(p.y / GRID) * GRID;
    p.dir = Math.floor(Math.random() * 4);
    p.tx = p.x + DIRS[p.dir][0] * GRID; p.ty = p.y + DIRS[p.dir][1] * GRID;
  }
  function chooseDir(p: Particle, t: number, now: number) {
    let [fx, fy] = curl(p.x, p.y, t * 0.03, 0.0012);
    fx += 0.15;
    const pf = circuitBias(p.x, p.y); fx += pf[0]; fy += pf[1];
    if (state.glow && p.life > 0 && pulses.length < 400) {
      const lit = state.spot || state.grid ? revealAt(p.x, p.y, now, highlightRadius()) : 0;
      pulses.push({ x: p.x, y: p.y, t: now, a: (0.35 + 0.65 * lit) * env(p) });
    }
    const rev = (p.dir + 2) % 4;
    let best = p.dir, bestScore = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (d === rev) continue;
      const sc = DIRS[d][0] * fx + DIRS[d][1] * fy + (d === p.dir ? 0.15 : 0) + (Math.random() - 0.5) * 0.6;
      if (sc > bestScore) { bestScore = sc; best = d; }
    }
    p.dir = best; p.tx = p.x + DIRS[best][0] * GRID; p.ty = p.y + DIRS[best][1] * GRID;
  }
  function circuitStep(p: Particle, stepLen: number, t: number, now: number) {
    let rem = stepLen;
    for (let guard = 0; rem > 0 && guard < 4; guard++) {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.abs(dx) + Math.abs(dy);
      if (d > rem) { p.x += Math.sign(dx) * rem; p.y += Math.sign(dy) * rem; rem = 0; }
      else { p.x = p.tx; p.y = p.ty; rem -= d; chooseDir(p, t, now); }
    }
    p.vx = DIRS[p.dir][0] * stepLen; p.vy = DIRS[p.dir][1] * stepLen;
  }

  const PULSE_MS = 900, pulses: Pulse[] = [];

  // ---------- Particles ----------
  const BASE_COUNT = { motes: 900, dashes: 650, trails: 420, bokeh: 80, nodes: 85 };
  let parts: Particle[] = [], simT = 0, introStart = 0;
  function targetCount() {
    const area = Math.min(1.6, (W * H) / (1440 * 900));
    return Math.max(10, Math.round(BASE_COUNT[state.particle] * area * (state.density / 50)));
  }
  function spawn(p: Particle, initial: boolean) {
    p.x = Math.random() * W; p.y = Math.random() * H; p.vx = 0; p.vy = 0;
    const longLived = state.particle === 'bokeh' || state.particle === 'nodes';
    p.max = longLived ? 900 + Math.random() * 1200 : 360 + Math.random() * 600;
    p.life = initial ? Math.random() * p.max : 0;
    p.seed = Math.random(); p.depth = Math.random(); p.tint = Math.random() < 0.35;
    p.hist = []; p.focus = 0;
    if (state.motion === 'circuit') initCircuit(p);
    return p;
  }
  function syncCount() {
    const n = targetCount();
    while (parts.length < n) parts.push(spawn({} as Particle, true));
    if (parts.length > n) parts.length = n;
  }
  function respawnAll(now: number) {
    parts = [];
    syncCount();
    replayIntro(now);
  }
  function replayIntro(now: number) {
    introStart = now;
    for (const p of parts) {
      spawn(p, false);
      p.life = -Math.random() * 120;  // staggered fade-in over ~2 seconds
    }
  }
  // Radius that counts as "inside the cursor effect" for the highlight.
  function highlightRadius() { return state.grid ? state.gridRadius : state.spot ? state.spotRadius : state.radius; }
  const hiAt = (p: Particle) => 1 + 2.5 * p.focus * (state.highlight / 100);
  const env = (p: Particle) => (p.life < 0 ? 0 : Math.min(1, p.life / 70, (p.max - p.life) / 70));
  const trailPoints = () => Math.round(8 + state.trail * 1.1);

  function step(dt: number, nowMs: number) {
    const s = Math.pow(state.speed / 50, 1.2);
    simT += (dt / 60) * s;
    if (nowMs - ptr.last > 8000) ptr.target = 0;  // fade out after the mouse rests a while
    ptr.str += (ptr.target - ptr.str) * Math.min(1, 0.05 * dt);
    if (!state.memory) trailPts.length = 0;
    while (trailPts.length && nowMs - trailPts[0].t > MEMORY_MS) trailPts.shift();
    while (pulses.length && nowMs - pulses[0].t > PULSE_MS) pulses.shift();
    for (const e of eddies) {
      e.x += e.vx * dt * s * 0.1; e.y += e.vy * dt * s * 0.1;
      if (e.x < -0.2) e.x = 1.2; if (e.x > 1.2) e.x = -0.2;
      if (e.y < -0.2) e.y = 1.2; if (e.y > 1.2) e.y = -0.2;
    }
    const inertia = 1 - Math.pow(0.9, dt);
    const keepHist = state.particle === 'trails', maxPts = trailPoints() * 2;
    const m = state.particle === 'bokeh' ? 40 : 12;
    for (const p of parts) {
      p.life += dt;
      if (p.life > p.max) { spawn(p, false); continue; }
      if (p.life < 0) continue;
      if (state.motion === 'circuit') {
        circuitStep(p, 0.7 * s * dt, simT, nowMs);
        if (p.x < -m || p.x > W + m || p.y < -m || p.y > H + m) { spawn(p, false); continue; }
      } else {
        let [vx, vy] = field(p.x, p.y, simT);
        if (state.particle === 'bokeh') { const par = 0.3 + 0.7 * p.depth; vx *= par; vy *= par; }
        if (state.particle === 'nodes') { vx *= 0.55; vy *= 0.55; }
        const pf = pointerForce(p.x, p.y);
        vx = vx * s + pf[0]; vy = vy * s + pf[1];
        p.vx += (vx - p.vx) * inertia; p.vy += (vy - p.vy) * inertia;
        p.x += p.vx * dt; p.y += p.vy * dt;
        let wrapped = false;
        if (p.x < -m) { p.x += W + 2 * m; wrapped = true; } else if (p.x > W + m) { p.x -= W + 2 * m; wrapped = true; }
        if (p.y < -m) { p.y += H + 2 * m; wrapped = true; } else if (p.y > H + m) { p.y -= H + 2 * m; wrapped = true; }
        if (wrapped) p.hist.length = 0;
      }
      if (state.highlight > 0) {
        const hr = highlightRadius();
        const target = smooth(1 - Math.hypot(p.x - ptr.x, p.y - ptr.y) / hr) * ptr.str;
        p.focus += (target - p.focus) * Math.min(1, 0.08 * dt);
      } else p.focus = 0;
      if (keepHist) {
        p.hist.push(p.x, p.y);
        // Trails grow up to 3.5x inside the cursor radius, and shrink back gradually after leaving it.
        const cap = Math.round(maxPts * (1 + 2.5 * p.focus * (state.highlight / 100)) / 2) * 2;
        if (p.hist.length > cap) p.hist.splice(0, Math.min(p.hist.length - cap, 6));
      }
    }
  }

  // ---------- Rendering ----------
  function palette() {
    const blue = state.contact;
    const light = blue ? '205,218,255' : '176,240,228';
    const mid = blue ? '160,185,245' : '120,214,206';
    return { white: '255,255,255', light, mid };
  }
  function colorFor(p: Particle, pal: Palette) {
    if (state.color === 'white') return pal.white;
    if (state.color === 'seafoam') return pal.light;
    return p.tint ? pal.white : pal.mid;
  }
  const sprites = new Map<string, HTMLCanvasElement>();
  function sprite(rgb: string) {
    if (sprites.has(rgb)) return sprites.get(rgb)!;
    const c = canvas.ownerDocument.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.35, `rgba(${rgb},0.55)`); grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    sprites.set(rgb, c);
    return c;
  }

  // Grid reveal: a pre-drawn grid, masked each frame by soft circles at the cursor and its recent path.
  const gridCanvas = canvas.ownerDocument.createElement('canvas'), maskCanvas = canvas.ownerDocument.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d')!;
  let gridKey = '';
  const maskSprite = (() => {
    const c = canvas.ownerDocument.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!, grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, `rgba(255,255,255,${smooth(1 - i / 10)})`);
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return c;
  })();
  function buildGrid(rgb: string) {
    const dpr = canvas.width / W, key = `${W}x${H}@${dpr}/${rgb}`;
    if (key === gridKey) return;
    gridKey = key;
    for (const c of [gridCanvas, maskCanvas]) { c.width = canvas.width; c.height = canvas.height; }
    const g = gridCanvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = `rgba(${rgb},0.24)`; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += GRID) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += GRID) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
    g.stroke();
    g.fillStyle = `rgba(${rgb},0.85)`;
    for (let x = 0; x <= W; x += GRID) for (let y = 0; y <= H; y += GRID) { g.beginPath(); g.arc(x + 0.5, y + 0.5, 1.4, 0, TAU); g.fill(); }
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function renderGrid(o: number, pal: Palette, now: number) {
    if (!state.grid) return;
    buildGrid(pal.light);
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.clearRect(0, 0, W, H);
    maskCtx.globalCompositeOperation = 'lighter';
    const R = state.gridRadius;
    if (ptr.str > 0.01) { maskCtx.globalAlpha = ptr.str; maskCtx.drawImage(maskSprite, ptr.x - R, ptr.y - R, R * 2, R * 2); }
    if (state.memory) {
      const r = R * 0.75;
      for (const pt of trailPts) {
        const w = memoryWeight(pt, now);
        if (w < 0.02) continue;
        maskCtx.globalAlpha = w * 0.35;
        maskCtx.drawImage(maskSprite, pt.x - r, pt.y - r, r * 2, r * 2);
      }
    }
    maskCtx.globalAlpha = 1;
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.setTransform(1, 0, 0, 1, 0, 0);
    maskCtx.drawImage(gridCanvas, 0, 0);
    maskCtx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
    ctx.globalAlpha = Math.min(1, o * (state.gridOpacity / 100) * 1.5);
    ctx.drawImage(maskCanvas, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  function renderPulses(o: number, pal: Palette, now: number) {
    if (!state.glow) return;
    for (const q of pulses) {
      const k = (now - q.t) / PULSE_MS;
      if (k >= 1) continue;
      const a = q.a * (1 - k) * (1 - k) * o * 0.8 * quietAt(q.x, q.y);
      if (a < 0.01) continue;
      ctx.strokeStyle = `rgba(${pal.white},${a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, 2 + 7 * k, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${pal.white},${a})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, TAU); ctx.fill();
    }
  }
  // Spotlight: dim everything a little while the cursor is active, and brighten what it lights.
  let spotNow = 0;
  function spotAt(x: number, y: number) {
    if (!state.spot) return 1;
    return 1 - 0.55 * ptr.str + 3.2 * revealAt(x, y, spotNow, state.spotRadius);
  }

  function render(now: number, still = false) {
    // A hidden or collapsed viewport has no pixels to draw, and drawImage throws on 0-size canvases.
    if (canvas.width === 0 || canvas.height === 0) return;
    ctx.clearRect(0, 0, W, H);
    spotNow = now;
    const fade = Math.min(1, (now - introStart) / 2500);
    const o = (state.opacity / 50) * (still ? 1 : fade * fade * (3 - 2 * fade));
    const pal = palette();
    const type = state.particle;
    renderGrid(o, pal, now);
    drawParticles(o, pal, type);
    renderPulses(o, pal, now);
  }
  function drawParticles(o: number, pal: Palette, type: FlowSettings['particle']) {

    if (type === 'motes') {
      for (const p of parts) {
        const a = env(p) * quietAt(p.x, p.y) * spotAt(p.x, p.y) * hiAt(p) * o * (0.3 + 0.4 * p.seed);
        if (a < 0.01) continue;
        ctx.fillStyle = `rgba(${colorFor(p, pal)},${Math.min(1, a)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.7 + p.seed * 0.9, 0, TAU); ctx.fill();
      }
    } else if (type === 'dashes') {
      ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      for (const p of parts) {
        const a = env(p) * quietAt(p.x, p.y) * spotAt(p.x, p.y) * hiAt(p) * o * (0.25 + 0.35 * p.seed);
        if (a < 0.01) continue;
        const k = 12 + 6 * p.seed;
        ctx.strokeStyle = `rgba(${colorFor(p, pal)},${Math.min(1, a)})`;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * k, p.y - p.vy * k); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    } else if (type === 'trails') {
      ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const B = 4;
      for (const p of parts) {
        const h = p.hist, n = h.length / 2;
        if (n < 2) continue;
        const base = env(p) * quietAt(p.x, p.y) * spotAt(p.x, p.y) * hiAt(p) * o * (0.25 + 0.3 * p.seed);
        if (base < 0.01) continue;
        const rgb = colorFor(p, pal), f = p.focus * (state.highlight / 100);
        ctx.lineWidth = 1 + 0.8 * f;
        for (let b = 0; b < B; b++) {
          const i0 = Math.floor((b * (n - 1)) / B), i1 = Math.floor(((b + 1) * (n - 1)) / B);
          if (i1 <= i0) continue;
          ctx.strokeStyle = `rgba(${rgb},${Math.min(1, (base * (b + 1)) / B)})`;
          ctx.beginPath(); ctx.moveTo(h[i0 * 2], h[i0 * 2 + 1]);
          for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(h[i * 2], h[i * 2 + 1]);
          ctx.stroke();
        }
        if (f > 0.05) {
          ctx.fillStyle = `rgba(${pal.white},${Math.min(1, f * 0.9 * env(p))})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 + 0.9 * f, 0, TAU); ctx.fill();
        }
      }
      ctx.lineWidth = 1;
    } else if (type === 'bokeh') {
      for (const p of parts) {
        const a = env(p) * quietAt(p.x, p.y) * spotAt(p.x, p.y) * hiAt(p) * o * (0.42 - 0.26 * p.depth);
        if (a < 0.01) continue;
        const r = 2 + 16 * p.depth * p.depth;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(sprite(colorFor(p, pal)), p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    } else if (type === 'nodes') {
      const L = 125, L2 = L * L, n = parts.length, alpha = new Float32Array(n);
      for (let i = 0; i < n; i++) alpha[i] = env(parts[i]) * quietAt(parts[i].x, parts[i].y) * spotAt(parts[i].x, parts[i].y) * hiAt(parts[i]) * o;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < n; i++) {
        if (alpha[i] < 0.01) continue;
        const a = parts[i];
        for (let j = i + 1; j < n; j++) {
          const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 > L2) continue;
          const la = (1 - Math.sqrt(d2) / L) * Math.min(alpha[i], alpha[j]) * 0.45;
          if (la < 0.01) continue;
          ctx.strokeStyle = `rgba(${colorFor(a, pal)},${la})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (let i = 0; i < n; i++) {
        if (alpha[i] < 0.01) continue;
        ctx.fillStyle = `rgba(${colorFor(parts[i], pal)},${Math.min(1, alpha[i] * 0.7)})`;
        ctx.beginPath(); ctx.arc(parts[i].x, parts[i].y, 1.6, 0, TAU); ctx.fill();
      }
    }
  }


  return {
    setSettings(settings: FlowSettings, now = spotNow) {
      const respawn = settings.particle !== state.particle || settings.motion !== state.motion;
      const densityChanged = settings.density !== state.density;
      state = { ...settings, contact: state.contact };
      if (respawn) respawnAll(now);
      else if (densityChanged) syncCount();
    },
    setContact(contact: boolean) { state.contact = contact; },
    setQuietRect(rect: QuietRect | null) { quietRect = rect; },
    resize(w: number, h: number, dpr: number) {
      W = w; H = h; dpr = Math.min(dpr || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncCount();
    },
    pointerMove, pointerLeave, replayIntro, step, render,
    drawStill(now: number) {
      for (const p of parts) if (p.life < 0) p.life = Math.random() * p.max;
      for (let i = 0; i < 240; i++) step(1, now);
      render(now, true);
    },
    get particleCount() { return parts.length; },
  };
}

/** Framework-free port of the tuned mockup. Times are milliseconds from the caller. */
export class FlowEngine {
  private constructor(private readonly engine: ReturnType<typeof simulation>) {}

  static create(canvas: HTMLCanvasElement, settings: FlowSettings): FlowEngine | null {
    const ctx = canvas.getContext('2d');
    return ctx ? new FlowEngine(simulation(canvas, ctx, settings)) : null;
  }
  setSettings(settings: FlowSettings, now?: number) { this.engine.setSettings(settings, now); }
  setContact(contact: boolean) { this.engine.setContact(contact); }
  setQuietRect(rect: QuietRect | null) { this.engine.setQuietRect(rect); }
  resize(w: number, h: number, dpr: number) { this.engine.resize(w, h, dpr); }
  pointerMove(x: number, y: number, now: number) { this.engine.pointerMove(x, y, now); }
  pointerLeave() { this.engine.pointerLeave(); }
  replayIntro(now: number) { this.engine.replayIntro(now); }
  step(dt: number, now: number) { this.engine.step(dt, now); }
  render(now: number) { this.engine.render(now); }
  drawStill(now: number) { this.engine.drawStill(now); }
  get particleCount() { return this.engine.particleCount; }
}
