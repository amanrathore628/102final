"""Prototype reports: scoped data, persisted snapshots and real CSV/JSON/PDF downloads."""
import csv
import datetime
import io
import json
import re
from urllib.parse import urlencode
from html import escape
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import Session
from database import Base, get_db
from models.entities import Work, RiskAssessment, AuditEvent, DuplicatePair, ReferencePrice, ReviewCase
router = APIRouter(prefix="/api/reports", tags=["Reports"])

class GeneratedReport(Base):
    __tablename__ = "prototype_reports"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    format = Column(String)
    rows = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))

class ReportGenerateRequest(BaseModel):
    report_type: str
    format: str = "CSV"
    state: str | None = None
    district: str | None = None
    financial_year: str = "Demo portfolio"
    date_range: str | None = None

@router.get("/types")
def get_report_types():
    return {"types": [
        {"id": "portfolio", "name": "PORTFOLIO REPORT", "description": "Works, expenditure, utilization and risk across constituencies.", "icon": "briefcase"},
        {"id": "risk", "name": "RISK REPORT", "description": "High-risk works and the five analytical signal scores.", "icon": "alert-triangle"},
        {"id": "vendor", "name": "VENDOR REPORT", "description": "Contractor expenditure, work counts and risk.", "icon": "building"},
        {"id": "district", "name": "DISTRICT REPORT", "description": "District implementation and expenditure summary.", "icon": "map-pin"},
        {"id": "audit", "name": "AUDIT REPORT", "description": "Recorded reviewer actions and justification comments.", "icon": "clock"},
    ]}

def report_rows(kind, db, state=None, district=None, search=None, risk=None, category=None,
                status=None, vendor=None, since=None):
    query = db.query(Work)
    if state and state != "All India": query = query.filter(Work.state.has(name=state))
    if district and district != "All Districts": query = query.filter(Work.district.has(name=district))
    if category and category != "All Categories": query = query.filter(Work.category == category)
    if vendor and vendor != "All Vendors": query = query.filter(Work.vendor.has(name=vendor))
    if status and status != "All Statuses": query = query.filter(Work.status == status)
    if risk and risk != "All Risk Levels": query = query.filter(Work.risk_assessment.has(risk_level=risk.upper()))
    if search: query = query.filter(Work.work_code.contains(search) | Work.project_name.contains(search) | Work.vendor.has(name=search))
    if since:
        try: query = query.filter(Work.sanction_date >= datetime.datetime.fromisoformat(since))
        except ValueError: raise HTTPException(400, "Invalid date")
    lowered = kind.lower()
    if "evidence_" in lowered or kind.startswith(("MPLADS-", "DEMO-")):
        query = query.filter(Work.work_code == kind.removeprefix("Evidence_"))
    elif "risk" in lowered:
        query = query.filter(Work.risk_assessment.has(risk_level="HIGH"))
    works = query.order_by(Work.work_code).all()
    ids = [w.id for w in works]
    if "audit" in lowered:
        return [{"Time": e.timestamp.isoformat(), "Work": e.work.work_code if e.work else "System",
                 "Actor": e.actor_name, "Role": e.actor_role, "Action": e.action,
                 "Details": e.details, "Previous state": e.previous_state, "New state": e.new_state}
                for e in db.query(AuditEvent).order_by(AuditEvent.id.desc()).all()
                if (not state and not district) or e.work_id in ids]
    if "duplicate" in lowered:
        return [{"Work A": p.work_a.work_code, "Work B": p.work_b.work_code,
                 "Photo similarity %": p.photo_similarity_pct, "Text similarity %": p.text_similarity_pct,
                 "Distance m": p.geo_distance_m, "Confidence": p.combined_confidence, "Status": p.status}
                for p in db.query(DuplicatePair).all() if p.work_a_id in ids or p.work_b_id in ids]
    if "price" in lowered or "benchmark" in lowered:
        return [{"Item": r.item_name, "Unit": r.unit, "Reference INR": r.gem_reference_price,
                 "Min INR": r.min_price, "Max INR": r.max_price, "Tolerance %": r.tolerance_pct}
                for r in db.query(ReferencePrice).all()]
    if "review" in lowered:
        return [{"Work": c.work.work_code, "Priority": c.priority, "Status": c.status,
                 "Assigned to": c.assigned_to, "Age days": c.age_days}
                for c in db.query(ReviewCase).all() if c.work_id in ids]
    if "vendor" in lowered or "district" in lowered:
        groups = {}
        label = "Vendor" if "vendor" in lowered else "District"
        for w in works:
            name = w.vendor.name if label == "Vendor" else w.district.name
            item = groups.setdefault(name, {label: name, "Works": 0, "Sanction INR": 0, "Expenditure INR": 0, "High risk": 0})
            item["Works"] += 1
            item["Sanction INR"] += w.sanctioned_amount
            item["Expenditure INR"] += w.expenditure
            item["High risk"] += int(bool(w.risk_assessment and w.risk_assessment.risk_level == "HIGH"))
        return list(groups.values())
    rows = []
    for w in works:
        r = w.risk_assessment
        row = {"Work Code": w.work_code, "Project Name": w.project_name, "Category": w.category,
               "State": w.state.name, "District": w.district.name, "Vendor": w.vendor.name,
               "Sanction INR": w.sanctioned_amount, "Expenditure INR": w.expenditure,
               "Utilization %": w.utilization_pct, "Risk Score": r.composite_score if r else 0,
               "Risk Level": r.risk_level if r else "Pending", "Status": w.status}
        if "risk" in lowered or "evidence" in lowered or len(works) == 1:
            for key in ("price", "iqr", "benford", "hhi", "photo"):
                row[key + " score"] = getattr(r, key + "_score", 0)
                if "evidence" in lowered:
                    row[key + " evidence"] = json.dumps(getattr(r, key + "_evidence", {}), ensure_ascii=False)
        rows.append(row)
    return rows

