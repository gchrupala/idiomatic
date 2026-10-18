"""Surveys the candidate Persian speech datasets: hours, clip lengths and samples.

Usage: python tts/fa/survey.py [--full]
Needs internet (run it on a login node). Writes tts/fa/out/survey/summary.json and
a few sample clips per dataset (mp3 + transcript), small enough to commit, so the
transcripts' register and the audio quality can be judged by ear.
Without --full only one Mana-TTS part is read; hours are then extrapolated.
"""
import io, json, random, sys
import numpy as np, soundfile as sf
from datasets import load_dataset, Audio
from common import OUT, save_mp3

N_SAMPLES = 12
DATASETS = {
    # name: (hf id, config, kwargs, transcript column)
    "mana-tts": ("MahtaFetrat/Mana-TTS", None, {"data_files": "dataset/dataset_part_001.parquet"}, "transcript"),
    "gptinformal": ("MahtaFetrat/GPTInformal-Persian", None, {}, "transcript"),
    "yodas-fa": ("espnet/yodas", "fa000", {"trust_remote_code": True}, "text"),
}

def clip_audio(row):
    """(samples, rate) from the datasets' differing audio layouts."""
    a = row["audio"]
    if isinstance(a, dict) and "array" in a:
        return np.asarray(a["array"], dtype=np.float32), a["sampling_rate"]
    if isinstance(a, dict) and a.get("bytes"):
        x, sr = sf.read(io.BytesIO(a["bytes"]), dtype="float32")
        return x, sr
    return np.asarray(a, dtype=np.float32), int(row.get("samplerate") or row.get("sample_rate"))

def survey(name, hf_id, config, kw, col, full):
    if full and name == "mana-tts":
        kw = {}
    ds = load_dataset(hf_id, config, split="train", **kw)
    rng = random.Random(0)
    picks = set(rng.sample(range(len(ds)), min(N_SAMPLES, len(ds))))
    durs, samples = [], []
    out = OUT / "survey" / name
    out.mkdir(parents=True, exist_ok=True)
    for i, row in enumerate(ds):
        x, sr = clip_audio(row)
        durs.append(len(x) / sr)
        if i in picks:
            save_mp3(out / f"{i}.mp3", x, sr)
            samples.append({"file": f"{name}/{i}.mp3", "text": row[col], "secs": round(len(x) / sr, 2), "rate": sr})
    d = np.array(durs)
    return {"hf": hf_id, "config": config, "partial": bool(kw.get("data_files")),
            "clips": len(d), "hours": round(d.sum() / 3600, 2),
            "secs_p10_p50_p90": [round(float(q), 1) for q in np.percentile(d, [10, 50, 90])],
            "samples": samples}

def main():
    full = "--full" in sys.argv
    summary = {}
    for name, (hf_id, config, kw, col) in DATASETS.items():
        print(f"surveying {name} ...", flush=True)
        try:
            summary[name] = survey(name, hf_id, config, dict(kw), col, full)
        except Exception as e:  # keep going: one broken dataset shouldn't sink the survey
            summary[name] = {"hf": hf_id, "error": repr(e)}
        print(json.dumps({k: v for k, v in summary[name].items() if k != "samples"}), flush=True)
    (OUT / "survey").mkdir(parents=True, exist_ok=True)
    json.dump(summary, open(OUT / "survey/summary.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
