# DepthWizard --- API Contract

## 1. Purpose

This API connects the Three.js frontend to the Python processing
backend.

The API is designed around jobs because ML inference and geospatial
processing may take longer than a normal UI request.

## 2. Core endpoints

### `POST /api/jobs`

Upload an RGB image and create a processing job.

Input: - multipart file; - optional processing configuration.

Example configuration:

``` json
{
  "mode": "auto",
  "calibration": "auto",
  "shadow_check": true,
  "output_resolution": 512
}
```

Response:

``` json
{
  "job_id": "abc123",
  "status": "queued"
}
```

### `GET /api/jobs/{job_id}`

Returns job status.

``` json
{
  "job_id": "abc123",
  "status": "processing",
  "stage": "height_estimation",
  "progress": 0.55
}
```

Possible stages: - upload; - metadata; - preprocessing; -
height_estimation; - shadow_check; - calibration; - dsm; - mesh; -
ready; - error.

### `GET /api/jobs/{job_id}/result`

Returns result metadata.

``` json
{
  "job_id": "abc123",
  "mode": "metric",
  "units": "m",
  "has_georeference": true,
  "has_confidence": true,
  "height_raster": "/api/jobs/abc123/assets/height",
  "texture": "/api/jobs/abc123/assets/rgb",
  "dsm": "/api/jobs/abc123/assets/dsm",
  "mesh": "/api/jobs/abc123/assets/mesh"
}
```

### `GET /api/jobs/{job_id}/assets/{asset}`

Streams an output asset.

Supported assets: - `rgb`; - `height`; - `dsm`; - `confidence`; -
`mesh`; - `slope`.

### `POST /api/jobs/{job_id}/probe`

Returns the height/slope at a selected image/mesh coordinate.

Input:

``` json
{
  "x": 0.52,
  "y": 0.41
}
```

Response:

``` json
{
  "height": 18.4,
  "units": "m",
  "slope": 7.2,
  "slope_units": "degrees"
}
```

For relative outputs, the response must indicate that the height is
relative rather than metres.

### `GET /api/health`

Response:

``` json
{
  "status": "ok",
  "model_loaded": true,
  "version": "..."
}
```

## 3. Error contract

All errors should use a consistent structure:

``` json
{
  "error": {
    "code": "INVALID_GEOTIFF",
    "message": "The uploaded GeoTIFF does not contain a valid CRS."
  }
}
```

Suggested codes: - INVALID_FILE_TYPE; - CORRUPT_FILE; -
INVALID_GEOTIFF; - MODEL_LOAD_FAILED; - INFERENCE_FAILED; -
CALIBRATION_UNAVAILABLE; - CALIBRATION_FAILED; - SHADOW_CHECK_FAILED; -
DSM_EXPORT_FAILED; - VIEWER_ASSET_FAILED.

## 4. API principles

-   Never expose internal file-system paths unnecessarily.
-   Never return metric units for a relative result.
-   Never block the UI during long inference.
-   Keep processing logs server-side.
-   Allow the frontend to display meaningful stage progress.
