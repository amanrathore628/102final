from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.entities import Work, RiskAssessment, AuditEvent

router = APIRouter(prefix="/api/works", tags=["Evidence"])

@router.get("/{work_code_or_id}/evidence")
def get_work_risk_evidence(work_code_or_id: str, db: Session = Depends(get_db)):
    """
    Returns deep-dive evidence receipts across all 5 independent detection engines.
    """
    if work_code_or_id.isdigit():
        work = db.query(Work).filter(Work.id == int(work_code_or_id)).first()
    else:
        work = db.query(Work).filter(Work.work_code == work_code_or_id).first()

    if not work:
        raise HTTPException(status_code=404, detail="Work record not found")

    risk_ass = work.risk_assessment
    if not risk_ass:
        raise HTTPException(status_code=404, detail="Risk assessment evidence not generated for this work")

    # Fetch audit events related to this work
    audit_events_db = db.query(AuditEvent).filter(AuditEvent.work_id == work.id).order_by(AuditEvent.timestamp.desc()).all()
    audit_evidence = [
        {
            "id": a.id,
            "timestamp": a.timestamp.strftime("%b %d, %Y, %I:%M %p"),
            "actor": a.actor_name,
            "role": a.actor_role,
            "description": a.details
        }
        for a in audit_events_db
    ]

    return {
        "work_id": work.id,
        "work_code": work.work_code,
        "work_name": work.project_name,
        "district": work.district.name,
        "state": work.state.name,
        "sanctioned_amount": work.sanctioned_amount,
        "expenditure": work.expenditure,
        "composite_score": int(risk_ass.composite_score),
        "risk_level": risk_ass.risk_level,
        "module_1_price": risk_ass.price_evidence or {},
        "module_2_iqr": risk_ass.iqr_evidence or {},
        "module_3_benford": risk_ass.benford_evidence or {},
        "module_4_hhi": risk_ass.hhi_evidence or {},
        "module_5_photo": risk_ass.photo_evidence or {},
        "evidence_summary": risk_ass.explanation_summary,
        "audit_evidence": audit_evidence
    }
