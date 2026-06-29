const News = require('../models/News');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendCategoryNewsNotification } = require('../services/notificationService');
const { runScrape } = require('../services/scrapeOrchestrator');
const { runHourlyScrape } = require('../services/schedulerService');
const ScraperJob = require('../models/ScraperJob');
const { isPythonEnabled, checkPythonHealth } = require('../services/pythonBridge');
const {
  htmlToPlainText,
  isHtmlContent,
  isWeakParagraph,
  repairParagraph,
  toSixtyWords,
  toCruxWords,
  toMaxWords,
  wordCount,
  CRUX_SOFT_WORDS,
} = require('../utils/textClean');
const {
  buildDeepDive,
  isStaleDeepDive,
  buildEli5,
  buildBiasPerspectives,
  buildMorningBriefingScript,
} = require('../services/aiService');
const { localizeNewsList, translateNewsDoc, translateDeepDive, translateBiasPerspectives } = require('../services/translationService');
const { CATEGORIES, CATEGORY_IDS } = require('../constants/categories');
const { LANGUAGES } = require('../constants/languages');
const { SCRAPE_CITIES } = require('../constants/rssFeeds');
const { TRENDING_TOPICS } = require('../constants/trendingTopics');
const { fetchDynamicTopics, resolveTopic } = require('../services/trendingTopicsService');
const { scrapeTopicNews } = require('../services/topicScraperService');
const { buildCityRegex, normalizeCityForScrape } = require('../utils/cityMatch');

const LOCAL_NEWS_MIN = 3;

const buildLocalNewsFilter = (city, country) => {
  const filter = { ...approvedFilter };
  if (city) {
    const cityRe = buildCityRegex(city);
    filter.$or = [{ city: cityRe }, { region: cityRe }];
    if (country) filter.country = country.toUpperCase();
  } else {
    filter.category = { $in: ['City', 'Local', 'National'] };
    if (country) filter.country = country;
  }
  return filter;
};

const queryLocalNews = (city, country, limit = 25) =>
  News.find(buildLocalNewsFilter(city, country)).sort({ publishedAt: -1 }).limit(limit);

const autoApproveScrapedSince = async (since, { city, country, topicTag } = {}) => {
  const filter = { status: 'pending', createdAt: { $gte: since } };
  if (topicTag) filter.topicTag = topicTag;
  if (city) {
    const cityRe = buildCityRegex(city);
    filter.$or = [{ city: cityRe }, { region: cityRe }];
  }
  if (country) filter.country = country.toUpperCase();
  const result = await News.updateMany(filter, {
    $set: { status: 'approved', isPublished: true, publishedAt: new Date() },
  });
  return result.modifiedCount;
};

const queryTopicNews = (topicTag, limit = 25) =>
  News.find({ ...approvedFilter, topicTag }).sort({ publishedAt: -1 }).limit(limit);

const queryLatestCountryNews = (country, limit = 25) => {
  const filter = { ...approvedFilter };
  if (country === 'IN') {
    filter.$or = [
      { country: 'IN' },
      { region: /India/i },
      { category: { $in: ['National', 'City'] } },
    ];
  } else {
    filter.$or = [{ country: country.toUpperCase() }, { country: 'INT' }];
  }
  return News.find(filter).sort({ publishedAt: -1 }).limit(limit);
};

const applyRepair = async (item) => {
  const repaired = await repairParagraph(item);
  item.paragraph = repaired.paragraph;
  if (repaired.fullContent && !item.fullContent) item.fullContent = repaired.fullContent;
};

const paginate = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(30, Math.max(1, parseInt(limit, 10)));
  return { skip: (p - 1) * l, limit: l, page: p };
};

const approvedFilter = { status: 'approved', isPublished: true };

const parseCategoriesParam = (raw) =>
  (raw ? String(raw).split(',') : []).map((c) => c.trim()).filter(Boolean);

