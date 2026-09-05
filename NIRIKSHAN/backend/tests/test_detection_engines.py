import pytest
from analytics import (
    price_engine, iqr_engine, benford_engine, hhi_engine,
    duplicate_engine, composite_scorer
)

def test_price_engine_fuzzy_match_and_variance():
    catalog = [
        {"id": 1, "item_name": "LED Street Light (100W)", "category": "Movable Goods", "unit": "Each", "gem_reference_price": 11200.0, "tolerance_pct": 15.0}
    ]
    items = [
        {"item_name": "LED Street Light 100W High Brightness", "unit_price": 18500.0, "quantity": 10.0}
    ]
    res = price_engine.analyze_work_items(items, catalog)
    assert res["items_analyzed"] == 1
    assert res["high_variance_items"] == 1
    assert res["avg_variance_pct"] > 60.0
    assert res["score"] > 80.0

def test_iqr_statistical_outlier():
    cohort = [100000.0, 120000.0, 110000.0, 130000.0, 115000.0, 105000.0]
    outlier_exp = 550000.0
    res = iqr_engine.analyze_work(outlier_exp, cohort)
    assert res["outlier_status"] == "EXTREME OUTLIER"
    assert res["outlier_level"] == "RED"
    assert res["score"] >= 80.0

def test_benfords_law_distribution():
    # Synthetic values deviating from Benford
    skewed_values = [41000.0, 42000.0, 49000.0, 48000.0, 45000.0, 31000.0, 32000.0, 39000.0]
    res = benford_engine.analyze_dataset(skewed_values)
    assert "distribution" in res
    assert len(res["distribution"]) == 9
    assert res["score"] > 0

def test_hhi_vendor_concentration():
    vendor_exps = {
        "Dominant Vendor Corp": 8500000.0,
        "Minor Vendor B": 1000000.0,
        "Minor Vendor C": 500000.0
    }
    res = hhi_engine.calculate_hhi(vendor_exps, "Dominant Vendor Corp")
    assert res["hhi_score"] > 2500
    assert "HIGH" in res["concentration_level"]
    assert res["score"] >= 65.0

def test_duplicate_photo_and_geo_forensics():
    work_a = {
        "work_code": "WD-24-301",
        "project_name": "Construction of Community Hall, Banaskantha",
        "sanctioned_amount": 2500000.0,
        "latitude": 24.1724,
        "longitude": 72.4346,
        "phash": "a1b2c3d4e5f67890",
        "simulated_photo_sim": 91.0
    }
    work_b = {
        "work_code": "WD-24-302",
        "project_name": "LED Street Light Installation, Banaskantha",
        "sanctioned_amount": 1850000.0,
        "latitude": 24.1730,
        "longitude": 72.4350,
        "phash": "a1b2c3d4e5f67890",
        "simulated_photo_sim": 91.0
    }
    res = duplicate_engine.compare_works(work_a, work_b)
    assert res["geo_distance_m"] < 300.0
    assert res["combined_confidence"] in ["HIGH", "MEDIUM"]

def test_composite_risk_score():
    price_ev = {"score": 91.0}
    iqr_ev = {"score": 84.0}
    benford_ev = {"score": 61.0}
    hhi_ev = {"score": 78.0}
    photo_ev = {"score": 88.0}

    res = composite_scorer.calculate_composite_score(
        price_evidence=price_ev,
        iqr_evidence=iqr_ev,
        benford_evidence=benford_ev,
        hhi_evidence=hhi_ev,
        photo_evidence=photo_ev
    )
    assert res["composite_score"] >= 80
    assert res["risk_level"] == "HIGH"
    assert "not a fraud verdict" in res["disclaimer"]
