# Segmenter

AI-powered image segmentation application using Meta's SAM2 (Segment Anything Model 2) for automatic segmentation and various classical and AI-based matting algorithms.

## Features

- **Automatic Segmentation:**
  - Uses Meta's SAM2 model to automatically find and segment all objects in an image.
  - Adjustable parameters: `points_per_side`, `pred_iou_thresh`, `stability_score_thresh`.
- **Matte Generation:**
  - Generates high-quality alpha mattes from an image and a mask.
  - Supports multiple matting algorithms:
    - **ViTMatte:** A vision transformers based approach.
    - **Classical & Learning-Based Algorithms (via `pymatting`):**
      - `cf`: Closed-Form Matting
      - `knn`: KNN Matting
      - `lbdm`: Learning-Based Digital Matting
      - `lkm`: Large Kernel Matting
  - Adjustable parameters: `erosion_kernel_size`, `dilation_kernel_size`, `max_size`.
- **Web Interface:**
  - Built with React and PIXI.js for interactive visualization.
  - Allows users to upload images, view segmentation masks, and download results.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git
- Node.js and pnpm (for local development)

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

3.  **Download Models:**
    This will download the default `tiny` SAM2 model.

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
    This will start the backend on port 8000 and the frontend on port 5173.

## Running with Docker Compose

After cloning the repository, setting up your `.env` file, and downloading the models, you can run the application using Docker Compose.

1.  **Build and run the container:**

    ```bash
    docker-compose up --build -d
    ```

2.  **Access the application:**
    Open your browser and navigate to `http://localhost`. The port can be changed in your `.env` file.

3.  **Follow the logs:**

    ```bash
    docker-compose logs -f
    ```

4.  **Stop the application:**
    ```bash
    docker-compose down
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

To enable GPU acceleration for the model, you need to have the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) installed on your system.

Once you have the toolkit installed, you can enable GPU support by uncommenting the `deploy` section in `docker-compose.yml` and setting `DEVICE=cuda` in your `.env` file.

## Environment Variables

Create a `.env` file to configure the application. See `.env.example` for available options.

- `SAM2_MODEL`: `tiny`, `small`, `base_plus`, `large` (default: `tiny`)
- `DEVICE`: `cpu`, `cuda`, `mps` (default: `cpu`)
- `PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins.
