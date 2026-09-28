"""
DepthWizard — Tests for Fine-Tuned DA2 Artifact Acquisition & Integrity
Authority: docs/ml/ml_pipeline.md & Phase 3A Specification

Verifies:
1. Local checkpoint path is preferred when present.
2. HF Space acquisition is triggered when absent.
3. SHA-256 verification succeeds for the expected hash.
4. SHA-256 mismatch raises a clear error and aborts loading.
5. No silent fallback to zero-shot occurs upon acquisition failure.
"""

import hashlib
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import (
    DA2_FINETUNED_SHA256,
    HF_SPACE_FILENAME,
    HF_SPACE_REPO_ID,
    HF_SPACE_REPO_TYPE,
)
from backend.estimators.da2_fine_tuned import (
    DA2FineTunedProvider,
    acquire_hf_checkpoint,
    compute_sha256,
    verify_checkpoint_sha256,
)
from backend.estimators.da2_zero_shot import DA2ZeroShotProvider
from backend.estimators.registry import create_estimator, _ESTIMATOR_CACHE


def test_local_checkpoint_preferred_when_present(tmp_path, monkeypatch):
    """
    When a valid local checkpoint exists on disk, the provider must load it
    directly without triggering any network requests to Hugging Face.
    """
    dummy_local = tmp_path / "local_checkpoint.pth"
    dummy_local.write_bytes(b"dummy-local-checkpoint-data")

    mock_hf_download = MagicMock()
    monkeypatch.setattr("backend.estimators.da2_fine_tuned.hf_hub_download", mock_hf_download)

    provider = DA2FineTunedProvider(checkpoint=str(dummy_local), device="cpu")

    # Local file must be used directly
    assert provider.checkpoint_path == dummy_local.resolve()
    # HF acquisition must NOT have been called
    mock_hf_download.assert_not_called()


def test_hf_acquisition_triggered_when_absent(tmp_path, monkeypatch):
    """
    When the local checkpoint is absent, the provider must trigger acquisition
    from the designated Hugging Face Space repository.
    """
    target_checkpoint = tmp_path / "models" / "da2_finetuned.pth"
    assert not target_checkpoint.exists()

    payload = b"mock-fine-tuned-weights"
    expected_hash = hashlib.sha256(payload).hexdigest()

    hf_cache_file = tmp_path / "hf_downloaded_temp.pth"
    hf_cache_file.write_bytes(payload)

    mock_hf_download = MagicMock(return_value=str(hf_cache_file))
    monkeypatch.setattr("backend.estimators.da2_fine_tuned.hf_hub_download", mock_hf_download)

    provider = DA2FineTunedProvider(
        checkpoint=str(target_checkpoint),
        device="cpu",
        expected_sha256=expected_hash,
    )

    # HF download must be invoked with designated Space parameters
    mock_hf_download.assert_called_once_with(
        repo_id=HF_SPACE_REPO_ID,
        repo_type=HF_SPACE_REPO_TYPE,
        filename=HF_SPACE_FILENAME,
    )

    # Checkpoint must be persisted to the target path and verified
    assert target_checkpoint.is_file()
    assert target_checkpoint.read_bytes() == payload
    assert provider.checkpoint_path == target_checkpoint


def test_sha256_verification_succeeds_for_expected_hash(tmp_path):
    """
    SHA-256 verification helper must accurately validate matching hashes
    in a case-insensitive manner.
    """
    content = b"sample-model-weights-for-integrity-test"
    test_file = tmp_path / "valid.pth"
    test_file.write_bytes(content)

    expected_hash = hashlib.sha256(content).hexdigest()

    # Lowercase match
    assert verify_checkpoint_sha256(test_file, expected_hash.lower()) is True
    # Uppercase match
    assert verify_checkpoint_sha256(test_file, expected_hash.upper()) is True
    # Tampered expected hash fails
    assert verify_checkpoint_sha256(test_file, "0" * 64) is False

    # Also verify local repository checkpoint against official constant if present
    repo_checkpoint = Path("backend/checkpoints/da2_finetuned.pth")
    if repo_checkpoint.is_file():
        assert verify_checkpoint_sha256(repo_checkpoint, DA2_FINETUNED_SHA256) is True


def test_sha256_mismatch_raises_clear_error(tmp_path, monkeypatch):
    """
    If the downloaded artifact's SHA-256 does not match the pinned reference hash,
    a clear security exception must be raised, the corrupted artifact must not be
    saved to the target location, and model loading must abort.
    """
    corrupted_payload = b"corrupted-or-tampered-data"
    hf_cache_file = tmp_path / "corrupted_temp.pth"
    hf_cache_file.write_bytes(corrupted_payload)

    target_checkpoint = tmp_path / "target_dir" / "da2_finetuned.pth"

    mock_hf_download = MagicMock(return_value=str(hf_cache_file))
    monkeypatch.setattr("backend.estimators.da2_fine_tuned.hf_hub_download", mock_hf_download)

    with pytest.raises(RuntimeError) as exc_info:
        DA2FineTunedProvider(
            checkpoint=str(target_checkpoint),
            device="cpu",
            expected_sha256=DA2_FINETUNED_SHA256,
        )

    # Must contain informative security and hash details
    error_msg = str(exc_info.value)
    assert "SHA-256 mismatch" in error_msg
    assert DA2_FINETUNED_SHA256 in error_msg
    assert "Zero-shot fallback is disallowed" in error_msg

    # Target file must not be persisted on checksum failure
    assert not target_checkpoint.exists()


def test_no_zero_shot_fallback_after_acquisition_failure(tmp_path, monkeypatch):
    """
    When acquisition or integrity verification fails, the system must FAIL CLEARLY
    and must NEVER silently substitute the zero-shot DA2 provider.
    """
    target_checkpoint = tmp_path / "missing_checkpoint.pth"

    # Simulate network failure during HF acquisition
    mock_hf_download = MagicMock(side_effect=RuntimeError("HF Hub Connection Timeout"))
    monkeypatch.setattr("backend.estimators.da2_fine_tuned.hf_hub_download", mock_hf_download)

    # Direct factory creation must raise error rather than returning zero-shot provider
    with pytest.raises(RuntimeError) as exc_info:
        estimator = create_estimator(
            provider_name="da2_fine_tuned",
            checkpoint=str(target_checkpoint),
            device="cpu",
        )
    assert "Failed to acquire fine-tuned checkpoint" in str(exc_info.value)

    # Verify zero-shot provider is NOT returned
    assert not isinstance(exc_info.value, DA2ZeroShotProvider)
