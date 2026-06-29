const { LANGUAGES } = require('../constants/languages');

const langLabel = (code) => LANGUAGES.find((l) => l.code === code)?.label || code;

/** Google Translate API codes for languages without direct support */
const TRANSLATE_CODE_MAP = {
  brx: 'hi',
  doi: 'hi',
  kok: 'hi',
  mai: 'hi',
  mni: 'hi',
  sa: 'hi',
  sat: 'hi',
  sd: 'hi',
  ks: 'hi',
  or: 'or',
};

const toTranslateCode = (code) => TRANSLATE_CODE_MAP[code] || code;

const callOpenAI = async (prompt) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};

const googleTranslate = async (text, targetLang, sourceLang = 'auto') => {
  if (!text?.trim()) return text || '';
  const tl = toTranslateCode(targetLang);
  const sl = sourceLang === 'auto' ? 'auto' : toTranslateCode(sourceLang);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text.slice(0, 4500))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0]?.map((part) => part[0]).join('') || text;
  } catch {
    return text;
  }
};

const translateFields = async (fields, sourceLang, targetLang) => {
  const sourceLabel = langLabel(sourceLang || 'en');
  const targetLabel = langLabel(targetLang);

  const prompt = `Translate this news content from ${sourceLabel} to ${targetLabel}. Keep meaning, names, and numbers accurate. Return JSON only with keys heading, paragraph, fullContent:
heading: ${fields.heading}
paragraph: ${fields.paragraph}
fullContent: ${fields.fullContent || ''}`;

  const ai = await callOpenAI(prompt);
  if (ai) {
    try {
      const match = ai.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          heading: parsed.heading || fields.heading,
          paragraph: parsed.paragraph || fields.paragraph,
          fullContent: parsed.fullContent || fields.fullContent || '',
        };
      }
    } catch {
      /* fall through to Google Translate */
    }
  }

  const [heading, paragraph, fullContent] = await Promise.all([
    googleTranslate(fields.heading, targetLang, sourceLang),
    googleTranslate(fields.paragraph, targetLang, sourceLang),
    fields.fullContent
      ? googleTranslate(fields.fullContent, targetLang, sourceLang)
      : Promise.resolve(''),
  ]);

  return { heading, paragraph, fullContent };
};

const getCachedTranslation = (news, targetLang) => {
  if (!news.translations) return null;
  const cached = news.translations.get
    ? news.translations.get(targetLang)
    : news.translations[targetLang];
  return cached?.heading ? cached : null;
};

const translateNewsDoc = async (news, targetLang) => {
  const sourceLang = news.language || 'en';
  if (!targetLang || targetLang === sourceLang) {
    return news.toObject ? news.toObject() : { ...news };
  }

  const cached = getCachedTranslation(news, targetLang);
  if (cached) {
    const obj = news.toObject ? news.toObject() : { ...news };
    return { ...obj, heading: cached.heading, paragraph: cached.paragraph, fullContent: cached.fullContent || obj.fullContent };
  }

  const translated = await translateFields(
    {
      heading: news.heading,
      paragraph: news.paragraph,
      fullContent: news.fullContent || '',
    },
    sourceLang,
    targetLang
  );

  if (news.save) {
    if (!news.translations) news.translations = new Map();
    if (news.translations.set) {
      news.translations.set(targetLang, translated);
    } else {
      news.translations[targetLang] = translated;
    }
    await news.save({ validateBeforeSave: false });
  }

  const obj = news.toObject ? news.toObject() : { ...news };
  return { ...obj, ...translated };
};

const localizeNewsList = async (items, targetLang) => {
  if (!targetLang) {
    return items.map((item) => (item.toObject ? item.toObject() : item));
  }
  return Promise.all(items.map((item) => translateNewsDoc(item, targetLang)));
};

const translateDeepDive = async (deepDive, targetLang, sourceLang = 'en') => {
  if (!deepDive?.what || !targetLang || targetLang === sourceLang) return deepDive;
  const keys = ['who', 'what', 'where', 'when', 'why', 'how'];
  const entries = await Promise.all(
    keys.map(async (key) => [
      key,
      deepDive[key]
        ? await googleTranslate(deepDive[key], targetLang, sourceLang)
        : deepDive[key],
    ])
  );
  return Object.fromEntries(entries);
};

const translateBiasPerspectives = async (left, right, targetLang, sourceLang = 'en') => {
  if (!targetLang || targetLang === sourceLang) return { left, right };
  const [translatedLeft, translatedRight] = await Promise.all([
    left ? googleTranslate(left, targetLang, sourceLang) : left,
    right ? googleTranslate(right, targetLang, sourceLang) : right,
  ]);
  return { left: translatedLeft, right: translatedRight };
};

module.exports = {
  translateNewsDoc,
  localizeNewsList,
  translateFields,
  translateDeepDive,
  translateBiasPerspectives,
};
