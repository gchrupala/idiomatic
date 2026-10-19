// Lesson 2, "El sábado en la Plaza Nueva": rain, the woman with the red umbrella, pintxos.
import { FLOOR, rt, props, set, later, shot, focus, bubble, bounce, ring, popCard, setRain } from './engine.js';
import { sky, aneStreet, plaza, bar, letter, umbrella, argentinaFlag, calendar } from './sets.js';
import { cast } from './cast.js';

export default function story() {
  sky(-2000, 2300, '#c9d6e0', { sun: false, grey: true });
  aneStreet({ wet: true });
  plaza();
  const B = bar(1300);
  const A = cast('waiter', 'ane', 'iker', 'bruna', 'txiki');
  A.waiter.layer('back');
  const yellow = umbrella('#f2c230', -8), red = umbrella('#d9342b', -6);
  const carta = letter(null);
  const kids = [A.ane, A.iker], people = [...kids, A.bruna];

  function home(name) { const p = props[name]; p.home.appendChild(p.g); p.g.setAttribute('transform', `translate(${p.x} ${p.y})`); }
  function give(a, name, transform) { a.holdInHand(props[name].g, transform); }

  function init() {
    setRain(true);
    A.ane.place(-480, 1); A.iker.place(-425, 1); A.txiki.place(-380, 1);
    A.bruna.place(1200, -1);
    A.waiter.place(1470, 1);
    A.ane.carry(yellow); A.bruna.carry(red);
    for (const a of people) a.expr({ happy: 0.5 });
    carta.remove();
    for (const n of ['tortilla', 'queso', 'jamón', 'más', 'bowl']) home(n);
    props.bowl.g.style.display = 'none';
    shot(-460, 230, 760, 0);
  }

  const toBar = () => {
    setRain(false);
    A.ane.carry(null); A.bruna.carry(null);
    A.iker.place(1630, -1); A.ane.place(1705, -1); A.bruna.place(1795, -1); A.txiki.place(1880, -1);
    A.ane.pose('down'); A.iker.pose('down'); A.bruna.pose('down');
  };

  const script = {
    s01: [
      [0, () => shot(-460, 230, 760, 0)],
      [0.6, () => popCard(-460, 90, calendar, 1.9)],
    ],
    s02: [
      [0, () => shot(-440, 290, 440, 1.6)],
      [0.5, () => { A.ane.expr({ lookY: -1, happy: 0.3 }); A.iker.pose('offer'); A.iker.expr({ lookY: -0.6 }); }],
      [1.8, () => { A.iker.pose('down'); A.iker.expr({ lookY: 0, happy: 0.8 }); A.ane.expr({ lookY: 0 }); }],
    ],
    s03: [
      [0, () => shot(...focus(A.ane, 300, -40), 0.8)],
      [1.8, () => { A.ane.hop(6); A.ane.expr({ happy: 1 }); }],
    ],
    s04: [
      [0, () => shot(-250, 290, 620, 2.6)],
      [0.3, () => {
        A.ane.walkTo(-20, { speed: 120 });
        A.iker.walkTo(35, { speed: 120 });
        A.txiki.walkTo(90, { speed: 120 });
      }],
    ],
    s05: [
      [0, () => {
        shot(500, 200, 1120, 0);
        A.ane.place(-60, 1); A.iker.place(-5, 1); A.txiki.place(50, 1);
        A.ane.walkTo(300, { speed: 130 }); A.iker.walkTo(355, { speed: 130 }); A.txiki.walkTo(230, { speed: 130, face: 1 });
      }],
      [2.4, () => shot(500, 220, 960, 1.6)],
    ],
    s06: [
      [0, () => shot(500, 260, 760, 1.0)],
      [2.1, () => ring(props.signs[0].x, props.signs[0].y, 46, 16, 0.8)],
      [2.8, () => ring(props.signs[1].x, props.signs[1].y, 46, 16, 0.8)],
      [3.5, () => ring(props.signs[2].x, props.signs[2].y, 46, 16, 0.8)],
    ],
    s07: [
      [0, () => { shot(440, 150, 620, 1.0); A.iker.face(1); A.iker.expr({ lookY: -1 }); }],
      [1.0, () => ring(props.clock.x, props.clock.y, 30, 30, 1.4)],
      [1.6, () => bubble('11:00', () => ({ x: props.clock.x, y: props.clock.y + 60 }), 1.6)],
    ],
    s08: [
      [0, () => { shot(...focus(A.iker, 320, -10), 0.9); A.iker.expr({ lookY: 0 }); A.iker.face(-1); }],
      [1.3, () => A.iker.pose('shrug')],
      [3.0, () => A.iker.pose('down')],
    ],
    s09: [
      [0, () => { shot(...focus(A.ane, 320, 10), 0.7); A.ane.face(-1); A.ane.pose('shrug'); }],
      [1.5, () => { A.ane.pose('down'); A.ane.face(1); }],
      [1.9, () => { A.ane.pose('point'); A.ane.hop(10); A.ane.expr({ surprised: 0.8 }); A.iker.face(1); }],
    ],
    s10: [
      [0, () => { shot(640, 250, 820, 1.0); A.ane.pose('down'); A.bruna.place(1080, -1); A.bruna.walkTo(560, { speed: 150 }); }],
      [1.0, () => { A.ane.expr({ surprised: 0.2 }); A.iker.expr({ surprised: 0.6 }); }],
    ],
    s11: [
      [0, () => shot(450, 200, 520, 1.0)],
      [0.6, () => ring(A.ane.x - 6, FLOOR - 255, 56, 26, 1.4)],
      [2.2, () => ring(A.bruna.x - 4, FLOOR - 285, 56, 26, 1.4)],
    ],
    s12: [
      [0, () => { shot(...focus(A.bruna, 380, -30), 0.8); A.bruna.face(-1); A.bruna.expr({ happy: 1 }); }],
      [0.2, () => A.bruna.wave()],
    ],
    s13: [
      [0, () => { shot(450, 280, 480, 0.8); A.ane.hop(16); A.ane.wave(); A.ane.expr({ happy: 1, surprised: 0 }); }],
      [0.4, () => { A.ane.walkTo(445, { speed: 140 }); A.iker.hop(); A.iker.expr({ happy: 1, surprised: 0 }); }],
    ],
    s14: [
      [0, () => shot(470, 250, 560, 0.9)],
      [0.4, () => A.bruna.nod()],
      [1.6, () => A.bruna.wave()],
    ],
    s15: [
      [0, () => shot(470, 250, 560, 0.4)],
      [0.3, () => A.bruna.shake()],
      [1.7, () => { A.bruna.nod(); popCard(A.bruna.x, FLOOR - 250, argentinaFlag, 2.4); }],
    ],
    s16: [
      [0, () => { shot(490, 270, 420, 0.8); A.bruna.pose('offer'); }],
      [0.8, () => { A.ane.expr({ stretch: 1, happy: 1 }); A.ane.hop(6); }],
      [1.8, () => { A.bruna.pose('down'); A.ane.expr({ stretch: 0 }); }],
    ],
    s17: [
      [0, () => { shot(...focus(A.iker, 300, 10), 0.8); A.iker.walkTo(372, { speed: 100, face: 1 }); }],
      [0.5, () => { A.iker.holdInHand(carta, 'translate(4 4) rotate(-70) scale(1.4)'); A.iker.pose('show'); A.iker.expr({ lookY: -0.5 }); }],
    ],
    s18: [
      [0, () => { shot(470, 260, 460, 0.8); A.bruna.nod(); A.iker.pose('down'); carta.remove(); A.iker.expr({ lookY: 0 }); }],
      [1.3, () => { A.bruna.pose('yay'); A.bruna.hop(8); A.bruna.expr({ happy: 1 }); }],
      [1.5, () => { for (const a of kids) a.expr({ surprised: 1 }); }],
      [2.1, () => { A.bruna.pose('down'); for (const a of kids) { a.expr({ surprised: 0, happy: 1 }); a.hop(12); } }],
    ],
    s19: [
      [0, () => { shot(...focus(A.bruna, 360, 10), 0.8); A.bruna.pose('belly'); }],
    ],
    s20: [
      [0, () => { shot(450, 270, 460, 0.6); A.bruna.pose('down'); A.iker.hop(12); A.iker.pose('belly'); A.iker.expr({ happy: 1 }); }],
      [1.0, () => { A.ane.nod(); A.iker.pose('down'); }],
    ],
    s21: [
      [0, () => { shot(...focus(A.bruna, 360, 10), 0.6); A.bruna.pose('offer'); A.bruna.face(1); }],
      [1.3, () => {
        A.bruna.pose('down');
        shot(760, 260, 760, 2.5);
        A.bruna.walkTo(1080, { speed: 130 }); A.ane.walkTo(1040, { speed: 140 }); A.iker.walkTo(1000, { speed: 150 }); A.txiki.walkTo(1110, { speed: 150 });
      }],
    ],
    s22: [
      [0, () => { toBar(); shot(1560, 270, 600, 0); A.waiter.expr({ happy: 0.8 }); }],
      [0.6, () => { bounce('tortilla'); bounce('queso'); bounce('jamón'); }],
      [2.2, () => bounce('tortilla')],
      [2.9, () => bounce('queso')],
      [3.5, () => bounce('jamón')],
    ],
    s23: [
      [0, () => { shot(1730, 270, 380, 0.8); A.bruna.pose('offer'); A.ane.face(1); }],
      [1.4, () => A.bruna.pose('down')],
    ],
    s24: [
      [0, () => { shot(1560, 280, 440, 0.8); A.ane.face(-1); }],
      [0.2, () => A.ane.pose('point')],
      [0.9, () => { bounce('tortilla'); A.waiter.nod(); }],
      [1.7, () => { A.ane.pose('hold'); give(A.ane, 'tortilla', 'translate(-2 2) rotate(100) scale(0.8)'); A.ane.expr({ happy: 1 }); }],
    ],
    s25: [
      [0, () => { shot(1700, 280, 440, 0.6); A.bruna.pose('offer'); }],
      [0.8, () => A.bruna.pose('down')],
    ],
    s26: [
      [0, () => { A.iker.hop(12); A.iker.pose('point'); }],
      [0.6, () => { bounce('queso'); A.waiter.nod(); }],
      [1.3, () => { A.iker.pose('hold'); give(A.iker, 'queso', 'translate(-2 2) rotate(100) scale(0.8)'); A.iker.expr({ happy: 1 }); }],
    ],
    s27: [
      [0, () => shot(1840, 320, 340, 0.8)],
      [1.2, () => A.txiki.wag(0)],
      [2.4, () => { A.txiki.bark(); }],
      [2.9, () => { props.bowl.g.style.display = ''; bounce('bowl'); A.txiki.wag(1); A.txiki.hop(14); }],
    ],
    s28: [
      [0, () => { shot(1640, 260, 640, 0.9); A.bruna.pose('belly'); A.bruna.expr({ happy: 1 }); }],
      [0.6, () => { for (const a of kids) a.expr({ happy: 1 }); A.ane.hop(8); }],
      [1.6, () => { A.bruna.pose('down'); A.bruna.nod(); }],
    ],
  };

  return { actors: A, init, script };
}
