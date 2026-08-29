import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { useAppContext, EmployeeDocument, FamilyMember, EducationEntry, ExperienceEntry } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  theme: ThemeColors;
  onToggleTheme: () => void;
  onLogout: () => void;
}

type ProfileSectionTab = 'work' | 'personal' | 'statutory' | 'history' | 'documents';

export function ProfileScreen({ theme, onToggleTheme, onLogout }: ProfileScreenProps) {
  const { currentUser, companyConfig, refreshData } = useAppContext();
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>('work');
  const [faceModalVisible, setFaceModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMaskedData, setShowMaskedData] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (err) {
      console.warn('[ProfileScreen] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

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

  const initial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'E';
  const branches = companyConfig?.branches || [];
  const assignedBranches = branches.filter((b: any) => (currentUser?.branchIds?.includes(b.id) || b.id === currentUser?.branchId));
  const branchNameDisplay = assignedBranches.length > 0
    ? assignedBranches.map((b: any) => `${b.name} (${b.code || 'Main'})`).join(', ')
    : (branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'Head Office');

  // Format full address from real-time profile fields
  const fullAddressDisplay = currentUser?.address || [
    currentUser?.addressLine1,
    currentUser?.addressLine2,
    currentUser?.city,
    currentUser?.state,
    currentUser?.pincode ? `- ${currentUser.pincode}` : '',
    currentUser?.country,
  ].filter(Boolean).join(', ') || 'Registered Address';

  const familyList: FamilyMember[] = Array.isArray(currentUser?.family) ? currentUser.family : [];
  const educationList: EducationEntry[] = Array.isArray(currentUser?.education) ? currentUser.education : [];
  const experienceList: ExperienceEntry[] = Array.isArray(currentUser?.experience) ? currentUser.experience : [];
  const documentsList: EmployeeDocument[] = Array.isArray(currentUser?.documentsUploaded) ? currentUser.documentsUploaded : [];
  const skillsList: string[] = Array.isArray(currentUser?.skills) ? currentUser.skills : [];
  const languagesList: string[] = Array.isArray(currentUser?.languagesKnown) ? currentUser.languagesKnown : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      {/* Profile Header Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.headerTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', borderColor: '#10b981' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.statusText, { color: theme.isDark ? '#4ade80' : '#15803d' }]}>
              {currentUser?.status ? currentUser.status.toUpperCase() : 'ACTIVE'} • FULL-TIME
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshChip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Icon name="history" size={12} color={theme.primary} />
            <Text style={[styles.refreshText, { color: theme.primary }]}>Realtime Sync</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarLarge, { backgroundColor: theme.primary, borderColor: theme.cardBorder }]}
            onPress={() => setFaceModalVisible(true)}
            activeOpacity={0.85}
          >
            {currentUser?.photoDataUrl ? (
              <Image source={{ uri: currentUser.photoDataUrl }} style={styles.avatarImageLarge} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
              <Icon name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: theme.textPrimary }]}>{currentUser?.name || 'Employee'}</Text>
          <Text style={[styles.role, { color: theme.textMuted }]}>
            {currentUser?.designation || 'Team Member'} • <Text style={{ color: theme.primary, fontWeight: '700' }}>{currentUser?.department || 'General'}</Text>
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.empIdTag, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Icon name="shield" size={12} color={theme.primary} />
              <Text style={[styles.empIdText, { color: theme.textPrimary }]}>
                ID: {currentUser?.empCode || currentUser?.code || currentUser?.id || 'EMP'}
              </Text>
            </View>

            {currentUser?.bloodGroup ? (
              <View style={[styles.empIdTag, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.empIdText, { color: '#dc2626', fontWeight: '800' }]}>
                  🩸 {currentUser.bloodGroup}
                </Text>
              </View>
            ) : null}

            {currentUser?.gender ? (
              <View style={[styles.empIdTag, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Text style={[styles.empIdText, { color: theme.textMuted, textTransform: 'capitalize' }]}>
                  {currentUser.gender}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Verification Status Highlights Bar */}
        <View style={[styles.verifyHighlightsBar, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.verifyItem}
            onPress={() => setFaceModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.verifyIconCircle, { backgroundColor: isFaceEnrolled ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7') }]}>
              <Icon name={isFaceEnrolled ? 'check' : 'camera'} size={12} color={isFaceEnrolled ? '#16a34a' : '#d97706'} />
            </View>
            <Text style={[styles.verifyLabel, { color: theme.textMuted }]}>Face ID</Text>
            <Text style={[styles.verifyStatus, { color: isFaceEnrolled ? '#16a34a' : '#d97706' }]}>
              {isFaceEnrolled ? 'Enrolled' : 'Pending'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.verifyDivider, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.verifyItem}>
            <View style={[styles.verifyIconCircle, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
              <Icon name="document" size={12} color="#16a34a" />
            </View>
            <Text style={[styles.verifyLabel, { color: theme.textMuted }]}>Onboarding</Text>
            <Text style={[styles.verifyStatus, { color: '#16a34a' }]}>
              {documentsList.length > 0 ? 'Verified' : 'Active'}
            </Text>
          </View>

          <View style={[styles.verifyDivider, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.verifyItem}>
            <View style={[styles.verifyIconCircle, { backgroundColor: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7') }]}>
              <Icon name="wallet" size={12} color={(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706'} />
            </View>
            <Text style={[styles.verifyLabel, { color: theme.textMuted }]}>Bank Linked</Text>
            <Text style={[styles.verifyStatus, { color: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706' }]}>
              {(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? 'Active' : 'Unlinked'}
            </Text>
          </View>

          <View style={[styles.verifyDivider, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.verifyItem}>
            <View style={[styles.verifyIconCircle, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
              <Icon name="shield" size={12} color="#16a34a" />
            </View>
            <Text style={[styles.verifyLabel, { color: theme.textMuted }]}>Compliance</Text>
            <Text style={[styles.verifyStatus, { color: '#16a34a' }]}>
              {currentUser?.backgroundCheckStatus === 'clear' || currentUser?.policeVerification ? 'Clear' : 'Verified'}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Segment Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'work' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setActiveTab('work')}
        >
          <Icon name="home" size={13} color={activeTab === 'work' ? '#ffffff' : theme.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'work' ? '#ffffff' : theme.textMuted }]}>
            Work & Org
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'personal' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setActiveTab('personal')}
        >
          <Icon name="user" size={13} color={activeTab === 'personal' ? '#ffffff' : theme.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'personal' ? '#ffffff' : theme.textMuted }]}>
            Personal & Address
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'statutory' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setActiveTab('statutory')}
        >
          <Icon name="wallet" size={13} color={activeTab === 'statutory' ? '#ffffff' : theme.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'statutory' ? '#ffffff' : theme.textMuted }]}>
            Bank & Statutory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setActiveTab('history')}
        >
          <Icon name="calendar" size={13} color={activeTab === 'history' ? '#ffffff' : theme.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'history' ? '#ffffff' : theme.textMuted }]}>
            Education & Exp
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'documents' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setActiveTab('documents')}
        >
          <Icon name="document" size={13} color={activeTab === 'documents' ? '#ffffff' : theme.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'documents' ? '#ffffff' : theme.textMuted }]}>
            Documents ({documentsList.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* TAB CONTENT: Work & Organization */}
      {activeTab === 'work' && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Employment & Organization</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Company</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.companyName || companyConfig?.companyName || 'SWIFT HRMS'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Department</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.department || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Designation</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.designation || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Assigned Branches</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{branchNameDisplay}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Shift & Timings</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>
                {currentUser?.shift || `Regular Shift (${currentUser?.shiftStart || '09:00'} - ${currentUser?.shiftEnd || '18:00'})`}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Grace Period</Text>
              <Text style={[styles.infoVal, { color: theme.primary }]}>
                {currentUser?.graceTime === 'always' ? 'Flexible (Always)' : `${currentUser?.graceTime || '15'} mins (Morning) • ${currentUser?.afternoonGraceTime || '15'} mins (Afternoon)`}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Reporting Manager</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.reportingManager || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Date of Joining</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.joiningDate || currentUser?.doj || '-'}</Text>
            </View>
            {currentUser?.probationDate ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Probation Review Date</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.probationDate}</Text>
              </View>
            ) : null}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>System Role</Text>
              <Text style={[styles.infoVal, { color: theme.primary }]}>{currentUser?.roleName || 'General Employee'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT: Personal & Address */}
      {activeTab === 'personal' && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personal Demographics</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Full Legal Name</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.name || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Gender</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, textTransform: 'capitalize' }]}>{currentUser?.gender || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Date of Birth</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.dob || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Blood Group</Text>
              <Text style={[styles.infoVal, { color: currentUser?.bloodGroup ? '#dc2626' : theme.textPrimary, fontWeight: '800' }]}>{currentUser?.bloodGroup || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Marital Status</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, textTransform: 'capitalize' }]}>{currentUser?.maritalStatus || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Nationality</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.nationality || 'Indian'}</Text>
            </View>
            {currentUser?.fatherName ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Father's Name</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.fatherName}</Text>
              </View>
            ) : null}
            {currentUser?.motherName ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Mother's Name</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.motherName}</Text>
              </View>
            ) : null}
            {currentUser?.spouseName ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Spouse's Name</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.spouseName}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Contact & Emergency</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Work Email</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.email || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Phone Number</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.phone || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Emergency Contact</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>
                {currentUser?.emergencyName ? `${currentUser.emergencyName} ${currentUser.emergencyRelation ? `(${currentUser.emergencyRelation})` : ''}` : '-'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Emergency Phone 1</Text>
              <Text style={[styles.infoVal, { color: currentUser?.emergencyContact ? '#ea580c' : theme.textPrimary, fontWeight: '800' }]}>{currentUser?.emergencyContact || currentUser?.phone || '-'}</Text>
            </View>
            {currentUser?.emergencyPhone2 ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Emergency Phone 2</Text>
                <Text style={[styles.infoVal, { color: '#ea580c' }]}>{currentUser.emergencyPhone2}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Residential Address</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={{ paddingVertical: 4 }}>
              <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 4 }]}>Current / Communication Address</Text>
              <Text style={[styles.addressText, { color: theme.textPrimary }]}>{fullAddressDisplay}</Text>
            </View>
          </View>

          {/* Family Members Sub-list */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Family & Dependents ({familyList.length})</Text>
          {familyList.length > 0 ? (
            familyList.map((f, idx) => (
              <View key={idx} style={[styles.subListItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subListTitle, { color: theme.textPrimary }]}>{f.name}</Text>
                  <Text style={[styles.subListSub, { color: theme.textMuted }]}>
                    {f.relation} {f.dob ? `• Born ${f.dob}` : ''} {f.contact ? `• ${f.contact}` : ''}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: f.dependent ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : theme.inputBg }]}>
                  <Text style={[styles.tagBadgeText, { color: f.dependent ? '#16a34a' : theme.textMuted }]}>
                    {f.dependent ? 'Dependent' : 'Non-Dependent'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="info" size={15} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No family members or dependents submitted in onboarding profile.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB CONTENT: Bank & Statutory */}
      {activeTab === 'statutory' && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Salary & Bank Account</Text>
            <TouchableOpacity onPress={() => setShowMaskedData(!showMaskedData)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="shield" size={13} color={theme.primary} />
              <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>
                {showMaskedData ? 'Hide Masked' : 'Reveal All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Bank Name</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.bankName || (currentUser?.bankAccount ? 'Linked Bank Account' : '-')}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Branch</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser?.bankBranch || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Account Number</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, fontFamily: 'monospace' }]}>
                {currentUser?.bankAcc
                  ? (showMaskedData ? currentUser.bankAcc : `•••• •••• ${currentUser.bankAcc.length >= 4 ? currentUser.bankAcc.slice(-4) : currentUser.bankAcc}`)
                  : (currentUser?.bankAccount || '-')}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>IFSC Code</Text>
              <Text style={[styles.infoVal, { color: currentUser?.bankIfsc ? theme.primary : theme.textPrimary, fontWeight: '800' }]}>{currentUser?.bankIfsc || '-'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Account Type</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, textTransform: 'capitalize' }]}>{currentUser?.bankAccountType || (currentUser?.bankAcc ? 'Savings' : '-')}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Government & Statutory Identifiers</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>PAN Card Number</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, fontWeight: '800' }]}>
                {currentUser?.panNumber || currentUser?.pan || '-'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Aadhaar Number</Text>
              <Text style={[styles.infoVal, { color: theme.textPrimary, fontFamily: 'monospace' }]}>
                {currentUser?.aadhaar
                  ? (showMaskedData ? currentUser.aadhaar : `•••• •••• ${currentUser.aadhaar.length >= 4 ? currentUser.aadhaar.slice(-4) : currentUser.aadhaar}`)
                  : '-'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>PF UAN Number</Text>
              <Text style={[styles.infoVal, { color: currentUser?.uan ? theme.primary : theme.textPrimary, fontWeight: '800' }]}>{currentUser?.uan || (currentUser?.pfEligible ? 'Enrolled' : '-')}</Text>
            </View>
            {currentUser?.pfNumber ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>PF Member ID</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.pfNumber}</Text>
              </View>
            ) : null}
            {currentUser?.esic ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>ESIC Number</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.esic}</Text>
              </View>
            ) : null}
            {currentUser?.ptNumber ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Professional Tax ID</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.ptNumber}</Text>
              </View>
            ) : null}
            {currentUser?.passportNumber ? (
              <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Passport Number</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.passportNumber}</Text>
              </View>
            ) : null}
            {currentUser?.drivingLicense ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Driving License</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{currentUser.drivingLicense}</Text>
              </View>
            ) : null}
          </View>

          {/* Statutory Enrollments Pill Row */}
          <View style={[styles.statutoryPillsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 8 }]}>Statutory Enrollments</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={[styles.enrollPill, { backgroundColor: currentUser?.pfEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.pfEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.pfEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.pfEligible !== false ? '#15803d' : '#991b1b' }]}>Provident Fund (PF)</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.esiEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.esiEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.esiEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.esiEligible !== false ? '#15803d' : '#991b1b' }]}>ESI Healthcare</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.ptEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.ptEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.ptEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.ptEligible !== false ? '#15803d' : '#991b1b' }]}>Professional Tax (PT)</Text>
              </View>

              <View style={[styles.enrollPill, { backgroundColor: currentUser?.tdsEligible !== false ? '#dcfce7' : '#fee2e2' }]}>
                <Icon name={currentUser?.tdsEligible !== false ? 'check' : 'cross'} size={11} color={currentUser?.tdsEligible !== false ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.enrollPillText, { color: currentUser?.tdsEligible !== false ? '#15803d' : '#991b1b' }]}>TDS Tax Deduction</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* TAB CONTENT: Education & Experience */}
      {activeTab === 'history' && (
        <View>
          {/* Skills & Languages */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Skills & Languages</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 8 }]}>Professional Skills</Text>
            {skillsList.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {skillsList.map((s, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.chipText, { color: theme.primary }]}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic', marginBottom: 12 }}>
                No professional skills specified in onboarding profile.
              </Text>
            )}

            <Text style={[styles.infoLabel, { color: theme.textMuted, marginBottom: 8 }]}>Languages Known</Text>
            {languagesList.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {languagesList.map((l, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.chipText, { color: theme.textPrimary }]}>{l}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic' }}>
                Languages not specified.
              </Text>
            )}
          </View>

          {/* Education Entries */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Education & Qualifications ({educationList.length})</Text>
          {educationList.length > 0 ? (
            educationList.map((e, idx) => (
              <View key={idx} style={[styles.subListItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subListTitle, { color: theme.textPrimary }]}>{e.level || 'Degree / Certificate'}</Text>
                  <Text style={[styles.subListSub, { color: theme.primary, fontWeight: '600', marginTop: 2 }]}>{e.institute || '-'}</Text>
                  <Text style={[styles.subListDetail, { color: theme.textMuted }]}>
                    {e.field ? `${e.field} • ` : ''}{e.year ? `Year ${e.year}` : ''} {e.grade ? `• Grade: ${e.grade}` : ''}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: theme.tealSoft }]}>
                  <Icon name="check" size={10} color={theme.primary} />
                  <Text style={[styles.tagBadgeText, { color: theme.primary }]}>Verified</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="info" size={15} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No formal academic qualifications recorded in onboarding profile.
              </Text>
            </View>
          )}

          {/* Work Experience Entries */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>Prior Work Experience ({experienceList.length})</Text>
          {experienceList.length > 0 ? (
            experienceList.map((exp, idx) => (
              <View key={idx} style={[styles.subListItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subListTitle, { color: theme.textPrimary }]}>{exp.role || 'Role'}</Text>
                  <Text style={[styles.subListSub, { color: theme.textPrimary, fontWeight: '600', marginTop: 2 }]}>{exp.company || '-'}</Text>
                  <Text style={[styles.subListDetail, { color: theme.textMuted }]}>
                    {exp.from || 'Start'} to {exp.to || 'End'} {exp.ctc ? `• CTC: ₹${exp.ctc.toLocaleString()}` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="info" size={15} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No prior employment experience recorded (First employment / Fresher profile).
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB CONTENT: Documents & Compliance */}
      {activeTab === 'documents' && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Onboarding Verification Documents ({documentsList.length})</Text>
          {documentsList.length > 0 ? (
            documentsList.map((doc, idx) => (
              <View key={idx} style={[styles.docItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.docIconWrap, { backgroundColor: theme.inputBg }]}>
                  <Icon name="document" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docTitle, { color: theme.textPrimary }]} numberOfLines={1}>{doc.name || 'Document'}</Text>
                  <Text style={[styles.docSub, { color: theme.textMuted }]}>
                    Type: {doc.type ? doc.type.toUpperCase() : 'PDF'} • Uploaded {doc.uploadedAt || 'at Onboarding'}
                  </Text>
                </View>
                <View style={[styles.tagBadge, { backgroundColor: doc.verified !== false ? '#dcfce7' : '#fef3c7' }]}>
                  <Icon name={doc.verified !== false ? 'check' : 'alert-circle'} size={10} color={doc.verified !== false ? '#16a34a' : '#d97706'} />
                  <Text style={[styles.tagBadgeText, { color: doc.verified !== false ? '#15803d' : '#b45309' }]}>
                    {doc.verified !== false ? 'Verified' : 'Review'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="document" size={18} color={theme.textMuted} />
              <Text style={[styles.emptyCardText, { color: theme.textMuted }]}>
                No uploaded verification documents on file for this employee.
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>Compliance & Legal Sign-offs</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>NDA & Confidentiality</Text>
              <Text style={[styles.infoVal, { color: (currentUser?.ndaSigned || currentUser?.acceptance?.signed) ? '#16a34a' : theme.textPrimary, fontWeight: '800' }]}>
                {(currentUser?.ndaSigned || currentUser?.acceptance?.signed) ? 'Signed & Acknowledged ✓' : 'Self-Certified'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Background Verification</Text>
              <Text style={[styles.infoVal, { color: '#16a34a', fontWeight: '800' }]}>
                {currentUser?.backgroundCheckStatus === 'clear' ? 'Cleared (Green) ✓' : (currentUser?.backgroundCheckStatus ? `${currentUser.backgroundCheckStatus} ✓` : 'Verified ✓')}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Police Verification</Text>
              <Text style={[styles.infoVal, { color: currentUser?.policeVerification ? '#16a34a' : theme.textPrimary }]}>
                {currentUser?.policeVerification ? 'Verified ✓' : 'Self-Certified'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Medical Fitness Declaration</Text>
              <Text style={[styles.infoVal, { color: '#16a34a' }]}>
                {currentUser?.medicalFitness ? 'Submitted & Approved ✓' : 'Self-Declared'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* App Preferences Card */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>App Preferences & Security</Text>
      <View style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name={theme.isDark ? 'moon' : 'sun'} size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Theme Appearance</Text>
          </View>
          <Text style={[styles.settingVal, { color: theme.primary }]}>
            {theme.isDark ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
          onPress={() => setFaceModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="camera" size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Biometric AI Face Matching</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.settingVal, { color: isFaceEnrolled ? theme.success : '#d97706' }]}>
              {isFaceEnrolled ? 'Enrolled ✓' : 'Register ⚠️'}
            </Text>
            <Icon name="chevron-right" size={12} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
          onPress={onRefresh}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="history" size={18} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Cloud Profile Sync</Text>
          </View>
          <Text style={[styles.settingVal, { color: theme.primary }]}>
            Tap to Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
        onPress={handleLogoutPress}
        activeOpacity={0.8}
      >
        <Icon name="logout" size={16} color={theme.danger} />
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
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    ...SHADOWS.md,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },
  avatarImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  role: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  empIdTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  empIdText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifyHighlightsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  verifyItem: {
    alignItems: 'center',
    flex: 1,
  },
  verifyIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  verifyLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  verifyStatus: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  verifyDivider: {
    width: 1,
    height: 28,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContainer: {
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  subListItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  subListTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  subListSub: {
    fontSize: 12,
  },
  subListDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statutoryPillsCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  enrollPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  enrollPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  docSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emptyCardText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  settingCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
