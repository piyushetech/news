import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import * as Location from 'expo-location';
import { NativeModules, Platform } from 'react-native';
import { storage } from '../services/storage';
import { authApi } from '../services/api';
import { useAuth } from './AuthContext';
import { DEVICE_LOCALE_MAP, INDIAN_LANGUAGE_CODES, getLanguage } from '../constants/languages';
import { t as translate, StringKey } from '../i18n';

interface LocaleCtx {
  language: string;
  countryCode: string;
  isFromIndia: boolean;
  setLanguage: (code: string) => Promise<void>;
  detectCountry: () => Promise<string>;
  t: (key: StringKey) => string;
  speechLocale: string;
  availableLanguages: string[];
}

const LocaleContext = createContext<LocaleCtx>({} as LocaleCtx);

const getDeviceLocale = (): string => {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;
  const code = (locale || 'en').split(/[-_]/)[0].toLowerCase();
  return DEVICE_LOCALE_MAP[code] || 'en';
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { user, refreshUser } = useAuth();
  const [language, setLanguageState] = useState(user?.preferredLanguage || 'en');
  const [countryCode, setCountryCode] = useState(user?.countryCode || 'IN');

  useEffect(() => {
    if (user?.preferredLanguage) setLanguageState(user.preferredLanguage);
    if (user?.countryCode) setCountryCode(user.countryCode);
  }, [user?.preferredLanguage, user?.countryCode]);

  useEffect(() => {
    (async () => {
      if (user?.countryCode) return;
      const stored = await storage.getItem('countryCode');
      if (stored) setCountryCode(stored);
      else detectCountry();
    })();
  }, [user]);

  const detectCountry = useCallback(async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const code = geo?.isoCountryCode?.toUpperCase() || 'IN';
        setCountryCode(code);
        await storage.setItem('countryCode', code);
        if (user) {
          await authApi.updatePreferences({ countryCode: code });
          await refreshUser();
        }
        return code;
      }
    } catch { /* ignore */ }
    return countryCode;
  }, [user, countryCode, refreshUser]);

  const setLanguage = async (code: string) => {
    setLanguageState(code);
    await storage.setItem('preferredLanguage', code);
    if (user) {
      await authApi.updatePreferences({ preferredLanguage: code, countryCode });
      await refreshUser();
    }
  };

  const isFromIndia = countryCode === 'IN';
  const availableLanguages = isFromIndia
    ? INDIAN_LANGUAGE_CODES
    : ['en', getDeviceLocale()].filter((v, i, a) => a.indexOf(v) === i);

  const t = (key: StringKey) => translate(language, key);

  return (
    <LocaleContext.Provider
      value={{
        language,
        countryCode,
        isFromIndia,
        setLanguage,
        detectCountry,
        t,
        speechLocale: getLanguage(language).speechLocale,
        availableLanguages,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);

export { getDeviceLocale };
