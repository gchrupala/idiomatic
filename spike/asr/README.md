# Speech recognition spike

Can the app tell which of a card's four answers a learner said, in Tehrani colloquial Persian and colloquial Peninsular Spanish? It doesn't transcribe freely: it matches what Whisper (or the browser) heard against the card's answers.

- `items.json`: 13 Persian and 8 Spanish answer sets (the four answers of one card), and 4 sentences per language that are not on their card, to test rejection.
- `make_audio.py`: speaks every answer with Piper voices (3 Persian, 2 Spanish), clean and with noise.
- `score.py`: transcribes with Whisper (sherpa-onnx, int8) and matches to the answers.
- `web/index.html`: a test page for the browser's own speech recognition and for recording your voice. `own_voice.py` turns its download into audio for `score.py`.

Models come from the sherpa-onnx GitHub releases (`asr-models/sherpa-onnx-whisper-*`, `tts-models/vits-piper-*`). Install with `pip install sherpa-onnx soundfile numpy rapidfuzz`.
