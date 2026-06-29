"""
Legal RSS feed registry — mirrors backend/src/constants/rssFeeds.js.
Only official RSS feeds; no full-article republishing.
"""

RSS_SOURCES: list[dict] = [
    {"url": "https://feeds.bbci.co.uk/news/world/rss.xml", "category": "World", "source": "BBC World", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://www.theguardian.com/world/rss", "category": "World", "source": "The Guardian", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://www.aljazeera.com/xml/rss/all.xml", "category": "World", "source": "Al Jazeera", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/news/politics/rss.xml", "category": "Politics", "source": "BBC Politics", "region": "International", "country": "INT", "language": "en", "is_controversial": True},
    {"url": "https://www.espncricinfo.com/rss/content/story/feeds/6.xml", "category": "Cricket", "source": "ESPN Cricinfo", "region": "International", "country": "INT", "language": "en", "is_trending": True},
    {"url": "https://feeds.bbci.co.uk/sport/rss.xml", "category": "Sports", "source": "BBC Sport", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/news/technology/rss.xml", "category": "Technology", "source": "BBC Tech", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/news/business/rss.xml", "category": "Business", "source": "BBC Business", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "category": "Science", "source": "BBC Science", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "category": "Entertainment", "source": "BBC Entertainment", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://techcrunch.com/feed/", "category": "Technology", "source": "TechCrunch", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.arstechnica.com/arstechnica/index", "category": "Technology", "source": "Ars Technica", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "category": "Business", "source": "CoinDesk", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://www.nasa.gov/rss/dyn/breaking_news.rss", "category": "Science", "source": "NASA", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://www.who.int/rss-feeds/news-english.xml", "category": "Science", "source": "WHO", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml", "category": "World", "source": "United Nations", "region": "International", "country": "INT", "language": "en"},
    {"url": "https://feeds.bbci.co.uk/hindi/rss.xml", "category": "National", "source": "BBC Hindi", "region": "India", "country": "IN", "language": "hi", "city": "National"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/1221656.cms", "category": "National", "source": "Times of India", "region": "India", "country": "IN", "language": "en", "city": "National"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", "category": "Cricket", "source": "Times of India", "region": "India", "country": "IN", "language": "en", "is_trending": True},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "category": "City", "source": "Times of India", "region": "India", "country": "IN", "language": "en", "city": "Mumbai"},
    {"url": "https://www.thehindu.com/news/national/feeder/default.rss", "category": "National", "source": "The Hindu", "region": "India", "country": "IN", "language": "en", "city": "National"},
    # Current Affairs
    {"url": "https://www.gktoday.in/current-affairs/feed/", "category": "Current Affairs", "source": "GKToday", "region": "India", "country": "IN", "language": "en", "city": "National", "is_trending": True},
    {"url": "https://affairscloud.com/feed/", "category": "Current Affairs", "source": "AffairsCloud", "region": "India", "country": "IN", "language": "en", "city": "National", "is_trending": True},
    {"url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "category": "Current Affairs", "source": "Hindustan Times", "region": "India", "country": "IN", "language": "en", "city": "National"},
    {"url": "https://indianexpress.com/section/india/feed/", "category": "Current Affairs", "source": "Indian Express", "region": "India", "country": "IN", "language": "en", "city": "National"},
    {"url": "https://feeds.feedburner.com/ndtvnews-india-news", "category": "Current Affairs", "source": "NDTV", "region": "India", "country": "IN", "language": "en", "city": "National"},
    {"url": "https://feeds.reuters.com/reuters/worldNews", "category": "Current Affairs", "source": "Reuters", "region": "International", "country": "INT", "language": "en"},
]

SCRAPE_CITIES = sorted({f["city"] for f in RSS_SOURCES if f.get("city")})
