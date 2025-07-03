# Segmenter

AI-powered image segmentation application using Meta's SAM2 (Segment Anything Model 2).

## Features

- Interactive image segmentation via file upload.
- Powered by Meta's SAM2 model for high accuracy.
- Color-coded segmentation masks with confidence scores.
- Web interface built with React.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Local Development

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/sandmor/segmenter
    cd segmenter
    ```

2.  **Set up environment variables:**
    Copy the example `.env` file and customize it as needed.

    ```bash
    cp .env.example .env
    ```

3.  **Download AI models:**
    This will download the default `tiny` model.

    ```bash
    ./download_models.sh
    ```

    You can also specify a model variant: `tiny`, `small`, `base_plus`, `large`.

    ```bash
    ./download_models.sh large
    ```

4.  **Install dependencies:**

    ```bash
    pnpm install:all
    ```

5.  **Start development servers:**
    ```bash
    pnpm run dev
    ```

## Deployment

The recommended deployment method is using the provided script, which relies on Docker Compose.

1.  **Run the deployment script:**
    For local deployment:

    ```bash
    ./deploy.sh
    ```

    For production with a custom domain:

    ```bash
    ./deploy.sh your-domain.com
    ```

2.  **Access the application:**
    - **Local:** `http://localhost`
    - **Production:** `http://your-domain.com`

## GPU Acceleration

To enable GPU acceleration for the model, you need to have the NVIDIA Container Toolkit installed on your system.

Once you have the toolkit installed, you can enable GPU support by uncommenting the following lines in `docker-compose.yml`:

```yaml
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
#           count: 1
#           capabilities: [gpu]
```

You will also need to set the `DEVICE` environment variable to `cuda` in your `.env` file:

```
DEVICE=cuda
```

## Environment Variables

Create a `.env` file to configure the application. See `.env.example` for available options.

- `MODEL`: `tiny`, `small`, `base_plus`, `large` (default: `tiny`)
- `DEVICE`: `cpu`, `cuda`, `mps` (default: `cpu`)
- `PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins.
