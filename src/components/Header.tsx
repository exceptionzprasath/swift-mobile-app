import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemeColors, getPaletteById } from '../theme/colors';
import { Icon } from './Icon';

interface HeaderProps {
  theme: ThemeColors;
  selectedPaletteId?: string;
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
  selectedPaletteId = 'default',
  employeeName = 'Yuji',
  profilePhoto,
  companyName = 'SWIFT Demo Pvt Ltd',
  unreadCount = 3,
  onNotificationPress,
  onProfilePress,
  onMenuPress,
}: HeaderProps) {
  const initial = employeeName.charAt(0).toUpperCase();
  const darkBgColor = getPaletteById(selectedPaletteId).hexes[0];

  return (
    <View style={[styles.headerContainer, { backgroundColor: darkBgColor, borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
      {/* Left: Hamburger Drawer Menu Button & Avatar Greeting */}
      <View style={styles.leftSection}>
        {onMenuPress && (
          <TouchableOpacity
            style={[styles.menuBtn, { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={onMenuPress}
            activeOpacity={0.75}
          >
            <Icon name="menu" size={18} color="#ffffff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.profileSection} onPress={onProfilePress} activeOpacity={0.85}>
          <View style={[styles.avatarGlowRing, { borderColor: theme.primaryLight || '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: theme.primaryLight || '#ffffff' }]}>
                <Text style={[styles.avatarText, { color: darkBgColor }]}>{initial}</Text>
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.welcomeText, { color: '#ffffff' }]} numberOfLines={1}>
              {employeeName}
            </Text>
            <Text style={[styles.companyText, { color: 'rgba(255, 255, 255, 0.72)' }]} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Right: Notifications & Brand Box */}
      <View style={styles.rightSection}>
        {/* Notification Bell */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
          onPress={onNotificationPress}
          activeOpacity={0.75}
        >
          <Icon name="bell" size={18} color="#ffffff" />
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: '#ef4444', borderColor: darkBgColor }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* SWIFT Brand Logo (Transparent & Enlarged) */}
        <View style={styles.brandBox}>
          <Image
            source={require('../assets/swift-logo.png')}
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
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '800',
  },
  companyText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,

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
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
  logoImage: {
    width: 64,
    height: 44,
  },
});
