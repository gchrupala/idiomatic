"""Turn a results file downloaded from web/index.html into audio that score.py can test.

Usage: python own_voice.py speech-test-....json OUT_DIR
Then:  python score.py MODELS_DIR OUT_DIR tiny base small turbo
"""
import base64, json, subprocess, sys, pathlib

def main(results, out):
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for n, x in enumerate(json.load(open(results))):
        if not x.get("audio"):
            continue
        raw = out / f"{n:03d}.webm"
        raw.write_bytes(base64.b64decode(x["audio"].split(",", 1)[1]))
        wav = raw.with_suffix(".wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-ac", "1", "-ar", "16000", wav], check=True)
        manifest.append(dict(lang=x["lang"], voice="own", cond="mic", text=x["text"], group=x["group"],
                             in_set=x["in_set"], path=str(wav), browser=x["alternatives"]))
    json.dump(manifest, open(out / "manifest.json", "w"), ensure_ascii=False, indent=1)
    print(len(manifest), "recordings")

if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
