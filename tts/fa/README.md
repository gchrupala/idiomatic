# Persian TTS for colloquial Tehrani speech

The Piper voices in the prototype mispronounce Persian, because espeak has to guess
the short vowels and the ezafe that the script leaves out. These scripts test the
open alternatives. They run on Snellius; git carries the code there and brings back
only small outputs (audio samples and metrics).

## Plan

1. **Survey the data** (`survey.py`): hours, clip lengths and sample clips per dataset.
2. **Hear the best existing open model**: Aava TTS 3B renders chapter 1 (`render_aava.py`),
   and Whisper checks each clip by transcribing it back (`asr_check.py`).
3. If no existing model is good enough, **train our own**. Transcribe informal speech, have
   Claude write the perski Latin transcription, keep only clips whose Latin text aligns with
   the audio (CTC forced alignment), and fine-tune a TTS model that reads the Latin text
   directly, so nothing is left to guess.

## Candidate data

| Dataset | Hours | Speakers | Register | Licence |
|---|---|---|---|---|
| [Mana-TTS](https://huggingface.co/datasets/MahtaFetrat/Mana-TTS) | ~114 | 1 | formal read | CC0 |
| [GPTInformal-Persian](https://huggingface.co/datasets/MahtaFetrat/GPTInformal-Persian) | ~6 | ? | informal text, read aloud | CC0 |
| [YODAS fa000](https://huggingface.co/datasets/espnet/yodas) | ~43 | many | YouTube (vlogs, talks), uploaded captions | CC-BY 3.0 |
| [ParsVoice](https://arxiv.org/abs/2510.10774) | ~1,800 | 470+ | audiobook narration | unclear, gated |
| Common Voice fa | large | many | read sentences, some casual | CC0 (Mozilla Data Collective) |
| ShEMO | ~3 | 87 | radio drama, emotional | research |

## Running on Snellius

From the repository root on the cluster. `MOWA_DATA` is a large directory (scratch or
project space) that holds datasets, model weights and the Hugging Face cache.

```sh
git pull
export MOWA_DATA=/scratch-shared/$USER/mowa
bash tts/fa/jobs/setup.sh                       # login node: venv, Aava, SNAC, Whisper
nohup bash tts/fa/jobs/survey.sh > tts/fa/logs/survey.log 2>&1 &   # login node, needs internet
sbatch --export=ALL,MOWA_DATA=$MOWA_DATA tts/fa/jobs/render_aava.sbatch   # GPU
git add tts/fa/out && git commit -m "Persian TTS survey and Aava renders" && git push
```

Overrides: `MOWA_MODULE_LOAD` (module(s) to load; the default Python module is a guess),
`MOWA_VENV` (venv path, default `.venv-tts`), `MOWA_PUSH=1` (the render job commits and
pushes its outputs). Slurm on Snellius doesn't inherit the shell's environment, so pass
job variables with `sbatch --export=ALL,...`.

Listen to the results in `listen.html`, served from the repository (for example through
raw.githack.com), which reads `out/aava/manifest.json` and `out/survey/summary.json`.
