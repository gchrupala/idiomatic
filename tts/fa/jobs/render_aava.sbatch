#!/usr/bin/env bash
# Renders chapter 1 with Aava, then runs the Whisper round-trip check.
# Usage (from the repo root, after setup.sh):
#   sbatch --export=ALL,MOWA_DATA=/scratch-shared/$USER/mowa tts/fa/jobs/render_aava.sbatch
# Slurm on Snellius doesn't inherit the shell's environment: pass variables with --export.
#SBATCH --job-name=mowa-aava
#SBATCH --partition=gpu_a100
#SBATCH --gpus=1
#SBATCH --cpus-per-task=18
#SBATCH --time=01:00:00
#SBATCH --output=tts/fa/logs/slurm-%j.out
#SBATCH --error=tts/fa/logs/slurm-%j.err
set -euo pipefail
: "${MOWA_DATA:?pass MOWA_DATA with sbatch --export}"
module load ${MOWA_MODULE_LOAD:-2024 Python/3.12.3-GCCcore-13.3.0}
source "${MOWA_VENV:-.venv-tts}/bin/activate"
export HF_HOME="$MOWA_DATA/hf" HF_HUB_OFFLINE=1  # compute nodes may have no internet
python -u tts/fa/render_aava.py "$MOWA_DATA/aava_inference.py"
python -u tts/fa/asr_check.py aava
if [ "${MOWA_PUSH:-0}" = 1 ]; then
    git add tts/fa/out/aava && git commit -m "Aava renders of Persian chapter 1" && git push
fi
