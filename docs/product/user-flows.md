# DepthWizard — User Flows

**Role:** User journey and behavioral flow specification  
**Status:** Working source of truth

---

# 1. Core Journey

```text
Landing
  ↓
Input
  ↓
Inspection
  ↓
Processing
  ↓
Workspace
  ↓
Explore
  ↓
Analyse
  ↓
Validate
  ↓
Report
  ↓
Export
```

The analyst should be able to move through this without understanding the internal ML pipeline.

---

# 2. Landing Flow

```text
LANDING
   ↓
Open Workspace
   ↓
INPUT
```

The landing page has one dominant action.

It should communicate:

- what DepthWizard does,
- accepted input,
- resulting workflow.

---

# 3. Upload Flow

```text
Empty
  ↓
Select / Drop file
  ↓
Inspect file
  ↓
Classify input
  ↓
Valid?
 ├── No → Error
 └── Yes → Ready
```

---

# 4. Input Inspection Flow

Display available:

- filename,
- type,
- dimensions,
- georeferencing,
- CRS,
- resolution,
- bounds,
- NoData.

Then:

```text
[ Process Imagery ]
```

---

# 5. Processing Flow

```text
Input
 ↓
Preprocessing
 ↓
Depth estimation
 ↓
Elevation reconstruction
 ↓
Calibration when applicable
 ↓
Terrain derivatives
 ↓
Visualization assets
 ↓
Complete
```

The UI displays real processing state where available.

---

# 6. Processing Failure

```text
Processing
   ↓
Failure
   ↓
Explain
   ↓
Retry
   OR
Return to input
```

Do not make the user restart the whole application.

---

# 7. Workspace Entry

After successful processing:

```text
Workspace
   ↓
3D terrain
```

The first experience should be visual and immediately useful.

---

# 8. Terrain Exploration Flow

```text
3D
 ↓
Orbit / pan / zoom
 ↓
Change layer
 ↓
Change camera
 ↓
First Person if desired
```

Switching views must not destroy the current result.

---

# 9. Height Probe Flow

```text
Analysis → Height
        ↓
Click terrain
        ↓
Point selected
        ↓
Display available values
```

Potential values:

```text
Coordinates
Elevation
Slope
Confidence
```

---

# 10. Two-Point Flow

```text
Analysis → Measurement
        ↓
Select A
        ↓
Select B
        ↓
Compute
        ↓
Distance
Elevation Δ
Slope
```

---

# 11. Cross-Section Flow

```text
Analysis → Cross Section
        ↓
Draw A → B
        ↓
Generate profile
        ↓
Inspect
        ↓
Add to report
```

---

# 12. Slope Flow

```text
Analysis → Slope
        ↓
Slope layer
        ↓
Optional point selection
        ↓
Inspect local slope
```

---

# 13. Validation Flow

If a compatible reference exists:

```text
Validation
 ↓
Reference comparison
 ↓
Metrics
 ↓
Error map
```

If not:

```text
Validation
 ↓
Unavailable
 ↓
Explain why
 ↓
Continue with other analysis
```

Validation is never a hard blocker for terrain exploration.

---

# 14. Report Flow

```text
Workspace
   ↓
Report
   ↓
Everything available selected
   ↓
Analyst optionally removes sections
   ↓
Analyst optionally adds views / measurements
   ↓
Generate
   ↓
Preview
```

---

# 15. Export Flow

```text
Report / Export
      ↓
Choose output
      ↓
Generate
      ↓
Ready
```

Supported exports depend on capabilities.

---

# 16. Relative-Elevation Flow

```text
Non-georeferenced image
       ↓
Relative elevation
       ↓
3D terrain
       ↓
Relative height / terrain analysis
       ↓
Report / export
```

The interface must preserve the relative status.

---

# 17. Metric-Elevation Flow

```text
Georeferenced image
       ↓
Calibration
       ↓
Calibration succeeds?
   ├── Yes → Metric elevation
   └── No → Relative result / limitation
```

No silent conversion to absolute elevation.

---

# 18. Partial Capability Flow

Example:

```text
Relative elevation
      ↓
3D
      ↓
Slope
      ↓
Cross-section
      ↓
Report
```

Even if validation or metric calibration is unavailable, the user can continue with supported analysis.

---

# 19. State Rules

Every major screen should account for:

```text
Empty
Loading
Ready
Active
Unavailable
Error
```

Some screens also need:

```text
Selecting
Generating
Complete
```

---

# 20. Persistence Rules

Within a workspace session, preserve:

- dataset,
- terrain result,
- active view,
- measurements,
- validation,
- report selections.

Changing tools should not cause reprocessing.

---

# 21. Interaction Principle

The product should progressively reveal complexity.

The analyst first sees:

```text
Terrain
```

then:

```text
Measure
```

then:

```text
Validate
```

then:

```text
Report
```

Do not expose every technical parameter at once.
