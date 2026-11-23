import { createPortal } from './portal.js?v=4';
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const canvas = $('view');
const portal = createPortal(canvas, {}, { maxDpr: 2, pauseOffscreen: false });
const DEF = portal.params;
const STORE = 'warp-portal.v3';
const LIGHT_KEYS = ['exposure', 'contrast', 'blackPoint', 'highlights', 'glowAmount', 'glowSize', 'bloom', 'bloomSize'];
const OUT_DEF = { w: 1920, h: 1080, fps: 60, dur: 12, loop: false, quality: 'high' };
let out = { ...OUT_DEF };

// ---------- presets ----------
const PRESETS = [
  { name: 'Wonder', p: {} },
  { name: 'Hyper', p: { speed: 2.4, length: 1.5, density: 1.6, shimmer: 0.35, rotation: 0.04 } },
  // colour roles: cool, deep, hot, light, warm (same order as the Wonder palette)
  { name: 'Nebula', p: { colors: ['#00b4ff', '#3d6bff', '#8a4dff', '#c3a6ff', '#5ef0ff'], background: '#020a2a', glow: '#1d3b96' } },
  { name: 'Aurora', p: { colors: ['#00c2ff', '#5b4bff', '#00ffa3', '#b8fff0', '#7dffcf'], background: '#020f1f', glow: '#0a4a5a' } },
  { name: 'Ember', p: { colors: ['#ff3d00', '#b0122e', '#ff7a1a', '#ffd9a8', '#ffb36b'], background: '#170309', glow: '#7a1a24' } },
  { name: 'Sunset', p: { colors: ['#a64dff', '#6a3dff', '#ff5e7e', '#ffc2a1', '#ff9a5a'], background: '#1a0a33', glow: '#7a2a6a' } },
  { name: 'Acid', p: { colors: ['#00ffd5', '#7a5cff', '#ff00e5', '#f4ff8a', '#c6ff00'], background: '#06060f', glow: '#2a1450' } },
  { name: 'Mono', p: { colors: ['#bfc6ff', '#7f88ff', '#ffffff', '#e6e9ff', '#9aa3c8'], background: '#03040a', glow: '#1a1d3a', saturation: 1 } },
];
const COLOR_KEYS = ['colors', 'background', 'glow', 'hue', 'saturation'];

// ---------- persistence ----------
function sanitize(p) {
  const o = {};
  for (const k in DEF) {
    if (!(k in p)) continue;
    if (k === 'colors') { if (Array.isArray(p.colors) && p.colors.length === 5) o.colors = p.colors.map(String); }
    else if (typeof DEF[k] === typeof p[k]) o[k] = p[k];
  }
  return o;
}
try {
  const s = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (s && s.params) portal.set(sanitize(s.params));
  if (s && s.out) out = { ...OUT_DEF, ...s.out };
} catch (e) { /* private mode etc. */ }
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify({ params: portal.params, out })); } catch (e) {} }, 250);
}
function applyLoop() { portal.set({ loop: out.loop ? out.dur : 0 }); }
applyLoop();
portal.seek(0);

