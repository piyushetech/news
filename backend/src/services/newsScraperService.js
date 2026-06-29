const News = require('../models/News');
const { RSS_FEEDS } = require('../constants/rssFeeds');
const { feedMatchesCity } = require('../utils/cityMatch');
const { toSixtyWords } = require('../utils/summarize');
const { htmlToPlainText, isWeakParagraph, repairParagraph, fetchOgImage } = require('../utils/textClean');

const extractTag = (block, tagNames) => {
  for (const tag of tagNames) {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (match?.[1]) return match[1];
  }
  return '';
};

const extractImageFromBlock = (block) => {
  const patterns = [
    /<media:content[^>]+url="([^"]+)"/i,
    /<media:thumbnail[^>]+url="([^"]+)"/i,
    /<enclosure[^>]+url="([^"]+)"[^>]*type="[^"]*image/i,
    /<enclosure[^>]+type="[^"]*image[^"]*"[^>]+url="([^"]+)"/i,
    /<img[^>]+src="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m?.[1] && !m[1].includes('pixel') && !m[1].includes('1x1')) return m[1];
  }
  return '';
};

const parseRssItems = (xml) => {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  itemBlocks.forEach((block) => {
    const rawTitle = extractTag(block, ['title']);
    const rawLink = extractTag(block, ['link']);
    const rawDescription = extractTag(block, [
      'description',
      'content:encoded',
      'summary',
      'media:description',
    ]);
    const rawPubDate = extractTag(block, ['pubDate']);
    const imageUrl = extractImageFromBlock(block);

    const title = htmlToPlainText(rawTitle);
    const link = htmlToPlainText(rawLink);
    const description = htmlToPlainText(rawDescription);
    const pubDate = htmlToPlainText(rawPubDate);

    if (title && link) {
      items.push({ title, link, description, pubDate, imageUrl });
    }
  });

  return items;
};

const fetchFeed = async (feedConfig) => {
  const res = await fetch(feedConfig.url, {
    headers: { 'User-Agent': 'BriefNews-NewsBot/1.0' },
  });
  if (!res.ok) throw new Error(`Feed failed: ${feedConfig.url}`);
  const xml = await res.text();
  return parseRssItems(xml).slice(0, 3).map((item) => ({
    ...item,
    ...feedConfig,
  }));
};

const resolveImageUrl = async (item) => {
  if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl)) return item.imageUrl;
  if (item.link) return fetchOgImage(item.link);
  return '';
};

const buildContent = async (item) =>
  repairParagraph({
    paragraph: item.description || '',
    heading: item.title,
    originalLink: item.link,
    source: item.source,
  });

const filterFeeds = (feeds, filters = {}) => {
  const { category, categories, city, country, language } = filters;

  return feeds.filter((feed) => {
    if (category && feed.category !== category) return false;

    if (categories?.length && !categories.includes(feed.category)) return false;

    if (country) {
      const c = country.toUpperCase();
      if (c !== 'ALL' && feed.country !== c) return false;
    }

    if (language && feed.language !== language) return false;

    if (city) {
      if (city === 'National') {
        if (feed.category !== 'National' && feed.city !== 'National') return false;
      } else if (!feedMatchesCity(feed.city, city)) {
        return false;
      }
    }

    return true;
  });
};

const scrapeNews = async (filters = {}) => {
  const feeds = filterFeeds(RSS_FEEDS, filters);
  const results = {
    created: 0,
    skipped: 0,
    repaired: 0,
    errors: [],
    feedsMatched: feeds.length,
    filters,
  };

  if (!feeds.length) {
    results.errors.push('No RSS feeds matched the selected filters.');
    return results;
  }

  for (const feed of feeds) {
    try {
      const items = await fetchFeed(feed);
      for (const item of items) {
        const exists = await News.findOne({ originalLink: item.link });
        if (exists) {
          let changed = false;
          if (isWeakParagraph(exists.paragraph, exists.heading)) {
            const repaired = await repairParagraph(exists);
            exists.paragraph = repaired.paragraph;
            if (repaired.fullContent) exists.fullContent = repaired.fullContent;
            changed = true;
          }
          if (!exists.imageUrl) {
            exists.imageUrl = await resolveImageUrl(item);
            if (exists.imageUrl) changed = true;
          }
          if (changed) {
            await exists.save({ validateBeforeSave: false });
            results.repaired += 1;
          } else {
            results.skipped += 1;
          }
          continue;
        }

        const [content, imageUrl] = await Promise.all([
          buildContent(item),
          resolveImageUrl(item),
        ]);

        await News.create({
          heading: toSixtyWords(item.title).slice(0, 200),
          paragraph: content.paragraph,
          fullContent: content.fullContent,
          imageUrl: imageUrl || undefined,
          category: feed.category,
          source: feed.source,
          originalLink: item.link,
          region: feed.region,
          country: feed.country,
          language: feed.language || 'en',
          city: feed.city,
          isAutomated: true,
          isControversial: !!feed.isControversial,
          isTrending: !!feed.isTrending || feed.category === 'Politics' || feed.category === 'Cricket' || feed.category === 'Current Affairs',
          status: 'pending',
          isPublished: false,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
        results.created += 1;
      }
    } catch (err) {
      results.errors.push(`${feed.url}: ${err.message}`);
    }
  }

  return results;
};

module.exports = { scrapeNews, RSS_FEEDS, filterFeeds };
