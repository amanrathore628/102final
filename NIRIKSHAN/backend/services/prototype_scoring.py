"""Adapt persisted demo works to the existing five engine interfaces."""
from collections import defaultdict
from analytics import price_engine, iqr_engine, benford_engine, hhi_engine, composite_scorer
from models.entities import Work, ReferencePrice, RiskAssessment, ReviewCase

def score_work(work, db):
    refs = [{k: getattr(r, k) for k in ("id", "item_name", "category", "unit", "gem_reference_price", "tolerance_pct")}
            for r in db.query(ReferencePrice).all()]
    items = [{"item_name": i.item_name, "unit_price": i.unit_price, "quantity": i.quantity, "unit": i.unit}
             for i in work.items]
    price = price_engine.analyze_work_items(items, refs)
    for item in work.items:
        match = price_engine.match_item(item.item_name, refs)
        if match and match["match_confidence"] >= 60:
            item.matched_ref_id = match["matched_ref_id"]
            item.match_confidence = match["match_confidence"]
            ref_price = match["gem_reference_price"]
            item.variance_pct = round((item.unit_price / ref_price - 1) * 100, 1) if ref_price else 0
            item.risk_level = "High" if item.variance_pct > 30 else "Moderate" if item.variance_pct > 15 else "Normal"
    cohort = db.query(Work).filter(Work.district_id == work.district_id, Work.category == work.category).all()
    expenditures = [w.expenditure for w in cohort]
    iqr = iqr_engine.analyze_work(work.expenditure, expenditures, f"{work.district.name} / {work.category}")
    benford = benford_engine.analyze_dataset(expenditures)
    vendors = defaultdict(float)
    for peer in cohort:
        vendors[peer.vendor.name] += peer.expenditure
    hhi = hhi_engine.calculate_hhi(dict(vendors), work.vendor.name)
    ra = work.risk_assessment
    # Fixture photo comparisons are retained; CSV imports have no verified photo evidence.
    photo = (ra.photo_evidence if ra else None) or {
        "score": 0, "status": "Pending", "explanation": "No verified site photo supplied; photo signal awaits inspection."
    }
    evidence = dict(zip(("price", "iqr", "benford", "hhi", "photo"), (price, iqr, benford, hhi, photo)))
    result = composite_scorer.calculate_composite_score(price, iqr, benford, hhi, photo)
    if ra is None:
        ra = RiskAssessment(work_id=work.id)
        db.add(ra)
    for key, receipt in evidence.items():
        setattr(ra, key + "_score", receipt.get("score", 0))
        setattr(ra, key + "_evidence", receipt)
        setattr(ra, key + "_weight", getattr(composite_scorer, "w_" + key))
    ra.composite_score = result["composite_score"]
    ra.risk_level = result["risk_level"]
    ra.explanation_summary = result["explanation"]
    db.flush()
    case = db.query(ReviewCase).filter_by(work_id=work.id).first()
    if case:
        case.priority = result["priority"]
    elif result["risk_level"] in ("HIGH", "MEDIUM"):
        db.add(ReviewCase(work_id=work.id, priority=result["priority"], status="New",
                          assigned_to="P. Sharma", assigned_role="District Officer"))
    return result
