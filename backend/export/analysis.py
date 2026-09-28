"""
DepthWizard — Machine-Readable Analysis Export Engine
Authority: Phase 5B Specification (Section 5B.5) & docs/product/output-contract.md

Exports analytical outputs as:
1. Structured Analysis JSON
2. GeoJSON FeatureCollection (for spatial measurements)
3. Cross-Section & Route Profile CSV
"""

import io
import csv
import json
from typing import Dict, Any, List, Union, Optional
from backend.export.contracts import SessionExport


def pixel_to_spatial(
    px: float,
    py: float,
    transform: List[float] = None
) -> List[float]:
    """
    Transforms raster pixel coordinates (col, row) to projected spatial coordinates
    using the affine transform [a, b, c, d, e, f].
    X_proj = c + px * a + py * b
    Y_proj = f + px * d + py * e
    """
    if transform and len(transform) >= 6:
        a, b, c, d, e, f = transform[:6]
        x_proj = c + px * a + py * b
        y_proj = f + px * d + py * e
        return [round(x_proj, 3), round(y_proj, 3)]
    return [round(px, 2), round(py, 2)]


def export_analysis_json(session: SessionExport, as_string: bool = True) -> Union[str, Dict[str, Any]]:
    """
    Constructs machine-readable JSON containing all quantitative analysis results.
    """
    data = {
        "schema_version": session.schema_version,
        "session_id": session.session_id,
        "exported_at": session.exported_at,
        "scientific_status": session.scientific_status,
        "is_metric": session.is_metric,
        "elevation_unit": session.terrain.unit,
        "terrain_statistics": {
            "rows": session.terrain.rows,
            "cols": session.terrain.cols,
            "total_cells": session.terrain.total_cells,
            "valid_cells": session.terrain.valid_cells,
            "nodata_cells": session.terrain.nodata_cells,
            "coverage_pct": session.terrain.valid_percentage,
            "elevation_min": session.terrain.elevation_min,
            "elevation_max": session.terrain.elevation_max,
            "elevation_mean": session.terrain.elevation_mean,
            "elevation_median": session.terrain.elevation_median,
            "relief": session.terrain.relief
        },
        "slope_analytics": {
            "available": session.analytics.slope_available,
            "unit": session.analytics.slope_unit,
            "is_physical": session.analytics.slope_is_physical,
            "min": session.analytics.slope_min,
            "max": session.analytics.slope_max,
            "mean": session.analytics.slope_mean
        },
        "aspect_analytics": {
            "available": session.analytics.aspect_available,
            "convention": session.analytics.aspect_convention
        },
        "calibration": session.calibration.model_dump(),
        "measurements": session.measurements,
        "validation": session.validation.model_dump()
    }
    if as_string:
        return json.dumps(data, indent=2)
    return data


