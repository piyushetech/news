/**
 * RSS feed sources — scraped in English or regional languages.
 * News is translated to the user's selected language at read time.
 */
const RSS_FEEDS = [
  // ── International (English) ──────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', source: 'BBC World', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://www.theguardian.com/world/rss', category: 'World', source: 'The Guardian', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World', source: 'Al Jazeera', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'World', source: 'Reuters', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', source: 'BBC Politics', region: 'International', country: 'INT', language: 'en', isControversial: true },
  { url: 'https://www.theguardian.com/politics/rss', category: 'Politics', source: 'Guardian Politics', region: 'International', country: 'INT', language: 'en', isControversial: true },
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/6.xml', category: 'Cricket', source: 'ESPN Cricinfo', region: 'International', country: 'INT', language: 'en', isTrending: true },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', source: 'BBC Sport', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', source: 'BBC Tech', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Science', source: 'BBC Science', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/uk/rss.xml', category: 'Crime', source: 'BBC UK', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', source: 'BBC Business', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://www.smithsonianmag.com/rss/history-archaeology/', category: 'History', source: 'Smithsonian', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/magazine/rss.xml', category: 'History', source: 'BBC Magazine', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment', source: 'BBC Entertainment', region: 'International', country: 'INT', language: 'en' },

  // ── India — Current Affairs (RSS + exam-prep sources) ─────────────────────
  { url: 'https://www.gktoday.in/current-affairs/feed/', category: 'Current Affairs', source: 'GKToday', region: 'India', country: 'IN', language: 'en', city: 'National', isTrending: true },
  { url: 'https://affairscloud.com/feed/', category: 'Current Affairs', source: 'AffairsCloud', region: 'India', country: 'IN', language: 'en', city: 'National', isTrending: true },
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', category: 'Current Affairs', source: 'Hindustan Times', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://indianexpress.com/section/india/feed/', category: 'Current Affairs', source: 'Indian Express', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'Current Affairs', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'Current Affairs', source: 'NDTV', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', category: 'Current Affairs', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2279801.cms', category: 'Current Affairs', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'National' },
  { url: 'https://feeds.bbci.co.uk/hindi/rss.xml', category: 'Current Affairs', source: 'BBC Hindi', region: 'India', country: 'IN', language: 'hi', city: 'National' },

  // ── International — Current Affairs ───────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Current Affairs', source: 'BBC World', region: 'International', country: 'INT', language: 'en' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Current Affairs', source: 'Reuters', region: 'International', country: 'INT', language: 'en' },

  // ── India — English national & city (Times of India) ─────────────────────
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms', category: 'National', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/551108.cms', category: 'Politics', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'National', isControversial: true },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', category: 'Cricket', source: 'Times of India', region: 'India', country: 'IN', language: 'en', isTrending: true },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', category: 'Crime', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Mumbai' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950623.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Delhi' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950625.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Bangalore' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950628.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Chennai' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/572524.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Hyderabad' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950626.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Kolkata' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2952638.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Pune' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950624.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Ahmedabad' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950627.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Lucknow' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950629.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Chandigarh' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/2950970.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Jaipur' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/4027937.cms', category: 'City', source: 'Times of India', region: 'India', country: 'IN', language: 'en', city: 'Kochi' },

  // ── India — English (The Hindu) ────────────────────────────────────────────
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'National', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://www.thehindu.com/news/cities/chennai/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Chennai' },
  { url: 'https://www.thehindu.com/news/cities/bangalore/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Bangalore' },
  { url: 'https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Hyderabad' },
  { url: 'https://www.thehindu.com/news/cities/Delhi/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Delhi' },
  { url: 'https://www.thehindu.com/news/cities/mumbai/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Mumbai' },
  { url: 'https://www.thehindu.com/news/cities/Kochi/feeder/default.rss', category: 'City', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'Kochi' },
  { url: 'https://www.thehindu.com/business/feeder/default.rss', category: 'Business', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', category: 'Technology', source: 'The Hindu', region: 'India', country: 'IN', language: 'en', city: 'National' },

  // ── India — English (Indian Express, Hindustan Times, NDTV) ───────────────
  { url: 'https://indianexpress.com/feed/', category: 'National', source: 'Indian Express', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', category: 'National', source: 'Hindustan Times', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://www.hindustantimes.com/feeds/rss/cities/delhi/rssfeed.xml', category: 'City', source: 'Hindustan Times', region: 'India', country: 'IN', language: 'en', city: 'Delhi' },
  { url: 'https://www.hindustantimes.com/feeds/rss/cities/mumbai/rssfeed.xml', category: 'City', source: 'Hindustan Times', region: 'India', country: 'IN', language: 'en', city: 'Mumbai' },
  { url: 'https://feeds.feedburner.com/ndtvnews-top-stories', category: 'National', source: 'NDTV', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'National', source: 'NDTV', region: 'India', country: 'IN', language: 'en', city: 'National' },
  { url: 'https://feeds.feedburner.com/ndtvsports-cricket', category: 'Cricket', source: 'NDTV Sports', region: 'India', country: 'IN', language: 'en', isTrending: true },

  // ── India — Hindi ──────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/hindi/rss.xml', category: 'National', source: 'BBC Hindi', region: 'India', country: 'IN', language: 'hi', city: 'National' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2279801.cms', category: 'National', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'National' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/-2128933033.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Delhi' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/-2128936835.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Mumbai' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950627.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Lucknow' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950625.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Bangalore' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950628.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Chennai' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/572524.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Hyderabad' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950626.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Kolkata' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2952638.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Pune' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950624.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Ahmedabad' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/2950970.cms', category: 'City', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', city: 'Jaipur' },
  { url: 'https://navbharattimes.indiatimes.com/rssfeeds/4719148.cms', category: 'Cricket', source: 'Navbharat Times', region: 'India', country: 'IN', language: 'hi', isTrending: true },
  { url: 'https://www.jagran.com/rss/news/national-news.xml', category: 'National', source: 'Dainik Jagran', region: 'India', country: 'IN', language: 'hi', city: 'National' },
  { url: 'https://www.amarujala.com/rss/india-news.xml', category: 'National', source: 'Amar Ujala', region: 'India', country: 'IN', language: 'hi', city: 'National' },
  { url: 'https://www.amarujala.com/rss/delhi-news.xml', category: 'City', source: 'Amar Ujala', region: 'India', country: 'IN', language: 'hi', city: 'Delhi' },
  { url: 'https://www.amarujala.com/rss/lucknow-news.xml', category: 'City', source: 'Amar Ujala', region: 'India', country: 'IN', language: 'hi', city: 'Lucknow' },

  // ── India — Tamil ──────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/tamil/rss.xml', category: 'National', source: 'BBC Tamil', region: 'India', country: 'IN', language: 'ta', city: 'National' },
  { url: 'https://tamil.oneindia.com/rss/tamil-news-fb.xml', category: 'National', source: 'OneIndia Tamil', region: 'India', country: 'IN', language: 'ta', city: 'National' },
  { url: 'https://tamil.oneindia.com/rss/chennai-fb.xml', category: 'City', source: 'OneIndia Tamil', region: 'India', country: 'IN', language: 'ta', city: 'Chennai' },
  { url: 'https://tamil.oneindia.com/rss/coimbatore-fb.xml', category: 'City', source: 'OneIndia Tamil', region: 'India', country: 'IN', language: 'ta', city: 'Coimbatore' },
  { url: 'https://tamil.oneindia.com/rss/madurai-fb.xml', category: 'City', source: 'OneIndia Tamil', region: 'India', country: 'IN', language: 'ta', city: 'Madurai' },

  // ── India — Telugu ─────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/telugu/rss.xml', category: 'National', source: 'BBC Telugu', region: 'India', country: 'IN', language: 'te', city: 'National' },
  { url: 'https://telugu.oneindia.com/rss/telugu-news-fb.xml', category: 'National', source: 'OneIndia Telugu', region: 'India', country: 'IN', language: 'te', city: 'National' },
  { url: 'https://telugu.oneindia.com/rss/hyderabad-fb.xml', category: 'City', source: 'OneIndia Telugu', region: 'India', country: 'IN', language: 'te', city: 'Hyderabad' },
  { url: 'https://telugu.oneindia.com/rss/vijayawada-fb.xml', category: 'City', source: 'OneIndia Telugu', region: 'India', country: 'IN', language: 'te', city: 'Vijayawada' },
  { url: 'https://telugu.oneindia.com/rss/visakhapatnam-fb.xml', category: 'City', source: 'OneIndia Telugu', region: 'India', country: 'IN', language: 'te', city: 'Visakhapatnam' },

  // ── India — Marathi ────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/marathi/rss.xml', category: 'National', source: 'BBC Marathi', region: 'India', country: 'IN', language: 'mr', city: 'National' },
  { url: 'https://maharashtratimes.com/rssfeeds/2429656.cms', category: 'City', source: 'Maharashtra Times', region: 'India', country: 'IN', language: 'mr', city: 'Mumbai' },
  { url: 'https://maharashtratimes.com/rssfeeds/2952638.cms', category: 'City', source: 'Maharashtra Times', region: 'India', country: 'IN', language: 'mr', city: 'Pune' },
  { url: 'https://marathi.oneindia.com/rss/marathi-news-fb.xml', category: 'National', source: 'OneIndia Marathi', region: 'India', country: 'IN', language: 'mr', city: 'National' },

  // ── India — Bengali ────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/bengali/rss.xml', category: 'National', source: 'BBC Bangla', region: 'India', country: 'IN', language: 'bn', city: 'National' },
  { url: 'https://bangla.oneindia.com/rss/bengali-news-fb.xml', category: 'National', source: 'OneIndia Bengali', region: 'India', country: 'IN', language: 'bn', city: 'National' },
  { url: 'https://bangla.oneindia.com/rss/kolkata-fb.xml', category: 'City', source: 'OneIndia Bengali', region: 'India', country: 'IN', language: 'bn', city: 'Kolkata' },

  // ── India — Gujarati ───────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/gujarati/rss.xml', category: 'National', source: 'BBC Gujarati', region: 'India', country: 'IN', language: 'gu', city: 'National' },
  { url: 'https://gujarati.oneindia.com/rss/gujarati-news-fb.xml', category: 'National', source: 'OneIndia Gujarati', region: 'India', country: 'IN', language: 'gu', city: 'National' },
  { url: 'https://gujarati.oneindia.com/rss/ahmedabad-fb.xml', category: 'City', source: 'OneIndia Gujarati', region: 'India', country: 'IN', language: 'gu', city: 'Ahmedabad' },

  // ── India — Kannada ────────────────────────────────────────────────────────
  { url: 'https://kannada.oneindia.com/rss/kannada-news-fb.xml', category: 'National', source: 'OneIndia Kannada', region: 'India', country: 'IN', language: 'kn', city: 'National' },
  { url: 'https://kannada.oneindia.com/rss/bengaluru-fb.xml', category: 'City', source: 'OneIndia Kannada', region: 'India', country: 'IN', language: 'kn', city: 'Bangalore' },

  // ── India — Malayalam ──────────────────────────────────────────────────────
  { url: 'https://malayalam.oneindia.com/rss/malayalam-news-fb.xml', category: 'National', source: 'OneIndia Malayalam', region: 'India', country: 'IN', language: 'ml', city: 'National' },
  { url: 'https://malayalam.oneindia.com/rss/kochi-fb.xml', category: 'City', source: 'OneIndia Malayalam', region: 'India', country: 'IN', language: 'ml', city: 'Kochi' },
  { url: 'https://malayalam.oneindia.com/rss/thiruvananthapuram-fb.xml', category: 'City', source: 'OneIndia Malayalam', region: 'India', country: 'IN', language: 'ml', city: 'Thiruvananthapuram' },

  // ── India — Punjabi ────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/punjabi/rss.xml', category: 'National', source: 'BBC Punjabi', region: 'India', country: 'IN', language: 'pa', city: 'National' },
  { url: 'https://punjabi.oneindia.com/rss/punjabi-news-fb.xml', category: 'National', source: 'OneIndia Punjabi', region: 'India', country: 'IN', language: 'pa', city: 'National' },
  { url: 'https://punjabi.oneindia.com/rss/chandigarh-fb.xml', category: 'City', source: 'OneIndia Punjabi', region: 'India', country: 'IN', language: 'pa', city: 'Chandigarh' },

  // ── India — Odia ───────────────────────────────────────────────────────────
  { url: 'https://odia.oneindia.com/rss/odia-news-fb.xml', category: 'National', source: 'OneIndia Odia', region: 'India', country: 'IN', language: 'or', city: 'National' },
  { url: 'https://odia.oneindia.com/rss/bhubaneswar-fb.xml', category: 'City', source: 'OneIndia Odia', region: 'India', country: 'IN', language: 'or', city: 'Bhubaneswar' },

  // ── India — Urdu ───────────────────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/urdu/rss.xml', category: 'National', source: 'BBC Urdu', region: 'India', country: 'IN', language: 'ur', city: 'National' },
  { url: 'https://urdu.oneindia.com/rss/urdu-news-fb.xml', category: 'National', source: 'OneIndia Urdu', region: 'India', country: 'IN', language: 'ur', city: 'National' },

  // ── India — Assamese ───────────────────────────────────────────────────────
  { url: 'https://assamese.oneindia.com/rss/assamese-news-fb.xml', category: 'National', source: 'OneIndia Assamese', region: 'India', country: 'IN', language: 'as', city: 'National' },
  { url: 'https://assamese.oneindia.com/rss/guwahati-fb.xml', category: 'City', source: 'OneIndia Assamese', region: 'India', country: 'IN', language: 'as', city: 'Guwahati' },
];

const SCRAPE_CITIES = [...new Set(RSS_FEEDS.map((f) => f.city).filter(Boolean))].sort();

module.exports = { RSS_FEEDS, SCRAPE_CITIES };
