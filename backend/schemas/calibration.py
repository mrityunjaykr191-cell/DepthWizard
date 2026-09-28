"""
DepthWizard — Calibration API Schemas
Authority: Phase 3 Specification & docs/engineering/api-contract.md
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class CalibrationSourcesResponse(BaseModel):
    """
    Response listing supported reference elevation sources and their readiness.
    """
    supported_sources: list[str] = Field(..., description="List of supported calibration reference sources")
    preferred_source: str = Field("CartoDEM", description="Preferred reference DEM source")
    fallback_source: str = Field("SRTM", description="Fallback reference DEM source")
    local_tiles_available: bool = Field(..., description="Whether local DEM reference tiles exist")


class CalibrationResponse(BaseModel):
    """
    Authoritative response from the /api/calibrate endpoint.
    """
    status: str = Field(..., description="Calibration status: 'calibrated', 'unavailable', or 'failed'")
    scale: Optional[float] = Field(None, description="Fitted vertical scale factor 'a' in E = aH + b")
    offset: Optional[float] = Field(None, description="Fitted vertical datum offset 'b' in meters")
    elevation_unit: str = Field("meters", description="Vertical unit of calibrated elevation")
    elevation_min: Optional[float] = Field(None, description="Minimum calibrated elevation in meters")
    elevation_max: Optional[float] = Field(None, description="Maximum calibrated elevation in meters")
    elevation_mean: Optional[float] = Field(None, description="Mean calibrated elevation in meters")
    method: Optional[str] = Field(None, description="Fitted method (e.g. affine_scale_offset, affine_robust_trimmed)")
    reference_source: Optional[str] = Field(None, description="Reference dataset used (CartoDEM or SRTM)")
    reference_crs: Optional[str] = Field(None, description="Coordinate reference system of reference data")
    vertical_reference: Optional[str] = Field(None, description="Vertical datum (e.g. EGM96)")
    sample_count: Optional[int] = Field(None, description="Number of valid matched samples used in fit")
    mae: Optional[float] = Field(None, description="Mean Absolute Error on matched reference samples (meters)")
    rmse: Optional[float] = Field(None, description="Root Mean Square Error on matched reference samples (meters)")
    bias: Optional[float] = Field(None, description="Mean bias (predicted - reference) in meters")
    correlation: Optional[float] = Field(None, description="Pearson correlation coefficient on matched samples")
    median_absolute_error: Optional[float] = Field(None, description="Median absolute residual error (meters)")
    calibrated_elevation_raw_b64: Optional[str] = Field(None, description="Base64-encoded Float32Array of calibrated elevations (meters)")
    residuals_map_raw_b64: Optional[str] = Field(None, description="Base64-encoded Float32Array of residuals (predicted - reference) in meters")
    failure_reason: Optional[str] = Field(None, description="Diagnostic explanation if calibration failed or is unavailable")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Complete lineage and parameter records")
