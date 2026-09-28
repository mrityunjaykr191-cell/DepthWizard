# DepthWizard — Capabilities

**Role:** Product capability map  
**Status:** Working source of truth  
**Audience:** Product, frontend, backend, ML, visualization, and presentation teams

---

## 1. Product Definition

DepthWizard is a single-view optical imagery analysis system.

Its product flow is:

```text
Imagery
  ↓
Elevation reconstruction
  ↓
Terrain representation
  ↓
Visualization
  ↓
Measurement and analysis
  ↓
Validation / confidence
  ↓
Report and export
```

The product is not defined by the ML model alone. The model is one component in a larger analytical pipeline.

---

# 2. Capability Layers

Capabilities are organized into seven layers:

1. Input and data understanding
2. Elevation estimation
3. Terrain generation
4. Visualization and navigation
5. Analysis and measurement
6. Validation and trust
7. Reporting and export

---

# 3. Input and Data Understanding

## 3.1 Supported imagery

### MVP

- JPG
- PNG
- GeoTIFF

### Required behavior

The system identifies:

- file type,
- dimensions,
- available metadata,
- georeferencing,
- CRS when available,
- pixel resolution when available,
- bounds when available,
- NoData information when available.

---

## 3.2 Automatic input classification

The system classifies input as:

```text
Non-georeferenced
or
Georeferenced
```

This classification influences what elevation products can legitimately be produced.

---

## 3.3 Metadata inspection

Metadata should be exposed where useful to the analyst.

Never fabricate missing metadata.

---

# 4. Elevation Estimation

## 4.1 Relative elevation

For non-georeferenced imagery, the system produces relative elevation / rDSM-style output.

The interface must explicitly identify it as relative.

Example:

```text
Relative elevation
+17.4
```

Do not label it as:

```text
17.4 m AMSL
```

unless legitimate calibration exists.

---

## 4.2 Absolute / metric elevation

For georeferenced imagery, the system may produce metric elevation when a valid calibration/reference process succeeds.

Potential calibration sources include:

- coarse DEM,
- GCPs,
- other legitimate scale references.

Metric status must be determined by the backend.

---

# 5. Terrain Products

From the elevation result, the system may derive:

- elevation map,
- slope,
- aspect,
- hillshade,
- roughness,
- cross-section profiles.

Only implemented and valid products should be exposed.

---

# 6. Visualization

## 6.1 3D terrain

Primary visualization:

```text
Elevation-derived mesh
+
Original optical texture
```

---

## 6.2 2D/topographic visualization

Possible layers:

- RGB
- elevation
- slope
- hillshade
- confidence

Layer availability is capability-driven.

---

## 6.3 First-person navigation

The workspace supports first-person terrain inspection.

This is a core interaction mode rather than decorative 3D.

---

## 6.4 Camera presets

Useful presets:

```text
Top
North
South
East
West
Free
First Person
```

---

# 7. Analysis

## 7.1 Point height probe

Select a terrain point and retrieve available:

- coordinate,
- elevation,
- slope,
- confidence.

Only values actually available are shown.

---

## 7.2 Two-point measurement

Select A and B.

Potential outputs:

- horizontal distance,
- elevation difference,
- slope.

---

## 7.3 Area measurement

Future capability.

Should not appear in the MVP UI until implemented and validated.

---

## 7.4 Slope analysis

Provide:

- slope map,
- point slope,
- terrain slope statistics where available.

---

## 7.5 Cross-section

Draw a line across terrain and generate an elevation profile.

Potential outputs:

- start elevation,
- end elevation,
- elevation difference,
- horizontal distance,
- maximum slope.

---

# 8. Validation and Trust

## 8.1 Reference comparison

When a compatible reference DEM is available:

```text
DepthWizard elevation
        vs
Reference elevation
```

---

## 8.2 Metrics

The validation pipeline may expose:

- RMSE,
- MAE,
- correlation.

These are real computed metrics, not UI placeholders.

---

## 8.3 Error map

Show spatial disagreement between prediction and reference.

---

## 8.4 Confidence

Confidence is a supporting trust layer.

It must come from a defined methodology.

Never present a generic percentage merely because the product uses AI.

---

## 8.5 Shadow cross-check

Shadow geometry may be used as an additional supporting validation signal where image conditions and metadata make it meaningful.

It must be presented as a cross-check, not as an unquestionable ground-truth source.

---

# 9. Reporting

## 9.1 Default report

Default behavior:

> Include everything valid and available.

---

## 9.2 Custom report

The analyst can deselect sections and add selected:

- measurements,
- cross-sections,
- validation views,
- current visualization views.

---

## 9.3 Unavailable sections

Useful unavailable features may be shown disabled with a reason.

Example:

```text
Absolute elevation
Unavailable — metric calibration not available
```

---

# 10. Export

Initial export targets:

- GeoTIFF elevation products,
- heightmap,
- PNG visualization,
- PDF report.

Future targets may include:

- JSON,
- CSV,
- GeoJSON,
- GLB.

---

# 11. Capability Philosophy

The frontend should never assume that every dataset supports every capability.

The backend returns capability state.

Conceptually:

```json
{
  "absolute_elevation": false,
  "slope": true,
  "cross_section": true,
  "validation": false
}
```

The frontend renders accordingly.

---

# 12. MVP Priority

## P0

- image ingestion
- input classification
- metadata inspection
- depth/elevation result
- 3D terrain
- RGB texture
- topographic view
- first-person navigation
- point height
- two-point measurement
- slope
- cross-section
- report
- core exports
- errors and recovery

## P1

- confidence
- reference validation
- RMSE / MAE / correlation
- error map
- shadow cross-check
- report view capture

## P2

- area measurement
- roughness
- route/accessibility
- visibility
- multi-tile terrain
- temporal comparison
- advanced export formats
- offline deployment

---

# 13. Product Non-Goals

DepthWizard should not become:

- a generic GIS replacement,
- a generic AI dashboard,
- a photogrammetry suite,
- a full surveying package,
- an intelligence decision engine,
- a decorative 3D demo.

The goal is a focused bridge from single-view imagery to useful terrain intelligence.
