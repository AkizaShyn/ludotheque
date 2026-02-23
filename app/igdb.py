from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests


TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_GAMES_URL = "https://api.igdb.com/v4/games"
WIKIPEDIA_API_FR = "https://fr.wikipedia.org/w/api.php"

_token_cache: dict[str, Any] = {
    "access_token": None,
    "expires_at": 0,
}
_french_summary_cache: dict[str, str | None] = {}


def _format_date(unix_ts: int | None) -> str | None:
    if not unix_ts:
        return None
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).strftime("%Y-%m-%d")


def _extract_year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    try:
        return int(date_str[:4])
    except Exception:
        return None


def _normalize_image(url: str | None, size: str) -> str | None:
    if not url:
        return None

    normalized = url.replace("t_thumb", size)

    if normalized.startswith("//"):
        return f"https:{normalized}"

    return normalized


def _normalize_cover(url: str | None) -> str | None:
    return _normalize_image(url, "t_cover_big")


def _collect_gallery_images(item: dict[str, Any], limit: int = 8) -> list[str]:
    urls: list[str] = []

    for image in item.get("screenshots", []):
        normalized = _normalize_image(image.get("url"), "t_screenshot_big")
        if normalized:
            urls.append(normalized)

    for image in item.get("artworks", []):
        normalized = _normalize_image(image.get("url"), "t_720p")
        if normalized:
            urls.append(normalized)

    # Déduplique en gardant l'ordre.
    deduped = list(dict.fromkeys(urls))
    return deduped[:limit]


def _extract_publisher(item: dict[str, Any]) -> str | None:
    for entry in item.get("involved_companies", []):
        if entry.get("publisher") and (entry.get("company") or {}).get("name"):
            return entry["company"]["name"]

    for entry in item.get("involved_companies", []):
        company_name = (entry.get("company") or {}).get("name")
        if company_name:
            return company_name

    return None


def _extract_videos(item: dict[str, Any]) -> list[dict[str, str]]:
    videos: list[dict[str, str]] = []
    for v in item.get("videos", []):
        video_id = v.get("video_id")
        if not video_id:
            continue
        videos.append(
            {
                "name": v.get("name") or "Vidéo",
                "youtube_id": video_id,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "embed_url": f"https://www.youtube.com/embed/{video_id}",
            }
        )
    return videos


def _fetch_french_summary(title: str) -> str | None:
    if not title:
        return None

    cache_key = title.strip().lower()
    if cache_key in _french_summary_cache:
        return _french_summary_cache[cache_key]

    search_queries = [
        f'intitle:"{title}" jeu vidéo',
        f'"{title}" jeu vidéo',
        title,
    ]

    try:
        for search_query in search_queries:
            search_response = requests.get(
                WIKIPEDIA_API_FR,
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": search_query,
                    "utf8": 1,
                    "format": "json",
                },
                timeout=2.5,
            )
            search_response.raise_for_status()
            search_data = search_response.json()

            search_results = (search_data.get("query") or {}).get("search") or []
            if not search_results:
                continue

            # Favorise une page liée au jeu vidéo.
            best_result = search_results[0]
            for candidate in search_results:
                snippet = (candidate.get("snippet") or "").lower()
                title_candidate = (candidate.get("title") or "").lower()
                if "jeu vidéo" in snippet or "jeu vidéo" in title_candidate:
                    best_result = candidate
                    break

            page_title = best_result.get("title")
            if not page_title:
                continue

            extract_response = requests.get(
                WIKIPEDIA_API_FR,
                params={
                    "action": "query",
                    "prop": "extracts",
                    "explaintext": 1,
                    "exintro": 1,
                    "titles": page_title,
                    "utf8": 1,
                    "format": "json",
                },
                timeout=2.5,
            )
            extract_response.raise_for_status()
            extract_data = extract_response.json()

            pages = ((extract_data.get("query") or {}).get("pages") or {}).values()
            for page in pages:
                extract = (page or {}).get("extract")
                if extract:
                    result = str(extract).strip()
                    _french_summary_cache[cache_key] = result
                    return result
    except Exception:
        _french_summary_cache[cache_key] = None
        return None

    _french_summary_cache[cache_key] = None
    return None


