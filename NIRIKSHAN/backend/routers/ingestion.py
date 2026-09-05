"""
Real ingestion pipeline for MPLADS CSV/JSON data.

Expected CSV columns:
  work_code, project_name, category, state, district, vendor_name,
  sanctioned_amount, expenditure, completion_pct, latitude, longitude,
  sanction_date (YYYY-MM-DD), status

Optional columns:
  constituency, executing_agency, item_name, item_category,
  item_quantity, item_unit, item_unit_price
"""
import csv
import io
import json
import datetime
import os
import re
import math
from services.prototype_scoring import score_work

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models.entities import (
    State, District, Vendor, Work, WorkItem, WorkPhoto,
    RiskAssessment, ReviewCase, AuditEvent, IngestionRun
)
from analytics import (
    price_engine, iqr_engine, benford_engine,
    hhi_engine, composite_scorer
)
from config import settings

router = APIRouter(prefix="/api/ingestion", tags=["Data Ingestion"])

# ── Maximum upload size guard ─────────────────────────────────────────────────
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # bytes
ALLOWED_EXTENSIONS = {".csv", ".json"}


def _validate_file(filename: str, contents: bytes):
    ext = os.path.splitext(filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Only .csv and .json are accepted.")
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB upload limit.")


def _escape_search(term: str) -> str:
    """Escape % and _ for ilike queries to prevent pattern injection."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _get_or_create_state(db: Session, name: str) -> State:
    name = name.strip().title()
    state = db.query(State).filter(State.name == name).first()
    if not state:
        code = "".join(w[0] for w in name.split())[:3].upper()
        state = State(name=name, code=code)
        db.add(state)
        db.flush()
    return state


def _get_or_create_district(db: Session, name: str, state: State) -> District:
    name = name.strip().title()
    district = db.query(District).filter(
        District.name == name,
        District.state_id == state.id
    ).first()
    if not district:
        district = District(name=name, state_id=state.id)
        db.add(district)
        db.flush()
    return district


def _get_or_create_vendor(db: Session, name: str) -> Vendor:
    name = name.strip()
    vendor = db.query(Vendor).filter(
        Vendor.name.ilike(f"%{_escape_search(name)}%", escape="\\")
    ).first()
    if not vendor:
        vendor = Vendor(name=name)
        db.add(vendor)
        db.flush()
    return vendor


def _parse_date(s: str) -> datetime.datetime:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(s.strip(), fmt)
        except (ValueError, AttributeError):
            pass
    return datetime.datetime.now(datetime.UTC)


def _parse_float(s, default=0.0) -> float:
    try:
        return float(str(s).replace(",", "").strip())
    except (ValueError, TypeError):
        return default


def _process_work_row(row: dict, db: Session, log_lines: list, errors: list, warnings: list) -> bool:
    """
    Processes a single work row dict.
    Returns True if successfully created, False if skipped.
    """
    if not isinstance(row, dict):
        raise ValueError("Each row must be an object")
    required = ("work_code", "project_name", "state", "district", "vendor_name", "sanctioned_amount", "expenditure")
    missing = [key for key in required if not str(row.get(key, "") or "").strip()]
    if missing:
        raise ValueError("Missing fields: " + ", ".join(missing))
    for key in ("sanctioned_amount", "expenditure", "completion_pct", "item_quantity", "item_unit_price", "latitude", "longitude"):
        if row.get(key) not in (None, ""):
            value = float(str(row[key]).replace(",", ""))
            if not math.isfinite(value) or (key not in ("latitude", "longitude") and value < 0):
                raise ValueError(key + " must be a finite valid number")
            if key == "completion_pct" and value > 100:
                raise ValueError("completion_pct must be between 0 and 100")
            if key == "latitude" and not -90 <= value <= 90:
                raise ValueError("latitude out of range")
            if key == "longitude" and not -180 <= value <= 180:
                raise ValueError("longitude out of range")
    work_code = row.get("work_code", "").strip()
    if not work_code:
        work_code = f"UPLOAD-{datetime.datetime.now(datetime.UTC).strftime('%Y%m%d%H%M%S%f')[:18]}"

    # Skip duplicates
    if db.query(Work).filter(Work.work_code == work_code).first():
        warnings.append(f"Skipped duplicate work_code: {work_code}")
        return False

    project_name = row.get("project_name", row.get("name", "Unnamed Work")).strip()
    category = row.get("category", "Infrastructure").strip()
    status = row.get("status", "Work in Progress").strip()

    state = _get_or_create_state(db, row.get("state", "Unknown State"))
    district = _get_or_create_district(db, row.get("district", "Unknown District"), state)
    vendor = _get_or_create_vendor(db, row.get("vendor_name", row.get("vendor", "Unknown Vendor")))

    sanctioned = _parse_float(row.get("sanctioned_amount", row.get("sanctioned", 0)))
    expenditure = _parse_float(row.get("expenditure", 0))
    completion_pct = _parse_float(row.get("completion_pct", row.get("completion", 0)))
    lat = _parse_float(row.get("latitude", row.get("lat", 20.5937)), 20.5937)
    lon = _parse_float(row.get("longitude", row.get("lon", 78.9629)), 78.9629)
    sanction_date = _parse_date(row.get("sanction_date", ""))
    utilization_pct = (expenditure / sanctioned * 100) if sanctioned > 0 else 0.0

    work = Work(
        work_code=work_code,
        project_name=project_name,
        category=category,
        state_id=state.id,
        district_id=district.id,
        vendor_id=vendor.id,
        sanctioned_amount=sanctioned,
        expenditure=expenditure,
        utilization_pct=round(utilization_pct, 2),
        completion_pct=completion_pct,
        sanction_date=sanction_date,
        status=status,
        latitude=lat,
        longitude=lon,
        executing_agency=row.get("executing_agency", "District Rural Development Agency"),
    )
    db.add(work)
    db.flush()

    # Work items (optional)
    items = []
    if row.get("item_name"):
        item = WorkItem(
            work_id=work.id,
            item_name=row["item_name"].strip(),
            category=row.get("item_category", "Movable Goods"),
            quantity=_parse_float(row.get("item_quantity", 1), 1.0),
            unit=row.get("item_unit", "Each"),
            unit_price=_parse_float(row.get("item_unit_price", 0)),
            total_amount=_parse_float(row.get("item_unit_price", 0)) * _parse_float(row.get("item_quantity", 1), 1),
        )
        db.add(item)
        db.flush()
        items.append(item)

    # A CSV row has no site photograph. Do not manufacture forensic evidence.
    result = score_work(work, db)

    log_lines.append(f"[OK] Processed {work_code} — risk: {result['risk_level']} ({result['composite_score']})")
    return True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sources")
def get_ingestion_sources(db: Session = Depends(get_db)):
    """Returns live ingestion connector status from actual IngestionRun records."""
    from sqlalchemy import func
    latest = {}
    for run in db.query(IngestionRun).order_by(IngestionRun.timestamp.desc()).limit(50).all():
        key = run.source_dataset.split("(")[0].strip()
        if key not in latest:
            latest[key] = run

    sources = [
        {"id": "esakshi",   "name": "eSAKSHI Data",       "icon": "cloud"},
        {"id": "datagovin", "name": "data.gov.in",         "icon": "landmark"},
        {"id": "gem",       "name": "GeM Reference Data",  "icon": "shopping-cart"},
        {"id": "photos",    "name": "Geo-tagged Photos",   "icon": "camera"},
    ]
    runs = db.query(IngestionRun).order_by(IngestionRun.timestamp.desc()).limit(4).all()
    for i, run in enumerate(runs):
        if i < len(sources):
            sources[i]["status"] = run.status
            sources[i]["last_sync"] = run.timestamp.strftime("%Y-%m-%d %H:%M")
            sources[i]["records_imported"] = run.records_imported

    return {"sources": sources}


@router.get("/logs")
def get_ingestion_logs(db: Session = Depends(get_db)):
    """Returns batch processing logs from the IngestionRun table."""
    runs = db.query(IngestionRun).order_by(IngestionRun.timestamp.desc()).limit(50).all()
    return {
        "logs": [
            {
                "id": r.id,
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "dataset": r.source_dataset,
                "records": r.records_imported,
                "status": r.status,
                "errors": r.errors_count,
                "warnings": r.warnings_count,
                "log_text": r.log_text,
            }
            for r in runs
        ]
    }


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_type: str = Form("eSAKSHI CSV"),
    db: Session = Depends(get_db),
):
    """
    Real ingestion endpoint.
    Parses CSV/JSON, creates Work + WorkItem records, runs all 5 detection engines,
    stores RiskAssessments and ReviewCases for high/medium risk works.

    Expected CSV columns: work_code, project_name, category, state, district,
    vendor_name, sanctioned_amount, expenditure, completion_pct,
    latitude, longitude, sanction_date, status
    """
    contents = await file.read()
    _validate_file(file.filename, contents)

    try:
        text_content = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "Use a UTF-8 CSV or JSON file.")
    log_lines, errors, warnings = [], [], []
    created_count = 0

    try:
        ext = os.path.splitext(file.filename or "")[-1].lower()

        if ext == ".json":
            raw = json.loads(text_content)
            rows = raw if isinstance(raw, list) else raw.get("works", raw.get("data", [raw]))
        else:
            reader = csv.DictReader(io.StringIO(text_content))
            rows = list(reader)

        if not rows:
            raise HTTPException(400, "File contains no data rows.")

        log_lines.append(f"[START] Parsing '{file.filename}' — {len(rows)} rows found.")

        for row in rows:
            try:
                with db.begin_nested():
                    ok = _process_work_row(row, db, log_lines, errors, warnings)
                if ok:
                    created_count += 1
            except Exception as row_err:
                errors.append(f"Row error: {str(row_err)[:200]}")
                # Nested transaction rolls back only the failing row.

        db.commit()

        # Create AuditEvent
        audit = AuditEvent(
            actor_name="Data Engineer",
            actor_role="System",
            action="Dataset uploaded and processed",
            details=f"File '{file.filename}' ({dataset_type}): {created_count} works created, {len(errors)} errors, {len(warnings)} warnings.",
            new_state="Imported",
        )
        db.add(audit)

        run = IngestionRun(
            source_dataset=f"{dataset_type} ({file.filename})",
            records_imported=created_count,
            status="Completed" if not errors else "Completed with Errors",
            errors_count=len(errors),
            warnings_count=len(warnings),
            log_text="\n".join(log_lines[-50:] + errors[:20] + warnings[:20]),
        )
        db.add(run)
        db.commit()

    except HTTPException:
        raise
    except (json.JSONDecodeError, AttributeError, TypeError) as e:
        db.rollback()
        raise HTTPException(400, f"Invalid dataset: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ingestion failed: {str(e)}")

    return {
        "success": True,
        "filename": file.filename,
        "records_imported": created_count,
        "skipped": len(warnings),
        "errors": len(errors),
        "status": "Completed" if not errors else "Completed with Errors",
        "message": (
            f"Ingestion complete. {created_count} works created and scored. "
            f"{len(warnings)} duplicates skipped. {len(errors)} row-level errors."
        ),
    }


@router.post("/normalize")
def trigger_normalization(db: Session = Depends(get_db)):
    """Recalculates item categories and text normalization for un-categorized items."""
    from models.entities import WorkItem
    updated = 0
    for item in db.query(WorkItem).filter(WorkItem.category == "").all():
        name_lc = item.item_name.lower()
        if any(k in name_lc for k in ["cement", "steel", "brick", "sand", "aggregate"]):
            item.category = "Civil Materials"
        elif any(k in name_lc for k in ["pipe", "pump", "valve", "motor"]):
            item.category = "Equipment"
        elif any(k in name_lc for k in ["labour", "wages", "manpower"]):
            item.category = "Services"
        else:
            item.category = "Movable Goods"
        updated += 1
    db.commit()
    return {
        "success": True,
        "stage": "Categorization & NLP Extraction",
        "items_normalized": updated,
        "message": f"Category normalization applied to {updated} work items.",
    }


@router.post("/analyze")
def trigger_anomaly_analysis(db: Session = Depends(get_db)):
    """
    Recalculates composite risk scores across ALL works in the database.
    Useful after bulk imports or when engine weights change.
    """
    from models.entities import RiskAssessment, ReviewCase
    works = db.query(Work).all()
    rescored = 0
    errors = []
    for work in works:
        try:
            with db.begin_nested():
                score_work(work, db)
            rescored += 1
        except Exception as exc:
            errors.append(f"{work.work_code}: {exc}")

    db.commit()

    audit = AuditEvent(
        actor_name="System",
        actor_role="System",
        action="Batch Risk Recalculation",
        details=f"Recalculated multi-signal scores across {rescored} works.",
        new_state="Completed",
    )
    db.add(audit)
    db.commit()

    high_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "HIGH").count()

    return {
        "success": not errors,
        "stage": "Multi-Signal Detection Completed",
        "works_scored": rescored,
        "errors": errors,
        "high_risk_flagged": high_risk,
        "message": f"Price, IQR, Benford and HHI recalculated; existing demo photo evidence retained for {rescored} works.",
    }
