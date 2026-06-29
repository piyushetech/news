import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../theme';

export type ActionId = 'listen' | 'readMore' | 'eli5' | 'deepDive' | 'source' | 'bias' | 'share';

interface Action {
  id: ActionId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  loading?: boolean;
  hidden?: boolean;
}

interface Props {
  actions: Action[];
  onPress: (id: ActionId) => void;
}

const COLS = 3;
const GAP = 6;
const BAR_PADDING = 8;

export function StoryActionBar({ actions, onPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const visible = actions.filter((a) => !a.hidden);

  // Body horizontal padding on DetailScreen is spacing.lg (24) each side
  const barInnerWidth = screenWidth - spacing.lg * 2 - BAR_PADDING * 2 - 2;
  const chipWidth = (barInnerWidth - GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {visible.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.chip,
              { width: chipWidth },
              action.active && styles.chipActive,
            ]}
            onPress={() => onPress(action.id)}
            disabled={action.loading}
            activeOpacity={0.75}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={action.active ? '#fff' : colors.orange} />
            ) : (
              <Ionicons
                name={action.icon}
                size={14}
                color={action.active ? '#fff' : colors.orange}
              />
            )}
            <Text
              style={[styles.chipText, action.active && styles.chipTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...shadows.card,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    padding: BAR_PADDING,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 10, fontWeight: '700', color: colors.orange, flexShrink: 1 },
  chipTextActive: { color: '#fff' },
});
