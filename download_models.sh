#!/bin/bash
set -e

MODEL=${1:-${MODEL:-tiny}}

declare -A CONFIGS=(
    [tiny]="sam2.1_hiera_t.yaml"
    [small]="sam2.1_hiera_s.yaml"
    [base_plus]="sam2.1_hiera_b+.yaml"
    [large]="sam2.1_hiera_l.yaml"
)
declare -A URLS=(
    [tiny]="https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt"
    [small]="https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt"
    [base_plus]="https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_base_plus.pt"
    [large]="https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"
)

if [[ ! ${CONFIGS[$MODEL]} ]]; then
    echo "Error: Invalid model: '$MODEL'. Choose from: ${!CONFIGS[@]}" >&2
    exit 1
fi

CONFIG_FILE=${CONFIGS[$MODEL]}
MODEL_URL=${URLS[$MODEL]}

CONFIG_DEST="configs/sam2.1/$CONFIG_FILE"
CHECKPOINT_DEST="checkpoints/$(basename "$MODEL_URL")"

mkdir -p "$(dirname "$CONFIG_DEST")" "$(dirname "$CHECKPOINT_DEST")"

if [ ! -f "$CONFIG_DEST" ]; then
    curl -sL "https://raw.githubusercontent.com/facebookresearch/sam2/main/sam2/configs/sam2.1/$CONFIG_FILE" -o "$CONFIG_DEST"
fi

if [ ! -f "$CHECKPOINT_DEST" ]; then
    echo "Downloading SAM2 model: $MODEL..."
    curl -L --progress-bar "$MODEL_URL" -o "$CHECKPOINT_DEST"
fi

echo "Model '$MODEL' is ready."
