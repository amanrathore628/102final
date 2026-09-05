import os
import sys
import datetime
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from models.entities import (
    State, District, Constituency, Vendor, ReferencePrice,
    Work, WorkItem, WorkPhoto, RiskAssessment, ReviewCase,
    ReviewDecision, AuditEvent, IngestionRun, DuplicatePair, User
)
from analytics import (
    price_engine, iqr_engine, benford_engine, hhi_engine,
    duplicate_engine, composite_scorer
)

def seed_database(force: bool = False):
    """
    Creates tables and seeds a coherent, realistic synthetic dataset
    matching all reference UI dashboards, metrics, and case files.
    """
    if force:
        print("[Seeder] Force flag enabled: resetting all tables...")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Check if already seeded
    if db.query(Work).count() > 0 and not force:
        # Still seed users if the table was just created
        _seed_demo_users(db)
        print("[Seeder] Database already populated. Skipping re-seed.")
        db.close()
        return

    print("[Seeder] Populating NIRIKSHAN database with seed dataset...")

    # 1. Seed States
    states_data = [
        {"name": "Bihar", "code": "BR", "allocated": 2800.0, "released": 2400.0, "utilized": 1850.0},
        {"name": "Gujarat", "code": "GJ", "allocated": 3200.0, "released": 2900.0, "utilized": 2550.0},
        {"name": "Rajasthan", "code": "RJ", "allocated": 2500.0, "released": 2100.0, "utilized": 1720.0},
        {"name": "Maharashtra", "code": "MH", "allocated": 4800.0, "released": 4200.0, "utilized": 3650.0},
        {"name": "Uttar Pradesh", "code": "UP", "allocated": 5200.0, "released": 4600.0, "utilized": 3900.0},
        {"name": "Karnataka", "code": "KA", "allocated": 2600.0, "released": 2300.0, "utilized": 2010.0},
    ]
    state_objs = {}
    for s in states_data:
        state = State(
            name=s["name"],
            code=s["code"],
            total_allocated=s["allocated"],
            total_released=s["released"],
            total_utilized=s["utilized"]
        )
        db.add(state)
        db.flush()
        state_objs[s["name"]] = state

    # 2. Seed Districts
    districts_data = [
        {"name": "Rohtas", "state": "Bihar", "works": 125, "exp": 3020.4, "flagged": 22, "high_risk": 4, "util": 78.0, "risk_score": 82.0, "signal": "Price Benchmarking"},
        {"name": "Patna", "state": "Bihar", "works": 180, "exp": 4120.0, "flagged": 28, "high_risk": 6, "util": 82.0, "risk_score": 74.0, "signal": "IQR Outlier"},
        {"name": "Banaskantha", "state": "Gujarat", "works": 145, "exp": 3218.4, "flagged": 34, "high_risk": 8, "util": 72.0, "risk_score": 94.0, "signal": "Vendor HHI"},
        {"name": "Surat", "state": "Gujarat", "works": 210, "exp": 4500.0, "flagged": 18, "high_risk": 3, "util": 89.0, "risk_score": 45.0, "signal": "Price Benchmarking"},
        {"name": "Jaipur", "state": "Rajasthan", "works": 165, "exp": 3120.4, "flagged": 25, "high_risk": 5, "util": 78.0, "risk_score": 88.0, "signal": "Price Benchmarking"},
        {"name": "Pune", "state": "Maharashtra", "works": 195, "exp": 3850.0, "flagged": 15, "high_risk": 2, "util": 88.0, "risk_score": 42.0, "signal": "Benford's Law"},
    ]
    district_objs = {}
    for d in districts_data:
        district = District(
            state_id=state_objs[d["state"]].id,
            name=d["name"],
            total_works=d["works"],
            total_expenditure=d["exp"],
            flagged_works=d["flagged"],
            high_risk_works=d["high_risk"],
            avg_utilization=d["util"],
            avg_risk_score=d["risk_score"],
            top_signal=d["signal"]
        )
        db.add(district)
        db.flush()
        district_objs[d["name"]] = district

    # 3. Seed Constituencies
    constituencies_data = [
        {"name": "Sasaram (SC)", "district": "Rohtas", "mp_name": "Shri Manoj Kumar", "mp_house": "Lok Sabha"},
        {"name": "Patna Sahib", "district": "Patna", "mp_name": "Shri Ravi Shankar Prasad", "mp_house": "Lok Sabha"},
        {"name": "Banaskantha", "district": "Banaskantha", "mp_name": "Smt. Geniben Thakor", "mp_house": "Lok Sabha"},
        {"name": "Jaipur", "district": "Jaipur", "mp_name": "Smt. Manju Sharma", "mp_house": "Lok Sabha"},
        {"name": "Pune", "district": "Pune", "mp_name": "Shri Murlidhar Mohol", "mp_house": "Lok Sabha"},
    ]
    constituency_objs = {}
    for c in constituencies_data:
        const = Constituency(
            district_id=district_objs[c["district"]].id,
            name=c["name"],
            mp_name=c["mp_name"],
            mp_house=c["mp_house"]
        )
        db.add(const)
        db.flush()
        constituency_objs[c["district"]] = const

    # 4. Seed Reference Prices (GeM Benchmark Catalog)
    ref_prices_data = [
        {"code": "GEM-LED-100W", "name": "LED Street Light (100W)", "category": "Movable Goods", "unit": "Each", "price": 11200.0, "min_price": 9500.0, "max_price": 13000.0, "tolerance": 15.0},
        {"code": "GEM-CEM-53G", "name": "Cement (Grade 53)", "category": "Civil Materials", "unit": "Bag (50kg)", "price": 380.0, "min_price": 340.0, "max_price": 420.0, "tolerance": 12.0},
        {"code": "GEM-STEEL-TMT", "name": "Steel (TMT Bar)", "category": "Civil Materials", "unit": "Metric Ton", "price": 58000.0, "min_price": 52000.0, "max_price": 64000.0, "tolerance": 10.0},
        {"code": "GEM-DESKTOP-I5", "name": "Computer (Desktop)", "category": "Movable Goods", "unit": "Each", "price": 42500.0, "min_price": 38000.0, "max_price": 48000.0, "tolerance": 15.0},
        {"code": "GEM-PUMP-5HP", "name": "Water Pump (5 HP)", "category": "Movable Goods", "unit": "Each", "price": 24000.0, "min_price": 21000.0, "max_price": 27000.0, "tolerance": 15.0},
        {"code": "GEM-SOLAR-330W", "name": "Solar Panel (300W)", "category": "Movable Goods", "unit": "Each", "price": 12800.0, "min_price": 11000.0, "max_price": 14500.0, "tolerance": 15.0},
        {"code": "GEM-RO-250L", "name": "RO Water Purifier Commercial", "category": "Movable Goods", "unit": "Each", "price": 85000.0, "min_price": 75000.0, "max_price": 95000.0, "tolerance": 15.0},
        {"code": "GEM-HIGHMAST", "name": "High Mast Light (12.5m)", "category": "Movable Goods", "unit": "Each", "price": 185000.0, "min_price": 160000.0, "max_price": 210000.0, "tolerance": 15.0},
    ]
    ref_catalog = []
    for r in ref_prices_data:
        ref = ReferencePrice(
            item_code=r["code"],
            item_name=r["name"],
            category=r["category"],
            unit=r["unit"],
            gem_reference_price=r["price"],
            min_price=r["min_price"],
            max_price=r["max_price"],
            tolerance_pct=r["tolerance"]
        )
        db.add(ref)
        db.flush()
        ref_catalog.append({
            "id": ref.id,
            "item_name": ref.item_name,
            "category": ref.category,
            "unit": ref.unit,
            "gem_reference_price": ref.gem_reference_price,
            "tolerance_pct": ref.tolerance_pct
        })

    # 5. Seed Vendors
    vendors_data = [
        {"name": "Local Contractor Ltd.", "gstin": "10AAACL1234F1Z1", "pan": "AAACL1234F", "works": 35, "exp": 21500000.0, "risk": 82.0, "status": "Under Review"},
        {"name": "Sharma Contractors", "gstin": "24AABCS5678K1Z5", "pan": "AABCS5678K", "works": 128, "exp": 321840000.0, "risk": 92.0, "status": "Under Review"},
        {"name": "Singh Builders", "gstin": "10AABCS9988M1Z2", "pan": "AABCS9988M", "works": 78, "exp": 58000000.0, "risk": 95.0, "status": "Under Review"},
        {"name": "Jaipur Lights Co.", "gstin": "08AABCJ1122D1Z9", "pan": "AABCJ1122D", "works": 45, "exp": 14800000.0, "risk": 68.0, "status": "Active"},
        {"name": "Reliance Infra", "gstin": "27AABCR3344P1Z3", "pan": "AABCR3344P", "works": 110, "exp": 45000000.0, "risk": 35.0, "status": "Active"},
        {"name": "Apex Civil Infra Ltd.", "gstin": "27AACCA9900L1Z8", "pan": "AACCA9900L", "works": 24, "exp": 18500000.0, "risk": 28.0, "status": "Active"},
    ]
    vendor_objs = {}
    for v in vendors_data:
        vendor = Vendor(
            name=v["name"],
            gstin=v["gstin"],
            pan=v["pan"],
            total_works=v["works"],
            total_expenditure=v["exp"],
            avg_risk_score=v["risk"],
            status=v["status"]
        )
        db.add(vendor)
        db.flush()
        vendor_objs[v["name"]] = vendor

    # 6. Seed Specific Highlight Works (from Specification & UI reference screens)
    works_seed_definitions = [
        {
            "code": "MPLADS-BR-00481",
            "name": "Construction of Community Hall",
            "category": "Community Building",
            "state": "Bihar",
            "district": "Rohtas",
            "vendor": "Local Contractor Ltd.",
            "sanction": 2500000.0,
            "expenditure": 2150000.0,
            "utilization": 86.0,
            "completion": 75.0,
            "days": 412,
            "status": "Under Review",
            "lat": 24.9567,
            "lng": 83.9856,
            "agency": "District Rural Development Agency, Rohtas",
            "items": [
                {"name": "LED Street Light (100W)", "qty": 10.0, "unit": "Each", "unit_price": 18500.0},
                {"name": "Cement (Grade 53)", "qty": 1500.0, "unit": "Bag (50kg)", "unit_price": 490.0},
                {"name": "Steel (TMT Bar)", "qty": 12.0, "unit": "Metric Ton", "unit_price": 72000.0},
            ],
            "photo_sim": 88.0,
            "phash": "d3f4a1c2b5e688aa",
            "is_flagged": True
        },
        {
            "code": "WD-24-301",
            "name": "Construction of Community Hall, Banaskantha",
            "category": "Infrastructure",
            "state": "Gujarat",
            "district": "Banaskantha",
            "vendor": "Sharma Contractors",
            "sanction": 2500000.0,
            "expenditure": 2150000.0,
            "utilization": 86.0,
            "completion": 80.0,
            "days": 380,
            "status": "Work in Progress",
            "lat": 24.1724,
            "lng": 72.4346,
            "agency": "Banaskantha District Panchayat",
            "items": [
                {"name": "LED Street Light (100W)", "qty": 20.0, "unit": "Each", "unit_price": 18500.0},
                {"name": "Cement (Grade 53)", "qty": 2000.0, "unit": "Bag (50kg)", "unit_price": 480.0},
            ],
            "photo_sim": 91.0,
            "phash": "a1b2c3d4e5f67890",
            "is_flagged": True
        },
        {
            "code": "WD-24-302",
            "name": "LED Street Light Installation, Banaskantha",
            "category": "Energy",
            "state": "Gujarat",
            "district": "Banaskantha",
            "vendor": "Sharma Contractors",
            "sanction": 1850000.0,
            "expenditure": 1850000.0,
            "utilization": 100.0,
            "completion": 100.0,
            "days": 365,
            "status": "Completed",
            "lat": 24.1730,
            "lng": 72.4350,
            "agency": "Banaskantha District Panchayat",
            "items": [
                {"name": "LED Street Light (100W)", "qty": 100.0, "unit": "Each", "unit_price": 18500.0},
            ],
            "photo_sim": 91.0,
            "phash": "a1b2c3d4e5f67899", # 1 bit difference (98% match)
            "is_flagged": True
        },
        {
            "code": "SL-24-115",
            "name": "Solar Street Light Installation, Jaipur",
            "category": "Energy",
            "state": "Rajasthan",
            "district": "Jaipur",
            "vendor": "Jaipur Lights Co.",
            "sanction": 1500000.0,
            "expenditure": 1480000.0,
            "utilization": 98.6,
            "completion": 90.0,
            "days": 210,
            "status": "Completed",
            "lat": 26.9124,
            "lng": 75.7873,
            "agency": "Jaipur Nagar Nigam",
            "items": [
                {"name": "Solar Panel (300W)", "qty": 50.0, "unit": "Each", "unit_price": 15200.0},
                {"name": "LED Street Light (100W)", "qty": 50.0, "unit": "Each", "unit_price": 14400.0},
            ],
            "photo_sim": 45.0,
            "phash": "f0e1d2c3b4a59687",
            "is_flagged": True
        },
        {
            "code": "SC-24-420",
            "name": "School Building Construction, Patna",
            "category": "Education",
            "state": "Bihar",
            "district": "Patna",
            "vendor": "Singh Builders",
            "sanction": 6000000.0,
            "expenditure": 5800000.0,
            "utilization": 96.6,
            "completion": 95.0,
            "days": 540,
            "status": "Under Audit",
            "lat": 25.5941,
            "lng": 85.1376,
            "agency": "Bihar State Educational Infrastructure Dev Corp",
            "items": [
                {"name": "Cement (Grade 53)", "qty": 5000.0, "unit": "Bag (50kg)", "unit_price": 510.0},
                {"name": "Steel (TMT Bar)", "qty": 40.0, "unit": "Metric Ton", "unit_price": 76000.0},
                {"name": "Computer (Desktop)", "qty": 20.0, "unit": "Each", "unit_price": 54000.0},
            ],
            "photo_sim": 60.0,
            "phash": "1122334455667788",
            "is_flagged": True
        },
        {
            "code": "RD-24-005",
            "name": "Road Repair Work, Pune",
            "category": "Roads",
            "state": "Maharashtra",
            "district": "Pune",
            "vendor": "Reliance Infra",
            "sanction": 4500000.0,
            "expenditure": 1500000.0,
            "utilization": 33.3,
            "completion": 30.0,
            "days": 90,
            "status": "Just Sanctioned",
            "lat": 18.5204,
            "lng": 73.8567,
            "agency": "Pune Municipal Corporation",
            "items": [
                {"name": "Cement (Grade 53)", "qty": 1000.0, "unit": "Bag (50kg)", "unit_price": 385.0},
            ],
            "photo_sim": 15.0,
            "phash": "9988776655443322",
            "is_flagged": False
        },
    ]

    # Add 45 more synthetic realistic works to populate full lists & cohorts
    random.seed(42)
    categories = ["Infrastructure", "Community Building", "Energy", "Education", "Roads", "Water Supply", "Healthcare"]
    all_districts = list(districts_data)

    for i in range(1, 46):
        if i == 4:
            dist_meta = next(d for d in all_districts if d["name"] == "Jaipur")
            cat = "Energy"
            sanction = 2500000.0
            util_factor = 0.92
            expenditure = 2300000.0
            vendor_name = "Jaipur Lights Co."
            code = "MPLADS-RJ-1004"
            is_risky = True
            lat = 26.9124
            lng = 75.7873
            name = "Solar Street Light Installation, Jaipur Ward 4"
            p_hash = "e1f2a3b4c5d67890"
            p_sim = 84.0
        elif i == 8:
            dist_meta = next(d for d in all_districts if d["name"] == "Jaipur")
            cat = "Energy"
            sanction = 2200000.0
            util_factor = 0.95
            expenditure = 2090000.0
            vendor_name = "Jaipur Lights Co."
            code = "MPLADS-RJ-1008"
            is_risky = True
            lat = 26.9130
            lng = 75.7878
            name = "High Mast Solar Lighting, Jaipur Ward 4 Extension"
            p_hash = "e1f2a3b4c5d67891"
            p_sim = 84.0
        else:
            dist_meta = random.choice(all_districts)
            cat = random.choice(categories)
            sanction = random.choice([800000.0, 1200000.0, 2500000.0, 3500000.0, 5000000.0, 7500000.0])
            util_factor = random.uniform(0.4, 0.98)
            expenditure = round(sanction * util_factor, -3)
            vendor_name = random.choice(list(vendor_objs.keys()))
            code = f"MPLADS-{state_objs[dist_meta['state']].code}-{1000 + i}"
            is_risky = (i % 4 == 0)
            lat = 20.0 + random.uniform(0.1, 8.0)
            lng = 72.0 + random.uniform(0.1, 15.0)
            name = f"{cat} Project at {dist_meta['name']} Block {i % 5 + 1}"
            p_hash = f"{random.getrandbits(64):016x}"
            p_sim = random.uniform(10.0, 45.0)

            ref1 = ref_prices_data[(i * 2) % len(ref_prices_data)]
            ref2 = ref_prices_data[(i * 2 + 1) % len(ref_prices_data)]
            qty1 = float(2 + (i % 3)) if ref1["price"] > 50000 else (float(8 + (i % 4) * 3) if ref1["price"] > 5000 else float(50 + (i % 5) * 20))
            qty2 = float(2 + (i % 2)) if ref2["price"] > 50000 else (float(6 + (i % 3) * 3) if ref2["price"] > 5000 else float(40 + (i % 4) * 25))

        works_seed_definitions.append({
            "code": code,
            "name": name,
            "category": cat,
            "state": dist_meta["state"],
            "district": dist_meta["name"],
            "vendor": vendor_name,
            "sanction": sanction,
            "expenditure": expenditure,
            "utilization": round(util_factor * 100, 1),
            "completion": round(min(100.0, util_factor * 100 + random.uniform(-5, 10)), 1),
            "days": random.randint(30, 600),
            "status": "Completed" if util_factor > 0.9 else ("Under Review" if is_risky else "Work in Progress"),
            "lat": lat,
            "lng": lng,
            "agency": f"{dist_meta['name']} Public Works Dept",
            "items": [
                {"name": ref1["name"], "qty": qty1, "unit": ref1["unit"], "unit_price": round(ref1["price"] * (1.55 if is_risky else (0.92 + (i % 6) * 0.04)), 2)},
                {"name": ref2["name"], "qty": qty2, "unit": ref2["unit"], "unit_price": round(ref2["price"] * (1.45 if is_risky else (0.95 + (i % 4) * 0.03)), 2)},
            ],
            "photo_sim": p_sim,
            "phash": p_hash,
            "is_flagged": is_risky
        })

    # Prepare cohort lists for statistical IQR & HHI engines
    expenditures_by_district = {}
    vendors_by_district = {}

    for w_def in works_seed_definitions:
        d_name = w_def["district"]
        if d_name not in expenditures_by_district:
            expenditures_by_district[d_name] = []
        expenditures_by_district[d_name].append(w_def["expenditure"])

        v_name = w_def["vendor"]
        if d_name not in vendors_by_district:
            vendors_by_district[d_name] = {}
        vendors_by_district[d_name][v_name] = vendors_by_district[d_name].get(v_name, 0.0) + w_def["expenditure"]

    created_works = []
    created_assessments = []

    # Insert Works, Items, Photos, and compute Detection Engines
    for w_def in works_seed_definitions:
        st = state_objs[w_def["state"]]
        dt = district_objs[w_def["district"]]
        vd = vendor_objs[w_def["vendor"]]
        cs = constituency_objs.get(w_def["district"])

        work = Work(
            work_code=w_def["code"],
            project_name=w_def["name"],
            category=w_def["category"],
            state_id=st.id,
            district_id=dt.id,
            constituency_id=cs.id if cs else None,
            vendor_id=vd.id,
            sanctioned_amount=w_def["sanction"],
            expenditure=w_def["expenditure"],
            utilization_pct=w_def["utilization"],
            completion_pct=w_def["completion"],
            days_since_sanction=w_def["days"],
            status=w_def["status"],
            latitude=w_def["lat"],
            longitude=w_def["lng"],
            executing_agency=w_def["agency"],
            sanction_date=datetime.datetime.utcnow() - datetime.timedelta(days=w_def["days"])
        )
        db.add(work)
        db.flush()

        # Add line items with GeM fuzzy matching
        for item_data in w_def["items"]:
            matched_ref_id = None
            match_conf = 0.0
            variance_pct = 0.0
            risk_level = "Normal"

            match_res = price_engine.match_item(item_data["name"], ref_catalog)
            if match_res and match_res["match_confidence"] >= 50.0:
                matched_ref_id = match_res["matched_ref_id"]
                match_conf = match_res["match_confidence"]
                ref_price = match_res["gem_reference_price"]
                if ref_price > 0:
                    variance_pct = round(((item_data["unit_price"] - ref_price) / ref_price) * 100.0, 1)
                    if variance_pct > match_res["tolerance_pct"] * 2:
                        risk_level = "High"
                    elif variance_pct > match_res["tolerance_pct"]:
                        risk_level = "Moderate"

            item = WorkItem(
                work_id=work.id,
                item_name=item_data["name"],
                category="Movable Goods" if any(k in item_data["name"] for k in ["LED", "Solar", "Computer", "Pump", "Purifier"]) else "Civil Materials",
                quantity=item_data["qty"],
                unit=item_data["unit"],
                unit_price=item_data["unit_price"],
                total_amount=item_data["qty"] * item_data["unit_price"],
                matched_ref_id=matched_ref_id,
                match_confidence=match_conf,
                variance_pct=variance_pct,
                risk_level=risk_level
            )
            db.add(item)
        db.flush()

        # Add Photos (using real local photos in public/photos)
        is_lighting = any(k in work.project_name for k in ["Light", "Solar", "LED", "Energy"])
        photo_1 = WorkPhoto(
            work_id=work.id,
            photo_url="/photos/street_light_1.jpg" if is_lighting else "/photos/community_hall_1.jpg",
            stage="Before/Early Stage",
            latitude=work.latitude,
            longitude=work.longitude,
            phash=w_def["phash"],
            dhash=w_def["phash"]
        )
        photo_2 = WorkPhoto(
            work_id=work.id,
            photo_url="/photos/street_light_1.jpg" if is_lighting else "/photos/community_hall_1.jpg",
            stage="Current Stage",
            latitude=work.latitude + 0.0001,
            longitude=work.longitude + 0.0001,
            phash=w_def["phash"],
            dhash=w_def["phash"]
        )
        db.add(photo_1)
        db.add(photo_2)

        # -------------------------------------------------------------
        # RUN 5 DETECTION ENGINES ON SEEDED WORK
        # -------------------------------------------------------------
        # 1. Price Engine
        price_evidence = price_engine.analyze_work_items([
            {"item_name": it["name"], "unit_price": it["unit_price"], "quantity": it["qty"], "unit": it["unit"]}
            for it in w_def["items"]
        ], ref_catalog)

        # 2. IQR Engine
        cohort_exp = expenditures_by_district[w_def["district"]]
        iqr_evidence = iqr_engine.analyze_work(w_def["expenditure"], cohort_exp, f"District: {w_def['district']}")

        # 3. Benford's Law Engine
        benford_values = [w_def["expenditure"], w_def["sanction"]] + [it["unit_price"] * it["qty"] for it in w_def["items"]]
        benford_evidence = benford_engine.analyze_dataset(benford_values + [random.randint(10000, 990000) for _ in range(15)])

        # 4. Vendor HHI Engine
        vendor_exp_map = vendors_by_district[w_def["district"]]
        hhi_evidence = hhi_engine.calculate_hhi(vendor_exp_map, w_def["vendor"])

        # 5. Duplicate Photo & Geo Engine
        photo_sim_evidence = {
            "score": round(w_def.get("photo_sim", 15.0), 1),
            "photo_similarity_pct": round(w_def.get("photo_sim", 15.0), 1),
            "text_similarity_pct": 87.0 if w_def.get("photo_sim", 0) > 80 else 35.0,
            "geo_distance_m": 115.0 if w_def.get("photo_sim", 0) > 80 else 4500.0,
            "geo_relationship": "115m [suspicious]" if w_def.get("photo_sim", 0) > 80 else "Normal Proximity",
            "combined_confidence": "HIGH" if w_def.get("photo_sim", 0) > 80 else "LOW",
            "explanation": "High perceptual hash match and geographic colocation flagged." if w_def.get("photo_sim", 0) > 80 else "No duplicate works detected."
        }

        # Override for highlighted reference work MPLADS-BR-00481 (Composite 82 / 100)
        if work.work_code == "MPLADS-BR-00481":
            price_evidence["score"] = 91.0
            iqr_evidence["score"] = 84.0
            benford_evidence["score"] = 61.0
            hhi_evidence["score"] = 78.0
            photo_sim_evidence["score"] = 88.0

        # Composite Scoring
        composite_result = composite_scorer.calculate_composite_score(
            price_evidence=price_evidence,
            iqr_evidence=iqr_evidence,
            benford_evidence=benford_evidence,
            hhi_evidence=hhi_evidence,
            photo_evidence=photo_sim_evidence
        )

        risk_assessment = RiskAssessment(
            work_id=work.id,
            composite_score=composite_result["composite_score"],
            risk_level=composite_result["risk_level"],
            price_score=price_evidence["score"],
            price_weight=0.30,
            iqr_score=iqr_evidence["score"],
            iqr_weight=0.20,
            benford_score=benford_evidence["score"],
            benford_weight=0.15,
            hhi_score=hhi_evidence["score"],
            hhi_weight=0.15,
            photo_score=photo_sim_evidence["score"],
            photo_weight=0.20,
            price_evidence=price_evidence,
            iqr_evidence=iqr_evidence,
            benford_evidence=benford_evidence,
            hhi_evidence=hhi_evidence,
            photo_evidence=photo_sim_evidence,
            explanation_summary=composite_result["explanation"]
        )
        db.add(risk_assessment)
        db.flush()
        created_assessments.append(risk_assessment)

        # Create Review Case if High or Medium Risk
        if composite_result["composite_score"] >= 50 or work.work_code in ["MPLADS-BR-00481", "WD-24-301", "SL-24-115", "SC-24-420"]:
            review_case = ReviewCase(
                work_id=work.id,
                priority=composite_result["priority"],
                status="New" if work.work_code != "MPLADS-BR-00481" else "In Review",
                assigned_to="P. Sharma",
                assigned_role="Reviewer",
                age_days=random.randint(2, 45)
            )
            db.add(review_case)
            db.flush()

            # Seed an initial decision/comment for demonstration
            if work.work_code == "MPLADS-BR-00481":
                decision = ReviewDecision(
                    review_case_id=review_case.id,
                    reviewer_name="P. Sharma",
                    reviewer_role="Reviewer",
                    decision="Investigation Required",
                    comment="Price variance on LED street lights (+94.3%) and duplicate photo match with WD-24-302 require verification from the field engineer."
                )
                db.add(decision)

        # Add Audit Events
        audit_event_1 = AuditEvent(
            work_id=work.id,
            actor_name="Data Sync",
            actor_role="System",
            action="Dataset synchronized",
            details=f"Work record {work.work_code} ingested and normalized from eSAKSHI portal.",
            previous_state="",
            new_state=work.status
        )
        audit_event_2 = AuditEvent(
            work_id=work.id,
            actor_name="Risk Engine",
            actor_role="System",
            action="Risk recalculated",
            details=f"Evaluated 5 detection engines. Composite risk score calculated as {composite_result['composite_score']}/100 ({composite_result['risk_level']}).",
            previous_state="0",
            new_state=str(composite_result['composite_score'])
        )
        db.add(audit_event_1)
        db.add(audit_event_2)

        created_works.append(work)

    # -------------------------------------------------------------
    # 7. Dynamically Sync District Aggregates With Real Seeded Works
    # -------------------------------------------------------------
    for dt_name, dt_obj in district_objs.items():
        dt_works = [w for w in created_works if w.district_id == dt_obj.id]
        if dt_works:
            dt_obj.total_works = len(dt_works)
            total_exp_inr = sum(w.expenditure for w in dt_works)
            dt_obj.total_expenditure = round(total_exp_inr / 10_000_000.0, 2)  # Crores
            dt_obj.avg_utilization = round(sum(w.utilization_pct for w in dt_works) / len(dt_works), 1)

            dt_work_ids = {w.id for w in dt_works}
            dt_assessments = [a for a in created_assessments if a.work_id in dt_work_ids]
            if dt_assessments:
                dt_obj.flagged_works = sum(1 for a in dt_assessments if a.composite_score >= 50)
                dt_obj.high_risk_works = sum(1 for a in dt_assessments if a.risk_level in ["High", "HIGH", "CRITICAL"])
                dt_obj.avg_risk_score = round(sum(a.composite_score for a in dt_assessments) / len(dt_assessments), 1)

    # -------------------------------------------------------------
    # 8. Seed 3 Interactive Candidate Duplicate Pairs
    # -------------------------------------------------------------
    # Pair 1: WD-24-301 vs WD-24-302 (High confidence, Banaskantha)
    w_301 = next((w for w in created_works if w.work_code == "WD-24-301"), None)
    w_302 = next((w for w in created_works if w.work_code == "WD-24-302"), None)
    if w_301 and w_302:
        db.add(DuplicatePair(
            work_a_id=w_301.id,
            work_b_id=w_302.id,
            photo_similarity_pct=91.0,
            text_similarity_pct=87.0,
            geo_distance_m=115.0,
            combined_confidence="HIGH",
            status="Flagged"
        ))

    # Pair 2: MPLADS-BR-00481 vs SC-24-420 (Medium confidence, Bihar)
    w_481 = next((w for w in created_works if w.work_code == "MPLADS-BR-00481"), None)
    w_420 = next((w for w in created_works if w.work_code == "SC-24-420"), None)
    if w_481 and w_420:
        db.add(DuplicatePair(
            work_a_id=w_481.id,
            work_b_id=w_420.id,
            photo_similarity_pct=68.0,
            text_similarity_pct=62.0,
            geo_distance_m=420.0,
            combined_confidence="MEDIUM",
            status="Under Review"
        ))

    # Pair 3: MPLADS-RJ-1004 vs MPLADS-RJ-1008 (Colocation match, Rajasthan)
    w_1004 = next((w for w in created_works if w.work_code == "MPLADS-RJ-1004"), None)
    w_1008 = next((w for w in created_works if w.work_code == "MPLADS-RJ-1008"), None)
    if w_1004 and w_1008:
        db.add(DuplicatePair(
            work_a_id=w_1004.id,
            work_b_id=w_1008.id,
            photo_similarity_pct=84.0,
            text_similarity_pct=74.0,
            geo_distance_m=95.0,
            combined_confidence="HIGH",
            status="Flagged"
        ))

    # 9. Seed Ingestion Runs
    ingestion_runs_data = [
        {"source": "eSAKSHI Bulk Import Q2", "records": 1565210, "status": "Completed", "errors": 0, "warnings": 2, "log": "Bulk ingestion completed. Normalized 1.56M records across 764 constituencies."},
        {"source": "data.gov.in Records Import", "records": 842500, "status": "Completed", "errors": 0, "warnings": 1, "log": "data.gov.in sync successful. Reconciled expenditure metrics."},
        {"source": "GeM Updated Catalog", "records": 3218, "status": "Completed", "errors": 0, "warnings": 0, "log": "GeM reference pricing updated. Benchmark rates synchronized for 3,218 item codes."},
        {"source": "Geo-tagged Photos Batch", "records": 1565, "status": "Completed", "errors": 0, "warnings": 0, "log": "Computed perceptual hashes and GPS bounding coordinates for 1,565 uploaded photos."}
    ]
    for ir in ingestion_runs_data:
        run = IngestionRun(
            source_dataset=ir["source"],
            records_imported=ir["records"],
            status=ir["status"],
            errors_count=ir["errors"],
            warnings_count=ir["warnings"],
            log_text=ir["log"]
        )
        db.add(run)

    db.commit()
    _seed_demo_users(db)
    db.close()
    print(f"[Seeder] Database seeding completed successfully! Total works seeded: {len(created_works)}")


def _seed_demo_users(db):
    """Seeds 5 demo users (one per role). Idempotent — skips if email already exists."""
    from auth_utils import hash_password
    demo_users = [
        {"name": "Arjun Mehta",         "email": "admin@nirikshan.gov.in",         "password": "admin123",    "role": "Administrator"},
        {"name": "Dr. R. Krishnamurthy","email": "ministry@nirikshan.gov.in",      "password": "ministry123", "role": "Ministry Officer"},
        {"name": "Sunita Patel",         "email": "state.officer@nirikshan.gov.in", "password": "state123",    "role": "State Officer"},
        {"name": "P. Sharma",            "email": "district@nirikshan.gov.in",      "password": "district123", "role": "District Officer"},
        {"name": "Rajesh Kumar MP",      "email": "mp@nirikshan.gov.in",            "password": "mp123",       "role": "MP"},
    ]
    created = 0
    for u in demo_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            db.add(User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            ))
            created += 1
    if created:
        db.commit()
        print(f"[Seeder] Created {created} demo user(s).")
    else:
        print("[Seeder] Demo users already exist.")

if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv or "-f" in sys.argv
    seed_database(force=force)
