from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc, func
from database import get_db
from models.entities import Work, State, District, Vendor, RiskAssessment, ReviewCase, WorkItem, WorkPhoto, AuditEvent

router = APIRouter(prefix="/api/works", tags=["Works"])


@router.get("")
def list_works(
    search: str = Query(None),
    state: str = Query(None),
    district: str = Query(None),
    category: str = Query(None),
    risk: str = Query(None),
    status: str = Query(None),
    vendor: str = Query(None),
    financial_year: str = Query("2024-25"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    Searchable, filterable works explorer with pagination.
    KPI summary cards are derived from real COUNT queries — not hardcoded.
    """
    query = db.query(Work).join(Work.state).join(Work.district).join(Work.vendor).join(Work.risk_assessment)

    # Search filter — escape SQL wildcard metacharacters in user input
    if search:
        safe_search = search.strip().replace("%", r"\%").replace("_", r"\_")
        search_fmt = f"%{safe_search}%"
        query = query.filter(
            or_(
                Work.work_code.ilike(search_fmt),
                Work.project_name.ilike(search_fmt),
                Vendor.name.ilike(search_fmt),
                District.name.ilike(search_fmt),
            )
        )

    # Dimensional filters
    if state and state != "All India":
        query = query.filter(State.name == state)
    if district and district != "All Districts":
        query = query.filter(District.name == district)
    if category and category != "All Categories":
        query = query.filter(Work.category == category)
    if risk and risk != "All Risk Levels":
        query = query.filter(RiskAssessment.risk_level == risk.upper())
    if status and status != "All Statuses":
        query = query.filter(Work.status == status)
    if vendor and vendor != "All Vendors":
        query = query.filter(Vendor.name == vendor)

    # Sort
    if sort_by == "risk_score":
        order_col = RiskAssessment.composite_score
    elif sort_by == "sanctioned_amount":
        order_col = Work.sanctioned_amount
    elif sort_by == "expenditure":
        order_col = Work.expenditure
    elif sort_by == "work_code":
        order_col = Work.work_code
    else:
        order_col = RiskAssessment.composite_score

    query = query.order_by(desc(order_col) if sort_order == "desc" else asc(order_col))

    total_count = query.count()
    offset = (page - 1) * limit
    works_db = query.offset(offset).limit(limit).all()

    # Formulate works list
    items = []
    for w in works_db:
        score = int(w.risk_assessment.composite_score) if w.risk_assessment else 30
        risk_lvl = w.risk_assessment.risk_level if w.risk_assessment else "LOW"
        priority = "High" if score >= 80 else ("Medium" if score >= 50 else "Low")

        items.append({
            "id": w.id,
            "priority": priority,
            "work_code": w.work_code,
            "work_name": w.project_name,
            "category": w.category,
            "state": w.state.name,
            "district": w.district.name,
            "vendor": w.vendor.name,
            "sanctioned_amount": w.sanctioned_amount,
            "expenditure": w.expenditure,
            "utilization_pct": w.utilization_pct,
            "risk_score": score,
            "risk_level": risk_lvl,
            "status": w.status,
            "days_since_sanction": w.days_since_sanction,
        })

    # ── KPI Summary Cards — derived from real DB queries, not hardcoded ──────
    total_in_db = db.query(Work).count()
    flagged_in_db = db.query(RiskAssessment).filter(RiskAssessment.composite_score >= 60).count()
    high_in_db = db.query(RiskAssessment).filter(RiskAssessment.risk_level.in_(["HIGH", "CRITICAL"])).count()
    under_review_in_db = db.query(Work).filter(
        Work.status.in_(["Under Review", "Under Audit", "Escalated"])
    ).count()
    normal_in_db = total_in_db - flagged_in_db

    kpi_summary = {
        "total_works": total_in_db,
        "normal_works": max(normal_in_db, 0),
        "flagged_works": flagged_in_db,
        "high_risk_works": high_in_db,
        "under_review_works": under_review_in_db,
        "current_filtered_count": total_count,
    }

    return {
        "kpis": kpi_summary,
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": total_count,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        },
    }


@router.get("/{work_code_or_id}")
def get_work_detail(work_code_or_id: str, db: Session = Depends(get_db)):
    """
    Returns complete investigation dossier for a specific work.
    """
    if work_code_or_id.isdigit():
        work = db.query(Work).filter(Work.id == int(work_code_or_id)).first()
    else:
        work = db.query(Work).filter(Work.work_code == work_code_or_id).first()

    if not work:
        raise HTTPException(status_code=404, detail="Work record not found")

    risk_ass = work.risk_assessment
    rev_case = work.review_case

    # Timeline events
    timeline = [
        {
            "title": "Work Sanctioned",
            "date": work.sanction_date.strftime("%b %d, %Y"),
            "actor": "Ministry / MP Recommendation",
            "status": "completed",
        },
        {
            "title": "Vendor Assigned",
            "date": work.sanction_date.strftime("%b %d, %Y"),
            "actor": work.vendor.name,
            "status": "completed",
        },
        {
            "title": "Initial Expenditure Recorded",
            "date": work.sanction_date.strftime("%b %d, %Y"),
            "actor": work.executing_agency,
            "status": "completed",
        },
        {
            "title": "Site Photo Uploaded",
            "date": work.sanction_date.strftime("%b %d, %Y"),
            "actor": "Field Engineer",
            "status": "completed",
        },
    ]
    if risk_ass and risk_ass.composite_score >= 60:
        timeline.append(
            {"title": "Risk Anomaly Flagged", "date": "Recent", "actor": "NIRIKSHAN Detection Engine", "status": "flagged"}
        )
        timeline.append(
            {"title": "Work Entered Review Queue", "date": "Recent", "actor": "Oversight Workflow", "status": "active"}
        )

    # Documents & Data (descriptive placeholders — actual file serving is Phase 5+)
    documents = [
        {"title": "Sanction Order & Administrative Approval", "type": "PDF", "size": "1.8 MB", "date": work.sanction_date.strftime("%Y-%m-%d")},
        {"title": "Contractor Invoices & Bill of Quantities", "type": "PDF", "size": "3.4 MB", "date": work.sanction_date.strftime("%Y-%m-%d")},
        {"title": "Material Inspection & GeM Receipts", "type": "PDF", "size": "2.1 MB", "date": work.sanction_date.strftime("%Y-%m-%d")},
        {"title": "Geo-tagged Site Photographs (Before/Current)", "type": "Images", "count": len(work.photos) or 2, "date": "Recent"},
    ]

    # Photos
    photos = [
        {
            "id": p.id,
            "url": p.photo_url,
            "stage": p.stage,
            "timestamp": p.timestamp.strftime("%Y-%m-%d %H:%M"),
            "latitude": p.latitude,
            "longitude": p.longitude,
        }
        for p in work.photos
    ]

    # Line Items
    items = [
        {
            "id": it.id,
            "item_name": it.item_name,
            "category": it.category,
            "quantity": it.quantity,
            "unit": it.unit,
            "unit_price": it.unit_price,
            "total_amount": it.total_amount,
        }
        for it in work.items
    ]

    return {
        "id": work.id,
        "work_code": work.work_code,
        "project_name": work.project_name,
        "category": work.category,
        "state": work.state.name,
        "district": work.district.name,
        "constituency": work.constituency.name if work.constituency else "General",
        "mp_name": work.constituency.mp_name if work.constituency else "Hon'ble MP",
        "vendor": work.vendor.name,
        "executing_agency": work.executing_agency,
        "sanctioned_amount": work.sanctioned_amount,
        "expenditure": work.expenditure,
        "utilization_pct": work.utilization_pct,
        "completion_pct": work.completion_pct,
        "days_since_sanction": work.days_since_sanction,
        "status": work.status,
        "latitude": work.latitude,
        "longitude": work.longitude,
        "sanction_date": work.sanction_date.strftime("%Y-%m-%d"),
        "risk_assessment": {
            "composite_score": int(risk_ass.composite_score) if risk_ass else 30,
            "risk_level": risk_ass.risk_level if risk_ass else "LOW",
            "price_score": risk_ass.price_score if risk_ass else 0,
            "price_weight": 30,
            "iqr_score": risk_ass.iqr_score if risk_ass else 0,
            "iqr_weight": 20,
            "benford_score": risk_ass.benford_score if risk_ass else 0,
            "benford_weight": 15,
            "hhi_score": risk_ass.hhi_score if risk_ass else 0,
            "hhi_weight": 15,
            "photo_score": risk_ass.photo_score if risk_ass else 0,
            "photo_weight": 20,
            "explanation": risk_ass.explanation_summary if risk_ass else "No anomalous divergence detected.",
            "disclaimer": "Risk score is a prioritization signal, not a fraud verdict.",
        },
        "review_case": {
            "id": rev_case.id if rev_case else None,
            "status": rev_case.status if rev_case else "Not in Review",
            "priority": rev_case.priority if rev_case else "Normal",
            "assigned_to": rev_case.assigned_to if rev_case else "Unassigned",
            "age_days": rev_case.age_days if rev_case else 0,
        },
        "items": items,
        "photos": photos,
        "timeline": timeline,
        "documents": documents,
    }
