import time
import os
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image
import io
import cv2
import base64

from pymatting.alpha.estimate_alpha_cf import estimate_alpha_cf
from pymatting.alpha.estimate_alpha_knn import estimate_alpha_knn
from pymatting.alpha.estimate_alpha_lbdm import estimate_alpha_lbdm
from pymatting.alpha.estimate_alpha_lkm import estimate_alpha_lkm
from pymatting.foreground.estimate_foreground_ml import estimate_foreground_ml


from .trimap import TrimapGenerationService
from ..config import ModelConfig

class ClassicalMattingService:
    def __init__(self):
        self.device = ModelConfig.get_device()
        self.trimap_service = TrimapGenerationService()
        
        self.valid_algorithms = ["cf", "knn", "lbdm", "lkm"]
        
        print(f"Initializing Classical Matting")

    def _apply_matting_algorithm(self, image: np.ndarray, trimap: np.ndarray, 
                               algorithm: str) -> np.ndarray:
        """
        Apply the specified matting algorithm.
        
        Args:
            image: Input image (H, W, 3) in range [0, 1]
            trimap: Trimap (H, W) in range [0, 1]
            algorithm: Matting algorithm to use
            
        Returns:
            Alpha matte (H, W) in range [0, 1]
        """
        # Validate inputs
        if image.shape[:2] != trimap.shape:
            raise ValueError(f"Image and trimap shape mismatch: {image.shape[:2]} vs {trimap.shape}")
        
        if len(image.shape) != 3 or image.shape[2] != 3:
            raise ValueError(f"Image must be 3-channel, got shape: {image.shape}")
        
        try:
            if algorithm == "cf":
                alpha = estimate_alpha_cf(image, trimap)
            elif algorithm == "knn":
                alpha = estimate_alpha_knn(image, trimap)
            elif algorithm == "lbdm":
                alpha = estimate_alpha_lbdm(image, trimap)
            elif algorithm == "lkm":
                alpha = estimate_alpha_lkm(image, trimap)
            else:
                raise ValueError(f"Unsupported algorithm: {algorithm}")
            
            return alpha
            
        except Exception as e:
            print(f"Error in matting algorithm {algorithm}: {e}")
            raise RuntimeError(f"Matting algorithm {algorithm} failed: {str(e)}")

    def generate_matte(self, image_bytes: bytes, mask_bytes: bytes,
                      erosion_kernel_size: int = 10,
                      dilation_kernel_size: int = 10,
                      max_size: int = 1024,
                      algorithm: str = "cf") -> Dict[str, Any]:
        """
        Generate alpha matte from image and mask.
        
        Args:
            image_bytes: Original image bytes
            mask_bytes: Binary mask bytes
            erosion_kernel_size: Kernel size for mask erosion
            dilation_kernel_size: Kernel size for mask dilation
            max_size: Maximum image size for processing
            algorithm: Matting algorithm to use
            
        Returns:
            Dictionary containing matte results
        """
        start_time = time.time()

        if algorithm not in self.valid_algorithms:
            raise ValueError(f"Invalid algorithm: {algorithm}. Valid options: {self.valid_algorithms}")

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
            
            # Normalize inputs
            image_normalized = image_resized.astype(np.float64) / 255.0
            trimap_normalized = trimap.astype(np.float64) / 255.0
            
            # Estimate alpha
            alpha = self._apply_matting_algorithm(image_normalized, trimap_normalized, algorithm)
            
            # Estimate foreground
            foreground_rgb = estimate_foreground_ml(image_normalized, alpha, return_background=False)

            alpha_reshaped = alpha[:, :, np.newaxis]
            
            foreground = np.dstack((foreground_rgb, alpha_reshaped))
            
            # Ensure alpha is in valid range and convert to 0-255
            alpha = np.clip(alpha, 0, 1)
            alpha_matte = (alpha * 255).astype(np.uint8)
            
            # Resize back to original size if needed
            if image_resized.shape[:2] != original_size:
                alpha_matte = cv2.resize(alpha_matte, 
                                       (original_size[1], original_size[0]), 
                                       interpolation=cv2.INTER_LINEAR)
                trimap = cv2.resize(trimap, 
                                  (original_size[1], original_size[0]), 
                                  interpolation=cv2.INTER_NEAREST)

            # Convert results to base64
            results = self.trimap_service.encode_results(image_array, trimap, alpha_matte, foreground)
            
            processing_time = time.time() - start_time
            
            return {
                "alpha_matte": results["alpha_matte"],
                "trimap": results["trimap"],
                "original_image": results["original_image"],
                "foreground": results["foreground"],
                "processing_time": round(processing_time, 3),
                "image_size": original_size,
                "algorithm": algorithm,
                "parameters": {
                    "erosion_kernel_size": erosion_kernel_size,
                    "dilation_kernel_size": dilation_kernel_size,
                    "max_size": max_size,
                    "algorithm": algorithm,
                }
            }
            
        except Exception as e:
            print(f"Error in classical matting generation: {e}")
            raise