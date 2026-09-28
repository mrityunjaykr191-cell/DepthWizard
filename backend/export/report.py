"""
DepthWizard — Terrain Analysis Report HTML Engine
Authority: Phase 5B Specification (Sections 5B.6, 5B.7, 5B.8) & docs/product/output-contract.md

Generates a standalone, technically rigorous, publication-grade HTML Terrain Analysis Report.
Strictly adheres to:
- 10 required report sections.
- Real current session parameters (never fabricated demo data).
- Explicit scientific status gating and disclaimers.
- In-sample calibration residuals clearly distinguished from independent generalization.
- Self-contained styling with @media print CSS for 1-click browser PDF printing.
"""

from typing import Dict, Any, List
import html
from backend.export.contracts import SessionExport


def generate_terrain_analysis_html_report(session: SessionExport) -> str:
    """
    Renders the complete 10-section DepthWizard Terrain Analysis Report as a standalone HTML document.
    """
    status = session.scientific_status.upper()
    is_calib = status == "CALIBRATED"
    is_rejected = status == "CALIBRATION_REJECTED"
    unit = session.terrain.unit

    status_colors = {
        "CALIBRATED": {"badge": "#059669", "badge_bg": "#ecfdf5", "badge_border": "#a7f3d0", "badge_text": "#065f46", "bg": "#ecfdf5", "border": "#a7f3d0", "text": "#065f46"},
        "RELATIVE": {"badge": "#0284c7", "badge_bg": "#f0f9ff", "badge_border": "#bae6fd", "badge_text": "#0369a1", "bg": "#f0f9ff", "border": "#bae6fd", "text": "#0369a1"},
        "CALIBRATION_REJECTED": {"badge": "#dc2626", "badge_bg": "#fef2f2", "badge_border": "#fecaca", "badge_text": "#991b1b", "bg": "#fef2f2", "border": "#fecaca", "text": "#991b1b"},
        "CALIBRATION_UNAVAILABLE": {"badge": "#4b5563", "badge_bg": "#f9fafb", "badge_border": "#e5e7eb", "badge_text": "#374151", "bg": "#f9fafb", "border": "#e5e7eb", "text": "#374151"}
    }
    theme = status_colors.get(status, status_colors["RELATIVE"])

    # Extract sections
    inp = session.input
    proc = session.processing
    terr = session.terrain
    calib = session.calibration
    ana = session.analytics
    val = session.validation
    meas = session.measurements

    # Build interactive analysis HTML sections conditionally
    interactive_html = []

    # Probes
    probes = meas.get("probes", [])
    if probes:
        rows_html = "".join(f"""
            <tr>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{html.escape(p.get('label') or f"Probe #{i+1}")}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">({p.get('x', 0):.1f}, {p.get('y', 0):.1f})</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 600;">{p.get('elevation', 0):.2f} {unit}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{f"{p.get('slope', 0):.1f}°" if is_calib and p.get('slope') is not None else 'N/A'}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{f"{p.get('aspect', 0):.0f}°" if p.get('aspect') is not None else 'N/A'}</td>
            </tr>
        """ for i, p in enumerate(probes))

        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.1 Localized Height Probes ({len(probes)} sampled)</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase;">
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Identifier</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Raster (Col, Row)</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Elevation</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Slope</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Aspect</th>
                        </tr>
                    </thead>
                    <tbody>{rows_html}</tbody>
                </table>
            </div>
        """)

    # Two Point
    two_point = meas.get("two_point", [])
    if two_point:
        tp_rows = "".join(f"""
            <tr>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">Line #{i+1}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{tp.get('horizontal_distance', 0):.2f} {tp.get('distance_unit', 'px')}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{tp.get('elevation_delta', 0):+.2f} {tp.get('elevation_unit', unit)}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{f"{tp.get('slope_deg', 0):.1f}°" if tp.get('slope_deg') is not None else 'N/A'}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{f"{tp.get('direct_distance_3d', 0):.2f} m" if is_calib and tp.get('direct_distance_3d') is not None else 'N/A'}</td>
            </tr>
        """ for i, tp in enumerate(two_point))

        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.2 Two-Point Distance & Gradient Assessments</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase;">
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Measurement</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Horizontal Distance</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Elevation Δ</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">Slope Gradient</th>
                            <th style="padding: 6px 10px; border-bottom: 1px solid #cbd5e1;">3D Euclidean Distance</th>
                        </tr>
                    </thead>
                    <tbody>{tp_rows}</tbody>
                </table>
            </div>
        """)

    # Cross Section
    cs = meas.get("cross_section")
    if cs:
        samples = cs.get("samples", [])
        svg_points = ""
        if samples and len(samples) > 1:
            total_d = cs.get("total_distance", 1.0) or 1.0
            min_e = cs.get("min_elevation", 0)
            max_e = cs.get("max_elevation", 100)
            e_span = max_e - min_e if max_e - min_e > 1e-4 else 1.0
            
            pts = []
            for s in samples:
                d = s.get("distance", 0)
                e = s.get("elevation", min_e) or min_e
                px = 40 + (d / total_d) * 620
                py = 140 - ((e - min_e) / e_span) * 100
                pts.append(f"{px:.1f},{py:.1f}")
            svg_points = " ".join(pts)

        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.3 Topographic Cross-Section Profile</h4>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; color: #475569;">
                        <span>Transect Length: <strong>{cs.get('total_distance', 0):.1f} {cs.get('distance_unit', 'm')}</strong></span>
                        <span>Elevation Range: <strong>{cs.get('min_elevation', 0):.1f} – {cs.get('max_elevation', 0):.1f} {cs.get('elevation_unit', unit)}</strong></span>
                        <span>Relief: <strong>{cs.get('relief', 0):.1f} {cs.get('elevation_unit', unit)}</strong></span>
                    </div>
                    {f'''
                    <svg viewBox="0 0 700 160" style="width: 100%; height: 140px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px;">
                        <line x1="40" y1="140" x2="660" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="40" y1="40" x2="40" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
                        <text x="35" y="42" text-anchor="end" font-size="10" fill="#64748b" font-family="monospace">{cs.get('max_elevation', 0):.0f}</text>
                        <text x="35" y="142" text-anchor="end" font-size="10" fill="#64748b" font-family="monospace">{cs.get('min_elevation', 0):.0f}</text>
                        <text x="40" y="155" text-anchor="middle" font-size="10" fill="#64748b" font-family="monospace">0</text>
                        <text x="660" y="155" text-anchor="middle" font-size="10" fill="#64748b" font-family="monospace">{cs.get('total_distance', 0):.0f}{cs.get('distance_unit', 'm')}</text>
                        <polyline fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="{svg_points}" />
                    </svg>
                    ''' if svg_points else ''}
                </div>
            </div>
        """)

    # Line of Sight
    los = meas.get("line_of_sight")
    if los:
        los_status = los.get("status", "UNKNOWN")
        los_color = "#059669" if los_status == "VISIBLE" else ("#dc2626" if los_status == "BLOCKED" else "#64748b")
        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.4 Line-of-Sight (LOS) Visibility Assessment</h4>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 12px;">
                    <div>
                        <div style="color: #64748b; font-size: 11px;">VISIBILITY STATUS</div>
                        <div style="font-weight: 700; color: {los_color}; font-size: 14px;">● {los_status}</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">OBSERVER OFFSET</div>
                        <div style="font-weight: 600; color: #1e293b;">+{los.get('observer_offset_m', 0):.1f} m</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">TARGET OFFSET</div>
                        <div style="font-weight: 600; color: #1e293b;">+{los.get('target_offset_m', 0):.1f} m</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">MIN CLEARANCE</div>
                        <div style="font-weight: 600; color: #1e293b;">{f"{los.get('clearance_min_m', 0):+.2f} m" if los.get('clearance_min_m') is not None else 'N/A'}</div>
                    </div>
                </div>
            </div>
        """)

    # Route Profile
    route = meas.get("route_profile")
    if route:
        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.5 Route Traverse & Profile Assessment</h4>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; font-size: 12px;">
                    <div>
                        <div style="color: #64748b; font-size: 11px;">TOTAL DISTANCE</div>
                        <div style="font-weight: 600; color: #1e293b;">{route.get('total_ground_distance', 0):.1f} {route.get('distance_unit', 'm')}</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">ELEVATION GAIN</div>
                        <div style="font-weight: 600; color: #059669;">+{route.get('elevation_gain', 0):.1f} {unit}</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">ELEVATION LOSS</div>
                        <div style="font-weight: 600; color: #dc2626;">-{route.get('elevation_loss', 0):.1f} {unit}</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">MAX GRADIENT</div>
                        <div style="font-weight: 600; color: #1e293b;">{route.get('max_gradient_pct', 0):.1f}%</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 11px;">DIFFICULTY</div>
                        <div style="font-weight: 700; color: #0284c7;">{route.get('terrain_difficulty', 'MODERATE')}</div>
                    </div>
                </div>
            </div>
        """)

    # Terrain Screening
    screening = meas.get("terrain_screening")
    if screening:
        interactive_html.append(f"""
            <div style="margin-bottom: 18px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">6.6 Terrain Suitability Screening</h4>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #059669; font-weight: 600;">Suitable: {screening.get('suitable_percentage', 0):.1f}% ({screening.get('suitable_cells', 0):,} cells)</span>
                        <span style="color: #dc2626; font-weight: 600;">Unsuitable: {screening.get('unsuitable_percentage', 0):.1f}% ({screening.get('unsuitable_cells', 0):,} cells)</span>
                        <span style="color: #64748b;">Unknown/NoData: {screening.get('unknown_percentage', 0):.1f}% ({screening.get('unknown_cells', 0):,} cells)</span>
                    </div>
                    <div style="height: 10px; border-radius: 5px; background: #e2e8f0; overflow: hidden; display: flex;">
                        <div style="width: {screening.get('suitable_percentage', 0)}%; background: #10b981;"></div>
                        <div style="width: {screening.get('unsuitable_percentage', 0)}%; background: #ef4444;"></div>
                        <div style="width: {screening.get('unknown_percentage', 0)}%; background: #64748b;"></div>
                    </div>
                </div>
            </div>
        """)

    if not interactive_html:
        interactive_html_content = "<p style='color: #64748b; font-style: italic; font-size: 12px;'>No interactive measurement or intelligence tools were recorded during this session.</p>"
    else:
        interactive_html_content = "\n".join(interactive_html)

    # Validation & Error Section
    has_independent = val.is_independent and val.spatial_holdout is not None
    val_status_badge = "#7c3aed" if has_independent else ("#059669" if is_calib else "#64748b")
    val_status_text = "Independent Spatial Holdout" if has_independent else ("In-Sample Reference Fit" if is_calib else "Validation Not Available")
    val_status_description = (
        "Spatial block partitioning prevents autocorrelation leakage between training and test zones."
        if has_independent else
        "Measures affine calibration optimization fit on training samples. Not an independent generalization estimate."
    )

    limitations_list_html = "".join(f"<li style='margin-bottom: 6px;'>{html.escape(item)}</li>" for item in session.scientific_limitations)

    # ── Shorthand aliases for the f-string ──────────────────────────────────
    model = session.processing
    summary = terr  # TerrainSummaryExport IS the summary; no nested .summary attr

    # Pixel resolution string
    if inp.pixel_resolution_x is not None and inp.pixel_resolution_y is not None:
        pixel_res_str = f"{inp.pixel_resolution_x:.4f} × {inp.pixel_resolution_y:.4f} {inp.resolution_unit}/px"
    else:
        pixel_res_str = "N/A (Unprojected)"

    # Bounding box HTML
    if inp.bounds is not None and len(inp.bounds) == 4:
        b = inp.bounds
        _b_str = str(b)
        bounds_box_html = f"""
        <div style="margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px; font-size: 12px; font-family: monospace;">
            <span style="color: #64748b; text-transform: uppercase; font-size: 11px;">Bounding Box:</span>
            <strong style="margin-left: 8px;">{_b_str}</strong>
        </div>"""
    else:
        bounds_box_html = "<p style='color: #64748b; font-size: 12px;'>Bounding box not available (unprojected image).</p>"

    # Calibration grid HTML
    if is_calib and calib is not None:
        _calib_src = html.escape(calib.reference_source or "DEM")
        _calib_cnt = calib.sample_count
        _calib_mae = f"{calib.mae:.3f} {unit}" if calib.mae is not None else "N/A"
        _calib_rmse = f"{calib.rmse:.3f} {unit}" if calib.rmse is not None else "N/A"
        calibration_grid_html = f"""
        <div class="grid-4" style="margin-top: 10px;">
            <div class="card">
                <div class="card-label">Reference Source</div>
                <div class="card-val" style="font-size: 12px;">{_calib_src}</div>
            </div>
            <div class="card">
                <div class="card-label">Sample Count</div>
                <div class="card-val">{_calib_cnt}</div>
            </div>
            <div class="card">
                <div class="card-label">MAE</div>
                <div class="card-val">{_calib_mae}</div>
            </div>
            <div class="card">
                <div class="card-label">RMSE</div>
                <div class="card-val">{_calib_rmse}</div>
            </div>
        </div>"""
    elif is_rejected and calib is not None:
        _rej_reason = html.escape(calib.rejection_reason or "Quality threshold not met")
        calibration_grid_html = f"""
        <div class="alert-box" style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; margin-top: 8px;">
            Calibration was attempted but rejected by scientific guardrails.
            Reason: <strong>{_rej_reason}</strong>
        </div>"""
    else:
        calibration_grid_html = "<p style='color: #64748b; font-size: 12px;'>No calibration data available for this session.</p>"

    # Calibration summary text
    if is_calib and calib is not None:
        _mae_str = f"{calib.mae:.3f} {unit}" if calib.mae is not None else "N/A"
        _rmse_str = f"{calib.rmse:.3f} {unit}" if calib.rmse is not None else "N/A"
        calib_summary_text = (
            f"Calibration applied using {calib.sample_count} ground-control samples from "
            f"{html.escape(calib.reference_source or 'DEM')}. "
            f"Residuals: MAE={_mae_str}, RMSE={_rmse_str}."
        )
    elif is_rejected and calib is not None:
        calib_summary_text = (
            f"Calibration was rejected: {html.escape(calib.rejection_reason or 'quality threshold not met')}. "
            "All elevation values are relative (arbitrary scale). "
            "Metric interpretations are NOT valid."
        )
    else:
        calib_summary_text = (
            "No DEM reference was available for calibration. "
            "All elevation values are relative (arbitrary scale). "
            "They are suitable for shape/topology analysis only."
        )

    # Slope display — TerrainAnalyticsExport has flat fields
    if ana.slope_available and ana.slope_mean is not None:
        _s_mean = f"{ana.slope_mean:.1f}"
        _s_max = f"{ana.slope_max:.1f}" if ana.slope_max is not None else "N/A"
        slope_display = f"Mean {_s_mean}° | Max {_s_max}°"
    else:
        slope_display = "N/A"

    # Hillshade display — flat fields
    if ana.hillshade_available and ana.hillshade_azimuth_deg is not None:
        _hs_az = f"{ana.hillshade_azimuth_deg:.0f}"
        _hs_alt = f"{ana.hillshade_altitude_deg:.0f}" if ana.hillshade_altitude_deg is not None else "N/A"
        hillshade_display = f"Az {_hs_az}° / Alt {_hs_alt}°"
    else:
        hillshade_display = "N/A"

    # Validation fit HTML — ValidationSessionExport.overall_fit is the metrics object
    if val is not None and val.overall_fit is not None:
        vm = val.overall_fit
        _vm_mae = f"{vm.mae:.3f} {unit}" if vm.mae is not None else "N/A"
        _vm_rmse = f"{vm.rmse:.3f} {unit}" if vm.rmse is not None else "N/A"
        _vm_r = f"{vm.pearson_r:.4f}" if vm.pearson_r is not None else "N/A"
        _vm_bias = f"{vm.bias:+.3f} {unit}" if vm.bias is not None else "N/A"
        _fit_label = "Independent Spatial Holdout" if has_independent else "In-Sample Reference Fit"
        _fit_note = (
            "Spatial block partitioning prevents autocorrelation leakage between training and holdout zones."
            if has_independent else
            "Measures affine calibration optimization fit on training samples. Not an independent generalization estimate."
        )
        # When holdout is available, also show in-sample label for clarity
        _insample_note = ""
        if has_independent:
            _insample_note = """<div style="font-size: 11px; color: #64748b; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <strong>In-Sample Reference Fit</strong>: Measures affine calibration optimization fit on training samples.
            Not an independent generalization estimate. Independent holdout metrics shown above.
        </div>"""
        validation_fit_html = f"""
        <div style="font-size: 11px; color: #475569; margin-bottom: 8px; font-weight: 600;">{_fit_label}</div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">{_fit_note}</p>
        <div class="grid-4">
            <div class="card">
                <div class="card-label">MAE</div>
                <div class="card-val">{_vm_mae}</div>
            </div>
            <div class="card">
                <div class="card-label">RMSE</div>
                <div class="card-val">{_vm_rmse}</div>
            </div>
            <div class="card">
                <div class="card-label">Pearson r</div>
                <div class="card-val">{_vm_r}</div>
            </div>
            <div class="card">
                <div class="card-label">Bias</div>
                <div class="card-val">{_vm_bias}</div>
            </div>
        </div>{_insample_note}"""
    else:
        validation_fit_html = "<p style='color: #64748b; font-size: 12px; font-style: italic;'>No validation metrics available for this session.</p>"

    # Signed error HTML — ValidationSessionExport has error_mean / error_std
    if val is not None and val.error_mean is not None:
        _err_mean = f"{val.error_mean:+.3f} {unit}"
        _err_std = f"{val.error_std:.3f} {unit}" if val.error_std is not None else "N/A"
        signed_error_html = f"""
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; font-size: 12px;">
            <span style="color: #64748b;">Mean Signed Error: </span>
            <strong style="color: #0f172a;">{_err_mean}</strong>
            &nbsp;|&nbsp;
            <span style="color: #64748b;">Std Dev: </span>
            <strong style="color: #0f172a;">{_err_std}</strong>
        </div>"""
    else:
        signed_error_html = "<p style='color: #64748b; font-size: 12px; font-style: italic;'>No signed error data available.</p>"

    # ── Precompute nullable summary fields as safe display strings ──────────
    _elev_std_str = f"{summary.elevation_std:.1f}" if summary.elevation_std is not None else "N/A"
    _elev_relief_str = f"{summary.elevation_relief:.1f}" if summary.elevation_relief is not None else f"{summary.relief:.1f}"
    _elev_mode_str = (summary.elevation_mode or "relative").upper()
    _model_checkpoint = model.checkpoint or model.checkpoint_file or "N/A"
    _model_finetune = model.fine_tuned_dataset or "Zero-Shot / Base"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DepthWizard Terrain Analysis Report — {html.escape(inp.filename)}</title>
    <style>
        @page {{
            size: A4 portrait;
            margin: 14mm 12mm;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f1f5f9;
            margin: 0;
            padding: 24px;
            line-height: 1.45;
        }}
        .report-container {{
            max-width: 920px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            padding: 32px 36px;
        }}
        .print-btn-bar {{
            display: flex;
            justify-content: flex-end;
            margin-bottom: 16px;
        }}
        .btn-print {{
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .btn-print:hover {{
            background: #1e293b;
        }}
        h1, h2, h3, h4 {{
            color: #0f172a;
            margin-top: 0;
        }}
        .section-box {{
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
        }}
        .section-box:last-child {{
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }}
        .section-title {{
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #1e293b;
            border-left: 4px solid #0284c7;
            padding-left: 8px;
            margin-bottom: 12px;
        }}
        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }}
        .grid-3 {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }}
        .grid-4 {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }}
        .card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 10px 14px;
        }}
        .card-label {{
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
        }}
        .card-val {{
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
            font-family: monospace;
        }}
        table.tech-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 6px;
        }}
        table.tech-table th, table.tech-table td {{
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }}
        table.tech-table th {{
            background: #f8fafc;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
        }}
        .alert-box {{
            padding: 12px 14px;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.5;
        }}
        @media print {{
            body {{
                background: #ffffff;
                padding: 0;
            }}
            .report-container {{
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }}
            .print-btn-bar {{
                display: none;
            }}
            .page-break {{
                page-break-before: always;
            }}
        }}
    </style>
</head>
<body>

<div class="print-btn-bar" style="max-width: 920px; margin: 0 auto 12px auto;">
    <button class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        PRINT / SAVE AS PDF
    </button>
</div>

<div class="report-container">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #0f172a; margin-bottom: 20px;">
        <div>
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #0284c7; text-transform: uppercase; margin-bottom: 4px;">
                DEPTHWIZARD • GEOSPATIAL INTELLIGENCE PLATFORM
            </div>
            <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">TERRAIN ANALYSIS REPORT</h1>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                Target Scene: <strong style="color: #334155;">{html.escape(inp.filename)}</strong> • Session: <span style="font-family: monospace;">{session.session_id}</span>
            </div>
        </div>
        <div style="text-align: right;">
            <div style="display: inline-block; background: {theme['bg']}; color: {theme['text']}; border: 1px solid {theme['border']}; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 700; font-family: monospace; letter-spacing: 0.5px;">
                ● {status}
            <div class="badge" style="background: {theme['badge_bg']}; color: {theme['badge_text']}; border: 1px solid {theme['badge_border']};">
                {status}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-family: monospace;">
                {session.exported_at}
            </div>
        </div>
    </div>

    <!-- 1. Input Imagery & Geospatial Reference -->
    <div class="section-box">
        <div class="section-title">1. Input Imagery & Geospatial Reference</div>
        <div class="grid-4">
            <div class="card">
                <div class="card-label">Format / Dimensions</div>
                <div class="card-val">{inp.format.upper()} • {inp.width}×{inp.height}</div>
            </div>
            <div class="card">
                <div class="card-label">Georeferenced</div>
                <div class="card-val" style="color: {'#059669' if inp.georeferenced else '#64748b'};">
                    {'YES (Projected)' if inp.georeferenced else 'NO (Unprojected)'}
                </div>
            </div>
            <div class="card">
                <div class="card-label">Coordinate Reference System</div>
                <div class="card-val" style="font-size: 12px; word-break: break-all;">{inp.crs or 'Local Pixel Space'}</div>
            </div>
            <div class="card">
                <div class="card-label">Pixel Resolution</div>
                <div class="card-val">
                    {pixel_res_str}
                </div>
            </div>
        </div>
        {bounds_box_html}
    </div>

    <!-- 2. Depth Estimation & Model Provenance -->
    <div class="section-box">
        <div class="section-title">2. Depth Estimation & Model Provenance</div>
        <div class="grid-3">
            <div class="card">
                <div class="card-label">Model Provider</div>
                <div class="card-val">{model.provider.upper()}</div>
            </div>
            <div class="card">
                <div class="card-label">Checkpoint / Architecture</div>
                <div class="card-val" style="font-size: 12px; word-break: break-all;">{_model_checkpoint}</div>
            </div>
            <div class="card">
                <div class="card-label">Target Dataset / Fine-Tuning</div>
                <div class="card-val" style="font-size: 12px;">{_model_finetune}</div>
            </div>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
            Status: Model locked per Phase 3. Training/validation split strictly separated from inference pipeline.
        </div>
    </div>

    <!-- 3. Terrain Summary -->
    <div class="section-box">
        <div class="section-title">3. Terrain Summary & Elevation Extents</div>
        <div class="grid-4">
            <div class="card">
                <div class="card-label">Elevation Range</div>
                <div class="card-val">{summary.elevation_min:.1f} .. {summary.elevation_max:.1f} {unit}</div>
            </div>
            <div class="card">
                <div class="card-label">Relief (ΔZ)</div>
                <div class="card-val">{_elev_relief_str} {unit}</div>
            </div>
            <div class="card">
                <div class="card-label">Mean Elevation</div>
                <div class="card-val">{summary.elevation_mean:.1f} {unit}</div>
            </div>
            <div class="card">
                <div class="card-label">Elevation Std Dev</div>
                <div class="card-val">{_elev_std_str} {unit}</div>
            </div>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
            Elevation Unit: <strong>{unit}</strong> • Mode: <strong>{_elev_mode_str}</strong>
        </div>
    </div>

    <!-- 4. Calibration Status & Guardrails -->
    <div class="section-box">
        <div class="section-title">4. Geospatial Calibration & Scientific Guardrails</div>
        <div class="alert-box" style="background: {theme['bg']}; border: 1px solid {theme['border']}; color: {theme['text']}; margin-bottom: 12px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">
                CALIBRATION STATE: {status}
            </div>
            <div>
                {calib_summary_text}
            </div>
        </div>

        {calibration_grid_html}
    </div>

    <!-- 5. Terrain Analytics -->
    <div class="section-box">
        <div class="section-title">5. Terrain Analytics & Derivatives</div>
        <div class="grid-3">
            <div class="card">
                <div class="card-label">Slope Gradient</div>
                <div class="card-val">
                    {slope_display}
                </div>
            </div>
            <div class="card">
                <div class="card-label">Aspect Convention</div>
                <div class="card-val" style="font-size: 12px;">{ana.aspect_convention}</div>
            </div>
            <div class="card">
                <div class="card-label">Hillshade Illumination</div>
                <div class="card-val" style="font-size: 12px;">
                    {hillshade_display}
                </div>
            </div>
        </div>
    </div>

    <!-- 6. Interactive Analysis Results -->
    <div class="section-box">
        <div class="section-title">6. Interactive Analysis & Intelligence Results</div>
        {interactive_html_content}
    </div>

    <!-- 7. Empirical Validation & Error Analysis -->
    <div class="section-box">
        <div class="section-title">7. Empirical Validation & Error Analysis (Phase 5A)</div>
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 14px; margin-bottom: 12px;">
            <div>
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">VALIDATION LEVEL:</span>
                <strong style="margin-left: 6px; font-size: 13px; color: {val_status_badge}; font-family: monospace;">{val_status_text}</strong>
            </div>
            <div style="font-size: 11px; color: #64748b;">
                Reference: <strong>{val.reference_source or 'Authoritative DEM'}</strong>
            </div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 12px 0;">{val_status_description}</p>

        {validation_fit_html}
    </div>

    <!-- 8. Signed Height Error -->
    <div class="section-box">
        <div class="section-title">8. Signed Height-Error Analysis (Predicted − Reference)</div>
        {signed_error_html}
    </div>

    <!-- 9. Scientific Limitations & Disclaimers -->
    <div class="section-box">
        <div class="section-title">9. Scientific Limitations & Operational Constraints</div>
        <div class="alert-box" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #334155;">
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">
                {limitations_list_html}
            </ul>
        </div>
    </div>

    <!-- 10. Report Metadata -->
    <div style="padding-top: 16px; border-top: 2px solid #0f172a; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace;">
        <div>
            DepthWizard System Version: 0.1.0 • Schema: {session.schema_version}
        </div>
        <div>
            Generated: {session.exported_at} • Scientific Status: {status}
        </div>
    </div>
</div>

</body>
</html>
"""

    return html


# Alias for canonical naming
generate_html_report = generate_terrain_analysis_html_report
