import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from './Icon';

const { width } = Dimensions.get('window');

interface SplashViewProps {
  theme: ThemeColors;
  onFinish: () => void;
}

export function SplashView({ theme, onFinish }: SplashViewProps) {
  const [progress, setProgress] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* SWIFT Logo Emblem */}
        <View style={[styles.logoRing, { borderColor: theme.primaryLight, backgroundColor: theme.tealSoft }]}>
          <View style={[styles.logoInner, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoTextBold}>SWIFT</Text>
            <Text style={[styles.logoTextSub, { color: theme.accent }]}>HRMS</Text>
          </View>
        </View>

        <Text style={[styles.appTitle, { color: theme.textPrimary }]}>SWIFT HRMS</Text>
        <Text style={[styles.appTagline, { color: theme.textMuted }]}>Enterprise Employee Portal</Text>

        <View style={styles.featurePills}>
          <View style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Icon name="clock" size={14} color={theme.primary} />
            <Text style={[styles.pillText, { color: theme.textPrimary }]}>Attendance</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Icon name="payroll" size={14} color={theme.cyan} />
            <Text style={[styles.pillText, { color: theme.textPrimary }]}>Payroll</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Icon name="leaves" size={14} color={theme.accent} />
            <Text style={[styles.pillText, { color: theme.textPrimary }]}>Leaves</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.cardBorder }]}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading Workspace... {progress}%
        </Text>
      </Animated.View>

      <TouchableOpacity style={styles.skipBtn} onPress={onFinish}>
        <Text style={[styles.skipText, { color: theme.primary }]}>Skip</Text>
        <Icon name="chevron-right" size={14} color={theme.primary} />
      </TouchableOpacity>

      <Text style={[styles.footerText, { color: theme.textMuted }]}>Powered by SWIFT AI • v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.md,
  },
  logoInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTextBold: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoTextSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 14,
    marginBottom: 24,
    fontWeight: '500',
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 36,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 6,
    width: width * 0.7,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 12,
  },
  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    fontSize: 11,
  },
});