const buildTopicNewsFilter = (topicTag, categories = []) => {
  const filter = { ...approvedFilter, topicTag };
  if (categories.length === 1) filter.category = categories[0];
  else if (categories.length > 1) filter.category = { $in: categories };
  return filter;
};

const resolveTopicRequest = (topicId, { country, lang, categories, q, label }) => {
  let topicDef = topicId ? resolveTopic(topicId, country, lang, categories) : null;
  if (!topicDef && topicId && q) {
    topicDef = {
      id: topicId,
      label: (label || String(q)).slice(0, 60),
      query: String(q).slice(0, 120),
      category: categories.length === 1 ? categories[0] : 'General',
      dynamic: true,
    };
  }
  return topicDef;
};

const buildForMeFilter = (user, query = {}) => {
  const subscribed = user.subscribedCategories?.length ? user.subscribedCategories : CATEGORY_IDS;

  let categories = subscribed;
  if (query.categories) {
    const requested = String(query.categories)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const filtered = requested.filter((c) => CATEGORY_IDS.includes(c) && subscribed.includes(c));
    if (filtered.length) categories = filtered;
  } else if (
    query.category
    && CATEGORY_IDS.includes(query.category)
    && subscribed.includes(query.category)
  ) {
    categories = [query.category];
  }

  const lang = user.preferredLanguage || query.lang || 'en';
  const city = query.city;
  const country = user.countryCode || query.country;
  const since = query.since;

  const filter = { ...approvedFilter, category: { $in: categories } };

  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) filter.publishedAt = { $gt: sinceDate };
  }

  const applyCountryScope = (countryCode) => {
    if (!countryCode) return;
    filter.$and = filter.$and || [];
    if (countryCode === 'IN') {
      filter.$and.push({
        $or: [
          { country: 'IN' },
          { country: 'INT' },
          { region: /India/i },
          { country: { $in: [null, ''] } },
          { country: { $exists: false } },
        ],
      });
    } else {
      filter.$and.push({
        $or: [
          { country: countryCode.toUpperCase() },
          { country: 'INT' },
          { country: { $in: [null, ''] } },
          { country: { $exists: false } },
        ],
      });
    }
  };

  if (city) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { city: new RegExp(city, 'i') },
        { region: new RegExp(city, 'i') },
        { category: { $in: categories.filter((c) => c !== 'City') } },
      ],
    });
    applyCountryScope(country);
  } else {
    applyCountryScope(country);
  }

  return { filter, categories, lang, city, country };
};

const fetchForMeNews = async (user, query = {}) => {
  const { filter, categories, lang, city, country } = buildForMeFilter(user, query);
  const { skip, limit, page } = paginate(query.page, query.limit || 10);

  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1, isBreaking: -1 }).skip(skip).limit(limit),
    News.countDocuments(filter),
  ]);

  const data = await localizeNewsList(items, lang);
  const hasMore = skip + items.length < total;

  return {
    data,
    meta: {
      categories,
      city: city || null,
      country: country || null,
      count: data.length,
      total,
      page,
      limit,
      hasMore,
      category: query.category || null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore,
    },
  };
};

exports.getCategories = catchAsync(async (req, res) => {
  res.json({ status: 'success', data: CATEGORIES });
});

exports.getLanguages = catchAsync(async (req, res) => {
  res.json({ status: 'success', data: LANGUAGES });
});

