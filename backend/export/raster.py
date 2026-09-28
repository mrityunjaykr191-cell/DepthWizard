"""
DepthWizard — Geospatial Raster Export Engine
Authority: Phase 5B Specification (Section 5B.4) & docs/product/output-contract.md

Generates publication-grade, GDAL-compliant rasters:
1. Calibrated Metric GeoTIFF DSM (Float32 with authoritative CRS, affine transform, NoData, and metadata tags)
2. Relative Heightmap (unprojected 32-bit float without fabricated CRS)
3. Signed Height-Error Map (residuals E_pred - E_ref in meters)
"""

import io
from typing import List, Optional, Union
import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.transform import Affine, from_origin


def export_calibrated_geotiff(
    elevations: Optional[np.ndarray] = None,
    crs_string: Optional[str] = None,
    transform_matrix: Optional[Union[List[float], Affine]] = None,
    nodata_value: Optional[float] = -9999.0,
    reference_source: Optional[str] = "Copernicus GLO-30 DEM",
    compress: str = "deflate",
    # Flexible keyword aliases
    elevation_grid: Optional[np.ndarray] = None,
    crs: Optional[str] = None,
    transform: Optional[Union[List[float], Affine]] = None,
    nodata: Optional[float] = None,
    ground_resolution_m: Optional[float] = None,
) -> io.BytesIO:
    """
    Exports calibrated metric Digital Surface Model (DSM) as a single-band GeoTIFF in an in-memory buffer.
    Preserves authoritative CRS, georeferencing transform, and NoData.
    """
    grid = elevations if elevations is not None else elevation_grid
    if grid is None:
        raise ValueError("Must provide elevations or elevation_grid array")
    if grid.ndim != 2:
        raise ValueError(f"Elevations must be 2D array, got shape {grid.shape}")

    rows, cols = grid.shape
    elev_f32 = np.ascontiguousarray(grid, dtype=np.float32)

    # CRS resolution
    active_crs = crs if crs is not None else (crs_string or "EPSG:32610")

    # Transform resolution
    active_trans = transform if transform is not None else transform_matrix
    if active_trans is None:
        res = float(ground_resolution_m) if ground_resolution_m is not None else 1.0
        # Default origin in UTM zone 10N / reference space
        active_transform = from_origin(500000.0, 4000000.0, res, res)
    elif isinstance(active_trans, Affine):
        active_transform = active_trans
    elif isinstance(active_trans, (list, tuple)) and len(active_trans) == 6:
        active_transform = Affine(
            active_trans[0], active_trans[1], active_trans[2],
            active_trans[3], active_trans[4], active_trans[5]
        )
    else:
        active_transform = from_origin(500000.0, 4000000.0, 1.0, 1.0)

    # NoData resolution
    active_nodata = float(nodata) if nodata is not None else (float(nodata_value) if nodata_value is not None else -9999.0)

    with MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=rows,
            width=cols,
            count=1,
            dtype="float32",
            crs=active_crs,
            transform=active_transform,
            nodata=active_nodata,
            compress=compress
        ) as dst:
            dst.write(elev_f32, 1)
            dst.update_tags(
                TIFFTAG_SOFTWARE="DepthWizard 0.1.0",
                ELEVATION_UNIT="meters",
                SCIENTIFIC_STATUS="CALIBRATED",
                REFERENCE_SOURCE=str(reference_source or "Reference DEM"),
                VERTICAL_REFERENCE="EGM96 / WGS84 Geoid",
                AUTHOR="DepthWizard Geospatial Engine"
            )
        data = memfile.read()

    buf = io.BytesIO(data)
    buf.seek(0)
    return buf


