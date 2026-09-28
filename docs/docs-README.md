# DepthWizard Documentation Guide

## Purpose

This document defines how the DepthWizard project documentation is organized, which document is authoritative for which decision, and what an AI coding agent should read before modifying the project.

DepthWizard is a technical geospatial application for turning single-view optical imagery into elevation information, terrain visualization, analysis, validation, and exports.

The documentation is intentionally separated into layers so that product decisions, engineering contracts, ML experiments, and UI design do not contradict one another.

---

# 1. Source-of-Truth Hierarchy

When two documents appear to disagree, do not silently choose one. Use this hierarchy:

1. **Decision Log** — records explicit project decisions and their status.
2. **Product Truth** — defines what the product must do and what users should see.
3. **Engineering Truth** — defines technical contracts and implementation constraints.
4. **ML / Validation Truth** — defines the current model, training setup, experiments, and evidence.
5. **Design Truth** — defines visual and interaction behavior.
6. **Implementation Brief / Plan** — defines the current execution order.
7. **AI Agent Skill / Context** — tells coding agents how to operate within these constraints.

If an implementation plan conflicts with a locked decision, the decision wins.

If a UI idea conflicts with a product capability or backend contract, the product/engineering contract wins.

If a claim is not experimentally validated, documentation must not present it as a proven capability.

---

# 2. Recommended Repository Structure

```text
DepthWizard/
├── README.md
├── .agents/
│   └── skills/
│       └── depthwizard/
│           └── SKILL.md
│
├── docs/
│   ├── README.md
│   │
│   ├── product/
│   │   ├── capabilities.md
│   │   ├── user-flows.md
│   │   ├── report-system.md
│   │   └── output-contract.md
│   │
│   ├── architecture/
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   └── ml-integration.md
│   │
│   ├── design/
│   │   ├── design-system.md
│   │   ├── interaction-rules.md
│   │   └── workspace-wireframe-spec.md
│   │
│   ├── engineering/
│   │   ├── requirements.md
│   │   ├── api-contract.md
│   │   ├── deployment.md
│   │   ├── implementation-plan.md
│   │   └── testing.md
│   │
│   ├── ml/
│   │   ├── ml-pipeline.md
│   │   └── data-and-validation.md
│   │
│   └── decisions/
│       └── decision-log.md
│
├── frontend/
├── backend/
├── models/
├── training/
└── scripts/
```

This structure separates **what DepthWizard is**, **how it works**, **how it looks**, and **how it is currently being implemented**.

---

# 3. Product Documentation

## `docs/product/capabilities.md`

Defines the product capability map.

Use it when:
- deciding what appears in the UI
- deciding what the workspace should expose
- deciding MVP vs future functionality
- explaining DepthWizard's feature set

It should describe capabilities such as:
- JPG/PNG/GeoTIFF ingestion
- metadata inspection
- relative elevation / rDSM
- calibrated absolute DSM where supported
- 2D elevation visualization
- 3D terrain textured with the original RGB image
- first-person navigation
- height and slope analysis
- cross-section / terrain profile
- validation
- exports
- report generation

Do not add capabilities here merely because they would be technically interesting.

---

## `docs/product/user-flows.md`

Defines the user's journey through the application.

Primary flow:

```text
Landing
  ↓
Upload
  ↓
Metadata / Input Classification
  ↓
Processing
  ↓
Terrain Workspace
  ↓
Inspect / Analyse
  ↓
Validate (when available)
  ↓
Export / Report
```

Use this when implementing navigation, page transitions, processing states, or empty/loading/error states.

---

## `docs/product/report-system.md`

Defines the reporting system.

Core rule:

> The default report includes all information that is actually available for the processed result. Users can create a custom report by selecting available sections.

Unavailable information should be disabled with an explanation rather than hidden or fabricated.

Possible report sections include:
- source/input information
- geospatial metadata
- elevation summary
- terrain statistics
- slope information
- measurements
- cross-sections
- validation metrics
- error map
- confidence/reliability information
- analyst-added views
- exports / generated assets

Reports must only contain values that were actually computed.

---

## `docs/product/output-contract.md`

This is the central product-to-frontend data contract.

It defines the structure of a completed terrain result, including:

```text
TerrainResult
├── source
├── geospatial
├── elevation
├── calibration
├── terrain
├── confidence
├── validation
├── measurements
├── visualizations
├── capabilities
└── exports
```

The backend is the source of truth.

The frontend must use `capabilities` to decide which controls are enabled, disabled, or unavailable.

Never infer unsupported analytical capabilities from the presence of an image alone.

---

# 4. Architecture Documentation

## `docs/architecture/frontend.md`

Defines frontend architecture and responsibilities.

Use it for:
- page structure
- component boundaries
- application state
- viewport / panel architecture
- 3D viewer integration
- frontend data flow

