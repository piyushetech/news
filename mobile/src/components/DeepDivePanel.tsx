import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../theme';
import { DeepDive } from '../services/api';
import { useLocale } from '../context/LocaleContext';
import { StringKey } from '../i18n';

const ITEM_KEYS: {
  key: keyof DeepDive;
  labelKey: StringKey;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  { key: 'who', labelKey: 'deepDiveWho', icon: 'people', color: '#7c3aed', bg: '#f3e8ff' },
  { key: 'what', labelKey: 'deepDiveWhat', icon: 'newspaper', color: '#0284c7', bg: '#e0f2fe' },
  { key: 'where', labelKey: 'deepDiveWhere', icon: 'location', color: '#059669', bg: '#d1fae5' },
  { key: 'when', labelKey: 'deepDiveWhen', icon: 'time', color: '#d97706', bg: '#fef3c7' },
  { key: 'why', labelKey: 'deepDiveWhy', icon: 'help-circle', color: '#dc2626', bg: '#fee2e2' },
  { key: 'how', labelKey: 'deepDiveHow', icon: 'git-network', color: '#6366f1', bg: '#e0e7ff' },
];

interface Props {
  data: DeepDive | null;
  loading?: boolean;
  title?: string;
  showTitle?: boolean;
}

export function DeepDivePanel({ data, loading, title, showTitle = true }: Props) {
  const { t, language } = useLocale();
  const panelTitle = title ?? t('deepDive');
  const subtitle = t('deepDiveSubtitle');
  const items = useMemo(
    () => ITEM_KEYS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [language],
  );

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Ionicons name="layers" size={20} color={colors.orange} />
          {showTitle ? <Text style={styles.title}>{panelTitle}</Text> : (
            <Text style={styles.subtitleOnly}>{subtitle}</Text>
          )}
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.loadingText}>{t('deepDiveLoading')}</Text>
        </View>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="layers" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          {showTitle ? (
            <>
              <Text style={styles.title}>{panelTitle}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </>
          ) : (
            <Text style={styles.subtitleOnly}>{subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {items.map(({ key, label, icon, color, bg }, index) => (
          <View key={key} style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
            <View style={[styles.iconCircle, { backgroundColor: bg }]}>
              <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={[styles.cardLabel, { color }]}>{label}</Text>
            <Text style={styles.cardValue}>{data[key] || '—'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Ionicons name="sparkles-outline" size={14} color={colors.textLight} />
        <Text style={styles.footerText}>{t('deepDiveFooter')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.orange, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  subtitleOnly: { fontSize: 14, fontWeight: '800', color: colors.text },
  loadingBox: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 110,
  },
  cardLeft: {},
  cardRight: {},
  iconCircle: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  cardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '500' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerText: { fontSize: 11, color: colors.textLight, flex: 1 },
});
