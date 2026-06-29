import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../theme';
import { TrendingTopic } from '../services/api';
import { useLocale } from '../context/LocaleContext';

interface Props {
  topics: TrendingTopic[];
  loading?: boolean;
  fetchingTopicId?: string | null;
  subscribedCategories?: string[];
  onTopicPress: (topic: TrendingTopic) => void;
  onRefresh?: () => void;
  onOpenPreferences?: () => void;
}

const TOPIC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Politics: 'megaphone-outline',
  Cricket: 'baseball-outline',
  Technology: 'hardware-chip-outline',
  Crime: 'shield-outline',
  'Current Affairs': 'calendar-outline',
  Business: 'trending-up-outline',
  Sports: 'football-outline',
  Science: 'flask-outline',
  World: 'globe-outline',
  National: 'flag-outline',
  Entertainment: 'film-outline',
  History: 'book-outline',
  General: 'newspaper-outline',
};

export function EmptyTopicsPanel({
  topics,
  loading,
  fetchingTopicId,
  subscribedCategories = [],
  onTopicPress,
  onRefresh,
  onOpenPreferences,
}: Props) {
  const { t } = useLocale();

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={28} color={colors.orange} />
        </View>
        <Text style={styles.title}>{t('noStories')}</Text>
        <Text style={styles.subtitle}>{t('latestTopicsHint')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.orange} style={{ marginVertical: 24 }} />
      ) : topics.length > 0 ? (
        <View style={styles.topicList}>
          <Text style={styles.sectionLabel}>{t('trendingNow')}</Text>
          {topics.map((topic) => {
            const busy = fetchingTopicId === topic.id;
            const icon = TOPIC_ICONS[topic.category] || 'flash-outline';
            return (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                onPress={() => onTopicPress(topic)}
                disabled={!!fetchingTopicId}
              >
                <View style={styles.topicIconWrap}>
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.orange} />
                  ) : (
                    <Ionicons name={icon} size={22} color={colors.orange} />
                  )}
                </View>
                <View style={styles.topicBody}>
                  <Text style={styles.topicLabel}>{topic.label}</Text>
                  <Text style={styles.topicMeta}>{topic.category} · {t('tapToGetStories')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : subscribedCategories.length > 0 ? (
        <View style={styles.fallback}>
          <Text style={styles.sectionLabel}>{t('yourTopics')}</Text>
          <View style={styles.chipRow}>
            {subscribedCategories.map((cat) => (
              <View key={cat} style={styles.catChip}>
                <Text style={styles.catChipText}>{cat}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fallbackHint}>{t('pullToRefreshHint')}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {onRefresh ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('refreshStories')}</Text>
          </TouchableOpacity>
        ) : null}
        {onOpenPreferences ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenPreferences}>
            <Ionicons name="options-outline" size={18} color={colors.orange} />
            <Text style={styles.secondaryBtnText}>{t('pickTopics')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  hero: { alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.orangeLight, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 13, color: colors.textMuted, textAlign: 'center',
    lineHeight: 20, marginTop: 6, paddingHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 0.5, marginBottom: 10, paddingHorizontal: spacing.md,
  },
  topicList: { paddingBottom: spacing.sm },
  topicCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  topicIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.orangeLight, justifyContent: 'center', alignItems: 'center',
  },
  topicBody: { flex: 1 },
  topicLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  topicMeta: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  fallback: { padding: spacing.md, paddingTop: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.orangeLight,
  },
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  fallbackHint: { fontSize: 12, color: colors.textLight, lineHeight: 18 },
  actions: { padding: spacing.md, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.orange, borderRadius: radius.full, paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.full, paddingVertical: 12,
    borderWidth: 1.5, borderColor: colors.orange,
  },
  secondaryBtnText: { color: colors.orange, fontSize: 14, fontWeight: '800' },
});
