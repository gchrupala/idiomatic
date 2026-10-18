"""Synthesise every test utterance with each Piper voice (via sherpa-onnx).

Usage: python make_audio.py MODELS_DIR OUT_DIR
Writes OUT_DIR/<lang>/<voice>/<n>.wav and OUT_DIR/manifest.json.
A clean copy and a copy with background noise at 15 dB SNR are written. Speech is
slowed a little and padded with 0.4 s of silence on each side, as a learner's
recording would be: Piper's Persian voices are fast and Whisper drops the ends
of very short clips without it.
"""
import json, sys, pathlib
import numpy as np, soundfile as sf, sherpa_onnx

VOICES = {
    "fa": ["fa_IR-amir-medium", "fa_IR-gyro-medium", "fa_IR-reza_ibrahim-medium"],
    "es": ["es_ES-davefx-medium", "es_ES-sharvard-medium"],
}

def tts_for(models, voice):
    d = models / f"vits-piper-{voice}"
    onnx = next(d.glob("*.onnx"))
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(onnx), tokens=str(d / "tokens.txt"), data_dir=str(d / "espeak-ng-data")),
        num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)

def add_noise(x, snr_db, rng):
    noise = np.cumsum(rng.standard_normal(len(x))) # brown-ish noise, like room hum
    noise -= np.convolve(noise, np.ones(200) / 200, mode="same")
    p_sig, p_noise = np.mean(x ** 2), np.mean(noise ** 2)
    return (x + noise * np.sqrt(p_sig / (p_noise * 10 ** (snr_db / 10)))).astype(np.float32)

def main(models, out):
    items = json.load(open(pathlib.Path(__file__).with_name("items.json")))
    rng = np.random.default_rng(0)
    manifest = []
    for lang, data in items.items():
        utts = [(t, gi, True) for gi, g in enumerate(data["groups"]) for t in g]
        utts += [(t, gi, False) for t, gi in data["out_of_set"]]
        for voice in VOICES[lang]:
            tts = tts_for(models, voice)
            d = out / lang / voice
            d.mkdir(parents=True, exist_ok=True)
            for n, (text, gi, in_set) in enumerate(utts):
                a = tts.generate(text, sid=0, speed=0.85)
                pad = np.zeros(int(0.4 * a.sample_rate), dtype=np.float32)
                x = np.concatenate([pad, np.array(a.samples, dtype=np.float32), pad])
                for cond, y in (("clean", x), ("noisy", add_noise(x, 15, rng))):
                    path = d / f"{n:03d}-{cond}.wav"
                    sf.write(path, y, a.sample_rate)
                    manifest.append(dict(lang=lang, voice=voice, cond=cond, text=text,
                                         group=gi, in_set=in_set, path=str(path)))
            print(lang, voice, len(utts), "utterances")
    json.dump(manifest, open(out / "manifest.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
