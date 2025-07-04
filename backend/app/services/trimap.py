import numpy as np
import cv2
from PIL import Image
import io
import base64
from typing import Tuple, Dict, Literal
from scipy.ndimage import binary_erosion

class TrimapGenerationService:
    """Service for generating trimaps from binary masks."""
    
    @staticmethod
    def create_trimap(mask: np.ndarray, 
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

    @staticmethod
    def resize_image(image: np.ndarray, max_size: int = 1024) -> Tuple[np.ndarray, Tuple[int, int]]:
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
    
    @staticmethod
    def encode_results(image: np.ndarray, trimap: np.ndarray, 
                       alpha_matte: np.ndarray, foreground: np.ndarray) -> Dict[str, str]:
        """
        Encode results to base64 strings.
        
        Args:
            image: Original image (H, W, 3)
            trimap: Trimap (H, W)
            alpha_matte: Alpha matte (H, W)
            foreground: Foreground image (H, W, 3)
            
        Returns:
            Dictionary with base64 encoded images
        """
        def encode_image(img_array, mode="RGB"):
            # Ensure the array is in the correct format
            if img_array.dtype != np.uint8:
                if mode == "RGB" or mode == "RGBA":
                    img_array = np.clip(img_array * 255, 0, 255).astype(np.uint8)
                else:
                    img_array = np.clip(img_array, 0, 255).astype(np.uint8)
            
            img_pil = Image.fromarray(img_array, mode=mode)
            buffer = io.BytesIO()
            img_pil.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return {
            "original_image": encode_image(image, "RGB"),
            "trimap": encode_image(trimap, "L"),
            "alpha_matte": encode_image(alpha_matte, "L"),
            "foreground": encode_image(foreground, "RGBA")
        }