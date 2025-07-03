import time
import os
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image
import io
import cv2

from transformers import VitMatteForImageMatting, VitMatteImageProcessor
import torch

from .trimap import TrimapGenerationService
from ..config import ModelConfig

class ViTMatteService:
    def __init__(self, model_variant: Optional[str] = None):
        self.model: Optional[VitMatteForImageMatting] = None
        self.processor: Optional[VitMatteImageProcessor] = None
        self.device = ModelConfig.get_device()
        self.trimap_service = TrimapGenerationService()
        
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
            image_resized, original_size = self.trimap_service.resize_image(image_array, max_size)
            if image_resized.shape[:2] != image_array.shape[:2]:
                mask_resized = cv2.resize(mask_array, 
                                        (image_resized.shape[1], image_resized.shape[0]), 
                                        interpolation=cv2.INTER_NEAREST)
            else:
                mask_resized = mask_array
            
            # Create trimap
            trimap = self.trimap_service.create_trimap(mask_resized, erosion_kernel_size, dilation_kernel_size)
            
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
            results = self.trimap_service.encode_results(image_array, trimap, alpha_matte)
            
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
            image_resized, original_size = self.trimap_service.resize_image(image_array, max_size)
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
            results = self.trimap_service.encode_results(image_array, trimap_array, alpha_matte)

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