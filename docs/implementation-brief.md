# DepthWizard — Phase 1 Implementation Brief

## 0. Mission

Build the first working application shell for DepthWizard:

> **Landing page → Workspace → terrain visualization and analysis UI**

The frontend must be usable **before the real DA2 backend is integrated**. Use a fixture implementation of the project's `TerrainResult` contract.

This phase proves the product architecture and UX. It does **not** attempt to finish the ML/geospatial pipeline.

DepthWizard is a tool for understanding terrain, not a webpage demonstrating AI.

---

# 1. Read before coding

Read:

1. `.agents/skills/depthwizard/SKILL.md`
2. `docs/README.md`
3. `docs/product/capabilities.md`
4. `docs/product/output-contract.md`
5. `docs/design/workspace-wireframe-spec.md`
6. `docs/design/design-system.md` if present
7. `docs/design/interaction-rules.md` if present
8. `docs/architecture/frontend.md` if present
9. `docs/decisions/decision-log.md` when a decision may be affected

Also inspect the existing repository before modifying anything.

Do not assume files listed above exist if they are not actually present. Do not invent their contents.

Use the installed `better-*` skills for generic interface, layout, typography, color, accessibility, writing, review, and stress-testing concerns.

---

# 2. Phase 1 scope

## Build now

### Landing

- DepthWizard identity
- concise explanation of the product
- accepted inputs: JPG / PNG / GeoTIFF
- one clear primary action: `Open Workspace`
- clean technical/geospatial visual language

### Workspace shell

Create:

```text
Workspace
├── Header
├── Left navigation
├── Main terrain viewport
└── Right contextual inspection panel
```

The terrain viewport is the visual center of the application.

### Terrain views

Architect the UI for:

- 3D
- Topographic
- First Person

The initial implementation may use fixture terrain data.

### Terrain controls

Architect:

- orbit navigation
- first-person navigation
- top-down camera
- camera presets
- vertical exaggeration
- layer selection

Initial layers:

- RGB
- Elevation
- Slope
- Hillshade
- Confidence

Only expose a layer as active when the fixture's capabilities say it is available.

### Analysis tools

Implement the interaction architecture for:

- Height probe
- Two-point measurement
- Slope
- Cross-section

These tools may operate on fixture data.

### Inspection panel

The panel is contextual to the active tool.

Examples:

Height probe:

```text
HEIGHT
Relative height
+18.42

Position
...

Source
Relative elevation

[Add to report]
```

Two-point measurement:

```text
POINT A
...

POINT B
...

DISTANCE
...

ELEVATION Δ
...

SLOPE
...

[Add to report]
```

Do not display metric units for relative fixture data.

### Report builder

Implement the report-selection UI:

```text
REPORT

☑ Overview
☑ Elevation statistics
☑ Slope analysis
☑ Cross-section
☑ Validation
☑ Current view
☐ Measurements

[Generate Report]
```

The actual report generation can initially be a controlled fixture action.

Unavailable sections must be represented honestly.

### Export

Create the export UI architecture for:

- DSM
- rDSM
- PNG
- GeoTIFF
- Report

Availability must be capability-driven.

---

# 3. Do not build in Phase 1

Do NOT implement:

- DA2 training
- GAMUS training
- model retraining
- real model inference
- calibration algorithm
- shadow detection/validation
- real DEM fetching
- real reference-data validation
- route assessment
- line-of-sight
- multi-tile processing
- temporal comparison
- authentication
- cloud infrastructure
- unnecessary database infrastructure
- mobile/offline deployment
- semantic post-processing

Do not add unrelated features because they look impressive.

---

# 4. Fixture architecture

The frontend must consume a fixture that mirrors the real `TerrainResult` contract.

Conceptually:

```text
Fixture TerrainResult
        ↓
Application state
        ↓
Terrain viewport
        ↓
Analysis tools
        ↓
Report builder
        ↓
Export UI
```

Later:

```text
Real backend
        ↓
TerrainResult
        ↓
same frontend
```

The goal is to replace the data source, not redesign the application.

Do not scatter hard-coded analytical numbers across UI components.

Prefer one fixture/data source and derive displayed values from it.

---

# 5. Fixture scenarios

Create enough fixture states to exercise the interface.

## Scenario A — relative JPG/PNG result

Capabilities should support:

- relative elevation
- 3D
- topographic
- first-person
- slope
- height probe
- two-point measurement
- cross-section
- RGB texture
- export of relative products

Metric elevation must be unavailable.

## Scenario B — calibrated GeoTIFF result

