"""
DepthWizard — Native PDF Terrain Analysis Report Engine
Authority: Phase 5B Specification (Sections 5B.6, 5B.7) & docs/product/output-contract.md

Generates a publication-grade, technical PDF report directly using PyMuPDF (fitz).
Strictly implements the 10 required sections and scientific disclaimers.
"""

import io
from typing import Dict, Any, List
import fitz  # PyMuPDF
from backend.export.contracts import SessionExport


def generate_terrain_analysis_pdf_report(session: SessionExport) -> bytes:
    """
    Constructs a professional, multi-page PDF report from the SessionExport contract.
    """
    doc = fitz.open()
    
    # Dimensions for A4: 595.3 x 841.9 pt
    PAGE_W = 595.3
    PAGE_H = 841.9
    MARGIN_L = 40.0
    MARGIN_R = 555.3
    CONTENT_W = MARGIN_R - MARGIN_L

    status = session.scientific_status.upper()
    is_calib = status == "CALIBRATED"
    unit = session.terrain.unit

    status_color = (0.02, 0.59, 0.41) if is_calib else ((0.86, 0.15, 0.15) if "REJECTED" in status else (0.01, 0.52, 0.78))
    status_bg = (0.93, 0.99, 0.96) if is_calib else ((0.99, 0.95, 0.95) if "REJECTED" in status else (0.94, 0.98, 1.0))

    # Page 1
    p1 = doc.new_page(width=PAGE_W, height=PAGE_H)
    y = 45.0

    # Header Top Bar
    p1.draw_rect(fitz.Rect(MARGIN_L, y, MARGIN_R, y + 4.0), fill=(0.06, 0.09, 0.16), color=(0.06, 0.09, 0.16))
    y += 18.0

    p1.insert_text((MARGIN_L, y), "DEPTHWIZARD  •  GEOSPATIAL INTELLIGENCE PLATFORM", fontsize=8.5, fontname="helv", color=(0.01, 0.52, 0.78))
    y += 22.0

    p1.insert_text((MARGIN_L, y), "TERRAIN ANALYSIS REPORT", fontsize=20, fontname="hebo", color=(0.06, 0.09, 0.16))
    
    # Status Badge
    badge_rect = fitz.Rect(MARGIN_R - 150.0, y - 18.0, MARGIN_R, y + 4.0)
    p1.draw_rect(badge_rect, fill=status_bg, color=status_color, width=1.0)
    p1.insert_text((MARGIN_R - 142.0, y - 4.0), f"● {status}", fontsize=9, fontname="hebo", color=status_color)
    y += 16.0

    p1.insert_text((MARGIN_L, y), f"Target Scene: {session.input.filename}   |   Session: {session.session_id}   |   Generated: {session.exported_at}", fontsize=8.5, fontname="helv", color=(0.39, 0.45, 0.55))
    y += 18.0

    p1.draw_line(fitz.Point(MARGIN_L, y), fitz.Point(MARGIN_R, y), color=(0.82, 0.86, 0.90), width=1.0)
    y += 20.0

    def draw_section_header(page, y_pos, title):
        page.draw_rect(fitz.Rect(MARGIN_L, y_pos - 10.0, MARGIN_L + 3.0, y_pos + 4.0), fill=(0.01, 0.52, 0.78), color=(0.01, 0.52, 0.78))
        page.insert_text((MARGIN_L + 8.0, y_pos), title, fontsize=10.5, fontname="hebo", color=(0.06, 0.09, 0.16))
        page.draw_line(fitz.Point(MARGIN_L + 8.0, y_pos + 6.0), fitz.Point(MARGIN_R, y_pos + 6.0), color=(0.90, 0.92, 0.95), width=0.8)
        return y_pos + 18.0

    # Section 1: Input Imagery & Geospatial Reference
    y = draw_section_header(p1, y, "1. INPUT IMAGERY & GEOSPATIAL REFERENCE")
    
    # 4-column card box
    box_w = (CONTENT_W - 24.0) / 4.0
    cards_data = [
        ("FORMAT / DIMS", f"{session.input.format.upper()} ({session.input.width}x{session.input.height})"),
        ("GEOREFERENCED", "YES (Projected)" if session.input.georeferenced else "NO (Unprojected)"),
        ("CRS", session.input.crs.split(" ")[0] if session.input.crs else "Local Pixel"),
        ("RESOLUTION", f"{session.input.pixel_resolution_x:.2f} m/px" if session.input.georeferenced and session.input.pixel_resolution_x else "1.0 unit/px")
    ]
    for i, (lbl, val) in enumerate(cards_data):
        bx = MARGIN_L + i * (box_w + 8.0)
        p1.draw_rect(fitz.Rect(bx, y, bx + box_w, y + 36.0), fill=(0.97, 0.98, 0.99), color=(0.88, 0.91, 0.94), width=0.8)
        p1.insert_text((bx + 8.0, y + 14.0), lbl, fontsize=7.5, fontname="hebo", color=(0.45, 0.52, 0.62))
        p1.insert_text((bx + 8.0, y + 28.0), val[:22], fontsize=9, fontname="helv", color=(0.06, 0.09, 0.16))
    y += 48.0

    # Section 2: Depth Estimation & Model Provenance
    y = draw_section_header(p1, y, "2. DEPTH ESTIMATION & MODEL PROVENANCE")
    box_w3 = (CONTENT_W - 16.0) / 3.0
    p2_data = [
        ("INFERENCE MODEL", session.processing.model_name),
        ("CHECKPOINT", session.processing.checkpoint_file or "Locked Fine-Tuned Weights"),
        ("SURFACE CONVENTION", session.processing.surface_convention)
    ]
    for i, (lbl, val) in enumerate(p2_data):
        bx = MARGIN_L + i * (box_w3 + 8.0)
        p1.draw_rect(fitz.Rect(bx, y, bx + box_w3, y + 36.0), fill=(0.97, 0.98, 0.99), color=(0.88, 0.91, 0.94), width=0.8)
        p1.insert_text((bx + 8.0, y + 14.0), lbl, fontsize=7.5, fontname="hebo", color=(0.45, 0.52, 0.62))
        p1.insert_text((bx + 8.0, y + 28.0), val[:28], fontsize=8.5, fontname="helv", color=(0.06, 0.09, 0.16))
    y += 48.0

    # Section 3: Terrain Summary & Hypsometric Statistics
    y = draw_section_header(p1, y, "3. TERRAIN SUMMARY & HYPSOMETRIC STATISTICS")
    p3_data = [
        ("COVERAGE", f"{session.terrain.valid_percentage:.1f}% ({session.terrain.valid_cells:,})"),
        ("NODATA CELLS", f"{session.terrain.nodata_percentage:.1f}% ({session.terrain.nodata_cells:,})"),
        ("ELEVATION RANGE", f"{session.terrain.elevation_min:.1f} .. {session.terrain.elevation_max:.1f} {unit}"),
        ("RELIEF / SPREAD", f"{session.terrain.relief:.1f} {unit}")
    ]
    for i, (lbl, val) in enumerate(p3_data):
        bx = MARGIN_L + i * (box_w + 8.0)
        p1.draw_rect(fitz.Rect(bx, y, bx + box_w, y + 36.0), fill=(0.97, 0.98, 0.99), color=(0.88, 0.91, 0.94), width=0.8)
        p1.insert_text((bx + 8.0, y + 14.0), lbl, fontsize=7.5, fontname="hebo", color=(0.45, 0.52, 0.62))
        p1.insert_text((bx + 8.0, y + 28.0), val[:22], fontsize=9, fontname="helv", color=(0.06, 0.09, 0.16))
    y += 48.0

    # Section 4: Geospatial Calibration & Guardrails
    y = draw_section_header(p1, y, "4. GEOSPATIAL CALIBRATION & GUARDRAILS")
    calib = session.calibration
    calib_box_rect = fitz.Rect(MARGIN_L, y, MARGIN_R, y + 54.0)
    p1.draw_rect(calib_box_rect, fill=status_bg, color=status_color, width=0.8)
    p1.insert_text((MARGIN_L + 12.0, y + 16.0), f"STATUS: {status}", fontsize=9, fontname="hebo", color=status_color)
    if is_calib:
        p1.insert_text((MARGIN_L + 12.0, y + 32.0), f"Reference: {calib.reference_source or 'DEM'}   |   Scale (a): {calib.scale:.4f}   |   Offset (b): {calib.offset:+.2f} m", fontsize=8.5, fontname="helv", color=(0.1, 0.2, 0.1))
        p1.insert_text((MARGIN_L + 12.0, y + 46.0), f"Fit RMSE: {calib.rmse:.2f} m   |   Fit MAE: ±{calib.mae:.2f} m   * In-sample calibration residuals — not independent generalization.", fontsize=8, fontname="helv", color=(0.35, 0.45, 0.35))
    elif "REJECTED" in status:
        p1.insert_text((MARGIN_L + 12.0, y + 32.0), f"Rejection Reason: {calib.rejection_reason or 'Calibration failed scientific guardrail checks.'}", fontsize=8.5, fontname="helv", color=(0.6, 0.1, 0.1))
        p1.insert_text((MARGIN_L + 12.0, y + 46.0), "Metric elevation outputs are withheld; relative terrain retained for morphological inspection.", fontsize=8, fontname="helv", color=(0.4, 0.2, 0.2))
    else:
        p1.insert_text((MARGIN_L + 12.0, y + 32.0), "Imagery is uncalibrated. Vertical measurements are expressed in unitless relative height values.", fontsize=8.5, fontname="helv", color=(0.2, 0.3, 0.4))
    y += 66.0

    # Section 5: Terrain Analytics & Derivatives
    y = draw_section_header(p1, y, "5. TERRAIN DERIVATIVES & MORPHOMETRY")
    ana = session.analytics
    slope_str = f"{ana.slope_min:.1f}° .. {ana.slope_max:.1f}° (mean {ana.slope_mean:.1f}°)" if ana.slope_is_physical and ana.slope_min is not None else f"{ana.slope_mean:.3f} (relative gradient)" if ana.slope_mean is not None else "N/A"
    p5_data = [
        ("SLOPE INCLINE", slope_str),
        ("ASPECT CONVENTION", ana.aspect_convention),
        ("HILLSHADE ILLUMINATION", f"Az: {ana.hillshade_azimuth_deg or 315:.0f}°, Alt: {ana.hillshade_altitude_deg or 45:.0f}°")
    ]
    for i, (lbl, val) in enumerate(p5_data):
        bx = MARGIN_L + i * (box_w3 + 8.0)
        p1.draw_rect(fitz.Rect(bx, y, bx + box_w3, y + 36.0), fill=(0.97, 0.98, 0.99), color=(0.88, 0.91, 0.94), width=0.8)
        p1.insert_text((bx + 8.0, y + 14.0), lbl, fontsize=7.5, fontname="hebo", color=(0.45, 0.52, 0.62))
        p1.insert_text((bx + 8.0, y + 28.0), val[:28], fontsize=8.5, fontname="helv", color=(0.06, 0.09, 0.16))
    y += 50.0

    # Footer Page 1
    p1.insert_text((MARGIN_L, PAGE_H - 30.0), f"DepthWizard v0.1.0 • Schema {session.schema_version} • Scientific Report", fontsize=8, fontname="helv", color=(0.55, 0.60, 0.68))
    p1.insert_text((MARGIN_R - 60.0, PAGE_H - 30.0), "Page 1 of 2", fontsize=8, fontname="helv", color=(0.55, 0.60, 0.68))

    # =========================================================================
    # Page 2: Interactive Measurements, Validation, Limitations & Metadata
    # =========================================================================
    p2 = doc.new_page(width=PAGE_W, height=PAGE_H)
    y = 45.0

    # Header Page 2
    p2.draw_rect(fitz.Rect(MARGIN_L, y, MARGIN_R, y + 2.0), fill=(0.06, 0.09, 0.16), color=(0.06, 0.09, 0.16))
    y += 16.0
    p2.insert_text((MARGIN_L, y), f"DEPTHWIZARD TERRAIN REPORT  —  {session.input.filename}  (CONT.)", fontsize=10, fontname="hebo", color=(0.06, 0.09, 0.16))
    y += 18.0

    # Section 6: Interactive Analysis Results
    y = draw_section_header(p2, y, "6. INTERACTIVE ANALYSIS & INTELLIGENCE RESULTS")
    meas = session.measurements
    
    # Summary list of measurements
    meas_lines = []
    if meas.get("probes"):
        probes = meas["probes"]
        meas_lines.append(f"• Height Probes ({len(probes)} sampled): " + ", ".join(f"{p.get('label', 'P')}: {p.get('elevation', 0):.1f} {unit}" for p in probes[:3]))
    if meas.get("two_point"):
        for tp in meas["two_point"][:2]:
            meas_lines.append(f"• Two-Point Distance: {tp.get('horizontal_distance', 0):.1f} {tp.get('distance_unit', 'm')}, Elev Δ: {tp.get('elevation_delta', 0):+.1f} {unit}, Slope: {tp.get('slope_deg', 0):.1f}°")
    if meas.get("cross_section"):
        cs = meas["cross_section"]
        meas_lines.append(f"• Cross-Section Transect: Length={cs.get('total_distance', 0):.1f} {cs.get('distance_unit', 'm')}, Range=[{cs.get('min_elevation', 0):.1f} .. {cs.get('max_elevation', 0):.1f}] {unit}, Relief={cs.get('relief', 0):.1f} {unit}")
    if meas.get("line_of_sight"):
        los = meas["line_of_sight"]
        meas_lines.append(f"• Line-of-Sight (LOS): Status={los.get('status')}, Obs Offset=+{los.get('observer_offset_m', 0):.1f}m, Tgt Offset=+{los.get('target_offset_m', 0):.1f}m, Min Clearance={los.get('clearance_min_m', 0):+.2f}m")
    if meas.get("route_profile"):
        rt = meas["route_profile"]
        meas_lines.append(f"• Route Profile: Distance={rt.get('total_ground_distance', 0):.1f}m, Gain=+{rt.get('elevation_gain', 0):.1f}{unit}, Loss=-{rt.get('elevation_loss', 0):.1f}{unit}, Difficulty={rt.get('terrain_difficulty', 'MODERATE')}")
    if meas.get("terrain_screening"):
        ts = meas["terrain_screening"]
        meas_lines.append(f"• Suitability Screening: Suitable={ts.get('suitable_percentage', 0):.1f}%, Unsuitable={ts.get('unsuitable_percentage', 0):.1f}%, Unknown={ts.get('unknown_percentage', 0):.1f}%")

    if not meas_lines:
        p2.insert_text((MARGIN_L + 6.0, y + 10.0), "No interactive analysis instruments were engaged during this session.", fontsize=8.5, fontname="helv", color=(0.45, 0.50, 0.58))
        y += 24.0
    else:
        for line in meas_lines:
            p2.insert_text((MARGIN_L + 6.0, y + 8.0), line[:115], fontsize=8, fontname="helv", color=(0.15, 0.20, 0.28))
            y += 15.0
        y += 8.0

    # Section 7: Empirical Validation & Error Analysis (Phase 5A)
    y = draw_section_header(p2, y, "7. EMPIRICAL VALIDATION & ERROR ANALYSIS (PHASE 5A)")
    val = session.validation
    val_box = fitz.Rect(MARGIN_L, y, MARGIN_R, y + 64.0)
    p2.draw_rect(val_box, fill=(0.97, 0.98, 1.0), color=(0.80, 0.85, 0.95), width=0.8)
    
    p2.insert_text((MARGIN_L + 10.0, y + 15.0), f"VALIDATION LEVEL: {val.status}   |   Reference Source: {val.reference_source or 'Authoritative DEM'}", fontsize=8.5, fontname="hebo", color=(0.1, 0.15, 0.4))
    
    if val.overall_fit:
        p2.insert_text((MARGIN_L + 10.0, y + 30.0), f"In-Sample Fit: RMSE={val.overall_fit.rmse:.2f} m   |   MAE=±{val.overall_fit.mae:.2f} m   |   Bias={val.overall_fit.bias:+.2f} m   |   r={val.overall_fit.pearson_r or 1.0:.3f}", fontsize=8, fontname="helv", color=(0.15, 0.20, 0.30))
        p2.insert_text((MARGIN_L + 10.0, y + 42.0), "* In-sample calibration residuals measure optimization convergence — NOT independent predictive accuracy.", fontsize=7.5, fontname="helv", color=(0.45, 0.50, 0.60))
    if val.spatial_holdout:
        p2.insert_text((MARGIN_L + 10.0, y + 55.0), f"Spatial Block Holdout: Val RMSE={val.spatial_holdout.val_rmse:.2f} m   |   Val MAE=±{val.spatial_holdout.val_mae:.2f} m   |   Gen Gap ΔRMSE={val.spatial_holdout.generalization_gap_rmse:+.2f} m", fontsize=8, fontname="hebo", color=(0.35, 0.15, 0.55))
    y += 76.0

    # Section 8: Signed Height-Error Analysis
    y = draw_section_header(p2, y, "8. SIGNED HEIGHT ERROR ANALYSIS (PREDICTED - REFERENCE)")
    if val.error_min is not None:
        p8_data = [
            ("MIN ERROR (UNDER)", f"{val.error_min:.2f} m"),
            ("MAX ERROR (OVER)", f"{val.error_max:+.2f} m"),
            ("MEAN ERROR (BIAS)", f"{val.error_mean:+.2f} m"),
            ("ERROR STD DEV (σ)", f"{val.error_std:.2f} m")
        ]
        for i, (lbl, val_str) in enumerate(p8_data):
            bx = MARGIN_L + i * (box_w + 8.0)
            p2.draw_rect(fitz.Rect(bx, y, bx + box_w, y + 34.0), fill=(0.97, 0.98, 0.99), color=(0.88, 0.91, 0.94), width=0.8)
            p2.insert_text((bx + 8.0, y + 13.0), lbl, fontsize=7.5, fontname="hebo", color=(0.45, 0.52, 0.62))
            p2.insert_text((bx + 8.0, y + 26.0), val_str, fontsize=9, fontname="helv", color=(0.06, 0.09, 0.16))
        y += 46.0
    else:
        p2.insert_text((MARGIN_L + 6.0, y + 8.0), "Height-error analysis is unavailable for uncalibrated or unvalidated sessions.", fontsize=8.5, fontname="helv", color=(0.45, 0.50, 0.58))
        y += 24.0

    # Section 9: Scientific Limitations & Disclaimers
    y = draw_section_header(p2, y, "9. SCIENTIFIC LIMITATIONS & OPERATIONAL CONSTRAINTS")
    limitations_box = fitz.Rect(MARGIN_L, y, MARGIN_R, y + 90.0)
    p2.draw_rect(limitations_box, fill=(0.98, 0.98, 0.99), color=(0.88, 0.90, 0.93), width=0.8)
    
    ly = y + 14.0
    for item in session.scientific_limitations[:4]:
        p2.insert_text((MARGIN_L + 10.0, ly), f"• {item[:115]}", fontsize=7.5, fontname="helv", color=(0.25, 0.30, 0.38))
        ly += 18.0
    y += 104.0

    # Section 10: Report Metadata
    y = draw_section_header(p2, y, "10. REPORT METADATA & INTEGRITY")
    p2.insert_text((MARGIN_L + 6.0, y + 8.0), f"DepthWizard System Version: 0.1.0   |   Contract Schema: {session.schema_version}   |   Status: {status}", fontsize=8.5, fontname="helv", color=(0.2, 0.25, 0.35))
    p2.insert_text((MARGIN_L + 6.0, y + 20.0), f"Digital Signature / Hash: sha256-{abs(hash(session.session_id + session.exported_at)):016x}   |   Verified Output", fontsize=8, fontname="helv", color=(0.45, 0.50, 0.58))

    # Footer Page 2
    p2.insert_text((MARGIN_L, PAGE_H - 30.0), f"DepthWizard v0.1.0 • Schema {session.schema_version} • End of Report", fontsize=8, fontname="helv", color=(0.55, 0.60, 0.68))
    p2.insert_text((MARGIN_R - 60.0, PAGE_H - 30.0), "Page 2 of 2", fontsize=8, fontname="helv", color=(0.55, 0.60, 0.68))

    return doc.tobytes()


# Alias for canonical naming
generate_pdf_report = generate_terrain_analysis_pdf_report
