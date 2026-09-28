# DepthWizard --- Deployment Plan

## 1. Deployment goal

The SIH PS explicitly requires a visualization layer deployable as a
standalone application and evaluates successful standalone deployment
and software stability.

The target is therefore a **single user-facing DepthWizard
application**, not a notebook demo.

## 2. Prototype deployment

Recommended prototype:

``` text
DepthWizard/
├── frontend/       # Three.js application
├── backend/        # FastAPI + ML + geospatial processing
├── models/         # trained checkpoint
├── assets/
└── scripts/
```

Start command should eventually be one command or one launcher:

``` text
DepthWizard
    ├── starts backend
    └── opens frontend
```

## 3. Training environment is separate

Training may continue in Kaggle/Colab/local GPU environments.

The deployed app receives only: - model weights; - model
configuration; - inference code; - geospatial/visualization
dependencies.

Do not require: - Kaggle; - notebook execution; - dataset downloads; -
training dependencies.

## 4. Packaging strategy

### Stage A --- local development

Run: - FastAPI locally; - Vite/Three.js dev server locally.

### Stage B --- integrated prototype

Build the frontend and serve it from the backend or launch both through
one script.

### Stage C --- standalone package

Use a desktop wrapper if needed (for example Tauri or Electron) or a
packaged local launcher.

The exact wrapper is an implementation choice. The architecture must
preserve the frontend/backend separation.

## 5. Model packaging

Store the model artifact locally with: - model weights; - preprocessing
configuration; - model metadata.

The app should load the model once at startup where practical.

## 6. Hardware expectations

Prototype inference may require a GPU depending on model size and target
latency.

The viewer itself should not require a GPU-capable ML environment once
the DSM has been generated.

For a low-resource deployment path, later investigate: - smaller
model; - ONNX; - quantization; - tiled inference; - CPU optimization.

Do not claim these optimizations until tested.

## 7. Data privacy

The preferred final architecture is local processing: - uploaded imagery
stays on the user's machine; - no external inference API is required; -
no third-party cloud dependency is required for normal operation.

## 8. Operational workflow

``` text
Launch DepthWizard
      ↓
Upload PNG/JPG/GeoTIFF
      ↓
Inspect metadata
      ↓
Run inference
      ↓
Optional shadow verification
      ↓
Optional DEM/GCP anchoring
      ↓
Generate DSM
      ↓
Generate 3D mesh
      ↓
Open interactive viewer
      ↓
Inspect height / slope
      ↓
Validate / export
```

## 9. Deployment acceptance test

A clean test machine should be able to:

1.  install/launch the packaged application;
2.  load the model;
3.  upload a test image;
4.  generate a height map;
5.  display the 3D scene;
6.  navigate;
7.  inspect height;
8.  inspect slope;
9.  export output.

If the test requires opening a development notebook or manually
installing project-specific packages, deployment is not considered
complete.

## 10. Prototype fallback

If full desktop packaging cannot be completed in the sprint: - ship a
local launcher; - run FastAPI locally; - automatically open the Three.js
UI in the browser; - document the one-click launch process.

This still demonstrates the unified application architecture and can be
upgraded to a packaged desktop executable later.
