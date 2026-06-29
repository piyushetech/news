import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Image, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, radius } from '../theme';
import { newsApi, NewsItem, TrendingTopic } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { RootStackParamList } from '../navigation/types';
import { NewsCard } from '../components/NewsCard';
import { EmptyTopicsPanel } from '../components/EmptyTopicsPanel';
import { speakBriefing, stopSpeaking } from '../services/tts';
import { storage } from '../services/storage';
import { FEED_FILTER_PREFS_KEY, filterStateFromSubscribed, isActiveTopicChip, mergeTopicChips, nextCategoryFilterState } from '../utils/feedFilter';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type FeedMode = 'latest' | 'topic';

const PAGE_SIZE = 10;

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { t, countryCode, language, speechLocale } = useLocale();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>('latest');
  const [activeTopic, setActiveTopic] = useState<TrendingTopic | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [briefingPlaying, setBriefingPlaying] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [filterAll, setFilterAll] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [fetchingTopicId, setFetchingTopicId] = useState<string | null>(null);

  const subscribed = user?.subscribedCategories || [];
  const countryLabel = countryCode === 'IN' ? 'India' : countryCode;
  const subscribedKey = subscribed.join(',');
  const loadingRef = useRef(false);
  const topicRequestGen = useRef(0);

  const effectiveCategories = useMemo(() => {
    if (filterAll || selectedCategories.length === 0) return subscribed;
    const active = selectedCategories.filter((c) => subscribed.includes(c));
    return active.length ? active : subscribed;
  }, [filterAll, selectedCategories, subscribedKey]);

  const filterCategoriesKey = effectiveCategories.join(',');

  const feedLabel = useMemo(() => {
    if (feedMode === 'topic' && activeTopic) {
      return activeTopic.label;
    }
    if (!filterAll && selectedCategories.length === 1) {
      return `${t('latestIn')} ${selectedCategories[0]}`;
    }
    if (!filterAll && selectedCategories.length > 1) {
      return `${t('latestIn')} ${selectedCategories.join(', ')}`;
    }
    if (subscribed.length === 1) return `${t('latestIn')} ${subscribed[0]}`;
    return `${t('latestIn')} ${countryLabel}`;
  }, [feedMode, activeTopic, filterAll, selectedCategories, subscribed, countryLabel, t]);

  const topicExtra = useCallback((topic: TrendingTopic) => ({
    query: topic.query || topic.label,
    label: topic.label,
  }), []);

  const loadTrendingTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await newsApi.getTrendingTopics(countryCode, language, effectiveCategories);
      setTrendingTopics(res.data.data.slice(0, 5));
    } catch {
      setTrendingTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  }, [countryCode, language, filterCategoriesKey]);

  const fetchPage = useCallback(async (pageNum: number, categories = effectiveCategories) => {
    if (feedMode === 'topic' && activeTopic) {
      const res = await newsApi.getTopicFeed(
        activeTopic.id,
        pageNum,
        countryCode,
        language,
        categories,
        topicExtra(activeTopic),
      );
      return {
        items: res.data.data,
        hasMore: res.data.meta.hasMore,
        page: pageNum,
      };
    }

    if (subscribed.length > 0) {
      const res = await newsApi.getForMe({
        page: pageNum,
        limit: PAGE_SIZE,
        categories,
        lang: language,
      });
      return {
        items: res.data.data,
        hasMore: res.data.meta.hasMore,
        page: pageNum,
      };
    }

    const res = await newsApi.getCountry(countryCode, language, pageNum, PAGE_SIZE);
    return {
      items: res.data.data,
      hasMore: res.data.meta.hasMore,
      page: pageNum,
    };
  }, [feedMode, activeTopic, countryCode, language, subscribedKey, topicExtra, effectiveCategories]);

  const loadFeed = useCallback(async (pageNum = 1, replace = true, categories = effectiveCategories) => {
    if (loadingRef.current && !replace) return;
    loadingRef.current = true;
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const { items, hasMore: more } = await fetchPage(pageNum, categories);
      setNews((prev) => (replace ? items : [...prev, ...items]));
      setHasMore(more);
      setPage(pageNum);
    } catch {
      if (replace) setNews([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [fetchPage, effectiveCategories]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore || loadingRef.current) return;
    loadFeed(page + 1, false);
  }, [loading, loadingMore, refreshing, hasMore, page, loadFeed]);

  const refreshFeed = useCallback(async () => {
    setRefreshing(true);
    try {
      if (feedMode === 'topic' && activeTopic) {
        await newsApi.refreshTopic(
          activeTopic.id,
          countryCode,
          language,
          effectiveCategories,
          topicExtra(activeTopic),
        );
      } else if (subscribed.length > 0) {
        await newsApi.refreshForMe(effectiveCategories);
      }
      await loadFeed(1, true);
    } catch {
      await loadFeed(1, true);
    }
  }, [feedMode, activeTopic, countryCode, language, filterCategoriesKey, subscribedKey, effectiveCategories, loadFeed, topicExtra]);

  const loadLatestFeed = useCallback(async (categories = effectiveCategories) => {
    setLoading(true);
    try {
      if (subscribed.length > 0) {
        const res = await newsApi.getForMe({
          page: 1,
          limit: PAGE_SIZE,
          categories,
          lang: language,
        });
        setNews(res.data.data);
        setHasMore(res.data.meta.hasMore);
      } else {
        const res = await newsApi.getCountry(countryCode, language, 1, PAGE_SIZE);
        setNews(res.data.data);
        setHasMore(res.data.meta.hasMore);
      }
      setPage(1);
    } catch {
      setNews([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [subscribed.length, effectiveCategories, language, countryCode]);

  useEffect(() => {
    if (language !== 'en') {
      stopSpeaking();
      setSpeakingId(null);
      setBriefingPlaying(false);
    }
  }, [language]);

  const resetToLatest = useCallback(async () => {
    topicRequestGen.current += 1;
    stopSpeaking();
    setSpeakingId(null);
    setFeedMode('latest');
    setActiveTopic(null);
    setFetchingTopicId(null);
    await loadLatestFeed(effectiveCategories);
  }, [loadLatestFeed, effectiveCategories]);

  const selectTopic = useCallback(async (topic: TrendingTopic, categories = effectiveCategories) => {
    const reqId = ++topicRequestGen.current;
    stopSpeaking();
    setSpeakingId(null);
    setFeedMode('topic');
    setActiveTopic(topic);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    setFetchingTopicId(topic.id);
    const extra = topicExtra(topic);
    try {
      let res = await newsApi.getTopicFeed(
        topic.id,
        1,
        countryCode,
        language,
        categories,
        extra,
      );
      if (reqId !== topicRequestGen.current) return;
      if (!res.data.data.length) {
        res = await newsApi.refreshTopic(
          topic.id,
          countryCode,
          language,
          categories,
          extra,
        );
      }
      if (reqId !== topicRequestGen.current) return;
      setNews(res.data.data);
      setHasMore(res.data.meta.hasMore);
      setPage(1);
      if (res.data.meta.label) {
        setActiveTopic((prev) => (prev ? { ...prev, label: res.data.meta.label } : prev));
      }
      if (!res.data.data.length) {
        Alert.alert('BriefNews', t('pullToFetchTopic'));
      }
    } catch {
      if (reqId !== topicRequestGen.current) return;
      setNews([]);
      setHasMore(false);
    } finally {
      if (reqId !== topicRequestGen.current) return;
      setLoading(false);
      setFetchingTopicId(null);
    }
  }, [countryCode, language, filterCategoriesKey, effectiveCategories, t, topicExtra]);

  const reloadFeedForFilterChange = useCallback(async (
    nextFilterAll: boolean,
    nextSelected: string[],
    topicOverride?: TrendingTopic | null,
    options: { refresh?: boolean } = {},
  ) => {
    const { refresh = true } = options;
    const effCats = nextFilterAll || !nextSelected.length
      ? subscribed
      : nextSelected.filter((c) => subscribed.includes(c));

    setLoadingTopics(true);
    try {
      const res = await newsApi.getTrendingTopics(countryCode, language, effCats);
      setTrendingTopics(res.data.data.slice(0, 5));
    } catch {
      setTrendingTopics([]);
    } finally {
      setLoadingTopics(false);
    }

    const topic = topicOverride ?? (feedMode === 'topic' ? activeTopic : null);
    if (feedMode === 'topic' && topic) {
      await selectTopic(topic, effCats);
    } else {
      if (subscribed.length && refresh) {
        try {
          await newsApi.refreshForMe(effCats);
        } catch { /* ignore */ }
      }
      await loadFeed(1, true, effCats);
    }
  }, [countryCode, language, subscribed, feedMode, activeTopic, selectTopic, loadFeed]);

  const onTopicPress = useCallback((topic: TrendingTopic, wasActive = false) => {
    const togglingOff = feedMode === 'topic' && (
      wasActive || isActiveTopicChip(activeTopic, topic, feedMode)
    );
    if (togglingOff) {
      resetToLatest();
      return;
    }
    selectTopic(topic);
  }, [feedMode, activeTopic, resetToLatest, selectTopic]);

  const topicChips = useMemo(
    () => mergeTopicChips(trendingTopics, activeTopic),
    [trendingTopics, activeTopic],
  );

  const onEmptyTopicPress = useCallback((topic: TrendingTopic) => {
    onTopicPress(topic);
  }, [onTopicPress]);

  const selectFilterAll = () => {
    if (filterAll) return;
    setFilterAll(true);
    setSelectedCategories([]);
    setFeedMode('latest');
    setActiveTopic(null);
    reloadFeedForFilterChange(true, [], null, { refresh: false });
  };

  const toggleCategoryFilter = (cat: string) => {
    const isActive = !filterAll && selectedCategories.includes(cat);
    if (isActive) {
      setFilterAll(true);
      setSelectedCategories([]);
      setFeedMode('latest');
      setActiveTopic(null);
      reloadFeedForFilterChange(true, [], null, { refresh: false });
      return;
    }
    const next = nextCategoryFilterState({ filterAll, selectedCategories }, cat, subscribed);
    setFilterAll(next.filterAll);
    setSelectedCategories(next.selectedCategories);
    setFeedMode('latest');
    setActiveTopic(null);
    reloadFeedForFilterChange(next.filterAll, next.selectedCategories, null, { refresh: false });
  };

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    loadTrendingTopics();
  }, [loadTrendingTopics]);

  useEffect(() => {
    setSelectedCategories((prev) => {
      const next = prev.filter((c) => subscribed.includes(c));
      if (next.length !== prev.length) {
        if (!next.length) setFilterAll(true);
        return next;
      }
      return prev;
    });
  }, [subscribedKey, subscribed]);

  useEffect(() => {
    if (feedMode !== 'latest') return;
    loadFeedRef.current(1, true);
  }, [countryCode, language, filterCategoriesKey, subscribedKey, feedMode]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await storage.getItem(FEED_FILTER_PREFS_KEY);
        if (!raw) return;
        await storage.deleteItem(FEED_FILTER_PREFS_KEY);
        try {
          const cats = JSON.parse(raw) as string[];
          const { filterAll, selectedCategories } = filterStateFromSubscribed(cats);
          setFilterAll(filterAll);
          setSelectedCategories(selectedCategories);
        } catch { /* ignore */ }
      })();
    }, []),
  );

  const playMorningBriefing = async () => {
    if (language !== 'en') return;
    try {
      if (briefingPlaying) {
        stopSpeaking();
        setBriefingPlaying(false);
        return;
      }
      const res = await newsApi.getBriefing(countryCode, language);
      const stories = res.data.data.stories;
      if (!stories.length) {
        Alert.alert('BriefNews', 'No stories for briefing yet.');
        return;
      }
      setBriefingPlaying(true);
      speakBriefing(stories, () => setBriefingPlaying(false), speechLocale, language);
    } catch {
      Alert.alert('Error', 'Could not load morning briefing.');
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userRow}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{user?.name?.charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.greet}>BriefNews</Text>
              <Text style={styles.sub}>
                {subscribed.length ? `${subscribed.length} ${t('topicsSelected')}` : t('newsInWords')}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Preferences')}>
              <Ionicons name="options-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, feedMode === 'latest' && styles.tabActive]}
            onPress={resetToLatest}
          >
            <Ionicons name="flash" size={14} color={feedMode === 'latest' ? '#fff' : 'rgba(255,255,255,0.8)'} />
            <Text style={[styles.tabText, feedMode === 'latest' && styles.tabTextActive]}>{t('latest')}</Text>
          </TouchableOpacity>
          <View style={styles.countryPill}>
            <Ionicons name="flag" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.countryPillText}>{countryLabel}</Text>
          </View>
        </View>

        {subscribed.length > 1 ? (
          <>
            <Text style={styles.filterTitle}>{t('filterTopics')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, filterAll && styles.filterChipActive]}
                onPress={selectFilterAll}
              >
                <Text style={[styles.filterChipText, filterAll && styles.filterChipTextActive]}>{t('all')}</Text>
              </TouchableOpacity>
              {subscribed.map((cat) => {
                const active = !filterAll && selectedCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => toggleCategoryFilter(cat)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text style={styles.topicSectionTitle}>{t('trendingNow')}</Text>
        <Text style={styles.topicHint}>{t('tapTopicToggle')}</Text>
        {loadingTopics ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicScroll}>
            {topicChips.map((topic) => {
              const active = isActiveTopicChip(activeTopic, topic, feedMode);
              return (
                <TouchableOpacity
                  key={`${topic.id}-${topic.label}`}
                  style={[styles.topicChip, active && styles.topicChipActive]}
                  onPress={() => onTopicPress(topic, active)}
                >
                  <Text style={[styles.topicChipText, active && styles.topicChipTextActive]} numberOfLines={2}>
                    {topic.label}
                  </Text>
                  {active ? (
                    <Ionicons name="close-circle" size={14} color={colors.orange} style={styles.topicClose} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {language === 'en' ? (
          <TouchableOpacity style={styles.briefingBtn} onPress={playMorningBriefing}>
            <View style={styles.briefingIcon}>
              <Ionicons name={briefingPlaying ? 'stop-circle' : 'headset'} size={22} color={colors.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.briefingTitle}>
                {briefingPlaying ? t('stop') : t('morningBriefing')}
              </Text>
              <Text style={styles.briefingSub}>{t('todayBriefing')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.feedHint}>{feedLabel}</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <NewsCard
            item={item}
            index={index}
            onPress={() => navigation.navigate('Detail', { news: item })}
            onDeepDive={() => navigation.navigate('Detail', { news: item, scrollToDeepDive: true })}
            isSpeaking={speakingId === item._id}
            onListen={() => setSpeakingId(item._id)}
            speechLocale={speechLocale}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshFeed} colors={[colors.orange]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.orange} size="large" />
          ) : (
            <EmptyTopicsPanel
              topics={trendingTopics}
              loading={loadingTopics}
              fetchingTopicId={fetchingTopicId}
              subscribedCategories={subscribed}
              onTopicPress={onEmptyTopicPress}
              onRefresh={refreshFeed}
              onOpenPreferences={() => navigation.navigate('Preferences')}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={colors.orange} />
          ) : hasMore ? (
            <Text style={styles.loadMoreHint}>{t('scrollForMore')}</Text>
          ) : news.length > 0 ? (
            <Text style={styles.loadMoreHint}>{t('endOfFeed')}</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.orangeBg,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 18 },
  greet: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  tabText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  countryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  countryPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  filterTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  filterScroll: { marginBottom: 10, maxHeight: 36 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: colors.orange },
  topicSectionTitle: {
    color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '800', marginBottom: 2,
  },
  topicHint: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginBottom: 8 },
  topicScroll: { marginBottom: 12, maxHeight: 56 },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', maxWidth: 170,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  topicChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  topicChipText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  topicChipTextActive: { color: colors.orange },
  topicClose: { marginLeft: 4 },
  briefingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: 4,
  },
  briefingIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.orangeLight, justifyContent: 'center', alignItems: 'center',
  },
  briefingTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  briefingSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  feedHint: { textAlign: 'center', color: colors.textMuted, fontSize: 12, paddingVertical: 10 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  emptyWrap: { paddingHorizontal: 8, paddingTop: 32, paddingBottom: 24 },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  emptySub: { textAlign: 'center', color: colors.textLight, fontSize: 12, marginTop: 8 },
  loadMoreHint: { textAlign: 'center', color: colors.textLight, fontSize: 11, paddingVertical: 16 },
});
