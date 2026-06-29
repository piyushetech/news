import { getSpeechLocale as localeForLang } from './constants/speechLocales.js';

let utterance = null;
let voicesReady = null;

export { localeForLang as getSpeechLocale };

const BRIEFING_PHRASES = {
  en: {
    intro: 'Good morning! Here is your BriefNews briefing.',
    story: (i) => `Story ${i}.`,
    next: 'Next up.',
    outro: 'That wraps up your top stories.',
  },
  hi: {
    intro: 'सुप्रभात! यह आपका BriefNews ब्रीफिंग है.',
    story: (i) => `खबर ${i}.`,
    next: 'अगली खबर.',
    outro: 'यह आपकी शीर्ष खबरों का सारांश था.',
  },
  mr: {
    intro: 'सुप्रभात! हे तुमचे BriefNews ब्रीफिंग आहे.',
    story: (i) => `बातमी ${i}.`,
    next: 'पुढील बातमी.',
    outro: 'ही तुमच्या आजच्या महत्त्वाच्या बातम्यांचा सारांश होता.',
  },
  bn: {
    intro: 'সুপ্রভাত! এটি আপনার BriefNews ব্রিফিং।',
    story: (i) => `খবর ${i}.`,
    next: 'পরের খবর.',
    outro: 'আজকের শীর্ষ খবরের সারাংশ শেষ।',
  },
  ta: {
    intro: 'காலை வணக்கம்! இது உங்கள் BriefNews சுருக்கம்.',
    story: (i) => `செய்தி ${i}.`,
    next: 'அடுத்த செய்தி.',
    outro: 'இன்றைய முக்கிய செய்திகள் முடிந்தது.',
  },
  te: {
    intro: 'శుభోదయం! ఇది మీ BriefNews బ్రీఫింగ్.',
    story: (i) => `వార్త ${i}.`,
    next: 'తదుపరి వార్త.',
    outro: 'నేటి ప్రధాన వార్తలు పూర్తయ్యాయి.',
  },
  gu: {
    intro: 'સુપ્રભાત! આ તમારું BriefNews બ્રીફિંગ છે.',
    story: (i) => `સમાચાર ${i}.`,
    next: 'આગળ.',
    outro: 'આજની મુખ્ય સમાચારો પૂર્ણ.',
  },
  kn: {
    intro: 'ಶುಭೋದಯ! ಇದು ನಿಮ್ಮ BriefNews ಬ್ರೀಫಿಂಗ್.',
    story: (i) => `ಸುದ್ದಿ ${i}.`,
    next: 'ಮುಂದಿನ ಸುದ್ದಿ.',
    outro: 'ಇಂದಿನ ಪ್ರಮುಖ ಸುದ್ದಿಗಳು ಮುಗಿದವು.',
  },
  ml: {
    intro: 'സുപ്രഭാതം! ഇത് നിങ്ങളുടെ BriefNews ബ്രീഫിംഗാണ്.',
    story: (i) => `വാർത്ത ${i}.`,
    next: 'അടുത്ത വാർത്ത.',
    outro: 'ഇന്നത്തെ പ്രധാന വാർത്തകൾ അവസാനിച്ചു.',
  },
  pa: {
    intro: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਇਹ ਤੁਹਾਡਾ BriefNews ਬ੍ਰੀਫਿੰਗ ਹੈ.',
    story: (i) => `ਖਬਰ ${i}.`,
    next: 'ਅਗਲੀ ਖਬਰ.',
    outro: 'ਅੱਜ ਦੀਆਂ ਮੁੱਖ ਖਬਰਾਂ ਸਮਾਪਤ.',
  },
  ur: {
    intro: 'صبح بخیر! یہ آپ کا BriefNews بریفنگ ہے.',
    story: (i) => `خبر ${i}.`,
    next: 'اگلی خبر.',
    outro: 'آج کی اہم خبروں کا خلاصہ ختم.',
  },
};

