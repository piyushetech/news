"""
Deep Dive — rich 5W1H explainer with emphasis on causal "why".
"""

import json
import re
from datetime import datetime

from app.core.config import settings
from app.core.logging import log
from app.models.schemas import DeepDiveRequest, DeepDiveResponse

GENERIC_WHY_PATTERNS = (
    r"developments are unfolding",
    r"officials are responding",
    r"the situation is evolving",
    r"remains to be seen",
)


def _word_count(text: str) -> int:
    return len(re.findall(r"\w+", text or ""))


def _truncate_words(text: str, max_words: int) -> str:
    words = re.findall(r"\S+", text or "")
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words])


def _build_context(req: DeepDiveRequest) -> str:
    parts = [
        f"Headline: {req.heading}",
        f"Summary: {req.paragraph}",
    ]
    if req.full_content:
        parts.append(f"Full text: {req.full_content[:3500]}")
    if req.category:
        parts.append(f"Category: {req.category}")
    if req.source:
        parts.append(f"Source: {req.source}")
    if req.original_link:
        parts.append(f"Original URL: {req.original_link}")
    if req.city or req.region or req.country:
        loc = ", ".join(filter(None, [req.city, req.region, req.country]))
        parts.append(f"Location tags: {loc}")
    if req.published_at:
        parts.append(f"Published: {req.published_at}")
    if req.entities:
        for key, values in req.entities.items():
            if values:
                parts.append(f"{key.title()}: {', '.join(values[:8])}")
    return "\n".join(parts)


DEEP_DIVE_SYSTEM = """You are an expert news analyst writing a Deep Dive explainer for general readers.

Return ONLY valid JSON with exactly these keys: who, what, where, when, why, how.

Field rules:
- who: 2-3 sentences naming the main people, groups, institutions, and their roles.
- what: 2-3 sentences on the core event, decision, or development — be specific.
- where: 1-2 sentences on geography and why that location matters.
- when: 1-2 sentences with timing, sequence, or deadlines when known; say "timing unclear" only if absent.
- why: 3-4 sentences — THIS IS THE MOST IMPORTANT FIELD. Explain root causes, motivations, incentives, prior context, stakes for affected parties, and why this matters now. Never use vague filler like "developments are unfolding" or "officials are responding."
- how: 2-3 sentences on mechanisms, process, policy tools, or steps taken or planned.

Use only facts supported by the source text. Do not invent quotes, numbers, or names."""


async def _generate_with_openai(context: str) -> dict[str, str] | None:
    if not settings.openai_api_key:
        return None

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": DEEP_DIVE_SYSTEM},
                {"role": "user", "content": context},
            ],
            temperature=0.35,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or ""
        parsed = json.loads(raw)
        return {k: str(parsed.get(k, "")).strip() for k in ("who", "what", "where", "when", "why", "how")}
    except Exception as exc:
        log.warning("openai_deep_dive_failed", error=str(exc))
        return None


def _infer_why(req: DeepDiveRequest) -> str:
    """Heuristic why from paragraph when LLM unavailable."""
    text = " ".join(filter(None, [req.paragraph, req.full_content or ""]))
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sentences) >= 2:
        lead = sentences[0]
        context = sentences[1]
        return (
            f"This story matters because {lead.rstrip('.')}. "
            f"Background context: {context.rstrip('.')}. "
            f"The underlying issue connects to broader {req.category or 'news'} developments affecting "
            f"{req.city or req.region or req.country or 'the region'}."
        )
    if sentences:
        return (
            f"{sentences[0].rstrip('.')}. "
            f"Readers should follow this because it may affect policy, public safety, or daily life "
            f"in {req.city or req.region or req.country or 'the area covered by this report'}."
        )
    return (
        f"This {req.category or 'news'} report highlights a development tied to {req.heading.rstrip('.')}. "
        f"Further details may emerge as {req.source or 'sources'} continue reporting."
    )


def _is_generic_why(why: str) -> bool:
    lower = (why or "").lower()
    return any(re.search(p, lower) for p in GENERIC_WHY_PATTERNS) or _word_count(why) < 12


def _rule_based_fallback(req: DeepDiveRequest) -> DeepDiveResponse:
    entities = req.entities or {}
    people = entities.get("people") or []
    orgs = entities.get("organizations") or []
    locations = entities.get("locations") or []

    who_parts = []
    if people:
        who_parts.append(f"Key individuals include {', '.join(people[:4])}.")
    if orgs:
        who_parts.append(f"Organizations involved: {', '.join(orgs[:4])}.")
    who = " ".join(who_parts) if who_parts else f"Parties referenced in coverage from {req.source or 'news outlets'}."

    where = req.city or req.region or req.country
    if locations:
        where = f"{where or 'The story'} — notable places: {', '.join(locations[:3])}."
    elif where:
        where = f"{where} is the primary geographic focus of this report."
    else:
        where = "Location details are drawn from the original report."

    when = req.published_at or datetime.utcnow().strftime("%B %d, %Y")
    if req.published_at:
        when = f"Reported around {req.published_at}. Check the source for exact timing of events."

    return DeepDiveResponse(
        who=_truncate_words(who, 80),
        what=_truncate_words(req.heading, 80),
        where=_truncate_words(str(where), 60),
        when=_truncate_words(str(when), 50),
        why=_truncate_words(_infer_why(req), 120),
        how=_truncate_words(req.paragraph or req.full_content or req.heading, 100),
    )


async def build_deep_dive(req: DeepDiveRequest) -> DeepDiveResponse:
    context = _build_context(req)
    ai = await _generate_with_openai(context)

    if ai and all(ai.get(k) for k in ("who", "what", "where", "when", "why", "how")):
        if _is_generic_why(ai["why"]):
            ai["why"] = _infer_why(req)
        return DeepDiveResponse(**{k: _truncate_words(ai[k], 120 if k == "why" else 100) for k in ai})

    return _rule_based_fallback(req)
