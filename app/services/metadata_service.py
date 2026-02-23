from __future__ import annotations


def pick_best_match(results: list[dict], title: str, platform: str | None) -> dict | None:
    if not results:
        return None

    title_lower = title.strip().lower()
    platform_lower = (platform or "").strip().lower()

    exact_title_matches = [r for r in results if (r.get("title") or "").strip().lower() == title_lower]
    candidate_pool = exact_title_matches or results

    if platform_lower:
        for candidate in candidate_pool:
            for platform_name in candidate.get("platforms", []):
                if platform_lower in platform_name.lower():
                    return candidate

    return candidate_pool[0]

