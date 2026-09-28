"""
DepthWizard — Reference Providers Module
Authority: Phase 3 Specification
"""

from backend.calibration.providers.base import ReferenceProvider
from backend.calibration.providers.dem_provider import DEMReferenceProvider
from backend.calibration.providers.cartodem import CartoDEMProvider
from backend.calibration.providers.srtm import SRTMProvider
from backend.calibration.providers.gcp_provider import GCPReferenceProvider, GroundControlPoint

__all__ = [
    "ReferenceProvider",
    "DEMReferenceProvider",
    "CartoDEMProvider",
    "SRTMProvider",
    "GCPReferenceProvider",
    "GroundControlPoint",
]