function briefingPhrases(langCode = 'en') {
  return BRIEFING_PHRASES[langCode] || BRIEFING_PHRASES.en;
}

function detectScript(text) {
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'gurmukhi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'oriya';
  if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
  if (/[\u0900-\u097F]/.test(text)) return 'devanagari';
  return 'latin';
}

function isMostlyLatin(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const other = text.replace(/\s/g, '').length || 1;
  return letters / other > 0.45;
}

const SCRIPT_FALLBACKS = {
  devanagari: ['hi-IN', 'mr-IN', 'en-IN'],
  bengali: ['bn-IN', 'hi-IN', 'en-IN'],
  gujarati: ['gu-IN', 'hi-IN', 'en-IN'],
  gurmukhi: ['pa-IN', 'hi-IN', 'en-IN'],
  tamil: ['ta-IN', 'en-IN'],
  telugu: ['te-IN', 'en-IN'],
  kannada: ['kn-IN', 'en-IN'],
  malayalam: ['ml-IN', 'en-IN'],
  oriya: ['or-IN', 'hi-IN', 'en-IN'],
  arabic: ['ur-IN', 'hi-IN', 'en-IN'],
  latin: ['en-IN', 'en-US', 'en-GB'],
};

function buildLocaleChain(preferredLocale, text) {
  const preferred = preferredLocale || 'en-IN';
  const lang = preferred.split('-')[0];
  const script = detectScript(text);
  const scriptFallbacks = SCRIPT_FALLBACKS[script] || ['en-IN'];

  if (isMostlyLatin(text)) {
    return [...new Set(['en-IN', 'en-US', preferred, lang, ...scriptFallbacks])];
  }

  return [...new Set([preferred, lang, ...scriptFallbacks, 'en-IN'])];
}

function loadVoices() {
  if (!window.speechSynthesis) return Promise.resolve([]);
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, 800);
  });

  return voicesReady;
}

function pickVoice(voices, locale) {
  const target = locale.toLowerCase();
  const prefix = target.split('-')[0];

  return (
    voices.find((v) => v.lang?.toLowerCase() === target)
    || voices.find((v) => v.lang?.toLowerCase().startsWith(`${prefix}-`))
    || voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
    || null
  );
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  utterance = null;
}

function speakOnce(text, locale, voice) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.pitch = 1;

    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      utterance = null;
      resolve(ok);
    };

    u.onend = () => done(true);
    u.onerror = () => done(false);

    utterance = u;
    synth.speak(u);

    if (synth.paused) synth.resume();
  });
}

export async function speakText(text, onDone, language = 'en-IN') {
  if (!window.speechSynthesis || !text?.trim()) {
    onDone?.();
    return;
  }

  stopSpeaking();
  const voices = await loadVoices();
  const chain = buildLocaleChain(language, text);

  for (const locale of chain) {
    const voice = pickVoice(voices, locale);
    window.speechSynthesis.cancel();
    const ok = await speakOnce(text, locale, voice);
    if (ok) {
      onDone?.();
      return;
    }
  }

  onDone?.();
}

export function speakNewsCard(item, language = 'en-IN') {
  const text = item.fullContent && item.fullContent.length > item.paragraph.length
    ? `${item.heading}. ${item.fullContent}`
    : `${item.heading}. ${item.paragraph}`;
  speakText(text, undefined, language);
}

export function speakBriefing(stories, onComplete, language = 'en-IN', langCode = 'en') {
  const phrases = briefingPhrases(langCode);
  const script = stories
    .map((s, i) => `${phrases.story(i + 1)} ${s.category}. ${s.heading}. ${s.paragraph}`)
    .join(` ${phrases.next} `);
  speakText(
    `${phrases.intro} ${script} ${phrases.outro}`,
    onComplete,
    language,
  );
}

// Warm up voice list on load (Chrome loads voices asynchronously)
if (typeof window !== 'undefined') {
  loadVoices();
}
