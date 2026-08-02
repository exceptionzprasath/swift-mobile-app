import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from './Icon';

interface HeaderProps {
  theme: ThemeColors;
  employeeName?: string;
  companyName?: string;
  unreadCount?: number;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onToggleTheme: () => void;
}

export function Header({
  theme,
  employeeName = 'Alex Mercer',
  companyName = 'SWIFT Demo Pvt Ltd',
  unreadCount = 3,
  onNotificationPress,
  onProfilePress,
  onToggleTheme,
}: HeaderProps) {
  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.cardBorder }]}>
      <TouchableOpacity style={styles.leftSection} onPress={onProfilePress} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primary, borderColor: theme.accent }]}>
          <Text style={styles.avatarText}>{employeeName.charAt(0)}</Text>
        </View>
        <View>
          <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>Hello, {employeeName}</Text>
          <Text style={[styles.companyText, { color: theme.textMuted }]}>{companyName}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.rightSection}>
        {/* Theme Switcher Toggle */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
          onPress={onToggleTheme}
          activeOpacity={0.7}
        >
          <Icon name={theme.isDark ? 'sun' : 'moon'} size={18} color={theme.primary} />
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Icon name="bell" size={18} color={theme.textPrimary} />
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.danger, borderColor: theme.headerBg }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SWIFT Emblem */}
        <View style={[styles.swiftMiniLogo, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}>
          <Text style={[styles.swiftLogoText, { color: theme.accent }]}>S</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  companyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  swiftMiniLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  swiftLogoText: {
    fontSize: 18,
    fontWeight: '900',
  },
});
