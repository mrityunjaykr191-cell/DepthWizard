"""
DepthWizard — Terrain Aspect Calculation
Authority: Phase 4A Specification (Section 10, 16)

Calculates terrain aspect (direction of steepest downhill descent):
0° = North, 90° = East, 180° = South, 270° = West.
Normalized strictly to [0°, 360°).
Identifies flat terrain (near-zero gradient) and explicitly treats it as NaN/undefined,
preventing arbitrary assignment of cardinal North.
"""

from typing import Optional
import numpy as np

from .contracts import TerrainGrid, AspectResult
from .slope import compute_gradients_2d


def compute_aspect(
    grid: TerrainGrid,
    flat_threshold: float = 1e-6
) -> AspectResult:
    """
    Computes terrain aspect raster for the provided TerrainGrid.

    Convention:
    - 0.0° = North (steepest descent towards North)
    - 90.0° = East (steepest descent towards East)
    - 180.0° = South (steepest descent towards South)
    - 270.0° = West (steepest descent towards West)
    - Flat cells (gradient magnitude < flat_threshold) are assigned NaN.
    """
    dz_dx, dz_dy, valid_mask = compute_gradients_2d(
        grid.elevations, grid.dx, grid.dy, grid.nodata
    )

    rows, cols = grid.elevations.shape
    aspect_map = np.full((rows, cols), np.nan, dtype=np.float32)
    flat_mask = np.zeros((rows, cols), dtype=bool)

    grad_mag = np.sqrt(dz_dx ** 2 + dz_dy ** 2)

    # Valid non-flat cells
    non_flat = valid_mask & (grad_mag >= flat_threshold)
    is_flat = valid_mask & (grad_mag < flat_threshold)

    flat_mask[is_flat] = True

    # Mathematical formulation:
    # Steepest downhill descent direction in compass degrees clockwise from North:
    # theta = atan2(-dz/dx, dz/dy) in radians
    # where dz/dy is positive when elevation increases southward (sloping down to North).
    angles_rad = np.arctan2(-dz_dx[non_flat], dz_dy[non_flat])
    angles_deg = np.degrees(angles_rad)

    # Normalize strictly to [0.0, 360.0)
    angles_deg = np.mod(angles_deg, 360.0)
    # Ensure exact 360.0 becomes 0.0
    angles_deg[np.isclose(angles_deg, 360.0, atol=1e-5)] = 0.0

    aspect_map[non_flat] = angles_deg.astype(np.float32)

    valid_count = int(np.count_nonzero(non_flat))
    flat_count = int(np.count_nonzero(is_flat))
    nodata_count = int(np.count_nonzero(~valid_mask))

    return AspectResult(
        aspect_map=aspect_map,
        flat_mask=flat_mask,
        valid_count=valid_count,
        flat_count=flat_count,
        nodata_count=nodata_count,
        convention="0=North, 90=East, 180=South, 270=West, flat=undefined (NaN)"
    )
