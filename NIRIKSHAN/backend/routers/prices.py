from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.entities import ReferencePrice, WorkItem, Work

router = APIRouter(prefix="/api/prices", tags=["Price Intelligence"])


@router.get("/stats")
def get_price_stats(db: Session = Depends(get_db)):
    """
    Returns aggregate price intelligence KPIs from real WorkItem ↔ ReferencePrice data.
    - items_analyzed: count of WorkItems that have a matched reference price.
    - average_variance_pct: mean of variance_pct across matched items.
    - over_benchmarked_expenditure_cr: total expenditure on items where variance_pct > 0, in Crores.
    - high_variance_items_count: count of WorkItems where variance_pct > 25%.
    """
    # Items with a reference price match
    matched_q = db.query(WorkItem).filter(WorkItem.matched_ref_id.isnot(None))
    items_analyzed = matched_q.count()

    avg_variance = matched_q.with_entities(func.avg(WorkItem.variance_pct)).scalar() or 0.0

    # Expenditure on items purchased above the reference price
    over_benchmark_inr = (
        matched_q
        .filter(WorkItem.variance_pct > 0)
        .with_entities(func.sum(WorkItem.total_amount))
        .scalar() or 0.0
    )
    over_benchmark_cr = round(over_benchmark_inr / 10_000_000, 2)

    high_variance_count = matched_q.filter(WorkItem.variance_pct > 25).count()

    return {
        "items_analyzed": items_analyzed,
        "average_variance_pct": round(avg_variance, 1),
        "over_benchmarked_expenditure_cr": over_benchmark_cr,
        "high_variance_items_count": high_variance_count,
        "confidence_threshold_pct": 80.0,
    }


@router.get("/distribution")
def get_price_variance_distribution(db: Session = Depends(get_db)):
    """
    Returns binned variance distribution from actual WorkItem variance_pct values.
    Bins are: <-50, -50 to -25, -25 to 0, 0 to 15, 15 to 30, 30 to 50,
               50 to 75, 75 to 100, 100 to 150, 150 to 200, >200.
    """
    matched_items = (
        db.query(WorkItem.variance_pct)
        .filter(WorkItem.matched_ref_id.isnot(None))
        .all()
    )

    bins = [
        (-200, -50, "savings"),
        (-50, -25, "savings"),
        (-25, 0, "savings"),
        (0, 15, "normal"),
        (15, 30, "moderate"),
        (30, 50, "moderate"),
        (50, 75, "elevated"),
        (75, 100, "elevated"),
        (100, 150, "high_variance"),
        (150, 200, "high_variance"),
        (200, 500, "high_variance"),
    ]

    # Representative mid-point labels for each bin
    bin_labels = [-75, -37, -12, 7, 22, 40, 62, 87, 125, 175, 250]

    counts = [0] * len(bins)
    for (v,) in matched_items:
        for i, (lo, hi, _) in enumerate(bins):
            if lo <= v < hi:
                counts[i] += 1
                break

    distribution = [
        {
            "variance_pct": bin_labels[i],
            "frequency": counts[i],
            "zone": bins[i][2],
        }
        for i in range(len(bins))
    ]

    return {"distribution": distribution}


@router.get("/benchmarks")
def get_benchmark_table(
    category: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Returns benchmark table joining WorkItem actual prices with ReferencePrice GeM catalog.
    Each row shows the highest-variance WorkItem for each ReferencePrice entry.
    """
    # Build the base query joining WorkItem → ReferencePrice
    query = (
        db.query(
            WorkItem,
            ReferencePrice,
            Work.work_code,
        )
        .join(ReferencePrice, WorkItem.matched_ref_id == ReferencePrice.id)
        .join(Work, WorkItem.work_id == Work.id)
    )

    if category and isinstance(category, str) and category != "All Categories":
        query = query.filter(ReferencePrice.category == category)
    if search and isinstance(search, str) and search.strip():
        safe = search.strip().replace("%", r"\%").replace("_", r"\_")
        query = query.filter(ReferencePrice.item_name.ilike(f"%{safe}%"))

    total = query.count()
    rows = query.offset((page - 1) * limit).limit(limit).all()

    def _risk_pill(variance_pct: float) -> str:
        if variance_pct > 40:
            return "High"
        elif variance_pct > 20:
            return "Moderate"
        elif variance_pct < -5:
            return "Savings"
        return "Normal"

    items = []
    for work_item, ref, work_code in rows:
        diff = work_item.unit_price - ref.gem_reference_price
        variance_pct = work_item.variance_pct  # Already computed by the detection engine

        conf = work_item.match_confidence or 0.0
        if conf <= 1.0:
            conf = conf * 100.0

        items.append({
            "id": work_item.id,
            "ref_id": ref.id,
            "item_code": ref.item_code,
            "item_name": work_item.item_name,
            "category": ref.category,
            "unit": ref.unit,
            "mplads_price": round(work_item.unit_price, 2),
            "gem_reference_price": round(ref.gem_reference_price, 2),
            "difference": round(diff, 2),
            "variance_pct": round(variance_pct, 1),
            "match_confidence": round(conf, 0),
            "risk": _risk_pill(variance_pct),
            "related_work": work_code,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }
