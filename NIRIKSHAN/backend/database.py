import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Determine database connection URL
db_url = settings.DATABASE_URL
if settings.USE_SQLITE_FALLBACK or "sqlite" in db_url:
    # Ensure data directory exists
    os.makedirs("./data", exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    db_url = settings.SQLITE_FALLBACK_URL

# Create Engine
if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