Capabilities should support:

- absolute elevation
- coordinates
- CRS
- metric measurements
- slope
- validation if fixture data exists
- GeoTIFF export

## Scenario C — unavailable capability

Include at least one deliberately unavailable feature so the UI demonstrates honest unavailable-state behavior.

## Scenario D — processing/error

Provide fixture states for:

- processing
- error

The application should not only demonstrate the successful state.

---

# 6. State model

The UI should account for relevant states:

```text
EMPTY
LOADING
PROCESSING
READY
ACTIVE
UNAVAILABLE
ERROR
```

Tools may additionally use:

```text
SELECTING
COMPLETE
CANCELLED
```

Report/export may use:

```text
GENERATING
SUCCESS
FAILED
```

Do not create fake progress merely for animation. Processing status should communicate actual fixture state.

---

# 7. Terrain viewport requirements

The viewport should be built so that the real terrain renderer can replace the fixture renderer later.

The renderer should conceptually accept:

```text
RGB texture
+
height field
+
terrain metadata
+
available layers
+
camera state
```

Do not couple the viewport directly to DA2.

Use an appropriate Three.js-based structure if the existing frontend stack supports it and the project documentation confirms Three.js.

Do not add decorative 3D unrelated to terrain.

---

# 8. Measurement behavior

Measurements should be treated as analytical data, not decorative UI.

Height probe:

```text
select point
→ read terrain height
→ show appropriate unit
→ show coordinates only when available
```

Two-point:

```text
select A
→ select B
→ calculate/display supported measurements
```

Cross-section:

```text
select line
→ derive profile from fixture terrain
→ show distance/elevation information
```

If the data is relative, say so.

If coordinates are unavailable, do not fabricate them.

If a calculation is not available, show unavailable rather than a guessed value.

---

# 9. Capability-driven rendering

Do not write:

```text
if GeoTIFF:
    show every GeoTIFF feature
```

Instead consume explicit capability state from the result.

The frontend should ask:

```text
Is metric elevation available?
Are coordinates available?
Is validation available?
Is confidence available?
Is slope available?
Is cross-section available?
Can this product be exported?
```

The exact contract must come from `output-contract.md`.

---

# 10. Design direction

DepthWizard should resemble a serious geospatial analysis instrument.

Desired:

- restrained
- technical
- precise
- readable
- spatial
- trustworthy
- purposeful
- minimal decorative noise

Avoid:

- purple/blue AI gradients
- glowing blobs
- AI particles
- decorative globes
- excessive glassmorphism
- excessive pill-shaped UI
- excessive rounded cards
- meaningless animation
- buzzword-heavy marketing copy
- generic AI dashboard aesthetics

Do not redesign the product into a conventional SaaS dashboard.

The terrain viewport should feel like the main instrument.

---

# 11. Responsive behavior

Prioritize desktop first because the workspace is an analyst-oriented application.

Still implement sensible behavior for narrower screens.

At smaller widths:

- preserve access to the main viewport
- collapse or reorganize secondary panels
- keep controls usable
- avoid horizontal clipping
- maintain readable text and hit areas

Do not optimize the desktop workspace away in favor of a mobile dashboard.

---

# 12. Accessibility

Follow `better-accessibility`.

At minimum:

- semantic HTML where applicable
- keyboard-accessible controls
- visible focus
- accessible names
- no color-only meaning
- appropriate live-region behavior for processing/error feedback
- sensible heading hierarchy
- reduced-motion support
- usable hit areas

Do not solve accessibility by adding excessive labels everywhere; preserve the instrument-like visual hierarchy.

---

# 13. Interaction rules

Follow `better-interface`, `better-layout`, `better-ui`, and `better-writing`.

Important product-specific interaction principles:

- one active analytical tool at a time unless the architecture explicitly requires otherwise
- active tool must be visually obvious
- clicking a new tool should safely cancel or complete the previous selection
- Escape should cancel an active selection where appropriate
- destructive or irreversible actions require appropriate confirmation
- loading/processing should not make the whole UI appear frozen unless the actual application requires it
- transitions should support orientation, not decoration

Use concise, verb-first action labels.

---

# 14. Component boundaries

Prefer a structure along these lines, adapted to the existing stack:

```text
app/
├── landing/
├── workspace/
│   ├── WorkspaceShell
│   ├── WorkspaceHeader
│   ├── ToolNavigation
│   ├── TerrainViewport
│   ├── ViewControls
│   ├── LayerControl
│   ├── InspectorPanel
│   ├── AnalysisTools
│   ├── ReportBuilder
│   └── ExportPanel
├── terrain/
├── analysis/
├── reports/
├── exports/
├── state/
└── fixtures/
```

