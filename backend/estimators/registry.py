"""
DepthWizard — Model Provider Registry & Factory
Authority: docs/architecture/ml-integration.md & Phase 2B Specification

Manages provider discovery, instantiation, and singleton lifecycle.
Provides an explicit slot for future fine-tuned model providers (e.g. GAMUS fine-tune).
"""

from typing import Optional, Dict
from .base import DepthEstimator
from .da2_zero_shot import DA2ZeroShotProvider


# Global singleton estimator instance and multi-provider cache
_GLOBAL_ESTIMATOR: Optional[DepthEstimator] = None
_ESTIMATOR_CACHE: Dict[str, DepthEstimator] = {}


def create_estimator(provider_name: str, checkpoint: str, device: str) -> DepthEstimator:
    """
    Factory function to instantiate the configured DepthEstimator provider.

    ===========================================================================
    EXTENSION POINT: FINE-TUNED MODEL INTEGRATION SLOT
    ===========================================================================
    Supports both:
    1. 'da2_zero_shot': continuous relative terrain baseline (default)
    2. 'da2_fine_tuned': GAMUS fine-tuned checkpoint (above-ground structure height)
    ===========================================================================
    """
    if provider_name == "da2_zero_shot":
        return DA2ZeroShotProvider(checkpoint=checkpoint, device=device)
    
    elif provider_name == "da2_fine_tuned":
        from .da2_fine_tuned import DA2FineTunedProvider
        return DA2FineTunedProvider(checkpoint=checkpoint, device=device)
    
    raise ValueError(
        f"Unknown depth model provider: '{provider_name}'. "
        f"Available providers: ['da2_zero_shot', 'da2_fine_tuned']."
    )


def get_global_estimator(provider_name: str, checkpoint: str, device: str) -> DepthEstimator:
    """
    Returns the persistent DepthEstimator instance for the requested provider,
    instantiating and loading it once. Caches instances to avoid reloading weights
    when alternating between zero-shot terrain and fine-tuned structure models.
    """
    global _GLOBAL_ESTIMATOR, _ESTIMATOR_CACHE
    cache_key = f"{provider_name}:{checkpoint}:{device}"
    if cache_key not in _ESTIMATOR_CACHE:
        estimator = create_estimator(provider_name, checkpoint, device)
        estimator.load()
        _ESTIMATOR_CACHE[cache_key] = estimator
    _GLOBAL_ESTIMATOR = _ESTIMATOR_CACHE[cache_key]
    return _GLOBAL_ESTIMATOR


def dispose_global_estimator() -> None:
    """
    Disposes all cached estimators on application shutdown.
    """
    global _GLOBAL_ESTIMATOR, _ESTIMATOR_CACHE
    for est in _ESTIMATOR_CACHE.values():
        est.dispose()
    _ESTIMATOR_CACHE.clear()
    _GLOBAL_ESTIMATOR = None
