/*
 * Flat 2D scene spike: the whole Spanish chapter 1, drawn and animated in
 * SVG with no images or libraries. Characters are cut-out figures seen from
 * the side. Every moving part is driven by a damped spring, so motion
 * overshoots and settles instead of moving linearly: a hopping walk,
 * cartoon turns, squash on landing, arm gestures, head bob when talking,
 * blinking and lip-sync from the loudness of the sentence audio.
 */

import rough from './vendor/rough.esm.js';

const ROOT = '../../';
const params = new URLSearchParams(location.search);
const STYLE = params.get('style') || 'ink'; // ink | crayon | flat
const MOTION = params.get('motion') || 'peppa'; // peppa | springy
const FPS = +(params.get('fps') || (STYLE === 'crayon' ? 12 : 0)); // 0 = every frame; 12 = held frames, like hand animation
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const svg = $('svg');
const FLOOR = 400;

function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const shade = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * f)).toString(16).padStart(2, '0')).join('');

// A damped spring. Low damping overshoots and wobbles; that is the cartoon feel.
class Spring {
  constructor(v = 0, k = 120, d = 14) { this.v = v; this.target = v; this.vel = 0; this.k = k; this.d = d; }
  step(dt) {
    // small substeps keep stiff springs stable at low or held frame rates
    const n = Math.ceil(dt * 240), h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += (this.k * (this.target - this.v) - this.d * this.vel) * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
  snap(v = this.target) { this.v = this.target = v; this.vel = 0; }
  kick(vel) { this.vel += vel; }
}

const M = {
  springy: { flipK: 320, flipD: 22, armK: 95, armD: 10, stride: 11, bob: 7, swing: 30, talkRock: 0, talkHz: 9, levelRock: 5, squash: 0.06 },
  peppa: { flipK: 1600, flipD: 80, armK: 210, armD: 24, stride: 6.5, bob: 2.5, swing: 24, talkRock: 5, talkHz: 5.5, levelRock: 2, squash: 0.03 },
}[MOTION];

let instant = false; // true while earlier beats are replayed on a seek
const set = (spring, v) => { spring.target = v; if (instant) spring.snap(v); };

// ---------- the set ----------

const world = el('g', {}, svg);
const layers = {};
for (const n of ['sky', 'city', 'house', 'room', 'back', 'table', 'front', 'fx']) layers[n] = el('g', {}, world);

// ---------- drawing: flat, or hand-drawn with rough.js ----------
//
// Hand-drawn styles draw every shape a few times with different random
// wobble and cycle through the copies ("line boil", as in hand animation).

const LOOK = {
  flat: null,
  ink: { roughness: 0.7, bowing: 0.9, strokeWidth: 1.7, ink: '#3b2a20', boil: 3 },
  crayon: { roughness: 1.35, bowing: 1.4, strokeWidth: 2.2, crayon: true, boil: 3 },
}[STYLE];
const rs = LOOK && rough.svg(svg);
let seed = 7;

function plain(tag, attrs, p, extra) {
  const { plain: _p, noInk, area, ...rest } = extra;
  const e = el(tag, { ...attrs, ...rest }, p);
  if (LOOK && LOOK.ink && attrs.fill !== 'none' && !extra.stroke && !noInk) { e.setAttribute('stroke', LOOK.ink); e.setAttribute('stroke-width', LOOK.strokeWidth * 0.8); }
  return e;
}

// make(generator, options) returns a rough drawable; `attrs` is the flat fallback
function shape(p, tag, attrs, make, fill, extra = {}) {
  if (!LOOK || extra.plain) return plain(tag, attrs, p, extra);
  const g = el('g', {}, p);
  if (extra.opacity !== undefined) g.setAttribute('opacity', extra.opacity);
  const stroke = extra.stroke || (LOOK.ink ? LOOK.ink : fill !== 'none' ? shade(fill, 0.72) : '#333');
  const width = +(extra['stroke-width'] || LOOK.strokeWidth);
  const big = (extra.area || 0) > 40000;
  const copies = big ? 1 : LOOK.boil;
  if (LOOK.crayon && fill !== 'none') {
    const under = make(rs.generator, { seed: seed++, roughness: LOOK.roughness * 0.6, bowing: LOOK.bowing, stroke: 'none', fill: shade(fill, 1.04), fillStyle: 'solid' });
    g.appendChild(rs.draw(under));
  }
  for (let k = 0; k < copies; k++) {
    const o = { seed: seed++, roughness: LOOK.roughness, bowing: LOOK.bowing, stroke, strokeWidth: width };
    if (fill !== 'none') {
      if (LOOK.crayon && !extra.smooth) Object.assign(o, { fill: shade(fill, 0.9), fillStyle: 'hachure', hachureGap: big ? 7 : 3.2, fillWeight: big ? 2.4 : 1.4, hachureAngle: -41 + 8 * k });
      else Object.assign(o, { fill, fillStyle: 'solid' });
    }
    const node = rs.draw(make(rs.generator, o));
    if (copies > 1) node.setAttribute('class', 'v' + k);
    g.appendChild(node);
  }
  return g;
}
const roundRect = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
function rect(p, x, y, w, h, fill, extra = {}) {
  const r = Math.min(+(extra.rx || 0), w / 2, h / 2);
  extra = { area: w * h, ...extra };
  if (r) return shape(p, 'rect', { x, y, width: w, height: h, fill }, (gen, o) => gen.path(roundRect(x, y, w, h, r), o), fill, extra);
  return shape(p, 'rect', { x, y, width: w, height: h, fill }, (gen, o) => gen.rectangle(x, y, w, h, o), fill, extra);
}
function circle(p, cx, cy, r, fill, extra = {}) {
  if (r < 5) return plain('circle', { cx, cy, r, fill }, p, { noInk: r < 3, ...extra });
  return shape(p, 'circle', { cx, cy, r, fill }, (gen, o) => gen.circle(cx, cy, 2 * r, o), fill, { area: 3 * r * r, ...extra });
}
function ellipse(p, cx, cy, rx, ry, fill, extra = {}) {
  return shape(p, 'ellipse', { cx, cy, rx, ry, fill }, (gen, o) => gen.ellipse(cx, cy, 2 * rx, 2 * ry, o), fill, { area: 3 * rx * ry, ...extra });
}
function path(p, d, fill, extra = {}) {
  return shape(p, 'path', { d, fill }, (gen, o) => gen.path(d, o), fill, extra);
}
// limbs and other thick lines; ink style outlines them
function line(p, x1, y1, x2, y2, color, w, extra = {}) {
  const attrs = { x1, y1, x2, y2, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' };
  if (!LOOK) return el('line', { ...attrs, ...extra }, p);
  const g = el('g', {}, p);
  if (LOOK.ink) {
    el('line', { ...attrs, stroke: LOOK.ink, 'stroke-width': w + 3.2 }, g);
    el('line', attrs, g);
    return g;
  }
  shape(g, 'line', attrs, (gen, o) => gen.line(x1, y1, x2, y2, { ...o, strokeWidth: w * 0.8, stroke: color }), 'none', { stroke: color });
  return g;
}

// sky over everything to the left of the kitchen
rect(layers.sky, -2000, -400, 2900, 1000, '#bfe6ff', { plain: true, noInk: true });
circle(layers.sky, -1650, 70, 38, '#ffd35a');
const clouds = [];
for (const [x, y, s] of [[-1500, 80, 1], [-1150, 50, 0.8], [-700, 70, 1.1], [-350, 40, 0.9]]) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, layers.sky);
  for (const [cx, cy, r] of [[0, 0, 26], [28, -10, 30], [58, 0, 24], [30, 10, 24]]) circle(g, cx, cy, r, '#ffffff');
  clouds.push({ g, x, y, s, speed: 6 + 4 * s });
}

