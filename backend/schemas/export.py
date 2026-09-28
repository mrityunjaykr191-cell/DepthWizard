"""
Pydantic Schemas for Export Endpoints (Phase 5B)
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from backend.export.contracts import SessionExport


class TerrainExportRequest(BaseModel):
    """Request to export raster terrain as GeoTIFF or relative heightmap."""
    format: str = Field("geotiff", description="Export raster format: geotiff, relative_geotiff, error_geotiff")
    height_data_raw_b64: str = Field(..., description="Base64 encoded float32 2D array (width * height * 4 bytes)")
    width: int = Field(..., description="Raster width in pixels")
    height: int = Field(..., description="Raster height in pixels")
    scene_name: str = Field("terrain", description="Scene or file name")
    calibration_status: str = Field("RELATIVE", description="Calibration status: CALIBRATED, RELATIVE, CALIBRATION_REJECTED, etc.")
    crs: Optional[str] = Field(None, description="Coordinate Reference System (e.g., EPSG:32610)")
    transform: Optional[List[float]] = Field(None, description="Affine transform coefficients [a, b, d, e, xoff, yoff] or [a, b, xoff, d, e, yoff]")
    ground_resolution_m: Optional[float] = Field(None, description="Ground resolution in meters/pixel")
    nodata: Optional[float] = Field(-9999.0, description="NoData value")


class AnalysisExportRequest(BaseModel):
    """Request to export analysis data in JSON, GeoJSON, or CSV format."""
    format: str = Field("json", description="Analysis format: json, geojson, csv")
    session: SessionExport = Field(..., description="Full session export contract")
    profile_tool: Optional[str] = Field("cross_section", description="For CSV: cross_section or route_profile")


class ReportExportRequest(BaseModel):
    """Request to generate standalone HTML or PDF report."""
    format: str = Field("html", description="Report format: html or pdf")
    session: SessionExport = Field(..., description="Full session export contract")
