/** BCP-47 speech locales — keep in sync with backend/src/constants/languages.js */
export const SPEECH_LOCALES = {
  en: 'en-IN',
  as: 'as-IN',
  bn: 'bn-IN',
  brx: 'hi-IN',
  doi: 'hi-IN',
  gu: 'gu-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ks: 'hi-IN',
  kok: 'hi-IN',
  mai: 'hi-IN',
  ml: 'ml-IN',
  mni: 'hi-IN',
  mr: 'mr-IN',
  ne: 'ne-NP',
  or: 'or-IN',
  pa: 'pa-IN',
  sa: 'hi-IN',
  sat: 'hi-IN',
  sd: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ur: 'ur-IN',
};

export const getSpeechLocale = (lang = 'en') => SPEECH_LOCALES[lang] || 'en-IN';
