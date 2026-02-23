from flask import Blueprint, current_app, jsonify, render_template, request
from sqlalchemy import asc
import re

from .constants import (
    DEFAULT_OWNERSHIP_TYPE,
    DEFAULT_SHEET_CACHE_TTL_SECONDS,
    VALID_OWNERSHIP_TYPES,
)
from .extensions import db
from .models import Game
from .igdb import game_details, search_games
from .services.metadata_service import pick_best_match
from .services.game_sheet_service import (
    build_sheet_fallback_payload,
    build_sheet_payload_from_cache,
    get_valid_sheet_cache,
    invalidate_sheet_cache,
    upsert_sheet_cache,
)


main_bp = Blueprint("main", __name__)


def _normalize_ownership_type(value: str | None) -> str:
    candidate = (value or "").strip().lower()
    if candidate in VALID_OWNERSHIP_TYPES:
        return candidate
    return DEFAULT_OWNERSHIP_TYPE


def _get_igdb_credentials() -> tuple[str, str]:
    client_id = current_app.config.get("IGDB_CLIENT_ID", "")
    client_secret = current_app.config.get("IGDB_CLIENT_SECRET", "")
    return client_id, client_secret


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

    invalidate_sheet_cache(game.id)

    db.session.commit()
    return jsonify(game.to_dict())


@main_bp.route("/api/games/<int:game_id>", methods=["DELETE"])
def delete_game(game_id: int):
    game = Game.query.get_or_404(game_id)
    invalidate_sheet_cache(game.id)
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

    client_id, client_secret = _get_igdb_credentials()

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=query, platform=platform)
        return jsonify(results)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Impossible de récupérer les métadonnées: {str(exc)}"}), 502


@main_bp.route("/api/metadata/details/<int:igdb_id>", methods=["GET"])
def metadata_details(igdb_id: int):
    client_id, client_secret = _get_igdb_credentials()

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

    client_id, client_secret = _get_igdb_credentials()

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=title, page_size=10)
        best_match = pick_best_match(results=results, title=title, platform=platform)

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

    client_id, client_secret = _get_igdb_credentials()
    ttl_seconds = int(current_app.config.get("SHEET_CACHE_TTL_SECONDS", DEFAULT_SHEET_CACHE_TTL_SECONDS))

    cache_row, fingerprint = get_valid_sheet_cache(game=game, ttl_seconds=ttl_seconds)
    fallback_payload = build_sheet_fallback_payload(game)
    if cache_row:
        return jsonify(build_sheet_payload_from_cache(game, cache_row))

    if not client_id or not client_secret:
        return jsonify(fallback_payload)

    try:
        results = search_games(client_id=client_id, client_secret=client_secret, query=game.title, page_size=10)
        best_match = pick_best_match(results=results, title=game.title, platform=game.platform)

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

        upsert_sheet_cache(game=game, fingerprint=fingerprint, payload=merged)

        return jsonify(merged)
    except Exception:
        return jsonify(fallback_payload)