Do not blindly create this exact folder tree if the repository has an established architecture. Adapt to the existing codebase.

---

# 15. State ownership

Keep responsibilities separated.

### Application state

Own:

- current result
- current workspace mode
- selected tool
- active layer
- camera mode
- fixture scenario
- report selection
- processing state

### Terrain renderer

Own:

- renderer lifecycle
- terrain scene
- camera
- controls
- visual layer switching

### Analysis modules

Own:

- selection state
- measurement calculations
- cross-section data

### Backend/result contract

Own:

- analytical truth
- capabilities
- geospatial metadata
- processing status
- export availability

Do not duplicate backend analytical logic in presentation components.

---

# 16. Implementation sequence

Work in this order.

## Step 1 — Recon

Inspect:

- current repository
- framework
- package manager
- existing components
- existing styling
- existing routes
- current Three.js/rendering setup, if any

Do not replace working infrastructure without reason.

## Step 2 — Application shell

Build:

```text
Landing
→ Workspace route
→ workspace shell
```

## Step 3 — Design foundation

Apply existing project design tokens/system.

Use the generic better-* skills rather than inventing a separate UI philosophy.

## Step 4 — Fixture contract

Create the centralized fixture result and scenario switching.

## Step 5 — Terrain viewport

Implement fixture terrain rendering and core camera/view controls.

## Step 6 — Inspection

Implement contextual inspector and layer controls.

## Step 7 — Analysis

Implement fixture-backed height, two-point, slope, and cross-section interactions.

## Step 8 — Reporting/export

Implement report builder and export surfaces.

## Step 9 — State completeness

Exercise:

- empty
- loading
- processing
- ready
- unavailable
- error

## Step 10 — Verification

Run the application and verify the primary flows.

Use the relevant installed interface skills for review/stress-testing.

---

# 17. Primary acceptance test

A reviewer should be able to do this without reading source code:

```text
Open DepthWizard
    ↓
Open Workspace
    ↓
See terrain result
    ↓
Switch 3D / Topographic / First Person
    ↓
Change terrain layer
    ↓
Use height probe
    ↓
Measure between two points
    ↓
Inspect slope
    ↓
Draw a cross-section
    ↓
Add an observation to the report
    ↓
Open report builder
    ↓
See available/unavailable sections
    ↓
Open export options
```

The application should remain coherent throughout.

---

# 18. Secondary acceptance tests

### Relative result

Verify that:

- height is explicitly identified as relative
- metric units are not falsely displayed
- coordinate fields are unavailable when appropriate

### Calibrated result

Verify that:

- metric values can be displayed only when the fixture says they are available
- coordinate/CRS information comes from the result
- validation appears only when supported

### Error

Verify that:

- the user understands what failed
- recovery or next action is clear
- the interface does not silently display stale/fake analytical data

### Narrow viewport

Verify that:

- controls remain usable
- no critical content clips
- the terrain remains the primary focus

---

# 19. Definition of done

Phase 1 is complete only when:

### Product

- Landing → Workspace works.
- Workspace has the agreed shell.
- Terrain viewport is dominant.
- 3D / Topographic / First Person are represented.
- Core analysis tools are accessible.
- Report builder exists.
- Export surface exists.

### Architecture

- Fixture data follows the real output contract.
- UI consumes centralized result data.
- Capability state controls feature availability.
- Renderer is separated from model/inference concerns.
- Analytical values are not scattered through UI components.
- Real backend integration has a clear replacement boundary.

### UX

- Empty state exists.
- Loading state exists.
- Processing state exists.
- Ready state exists.
- Error state exists.
- Unavailable capabilities are represented honestly.
- Active analytical tools are clear.
- Keyboard/accessibility behavior is reasonable.

### Design

- Interface follows the DepthWizard visual direction.
- No generic AI-SaaS treatment.
- No decorative 3D unrelated to terrain.
- Typography/layout/color/accessibility follow the installed skills.
- Desktop workspace feels like a geospatial instrument.

### Verification

- App runs locally.
- Primary acceptance flow works.
- Relevant UI states have been exercised.
- Relevant interface reviews have been run where appropriate.
- Anything not verified is explicitly reported.

---

# 20. Final implementation rule

Do not optimize for how impressive the code looks.

Optimize for this:

> **Can the real DepthWizard backend eventually plug into this frontend without us having to redesign the product?**

If yes, Phase 1 succeeded.
