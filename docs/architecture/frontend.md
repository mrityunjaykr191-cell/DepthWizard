# DepthWizard — Frontend Architecture

**Role:** Frontend architecture specification  
**Status:** Working source of truth

---

# 1. Goals

The frontend should provide:

- a restrained technical interface,
- dominant terrain visualization,
- fast analyst interaction,
- capability-driven tools,
- clear scientific state,
- clean report workflow.

---

# 2. Recommended Stack

Conceptual stack:

```text
React
TypeScript
React Three Fiber / Three.js
Map/geospatial utilities where required
```

The exact framework setup may evolve, but TypeScript and a componentized React architecture are preferred.

---

# 3. Application Structure

```text
Landing
  ↓
Workspace
  ├── Input
  ├── Terrain
  ├── Analysis
  ├── Validation
  ├── Report
  └── Export
```

---

# 4. Component Boundaries

Conceptual:

```text
app/
├── landing/
├── workspace/
│   ├── shell/
│   ├── terrain/
│   ├── analysis/
│   ├── validation/
│   ├── inspection/
│   ├── report/
│   └── export/
├── shared/
│   ├── controls/
│   ├── status/
│   └── data-display/
└── state/
```

Component names are illustrative rather than mandatory.

---

# 5. Workspace Layout

Persistent conceptual regions:

```text
Top bar
Left navigation
Central viewport
Right inspection panel
```

The viewport gets the majority of available space.

---

# 6. State Management

The frontend needs state for:

```text
dataset
processing
result
capabilities
active_view
active_layer
camera
active_tool
selection
measurements
validation
report
export
```

Avoid duplicating backend truth unnecessarily.

---

# 7. Backend Synchronization

The frontend should consume:

```text
processing status
result
capabilities
analysis results
errors
export status
```

Backend responses should be treated as authoritative.

---

# 8. Terrain Rendering

The terrain viewer should support:

- generated terrain mesh,
- original RGB texture,
- layer switching,
- camera controls,
- first-person navigation,
- selection,
- measurement overlays.

---

# 9. Viewer Performance

Large terrain data should not require the browser to load unnecessarily huge assets.

Possible strategies:

- tiled/LOD terrain,
- downsampled visualization assets,
- progressive loading,
- worker-based preprocessing,
- GPU-friendly textures.

The final choice depends on data size and implementation testing.

---

# 10. Analysis Interaction

Tools should use a common interaction pattern:

```text
Activate tool
 ↓
Instruction
 ↓
User selection
 ↓
Backend calculation where authoritative
 ↓
Result
 ↓
Inspection
 ↓
Optional Add to Report
```

---

# 11. Capability-Driven Rendering

Example:

```text
if capabilities.cross_section
    enable Cross Section
else
    disable / explain
```

Do not create frontend-only scientific assumptions.

---

# 12. Error Handling

Errors should be surfaced at the smallest useful scope.

A failed export should not destroy the workspace.

A failed validation should not destroy terrain.

A failed visualization should not require re-uploading the source.

---

# 13. Report Integration

The frontend maintains report selection state and requests report generation.

Analytical values come from backend result objects.

---

# 14. Export Integration

The frontend presents only exports marked available.

Generation status is shown during export.

---

# 15. Routing

Recommended conceptual routes:

```text
/
 /workspace
 /workspace/report
```

Feature modes can remain stateful workspace modes instead of separate routes.

Avoid excessive route fragmentation.

---

# 16. Accessibility

The interface should support:

- keyboard navigation for controls,
- visible focus states,
- meaningful labels,
- sufficient contrast,
- non-color-only status communication.

3D interaction is inherently mouse-heavy, but all surrounding controls should remain accessible.

---

# 17. Responsive Strategy

The desktop analyst workspace is the primary target.

On smaller screens:

- preserve terrain viewport,
- collapse side panels,
- move inspection into drawers,
- avoid shrinking every control until unreadable.

A mobile-first redesign is not the primary goal.

---

# 18. Frontend Non-Goals

Do not turn the frontend into:

- a generic dashboard,
- a card grid,
- an AI chat interface,
- a marketing-heavy SaaS shell.

The terrain and analytical workflow are the product.
