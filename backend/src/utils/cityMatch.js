/** City name aliases for local news matching (GPS vs RSS feed tags). */
const CITY_ALIASES = {
  bangalore: ['bangalore', 'bengaluru', 'bengaluru'],
  mumbai: ['mumbai', 'bombay'],
  delhi: ['delhi', 'new delhi', 'ncr'],
  kolkata: ['kolkata', 'calcutta'],
  chennai: ['chennai', 'madras'],
  hyderabad: ['hyderabad'],
  pune: ['pune', 'pimpri'],
  ahmedabad: ['ahmedabad'],
  kochi: ['kochi', 'cochin', 'ernakulam'],
  jaipur: ['jaipur'],
  lucknow: ['lucknow'],
  chandigarh: ['chandigarh'],
  guwahati: ['guwahati'],
  bhubaneswar: ['bhubaneswar', 'bhubaneshwar'],
  thiruvananthapuram: ['thiruvananthapuram', 'trivandrum'],
  visakhapatnam: ['visakhapatnam', 'vizag'],
  vijayawada: ['vijayawada'],
  coimbatore: ['coimbatore'],
  madurai: ['madurai'],
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveCityTerms = (city) => {
  if (!city) return [];
  const normalized = city.toLowerCase().trim();
  const terms = new Set([normalized]);

  Object.entries(CITY_ALIASES).forEach(([key, aliases]) => {
    const all = [key, ...aliases];
    if (all.some((a) => normalized.includes(a) || a.includes(normalized))) {
      all.forEach((a) => terms.add(a));
    }
  });

  return [...terms];
};

const buildCityRegex = (city) => {
  const terms = resolveCityTerms(city);
  if (!terms.length) return null;
  return new RegExp(terms.map(escapeRegex).join('|'), 'i');
};

/** Map GPS / user city names to RSS feed city tags (e.g. Bengaluru → Bangalore). */
const normalizeCityForScrape = (city, knownCities = []) => {
  if (!city) return city;
  const terms = resolveCityTerms(city);
  const match = knownCities.find((known) => {
    const k = known.toLowerCase();
    return terms.some((t) => t === k || k.includes(t) || t.includes(k));
  });
  return match || city;
};

const feedMatchesCity = (feedCity, city) => {
  if (!feedCity || !city) return false;
  if (city === 'National') return feedCity === 'National';
  const terms = resolveCityTerms(city);
  const feedLower = feedCity.toLowerCase();
  return terms.some((t) => feedLower === t || feedLower.includes(t) || t.includes(feedLower));
};

module.exports = {
  buildCityRegex,
  resolveCityTerms,
  normalizeCityForScrape,
  feedMatchesCity,
};
