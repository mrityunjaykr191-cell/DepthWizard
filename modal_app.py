import modal

# ---------------------------------------------------------
# DepthWizard — Modal production backend
# ---------------------------------------------------------

app = modal.App("depthwizard-backend")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi==0.135.1",
        "uvicorn",
        "numpy==2.4.3",
        "scipy",
        "pillow==12.1.1",
        "rasterio==1.4.4",
        "pyproj",
        "affine",
        "pydantic",
        "torch==2.14.0",
        "transformers==5.17.0",
        "huggingface_hub==1.7.1",
        "reportlab",
        "PyMuPDF",
        "python-multipart",
    )
    .env(
        {
            # Force production to use the trained model.
            "DEPTH_MODEL_PROVIDER": "da2_fine_tuned",
            "DEPTH_MODEL_CHECKPOINT": "backend/checkpoints/da2_finetuned.pth",
            "DEPTH_DEVICE": "cpu",

            # HF checkpoint fallback + integrity verification.
            "HF_SPACE_REPO_ID": "Mrityunjaykkk/depthwizardV1",
            "HF_SPACE_REPO_TYPE": "space",
            "HF_SPACE_FILENAME": "da2_finetuned.pth",
            "DA2_FINETUNED_SHA256": (
                "99b40ca7f77573544d1d4ab93be8840573d0eaf8c3fb0d7320158a2820579c07"
            ),

            "PYTHONPATH": "/root",
        }
    )
    .add_local_dir(
        "backend",
        "/root/backend",
    )
)


@app.function(
    image=image,
    cpu=2,
    memory=4096,
    min_containers=0,
    max_containers=1,
    timeout=600,
)
@modal.asgi_app()
def fastapi_app():
    from backend.app import app as fastapi_app
    return fastapi_app
