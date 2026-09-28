# DepthWizard — ML Integration

**Role:** ML integration boundary  
**Status:** Working source of truth

---

# 1. Principle

DepthWizard should treat the ML model as one component in the terrain reconstruction pipeline.

```text
RGB imagery
    ↓
ML depth estimation
    ↓
Depth / relative elevation representation
    ↓
Calibration
    ↓
Terrain products
    ↓
Analysis
```

The UI should not depend on the internal architecture of the model.

---

# 2. Current Model Direction

The current development direction is based on **Depth Anything V2** fine-tuned for the project's terrain/elevation task.

The exact checkpoint and training configuration remain implementation/training concerns.

---

# 3. Model Adapter

Use an adapter boundary:

```text
DepthModel
   ↓
predict(image)
   ↓
DepthResult
```

This makes the rest of the system independent of a specific model implementation.

---

# 4. Input Contract

The model adapter should receive normalized image data.

Preprocessing may include:

- resizing,
- normalization,
- channel handling,
- batching.

The adapter owns model-specific preprocessing.

---

# 5. Output Contract

The model adapter should return enough information to construct the internal elevation result.

Conceptually:

```text
depth_map
scale state
model metadata
inference metadata
```

The final product contract should not expose raw model details unless useful.

---

# 6. Relative Depth vs Elevation

A monocular depth model does not automatically provide absolute terrain elevation.

Therefore:

```text
model output
    ↓
relative depth/elevation
    ↓
calibration
    ↓
metric elevation when justified
```

This distinction must remain visible throughout the system.

---

# 7. Calibration Boundary

Calibration should be independent of the neural network.

This allows:

```text
same model output
+
different legitimate scale reference
```

without retraining the model.

Potential calibration references:

- coarse DEM,
- GCPs,
- other validated scale information.

---

# 8. Model Versioning

Each processed result should be traceable to the model version/checkpoint used.

Potential metadata:

```text
model_name
model_version
checkpoint_id
inference_config
```

---

# 9. Training vs Inference

Training code should remain separate from production inference.

Conceptual:

```text
training/
    dataset
    augmentation
    training
    evaluation
    checkpoints

inference/
    model_loader
    preprocessing
    inference
    postprocessing
```

---

# 10. Evaluation

Model evaluation should remain independent from frontend UX.

Important metrics may include:

```text
RMSE
MAE
Correlation
```

Dataset-level evaluation and per-result validation are related but should not be conflated.

---

# 11. Failure Handling

The adapter should produce structured failures for:

- missing checkpoint,
- incompatible image,
- GPU/runtime error,
- memory failure,
- invalid tensor shape.

The API converts these into user-readable processing errors.

---

# 12. Performance

Inference should support:

- CPU fallback where practical,
- GPU acceleration when available,
- appropriate image tiling/resolution strategies for large inputs,
- caching where repeated inference is unnecessary.

Actual deployment constraints determine the final strategy.

---

# 13. ML Non-Goals

Do not force the model to directly predict:

- slope,
- reports,
- route decisions,
- validation metrics,
- UI state.

These are downstream products of the elevation representation.

---

# 14. Replaceability

The architecture should allow future replacement of the model:

```text
Depth Anything V2
       ↓
     adapter
       ↓
Terrain pipeline
```

A future model should be replaceable without redesigning the frontend or report system.
