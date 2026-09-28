"""
DepthWizard — Pretrained Depth Anything V2 Provider
Authority: docs/ml/ml_pipeline.md & Phase 2B Specification

Concrete DepthEstimator provider implementing the official Depth Anything V2
Small zero-shot pretrained baseline via Hugging Face Transformers.
"""

import time
from typing import Dict, Any, Tuple
import numpy as np
from PIL import Image
import torch
from transformers import pipeline

from .base import DepthEstimator


class DA2ZeroShotProvider(DepthEstimator):
    """
    Depth Anything V2 Small zero-shot baseline provider.
    Loads once, caches in memory, and serves inference requests across the session.
    """

    def __init__(self, checkpoint: str = "depth-anything/Depth-Anything-V2-Small-hf", device: str = "auto"):
        if not checkpoint or checkpoint.endswith(".pth") or checkpoint.endswith(".pt") or "/" in checkpoint and "\\" in checkpoint:
            checkpoint = "depth-anything/Depth-Anything-V2-Small-hf"
        self.checkpoint = checkpoint
        self.device_pref = device
        self.device = self._resolve_device(device)
        self._pipe = None
        self._loaded = False

    def _resolve_device(self, pref: str) -> str:
        if pref == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return pref

    def load(self) -> None:
        if self._loaded and self._pipe is not None:
            return

        print(f"[DA2ZeroShotProvider] Loading model '{self.checkpoint}' onto device '{self.device}'...")
        # Map device string to torch device index if cuda
        device_arg = 0 if self.device == "cuda" else -1

        self._pipe = pipeline(
            task="depth-estimation",
            model=self.checkpoint,
            device=device_arg
        )
        self._loaded = True
        print(f"[DA2ZeroShotProvider] Model '{self.checkpoint}' successfully loaded and ready.")

    def predict(self, image: Image.Image) -> Tuple[np.ndarray, Dict[str, Any]]:
        if not self._loaded or self._pipe is None:
            self.load()

        orig_w, orig_h = image.size
        if orig_w <= 0 or orig_h <= 0:
            raise ValueError(f"Invalid image dimensions: {orig_w}x{orig_h}")

        # Ensure RGB optical color channels
        rgb_image = image.convert("RGB")

        # Memory safeguard for massive aerial/satellite rasters:
        # Downsample to maximum dimension 2048 if needed, then interpolate depth back to original resolution
        max_dim = 2048
        downsampled = False
        if orig_w > max_dim or orig_h > max_dim:
            scale = max_dim / max(orig_w, orig_h)
            new_w = max(1, int(orig_w * scale))
            new_h = max(1, int(orig_h * scale))
            proc_image = rgb_image.resize((new_w, new_h), Image.Resampling.BILINEAR)
            downsampled = True
        else:
            proc_image = rgb_image

        start_time = time.perf_counter()

        with torch.no_grad():
            output = self._pipe(proc_image)

        inference_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Extract predicted depth tensor
        predicted_depth = output["predicted_depth"]
        if isinstance(predicted_depth, torch.Tensor):
            depth_arr = predicted_depth.detach().cpu().numpy().astype(np.float32)
        else:
            depth_arr = np.array(predicted_depth, dtype=np.float32)

        if depth_arr.ndim == 3:
            depth_arr = depth_arr.squeeze(0)

        # If downsampled, resize depth back to exact original image dimensions
        if downsampled or depth_arr.shape != (orig_h, orig_w):
            depth_pil = Image.fromarray(depth_arr)
            depth_resized = depth_pil.resize((orig_w, orig_h), Image.Resampling.BILINEAR)
            depth_arr = np.array(depth_resized, dtype=np.float32)

        metadata = {
            "model_id": "depth-anything-v2-small",
            "model_variant": "Depth Anything V2 Small (Zero-Shot Baseline)",
            "provider": "da2_zero_shot",
            "checkpoint": self.checkpoint,
            "device": self.device,
            "inference_time_ms": inference_time_ms
        }

        return depth_arr, metadata

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_id": "depth-anything-v2-small",
            "model_variant": "Depth Anything V2 Small (Zero-Shot Baseline)",
            "provider": "da2_zero_shot",
            "checkpoint": self.checkpoint,
            "device": self.device,
            "loaded": self._loaded
        }

    def dispose(self) -> None:
        self._pipe = None
        self._loaded = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print("[DA2ZeroShotProvider] Model resources released.")
