"""
DepthWizard — Backend Configuration
Authority: docs/architecture/backend.md & Phase 2B Specification
"""

import os
from typing import Literal

# Environment-configurable model selection
DEPTH_MODEL_PROVIDER: str = os.getenv("DEPTH_MODEL_PROVIDER", "da2_zero_shot")

# Default checkpoint dynamically resolves based on provider unless explicitly configured
_DEFAULT_CHECKPOINT = (
    "backend/checkpoints/da2_finetuned.pth"
    if DEPTH_MODEL_PROVIDER == "da2_fine_tuned"
    else "depth-anything/Depth-Anything-V2-Small-hf"
)
DEPTH_MODEL_CHECKPOINT: str = os.getenv("DEPTH_MODEL_CHECKPOINT", _DEFAULT_CHECKPOINT)
DEPTH_DEVICE: str = os.getenv("DEPTH_DEVICE", "auto")

# Hugging Face Space artifact acquisition for production deployment
HF_SPACE_REPO_ID: str = os.getenv("HF_SPACE_REPO_ID", "Mrityunjaykkk/depthwizardV1")
HF_SPACE_REPO_TYPE: str = os.getenv("HF_SPACE_REPO_TYPE", "space")
HF_SPACE_FILENAME: str = os.getenv("HF_SPACE_FILENAME", "da2_finetuned.pth")
DA2_FINETUNED_SHA256: str = os.getenv(
    "DA2_FINETUNED_SHA256",
    "99b40ca7f77573544d1d4ab93be8840573d0eaf8c3fb0d7320158a2820579c07",
)

# Server settings
HOST: str = os.getenv("HOST", "127.0.0.1")
PORT: int = int(os.getenv("PORT", "8000"))

# Safety limits
MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
MAX_INFERENCE_DIMENSION: int = 2048  # Downsample very large rasters for memory safety
