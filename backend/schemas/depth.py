"""
DepthWizard — Depth Result & Health Schemas
Authority: docs/product/output-contract.md & Phase 2B Specification
"""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall API health status, e.g. 'ok'")
    model_ready: bool = Field(..., description="Whether the underlying DepthEstimator is loaded in memory")
    provider: str = Field(..., description="Active depth provider ID, e.g. 'da2_zero_shot'")
    model_variant: str = Field(..., description="Readable model architecture name")
    checkpoint: str = Field(..., description="Configured checkpoint source")
    device: str = Field(..., description="Inference execution device ('cpu' or 'cuda')")


class DepthResultResponse(BaseModel):
    status: str = Field("complete", description="Inference completion status")
    width: int = Field(..., description="Raster width in pixels")
    height: int = Field(..., description="Raster height in pixels")
    depth_min: float = Field(..., description="Minimum relative depth value")
    depth_max: float = Field(..., description="Maximum relative depth value")
    depth_mean: float = Field(..., description="Mean relative depth value")
    
    # Model provenance metadata
    model_id: str = Field(..., description="Model identifier")
    model_variant: str = Field(..., description="Full model variant name")
    provider: str = Field(..., description="Active provider name")
    checkpoint: str = Field(..., description="Model checkpoint used")
    device: str = Field(..., description="Device used for inference")
    inference_time_ms: float = Field(..., description="Measured forward pass duration in milliseconds")
    
    # Scientific truth flag
    calibration_status: str = Field(
        "uncalibrated_relative", 
        description="Explicitly indicates relative depth. Never metric elevation without Phase 3 calibration."
    )
    
    # Numerical data transport (lossless Float32 bytes, base64 encoded)
    depth_raw_b64: str = Field(
        ..., 
        description="Base64 encoded raw little-endian Float32 array of shape (height, width)"
    )
    
    # Visual preview transport (8-bit normalized PNG data URL for instantaneous 2D UI display)
    preview_data_url: str = Field(
        ..., 
        description="PNG Data URL ('data:image/png;base64,...') representing normalized relative depth colormap"
    )
