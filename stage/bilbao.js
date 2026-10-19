// Lesson 1, "Una carta sin nombre": Bilbao, Ane's family at breakfast, a letter at the door.
import { Spring, FLOOR, rt, props, set, later, shot, focus, bubble, bounce, ring, popCard, note, knock } from './engine.js';
import { sky, bilbaoCity, aneStreet, kitchen } from './sets.js';
import { spainMap } from './sets.js';
import { cast } from './cast.js';

export default function story() {
  sky(-2000, 900);
  bilbaoCity();
  aneStreet();
  const K = kitchen();
  const A = cast('ane', 'iker', 'begona', 'mikel', 'txiki');
  const { DOOR, SEAT } = K;
  const doorOpen = new Spring(0, 70, 9);
  let doorShake = -1;
  const kids = [A.ane, A.iker], adults = [A.begona, A.mikel], people = [...kids, ...adults];

  function init() {
    A.ane.place(140, 1); A.iker.place(200, 1);
    A.begona.place(372, -1); A.mikel.place(452, 1); A.txiki.place(620, -1);
    A.begona.layer('back'); A.mikel.layer('back'); A.ane.layer('front');
    for (const a of kids) a.expr({ happy: 0.4 });
    for (const a of adults) a.expr({ happy: 0.5 });
    doorOpen.snap(0); doorShake = -1;
    props.zumo.g.style.display = 'none';
    K.door.parentNode.insertBefore(K.carta, K.door);
    K.carta.setAttribute('transform', `translate(${DOOR.x + 40} ${FLOOR - 13})`);
    shot(-1640, 230, 640, 0);
  }

  function pickLetter() {
    A.ane.holdInHand(K.carta, 'translate(4 4) rotate(-70) scale(1.4)');
  }

  const script = {
    s01: [
      [0, () => shot(-1640, 230, 640, 0)],
      [0.1, () => shot(-1380, 210, 760, 3.0)],
      [1.9, () => popCard(-1520, 150, spainMap, 3.2)],
    ],
    s02: [
      [0, () => shot(-1500, 260, 620, 1.2)],
      [0.6, () => ring(props.river.x, props.river.y, 120, 18, 1.2)],
      [1.2, () => shot(-1260, 250, 560, 1.4)],
      [1.6, () => ring(props.museum.x, props.museum.y, 150, 90, 1.4)],
    ],
    s03: [
      [0, () => shot(-460, 230, 760, 1.0)],
      [0.7, () => { const w = props.homeWindow; shot(w.x, w.y, 260, 1.3); }],
    ],
    s04: [
      [0, () => { shot(...focus(A.ane, 300), 0); A.ane.face(1); }],
      [0.4, () => { A.ane.wave(); A.ane.expr({ happy: 1 }); }],
      [1.0, () => bubble('14', () => ({ x: A.ane.x + 60, y: FLOOR - 160 }), 1.6)],
    ],
    s05: [
      [0, () => { shot(170, 300, 340, 1.0); A.iker.face(-1); }],
      [0.2, () => { A.iker.hop(); A.iker.wave(); A.iker.expr({ happy: 1 }); }],
      [1.4, () => { A.ane.face(1); A.ane.expr({ happy: 0.6 }); }],
    ],
    s06: [
      [0, () => shot(170, 300, 340, 0.8)],
      [0.15, () => { A.ane.pose('yay'); A.ane.expr({ stretch: 1, happy: 1 }); A.ane.face(1); }],
      [1.25, () => { A.ane.pose('down'); A.ane.expr({ stretch: 0 }); set(A.iker.sp.crouch, 0.9); A.iker.expr({ happy: 0.2 }); }],
      [2.1, () => { set(A.iker.sp.crouch, 0); A.iker.expr({ happy: 0.8 }); }],
    ],
    s07: [
      [0, () => shot(412, 270, 380, 1.1)],
      [0.3, () => { A.begona.wave(); A.begona.expr({ happy: 1 }); }],
      [1.3, () => { A.mikel.wave(); A.mikel.expr({ happy: 1 }); A.begona.face(1); }],
    ],
    s08: [
      [0, () => shot(600, 320, 380, 1.1)],
      [0.5, () => { A.txiki.hop(); A.txiki.bark(); A.txiki.wag(1); }],
      [1.4, () => { A.txiki.hop(); A.mikel.face(1); A.begona.face(1); }],
    ],
    s09: [
      [0, () => { shot(400, 260, 720, 1.0); A.mikel.face(-1); A.mikel.pose('offer'); }],
      [1.0, () => {
        A.mikel.pose('down');
        A.ane.walkTo(SEAT.ane, { face: 1, then: () => A.ane.sit() });
        A.iker.walkTo(SEAT.iker, { speed: 160, face: -1, then: () => A.iker.sit() });
        A.txiki.walkTo(110, { face: 1 });
        A.begona.face(-1); A.mikel.face(1);
      }],
    ],
    s10: [
      [0, () => { shot(...focus(A.iker, 300), 0.9); A.iker.face(-1); }],
      [0.1, () => { A.iker.hop(10); A.iker.pose('belly'); A.iker.expr({ happy: 1 }); }],
      [1.0, () => { A.iker.pose('down'); A.mikel.expr({ happy: 1 }); }],
    ],
    s11: [
      [0, () => shot(412, 300, 300, 1.0)],
      [0.85, () => bounce('pan')],
      [1.35, () => bounce('tomate')],
      [1.85, () => bounce('café')],
    ],
    s12: [
      [0, () => { shot(320, 290, 330, 0.9); A.begona.face(-1); A.begona.expr({ happy: 0.8 }); }],
      [0.5, () => A.begona.pose('offer')],
      [2.0, () => A.begona.pose('down')],
    ],
    s13: [
      [0, () => { shot(...focus(A.ane, 280), 0.8); A.ane.shake(); }],
      [0.9, () => A.ane.expr({ happy: 1 })],
      [2.0, () => { props.zumo.g.style.display = ''; bounce('zumo'); A.begona.nod(); }],
    ],
    s14: [
      [0, () => shot(450, 260, 760, 1.0)],
      [1.2, () => {
        knock();
        bubble('¡Toc, toc!', () => ({ x: DOOR.x + DOOR.w / 2, y: FLOOR - DOOR.h - 30 }), 1.6);
        if (!rt.instant) doorShake = 0;
        for (const a of people) { a.face(1); a.expr({ surprised: 1, happy: 0 }); }
        A.txiki.face(1); A.txiki.bark();
      }],
    ],
    s15: [
      [0, () => { shot(520, 270, 560, 1.0); for (const a of people) a.expr({ surprised: 0.3 }); }],
      [0.2, () => {
        A.ane.sit(false); A.ane.layer('front');
        A.ane.walkTo(DOOR.x - 18, { speed: 150, face: 1, then: () => {
          A.ane.pose('reach');
          later(0.35, () => { set(doorOpen, 1); A.ane.pose('down'); });
          later(1.1, () => A.ane.face(-1));
          later(1.6, () => { A.ane.face(1); A.ane.expr({ surprised: 0.6 }); });
        } });
      }],
    ],
    s16: [
      [0, () => { shot(DOOR.x + 20, FLOOR - 40, 260, 1.0); A.ane.expr({ lookY: 1 }); }],
      [0.8, () => ring(DOOR.x + 40, FLOOR - 4, 24, 7, 1.2)],
    ],
    s17: [
      [0, () => { shot(DOOR.x - 10, 300, 300, 0.8); A.ane.walkTo(DOOR.x + 14, { speed: 80, face: 1 }); }],
      [0.4, () => { set(A.ane.sp.crouch, 1); A.ane.pose('reach'); }],
      [0.95, () => pickLetter()],
      [1.15, () => { set(A.ane.sp.crouch, 0); A.ane.pose('hold'); A.ane.expr({ lookY: 0.4, surprised: 0.8 }); A.ane.face(-1); }],
      [1.5, () => { A.iker.sit(false); A.iker.walkTo(DOOR.x - 60, { speed: 190, face: 1 }); }],
    ],
    s18: [
      [0, () => { shot(DOOR.x - 30, 300, 320, 0.8); A.iker.pose('point'); A.iker.expr({ happy: 1, surprised: 0 }); A.iker.hop(10); }],
      [0.3, () => { A.ane.face(-1); A.ane.expr({ lookY: 0 }); }],
      [1.4, () => { A.iker.pose('down'); A.iker.expr({ lookY: -0.5 }); }],
    ],
    s19: [
      [0, () => { shot(DOOR.x - 20, 290, 260, 0.8); A.ane.pose('show'); A.ane.expr({ surprised: 0.4, lookY: -0.6 }); }],
      [1.6, () => { if (!rt.instant) note('El sábado, a las once,<br>en la Plaza Nueva.'); }],
      [5.0, () => note('')],
    ],
    s20: [
      [0, () => { note(''); shot(...focus(A.ane, 240), 0.6); A.ane.pose('shrug'); A.ane.expr({ surprised: 1, happy: 0, lookY: 0 }); A.ane.face(-1); }],
      [0.9, () => { A.ane.expr({ surprised: 0.2, happy: 1 }); A.ane.hop(8); bubble('?', () => ({ x: A.ane.x + 44, y: FLOOR - 150 }), 1.4); }],
    ],
  };

  function frame(dt) {
    doorOpen.step(dt);
    let jiggle = 0;
    if (doorShake >= 0) {
      doorShake += dt;
      jiggle = doorShake < 0.8 ? 2 * Math.sin(doorShake * 40) * (1 - doorShake / 0.8) : 0;
      if (doorShake >= 0.8) doorShake = -1;
    }
    K.panel.setAttribute('transform', `translate(${jiggle} 0) scale(${1 - 0.82 * Math.max(0, Math.min(1.1, doorOpen.v))} 1)`);
  }

  return { actors: A, init, script, frame };
}
