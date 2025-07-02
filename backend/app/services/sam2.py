import base64
import time
from typing import Dict, Any
import numpy as np
from PIL import Image
import io
import colorsys

from sam2.build_sam import build_sam2
from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

class SAM2Service:
    def __init__(self, model_cfg: str = "configs/sam2.1/sam2.1_hiera_t.yaml", checkpoint_path: str = "../checkpoints/sam2.1_hiera_tiny.pt"):
        self.model = None
        self.model_cfg = model_cfg
        self.checkpoint_path = checkpoint_path
        self._load_model()

    def _load_model(self):
        try:
            self.model = build_sam2(self.model_cfg, self.checkpoint_path, device="cpu")
            print(f"Model loaded successfully with config: {self.model_cfg}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

    def _generate_colors(self, num_colors: int):
        colors = []
        for i in range(num_colors):
            hue = i / num_colors
            rgb = colorsys.hls_to_rgb(hue, 0.5, 1.0)
            colors.append(tuple(int(c * 255) for c in rgb))
        return colors

    def auto_segment(self, image_bytes: bytes,
                     points_per_side: int,
                     pred_iou_thresh: float,
                     stability_score_thresh: float) -> Dict[str, Any]:
        if not self.model:
            raise RuntimeError("Model is not initialized. Please load the model first.")

        start_time = time.time()

        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image.convert("RGB"))

        mask_generator = SAM2AutomaticMaskGenerator(
            model=self.model,
            points_per_side=points_per_side,
            pred_iou_thresh=pred_iou_thresh,
            stability_score_thresh=stability_score_thresh
        )

        masks = mask_generator.generate(image_array)
        
        if not masks:
            return {
                "segments": [],
                "processing_time": round(time.time() - start_time, 3),
                "composite_mask": "",
                "color_map": {},
            }

        segments = []
        colors = self._generate_colors(len(masks))
        color_map = {}
        
        composite_image = np.zeros((image_array.shape[0], image_array.shape[1], 3), dtype=np.uint8)

        for i, mask_data in enumerate(masks):
            mask = mask_data["segmentation"]
            confidence = mask_data.get("predicted_iou", 0.0)
            segment_id = i
            color = colors[i]

            segment_data = self._process_mask(mask, confidence, segment_id)
            segment_data.update({
                "stability_score": mask_data.get("stability_score", 0.0),
                "predicted_iou": mask_data.get("predicted_iou", 0.0),
            })
            segments.append(segment_data)
            
            composite_image[mask] = color
            color_map[str(color)] = {
                "segment_id": segment_id,
                "confidence": round(float(confidence), 4),
            }

        segments.sort(key=lambda x: x["confidence"], reverse=True)

        composite_pil = Image.fromarray(composite_image)
        composite_buffer = io.BytesIO()
        composite_pil.save(composite_buffer, format="PNG")
        composite_b64 = base64.b64encode(composite_buffer.getvalue()).decode("utf-8")

        processing_time = time.time() - start_time

        return {
            "segments": segments,
            "processing_time": round(processing_time, 3),
            "composite_mask": composite_b64,
            "color_map": color_map,
        }

    def _process_mask(self, mask: np.ndarray, confidence: float, segment_id: int) -> Dict[str, Any]:
        """
        Process a single mask and extract relevant information.

        Args:
            mask (np.ndarray): The mask array.
            confidence (float): The confidence score for the mask.
            segment_id (int): The segment ID.

        Returns:
            Dict[str, Any]: A dictionary containing the processed mask information.
        """
        # Calculate bounding box
        coords = np.where(mask)
        if len(coords[0]) > 0:
            y_min, y_max = coords[0].min(), coords[0].max()
            x_min, x_max = coords[1].min(), coords[1].max()
            bbox = [int(x_min), int(y_min), int(x_max), int(y_max)]
        else:
            bbox = [0, 0, 0, 0]

        area = int(np.sum(mask))

        # We'll turn the mask into images for now
        mask_uint8 = (mask * 255).astype(np.uint8)
        mask_image = Image.fromarray(mask_uint8, mode="L")
        mask_buffer = io.BytesIO()
        mask_image.save(mask_buffer, format="PNG")
        mask_b64 = base64.b64encode(mask_buffer.getvalue()).decode("utf-8")

        return {
          "segment_id": segment_id,
          "bbox": bbox,
          "confidence": round(float(confidence), 4),
          "mask": mask_b64,
          "area": area,
        }