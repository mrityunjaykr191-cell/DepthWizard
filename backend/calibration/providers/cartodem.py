"""
DepthWizard — CartoDEM Reference Provider
Authority: Phase 3 Specification (Phases 3.2, 3.5)

Represents CartoDEM (ISRO Bhuvan High-Resolution Reference Elevation) as the primary project reference DEM.
Nominal resolution: 30 meters (1 arc-second).
Vertical datum: EGM96.
"""

from typing import Optional
from backend.calibration.contracts import ReferenceSourceType
from backend.calibration.providers.dem_provider import DEMReferenceProvider


class CartoDEMProvider(DEMReferenceProvider):
    """
    Preferred primary calibration reference provider.
    """

    def __init__(self, data_dir: Optional[str] = None):
        super().__init__(
            source_type=ReferenceSourceType.CARTODEM,
            source_name="CartoDEM (ISRO Bhuvan Reference Elevation)",
            nominal_res_m=30.0,
            vertical_datum="EGM96",
            data_dir=data_dir
        )
