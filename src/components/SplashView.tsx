import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ImageBackground,
  Image,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
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
    <ImageBackground
      source={require('../assets/swift.png')}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Dark Ambient Overlay */}
      <View style={styles.overlay} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Glassmorphism Frosted Container */}
        <View style={styles.glassCard}>

          {/* SWIFT Logo */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../assets/logo-swift.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appTagline}>Enterprise Employee Portal</Text>
          </View>

          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={styles.pill}>
              <Icon name="clock" size={14} color="#38bdf8" />
              <Text style={styles.pillText}>Attendance</Text>
            </View>
            <View style={styles.pill}>
              <Icon name="payroll" size={14} color="#34d399" />
              <Text style={styles.pillText}>Payroll</Text>
            </View>
            <View style={styles.pill}>
              <Icon name="leaves" size={14} color="#fbbf24" />
              <Text style={styles.pillText}>Leaves</Text>
            </View>
          </View>

          {/* Loading Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.loadingText}>
            Loading Workspace... {progress}%
          </Text>

        </View>
      </Animated.View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipBtn} onPress={onFinish} activeOpacity={0.8}>
        <Text style={styles.skipText}>Skip</Text>
        <Icon name="chevron-right" size={14} color="#ffffff" />
      </TouchableOpacity>

      <Text style={styles.footerText}>Powered by SWIFT AI • v1.0.0</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 7, 18, 0.55)',
  },
  content: {
    alignItems: 'center',
    width: '90%',
    maxWidth: 420,
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 220,
    height: 70,
    marginBottom: 6,
  },
  appTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
});
