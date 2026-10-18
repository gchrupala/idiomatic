# Mowa

A prototype app for learning Spanish (colloquial, Spain) and Persian (spoken Tehrani) the way *Lingua Latina per se Illustrata* teaches Latin: a continuous story where meaning comes from context, heard first, then read, then practised with cards scheduled by FSRS.

There is one chapter per language so far.

## Running it

It is a static page with no build step. Serve the folder over http (the page loads its chapters with `fetch`), for example:

```
python3 -m http.server
```

and open http://localhost:8000. Run the tests with Node 18 or later: `npm test`.

## How it works

- **Listen** (`scene.js`): the chapter is played sentence by sentence over a simple SVG animation. Each sentence in the chapter file lists scene actions (`enter`, `move`, `show`, `give`, `point`, `bubble`, …) with optional delays. Lasting actions are replayed instantly when you jump to a sentence, so any sentence can be replayed. Subtitles are off by default.
- **Read**: the text, sentence by sentence, with audio. Underlined words open a gloss in the language itself (synonyms, opposites, pictures), as in LLPSI; a translation into English or Polish is one more tap. Persian is shown in Latin transcription (the convention of the `perski` word list) with the script below it; the script can be switched off.
- **Practise** (`app.js`, `srs.js`): cards built from the chapter: picture → word, word heard → picture, a sentence with a gap, a question on the story, opposites, and typing a word heard (in Latin letters for Persian). `srs.js` is the FSRS-6 scheduler of MaxApki, unchanged, and the ratings follow MaxApki: wrong = Again, slow = Hard, right = Good, fast = Easy (never Easy on the first sight of a four-choice card). Up to 15 new cards a day per language. Progress is kept in `localStorage`.
- **Speaking** (`speech.js`): where the browser has speech recognition (Chrome), choice cards can be answered by voice. What was heard is matched against the card's answers with the normalisation and the safe rule tested in `spike/asr`; when it is not sure, it asks again.

## Content

`content/<lang>/ch01.json` holds a chapter: voices, cast and props for the stage, the sentences with translations and scene actions, glosses, and cards. Persian strings are `"script|latin"`. `tests/content.test.js` checks that scene actions name real actors and props, that every glossed form occurs in the text, that cards are well formed and that every text has audio.

Audio is text-to-speech made by `pipeline/build_audio.py` with Piper voices (sherpa-onnx), one mp3 per text in `audio/<lang>/`, mapped in `content/<lang>/ch01.audio.json`:

```
pip install sherpa-onnx soundfile numpy
python pipeline/build_audio.py MODELS_DIR content/es/ch01.json content/fa/ch01.json
```

`MODELS_DIR` holds the `vits-piper-*` voices from the sherpa-onnx GitHub release `tts-models`. The Persian Piper voices are all male, so the women and children are the same voices with a raised pitch; the voices for each character were picked by how well Whisper understood them.

## Limitations

- One chapter per language; the Spanish and Persian have not been checked by a teacher or a native speaker.
- Speech answers need the browser's recogniser (Chrome, online). The offline Whisper fallback tested in `spike/asr` is not in the app yet.
- No offline copy or install as an app yet (MaxApki's service worker could be reused).

## Files

- `index.html`: the page and its styles.
- `app.js`: the views (home, listen, read, practise).
- `scene.js`: the animated stage.
- `speech.js`: matching spoken and typed answers; the browser's speech recogniser.
- `srs.js`: the FSRS-6 scheduler from MaxApki, with its tests in `tests/`.
- `content/`, `audio/`, `pipeline/`: chapters, their audio, and the script that makes it.
- `spike/asr/`: the speech recognition test.
