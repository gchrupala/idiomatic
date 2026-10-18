"""Renders a chapter's sentences with Aava TTS (Orpheus-3B fine-tuned on Persian).

Usage: python tts/fa/render_aava.py AAVA_INFERENCE_PY [MODEL_DIR]
AAVA_INFERENCE_PY is examples/inference.py from github.com/KEYHAN-A/aava-refinement;
its loading and generation functions are reused. Needs a GPU. Writes
tts/fa/out/aava/<id>.mp3 and manifest.json. Each line is rendered twice
(sampling differs), to show how stable the model is.
"""
import importlib.util, json, sys
from common import OUT, chapter_lines, save_mp3

TAKES = 2

def main(inference_py, model="KEYHAN-A/aava-tts-persian-3b"):
    spec = importlib.util.spec_from_file_location("aava", inference_py)
    aava = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(aava)
    device = aava.detect_device(None)
    model, tok, snac = aava.load_model(model, device=device)
    out = OUT / "aava"
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sid, who, script, latin, en in chapter_lines():
        for take in range(TAKES):
            sr, audio = aava.generate_speech(script, model, tok, snac, device=device)
            save_mp3(out / f"{sid}-{take}.mp3", audio, sr)
            manifest.append({"id": sid, "take": take, "who": who, "script": script, "latin": latin,
                             "en": en, "file": f"aava/{sid}-{take}.mp3", "secs": round(len(audio) / sr, 2)})
            print(sid, take, latin, flush=True)
    json.dump(manifest, open(out / "manifest.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main(*sys.argv[1:])
