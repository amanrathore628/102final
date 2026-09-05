from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.entities import AuditEvent, Work

router = APIRouter(prefix="/api/audit", tags=["Audit Trail"])

@router.get("")
def list_audit_trail(
    work_id: str = Query(None),
    user: str = Query(None),
    role: str = Query(None),
    action: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns immutable system activity logs, reviewer decisions, and state modifications.
    """
    query = db.query(AuditEvent).outerjoin(AuditEvent.work)

    if work_id:
        query = query.filter(Work.work_code.ilike(f"%{work_id.strip()}%"))
    if user and user != "All Users":
        query = query.filter(AuditEvent.actor_name == user)
    if role and role != "All Roles":
        query = query.filter(AuditEvent.actor_role == role)
    if action and action != "All Actions":
        query = query.filter(AuditEvent.action == action)

    total_events = query.count()
    events_db = query.order_by(desc(AuditEvent.timestamp)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for e in events_db:
        w_code = e.work.work_code if e.work else "System-Wide"
        w_name = e.work.project_name if e.work else "Platform Global Event"

        items.append({
            "id": e.id,
            "timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M"),
            "full_timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user": e.actor_name,
            "role": e.actor_role,
            "action": e.action,
            "work_id": w_code,
            "work_name": w_name,
            "details": e.details,
            "previous_state": e.previous_state or "None",
            "new_state": e.new_state or "Updated",
            "full_event_text": f"Event: {e.action} | Target: {w_code} | Changed by {e.actor_name} ({e.actor_role})",
            "evidence_link": f"/works/{w_code}/evidence" if e.work else None
        })

    return {
        "items": items,
        "total": total_events,
        "page": page,
        "limit": limit
    }