exports.getNewsFeed = catchAsync(async (req, res) => {
  const { skip, limit, page } = paginate(req.query.page, req.query.limit);
  const filter = { ...approvedFilter };
  const lang = req.query.lang;

  if (req.query.category) {
    filter.category = req.query.category;
  } else if (req.query.categories) {
    const cats = String(req.query.categories)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cats.length) filter.category = { $in: cats };
  }

  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    News.countDocuments(filter),
  ]);

  const data = await localizeNewsList(items, lang);

  res.json({
    status: 'success',
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

exports.getTrending = catchAsync(async (req, res) => {
  const items = await News.find({ ...approvedFilter, isTrending: true })
    .sort({ publishedAt: -1 })
    .limit(5);
  const data = await localizeNewsList(items, req.query.lang);
  res.json({ status: 'success', data });
});

exports.getTrendingTopics = catchAsync(async (req, res) => {
  const country = (req.query.country || 'IN').toUpperCase();
  const lang = req.query.lang || 'en';
  const limit = Math.min(5, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const categories = req.query.categories
    ? String(req.query.categories).split(',').map((c) => c.trim()).filter(Boolean)
    : [];
  const { topics, source } = await fetchDynamicTopics(country, lang, limit, categories);
  res.json({
    status: 'success',
    data: topics,
    meta: { count: topics.length, source, country, categories },
  });
});

exports.refreshTopicNews = catchAsync(async (req, res, next) => {
  const { topic, q, label, country, lang, categories: categoriesRaw } = req.query;
  const countryCode = (country || 'IN').toUpperCase();
  const language = lang || 'en';
  const categories = parseCategoriesParam(categoriesRaw);

  const topicDef = resolveTopicRequest(topic, {
    country: countryCode,
    lang: language,
    categories,
    q,
    label,
  });
  if (!topicDef?.query) return next(new AppError('Pick a topic or enter a search term.', 400));

  const scrapeCategory = categories.length === 1 ? categories[0] : topicDef.category;

  const started = new Date();
  const scrapeResult = await scrapeTopicNews({
    query: topicDef.query,
    topicTag: topicDef.id,
    category: scrapeCategory,
    country: countryCode,
    language,
  });
  const approved = await autoApproveScrapedSince(started, { topicTag: topicDef.id });

  const { skip, limit, page } = paginate(req.query.page, req.query.limit || 10);
  const filter = buildTopicNewsFilter(topicDef.id, categories);
  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    News.countDocuments(filter),
  ]);

  const data = await localizeNewsList(items, lang);
  const hasMore = skip + items.length < total;

  res.json({
    status: 'success',
    data,
    meta: {
      topic: topicDef.id,
      label: topicDef.label,
      count: data.length,
      total,
      page,
      limit,
      hasMore,
    },
    scrape: {
      created: scrapeResult.created,
      approved,
      errors: scrapeResult.errors,
    },
  });
});

exports.getTopicNews = catchAsync(async (req, res, next) => {
  const { topic, q, label, country, lang, categories: categoriesRaw, page, limit: limitQ } = req.query;
  if (!topic) return next(new AppError('Topic is required.', 400));

  const countryCode = (country || 'IN').toUpperCase();
  const language = lang || 'en';
  const categories = parseCategoriesParam(categoriesRaw);

  const topicDef = resolveTopicRequest(topic, {
    country: countryCode,
    lang: language,
    categories,
    q,
    label,
  });
  if (!topicDef) return next(new AppError('Topic not found.', 404));

  const { skip, limit, page: p } = paginate(page, limitQ || 10);
  const filter = buildTopicNewsFilter(topicDef.id, categories);
  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    News.countDocuments(filter),
  ]);

  const data = await localizeNewsList(items, lang);
  const hasMore = skip + items.length < total;

  res.json({
    status: 'success',
    data,
    meta: {
      topic: topicDef.id,
      label: topicDef.label,
      count: data.length,
      total,
      page: p,
      limit,
      hasMore,
    },
  });
});

exports.getLocalNews = catchAsync(async (req, res) => {
  const { city, country, lang } = req.query;
  const items = await queryLocalNews(city, country);
  const data = await localizeNewsList(items, lang);
  res.json({
    status: 'success',
    data,
    meta: { city: city || null, country: country || null, count: data.length },
  });
});

