from __future__ import annotations

import os
from typing import Any

from .constants import DEFAULT_SHEET_CACHE_TTL_SECONDS


DEFAULT_DATABASE_URL = "postgresql+psycopg2://games_user:games_password@db:5432/games_db"


def _env_int(name: str, default: int) -> int:
    value = (os.getenv(name) or "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def load_config() -> dict[str, Any]:
    return {
        "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL),
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "IGDB_CLIENT_ID": os.getenv("IGDB_CLIENT_ID", ""),
        "IGDB_CLIENT_SECRET": os.getenv("IGDB_CLIENT_SECRET", ""),
        "SHEET_CACHE_TTL_SECONDS": _env_int(
            "SHEET_CACHE_TTL_SECONDS",
            DEFAULT_SHEET_CACHE_TTL_SECONDS,
        ),
    }
