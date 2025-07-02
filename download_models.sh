# Exit immediately if a command exits with a non-zero status.
set -e

# Define URLs and destination paths
CONFIG_URL="https://raw.githubusercontent.com/facebookresearch/sam2/main/sam2/configs/sam2.1/sam2.1_hiera_t.yaml"
MODEL_URL="https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt"

CONFIG_DIR="configs/sam2.1"
CHECKPOINT_DIR="checkpoints"

CONFIG_DEST="$CONFIG_DIR/sam2.1_hiera_t.yaml"
CHECKPOINT_DEST="$CHECKPOINT_DIR/sam2.1_hiera_tiny.pt"

# Create directories if they don't exist
echo "Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$CHECKPOINT_DIR"

# Download the config file
echo "Downloading config file to $CONFIG_DEST..."
wget -O "$CONFIG_DEST" "$CONFIG_URL"

# Download the model checkpoint
echo "Downloading model checkpoint to $CHECKPOINT_DEST..."
wget -O "$CHECKPOINT_DEST" "$MODEL_URL"

echo "Download complete."
