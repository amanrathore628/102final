import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.entities import ReviewCase, ReviewDecision, Work, RiskAssessment, AuditEvent

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


class DecisionSubmitRequest(BaseModel):
    reviewer_name: str = Field(..., description="Name of the official making the assessment")
    reviewer_role: str = Field("Reviewer", description="Role of the reviewer")
    decision: str = Field(
        ...,
        description="Decision verdict: No Issue, Legitimate Variance, Requires Clarification, Escalate, Investigation Required",
    )
    comment: str = Field(..., min_length=5, description="Mandatory detailed audit explanation")


class AssignReviewerRequest(BaseModel):
    assigned_to: str = Field(..., description="Reviewer name")
    assigned_role: str = Field("Reviewer", description="Role")


@router.get("")
def list_review_queue(
    tab: str = Query("All", description="All, High Risk, Medium Risk, Overdue, Assigned to Me, Escalated"),
    status: str = Query(None),
    district: str = Query(None),
    reviewer: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns prioritized review queue with SLA tracking, filter tabs, and case metadata.
    KPI header counts are derived from live COUNT queries — not hardcoded.
    """
    query = db.query(ReviewCase).join(ReviewCase.work).join(Work.risk_assessment)

    if tab and isinstance(tab, str):
        if tab == "High Risk":
            query = query.filter(RiskAssessment.risk_level.in_(["HIGH", "CRITICAL"]))
        elif tab == "Medium Risk":
            query = query.filter(RiskAssessment.risk_level == "MEDIUM")
        elif tab == "Overdue":
            query = query.filter(ReviewCase.age_days >= 30)
        elif tab == "Assigned to Me":
            query = query.filter(ReviewCase.assigned_to == "P. Sharma")
        elif tab == "Escalated":
            query = query.filter(ReviewCase.status == "Escalated")

    if status and isinstance(status, str) and status != "All Statuses":
        query = query.filter(ReviewCase.status == status)
    if district and isinstance(district, str) and district != "All Districts":
        query = query.filter(Work.district.has(name=district))
    if reviewer and isinstance(reviewer, str) and reviewer != "All Reviewers":
        query = query.filter(ReviewCase.assigned_to == reviewer)
    if search and isinstance(search, str) and search.strip():
        safe = search.strip().replace("%", r"\%").replace("_", r"\_")
        s_fmt = f"%{safe}%"
        query = query.filter(Work.work_code.ilike(s_fmt) | Work.project_name.ilike(s_fmt))

    page_num = page if isinstance(page, int) else 1
    limit_num = limit if isinstance(limit, int) else 25
    total_items = query.count()
    cases_db = query.offset((page_num - 1) * limit_num).limit(limit_num).all()

    items = []
    for c in cases_db:
        w = c.work
        r = w.risk_assessment
        signals_count = 0
        signals_list = []
        if r:
            if r.price_score >= 60:
                signals_count += 1
                signals_list.append("Price")
            if r.iqr_score >= 60:
                signals_count += 1
                signals_list.append("IQR")
            if r.benford_score >= 60:
                signals_count += 1
                signals_list.append("Benford")
            if r.hhi_score >= 60:
                signals_count += 1
                signals_list.append("HHI")
            if r.photo_score >= 60:
                signals_count += 1
                signals_list.append("Photo")

        items.append({
            "id": c.id,
            "work_id": w.id,
            "priority": c.priority,
            "work_code": w.work_code,
            "work_name": w.project_name,
            "district": w.district.name if w.district else "Unknown District",
            "risk_score": int(r.composite_score) if r else 50,
            "risk_level": r.risk_level if r else "LOW",
            "signals_summary": f"{signals_count}/5 signals",
            "signals_list": signals_list,
            "assigned_to": c.assigned_to,
            "age_days": c.age_days,
            "status": c.status,
            "expenditure": w.expenditure,
            "sanctioned_amount": w.sanctioned_amount,
        })

    # ── KPI Header Cards — computed from live COUNT queries ──────────────────
    base_rc = db.query(ReviewCase)
    kpis = {
        "all_cases": base_rc.count(),
        "high_risk": (
            base_rc.join(ReviewCase.work)
            .join(Work.risk_assessment)
            .filter(RiskAssessment.risk_level.in_(["HIGH", "CRITICAL"]))
            .count()
        ),
        "medium_risk": (
            db.query(ReviewCase)
            .join(ReviewCase.work)
            .join(Work.risk_assessment)
            .filter(RiskAssessment.risk_level == "MEDIUM")
            .count()
        ),
        "overdue": base_rc.filter(ReviewCase.age_days >= 30).count(),
        "assigned_to_me": db.query(ReviewCase).filter(ReviewCase.assigned_to == "P. Sharma").count(),
        "escalated": db.query(ReviewCase).filter(ReviewCase.status == "Escalated").count(),
    }

    return {
        "kpis": kpis,
        "items": items,
        "total": total_items,
        "page": page,
        "limit": limit,
    }


@router.post("/{case_id}/decision")
def submit_review_decision(case_id: int, payload: DecisionSubmitRequest, db: Session = Depends(get_db)):
    """
    Submits a human review decision with mandatory justification comments.
    Immutably logs to the audit trail and updates case status.
    """
    review_case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not review_case:
        raise HTTPException(status_code=404, detail="Review case not found")

    if payload.decision not in {"No Issue", "Legitimate Variance", "Requires Clarification", "Escalate", "Investigation Required"}:
        raise HTTPException(422, "Unsupported review decision")
    if len(payload.comment.strip()) < 5:
        raise HTTPException(422, "Provide a meaningful justification")
    old_status = review_case.status

    # Map decision to new status
    if payload.decision == "No Issue":
        new_status = "Closed - No Issue"
    elif payload.decision == "Legitimate Variance":
        new_status = "Closed - Legitimate Variance"
    elif payload.decision == "Requires Clarification":
        new_status = "Awaiting Clarification"
    elif payload.decision == "Escalate":
        new_status = "Escalated"
    elif payload.decision == "Investigation Required":
        new_status = "Under Field Investigation"
    else:
        new_status = "In Review"

    review_case.status = new_status
    if "Closed" in new_status:
        review_case.date_closed = datetime.datetime.now(datetime.UTC)

    # Add Decision record
    decision_obj = ReviewDecision(
        review_case_id=review_case.id,
        reviewer_name=payload.reviewer_name,
        reviewer_role=payload.reviewer_role,
        decision=payload.decision,
        comment=payload.comment,
        timestamp=datetime.datetime.now(datetime.UTC),
    )
    db.add(decision_obj)

    # Add Immutable Audit Log
    audit = AuditEvent(
        work_id=review_case.work_id,
        actor_name=payload.reviewer_name,
        actor_role=payload.reviewer_role,
        action="Decision submitted",
        details=(
            f"Decision '{payload.decision}' recorded by {payload.reviewer_name} "
            f"({payload.reviewer_role}): \"{payload.comment}\""
        ),
        previous_state=old_status,
        new_state=new_status,
        timestamp=datetime.datetime.now(datetime.UTC),
    )
    db.add(audit)

    db.commit()

    return {
        "success": True,
        "message": "Review decision successfully recorded and committed to audit trail",
        "case_id": review_case.id,
        "new_status": new_status,
        "decision": payload.decision,
        "timestamp": decision_obj.timestamp.isoformat(),
    }


@router.post("/{case_id}/assign")
def assign_reviewer(case_id: int, payload: AssignReviewerRequest, db: Session = Depends(get_db)):
    """
    Assigns or transfers a case to a specific review officer.
    """
    review_case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not review_case:
        raise HTTPException(status_code=404, detail="Review case not found")

    old_assignee = review_case.assigned_to
    review_case.assigned_to = payload.assigned_to
    review_case.assigned_role = payload.assigned_role
    if review_case.status == "New":
        review_case.status = "In Review"

    audit = AuditEvent(
        work_id=review_case.work_id,
        actor_name="Administrator",
        actor_role="Administrator",
        action="Reviewer assigned",
        details=f"Case reassigned from {old_assignee} to {payload.assigned_to} ({payload.assigned_role})",
        previous_state=old_assignee,
        new_state=payload.assigned_to,
        timestamp=datetime.datetime.now(datetime.UTC),
    )
    db.add(audit)
    db.commit()

    return {"success": True, "assigned_to": payload.assigned_to, "status": review_case.status}
