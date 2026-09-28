# DepthWizard --- ML Pipeline Specification

## 1. Goal

Convert a single overhead optical RGB image into a dense remote-sensing
height representation using a pretrained monocular depth foundation
model adapted to remote-sensing height data.

## 2. Current model

Current experimental implementation:

-   Depth Anything V2 Small;
-   Hugging Face Transformers implementation;
-   DINOv2 backbone frozen;
-   decoder-side components trainable;
-   GAMUS RGB + AGL training pairs.

The deployment model must be exported/saved in a form that can be loaded
without the training notebook.

## 3. Training data

### Primary current dataset: GAMUS

Current training base: - aerial RGB; - AGL height target; -
remote-sensing overhead imagery; - paired training data.

GAMUS is the official recommended dataset in the SIH material, but it
should not be described as satellite imagery. It is the current aerial
training base.

### Future/additional data

The training pipeline should support adding additional aerial/satellite
datasets with: - RGB imagery; - height/DSM/nDSM targets; - appropriate
spatial metadata where available.

Dataset adapters should normalize all datasets into a common internal
sample contract.

## 4. Sample contract

``` text
Sample:
    image: uint8 [H,W,3]
    target_height: float32 [H,W]
    valid_mask: bool [H,W]
    metadata:
        dataset
        tile_id
        geospatial_info (optional)
```

## 5. Preprocessing

The training and inference preprocessing must remain consistent.

Required steps: 1. read RGB; 2. convert to RGB channel order; 3.
resize/crop according to model input configuration; 4. normalize using
model preprocessing; 5. preserve target/source geometry for resizing
prediction back.

## 6. Target representation

The current prototype uses AGL-like height targets.

The model output is treated as a height-like field after training.

Important: - distinguish **relative depth**, **AGL height**, **DSM
elevation**, and **nDSM** in code and documentation; - do not label
every output "absolute elevation."

## 7. Current loss experiment

Current experiment:

``` text
pred_log = log1p(clamp(pred, min=0))
target_log = log1p(clamp(target, min=0))
loss = L1(pred_log, target_log)
```

This is an experimental training choice, not a mandatory final
specification.

The training module should make loss selection configurable.

## 8. Validation

At minimum calculate: - MAE; - RMSE; - Pearson correlation where
meaningful; - Spearman correlation where useful; - bias/mean error; -
error by height bin; - per-tile metrics.

Evaluation should also examine: - urban; - sparse; - hilly; - forested
scenes; - tall structures.

## 9. Current prototype evidence

Current best result on the 150-train / 30-validation tile experiment: -
MAE ≈ 3.105 m; - RMSE ≈ 4.994 m.

This is not a final benchmark.

The model showed increasing negative bias at higher heights. This is one
reason the architecture contains a physical verification stage.

## 10. Inference API contract

Conceptual Python interface:

``` python
result = estimator.predict(
    image=image,
    mode="relative" | "metric",
    metadata=metadata,
)
```

Result:

``` text
HeightResult:
    height_field
    mode
    units
    valid_mask
    metadata
    model_version
```

Metric mode must not be returned unless the calibration module has a
valid reference/configuration.

## 11. Model versioning

Every model artifact should have: - model name; - architecture; -
checkpoint version; - training dataset/version; - training
configuration; - preprocessing configuration; - date; - git commit if
available.

Example:

``` text
models/
  depthwizard-dav2-small-gamus-v001/
    config.json
    model.safetensors
    preprocessing.json
    metadata.json
```

## 12. Model packaging

Preferred first implementation: - keep PyTorch/Transformers inference
inside the Python backend.

Optimization path: - ONNX or another inference format only after the
PyTorch pipeline is stable.

Do not optimize/export prematurely.

## 13. ML safety rails

The ML module must expose uncertainty/limitations at the application
level.

It must not: - fabricate geospatial coordinates; - fabricate metric
units; - silently calibrate against unrelated data; - silently clip
large heights to make visual output look better; - call a relative field
an absolute DSM.
