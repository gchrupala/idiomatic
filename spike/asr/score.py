"""Transcribe the test audio with Whisper (sherpa-onnx) and match it to the card's answers.

Usage: python score.py MODELS_DIR AUDIO_DIR MODEL [MODEL ...]   (MODEL: tiny, base, small, turbo)
Writes AUDIO_DIR/results-<model>.json and prints a summary.
"""
import json, sys, time, pathlib, unicodedata, re
import soundfile as sf, sherpa_onnx
from rapidfuzz.distance import Levenshtein

NUM = {
    "fa": "صفر یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده".split(),
    "es": "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce".split(),
}
FA_MAP = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ة": "ه", "أ": "ا", "إ": "ا", "آ": "ا", "ؤ": "و",
                        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6",
                        "۷": "7", "۸": "8", "۹": "9", "‌": ""})

def norm(s, lang):
    s = unicodedata.normalize("NFKC", s).lower()
    if lang == "fa":
        s = s.translate(FA_MAP)
        s = re.sub("[ً-ْٰـ]", "", s)  # vowel marks, tatweel
    else:
        s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\d+", lambda m: f" {NUM[lang][int(m.group())]} " if int(m.group()) < 13 else m.group(), s)
    return re.sub(r"[\W_]+", "", s)  # drop spaces and punctuation

def sim(a, b):
    return 1 - Levenshtein.distance(a, b) / max(len(a), len(b), 1)

def recognizer(models, name, lang):
    d = models / f"sherpa-onnx-whisper-{name}"
    pick = lambda part: str(next(d.glob(f"*{part}.int8.onnx")))
    return sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=pick("encoder"), decoder=pick("decoder"), tokens=str(next(d.glob("*tokens.txt"))),
        language=lang, task="transcribe", num_threads=4)

def main(models, audio, names):
    items = json.load(open(pathlib.Path(__file__).with_name("items.json")))
    manifest = json.load(open(audio / "manifest.json"))
    for name in names:
        rows = []
        for lang in sorted({m["lang"] for m in manifest}):
            rec = recognizer(models, name, lang)
            for m in (m for m in manifest if m["lang"] == lang):
                x, sr = sf.read(m["path"], dtype="float32")
                st = rec.create_stream()
                st.accept_waveform(sr, x)
                t0 = time.time()
                rec.decode_stream(st)
                hyp = st.result.text.strip()
                cands = items[lang]["groups"][m["group"]]
                scores = [sim(norm(hyp, lang), norm(c, lang)) for c in cands]
                best = max(range(4), key=scores.__getitem__)
                rows.append(dict(m, hyp=hyp, best=cands[best], score=scores[best],
                                 runner_up=sorted(scores)[-2], secs=time.time() - t0,
                                 audio_secs=len(x) / sr))
        json.dump(rows, open(audio / f"results-{name}.json", "w"), ensure_ascii=False, indent=1)
        summarise(name, rows)

def summarise(name, rows, thresholds=(0.0, 0.5, 0.6, 0.7)):
    for lang in ("fa", "es"):
        for cond in sorted({x["cond"] for x in rows if x["lang"] == lang}):
            r = [x for x in rows if x["lang"] == lang and x["cond"] == cond]
            ins, oos = [x for x in r if x["in_set"]], [x for x in r if not x["in_set"]]
            if not ins:
                continue
            rtf = sum(x["secs"] for x in r) / sum(x["audio_secs"] for x in r)
            parts = []
            for t in thresholds:
                ok = sum(x["score"] >= t and x["best"] == x["text"] for x in ins) / len(ins)
                wrong = sum(x["score"] >= t and x["best"] != x["text"] for x in ins) / len(ins)
                fa = sum(x["score"] >= t for x in oos) / max(len(oos), 1)
                parts.append(f"T={t}: right {ok:.0%} wrong {wrong:.0%} oos-accept {fa:.0%}")
            print(f"{name:6} {lang} {cond:5} n={len(ins)}+{len(oos)} rtf={rtf:.2f} | " + " | ".join(parts))

if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3:])