The main application is the `/workspace`.

The landing page is intentionally simpler and should not become the application itself.

---

## `docs/architecture/backend.md`

Defines backend architecture.

Conceptual backend stages:

```text
INPUT
  ↓
LEARN
  ↓
VERIFY
  ↓
ANCHOR
  ↓
RECONSTRUCT
  ↓
ANALYSE
  ↓
EXPORT
```

Conceptual modules include:

```text
ingestion/
estimation/
calibration/
terrain/
analysis/
validation/
export/
```

The backend owns analytical calculations and result truth.

---

## `docs/architecture/ml-integration.md`

Defines how the trained depth model connects to the deployed application.

Important principle:

> DepthWizard is not “a DA2 demo”. DA2 is one component inside a larger terrain-processing pipeline.

The ML integration must expose a stable inference interface so that the rest of the application does not depend on model-specific implementation details.

Training remains separate from the deployed application.

---

# 5. Design Documentation

## `docs/design/design-system.md`

Defines the visual language.

DepthWizard should look like a serious geospatial instrument, not a generic AI SaaS landing page.

Desired characteristics:
- precise
- restrained
- technical
- spatial
- trustworthy
- strong typography
- clear hierarchy
- generous whitespace
- limited, purposeful color
- monospace treatment for coordinates, measurements, and technical metadata where appropriate

Avoid:
- purple/blue AI gradients
- glowing blobs
- decorative 3D globes
- excessive glassmorphism
- excessive rounded cards
- meaningless animations
- AI buzzword-heavy marketing
- decorative elements that do not communicate information

Motion should primarily communicate:
- processing
- loading
- navigation
- terrain interaction
- state transitions

---

## `docs/design/interaction-rules.md`

Defines how interaction should behave.

Important rules:
- active tools must be visually obvious
- users must be able to cancel active tools
- conflicting tools should not remain active simultaneously
- backend capability state controls feature availability
- measurement results come from backend calculations
- relative values must never be presented as metric heights without valid calibration
- unavailable features should explain why they are unavailable
- errors should be actionable and understandable
- loading/progress states should communicate what is happening

---

## `docs/design/workspace-wireframe-spec.md`

Defines the workspace layout and interaction model.

Primary workspace structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header / Dataset / Processing Status / Export               │
├──────────────┬──────────────────────────────┬───────────────┤
│ Left Nav     │                              │ Right Panel   │
│              │      Terrain Viewport        │               │
│ Terrain      │      2D / 3D / FPV           │ Inspector     │
│ Analysis     │                              │ Measurements  │
│ Validation   │                              │ Cross-section │
│ Export       │                              │ Metadata      │
└──────────────┴──────────────────────────────┴───────────────┘
```

Modes include:
- 3D
- Topographic
- First Person

Analysis tools include:
- height probe
- two-point measurement
- slope
- cross-section / terrain profile

Validation is shown only when validation data is available.

---

# 6. Engineering Documentation

## `docs/engineering/requirements.md`

Defines implementation requirements.

Use it to verify that the application meets the actual problem requirements.

Do not use it as a replacement for the product capability map.

---

## `docs/engineering/api-contract.md`

Defines API endpoints and API-level behavior.

Early core endpoints include:

```text
POST /api/jobs
GET  /api/jobs/{job_id}
GET  /api/jobs/{job_id}/result
GET  /api/jobs/{job_id}/assets/{asset}
POST /api/jobs/{job_id}/probe
GET  /api/health
```

The API should expose meaningful processing states and consistent errors.

No internal filesystem paths should be exposed to the frontend.

---

## `docs/engineering/deployment.md`

Defines how DepthWizard runs as a unified application.

Target workflow:

```text
Upload
  → Metadata
  → Inference
  → Verification
  → Calibration
  → DSM
  → Mesh
  → Viewer
  → Analysis
  → Export
