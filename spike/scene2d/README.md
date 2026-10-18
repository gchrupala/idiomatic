# Flat 2D scene spike

The whole Spanish chapter 1 ("Una carta sin nombre") as one animated scene,
in a flat, cut-out cartoon style. Everything is drawn in code as SVG: no
images, fonts or libraries.

Open `spike/scene2d/index.html` from a web server at the repo root (it loads
`content/es/` and `audio/es/`).

## How it works

- Characters (`Person`, `Dog` in `scene2d.js`) are side-on cut-outs: a head
  with both eyes on the facing side, a dress or shirt, stick limbs.
- Every moving part is a damped spring (`Spring`), so movement overshoots
  and settles: a hopping walk, cartoon turns (the figure flips through
  zero width), squash when stopping, arm gestures, head bob while talking.
- Faces: blinking, smile, surprise (wide eyes, raised brows, an O mouth), and
  lip-sync from the loudness of the sentence audio.
- Each sentence is a list of beats that set targets (walk here, sit, wave,
  which camera shot). Seeking replays earlier beats instantly.
- The camera is the SVG viewBox, eased between shots: the city, Lucía's
  block of flats, then the kitchen.
- `?maxdt=0.1` lets headless tests on slow machines run in scene time.

## Variants (URL parameters)

- `style=ink` (default): rough.js outlines in dark ink over flat colour,
  with line boil (three wobbly copies of every shape, cycled 8 times a second).
- `style=crayon`: hatched colour-pencil fills, coloured edges, and held
  frames at 12 fps (`fps=12`), like hand animation.
- `style=flat`: clean vector shapes.
- `motion=peppa` (default): quick clean turns, small fast steps, little
  bounce, head rocking while talking. `motion=springy`: the first version,
  with more overshoot and bounce.

rough.js 4.6.6 is vendored in `vendor/` (MIT).
