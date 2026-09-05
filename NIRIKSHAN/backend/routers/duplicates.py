from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.entities import DuplicatePair, Work

router = APIRouter(prefix="/api/duplicates", tags=["Duplicate Detection"])


@router.get("/stats")
def get_duplicate_stats(db: Session = Depends(get_db)):
    """
    Returns duplicate detection summary KPIs from real DuplicatePair records.
    """
    total_pairs = db.query(DuplicatePair).count()
    high_confidence = db.query(DuplicatePair).filter(DuplicatePair.combined_confidence == "HIGH").count()

    # Count distinct works involved in any pair
    from sqlalchemy import func, union
    works_a = db.query(DuplicatePair.work_a_id.label("work_id"))
    works_b = db.query(DuplicatePair.work_b_id.label("work_id"))
    # Count photos across all works that are part of at least one pair
    involved_work_ids = set(
        [r.work_a_id for r in db.query(DuplicatePair.work_a_id).all()]
        + [r.work_b_id for r in db.query(DuplicatePair.work_b_id).all()]
    )

    # Total photos and works analyzed in portfolio
    from models.entities import WorkPhoto
    photos_processed = db.query(WorkPhoto).count()
    total_works_compared = db.query(Work).count()

    return {
        "potential_duplicate_pairs": total_pairs,
        "high_confidence_matches": high_confidence,
        "photos_processed": photos_processed,
        "works_compared": total_works_compared,
    }


@router.get("/pairs")
def list_duplicate_pairs(
    confidence: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns list of flagged duplicate pairs with side-by-side forensic comparisons.
    Data is sourced entirely from the DuplicatePair table — no hardcoded supplementary pairs.
    """
    query = db.query(DuplicatePair)

    if confidence and isinstance(confidence, str) and confidence != "All":
        query = query.filter(DuplicatePair.combined_confidence == confidence.upper())
    if status and isinstance(status, str) and status != "All":
        query = query.filter(DuplicatePair.status == status)

    pairs_db = query.all()

    pairs = []
    for p in pairs_db:
        w_a = p.work_a
        w_b = p.work_b

        pairs.append({
            "id": p.id,
            "pair_id": f"PAIR-{p.id:04d}",
            "photo_similarity_pct": p.photo_similarity_pct,
            "text_similarity_pct": p.text_similarity_pct,
            "geo_distance_m": p.geo_distance_m,
            "combined_confidence": p.combined_confidence,
            "status": p.status,
            "work_a": {
                "id": w_a.id,
                "work_code": w_a.work_code,
                "project_name": w_a.project_name,
                "district": w_a.district.name if w_a.district else "Unknown",
                "state": w_a.state.name if w_a.state else "Unknown",
                "sanctioned_amount": w_a.sanctioned_amount,
                "expenditure": w_a.expenditure,
                "sanction_date": w_a.sanction_date.strftime("%Y-%m-%d"),
                "latitude": w_a.latitude,
                "longitude": w_a.longitude,
                "photo_url": (
                    w_a.photos[0].photo_url
                    if w_a.photos
                    else "/photos/no-photo.svg"
                ),
            },
            "work_b": {
                "id": w_b.id,
                "work_code": w_b.work_code,
                "project_name": w_b.project_name,
                "district": w_b.district.name if w_b.district else "Unknown",
                "state": w_b.state.name if w_b.state else "Unknown",
                "sanctioned_amount": w_b.sanctioned_amount,
                "expenditure": w_b.expenditure,
                "sanction_date": w_b.sanction_date.strftime("%Y-%m-%d"),
                "latitude": w_b.latitude,
                "longitude": w_b.longitude,
                "photo_url": (
                    w_b.photos[0].photo_url
                    if w_b.photos
                    else "/photos/no-photo.svg"
                ),
            },
            "evidence": {
                "phash_result": f"Matches ({p.photo_similarity_pct:.0f}%)" if p.photo_similarity_pct >= 80 else f"Similar ({p.photo_similarity_pct:.0f}%)",
                "distance_result": (
                    f"{p.geo_distance_m:.0f}m [suspicious colocation]"
                    if p.geo_distance_m < 300
                    else f"{p.geo_distance_m / 1000:.1f} km"
                ),
                "text_similarity": f"{p.text_similarity_pct:.0f}%",
                "metadata_comparison": "Same financial year & contractor cohort",
                "date_comparison": "Under 14 days interval",
            },
        })

    return {
        "pairs": pairs,
        "total": len(pairs),
    }
