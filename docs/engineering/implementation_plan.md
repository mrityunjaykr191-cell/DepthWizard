# DepthWizard --- Implementation Plan

## Goal

Turn the current ML prototype into an integrated, demonstrable
application while keeping the scope realistic.

## Phase 1 --- Stabilize ML inference

Deliver: - reusable `DepthEstimator` class; - checkpoint loading; -
preprocessing; - prediction; - source-resolution resizing; - output
serialization.

Target:

``` text
python infer.py --input image.jpg --output result/
```

Output: - height raster; - visualization; - metadata JSON.

## Phase 2 --- DSM abstraction

Create: - `RelativeDSM`; - `MetricDSM`; - common raster interface; -
GeoTIFF exporter.

The output type must explicitly state whether it is relative or metric.

## Phase 3 --- Geospatial metadata

Implement: - GeoTIFF read; - CRS/transform extraction; - metadata
preservation; - output GeoTIFF writing.

Do not calibrate automatically until the calibration experiment is
validated.

## Phase 4 --- Calibration module

Create an interface:

``` python
calibrator.fit(relative_height, reference, metadata)
calibrator.transform(relative_height)
```

Initial candidates: - scene-level scaling; - scale + offset; - robust
fitting; - DEM-informed calibration; - GCP-informed calibration.

Benchmark them before selecting the default.

## Phase 5 --- Shadow cross-check

Implement a small, modular prototype: 1. identify candidate shadows; 2.
estimate solar geometry; 3. estimate physical height; 4. compare against
learned height; 5. generate disagreement map.

Do not let a failed shadow check break the main pipeline.

## Phase 6 --- 3D viewer

Build: - Three.js scene; - DSM → geometry; - RGB texture; - camera
controls; - first-person navigation; - orbit fallback; - vertical
exaggeration control.

Target initial resolution: - 256×256 or 512×512 for interactive demo.

## Phase 7 --- Analysis tools

Add: - point/raycast selection; - height readout; - slope calculation; -
reference comparison where available; - confidence/disagreement overlay.

## Phase 8 --- Backend

Create FastAPI endpoints from `api_contract.md`.

Keep backend modules independent from HTTP.

## Phase 9 --- Frontend integration

UI should have: - upload; - input-type/status indicator; - processing
progress; - 3D viewport; - layer controls; - height/slope probe; -
export buttons.

## Phase 10 --- Standalone deployment

Create: - one launcher; - bundled frontend; - backend startup; - local
model loading; - test data; - deployment README.

## Phase 11 --- Testing

Test: - PNG; - JPG; - GeoTIFF; - GeoTIFF without CRS; - invalid image; -
oversized image; - no-shadow scene; - shadow scene; - DEM unavailable; -
calibration failure; - model load failure.

## Scope control

### Must ship

-   DA-V2 inference;
-   GAMUS-trained checkpoint;
-   PNG/JPG relative output;
-   GeoTIFF metadata path;
-   DSM;
-   Three.js 3D viewer;
-   navigation;
-   height probe;
-   slope;
-   unified upload-to-view flow.

### Strong target

-   DEM/GCP calibration;
-   shadow cross-check;
-   disagreement/reliability overlay;
-   GeoTIFF metric export.

### Stretch

-   satellite-domain training/validation;
-   ONNX optimization;
-   desktop executable wrapper;
-   tiled large-area processing;
-   advanced semantic post-processing.

Never sacrifice the complete core workflow to add a stretch feature.