// --- Madrid: a big city ---
{
  const p = layers.city;
  rect(p, -1900, FLOOR - 10, 1000, 140, '#9a9a9a');
  rect(p, -1900, FLOOR - 16, 1000, 10, '#d8d0c2');
  for (let x = -1880; x < -920; x += 70) rect(p, x, FLOOR + 30, 36, 6, '#f2f2f2');
  const colors = ['#f4c27a', '#e98a5c', '#f2e1c1', '#d96c4a', '#f6d7a7', '#c95f3c', '#efb27a'];
  let x = -1880, i = 0;
  while (x < -940) {
    const w = 80 + ((i * 37) % 50), h = 150 + ((i * 71) % 170);
    const top = FLOOR - 16 - h;
    rect(p, x, top, w, h, colors[i % colors.length]);
    rect(p, x - 4, top - 8, w + 8, 10, '#8f4a2e');
    for (let wy = top + 18; wy < FLOOR - 50; wy += 34) for (let wx = x + 12; wx < x + w - 18; wx += 26) rect(p, wx, wy, 14, 20, '#7cc4e8', { rx: 2 });
    if (i === 3) { // the flag of Spain on one roof
      rect(p, x + w / 2, top - 70, 3, 62, '#555');
      const flag = el('g', { transform: `translate(${x + w / 2 + 3} ${top - 70})` }, p);
      rect(flag, 0, 0, 46, 9, '#c60b1e'); rect(flag, 0, 9, 46, 14, '#ffc400'); rect(flag, 0, 23, 46, 9, '#c60b1e');
      layers.flag = flag;
    }
    x += w + 6; i++;
  }
  for (const tx of [-1820, -1600, -1380, -1150, -980]) {
    rect(p, tx, FLOOR - 60, 7, 46, '#7a5130');
    circle(p, tx + 3, FLOOR - 74, 26, '#5cb85c');
  }
  // a red bus that drives through the city
  const bus = el('g', {}, p);
  rect(bus, 0, -58, 150, 52, '#d9342b', { rx: 10 });
  for (let k = 0; k < 4; k++) rect(bus, 12 + k * 34, -50, 26, 20, '#cfeeff', { rx: 3 });
  circle(bus, 32, -6, 12, '#333'); circle(bus, 118, -6, 12, '#333');
  layers.bus = bus;
}

// --- Lucía's house: a block of flats with balconies ---
{
  const p = layers.house;
  rect(p, -900, FLOOR - 10, 820, 140, '#9a9a9a');
  rect(p, -900, FLOOR - 16, 820, 10, '#d8d0c2');
  for (const [x, w, h, c] of [[-880, 150, 200, '#e9c9a0'], [-720, 70, 140, '#d9a07a'], [-260, 170, 220, '#e3b483']]) rect(p, x, FLOOR - 16 - h, w, h, c);
  const bx = -640, bw = 360, bh = 330, top = FLOOR - 16 - bh;
  rect(p, bx, top, bw, bh, '#f3dcb5');
  rect(p, bx - 8, top - 12, bw + 16, 14, '#b5583a');
  for (let floor = 0; floor < 4; floor++) {
    const y = top + 24 + floor * 72;
    for (let k = 0; k < 4; k++) {
      const wx = bx + 28 + k * 84;
      rect(p, wx, y, 38, 46, floor === 2 && k === 1 ? '#ffe28a' : '#7cc4e8', { rx: 3 });
      rect(p, wx - 6, y + 46, 50, 6, '#5a4632');
      for (let r = 0; r < 5; r++) rect(p, wx - 4 + r * 11, y + 30, 3, 16, '#5a4632');
      circle(p, wx + 6, y + 44, 6, '#e8485f'); circle(p, wx + 30, y + 44, 6, '#f5a623');
    }
  }
  rect(p, bx + bw / 2 - 26, FLOOR - 16 - 70, 52, 70, '#7a4a2a', { rx: 4 });
  layers.homeWindow = { x: bx + 28 + 84 + 19, y: top + 24 + 2 * 72 + 23 };
}