// ---------- toast ----------
let toastT = 0;
function toast(msg, err) {
  const t = $('toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------- panel ----------
const panel = $('panel');
const syncers = [];
function sync() { const p = portal.params; syncers.forEach((f) => f(p)); markPreset(p); }
function changed() { sync(); save(); }

function section(title, tools) {
  const s = el('section'); const h = el('div', 'sec-h'); h.append(el('h3', '', title));
  if (tools) h.append(tools);
  s.append(h); panel.append(s); return s;
}
function fmt(v, step) { const d = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3; return (+v).toFixed(d); }
function slider(parent, key, label, min, max, step, opts = {}) {
  const row = el('div', 'row');
  const lab = el('label', '', label); lab.title = 'Double-click to reset';
  const inp = document.createElement('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step;
  const val = el('span', 'val');
  const paint = (v) => {
    inp.style.setProperty('--p', ((v - min) / (max - min) * 100) + '%');
    val.textContent = opts.show ? opts.show(v) : fmt(v, step);
  };
  const get = opts.get || ((p) => p[key]);
  const setv = opts.set || ((v) => portal.set({ [key]: v }));
  inp.addEventListener('input', () => { setv(+inp.value); paint(+inp.value); save(); if (opts.after) opts.after(); });
  lab.addEventListener('dblclick', () => { setv(opts.def != null ? opts.def : DEF[key]); changed(); if (opts.after) opts.after(); });
  syncers.push((p) => { const v = get(p); inp.value = v; paint(v); });
  row.append(lab, inp, val); parent.append(row);
  return row;
}
function colorWell(parent, get, set, title) {
  const w = el('button', 'well'); w.title = title;
  const apply = (v) => { set(v); w.style.background = v; save(); markPreset(portal.params); };
  w.addEventListener('click', (e) => { e.stopPropagation(); picker.open(w, get(portal.params), apply, title); });
  syncers.push((p) => { w.style.background = get(p); });
  parent.append(w); return w;
}

// ---------- colour picker (replaces the native one) ----------
const picker = (() => {
  const QUICK = ['#ffffff', '#ff38cd', '#ff81a5', '#ff3d00', '#ff9a1a', '#ffe14d', '#c6ff00', '#00ffa3', '#00e5ff', '#1a55ff', '#6f3fff', '#a64dff', '#eda3ff', '#7737bb', '#00003b', '#000000'];
  const pop = el('div', 'cpick'); pop.hidden = true;
  pop.innerHTML = `
    <div class="cp-sv"><div class="cp-knob"></div></div>
    <div class="cp-hue"><div class="cp-hknob"></div></div>
    <div class="cp-row"><div class="cp-cmp"><i class="cp-old" title="Back to the colour you started with"></i><i class="cp-new"></i></div>
      <input class="cp-hex" spellcheck="false" maxlength="7"><button class="cp-drop" title="Pick a colour from the screen"><svg class="i" viewBox="0 0 16 16"><path d="M10.5 2.5l3 3M12 4l-7.5 7.5-2 .5.5-2L10.5 2.5M8.5 4.5l3 3"/></svg></button></div>
    <div class="cp-lbl">In use</div><div class="cp-sw cp-used"></div>
    <div class="cp-lbl">Quick</div><div class="cp-sw cp-quick"></div>`;
  document.body.append(pop);
  const q = (c) => pop.querySelector(c);
  const sv = q('.cp-sv'), knob = q('.cp-knob'), hue = q('.cp-hue'), hk = q('.cp-hknob'), hex = q('.cp-hex');
  const oldI = q('.cp-old'), newI = q('.cp-new'), used = q('.cp-used'), quick = q('.cp-quick'), drop = q('.cp-drop');
  if (!window.EyeDropper) drop.hidden = true;
  let H = 0, S = 0, V = 0, onSet = null, start = '#000000', anchor = null;

  const toHex = (h, s, v) => {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  };
  const fromHex = (x) => {
    const n = parseInt(x.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx];
  };
  const norm = (x) => {
    x = String(x).trim().replace(/^#?/, '#').toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(x)) x = '#' + x.slice(1).split('').map((c) => c + c).join('');
    return /^#[0-9a-f]{6}$/.test(x) ? x : null;
  };
  function paint(skipHex) {
    const c = toHex(H, S, V);
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${toHex(H, 1, 1)})`;
    knob.style.left = S * 100 + '%'; knob.style.top = (1 - V) * 100 + '%'; knob.style.background = c;
    hk.style.left = H / 360 * 100 + '%'; hk.style.background = toHex(H, 1, 1);
    newI.style.background = c;
    if (!skipHex) hex.value = c;
    return c;
  }
  function commit(skipHex) { const c = paint(skipHex); if (onSet) onSet(c); paintUsed(); }
  function setHex(x, skipHex) {
    const c = norm(x); if (!c) return;
    const [h, s, v] = fromHex(c);
    if (s > 0 && v > 0) H = h; S = s; V = v;
    commit(skipHex);
  }
  function chip(parent, c) {
    const b = el('button'); b.style.background = c; b.title = c;
    b.addEventListener('click', () => setHex(c)); parent.append(b);
  }
  function paintUsed() {
    used.innerHTML = '';
    const p = portal.params;
    [...new Set([...p.colors, p.background, p.glow])].forEach((c) => chip(used, c));
  }
  QUICK.forEach((c) => chip(quick, c));

  function drag(area, fn) {
    area.addEventListener('pointerdown', (e) => {
      e.preventDefault(); area.setPointerCapture(e.pointerId);
      const move = (ev) => { const r = area.getBoundingClientRect(); fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))); commit(); };
      move(e);
      const up = () => { area.removeEventListener('pointermove', move); area.removeEventListener('pointerup', up); area.removeEventListener('pointercancel', up); };
      area.addEventListener('pointermove', move); area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up);
    });
  }
  drag(sv, (x, y) => { S = x; V = 1 - y; });
  drag(hue, (x) => { H = Math.min(359.9, x * 360); });
  hex.addEventListener('input', () => setHex(hex.value, true));
  hex.addEventListener('blur', () => paint());
  hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') { setHex(hex.value); close(); } });
  oldI.addEventListener('click', () => setHex(start));
  drop.addEventListener('click', async () => {
    try { const r = await new EyeDropper().open(); setHex(r.sRGBHex); } catch (e) { /* cancelled */ }
  });

  function place() {
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2, y = r.bottom + 8;
    if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 8);
    x = Math.min(innerWidth - pw - 8, Math.max(8, x));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function open(a, value, set, title) {
    if (!pop.hidden && anchor === a) return close();
    anchor = a; onSet = set; start = norm(value) || '#000000';
    document.querySelectorAll('.well.open').forEach((b) => b.classList.remove('open'));
    a.classList.add('open');
    oldI.style.background = start;
    const [h, s, v] = fromHex(start); H = h; S = s; V = v;
    paint(); paintUsed();
    pop.hidden = false; place();
  }
  function close() { pop.hidden = true; if (anchor) anchor.classList.remove('open'); anchor = null; onSet = null; }
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== anchor) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); close(); } }, true);
  addEventListener('resize', () => { if (!pop.hidden) place(); });
  document.addEventListener('scroll', () => { if (!pop.hidden) place(); }, true);
  return { open, close };
})();

function seg(parent, items, get, set) {
  const s = el('div', 'seg');
  const bs = items.map(([v, label]) => {
    const b = el('button', '', label); b.addEventListener('click', () => { set(v); paintSeg(); save(); }); s.append(b); return [v, b];
  });
  const paintSeg = () => bs.forEach(([v, b]) => b.classList.toggle('on', get() === v));
  syncers.push(paintSeg); parent.append(s); return s;
}
function iconBtn(svg, title, onClick) {
  const b = el('button', 'icon-btn'); b.title = title; b.innerHTML = svg; b.addEventListener('click', onClick); return b;
}
const ICON_RESET = '<svg class="i" viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3"/></svg>';

// Presets
{
  const s = section('Look', iconBtn(ICON_RESET, 'Reset everything to the default look', () => {
    portal.set(JSON.parse(JSON.stringify(DEF))); applyLoop(); portal.seek(0); changed(); toast('Reset to default');
  }));
  const grid = el('div'); grid.id = 'presets'; s.append(grid);
  PRESETS.forEach((pr) => {
    const p = { ...DEF, ...pr.p };
    const b = el('button', 'preset'); b.title = pr.name;
    const i = el('i');
    const c = p.colors;
    i.style.background = `radial-gradient(circle, ${p.glow} 0, transparent 38%), conic-gradient(from 15deg, ${c[0]}, ${p.background} 9%, ${c[2]} 17%, ${c[3]} 24%, ${p.background} 33%, ${c[1]} 44%, ${c[4]} 52%, ${p.background} 62%, ${c[2]} 71%, ${p.background} 80%, ${c[0]} 90%, ${c[3]})`;
    b.append(i, el('span', '', pr.name));
    b.addEventListener('click', () => {
      // a preset sets the colours (and its own motion keys); everything else stays as you tuned it
      const patch = {};
      COLOR_KEYS.forEach((k) => { patch[k] = JSON.parse(JSON.stringify(DEF[k])); });
      Object.assign(patch, JSON.parse(JSON.stringify(pr.p)));
      if (pr.name === 'Wonder') Object.assign(patch, JSON.parse(JSON.stringify(DEF)), { seed: portal.params.seed, centerX: portal.params.centerX, centerY: portal.params.centerY });
      portal.set(patch); applyLoop(); changed();
    });
    b._p = pr; grid.append(b);
  });
}
// a preset is lit when its colours match, plus its own motion keys (Wonder: all motion keys at default)
const MOTION_KEYS = [...new Set(PRESETS.flatMap((pr) => Object.keys(pr.p).filter((k) => !COLOR_KEYS.includes(k))))];
function markPreset(p) {
  document.querySelectorAll('.preset').forEach((b) => {
    const pr = b._p, want = { ...DEF, ...pr.p };
    const own = Object.keys(pr.p).filter((k) => !COLOR_KEYS.includes(k));
    const keys = COLOR_KEYS.concat(pr.name === 'Wonder' ? MOTION_KEYS : own);
    b.classList.toggle('on', keys.every((k) => JSON.stringify(want[k]) === JSON.stringify(p[k])));
  });
}

// Colours
{
  const s = section('Color');
  const grid = el('div', 'swrow');
  const caps = el('div', 'swrow');
  for (let i = 0; i < 5; i++) {
    colorWell(grid, (p) => p.colors[i], (v) => { const c = portal.params.colors; c[i] = v; portal.set({ colors: c }); }, 'Ray color ' + (i + 1));
    caps.append(el('div', 'cap', i === 0 ? 'Rays' : ''));
  }
  colorWell(grid, (p) => p.background, (v) => portal.set({ background: v }), 'Background');
  colorWell(grid, (p) => p.glow, (v) => portal.set({ glow: v }), 'Center glow');
  caps.append(el('div', 'cap', 'Bg'), el('div', 'cap', 'Glow'));
  caps.firstChild.style.textAlign = 'left';
  s.append(grid, caps);
  const sp = el('div'); sp.style.height = '8px'; s.append(sp);
  slider(s, 'hue', 'Hue shift', -180, 180, 1, { show: (v) => Math.round(v) + '°', after: () => markPreset(portal.params) });
  slider(s, 'saturation', 'Saturation', 0, 2, 0.01);
}

// Light
{
  const s = section('Light', iconBtn(ICON_RESET, 'Reset light to default', () => {
    const patch = {}; LIGHT_KEYS.forEach((k) => { patch[k] = DEF[k]; }); portal.set(patch); changed();
  }));
  slider(s, 'exposure', 'Brightness', 0.2, 3, 0.01);
  slider(s, 'contrast', 'Contrast', 0.3, 2.5, 0.01);
  slider(s, 'blackPoint', 'Darks', -0.3, 0.4, 0.005, { show: (v) => (v > 0 ? '+' : '') + Math.round(v * 100) });
  slider(s, 'highlights', 'Hot white', 0, 1, 0.01);
  slider(s, 'bloom', 'Glow', 0, 2, 0.01);
  slider(s, 'bloomSize', 'Glow size', 0.2, 4, 0.01);
  slider(s, 'glowAmount', 'Center glow', 0, 6, 0.01);
  slider(s, 'glowSize', 'Center size', 0.1, 6, 0.01);
}

// Motion
{
  const s = section('Motion');
  slider(s, 'speed', 'Speed', -2, 5, 0.01);
  slider(s, 'rotation', 'Spin', -0.6, 0.6, 0.005);
  slider(s, 'twist', 'Twist', -1.5, 1.5, 0.01);
  slider(s, 'pulse', 'Pulse', 0, 1, 0.01);
  slider(s, 'shimmer', 'Shimmer', 0, 1.5, 0.01);
}

// Rays
{
  const dice = iconBtn('<svg class="i" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><circle cx="5.8" cy="5.8" r=".6" fill="currentColor"/><circle cx="10.2" cy="10.2" r=".6" fill="currentColor"/><circle cx="8" cy="8" r=".6" fill="currentColor"/></svg>', 'New random layout (R)', () => shuffle());
  const s = section('Rays', dice);
  slider(s, 'density', 'Density', 0.2, 2.5, 0.01);
  slider(s, 'variety', 'Variety', 0, 1, 0.01);
  slider(s, 'width', 'Width', 0.3, 2.5, 0.01);
  slider(s, 'length', 'Length', 0.3, 2.5, 0.01);
  slider(s, 'softness', 'Edge blur', 0, 6, 0.01);
  slider(s, 'fade', 'Head fade', 0.2, 3, 0.01);
  slider(s, 'core', 'Center hole', 0, 1, 0.01);
  slider(s, 'seed', 'Seed', 1, 999, 1);
}

// Position + finish
{
  const s = section('Center', iconBtn(ICON_RESET, 'Center the portal', () => { portal.set({ centerX: 0, centerY: 0 }); changed(); }));
  slider(s, 'centerX', 'X', -0.5, 0.5, 0.001, { show: (v) => Math.round(v * 100) + '%' });
  slider(s, 'centerY', 'Y', -0.5, 0.5, 0.001, { show: (v) => Math.round(v * 100) + '%' });
  s.append(el('div', 'hint', 'Or drag on the canvas. Double-click it to re-center.'));
}
{
  const s = section('Finish');
  slider(s, 'grain', 'Grain', 0, 2, 0.01);
  slider(s, 'vignette', 'Vignette', 0, 1, 0.01);
}

// Export
const SIZES = [['1920x1080', '1920 × 1080 (16:9)'], ['3840x2160', '3840 × 2160 (4K)'], ['2560x1080', '2560 × 1080 (21:9)'], ['1080x1080', '1080 × 1080 (1:1)'], ['1080x1350', '1080 × 1350 (4:5)'], ['1080x1920', '1080 × 1920 (9:16)'], ['custom', 'Custom']];
{
  const s = section('Export');
  const l1 = el('div', 'line'); l1.append(el('label', '', 'Size'));
  const sel = document.createElement('select');
  SIZES.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); });
  l1.append(sel); s.append(l1);
  const l2 = el('div', 'line'); l2.append(el('label', '', ''));
  const wIn = el('input', 'num'); wIn.type = 'number'; wIn.min = 64; wIn.max = 4096;
  const hIn = el('input', 'num'); hIn.type = 'number'; hIn.min = 64; hIn.max = 4096;
  l2.append(wIn, el('span', 'times', '×'), hIn); s.append(l2);
  const paintSize = () => {
    wIn.value = out.w; hIn.value = out.h;
    const k = out.w + 'x' + out.h; sel.value = SIZES.some(([v]) => v === k) ? k : 'custom';
    layout();
  };
  sel.addEventListener('change', () => { if (sel.value !== 'custom') { const [w, h] = sel.value.split('x').map(Number); out.w = w; out.h = h; } paintSize(); save(); });
  const onNum = () => {
    out.w = Math.max(64, Math.min(4096, Math.round(+wIn.value || out.w)));
    out.h = Math.max(64, Math.min(4096, Math.round(+hIn.value || out.h)));
    paintSize(); save();
  };
  wIn.addEventListener('change', onNum); hIn.addEventListener('change', onNum);
  syncers.push(paintSize);

  const l3 = el('div', 'line'); l3.append(el('label', '', 'Frame rate'));
  seg(l3, [[30, '30'], [60, '60']], () => out.fps, (v) => { out.fps = v; });
  s.append(l3);
  const l4 = el('div', 'line'); l4.append(el('label', '', 'Quality'));
  seg(l4, [['high', 'High'], ['small', 'Smaller']], () => out.quality, (v) => { out.quality = v; });
  s.append(l4);
  slider(s, null, 'Duration', 2, 30, 1, {
    get: () => out.dur, set: (v) => { out.dur = v; applyLoop(); }, def: OUT_DEF.dur, show: (v) => v + ' s',
  });
  const l5 = el('div', 'line'); l5.append(el('label', '', 'Seamless loop'));
  const sw = el('label', 'switch'); const cb = document.createElement('input'); cb.type = 'checkbox'; sw.append(cb, el('span'));
  cb.addEventListener('change', () => { out.loop = cb.checked; applyLoop(); save(); paintLoopHint(); });
  l5.append(sw); s.append(l5);
  const hint = el('div', 'hint'); s.append(hint);
  const paintLoopHint = () => {
    cb.checked = out.loop;
    hint.textContent = out.loop
      ? 'The clip repeats with no seam. Each streak snaps to a whole number of trips per loop, and spin snaps to whole turns (or stops).'
      : 'Turn on to make the MP4 repeat with no seam (for video backgrounds).';
  };
  syncers.push(paintLoopHint);
  const bt = el('div', 'btns');
  const dl = el('button', 'btn small', 'Download PNG'); dl.addEventListener('click', () => exportPNG(false));
  const mp = el('button', 'btn small', 'Export MP4'); mp.addEventListener('click', exportMP4);
  bt.append(dl, mp); s.append(bt);
}

// ---------- stage layout ----------
const frame = $('frame'), stage = $('stage'), dot = $('dot');
function layout() {
  if (document.fullscreenElement === frame) return;
  const pad = 32, bottom = 34;
  const sw = stage.clientWidth - pad * 2, sh = stage.clientHeight - pad - bottom;
  const k = Math.min(sw / out.w, sh / out.h);
  frame.style.width = Math.round(out.w * k) + 'px';
  frame.style.height = Math.round(out.h * k) + 'px';
  $('meta').innerHTML = `<span><b>${out.w} × ${out.h}</b></span><span>Space play/pause</span><span>R shuffle</span><span>F fullscreen</span>`;
  placeDot();
}
function placeDot() {
  const p = portal.params;
  dot.style.left = ((0.5 + p.centerX) * 100) + '%';
  dot.style.top = ((0.5 - p.centerY) * 100) + '%';
}
syncers.push(placeDot);
new ResizeObserver(layout).observe(stage);

// drag the vanishing point
let dragging = false;
function setCenterFrom(e) {
  const r = frame.getBoundingClientRect();
  const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
  const y = Math.max(-0.5, Math.min(0.5, 0.5 - (e.clientY - r.top) / r.height));
  portal.set({ centerX: +x.toFixed(3), centerY: +y.toFixed(3) }); sync();
}
frame.addEventListener('pointerdown', (e) => {
  if (document.fullscreenElement === frame) return;
  dragging = true; frame.classList.add('drag'); frame.setPointerCapture(e.pointerId); setCenterFrom(e);
});
frame.addEventListener('pointermove', (e) => { if (dragging) setCenterFrom(e); });
const endDrag = () => { if (!dragging) return; dragging = false; frame.classList.remove('drag'); save(); };
frame.addEventListener('pointerup', endDrag);
frame.addEventListener('pointercancel', endDrag);
frame.addEventListener('dblclick', () => { portal.set({ centerX: 0, centerY: 0 }); changed(); });

// ---------- header ----------
const ICON_PLAY = '<svg class="i" viewBox="0 0 16 16"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg class="i" viewBox="0 0 16 16"><path d="M5.5 3.5v9M10.5 3.5v9" stroke-width="2"/></svg>';
function paintPlay() { $('playBtn').innerHTML = portal.playing ? ICON_PAUSE : ICON_PLAY; }
$('playBtn').addEventListener('click', () => { portal.toggle(); paintPlay(); });
paintPlay();
function shuffle() { portal.set({ seed: 1 + Math.floor(Math.random() * 999) }); changed(); }
$('seedBtn').addEventListener('click', shuffle);
$('fsBtn').addEventListener('click', toggleFS);
function toggleFS() {
  if (document.fullscreenElement) document.exitFullscreen();
  else frame.requestFullscreen().catch(() => toast('Fullscreen is blocked here', true));
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) layout(); });
$('codeBtn').addEventListener('click', copyCode);
$('pngBtn').addEventListener('click', () => exportPNG(true));
$('mp4Btn').addEventListener('click', exportMP4);

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
  if (e.metaKey || e.ctrlKey) {
    if (e.key.toLowerCase() === 'c' && !String(window.getSelection())) { e.preventDefault(); exportPNG(true); }
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); portal.toggle(); paintPlay(); }
  else if (e.key === 'r' || e.key === 'R') shuffle();
  else if (e.key === 'f' || e.key === 'F') toggleFS();
});

// ---------- exports ----------
function stamp() { return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'); }
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
// renders the frame you are looking at, at the export size, on its own canvas
function offscreen(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const r = createPortal(c, portal.params, { animate: false, autoResize: false, pauseOffscreen: false });
  return { c, r };
}
function pngBlob() {
  const { c, r } = offscreen(out.w, out.h);
  r.draw(portal.clock);
  return new Promise((res) => c.toBlob((b) => { r.destroy(); res(b); }, 'image/png'));
}
async function exportPNG(toClipboard) {
  const name = `warp-portal-${out.w}x${out.h}-${stamp()}.png`;
  if (toClipboard && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })]);
      toast(`Copied ${out.w} × ${out.h} PNG`); return;
    } catch (e) { /* the browser pane blocks clipboard images: fall back to a download */ }
  }
  download(await pngBlob(), name);
  toast(toClipboard ? 'Clipboard blocked here, downloaded the PNG instead' : 'Downloaded PNG');
}

function copyCode() {
  const p = portal.params;
  const src = createPortal.toString();
  const code = `<!-- Warp Portal: the canvas fills its parent, so give the parent a size -->
<canvas style="display:block;width:100%;height:100%"></canvas>
<script>
(function () {
  var createPortal = ${src};
  createPortal(document.currentScript.previousElementSibling, ${JSON.stringify(p)});
})();
<\/script>`;
  const done = () => toast('Copied HTML snippet');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code, done));
  else fallbackCopy(code, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  if (ok) done(); else { download(new Blob([text], { type: 'text/html' }), 'warp-portal-snippet.html'); toast('Clipboard blocked here, downloaded the snippet'); }
}

const QP = { high: 20, small: 26 };
async function pickVideoConfig(W, H, fps, quality) {
  const base = { width: W, height: H, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } };
  const codecs = ['avc1.640033', 'avc1.640034', 'avc1.64002A', 'avc1.640028'];
  const ok = async (cfg) => { try { return (await VideoEncoder.isConfigSupported(cfg)).supported; } catch (e) { return false; } };
  for (const codec of codecs) {
    const cfg = { ...base, codec, bitrateMode: 'quantizer' };
    if (await ok(cfg)) return { cfg, qp: QP[quality] ?? QP.high };
  }
  const bitrate = Math.min(240e6, W * H * fps * (quality === 'small' ? 0.5 : 1.0));
  for (const codec of codecs) {
    const cfg = { ...base, codec, bitrate };
    if (await ok(cfg)) return { cfg, qp: null };
  }
  return null;
}
const yieldTask = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
let exporting = false, cancelExport = false;
$('mCancel').addEventListener('click', () => { cancelExport = true; });

async function exportMP4() {
  if (exporting) return;
  if (!('VideoEncoder' in window)) { toast('This browser cannot encode video (use Chrome, Edge or Safari 17+)', true); return; }
  const W = out.w & ~1, H = out.h & ~1, fps = out.fps, D = out.dur;
  const N = Math.max(1, Math.round(D * fps));
  const vc = await pickVideoConfig(W, H, fps, out.quality);
  if (!vc) { toast('H.264 encoding is not supported at this size', true); return; }
  exporting = true; cancelExport = false;
  $('modal').classList.add('show');
  $('mTitle').textContent = `Exporting ${W} × ${H} · ${fps} fps · ${D} s${out.loop ? ' loop' : ''}`;
  $('mText').textContent = 'Preparing…'; $('mBar').style.width = '0%';
  const started = performance.now();

  const { r } = offscreen(W, H);
  const gl = r.gl;
  const clk = portal.clock, sp = portal.params.speed, rs = portal.rotSpeed();
  let failure = null;
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
  enc.configure(vc.cfg);
  const encOpts = vc.qp != null ? { avc: { quantizer: vc.qp } } : {};
  const px = new Uint8Array(W * H * 4), rowBuf = new Uint8Array(W * 4), stride = W * 4;
  try {
    for (let i = 0; i < N; i++) {
      if (cancelExport || failure) break;
      const t = i / fps;
      r.draw({ flow: clk.flow + t * sp, rot: clk.rot + t * rs, frame: i });
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let y = 0, h2 = H >> 1; y < h2; y++) { // GL rows are bottom-up
        const a = y * stride, b = (H - 1 - y) * stride;
        rowBuf.set(px.subarray(a, a + stride)); px.copyWithin(a, b, b + stride); px.set(rowBuf, b);
      }
      const vf = new VideoFrame(px, { format: 'RGBX', codedWidth: W, codedHeight: H, timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % (fps * 2) === 0, ...encOpts });
      vf.close();
      while (enc.encodeQueueSize > 4) await yieldTask();
      if (i % 3 === 0 || i === N - 1) {
        $('mBar').style.width = ((i + 1) / N * 100).toFixed(1) + '%';
        $('mText').textContent = `Frame ${i + 1} of ${N}`;
        await yieldTask();
      }
    }
    if (!cancelExport && !failure) await enc.flush();
  } catch (e) { failure = failure || e; }
  try { enc.close(); } catch (e) {}
  r.destroy();

  if (!cancelExport && !failure) {
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    download(blob, `warp-portal-${W}x${H}-${stamp()}.mp4`);
    window.__lastExport = { bytes: blob.size, frames: N, ms: Math.round(performance.now() - started), codec: vc.cfg.codec, qp: vc.qp };
    toast(`Exported ${D} s in ${((performance.now() - started) / 1000).toFixed(1)} s · ${(blob.size / 1e6).toFixed(1)} MB`);
  } else if (failure) toast('Export failed (' + (failure.message || failure) + ')', true);
  else toast('Export cancelled');
  exporting = false;
  $('modal').classList.remove('show');
}

sync();
layout();
window.warp = { portal, out, sync };