def export_measurements_geojson(session: SessionExport, as_string: bool = True) -> Union[str, Dict[str, Any]]:
    """
    Exports measurement geometries (probes, two-point lines, cross-sections, LOS rays)
    as a valid GeoJSON FeatureCollection.
    
    CRITICAL COORDINATE GUARANTEE:
    - If scene is georeferenced, coordinates are projected map units (Easting, Northing).
    - If scene is unreferenced, coordinates are explicit image grid pixels.
    - NEVER fabricates latitude/longitude.
    """
    features: List[Dict[str, Any]] = []
    is_geo = session.input.georeferenced
    transform = session.input.affine_transform
    coord_sys = session.input.crs if is_geo and session.input.crs else "local_image_grid_pixels"

    meas = session.measurements

    # 1. Height Probe points
    probes = meas.get("probes", [])
    for idx, p in enumerate(probes):
        coords = pixel_to_spatial(p.get("x", 0), p.get("y", 0), transform if is_geo else None)
        features.append({
            "type": "Feature",
            "id": f"probe_{idx+1}",
            "geometry": {
                "type": "Point",
                "coordinates": coords
            },
            "properties": {
                "feature_type": "height_probe",
                "label": p.get("label", f"Probe #{idx+1}"),
                "elevation": p.get("elevation"),
                "slope": p.get("slope"),
                "aspect": p.get("aspect"),
                "unit": session.terrain.unit,
                "is_metric": session.is_metric,
                "pixel_x": p.get("x"),
                "pixel_y": p.get("y")
            }
        })

    # 2. Two-Point Distance lines
    two_points = meas.get("two_point", [])
    for idx, tp in enumerate(two_points):
        pt_a = tp.get("point_a", {})
        pt_b = tp.get("point_b", {})
        coords_a = pixel_to_spatial(pt_a.get("x", 0), pt_a.get("y", 0), transform if is_geo else None)
        coords_b = pixel_to_spatial(pt_b.get("x", 0), pt_b.get("y", 0), transform if is_geo else None)

        features.append({
            "type": "Feature",
            "id": f"two_point_{idx+1}",
            "geometry": {
                "type": "LineString",
                "coordinates": [coords_a, coords_b]
            },
            "properties": {
                "feature_type": "two_point_measurement",
                "distance_2d": tp.get("distance_2d"),
                "distance_3d": tp.get("distance_3d"),
                "elevation_diff": tp.get("elevation_diff"),
                "slope_deg": tp.get("slope_deg"),
                "is_metric": session.is_metric,
                "point_a_elevation": pt_a.get("elevation"),
                "point_b_elevation": pt_b.get("elevation")
            }
        })

    # 3. Cross-Section Profile Line
    cs = meas.get("cross_section")
    if cs and "start_point" in cs and "end_point" in cs:
        sp = cs["start_point"]
        ep = cs["end_point"]
        coords_start = pixel_to_spatial(sp[0], sp[1], transform if is_geo else None)
        coords_end = pixel_to_spatial(ep[0], ep[1], transform if is_geo else None)

        features.append({
            "type": "Feature",
            "id": "cross_section_profile",
            "geometry": {
                "type": "LineString",
                "coordinates": [coords_start, coords_end]
            },
            "properties": {
                "feature_type": "cross_section",
                "total_distance": cs.get("total_distance"),
                "min_elevation": cs.get("min_elevation"),
                "max_elevation": cs.get("max_elevation"),
                "sample_count": len(cs.get("samples", [])),
                "is_metric": session.is_metric
            }
        })

    # 4. Line-of-Sight Ray & Blocking Point
    los = meas.get("line_of_sight")
    if los and "observer_point" in los and "target_point" in los:
        obs = los["observer_point"]
        tgt = los["target_point"]
        coords_obs = pixel_to_spatial(obs[0], obs[1], transform if is_geo else None)
        coords_tgt = pixel_to_spatial(tgt[0], tgt[1], transform if is_geo else None)

        features.append({
            "type": "Feature",
            "id": "line_of_sight_ray",
            "geometry": {
                "type": "LineString",
                "coordinates": [coords_obs, coords_tgt]
            },
            "properties": {
                "feature_type": "line_of_sight",
                "is_visible": los.get("is_visible"),
                "clearance_min_m": los.get("clearance_min_m"),
                "is_metric": session.is_metric
            }
        })

        if los.get("blocking_point"):
            bp = los["blocking_point"]
            bp_coords = pixel_to_spatial(bp.get("x", 0), bp.get("y", 0), transform if is_geo else None)
            features.append({
                "type": "Feature",
                "id": "line_of_sight_block",
                "geometry": {
                    "type": "Point",
                    "coordinates": bp_coords
                },
                "properties": {
                    "feature_type": "los_obstruction_point",
                    "distance_along_ray": bp.get("distance"),
                    "terrain_elevation": bp.get("terrain_elevation"),
                    "los_elevation": bp.get("los_elevation")
                }
            })

    geojson: Dict[str, Any] = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "coordinate_system": coord_sys,
            "source_scene": session.input.filename,
            "georeferenced": is_geo,
            "scientific_status": session.scientific_status,
            "exported_at": session.exported_at
        }
    }

    if is_geo and session.input.crs:
        geojson["crs"] = {
            "type": "name",
            "properties": {
                "name": session.input.crs
            }
        }

    if as_string:
        return json.dumps(geojson, indent=2)
    return geojson


def export_profile_csv(
    session_or_samples: Union[SessionExport, List[Dict[str, Any]]],
    tool: str = "cross_section",
    distance_unit: str = "m",
    elevation_unit: str = "m",
    is_metric: bool = True
) -> str:
    """
    Serializes a cross-section or route profile into CSV format.
    Columns: sample_index, distance_m, elevation_m, is_metric, x_coord, y_coord
    """
    if hasattr(session_or_samples, "measurements"):
        session = session_or_samples
        is_metric = session.is_metric
        meas = session.measurements
        if tool == "route_profile":
            samples = meas.get("route_profile", {}).get("samples", [])
        else:
            samples = meas.get("cross_section", {}).get("samples", [])
    else:
        samples = session_or_samples

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "sample_index",
        f"distance_{distance_unit}",
        f"elevation_{elevation_unit}",
        "is_metric",
        "x_coord",
        "y_coord"
    ])

    for idx, s in enumerate(samples):
        dist = s.get("distance", 0.0)
        elev = s.get("elevation", s.get("relative_height"))
        xc = s.get("x", "")
        yc = s.get("y", "")
        writer.writerow([
            idx,
            f"{dist:.3f}" if isinstance(dist, (int, float)) else "",
            f"{elev:.3f}" if isinstance(elev, (int, float)) else "",
            "true" if is_metric else "false",
            f"{xc:.2f}" if isinstance(xc, (int, float)) else "",
            f"{yc:.2f}" if isinstance(yc, (int, float)) else ""
        ])

    return output.getvalue()
