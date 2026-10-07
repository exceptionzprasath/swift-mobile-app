import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from './Icon';

interface ForceUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  updateUrl?: string;
  theme: ThemeColors;
  isChecking?: boolean;
  onCheckAgain: () => void;
}

export function ForceUpdateModal({
  visible,
  currentVersion,
  latestVersion,
  updateUrl,
  theme,
  isChecking = false,
  onCheckAgain,
}: ForceUpdateModalProps) {
  const handleUpdatePress = async () => {
    if (!updateUrl || !updateUrl.trim()) {
      Alert.alert(
        'Update Link Pending',
        `Version ${latestVersion} is required. The download link is being configured by your administrator. Please check back shortly or contact HR support.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(updateUrl);
      if (canOpen) {
        await Linking.openURL(updateUrl);
      } else {
        // Attempt open anyway (some app store deep links return false on canOpenURL)
        await Linking.openURL(updateUrl);
      }
    } catch (e: any) {
      Alert.alert('Unable to Open Link', e?.message || 'Could not launch the update URL.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Non-dismissible: block Android back button
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Animated Header Badge */}
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '18' }]}>
            <View style={[styles.iconInnerRing, { backgroundColor: theme.primary }]}>
              <Icon name="sparkles" size={26} color="#ffffff" />
            </View>
          </View>

          {/* Heading */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Update Required
          </Text>

          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            A newer version of Creatons HR Suite is available. You must update the app to version {latestVersion} to continue.
          </Text>

          {/* Version Comparison Box */}
          <View style={[styles.versionBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <View style={styles.versionCol}>
              <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Installed</Text>
              <View style={[styles.pill, { backgroundColor: '#ef444420' }]}>
                <Text style={[styles.pillText, { color: '#ef4444' }]}>v{currentVersion || '1.0'}</Text>
              </View>
            </View>

            <View style={styles.arrowCol}>
              <Text style={[styles.arrowText, { color: theme.textMuted }]}>→</Text>
            </View>

            <View style={styles.versionCol}>
              <Text style={[styles.versionLabel, { color: theme.textMuted }]}>Required</Text>
              <View style={[styles.pill, { backgroundColor: '#10b98120' }]}>
                <Text style={[styles.pillText, { color: '#10b981' }]}>v{latestVersion || '1.1'}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: theme.primary }]}
            onPress={handleUpdatePress}
            activeOpacity={0.85}
          >
            <Icon name="check" size={18} color="#ffffff" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: theme.cardBorder }]}
            onPress={onCheckAgain}
            disabled={isChecking}
            activeOpacity={0.7}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Icon name="history" size={15} color={theme.primary} />
                <Text style={[styles.retryBtnText, { color: theme.primary }]}>Check Again</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerNotice, { color: theme.textMuted }]}>
            All account data, attendance punches, and requests will remain safe during this update.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconInnerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  versionBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
  },
  versionCol: {
    alignItems: 'center',
    gap: 4,
  },
  versionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  arrowCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '700',
  },
  updateBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  retryBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerNotice: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },
});
