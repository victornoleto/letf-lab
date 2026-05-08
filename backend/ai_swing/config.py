from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///../data/letf_lab.db"
    price_cache_dir: str = "../data/prices"
    refresh_hour_et: int = 22
    log_level: str = "INFO"
    allow_origins: str = "http://localhost:4200,http://127.0.0.1:4200"

    # Auth — JWT in HttpOnly cookie. The default secret is unsafe; override in .env.
    auth_jwt_secret: str = "dev-only-change-me"
    auth_token_ttl_hours: int = 24
    auth_cookie_secure: bool = False
    auth_cookie_name: str = "letf_lab_session"

    # AI CLI integration (OpenCode by default). Empty command disables AI.
    ai_cli_command: str = "opencode"
    ai_cli_model: str = "openai/gpt-5.4-mini-fast"
    ai_cli_timeout_s: int = 60
    ai_cli_prompts_dir: str = "prompts"

    # Optional integrations (deprecated: prefer ai_cli_command above)
    anthropic_api_key: str | None = None

    @property
    def price_cache_path(self) -> Path:
        return Path(self.price_cache_dir).resolve()

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allow_origins.split(",") if o.strip()]


settings = Settings()
