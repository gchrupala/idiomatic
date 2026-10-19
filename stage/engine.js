/*
 * The animated stage: flat 2D cut-out characters drawn and moved in SVG.
 *
 * Every moving part is a damped spring, so motion overshoots and settles
 * instead of moving linearly: a hopping walk, cartoon turns, squash on
 * landing, arm gestures bent at the elbow, head bob when talking, blinking
 * and lip-sync from the loudness of the sentence audio.
 *
 * A story module (bilbao.js, plaza.js) draws its sets, places its cast and
 * gives each sentence a list of beats: [seconds into the sentence, action].
 * Actions only set targets, so a seek replays all earlier beats at once
 * (`rt.instant`) and any sentence can be started from a correct picture.
 */

export const NS = 'http://www.w3.org/2000/svg';
export const FLOOR = 400;

// Shared state of the one stage on the page.
export const rt = { instant: false, layers: null, svg: null, clock: 0, speaker: null, mouthLevel: 0, effects: [], timers: [], clouds: [], note: null };

export function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export const shade = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * f)).toString(16).padStart(2, '0')).join('');

// A damped spring. Low damping overshoots and wobbles; that is the cartoon feel.
export class Spring {
  constructor(v = 0, k = 120, d = 14) { this.v = v; this.target = v; this.vel = 0; this.k = k; this.d = d; }
  step(dt) {
    // small substeps keep stiff springs stable on slow frames
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

const M = { flipK: 1600, flipD: 80, armK: 210, armD: 24, stride: 6.5, bob: 2.5, swing: 24, talkRock: 5, talkHz: 5.5, levelRock: 2, squash: 0.03 };

export const set = (spring, v) => { spring.target = v; if (rt.instant) spring.snap(v); };
export function later(s, fn) { if (rt.instant) fn(); else rt.timers.push({ at: rt.clock + s, fn }); }

// ---------- drawing ----------

const roundRect = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
export const rect = (p, x, y, w, h, fill, extra = {}) => el('rect', { x, y, width: w, height: h, fill, ...extra }, p);
export const circle = (p, cx, cy, r, fill, extra = {}) => el('circle', { cx, cy, r, fill, ...extra }, p);
export const ellipse = (p, cx, cy, rx, ry, fill, extra = {}) => el('ellipse', { cx, cy, rx, ry, fill, ...extra }, p);
export const path = (p, d, fill, extra = {}) => el('path', { d, fill, ...extra }, p);
export const line = (p, x1, y1, x2, y2, color, w, extra = {}) => el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', ...extra }, p);
export const text = (p, x, y, s, extra = {}) => { const t = el('text', { x, y, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-weight': 700, ...extra }, p); t.textContent = s; return t; };
export { roundRect };

// ---------- characters ----------

// Arm poses: [upper, forearm] for the front and the back arm, in degrees.
// 0 hangs down, negative swings forwards; the forearm angle is relative to the
// upper arm and always keeps some bend. Never a straight raised arm: it reads
// as a salute.
const G = {
  down: [12, 50, 10, 52], offer: [-18, -72, -4, -10], point: [-38, -42, -4, -10], reach: [-48, -22, -6, -10],
  hold: [-8, -96, -4, -12], show: [-26, -104, -4, -12], yay: [166, 6, 176, 2], belly: [-6, -84, 2, -80],
  shrug: [12, -100, -10, -100], behind: [16, 40, 14, 40], hips: [26, 80, 24, 80],
};
const CARRY = [-14, -128]; // the back arm holding an umbrella up

export class Person {
  // Local coordinates: facing right, origin between the feet, y up is negative.
  constructor(id, o) {
    Object.assign(this, { id, o });
    const L = o.leg, B = o.body, R = o.head;
    this.L = L; this.B = B; this.R = R;
    this.root = el('g', {}, rt.layers.front);
    this.flipG = el('g', {}, this.root);
    this.squashG = el('g', {}, this.flipG);
    this.scaleG = el('g', { transform: `scale(${o.scale})` }, this.squashG);
    this.bodyG = el('g', {}, this.scaleG);
    const skinDark = shade(o.skin, 0.9);

    // legs: thigh and shin, each turning at its joint; shoes point forward
    this.T = L * 0.5; this.S = L * 0.5;
    const legColor = o.trousers || o.skin;
    this.legs = [0.86, 1].map((f) => {
      const hip = el('g', {}, this.bodyG);
      const tw = o.trousers ? 11 : 9;
      path(hip, `M${-tw / 2} 0 L${tw / 2} 0 L${tw / 2 - 1} ${this.T} L${-tw / 2 + 1} ${this.T} Z`, shade(legColor, f));
      const knee = el('g', { transform: `translate(0 ${this.T})` }, hip);
      circle(knee, 0, 0, tw / 2 - 1, shade(legColor, f));
      path(knee, `M${-tw / 2 + 1} 0 L${tw / 2 - 1} 0 L${tw / 2 - 2} ${this.S - 2} L${-tw / 2 + 2} ${this.S - 2} Z`, shade(o.trousers ? legColor : o.skin, f));
      const sh = o.shoes;
      path(knee, `M-6 ${this.S - 6} Q-7 ${this.S + 1} -2 ${this.S + 1} L12 ${this.S + 1} Q15 ${this.S} 12 ${this.S - 4} Q6 ${this.S - 8} -6 ${this.S - 6} Z`, shade(sh, f));
      if (o.trousers) rect(knee, -6, this.S - 1, 19, 2.5, shade('#ffffff', f), { rx: 1 });
      return { hip, knee };
    });

    // arms: upper arm and forearm, bent at the elbow
    this.U = B * 0.46; this.F = B * 0.42;
    const arm = (sleeve, skin) => {
      const shoulder = el('g', {}, this.bodyG);
      line(shoulder, 0, 0, 0, this.U, sleeve, 8.5);
      const elbow = el('g', { transform: `translate(0 ${this.U})` }, shoulder);
      line(elbow, 0, 0, 0, this.F - 3, sleeve, 8);
      el('ellipse', { cx: 0.5, cy: this.F - 0.5, rx: 3.9, ry: 4.6, fill: skin }, elbow);
      const hand = el('g', { transform: `translate(0 ${this.F})` }, elbow);
      return { shoulder, elbow, hand };
    };
    this.armBack = arm(shade(o.top, 0.86), skinDark);

    // body: a dress, or a shirt or jacket over trousers; a darker band gives it form
    const top = -L - B, waist = top + B * 0.42;
    this.shoulderY = top + 7;
    if (o.trousers) {
      rect(this.bodyG, -11, -L - 6, 22, 12, o.trousers, { rx: 4 });
      path(this.bodyG, `M-12 ${top + 4} Q0 ${top - 3} 12 ${top + 4} L13 ${-L + 2} Q0 ${-L + 6} -13 ${-L + 2} Z`, o.top);
      path(this.bodyG, `M-12 ${top + 4} Q-8 ${top + 1} -5 ${top} L-7 ${-L + 4} L-13 ${-L + 2} Z`, shade(o.top, 0.9));
      if (o.apron) path(this.bodyG, `M-2 ${top + 14} L12 ${top + 12} L14 ${-L + 18} L0 ${-L + 20} Z`, o.apron);
    } else {
      const hem = -L * 0.6;
      path(this.bodyG, `M-11 ${top + 4} Q0 ${top - 3} 11 ${top + 4} L12 ${waist} L23 ${hem} Q0 ${hem + 6} -23 ${hem} L-12 ${waist} Z`, o.top);
      path(this.bodyG, `M-11 ${top + 4} Q-8 ${top + 1} -5 ${top} L-6 ${waist} L-12 ${hem + 2} L-23 ${hem} L-12 ${waist} Z`, shade(o.top, 0.9));
    }
    if (o.collar) {
      circle(this.bodyG, -4.5, top + 2, 5.5, o.collar);
      circle(this.bodyG, 5, top + 2, 5.5, o.collar);
    }
    rect(this.bodyG, -3.5, top - 9, 7.5, 12, skinDark, { rx: 3 });
    if (o.scarf) {
      path(this.bodyG, `M-9 ${top - 2} Q0 ${top + 4} 10 ${top - 2} L10 ${top + 4} Q0 ${top + 10} -9 ${top + 4} Z`, o.scarf);
      path(this.bodyG, `M5 ${top + 4} L12 ${top + 30} L5 ${top + 31} L1 ${top + 6} Z`, shade(o.scarf, 0.9));
      for (const y of [top + 22, top + 26]) line(this.bodyG, 6, y, 11, y - 1, '#ffffff', 1.4);
    }

    // head
    this.headG = el('g', {}, this.bodyG);
    const h = this.headG, cx = R * 0.1, cy = -R * 0.95;
    const P = (x, y) => `${cx + R * x} ${cy + R * y}`;
    const hair = HAIR[o.hairStyle](P, R);
    const hairDark = shade(o.hair, 0.82);
    if (hair.back) path(h, hair.back, hairDark);
    if (o.hairStyle === 'bun') circle(h, cx - R * 0.9, cy - R * 0.5, R * 0.36, hairDark);
    if (hair.curls) for (const [x, y, r] of hair.curls) circle(h, cx + R * x, cy + R * y, R * r, hairDark);
    el('ellipse', { cx, cy, rx: R * 0.95, ry: R, fill: o.skin }, h);
    el('ellipse', { cx: cx + R * 0.93, cy: cy + R * 0.06, rx: R * 0.13, ry: R * 0.12, fill: shade(o.skin, 0.97) }, h);
    el('ellipse', { cx: cx + R * 0.08, cy: cy + R * 0.32, rx: R * 0.17, ry: R * 0.1, fill: '#ff8f8f', opacity: 0.4 }, h);
    if (o.beard && hair.beard) path(h, hair.beard, o.hair);
    // eyes: white, big dark iris, a highlight; the far eye is a little smaller
    const eyeK = o.eyes || 1;
    this.eyes = [[0.2, 0.0, 1], [0.64, -0.02, 0.86]].map(([ex, ey, k]) => {
      const g = el('g', { transform: `translate(${cx + R * ex} ${cy + R * ey}) scale(${k * eyeK})` }, h);
      const inner = el('g', {}, g);
      el('ellipse', { cx: 0, cy: 0, rx: R * 0.17, ry: R * 0.22, fill: '#ffffff' }, inner);
      const iris = el('g', {}, inner);
      circle(iris, R * 0.045, R * 0.03, R * 0.145, '#2b1a12');
      circle(iris, R * 0.095, -R * 0.04, R * 0.055, '#ffffff');
      circle(iris, R * 0.0, R * 0.1, R * 0.025, '#ffffff', { opacity: 0.7 });
      path(inner, `M${-R * 0.17} ${-R * 0.04} Q0 ${-R * 0.27} ${R * 0.17} ${-R * 0.04}`, 'none', { stroke: '#2b1a12', 'stroke-width': 1.3 });
      if (o.lashes) path(inner, `M${-R * 0.16} ${-R * 0.07} l${-R * 0.08} ${-R * 0.06}`, 'none', { stroke: '#2b1a12', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
      return { g: inner, iris };
    });
    if (o.glasses) {
      const gl = { fill: 'none', stroke: o.glasses, 'stroke-width': 1.6 };
      el('ellipse', { cx: cx + R * 0.2, cy: cy + R * 0.0, rx: R * 0.27 * eyeK, ry: R * 0.25 * eyeK, ...gl }, h);
      el('ellipse', { cx: cx + R * 0.66, cy: cy - R * 0.02, rx: R * 0.21 * eyeK, ry: R * 0.23 * eyeK, ...gl }, h);
      path(h, `M${P(0.43, -0.04)} Q${P(0.46, -0.1)} ${P(0.5, -0.05)} M${P(-0.06, -0.02)} L${P(-0.45, -0.08)}`, 'none', gl);
    }
    this.brows = [[0.2, -0.42], [0.65, -0.42]].map(([bx, by]) => el('path', { d: '', fill: 'none', stroke: hairDark, 'stroke-width': 1.7, 'stroke-linecap': 'round', transform: `translate(${cx + R * bx} ${cy + R * by})` }, h));
    this.mouth = el('path', { d: '', fill: 'none', stroke: '#b53a4c', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${cx + R * 0.46} ${cy + R * 0.5})` }, h);
    if (o.beard && hair.moustache) path(h, hair.moustache, o.hair);
    path(h, hair.front, o.hair);
    el('ellipse', { cx: cx - R * 0.5, cy: cy + R * 0.16, rx: R * 0.16, ry: R * 0.21, fill: o.skin }, h);
    el('ellipse', { cx: cx - R * 0.48, cy: cy + R * 0.17, rx: R * 0.08, ry: R * 0.12, fill: shade(o.skin, 0.86) }, h);
    if (hair.shine) path(h, hair.shine, 'none', { stroke: shade(o.hair, 1.25), 'stroke-width': 1.6, 'stroke-linecap': 'round' });
    if (o.beret) {
      path(h, `M${P(-1.05, -0.55)} C${P(-1.1, -1.25)} ${P(0.9, -1.4)} ${P(1.05, -0.62)} Q${P(0.0, -0.78)} ${P(-1.05, -0.55)} Z`, o.beret);
      line(h, cx + R * 0.05, cy - R * 1.12, cx + R * 0.1, cy - R * 1.28, o.beret, 2.4);
    }

    this.armFront = arm(o.top, o.skin);
    this.hand = this.armFront.hand;

    this.x = 0; this.facing = 1;
    const j = (v) => new Spring(v, M.armK, M.armD);
    this.sp = {
      flip: new Spring(1, M.flipK, M.flipD), walk: new Spring(0, 60, 14), sit: new Spring(0, 110, 15), crouch: new Spring(0, 110, 15),
      squash: new Spring(0, 380, 9), uF: j(4), lF: j(-8), uB: j(-4), lB: j(-8), tilt: new Spring(0, 140, 12), talk: new Spring(0, 30, 11),
      lean: new Spring(0, 90, 12), happy: new Spring(0.4, 60, 12), surprised: new Spring(0, 80, 12), mouth: new Spring(0, 900, 45),
      stretch: new Spring(0, 140, 10), lookY: new Spring(0, 90, 14),
    };
    this.phase = 0; this.path = []; this.hopT = 9; this.nodT = 9; this.shakeT = 9; this.waveT = 9; this.blinkIn = 1 + Math.random() * 3; this.blink = 0;
    this.gesture = 'down';
    this.carried = null; // something held upright in the back hand, like an umbrella
  }

  layer(name) { rt.layers[name].appendChild(this.root); }
  place(x, facing = 1) { this.x = x; this.path = []; this.face(facing, true); }
  face(dir, now) { this.facing = dir; this.sp.flip.target = dir; if (now || rt.instant) this.sp.flip.snap(dir); }
  walkTo(x, { speed = 120, then, face } = {}) {
    if (rt.instant) { this.x = x; this.sp.walk.snap(0); if (face) this.face(face); else this.face(Math.sign(x - this.x) || this.facing); then && then(); return; }
    this.face(Math.sign(x - this.x) || this.facing);
    this.path = [{ x, speed, then, face }];
    this.sp.squash.kick(-1.2);
  }
  sit(on = true) { set(this.sp.sit, on ? 1 : 0); if (!rt.instant) this.hop(12); }
  hop(h = 18) { if (!rt.instant) { this.hopT = 0; this.hopH = h; } }
  nod() { if (!rt.instant) this.nodT = 0; }
  shake() { if (!rt.instant) this.shakeT = 0; }
  wave() { if (!rt.instant) this.waveT = 0; }
  pose(name) { this.gesture = name; }
  expr(e) { for (const [k, v] of Object.entries(e)) set(this.sp[k], v); }
  carry(node) { if (this.carried) this.carried.remove(); this.carried = node; if (node) this.armBack.hand.appendChild(node); }
  holdInHand(node, transform) { this.hand.appendChild(node); node.setAttribute('transform', transform); }
  headPos() { return { x: this.x + this.facing * this.R * 0.3 * this.o.scale, y: FLOOR + (-this.L - this.B - this.R) * this.o.scale }; }
  height() { return (this.L + this.B + 2 * this.R) * this.o.scale; }
  // resets the moving parts to rest; used before a seek replays the beats
  rest() {
    this.path = []; this.gesture = 'down'; this.carry(null);
    for (const [k, s] of Object.entries(this.sp)) s.snap(k === 'flip' ? this.facing : k === 'happy' ? 0.4 : 0);
    for (const s of [this.sp.uF, this.sp.lF, this.sp.uB, this.sp.lB]) s.snap(0);
  }

  update(dt, t) {
    const sp = this.sp;
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
    let [uF, lF, uB, lB] = G[this.gesture] || G.down;
    if (this.carried) [uB, lB] = CARRY;
    if (this.waveT < 1.6) { this.waveT += dt; uF = -62; lF = -96 + 22 * Math.sin(this.waveT * 13); }
    const armSwing = 20 * Math.sin(this.phase) * w;
    set(sp.uF, uF - armSwing); set(sp.lF, lF - 10 * w);
    set(sp.uB, uB + (this.carried ? 0 : armSwing)); set(sp.lB, lB - (this.carried ? 0 : 10 * w));
    for (const [a, u, l] of [[this.armFront, sp.uF.v, sp.lF.v], [this.armBack, sp.uB.v, sp.lB.v]]) {
      a.shoulder.setAttribute('transform', `translate(${a === this.armFront ? 2 : -3} ${this.shoulderY}) rotate(${u})`);
      a.elbow.setAttribute('transform', `translate(0 ${this.U}) rotate(${l})`);
    }
    // legs: walking swings the thighs and bends the knees; sitting puts the
    // thighs forward with the shins hanging; crouching folds both
    const swingF = M.swing * Math.sin(this.phase) * w, swingB = -swingF;
    const kneeF = 34 * Math.max(0, Math.cos(this.phase)) * w, kneeB = 34 * Math.max(0, -Math.cos(this.phase)) * w;
    const thigh = (sw) => sw - 88 * sit - 62 * cr, shin = (k) => k + 88 * sit + 112 * cr;
    const legs = [[this.legs[0], thigh(swingB) + 6 * sit, shin(kneeB) - 6 * sit, -2], [this.legs[1], thigh(swingF), shin(kneeF), 3]];
    for (const [leg, a, k, x] of legs) {
      leg.hip.setAttribute('transform', `translate(${x} ${-this.L}) rotate(${a})`);
      leg.knee.setAttribute('transform', `translate(0 ${this.T}) rotate(${k})`);
    }
    // keep the feet on the ground (or on the chair): the hip drops by what the legs lose
    const rad = Math.PI / 180;
    const legH = (a, k) => this.T * Math.cos(a * rad) + this.S * Math.cos((a + k) * rad);
    const standH = Math.max(legH(thigh(swingF), shin(kneeF)), legH(thigh(swingB), shin(kneeB)));
    const seat = 50 / this.o.scale;
    const drop = (this.L - standH) * (1 - sit) + (this.L - seat - 2) * sit;
    let lift = M.bob * Math.abs(Math.cos(this.phase)) * w;
    if (this.hopT < 0.45) { this.hopT += dt; lift += this.hopH * Math.sin((this.hopT / 0.45) * Math.PI); }
    const breathe = 1 + 0.01 * Math.sin(t * 2.2 + this.L);
    const stretch = 1 + 0.12 * sp.stretch.v;
    const lean = sp.lean.v + 12 * cr + 3 * w;
    this.bodyG.setAttribute('transform', `translate(0 ${drop - lift}) rotate(${lean} 0 ${-this.L}) scale(1 ${breathe * stretch})`);
    if (this.carried) this.carried.setAttribute('transform', `rotate(${-(sp.uB.v + sp.lB.v + lean)})`);
    // head: talking rocks it, nods and shakes too
    const level = rt.speaker === this ? rt.mouthLevel : 0;
    sp.mouth.target = level;
    sp.talk.target = rt.speaker === this && rt.talking ? 1 : 0;
    let tilt = sp.tilt.v + M.levelRock * sp.mouth.v * Math.sin(t * 9) + M.talkRock * sp.talk.v * Math.sin(t * M.talkHz) - 8 * sp.lookY.v;
    if (this.nodT < 0.7) { this.nodT += dt; tilt += 10 * Math.sin(this.nodT * 18) * (1 - this.nodT / 0.7); }
    let shakeX = 0;
    if (this.shakeT < 0.9) { this.shakeT += dt; shakeX = Math.sin(this.shakeT * 20) * (1 - this.shakeT / 0.9); }
    this.headG.setAttribute('transform', `translate(1 ${-this.L - this.B - 3}) rotate(${tilt + 5 * shakeX})`);
    // eyes: blink, widen with surprise, irises glance
    this.blinkIn -= dt;
    if (this.blinkIn < 0) { this.blink = 0.13; this.blinkIn = 2 + Math.random() * 3; }
    this.blink = Math.max(0, this.blink - dt);
    const open = this.blink > 0 ? 0.1 : 1 - 0.25 * Math.max(0, sp.happy.v - 0.6);
    const big = 1 + 0.18 * Math.max(0, sp.surprised.v);
    for (const e of this.eyes) {
      e.g.setAttribute('transform', `scale(${big} ${big * open})`);
      e.iris.setAttribute('transform', `translate(${-this.R * 0.05 * shakeX} ${this.R * 0.05 * sp.lookY.v})`);
    }
    const bu = -2.5 * sp.surprised.v;
    this.brows.forEach((b) => b.setAttribute('d', `M${-this.R * 0.14} ${bu + 1.5} Q0 ${bu - 2.2 - 1.5 * sp.surprised.v} ${this.R * 0.14} ${bu + 0.5}`));
    // mouth: open with the voice, a smile, or an O of surprise
    const mw = this.R * 0.15, m = sp.mouth.v, hp = sp.happy.v, su = Math.max(0, sp.surprised.v);
    let d, filled = false;
    if (m > 0.04) { d = `M${-mw} 0 Q0 ${hp * 2} ${mw} 0 Q0 ${3 + m * 11} ${-mw} 0 Z`; filled = true; }
    else if (su > 0.35) { const r = mw * 0.45; d = `M${-r} 0 a${r} ${r * 1.2 * su} 0 1 0 ${2 * r} 0 a${r} ${r * 1.2 * su} 0 1 0 ${-2 * r} 0 Z`; filled = true; }
    else d = `M${-mw} ${-hp * 1.5} Q0 ${hp * 6 + 1} ${mw} ${-hp * 1.5}`;
    this.mouth.setAttribute('d', d);
    this.mouth.setAttribute('fill', filled ? '#8a2436' : 'none');
    const sq = sp.squash.v * M.squash;
    this.squashG.setAttribute('transform', `scale(${1 + sq} ${1 - sq})`);
    this.flipG.setAttribute('transform', `scale(${sp.flip.v} 1)`);
    this.root.setAttribute('transform', `translate(${this.x} ${FLOOR - (this.o.raised || 0)})`);
  }
}

// Hair shapes, as paths around the head; P(x, y) is a point in head radii.
export const HAIR = {
  bob: (P) => ({
    back: `M${P(0.5, -0.92)} C${P(-0.3, -1.32)} ${P(-1.3, -0.8)} ${P(-1.18, 0.3)} C${P(-1.12, 0.95)} ${P(-0.72, 1.22)} ${P(-0.2, 1.1)} L${P(-0.05, 0.25)} Z`,
    front: `M${P(-0.98, 0.15)} C${P(-1.02, -1.08)} ${P(0.3, -1.34)} ${P(0.96, -0.62)} C${P(1.0, -0.45)} ${P(0.98, -0.3)} ${P(0.92, -0.22)} C${P(0.7, -0.5)} ${P(0.35, -0.6)} ${P(0.0, -0.56)} C${P(-0.3, -0.42)} ${P(-0.46, 0.1)} ${P(-0.5, 0.7)} C${P(-0.7, 0.66)} ${P(-0.9, 0.45)} ${P(-0.98, 0.15)} Z`,
    shine: `M${P(-0.6, -0.72)} Q${P(-0.1, -1.02)} ${P(0.4, -0.88)}`,
  }),
  short: (P) => ({
    back: null,
    front: `M${P(-0.95, 0.3)} C${P(-1.15, -0.55)} ${P(-0.85, -1.05)} ${P(-0.35, -1.12)} Q${P(-0.25, -1.3)} ${P(-0.05, -1.32)} Q${P(0.0, -1.18)} ${P(0.12, -1.14)} Q${P(0.3, -1.3)} ${P(0.5, -1.22)} Q${P(0.45, -1.1)} ${P(0.5, -1.02)} C${P(0.85, -0.9)} ${P(1.0, -0.62)} ${P(0.96, -0.36)} C${P(0.7, -0.62)} ${P(0.4, -0.66)} ${P(0.15, -0.6)} C${P(-0.1, -0.52)} ${P(-0.3, -0.35)} ${P(-0.36, -0.1)} C${P(-0.5, 0.05)} ${P(-0.6, 0.2)} ${P(-0.66, 0.4)} Z`,
    shine: `M${P(-0.55, -0.78)} Q${P(-0.15, -1.0)} ${P(0.25, -0.92)}`,
  }),
  bun: (P) => ({
    back: `M${P(0.3, -0.98)} C${P(-0.4, -1.2)} ${P(-1.15, -0.8)} ${P(-1.05, 0.05)} C${P(-1.0, 0.45)} ${P(-0.75, 0.6)} ${P(-0.5, 0.55)} Z`,
    front: `M${P(-0.98, 0.1)} C${P(-1.05, -0.95)} ${P(0.2, -1.28)} ${P(0.95, -0.55)} C${P(0.6, -0.68)} ${P(0.2, -0.62)} ${P(-0.15, -0.5)} C${P(-0.38, -0.35)} ${P(-0.5, -0.05)} ${P(-0.56, 0.25)} Z`,
    shine: `M${P(-0.55, -0.75)} Q${P(-0.05, -1.03)} ${P(0.4, -0.88)}`,
  }),
  // a mop of curls: a ring of circles behind the head and a bumpy fringe
  curly: (P) => ({
    back: null,
    curls: [[-0.95, -0.2, 0.32], [-0.85, -0.65, 0.34], [-0.5, -0.98, 0.34], [-0.05, -1.1, 0.34], [0.4, -1.02, 0.32], [0.78, -0.75, 0.28], [-0.98, 0.25, 0.26]],
    front: `M${P(-0.9, 0.3)} C${P(-1.05, -0.4)} ${P(-0.85, -0.95)} ${P(-0.3, -1.08)} Q${P(-0.15, -1.25)} ${P(0.1, -1.1)} Q${P(0.35, -1.22)} ${P(0.55, -1.0)} Q${P(0.85, -0.98)} ${P(0.92, -0.6)} Q${P(0.7, -0.72)} ${P(0.55, -0.55)} Q${P(0.38, -0.72)} ${P(0.18, -0.55)} Q${P(0.0, -0.7)} ${P(-0.18, -0.5)} Q${P(-0.42, -0.5)} ${P(-0.45, -0.2)} C${P(-0.55, 0.0)} ${P(-0.6, 0.2)} ${P(-0.66, 0.4)} Z`,
    shine: `M${P(-0.5, -0.82)} Q${P(-0.25, -0.98)} ${P(0.0, -0.95)}`,
  }),
};
HAIR.beardy = (P) => ({ ...HAIR.short(P), beard: `M${P(-0.55, 0.05)} C${P(-0.45, 0.85)} ${P(0.2, 1.2)} ${P(0.62, 0.95)} C${P(0.85, 0.8)} ${P(0.95, 0.55)} ${P(0.92, 0.32)} C${P(0.75, 0.5)} ${P(0.62, 0.3)} ${P(0.45, 0.28)} C${P(0.25, 0.3)} ${P(0.1, 0.5)} ${P(0.05, 0.6)} C${P(-0.2, 0.45)} ${P(-0.35, 0.2)} ${P(-0.55, 0.05)} Z` });
HAIR.moustache = (P) => ({ ...HAIR.curly(P), moustache: `M${P(0.22, 0.4)} Q${P(0.46, 0.28)} ${P(0.74, 0.38)} Q${P(0.6, 0.5)} ${P(0.46, 0.44)} Q${P(0.32, 0.5)} ${P(0.22, 0.4)} Z` });

export class Dog {
  constructor(id, o) {
    this.id = id; this.o = o;
    this.root = el('g', {}, rt.layers.front);
    this.flipG = el('g', {}, this.root);
    this.bodyG = el('g', {}, el('g', { transform: `scale(${o.scale || 1})` }, this.flipG));
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
    if (o.collar) rect(this.bodyG, 20, -50, 7, 16, o.collar, { rx: 3, transform: 'rotate(-20 23 -42)' });
    this.headG = el('g', {}, this.bodyG);
    const h = this.headG;
    circle(h, 32, -54, 17, c);
    ellipse(h, 47, -49, 12, 8, c);
    circle(h, 58, -51, 4.5, '#222');
    circle(h, 38, -60, 3.4, '#222');
    this.mouth = path(h, '', '#7a2030');
    this.ear = ellipse(h, 24, -56, 7, 14, o.ear || dark);
    this.x = 0; this.facing = 1; this.path = []; this.phase = 0; this.hopT = 9; this.barkT = 9;
    this.sp = { flip: new Spring(1, M.flipK, M.flipD), walk: new Spring(0, 60, 14), wag: new Spring(0.3, 60, 10) };
  }
  layer(name) { rt.layers[name].appendChild(this.root); }
  place(x, facing = 1) { this.x = x; this.path = []; this.face(facing, true); }
  face(dir, now) { this.facing = dir; this.sp.flip.target = dir; if (now || rt.instant) this.sp.flip.snap(dir); }
  walkTo(x, { speed = 150, then, face } = {}) {
    if (rt.instant) { this.x = x; if (face) this.face(face); then && then(); return; }
    this.face(Math.sign(x - this.x) || this.facing);
    this.path = [{ x, speed, then, face }];
  }
  hop(h = 26) { if (!rt.instant) { this.hopT = 0; this.hopH = h; } }
  bark() { if (!rt.instant) { this.barkT = 0; bubble('¡Guau!', () => ({ x: this.x + this.facing * 60, y: FLOOR - 95 })); } }
  wag(v) { set(this.sp.wag, v); }
  rest() { this.path = []; for (const [k, s] of Object.entries(this.sp)) s.snap(k === 'flip' ? this.facing : k === 'wag' ? 0.3 : 0); }
  headPos() { const k = this.o.scale || 1; return { x: this.x + this.facing * 40 * k, y: FLOOR - 55 * k }; }
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

// ---------- effects ----------

export function effect(g, dur, update) { rt.effects.push({ g, t: 0, dur, update }); }

export function bubble(s, at, dur = 1.4) {
  if (rt.instant) return;
  const g = el('g', {}, rt.layers.fx);
  const w = 14 + s.length * 11;
  rect(g, -w / 2, -24, w, 34, '#ffffff', { rx: 14, stroke: '#333', 'stroke-width': 2 });
  text(g, 0, 0, s, { 'font-size': 20, fill: '#333' });
  const sp = new Spring(0, 300, 14); sp.target = 1;
  effect(g, dur, function (dt) {
    const p = at();
    sp.step(dt);
    if (this.t > dur - 0.25) sp.target = 0;
    g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${Math.max(0, sp.v)})`);
  });
}

// a card that pops up over the scene, drawn by `draw(g)` around (0, 0)
export function popCard(x, y, draw, dur = 2.5) {
  if (rt.instant) return;
  const g = el('g', {}, rt.layers.fx);
  const inner = el('g', {}, g);
  draw(inner);
  const sp = new Spring(0, 260, 15); sp.target = 1;
  effect(g, dur, function (dt) {
    sp.step(dt);
    if (this.t > dur - 0.3) sp.target = 0;
    g.setAttribute('transform', `translate(${x} ${y}) scale(${Math.max(0, sp.v)})`);
  });
}

// a glowing ring that draws the eye to something
export function ring(cx, cy, rx, ry, dur = 1.1) {
  if (rt.instant) return;
  const r = el('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: '#ffcf33', 'stroke-width': 4 }, rt.layers.fx);
  effect(r, dur, function () { r.setAttribute('opacity', Math.sin((this.t / dur) * Math.PI)); });
}

// props that bounce when named: { g, x, y, bounce }
export const props = {};
export function item(layer, name, x, y, build) {
  const g = el('g', { transform: `translate(${x} ${y})` }, layer);
  build(g);
  props[name] = { g, x, y, bounce: new Spring(0, 260, 12), home: layer };
  return props[name];
}
export function bounce(name) {
  if (rt.instant) return;
  const p = props[name];
  p.bounce.kick(-160);
  ring(p.x, p.y + 2, 30, 7, 0.9);
}

// light rain over whatever the camera sees
const rain = { on: false, node: null, drops: [] };
export function setRain(on) { rain.on = on; }
function updateRain(dt) {
  if (!rain.node) {
    rain.node = el('path', { d: '', stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.75, fill: 'none' }, rt.layers.fx);
    for (let i = 0; i < 90; i++) rain.drops.push({ x: Math.random(), y: Math.random(), v: 0.55 + Math.random() * 0.3 });
  }
  rt.layers.fx.appendChild(rain.node);
  if (!rain.on) { rain.node.setAttribute('d', ''); return; }
  const w = cam.w, hgt = w * 0.625, x0 = cam.x - w / 2, y0 = cam.y - hgt / 2;
  let d = '';
  for (const p of rain.drops) {
    p.y += p.v * dt; if (p.y > 1) { p.y -= 1; p.x = Math.random(); }
    const x = x0 + p.x * w, y = y0 + p.y * hgt, len = 0.022 * w;
    d += `M${x.toFixed(1)} ${y.toFixed(1)} l${(-len * 0.18).toFixed(1)} ${len.toFixed(1)}`;
  }
  rain.node.setAttribute('d', d);
  rain.node.setAttribute('stroke-width', (w / 500).toFixed(2));
}

// a note over the stage, such as the text of a letter
export function note(html) { if (rt.note) { rt.note.innerHTML = html || ''; rt.note.classList.toggle('on', !!html); } }

// ---------- camera ----------

export const cam = { x: 400, y: 250, w: 800, from: null, to: null, t: 1, dur: 1 };
export function shot(x, y, w, dur = 1.2) {
  if (rt.instant || dur === 0) { Object.assign(cam, { x, y, w, t: 1 }); return; }
  cam.from = { x: cam.x, y: cam.y, w: cam.w }; cam.to = { x, y, w }; cam.t = 0; cam.dur = dur;
}
export const focus = (a, w = 300, dy = 0) => { const h = a.headPos(); return [h.x, h.y + w * 0.12 + dy, w]; };
function updateCamera(dt) {
  if (cam.t < 1) {
    cam.t = Math.min(1, cam.t + dt / cam.dur);
    const e = cam.t < 0.5 ? 4 * cam.t ** 3 : 1 - (-2 * cam.t + 2) ** 3 / 2;
    for (const k of ['x', 'y', 'w']) cam[k] = cam.from[k] + (cam.to[k] - cam.from[k]) * e;
  }
  const h = cam.w * 0.625;
  rt.svg.setAttribute('viewBox', `${cam.x - cam.w / 2} ${cam.y - h / 2} ${cam.w} ${h}`);
}

// ---------- sound ----------

// The voice plays from a plain audio element, never routed through Web Audio:
// a routed element goes silent when its file is served from another origin
// (as on githack) and on some phones. Lip-sync reads the loudness envelope
// that pipeline/build_audio.py stores with each file.
let ctx = null;
export const audio = new Audio();
audio.preservesPitch = true;
let env = null; // loudness 0-99, ENV_HZ values a second, of the current sentence
const ENV_HZ = 25;
export function setEnvelope(e) { env = e || null; }
// call from a tap: browsers only start audio after one
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new AudioContext(); } catch (e) { ctx = null; }
}
function measure() {
  if (audio.paused) { rt.mouthLevel = 0; return; }
  if (!env) { rt.mouthLevel = 0.35 + 0.3 * Math.sin(rt.clock * 18); return; }
  const v = env[Math.floor(audio.currentTime * ENV_HZ)] || 0;
  rt.mouthLevel = Math.min(1, Math.max(0, (v / 99 - 0.08) * 1.6));
}
export function knock() {
  if (!ctx || rt.instant) return;
  for (let i = 0; i < 3; i++) {
    const t0 = ctx.currentTime + i * 0.22, n = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate), d = n.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.018));
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = n; lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 2.2;
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
}

// ---------- playback ----------

/*
 * Mounts a story in `container` and plays it sentence by sentence.
 * story(): { actors, init(), script: { id: [[secs, fn], ...] }, frame?(dt, t) }
 * Hooks: onLine(i) when a sentence starts, onEnd() after the last one.
 */
export function createPlayer(container, chapter, story, { onLine = () => {}, onEnd = () => {} } = {}) {
  const svg = el('svg', { viewBox: '0 0 800 500', preserveAspectRatio: 'xMidYMid slice', class: 'scene' });
  container.replaceChildren(svg);
  const noteDiv = document.createElement('div');
  noteDiv.className = 'scene-note';
  container.append(noteDiv);
  rt.svg = svg; rt.note = noteDiv;
  rt.layers = {};
  const world = el('g', {}, svg);
  for (const n of ['sky', 'city', 'house', 'room', 'back', 'table', 'front', 'fx']) rt.layers[n] = el('g', {}, world);
  rt.effects.length = 0; rt.timers.length = 0; rt.clouds.length = 0;
  for (const k of Object.keys(props)) delete props[k];
  rain.node = null; rain.drops = []; rain.on = false;

  const s = story();
  const sentences = chapter.sentences;
  let index = 0, sentStart = 0, beatIdx = 0, playing = false, ending = 0, rate = 1, raf = 0, last = performance.now();

  function seek(i) {
    for (const a of Object.values(s.actors)) a.rest();
    for (const e of rt.effects) e.g.remove();
    rt.effects.length = 0; rt.timers.length = 0;
    note('');
    rt.instant = true;
    s.init();
    for (let k = 0; k < i; k++) for (const [, fn] of s.script[sentences[k].id] || []) fn();
    rt.instant = false;
    start(i);
  }
  function start(i) {
    index = i; sentStart = rt.clock; beatIdx = 0; ending = 0;
    const line = sentences[i];
    rt.speaker = s.actors[line.who] || null;
    audio.src = chapter.audio[line.text].file;
    setEnvelope(chapter.audio[line.text].env);
    audio.playbackRate = rate;
    onLine(i);
    if (playing) audio.play().catch(() => {});
  }
  function tick(dt) {
    rt.talking = playing && !audio.paused;
    if (!playing) return; // the story clock stops while paused
    rt.clock += dt;
    const beats = s.script[sentences[index].id] || [];
    const now = (rt.clock - sentStart) * rate;
    while (beatIdx < beats.length && beats[beatIdx][0] <= now) beats[beatIdx++][1]();
    for (let k = rt.timers.length - 1; k >= 0; k--) if (rt.timers[k].at <= rt.clock) { const f = rt.timers[k].fn; rt.timers.splice(k, 1); f(); }
    const busy = Object.values(s.actors).some((a) => a.path.length) || rt.timers.length || beatIdx < beats.length;
    if (audio.ended || (audio.error && now > 2)) {
      if (!busy) ending += dt;
      if (ending > 0.7 / rate) {
        if (index + 1 < sentences.length) start(index + 1);
        else { playing = false; onEnd(); }
      }
    }
  }
  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((ms - last) / 1000, MAX_DT);
    last = ms;
    tick(dt);
    measure();
    const t = performance.now() / 1000;
    for (const a of Object.values(s.actors)) a.update(dt, t);
    for (const p of Object.values(props)) if (p.bounce) { p.bounce.step(dt); if (p.g.parentNode === p.home) p.g.setAttribute('transform', `translate(${p.x} ${p.y + p.bounce.v * 0.12})`); }
    for (let k = rt.effects.length - 1; k >= 0; k--) {
      const e = rt.effects[k];
      e.t += dt; e.update(dt);
      if (e.t >= e.dur) { e.g.remove(); rt.effects.splice(k, 1); }
    }
    for (const c of rt.clouds) { c.x += c.speed * dt; if (c.x > c.x1) c.x = c.x0; c.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.s})`); }
    if (s.frame) s.frame(dt, t);
    updateRain(dt);
    updateCamera(dt);
  }
  seek(0);
  raf = requestAnimationFrame(frame);

  return {
    get index() { return index; },
    get playing() { return playing; },
    seek(i) { seek(Math.max(0, Math.min(sentences.length - 1, i))); },
    play() { unlock(); playing = true; if (audio.ended || audio.currentTime === 0) seek(index); else audio.play().catch(() => {}); },
    pause() { playing = false; audio.pause(); },
    setRate(r) { rate = r; audio.playbackRate = r; },
    destroy() { playing = false; audio.pause(); cancelAnimationFrame(raf); },
    actors: s.actors, shot,
  };
}
const MAX_DT = +(new URLSearchParams(location.search).get('maxdt') || 0.05);
