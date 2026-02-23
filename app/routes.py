from flask import Blueprint, current_app, jsonify, render_template, request
from sqlalchemy import asc
import re
from datetime import datetime, timedelta
import hashlib

from . import db
from .models import Game, GameSheetCache
from .igdb import game_details, search_games


main_bp = Blueprint("main", __name__)
VALID_OWNERSHIP_TYPES = {"physical", "digital", "unknown"}
SHEET_CACHE_TTL_SECONDS = 86400


def _normalize_ownership_type(value: str | None) -> str:
    candidate = (value or "").strip().lower()
    if candidate in VALID_OWNERSHIP_TYPES:
        return candidate
    return "unknown"


def _pick_best_match(results: list[dict], title: str, platform: str | None) -> dict | None:
    if not results:
        return None

    title_lower = title.strip().lower()
    platform_lower = (platform or "").strip().lower()

    exact_title_matches = [r for r in results if (r.get("title") or "").strip().lower() == title_lower]
    candidate_pool = exact_title_matches or results

    if platform_lower:
        for candidate in candidate_pool:
            for p in candidate.get("platforms", []):
                if platform_lower in p.lower():
                    return candidate

    return candidate_pool[0]


def _sheet_fingerprint(game: Game) -> str:
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


def _sheet_fallback_payload(game: Game) -> dict:
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


def _sheet_payload_from_cache(game: Game, cache_row: GameSheetCache) -> dict:
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


@main_bp.route("/")
def index():
    return render_template("index.html")


@main_bp.route("/api/games", methods=["GET"])
def list_games():
    platform = request.args.get("platform")
    completed = request.args.get("completed")

    query = Game.query

    if platform:
        query = query.filter(Game.platform == platform)

    if completed in {"true", "false"}:
        query = query.filter(Game.completed == (completed == "true"))

    games = query.order_by(asc(Game.title)).all()
    return jsonify([g.to_dict() for g in games])


@main_bp.route("/api/games", methods=["POST"])
def create_game():
    payload = request.get_json(force=True)

    title = (payload.get("title") or "").strip()
    platform = (payload.get("platform") or "").strip()
    completed = bool(payload.get("completed", False))
    ownership_type = _normalize_ownership_type(payload.get("ownership_type"))

    if not title:
        return jsonify({"error": "Le titre est obligatoire."}), 400
    if not platform:
        return jsonify({"error": "La plateforme est obligatoire."}), 400

    game = Game(
        title=title,
        platform=platform,
        completed=completed,
        ownership_type=ownership_type,
        genre=payload.get("genre"),
        release_date=payload.get("release_date"),
        cover_url=payload.get("cover_url"),
        description=payload.get("description"),
    )

    db.session.add(game)
    db.session.commit()

    return jsonify(game.to_dict()), 201


@main_bp.route("/api/games/<int:game_id>", methods=["PATCH"])
def update_game(game_id: int):
    game = Game.query.get_or_404(game_id)
    payload = request.get_json(force=True)

    if "completed" in payload:
        game.completed = bool(payload["completed"])

    if "platform" in payload and payload["platform"]:
        game.platform = payload["platform"].strip()

    if "ownership_type" in payload:
        game.ownership_type = _normalize_ownership_type(payload.get("ownership_type"))

    if "title" in payload:
        title = (payload.get("title") or "").strip()
        if not title:
            return jsonify({"error": "Le titre est obligatoire."}), 400
        game.title = title

    if "genre" in payload:
        game.genre = (payload.get("genre") or "").strip() or None

    if "release_date" in payload:
        release_date = (payload.get("release_date") or "").strip()
        if release_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", release_date):
            return jsonify({"error": "Date attendue: YYYY-MM-DD"}), 400
        game.release_date = release_date or None

    if "cover_url" in payload:
        game.cover_url = (payload.get("cover_url") or "").strip() or None

    if "description" in payload:
        game.description = (payload.get("description") or "").strip() or None

    cache_row = GameSheetCache.query.filter_by(game_id=game.id).first()
    if cache_row:
        db.session.delete(cache_row)

    db.session.commit()
    return jsonify(game.to_dict())


@main_bp.route("/api/games/<int:game_id>", methods=["DELETE"])
def delete_game(game_id: int):
    game = Game.query.get_or_404(game_id)
    cache_row = GameSheetCache.query.filter_by(game_id=game.id).first()
    if cache_row:
        db.session.delete(cache_row)
    db.session.delete(game)
    db.session.commit()
    return "", 204


@main_bp.route("/api/platforms", methods=["GET"])
def list_platforms():
    platforms = [
        row[0]
        for row in db.session.query(Game.platform)
        .distinct()
        .order_by(asc(Game.platform))
        .all()
    ]
    return jsonify(platforms)


