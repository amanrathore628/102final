import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_dashboard_stats():
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_works" in data
    assert "total_expenditure_cr" in data
    assert "flagged_works" in data

def test_dashboard_charts():
    res = client.get("/api/dashboard/charts")
    assert res.status_code == 200
    data = res.json()
    assert "time_series" in data
    assert "risk_distribution" in data
    assert "signal_breakdown" in data
    assert "priority_reviews" in data

def test_works_list():
    res = client.get("/api/works?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0
    assert "kpis" in data

def test_work_detail_and_evidence():
    res = client.get("/api/works/MPLADS-BR-00481")
    assert res.status_code == 200
    data = res.json()
    assert data["work_code"] == "MPLADS-BR-00481"
    assert "risk_assessment" in data

    ev_res = client.get("/api/works/MPLADS-BR-00481/evidence")
    assert ev_res.status_code == 200
    ev_data = ev_res.json()
    assert "module_1_price" in ev_data
    assert "module_2_iqr" in ev_data
    assert "module_3_benford" in ev_data
    assert "module_4_hhi" in ev_data
    assert "module_5_photo" in ev_data

def test_review_queue_and_decision_flow():
    res = client.get("/api/reviews")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0

    first_case_id = data["items"][0]["id"]
    decision_payload = {
        "reviewer_name": "P. Sharma",
        "reviewer_role": "Reviewer",
        "decision": "Investigation Required",
        "comment": "Field audit requested due to high price divergence."
    }
    dec_res = client.post(f"/api/reviews/{first_case_id}/decision", json=decision_payload)
    assert dec_res.status_code == 200
    assert dec_res.json()["success"] is True

def test_geo_and_prices_and_duplicates():
    assert client.get("/api/geo/districts").status_code == 200
    assert client.get("/api/prices/benchmarks").status_code == 200
    assert client.get("/api/duplicates/pairs").status_code == 200
    assert client.get("/api/reports/recent").status_code == 200
    assert client.get("/api/audit").status_code == 200
    assert client.get("/api/ingestion/sources").status_code == 200
    assert client.get("/api/risk-analysis/matrix").status_code == 200
