"""Shared helpers for the Persian TTS experiments."""
import json, pathlib, re
import numpy as np, soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = pathlib.Path(__file__).resolve().parent / "out"

def chapter_lines(path=ROOT / "content/fa/ch01.json"):
    """(id, speaker, script, latin, english) for every sentence of a chapter."""
    ch = json.load(open(path))
    for s in ch["sentences"]:
        script, latin = s["text"].split("|")
        yield s["id"], s["who"], script, latin, s.get("en", "")

def save_mp3(path, x, rate):
    """Mono MP3 via libsndfile, so the cluster needs no ffmpeg."""
    x = np.asarray(x, dtype=np.float32)
    sf.write(str(path), x.mean(axis=1) if x.ndim > 1 else x, rate, format="MP3")

_ARABIC_VARIANTS = str.maketrans({"ي": "ی", "ك": "ک", "ى": "ی", "ة": "ه", "‌": " "})

def norm(s):
    """Script text reduced to its letters, for CER. Spaces go too: Persian spacing
    (and the zero-width non-joiner) varies between writers."""
    s = s.translate(_ARABIC_VARIANTS)
    s = re.sub(r"[ً-ٰٟ]", "", s)  # harakat
    s = re.sub(r"[^\w\s]", " ", s)
    return "".join(s.split())

def cer(ref, hyp):
    ref, hyp = norm(ref), norm(hyp)
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1] / max(len(ref), 1)
