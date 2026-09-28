"""
DepthWizard — Backend Entrypoint
Run with: python -m backend.main
"""

import uvicorn
from backend.config import HOST, PORT

if __name__ == "__main__":
    print(f"Starting DepthWizard Depth Backend on http://{HOST}:{PORT}")
    uvicorn.run("backend.app:app", host=HOST, port=PORT, reload=False)
