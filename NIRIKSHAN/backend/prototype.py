"""Local presentation entry point: original API and compiled React UI on one port."""
from pathlib import Path
import json
from fastapi import HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session
from main import app
from database import get_db
from models.entities import Work, AuditEvent
from analytics import composite_scorer
from config import settings

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "NIRIKSHAN" / "frontend" / "dist"
WEIGHTS_PATH = Path(settings.SQLITE_FALLBACK_URL.removeprefix("sqlite:///")).resolve().parent / "weights.json"
KEYS = ("price", "iqr", "benford", "hhi", "photo")

def apply_weights(weights):
    for key in KEYS:
        setattr(composite_scorer, "w_" + key, weights[key] / 100)

if WEIGHTS_PATH.exists():
    apply_weights(json.loads(WEIGHTS_PATH.read_text()))

@app.get("/api/prototype")
def prototype_status(db: Session = Depends(get_db)):
    count = db.query(Work).count()
    return {"mode": "local-prototype", "project_root": str(ROOT), "works": count,
            "ready": count > 0,
            "data": "Official MPLADS MP summary plus synthetic work-level investigation fixtures"}

class Weights(BaseModel):
    price: int = Field(ge=0, le=100)
    iqr: int = Field(ge=0, le=100)
    benford: int = Field(ge=0, le=100)
    hhi: int = Field(ge=0, le=100)
    photo: int = Field(ge=0, le=100)
    @model_validator(mode="after")
    def balanced(self):
        if sum(getattr(self, key) for key in KEYS) != 100:
            raise ValueError("Engine weights must sum to 100")
        return self

@app.get("/api/settings/weights")
def get_weights():
    return {key: round(getattr(composite_scorer, "w_" + key) * 100) for key in KEYS}

@app.put("/api/settings/weights")
def save_weights(payload: Weights, db: Session = Depends(get_db)):
    values = payload.model_dump()
    WEIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp = WEIGHTS_PATH.with_suffix(".tmp")
    temp.write_text(json.dumps(values))
    temp.replace(WEIGHTS_PATH)
    apply_weights(values)
    db.add(AuditEvent(actor_name="Demo Administrator", actor_role="Administrator",
                      action="Engine weights updated", details=json.dumps(values), new_state="Saved"))
    db.commit()
    return {"success": True, "weights": values}

@app.get("/api/prototype/sample.csv")
def sample_upload():
    return FileResponse(ROOT / "samples" / "demo-works.csv", filename="demo-works.csv", media_type="text/csv")

if DIST.exists():
    class ReactFiles(StaticFiles):
        async def get_response(self, path, scope):
            if path.replace("\\", "/").lstrip("/").startswith(("api/", "docs", "openapi")):
                raise HTTPException(404, "Endpoint not found")
            try:
                return await super().get_response(path, scope)
            except StarletteHTTPException as exc:
                if exc.status_code != 404 or "." in Path(path).name:
                    raise
                return await super().get_response("index.html", scope)
    # Replace the upstream JSON root with the React entry page.
    app.router.routes[:] = [r for r in app.router.routes if getattr(r, "path", None) != "/"]
    app.mount("/", ReactFiles(directory=DIST, html=True), name="prototype-ui")
