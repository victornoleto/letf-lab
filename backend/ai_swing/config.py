from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///../data/ai_swing.db"
    price_cache_dir: str = "../data/prices"
    refresh_hour_et: int = 22
    log_level: str = "INFO"
    allow_origins: str = "http://localhost:4200,http://127.0.0.1:4200"

    @property
    def price_cache_path(self) -> Path:
        return Path(self.price_cache_dir).resolve()

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allow_origins.split(",") if o.strip()]


settings = Settings()
