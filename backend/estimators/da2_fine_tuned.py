"""
DepthWizard — Fine-Tuned Depth Anything V2 Provider
Authority: docs/ml/ml_pipeline.md & Phase 3A Specification

Concrete DepthEstimator provider implementing the locked GAMUS fine-tuned
Depth Anything V2 Small checkpoint.
"""

import os
import time
import hashlib
import shutil
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, Union
import numpy as np
from PIL import Image
import torch
from transformers import pipeline
from huggingface_hub import hf_hub_download

from backend.config import (
    HF_SPACE_REPO_ID,
    HF_SPACE_REPO_TYPE,
    HF_SPACE_FILENAME,
    DA2_FINETUNED_SHA256,
)
from .base import DepthEstimator


def compute_sha256(file_path: Union[str, Path]) -> str:
    """
    Computes lowercase hex SHA-256 hash of a file using chunked binary streaming.
    """
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def verify_checkpoint_sha256(file_path: Union[str, Path], expected_sha256: str) -> bool:
    """
    Verifies that a file matches the expected SHA-256 checksum.
    """
    return compute_sha256(file_path) == expected_sha256.lower()


def acquire_hf_checkpoint(
    repo_id: str = HF_SPACE_REPO_ID,
    repo_type: str = HF_SPACE_REPO_TYPE,
    filename: str = HF_SPACE_FILENAME,
    expected_sha256: str = DA2_FINETUNED_SHA256,
    target_path: Optional[Path] = None,
) -> Path:
    """
    Downloads the fine-tuned DA2 checkpoint from a Hugging Face Space, verifies
    its SHA-256 checksum BEFORE allowing it to be loaded, and persists it to the
    target cache/checkpoint location.

    Raises:
        RuntimeError: If download fails or SHA-256 integrity verification fails.
    """
    print(f"[DA2FineTunedProvider] Local checkpoint absent. Acquiring '{filename}' from HF {repo_type} '{repo_id}'...")
    try:
        downloaded_file = hf_hub_download(
            repo_id=repo_id,
            repo_type=repo_type,
            filename=filename,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to acquire fine-tuned checkpoint '{filename}' from Hugging Face Space '{repo_id}': {exc}"
        ) from exc

    downloaded_path = Path(downloaded_file)
    print(f"[DA2FineTunedProvider] Artifact downloaded to '{downloaded_path}'. Verifying SHA-256...")

    # Strict SHA-256 verification BEFORE any torch.load
    computed_sha256 = compute_sha256(downloaded_path)
    if computed_sha256 != expected_sha256.lower():
        raise RuntimeError(
            f"Security/Integrity failure: Checkpoint SHA-256 mismatch for downloaded artifact '{filename}'.\n"
            f"  Expected: {expected_sha256}\n"
            f"  Computed: {computed_sha256}\n"
            f"Refusing to load untrusted or corrupted checkpoint. Zero-shot fallback is disallowed."
        )

    print(f"[DA2FineTunedProvider] SHA-256 checksum verified ({computed_sha256[:12]}...).")

    if target_path is not None:
        try:
            target_path = Path(target_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            if downloaded_path.resolve() != target_path.resolve():
                print(f"[DA2FineTunedProvider] Saving verified artifact to '{target_path}'...")
                shutil.copy2(downloaded_path, target_path)
            return target_path
        except Exception as exc:
            print(f"[DA2FineTunedProvider] Warning: Could not cache artifact to '{target_path}' ({exc}). Using HF cache path '{downloaded_path}'.")
            return downloaded_path

    return downloaded_path


class DA2FineTunedProvider(DepthEstimator):
    """
    Depth Anything V2 Small fine-tuned provider.
    Loads base architecture and applies locked fine-tuned state_dict weights.
    Reuses cached pipeline across requests.
    """

    BASE_MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"
    DEFAULT_REPO_ID = HF_SPACE_REPO_ID
    DEFAULT_REPO_TYPE = HF_SPACE_REPO_TYPE
    DEFAULT_FILENAME = HF_SPACE_FILENAME
    DEFAULT_EXPECTED_SHA256 = DA2_FINETUNED_SHA256

    def __init__(
        self,
        checkpoint: Optional[str] = None,
        device: str = "auto",
        expected_sha256: Optional[str] = None,
        hf_repo_id: Optional[str] = None,
    ):
        self.raw_checkpoint_arg = checkpoint
        self.expected_sha256 = expected_sha256 or self.DEFAULT_EXPECTED_SHA256
        self.hf_repo_id = hf_repo_id or self.DEFAULT_REPO_ID
        self.device_pref = device
        self.device = self._resolve_device(device)
        self.checkpoint_path = self._resolve_checkpoint_path(checkpoint)
        self._pipe = None
        self._loaded = False
        self._epoch: Optional[int] = None
        self._val_mae: Optional[float] = None
        self._val_rmse: Optional[float] = None

    def _resolve_checkpoint_path(self, checkpoint: Optional[str]) -> Path:
        """
        Resolves the fine-tuned .pth checkpoint path with fallbacks and HF Space acquisition.

        Order of precedence:
        1. Explicit candidate path if provided (and distinct from base model ID):
           If file exists locally -> return candidate.
        2. Default project checkpoint path (backend/checkpoints/da2_finetuned.pth):
           If file exists locally -> return default_local.
        3. If local checkpoint is absent:
           Download da2_finetuned.pth from Hugging Face Space, verify SHA-256 checksum,
           save to target checkpoint location, and return verified path.
        """
        # Default local project path
        project_root = Path(__file__).resolve().parent.parent.parent
        default_local = project_root / "backend" / "checkpoints" / "da2_finetuned.pth"

        # 1. Check explicit argument if provided and valid
        if checkpoint and checkpoint != self.BASE_MODEL_ID:
            candidate = Path(checkpoint)
            if not candidate.is_absolute():
                candidate = (project_root / candidate).resolve()
            if candidate.is_file():
                print(f"[DA2FineTunedProvider] Using local checkpoint: {candidate}")
                return candidate
            target_path = candidate
        else:
            # 2. Check default local path
            if default_local.is_file():
                print(f"[DA2FineTunedProvider] Using local checkpoint: {default_local}")
                return default_local
            target_path = default_local

        # 3. Local checkpoint absent: trigger HF Space artifact acquisition
        print(f"[DA2FineTunedProvider] Local checkpoint absent at '{target_path}'. Initiating HF acquisition...")
        return acquire_hf_checkpoint(
            repo_id=self.hf_repo_id,
            repo_type=self.DEFAULT_REPO_TYPE,
            filename=self.DEFAULT_FILENAME,
            expected_sha256=self.expected_sha256,
            target_path=target_path,
        )

    def _resolve_device(self, pref: str) -> str:
        if pref == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return pref

    def load(self) -> None:
        if self._loaded and self._pipe is not None:
            return

        print(f"[DA2FineTunedProvider] Instantiating base model '{self.BASE_MODEL_ID}'...")
        device_arg = 0 if self.device == "cuda" else -1

        # Instantiate depth estimation pipeline
        self._pipe = pipeline(
            task="depth-estimation",
            model=self.BASE_MODEL_ID,
            device=device_arg
        )

        print(f"[DA2FineTunedProvider] Loading locked fine-tuned weights from: {self.checkpoint_path}")
        checkpoint_dict = torch.load(self.checkpoint_path, map_location=self.device)

        if isinstance(checkpoint_dict, dict) and "model_state_dict" in checkpoint_dict:
            state_dict = checkpoint_dict["model_state_dict"]
            self._epoch = checkpoint_dict.get("epoch")
            self._val_mae = checkpoint_dict.get("val_mae")
            self._val_rmse = checkpoint_dict.get("val_rmse")
            print(f"[DA2FineTunedProvider] Checkpoint metadata: epoch={self._epoch}, val_mae={self._val_mae:.4f}m, val_rmse={self._val_rmse:.4f}m")
        elif isinstance(checkpoint_dict, dict):
            state_dict = checkpoint_dict
        else:
            raise TypeError(f"Unexpected checkpoint format: {type(checkpoint_dict)}")

        # Strict weight loading to guarantee 100% key compatibility
        load_res = self._pipe.model.load_state_dict(state_dict, strict=True)
        print(f"[DA2FineTunedProvider] Strict load result: {load_res}")

        self._pipe.model.eval()
        self._loaded = True
        print(f"[DA2FineTunedProvider] Fine-tuned model ready on device '{self.device}'.")

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

        predicted_depth = output["predicted_depth"]
        if isinstance(predicted_depth, torch.Tensor):
            depth_arr = predicted_depth.detach().cpu().numpy().astype(np.float32)
        else:
            depth_arr = np.array(predicted_depth, dtype=np.float32)

        if depth_arr.ndim == 3:
            depth_arr = depth_arr.squeeze(0)

        # Ensure correct output dimensions
        if downsampled or depth_arr.shape != (orig_h, orig_w):
            depth_pil = Image.fromarray(depth_arr)
            depth_resized = depth_pil.resize((orig_w, orig_h), Image.Resampling.BILINEAR)
            depth_arr = np.array(depth_resized, dtype=np.float32)

        metadata = {
            "model_id": "depth-anything-v2-small-finetuned",
            "model_variant": "Depth Anything V2 Small (GAMUS Fine-Tuned Checkpoint)",
            "provider": "da2_fine_tuned",
            "checkpoint": str(self.checkpoint_path),
            "device": self.device,
            "inference_time_ms": inference_time_ms,
            "training_epoch": self._epoch,
            "training_val_mae": self._val_mae,
            "training_val_rmse": self._val_rmse
        }

        return depth_arr, metadata

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_id": "depth-anything-v2-small-finetuned",
            "model_variant": "Depth Anything V2 Small (GAMUS Fine-Tuned Checkpoint)",
            "provider": "da2_fine_tuned",
            "checkpoint": str(self.checkpoint_path),
            "device": self.device,
            "loaded": self._loaded,
            "training_epoch": self._epoch,
            "training_val_mae": self._val_mae,
            "training_val_rmse": self._val_rmse
        }

    def dispose(self) -> None:
        self._pipe = None
        self._loaded = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print("[DA2FineTunedProvider] Model resources released.")
