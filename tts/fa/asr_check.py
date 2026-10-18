"""Round-trip check: transcribes rendered clips with Whisper and scores them against the text.

Usage: python tts/fa/asr_check.py ENGINE [WHISPER_MODEL]
Reads tts/fa/out/ENGINE/manifest.json, adds "asr" and "cer" to each entry and
prints the mean CER. A high CER flags a clip worth listening to, not proof it's
wrong: Whisper tends to write colloquial speech in formal spelling.
"""
import json, sys
from transformers import pipeline
from common import OUT, cer

def main(engine, model="openai/whisper-large-v3"):
    path = OUT / engine / "manifest.json"
    manifest = json.load(open(path))
    asr = pipeline("automatic-speech-recognition", model=model, device_map="auto")
    for m in manifest:
        m["asr"] = asr(str(OUT / m["file"]), generate_kwargs={"language": "persian", "task": "transcribe"})["text"].strip()
        m["cer"] = round(cer(m["script"], m["asr"]), 3)
        print(f'{m["cer"]:.2f}  {m["latin"]}  |  {m["asr"]}', flush=True)
    json.dump(manifest, open(path, "w"), ensure_ascii=False, indent=1)
    print("mean CER", round(sum(m["cer"] for m in manifest) / len(manifest), 3))

if __name__ == "__main__":
    main(*sys.argv[1:])
