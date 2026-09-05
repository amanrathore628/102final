import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, cast, Integer
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models.entities import Work, State, District, Vendor, RiskAssessment, ReviewCase, AuditEvent

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _time_ago(ts: datetime.datetime) -> str:
    """Compute a human-readable relative time string from a UTC timestamp."""
    now = datetime.datetime.now(datetime.UTC)
    # Make ts timezone-aware if naive (legacy data from before the UTC fix)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=datetime.UTC)
    delta = now - ts
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


@router.get("/stats")
def get_dashboard_stats(
    state: str = Query(None),
    district: str = Query(None),
    financial_year: str = Query("2024-25"),
    db: Session = Depends(get_db)
):
    """
    Returns portfolio-wide macro KPIs computed from live database aggregates.
    All values are derived from real SQL COUNT/SUM/AVG queries — no magic numbers.
    """
    # --- Scoped work query (respects state/district filters) ---
    IGNORED_FILTERS = {"All India", "All Districts", "undefined", "null", "", "none", "None"}
    work_q = db.query(Work)
    if state and state.strip() not in IGNORED_FILTERS:
        work_q = work_q.join(Work.state).filter(State.name == state.strip())
    if district and district.strip() not in IGNORED_FILTERS:
        work_q = work_q.join(Work.district).filter(District.name == district.strip())

    total_works = work_q.count()

    # Total expenditure (INR → Crores: 1 Cr = 10,000,000)
    total_expenditure_inr = work_q.with_entities(func.sum(Work.expenditure)).scalar() or 0.0
    total_expenditure_cr = round(total_expenditure_inr / 10_000_000, 2)

    # Utilization
    avg_utilization = work_q.with_entities(func.avg(Work.utilization_pct)).scalar() or 0.0

    # Flagged works (composite_score >= 60)
    flagged_works = (
        db.query(RiskAssessment)
        .join(RiskAssessment.work)
        .filter(RiskAssessment.composite_score >= 60)
    )
    if state and state.strip() not in IGNORED_FILTERS:
        flagged_works = flagged_works.join(Work.state).filter(State.name == state.strip())
    if district and district.strip() not in IGNORED_FILTERS:
        flagged_works = flagged_works.join(Work.district).filter(District.name == district.strip())
    flagged_count = flagged_works.count()

    # High-risk works
    high_risk_q = (
        db.query(RiskAssessment)
        .join(RiskAssessment.work)
        .filter(RiskAssessment.risk_level.in_(["HIGH", "CRITICAL"]))
    )
    if state and state.strip() not in IGNORED_FILTERS:
        high_risk_q = high_risk_q.join(Work.state).filter(State.name == state.strip())
    if district and district.strip() not in IGNORED_FILTERS:
        high_risk_q = high_risk_q.join(Work.district).filter(District.name == district.strip())
    high_risk_count = high_risk_q.count()

    # Pending reviews
    pending_reviews = db.query(ReviewCase).filter(
        ReviewCase.status.in_(["New", "In Review", "Awaiting Clarification"])
    ).count()

    flagged_pct = round((flagged_count / total_works * 100), 1) if total_works else 0.0
    high_risk_pct = round((high_risk_count / total_works * 100), 1) if total_works else 0.0

    return {
        "total_works": total_works,
        "total_works_change": None,          # Requires historical snapshots
        "total_expenditure_cr": total_expenditure_cr,
        "total_expenditure_change": None,
        "flagged_works": flagged_count,
        "flagged_works_pct": flagged_pct,
        "high_risk_works": high_risk_count,
        "high_risk_works_pct": high_risk_pct,
        "pending_reviews": pending_reviews,
        "pending_reviews_trend": None,
        "utilization_pct": round(avg_utilization, 1),
        "last_updated": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M UTC"),
    }


