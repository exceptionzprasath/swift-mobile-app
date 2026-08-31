import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from './Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const BANNER_HEIGHT = 175;

export interface MobileBannerItem {
  id: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  tagline?: string;
  ctaText?: string;
  ctaLink?: string;
  active?: boolean;
  hideTextOverlay?: boolean;
  hideActionButton?: boolean;
  zoomLevel?: number;
  imageFit?: 'cover' | 'contain' | 'fill';
}

interface HomeHeroBannerCarouselProps {
  theme: ThemeColors;
  bannerConfig?: {
    enabled?: boolean;
    autoScrollSeconds?: number;
    showTextOverlay?: boolean;
    showActionButton?: boolean;
    hasBorderRadius?: boolean;
    zoomLevel?: number;
    imageFit?: 'cover' | 'contain' | 'fill';
    banners?: MobileBannerItem[];
  };
  onNavigate?: (tab: any) => void;
}

export function HomeHeroBannerCarousel({
  theme,
  bannerConfig,
  onNavigate,
}: HomeHeroBannerCarouselProps) {
  const isEnabled = bannerConfig?.enabled ?? true;
  const autoScrollSeconds = bannerConfig?.autoScrollSeconds || 5;
  const hasBorderRadius = bannerConfig?.hasBorderRadius ?? true;
  const globalShowText = bannerConfig?.showTextOverlay ?? true;
  const globalShowActionButton = bannerConfig?.showActionButton ?? true;

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isInteractingRef = useRef(false);

  const slides = useMemo<MobileBannerItem[]>(() => {
    const customBanners = (bannerConfig?.banners || []).filter((b) => b.active !== false);
    if (customBanners.length > 0) return customBanners;

    return [
      {
        id: 'default-slide-1',
        imageUrl: '',
        title: 'A PEOPLE-FIRST WORKPLACE',
        subtitle: 'Where People Grow, Businesses Thrive.',
        tagline: 'Smarter HR | Stronger Teams',
        ctaText: 'Explore Journey',
        ctaLink: 'profile',
        active: true,
      },
      {
        id: 'default-slide-2',
        imageUrl: '',
        title: 'EMPOWERING MODERN TEAMS',
        subtitle: 'Instant Approvals, Smart Attendance & Fast Leaves.',
        tagline: 'Speed | Precision | Transparency',
        ctaText: 'View Approvals',
        ctaLink: 'requests',
        active: true,
      },
      {
        id: 'default-slide-3',
        imageUrl: '',
        title: 'INTELLIGENT WORKFORCE HUB',
        subtitle: 'Verified Shifts, Automated Payroll & Live Compliance.',
        tagline: 'Engage | Enable | Excel',
        ctaText: 'Attendance Hub',
        ctaLink: 'attendance',
        active: true,
      },
    ];
  }, [bannerConfig]);

  // Auto-scroll loop
  useEffect(() => {
    if (!isEnabled || slides.length <= 1) return;

    const intervalMs = Math.max(2, autoScrollSeconds) * 1000;
    const timer = setInterval(() => {
      if (isInteractingRef.current) return;
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isEnabled, autoScrollSeconds, slides.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / BANNER_WIDTH);
    if (index >= 0 && index < slides.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleCtaPress = (item: MobileBannerItem) => {
    if (!onNavigate) return;
    const link = (item.ctaLink || '').toLowerCase();
    if (link.includes('attend')) onNavigate('attendance');
    else if (link.includes('leave')) onNavigate('leaves');
    else if (link.includes('pay') || link.includes('salary')) onNavigate('payroll');
    else if (link.includes('request') || link.includes('approval') || link.includes('loan')) onNavigate('requests');
    else if (link.includes('doc')) onNavigate('documents');
    else if (link.includes('holiday')) onNavigate('holidays');
    else if (link.includes('profile') || link.includes('org')) onNavigate('profile');
    else onNavigate('attendance');
  };

  if (!isEnabled || slides.length === 0) return null;

  const borderRadiusVal = hasBorderRadius ? 20 : 0;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item, index) => item.id || String(index)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => {
          isInteractingRef.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            isInteractingRef.current = false;
          }, 3000);
        }}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH,
          offset: BANNER_WIDTH * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const showText = globalShowText && !item.hideTextOverlay;
          const showAction = globalShowActionButton && !item.hideActionButton;
          const hasImage = Boolean(item.imageUrl && item.imageUrl.trim().length > 0);
          const zoomScale = ((item.zoomLevel ?? bannerConfig?.zoomLevel ?? 100) / 100);
          const resizeMode = item.imageFit === 'contain' ? 'contain' : item.imageFit === 'fill' ? 'stretch' : 'cover';

          // Gradient color presets for background fallback
          const bgGradients = [
            ['#0f766e', '#134e4a', '#042f2e'],
            ['#0369a1', '#075985', '#082f49'],
            ['#4338ca', '#3730a3', '#1e1b4b'],
            ['#b45309', '#78350f', '#451a03'],
          ];
          const bgPair = bgGradients[index % bgGradients.length];

          return (
            <View
              style={[
                styles.bannerSlide,
                {
                  width: BANNER_WIDTH,
                  borderRadius: borderRadiusVal,
                  backgroundColor: bgPair[0],
                },
              ]}
            >
              {/* Background S3 Image (if provided) */}
              {hasImage ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={[
                    styles.bannerImage,
                    {
                      borderRadius: borderRadiusVal,
                      transform: [{ scale: zoomScale }],
                    },
                  ]}
                  resizeMode={resizeMode}
                />
              ) : (
                /* Fallback Graphic Gradient Surface */
                <View
                  style={[
                    styles.fallbackBg,
                    {
                      backgroundColor: bgPair[1],
                      borderRadius: borderRadiusVal,
                    },
                  ]}
                >
                  <View style={[styles.glowOrb, { backgroundColor: theme.primary, opacity: 0.25 }]} />
                  <View style={[styles.glowOrbSmall, { backgroundColor: theme.accent || '#f97316', opacity: 0.2 }]} />
                </View>
              )}

              {/* Dark Gradient Overlay for Readability */}
              {showText && (
                <View
                  style={[
                    styles.scrimOverlay,
                    {
                      borderRadius: borderRadiusVal,
                    },
                  ]}
                />
              )}

              {/* Text & Content Overlay */}
              {showText && (
                <View style={styles.textContainer}>
                  {Boolean(item.tagline) && (
                    <View style={styles.taglineBadge}>
                      <View style={styles.taglineDot} />
                      <Text style={styles.taglineText} numberOfLines={1}>
                        {item.tagline}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.slideTitle} numberOfLines={2}>
                    {item.title || 'SWIFT ENTERPRISE'}
                  </Text>

                  {Boolean(item.subtitle) && (
                    <Text style={styles.slideSubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  )}

                  {/* CTA Action Button */}
                  {showAction && (
                    <TouchableOpacity
                      style={[
                        styles.ctaButton,
                        {
                          backgroundColor: theme.primary,
                          borderRadius: hasBorderRadius ? 12 : 0,
                        },
                      ]}
                      onPress={() => handleCtaPress(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.ctaText}>
                        {item.ctaText || 'Explore'}
                      </Text>
                      <Icon name="chevron-right" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Pagination Dots Indicator */}
      {slides.length > 1 && (
        <View style={styles.paginationContainer}>
          {slides.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setActiveIndex(idx);
                  flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                }}
                activeOpacity={0.7}
                style={[
                  styles.dot,
                  isActive
                    ? [styles.activeDot, { backgroundColor: theme.primary }]
                    : [styles.inactiveDot, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)' }],
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  bannerSlide: {
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fallbackBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  glowOrbSmall: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  scrimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  textContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  taglineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34d399',
  },
  taglineText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 20,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  slideSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 8,
    maxWidth: '90%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
  },
  inactiveDot: {
    width: 6,
  },
});
