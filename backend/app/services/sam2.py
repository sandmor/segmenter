import base64
import time
import os
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
from PIL import Image
import io
import colorsys

from sam2.build_sam import build_sam2
from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
from sam2.sam2_image_predictor import SAM2ImagePredictor
from ..config import ModelConfig

class SAM2Service:
    def __init__(self, model_variant: Optional[str] = None):
        self.model = None
        config_path, checkpoint_path = ModelConfig.get_model_paths(model_variant)
        device = ModelConfig.get_device()
        self.model_cfg = config_path
        self.checkpoint_path = checkpoint_path
        self.device = device
        model_name = model_variant or os.getenv("SAM2_MODEL", "tiny")
        print(f"Initializing SAM2 model: {model_name} on {self.device}")
        self._load_model()

    def _load_model(self):
        try:
            self.model = build_sam2(self.model_cfg, self.checkpoint_path, device=self.device)
            print("SAM2 model loaded successfully.")
        except Exception as e:
            print(f"Error loading SAM2 model: {e}")
            print("Please ensure models are downloaded by running './download_models.sh'")
            raise

    def _generate_colors(self, num_colors: int):
        colors = []
        for i in range(num_colors):
            hue = i / num_colors
            rgb = colorsys.hls_to_rgb(hue, 0.5, 1.0)
            colors.append(tuple(int(c * 255) for c in rgb))
        return colors

    def _create_semantic_image(self, masks: List[np.ndarray], image_shape: Tuple[int, int]) -> Tuple[np.ndarray, Dict[str, Dict[str, Any]]]:
        """Create a semantic image from multiple masks with unique colors."""
        colors = self._generate_colors(len(masks))
        color_map = {}
        semantic_image = np.zeros((image_shape[0], image_shape[1], 3), dtype=np.uint8)

        for i, mask in enumerate(masks):
            color = colors[i]
            semantic_image[mask] = color
            color_map[str(color)] = {
                "segment_id": i,
                "confidence": 1.0,  # Default confidence for prompted masks
            }

        return semantic_image, color_map

    def _process_masks_data(self, masks_data: List[Dict[str, Any]], image_shape: Tuple[int, int]) -> Dict[str, Any]:
        """Process mask data from SAM2AutomaticMaskGenerator."""
        if not masks_data:
            return {
                "segments": [],
                "semantic_mask": "",
                "color_map": {},
            }

        segments = []
        mask_arrays = []
        colors = self._generate_colors(len(masks_data))
        color_map = {}

        semantic_image = np.zeros((image_shape[0], image_shape[1], 3), dtype=np.uint8)

        for i, mask_data in enumerate(masks_data):
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

            semantic_image[mask] = color
            color_map[str(color)] = {
                "segment_id": segment_id,
                "confidence": round(float(confidence), 4),
            }

        segments.sort(key=lambda x: x["confidence"], reverse=True)

        semantic_pil = Image.fromarray(semantic_image)
        semantic_buffer = io.BytesIO()
        semantic_pil.save(semantic_buffer, format="PNG")
        semantic_b64 = base64.b64encode(semantic_buffer.getvalue()).decode("utf-8")

        return {
            "segments": segments,
            "semantic_mask": semantic_b64,
            "color_map": color_map,
        }

    def _process_mask_arrays(self, mask_arrays: List[np.ndarray], confidences: List[float], image_shape: Tuple[int, int]) -> Dict[str, Any]:
        """Process raw mask arrays with confidences."""
        if not mask_arrays:
            return {
                "segments": [],
                "semantic_mask": "",
                "color_map": {},
            }

        segments = []
        colors = self._generate_colors(len(mask_arrays))
        color_map = {}
        
        semantic_image = np.zeros((image_shape[0], image_shape[1], 3), dtype=np.uint8)

        for i, (mask, confidence) in enumerate(zip(mask_arrays, confidences)):
            segment_id = i
            color = colors[i]

            segment_data = self._process_mask(mask, confidence, segment_id)
            segments.append(segment_data)
            
            semantic_image[mask] = color
            color_map[str(color)] = {
                "segment_id": segment_id,
                "confidence": round(float(confidence), 4),
            }

        segments.sort(key=lambda x: x["confidence"], reverse=True)

        semantic_pil = Image.fromarray(semantic_image)
        semantic_buffer = io.BytesIO()
        semantic_pil.save(semantic_buffer, format="PNG")
        semantic_b64 = base64.b64encode(semantic_buffer.getvalue()).decode("utf-8")

        return {
            "segments": segments,
            "semantic_mask": semantic_b64,
            "color_map": color_map,
        }

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
        
        result = self._process_masks_data(masks, (image_array.shape[0], image_array.shape[1]))
        result["processing_time"] = round(time.time() - start_time, 3)
        
        return result

    def segment_with_mask(self, image_bytes: bytes, selection_mask_bytes: bytes) -> Dict[str, Any]:
        """
        Segment the image using a selection mask as prompt.
        
        Args:
            image_bytes (bytes): The input image as bytes.
            selection_mask_bytes (bytes): The selection mask as bytes (binary mask).
            
        Returns:
            Dict[str, Any]: A dictionary containing the segmentation results.
        """
        if not self.model:
            raise RuntimeError("Model is not initialized. Please load the model first.")
    
        start_time = time.time()
    
        # Load and process the input image
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image.convert("RGB"))
        image.save("input_image.png")  # Save for debugging
        print(f"Input image shape: {image_array.shape}")
    
        # Load and process the selection mask
        selection_mask_img = Image.open(io.BytesIO(selection_mask_bytes))
        selection_mask_array = np.array(selection_mask_img.convert("L"))
        selection_mask_img.save("selection_mask.png")  # Save for debugging
        print(f"Selection mask shape: {selection_mask_array.shape}")
        
        # Convert to binary mask (assuming non-zero values are the selection)
        selection_mask_binary = selection_mask_array > 0
    
        # Check if mask is empty
        if not np.any(selection_mask_binary):
            return {
                "segments": [],
                "processing_time": round(time.time() - start_time, 3),
                "semantic_mask": "",
                "color_map": {},
            }
    
        # Create predictor for prompted segmentation
        predictor = SAM2ImagePredictor(self.model)
        predictor.set_image(image_array)
    
        # Resize the mask to the expected low-resolution format (256x256)
        mask_pil = Image.fromarray(selection_mask_binary.astype(np.uint8) * 255)
        mask_resized = mask_pil.resize((256, 256))
        mask_resized_array = np.array(mask_resized) > 0
        
        # Convert to the format expected by SAM2 (add batch dimension)
        input_mask = mask_resized_array.astype(np.float32)[None, :, :]
        
        print(f"Resized mask shape: {input_mask.shape}")
    
        # Predict masks using the resized mask as prompt
        masks, scores, logits = predictor.predict(
            mask_input=input_mask,
            multimask_output=False,
        )
    
        # Process the results
        segments = []
        colors = self._generate_colors(len(masks))
        color_map = {}
        
        semantic_image = np.zeros((image_array.shape[0], image_array.shape[1], 3), dtype=np.uint8)
    
        for i, (mask, confidence) in enumerate(zip(masks, scores)):
            segment_id = i
            color = colors[i]
    
            segment_data = self._process_mask(mask, float(confidence), segment_id)
            segments.append(segment_data)
            
            semantic_image[mask.astype(bool)] = color
            color_map[str(color)] = {
                "segment_id": segment_id,
                "confidence": round(float(confidence), 4),
            }
    
        segments.sort(key=lambda x: x["confidence"], reverse=True)
    
        semantic_pil = Image.fromarray(semantic_image)
        semantic_buffer = io.BytesIO()
        semantic_pil.save(semantic_buffer, format="PNG")
        semantic_b64 = base64.b64encode(semantic_buffer.getvalue()).decode("utf-8")
    
        result = {
            "segments": segments,
            "semantic_mask": semantic_b64,
            "color_map": color_map,
            "processing_time": round(time.time() - start_time, 3)
        }
        
        return result

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