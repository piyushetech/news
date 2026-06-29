const cheerio = require('cheerio');

const decodeEntities = (text = '') =>
  text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const htmlToPlainText = (input = '') => {
  if (!input || typeof input !== 'string') return '';

  let text = decodeEntities(input.trim());
  if (!text) return '';

  if (/<[^>]+>/.test(text)) {
    const $ = cheerio.load(text, { decodeEntities: true });
    $('script, style, noscript, iframe').remove();
    text = $.root().text();
  }

  return text.replace(/\s+/g, ' ').trim();
};

const wordCount = (text = '') => text.split(/\s+/).filter(Boolean).length;

const isHtmlContent = (text = '') =>
  /<[^>]+>/.test(text) ||
  /&lt;\/?[a-z][^&]*&gt;/i.test(text) ||
  /<img\b/i.test(text);

const isWeakParagraph = (paragraph, heading = '') => {
  const plain = htmlToPlainText(paragraph);
  const plainHeading = htmlToPlainText(heading);

  if (!plain) return true;
  if (isHtmlContent(paragraph)) return true;
  if (plain === plainHeading) return true;
  if (wordCount(plain) < 12) return true;
  if (/^https?:\/\/\S+$/i.test(plain.replace(/\s/g, ''))) return true;

  return false;
};

const CRUX_MAX_WORDS = 120;
const CRUX_SOFT_WORDS = 60;

const toSixtyWords = (text = '') => {
  const cleaned = htmlToPlainText(text);
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  if (words.length <= CRUX_SOFT_WORDS) return cleaned;
  return `${words.slice(0, CRUX_SOFT_WORDS).join(' ')}…`;
};

/** Admin/manual crux — up to 120 words, saved as written (within limit). */
const toCruxWords = (text = '') => toMaxWords(text, CRUX_MAX_WORDS);

const toMaxWords = (text = '', max = 300) => {
  const cleaned = htmlToPlainText(text);
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  if (words.length <= max) return cleaned;
  return `${words.slice(0, max).join(' ')}…`;
};

const extractArticleParagraphs = async (url) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefNews-NewsBot/1.0; +https://briefnews.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return '';

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, iframe, noscript, svg').remove();

    const selectors = [
      'article p',
      '.story-content p',
      '.Normal',
      '[class*="article"] p',
      '[class*="story"] p',
      '[data-tenant="TOI"] p',
      '#toi-article-left-overside p',
      'main p',
      'p',
    ];

    const chunks = [];
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 50 && !chunks.includes(t)) chunks.push(t);
      });
      if (chunks.length >= 3) break;
    }

    return chunks.slice(0, 6).join(' ');
  } catch {
    return '';
  }
};

const fetchArticleSnippet = async (url) => {
  const raw = await extractArticleParagraphs(url);
  return toSixtyWords(raw);
};

const fetchFullArticleContent = async (url, maxWords = 300) => {
  const raw = await extractArticleParagraphs(url);
  return toMaxWords(raw, maxWords);
};

const fetchOgImage = async (url) => {
  if (!url) return '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefNews-NewsBot/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return '';

    const html = await res.text();
    const $ = cheerio.load(html);
    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    if (image && /^https?:\/\//i.test(image)) return image;
    return '';
  } catch {
    return '';
  }
};

const repairParagraph = async ({ paragraph, heading, originalLink, source }) => {
  let text = toSixtyWords(htmlToPlainText(paragraph));

  if (!isWeakParagraph(text, heading)) {
    return { paragraph: text, fullContent: toMaxWords(htmlToPlainText(paragraph), 300) };
  }

  if (originalLink) {
    const fullContent = await fetchFullArticleContent(originalLink);
    const fromPage = toSixtyWords(fullContent);
    if (fromPage && !isWeakParagraph(fromPage, heading)) {
      return { paragraph: fromPage, fullContent: fullContent || fromPage };
    }
  }

  const fallback = toSixtyWords(
    `${htmlToPlainText(heading)}. This story covers recent developments reported by ${source || 'news outlets'}. ` +
      'Read the full report at the original source link for complete details and official statements.'
  );
  return { paragraph: fallback, fullContent: fallback };
};

module.exports = {
  htmlToPlainText,
  isHtmlContent,
  isWeakParagraph,
  fetchArticleSnippet,
  fetchFullArticleContent,
  fetchOgImage,
  repairParagraph,
  toSixtyWords,
  toCruxWords,
  toMaxWords,
  CRUX_MAX_WORDS,
  CRUX_SOFT_WORDS,
  wordCount,
};