@router.get("/recent")
def recent_reports(db: Session = Depends(get_db)):
    return {"reports": [
        {"id": r.id, "name": r.name, "generated_by": "Demo Officer",
         "date": r.created_at.strftime("%Y-%m-%d %H:%M"), "format": r.format,
         "status": "Completed", "download_url": f"/api/reports/download?report_id={r.id}"}
        for r in db.query(GeneratedReport).order_by(GeneratedReport.id.desc()).limit(30).all()]}

@router.post("/generate")
def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    fmt = payload.format.upper()
    if fmt not in ("CSV", "JSON", "PDF"): raise HTTPException(400, "Choose CSV, JSON or PDF")
    rows = report_rows(payload.report_type, db, state=payload.state, district=payload.district, since=payload.date_range)
    report = GeneratedReport(name=payload.report_type + " - Demo portfolio", format=fmt, rows=rows)
    db.add(report)
    db.add(AuditEvent(actor_name="Demo Officer", actor_role="District Officer",
                      action="Report generated", details=f"{payload.report_type}: {len(rows)} records", new_state=fmt))
    db.commit()
    return {"success": True, "report_name": report.name, "record_count": len(rows), "format": fmt,
            "download_url": f"/api/reports/download?report_id={report.id}"}

@router.get("/download")
def download_report(type: str = "Portfolio Report", format: str = "CSV", report_id: int | None = None,
                    state: str | None = None, district: str | None = None, search: str | None = None,
                    risk: str | None = None, category: str | None = None, status: str | None = None,
                    vendor: str | None = None, db: Session = Depends(get_db)):
    if report_id is not None:
        report = db.get(GeneratedReport, report_id)
        if not report: raise HTTPException(404, "Report not found")
        rows, format, type = report.rows, report.format, report.name
    else:
        rows = report_rows(type, db, state, district, search, risk, category, status, vendor)
    fmt = format.upper()
    filename = "nirikshan_" + re.sub(r"[^a-zA-Z0-9_-]", "_", type)[:90]
    if fmt == "JSON":
        content, media = json.dumps(rows, ensure_ascii=False, indent=2), "application/json"
    elif fmt == "CSV":
        buf = io.StringIO(newline="")
        writer = csv.DictWriter(buf, fieldnames=list(rows[0]) if rows else ["No matching records"])
        writer.writeheader()
        # Quote formula-looking text for safe viewing in spreadsheet applications.
        writer.writerows({k: ("'" + v if isinstance(v, str) and v.startswith(("=", "+", "-", "@")) else v)
                          for k, v in row.items()} for row in rows)
        content, media = "\ufeff" + buf.getvalue(), "text/csv; charset=utf-8"
    elif fmt == "PDF":
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4
        buf = io.BytesIO()
        styles = getSampleStyleSheet()
        story = [Paragraph("NIRIKSHAN", styles["Title"]), Paragraph(escape(type), styles["Heading2"]),
                 Paragraph("Local prototype / synthetic demonstration data / amounts in INR", styles["Normal"]), Spacer(1, 16)]
        for index, row in enumerate(rows):
            story.append(Paragraph(f"Record {index + 1}", styles["Heading3"]))
            for key, value in row.items():
                story.append(Paragraph(f"<b>{escape(key)}</b>: {escape(str(value))}", styles["Normal"]))
            story.append(Spacer(1, 12))
        if not rows: story.append(Paragraph("No matching records.", styles["Normal"]))
        SimpleDocTemplate(buf, pagesize=A4, title=type, author="NIRIKSHAN Prototype").build(story)
        content, media = buf.getvalue(), "application/pdf"
    else: raise HTTPException(400, "Choose CSV, JSON or PDF")
    return Response(content, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}.{fmt.lower()}"'})
