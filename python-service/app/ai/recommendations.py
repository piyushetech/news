"""
Recommendation engine v1 — category match + recency + engagement boost.
Replace with collaborative filtering / two-tower model at scale.
"""

from datetime import datetime, timedelta

from app.core.config import settings
from app.models.schemas import RecommendRequest, RecommendResponse

MODEL_VERSION = "v1-category-recency"


async def get_recommendations(req: RecommendRequest) -> RecommendResponse:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError as exc:
        raise RuntimeError(
            "motor is required for recommendations. Run: pip install motor pymongo"
        ) from exc

    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.get_default_database()

    categories = req.categories or ["General"]
    since = datetime.utcnow() - timedelta(days=7)

    query: dict = {
        "status": "approved",
        "isPublished": True,
        "category": {"$in": categories},
        "publishedAt": {"$gte": since},
    }
    if req.exclude_ids:
        from bson import ObjectId
        query["_id"] = {"$nin": [ObjectId(i) for i in req.exclude_ids if len(i) == 24]}

    if req.country == "IN":
        query["$or"] = [{"country": "IN"}, {"country": "INT"}, {"region": {"$regex": "India", "$options": "i"}}]
    elif req.country:
        query["$or"] = [{"country": req.country.upper()}, {"country": "INT"}]

    cursor = db.news.find(query).sort([("isTrending", -1), ("publishedAt", -1)]).limit(req.limit)
    items = await cursor.to_list(length=req.limit)

    scores = []
    ids = []
    now = datetime.utcnow()
    for item in items:
        recency_hours = max(1, (now - item.get("publishedAt", now)).total_seconds() / 3600)
        score = 1.0 / recency_hours
        if item.get("isTrending"):
            score *= 2
        if item.get("ai", {}).get("qualityScore"):
            score *= 1 + item["ai"]["qualityScore"]
        scores.append(round(score, 4))
        ids.append(str(item["_id"]))

    client.close()
    return RecommendResponse(news_ids=ids, scores=scores, model_version=MODEL_VERSION)
