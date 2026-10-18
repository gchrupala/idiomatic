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
