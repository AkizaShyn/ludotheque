from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
from typing import Any

from ..extensions import db
from ..models import Game, GameSheetCache


def build_sheet_fingerprint(game: Game) -> str:
    raw = "|".join(
        [
            str(game.id),
            game.title or "",
            game.platform or "",
            "1" if bool(game.completed) else "0",
            game.ownership_type or "",
            game.release_date or "",
            game.cover_url or "",
            game.description or "",
            game.genre or "",
        ]
    )
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def build_sheet_fallback_payload(game: Game) -> dict[str, Any]:
    return {
        "id": game.id,
        "title": game.title,
        "platform": game.platform,
        "completed": game.completed,
        "ownership_type": game.ownership_type,
        "release_date": game.release_date,
        "release_year": int(game.release_date[:4]) if game.release_date and len(game.release_date) >= 4 else None,
        "publisher": None,
        "cover_url": game.cover_url,
        "description_fr": None,
        "description": game.description,
        "images": [game.cover_url] if game.cover_url else [],
        "videos": [],
    }


def build_sheet_payload_from_cache(game: Game, cache_row: GameSheetCache) -> dict[str, Any]:
    return {
        "id": game.id,
        "title": cache_row.title or game.title,
        "platform": game.platform,
        "completed": game.completed,
        "ownership_type": game.ownership_type,
        "release_date": cache_row.release_date or game.release_date,
        "release_year": cache_row.release_year
        or (int(game.release_date[:4]) if game.release_date and len(game.release_date) >= 4 else None),
        "publisher": cache_row.publisher,
        "cover_url": cache_row.cover_url or game.cover_url,
        "description_fr": cache_row.description_fr,
        "description": cache_row.description or game.description,
        "images": cache_row.get_images() or ([game.cover_url] if game.cover_url else []),
        "videos": cache_row.get_videos(),
    }


def get_valid_sheet_cache(game: Game, ttl_seconds: int) -> tuple[GameSheetCache | None, str]:
    now_dt = datetime.utcnow()
    fingerprint = build_sheet_fingerprint(game)
    cache_row = GameSheetCache.query.filter_by(game_id=game.id).first()

    if (
        cache_row
        and cache_row.source_fingerprint == fingerprint
        and cache_row.cached_at >= now_dt - timedelta(seconds=ttl_seconds)
    ):
        return cache_row, fingerprint

    return None, fingerprint


def upsert_sheet_cache(game: Game, fingerprint: str, payload: dict[str, Any], *, cached_at: datetime | None = None) -> None:
    cache_row = GameSheetCache.query.filter_by(game_id=game.id).first()
    if not cache_row:
        cache_row = GameSheetCache(game_id=game.id)

    cache_row.source_fingerprint = fingerprint
    cache_row.igdb_id = payload.get("igdb_id")
    cache_row.title = payload.get("title")
    cache_row.release_date = payload.get("release_date")
    cache_row.release_year = payload.get("release_year")
    cache_row.publisher = payload.get("publisher")
    cache_row.cover_url = payload.get("cover_url")
    cache_row.description = payload.get("description")
    cache_row.description_fr = payload.get("description_fr")
    cache_row.set_images(payload.get("images") or [])
    cache_row.set_videos(payload.get("videos") or [])
    cache_row.cached_at = cached_at or datetime.utcnow()
    db.session.add(cache_row)
    db.session.commit()


def invalidate_sheet_cache(game_id: int) -> None:
    cache_row = GameSheetCache.query.filter_by(game_id=game_id).first()
    if cache_row:
        db.session.delete(cache_row)
