"""
AI enrichment pipeline — summary, sentiment, NER, quality, dedup.
Uses lightweight models; OpenAI optional for higher quality summaries.
"""

import re
from datetime import datetime

from app.core.config import settings
from app.core.logging import log
from app.models.schemas import EnrichedArticle, RawArticle

# Lazy-loaded models
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(settings.embedding_model)
        except Exception as exc:
            log.warning("embedder_unavailable", error=str(exc))
    return _embedder


def _word_count(text: str) -> int:
    return len(re.findall(r"\w+", text or ""))


def _truncate_words(text: str, max_words: int) -> str:
    words = re.findall(r"\S+", text or "")
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words])


def _simple_sentiment(text: str) -> tuple[str, float]:
    positive = {"good", "great", "win", "growth", "success", "breakthrough", "peace"}
    negative = {"bad", "crisis", "death", "war", "fail", "scandal", "attack", "loss"}
    tokens = set(re.findall(r"[a-z]+", text.lower()))
    pos = len(tokens & positive)
    neg = len(tokens & negative)
    if pos > neg:
        return "positive", min(0.95, 0.5 + pos * 0.1)
    if neg > pos:
        return "negative", min(0.95, 0.5 + neg * 0.1)
    return "neutral", 0.5


def _extract_entities(text: str) -> dict[str, list[str]]:
    entities = {"people": [], "organizations": [], "locations": []}
    try:
        import spacy
        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            return entities
        doc = nlp(text[:5000])
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities["people"].append(ent.text)
            elif ent.label_ in ("ORG", "GPE"):
                bucket = "organizations" if ent.label_ == "ORG" else "locations"
                entities[bucket].append(ent.text)
    except Exception:
        pass
    return {k: list(dict.fromkeys(v))[:10] for k, v in entities.items()}


def _quality_score(title: str, summary: str) -> float:
    score = 0.5
    wc = _word_count(summary)
    if 40 <= wc <= 80:
        score += 0.2
    elif wc >= 20:
        score += 0.1
    if title and len(title) > 15:
        score += 0.1
    if summary and summary != title:
        score += 0.1
    return min(1.0, score)


def _clickbait_score(title: str) -> float:
    patterns = [
        r"you won't believe",
        r"shocking",
        r"what happened next",
        r"\d+\s+(ways|reasons|things)",
        r"!\s*$",
    ]
    hits = sum(1 for p in patterns if re.search(p, title.lower()))
    return min(1.0, hits * 0.25)


async def summarize(text: str, title: str) -> str:
    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            prompt = (
                f"Summarize this news in exactly {settings.summary_max_words} words or fewer. "
                f"Do not copy verbatim. Headline: {title}\nText: {text[:2000]}"
            )
            resp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            return _truncate_words(resp.choices[0].message.content or text, settings.summary_max_words)
        except Exception as exc:
            log.warning("openai_summary_failed", error=str(exc))

    base = text if text and text != title else title
    return _truncate_words(base, settings.summary_max_words)


def embedding(text: str) -> list[float] | None:
    model = _get_embedder()
    if not model:
        return None
    vec = model.encode(text[:512], normalize_embeddings=True)
    return vec.tolist()


def is_duplicate(candidate: str, existing_embeddings: list[list[float]], threshold: float | None = None) -> bool:
    threshold = threshold or settings.duplicate_similarity_threshold
    model = _get_embedder()
    if not model or not existing_embeddings:
        return False
    import numpy as np
    cand = model.encode(candidate[:512], normalize_embeddings=True)
    for ex in existing_embeddings:
        sim = float(np.dot(cand, ex))
        if sim >= threshold:
            return True
    return False


async def enrich_article(raw: RawArticle, feed_meta: dict | None = None) -> EnrichedArticle:
    feed_meta = feed_meta or {}
    summary = await summarize(raw.description or raw.title, raw.title)
    sentiment, sentiment_score = _simple_sentiment(f"{raw.title} {summary}")
    entities = _extract_entities(f"{raw.title}. {summary}")
    reading_time = max(1, _word_count(summary) // 200)

    return EnrichedArticle(
        heading=raw.title[:200],
        paragraph=summary,
        full_content=_truncate_words(raw.description or summary, 300) or None,
        category=raw.category,
        source=raw.source,
        original_link=raw.link,
        canonical_url=raw.link,
        image_url=raw.image_url,
        og_image=raw.image_url,
        author=raw.author,
        language=raw.language,
        country=raw.country,
        region=raw.region,
        city=raw.city,
        tags=[raw.category.lower()],
        keywords=entities.get("organizations", [])[:5],
        reading_time_minutes=reading_time,
        published_at=datetime.utcnow(),
        is_trending=bool(feed_meta.get("is_trending")),
        is_controversial=bool(feed_meta.get("is_controversial")),
        entities=entities,
        ai={
            "sentiment": sentiment,
            "sentimentScore": sentiment_score,
            "qualityScore": _quality_score(raw.title, summary),
            "clickbaitScore": _clickbait_score(raw.title),
            "breakingScore": 0.3 if feed_meta.get("is_trending") else 0.1,
            "importanceScore": 0.5,
            "spamScore": 0.05,
            "modelVersion": "python-v1",
        },
    )
