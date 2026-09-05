import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_PORT: int = 5173
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nirikshan"
    SQLITE_FALLBACK_URL: str = "sqlite:///./data/nirikshan.db"
    USE_SQLITE_FALLBACK: bool = True
    
    # Security
    SECRET_KEY: str = "nirikshan_sih26102_local_dev_secret_key_8f93e102c7b54a2e99d4"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Integrations
    GEM_API_KEY: str = "dev_mock_gem_api_key"
    GEM_API_URL: str = "https://api.gem.gov.in/v1"
    USE_MOCK_GEM_PROVIDER: bool = True
    
    ESAKSHI_API_KEY: str = "dev_mock_esakshi_key"
    ESAKSHI_API_URL: str = "https://mplads.mospi.gov.in/api/v1"
    DATA_GOV_IN_API_KEY: str = "dev_mock_data_gov_key"
    USE_MOCK_INGESTION_PROVIDER: bool = True
    
    MAPBOX_ACCESS_TOKEN: str = "pk.mock_token"
    
    # Storage & Detection
    UPLOAD_DIR: str = "./data/uploads"
    SAMPLE_DATA_DIR: str = "./data/seed"
    MAX_UPLOAD_SIZE_MB: int = 25
    IMAGE_HASH_THRESHOLD: int = 10
    TEXT_SIMILARITY_THRESHOLD: float = 0.75
    GEO_PROXIMITY_KM_THRESHOLD: float = 5.0
    
    # Risk Engine Weights
    WEIGHT_PRICE_BENCHMARK: float = 0.30
    WEIGHT_IQR_OUTLIER: float = 0.20
    WEIGHT_BENFORD_LAW: float = 0.15
    WEIGHT_VENDOR_HHI: float = 0.15
    WEIGHT_PHOTO_SIMILARITY: float = 0.20

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