exports.refreshLocalNews = catchAsync(async (req, res, next) => {
  const { city, country, lang } = req.query;
  if (!city) return next(new AppError('City is required.', 400));

  const countryCode = (country || 'IN').toUpperCase();
  const scrapeCity = normalizeCityForScrape(city, SCRAPE_CITIES);
  let scrapeMeta = null;
  let usedFallback = false;

  let items = await queryLocalNews(city, countryCode);

  if (items.length < LOCAL_NEWS_MIN) {
    const started = new Date();
    const scrapeResult = await runScrape(
      { city: scrapeCity, country: countryCode },
      { triggeredBy: 'local_refresh' },
    );
    const approved = await autoApproveScrapedSince(started, { city, country: countryCode });
    items = await queryLocalNews(city, countryCode);
    scrapeMeta = {
      city: scrapeCity,
      created: scrapeResult.created,
      approved,
      feedsMatched: scrapeResult.feedsMatched,
      engine: scrapeResult.engine,
    };
  }

  if (items.length === 0) {
    usedFallback = true;
    const started = new Date();
    const fallbackScrape = await runScrape(
      { city: 'National', country: countryCode },
      { triggeredBy: 'local_fallback' },
    );
    const approved = await autoApproveScrapedSince(started, { country: countryCode });
    items = await queryLatestCountryNews(countryCode);
    scrapeMeta = {
      ...(scrapeMeta || {}),
      fallback: true,
      fallbackCreated: fallbackScrape.created,
      fallbackApproved: approved,
      feedsMatched: fallbackScrape.feedsMatched,
      engine: fallbackScrape.engine,
    };
  }

  const data = await localizeNewsList(items, lang);
  res.json({
    status: 'success',
    data,
    meta: {
      city,
      scrapeCity,
      country: countryCode,
      count: data.length,
      fallback: usedFallback,
      scraped: !!scrapeMeta,
    },
    scrape: scrapeMeta,
  });
});

exports.getCountryNews = catchAsync(async (req, res) => {
  const country = (req.query.country || 'IN').toUpperCase();
  const filter = { ...approvedFilter };

  if (country === 'IN') {
    filter.$or = [
      { country: 'IN' },
      { region: /India/i },
      { category: { $in: ['National', 'City'] } },
    ];
  } else {
    filter.$or = [{ country }, { region: new RegExp(country, 'i') }];
  }

  const { skip, limit, page } = paginate(req.query.page, req.query.limit || 10);
  const [items, total] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
    News.countDocuments(filter),
  ]);
  const data = await localizeNewsList(items, req.query.lang);
  const hasMore = skip + items.length < total;
  res.json({
    status: 'success',
    data,
    meta: { page, limit, total, hasMore, country },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasMore },
  });
});

exports.getMorningBriefing = catchAsync(async (req, res) => {
  const filter = { ...approvedFilter };
  const country = req.query.country;

  if (country) {
    if (country.toUpperCase() === 'IN') {
      filter.$or = [
        { country: 'IN' },
        { region: /India/i },
        { category: { $in: ['National', 'City'] } },
      ];
    } else {
      filter.$or = [{ country: country.toUpperCase() }, { region: new RegExp(country, 'i') }];
    }
  }

  const stories = await News.find(filter)
    .sort({ publishedAt: -1 })
    .limit(5);

  const localized = await localizeNewsList(stories, req.query.lang);
  const script = buildMorningBriefingScript(localized);
  res.json({ status: 'success', data: { stories: localized, script } });
});

exports.getNewsById = catchAsync(async (req, res, next) => {
  const item = await News.findOne({ _id: req.params.id, ...approvedFilter });
  if (!item) return next(new AppError('News not found.', 404));
  const data = await translateNewsDoc(item, req.query.lang);
  res.json({ status: 'success', data });
});

exports.getDeepDive = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ _id: req.params.id, ...approvedFilter });
  if (!news) return next(new AppError('News not found.', 404));

  if (isStaleDeepDive(news.deepDive)) {
    news.deepDive = await buildDeepDive(news);
    await news.save({ validateBeforeSave: false });
  }

  let data = news.deepDive;
  const lang = req.query.lang;
  if (lang && lang !== 'en') {
    data = await translateDeepDive(data, lang, news.language || 'en');
  }

  res.json({ status: 'success', data });
});