@main_bp.route("/api/metadata/search", methods=["GET"])
def metadata_search():
    query = (request.args.get("query") or "").strip()
    platform = (request.args.get("platform") or "").strip()
    if not query:
        return jsonify({"error": "Le paramètre query est obligatoire."}), 400

    client_id = current_app.config.get("IGDB_CLIENT_ID", "")
    client_secret = current_app.config.get("IGDB_CLIENT_SECRET", "")

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=query, platform=platform)
        return jsonify(results)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Impossible de récupérer les métadonnées: {str(exc)}"}), 502


@main_bp.route("/api/metadata/details/<int:igdb_id>", methods=["GET"])
def metadata_details(igdb_id: int):
    client_id = current_app.config.get("IGDB_CLIENT_ID", "")
    client_secret = current_app.config.get("IGDB_CLIENT_SECRET", "")

    try:
        result = game_details(client_id=client_id, client_secret=client_secret, igdb_id=igdb_id)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Impossible de récupérer le détail du jeu: {str(exc)}"}), 502


@main_bp.route("/api/metadata/by-title", methods=["GET"])
def metadata_by_title():
    title = (request.args.get("title") or "").strip()
    platform = (request.args.get("platform") or "").strip()

    if not title:
        return jsonify({"error": "Le paramètre title est obligatoire."}), 400

    client_id = current_app.config.get("IGDB_CLIENT_ID", "")
    client_secret = current_app.config.get("IGDB_CLIENT_SECRET", "")

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=title, page_size=10)
        best_match = _pick_best_match(results=results, title=title, platform=platform)

        if not best_match:
            return jsonify({"error": "Aucune fiche trouvée pour ce jeu."}), 404

        igdb_id = best_match.get("igdb_id")
        if not igdb_id:
            return jsonify({"error": "Résultat IGDB invalide."}), 502

        details = game_details(client_id=client_id, client_secret=client_secret, igdb_id=int(igdb_id))
        return jsonify(details)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Impossible de charger la fiche du jeu: {str(exc)}"}), 502


@main_bp.route("/api/games/<int:game_id>/sheet", methods=["GET"])
def game_sheet(game_id: int):
    game = Game.query.get_or_404(game_id)
    now_dt = datetime.utcnow()

    client_id = current_app.config.get("IGDB_CLIENT_ID", "")
    client_secret = current_app.config.get("IGDB_CLIENT_SECRET", "")

    fingerprint = _sheet_fingerprint(game)
    fallback_payload = _sheet_fallback_payload(game)

    cache_row = GameSheetCache.query.filter_by(game_id=game.id).first()
    if (
        cache_row
        and cache_row.source_fingerprint == fingerprint
        and cache_row.cached_at >= now_dt - timedelta(seconds=SHEET_CACHE_TTL_SECONDS)
    ):
        return jsonify(_sheet_payload_from_cache(game, cache_row))

    if not client_id or not client_secret:
        return jsonify(fallback_payload)

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=game.title, page_size=10)
        best_match = _pick_best_match(results=results, title=game.title, platform=game.platform)

        if not best_match or not best_match.get("igdb_id"):
            return jsonify(fallback_payload)

        details = game_details(
            client_id=client_id,
            client_secret=client_secret,
            igdb_id=int(best_match["igdb_id"]),
            include_french_summary=False,
        )

        merged = {
            "id": game.id,
            "title": details.get("title") or game.title,
            "platform": game.platform,
            "completed": game.completed,
            "ownership_type": game.ownership_type,
            "release_date": details.get("release_date") or game.release_date,
            "release_year": details.get("release_year")
            or (int(game.release_date[:4]) if game.release_date and len(game.release_date) >= 4 else None),
            "publisher": details.get("publisher"),
            "cover_url": details.get("cover_url") or game.cover_url,
            "description_fr": details.get("description_fr"),
            "description": details.get("description") or game.description,
            "images": details.get("images") or ([game.cover_url] if game.cover_url else []),
            "videos": details.get("videos") or [],
        }

        if not cache_row:
            cache_row = GameSheetCache(game_id=game.id)

        cache_row.source_fingerprint = fingerprint
        cache_row.igdb_id = details.get("igdb_id")
        cache_row.title = merged.get("title")
        cache_row.release_date = merged.get("release_date")
        cache_row.release_year = merged.get("release_year")
        cache_row.publisher = merged.get("publisher")
        cache_row.cover_url = merged.get("cover_url")
        cache_row.description = merged.get("description")
        cache_row.description_fr = merged.get("description_fr")
        cache_row.set_images(merged.get("images") or [])
        cache_row.set_videos(merged.get("videos") or [])
        cache_row.cached_at = now_dt
        db.session.add(cache_row)
        db.session.commit()

        return jsonify(merged)
    except Exception:
        return jsonify(fallback_payload)
