import { state } from './state.js';
import { mergeDetailLabels } from './i18n/detailLabels.js';

const en = {
  latest: 'Latest',
  latestIn: 'Latest in',
  trendingNow: 'Trending topics',
  readMore: 'Read More',
  readLess: 'Read Less',
  source: 'Source',
  listen: 'Listen',
  stop: 'Stop',
  morningBriefing: 'Morning Briefing',
  swipeUp: 'Scroll down for next story',
  storyOf: 'Story',
  enterApp: 'Enter BriefNews',
  todayBriefing: "Today's Top 5",
  skipBriefing: 'Skip for now',
  selectLanguage: 'Choose your language',
  continueToFeed: 'Continue to Feed',
  pickTopics: 'What do you want to read?',
  noStories: 'No stories yet. Check back soon!',
  readOriginal: 'Read Original Source',
  topicsSelected: 'topics selected',
  newsInWords: 'News in 60 words',
  all: 'All',
  tapTopicToggle: 'Tap a topic to load · tap again to deselect',
  filterTopics: 'Filter by topic',
  scrollForMore: 'Scroll for more stories',
  endOfFeed: 'You have seen all stories',
  pullToFetchTopic: 'Pull down to fetch latest stories for this topic',
  latestTopicsHint: 'Pick a trending topic below — we will fetch the latest stories for you.',
  tapToGetStories: 'Tap to get stories',
  yourTopics: 'Your topics',
  pullToRefreshHint: 'Pull down to refresh your feed, or tap a topic above in the header.',
  refreshStories: 'Refresh stories',
  share: 'Share',
};

const hi = {
  ...en,
  readMore: 'और पढ़ें',
  readLess: 'कम पढ़ें',
  source: 'स्रोत',
  selectLanguage: 'अपनी भाषा चुनें',
  continueToFeed: 'फ़ीड पर जाएं',
  readOriginal: 'मूल स्रोत पढ़ें',
};

const withDetail = (lang, base) => mergeDetailLabels(lang, base);

const ALL = {
  en: withDetail('en', en),
  hi: withDetail('hi', hi),
  bn: withDetail('bn', en),
  ta: withDetail('ta', en),
  te: withDetail('te', en),
  mr: withDetail('mr', en),
  gu: withDetail('gu', en),
  kn: withDetail('kn', en),
  ml: withDetail('ml', en),
  pa: withDetail('pa', en),
  ur: withDetail('ur', en),
  as: withDetail('as', en),
  or: withDetail('or', en),
  ne: withDetail('ne', en),
  brx: withDetail('brx', hi),
  doi: withDetail('doi', hi),
  ks: withDetail('ks', hi),
  kok: withDetail('kok', hi),
  mai: withDetail('mai', hi),
  mni: withDetail('mni', hi),
  sa: withDetail('sa', hi),
  sat: withDetail('sat', hi),
  sd: withDetail('sd', ur),
};

export function t(key) {
  const table = ALL[state.language] || ALL.en;
  return table[key] || ALL.en[key] || key;
}
