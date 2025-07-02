"""
Model configuration mapping for SAM2 variants.
"""

import os
from typing import Tuple, Optional

class ModelConfig:
    """Handles SAM2 model configuration mapping."""
    
    # Model variant mappings
    MODEL_MAPPINGS = {
        "tiny": {
            "config": "configs/sam2.1/sam2.1_hiera_t.yaml",
            "checkpoint": "checkpoints/sam2.1_hiera_tiny.pt",
        },
        "small": {
            "config": "configs/sam2.1/sam2.1_hiera_s.yaml", 
            "checkpoint": "checkpoints/sam2.1_hiera_small.pt",
        },
        "base_plus": {
            "config": "configs/sam2.1/sam2.1_hiera_b+.yaml",
            "checkpoint": "checkpoints/sam2.1_hiera_base_plus.pt", 
        },
        "large": {
            "config": "configs/sam2.1/sam2.1_hiera_l.yaml",
            "checkpoint": "checkpoints/sam2.1_hiera_large.pt",
        }
    }
    
    @classmethod
    def get_model_paths(cls, model_variant: Optional[str] = None) -> Tuple[str, str]:
        """
        Get config and checkpoint paths for a model variant.
        
        Args:
            model_variant: Model variant (tiny, small, base_plus, large)
            
        Returns:
            Tuple of (config_path, checkpoint_path)
        """
        if model_variant is None:
            model_variant = os.getenv("MODEL", "tiny")
            
        model_variant = model_variant.lower()
        
        if model_variant not in cls.MODEL_MAPPINGS:
            available = ", ".join(cls.MODEL_MAPPINGS.keys())
            raise ValueError(f"Invalid model variant '{model_variant}'. Available: {available}")
            
        config = cls.MODEL_MAPPINGS[model_variant]
        return config["config"], config["checkpoint"]
    
    @classmethod
    def get_device(cls) -> str:
        """Get device from environment variable."""
        device = os.getenv("DEVICE", "cpu").lower()
        if device not in ["cpu", "cuda", "mps"]:
            print(f"Warning: Unknown device '{device}', falling back to 'cpu'")
            device = "cpu"
        return device
