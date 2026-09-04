from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "Sahāy API"
    environment: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: str = "*"  # Allow all origins in dev; set explicit origins in production

    # Database
    database_url: str = "postgresql+asyncpg://sahay:sahay@localhost:5432/sahay"
    database_url_sync: str = "postgresql+psycopg2://sahay:sahay@localhost:5432/sahay"

    # Structured logging part
    log_level: str = "INFO"
    log_json_enabled: bool = True

    # File storage (Reminiscence media)
    use_local_storage: bool = True
    local_upload_dir: str = "uploads"
    max_upload_bytes: int = 25 * 1024 * 1024
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-south-1"
    aws_bucket: str | None = None

    # Twilio SMS dispatch (anti-vandering)
    twilio_account_id: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    twilio_enabled: bool = False
    twilio_max_retries: int = 3

    @property
    def cors_origins(self) -> list[str]:
        raw = self.api_cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
