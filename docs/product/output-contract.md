# DepthWizard — Output Contract

**Role:** Backend/frontend data contract  
**Status:** Working source of truth  
**Version:** 0.1.0

---

# 1. Purpose

The output contract defines the authoritative structure returned by the DepthWizard processing pipeline.

The central principle is:

> **Design the product around outputs, not around the ML model.**

The ML model produces elevation/depth information. Downstream modules derive terrain products, analysis, validation, and reporting from that result.

---

# 2. Top-Level Result

Conceptual object:

```json
{
  "schema_version": "0.1.0",
  "result_id": "result_01J...",
  "status": "complete",
  "source": {},
  "geospatial": {},
  "elevation": {},
  "calibration": {},
  "terrain": {},
  "confidence": {},
  "validation": {},
  "measurements": [],
  "visualizations": {},
  "capabilities": {},
  "exports": {}
}
```

---

# 3. Status

Possible high-level states:

```text
queued
processing
complete
partial
failed
```

The UI should derive processing state from backend status.

---

# 4. Source

The source object identifies the processed input.

Potential fields:

```text
filename
input_type
dimensions
channels
file_size
```

No field should be fabricated when unavailable.

---

# 5. Input Type

Supported conceptual types:

```text
jpg
png
geotiff
```

The backend also identifies whether useful georeferencing is present.

---

# 6. Geospatial

Potential fields:

```text
georeferenced
crs
transform
bounds
pixel_resolution
nodata
horizontal_reference
vertical_reference
```

Only available values are populated.

---

# 7. Elevation

The elevation object distinguishes relative and absolute results.

Conceptual fields:

```text
mode
unit
min
max
mean
source
raster
```

Possible mode:

```text
relative
absolute
```

---

# 8. Calibration

Potential fields:

```text
status
method
reference
scale
offset
residual
```

Possible states:

```text
not_required
unavailable
pending
successful
failed
```

The frontend must not infer successful calibration merely from the presence of a GeoTIFF.

---

# 9. Terrain

Potential terrain derivatives:

```text
slope
aspect
hillshade
roughness
```

Each derivative should have an explicit availability state and associated asset/statistics where implemented.

---

# 10. Confidence

Potential structure:

```json
{
  "available": true,
  "method": "...",
  "overall": 0.0,
  "raster": "..."
}
```

The numerical interpretation must be documented by the implemented methodology.

Do not represent confidence as a probability unless justified.

---

# 11. Validation

Potential structure:

```text
available
reference
rmse
mae
correlation
error_map
```

No validation field is populated without actual reference comparison.

---

# 12. Measurements

Measurements are structured analytical objects.

Potential types:

```text
point
line
cross_section
area
```

A measurement may contain:

```text
id
type
geometry
values
units
timestamp
```

---

# 13. Visualizations

Potential assets:

```text
rgb
elevation
slope
aspect
hillshade
confidence
error_map
terrain_mesh
```

The backend identifies which assets are actually available.

---

# 14. Terrain Mesh

The visualization layer may receive:

```text
mesh geometry
texture
bounds
height scaling
```

The exact transport mechanism is an implementation concern.

---

# 15. Capabilities

The capabilities object tells the frontend what can be used.

Conceptual:

```json
{
  "relative_elevation": true,
  "absolute_elevation": false,
  "slope": true,
  "aspect": false,
  "hillshade": true,
  "confidence": false,
  "validation": false,
  "point_measurement": true,
  "cross_section": true,
  "first_person": true,
  "pdf_export": true,
  "geotiff_export": true
}
```

The final API should use stable field names.

---

# 16. Exports

Potential exports:

```text
geotiff
heightmap
png
pdf
```

Each export should have:

```text
available
format
path/id
status
```

---

# 17. Units

Units must be explicit.

For relative output, avoid pretending the value is a physical metric unless calibration supports that interpretation.

For metric output, include the relevant unit/reference metadata.

---

# 18. Coordinate Handling

If georeferenced:

- preserve CRS,
- preserve transform,
- preserve bounds,
- expose coordinates where valid.

If not georeferenced:

- use image/pixel coordinates where appropriate,
- do not invent geographic coordinates.

---

# 19. Relative vs Absolute Safety Rule

The frontend must never infer:

```text
relative → metres AMSL
```

Absolute labels require a valid backend calibration state.

---

# 20. Error Object

A structured error should ideally contain:

```text
code
message
stage
recoverable
details
```

Example:

```json
{
  "code": "INVALID_GEOTIFF",
  "message": "Unable to read raster metadata.",
  "stage": "ingestion",
  "recoverable": true
}
```

---

# 21. Processing Progress

Conceptual:

```json
{
  "stage": "terrain_generation",
  "progress": 0.63,
  "message": "Generating terrain..."
}
```

Progress should represent real work where possible.

---

# 22. Report Data

The backend should expose structured information required by the report system.

The frontend should not reconstruct scientific values from screenshots.

---

# 23. API Boundary

The API is the boundary between:

```text
Processing / analysis
```

and:

```text
Visualization / interaction / reporting
```

The backend remains authoritative for analytical values.

---

# 24. Contract Philosophy

The contract should be:

- explicit,
- versioned,
- capability-driven,
- honest about unavailable information,
- independent of a specific frontend,
- independent of a specific ML model where possible.

---

# 25. Non-Goals

The contract does not prescribe:

- React component structure,
- Three.js implementation,
- visual styling,
- model architecture,
- training configuration,
- exact database choice.

Those belong elsewhere.
