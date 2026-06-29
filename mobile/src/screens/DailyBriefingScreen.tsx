import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, Image, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, radius } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { newsApi, NewsItem } from '../services/api';
import { useLocale } from '../context/LocaleContext';
import { storage } from '../services/storage';
import { formatDateTime } from '../utils/formatTime';
import { shareNewsStory } from '../services/shareNews';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyBriefing'>;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DailyBriefingScreen({ navigation }: Props) {
  const { t, countryCode, language } = useLocale();
  const [stories, setStories] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (language !== 'en') {
      navigation.replace('Home');
    }
  }, [language, navigation]);

  useEffect(() => {
    (async () => {
      try {
        const res = await newsApi.getBriefing(countryCode, language);
        setStories(res.data.data.stories);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [countryCode, language]);

  const completeBriefing = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await storage.setItem('briefingCompletedDate', today);
    navigation.replace('Home');
  };

  const renderStory = ({ item, index }: { item: NewsItem; index: number }) => (
    <View style={[styles.page, { height: SCREEN_HEIGHT }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroEmoji}>📰</Text>
        </View>
      )}
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.briefLabel}>{t('todayBriefing')}</Text>
          <TouchableOpacity onPress={completeBriefing}>
            <Text style={styles.skipText}>{t('skipBriefing')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= index && styles.progressDotActive]} />
          ))}
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>
        <Text style={styles.heading}>{item.heading}</Text>
        <Text style={styles.paragraph}>{item.paragraph}</Text>

        <Text style={styles.publishedTime}>{formatDateTime(item.publishedAt)}</Text>

        {item.fullContent && item.fullContent !== item.paragraph ? (
          <Text style={styles.fullContent} numberOfLines={6}>{item.fullContent}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => shareNewsStory(item)}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.actionText}>{t('share')}</Text>
          </TouchableOpacity>
          {item.originalLink ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(item.originalLink!)}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>{t('readOriginal')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.swipeHint}>
          {index < stories.length - 1 ? (
            <>
              <Ionicons name="chevron-up" size={24} color="rgba(255,255,255,0.7)" />
              <Text style={styles.swipeText}>{t('swipeUp')}</Text>
            </>
          ) : (
            <TouchableOpacity style={styles.continueBtn} onPress={completeBriefing} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>{t('continueToFeed')} →</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.storyCount}>
            {t('storyOf')} {index + 1} / {stories.length}
          </Text>
        </View>
      </View>
    </View>
  );

  useEffect(() => {
    if (!loading && !stories.length) {
      completeBriefing();
    }
  }, [loading, stories.length]);

  if (!loading && !stories.length) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  if (!stories.length) return null;

  return (
    <FlatList
      ref={listRef}
      data={stories}
      keyExtractor={(item) => item._id}
      renderItem={renderStory}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={SCREEN_HEIGHT}
      decelerationRate="fast"
      bounces={false}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  page: { backgroundColor: '#000', position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.orangeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 64 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: 48,
    paddingTop: 60,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  briefLabel: { color: colors.orange, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressDot: {
    flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressDotActive: { backgroundColor: colors.orange },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  heading: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 14 },
  paragraph: { color: 'rgba(255,255,255,0.92)', fontSize: 16, lineHeight: 26, marginBottom: 6 },
  publishedTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 },
  fullContent: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  swipeHint: { alignItems: 'center', gap: 8 },
  swipeText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  storyCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },
  continueBtn: {
    marginTop: 8,
    backgroundColor: colors.orange,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.full,
    minWidth: 220,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
