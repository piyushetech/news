const { toSixtyWords } = require('../utils/summarize');
const { deepDiveViaPython } = require('./pythonBridge');

const GENERIC_WHY_RE = /developments are unfolding|officials are responding|the situation is evolving/i;

const callOpenAI = async (prompt, { system, jsonMode = false } = {}) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const messages = system
    ? [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ]
    : [{ role: 'user', content: prompt }];

  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.35,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};

const newsContextBlock = (news) => {
  const lines = [
    `Headline: ${news.heading}`,
    `Summary: ${news.paragraph}`,
  ];
  if (news.fullContent) lines.push(`Full text: ${news.fullContent.slice(0, 3500)}`);
  if (news.category) lines.push(`Category: ${news.category}`);
  if (news.source) lines.push(`Source: ${news.source}`);
  if (news.originalLink) lines.push(`Original URL: ${news.originalLink}`);
  const loc = [news.city, news.region, news.country].filter(Boolean).join(', ');
  if (loc) lines.push(`Location tags: ${loc}`);
  if (news.publishedAt) lines.push(`Published: ${new Date(news.publishedAt).toISOString()}`);
  if (news.entities) {
    Object.entries(news.entities).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length) {
        lines.push(`${key}: ${values.slice(0, 8).join(', ')}`);
      }
    });
  }
  return lines.join('\n');
};

const DEEP_DIVE_SYSTEM = `You are an expert news analyst writing a Deep Dive explainer.

Return ONLY valid JSON with keys: who, what, where, when, why, how.

Rules:
- who, what, how: 2-3 sentences each (40-80 words)
- where, when: 1-2 sentences
- why: 3-4 sentences — explain root causes, motivations, stakes, and why this matters NOW. Never use vague filler like "developments are unfolding."
- Use only facts from the source text; do not invent details.`;

const inferWhyFromNews = (news) => {
  const text = [news.paragraph, news.fullContent].filter(Boolean).join(' ');
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const loc = news.city || news.region || news.country || 'the region';

  if (sentences.length >= 2) {
    return `${sentences[0].replace(/\.$/, '')}. Background: ${sentences[1].replace(/\.$/, '')}. This ties into broader ${news.category || 'news'} developments affecting ${loc}.`;
  }
  if (sentences.length === 1) {
    return `${sentences[0].replace(/\.$/, '')}. Follow this story because it may affect policy, safety, or daily life in ${loc}.`;
  }
  return `This ${news.category || 'news'} report is significant because of ${news.heading.replace(/\.$/, '')}. More context may emerge from ${news.source || 'ongoing coverage'}.`;
};

const ruleBasedDeepDive = (news) => {
  const entities = news.entities || {};
  const people = entities.people || [];
  const orgs = entities.organizations || [];
  const locations = entities.locations || [];

  let who = 'Parties referenced in the original coverage.';
  if (people.length || orgs.length) {
    const parts = [];
    if (people.length) parts.push(`Key individuals: ${people.slice(0, 4).join(', ')}.`);
    if (orgs.length) parts.push(`Organizations: ${orgs.slice(0, 4).join(', ')}.`);
    who = parts.join(' ');
  }

  let where = news.city || news.region || news.country || 'Multiple locations';
  if (locations.length) {
    where = `${where} — places cited: ${locations.slice(0, 3).join(', ')}.`;
  }

  return {
    who,
    what: news.heading,
    where,
    when: news.publishedAt
      ? `Reported around ${new Date(news.publishedAt).toDateString()}.`
      : new Date().toDateString(),
    why: inferWhyFromNews(news),
    how: news.paragraph || news.fullContent || news.heading,
  };
};

const parseDeepDiveJson = (raw) => {
  if (!raw) return null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const keys = ['who', 'what', 'where', 'when', 'why', 'how'];
    if (keys.every((k) => parsed[k])) {
      if (GENERIC_WHY_RE.test(parsed.why || '') || (parsed.why || '').split(/\s+/).length < 12) {
        return null;
      }
      return parsed;
    }
  } catch {
    /* fallback below */
  }
  return null;
};

const buildDeepDive = async (news) => {
  try {
    const fromPython = await deepDiveViaPython(news);
    if (fromPython?.who && fromPython?.why) {
      return fromPython;
    }
  } catch {
    /* fall through to Node OpenAI / rules */
  }

  const ai = await callOpenAI(newsContextBlock(news), {
    system: DEEP_DIVE_SYSTEM,
    jsonMode: true,
  });
  const parsed = parseDeepDiveJson(ai);
  if (parsed) return parsed;

  return ruleBasedDeepDive(news);
};

const isStaleDeepDive = (deepDive) => {
  if (!deepDive?.what) return true;
  if (!deepDive.why || GENERIC_WHY_RE.test(deepDive.why)) return true;
  if (deepDive.why.split(/\s+/).length < 12) return true;
  return false;
};

const buildEli5 = async (news) => {
  const prompt = `Explain this news like I'm 5 years old in under 60 words. Use simple analogies:\n${news.heading}\n${news.paragraph}`;
  const ai = await callOpenAI(prompt);
  if (ai) return toSixtyWords(ai);

  const simple = news.paragraph
    .replace(/\b(regulation|legislation|macroeconomic|judiciary|cryptocurrency)\b/gi, 'rules about money and laws')
    .replace(/\b(significant|substantial|considerable)\b/gi, 'big');
  return toSixtyWords(`Imagine your neighborhood got a big update — ${simple}`);
};

const buildBiasPerspectives = async (news) => {
  const prompt = `For this news headline, write two 40-word summaries: one from a left-leaning perspective and one from a right-leaning perspective. Return JSON {left, right}:\n${news.heading}`;
  const ai = await callOpenAI(prompt);
  if (ai) {
    try {
      const match = ai.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { left: parsed.left, right: parsed.right };
      }
    } catch { /* fallback */ }
  }

  return {
    left: toSixtyWords(
      `Progressive view: ${news.heading} highlights systemic issues that need policy reform, community support, and accountability from institutions.`
    ),
    right: toSixtyWords(
      `Conservative view: ${news.heading} shows why personal responsibility, market solutions, and limited government intervention matter most.`
    ),
  };
};

const buildMorningBriefingScript = (stories) =>
  stories
    .map(
      (s, i) =>
        `Story ${i + 1}. ${s.category}. ${s.heading}. ${s.paragraph}`
    )
    .join(' ... Next up. ');

module.exports = {
  buildDeepDive,
  isStaleDeepDive,
  buildEli5,
  buildBiasPerspectives,
  buildMorningBriefingScript,
};
