# DepthWizard — Report System

**Role:** Report and evidence specification  
**Status:** Working source of truth

---

# 1. Purpose

The report system converts the current analytical result into a persistent, shareable record.

The report should answer:

- What imagery was analysed?
- What terrain result was produced?
- What information is available?
- What was measured?
- How trustworthy/validated is it?
- What did the analyst choose to preserve?

---

# 2. Default Philosophy

> **Everything valid and available is included by default.**

The analyst may then customize the report.

This prevents users from needing to understand every available capability before generating a useful report.

---

# 3. Default Sections

Potential default sections:

```text
Input information
Image preview
Elevation summary
Terrain statistics
Slope analysis
Confidence
Validation
Error map
Measurements
Cross-sections
Analyst observations
```

Only sections with valid data are enabled.

---

# 4. Custom Sections

The analyst may remove default sections.

They may also add:

```text
Current 3D view
Current terrain layer
Selected measurement
Selected profile
Selected validation view
```

---

# 5. Report Model

Conceptual structure:

```text
Report
├── identity
├── source
├── input_metadata
├── elevation
├── terrain
├── confidence
├── validation
├── measurements
├── visualizations
├── analyst_observations
└── exports
```

The authoritative data structures should remain aligned with `output-contract.md`.

---

# 6. Report Identity

Every generated report should identify:

- report/result ID,
- source dataset,
- processing result,
- generation time where available.

---

# 7. Input Section

Show relevant source information:

```text
Filename
Input type
Dimensions
Georeferencing
CRS
Resolution
```

Only available metadata is shown.

---

# 8. Elevation Section

Clearly identify:

```text
Relative elevation
```

or:

```text
Metric / calibrated elevation
```

The report must not blur these concepts.

If calibration exists, include its status/reference metadata.

---

# 9. Terrain Section

Include available:

- elevation visualization,
- slope summary,
- aspect summary,
- hillshade,
- roughness,
- terrain statistics.

Do not include unavailable products as if they were computed.

---

# 10. Confidence Section

If implemented:

- overall confidence summary,
- confidence visualization,
- supporting explanation where valid.

Do not describe confidence as a universal probability unless the methodology supports that interpretation.

---

# 11. Validation Section

When available:

```text
Reference source
RMSE
MAE
Correlation
Error visualization
```

If validation is unavailable, the report may state:

```text
Validation unavailable
Reason: no compatible reference result
```

The wording should be generated from actual system state.

---

# 12. Measurement Section

Measurements may include:

## Point

```text
Location
Elevation
Slope
Confidence
```

## Two-point

```text
A
B
Distance
Elevation difference
Slope
```

## Cross-section

```text
Start
End
Distance
Elevation difference
Profile
```

---

# 13. Current View Section

A selected visualization can be added to the report.

The system should preserve useful context where possible:

- active layer,
- camera,
- overlays,
- selection.

---

# 14. Analyst Observations

The system may generate concise observations based only on computed information.

Examples:

```text
Terrain slope is concentrated in the northern portion.
```

only if actual computed data supports that statement.

Avoid unsupported operational/intelligence conclusions.

---

# 15. Report Generation States

```text
Default
Customizing
Generating
Ready
Failed
```

### Generating

```text
Collecting analysis...
Generating figures...
Building report...
```

### Ready

```text
Report ready
[ Preview ]
[ Export PDF ]
```

---

# 16. Report Integrity

The report must preserve:

- units,
- reference status,
- relative/absolute status,
- source identity,
- validation status.

No transformation should silently change the meaning of a value.

---

# 17. PDF

Initial report target:

```text
PDF
```

It should be readable and analyst-oriented rather than a marketing brochure.

---

# 18. Future Report Outputs

Potential future formats:

- JSON
- HTML
- CSV appendix
- machine-readable report package

These are secondary to a useful PDF report and structured underlying data.

---

# 19. Report Design Principle

The report is not an afterthought.

It is the final layer of the product:

```text
Image
 ↓
Terrain
 ↓
Analysis
 ↓
Evidence
 ↓
Report
```

A successful report should allow another person to understand what was processed and what the analyst actually observed without relying on the live application.
