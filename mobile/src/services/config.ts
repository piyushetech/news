import Constants from 'expo-constants';

/** Production: https://briefnews-api.onrender.com/api — override in app.json for local dev */
export const API_URL =
  Constants.expoConfig?.extra?.apiUrl || 'https://briefnews-api.onrender.com/api';
export const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || '';
export const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId || '';
