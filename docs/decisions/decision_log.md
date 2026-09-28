# DepthWizard --- Architecture Decision Log

This file exists to prevent architecture drift and repeated redesign.

## D-001 --- Input terminology

**Decision:** Use "single-view overhead optical RGB imagery" as the
umbrella input term.

Reason: - matches the PS more precisely than generic "image"; - covers
aerial/satellite overhead imagery; - avoids implying arbitrary
photographs.

## D-002 --- Model

**Decision:** Depth Anything V2 is the current backbone.

Current prototype: - Small; - Hugging Face Transformers; - decoder-side
fine-tuning; - frozen DINOv2 backbone.

Do not replace the backbone without an evidence-based reason.

## D-003 --- Current training dataset

**Decision:** GAMUS is the current training base.

Important: - GAMUS is aerial/UAS data; - it is not evidence of satellite
generalization by itself.

## D-004 --- Physical cross-check

**Decision:** Shadow geometry is an independent verification cue, not a
replacement for the ML model.

It is optional when reliable shadows exist.

## D-005 --- Confidence

**Decision:** For the prototype, confidence may be represented as
disagreement between learned and physical estimates.

Do not call this a calibrated probability.

## D-006 --- Geospatial calibration

**Decision:** Calibration remains modular.

The PS permits DEM/GCP-based mapping. No single calibration algorithm is
permanently locked until experiments establish which method works.

## D-007 --- Visualization

**Decision:** Three.js is the preferred viewer technology.

The intended scene is: - DSM-derived surface; - original RGB texture; -
interactive camera/navigation; - height/slope inspection.

## D-008 --- Deployment

**Decision:** Training and deployment are separate.

Kaggle/Colab is not the product.

The product is a local/unified application that loads saved model
weights.

## D-009 --- Claims

**Decision:** Never claim implemented features as completed before
testing them.

Use status labels: - DONE; - IN PROGRESS; - TARGET; - FUTURE.

## D-010 --- PPT architecture

**Decision:** Slide 2 explains WHAT and WHY.

Slide 3 explains HOW.

Slide 4 proves WHETHER IT WORKS.

Do not move detailed implementation trivia into Slide 2 just to fill
space.
