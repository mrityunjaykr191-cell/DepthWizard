"""
DepthWizard — Coordinate-Aware Spatial Alignment
Authority: Phase 3 Specification (Phases 3.4, 3.6, 3.7, 3.8)

Performs rigorous coordinate reference system (CRS) transformation and spatial alignment
between source optical GeoTIFF footprint and reference DEM rasters.
Uses pyproj and rasterio for mathematically exact coordinate transformations.
"""

from typing import Tuple, Dict, Any, Optional
import numpy as np
import pyproj
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from affine import Affine

from backend.calibration.contracts import (
    GeospatialMetadata,
    AlignmentMetadata
)


def compute_bounds_wgs84(
    bounds: Dict[str, float],
    source_crs_str: str
) -> Dict[str, float]:
    """
    Transforms bounding box from source CRS into standard WGS84 (EPSG:4326) [lon/lat].
    """
    if not source_crs_str:
        raise ValueError("Cannot transform bounds: source CRS is missing.")

    crs_upper = source_crs_str.upper().strip()
    if crs_upper in ("EPSG:4326", "WGS84", "OGC:CRS84"):
        return dict(bounds)

    try:
        transformer = pyproj.Transformer.from_crs(source_crs_str, "EPSG:4326", always_xy=True)
        # Transform corners: (west, south), (east, south), (east, north), (west, north)
        w, s, e, n = bounds["west"], bounds["south"], bounds["east"], bounds["north"]
        xs, ys = transformer.transform([w, e, e, w], [s, s, n, n])
        return {
            "west": float(np.min(xs)),
            "south": float(np.min(ys)),
            "east": float(np.max(xs)),
            "north": float(np.max(ys))
        }
    except Exception as err:
        raise ValueError(f"Failed to transform source bounds from '{source_crs_str}' to WGS84: {err}")


def compute_footprint_intersection(
    source_bounds_wgs84: Dict[str, float],
    ref_bounds_wgs84: Dict[str, float]
) -> Tuple[float, Optional[Dict[str, float]]]:
    """
    Computes overlap fraction of source footprint within reference DEM coverage.
    Returns:
        (overlap_fraction, intersection_bounds_wgs84)
    """
    sw_lon = max(source_bounds_wgs84["west"], ref_bounds_wgs84["west"])
    sw_lat = max(source_bounds_wgs84["south"], ref_bounds_wgs84["south"])
    ne_lon = min(source_bounds_wgs84["east"], ref_bounds_wgs84["east"])
    ne_lat = min(source_bounds_wgs84["north"], ref_bounds_wgs84["north"])

    if sw_lon >= ne_lon or sw_lat >= ne_lat:
        return 0.0, None

    intersection = {
        "west": sw_lon,
        "south": sw_lat,
        "east": ne_lon,
        "north": ne_lat
    }

    src_area = (source_bounds_wgs84["east"] - source_bounds_wgs84["west"]) * (
        source_bounds_wgs84["north"] - source_bounds_wgs84["south"]
    )
    int_area = (ne_lon - sw_lon) * (ne_lat - sw_lat)

    overlap_frac = float(int_area / max(src_area, 1e-12))
    return min(1.0, max(0.0, overlap_frac)), intersection


def align_reference_dem_to_source(
    ref_raster: np.ndarray,
    ref_transform: Affine,
    ref_crs: str,
    ref_nodata: Optional[float],
    source_meta: GeospatialMetadata
) -> Tuple[np.ndarray, np.ndarray, AlignmentMetadata]:
    """
    Resamples and reprojects reference DEM data directly onto the source image pixel grid.
    Preserves exact spatial correspondence without inventing high-frequency detail.

    Returns:
        (aligned_dem_grid, valid_mask, alignment_meta)
    """
    if not source_meta.georeferenced or not source_meta.crs or not source_meta.transform:
        raise ValueError("Source raster lacks valid georeferencing (CRS or affine transform missing).")

    dst_width = source_meta.width
    dst_height = source_meta.height
    dst_crs = source_meta.crs
    dst_transform = Affine(*source_meta.transform)

    # Convert 1D/2D reference raster to 2D float32
    if ref_raster.ndim == 3:
        ref_2d = ref_raster[0].astype(np.float32)
    else:
        ref_2d = ref_raster.astype(np.float32)

    # Prepare destination buffer
    dst_dem = np.full((dst_height, dst_width), np.nan, dtype=np.float32)

    # Determine whether CRS transformation is required
    crs_transformed = (ref_crs.strip().upper() != dst_crs.strip().upper())

    # Reproject using GDAL/rasterio coordinate-aware resampling
    src_nodata_val = float(ref_nodata) if ref_nodata is not None else -9999.0
    dst_nodata_val = np.nan

    reproject(
        source=ref_2d,
        destination=dst_dem,
        src_transform=ref_transform,
        src_crs=ref_crs,
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        src_nodata=src_nodata_val,
        dst_nodata=dst_nodata_val,
        resampling=Resampling.bilinear
    )

    # Valid mask: finite values, not equal to nodata, and not NaN
    valid_mask = np.isfinite(dst_dem)
    if ref_nodata is not None:
        valid_mask = valid_mask & (dst_dem != ref_nodata) & (np.abs(dst_dem - ref_nodata) > 1e-3)

    valid_count = int(np.count_nonzero(valid_mask))
    total_pixels = dst_width * dst_height
    overlap_fraction = float(valid_count / max(total_pixels, 1))

    alignment_meta = AlignmentMetadata(
        source_crs=dst_crs,
        reference_crs=ref_crs,
        transformed=crs_transformed,
        resampling_method="bilinear_coordinate_aware",
        source_footprint_in_ref_crs=source_meta.bounds or {},
        overlap_fraction=overlap_fraction,
        matched_pixel_count=valid_count
    )

    return dst_dem, valid_mask, alignment_meta
