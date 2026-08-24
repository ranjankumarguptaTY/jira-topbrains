import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TopBrains Collaboration Platform"
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "jira_clone_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-jira-clone-jwt-key-change-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Security
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175")
    RATE_LIMIT_AUTH: int = int(os.getenv("RATE_LIMIT_AUTH", "20"))  # requests per minute on auth endpoints

    # File sharing
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "250"))
    TEMP_FILE_EXPIRY_DAYS: int = int(os.getenv("TEMP_FILE_EXPIRY_DAYS", "15"))
    TEMP_STORAGE_LIMIT_GB: int = int(os.getenv("TEMP_STORAGE_LIMIT_GB", "1500"))
    FILE_TRANSFER_DIR: str = os.getenv("FILE_TRANSFER_DIR", "./data/file-transfers")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
