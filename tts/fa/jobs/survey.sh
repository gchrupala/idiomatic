#!/usr/bin/env bash
# Dataset survey; downloads data, so it runs on a login node, not through Slurm.
# Usage (from the repo root): MOWA_DATA=... nohup bash tts/fa/jobs/survey.sh > tts/fa/logs/survey.log 2>&1 &
set -euo pipefail
: "${MOWA_DATA:?set MOWA_DATA as for setup.sh}"
module load ${MOWA_MODULE_LOAD:-2024 Python/3.12.3-GCCcore-13.3.0}
source "${MOWA_VENV:-.venv-tts}/bin/activate"
export HF_HOME="$MOWA_DATA/hf"
python -u tts/fa/survey.py "$@"