exports.getEli5 = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ _id: req.params.id, ...approvedFilter });
  if (!news) return next(new AppError('News not found.', 404));

  if (!news.eli5Summary) {
    news.eli5Summary = await buildEli5(news);
    await news.save({ validateBeforeSave: false });
  }

  res.json({ status: 'success', data: { eli5Summary: news.eli5Summary } });
});

exports.getBias = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ _id: req.params.id, ...approvedFilter });
  if (!news) return next(new AppError('News not found.', 404));

  if (!news.biasLeft || !news.biasRight) {
    const bias = await buildBiasPerspectives(news);
    news.biasLeft = bias.left;
    news.biasRight = bias.right;
    await news.save({ validateBeforeSave: false });
  }

  let { biasLeft: left, biasRight: right } = news;
  const lang = req.query.lang;
  if (lang && lang !== 'en') {
    ({ left, right } = await translateBiasPerspectives(left, right, lang, news.language || 'en'));
  }

  res.json({
    status: 'success',
    data: { left, right, isControversial: news.isControversial },
  });
});

exports.adminGetAll = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  const items = await News.find(filter).sort({ createdAt: -1 });

  for (const item of items) {
    if (isHtmlContent(item.paragraph) || isWeakParagraph(item.paragraph, item.heading)) {
      await applyRepair(item);
      await item.save({ validateBeforeSave: false });
    }
  }

  res.json({ status: 'success', data: items });
});

exports.adminGetPending = catchAsync(async (req, res) => {
  const items = await News.find({ status: 'pending' }).sort({ createdAt: -1 });

  for (const item of items) {
    if (isHtmlContent(item.paragraph) || isWeakParagraph(item.paragraph, item.heading)) {
      await applyRepair(item);
      await item.save({ validateBeforeSave: false });
    }
  }

  res.json({ status: 'success', data: items });
});

exports.getNewsForMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));
  const result = await fetchForMeNews(user, req.query);
  res.json({ status: 'success', ...result });
});

exports.refreshNewsForMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  const category = req.query.category;
  const subscribed = user.subscribedCategories?.length ? user.subscribedCategories : CATEGORY_IDS;
  let categories = subscribed;
  if (req.query.categories) {
    const requested = String(req.query.categories).split(',').map((c) => c.trim()).filter(Boolean);
    const filtered = requested.filter((c) => CATEGORY_IDS.includes(c) && subscribed.includes(c));
    if (filtered.length) categories = filtered;
  } else if (category && subscribed.includes(category)) {
    categories = [category];
  }
  const city = req.query.city;
  const country = user.countryCode;

  const scrapeFilters = { categories };
  if (categories.length === 1) scrapeFilters.category = categories[0];
  if (city) scrapeFilters.city = city;
  if (country) scrapeFilters.country = country;

  const started = new Date();
  const scrapeResult = await runScrape(scrapeFilters, { triggeredBy: 'user_refresh' });
  const approved = await autoApproveScrapedSince(started, { city, country });
  const result = await fetchForMeNews(user, req.query);

  res.json({
    status: 'success',
    ...result,
    scrape: {
      created: scrapeResult.created,
      skipped: scrapeResult.skipped,
      approved,
      feedsMatched: scrapeResult.feedsMatched,
      engine: scrapeResult.engine,
    },
  });
});

exports.getScrapeOptions = catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      categories: CATEGORY_IDS,
      cities: SCRAPE_CITIES,
      countries: ['IN', 'INT'],
      languages: LANGUAGES.map((l) => l.code),
    },
  });
});

exports.scrapeNews = catchAsync(async (req, res) => {
  const { category, city, country, language, categories } = req.body || {};
  const filters = {};

  if (category) filters.category = category;
  if (Array.isArray(categories) && categories.length) filters.categories = categories;
  if (city) filters.city = city;
  if (country) filters.country = country;
  if (language) filters.language = language;

  const result = await runScrape(filters, { triggeredBy: 'admin' });
  res.json({ status: 'success', data: result });
});

