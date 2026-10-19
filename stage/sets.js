// The places of the Spanish stories: Bilbao from the river, Ane's street,
// the family kitchen, the Plaza Nueva and a pintxo bar.
import { el, rect, circle, ellipse, path, line, text, item, props, rt, FLOOR, shade } from './engine.js';

export function sky(x0, x1, color = '#bfe6ff', { sun = true, grey = false } = {}) {
  const p = rt.layers.sky;
  rect(p, x0, -400, x1 - x0, 1000, color);
  if (sun) circle(p, x0 + 250, 70, 38, '#ffd35a');
  for (let x = x0 + 150, k = 0; x < x1; x += 360, k++) {
    const s = 0.8 + 0.3 * ((k * 7) % 3) / 2, y = 40 + ((k * 37) % 50);
    const g = el('g', {}, p);
    for (const [cx, cy, r] of [[0, 0, 26], [28, -10, 30], [58, 0, 24], [30, 10, 24]]) circle(g, cx, cy, r, grey ? '#e6ebef' : '#ffffff');
    rt.clouds.push({ g, x, y, s, speed: 5 + 4 * s, x0, x1 });
  }
}

// --- Bilbao seen across the river: green hills, the Guggenheim, Puppy, the red arch ---
export function bilbaoCity() {
  const p = rt.layers.city;
  for (const [cx, cy, rx, ry, c] of [[-1750, 330, 300, 170, '#86b86f'], [-1400, 340, 340, 200, '#76a960'], [-1020, 330, 280, 160, '#86b86f']]) ellipse(p, cx, cy, rx, ry, c);
  // houses on the far hillside
  const cols = ['#f2e1c1', '#e98a5c', '#f6d7a7', '#d96c4a', '#efb27a', '#f4c27a'];
  for (let k = 0; k < 16; k++) {
    const x = -1880 + k * 60 + ((k * 13) % 20), h = 40 + ((k * 29) % 50);
    rect(p, x, FLOOR - 70 - h, 44, h, cols[k % cols.length]);
    rect(p, x - 2, FLOOR - 74 - h, 48, 6, '#9c5638');
    for (let wy = FLOOR - 62 - h; wy < FLOOR - 80; wy += 16) rect(p, x + 8, wy, 9, 9, '#7cc4e8'), rect(p, x + 26, wy, 9, 9, '#7cc4e8');
  }
  // the Guggenheim: curved titanium shells and a glass hall
  const g = el('g', {}, p);
  const base = FLOOR - 70;
  path(g, `M-1440 ${base} C-1440 ${base - 90} -1400 ${base - 140} -1345 ${base - 128} C-1310 ${base - 120} -1318 ${base - 70} -1280 ${base - 70} L-1280 ${base} Z`, '#c4ccd3');
  rect(g, -1330, base - 62, 90, 62, '#8ec9e6');
  for (let x = -1318; x < -1240; x += 16) line(g, x, base - 62, x, base, '#5d9ab8', 2);
  path(g, `M-1270 ${base} L-1262 ${base - 190} C-1258 ${base - 214} -1228 ${base - 214} -1224 ${base - 192} L-1214 ${base} Z`, '#aab5bf');
  path(g, `M-1240 ${base} C-1250 ${base - 110} -1190 ${base - 175} -1130 ${base - 160} C-1090 ${base - 150} -1110 ${base - 95} -1068 ${base - 84} C-1040 ${base - 76} -1030 ${base - 40} -1028 ${base} Z`, '#dbe1e6');
  path(g, `M-1180 ${base} C-1190 ${base - 70} -1150 ${base - 108} -1110 ${base - 100} C-1080 ${base - 92} -1092 ${base - 50} -1070 ${base - 40} L-1068 ${base} Z`, '#b9c3cb');
  for (const d of [`M-1420 ${base - 40} C-1400 ${base - 100} -1370 ${base - 120} -1330 ${base - 112}`, `M-1225 ${base - 40} C-1220 ${base - 110} -1180 ${base - 150} -1130 ${base - 140}`, `M-1160 ${base - 30} C-1160 ${base - 70} -1130 ${base - 92} -1100 ${base - 86}`])
    path(g, d, 'none', { stroke: '#f3f6f8', 'stroke-width': 3, 'stroke-linecap': 'round' });
  props.museum = { x: -1230, y: base - 100 };
  // Puppy, the dog made of flowers
  const pup = el('g', { transform: `translate(-1530 ${base})` }, p);
  path(pup, 'M-34 0 L-30 -40 L-12 -40 L-10 0 Z M10 0 L12 -40 L30 -40 L34 0 Z', '#4f9a52');
  ellipse(pup, 0, -58, 44, 26, '#5cb85c');
  circle(pup, 38, -96, 26, '#5cb85c');
  ellipse(pup, 22, -84, 10, 22, '#4f9a52');
  const flowers = ['#e8485f', '#f5a623', '#ffd35a', '#c56cf0', '#ff8fb1', '#ffffff'];
  for (let k = 0; k < 70; k++) {
    const a = k * 2.4, r = 6 + (k % 9) * 4;
    const [x, y] = k < 45 ? [Math.cos(a) * r * 1.4, -58 + Math.sin(a) * r * 0.55] : [38 + Math.cos(a) * (r % 22), -96 + Math.sin(a) * (r % 22)];
    circle(pup, x, y, 3.2, flowers[k % flowers.length]);
  }
  circle(pup, 50, -100, 3.5, '#2b1a12');
  props.puppy = { x: -1530, y: base - 70 };
  // the red arch of La Salve bridge
  path(p, `M-1010 ${base} L-1010 ${base - 150} Q-940 ${base - 200} -870 ${base - 150} L-870 ${base} L-892 ${base} L-892 ${base - 140} Q-940 ${base - 172} -988 ${base - 140} L-988 ${base} Z`, '#d9342b');
  // the river and the walk along it
  rect(p, -1950, base, 1100, 52, '#5aa7cc');
  for (let x = -1930; x < -870; x += 46) path(p, `M${x} ${base + 18 + (x % 3) * 8} q8 -5 16 0 t16 0`, 'none', { stroke: '#a9dcf2', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
  props.river = { x: -1650, y: base + 26 };
  rect(p, -1950, FLOOR - 18, 1100, 160, '#b9b2a6');
  rect(p, -1950, FLOOR - 22, 1100, 6, '#6b6b6b');
  for (let x = -1940; x < -860; x += 26) line(p, x, FLOOR - 22, x, FLOOR - 50, '#6b6b6b', 2.5);
  line(p, -1950, FLOOR - 50, -850, FLOOR - 50, '#6b6b6b', 3);
}

// --- Ane's street: a block of flats with white glass galleries (miradores) ---
export function aneStreet({ wet = false } = {}) {
  const p = rt.layers.house;
  rect(p, -900, FLOOR - 10, 830, 140, wet ? '#7f858a' : '#9a9a9a');
  rect(p, -900, FLOOR - 16, 830, 10, '#d8d0c2');
  if (wet) for (const x of [-820, -560, -300, -160]) ellipse(p, x, FLOOR + 30, 40, 5, '#a9b8c4');
  for (const [x, w, h, c] of [[-880, 150, 230, '#e9c9a0'], [-260, 170, 250, '#cfd8c4']]) {
    rect(p, x, FLOOR - 16 - h, w, h, c);
    for (let wy = FLOOR - h + 6; wy < FLOOR - 70; wy += 60) for (let wx = x + 22; wx < x + w - 30; wx += 52) rect(p, wx, wy, 26, 36, '#7cc4e8', { rx: 2 });
  }
  const bx = -640, bw = 360, bh = 340, top = FLOOR - 16 - bh;
  rect(p, bx, top, bw, bh, '#efd6ae');
  rect(p, bx - 8, top - 12, bw + 16, 14, '#8a5a3a');
  for (let floor = 0; floor < 4; floor++) {
    const y = top + 22 + floor * 72;
    // two glass galleries per floor, white frames with small panes
    for (const gx of [bx + 22, bx + 196]) {
      rect(p, gx - 4, y - 4, 150, 60, '#ffffff', { rx: 2 });
      for (let k = 0; k < 4; k++) rect(p, gx + 2 + k * 36, y + 2, 30, 48, floor === 2 && gx === bx + 22 && k === 1 ? '#ffe28a' : '#8fcbe8');
      rect(p, gx - 8, y + 54, 158, 6, '#e8e8e8');
    }
  }
  rect(p, bx + bw / 2 - 28, FLOOR - 16 - 74, 56, 74, '#5b3a24', { rx: 4 });
  rect(p, bx + bw / 2 - 22, FLOOR - 16 - 68, 44, 30, '#8fcbe8', { rx: 3 });
  props.homeWindow = { x: bx + 22 + 2 + 36 + 15, y: top + 22 + 2 * 72 + 26 };
  props.homeDoor = { x: bx + bw / 2 };
}

// --- the kitchen; the table stands in front of the parents and behind the children ---
export function kitchen() {
  const p = rt.layers.room;
  const DOOR = { x: 680, w: 92, h: 196 };
  rect(p, -40, -200, 880, FLOOR + 200, '#ffe7c2');
  rect(p, -40, FLOOR - 70, 880, 8, '#f1c98f');
  rect(p, -40, FLOOR, 880, 200, '#c98f5a');
  for (let x = -40; x < 840; x += 90) line(p, x, FLOOR, x - 40, FLOOR + 120, '#b57c4a', 3);
  // window with curtains
  rect(p, 110, 80, 160, 150, '#bfe6ff', { rx: 6 });
  circle(p, 150, 150, 18, '#ffffff'); circle(p, 172, 142, 20, '#ffffff');
  rect(p, 104, 74, 172, 162, 'none', { rx: 8, stroke: '#ffffff', 'stroke-width': 10 });
  rect(p, 186, 80, 8, 150, '#ffffff');
  path(p, 'M92 64 Q120 150 102 246 L82 246 L82 64 Z', '#e8485f');
  path(p, 'M288 64 Q260 150 278 246 L298 246 L298 64 Z', '#e8485f');
  rect(p, 78, 58, 224, 10, '#a35b2f', { rx: 5 });
  // a picture of the museum, and a shelf
  rect(p, 360, 100, 70, 56, '#8a5a34', { rx: 4 }); rect(p, 368, 108, 54, 40, '#bfe6ff');
  path(p, 'M372 148 C372 130 384 118 396 124 C404 128 402 140 412 140 C418 140 420 144 420 148 Z', '#c4ccd3');
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
  const carta = letter(p);
  const door = el('g', { transform: `translate(${DOOR.x} 0)` }, p);
  const panel = el('g', {}, door);
  rect(panel, 0, FLOOR - DOOR.h, DOOR.w, DOOR.h, '#b5652b', { rx: 3 });
  rect(panel, 12, FLOOR - DOOR.h + 16, DOOR.w - 24, 70, '#a1561f', { rx: 4 });
  rect(panel, 12, FLOOR - DOOR.h + 100, DOOR.w - 24, 80, '#a1561f', { rx: 4 });
  circle(panel, DOOR.w - 14, FLOOR - 92, 6, '#f2c94c');
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
  const t = rt.layers.table;
  rect(t, 304, FLOOR - 82, 216, 12, '#c0773d', { rx: 6 });
  rect(t, 316, FLOOR - 72, 10, 72, '#a35b2f'); rect(t, 498, FLOOR - 72, 10, 72, '#a35b2f');
  const top = FLOOR - 82;
  item(t, 'plateL', 330, top, (g) => ellipse(g, 0, -2, 18, 4, '#ffffff'));
  item(t, 'plateR', 494, top, (g) => ellipse(g, 0, -2, 18, 4, '#ffffff'));
  item(t, 'pan', 412, top, (g) => {
    path(g, 'M-26 0 L-22 -14 L22 -14 L26 0 Z', '#b07a3c');
    ellipse(g, -6, -18, 20, 8, '#e3a95e');
    ellipse(g, 8, -21, 16, 7, '#d9984a');
  });
  item(t, 'tomate', 452, top, (g) => {
    circle(g, 0, -9, 9, '#e5352b'); circle(g, 15, -7, 7, '#e5352b');
    path(g, 'M-4 -18 L0 -15 L4 -18 L0 -21 Z', '#3f9a2a'); path(g, 'M11 -14 L15 -12 L19 -14 L15 -16 Z', '#3f9a2a');
  });
  item(t, 'café', 365, top, (g) => {
    path(g, 'M-10 0 L-12 -30 Q0 -40 12 -30 L10 0 Z', '#4a4a52');
    path(g, 'M12 -24 Q22 -20 14 -10', 'none', { stroke: '#4a4a52', 'stroke-width': 4 });
    path(g, 'M-12 -28 L-20 -32', 'none', { stroke: '#4a4a52', 'stroke-width': 4, 'stroke-linecap': 'round' });
    rect(g, 18, -12, 14, 12, '#ffffff', { rx: 2 });
  });
  item(t, 'zumo', 344, top, (g) => {
    rect(g, -6, -22, 12, 22, '#ffffff', { rx: 2, opacity: 0.6 });
    rect(g, -5, -17, 10, 16, '#f5a01b', { rx: 2 });
  });
  return { DOOR, door, panel, carta, SEAT: { ane: 262, iker: 558 } };
}

// an envelope with a red seal
export function letter(parent) {
  const g = el('g', {}, parent);
  rect(g, -14, -6, 28, 19, '#ffffff', { rx: 1, stroke: '#d9d0c0', 'stroke-width': 1 });
  path(g, 'M-14 -6 L0 5 L14 -6', 'none', { stroke: '#d9d0c0', 'stroke-width': 1 });
  circle(g, 0, 4, 3, '#c62828');
  return g;
}

// an umbrella held from below; the hand is at (0, 0)
export function umbrella(color, dx = 0) {
  const g = el('g', {});
  const top = -96;
  line(g, 0, 10, dx, top, '#4a3a30', 2.4);
  path(g, 'M0 10 q0 9 -7 9', 'none', { stroke: '#4a3a30', 'stroke-width': 2.6, 'stroke-linecap': 'round' });
  path(g, `M${dx - 48} ${top + 8} Q${dx - 46} ${top - 40} ${dx} ${top - 44} Q${dx + 46} ${top - 40} ${dx + 48} ${top + 8} Q${dx + 36} ${top - 2} ${dx + 24} ${top + 8} Q${dx + 12} ${top - 2} ${dx} ${top + 8} Q${dx - 12} ${top - 2} ${dx - 24} ${top + 8} Q${dx - 36} ${top - 2} ${dx - 48} ${top + 8} Z`, color);
  path(g, `M${dx} ${top - 44} Q${dx - 14} ${top - 20} ${dx - 24} ${top + 8} M${dx} ${top - 44} Q${dx + 14} ${top - 20} ${dx + 24} ${top + 8}`, 'none', { stroke: shade(color, 0.8), 'stroke-width': 1.6 });
  line(g, dx, top - 44, dx, top - 52, '#4a3a30', 2.4);
  return g;
}

// a small map of Spain with Bilbao marked in the north
export function spainMap(g) {
  rect(g, -110, -86, 220, 172, '#ffffff', { rx: 14, stroke: '#333', 'stroke-width': 2 });
  const pts = [[0.02, 0.2], [0.06, 0.1], [0.3, 0.12], [0.62, 0.1], [0.8, 0.18], [0.98, 0.28], [0.9, 0.42], [0.82, 0.55], [0.74, 0.72], [0.56, 0.9], [0.4, 0.97], [0.3, 0.86], [0.24, 0.72], [0.2, 0.52], [0.22, 0.32], [0.12, 0.28]];
  path(g, 'M' + pts.map(([x, y]) => `${-90 + x * 180} ${-74 + y * 140}`).join(' L') + ' Z', '#f7d58b', { stroke: '#c79a3c', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  const bx = -90 + 0.47 * 180, by = -74 + 0.16 * 140;
  circle(g, bx, by, 6, '#e5352b', { stroke: '#ffffff', 'stroke-width': 2 });
  text(g, bx, by + 24, 'Bilbao', { 'font-size': 15, fill: '#333' });
  text(g, 0, -60 + 140, 'España', { 'font-size': 12, fill: '#8a6a2a', 'font-weight': 400 });
}

// the flag of Argentina, as a card
export function argentinaFlag(g) {
  rect(g, -56, -38, 112, 76, '#ffffff', { rx: 6, stroke: '#333', 'stroke-width': 2 });
  rect(g, -50, -32, 100, 21, '#74acdf'); rect(g, -50, 11, 100, 21, '#74acdf');
  circle(g, 0, 0, 8, '#f6b40e');
}

// --- the Plaza Nueva: stone arcades with bars, and a clock ---
export function plaza() {
  const p = rt.layers.city;
  rect(p, -60, FLOOR - 4, 1120, 200, '#bdb4a6');
  for (let x = -60; x < 1060; x += 60) line(p, x, FLOOR - 4, x - 30, FLOOR + 140, '#a9a093', 2);
  for (let y = FLOOR + 20; y < FLOOR + 140; y += 30) line(p, -60, y, 1060, y, '#a9a093', 2);
  const top = 30, arch = 150;
  rect(p, -60, top, 1120, FLOOR - 4 - top, '#e2cc9c');
  rect(p, -60, top - 14, 1120, 16, '#c9ae78');
  // the middle building with a pediment and the clock
  path(p, `M380 ${top - 14} L500 ${top - 70} L620 ${top - 14} Z`, '#e2cc9c');
  path(p, `M380 ${top - 14} L500 ${top - 70} L620 ${top - 14}`, 'none', { stroke: '#c9ae78', 'stroke-width': 8, 'stroke-linejoin': 'round' });
  circle(p, 500, top - 28, 20, '#ffffff', { stroke: '#5a4632', 'stroke-width': 3 });
  line(p, 500, top - 28, 500, top - 42, '#333', 2.4);
  line(p, 500, top - 28, 491, top - 28, '#333', 3);
  props.clock = { x: 500, y: top - 28 };
  // windows with iron balconies on two floors
  for (const y of [top + 30, top + 120]) for (let x = -30; x < 1040; x += 80) {
    rect(p, x, y, 34, 56, '#6f8fa3', { rx: 2 });
    rect(p, x - 4, y - 6, 42, 6, '#c9ae78');
    rect(p, x - 6, y + 40, 46, 4, '#2d2d2d');
    for (let k = 0; k < 6; k++) line(p, x - 4 + k * 8.4, y + 44, x - 4 + k * 8.4, y + 56, '#2d2d2d', 1.4);
  }
  rect(p, -60, FLOOR - 4 - arch - 18, 1120, 14, '#c9ae78');
  // the arcade: round arches, warm inside, a bar sign over some
  const signs = { 0: ['BAR', '#2e7d4f'], 2: ['TXOKO', '#b5452b'], 6: ['PINTXOS', '#2d5f9a'], 8: ['BAR', '#7a3b8f'] };
  for (let k = 0, x = -40; x < 1040; k++, x += 112) {
    path(p, `M${x} ${FLOOR - 4} L${x} ${FLOOR - arch + 30} A40 40 0 0 1 ${x + 80} ${FLOOR - arch + 30} L${x + 80} ${FLOOR - 4} Z`, '#6d5844');
    path(p, `M${x + 8} ${FLOOR - 4} L${x + 8} ${FLOOR - 70} L${x + 72} ${FLOOR - 70} L${x + 72} ${FLOOR - 4} Z`, '#8a6e52');
    rect(p, x + 14, FLOOR - 64, 52, 30, '#ffe7a8', { rx: 2 });
    if (signs[k]) {
      const [s, c] = signs[k];
      rect(p, x + 6, FLOOR - arch + 4, 68, 18, c, { rx: 3 });
      text(p, x + 40, FLOOR - arch + 18, s, { 'font-size': 12, fill: '#ffffff' });
    }
  }
  // two iron street lamps
  for (const x of [120, 880]) {
    rect(p, x - 3, FLOOR - 170, 6, 170, '#2d2d2d');
    rect(p, x - 10, FLOOR - 8, 20, 8, '#2d2d2d');
    path(p, `M${x - 12} ${FLOOR - 170} L${x + 12} ${FLOOR - 170} L${x + 8} ${FLOOR - 196} L${x - 8} ${FLOOR - 196} Z`, '#fff1b8', { stroke: '#2d2d2d', 'stroke-width': 3 });
  }
}

// --- a pintxo bar: a long counter with pintxos, a waiter behind it ---
export function bar(x0 = 1300) {
  const p = rt.layers.room;
  rect(p, x0 - 40, -200, 900, FLOOR + 200, '#f3e4c8');
  for (let x = x0 - 40; x < x0 + 860; x += 26) for (let y = FLOOR - 150; y < FLOOR; y += 26) rect(p, x + 1, y + 1, 24, 24, (x / 26 + y / 26) % 2 ? '#d9eaf0' : '#ffffff');
  rect(p, x0 - 40, FLOOR, 900, 200, '#a8744a');
  // shelves with bottles, and a blackboard
  for (const y of [120, 190]) {
    rect(p, x0 + 60, y, 300, 8, '#8a4b20', { rx: 3 });
    for (let k = 0; k < 9; k++) {
      const bx = x0 + 74 + k * 32, c = ['#3f7d4f', '#7a2e3a', '#c99a2e', '#3b5f8a'][k % 4];
      rect(p, bx, y - 34, 14, 34, c, { rx: 4 }); rect(p, bx + 4, y - 44, 6, 12, c);
    }
  }
  rect(p, x0 + 420, 70, 220, 130, '#2f3b36', { rx: 6, stroke: '#8a4b20', 'stroke-width': 8 });
  text(p, x0 + 530, 112, 'PINTXOS', { 'font-size': 26, fill: '#ffffff' });
  for (const [i, s] of ['tortilla', 'queso', 'jamón'].entries()) text(p, x0 + 530, 140 + i * 20, s, { 'font-size': 16, fill: '#ffe7a8', 'font-weight': 400 });
  // the door to the rainy street
  rect(p, x0 + 720, FLOOR - 200, 100, 200, '#bfd0dc', { stroke: '#5b3a24', 'stroke-width': 8 });
  props.barDoor = { x: x0 + 770 };
  // the counter, in front of the waiter
  const t = rt.layers.table;
  const top = FLOOR - 84, cx0 = x0 + 40, cw = 560;
  rect(t, cx0, top, cw, 84, '#8a4b20', { rx: 4 });
  for (let x = cx0 + 20; x < cx0 + cw - 20; x += 90) rect(t, x, top + 18, 70, 50, '#7a4019', { rx: 4 });
  rect(t, cx0 - 8, top - 10, cw + 16, 12, '#e8e2d8', { rx: 4 });
  const plate = (g) => ellipse(g, 0, 0, 24, 5, '#ffffff', { stroke: '#d8d0c4', 'stroke-width': 1 });
  const bread = (g) => rect(g, -12, -9, 24, 8, '#e7b26a', { rx: 3 });
  const pick = (g) => line(g, 0, -26, 0, -2, '#c9a066', 1.6);
  const y = top - 10;
  item(t, 'tortilla', cx0 + 50, y, (g) => { plate(g); bread(g); path(g, 'M-12 -9 L12 -9 L8 -24 L-8 -24 Z', '#f2c94c'); path(g, 'M-8 -24 L8 -24 L9 -21 L-9 -21 Z', '#d9a63a'); pick(g); });
  item(t, 'queso', cx0 + 120, y, (g) => { plate(g); bread(g); path(g, 'M-12 -9 L12 -9 L-4 -22 Z', '#ffd84d'); circle(g, 0, -13, 2, '#f0b92e'); pick(g); });
  item(t, 'jamón', cx0 + 190, y, (g) => { plate(g); bread(g); path(g, 'M-13 -9 Q-6 -20 0 -12 Q6 -22 13 -9 Z', '#d6505a'); path(g, 'M-9 -11 Q-4 -15 0 -12', 'none', { stroke: '#f3c4c4', 'stroke-width': 1.6 }); pick(g); });
  item(t, 'más', cx0 + 260, y, (g) => { plate(g); bread(g); circle(g, -4, -13, 5, '#3f9a2a'); circle(g, 5, -13, 5, '#e5352b'); pick(g); });
  // Txiki's bowl of water, on the floor
  item(rt.layers.front, 'bowl', x0 + 610, FLOOR, (g) => { path(g, 'M-20 0 L-16 -12 L16 -12 L20 0 Z', '#e2445c'); ellipse(g, 0, -12, 16, 3.5, '#8fcbe8'); });
  return { top, x0 };
}
