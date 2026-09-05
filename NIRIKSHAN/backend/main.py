import os
from contextlib import asynccontextmanager
from datetime import datetime, UTC
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from config import settings
from database import engine, Base, get_db
from services.seeder import seed_database

# Routers
from routers.dashboard import router as dashboard_router
from routers.works import router as works_router
from routers.evidence import router as evidence_router
from routers.reviews import router as reviews_router
from routers.geo import router as geo_router
from routers.prices import router as prices_router
from routers.duplicates import router as duplicates_router
from routers.reports import router as reports_router
from routers.audit import router as audit_router
from routers.ingestion import router as ingestion_router
from routers.risk_analysis import router as risk_analysis_router
from routers.filters import router as filters_router
from routers.auth import router as auth_router
from routers.official_data import router as official_data_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed demo data
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    # Shutdown

app = FastAPI(
    title="NIRIKSHAN API",
    description="MPLADS Intelligence & Risk Monitoring Backend API — Smart India Hackathon (SIH26102)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration — allow configured origins plus any onrender.com deployment domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard_router)
app.include_router(works_router)
app.include_router(evidence_router)
app.include_router(reviews_router)
app.include_router(geo_router)
app.include_router(prices_router)
app.include_router(duplicates_router)
app.include_router(reports_router)
app.include_router(audit_router)
app.include_router(ingestion_router)
app.include_router(risk_analysis_router)
app.include_router(filters_router)
app.include_router(auth_router)
app.include_router(official_data_router)

@app.get("/")
def root():
    return {
        "platform": "NIRIKSHAN",
        "subtitle": "MPLADS Intelligence & Risk Monitoring",
        "status": "Operational",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    """
    Real health check — actually probes the database connection and reports
    engine status based on whether required tables exist.
    """
    db_status = "disconnected"
    db_error = None
    engines_ready = False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
        engines_ready = True
    except OperationalError as e:
        db_status = "disconnected"
        db_error = str(e)

    status = "healthy" if db_status == "connected" else "degraded"

    response = {
        "status": status,
        "timestamp": datetime.now(UTC).isoformat(),
        "database": db_status,
        "detection_engines": {
            "price_benchmarking": "ready" if engines_ready else "unavailable",
            "iqr_outliers": "ready" if engines_ready else "unavailable",
            "benfords_law": "ready" if engines_ready else "unavailable",
            "vendor_hhi": "ready" if engines_ready else "unavailable",
            "duplicate_forensics": "ready" if engines_ready else "unavailable",
        }
    }
    if db_error:
        response["database_error"] = db_error

    return response

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("main:app", host=settings.HOST, port=port, reload=settings.DEBUG)