// --- the kitchen ---
const DOOR = { x: 680, w: 92, h: 196 };
const props = {};
{
  const p = layers.room;
  rect(p, -40, -200, 880, FLOOR + 200, '#ffe7c2', { plain: true, noInk: true });
  rect(p, -40, FLOOR - 70, 880, 8, '#f1c98f');
  rect(p, -40, FLOOR, 880, 200, '#c98f5a', { plain: true, noInk: true });
  for (let x = -40; x < 840; x += 90) line(p, x, FLOOR, x - 40, FLOOR + 120, '#b57c4a', 3, { plain: true });
  // window with curtains
  rect(p, 110, 80, 160, 150, '#bfe6ff', { rx: 6 });
  circle(p, 150, 150, 18, '#ffffff'); circle(p, 172, 142, 20, '#ffffff');
  rect(p, 104, 74, 172, 162, 'none', { rx: 8, stroke: '#ffffff', 'stroke-width': 10 });
  rect(p, 186, 80, 8, 150, '#ffffff');
  path(p, 'M92 64 Q120 150 102 246 L82 246 L82 64 Z', '#e8485f');
  path(p, 'M288 64 Q260 150 278 246 L298 246 L298 64 Z', '#e8485f');
  rect(p, 78, 58, 224, 10, '#a35b2f', { rx: 5 });
  // picture and shelf
  rect(p, 360, 100, 70, 56, '#8a5a34', { rx: 4 }); rect(p, 368, 108, 54, 40, '#9fd6a0');
  path(p, 'M368 148 L388 124 L404 140 L414 130 L422 148 Z', '#4f9a52');
  rect(p, 470, 140, 130, 10, '#a35b2f', { rx: 4 });
  for (const [x, h, c] of [[482, 30, '#3b7dd8'], [500, 38, '#f5a623'], [518, 26, '#e8485f']]) rect(p, x, 140 - h, 14, h, c, { rx: 3 });
  rect(p, 548, 116, 28, 24, '#c95f3c', { rx: 4 }); circle(p, 562, 106, 14, '#5cb85c');
  // kitchen counter at the left
  rect(p, -30, FLOOR - 110, 80, 110, '#7db3c9', { rx: 4 });
  rect(p, -34, FLOOR - 116, 88, 10, '#e9eef0', { rx: 3 });
  circle(p, 30, FLOOR - 60, 4, '#ffffff');
  // the doorway, bright outside; the panel opens by narrowing towards its hinge
  rect(p, DOOR.x, FLOOR - DOOR.h, DOOR.w, DOOR.h, '#fff6df');
  rect(p, DOOR.x, FLOOR - 26, DOOR.w, 26, '#e6d6bb');
  circle(p, DOOR.x + 70, FLOOR - 60, 14, '#5cb85c'); rect(p, DOOR.x + 62, FLOOR - 50, 16, 20, '#c95f3c');
  props.carta = el('g', { transform: `translate(${DOOR.x + 40} ${FLOOR - 4})` }, p);
  rect(props.carta, -14, -6, 28, 9, '#ffffff', { rx: 1, stroke: '#d9d0c0', 'stroke-width': 1 });
  circle(props.carta, 0, -2, 3, '#c62828');
  props.door = el('g', { transform: `translate(${DOOR.x} 0)` }, p);
  const panel = el('g', {}, props.door);
  rect(panel, 0, FLOOR - DOOR.h, DOOR.w, DOOR.h, '#b5652b', { rx: 3 });
  rect(panel, 12, FLOOR - DOOR.h + 16, DOOR.w - 24, 70, '#a1561f', { rx: 4 });
  rect(panel, 12, FLOOR - DOOR.h + 100, DOOR.w - 24, 80, '#a1561f', { rx: 4 });
  circle(panel, DOOR.w - 14, FLOOR - 92, 6, '#f2c94c');
  props.panel = panel;
  rect(p, DOOR.x - 8, FLOOR - DOOR.h - 8, DOOR.w + 16, 8, '#8a4b20', { rx: 3 });
  rect(p, DOOR.x - 8, FLOOR - DOOR.h - 8, 8, DOOR.h + 8, '#8a4b20');
  rect(p, DOOR.x + DOOR.w, FLOOR - DOOR.h - 8, 8, DOOR.h + 8, '#8a4b20');
  // chairs: the left one faces right, the right one faces left
  for (const [x, dir] of [[262, 1], [558, -1]]) {
    const g = el('g', { transform: `translate(${x} 0) scale(${dir} 1)` }, p);
    rect(g, -24, FLOOR - 54, 46, 8, '#a35b2f', { rx: 3 });
    rect(g, -24, FLOOR - 120, 8, 70, '#a35b2f', { rx: 3 });
    rect(g, -28, FLOOR - 124, 14, 10, '#a35b2f', { rx: 4 });
    rect(g, -22, FLOOR - 48, 6, 48, '#8a4b20'); rect(g, 14, FLOOR - 48, 6, 48, '#8a4b20');
  }
}
// the table stands in front of the parents and behind the children
{
  const p = layers.table;
  rect(p, 304, FLOOR - 82, 216, 12, '#c0773d', { rx: 6 });
  rect(p, 316, FLOOR - 72, 10, 72, '#a35b2f'); rect(p, 498, FLOOR - 72, 10, 72, '#a35b2f');
  const top = FLOOR - 82;
  const item = (name, x, build) => { const g = el('g', { transform: `translate(${x} ${top})` }, p); build(g); props[name] = { g, x, y: top, bounce: new Spring(0, 260, 12) }; };
  item('plateL', 330, (g) => ellipse(g, 0, -2, 18, 4, '#ffffff'));
  item('plateR', 494, (g) => ellipse(g, 0, -2, 18, 4, '#ffffff'));
  item('pan', 412, (g) => {
    path(g, 'M-26 0 L-22 -14 L22 -14 L26 0 Z', '#b07a3c');
    ellipse(g, -6, -18, 20, 8, '#e3a95e');
    ellipse(g, 8, -21, 16, 7, '#d9984a');
  });
  item('tomate', 452, (g) => {
    circle(g, 0, -9, 9, '#e5352b'); circle(g, 15, -7, 7, '#e5352b');
    path(g, 'M-4 -18 L0 -15 L4 -18 L0 -21 Z', '#3f9a2a'); path(g, 'M11 -14 L15 -12 L19 -14 L15 -16 Z', '#3f9a2a');
  });
  item('café', 365, (g) => {
    path(g, 'M-10 0 L-12 -30 Q0 -40 12 -30 L10 0 Z', '#4a4a52');
    path(g, 'M12 -24 Q22 -20 14 -10', 'none', { stroke: '#4a4a52', 'stroke-width': 4 });
    path(g, 'M-12 -28 L-20 -32', 'none', { stroke: '#4a4a52', 'stroke-width': 4, 'stroke-linecap': 'round' });
    rect(g, 18, -12, 14, 12, '#ffffff', { rx: 2 });
  });
  item('zumo', 344, (g) => {
    rect(g, -6, -22, 12, 22, '#ffffff', { rx: 2, opacity: 0.6 });
    rect(g, -5, -17, 10, 16, '#f5a01b', { rx: 2 });
  });
}

// ---------- characters ----------


