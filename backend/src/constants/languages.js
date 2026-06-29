const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechLocale: 'en-IN' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', speechLocale: 'as-IN' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', speechLocale: 'bn-IN' },
  { code: 'brx', label: 'Bodo', nativeLabel: 'बड़ो', speechLocale: 'hi-IN' },
  { code: 'doi', label: 'Dogri', nativeLabel: 'डोगरी', speechLocale: 'hi-IN' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', speechLocale: 'gu-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechLocale: 'hi-IN' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', speechLocale: 'kn-IN' },
  { code: 'ks', label: 'Kashmiri', nativeLabel: 'कॉशुर', speechLocale: 'hi-IN' },
  { code: 'kok', label: 'Konkani', nativeLabel: 'कोंकणी', speechLocale: 'hi-IN' },
  { code: 'mai', label: 'Maithili', nativeLabel: 'मैथिली', speechLocale: 'hi-IN' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', speechLocale: 'ml-IN' },
  { code: 'mni', label: 'Manipuri (Meitei)', nativeLabel: 'ꯃꯩꯇꯩꯂꯣꯟ', speechLocale: 'hi-IN' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechLocale: 'mr-IN' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली', speechLocale: 'ne-NP' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', speechLocale: 'or-IN' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', speechLocale: 'pa-IN' },
  { code: 'sa', label: 'Sanskrit', nativeLabel: 'संस्कृतम्', speechLocale: 'hi-IN' },
  { code: 'sat', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ', speechLocale: 'hi-IN' },
  { code: 'sd', label: 'Sindhi', nativeLabel: 'سنڌي', speechLocale: 'hi-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', speechLocale: 'ta-IN' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', speechLocale: 'te-IN' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', speechLocale: 'ur-IN' },
];

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const INDIAN_LANGUAGE_CODES = LANGUAGE_CODES.filter((c) => c !== 'en');

module.exports = { LANGUAGES, LANGUAGE_CODES, INDIAN_LANGUAGE_CODES };