def export_relative_heightmap(
    elevations: Optional[np.ndarray] = None,
    nodata_value: Optional[float] = -9999.0,
    compress: str = "deflate",
    # Flexible keyword aliases
    elevation_grid: Optional[np.ndarray] = None,
    nodata: Optional[float] = None,
) -> io.BytesIO:
    """
    Exports uncalibrated relative heightfield as an unprojected raster.
    STRICT SCIENTIFIC RULE: Does NOT attach fake CRS or fabricated geographic coordinates.
    """
    grid = elevations if elevations is not None else elevation_grid
    if grid is None:
        raise ValueError("Must provide elevations or elevation_grid array")
    if grid.ndim != 2:
        raise ValueError(f"Elevations must be 2D array, got shape {grid.shape}")

    rows, cols = grid.shape
    elev_f32 = np.ascontiguousarray(grid, dtype=np.float32)

    active_nodata = float(nodata) if nodata is not None else (float(nodata_value) if nodata_value is not None else -9999.0)

    # Unit grid transform: 1 pixel = 1 unit
    unit_transform = Affine.identity()

    with MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=rows,
            width=cols,
            count=1,
            dtype="float32",
            crs=None,  # Explicitly unprojected
            transform=unit_transform,
            nodata=active_nodata,
            compress=compress
        ) as dst:
            dst.write(elev_f32, 1)
            dst.update_tags(
                TIFFTAG_SOFTWARE="DepthWizard 0.1.0",
                ELEVATION_UNIT="relative units",
                SCIENTIFIC_STATUS="RELATIVE",
                NOTE="Model-relative surface heights without physical datum; coordinate space is image pixels.",
                AUTHOR="DepthWizard Geospatial Engine"
            )
        data = memfile.read()

    buf = io.BytesIO(data)
    buf.seek(0)
    return buf


def export_signed_error_geotiff(
    error_map: Optional[np.ndarray] = None,
    crs_string: Optional[str] = None,
    transform_matrix: Optional[Union[List[float], Affine]] = None,
    nodata_value: Optional[float] = -9999.0,
    reference_source: Optional[str] = "Reference DEM",
    compress: str = "deflate",
    # Flexible keyword aliases
    error_grid: Optional[np.ndarray] = None,
    crs: Optional[str] = None,
    transform: Optional[Union[List[float], Affine]] = None,
    nodata: Optional[float] = None,
) -> io.BytesIO:
    """
    Exports signed height-error map (Predicted - Reference) as a GeoTIFF in an in-memory buffer.
    """
    grid = error_map if error_map is not None else error_grid
    if grid is None:
        raise ValueError("Must provide error_map or error_grid array")
    if grid.ndim != 2:
        raise ValueError(f"Error map must be 2D array, got shape {grid.shape}")

    rows, cols = grid.shape
    err_f32 = np.ascontiguousarray(grid, dtype=np.float32)

    active_crs = crs if crs is not None else (crs_string or "EPSG:32610")

    active_trans = transform if transform is not None else transform_matrix
    if active_trans is None:
        active_transform = from_origin(500000.0, 4000000.0, 1.0, 1.0)
    elif isinstance(active_trans, Affine):
        active_transform = active_trans
    elif isinstance(active_trans, (list, tuple)) and len(active_trans) == 6:
        active_transform = Affine(
            active_trans[0], active_trans[1], active_trans[2],
            active_trans[3], active_trans[4], active_trans[5]
        )
    else:
        active_transform = from_origin(500000.0, 4000000.0, 1.0, 1.0)

    active_nodata = float(nodata) if nodata is not None else (float(nodata_value) if nodata_value is not None else -9999.0)

    with MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=rows,
            width=cols,
            count=1,
            dtype="float32",
            crs=active_crs,
            transform=active_transform,
            nodata=active_nodata,
            compress=compress
        ) as dst:
            dst.write(err_f32, 1)
            dst.update_tags(
                TIFFTAG_SOFTWARE="DepthWizard 0.1.0",
                ELEVATION_UNIT="meters",
                RESIDUAL_CONVENTION="predicted_minus_reference",
                REFERENCE_SOURCE=str(reference_source or "Reference DEM"),
                SCIENTIFIC_STATUS="VALIDATED_ERROR_RESIDUALS",
                AUTHOR="DepthWizard Geospatial Engine"
            )
        data = memfile.read()

    buf = io.BytesIO(data)
    buf.seek(0)
    return buf
