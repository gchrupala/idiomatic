"""Speaks every sentence and card of a chapter with Piper voices (via sherpa-onnx).

Usage: python pipeline/build_audio.py MODELS_DIR content/es/ch01.json [...]

MODELS_DIR holds the sherpa-onnx Piper voices (vits-piper-<voice>/), from the
sherpa-onnx GitHub release "tts-models". Writes audio/<lang>/<hash>.mp3 and
content/<lang>/<chapter>.audio.json, which maps each text to its file and length.
Files that already exist are kept, so only changed text is spoken again.
"""
import hashlib, json, pathlib, subprocess, sys, tempfile
import numpy as np, soundfile as sf, sherpa_onnx

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEED = 0.9  # a little slower than the voices' default, for learners
_tts = {}

def script(s):
    """Persian strings are "script|latin"; only the script is spoken."""
    return s.split("|")[0]

def tts(models, voice):
    if voice not in _tts:
        d = models / f"vits-piper-{voice}"
        cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(next(d.glob("*.onnx"))), tokens=str(d / "tokens.txt"), data_dir=str(d / "espeak-ng-data")),
            num_threads=4))
        _tts[voice] = sherpa_onnx.OfflineTts(cfg)
    return _tts[voice]

def speak(models, text, v, out):
    a = tts(models, v["voice"]).generate(text, sid=v.get("sid", 0), speed=SPEED)
    pad = np.zeros(int(0.15 * a.sample_rate), dtype=np.float32)
    x = np.concatenate([pad, np.array(a.samples, dtype=np.float32), pad])
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        sf.write(f.name, x, a.sample_rate)
        p = v.get("pitch", 1)
        # Raise the pitch without changing the speed: for children and for female
        # characters where the language only has male voices.
        filt = f"asetrate={a.sample_rate * p:.0f},aresample={a.sample_rate},atempo={1 / p:.4f}" if p != 1 else "anull"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f.name, "-af", filt,
                        "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "6", str(out)], check=True)

def chapter_texts(ch):
    """(text, speaker) for everything the app can play."""
    yield from ((s["text"], s["who"]) for s in ch["sentences"])
    for c in ch["cards"]:
        if c["kind"] == "picture":
            yield c["word"], "narrator"
        elif c["kind"] == "gap":
            yield fill(c["text"], c["answer"]), "narrator"
        else:
            yield (c["text"] if c["kind"] == "question" else c["word"]), "narrator"
            for o in [c["answer"], *c["wrong"]]:
                yield o, "narrator"

def fill(text, answer):
    """The gap sentence with its answer; for "script|latin" both halves are filled."""
    if "|" in text:
        (s, l), (a, al) = text.split("|"), answer.split("|")
        return s.replace("___", a) + "|" + l.replace("___", al)
    return text.replace("___", answer)

def build(models, path):
    ch = json.load(open(path))
    out_dir = ROOT / "audio" / ch["lang"]
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for text, who in chapter_texts(ch):
        v = ch["voices"][who]
        spoken = script(text)
        key = hashlib.sha1(json.dumps([spoken, v], sort_keys=True).encode()).hexdigest()[:12]
        out = out_dir / f"{key}.mp3"
        if not out.exists():
            speak(models, spoken, v, out)
        manifest[text] = {"file": f"audio/{ch['lang']}/{key}.mp3", "secs": round(sf.info(out).duration, 2)}
    json.dump(manifest, open(pathlib.Path(path).with_suffix(".audio.json"), "w"), ensure_ascii=False, indent=1)
    print(path, len(manifest), "texts")

if __name__ == "__main__":
    for p in sys.argv[2:]:
        build(pathlib.Path(sys.argv[1]), p)
