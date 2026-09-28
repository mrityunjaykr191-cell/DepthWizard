# DepthWizard --- Data, Calibration and Validation

## 1. Dataset roles

### GAMUS

Primary current training dataset.

Use for: - domain adaptation; - RGB → AGL learning; - initial
validation.

Do not describe GAMUS as satellite data.

### Additional satellite validation

The project should add a genuine satellite-domain dataset when
practical.

Purpose: - test domain transfer; - test georeferenced branch; - reduce
the risk of presenting aerial-only validation as satellite validation.

Dataset selection must be recorded with license/source information.

## 2. Data split policy

Avoid random leakage between spatially related tiles.

Prefer: - geographic separation where possible; - held-out
locations/cities; - clear train/validation/test definitions.

Report: - number of tiles; - source regions; - resolution/GSD; - target
type; - train/validation/test split.

## 3. Calibration problem

Depth Anything V2 produces a scale-ambiguous representation. DepthWizard
must distinguish:

``` text
relative geometry
       ↓
scale/elevation anchoring
       ↓
metric elevation
```

Potential reference sources: - lower-resolution DEM such as SRTM; -
appropriate ISRO/NRSC DEM; - limited GCPs.

The calibration module should be treated as an experiment-driven
component.

## 4. Calibration evaluation

For every calibration method, compare: - MAE; - RMSE; - bias; -
correlation; - performance by height range.

Do not select a method only because it improves visual appearance.

## 5. Shadow verification

Physical cue:

``` text
object height ≈ shadow length × tan(solar elevation)
```

The exact implementation must account for: - solar position; - image
geometry; - shadow/object correspondence; - overlapping shadows; -
occlusion; - small/near-noon shadows; - unreliable shadow segmentation.

The module should return "unavailable/unreliable" when conditions are
insufficient.

## 6. Confidence/reliability

The simplest prototype confidence mechanism is disagreement:

``` text
disagreement = |learned_height - physical_height|
```

Large disagreement can be flagged for inspection.

This is a **reliability indicator**, not a statistically calibrated
probability.

## 7. Metrics

Required core metrics: - MAE; - RMSE; - correlation.

Recommended additional analysis: - mean signed error/bias; - median
absolute error; - height-bin MAE; - per-scene MAE; - failure rate; -
runtime.

## 8. Visualization validation

Check: - RGB-to-mesh texture alignment; - obvious mesh artifacts; -
correct vertical orientation; - height readout consistency; - slope
calculation consistency; - stable navigation; - acceptable rendering
performance.

## 9. Output validation

For GeoTIFF: - CRS is present; - transform is present; - dimensions
match intended output; - nodata handling is explicit; - units are
documented; - pixel values are finite.

For PNG/JPG: - output is explicitly marked relative; - no fake
geographic metadata is added.

## 10. Reproducibility record

Every reported experiment should record: - code version; - model
checkpoint; - dataset version; - split; - preprocessing; - target
representation; - loss; - optimizer; - epochs; - hardware; - metrics.
