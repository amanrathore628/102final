"""Read-only analytics for the official MPLADS MP summary snapshot."""
from __future__ import annotations

import csv
import hashlib
import math
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse


router = APIRouter(prefix="/api/official", tags=["Official MPLADS Data"])
DATASET_PATH = Path(__file__).resolve().parents[3] / "datasets" / "official" / "mplads_mp_summary_2026-09-03.csv"

FIELD_MAP = {
    "MP Name": "mp_name",
    "Constituency": "constituency",
    "State": "state",
    "House": "house",
    "Allocated Amount (₹)": "allocated_amount",
    "Amount Recommended (₹)": "recommended_amount",
    "Total Expenditure (₹)": "expenditure",
    "Utilization %": "utilization_pct",
    "Completed Works": "completed_works",
    "Recommended Works": "recommended_works",
    "Completion Rate %": "completion_rate_pct",
    "Balance Not Yet Paid to Vendors (₹)": "unpaid_balance",
    "Transaction Count": "transaction_count",
    "Successful Payments": "successful_payments",
    "Pending Payments": "pending_payments",
    "Average Rating": "average_rating",
}
NUMERIC_FIELDS = set(FIELD_MAP.values()) - {"mp_name", "constituency", "state", "house"}


def _number(value: str):
    value = (value or "").strip()
    if not value or value.upper() == "N/A":
        return None
    parsed = float(value)
    return int(parsed) if parsed.is_integer() else parsed


@lru_cache(maxsize=1)
def _load_rows() -> list[dict]:
    if not DATASET_PATH.exists():
        raise HTTPException(503, "Official MPLADS dataset is not installed")
    with DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = set(FIELD_MAP) - set(reader.fieldnames or [])
        if missing:
            raise HTTPException(503, f"Official dataset is missing columns: {', '.join(sorted(missing))}")
        rows = []
        for source in reader:
            row = {target: source[source_name].strip() for source_name, target in FIELD_MAP.items()}
            for field in NUMERIC_FIELDS:
                row[field] = _number(row[field])
            rows.append(row)
    return rows


def _filter_rows(state: str | None = None, house: str | None = None, search: str | None = None):
    rows = _load_rows()
    if state and state != "All States":
        rows = [row for row in rows if row["state"] == state]
    if house and house != "All Houses":
        rows = [row for row in rows if row["house"] == house]
    if search:
        needle = search.casefold().strip()
        rows = [row for row in rows if needle in " ".join(
            (row["mp_name"], row["constituency"], row["state"], row["house"])
        ).casefold()]
    return rows


def _sum(rows: list[dict], field: str) -> float:
    return sum(float(row[field] or 0) for row in rows)


def _ratio(numerator: float, denominator: float) -> float:
    return round(numerator / denominator * 100, 2) if denominator else 0.0


def _summary(rows: list[dict]) -> dict:
    allocated = _sum(rows, "allocated_amount")
    recommended = _sum(rows, "recommended_amount")
    expenditure = _sum(rows, "expenditure")
    balance = _sum(rows, "unpaid_balance")
    recommended_works = int(_sum(rows, "recommended_works"))
    completed_works = int(_sum(rows, "completed_works"))
    transactions = int(_sum(rows, "transaction_count"))
    successful = int(_sum(rows, "successful_payments"))
    pending = int(_sum(rows, "pending_payments"))
    return {
        "total_mps": len(rows),
        "states_uts": len({row["state"] for row in rows}),
        "allocated_amount": allocated,
        "recommended_amount": recommended,
        "expenditure": expenditure,
        "unpaid_balance": balance,
        "recommendation_utilization_pct": _ratio(recommended, allocated),
        "expenditure_against_recommended_pct": _ratio(expenditure, recommended),
        "recommended_works": recommended_works,
        "completed_works": completed_works,
        "completion_rate_pct": _ratio(completed_works, recommended_works),
        "transaction_count": transactions,
        "successful_payments": successful,
        "pending_payments": pending,
        "payment_success_rate_pct": _ratio(successful, transactions),
    }


@router.get("/summary")
def official_summary(state: str | None = None, house: str | None = None):
    rows = _filter_rows(state, house)
    return {
        "source": {
            "name": "Official MPLADS MP Summary",
            "snapshot_date": "2026-09-03",
            "file": DATASET_PATH.name,
            "sha256": hashlib.sha256(DATASET_PATH.read_bytes()).hexdigest(),
            "grain": "One row per MP and constituency/house assignment",
        },
        "summary": _summary(rows),
        "filters": {
            "states": sorted({row["state"] for row in _load_rows()}),
            "houses": sorted({row["house"] for row in _load_rows()}),
        },
        "scope_note": "Official MP-level portfolio totals. Work-level fraud and procurement scores require additional records.",
    }


@router.get("/states")
def official_states(house: str | None = None):
    rows = _filter_rows(house=house)
    output = []
    for state in sorted({row["state"] for row in rows}):
        state_rows = [row for row in rows if row["state"] == state]
        output.append({"state": state, **_summary(state_rows)})
    output.sort(key=lambda row: row["expenditure"], reverse=True)
    return {"states": output}


@router.get("/mps")
def official_mps(
    state: str | None = None,
    house: str | None = None,
    search: str | None = None,
    sort_by: str = Query("expenditure"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=5, le=100),
):
    rows = _filter_rows(state, house, search)
    allowed = set(FIELD_MAP.values())
    if sort_by not in allowed:
        raise HTTPException(400, "Unsupported sort field")
    rows.sort(key=lambda row: (row[sort_by] is not None, row[sort_by] or 0), reverse=sort_order == "desc")
    start = (page - 1) * limit
    return {
        "items": rows[start:start + limit],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": len(rows),
            "total_pages": math.ceil(len(rows) / limit) if rows else 1,
        },
    }


@router.get("/comparison")
def official_comparison():
    return {
        "official": {
            "grain": "MP and constituency summary",
            "records": len(_load_rows()),
            "coverage": ["allocations", "recommendations", "expenditure", "work counts", "payment status"],
            "best_use": "National and state portfolio monitoring",
        },
        "nirikshan_demo": {
            "grain": "Individual public work with line items and evidence",
            "records": 51,
            "coverage": ["vendors", "BoQ items", "GeM fixtures", "GPS", "photo evidence", "five risk signals"],
            "best_use": "Explainable investigation workflow demonstration",
        },
        "integration": [
            "Official totals provide the portfolio baseline and state/MP drill-down.",
            "NIRIKSHAN work-level records remain the evidence layer for price, vendor, statistical and duplicate checks.",
            "No MP-level fraud score is generated from aggregate data alone.",
        ],
    }


@router.get("/download")
def download_official_dataset():
    if not DATASET_PATH.exists():
        raise HTTPException(404, "Official MPLADS dataset is not installed")
    return FileResponse(DATASET_PATH, filename=DATASET_PATH.name, media_type="text/csv")
