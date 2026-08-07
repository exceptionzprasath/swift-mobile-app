import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { ThemeColors } from '../theme/colors';

interface SplashViewProps {
  theme?: ThemeColors;
  onFinish: () => void;
}

export function SplashView({ onFinish }: SplashViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.12)).current;

  useEffect(() => {
    // Smooth dual scale-down & fade-in entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 2500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <Animated.Image
      source={require('../assets/swift.png')}
      style={[
        styles.bgImage,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
