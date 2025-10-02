"""
Configuration management for the healthcare backend application.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings and configuration."""

    # API Configuration
    app_name: str = "Healthcare Backend API"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = os.getenv("API_HOST", "localhost")
    port: int = int(os.getenv("API_PORT", "8000"))

    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    helicone_api_key: str = os.getenv("HELICONE_API_KEY", "")
    helicone_base_url: str = "https://oai.hconeai.com/v1"

    # Gemini Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")

    # File Paths
    header_path: Optional[str] = os.getenv("HEADER_PATH")
    footer_image_path: Optional[str] = os.getenv("FOOTER_IMAGE_PATH")

    # Directory Paths
    employee_resume_dir: str = "employee_resume"
    hr_project_dir: str = "data_hr_project"
    uploads_dir: str = "uploads"
    static_dir: str = "static"
    template_dir: str = "template"

    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    similarity_search_k: int = 30
    max_context_length: int = 4000

    # Qdrant Configuration (use :memory: for in-memory mode if server not available)
    qdrant_url: str = "https://api-insurancecopilot.devkraft.in"
    qdrant_collection_name: str = "healthcare_insurance"

    # Session Configuration
    session_timeout_hours: int = 24
    max_sessions_per_user: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
