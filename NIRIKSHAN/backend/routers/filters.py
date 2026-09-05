from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from database import get_db
from models.entities import Work, State, District, Vendor, RiskAssessment

router = APIRouter(prefix="/api/filters", tags=["Filters"])


@router.get("")
def get_filter_options(db: Session = Depends(get_db)):
    """
    Returns distinct values for all filter dropdowns, dynamically derived from the database.
    Frontend uses this to populate State, District, Category, Vendor, Risk Level, and Status selects.
    """
    states = [r[0] for r in db.query(distinct(State.name)).order_by(State.name).all() if r[0]]
    districts = [r[0] for r in db.query(distinct(District.name)).order_by(District.name).all() if r[0]]
    categories = [r[0] for r in db.query(distinct(Work.category)).order_by(Work.category).all() if r[0]]
    statuses = [r[0] for r in db.query(distinct(Work.status)).order_by(Work.status).all() if r[0]]
    vendors = [r[0] for r in db.query(distinct(Vendor.name)).order_by(Vendor.name).all() if r[0]]
    risk_levels = [r[0] for r in db.query(distinct(RiskAssessment.risk_level)).order_by(RiskAssessment.risk_level).all() if r[0]]

    return {
        "states": states,
        "districts": districts,
        "categories": categories,
        "statuses": statuses,
        "vendors": vendors,
        "risk_levels": risk_levels,
        "financial_years": ["2024-25", "2023-24", "2022-23"],
    }
