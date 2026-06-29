import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useLocale } from '../context/LocaleContext';

export function Disclaimer() {
  const { t } = useLocale();

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={styles.title}>{t('disclaimerTitle')}</Text>
      </View>
      <Text style={styles.text}>{t('disclaimerText')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fefce8',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '800', color: colors.text },
  text: { fontSize: 12, lineHeight: 19, color: colors.textMuted },
});
