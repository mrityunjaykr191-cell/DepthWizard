"""
DepthWizard — Numerical Depth Serialization & Visual Preview Utilities
Authority: docs/engineering/api_contract.md & Phase 2B Specification

Provides lossless base64 binary encoding for raw Float32 depth arrays (Section 2B.8),
and generates lightweight 8-bit PNG preview data URLs for rapid 2D UI display.
"""

import base64
import io
import numpy as np
from PIL import Image

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False


def encode_depth_raw(depth_arr: np.ndarray) -> str:
    """
    Serializes a 2D numpy array into a compact base64-encoded binary string.
    Ensures exact 32-bit floating point precision without loss of numerical meaning.
    """
    float32_arr = np.ascontiguousarray(depth_arr, dtype=np.float32)
    raw_bytes = float32_arr.tobytes()
    return base64.b64encode(raw_bytes).decode("ascii")


def decode_depth_raw(b64_str: str, shape: tuple[int, int]) -> np.ndarray:
    """
    Decodes a base64-encoded Float32 binary buffer back into a 2D numpy array.
    """
    raw_bytes = base64.b64decode(b64_str)
    arr = np.frombuffer(raw_bytes, dtype=np.float32)
    return arr.reshape(shape)


def generate_preview_data_url(depth_arr: np.ndarray) -> str:
    """
    Normalizes a 2D depth array into an 8-bit visual representation and exports
    it as a PNG data URL ('data:image/png;base64,...').
    
    Uses standard geospatial Viridis colormapping when OpenCV is present,
    or crisp high-contrast normalized grayscale as fallback.
    """
    d_min = float(np.nanmin(depth_arr))
    d_max = float(np.nanmax(depth_arr))
    d_range = (d_max - d_min) if (d_max - d_min) > 1e-6 else 1.0

    # Normalize to [0, 255] uint8
    norm = np.clip(((depth_arr - d_min) / d_range) * 255.0, 0, 255).astype(np.uint8)

    if _HAS_CV2:
        # Standard Viridis colormap for geospatial depth visualization
        color_bgr = cv2.applyColorMap(norm, cv2.COLORMAP_VIRIDIS)
        success, encoded_buf = cv2.imencode(".png", color_bgr)
        if success:
            b64_str = base64.b64encode(encoded_buf).decode("ascii")
            return f"data:image/png;base64,{b64_str}"

    # Pure PIL Fallback
    pil_img = Image.fromarray(norm, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64_str}"
