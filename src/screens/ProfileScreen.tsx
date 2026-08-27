import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { useAppContext } from '../context/AppContext';

interface ProfileScreenProps {
  theme: ThemeColors;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function ProfileScreen({ theme, onToggleTheme, onLogout }: ProfileScreenProps) {
  const { currentUser, companyConfig } = useAppContext();
  const [faceModalVisible, setFaceModalVisible] = useState(false);

  const isFaceEnrolled = Boolean(currentUser?.faceRegistered || (currentUser?.photoDataUrl && currentUser.photoDataUrl.startsWith('http')));

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out of SWIFT HRMS?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const initial = currentUser?.name ? currentUser.name.charAt(0) : 'E';
  const branches = companyConfig?.branches || [];
  const assignedBranches = branches.filter((b: any) => (currentUser?.branchIds?.includes(b.id) || b.id === currentUser?.branchId));
  const branchNameDisplay = assignedBranches.length > 0
    ? assignedBranches.map((b: any) => `${b.name} (${b.code})`).join(', ')
    : (branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'Head Office');

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatarLarge, { backgroundColor: theme.primary, borderColor: theme.accent, overflow: 'hidden' }]}>
          {currentUser?.photoDataUrl ? (
            <Image source={{ uri: currentUser.photoDataUrl }} style={styles.avatarImageLarge} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{currentUser?.name || 'Employee'}</Text>
        <Text style={[styles.role, { color: theme.textMuted }]}>{currentUser?.designation || 'Team Member'}</Text>
        <View style={[styles.empIdTag, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
          <Text style={[styles.empIdText, { color: theme.primary }]}>
            ID: {currentUser?.empCode || currentUser?.code || currentUser?.id || 'EMP-001'} • Full-Time
          </Text>
        </View>

        {/* Biometric Quick Registration Pill */}
        <TouchableOpacity
          style={[
            styles.updateFaceBtn,
            {
              backgroundColor: isFaceEnrolled ? (theme.isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff') : (theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7'),
              borderColor: isFaceEnrolled ? theme.primary : theme.warning,
            },
          ]}
          onPress={() => setFaceModalVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="camera" size={13} color={isFaceEnrolled ? theme.primary : '#d97706'} />
          <Text style={[styles.updateFaceText, { color: isFaceEnrolled ? theme.primary : '#d97706' }]}>
            {isFaceEnrolled ? 'Update Face Biometric' : 'Register Face Biometric Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Work Information Card */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Work & Organization</Text>
      <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Department</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.department || 'General'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Assigned Branches</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{branchNameDisplay}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Current Shift</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.shift || 'Regular Shift (09:00 AM - 06:00 PM)'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Reporting Manager</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.reportingManager || 'HR Administrator'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Date of Joining</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.joiningDate || currentUser?.doj || 'Active'}</Text>
        </View>
      </View>

      {/* Personal & Financial Details Card */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personal & Bank Details</Text>
      <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Work Email</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.email || 'employee@swift.ai'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Mobile Number</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.phone || '+91 98765 43210'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Salary Bank</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.bankAccount || (currentUser?.bankAcc ? `Bank A/C: ${currentUser.bankAcc}` : 'Registered Bank Account')}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>PAN Card</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.panNumber || currentUser?.pan || 'Verified'}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>PF UAN No</Text>
          <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{(currentUser as any)?.uan || '100987654321'}</Text>
        </View>
      </View>

      {/* App Preferences */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>App Preferences</Text>
      <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={theme.isDark ? 'moon' : 'sun'} size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>App Theme Mode</Text>
          </View>
          <Text style={[styles.settingVal, { color: theme.primary }]}>
            {theme.isDark ? 'Dark Mode' : 'Light Mode (Default)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
          onPress={() => setFaceModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="camera" size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Biometric Face ID Punch</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.settingVal, { color: isFaceEnrolled ? theme.success : '#d97706' }]}>
              {isFaceEnrolled ? 'Enrolled ✓' : 'Pending ⚠️'}
            </Text>
            <Icon name="chevron-right" size={12} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]} onPress={handleLogoutPress} activeOpacity={0.8}>
        <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Log Out of Account</Text>
      </TouchableOpacity>

      {/* Face Biometric Enrollment Modal */}
      <FaceRegistrationModal
        visible={faceModalVisible}
        onClose={() => setFaceModalVisible(false)}
        theme={theme}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.md,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  avatarImageLarge: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
  },
  role: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  empIdTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  empIdText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  updateFaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  updateFaceText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