exports.triggerCronScrape = catchAsync(async (req, res) => {
  const result = await runHourlyScrape();
  res.json({ status: 'success', data: result });
});

exports.getScraperJobs = catchAsync(async (req, res) => {
  const jobs = await ScraperJob.find().sort({ createdAt: -1 }).limit(20);
  res.json({ status: 'success', data: jobs });
});

exports.getSystemHealth = catchAsync(async (req, res) => {
  const pythonOk = isPythonEnabled() ? await checkPythonHealth() : null;
  res.json({
    status: 'success',
    data: {
      node: 'ok',
      python: pythonOk,
      pythonEnabled: isPythonEnabled(),
    },
  });
});

exports.approveNews = catchAsync(async (req, res, next) => {
  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found.', 404));

  if (isHtmlContent(news.paragraph) || isWeakParagraph(news.paragraph, news.heading)) {
    await applyRepair(news);
  }

  if (!news.country) {
    news.country = /India/i.test(news.region || '') ? 'IN' : 'INT';
  }

  news.status = 'approved';
  news.isPublished = true;
  news.publishedAt = new Date();
  await news.save();

  if (req.body.sendNotification !== false) {
    await sendCategoryNewsNotification(news);
  }

  res.json({ status: 'success', data: news });
});

exports.rejectNews = catchAsync(async (req, res, next) => {
  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found.', 404));

  news.status = 'rejected';
  news.isPublished = false;
  await news.save();

  res.json({ status: 'success', data: news });
});

exports.createNews = catchAsync(async (req, res) => {
  const { heading, paragraph, fullContent, category, source, originalLink, sendNotification, isBreaking } = req.body;
  const plain = htmlToPlainText(paragraph);
  const crux = toCruxWords(plain);
  const extended = fullContent
    ? toMaxWords(fullContent, 300)
    : wordCount(plain) > CRUX_SOFT_WORDS
      ? toMaxWords(plain, 300)
      : toMaxWords(plain, 300);

  const news = await News.create({
    heading: htmlToPlainText(heading),
    paragraph: crux,
    fullContent: extended,
    category: category || 'General',
    country: req.body.country || 'IN',
    source: source || 'BriefNews',
    originalLink,
    status: 'approved',
    isPublished: true,
    isAutomated: false,
    isBreaking: !!isBreaking,
    isTrending: !!isBreaking,
    createdBy: req.admin.id,
    publishedAt: new Date(),
  });

  if (sendNotification !== false) {
    await sendCategoryNewsNotification(news);
  }

  res.status(201).json({ status: 'success', data: news });
});

exports.updateNews = catchAsync(async (req, res, next) => {
  const updates = { ...req.body };
  if (updates.heading) updates.heading = htmlToPlainText(updates.heading);
  if (updates.paragraph) {
    const plain = htmlToPlainText(updates.paragraph);
    updates.paragraph = toCruxWords(plain);
    if (updates.fullContent) {
      updates.fullContent = toMaxWords(updates.fullContent, 300);
    } else if (wordCount(plain) > CRUX_SOFT_WORDS) {
      updates.fullContent = toMaxWords(plain, 300);
    }
  }

  const news = await News.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!news) return next(new AppError('News not found.', 404));
  res.json({ status: 'success', data: news });
});

exports.deleteNews = catchAsync(async (req, res, next) => {
  const news = await News.findByIdAndDelete(req.params.id);
  if (!news) return next(new AppError('News not found.', 404));
  res.json({ status: 'success', message: 'Deleted.' });
});

exports.getStats = catchAsync(async (req, res) => {
  const [totalNews, todayNews, totalUsers, pendingNews, approvedNews, categoryStats] = await Promise.all([
    News.countDocuments(),
    News.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    User.countDocuments(),
    News.countDocuments({ status: 'pending' }),
    News.countDocuments({ status: 'approved' }),
    News.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);
  res.json({
    status: 'success',
    data: { totalNews, todayNews, totalUsers, pendingNews, approvedNews, categoryStats },
  });
});
