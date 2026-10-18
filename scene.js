/*
 * The animated stage of the listening view.
 *
 * A chapter gives each sentence a list of scene actions. Lasting actions change
 * the state of the stage (bg, enter, exit, move, show, hide, give, open);
 * passing ones only play while the sentence is heard (point, highlight, jump,
 * nod, shake, bubble, knock, ring). Jumping to a sentence replays the lasting
 * actions of all earlier sentences at once, so any sentence can be replayed.
 *
 * Each action may have a delay in seconds from the start of its sentence.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 400, FLOOR = 205, DOOR_X = 362, TABLE_X = 200;
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
  };

  function drawBackground(g, fg, bg) {
    g.replaceChildren();
    fg.replaceChildren();
    if (bg === 'city') {
      el('rect', { x: 0, y: 0, width: W, height: 240, fill: 'var(--sky)' }, g);
      const rows = [[10, 90], [50, 130], [95, 70], [130, 150], [180, 100], [225, 160], [270, 80], [310, 120], [350, 95]];
      for (const [x, h] of rows) {
        el('rect', { x, y: FLOOR - h, width: 38, height: h, rx: 2, fill: 'var(--building)' }, g);
        for (let wy = FLOOR - h + 10; wy < FLOOR - 12; wy += 18)
          for (const wx of [x + 7, x + 22]) el('rect', { x: wx, y: wy, width: 8, height: 8, fill: 'var(--window)' }, g);
      }
      el('rect', { x: 0, y: FLOOR, width: W, height: 40, fill: 'var(--street)' }, g);
    } else if (bg === 'home') {
      el('rect', { x: 0, y: 0, width: W, height: 240, fill: 'var(--wall)' }, g);
      el('rect', { x: 0, y: FLOOR, width: W, height: 40, fill: 'var(--floor)' }, g);
      el('rect', { x: 20, y: 50, width: 70, height: 60, rx: 3, fill: 'var(--sky)', stroke: 'var(--frame)', 'stroke-width': 4 }, g);
      el('line', { x1: 55, y1: 50, x2: 55, y2: 110, stroke: 'var(--frame)', 'stroke-width': 3 }, g);
      // table, in front of the actors standing behind it
      el('rect', { x: TABLE_X - 65, y: 160, width: 130, height: 8, rx: 2, fill: 'var(--wood)' }, fg);
      el('rect', { x: TABLE_X - 58, y: 168, width: 6, height: FLOOR - 168, fill: 'var(--wood)' }, fg);
      el('rect', { x: TABLE_X + 52, y: 168, width: 6, height: FLOOR - 168, fill: 'var(--wood)' }, fg);
      // door: a dark opening behind a panel that swings open
      el('rect', { x: DOOR_X - 18, y: FLOOR - 92, width: 36, height: 92, fill: 'var(--doorway)' }, g);
      const panel = el('g', { class: 'door-panel' }, g);
      el('rect', { x: DOOR_X - 18, y: FLOOR - 92, width: 36, height: 92, rx: 2, fill: 'var(--door)' }, panel);
      el('circle', { cx: DOOR_X - 10, cy: FLOOR - 46, r: 2.5, fill: 'var(--frame)' }, panel);
    }
  }

  function drawPerson(c) {
    const g = el('g');
    const s = c.size || 1;
    const body = el('g', { class: 'body', transform: `scale(${s})` }, g);
    el('rect', { x: -9, y: -42, width: 7, height: 42, rx: 3, fill: '#33363d' }, body);
    el('rect', { x: 2, y: -42, width: 7, height: 42, rx: 3, fill: '#33363d' }, body);
    el('rect', { x: -14, y: -82, width: 28, height: 44, rx: 9, fill: c.top }, body);
    el('line', { x1: -13, y1: -76, x2: -20, y2: -46, stroke: c.skin, 'stroke-width': 5, 'stroke-linecap': 'round' }, body);
    const arm = el('g', { class: 'arm' }, body);
    el('line', { x1: 13, y1: -76, x2: 20, y2: -46, stroke: c.skin, 'stroke-width': 5, 'stroke-linecap': 'round' }, arm);
    const head = el('g', { class: 'head' }, body);
    if (c.long && !c.scarf) {
      el('rect', { x: -16, y: -106, width: 7, height: 30, rx: 3, fill: c.hair }, head);
      el('rect', { x: 9, y: -106, width: 7, height: 30, rx: 3, fill: c.hair }, head);
    }
    el('circle', { cx: 0, cy: -98, r: 13, fill: c.skin }, head);
    if (c.scarf) el('path', { d: 'M -16 -92 Q -17 -116 0 -116 Q 17 -116 16 -92 L 18 -78 L 10 -80 L 12 -96 Q 0 -108 -12 -96 L -10 -80 L -18 -78 Z', fill: c.scarf }, head);
    else el('path', { d: 'M -13 -100 Q -12 -114 0 -114 Q 12 -114 13 -100 Q 6 -106 -13 -100 Z', fill: c.hair }, head);
    if (c.beard) el('path', { d: 'M -10 -96 Q -9 -84 0 -83 Q 9 -84 10 -96 Q 5 -90 0 -90 Q -5 -90 -10 -96 Z', fill: c.hair }, head);
    el('circle', { cx: -4.5, cy: -99, r: 1.6, fill: '#222' }, head);
    el('circle', { cx: 4.5, cy: -99, r: 1.6, fill: '#222' }, head);
    el('path', { d: 'M -4 -92 Q 0 -89 4 -92', stroke: '#7a3b2e', 'stroke-width': 1.4, fill: 'none', class: 'mouth' }, head);
    return g;
  }

  function drawEmoji(c) {
    const g = el('g');
    const t = el('text', { class: 'emoji body', 'font-size': 60 * (c.size || 1), 'text-anchor': 'middle', y: -4 }, g);
    t.textContent = c.emoji;
    return g;
  }

  // Height of an actor's head top, for bubbles and things shown over it.
  const headTop = (c) => (c.kind === 'person' ? 118 * (c.size || 1) : 62 * (c.size || 1));

  class Scene {
    constructor(svg, chapter) {
      this.svg = svg;
      this.ch = chapter;
      svg.setAttribute('viewBox', `0 0 ${W} 240`);
      svg.replaceChildren();
      this.bgLayer = el('g', {}, svg);
      this.actorLayer = el('g', {}, svg);
      this.fgLayer = el('g', {}, svg);
      this.propLayer = el('g', {}, svg);
      this.fxLayer = el('g', {}, svg);
      this.actors = {};
      for (const [id, c] of Object.entries(chapter.cast)) {
        const g = c.kind === 'person' ? drawPerson(c) : drawEmoji(c);
        g.classList.add('actor');
        this.actorLayer.append(g);
        this.actors[id] = g;
      }
      this.props = {};
      for (const [id, glyph] of Object.entries(chapter.props)) {
        const g = el('g', { class: 'prop' }, this.propLayer);
        const t = el('text', { 'font-size': /\p{Extended_Pictographic}/u.test(glyph) ? 28 : 22, 'text-anchor': 'middle', 'font-weight': 700, fill: 'var(--fg)' }, g);
        t.textContent = glyph;
        this.props[id] = g;
      }
      this.timers = [];
      this.seek(0);
    }

    initialState() {
      const actors = {}, props = {};
      for (const id of Object.keys(this.ch.cast)) actors[id] = { x: -60, on: false };
      for (const id of Object.keys(this.ch.props)) props[id] = { on: false, x: 0, y: 0, holder: null, over: null };
      return { bg: null, door: false, actors, props };
    }

    // Lasting effect of one action on the state.
    apply(st, a) {
      if (a.bg) st.bg = a.bg;
      if (a.enter) { const s = st.actors[a.enter]; s.on = true; s.x = a.x; s.from = a.from === 'right' ? W + 60 : -60; }
      if (a.exit) { st.actors[a.exit].x = a.to === 'left' ? -60 : W + 60; st.actors[a.exit].leaving = true; }
      if (a.move) st.actors[a.move].x = a.x;
      if (a.open) st.door = true;
      if (a.show) {
        const p = st.props[a.show];
        Object.assign(p, { on: true, holder: a.on || null, over: a.over || null });
        if (a.table != null) Object.assign(p, { x: TABLE_X - 40 + 40 * a.table, y: 156 });
        else if (a.floor != null) Object.assign(p, { x: a.floor, y: FLOOR - 2 });
        else if (a.x != null) Object.assign(p, { x: a.x, y: a.y });
      }
      if (a.hide) st.props[a.hide].on = false;
      if (a.give) Object.assign(st.props[a.give], { holder: a.to, over: null });
    }

    propPos(st, p) {
      const who = p.holder || p.over;
      if (!who) return [p.x, p.y];
      const c = this.ch.cast[who], x = st.actors[who].x;
      if (p.over) return [x, FLOOR - headTop(c) - 10];
      return [x + 22 * (c.size || 1), FLOOR - 44 * (c.size || 1)];
    }

    render(st, instant) {
      const all = [...Object.values(this.actors), ...Object.values(this.props)];
      if (instant) all.forEach((g) => (g.style.transition = 'none'));
      if (st.bg !== this.bg) { drawBackground(this.bgLayer, this.fgLayer, st.bg); this.bg = st.bg; }
      const panel = this.bgLayer.querySelector('.door-panel');
      if (panel) {
        panel.style.transition = instant ? 'none' : '';
        panel.classList.toggle('open', st.door);
      }
      for (const [id, s] of Object.entries(st.actors)) {
        const g = this.actors[id];
        if (s.on && !g.dataset.on && !instant) {
          // Start off stage, then walk in.
          g.style.transition = 'none';
          g.style.transform = `translate(${s.from}px, ${FLOOR}px)`;
          g.getBoundingClientRect();
          g.style.transition = '';
        }
        g.dataset.on = s.on ? '1' : '';
        g.style.display = s.on ? '' : 'none';
        g.style.transform = `translate(${s.x}px, ${FLOOR}px)`;
      }
      for (const [id, p] of Object.entries(st.props)) {
        const g = this.props[id];
        const [x, y] = this.propPos(st, p);
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.style.opacity = p.on ? 1 : 0;
      }
      if (instant) { this.svg.getBoundingClientRect(); all.forEach((g) => (g.style.transition = '')); }
    }

    clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; this.fxLayer.replaceChildren(); }

    // Shows the stage as it is just before sentence i.
    seek(i) {
      this.clearTimers();
      this.state = this.initialState();
      for (const s of this.ch.sentences.slice(0, i)) for (const a of s.scene || []) this.apply(this.state, a);
      this.render(this.state, true);
    }

    // Plays the actions of sentence i (call seek(i) first if jumping).
    play(i) {
      this.clearTimers();
      for (const a of this.ch.sentences[i].scene || []) {
        this.timers.push(setTimeout(() => {
          this.apply(this.state, a);
          this.render(this.state, false);
          this.passing(a);
        }, (a.delay || 0) * 1000));
      }
    }

    // The final state of sentence i at once (when pausing or skipping ahead).
    finish(i) { this.seek(i + 1); }

    passing(a) {
      const anim = (who, frames, ms = 600) => {
        const g = this.actors[who]?.querySelector('.body');
        if (g) g.animate(frames, { duration: ms, easing: 'ease-in-out' });
      };
      if (a.jump) anim(a.jump, [{ translate: '0 0' }, { translate: '0 -22px' }, { translate: '0 0' }, { translate: '0 -12px' }, { translate: '0 0' }], 900);
      if (a.nod) anim(a.nod, [{ rotate: '0deg' }, { rotate: '6deg' }, { rotate: '0deg' }, { rotate: '6deg' }, { rotate: '0deg' }], 900);
      if (a.shake) anim(a.shake, [{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '-5px 0' }, { translate: '0 0' }], 700);
      if (a.highlight) anim(a.highlight, [{ scale: '1' }, { scale: '1.12' }, { scale: '1' }], 900);
      if (a.point) {
        const arm = this.actors[a.point].querySelector('.arm');
        const target = this.state.actors[a.at] ? this.state.actors[a.at].x : this.propPos(this.state, this.state.props[a.at])[0];
        const dir = target >= this.state.actors[a.point].x ? -1 : 1;
        if (arm) arm.animate([{ rotate: '0deg' }, { rotate: `${dir * 100}deg`, offset: 0.2 }, { rotate: `${dir * 100}deg`, offset: 0.8 }, { rotate: '0deg' }],
          { duration: 2000, easing: 'ease-in-out', transformOrigin: '13px -76px' });
        const t = this.actors[a.at]?.querySelector('.body') || this.props[a.at];
        t?.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 1600, delay: 300 });
      }
      if (a.bubble) {
        const c = this.ch.cast[a.bubble], x = this.state.actors[a.bubble].x, y = FLOOR - headTop(c) - 30;
        const g = el('g', { class: 'bubble' }, this.fxLayer);
        g.style.transform = `translate(${x + 18}px, ${y}px)`;
        el('ellipse', { cx: 0, cy: 0, rx: 20, ry: 16, fill: 'var(--bubble)', stroke: 'var(--bubble-line)' }, g);
        el('path', { d: 'M -8 12 L -16 24 L 0 14', fill: 'var(--bubble)', stroke: 'var(--bubble-line)' }, g);
        el('text', { 'text-anchor': 'middle', y: 7, 'font-size': 18 }, g).textContent = a.icon;
        g.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 2200, fill: 'forwards' });
      }
      if (a.knock || a.ring) {
        const g = el('g', {}, this.fxLayer);
        g.style.transform = `translate(${DOOR_X - 30}px, ${FLOOR - 110}px)`;
        el('text', { 'text-anchor': 'middle', 'font-size': 24 }, g).textContent = a.knock ? '✊' : '🔔';
        g.animate([{ rotate: '0deg' }, { rotate: '-20deg' }, { rotate: '0deg' }, { rotate: '-20deg' }, { rotate: '0deg' }, { opacity: 0 }], { duration: 1600, fill: 'forwards' });
        this.bgLayer.querySelector('.door-panel')?.animate([{ translate: '0 0' }, { translate: '2px 0' }, { translate: '-2px 0' }, { translate: '0 0' }], { duration: 300, iterations: 3 });
      }
    }

    // The speaker's head bobs while their line is heard.
    talking(who, on) {
      for (const [id, g] of Object.entries(this.actors)) g.classList.toggle('talking', on && id === who);
    }
  }

  root.Scene = Scene;
})(typeof globalThis !== 'undefined' ? globalThis : this);
