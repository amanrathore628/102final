import csv
import io
import json

def test_login_and_identity(api):
    bad = api.post("/api/auth/login", json={"email": "admin@nirikshan.gov.in", "password": "incorrect"})
    assert bad.status_code == 401
    result = api.post("/api/auth/login", json={"email": "admin@nirikshan.gov.in", "password": "admin123"})
    assert result.status_code == 200
    token = result.json()["access_token"]
    assert api.get("/api/auth/me", headers={"Authorization": "Bearer " + token}).json()["role"] == "Administrator"
    assert api.get("/api/prototype").json()["ready"]

def test_every_page_api(api):
    endpoints = ["/dashboard/stats", "/dashboard/charts", "/works", "/reviews", "/geo/districts",
                 "/prices/stats", "/prices/distribution", "/prices/benchmarks", "/duplicates/stats",
                 "/duplicates/pairs", "/reports/types", "/reports/recent", "/audit",
                 "/ingestion/sources", "/ingestion/logs", "/risk-analysis/stats",
                 "/risk-analysis/matrix", "/risk-analysis/signals"]
    for endpoint in endpoints:
        response = api.get("/api" + endpoint)
        assert response.status_code == 200, (endpoint, response.text)

def test_official_mplads_snapshot_and_filters(api):
    result = api.get("/api/official/summary")
    assert result.status_code == 200, result.text
    data = result.json()
    summary = data["summary"]
    assert summary["total_mps"] == 774
    assert summary["states_uts"] == 36
    assert summary["recommended_works"] == 131141
    assert summary["completed_works"] == 44028
    assert round(summary["allocated_amount"], 2) == 116819035627.53
    assert round(summary["expenditure"], 2) == 39953382732.14
    assert data["source"]["snapshot_date"] == "2026-09-03"

    lok_sabha = api.get("/api/official/summary?house=Lok%20Sabha").json()["summary"]
    rajya_sabha = api.get("/api/official/summary?house=Rajya%20Sabha").json()["summary"]
    assert lok_sabha["total_mps"] == 543
    assert rajya_sabha["total_mps"] == 231

    search = api.get("/api/official/mps?search=Madhya%20Pradesh&limit=100").json()
    assert search["pagination"]["total_items"] > 0
    assert all("madhya pradesh" in (row["state"] + row["constituency"] + row["mp_name"]).lower() for row in search["items"])
    assert api.get("/api/official/comparison").json()["official"]["records"] == 774
    assert api.get("/api/official/download").status_code == 200

def test_upload_survives_bad_row_and_skips_duplicate(api):
    good = {"work_code": "TEST-IMPORT-A", "project_name": "Test street lights", "state": "Bihar",
            "district": "Rohtas", "vendor_name": "Local Contractor Ltd.", "sanctioned_amount": 800000,
            "expenditure": 650000, "category": "Energy", "item_name": "LED Street Light (100W)",
            "item_quantity": 20, "item_unit_price": 19500}
    invalid = dict(good, work_code="TEST-INVALID", expenditure="nan")
    second = dict(good, work_code="TEST-IMPORT-B")
    response = api.post("/api/ingestion/upload", files={"file": ("batch.json", json.dumps([good, invalid, second]), "application/json")})
    data = response.json()
    assert data["records_imported"] == 2, data
    assert data["errors"] == 1, data
    for code in ("TEST-IMPORT-A", "TEST-IMPORT-B"):
        evidence = api.get("/api/works/" + code + "/evidence").json()
        assert evidence["module_1_price"]["score"] > 0
        assert evidence["module_5_photo"]["status"] == "Pending"
    assert api.get("/api/works/TEST-INVALID").status_code == 404
    duplicate = api.post("/api/ingestion/upload", files={"file": ("again.json", json.dumps([good]), "application/json")}).json()
    assert duplicate["records_imported"] == 0 and duplicate["skipped"] == 1
    assert api.post("/api/ingestion/upload", files={"file": ("bad.json", "{", "application/json")}).status_code == 400
    assert api.post("/api/ingestion/upload", files={"file": ("bad.txt", "hello", "text/plain")}).status_code == 400

def test_weights_and_real_recalculation(api):
    defaults = api.get("/api/settings/weights").json()
    assert api.put("/api/settings/weights", json=dict(defaults, price=31)).status_code == 422
    result = api.put("/api/settings/weights", json=defaults)
    assert result.status_code == 200
    result = api.post("/api/ingestion/analyze").json()
    assert result["success"], result
    assert result["works_scored"] == api.get("/api/dashboard/stats").json()["total_works"]

def test_reports_snapshot_formats_and_scope(api):
    for fmt in ("CSV", "JSON", "PDF"):
        created = api.post("/api/reports/generate", json={"report_type": "PORTFOLIO REPORT", "format": fmt, "district": "Rohtas"}).json()
        assert created["record_count"] > 0
        download = api.get(created["download_url"])
        assert download.status_code == 200
        if fmt == "CSV":
            rows = list(csv.DictReader(io.StringIO(download.content.decode("utf-8-sig"))))
            assert all(r["District"] == "Rohtas" for r in rows)
        elif fmt == "JSON":
            assert all(r["District"] == "Rohtas" for r in download.json())
        else:
            assert download.content.startswith(b"%PDF-")
    assert len(api.get("/api/reports/recent").json()["reports"]) >= 3
    result = api.get("/api/reports/download?type=Evidence_MPLADS-BR-00481&format=JSON").json()
    assert len(result) == 1 and result[0]["Work Code"] == "MPLADS-BR-00481"
    assert "price evidence" in result[0]
    audits = api.get("/api/reports/download?type=AuditTrail&format=JSON").json()
    assert "Action" in audits[0]
    assert api.get("/api/reports/download?format=XLSX").status_code == 400

def test_review_decision_persists_to_dossier_and_audit(api):
    work = api.get("/api/works/MPLADS-BR-00481").json()
    case_id = work["review_case"]["id"]
    decision = {"reviewer_name": "Demo Officer", "reviewer_role": "District Officer",
                "decision": "Escalate", "comment": "Prototype test: field verification required."}
    result = api.post(f"/api/reviews/{case_id}/decision", json=decision)
    assert result.json()["new_status"] == "Escalated"
    updated = api.get("/api/works/MPLADS-BR-00481").json()
    assert updated["review_case"]["status"] == "Escalated"
    log = api.get("/api/audit?work_id=MPLADS-BR-00481").json()
    assert any(decision["comment"] in e["details"] for e in log["items"])
    assert api.post(f"/api/reviews/{case_id}/decision", json=dict(decision, decision="Bogus")).status_code == 422

def test_browser_routes_and_local_assets(api):
    for path in ("/", "/login", "/works/MPLADS-BR-00481/evidence", "/review-queue", "/official-data"):
        r = api.get(path)
        assert r.status_code == 200 and "<html" in r.text.lower()
    assert api.get("/photos/community_hall_1.jpg").status_code == 200
    assert api.get("/api/does-not-exist").status_code == 404
