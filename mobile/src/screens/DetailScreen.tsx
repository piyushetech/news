import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator,
  Image, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, radius, shadows } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { newsApi, DeepDive, Comment } from '../services/api';
import { speakText, stopSpeaking } from '../services/tts';
import { Disclaimer } from '../components/Disclaimer';
import { DeepDivePanel } from '../components/DeepDivePanel';
import { StoryActionBar, ActionId } from '../components/StoryActionBar';
import { useLocale } from '../context/LocaleContext';
import { formatDateTime } from '../utils/formatTime';
import { buildReadMoreText } from '../utils/truncateText';
import { shareNewsStory } from '../services/shareNews';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export default function DetailScreen({ route, navigation }: Props) {
  const { news, scrollToDeepDive: scrollToDeepDiveOnMount } = route.params;
  const { t, speechLocale, language } = useLocale();
  const scrollRef = useRef<ScrollView>(null);
  const [deepDiveY, setDeepDiveY] = useState(0);

  const [displayText, setDisplayText] = useState(news.paragraph);
  const [showFull, setShowFull] = useState(false);
  const [eli5Mode, setEli5Mode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [deepDive, setDeepDive] = useState<DeepDive | null>(news.deepDive || null);
  const [loadingDeepDive, setLoadingDeepDive] = useState(!news.deepDive?.what);
  const [bias, setBias] = useState<{ left: string; right: string } | null>(
    news.biasLeft && news.biasRight ? { left: news.biasLeft, right: news.biasRight } : null
  );
  const [biasSide, setBiasSide] = useState<'left' | 'right'>('left');
  const [showBias, setShowBias] = useState(false);
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [biasedCount, setBiasedCount] = useState(news.biasedCount || 0);
  const [userMarkedBiased, setUserMarkedBiased] = useState(false);
  const [loadingEngagement, setLoadingEngagement] = useState(true);

  const showBiasSection = news.isControversial || news.category === 'Politics';

  useEffect(() => {
    (async () => {
      try {
        const [commentsRes, engagementRes] = await Promise.all([
          newsApi.getComments(news._id),
          newsApi.getEngagement(news._id),
        ]);
        setComments(commentsRes.data.data);
        setBiasedCount(engagementRes.data.data.biasedCount);
        setUserMarkedBiased(engagementRes.data.data.userMarked);
      } catch { /* ignore */ }
      finally { setLoadingEngagement(false); }
    })();
  }, [news._id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDeepDive(true);
      try {
        const res = await newsApi.getDeepDive(news._id, language);
        if (!cancelled) setDeepDive(res.data.data);
      } catch { /* ignore */ }
      finally {
        if (!cancelled) setLoadingDeepDive(false);
      }
    })();
    return () => { cancelled = true; };
  }, [news._id, language]);

  useEffect(() => {
    if (!showBias) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await newsApi.getBias(news._id, language);
        if (!cancelled) {
          setBias({ left: res.data.data.left, right: res.data.data.right });
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [news._id, language, showBias]);

  useEffect(() => {
    if (!scrollToDeepDiveOnMount) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, deepDiveY - 12), animated: true });
    }, loadingDeepDive ? 600 : 200);
    return () => clearTimeout(timer);
  }, [scrollToDeepDiveOnMount, deepDiveY, loadingDeepDive]);

  useEffect(() => {
    if (language !== 'en' && speaking) {
      stopSpeaking();
      setSpeaking(false);
    }
  }, [language, speaking]);

  const toggleListen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      const text = showFull && news.fullContent ? news.fullContent : displayText;
      speakText(`${news.heading}. ${text}`, () => setSpeaking(false), speechLocale);
      setSpeaking(true);
    }
  };

  const toggleEli5 = async () => {
    if (eli5Mode) {
      setDisplayText(news.paragraph);
      setEli5Mode(false);
      return;
    }
    setLoadingAi('eli5');
    try {
      const res = await newsApi.getEli5(news._id);
      setDisplayText(res.data.data.eli5Summary);
      setEli5Mode(true);
    } catch {
      setDisplayText(`Think of it like this: ${news.paragraph}`);
      setEli5Mode(true);
    } finally {
      setLoadingAi(null);
    }
  };

  const ensureBias = async () => {
    if (showBias) {
      setShowBias(false);
      return;
    }
    if (bias) {
      setShowBias(true);
      return;
    }
    setLoadingAi('bias');
    try {
      const res = await newsApi.getBias(news._id, language);
      setBias({ left: res.data.data.left, right: res.data.data.right });
      setShowBias(true);
    } catch { /* ignore */ }
    finally { setLoadingAi(null); }
  };

  const handleAction = async (id: ActionId) => {
    switch (id) {
      case 'listen':
        toggleListen();
        break;
      case 'readMore':
        if (news.fullContent && news.fullContent.length > news.paragraph.length) {
          setShowFull(!showFull);
        }
        break;
      case 'eli5':
        await toggleEli5();
        break;
      case 'source':
        if (news.originalLink) Linking.openURL(news.originalLink);
        break;
      case 'bias':
        await ensureBias();
        break;
      case 'share':
        await shareNewsStory(news);
        break;
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await newsApi.addComment(news._id, commentText.trim());
      setComments((prev) => [res.data.data, ...prev]);
      setCommentText('');
    } catch {
      Alert.alert('Error', t('commentPostError'));
    } finally {
      setPostingComment(false);
    }
  };

  const markBiased = async () => {
    try {
      if (userMarkedBiased) {
        const res = await newsApi.unmarkBiased(news._id);
        setBiasedCount(res.data.data.biasedCount);
        setUserMarkedBiased(false);
        return;
      }
      const res = await newsApi.markBiased(news._id);
      setBiasedCount(res.data.data.biasedCount);
      setUserMarkedBiased(true);
    } catch {
      Alert.alert('Error', t('feedbackError'));
    }
  };

  const hasFullContent = !!(news.fullContent && news.fullContent.length > news.paragraph.length);
  const fullBody = showFull && news.fullContent ? news.fullContent : displayText;
  const preview = buildReadMoreText(fullBody, showFull, { maxLines: 6, charsPerLine: 44 });
  const bodyText = preview.text;
  const showReadToggle = hasFullContent || preview.showToggle || showFull;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {news.imageUrl ? (
          <View style={styles.heroImageWrap}>
            <Image source={{ uri: news.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroOverlay} />
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <View style={styles.badge}><Text style={styles.badgeText}>{news.category}</Text></View>
              <Text style={styles.heading}>{news.heading}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.heroPlain}>
            <TouchableOpacity style={styles.backBtnPlain} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.badgePlain}><Text style={styles.badgeTextPlain}>{news.category}</Text></View>
            <Text style={styles.headingPlain}>{news.heading}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.source}>{news.source}</Text>
            <Text style={styles.sourceTime}>{formatDateTime(news.publishedAt)}</Text>
          </View>

          {eli5Mode && (
            <View style={styles.eli5Banner}>
              <Ionicons name="happy-outline" size={18} color={colors.orange} />
              <Text style={styles.eli5BannerText}>{t('eli5')} {t('eli5Mode')}</Text>
            </View>
          )}

          <Text style={styles.paragraph}>
            {bodyText}
            {showReadToggle ? (
              <Text style={styles.readMoreInline} onPress={() => setShowFull(!showFull)} suppressHighlighting>
                {showFull ? ` ${t('readLess')}` : ` ${t('readMore')}`}
              </Text>
            ) : null}
          </Text>

          <StoryActionBar
            actions={[
              {
                id: 'listen',
                label: speaking ? t('stop') : t('listen'),
                icon: speaking ? 'stop-circle' : 'volume-high',
                active: speaking,
                hidden: language !== 'en',
              },
              {
                id: 'eli5',
                label: t('eli5'),
                icon: 'school-outline',
                active: eli5Mode,
                loading: loadingAi === 'eli5',
              },
              {
                id: 'share',
                label: t('share'),
                icon: 'share-outline',
              },
              {
                id: 'source',
                label: t('source'),
                icon: 'open-outline',
                hidden: !news.originalLink,
              },
              {
                id: 'bias',
                label: t('bias'),
                icon: 'git-compare-outline',
                active: showBias,
                loading: loadingAi === 'bias',
                hidden: !showBiasSection,
              },
            ]}
            onPress={handleAction}
          />

          <Disclaimer />

          <View onLayout={(e) => setDeepDiveY(e.nativeEvent.layout.y)}>
            <DeepDivePanel
              data={deepDive}
              loading={loadingDeepDive}
              showTitle={false}
            />
          </View>

          {showBiasSection && showBias && (
            <View style={styles.biasBox}>
              <Text style={styles.sectionTitle}>{t('biasPerspectives')}</Text>
              <View style={styles.biasToggle}>
                <TouchableOpacity
                  style={[styles.biasTab, biasSide === 'left' && styles.biasTabActive]}
                  onPress={() => setBiasSide('left')}
                >
                  <Text style={[styles.biasTabText, biasSide === 'left' && styles.biasTabTextActive]}>{t('biasLeft')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.biasTab, biasSide === 'right' && styles.biasTabActive]}
                  onPress={() => setBiasSide('right')}
                >
                  <Text style={[styles.biasTabText, biasSide === 'right' && styles.biasTabTextActive]}>{t('biasRight')}</Text>
                </TouchableOpacity>
              </View>
              {loadingAi === 'bias' ? (
                <ActivityIndicator color={colors.orange} style={{ marginTop: 12 }} />
              ) : bias ? (
                <Text style={styles.biasText}>{biasSide === 'left' ? bias.left : bias.right}</Text>
              ) : (
                <Text style={styles.biasHint}>{t('biasTapHint')}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.biasBtn, userMarkedBiased && styles.biasBtnMarked]}
            onPress={markBiased}
          >
            <Ionicons
              name={userMarkedBiased ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={userMarkedBiased ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.biasBtnTitle}>
                {userMarkedBiased ? t('markedBiased') : t('feelsBiased')}
              </Text>
              <Text style={styles.biasBtnSub}>
                {userMarkedBiased
                  ? t('undoBiased')
                  : `${biasedCount} ${biasedCount === 1 ? t('readerFlagged') : t('readersFlagged')}`}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.commentsBox}>
            <Text style={styles.sectionTitle}>{t('comments')} ({comments.length})</Text>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={t('shareYourView')}
                placeholderTextColor={colors.textLight}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                onPress={submitComment}
                disabled={postingComment || !commentText.trim()}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {loadingEngagement ? (
              <ActivityIndicator color={colors.orange} style={{ marginTop: 12 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.noComments}>{t('beFirstComment')}</Text>
            ) : (
              comments.map((c) => (
                <View key={c._id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{c.userName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentName}>{c.userName}</Text>
                      <Text style={styles.commentTime}>{formatDateTime(c.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {news.originalLink ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(news.originalLink!)}>
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={styles.linkText}>{t('readOriginal')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroImageWrap: { height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn: {
    position: 'absolute', top: 52, left: spacing.lg,
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', zIndex: 2,
  },
  heroContent: { position: 'absolute', bottom: 24, left: spacing.lg, right: spacing.lg },
  badge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heading: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 32 },
  heroPlain: {
    backgroundColor: colors.orangeBg,
    paddingTop: 52, paddingBottom: 28, paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  backBtnPlain: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  badgePlain: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginBottom: 12,
  },
  badgeTextPlain: { fontSize: 11, fontWeight: '700', color: '#fff' },
  headingPlain: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 32 },
  body: { padding: spacing.lg, paddingBottom: 40 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  source: { fontSize: 13, fontWeight: '700', color: colors.orange },
  sourceTime: { fontSize: 12, color: colors.textMuted },
  eli5Banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.orangeLight, padding: 10, borderRadius: radius.sm, marginBottom: 12,
  },
  eli5BannerText: { fontSize: 13, fontWeight: '700', color: colors.orange },
  paragraph: { fontSize: 16, lineHeight: 27, color: colors.text, marginBottom: 16 },
  readMoreInline: { fontSize: 16, fontWeight: '800', color: colors.orange },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  biasBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef2f2', borderRadius: radius.md, padding: 14,
    marginBottom: 20, borderWidth: 1.5, borderColor: '#fecaca',
  },
  biasBtnMarked: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  biasBtnTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  biasBtnSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  biasBox: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border,
  },
  biasToggle: { flexDirection: 'row', gap: 8 },
  biasTab: {
    flex: 1, paddingVertical: 10, borderRadius: radius.sm,
    backgroundColor: colors.bg, alignItems: 'center',
  },
  biasTabActive: { backgroundColor: colors.orange },
  biasTabText: { fontWeight: '700', color: colors.textMuted },
  biasTabTextActive: { color: '#fff' },
  biasText: { marginTop: 14, fontSize: 14, lineHeight: 22, color: colors.text },
  biasHint: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  commentsBox: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  commentInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 16 },
  commentInput: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    padding: 12, fontSize: 14, color: colors.text, maxHeight: 100, backgroundColor: colors.bg,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  noComments: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  commentItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.orangeLight,
    justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: { fontWeight: '800', color: colors.orange, fontSize: 14 },
  commentName: { fontSize: 13, fontWeight: '800', color: colors.text },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  commentText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4 },
  commentTime: { fontSize: 11, color: colors.textLight, flexShrink: 0 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.orange, borderRadius: radius.full, paddingVertical: 16,
  },
  linkText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
