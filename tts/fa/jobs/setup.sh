#!/usr/bin/env bash
# One-off setup on a Snellius login node (has internet): venv, packages, models.
# Usage (from the repo root): MOWA_DATA=/scratch-shared/$USER/mowa bash tts/fa/jobs/setup.sh
set -euo pipefail
: "${MOWA_DATA:?set MOWA_DATA to a large data directory, e.g. scratch or project space}"
module load ${MOWA_MODULE_LOAD:-2024 Python/3.12.3-GCCcore-13.3.0}
python -m venv "${MOWA_VENV:-.venv-tts}"
source "${MOWA_VENV:-.venv-tts}/bin/activate"
pip install -q -r tts/fa/requirements.txt
export HF_HOME="$MOWA_DATA/hf"
mkdir -p "$MOWA_DATA"
curl -sSL https://raw.githubusercontent.com/KEYHAN-A/aava-refinement/main/examples/inference.py \
    -o "$MOWA_DATA/aava_inference.py"
huggingface-cli download KEYHAN-A/aava-tts-persian-3b
huggingface-cli download hubertsiuzdak/snac_24khz
huggingface-cli download openai/whisper-large-v3
echo "setup done; data and models in $MOWA_DATA"