```

Training infrastructure remains separate from deployment.

---

## `docs/engineering/implementation-plan.md`

Defines the current implementation sequence.

The plan may change as evidence changes.

It is therefore **not** the highest-level source of truth.

---

## `docs/engineering/testing.md`

Defines acceptance tests.

Testing should cover:
- input formats
- metadata preservation
- relative vs absolute labeling
- inference
- terrain derivatives
- 3D/RGB alignment
- measurements
- validation
- exports
- errors
- performance
- clean-machine deployment

---

# 7. ML Documentation

## `docs/ml/ml-pipeline.md`

Defines the current ML pipeline and experimental model configuration.

Current experimental setup includes:
- Depth Anything V2 Small
- Hugging Face Transformers
- GAMUS as the current training base
- frozen DINOv2 backbone with decoder-side training
- dense height/depth representation
- configurable loss experimentation

Experimental numbers must always be labeled as experimental/current, not universal benchmark claims.

---

## `docs/ml/data-and-validation.md`

Defines dataset and validation methodology.

Important rules:
- GAMUS is the current training base, not proof of satellite-domain generalization.
- Spatial separation is preferred to reduce leakage.
- Additional genuine satellite validation is desirable.
- Calibration must be evaluated experimentally.
- Metrics include MAE, RMSE, correlation, bias, median absolute error, height-bin MAE, per-scene performance, failure rate, and runtime.
- Shadow geometry is a verification cue, not a replacement for learned estimation.
- Disagreement between learned and physical estimates is a reliability signal, not automatically a calibrated probability.

---

# 8. Decision Documentation

## `docs/decisions/decision-log.md`

This is the highest-priority living record of explicit project decisions.

Examples of decisions already made:
- GAMUS is the current training base.
- Depth Anything V2 Small is the current experimental model.
- Three.js is preferred for the 3D viewer.
- Training and deployment are separate.
- Calibration remains modular until validated.
- Shadow checking is a verification cue, not a guaranteed solution.
- Confidence/disagreement is not automatically calibrated probability.
- Relative height must never be presented as metric height without legitimate calibration.
- Claims should carry status such as DONE / IN PROGRESS / TARGET / FUTURE.

When a significant architectural or product decision is made, record it here before changing implementation.

---

# 9. Legacy Documentation

The older DepthWizard documentation set is useful and should **not** be discarded.

It contains engineering and ML history that the newer product/design documents do not replace.

Legacy material includes:
- AI context
- requirements
- architecture
- ML pipeline
- API contract
- deployment
- data and validation
- implementation plan
- decision log

The correct approach is to migrate/reconcile it into the new structure rather than blindly merging everything.

When migrating:
1. Preserve useful experimental history.
2. Preserve decisions that are still valid.
3. Mark outdated experiments as historical.
4. Do not let old implementation details override newer explicit decisions.
5. Avoid maintaining two competing versions of the same contract.

---

# 10. What an AI Coding Agent Should Read

Do not ask an agent to read every document for every task.

Use task-specific context.

### Landing page

Read:

```text
docs/product/capabilities.md
docs/design/design-system.md
docs/design/interaction-rules.md
```

### Workspace shell

Read:

```text
docs/product/capabilities.md
docs/product/user-flows.md
docs/design/design-system.md
docs/design/interaction-rules.md
docs/design/workspace-wireframe-spec.md
docs/architecture/frontend.md
```

### 3D terrain viewer

Read:

```text
docs/product/output-contract.md
docs/design/design-system.md
docs/design/interaction-rules.md
docs/design/workspace-wireframe-spec.md
docs/architecture/frontend.md
```

### DA2 integration

Read:

```text
docs/ml/ml-pipeline.md
docs/ml/data-and-validation.md
docs/architecture/ml-integration.md
docs/architecture/backend.md
docs/product/output-contract.md
docs/decisions/decision-log.md
```

### API/backend

Read:

```text
docs/architecture/backend.md
docs/product/output-contract.md
docs/engineering/api-contract.md
docs/decisions/decision-log.md
```

### Export/reporting

Read:

```text
docs/product/report-system.md
docs/product/output-contract.md
docs/engineering/api-contract.md
docs/design/interaction-rules.md
```

### Deployment

Read:

```text
docs/engineering/deployment.md
docs/engineering/requirements.md
docs/engineering/testing.md
docs/architecture/backend.md
docs/architecture/frontend.md
```

---

# 11. Documentation Change Rules

Before changing a document, ask:

1. Is this a product decision?
2. Is this a technical implementation detail?
3. Is this an experimental ML result?
4. Is this a visual/interaction rule?
5. Is this a temporary execution plan?

Put the information in the corresponding document.

Do not duplicate the same rule across many documents unless the duplication is necessary for agent context.

When a rule changes:
- update the source-of-truth document first
- update dependent documents
- update the decision log if it represents a meaningful project decision
- only then change implementation

---

# 12. Status Language

Use explicit status labels where appropriate:

- **DONE** — implemented and verified
- **IN PROGRESS** — currently being built/tested
- **TARGET** — intended for the current milestone
- **FUTURE** — intentionally deferred
- **EXPERIMENTAL** — tested but not yet established as final
- **UNVALIDATED** — technically present/proposed but evidence is insufficient

This prevents the PPT, code, and documentation from accidentally turning a target or experiment into a claimed finished capability.

---

# 13. Core Product Principle

The architecture should always be understandable as:

```text
Single Image
    ↓
Elevation Estimate
    ↓
Terrain Reconstruction
    ↓
Terrain Intelligence
    ↓
Validation
    ↓
Analyst-ready Output
```

The model is only one stage in this chain.

DepthWizard should therefore be built as a **terrain understanding tool**, not as a webpage demonstrating an AI model.
