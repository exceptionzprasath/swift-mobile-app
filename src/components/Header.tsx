import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from './Icon';

interface HeaderProps {
  theme: ThemeColors;
  employeeName?: string;
  profilePhoto?: string;
  companyName?: string;
  unreadCount?: number;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onMenuPress?: () => void;
}

export function Header({
  theme,
  employeeName = 'Yuji',
  profilePhoto,
  companyName = 'SWIFT Demo Pvt Ltd',
  unreadCount = 3,
  onNotificationPress,
  onProfilePress,
  onMenuPress,
}: HeaderProps) {
  const initial = employeeName.charAt(0).toUpperCase();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.cardBorder }]}>
      {/* Left: Hamburger Drawer Menu Button & Avatar Greeting */}
      <View style={styles.leftSection}>
        {onMenuPress && (
          <TouchableOpacity
            style={[styles.menuBtn, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)', borderColor: theme.cardBorder }]}
            onPress={onMenuPress}
            activeOpacity={0.75}
          >
            <Icon name="menu" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.profileSection} onPress={onProfilePress} activeOpacity={0.85}>
          <View style={[styles.avatarGlowRing, { borderColor: theme.primary, backgroundColor: theme.isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe' }]}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.welcomeText, { color: theme.textPrimary }]} numberOfLines={1}>
              {employeeName}
            </Text>
            <Text style={[styles.companyText, { color: theme.textMuted }]} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Right: Notifications & Brand Box */}
      <View style={styles.rightSection}>
        {/* Notification Bell */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)', borderColor: theme.cardBorder }]}
          onPress={onNotificationPress}
          activeOpacity={0.75}
        >
          <Icon name="bell" size={18} color={theme.textPrimary} />
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.danger, borderColor: theme.headerBg }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SWIFT Brand Card Box */}
        <View style={[styles.brandBox, { backgroundColor: theme.isDark ? '#020617' : '#0f172a', borderColor: theme.cardBorder }]}>
          <Image
            source={require('../assets/logo-swift.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
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
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarGlowRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  companyText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  brandBox: {
    width: 52,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logoImage: {
    width: 44,
    height: 28,
  },
});
