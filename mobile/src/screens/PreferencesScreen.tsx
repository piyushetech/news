import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { newsApi, Category } from '../services/api';
import { LANGUAGES } from '../constants/languages';
import { RootStackParamList } from '../navigation/types';
import { getDeviceLocale } from '../context/LocaleContext';
import { storage } from '../services/storage';
import { FEED_FILTER_PREFS_KEY } from '../utils/feedFilter';

type Props = NativeStackScreenProps<RootStackParamList, 'Preferences'>;

export default function PreferencesScreen({ navigation }: Props) {
  const { user, updatePreferences, refreshUser } = useAuth();
  const { t, isFromIndia, countryCode, language, setLanguage } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notifySelected, setNotifySelected] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState(language || 'en');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLanguages, setShowLanguages] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const prefsDirtyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      prefsDirtyRef.current = false;
      setLoadingUser(true);
      refreshUser()
        .catch(() => Alert.alert('Error', 'Could not load your saved topics.'))
        .finally(() => setLoadingUser(false));
    }, [refreshUser]),
  );

  useEffect(() => {
    if (!user || loadingUser || prefsDirtyRef.current) return;
    const subscribed = [...(user.subscribedCategories || [])];
    const notify = user.notificationCategories?.length
      ? [...user.notificationCategories]
      : subscribed;
    setSelected(subscribed);
    setNotifySelected(notify);
    if (user.preferredLanguage) setSelectedLang(user.preferredLanguage);
  }, [user, loadingUser]);

  useEffect(() => {
    newsApi.getCategories()
      .then((res) => setCategories(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    prefsDirtyRef.current = true;
    setSelected((prev) =>
      (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]),
    );
  };

  const languageOptions = isFromIndia
    ? LANGUAGES
    : LANGUAGES.filter((l) => l.code === 'en' || l.code === getDeviceLocale());

  const toggleNotify = (id: string) => {
    prefsDirtyRef.current = true;
    setNotifySelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (selected.length < 1) {
      Alert.alert('Pick at least one', 'Choose the news topics you want to follow.');
      return;
    }
    if (notifySelected.length < 1) {
      Alert.alert('Pick notifications', 'Choose at least one category for push alerts.');
      return;
    }
    setSaving(true);
    try {
      await updatePreferences({
        subscribedCategories: selected,
        notificationCategories: notifySelected,
        preferredLanguage: selectedLang,
        countryCode,
      });
      prefsDirtyRef.current = false;
      await setLanguage(selectedLang);
      await storage.setItem(FEED_FILTER_PREFS_KEY, JSON.stringify(selected));
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace('Home');
    } catch {
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>📰</Text>
        <Text style={styles.title}>{t('pickTopics')}</Text>
        <Text style={styles.subtitle}>
          {isFromIndia
            ? 'Pick topics and your preferred Indian language.'
            : 'Pick topics — English or your local language.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.langHeader} onPress={() => setShowLanguages(!showLanguages)}>
          <View>
            <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>
            <Text style={styles.langSelected}>
              {LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel || 'English'}
            </Text>
          </View>
          <Ionicons name={showLanguages ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {showLanguages && (
          <View style={styles.langGrid}>
            {languageOptions.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, selectedLang === lang.code && styles.langChipActive]}
                onPress={() => {
                  prefsDirtyRef.current = true;
                  setSelectedLang(lang.code);
                }}
              >
                <Text style={[styles.langChipLabel, selectedLang === lang.code && styles.langChipLabelActive]}>
                  {lang.nativeLabel}
                </Text>
                <Text style={[styles.langChipSub, selectedLang === lang.code && styles.langChipLabelActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.hint}>{t('languageHint')}</Text>

        <Text style={styles.sectionTitle}>Topics</Text>
        <Text style={styles.hint}>Tap to turn on or off. Saved when you tap Continue to Feed.</Text>
        <Text style={styles.topicCount}>{selected.length} {t('topicsSelected')}</Text>
        <View style={styles.grid}>
          {categories.map((cat) => {
            const active = selected.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, styles.prefChip, active && styles.chipActive]}
                onPress={() => toggle(cat.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.chipIcon, !active && styles.chipIconMuted]}>{cat.icon}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('notifyMeFor')}</Text>
        <Text style={styles.hint}>Tap to turn on or off. Saved when you tap Continue to Feed.</Text>
        <View style={styles.grid}>
          {categories.map((cat) => {
            const active = notifySelected.includes(cat.id);
            return (
              <TouchableOpacity
                key={`notify-${cat.id}`}
                style={[styles.chip, styles.prefChip, active && styles.chipActive]}
                onPress={() => toggleNotify(cat.id)}
              >
                <Text style={styles.chipIcon}>{active ? '🔔' : '🔕'}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {selected.length} {t('topicsSelected')}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || selected.length < 1) && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving || selected.length < 1}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{t('continueToFeed')} →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.orangeBg,
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  langHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12, ...shadows.card,
  },
  langSelected: { fontSize: 14, color: colors.orange, fontWeight: '700', marginTop: 4 },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  langChip: {
    width: '47%', padding: 12, borderRadius: radius.sm,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  langChipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  langChipLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  langChipSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  langChipLabelActive: { color: '#fff' },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 16 },
  topicCount: { fontSize: 13, color: colors.orange, fontWeight: '700', marginBottom: 12, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  prefChip: { width: '31%' },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  notifyChip: { width: '31%' },
  chipCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  chipIcon: { fontSize: 28 },
  chipIconMuted: { opacity: 0.4 },
  chipLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  chipLabelActive: { color: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  saveBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
