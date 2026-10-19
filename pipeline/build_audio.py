"""Speaks every sentence and card of a chapter with Piper voices (via sherpa-onnx).

Usage: python pipeline/build_audio.py MODELS_DIR content/es/ch01.json [...]

MODELS_DIR holds the sherpa-onnx Piper voices (vits-piper-<voice>/), from the
sherpa-onnx GitHub release "tts-models". Writes audio/<lang>/<hash>.mp3 and
content/<lang>/<chapter>.audio.json, which maps each text to its file and length.
Files that already exist are kept, so only changed text is spoken again.
"""
import hashlib, json, pathlib, re, subprocess, sys, tempfile
import numpy as np, pyworld as pw, soundfile as sf, sherpa_onnx

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

# Spanish question words: questions that start with one fall at the end, as
# statements do; the others (yes/no questions) rise.
WH = re.compile(r"^(qué|quién|quiénes|dónde|adónde|cómo|cuándo|cuánto|cuánta|cuántos|cuántas|cuál|cuáles|por qué|para qué|de quién|para quién|de dónde|con quién)\b", re.I)
INTONATION = 3  # bump to re-speak every question when the contours change

def segments(text):
    """The sentences of a text, each ending in its punctuation."""
    return [t for t in re.split(r"(?<=[.?!…»])\s+", text.strip()) if t]

def question_rise(x, sr, k):
    """Bends the pitch of the last ~0.45 s of voice up to (1 + k) times the
    speaker's median pitch, re-synthesised with WORLD. Piper lets questions
    fall like statements; k = 0.6 gives a yes/no rise, k = 0 just stops the fall."""
    x64 = x.astype(np.float64)
    f0, t = pw.harvest(x64, sr, frame_period=5.0)
    sp, ap = pw.cheaptrick(x64, f0, t, sr), pw.d4c(x64, f0, t, sr)
    hop = int(0.005 * sr)
    rms = np.array([np.sqrt(np.mean(x64[i * hop:(i + 1) * hop + hop] ** 2)) if i * hop < len(x64) else 0 for i in range(len(f0))])
    voiced = np.nonzero((f0 > 0) & (rms > 0.15 * rms.max()))[0]
    if not len(voiced):
        return x
    base, end = np.median(f0[voiced]), voiced[-1]
    span = np.arange(max(0, end - int(0.45 / 0.005)), len(f0))
    r = np.clip((span - span[0]) / max(1, end - span[0]), 0, 1) ** 1.4
    g = f0.copy()
    target = base * (1 + k)
    g[span] = np.where(f0[span] > 0, f0[span] * (1 - r) + np.maximum(f0[span], target * (0.85 + 0.15 * r)) * r, 0)
    y = pw.synthesize(g, sp, ap, sr, frame_period=5.0)
    return y[:len(x)].astype(np.float32)

def speak(models, text, v, out):
    engine = tts(models, v["voice"])
    sr = engine.sample_rate
    gen = lambda t: np.array(engine.generate(t, sid=v.get("sid", 0), speed=SPEED).samples, dtype=np.float32)
    if "?" in text and v["voice"].startswith("es"):
        # Piper reads questions like statements: speak each sentence on its own
        # and give the questions a final rise (a small one for wh-questions).
        parts = []
        for seg in segments(text):
            y = gen(seg)
            if seg.endswith("?"):
                y = question_rise(y, sr, 0.0 if WH.match(seg[seg.find("¿") + 1:]) else 0.6)
            parts += [y, np.zeros(int(0.12 * sr), dtype=np.float32)]
        samples = np.concatenate(parts[:-1])
    else:
        samples = gen(text)
    pad = np.zeros(int(0.15 * sr), dtype=np.float32)
    x = np.concatenate([pad, samples, pad])
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        sf.write(f.name, x, sr)
        p = v.get("pitch", 1)
        # Raise the pitch without changing the speed: for children and for female
        # characters where the language only has male voices.
        filt = f"asetrate={sr * p:.0f},aresample={sr},atempo={1 / p:.4f}" if p != 1 else "anull"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f.name, "-af", filt,
                        "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "6", str(out)], check=True)

ENV_HZ = 25

def envelope(path):
    """Loudness, 0-99, ENV_HZ times a second: the stage moves the mouths with it."""
    x = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                                     capture_output=True, check=True).stdout, dtype=np.float32)
    n = 16000 // ENV_HZ
    rms = np.sqrt([np.mean(x[i:i + n] ** 2) for i in range(0, len(x), n)])
    return [int(v) for v in np.clip(rms / max(rms.max(), 1e-6) * 99, 0, 99).round()]

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
        tag = [INTONATION] if "?" in spoken and v["voice"].startswith("es") else []
        key = hashlib.sha1(json.dumps([spoken, v, *tag], sort_keys=True).encode()).hexdigest()[:12]
        out = out_dir / f"{key}.mp3"
        if not out.exists():
            speak(models, spoken, v, out)
        manifest[text] = {"file": f"audio/{ch['lang']}/{key}.mp3", "secs": round(sf.info(out).duration, 2), "env": envelope(out)}
    # one text per line, so diffs stay readable
    lines = (f"{json.dumps(k, ensure_ascii=False)}: {json.dumps(v)}" for k, v in manifest.items())
    pathlib.Path(path).with_suffix(".audio.json").write_text("{\n" + ",\n".join(lines) + "\n}\n")
    print(path, len(manifest), "texts")

if __name__ == "__main__":
    for p in sys.argv[2:]:
        build(pathlib.Path(sys.argv[1]), p)
