# DepthWizard — Backend Architecture

**Role:** Backend architecture specification  
**Status:** Working source of truth

---

# 1. Principle

The backend should be organized around the analytical pipeline and its outputs, not around individual frontend screens.

```text
Input
 ↓
Estimation
 ↓
Calibration
 ↓
Terrain
 ↓
Analysis
 ↓
Validation
 ↓
Export
```

---

# 2. Recommended Stack

Conceptual stack:

```text
Python
FastAPI
Rasterio
GDAL
pyproj
NumPy
SciPy / scientific utilities where required
PyTorch for ML
```

Exact dependency versions should be pinned separately.

---

# 3. Module Structure

```text
backend/
├── ingestion/
│   ├── image_reader
│   ├── metadata_reader
│   └── georeference
│
├── estimation/
│   └── depth_model
│
├── calibration/
│   ├── dem_alignment
│   ├── scale_fit
│   └── gcp_support
│
├── terrain/
│   ├── elevation
│   ├── slope
│   ├── aspect
│   ├── hillshade
│   └── cross_section
│
├── analysis/
│   ├── height_probe
│   ├── measurements
│   ├── confidence
│   └── shadow_validation
│
├── validation/
│   ├── rmse
│   ├── mae
│   └── error_map
│
└── export/
    ├── geotiff
    ├── heightmap
    ├── png
    └── report
```

---

# 4. Ingestion

Responsibilities:

- identify input type,
- read image,
- extract metadata,
- identify georeferencing,
- normalize input representation.

Input errors should be structured.

---

# 5. Estimation

Responsibilities:

- preprocess imagery,
- run trained depth model,
- normalize model output,
- convert model output into the internal elevation representation.

The model should not directly own report/visualization logic.

---

# 6. Calibration

Calibration is a distinct module.

Potential sources:

- reference DEM,
- GCPs,
- other legitimate scale information.

Calibration output must contain status and method.

---

# 7. Terrain Derivatives

From elevation derive:

```text
Slope
Aspect
Hillshade
Roughness
Cross-sections
```

These modules should consume a common elevation representation.

---

# 8. Analysis

Analysis modules consume terrain products.

Examples:

```text
Point probe
Line measurement
Cross-section
Confidence
Shadow cross-check
```

---

# 9. Validation

Validation compares generated elevation with an actual reference.

Outputs:

```text
RMSE
MAE
Correlation
Error map
```

No reference means no validation result.

---

# 10. Confidence

Confidence should be a defined analytical method.

Possible supporting signals may include:

- model behavior,
- image characteristics,
- disagreement with references,
- cross-check signals.

The methodology must be documented before displaying a numerical confidence score.

---

# 11. Shadow Validation

Shadow geometry can act as an additional physical cross-check when:

- shadows are visible,
- shadow boundaries can be identified,
- illumination information is usable,
- assumptions are satisfied.

Conceptually:

```text
H ≈ shadow_length × tan(solar_elevation)
```

This is a supporting check, not a replacement for reference elevation.

---

# 12. API

The API should expose operations such as:

```text
upload
inspect
process
get result
query measurement
generate cross-section
validate
generate report
generate export
```

Exact endpoint naming should be finalized during API implementation.

---

# 13. Asynchronous Processing

Large image processing should be treated as a job.

Conceptual lifecycle:

```text
queued
 ↓
processing
 ↓
complete
```

or:

```text
processing
 ↓
failed
```

---

# 14. Result Persistence

A processed result should have a stable ID.

Example:

```text
result_01J...
```

Derived assets should be associated with that result.

---

# 15. Backend as Source of Truth

The backend owns:

- analytical values,
- units,
- geospatial metadata,
- capability state,
- processing state,
- validation state,
- export state.

---

# 16. Performance

Priorities:

1. do not block the API process with large synchronous jobs,
2. cache expensive derived products,
3. avoid recomputing terrain derivatives unnecessarily,
4. stream/progress long operations where practical,
5. keep visualization assets separate from authoritative analysis data.

---

# 17. Security / Input Safety

Uploaded files must be treated as untrusted.

The backend should:

- validate file types,
- limit resource usage,
- avoid arbitrary file execution,
- isolate temporary files,
- sanitize output paths,
- validate raster metadata.

---

# 18. Backend Non-Goals

Do not couple backend modules directly to:

- UI components,
- browser camera state,
- visual styling,
- report layout pixels.

The backend produces structured results and assets.
