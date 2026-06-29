import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../theme';
import { NewsItem } from '../services/api';
import { speakNewsCard, stopSpeaking } from '../services/tts';
import { useLocale } from '../context/LocaleContext';
import { formatDateTime } from '../utils/formatTime';
import { buildReadMoreText } from '../utils/truncateText';
import { shareNewsStory } from '../services/shareNews';

interface Props {
  item: NewsItem;
  index: number;
  onPress: () => void;
  onDeepDive?: () => void;
  onListen?: () => void;
  isSpeaking?: boolean;
  speechLocale?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Politics: '#7c3aed',
  Cricket: '#16a34a',
  History: '#b45309',
  World: '#0284c7',
  Technology: '#6366f1',
  Business: '#0891b2',
  Sports: '#059669',
  Science: '#7c3aed',
  Entertainment: '#db2777',
  National: '#ea580c',
  City: '#64748b',
  Crime: '#dc2626',
  'Current Affairs': '#0d9488',
};

const CARD_PREVIEW = { maxLines: 4, charsPerLine: 40 };

export function NewsCard({ item, index, onPress, onDeepDive, onListen, isSpeaking, speechLocale }: Props) {
  const { t, language } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[item.category] || colors.orange;
  const paragraph =
    item.paragraph?.trim() && item.paragraph.trim() !== item.heading.trim()
      ? item.paragraph
      : 'Summary loading soon. Tap to read more.';

  const hasLongForm = !!(item.fullContent && item.fullContent.length > paragraph.length);
  const expandTarget = hasLongForm ? item.fullContent : paragraph;

  let displayText: string;
  let showReadMore: boolean;

  if (expanded) {
    displayText = expandTarget;
    showReadMore = true;
  } else {
    const previewSource = hasLongForm ? paragraph : expandTarget;
    const preview = buildReadMoreText(previewSource, false, CARD_PREVIEW);
    displayText = preview.text;
    showReadMore = hasLongForm || preview.showToggle;
  }

  const toggleExpand = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: `${catColor}22` }]}>
          <Text style={[styles.placeholderIcon, { color: catColor }]}>
            {item.category === 'Cricket' ? '🏏' : item.category === 'Crime' ? '🚨' : item.category === 'Politics' ? '🏛️' : '📰'}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: `${catColor}18` }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>{item.category}</Text>
          </View>
          <Text style={styles.index}>#{index + 1}</Text>
        </View>

        <Text style={styles.heading} numberOfLines={3}>{item.heading}</Text>
        <Text style={styles.paragraph}>
          {displayText}
          {showReadMore ? (
            <Text style={styles.readMoreInline} onPress={toggleExpand} suppressHighlighting>
              {expanded ? ` ${t('readLess')}` : ` ${t('readMore')}`}
            </Text>
          ) : null}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.source}>{item.source}</Text>
          <View style={styles.metaRight}>
            {(item.commentCount ?? 0) > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textLight} />
                <Text style={styles.metaText}>{item.commentCount}</Text>
              </View>
            )}
            <Text style={styles.time}>{formatDateTime(item.publishedAt)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {language === 'en' ? (
            <TouchableOpacity
              style={[styles.actionBtn, isSpeaking && styles.actionBtnActive]}
              onPress={(e) => {
                e.stopPropagation?.();
                if (isSpeaking) stopSpeaking();
                else {
                  speakNewsCard(item, speechLocale);
                  onListen?.();
                }
              }}
            >
              <Ionicons name={isSpeaking ? 'stop-circle' : 'volume-high'} size={16} color={isSpeaking ? '#fff' : colors.orange} />
              <Text style={[styles.actionText, isSpeaking && styles.actionTextActive]}>
                {isSpeaking ? t('stop') : t('listen')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {item.originalLink ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                Linking.openURL(item.originalLink!);
              }}
            >
              <Ionicons name="open-outline" size={16} color={colors.orange} />
              <Text style={styles.actionText}>{t('source')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              shareNewsStory(item);
            }}
          >
            <Ionicons name="share-outline" size={16} color={colors.orange} />
            <Text style={styles.actionText}>{t('share')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              (onDeepDive || onPress)();
            }}
          >
            <Ionicons name="layers-outline" size={16} color={colors.orange} />
            <Text style={styles.actionText}>{t('deepDive')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  image: { width: '100%', height: 180 },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 40 },
  body: { padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '800' },
  index: { fontSize: 12, fontWeight: '700', color: colors.textLight },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 26, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 23, color: colors.textMuted },
  readMoreInline: { fontSize: 14, fontWeight: '800', color: colors.orange },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  source: { fontSize: 12, fontWeight: '700', color: colors.orange },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: colors.textLight },
  time: { fontSize: 12, color: colors.textLight },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.surface,
  },
  actionBtnActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  actionText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  actionTextActive: { color: '#fff' },
});
