from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.logging_setup import setup_logging
from app.middleware.audit import ClinicalAuditMiddleware
from app.routers import analytics, auth, geofence, reminiscence, sync

settings = get_settings()
setup_logging(settings)

app = FastAPI(
    title="Sahāy API",
    description="AI Dementia Therapeutic Platform backend",
    version="0.2.0",
)

origins = settings.cors_origins
# When using wildcard origins, credentials cannot be set (browsers reject
# Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true).
# The mobile and web clients use plain fetch without credentials, so this is safe.
allow_credentials = "*" not in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ClinicalAuditMiddleware)

app.include_router(auth.router)
app.include_router(sync.router)
app.include_router(reminiscence.router)
app.include_router(geofence.router)
app.include_router(analytics.router)

# Local mock storage for uploaded reminiscence media (dev/test only).
# In production `use_local_storage=false` routes to S3 instead.
_uploads_dir = Path(settings.local_upload_dir)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
