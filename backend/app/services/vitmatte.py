import base64
import time
import os
from typing import Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image
import io
import cv2

from transformers import VitMatteForImageMatting, VitMatteImageProcessor
import torch
from ..config import ModelConfig

class ViTMatteService:
    def __init__(self, model_variant: Optional[str] = None):
        self.model: Optional[VitMatteForImageMatting] = None
        self.processor: Optional[VitMatteImageProcessor] = None
        self.device = ModelConfig.get_device()
        
        # Use different model sizes based on variant
        model_name = self._get_model_name(model_variant)
        print(f"Initializing ViTMatte model: {model_name} on {self.device}")
        self._load_model(model_name)

    def _get_model_name(self, variant: Optional[str] = None) -> str:
        """Get the appropriate ViTMatte model name based on variant."""
        variant = variant or os.getenv("VITMATTE_MODEL", "small")
        
        model_mapping = {
            "small": "hustvl/vitmatte-small-composition-1k",
            "base": "hustvl/vitmatte-base-composition-1k",
        }
        
        return model_mapping.get(variant, model_mapping["small"])

    def _load_model(self, model_name: str):
        """Load the ViTMatte model and processor."""
        try:
            self.processor = VitMatteImageProcessor.from_pretrained(model_name)
            self.model = VitMatteForImageMatting.from_pretrained(model_name)
            if self.model is not None:
                self.model.to(torch.device(self.device))  # type: ignore
                self.model.eval()
            print("ViTMatte model loaded successfully.")
        except Exception as e:
            print(f"Error loading ViTMatte model: {e}")
            print("Please ensure you have transformers installed: pip install transformers torch")
            raise

    def _create_trimap(self, mask: np.ndarray, 
                      erosion_kernel_size: int = 10, 
                      dilation_kernel_size: int = 10) -> np.ndarray:
        """
        Create a trimap from a binary mask using erosion and dilation.
        
        Args:
            mask: Binary mask (0 or 255)
            erosion_kernel_size: Size of erosion kernel for foreground
            dilation_kernel_size: Size of dilation kernel for background
            
        Returns:
            Trimap with values: 0 (background), 128 (unknown), 255 (foreground)
        """
        # Ensure mask is binary
        mask = (mask > 127).astype(np.uint8) * 255
        
        # Create kernels
        erosion_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, 
                                                  (erosion_kernel_size, erosion_kernel_size))
        dilation_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, 
                                                   (dilation_kernel_size, dilation_kernel_size))
        
        # Erode to get sure foreground
        foreground = cv2.erode(mask, erosion_kernel, iterations=1)
        
        # Dilate to get sure background
        background = cv2.dilate(mask, dilation_kernel, iterations=1)
        
        # Create trimap
        trimap = np.zeros_like(mask)
        trimap[background == 0] = 0        # Sure background
        trimap[foreground == 255] = 255    # Sure foreground
        trimap[(background == 255) & (foreground == 0)] = 128  # Unknown region
        
        return trimap

    def _resize_image(self, image: np.ndarray, max_size: int = 1024) -> Tuple[np.ndarray, Tuple[int, int]]:
        """
        Resize image while maintaining aspect ratio.
        
        Args:
            image: Input image
            max_size: Maximum size for the longer dimension
            
        Returns:
            Resized image and original size
        """
        original_size = image.shape[:2]
        h, w = original_size
        
        if max(h, w) <= max_size:
            return image, original_size
        
        if h > w:
            new_h, new_w = max_size, int(w * max_size / h)
        else:
            new_h, new_w = int(h * max_size / w), max_size
        
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        return resized, original_size

    def generate_matte(self, image_bytes: bytes, mask_bytes: bytes,
                      erosion_kernel_size: int = 10,
                      dilation_kernel_size: int = 10,
                      max_size: int = 1024) -> Dict[str, Any]:
        """
        Generate alpha matte from image and mask.
        
        Args:
            image_bytes: Original image bytes
            mask_bytes: Binary mask bytes
            erosion_kernel_size: Kernel size for mask erosion
            dilation_kernel_size: Kernel size for mask dilation
            max_size: Maximum image size for processing
            
        Returns:
            Dictionary containing matte results
        """
        if not self.model or not self.processor:
            raise RuntimeError("Model is not initialized. Please load the model first.")

        start_time = time.time()

        try:
            # Load images
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
            
            # Convert to numpy arrays
            image_array = np.array(image)
            mask_array = np.array(mask)
            
            # Resize if necessary
            image_resized, original_size = self._resize_image(image_array, max_size)
            if image_resized.shape[:2] != image_array.shape[:2]:
                mask_resized = cv2.resize(mask_array, 
                                        (image_resized.shape[1], image_resized.shape[0]), 
                                        interpolation=cv2.INTER_NEAREST)
            else:
                mask_resized = mask_array
            
            # Create trimap
            trimap = self._create_trimap(mask_resized, erosion_kernel_size, dilation_kernel_size)
            
            # Prepare inputs for ViTMatte
            inputs = self.processor(
                images=Image.fromarray(image_resized),
                trimaps=Image.fromarray(trimap),
                return_tensors="pt"
            )
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate alpha matte
            with torch.no_grad():
                outputs = self.model(**inputs)
                alpha_matte = outputs.alphas.squeeze().cpu().numpy()
            
            # Convert to 0-255 range
            alpha_matte = (alpha_matte * 255).astype(np.uint8)
            
            # Resize back to original size if needed
            if image_resized.shape[:2] != original_size:
                alpha_matte = cv2.resize(alpha_matte, 
                                       (original_size[1], original_size[0]), 
                                       interpolation=cv2.INTER_LINEAR)
                trimap = cv2.resize(trimap, 
                                  (original_size[1], original_size[0]), 
                                  interpolation=cv2.INTER_NEAREST)

            # Convert results to base64
            results = self._encode_results(image_array, trimap, alpha_matte)
            
            processing_time = time.time() - start_time
            
            return {
                "alpha_matte": results["alpha_matte"],
                "trimap": results["trimap"],
                "original_image": results["original_image"],
                "processing_time": round(processing_time, 3),
                "image_size": original_size,
                "parameters": {
                    "erosion_kernel_size": erosion_kernel_size,
                    "dilation_kernel_size": dilation_kernel_size,
                    "max_size": max_size,
                }
            }
            
        except Exception as e:
            print(f"Error in matte generation: {e}")
            raise

    def _encode_results(self, original: np.ndarray, trimap: np.ndarray, 
                       alpha: np.ndarray) -> Dict[str, str]:
        """
        Encode results as base64 strings.
        
        Args:
            original: Original image
            trimap: Generated trimap
            alpha: Alpha matte
            
        Returns:
            Dictionary with base64 encoded results
        """
        results = {}
        
        # Original image
        original_pil = Image.fromarray(original)
        original_buffer = io.BytesIO()
        original_pil.save(original_buffer, format="PNG")
        results["original_image"] = base64.b64encode(original_buffer.getvalue()).decode("utf-8")
        
        # Trimap
        trimap_pil = Image.fromarray(trimap)
        trimap_buffer = io.BytesIO()
        trimap_pil.save(trimap_buffer, format="PNG")
        results["trimap"] = base64.b64encode(trimap_buffer.getvalue()).decode("utf-8")
        
        # Alpha matte
        alpha_pil = Image.fromarray(alpha)
        alpha_buffer = io.BytesIO()
        alpha_pil.save(alpha_buffer, format="PNG")
        results["alpha_matte"] = base64.b64encode(alpha_buffer.getvalue()).decode("utf-8")
        return results

    def generate_matte_from_trimap(self, image_bytes: bytes, trimap_bytes: bytes,
                                  max_size: int = 1024) -> Dict[str, Any]:
        """
        Generate alpha matte from image and pre-made trimap.
        
        Args:
            image_bytes: Original image bytes
            trimap_bytes: Trimap bytes
            max_size: Maximum image size for processing

        Returns:
            Dictionary containing matte results
        """
        if not self.model or not self.processor:
            raise RuntimeError("Model is not initialized. Please load the model first.")

        start_time = time.time()

        try:
            # Load images
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            trimap = Image.open(io.BytesIO(trimap_bytes)).convert("L")
            
            # Convert to numpy arrays
            image_array = np.array(image)
            trimap_array = np.array(trimap)
            
            # Resize if necessary
            image_resized, original_size = self._resize_image(image_array, max_size)
            if image_resized.shape[:2] != image_array.shape[:2]:
                trimap_resized = cv2.resize(trimap_array, 
                                          (image_resized.shape[1], image_resized.shape[0]), 
                                          interpolation=cv2.INTER_NEAREST)
            else:
                trimap_resized = trimap_array
            
            # Prepare inputs for ViTMatte
            inputs = self.processor(
                images=Image.fromarray(image_resized),
                trimaps=Image.fromarray(trimap_resized),
                return_tensors="pt"
            )
            
            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate alpha matte
            with torch.no_grad():
                outputs = self.model(**inputs)
                alpha_matte = outputs.alphas.squeeze().cpu().numpy()
            
            # Convert to 0-255 range
            alpha_matte = (alpha_matte * 255).astype(np.uint8)
            
            # Resize back to original size if needed
            if image_resized.shape[:2] != original_size:
                alpha_matte = cv2.resize(alpha_matte, 
                                       (original_size[1], original_size[0]), 
                                       interpolation=cv2.INTER_LINEAR)
            
            # Convert results to base64
            results = self._encode_results(image_array, trimap_array, alpha_matte)

            processing_time = time.time() - start_time
            
            return {
                "alpha_matte": results["alpha_matte"],
                "trimap": results["trimap"],
                "original_image": results["original_image"],
                "processing_time": round(processing_time, 3),
                "image_size": original_size,
                "parameters": {
                    "max_size": max_size,
                }
            }
            
        except Exception as e:
            print(f"Error in matte generation: {e}")
            raise