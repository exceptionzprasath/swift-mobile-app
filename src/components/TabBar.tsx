import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon, IconName } from './Icon';

export type TabType = 'home' | 'attendance' | 'payroll' | 'leaves' | 'more';

interface TabBarProps {
  theme: ThemeColors;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  leavePendingCount?: number;
}

export function TabBar({ theme, activeTab, onTabChange, leavePendingCount = 1 }: TabBarProps) {
  const tabs: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'attendance', label: 'Attendance', icon: 'clock' },
    { id: 'payroll', label: 'Payroll', icon: 'payroll' },
    { id: 'leaves', label: 'Leaves', icon: 'leaves' },
    { id: 'more', label: 'More', icon: 'apps' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.tabBarBg, borderTopColor: theme.tabBarBorder }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconColor = isActive ? (theme.isDark ? '#38bdf8' : theme.primary) : theme.textMuted;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              isActive && {
                backgroundColor: theme.isDark ? 'rgba(2, 132, 199, 0.18)' : '#e0f2fe',
                borderColor: theme.isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd',
                borderWidth: 1,
              },
            ]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.75}
          >
            <View style={{ alignItems: 'center' }}>
              <Icon name={tab.icon} size={20} color={iconColor} />
              {tab.id === 'leaves' && leavePendingCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#f59e0b', borderColor: theme.tabBarBg }]}>
                  <Text style={styles.badgeText}>{leavePendingCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: theme.textMuted },
                isActive && { color: theme.isDark ? '#ffffff' : theme.primary, fontWeight: '800' },
              ]}
            >
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeLine, { backgroundColor: theme.isDark ? '#38bdf8' : theme.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 62,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  activeLine: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
