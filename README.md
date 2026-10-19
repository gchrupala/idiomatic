# Mowa

A prototype app for learning Spanish (colloquial, Spain) and Persian (spoken Tehrani) the way *Lingua Latina per se Illustrata* teaches Latin: a continuous story where meaning comes from context, heard first, then read, then practised with cards scheduled by FSRS.

There are two Spanish lessons, set in Bilbao, and one Persian lesson so far. The interface is in Polish.

## Running it

It is a static page with no build step. Serve the folder over http (the page loads its chapters with `fetch`), for example:

```
python3 -m http.server
```

and open http://localhost:8000. Run the tests with Node 18 or later: `npm test`.

## How it works

- **Listen** (`stage/`): a lesson with a `story` is played sentence by sentence as an animated scene with flat 2D cut-out characters drawn in SVG (`stage/engine.js`). Every moving part is a damped spring, so walks hop, turns flip, arms bend at the elbow and settle; faces blink, smile, look surprised and lip-sync to the loudness of the audio. Each story module (`stage/bilbao.js`, `stage/plaza.js`) draws its sets (`stage/sets.js`), places the cast (`stage/cast.js`) and gives every sentence a list of beats `[seconds, action]`. Jumping to a sentence replays the earlier beats instantly, so any sentence can be started from the right picture. Lessons without a story (Persian) use the simpler stage in `scene.js`, driven by scene actions in the lesson file. Subtitles are off by default.
- **Lessons**: each language lists its lessons in `content/<lang>/index.json`. Practice pools the cards of every lesson heard.
- **Read**: the text, sentence by sentence, with audio. Underlined words open a gloss in the language itself (synonyms, opposites, pictures), as in LLPSI; a translation into English or Polish is one more tap. Persian is shown in Latin transcription (the convention of the `perski` word list) with the script below it; the script can be switched off.
- **Practise** (`app.js`, `srs.js`): cards built from the lessons: picture → word, word heard → picture, a sentence with a gap, a question on the story, opposites, and typing a word heard (in Latin letters for Persian). `srs.js` is the FSRS-6 scheduler of MaxApki, unchanged, and the ratings follow MaxApki: wrong = Again, slow = Hard, right = Good, fast = Easy (never Easy on the first sight of a four-choice card). Up to 15 new cards a day per language. Progress is kept in `localStorage`.
- **Speaking** (`speech.js`): where the browser has speech recognition (Chrome), choice cards can be answered by voice. What was heard is matched against the card's answers with the normalisation and the safe rule tested in `spike/asr`; when it is not sure, it asks again.

## Content

`content/<lang>/chNN.json` holds a lesson: voices and cast, the sentences with English and Polish translations (and scene actions, for lessons without a story module), glosses, and cards. Persian strings are `"script|latin"`. `tests/content.test.js` checks every lesson: that the story module stages every sentence (or that scene actions name real actors and props), that every glossed form occurs in the text, that cards are well formed and that every text has audio.

The Spanish lessons: Ane (14), her brother Iker, their parents Begoña and Mikel and the dog Txiki live in Bilbao; Bruno is a family friend from Buenos Aires who speaks with voseo (*vos querés*, *¿cómo andan?*). Everyone else speaks Castilian Spanish.

Audio is text-to-speech made by `pipeline/build_audio.py` with Piper voices (sherpa-onnx), one mp3 per text in `audio/<lang>/`, mapped in `content/<lang>/chNN.audio.json`:

```
pip install sherpa-onnx soundfile numpy
python pipeline/build_audio.py MODELS_DIR content/es/ch01.json content/es/ch02.json content/fa/ch01.json
```

`MODELS_DIR` holds the `vits-piper-*` voices from the sherpa-onnx GitHub release `tts-models`. The Persian Piper voices are all male, so the women and children are the same voices with a raised pitch; the voices for each character were picked by how well Whisper understood them. The Spanish characters use the Castilian voices `es_ES-davefx` and `es_ES-sharvard`. There is no male Argentinian Piper voice: Bruno uses the Latin American male voice `es_MX-claude-high`, which Whisper understood better than the female Argentinian voice `es_AR-daniela-high` with its pitch lowered.

## Limitations

- Two Spanish lessons and one Persian lesson; none has been checked by a teacher or a native speaker.
- Bruno's voice is Latin American, not Argentinian; only his words are Argentinian.
- Speech answers need the browser's recogniser (Chrome, online). The offline Whisper fallback tested in `spike/asr` is not in the app yet.
- No offline copy or install as an app yet (MaxApki's service worker could be reused).

## Files

- `index.html`: the page and its styles.
- `app.js`: the views (home, language, lesson, listen, read, practise).
- `stage/`: the animated cut-out stage and the Spanish story modules.
- `scene.js`: the simple stage, for the Persian lesson.
- `speech.js`: matching spoken and typed answers; the browser's speech recogniser.
- `srs.js`: the FSRS-6 scheduler from MaxApki, with its tests in `tests/`.
- `content/`, `audio/`, `pipeline/`: lessons, their audio, and the script that makes it.
- `spike/asr/`: the speech recognition test. The earlier animation spikes (VRM 3D and the first 2D version, with hand-drawn variants) are in the git history, up to commit ae86dbf.
