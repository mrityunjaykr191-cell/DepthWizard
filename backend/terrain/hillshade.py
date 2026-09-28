"""
DepthWizard — Terrain Hillshade Illumination Module
Authority: Phase 4A Specification (Section 11, 12, 16)

Calculates photometric hillshade visualization raster from terrain gradients under
configurable directional illumination (sun azimuth and altitude).
Produces normalized [0.0, 1.0] float32 and [0, 255] uint8 visual rasters.
Strictly designated as a visual derivative, not a physical metric measurement.
"""

import math
from typing import Optional
import numpy as np

from .contracts import TerrainGrid, HillshadeResult
from .slope import compute_gradients_2d


def compute_hillshade(
    grid: TerrainGrid,
    sun_azimuth_deg: float = 315.0,
    sun_altitude_deg: float = 45.0,
    z_factor: float = 1.0
) -> HillshadeResult:
    """
    Computes directional shaded relief (hillshade) for TerrainGrid.

    Parameters:
    - grid: TerrainGrid elevation source
    - sun_azimuth_deg: Illumination direction in compass degrees clockwise from North (default 315.0° = NW)
    - sun_altitude_deg: Illumination elevation angle above horizon in degrees (default 45.0°)
    - z_factor: Multiplier to adjust visual vertical contrast (default 1.0)

    Returns:
        HillshadeResult with:
        - hillshade_f32: float32 array in range [0.0, 1.0] (NaN for NoData)
        - hillshade_u8: uint8 array in range [0, 255] (0 for NoData)
    """
    # 1. Normalize illumination angles
    azimuth_deg = float(np.mod(sun_azimuth_deg, 360.0))
    altitude_deg = float(np.clip(sun_altitude_deg, 0.0, 90.0))

    zenith_rad = math.radians(90.0 - altitude_deg)
    azimuth_rad = math.radians(azimuth_deg)

    # Precalculate sun constants
    cos_zenith = math.cos(zenith_rad)
    sin_zenith = math.sin(zenith_rad)

    # 2. Compute spatial gradients
    dz_dx, dz_dy, valid_mask = compute_gradients_2d(
        grid.elevations, grid.dx, grid.dy, grid.nodata
    )

    if z_factor != 1.0:
        dz_dx = dz_dx * z_factor
        dz_dy = dz_dy * z_factor

    rows, cols = grid.elevations.shape
    hillshade_f32 = np.full((rows, cols), np.nan, dtype=np.float32)
    hillshade_u8 = np.zeros((rows, cols), dtype=np.uint8)

    # Gradient magnitude and slope angle
    grad_mag = np.sqrt(dz_dx[valid_mask] ** 2 + dz_dy[valid_mask] ** 2)
    slope_rad = np.arctan(grad_mag)

    # Aspect in compass radians (clockwise from North):
    # theta = atan2(-dz/dx, dz/dy)
    aspect_rad = np.arctan2(-dz_dx[valid_mask], dz_dy[valid_mask])
    # Normalize to [0, 2pi)
    aspect_rad = np.mod(aspect_rad, 2.0 * math.pi)

    # 3. Lambertian Cosine Illumination Law:
    # cos(i) = cos(zenith) * cos(slope) + sin(zenith) * sin(slope) * cos(sun_azimuth - aspect)
    cos_inc = (
        cos_zenith * np.cos(slope_rad)
        + sin_zenith * np.sin(slope_rad) * np.cos(azimuth_rad - aspect_rad)
    )

    # Clamp negative values (slopes facing away from illumination) to 0.0
    illum = np.clip(cos_inc, 0.0, 1.0).astype(np.float32)

    hillshade_f32[valid_mask] = illum
    hillshade_u8[valid_mask] = np.clip(np.round(illum * 255.0), 0, 255).astype(np.uint8)

    return HillshadeResult(
        hillshade_f32=hillshade_f32,
        hillshade_u8=hillshade_u8,
        azimuth_deg=azimuth_deg,
        altitude_deg=altitude_deg,
        is_visualization_only=True
    )
