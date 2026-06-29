# MongoDB Schema Reference

## users

```javascript
{
  _id: ObjectId,
  googleId: String,
  email: String,              // unique, indexed
  name: String,
  avatar: String,
  fcmToken: String,
  subscribedCategories: [String],
  notificationCategories: [String],
  preferredLanguage: String,    // default 'en'
  countryCode: String,
  city: String,
  interests: [String],
  occupation: String,
  ageGroup: String,           // enum optional, self-reported
  hiddenTopics: [String],
  embeddingId: String,        // ref to vector store user profile
  role: String,               // 'user' | 'admin'
  isActive: Boolean,
  lastActiveAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// Indexes: email, googleId, countryCode, lastActiveAt
```

## news

```javascript
{
  _id: ObjectId,
  heading: String,            // max 200
  paragraph: String,          // 60-word crux, max 2000
  fullContent: String,        // optional excerpt max 300 — NOT full republish
  category: String,           // indexed
  language: String,
  country: String,
  source: String,
  sourceId: ObjectId,         // ref sources
  originalLink: String,       // unique sparse index for dedup
  canonicalUrl: String,
  imageUrl: String,
  ogImage: String,
  author: String,
  tags: [String],
  keywords: [String],
  entities: {
    people: [String],
    organizations: [String],
    locations: [String]
  },
  status: String,             // pending | approved | rejected
  isPublished: Boolean,
  isTrending: Boolean,
  isControversial: Boolean,
  isAutomated: Boolean,
  region: String,
  city: String,
  publishedAt: Date,
  scrapedAt: Date,
  readingTimeMinutes: Number,
  ai: {
    sentiment: String,        // positive | negative | neutral
    sentimentScore: Number,
    qualityScore: Number,       // 0-1
    breakingScore: Number,
    importanceScore: Number,
    clickbaitScore: Number,
    biasHint: String,
    spamScore: Number,
    modelVersion: String
  },
  translations: Map,            // lang -> { heading, paragraph, fullContent }
  embedding: [Number],          // 384-dim or store in vector DB
  engagement: {
    views: Number,
    likes: Number,
    shares: Number,
    comments: Number,
    avgDwellMs: Number
  },
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { status, publishedAt }, { category, status }, { originalLink }, { city, status }
```

## sources

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,               // unique
  type: String,               // rss | api | scraper
  url: String,
  feedUrl: String,
  apiKeyEnv: String,          // env var name, not the key
  country: String,
  language: String,
  categories: [String],
  defaultCategory: String,
  robotsTxtUrl: String,
  scrapeAllowed: Boolean,
  rateLimitPerMinute: Number,
  priority: Number,           // queue priority
  isEnabled: Boolean,
  lastScrapedAt: Date,
  lastError: String,
  healthStatus: String,       // ok | degraded | blocked
  createdAt: Date
}
```

## reading_history

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  newsId: ObjectId,
  action: String,             // view | read | skip | like | dislike | share | bookmark
  dwellMs: Number,
  scrollDepth: Number,        // 0-1
  category: String,
  source: String,
  device: String,
  sessionId: String,
  createdAt: Date
}
// TTL index optional on createdAt (90 days raw, aggregate to analytics)
// Index: { userId, createdAt }, { newsId, createdAt }
```

## bookmarks

```javascript
{ userId: ObjectId, newsId: ObjectId, createdAt: Date }
// unique compound: { userId, newsId }
```

## notifications

```javascript
{
  userId: ObjectId,
  type: String,               // breaking | category | personalized
  title: String,
  body: String,
  newsId: ObjectId,
  category: String,
  sentAt: Date,
  openedAt: Date,
  clickedAt: Date
}
```

## recommendations

```javascript
{
  userId: ObjectId,
  newsId: ObjectId,
  score: Number,
  reason: String,             // 'category_match' | 'similar_users' | 'trending'
  modelVersion: String,
  expiresAt: Date,
  createdAt: Date
}
```

## search_history

```javascript
{ userId: ObjectId, query: String, filters: Object, resultCount: Number, clickedIds: [ObjectId], createdAt: Date }
```

## analytics_events

```javascript
{
  event: String,              // page_view | feed_scroll | search | notification_open
  userId: ObjectId,
  sessionId: String,
  properties: Object,
  createdAt: Date
}
```

## scraper_jobs

```javascript
{
  triggeredBy: String,          // admin | scheduler | user_refresh
  filters: { category, city, country, language, categories },
  status: String,               // queued | running | completed | failed
  feedsMatched: Number,
  created: Number,
  skipped: Number,
  errors: [String],
  startedAt: Date,
  completedAt: Date
}
```

## trending

```javascript
{
  newsId: ObjectId,
  category: String,
  country: String,
  velocityScore: Number,
  window: String,             // 1h | 6h | 24h
  rank: Number,
  computedAt: Date
}
```
