from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.entities import District, State, Work

router = APIRouter(prefix="/api/geo", tags=["Geographic Intelligence"])

@router.get("/districts")
def get_geographic_districts(
    state: str = Query(None),
    layer: str = Query("Risk Score", description="Risk Score, Expenditure, Utilization, Duplicate Works, Vendor Concentration, Delayed Works"),
    db: Session = Depends(get_db)
):
    """
    Returns district-level spatial risk data, choropleth rankings, and comparison metrics.
    """
    query = db.query(District).join(District.state)
    if state and state != "All India":
        query = query.filter(State.name == state)

    districts_db = query.all()

    districts = []
    for d in districts_db:
        # Determine center lat/lng based on district name
        lat_map = {
            "Rohtas": 24.9567, "Patna": 25.5941, "Gaya": 24.7914, "Muzaffarpur": 26.1209,
            "Banaskantha": 24.1724, "Surat": 21.1702, "Ahmedabad": 23.0225, "Vadodara": 22.3072,
            "Jaipur": 26.9124, "Jodhpur": 26.2389, "Udaipur": 24.5854, "Bikaner": 28.0229,
            "Pune": 18.5204, "Nagpur": 21.1458, "Nashik": 19.9975, "Thane": 19.2183
        }
        lng_map = {
            "Rohtas": 83.9856, "Patna": 85.1376, "Gaya": 85.0002, "Muzaffarpur": 85.3647,
            "Banaskantha": 72.4346, "Surat": 72.8311, "Ahmedabad": 72.5714, "Vadodara": 73.1812,
            "Jaipur": 75.7873, "Jodhpur": 73.0243, "Udaipur": 73.7125, "Bikaner": 73.3119,
            "Pune": 73.8567, "Nagpur": 79.0882, "Nashik": 73.7898, "Thane": 72.9781
        }

        districts.append({
            "id": d.id,
            "district_name": d.name,
            "state_name": d.state.name if d.state else "National",
            "total_works": d.total_works or 0,
            "total_expenditure_cr": round(d.total_expenditure, 2) if d.total_expenditure else 0.0,
            "flagged_works": d.flagged_works or 0,
            "high_risk_works": d.high_risk_works or 0,
            "utilization_pct": round(d.avg_utilization, 1) if d.avg_utilization else 0.0,
            "risk_score": int(round(d.avg_risk_score)) if d.avg_risk_score else 0,
            "top_signal": d.top_signal or "Price Benchmarking",
            "lat": lat_map.get(d.name, 23.0),
            "lng": lng_map.get(d.name, 78.0),
        })

    # Sort for Top 5 High-Risk Districts
    top_5_high_risk = sorted(districts, key=lambda x: x["risk_score"], reverse=True)[:5]

    return {
        "districts": districts,
        "top_5_high_risk": top_5_high_risk,
        "total_districts": len(districts),
        "active_layer": layer
    }