def _get_access_token(client_id: str, client_secret: str) -> str:
    now_ts = datetime.now(tz=timezone.utc).timestamp()

    cached_token = _token_cache.get("access_token")
    expires_at = _token_cache.get("expires_at", 0)

    if cached_token and now_ts < float(expires_at):
        return str(cached_token)

    response = requests.post(
        TWITCH_TOKEN_URL,
        params={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        },
        timeout=10,
    )
    response.raise_for_status()

    payload = response.json()
    access_token = payload.get("access_token")
    expires_in = int(payload.get("expires_in", 0))

    if not access_token:
        raise ValueError("Token Twitch/IGDB invalide.")

    # 60 sec de marge pour éviter l'expiration en cours de requête.
    _token_cache["access_token"] = access_token
    _token_cache["expires_at"] = now_ts + max(expires_in - 60, 60)

    return str(access_token)


def _igdb_request(client_id: str, client_secret: str, query: str) -> list[dict[str, Any]]:
    token = _get_access_token(client_id=client_id, client_secret=client_secret)

    response = requests.post(
        IGDB_GAMES_URL,
        headers={
            "Client-ID": client_id,
            "Authorization": f"Bearer {token}",
        },
        data=query,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def _escape_igdb_search(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').strip()


def _normalize_game_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "igdb_id": item.get("id"),
        "title": item.get("name"),
        "release_date": _format_date(item.get("first_release_date")),
        "cover_url": _normalize_cover((item.get("cover") or {}).get("url")),
        "genres": [g.get("name") for g in item.get("genres", []) if g.get("name")],
        "platforms": [p.get("name") for p in item.get("platforms", []) if p.get("name")],
    }


def search_games(client_id: str, client_secret: str, query: str, page_size: int = 5) -> list[dict[str, Any]]:
    if not client_id or not client_secret:
        raise ValueError("IGDB_CLIENT_ID ou IGDB_CLIENT_SECRET manquant.")

    safe_query = _escape_igdb_search(query)

    # Requête principale: recherche full-text IGDB.
    igdb_query = f'''
        fields
            id,
            name,
            first_release_date,
            genres.name,
            platforms.name,
            cover.url;
        search "{safe_query}";
        limit {page_size};
    '''

    results = _igdb_request(client_id=client_id, client_secret=client_secret, query=igdb_query)

    # Requête de secours: correspondance partielle sur le nom.
    if not results:
        fallback_query = f'''
            fields
                id,
                name,
                first_release_date,
                genres.name,
                platforms.name,
                cover.url;
            where name ~ *"{safe_query}"*;
            limit {page_size};
        '''
        results = _igdb_request(client_id=client_id, client_secret=client_secret, query=fallback_query)

    return [_normalize_game_item(item) for item in results]


def game_details(client_id: str, client_secret: str, igdb_id: int) -> dict[str, Any]:
    if not client_id or not client_secret:
        raise ValueError("IGDB_CLIENT_ID ou IGDB_CLIENT_SECRET manquant.")

    igdb_query = f'''
        fields
            id,
            name,
            first_release_date,
            genres.name,
            platforms.name,
            cover.url,
            artworks.url,
            screenshots.url,
            summary,
            videos.name,
            videos.video_id,
            involved_companies.publisher,
            involved_companies.company.name;
        where id = {igdb_id};
        limit 1;
    '''

    results = _igdb_request(client_id=client_id, client_secret=client_secret, query=igdb_query)

    if not results:
        raise ValueError("Jeu introuvable sur IGDB.")

    item = results[0]

    release_date = _format_date(item.get("first_release_date"))
    description_fr = _fetch_french_summary(item.get("name") or "")

    return {
        "igdb_id": item.get("id"),
        "title": item.get("name"),
        "release_date": release_date,
        "release_year": _extract_year(release_date),
        "cover_url": _normalize_cover((item.get("cover") or {}).get("url")),
        "genres": [g.get("name") for g in item.get("genres", []) if g.get("name")],
        "platforms": [p.get("name") for p in item.get("platforms", []) if p.get("name")],
        "publisher": _extract_publisher(item),
        "description": item.get("summary"),
        "description_fr": description_fr,
        "images": _collect_gallery_images(item),
        "videos": _extract_videos(item),
    }
