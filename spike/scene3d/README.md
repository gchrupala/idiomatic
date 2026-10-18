# 3D scene spike

Sentences 10–19 of the Spanish chapter 1 ("Una carta sin nombre"), played as a
3D scene: breakfast, a knock at the door, Lucía finds the letter.

Open `spike/scene3d/index.html` from a web server at the repo root (it loads
`content/es/` and `audio/es/`), e.g. `python3 -m http.server` and
http://localhost:8000/spike/scene3d/.

## How it works

- three.js 0.180 and three-vrm 3.5 (vendored in `vendor/`, MIT).
- Characters are VRM avatars, posed in code (`scene3d.js`, class `Actor`):
  walking, sitting, crouching, arm gestures, head turns towards a target,
  eye gaze, blinking, facial expressions, and lip-sync from the loudness of
  the sentence audio (Web Audio analyser).
- Each sentence has a list of beats that set targets (where to walk, what to
  look at, which gesture, which camera shot). Seeking replays earlier beats
  instantly, so any sentence can be started on its own.
- `?maxdt=0.4` lets headless tests on software GL run in scene time.

## Assets and licences

| Asset | Source | Licence |
| --- | --- | --- |
| `assets/avatars/lucia.vrm`, `pablo.vrm` | VRoid AvatarSample_A, _C (pixiv) | VRoid sample terms: commercial use allowed; redistribution terms not verified |
| `assets/avatars/carmen.vrm` | VRM1_Constraint_Twist_Sample (pixiv) | VRM Public License 1.0: redistribution and modification allowed |
| `assets/furniture/*` | KayKit Furniture Bits 1.0 (Kay Lousberg) | CC0 |

The avatars are stand-ins: textures were shrunk to 512 px with
`tools/shrink_vrm.py`. Real characters (adults, Persian family, hijab) would be
made in VRoid Studio and exported as VRM.
