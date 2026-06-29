import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Dev mock — replace with real Google Sign-In when client IDs are configured
      await login('dev-mock-token');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.pattern} />
        <Text style={styles.logo}>BriefNews</Text>
        <Text style={styles.tagline}>Stay Informed. Save Time.</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.previewCard}>
          <View style={styles.featureIcon}>
            <Ionicons name="newspaper-outline" size={28} color={colors.orange} />
          </View>
          <Text style={styles.previewHeading}>Smart News Briefs</Text>
          <Text style={styles.previewPara}>
            Read the most important headlines with quick AI summaries and direct links to the original articles.
          </Text>
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>Mobile OTP login coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.orangeBg,
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: 'transparent',
  },
  logo: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm, lineHeight: 24 },
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  previewPara: { fontSize: 14, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  googleIcon: { width: 22, height: 22 },
  googleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  note: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.textLight },
});
