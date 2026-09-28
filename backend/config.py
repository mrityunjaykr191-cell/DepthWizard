"""
DepthWizard — Backend Configuration
Authority: docs/architecture/backend.md & Phase 2B Specification
"""

import os
from typing import Literal

# Environment-configurable model selection
DEPTH_MODEL_PROVIDER: str = os.getenv("DEPTH_MODEL_PROVIDER", "da2_zero_shot")
DEPTH_MODEL_CHECKPOINT: str = os.getenv("DEPTH_MODEL_CHECKPOINT", "depth-anything/Depth-Anything-V2-Small-hf")
DEPTH_DEVICE: str = os.getenv("DEPTH_DEVICE", "auto")

# Server settings
HOST: str = os.getenv("HOST", "127.0.0.1")
PORT: int = int(os.getenv("PORT", "8000"))

# Safety limits
MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
MAX_INFERENCE_DIMENSION: int = 2048  # Downsample very large rasters for memory safety
