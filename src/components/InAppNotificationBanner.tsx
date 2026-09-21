import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface InAppNotificationData {
  title: string;
  body: string;
  senderName?: string;
  groupSubject?: string;
  groupId?: string;
  avatarUrl?: string;
  timestamp?: string;
}

interface InAppNotificationBannerProps {
  notification: InAppNotificationData | null;
  onPress: (notification: InAppNotificationData) => void;
  onDismiss: () => void;
}

export function InAppNotificationBanner({
  notification,
  onPress,
  onDismiss,
}: InAppNotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  // Pan responder for swipe-up-to-dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          hideBanner();
        }
      },
    })
  ).current;

  const hideBanner = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  useEffect(() => {
    if (notification) {
      // Haptic nudge on notification arrive
      try {
        Vibration.vibrate(Platform.OS === 'android' ? [0, 40, 60, 40] : 50);
      } catch (e) {}

      // Reset & Animate In
      translateY.setValue(-150);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4.5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        hideBanner();
      }, 4500);
    } else {
      hideBanner();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification]);

  if (!notification) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 12 : 36);
  const displayTitle = notification.groupSubject || notification.title || 'Team Chat';
  const displaySender = notification.senderName || '';
  const displayBody = notification.body || '';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topInset + 4,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.container}
        onPress={() => {
          hideBanner();
          onPress(notification);
        }}
      >
        {/* Left Avatar / Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>💬</Text>
          </View>
          <View style={styles.onlineBadge} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.groupTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.timeText}>now</Text>
          </View>

          <Text style={styles.messageText} numberOfLines={2}>
            {displaySender ? (
              <Text style={styles.senderName}>{displaySender}: </Text>
            ) : null}
            {displayBody}
          </Text>
        </View>

        {/* Swipe / Close Indicator */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={hideBanner}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  container: {
    backgroundColor: '#111b21', // WhatsApp dark tone
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.35)', // WhatsApp Green accent border
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#075E54', // WhatsApp classic green
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#25D366',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#111b21',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  groupTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: '600',
  },
  messageText: {
    color: '#e9edef',
    fontSize: 13,
    lineHeight: 18,
  },
  senderName: {
    color: '#25D366',
    fontWeight: '600',
  },
  closeBtn: {
    marginLeft: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#8696a0',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