class Person {
  constructor(id, o) {
    Object.assign(this, { id, o });
    const s = o.scale, L = o.leg, B = o.body, R = o.head;
    this.L = L; this.B = B; this.R = R;
    this.root = el('g', {}, layers.front);
    this.flipG = el('g', {}, this.root);
    this.squashG = el('g', {}, this.flipG);
    this.scaleG = el('g', { transform: `scale(${s})` }, this.squashG);
    this.bodyG = el('g', {}, this.scaleG);
    const limb = (parent, color, len, w) => {
      const g = el('g', {}, parent);
      line(g, 0, 0, 0, len, color, w);
      return g;
    };
    // legs hang from the hip, shoes point forward
    const legColor = o.trousers || o.skin;
    this.legs = [shade(legColor, 0.85), legColor].map((c, i) => {
      const g = limb(this.bodyG, c, L - 4, 6);
      ellipse(g, 4, L - 3, 8, 4.5, i ? o.shoes : shade(o.shoes, 0.8));
      return g;
    });
    const shoulderY = -L - B + 9;
    this.shoulderY = shoulderY;
    this.armBack = limb(this.bodyG, shade(o.top, 0.85), B * 0.78, 6);
    circle(this.armBack, 0, B * 0.8, 4.2, shade(o.skin, 0.92));
    // body: a dress, or a shirt over trousers
    const top = -L - B, bottom = o.trousers ? -L + 4 : -L + 10;
    const w1 = B * 0.3, w2 = o.trousers ? B * 0.36 : B * 0.5;
    path(this.bodyG, `M${-w1} ${top + 6} Q0 ${top - 4} ${w1} ${top + 6} L${w2} ${bottom} Q0 ${bottom + 5} ${-w2} ${bottom} Z`, o.top);
    if (o.collar) path(this.bodyG, `M${-w1 * 0.6} ${top + 3} Q0 ${top + 12} ${w1 * 0.6} ${top + 3}`, 'none', { stroke: o.collar, 'stroke-width': 3 });
    // head on a short neck
    this.headG = el('g', {}, this.bodyG);
    const cx = R * 0.18, cy = -R * 0.9;
    const h = this.headG;
    const clipId = `face-${id}`;
    const clip = el('clipPath', { id: clipId }, h);
    el('ellipse', { cx, cy, rx: R, ry: R * 0.94 }, clip);
    const hairBack = { bob: [cx - R * 0.32, cy - R * 0.08, R * 0.98, R * 1.04], long: [cx - R * 0.42, cy + R * 0.42, R * 0.86, R * 1.42], short: [cx - R * 0.2, cy - R * 0.22, R * 0.98, R * 0.9], bun: [cx - R * 0.2, cy - R * 0.22, R * 0.98, R * 0.9] }[o.hairStyle];
    if (o.hairStyle === 'bun') circle(h, cx - R * 0.95, cy - R * 0.55, R * 0.42, o.hair);
    ellipse(h, hairBack[0], hairBack[1], hairBack[2], hairBack[3], o.hair);
    circle(h, cx - R * 0.2, cy + R * 0.05, R * 0.17, shade(o.skin, 0.93));
    ellipse(h, cx, cy, R, R * 0.94, o.skin, { smooth: true });
    circle(h, cx + R * 0.98, cy + R * 0.05, R * 0.14, shade(o.skin, 0.96));
    // hair over the top of the face, cut by the face outline
    const cap = el('g', { 'clip-path': `url(#${clipId})` }, h);
    const hc = { bob: [-0.1, -0.62, 1.05, 0.62], long: [-0.25, -0.6, 1.0, 0.58], short: [-0.3, -0.7, 0.95, 0.52], bun: [-0.3, -0.62, 0.95, 0.56] }[o.hairStyle];
    ellipse(cap, cx + R * hc[0], cy + R * hc[1], R * hc[2], R * hc[3], o.hair);
    if (o.hairStyle === 'bob' || o.hairStyle === 'long') ellipse(cap, cx - R * 0.78, cy + R * 0.1, R * 0.32, R * 0.9, o.hair);
    if (o.beard) path(cap, `M${cx - R * 0.5} ${cy + R * 0.2} Q${cx + R * 0.2} ${cy + R * 1.2} ${cx + R * 1.1} ${cy + R * 0.25} L${cx + R * 1.1} ${cy + R * 1.2} L${cx - R * 0.5} ${cy + R * 1.2} Z`, o.hair);
    circle(h, cx + R * 0.42, cy + R * 0.3, R * 0.15, '#ff8a8a', { opacity: 0.55 });
    this.eyes = [[0.36, -0.12], [0.74, -0.14]].map(([ex, ey]) => {
      const g = el('g', { transform: `translate(${cx + R * ex} ${cy + R * ey})` }, h);
      const inner = el('g', {}, g);
      circle(inner, 0, 0, R * 0.15, '#ffffff');
      const pupil = circle(inner, R * 0.03, 0, R * 0.075, '#222222');
      return { g: inner, pupil };
    });
    this.brows = [[0.36, -0.36], [0.74, -0.38]].map(([bx, by]) => el('path', { d: '', fill: 'none', stroke: shade(o.hair, 0.8), 'stroke-width': 2.4, 'stroke-linecap': 'round', transform: `translate(${cx + R * bx} ${cy + R * by})` }, h));
    this.mouth = path(h, '', '#7a2030', { transform: `translate(${cx + R * 0.62} ${cy + R * 0.48})`, stroke: '#7a2030', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    if (o.hijab) {
      // a scarf: drawn over the hair, open at the face
      path(h, `M${cx - R * 1.15} ${cy + R * 0.9} Q${cx - R * 1.3} ${cy - R * 1.4} ${cx + R * 0.3} ${cy - R * 1.12} Q${cx + R * 1.2} ${cy - R * 0.9} ${cx + R * 1.12} ${cy - R * 0.2} Q${cx + R * 0.5} ${cy - R * 0.8} ${cx - R * 0.1} ${cy - R * 0.2} Q${cx - R * 0.2} ${cy + R * 0.6} ${cx + R * 0.4} ${cy + R * 1.0} Q${cx - R * 0.3} ${cy + R * 1.4} ${cx - R * 1.15} ${cy + R * 0.9} Z`, o.hijab);
    }
    this.armFront = limb(this.bodyG, o.top, B * 0.78, 6.5);
    circle(this.armFront, 0, B * 0.8, 4.5, o.skin);
    this.hand = el('g', { transform: `translate(0 ${B * 0.82})` }, this.armFront);

    this.x = 0; this.facing = 1;
    this.sp = {
      flip: new Spring(1, M.flipK, M.flipD), walk: new Spring(0, 60, 14), sit: new Spring(0, 110, 15), crouch: new Spring(0, 110, 15),
      squash: new Spring(0, 380, 9), armF: new Spring(8, M.armK, M.armD), armB: new Spring(-8, M.armK, M.armD), tilt: new Spring(0, 140, 12), talk: new Spring(0, 30, 11),
      lean: new Spring(0, 90, 12), happy: new Spring(0.4, 60, 12), surprised: new Spring(0, 80, 12), mouth: new Spring(0, 900, 45),
      stretch: new Spring(0, 140, 10), lookY: new Spring(0, 90, 14),
    };
    this.phase = 0; this.path = []; this.hopT = 9; this.nodT = 9; this.shakeT = 9; this.waveT = 9; this.blinkIn = 1 + Math.random() * 3; this.blink = 0;
    this.gesture = 'down';
  }

  layer(name) { layers[name].appendChild(this.root); }
  place(x, facing = 1) { this.x = x; this.path = []; this.face(facing, true); }
  face(dir, now) { this.facing = dir; this.sp.flip.target = dir; if (now || instant) this.sp.flip.snap(dir); }
  walkTo(x, { speed = 120, then, face } = {}) {
    if (instant) { this.x = x; this.sp.walk.snap(0); if (face) this.face(face); else this.face(Math.sign(x - this.x) || this.facing); then && then(); return; }
    this.face(Math.sign(x - this.x) || this.facing);
    this.path = [{ x, speed, then, face }];
    this.sp.squash.kick(-1.2);
  }
  sit(on = true) { set(this.sp.sit, on ? 1 : 0); if (!instant) this.hop(14); }
  hop(h = 18) { if (!instant) { this.hopT = 0; this.hopH = h; } }
  nod() { if (!instant) this.nodT = 0; }
  shake() { if (!instant) this.shakeT = 0; }
  wave() { if (!instant) this.waveT = 0; }
  pose(name) { this.gesture = name; }
  expr(e) { for (const [k, v] of Object.entries(e)) set(this.sp[k], v); }
  headPos() { return { x: this.x + this.facing * this.R * 0.4 * this.o.scale, y: FLOOR + (-this.L - this.B - this.R) * this.o.scale }; }

  update(dt, t) {
    const sp = this.sp;
    // walking along the path
    if (this.path.length) {
      const goal = this.path[0], d = goal.x - this.x, step = goal.speed * dt;
      if (Math.abs(d) <= step) {
        this.x = goal.x; this.path.shift();
        sp.squash.kick(2.2);
        if (goal.face) this.face(goal.face);
        goal.then && goal.then();
      } else { this.x += Math.sign(d) * step; this.phase += step / (M.stride * this.o.scale); }
    }
    sp.walk.target = this.path.length ? 1 : 0;
    for (const s of Object.values(sp)) s.step(dt);
    const w = Math.max(0, sp.walk.v), sit = sp.sit.v, cr = sp.crouch.v;
    // arms: gesture angles, in degrees, 0 = hanging down, negative = forwards
    const G = {
      down: [8, -8], offer: [-62, -6], point: [-88, 6], reach: [-28, -10], hold: [-58, -6], show: [-100, -10],
      yay: [-150, -150], belly: [-35, -28], shrug: [-40, 40],
    }[this.gesture] || [8, -8];
    let aF = G[0], aB = G[1];
    if (this.waveT < 1.6) { this.waveT += dt; aF = -150 + 18 * Math.sin(this.waveT * 14); }
    sp.armF.target = aF - 22 * Math.sin(this.phase) * w;
    sp.armB.target = aB + 22 * Math.sin(this.phase) * w;
    // legs: swing when walking, stick out when sitting, splay when crouching
    const swing = M.swing * Math.sin(this.phase) * w;
    const legF = swing - 78 * sit - 48 * cr, legB = -swing - 72 * sit + 30 * cr;
    this.legs[0].setAttribute('transform', `translate(-2 ${-this.L}) rotate(${legB})`);
    this.legs[1].setAttribute('transform', `translate(3 ${-this.L}) rotate(${legF})`);
    // the body bounces as it walks; hops are a simple arc
    let lift = M.bob * Math.abs(Math.cos(this.phase)) * w;
    if (this.hopT < 0.45) { this.hopT += dt; lift += this.hopH * Math.sin((this.hopT / 0.45) * Math.PI); }
    const seat = 50 / this.o.scale;
    const drop = (this.L - seat - 3) * sit + this.L * 0.42 * cr;
    const breathe = 1 + 0.012 * Math.sin(t * 2.2 + this.L);
    const stretch = 1 + 0.18 * sp.stretch.v;
    this.bodyG.setAttribute('transform', `translate(0 ${drop - lift}) rotate(${sp.lean.v + 14 * cr + 4 * w} 0 ${-this.L}) scale(1 ${breathe * stretch}) `);
    this.armBack.setAttribute('transform', `translate(-3 ${this.shoulderY}) rotate(${sp.armB.v})`);
    this.armFront.setAttribute('transform', `translate(2 ${this.shoulderY}) rotate(${sp.armF.v})`);
    // head: talking bobs it, nods and shakes rock it
    const level = speaker === this ? mouthLevel : 0;
    sp.mouth.target = level;
    sp.talk.target = speaker === this && !audio.paused ? 1 : 0;
    let tilt = sp.tilt.v + M.levelRock * sp.mouth.v * Math.sin(t * 9) + M.talkRock * sp.talk.v * Math.sin(t * M.talkHz) - 10 * sp.lookY.v;
    if (this.nodT < 0.7) { this.nodT += dt; tilt += 12 * Math.sin(this.nodT * 18) * (1 - this.nodT / 0.7); }
    let shakeX = 0;
    if (this.shakeT < 0.9) { this.shakeT += dt; shakeX = Math.sin(this.shakeT * 20) * (1 - this.shakeT / 0.9); }
    this.headG.setAttribute('transform', `translate(2 ${-this.L - this.B + 4}) rotate(${tilt + 6 * shakeX})`);
    // eyes: blink, open wide when surprised, pupils glance
    this.blinkIn -= dt;
    if (this.blinkIn < 0) { this.blink = 0.14; this.blinkIn = 2 + Math.random() * 3; }
    this.blink = Math.max(0, this.blink - dt);
    const open = this.blink > 0 ? 0.12 : 1;
    const big = 1 + 0.35 * Math.max(0, sp.surprised.v);
    for (const e of this.eyes) {
      e.g.setAttribute('transform', `scale(${big} ${big * open})`);
      e.pupil.setAttribute('cx', this.R * (0.04 - 0.06 * shakeX));
      e.pupil.setAttribute('cy', this.R * 0.05 * sp.lookY.v);
    }
    const bu = -3 * sp.surprised.v;
    this.brows.forEach((b) => b.setAttribute('d', `M${-this.R * 0.13} ${bu + 1} Q0 ${bu - 2 - 2 * sp.surprised.v} ${this.R * 0.13} ${bu}`));
    // mouth: open with the voice, a smile, or an O of surprise
    const mw = this.R * 0.22, m = sp.mouth.v, hp = sp.happy.v, su = Math.max(0, sp.surprised.v);
    let d;
    if (m > 0.04) d = `M${-mw} 0 Q0 ${-2 + hp * 2} ${mw} 0 Q0 ${3 + m * 12} ${-mw} 0 Z`;
    else if (su > 0.35) d = `M${-mw * 0.4} 0 a${mw * 0.4} ${mw * 0.5 * su} 0 1 0 ${mw * 0.8} 0 a${mw * 0.4} ${mw * 0.5 * su} 0 1 0 ${-mw * 0.8} 0 Z`;
    else d = `M${-mw} ${-hp * 2} Q0 ${hp * 7 - 1} ${mw} ${-hp * 2}`;
    this.mouth.setAttribute('d', d);
    this.mouth.setAttribute('fill', m > 0.04 || su > 0.35 ? '#7a2030' : 'none');
    // whole figure: position, cartoon turn (scaleX through zero), squash
    const sq = sp.squash.v * M.squash;
    this.squashG.setAttribute('transform', `scale(${1 + sq} ${1 - sq})`);
    this.flipG.setAttribute('transform', `scale(${sp.flip.v} 1)`);
    this.root.setAttribute('transform', `translate(${this.x} ${FLOOR})`);
  }
}

class Dog {
  constructor(id, o) {
    this.id = id; this.o = o;
    this.root = el('g', {}, layers.front);
    this.flipG = el('g', {}, this.root);
    this.bodyG = el('g', { }, this.flipG);
    const c = o.color, dark = shade(c, 0.8);
    this.legs = [[-22, dark], [14, dark], [-16, c], [20, c]].map(([x, col]) => {
      const g = el('g', {}, this.bodyG);
      line(g, 0, 0, 0, 22, col, 6);
      g.dataset.x = x;
      return g;
    });
    this.tail = el('g', {}, this.bodyG);
    line(this.tail, 0, 0, -4, -20, c, 6);
    ellipse(this.bodyG, 0, -34, 32, 15, c);
    ellipse(this.bodyG, -4, -38, 12, 8, o.patch);
    this.headG = el('g', {}, this.bodyG);
    const h = this.headG;
    circle(h, 32, -54, 17, c);
    ellipse(h, 47, -49, 12, 8, c);
    circle(h, 58, -51, 4.5, '#222');
    circle(h, 38, -60, 3.4, '#222');
    this.mouth = path(h, '', '#7a2030');
    this.ear = ellipse(h, 24, -56, 7, 14, dark);
    this.x = 0; this.facing = 1; this.path = []; this.phase = 0; this.hopT = 9; this.barkT = 9;
    this.sp = { flip: new Spring(1, M.flipK, M.flipD), walk: new Spring(0, 60, 14), wag: new Spring(0.3, 60, 10) };
  }
  layer(name) { layers[name].appendChild(this.root); }
  place(x, facing = 1) { this.x = x; this.path = []; this.face(facing, true); }
  face(dir, now) { this.facing = dir; this.sp.flip.target = dir; if (now || instant) this.sp.flip.snap(dir); }
  walkTo(x, { speed = 150, then, face } = {}) {
    if (instant) { this.x = x; if (face) this.face(face); then && then(); return; }
    this.face(Math.sign(x - this.x) || this.facing);
    this.path = [{ x, speed, then, face }];
  }
  hop(h = 26) { if (!instant) { this.hopT = 0; this.hopH = h; } }
  bark() { if (!instant) { this.barkT = 0; bubble('¡Guau!', () => ({ x: this.x + this.facing * 60, y: FLOOR - 95 })); } }
  wag(v) { set(this.sp.wag, v); }
  headPos() { return { x: this.x + this.facing * 40, y: FLOOR - 55 }; }
  update(dt, t) {
    const sp = this.sp;
    if (this.path.length) {
      const goal = this.path[0], d = goal.x - this.x, step = goal.speed * dt;
      if (Math.abs(d) <= step) { this.x = goal.x; this.path.shift(); if (goal.face) this.face(goal.face); goal.then && goal.then(); }
      else { this.x += Math.sign(d) * step; this.phase += step / 7; }
    }
    sp.walk.target = this.path.length ? 1 : 0;
    for (const s of Object.values(sp)) s.step(dt);
    const w = Math.max(0, sp.walk.v);
    this.legs.forEach((g, i) => g.setAttribute('transform', `translate(${g.dataset.x} -26) rotate(${28 * Math.sin(this.phase + (i % 2) * Math.PI) * w})`));
    let lift = 6 * Math.abs(Math.cos(this.phase)) * w;
    if (this.hopT < 0.4) { this.hopT += dt; lift += this.hopH * Math.sin((this.hopT / 0.4) * Math.PI); }
    this.bodyG.setAttribute('transform', `translate(0 ${-lift})`);
    this.tail.setAttribute('transform', `translate(-30 -40) rotate(${-20 + 35 * Math.sin(t * 16) * sp.wag.v})`);
    this.ear.setAttribute('transform', `rotate(${8 * Math.sin(t * 3) + 25 * lift / 26} 24 -66)`);
    let open = 0;
    if (this.barkT < 0.6) { this.barkT += dt; open = Math.abs(Math.sin(this.barkT * 16)); }
    this.mouth.setAttribute('d', open > 0.1 ? `M44 -44 Q52 ${-44 + 9 * open} 58 -45 Z` : '');
    this.headG.setAttribute('transform', `rotate(${-8 * open} 32 -50)`);
    this.flipG.setAttribute('transform', `scale(${sp.flip.v} 1)`);
    this.root.setAttribute('transform', `translate(${this.x} ${FLOOR})`);
  }
}

// speech bubbles and other effects
const effects = [];
function bubble(text, at, dur = 1.4) {
  const g = el('g', {}, layers.fx);
  const w = 14 + text.length * 11;
  rect(g, -w / 2, -24, w, 34, '#ffffff', { rx: 14, stroke: '#333', 'stroke-width': 2 });
  el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-size': 20, 'font-family': 'system-ui, sans-serif', 'font-weight': 700, fill: '#333' }, g).textContent = text;
  const s = new Spring(0, 300, 14); s.target = 1;
  effects.push({ g, t: 0, dur, update(dt) {
    const p = at();
    s.step(dt);
    if (this.t > dur - 0.25) s.target = 0;
    g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${Math.max(0, s.v)})`);
  } });
}
function bounce(name) {
  if (instant) return;
  props[name].bounce.kick(-160);
  const ring = el('ellipse', { cx: props[name].x, cy: props[name].y + 2, rx: 30, ry: 7, fill: 'none', stroke: '#ffcf33', 'stroke-width': 4 }, layers.fx);
  effects.push({ g: ring, t: 0, dur: 0.9, update() { ring.setAttribute('opacity', Math.sin((this.t / 0.9) * Math.PI)); } });
}

// ---------- cast ----------

const A = {
  lucia: new Person('lucia', { scale: 1.0, leg: 46, body: 50, head: 30, skin: '#f5c9a6', hair: '#4a2a17', hairStyle: 'bob', top: '#e8485f', collar: '#ffffff', shoes: '#3b3b8f' }),
  pablo: new Person('pablo', { scale: 0.78, leg: 40, body: 46, head: 32, skin: '#f5c9a6', hair: '#6b4224', hairStyle: 'short', top: '#3b7dd8', trousers: '#2d4f7a', shoes: '#e8485f' }),
  carmen: new Person('carmen', { scale: 1.12, leg: 50, body: 56, head: 27, skin: '#efbf98', hair: '#2a1a12', hairStyle: 'bun', top: '#2e9d6b', collar: '#ffd35a', shoes: '#7a3b20' }),
  javier: new Person('javier', { scale: 1.2, leg: 50, body: 58, head: 27, skin: '#efbf98', hair: '#2f2a28', hairStyle: 'short', beard: true, top: '#7a5cc2', trousers: '#3a3a48', shoes: '#4a2f1d' }),
  rufo: new Dog('rufo', { color: '#d9a066', patch: '#b07a3c' }),
};

// ---------- camera ----------

const cam = { x: 400, y: 250, w: 800, from: null, to: null, t: 1, dur: 1 };
function shot(x, y, w, dur = 1.2) {
  if (instant || dur === 0) { Object.assign(cam, { x, y, w, t: 1 }); return; }
  cam.from = { x: cam.x, y: cam.y, w: cam.w }; cam.to = { x, y, w }; cam.t = 0; cam.dur = dur;
}
const focus = (a, w = 300, dy = 0) => { const h = a.headPos(); return [h.x, h.y + w * 0.12 + dy, w]; };
function updateCamera(dt) {
  if (cam.t < 1) {
    cam.t = Math.min(1, cam.t + dt / cam.dur);
    const e = cam.t < 0.5 ? 4 * cam.t ** 3 : 1 - (-2 * cam.t + 2) ** 3 / 2;
    for (const k of ['x', 'y', 'w']) cam[k] = cam.from[k] + (cam.to[k] - cam.from[k]) * e;
  }
  const h = cam.w * 0.625;
  svg.setAttribute('viewBox', `${cam.x - cam.w / 2} ${cam.y - h / 2} ${cam.w} ${h}`);
}

// ---------- sound ----------

let ctx = null, analyser = null, speaker = null, mouthLevel = 0;
const audio = new Audio();
const buf = new Float32Array(1024);
function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaElementSource(audio).connect(analyser);
  analyser.connect(ctx.destination);
}
function measure() {
  if (!analyser || audio.paused) { mouthLevel = 0; return; }
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  mouthLevel = Math.min(1, Math.max(0, (Math.sqrt(sum / buf.length) - 0.015) * 9));
}
function knock() {
  if (!ctx || instant) return;
  for (let i = 0; i < 3; i++) {
    const t0 = ctx.currentTime + i * 0.22, n = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate), d = n.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.018));
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = n; lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 2.2;
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
}

// ---------- the script ----------

const SEAT = { lucia: 262, pablo: 558 };
const doorOpen = new Spring(0, 70, 9);

function initialState() {
  for (const a of Object.values(A)) {
    a.path = [];
    for (const s of Object.values(a.sp)) s.snap(s === a.sp.flip ? a.facing : s.target);
  }
  A.lucia.place(140, 1); A.pablo.place(200, 1);
  A.carmen.place(372, -1); A.javier.place(452, 1); A.rufo.place(620, -1);
  A.carmen.layer('back'); A.javier.layer('back');
  for (const k of ['lucia', 'pablo']) { const a = A[k]; a.sp.sit.snap(0); a.sp.crouch.snap(0); a.pose('down'); a.expr({ happy: 0.4, surprised: 0, stretch: 0, lookY: 0 }); }
  for (const k of ['carmen', 'javier']) { A[k].pose('down'); A[k].expr({ happy: 0.5, surprised: 0, lookY: 0 }); }
  for (const a of [A.lucia, A.pablo, A.carmen, A.javier]) { a.sp.happy.snap(); a.sp.surprised.snap(); a.sp.stretch.snap(); a.sp.lookY.snap(); }
  A.rufo.wag(0.3);
  doorOpen.snap(0);
  props.zumo.g.style.display = 'none';
  props.carta.style.display = '';
  props.door.parentNode.insertBefore(props.carta, props.door);
  props.carta.setAttribute('transform', `translate(${DOOR.x + 40} ${FLOOR - 4})`);
  $('letter').classList.remove('on');
  for (const e of effects) e.g.remove();
  effects.length = 0;
  shot(-1640, 230, 640, 0);
}

function pickLetter() {
  A.lucia.hand.appendChild(props.carta);
  props.carta.setAttribute('transform', 'translate(4 4) rotate(-70) scale(1.4)');
}

// [seconds into the sentence, action]; actions only set targets, so a seek can replay them at once
const SCRIPT = {
  s01: [
    [0, () => shot(-1640, 230, 640, 0)],
    [0.1, () => shot(-1260, 210, 700, 3.0)],
  ],
  s02: [
    [0, () => shot(-460, 230, 760, 1.0)],
    [0.7, () => { const w = layers.homeWindow; shot(w.x, w.y, 260, 1.3); }],
  ],
  s03: [
    [0, () => { shot(...focus(A.lucia, 300), 0); A.lucia.face(1); }],
    [0.4, () => { A.lucia.wave(); A.lucia.expr({ happy: 1 }); }],
    [1.1, () => { if (!instant) bubble('14', () => ({ x: A.lucia.x + 60, y: FLOOR - 160 }), 1.6); }],
  ],
  s04: [
    [0, () => { shot(170, 300, 340, 1.0); A.pablo.face(-1); }],
    [0.2, () => { A.pablo.hop(); A.pablo.wave(); A.pablo.expr({ happy: 1 }); }],
    [1.4, () => { A.lucia.face(1); A.lucia.expr({ happy: 0.6 }); }],
  ],
  s05: [
    [0, () => { shot(170, 300, 340, 0.8); }],
    [0.15, () => { A.lucia.pose('yay'); A.lucia.expr({ stretch: 1, happy: 1 }); A.lucia.face(1); }],
    [1.25, () => { A.lucia.pose('down'); A.lucia.expr({ stretch: 0 }); set(A.pablo.sp.crouch, 0.9); A.pablo.expr({ happy: 0.2 }); }],
    [2.1, () => { set(A.pablo.sp.crouch, 0); A.pablo.expr({ happy: 0.8 }); }],
  ],
  s06: [
    [0, () => shot(412, 270, 380, 1.1)],
    [0.3, () => { A.carmen.wave(); A.carmen.expr({ happy: 1 }); }],
    [1.4, () => { A.javier.wave(); A.javier.expr({ happy: 1 }); A.carmen.face(1); }],
  ],
  s07: [
    [0, () => shot(600, 320, 380, 1.1)],
    [0.5, () => { A.rufo.hop(); A.rufo.bark(); A.rufo.wag(1); }],
    [1.4, () => { A.rufo.hop(); A.javier.face(1); A.carmen.face(1); }],
  ],
  s08: [
    [0, () => { shot(400, 260, 720, 1.0); A.javier.face(-1); A.javier.pose('offer'); }],
    [1.0, () => {
      A.javier.pose('down');
      A.lucia.walkTo(SEAT.lucia, { face: 1, then: () => A.lucia.sit() });
      A.pablo.walkTo(SEAT.pablo, { speed: 160, face: -1, then: () => A.pablo.sit() });
      A.rufo.walkTo(110, { face: 1 });
      A.carmen.face(-1); A.javier.face(1);
    }],
  ],
  s09: [
    [0, () => { shot(...focus(A.pablo, 300), 0.9); A.pablo.face(-1); }],
    [0.1, () => { A.pablo.hop(10); A.pablo.pose('belly'); A.pablo.expr({ happy: 1 }); }],
    [1.0, () => A.pablo.pose('down')],
  ],
  s10: [
    [0, () => shot(412, 300, 300, 1.0)],
    [0.85, () => bounce('pan')],
    [1.35, () => bounce('tomate')],
    [1.85, () => bounce('café')],
  ],
  s11: [
    [0, () => { shot(320, 290, 330, 0.9); A.carmen.face(-1); A.carmen.expr({ happy: 0.8 }); }],
    [0.5, () => A.carmen.pose('offer')],
    [2.1, () => A.carmen.pose('down')],
  ],
  s12: [
    [0, () => { shot(...focus(A.lucia, 280), 0.8); A.lucia.shake(); }],
    [0.9, () => A.lucia.expr({ happy: 1 })],
    [1.9, () => { props.zumo.g.style.display = ''; bounce('zumo'); A.carmen.nod(); }],
  ],
  s13: [
    [0, () => shot(450, 260, 760, 1.0)],
    [1.2, () => {
      knock();
      if (!instant) { bubble('¡Toc, toc!', () => ({ x: DOOR.x + DOOR.w / 2, y: FLOOR - DOOR.h - 30 }), 1.6); props.panel.dataset.shake = '0'; }
      for (const a of [A.lucia, A.pablo, A.carmen, A.javier]) { a.face(1); a.expr({ surprised: 1, happy: 0 }); }
      A.rufo.face(1); A.rufo.bark(); A.pablo.face(1);
    }],
  ],
  s14: [
    [0, () => { shot(520, 270, 560, 1.0); for (const a of [A.lucia, A.pablo, A.carmen, A.javier]) a.expr({ surprised: 0.3 }); }],
    [0.2, () => {
      A.lucia.sit(false); A.lucia.layer('front');
      A.lucia.walkTo(DOOR.x - 18, { speed: 150, face: 1, then: () => {
        A.lucia.pose('reach');
        later(0.35, () => { set(doorOpen, 1); A.lucia.pose('down'); });
        later(1.1, () => { A.lucia.face(-1); });
        later(1.6, () => { A.lucia.face(1); A.lucia.expr({ surprised: 0.6 }); });
      } });
    }],
  ],
  s15: [
    [0, () => { shot(DOOR.x + 20, FLOOR - 40, 260, 1.0); A.lucia.expr({ lookY: 1 }); }],
    [0.8, () => { if (!instant) { const ring = el('ellipse', { cx: DOOR.x + 40, cy: FLOOR - 4, rx: 24, ry: 7, fill: 'none', stroke: '#ffcf33', 'stroke-width': 4 }, layers.fx); effects.push({ g: ring, t: 0, dur: 1.2, update() { ring.setAttribute('opacity', Math.sin((this.t / 1.2) * Math.PI)); } }); } }],
  ],
  s16: [
    [0, () => { shot(DOOR.x - 10, 300, 300, 0.8); A.lucia.walkTo(DOOR.x + 14, { speed: 80, face: 1 }); }],
    [0.4, () => { set(A.lucia.sp.crouch, 1); A.lucia.pose('reach'); }],
    [0.95, () => pickLetter()],
    [1.15, () => { set(A.lucia.sp.crouch, 0); A.lucia.pose('hold'); A.lucia.expr({ lookY: 0.4, surprised: 0.8 }); A.lucia.face(-1); }],
    [1.5, () => { A.pablo.sit(false); A.pablo.walkTo(DOOR.x - 60, { speed: 190, face: 1 }); }],
  ],
  s17: [
    [0, () => { shot(DOOR.x - 30, 300, 320, 0.8); A.pablo.pose('point'); A.pablo.expr({ happy: 1, surprised: 0 }); A.pablo.hop(10); }],
    [0.3, () => { A.lucia.face(-1); A.lucia.expr({ lookY: 0 }); }],
    [1.4, () => { A.pablo.pose('down'); A.pablo.expr({ lookY: -0.5 }); }],
  ],
  s18: [
    [0, () => { shot(DOOR.x - 20, 290, 260, 0.8); A.lucia.pose('show'); A.lucia.expr({ surprised: 0.4, lookY: -0.6 }); }],
    [0.9, () => $('letter').classList.add('on')],
    [4.6, () => $('letter').classList.remove('on')],
  ],
  s19: [
    [0, () => { shot(...focus(A.lucia, 240), 0.6); A.lucia.pose('shrug'); A.lucia.expr({ surprised: 1, happy: 0, lookY: 0 }); A.lucia.face(-1); }],
    [0.9, () => { A.lucia.expr({ surprised: 0.2, happy: 1 }); A.lucia.hop(8); if (!instant) bubble('?', () => ({ x: A.lucia.x + 34, y: FLOOR - 175 }), 1.4); }],
  ],
};

const timers = [];
function later(s, fn) { if (instant) fn(); else timers.push({ at: clock + s, fn }); }

// ---------- playback ----------

let chapter, sentences, index = 0, clock = 0, sentStart = 0, beatIdx = 0, playing = false, ending = 0;

function seek(i) {
  initialState();
  timers.length = 0;
  instant = true;
  for (let k = 0; k < i; k++) for (const [, fn] of SCRIPT[sentences[k].id] || []) fn();
  instant = false;
  start(i);
}

function start(i) {
  index = i; sentStart = clock; beatIdx = 0; ending = 0;
  const s = sentences[i];
  speaker = A[s.who] || null;
  const name = s.who === 'narrator' ? '' : chapter.cast[s.who].name;
  $('subtitle').innerHTML = `<span class="who">${name || '&nbsp;'}</span>${s.text}`;
  audio.src = ROOT + chapter.audio[s.text].file;
  if (playing) audio.play().catch(() => {});
}

function tick(dt) {
  clock += dt;
  if (!sentences || !playing) return;
  const beats = SCRIPT[sentences[index].id] || [];
  const now = clock - sentStart;
  while (beatIdx < beats.length && beats[beatIdx][0] <= now) beats[beatIdx++][1]();
  for (let k = timers.length - 1; k >= 0; k--) if (timers[k].at <= clock) { const f = timers[k].fn; timers.splice(k, 1); f(); }
  const busy = Object.values(A).some((a) => a.path.length) || timers.length || beatIdx < beats.length;
  if (audio.ended) {
    if (!busy) ending += dt;
    if (ending > 0.6) {
      if (index + 1 < sentences.length) start(index + 1);
      else { playing = false; $('play').textContent = '▶'; }
    }
  }
}

const MAX_DT = +(new URLSearchParams(location.search).get('maxdt') || 0.05);
let last = performance.now();
let held = 0, boilT = 0, boil = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;
  if (FPS) { held += dt; if (held < 1 / FPS) { measure(); return; } dt = held; held = 0; }
  if (LOOK) { boilT += dt; if (boilT > 0.125) { boilT = 0; boil = (boil + 1) % LOOK.boil; svg.setAttribute('class', 'b' + boil); } }
  tick(dt);
  measure();
  for (const a of Object.values(A)) a.update(dt, clock);
  for (const p of Object.values(props)) if (p.bounce) { p.bounce.step(dt); p.g.setAttribute('transform', `translate(${p.x} ${p.y + p.bounce.v * 0.12})`); }
  doorOpen.step(dt);
  let jiggle = 0;
  if (props.panel.dataset.shake !== undefined) {
    const k = +props.panel.dataset.shake + dt;
    props.panel.dataset.shake = k;
    jiggle = k < 0.8 ? 2 * Math.sin(k * 40) * (1 - k / 0.8) : 0;
    if (k >= 0.8) delete props.panel.dataset.shake;
  }
  props.panel.setAttribute('transform', `translate(${jiggle} 0) scale(${1 - 0.82 * Math.max(0, Math.min(1.1, doorOpen.v))} 1)`);
  for (let k = effects.length - 1; k >= 0; k--) {
    const e = effects[k];
    e.t += dt; e.update(dt);
    if (e.t >= e.dur) { e.g.remove(); effects.splice(k, 1); }
  }
  for (const c of clouds) { c.x += c.speed * dt; if (c.x > 400) c.x = -1900; c.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.s})`); }
  layers.bus.setAttribute('transform', `translate(${-1950 + ((clock * 90) % 1150)} ${FLOOR + 20})`);
  layers.flag.setAttribute('transform', layers.flag.getAttribute('transform').replace(/ skewY\([^)]*\)/, '') + ` skewY(${4 * Math.sin(clock * 5)})`);
  updateCamera(dt);
}

// style picker and paper grain
const VARIANTS = [
  ['Tinta', 'style=ink&motion=peppa'],
  ['Ceras', 'style=crayon&motion=peppa'],
  ['Plano', 'style=flat&motion=peppa'],
  ['Plano, con muelles', 'style=flat&motion=springy'],
];
for (const [label, q] of VARIANTS) {
  const here = new URLSearchParams(q);
  const on = here.get('style') === STYLE && here.get('motion') === MOTION;
  const link = document.createElement('a');
  link.className = 'chip' + (on ? ' on' : '');
  link.href = '?' + q;
  link.textContent = label;
  $('styles').appendChild(link);
}
if (LOOK) {
  const grain = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .35  0 0 0 .55 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>`;
  $('paper').style.backgroundImage = `url("data:image/svg+xml;utf8,${grain}")`;
  $('paper').hidden = false;
}

async function boot() {
  const [ch, au] = await Promise.all([
    fetch(ROOT + 'content/es/ch01.json').then((r) => r.json()),
    fetch(ROOT + 'content/es/ch01.audio.json').then((r) => r.json()),
  ]);
  chapter = ch; chapter.audio = au;
  sentences = ch.sentences;
  seek(0);
  window.mowaScene = { seek, A, get index() { return index; }, get clock() { return clock; }, setPlaying: (p) => { playing = p; } };
}

$('start').onclick = () => {
  initAudio();
  $('overlay').hidden = true;
  playing = true;
  seek(0);
};
$('play').onclick = () => {
  playing = !playing;
  $('play').textContent = playing ? '⏸' : '▶';
  if (playing) { initAudio(); $('overlay').hidden = true; if (audio.ended) seek(index); else audio.play().catch(() => {}); } else audio.pause();
};
$('prev').onclick = () => seek(Math.max(0, index - (clock - sentStart < 1.5 ? 1 : 0)));
$('next').onclick = () => seek(Math.min(sentences.length - 1, index + 1));

requestAnimationFrame(frame);
boot().catch((e) => { $('subtitle').textContent = 'Error: ' + e.message; console.error(e); });
