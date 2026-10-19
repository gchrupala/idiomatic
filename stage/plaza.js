// Lesson 2, "El sábado en la Plaza Nueva": rain, the man with the red umbrella, pintxos.
import { FLOOR, rt, props, set, later, shot, focus, bubble, bounce, ring, popCard, setRain } from './engine.js';
import { sky, aneStreet, plaza, bar, letter, umbrella, argentinaFlag } from './sets.js';
import { cast } from './cast.js';

export default function story() {
  sky(-2000, 2300, '#c9d6e0', { sun: false, grey: true });
  aneStreet({ wet: true });
  plaza();
  const B = bar(1300);
  const A = cast('waiter', 'ane', 'iker', 'bruno', 'txiki');
  A.waiter.layer('back');
  const yellow = umbrella('#f2c230', -8), red = umbrella('#d9342b', -6);
  const carta = letter(null);
  const kids = [A.ane, A.iker], people = [...kids, A.bruno];

  function home(name) { const p = props[name]; p.home.appendChild(p.g); p.g.setAttribute('transform', `translate(${p.x} ${p.y})`); }
  function give(a, name, transform) { a.holdInHand(props[name].g, transform); }

  function init() {
    setRain(true);
    A.ane.place(-480, 1); A.iker.place(-425, 1); A.txiki.place(-380, 1);
    A.bruno.place(1200, -1);
    A.waiter.place(1470, 1);
    A.ane.carry(yellow); A.bruno.carry(red);
    for (const a of people) a.expr({ happy: 0.5 });
    carta.remove();
    for (const n of ['tortilla', 'queso', 'jamón', 'más', 'bowl']) home(n);
    props.bowl.g.style.display = 'none';
    shot(-460, 230, 760, 0);
  }

  const toBar = () => {
    setRain(false);
    A.ane.carry(null); A.bruno.carry(null);
    A.iker.place(1630, -1); A.ane.place(1705, -1); A.bruno.place(1795, -1); A.txiki.place(1880, -1);
    A.ane.pose('down'); A.iker.pose('down'); A.bruno.pose('down');
  };

  const script = {
    s01: [
      [0, () => shot(-460, 230, 760, 0)],
      [0.2, () => shot(-440, 290, 440, 2.2)],
      [0.8, () => { A.ane.expr({ lookY: -1, happy: 0.3 }); A.iker.pose('offer'); A.iker.expr({ lookY: -0.6 }); }],
      [1.9, () => { A.iker.pose('down'); A.iker.expr({ lookY: 0, happy: 0.8 }); A.ane.expr({ lookY: 0 }); }],
    ],
    s02: [
      [0, () => shot(-250, 290, 620, 2.6)],
      [0.3, () => {
        A.ane.walkTo(-20, { speed: 120 });
        A.iker.walkTo(35, { speed: 120 });
        A.txiki.walkTo(90, { speed: 120 });
      }],
    ],
    s03: [
      [0, () => {
        shot(500, 200, 1120, 0);
        A.ane.place(-60, 1); A.iker.place(-5, 1); A.txiki.place(50, 1);
        A.ane.walkTo(300, { speed: 130 }); A.iker.walkTo(355, { speed: 130 }); A.txiki.walkTo(230, { speed: 130, face: 1 });
      }],
      [1.6, () => shot(500, 240, 900, 1.6)],
    ],
    s04: [
      [0, () => { shot(440, 150, 620, 1.0); A.iker.face(1); A.iker.expr({ lookY: -1 }); }],
      [0.6, () => { ring(props.clock.x, props.clock.y, 30, 30, 1.4); bubble('11:00', () => ({ x: props.clock.x, y: props.clock.y + 60 }), 1.6); }],
      [1.6, () => { shot(...focus(A.iker, 320, -10), 0.9); A.iker.expr({ lookY: 0 }); A.iker.face(-1); A.iker.pose('shrug'); }],
      [2.6, () => A.iker.pose('down')],
    ],
    s05: [
      [0, () => { shot(...focus(A.ane, 320, 10), 0.7); A.ane.face(1); }],
      [0.4, () => { A.ane.pose('point'); A.ane.hop(10); A.ane.expr({ surprised: 0.8 }); A.iker.face(1); }],
    ],
    s06: [
      [0, () => { shot(640, 250, 820, 1.0); A.ane.pose('down'); A.bruno.place(1080, -1); A.bruno.walkTo(560, { speed: 150 }); }],
      [1.0, () => { A.ane.expr({ surprised: 0.2 }); A.iker.expr({ surprised: 0.6 }); }],
    ],
    s07: [
      [0, () => { shot(...focus(A.bruno, 380, -30), 0.8); A.bruno.face(-1); A.bruno.expr({ happy: 1 }); }],
      [0.2, () => A.bruno.wave()],
    ],
    s08: [
      [0, () => { shot(450, 280, 480, 0.8); A.ane.hop(16); A.ane.wave(); A.ane.expr({ happy: 1, surprised: 0 }); }],
      [0.4, () => { A.ane.walkTo(445, { speed: 140 }); A.iker.hop(); A.iker.expr({ happy: 1, surprised: 0 }); }],
    ],
    s09: [
      [0, () => shot(470, 250, 560, 0.9)],
      [0.4, () => A.bruno.nod()],
      [1.7, () => popCard(A.bruno.x, FLOOR - 250, argentinaFlag, 2.4)],
    ],
    s10: [
      [0, () => { shot(490, 270, 420, 0.8); A.bruno.pose('offer'); }],
      [1.0, () => { A.ane.expr({ stretch: 1, happy: 1 }); A.ane.hop(6); }],
      [2.0, () => { A.bruno.pose('down'); A.ane.expr({ stretch: 0 }); }],
    ],
    s11: [
      [0, () => { shot(...focus(A.iker, 300, 10), 0.8); A.iker.walkTo(372, { speed: 100, face: 1 }); }],
      [0.5, () => { A.iker.holdInHand(carta, 'translate(4 4) rotate(-70) scale(1.4)'); A.iker.pose('show'); A.iker.expr({ lookY: -0.5 }); }],
    ],
    s12: [
      [0, () => { shot(470, 260, 460, 0.8); A.bruno.nod(); A.iker.pose('down'); carta.remove(); A.iker.expr({ lookY: 0 }); }],
      [1.3, () => { A.bruno.pose('yay'); A.bruno.hop(8); A.bruno.expr({ happy: 1 }); }],
      [1.6, () => { for (const a of kids) { a.expr({ surprised: 1 }); } }],
      [2.3, () => { A.bruno.pose('down'); for (const a of kids) { a.expr({ surprised: 0, happy: 1 }); a.hop(12); } }],
    ],
    s13: [
      [0, () => { shot(...focus(A.bruno, 360, 10), 0.8); A.bruno.pose('belly'); }],
      [1.3, () => { A.bruno.pose('offer'); A.bruno.face(1); }],
      [2.2, () => {
        A.bruno.pose('down');
        shot(760, 260, 760, 2.5);
        A.bruno.walkTo(1080, { speed: 130 }); A.ane.walkTo(1040, { speed: 140 }); A.iker.walkTo(1000, { speed: 150 }); A.txiki.walkTo(1110, { speed: 150 });
      }],
    ],
    s14: [
      [0, () => { toBar(); shot(1560, 270, 600, 0); A.waiter.expr({ happy: 0.8 }); }],
      [1.2, () => bounce('tortilla')],
      [1.9, () => bounce('queso')],
      [2.6, () => bounce('jamón')],
    ],
    s15: [
      [0, () => { shot(1730, 270, 380, 0.8); A.bruno.pose('offer'); A.ane.face(1); }],
      [1.4, () => A.bruno.pose('down')],
    ],
    s16: [
      [0, () => { shot(1560, 280, 440, 0.8); A.ane.face(-1); }],
      [0.2, () => { A.ane.pose('point'); }],
      [0.7, () => { bounce('tortilla'); A.waiter.nod(); }],
      [1.5, () => { A.ane.pose('hold'); give(A.ane, 'tortilla', 'translate(-2 2) rotate(100) scale(0.8)'); A.ane.expr({ happy: 1 }); }],
    ],
    s17: [
      [0, () => { A.iker.hop(12); A.iker.pose('point'); }],
      [0.4, () => { bounce('queso'); A.waiter.nod(); }],
      [1.0, () => { A.iker.pose('hold'); give(A.iker, 'queso', 'translate(-2 2) rotate(100) scale(0.8)'); A.iker.expr({ happy: 1 }); }],
    ],
    s18: [
      [0, () => { shot(1840, 320, 340, 0.8); A.txiki.bark(); }],
      [0.6, () => { props.bowl.g.style.display = ''; bounce('bowl'); A.txiki.wag(1); A.txiki.hop(14); }],
    ],
    s19: [
      [0, () => { shot(1640, 260, 640, 0.9); A.bruno.pose('belly'); A.bruno.expr({ happy: 1 }); }],
      [0.6, () => { for (const a of kids) a.expr({ happy: 1 }); A.ane.hop(8); }],
      [1.6, () => { A.bruno.pose('down'); A.bruno.nod(); }],
    ],
  };

  return { actors: A, init, script };
}