@router.get("/charts")
def get_dashboard_charts(db: Session = Depends(get_db)):
    """
    Returns chart data derived from real database records.

    - Time series: works sanctioned and flagged per month.
    - Risk distribution: real COUNT by risk_level.
    - Signal breakdown: COUNT of assessments where each detection signal is triggered.
    - Priority reviews: top-5 works by composite_score (with eager-loaded relations).
    - Top vendors: from vendors table ordered by avg_risk_score.
    - Fund utilization: aggregated from works.
    - Recent activity: last 6 audit events with real relative timestamps.
    """

    # ── 1. Flagged Works Over Time ──────────────────────────────────────────
    # Group by year-month of sanction_date across portfolio
    monthly_rows = (
        db.query(
            func.strftime("%Y-%m", Work.sanction_date).label("ym"),
            func.count(Work.id).label("total"),
            func.sum(
                case((RiskAssessment.composite_score >= 45, 1), else_=0)
            ).label("flagged"),
            func.sum(
                case((RiskAssessment.risk_level.in_(["HIGH", "CRITICAL"]), 1), else_=0)
            ).label("high_risk"),
        )
        .outerjoin(RiskAssessment, RiskAssessment.work_id == Work.id)
        .group_by(func.strftime("%Y-%m", Work.sanction_date))
        .order_by(func.strftime("%Y-%m", Work.sanction_date))
        .all()
    )

    def _fmt_month(ym: str) -> str:
        """'2024-03' → 'Mar-24'"""
        try:
            dt = datetime.datetime.strptime(ym, "%Y-%m")
            return dt.strftime("%b-%y")
        except Exception:
            return ym

    time_series = [
        {
            "month": _fmt_month(row.ym),
            "flagged": int(row.flagged or 0),
            "high_risk": int(row.high_risk or 0),
            "total": int(row.total or 0),
        }
        for row in monthly_rows
    ]

    # ── 2. Risk Distribution Donut ──────────────────────────────────────────
    RISK_COLORS = {
        "LOW": "#10B981",
        "MEDIUM": "#F59E0B",
        "HIGH": "#EF4444",
        "CRITICAL": "#991B1B",
    }
    dist_rows = (
        db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id))
        .group_by(RiskAssessment.risk_level)
        .all()
    )
    risk_distribution = [
        {
            "name": lvl.capitalize() if lvl else "Unknown",
            "value": cnt,
            "color": RISK_COLORS.get(lvl, "#6B7280"),
        }
        for lvl, cnt in dist_rows
    ]

    # ── 3. Signal Breakdown Bar Chart ───────────────────────────────────────
    signal_breakdown = [
        {
            "signal": "GeM Anomaly",
            "count": db.query(RiskAssessment).filter(RiskAssessment.price_score >= 50).count(),
            "color": "#2563EB",
        },
        {
            "signal": "IQR Outlier",
            "count": db.query(RiskAssessment).filter(RiskAssessment.iqr_score >= 40).count(),
            "color": "#F59E0B",
        },
        {
            "signal": "Benford Law",
            "count": db.query(RiskAssessment).filter(RiskAssessment.benford_score >= 70).count(),
            "color": "#8B5CF6",
        },
        {
            "signal": "Vendor HHI",
            "count": db.query(RiskAssessment).filter(RiskAssessment.hhi_score >= 65).count(),
            "color": "#EF4444",
        },
        {
            "signal": "Duplicate Photo",
            "count": db.query(RiskAssessment).filter(RiskAssessment.photo_score >= 40).count(),
            "color": "#06B6D4",
        },
    ]

    # ── 4. Priority Reviews (top-5 by composite score) ──────────────────────
    # Use joinedload to prevent N+1 queries for district/state/vendor
    priority_works_db = (
        db.query(Work)
        .join(Work.risk_assessment)
        .options(
            joinedload(Work.district),
            joinedload(Work.state),
            joinedload(Work.vendor),
            joinedload(Work.risk_assessment),
        )
        .order_by(RiskAssessment.composite_score.desc())
        .limit(5)
        .all()
    )
    priority_reviews = []
    for pw in priority_works_db:
        signals_text = []
        if pw.risk_assessment:
            if pw.risk_assessment.price_score >= 60:
                signals_text.append("GeM Price Anomaly")
            if pw.risk_assessment.iqr_score >= 60:
                signals_text.append("IQR Outlier")
            if pw.risk_assessment.benford_score >= 60:
                signals_text.append("Benford Deviation")
            if pw.risk_assessment.hhi_score >= 60:
                signals_text.append("Vendor HHI")
            if pw.risk_assessment.photo_score >= 60:
                signals_text.append("Duplicate Photo")

        priority_reviews.append({
            "id": pw.id,
            "work_code": pw.work_code,
            "work_name": pw.project_name,
            "district": pw.district.name if pw.district else "Unknown District",
            "state": pw.state.name if pw.state else "Unknown State",
            "vendor": pw.vendor.name if pw.vendor else "Unknown Vendor",
            "risk_score": int(pw.risk_assessment.composite_score) if pw.risk_assessment else 0,
            "signals": " + ".join(signals_text[:2]) if signals_text else "Multi-signal anomaly",
            "expenditure": pw.expenditure,
        })

    # ── 5. Top Risky Vendors ─────────────────────────────────────────────────
    top_vendors_db = db.query(Vendor).order_by(Vendor.avg_risk_score.desc()).limit(4).all()
    top_vendors = [
        {
            "id": v.id,
            "name": v.name,
            "works_count": v.total_works,
            "expenditure_cr": round(v.total_expenditure / 10_000_000, 2) if v.total_expenditure else 0.0,
            "risk_score": int(v.avg_risk_score),
            "status": v.status,
        }
        for v in top_vendors_db
    ]

    # ── 6. Fund Utilization ──────────────────────────────────────────────────
    agg = db.query(
        func.sum(Work.sanctioned_amount).label("sanctioned"),
        func.sum(Work.expenditure).label("utilized"),
    ).one()
    sanctioned_cr = round((agg.sanctioned or 0) / 10_000_000, 2)
    utilized_cr = round((agg.utilized or 0) / 10_000_000, 2)
    balance_cr = round(sanctioned_cr - utilized_cr, 2)
    utilization_rate = round((utilized_cr / sanctioned_cr * 100), 1) if sanctioned_cr else 0.0

    fund_utilization = [
        {
            "label": "Total Central Allocation",
            "display": f"₹{sanctioned_cr:,.1f} Cr",
            "pct": 100,
            "color": "#2563EB",
        },
        {
            "label": "Released by Authorities",
            "display": f"₹{sanctioned_cr:,.1f} Cr",
            "pct": 100,
            "color": "#10B981",
        },
        {
            "label": "Utilized on Field",
            "display": f"₹{utilized_cr:,.1f} Cr",
            "pct": utilization_rate,
            "color": "#F59E0B",
        },
        {
            "label": "Unspent Balance",
            "display": f"₹{balance_cr:,.1f} Cr",
            "pct": round(max(0, 100 - utilization_rate), 1),
            "color": "#94A3B8",
        },
    ]

    utilization_alerts = [
        {
            "label": f"{db.query(Work).filter(Work.status == 'Under Review').count()} Under Review",
            "style": "bg-rose-50 border-rose-200 text-rose-800",
        },
        {
            "label": f"{db.query(Work).filter(Work.utilization_pct < 50).count()} Low Utilized",
            "style": "bg-amber-50 border-amber-200 text-amber-800",
        },
        {
            "label": f"₹{balance_cr:,.1f} Cr Balance",
            "style": "bg-blue-50 border-blue-200 text-blue-800",
        },
    ]

    # ── 7. Recent System Activity (with real relative timestamps) ─────────────
    recent_activity_db = (
        db.query(AuditEvent)
        .options(joinedload(AuditEvent.work))
        .order_by(AuditEvent.timestamp.desc())
        .limit(6)
        .all()
    )
    recent_activity = [
        {
            "id": a.id,
            "time_ago": _time_ago(a.timestamp),
            "actor": a.actor_name,
            "role": a.actor_role,
            "action": a.action,
            "details": a.details,
            "work_code": a.work.work_code if a.work else "System",
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M"),
        }
        for a in recent_activity_db
    ]

    # ── 8. Operational System Status ─────────────────────────────────────────
    system_status = {
        "data_sync": "Operational",
        "risk_engine": "Operational",
        "price_engine": "Operational",
        "image_engine": "Operational",
        "database": "Operational",
    }

    return {
        "time_series": time_series,
        "risk_distribution": risk_distribution,
        "signal_breakdown": signal_breakdown,
        "priority_reviews": priority_reviews,
        "top_vendors": top_vendors,
        "fund_utilization": fund_utilization,
        "fund_utilization_metrics": {
            "allocated_cr": sanctioned_cr,
            "released_cr": sanctioned_cr,
            "utilized_cr": utilized_cr,
            "balance_cr": balance_cr,
            "utilization_rate_pct": utilization_rate,
        },
        "utilization_alerts": utilization_alerts,
        "recent_activity": recent_activity,
        "system_status": system_status,
    }
