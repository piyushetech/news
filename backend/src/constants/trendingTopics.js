/** Curated hot topics users can pick when feed is empty or they want fresh news. */
const TRENDING_TOPICS = [
  { id: 'current-affairs', label: 'Current Affairs', query: 'India current affairs today', category: 'Current Affairs' },
  { id: 'iran-war', label: 'Iran War', query: 'Iran war', category: 'Politics' },
  { id: 'donald-trump', label: 'Donald Trump', query: 'Donald Trump', category: 'Politics' },
  { id: 'ram-mandir', label: 'Ram Mandir', query: 'Ram Mandir Ayodhya', category: 'City' },
  { id: 'india-elections', label: 'India Elections', query: 'India elections', category: 'Politics' },
  { id: 'cricket', label: 'Cricket', query: 'India cricket', category: 'Cricket' },
  { id: 'ai-tech', label: 'AI & Tech', query: 'artificial intelligence India', category: 'Technology' },
];

const findTopic = (topicId) => TRENDING_TOPICS.find((t) => t.id === topicId);

module.exports = { TRENDING_TOPICS, findTopic };
