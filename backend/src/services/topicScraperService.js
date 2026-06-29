const News = require('../models/News');
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
    /<img[^>]+src="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m?.[1] && !m[1].includes('pixel')) return m[1];
  }
  return '';
};

const parseRssItems = (xml) => {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  itemBlocks.forEach((block) => {
    const rawTitle = extractTag(block, ['title']);
    const rawLink = extractTag(block, ['link']);
    const rawDescription = extractTag(block, ['description', 'content:encoded', 'summary']);
    const rawPubDate = extractTag(block, ['pubDate']);
    const imageUrl = extractImageFromBlock(block);
    const title = htmlToPlainText(rawTitle);
    const link = htmlToPlainText(rawLink);
    const description = htmlToPlainText(rawDescription);
    const pubDate = htmlToPlainText(rawPubDate);
    if (title && link) items.push({ title, link, description, pubDate, imageUrl });
  });

  return items;
};

const buildGoogleNewsUrl = (query, country = 'IN', lang = 'en') => {
  const hl = lang === 'hi' ? 'hi-IN' : `${lang}-${country}`;
  const params = new URLSearchParams({
    q: query,
    hl,
    gl: country,
    ceid: `${country}:${lang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
};

const resolveImageUrl = async (item) => {
  if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl)) return item.imageUrl;
  if (item.link) return fetchOgImage(item.link);
  return '';
};

const scrapeTopicNews = async ({ query, topicTag, category = 'General', country = 'IN', language = 'en' }) => {
  const results = { created: 0, skipped: 0, repaired: 0, errors: [], topicTag, query };

  try {
    const url = buildGoogleNewsUrl(query, country, language);
    const res = await fetch(url, { headers: { 'User-Agent': 'BriefNews-NewsBot/1.0' } });
    if (!res.ok) throw new Error(`Topic feed failed: ${res.status}`);
    const xml = await res.text();
    const items = parseRssItems(xml).slice(0, 8);

    for (const item of items) {
      const exists = await News.findOne({ originalLink: item.link });
      if (exists) {
        if (topicTag && !exists.topicTag) {
          exists.topicTag = topicTag;
          await exists.save({ validateBeforeSave: false });
        }
        results.skipped += 1;
        continue;
      }

      const content = await repairParagraph({
        paragraph: item.description || '',
        heading: item.title,
        originalLink: item.link,
        source: 'Google News',
      });
      const imageUrl = await resolveImageUrl(item);

      await News.create({
        heading: toSixtyWords(item.title).slice(0, 200),
        paragraph: content.paragraph,
        fullContent: content.fullContent,
        imageUrl: imageUrl || undefined,
        category,
        source: 'Google News',
        originalLink: item.link,
        region: country === 'IN' ? 'India' : 'International',
        country: country === 'IN' ? 'IN' : 'INT',
        language,
        topicTag,
        isAutomated: true,
        isTrending: true,
        status: 'pending',
        isPublished: false,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      });
      results.created += 1;
    }
  } catch (err) {
    results.errors.push(err.message);
  }

  return results;
};

module.exports = { scrapeTopicNews, buildGoogleNewsUrl };
