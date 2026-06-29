const News = require('../models/News');
const ScraperJob = require('../models/ScraperJob');
const { scrapeNews: nodeScrape } = require('./newsScraperService');
const { isPythonEnabled, scrapeViaPython } = require('./pythonBridge');

const persistPythonArticles = async (articles = []) => {
  const results = { created: 0, skipped: 0, repaired: 0, errors: [] };

  for (const item of articles) {
    try {
      const link = item.original_link || item.originalLink;
      const exists = await News.findOne({ originalLink: link });
      if (exists) {
        results.skipped += 1;
        continue;
      }

      const breakingScore = item.ai?.breakingScore ?? 0;
      await News.create({
        heading: item.heading,
        paragraph: item.paragraph,
        fullContent: item.full_content || item.fullContent,
        category: item.category,
        source: item.source,
        originalLink: link,
        imageUrl: item.image_url || item.imageUrl,
        region: item.region,
        country: item.country,
        language: item.language || 'en',
        city: item.city,
        isAutomated: true,
        isControversial: !!item.is_controversial,
        isTrending: !!item.is_trending || breakingScore >= 0.7,
        isBreaking: breakingScore >= 0.7,
        scrapedBy: 'python',
        ai: item.ai || undefined,
        status: 'pending',
        isPublished: false,
        publishedAt: item.published_at ? new Date(item.published_at) : new Date(),
      });
      results.created += 1;
    } catch (err) {
      results.errors.push(err.message);
    }
  }

  return results;
};

const runScrape = async (filters = {}, meta = {}) => {
  const job = await ScraperJob.create({
    triggeredBy: meta.triggeredBy || 'manual',
    filters,
    status: 'running',
    startedAt: new Date(),
  });

  try {
    let result;

    if (isPythonEnabled()) {
      const pythonResult = await scrapeViaPython(filters);
      if (pythonResult) {
        const persisted = pythonResult.articles?.length
          ? await persistPythonArticles(pythonResult.articles)
          : { created: 0, skipped: 0, repaired: 0, errors: [] };

        result = {
          ...persisted,
          feedsMatched: pythonResult.feeds_matched || 0,
          filters: pythonResult.filters || filters,
          engine: 'python',
          errors: [...(pythonResult.errors || []), ...persisted.errors],
        };
      }
    }

    if (!result) {
      const nodeResult = await nodeScrape(filters);
      result = { ...nodeResult, engine: 'node', feedsMatched: nodeResult.feedsMatched || 0 };
    }

    job.status = 'completed';
    job.feedsMatched = result.feedsMatched || 0;
    job.created = result.created || 0;
    job.skipped = result.skipped || 0;
    job.jobErrors = result.errors || [];
    job.completedAt = new Date();
    await job.save();

    return { ...result, jobId: job._id };
  } catch (err) {
    job.status = 'failed';
    job.jobErrors = [err.message];
    job.completedAt = new Date();
    await job.save();
    throw err;
  }
};

module.exports = { runScrape, persistPythonArticles };
