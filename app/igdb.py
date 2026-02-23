from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests


TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_GAMES_URL = "https://api.igdb.com/v4/games"
IGDB_PLATFORMS_URL = "https://api.igdb.com/v4/platforms"
WIKIPEDIA_API_FR = "https://fr.wikipedia.org/w/api.php"

_token_cache: dict[str, Any] = {
    "access_token": None,
    "expires_at": 0,
}
_french_summary_cache: dict[str, str | None] = {}
_platform_id_cache: dict[str, list[int]] = {}


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


def _igdb_request(client_id: str, client_secret: str, query: str, endpoint: str = IGDB_GAMES_URL) -> list[dict[str, Any]]:
    token = _get_access_token(client_id=client_id, client_secret=client_secret)

    response = requests.post(
        endpoint,
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


def _normalize_platform_text(value: str) -> str:
    return "".join(ch for ch in value.lower().strip() if ch.isalnum())


def _normalize_title_text(value: str) -> str:
    return "".join(ch for ch in value.lower().strip() if ch.isalnum() or ch.isspace())


def _score_title_match(title: str, query: str) -> int:
    t = _normalize_title_text(title)
    q = _normalize_title_text(query)
    if not t or not q:
        return 0
    if t == q:
        return 400
    if t.startswith(q):
        return 250
    if q in t:
        return 180

    q_tokens = [token for token in q.split(" ") if token]
    score = sum(20 for token in q_tokens if token in t)
    # Léger bonus si la longueur est proche (réduit le bruit).
    score -= abs(len(t) - len(q)) // 6
    return score


_PLATFORM_EQUIV: dict[str, set[str]] = {
    "pc": {"pc", "windows", "microsoftwindows", "computer"},
    "nes": {"nes", "nintendoentertainmentsystem", "famicom"},
    "snes": {"snes", "supernintendo", "supernintendoentertainmentsystem"},
    "megadrive": {"megadrive", "segagenesis", "genesis"},
    "playstation": {"playstation", "ps1", "psx"},
    "playstation2": {"playstation2", "ps2"},
    "playstation3": {"playstation3", "ps3"},
    "playstation4": {"playstation4", "ps4"},
    "playstation5": {"playstation5", "ps5"},
    "xbox": {"xbox", "xboxclassic"},
    "xbox360": {"xbox360"},
    "xboxone": {"xboxone"},
    "xboxseriesx": {"xboxseriesx", "xboxseriess", "xboxseriesxandseriess"},
    "gameboyadvance": {"gameboyadvance", "gba"},
    "nintendods": {"nintendods", "nds"},
    "nintendoswitch": {"nintendoswitch", "switch"},
    "wiiu": {"wiiu"},
    "psvita": {"psvita", "vita"},
}


def _expanded_platform_terms(value: str) -> set[str]:
    normalized = _normalize_platform_text(value)
    if not normalized:
        return set()

    terms = {normalized}
    for canonical, aliases in _PLATFORM_EQUIV.items():
        if normalized == canonical or normalized in aliases:
            terms.add(canonical)
            terms.update(aliases)
    return terms


def _resolve_platform_ids(client_id: str, client_secret: str, platform: str | None) -> list[int]:
    if not platform:
        return []

    normalized = _normalize_platform_text(platform)
    if not normalized:
        return []

    if normalized in _platform_id_cache:
        return _platform_id_cache[normalized]

    terms = sorted(_expanded_platform_terms(platform), key=len, reverse=True)
    search_term = terms[0] if terms else normalized

    query = f'''
        fields id, name, alternative_name;
        search "{_escape_igdb_search(search_term)}";
        limit 20;
    '''
    rows = _igdb_request(client_id=client_id, client_secret=client_secret, query=query, endpoint=IGDB_PLATFORMS_URL)

    ids: list[int] = []
    for row in rows:
        candidates = [
            _normalize_platform_text(str(row.get("name") or "")),
            _normalize_platform_text(str(row.get("alternative_name") or "")),
        ]
        if any(
            candidate and any(t in candidate or candidate in t for t in terms)
            for candidate in candidates
        ):
            row_id = row.get("id")
            if isinstance(row_id, int):
                ids.append(row_id)

    # Déduplique en conservant l'ordre.
    deduped = list(dict.fromkeys(ids))
    _platform_id_cache[normalized] = deduped
    return deduped


def _filter_results_by_platform(results: list[dict[str, Any]], platform: str | None) -> list[dict[str, Any]]:
    if not platform:
        return results

    wanted_terms = _expanded_platform_terms(platform)
    if not wanted_terms:
        return results

    filtered: list[dict[str, Any]] = []
    for item in results:
        platforms = item.get("platforms", []) or []
        normalized_platforms = [_normalize_platform_text(p) for p in platforms if p]
        matched = False

        for platform_name in normalized_platforms:
            platform_terms = _expanded_platform_terms(platform_name)
            if not platform_terms:
                continue
            if any(
                (wanted in current or current in wanted)
                for wanted in wanted_terms
                for current in platform_terms
            ):
                matched = True
                break

        if matched:
            filtered.append(item)

    return filtered


def _finalize_results(results: list[dict[str, Any]], query: str, page_size: int) -> list[dict[str, Any]]:
    deduped: dict[int, dict[str, Any]] = {}
    for item in results:
        igdb_id = item.get("igdb_id")
        if isinstance(igdb_id, int) and igdb_id not in deduped:
            deduped[igdb_id] = item

    ranked = sorted(
        deduped.values(),
        key=lambda item: _score_title_match(str(item.get("title") or ""), query),
        reverse=True,
    )
    return ranked[:page_size]


def search_games(
    client_id: str,
    client_secret: str,
    query: str,
    page_size: int = 5,
    platform: str | None = None,
) -> list[dict[str, Any]]:
    if not client_id or not client_secret:
        raise ValueError("IGDB_CLIENT_ID ou IGDB_CLIENT_SECRET manquant.")

    safe_query = _escape_igdb_search(query)

    platform_ids = _resolve_platform_ids(client_id=client_id, client_secret=client_secret, platform=platform)
    platform_clause = f"platforms = ({','.join(str(pid) for pid in platform_ids)})" if platform_ids else ""
    platform_where = f"where {platform_clause};" if platform_clause else ""

    fetch_limit = max(page_size * 8, 40)

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
        {platform_where}
        limit {fetch_limit};
    '''

    results = _igdb_request(client_id=client_id, client_secret=client_secret, query=igdb_query)

    # Requête de secours: correspondance partielle sur le nom.
    if not results:
        fallback_where_parts = [f'name ~ *"{safe_query}"*']
        if platform_clause:
            fallback_where_parts.append(platform_clause)
        fallback_where = f"where {' & '.join(fallback_where_parts)};"

        fallback_query = f'''
            fields
                id,
                name,
                first_release_date,
                genres.name,
                platforms.name,
                cover.url;
            {fallback_where}
            limit {fetch_limit};
        '''
        results = _igdb_request(client_id=client_id, client_secret=client_secret, query=fallback_query)

    # Fallback robuste: si le filtre par IDs de plateforme a été trop strict
    # (mauvais mapping IGDB possible), on relance en large puis on filtre localement.
    if not results and platform:
        broad_query = f'''
            fields
                id,
                name,
                first_release_date,
                genres.name,
                platforms.name,
                cover.url;
            search "{safe_query}";
            limit {max(fetch_limit, 80)};
        '''
        broad_results = _igdb_request(client_id=client_id, client_secret=client_secret, query=broad_query)
        normalized_broad = [_normalize_game_item(item) for item in broad_results]
        filtered_broad = _filter_results_by_platform(normalized_broad, platform)
        return _finalize_results(filtered_broad, query, page_size)

    normalized = [_normalize_game_item(item) for item in results]
    filtered = _filter_results_by_platform(normalized, platform)
    return _finalize_results(filtered, query, page_size)


def game_details(client_id: str, client_secret: str, igdb_id: int, include_french_summary: bool = True) -> dict[str, Any]:
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
    description_fr = _fetch_french_summary(item.get("name") or "") if include_french_summary else None

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
