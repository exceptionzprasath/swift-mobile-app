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

export function TabBar({ theme, activeTab, onTabChange, leavePendingCount = 0 }: TabBarProps) {
  const tabs: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'attendance', label: 'Attendance', icon: 'clock' },
    { id: 'payroll', label: 'Payroll', icon: 'payroll' },
    { id: 'leaves', label: 'Leaves', icon: 'leaves' },
    { id: 'more', label: 'Apps', icon: 'apps' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.tabBarBg, borderTopColor: theme.tabBarBorder }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconColor = isActive ? theme.primary : theme.textMuted;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, isActive && { backgroundColor: theme.tealSoft }]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={{ alignItems: 'center' }}>
              <Icon name={tab.icon} size={20} color={iconColor} />
              {tab.id === 'leaves' && leavePendingCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.warning }]}>
                  <Text style={styles.badgeText}>{leavePendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: theme.textMuted }, isActive && { color: theme.primary, fontWeight: '800' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 8,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
