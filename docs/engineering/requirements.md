# DepthWizard --- System Requirements

## 1. Scope

DepthWizard is an end-to-end application for reconstructing elevation
information from **single-view overhead optical RGB remote-sensing
imagery** and presenting the result as an interactive 3D environment.

The system must satisfy the functional intent of SIH PS 26175 while
remaining modular enough to improve the ML model and calibration methods
independently.

## 2. Functional requirements

### FR-01 --- Image ingestion

The application shall accept: - PNG; - JPG/JPEG; - GeoTIFF/TIFF.

The upload layer shall identify whether geospatial metadata is
available.

### FR-02 --- Metadata inspection

For GeoTIFF input, the system shall inspect and preserve, where valid: -
CRS; - affine transform; - pixel resolution; - image dimensions; -
spatial bounds.

If metadata is missing or invalid, the system shall clearly mark the
input as non-georeferenced rather than silently inventing coordinates.

### FR-03 --- Preprocessing

The inference pipeline shall: - convert the image to the model's
expected channel/layout format; - resize/crop according to the model
configuration; - normalize using the model's preprocessing; - retain
enough information to map the prediction back to the source image
coordinates.

### FR-04 --- Height estimation

The system shall load a trained DepthWizard-compatible Depth Anything V2
checkpoint and generate a dense height/depth-derived field.

The model must be loaded for inference only in the deployment
application.

### FR-05 --- Non-georeferenced output

For PNG/JPG input: - generate a relative height field; - generate an
rDSM representation; - make the relative surface available to the 3D
viewer; - clearly label the result as relative when no metric reference
exists.

### FR-06 --- Georeferenced output

For GeoTIFF input: - use geospatial reference information; - run the
configured calibration/anchoring module when a supported DEM or GCP
reference is available; - produce metric elevation values; - export a
GeoTIFF DSM with appropriate geospatial metadata.

The calibration method must be replaceable without changing the ML or
viewer modules.

### FR-07 --- Physical cross-check

Where reliable shadow information and solar geometry are available, the
system shall: - estimate an independent height cue; - compare it with
the learned estimate; - expose the agreement/disagreement; - optionally
produce a confidence/reliability layer.

When shadows are unavailable or unreliable, the system shall skip this
step and continue.

### FR-08 --- DSM generation

The DSM module shall: - accept a dense height field; - retain source
dimensions/resolution as configured; - support relative and metric
modes; - provide a raster representation to downstream visualization and
export.

### FR-09 --- 3D reconstruction

The visualization module shall: - create a terrain/surface mesh from the
height field; - apply the original RGB imagery as a texture; - support
adjustable vertical exaggeration for visualization; - avoid implying
that unseen facade geometry has been reconstructed.

### FR-10 --- Navigation

The viewer shall provide: - first-person and/or orbit navigation; -
zoom/pan/rotation as appropriate; - stable rendering for the prototype
target resolution.

### FR-11 --- Height inspection

The user shall be able to select a point on the 3D surface and obtain
its estimated elevation/height value.

### FR-12 --- Slope analysis

The viewer shall expose a slope estimate from the local DSM surface.

### FR-13 --- Validation

Where reference data is available, the application should support: -
estimated vs reference height at selected locations; - absolute error; -
optional visual comparison/overlay.

### FR-14 --- Unified workflow

The user workflow shall be:

**Launch → Upload → Process → View → Inspect → Export**

The user should not need to interact with the training environment.

### FR-15 --- Export

The system should support: - DSM GeoTIFF export for georeferenced
results; - relative height export for non-georeferenced results; -
optional PNG/visualization export; - optional mesh export if useful for
the prototype.

## 3. Non-functional requirements

### NFR-01 --- Modularity

ML inference, calibration, shadow verification, raster processing, API,
and visualization shall be separable modules.

### NFR-02 --- Reproducibility

Model version, configuration, input mode, calibration mode, and
processing parameters shall be recorded.

### NFR-03 --- Error handling

Invalid file types, corrupted GeoTIFFs, missing CRS, unsupported
metadata, model-loading errors, and oversized inputs must produce
understandable errors.

### NFR-04 --- Performance

The viewer should remain interactive after the height field has been
generated.

For the prototype, downsampling to approximately 256×256 or 512×512 for
interactive rendering is acceptable.

### NFR-05 --- Deployment

The final prototype target is a single user-facing application that
packages the frontend and inference/backend components together.

### NFR-06 --- Security

No user-uploaded data should be sent to third-party services by default
in the final local deployment.

### NFR-07 --- Maintainability

New model checkpoints and calibration algorithms should be addable
without rewriting the viewer.

## 4. Explicit non-requirements

The first prototype does NOT require: - training inside the deployed
application; - full 80 GB GAMUS download; - real-time model inference
while flying; - photorealistic building facades; - nationwide-scale
tiled processing; - a mobile/offline field application; - guaranteed
metric accuracy without a valid geospatial reference.

## 5. Acceptance criteria for the prototype

A prototype is considered end-to-end functional when a user can:

1.  launch the application;
2.  upload a supported RGB image;
3.  receive a height output;
4.  view the height as a 3D textured surface;
5.  navigate the scene;
6.  inspect at least one height value;
7.  inspect slope;
8.  export the generated DSM or height representation;
9.  complete the workflow without opening the training notebook.
