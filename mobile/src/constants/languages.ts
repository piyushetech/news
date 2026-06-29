export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  speechLocale: string;
}

export const LANGUAGES: Language[] = [
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

export const INDIAN_LANGUAGE_CODES = LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

export const getLanguage = (code: string) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

export const DEVICE_LOCALE_MAP: Record<string, string> = {
  hi: 'hi', bn: 'bn', ta: 'ta', te: 'te', mr: 'mr', gu: 'gu', kn: 'kn', ml: 'ml',
  pa: 'pa', or: 'or', as: 'as', ur: 'ur', ne: 'ne', sa: 'sa', sd: 'sd', kok: 'kok',
  mai: 'mai', mni: 'mni', brx: 'brx', doi: 'doi', sat: 'sat', ks: 'ks',
};
