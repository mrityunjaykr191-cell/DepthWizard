"""
DepthWizard — Depth Estimator Interface
Authority: docs/architecture/ml-integration.md & Phase 2B Specification

Defines the clean abstract interface that all depth estimation providers
must implement. This ensures the application, API, and downstream DSM pipeline
never depend directly on a specific model architecture or checkpoint.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import numpy as np
from PIL import Image


class DepthEstimator(ABC):
    """
    Abstract interface for monocular depth estimation providers.
    
    A provider is responsible for loading its specific weights,
    running forward inference on a PIL RGB image, and returning
    a 2D numpy float32 relative depth map alongside structured metadata.
    """

    @abstractmethod
    def load(self) -> None:
        """
        Loads model weights and prepares inference components in memory.
        Must be called once during server startup and reused across requests.
        """
        pass

    @abstractmethod
    def predict(self, image: Image.Image) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Executes depth inference on an input image.

        Args:
            image: PIL.Image in RGB mode.

        Returns:
            depth_map: 2D numpy array of shape (height, width), dtype float32,
                       containing raw relative depth predictions.
            metadata: Structured dictionary containing:
                      - model_id: str
                      - model_variant: str
                      - provider: str
                      - device: str
                      - inference_time_ms: float
        """
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """
        Returns static model metadata (provider name, checkpoint name, device).
        """
        pass

    @abstractmethod
    def dispose(self) -> None:
        """
        Releases GPU/CPU memory and model resources.
        """
        pass
