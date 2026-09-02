import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, getPaletteById } from '../theme/colors';
import { Icon, IconName } from './Icon';

export type TabType = 'home' | 'attendance' | 'payroll' | 'leaves' | 'more';

interface TabBarProps {
  theme: ThemeColors;
  selectedPaletteId?: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  leavePendingCount?: number;
}

export function TabBar({
  theme,
  selectedPaletteId = 'default',
  activeTab,
  onTabChange,
  leavePendingCount = 1,
}: TabBarProps) {
  let bottomInset = 0;
  try {
    const insets = useSafeAreaInsets();
    bottomInset = insets?.bottom || 0;
  } catch (e) {}

  const safeBottomMargin = Math.max(bottomInset, 12) + 14;
  const darkBgColor = getPaletteById(selectedPaletteId).hexes[0];


  const tabs: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'attendance', label: 'Attendance', icon: 'clock' },
    { id: 'payroll', label: 'Payroll', icon: 'payroll' },
    { id: 'leaves', label: 'Leaves', icon: 'leaves' },
    { id: 'more', label: 'More', icon: 'apps' },
  ];

  const [containerWidth, setContainerWidth] = useState(0);
  const [tabLayouts, setTabLayouts] = useState<{ [key: number]: { x: number; width: number } }>({});
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const animIndex = useRef(new Animated.Value(activeIndex)).current;
  const popAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabLayout = (index: number, e: any) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => ({
      ...prev,
      [index]: { x, width },
    }));
  };

  useEffect(() => {
    // Clear any previous hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Animate to new tab and show popup with bounce
    Animated.parallel([
      Animated.spring(animIndex, {
        toValue: activeIndex,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(popAnim, {
          toValue: 0.82,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(popAnim, {
          toValue: 1,
          friction: 4,
          tension: 160,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-hide popup after 2 seconds (2000ms)
    hideTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(popAnim, {
          toValue: 0.75,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [activeIndex]);

  const numTabs = tabs.length;
  const INDICATOR_SIZE = 50;
  const popupWidth = 84;
  const tabSlotWidth = containerWidth > 0 ? containerWidth / numTabs : 66;

  const translateX = animIndex.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => {
      const layout = tabLayouts[i];
      if (layout && layout.width > 0) {
        return layout.x + (layout.width - INDICATOR_SIZE) / 2;
      }
      return i * tabSlotWidth + (tabSlotWidth - INDICATOR_SIZE) / 2;
    }),
  });

  const popupTranslateX = animIndex.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => {
      const layout = tabLayouts[i];
      if (layout && layout.width > 0) {
        return layout.x + (layout.width - popupWidth) / 2;
      }
      return i * tabSlotWidth + (tabSlotWidth - popupWidth) / 2;
    }),
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        {
          bottom: safeBottomMargin,
        },
      ]}
    >
      <View
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={[
          styles.floatingContainer,
          {
            backgroundColor: darkBgColor,
            borderColor: 'rgba(255, 255, 255, 0.15)',
          },
        ]}
      >
        {/* Animated Floating Popup for Selected Tab Icon Name (Auto-hides after 2s) */}
        {containerWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePopupContainer,
              {
                opacity: opacityAnim,
                transform: [
                  { translateX: popupTranslateX },
                  { scale: popAnim },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.activePopupPill,
                {
                  backgroundColor: darkBgColor,
                  borderColor: 'rgba(255, 255, 255, 0.24)',
                },
              ]}
            >
              <Text style={styles.activePopupText} numberOfLines={1}>
                {tabs[activeIndex]?.label || 'Home'}
              </Text>
            </View>
            {/* Downward Pointer Beak */}
            <View
              style={[
                styles.activePopupBeak,
                {
                  borderTopColor: darkBgColor,
                },
              ]}
            />
          </Animated.View>
        )}


        {/* Animated Sliding White Circle Indicator */}
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingActiveIndicator,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        {/* Tab Items */}
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onLayout={(e) => handleTabLayout(index, e)}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCenterWrapper}>
                <Icon
                  name={tab.icon}
                  size={22}
                  color={isActive ? darkBgColor : 'rgba(255, 255, 255, 0.72)'}
                />
                {tab.id === 'leaves' && leavePendingCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: '#f59e0b',
                        borderColor: isActive ? '#ffffff' : darkBgColor,
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>{leavePendingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  floatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 32,
    borderWidth: 1.5,
    paddingVertical: 0,
    paddingHorizontal: 8,
    height: 64,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  activePopupContainer: {
    position: 'absolute',
    top: -34,
    left: -2,
    width: 84,
    alignItems: 'center',
    zIndex: 1000,
  },
  activePopupPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
  },
  activePopupText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  activePopupBeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -0.5,
  },
  slidingActiveIndicator: {
    position: 'absolute',
    top: 5,
    left: -2,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  iconCenterWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});





