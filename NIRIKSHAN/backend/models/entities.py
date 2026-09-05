import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base


def _now():
    """Timezone-aware UTC timestamp. Replaces deprecated utcnow()."""
    return datetime.datetime.now(datetime.UTC)


class User(Base):
    """Demo authentication user. Roles match the MPLADS hierarchy."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, index=True)  # MP, District Officer, State Officer, Ministry Officer, Administrator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)


class State(Base):
    __tablename__ = "states"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(10), unique=True, nullable=False)
    total_allocated = Column(Float, default=0.0)  # In Crores
    total_released = Column(Float, default=0.0)
    total_utilized = Column(Float, default=0.0)

    districts = relationship("District", back_populates="state")
    works = relationship("Work", back_populates="state")


class District(Base):
    __tablename__ = "districts"
    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)
    total_works = Column(Integer, default=0)
    total_expenditure = Column(Float, default=0.0)  # In Crores
    flagged_works = Column(Integer, default=0)
    high_risk_works = Column(Integer, default=0)
    avg_utilization = Column(Float, default=0.0)  # Percentage
    avg_risk_score = Column(Float, default=0.0)
    top_signal = Column(String(100), default="Price Benchmarking")

    state = relationship("State", back_populates="districts")
    constituencies = relationship("Constituency", back_populates="district")
    works = relationship("Work", back_populates="district")


class Constituency(Base):
    __tablename__ = "constituencies"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    name = Column(String(100), nullable=False)
    mp_name = Column(String(100), default="")
    mp_house = Column(String(50), default="Lok Sabha")

    district = relationship("District", back_populates="constituencies")
    works = relationship("Work", back_populates="constituency")


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    gstin = Column(String(30), default="")
    pan = Column(String(20), default="")
    total_works = Column(Integer, default=0)
    total_expenditure = Column(Float, default=0.0)
    avg_risk_score = Column(Float, default=0.0)
    status = Column(String(50), default="Active")  # Active, Flagged, Under Review

    works = relationship("Work", back_populates="vendor")


class ReferencePrice(Base):
    __tablename__ = "reference_prices"
    id = Column(Integer, primary_key=True, index=True)
    item_code = Column(String(50), unique=True, index=True)
    item_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # Movable Goods, Civil Materials, Services
    unit = Column(String(50), nullable=False)
    gem_reference_price = Column(Float, nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    tolerance_pct = Column(Float, default=15.0)


class Work(Base):
    __tablename__ = "works"
    id = Column(Integer, primary_key=True, index=True)
    work_code = Column(String(50), unique=True, nullable=False, index=True)  # e.g. MPLADS-BR-00481
    project_name = Column(String(250), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # Infrastructure, Community Building, Energy, Education, Roads, Water

    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)

    sanctioned_amount = Column(Float, nullable=False)  # INR
    expenditure = Column(Float, nullable=False)  # INR
    utilization_pct = Column(Float, default=0.0)
    completion_pct = Column(Float, default=0.0)
    days_since_sanction = Column(Integer, default=0)

    sanction_date = Column(DateTime, default=_now)
    completion_date = Column(DateTime, nullable=True)

    status = Column(String(50), default="Work in Progress", index=True)  # Sanctioned, Work in Progress, Completed, Under Review, Under Audit, Escalated
    latitude = Column(Float, default=25.0)
    longitude = Column(Float, default=85.0)
    executing_agency = Column(String(150), default="District Rural Development Agency")
    created_at = Column(DateTime, default=_now)

    state = relationship("State", back_populates="works")
    district = relationship("District", back_populates="works")
    constituency = relationship("Constituency", back_populates="works")
    vendor = relationship("Vendor", back_populates="works")
    items = relationship("WorkItem", back_populates="work", cascade="all, delete-orphan")
    photos = relationship("WorkPhoto", back_populates="work", cascade="all, delete-orphan")
    risk_assessment = relationship("RiskAssessment", back_populates="work", uselist=False, cascade="all, delete-orphan")
    review_case = relationship("ReviewCase", back_populates="work", uselist=False, cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="work", cascade="all, delete-orphan")


class WorkItem(Base):
    __tablename__ = "work_items"
    id = Column(Integer, primary_key=True, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    category = Column(String(100), default="Movable Goods")
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="Each")
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)

    matched_ref_id = Column(Integer, ForeignKey("reference_prices.id"), nullable=True)
    match_confidence = Column(Float, default=0.0)
    variance_pct = Column(Float, default=0.0)
    risk_level = Column(String(50), default="Normal")  # Normal, Moderate, High

    work = relationship("Work", back_populates="items")


class WorkPhoto(Base):
    __tablename__ = "work_photos"
    id = Column(Integer, primary_key=True, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    photo_url = Column(String(300), nullable=False)
    stage = Column(String(50), default="Work in Progress")  # Before/Early Stage, Work in Progress, Completion
    timestamp = Column(DateTime, default=_now)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    phash = Column(String(64), default="")
    dhash = Column(String(64), default="")

    work = relationship("Work", back_populates="photos")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(Integer, primary_key=True, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), unique=True, nullable=False)
    composite_score = Column(Float, default=0.0, index=True)
    risk_level = Column(String(30), default="LOW", index=True)  # LOW, MEDIUM, HIGH, CRITICAL

    # 5 Signals & Weights
    price_score = Column(Float, default=0.0)
    price_weight = Column(Float, default=0.30)

    iqr_score = Column(Float, default=0.0)
    iqr_weight = Column(Float, default=0.20)

    benford_score = Column(Float, default=0.0)
    benford_weight = Column(Float, default=0.15)

    hhi_score = Column(Float, default=0.0)
    hhi_weight = Column(Float, default=0.15)

    photo_score = Column(Float, default=0.0)
    photo_weight = Column(Float, default=0.20)

    # JSON evidence payloads for inspectability
    price_evidence = Column(JSON, default=dict)
    iqr_evidence = Column(JSON, default=dict)
    benford_evidence = Column(JSON, default=dict)
    hhi_evidence = Column(JSON, default=dict)
    photo_evidence = Column(JSON, default=dict)

    explanation_summary = Column(Text, default="")
    created_at = Column(DateTime, default=_now)

    work = relationship("Work", back_populates="risk_assessment")


class ReviewCase(Base):
    __tablename__ = "review_cases"
    id = Column(Integer, primary_key=True, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), unique=True, nullable=False)
    priority = Column(String(20), default="High", index=True)  # High, Medium, Low
    status = Column(String(50), default="New", index=True)  # New, In Review, Awaiting Clarification, Escalated, Closed
    assigned_to = Column(String(100), default="P. Sharma")
    assigned_role = Column(String(100), default="Reviewer")
    age_days = Column(Integer, default=3)
    date_opened = Column(DateTime, default=_now)
    date_closed = Column(DateTime, nullable=True)

    work = relationship("Work", back_populates="review_case")
    decisions = relationship("ReviewDecision", back_populates="review_case", cascade="all, delete-orphan")


class ReviewDecision(Base):
    __tablename__ = "review_decisions"
    id = Column(Integer, primary_key=True, index=True)
    review_case_id = Column(Integer, ForeignKey("review_cases.id"), nullable=False)
    reviewer_name = Column(String(100), nullable=False)
    reviewer_role = Column(String(100), default="Reviewer")
    decision = Column(String(100), nullable=False)  # No Issue, Legitimate Variance, Requires Clarification, Escalate, Investigation Required
    comment = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=_now)

    review_case = relationship("ReviewCase", back_populates="decisions")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True, index=True)
    work_id = Column(Integer, ForeignKey("works.id"), nullable=True)
    actor_name = Column(String(100), default="System")
    actor_role = Column(String(100), default="System")  # System, Reviewer, District Officer, State Officer, Administrator
    action = Column(String(150), nullable=False, index=True)
    details = Column(Text, default="")
    previous_state = Column(String(250), default="")
    new_state = Column(String(250), default="")
    timestamp = Column(DateTime, default=_now, index=True)

    work = relationship("Work", back_populates="audit_events")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    id = Column(Integer, primary_key=True, index=True)
    source_dataset = Column(String(100), nullable=False)  # eSAKSHI Bulk Import, data.gov.in, GeM Updated Catalog
    records_imported = Column(Integer, default=0)
    status = Column(String(50), default="Completed")  # Completed, Processing, Failed
    errors_count = Column(Integer, default=0)
    warnings_count = Column(Integer, default=0)
    log_text = Column(Text, default="")
    timestamp = Column(DateTime, default=_now)


class DuplicatePair(Base):
    __tablename__ = "duplicate_pairs"
    id = Column(Integer, primary_key=True, index=True)
    work_a_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    work_b_id = Column(Integer, ForeignKey("works.id"), nullable=False)
    photo_similarity_pct = Column(Float, default=0.0)
    text_similarity_pct = Column(Float, default=0.0)
    geo_distance_m = Column(Float, default=0.0)
    combined_confidence = Column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    status = Column(String(50), default="Flagged")  # Flagged, Verified Duplicate, Dismissed
    created_at = Column(DateTime, default=_now)

    work_a = relationship("Work", foreign_keys=[work_a_id])
    work_b = relationship("Work", foreign_keys=[work_b_id])
