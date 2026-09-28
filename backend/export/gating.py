"""
DepthWizard — Scientific State Gating & Export Guardrails
Authority: Phase 5B Specification (Section 5B.2) & docs/product/output-contract.md

CRITICAL SCIENTIFIC GATING RULES:
1. RELATIVE:
   - Export: relative terrain raster, relative statistics, relative measurements.
   - DO NOT export metric GeoTIFF DSM or invent CRS / datum.
2. CALIBRATED:
   - Export: true metric DSM GeoTIFF (when georeferenced), metric statistics, validation.
3. CALIBRATION_REJECTED:
   - Export: relative terrain, rejection reason, non-metric analysis.
   - DO NOT export fake calibrated DSM or fabricate accuracy numbers.
4. CALIBRATION_UNAVAILABLE:
   - Preserve relative outputs; explain why metric export is withheld.
"""

import re
from typing import List, Tuple
from backend.export.contracts import ExportFormat


def validate_export_eligibility(
    export_format: str,
    scientific_status: str
) -> Tuple[bool, str]:
    """
    Validates whether the requested export format is scientifically permissible
    given the current session's scientific status.
    
    Returns:
        (is_permitted: bool, reason_or_disclaimer: str)
    """
    fmt = str(export_format).strip().lower()
    status = str(scientific_status).strip().upper()

    # Handle if arguments were passed in reverse order
    known_statuses = ("RELATIVE", "CALIBRATED", "CALIBRATION_REJECTED", "CALIBRATION_FAILED", "UNVERIFIED")
    if fmt.upper() in known_statuses and status.lower() not in known_statuses:
        fmt, status = status.lower(), fmt.upper()

    if fmt in (ExportFormat.GEOTIFF_DSM.value if hasattr(ExportFormat.GEOTIFF_DSM, 'value') else "geotiff_dsm", "geotiff_dsm", "geotiff"):
        if status != "CALIBRATED":
            return False, (
                f"Metric GeoTIFF DSM export is unavailable because terrain status is '{status}'. "
                "Only calibrated terrains with authoritative reference alignment may be exported as metric DSMs."
            )
        return True, "Calibrated metric GeoTIFF DSM permitted."

    if fmt in (ExportFormat.ERROR_MAP_GEOTIFF.value if hasattr(ExportFormat.ERROR_MAP_GEOTIFF, 'value') else "error_map_geotiff", "error_map_geotiff", "error_geotiff"):
        if status != "CALIBRATED":
            return False, (
                f"Signed error map export is unavailable for status '{status}'. "
                "Error analysis requires an authoritative reference DEM comparison."
            )
        return True, "Signed height-error GeoTIFF permitted."

    # Session JSON, Report, Analysis, Relative Heightmap are always exportable
    return True, "Export format permitted."


def get_state_specific_limitations(
    scientific_status: str,
    reference_source: str = None,
    rejection_reason: str = None,
    has_independent_validation: bool = False
) -> List[str]:
    """
    Generates mandatory, scientifically accurate limitation statements tailored
    to the active calibration and validation state.
    """
    status = scientific_status.upper().strip()
    limitations = []

    if status == "RELATIVE":
        limitations.append(
            "Absolute elevation validation was not available for this scene. "
            "Reported terrain values are relative model-derived units without a physical vertical datum."
        )
        limitations.append(
            "Horizontal distances and slopes are expressed in relative image coordinates; "
            "do not use for civil engineering or navigational clearance."
        )
    elif status == "CALIBRATION_REJECTED":
        reason = rejection_reason or "Scene alignment rejected by scientific guardrails."
        limitations.append(
            f"Absolute calibration was rejected by DepthWizard scientific guardrails ({reason}). "
            "Metric terrain outputs and physical slope measurements are strictly withheld."
        )
        limitations.append(
            "Relative terrain topography is preserved for visual and morphological assessment only."
        )
    elif status == "CALIBRATION_UNAVAILABLE":
        limitations.append(
            "Input imagery lacks valid georeferencing metadata or reference DEM coverage was unavailable. "
            "Terrain height remains uncalibrated relative units."
        )
    elif status == "CALIBRATED":
        ref = reference_source or "Reference DEM"
        limitations.append(
            f"Elevation is calibrated against {ref}. "
            "In-sample calibration residuals measure optimization convergence and do not constitute independent generalization accuracy."
        )
        if has_independent_validation:
            limitations.append(
                "Independent validation metrics describe performance on held-out spatial blocks of this specific scene "
                "and should not automatically be interpreted as universal model accuracy across different geographic domains."
            )
        else:
            limitations.append(
                "Independent spatial holdout validation was not performed on this session; accuracy numbers reflect in-sample fit."
            )
        limitations.append(
            "DepthWizard outputs are intended for reconnaissance and situational awareness, not survey-grade certification."
        )

    return limitations


def sanitize_export_filename(scene_name: str, product_type: str, extension: str) -> str:
    """
    Produces deterministic, clean filenames without special characters, spaces, or duplicate extensions.
    Example: 'DepthWizard_DSM_alpine_pass_utm32n.tif'
    """
    import os
    # Strip any directory path components
    base = os.path.basename(scene_name.replace('\\', '/'))
    # Strip existing extension if present
    base = os.path.splitext(base)[0]

    # Clean scene name
    cleaned_scene = re.sub(r'[^a-zA-Z0-9_\-]', '_', base.strip())
    cleaned_scene = re.sub(r'_+', '_', cleaned_scene).strip('_')
    if not cleaned_scene:
        cleaned_scene = "scene"

    cleaned_product = re.sub(r'[^a-zA-Z0-9_]', '_', product_type.strip()).strip('_')
    ext = extension.lstrip('.')

    return f"DepthWizard_{cleaned_product}_{cleaned_scene}.{ext}"
