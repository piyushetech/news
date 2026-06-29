const CATEGORIES = [
  { id: 'Politics', label: 'Politics', icon: '🏛️' },
  { id: 'Cricket', label: 'Cricket', icon: '🏏' },
  { id: 'History', label: 'History', icon: '📜' },
  { id: 'World', label: 'World', icon: '🌍' },
  { id: 'Technology', label: 'Technology', icon: '💻' },
  { id: 'Business', label: 'Business', icon: '📈' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Science', label: 'Science', icon: '🔬' },
  { id: 'Entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'Crime', label: 'Crime', icon: '🚨' },
  { id: 'Current Affairs', label: 'Current Affairs', icon: '📋' },
  { id: 'National', label: 'National', icon: '🇮🇳' },
  { id: 'City', label: 'City', icon: '🏙️' },
  { id: 'General', label: 'General', icon: '📰' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

module.exports = { CATEGORIES, CATEGORY_IDS };
