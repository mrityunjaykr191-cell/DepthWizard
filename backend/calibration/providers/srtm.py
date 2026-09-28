"""
DepthWizard — SRTM Reference Provider
Authority: Phase 3 Specification (Phases 3.2, 3.5)

Represents SRTM (Shuttle Radar Topography Mission GL1 30m) as the fallback reference DEM source.
Nominal resolution: 30 meters (1 arc-second).
Vertical datum: EGM96.
"""

from typing import Optional
from backend.calibration.contracts import ReferenceSourceType
from backend.calibration.providers.dem_provider import DEMReferenceProvider


class SRTMProvider(DEMReferenceProvider):
    """
    Fallback calibration reference provider.
    """

    def __init__(self, data_dir: Optional[str] = None):
        super().__init__(
            source_type=ReferenceSourceType.SRTM,
            source_name="SRTM GL1 (30m Global Elevation)",
            nominal_res_m=30.0,
            vertical_datum="EGM96",
            data_dir=data_dir
        )
