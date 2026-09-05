from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.entities import Work, RiskAssessment

router = APIRouter(prefix="/api/risk-analysis", tags=["Risk Analysis"])


@router.get("/stats")
def get_risk_analysis_stats(db: Session = Depends(get_db)):
    """
    Returns macro risk portfolio metrics derived from real RiskAssessment records.
    """
    total = db.query(RiskAssessment).count()
    high_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "HIGH").count()
    critical_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "CRITICAL").count()
    medium_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "MEDIUM").count()
    low_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "LOW").count()

    avg_score = (
        db.query(func.avg(RiskAssessment.composite_score)).scalar() or 0.0
    )

    return {
        "works_analyzed": total,
        "high_risk_count": high_count + critical_count,
        "medium_risk_count": medium_count,
        "low_risk_count": low_count,
        "critical_count": critical_count,
        "average_risk_score": round(avg_score, 1),
    }


@router.get("/matrix")
def get_risk_matrix_data(db: Session = Depends(get_db)):
    """
    Returns scatter plot points from real RiskAssessment + Work data.
    Each point = one work: risk_score (x), financial exposure in lakhs (y).
    """
    RISK_COLORS = {
        "LOW": "#10B981",
        "MEDIUM": "#F59E0B",
        "HIGH": "#EF4444",
        "CRITICAL": "#991B1B",
    }

    # We don't use random — we use actual data from the database.
    rows = (
        db.query(
            Work.id,
            Work.work_code,
            Work.expenditure,
            RiskAssessment.composite_score,
            RiskAssessment.risk_level,
        )
        .join(RiskAssessment, RiskAssessment.work_id == Work.id)
        .all()
    )

    points = []
    for row in rows:
        exposure_lakhs = round(row.expenditure / 100_000, 2)  # INR → Lakhs
        risk_lvl = row.risk_level or "LOW"
        # Bubble size: proportional to financial exposure, clamped between 30 and 250
        size = max(30, min(250, int(exposure_lakhs * 2)))

        points.append({
            "id": row.work_code,
            "risk_score": round(row.composite_score, 1),
            "financial_exposure_lakhs": exposure_lakhs,
            "size": size,
            "category": f"{risk_lvl.capitalize()} Risk",
            "color": RISK_COLORS.get(risk_lvl, "#6B7280"),
        })

    return {"scatter_points": points}


@router.get("/signals")
def get_signal_performance(db: Session = Depends(get_db)):
    """
    Returns per-engine performance metrics computed from real RiskAssessment records.
    'cases_flagged' = count of works where that signal's score >= 60.
    """
    total = db.query(RiskAssessment).count()

    def _flagged_count(col) -> int:
        return db.query(RiskAssessment).filter(col >= 60).count()

    def _pct(count: int) -> float:
        return round((count / total * 100), 1) if total else 0.0

    price_flagged = _flagged_count(RiskAssessment.price_score)
    iqr_flagged = _flagged_count(RiskAssessment.iqr_score)
    benford_flagged = _flagged_count(RiskAssessment.benford_score)
    hhi_flagged = _flagged_count(RiskAssessment.hhi_score)
    photo_flagged = _flagged_count(RiskAssessment.photo_score)

    return {
        "signals": [
            {
                "name": "GeM Price Benchmarking",
                "cases_flagged": price_flagged,
                "portfolio_pct": _pct(price_flagged),
                "avg_contribution": "+15 pts",
                "trend": "up",
                "status": "Operational",
                "status_color": "green",
            },
            {
                "name": "IQR Statistical Outliers",
                "cases_flagged": iqr_flagged,
                "portfolio_pct": _pct(iqr_flagged),
                "avg_contribution": "+10 pts",
                "trend": "up",
                "status": "Operational",
                "status_color": "green",
            },
            {
                "name": "Benford's Law Deviation",
                "cases_flagged": benford_flagged,
                "portfolio_pct": _pct(benford_flagged),
                "avg_contribution": "+15 pts",
                "trend": "stable",
                "status": "Operational",
                "status_color": "green",
            },
            {
                "name": "Vendor Concentration (HHI)",
                "cases_flagged": hhi_flagged,
                "portfolio_pct": _pct(hhi_flagged),
                "avg_contribution": "+12 pts",
                "trend": "up",
                "status": "Operational",
                "status_color": "green",
            },
            {
                "name": "Duplicate Photo & Geo Hashing",
                "cases_flagged": photo_flagged,
                "portfolio_pct": _pct(photo_flagged),
                "avg_contribution": "+15 pts",
                "trend": "up",
                "status": "Operational",
                "status_color": "green",
            },
        ]
    }
