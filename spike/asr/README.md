# Speech recognition spike

Can the app tell which of a card's four answers a learner said, in Tehrani colloquial Persian and colloquial Peninsular Spanish? It doesn't transcribe freely: it matches what Whisper (or the browser) heard against the card's answers.

- `items.json`: 13 Persian and 8 Spanish answer sets (the four answers of one card), and 4 sentences per language that are not on their card, to test rejection.
- `make_audio.py`: speaks every answer with Piper voices (3 Persian, 2 Spanish), clean and with noise.
- `score.py`: transcribes with Whisper (sherpa-onnx, int8) and matches to the answers.
- `web/index.html`: a one-button test session (about 3 minutes): 3 Spanish and 3 Persian phrases through the browser's own recogniser, then 15 Persian phrases recorded for Whisper. It moves on by itself when you stop speaking and downloads a results file at the end. `own_voice.py` turns that file into audio for `score.py`.

Models come from the sherpa-onnx GitHub releases (`asr-models/sherpa-onnx-whisper-*`, `tts-models/vits-piper-*`). Install with `pip install sherpa-onnx soundfile numpy rapidfuzz`.

## Results on TTS audio (2026-10-18)

52 Persian answers × 3 voices and 32 Spanish answers × 2 voices, clean and with noise, plus 4 off-card sentences per language and voice. Full output: `results-tts.txt`.

"Right" means the matched answer was the spoken one. The safe rule accepts a match only with score ≥ 0.45 and a lead of ≥ 0.10 over the second-best answer; anything else counts as "not sure" and goes to "say it again" or tapping. With that rule no off-card sentence was accepted and almost no answer was mistaken for another.

| Whisper | Size (int8) | Persian, best guess | Persian, safe rule | Spanish, safe rule |
|---|---|---|---|---|
| tiny | 99 MB | 83% | 46% | 90% |
| base | 153 MB | 87% | 58% | 86% |
| small | 358 MB | 87% | 62% | 93% |
| turbo | 988 MB | 89% | 73% | 93% |

Chance is 25%. Wrong accepts under the safe rule were 0–1% for every model.

What it means:
- Spanish works with the smallest model.
- Persian is usable but not good: with a model that fits in a browser (base/small), the app is sure of a Persian answer only about 60% of the time and has to ask again or offer taps for the rest. It rarely marks a right answer wrong, which matters most.
- Many Persian errors look like the TTS voice's fault: Piper's Persian voices are trained on written Persian and mispronounce some colloquial forms (*ساعت* came out as "to at"). Real speech may do better. It may also do worse, since synthetic voices are cleaner than learners.
- Padding matters: without 0.4 s of silence around the clip, Persian accuracy dropped by 10–20 points.
- The off-card test set is small (12 Persian, 8 Spanish per condition).

Next: run `web/index.html` on a real device with your own voice, which tests both the browser recogniser (fa-IR, es-ES) and Whisper on real speech.
