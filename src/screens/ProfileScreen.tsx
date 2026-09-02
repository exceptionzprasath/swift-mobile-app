import React, { useState, useCallback, useMemo } from 'react';
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
import { ThemeColors, SHADOWS, COLOR_PALETTES, getPaletteById, PaletteDefinition } from '../theme/colors';
import { Icon } from '../components/Icon';
import { ThemePaletteModal } from '../components/ThemePaletteModal';
import { useAppContext, EmployeeDocument, FamilyMember, EducationEntry, ExperienceEntry } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  theme: ThemeColors;
  onToggleTheme: () => void;
  selectedPaletteId?: string;
  onSelectPalette?: (paletteId: string) => void;
  onLogout: () => void;
}


type ProfileSectionTab = 'work' | 'personal' | 'statutory' | 'history' | 'documents';

export function ProfileScreen({
  theme,
  onToggleTheme,
  selectedPaletteId = 'default',
  onSelectPalette,
  onLogout,
}: ProfileScreenProps) {
  const { currentUser, employees, companyConfig, refreshData } = useAppContext();
  const [activeTab, setActiveTab] = useState<ProfileSectionTab>('work');
  const [refreshing, setRefreshing] = useState(false);
  const [showMaskedData, setShowMaskedData] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);


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

  // Robust Reporting Manager Resolution
  const reportingManagerDisplay = useMemo(() => {
    // 1. Direct explicit name or value on currentUser
    if (currentUser?.reportingManager && currentUser.reportingManager.trim() !== '' && currentUser.reportingManager !== '-') {
      const matchEmp = (employees || []).find(
        (e: any) => e.id === currentUser.reportingManager || e.empCode === currentUser.reportingManager
      );
      if (matchEmp) {
        return `${matchEmp.name} (${matchEmp.designation || 'Manager'})`;
      }
      return currentUser.reportingManager;
    }

    // 2. managerId lookup in employee roster
    if (currentUser?.managerId && currentUser.managerId !== '__none') {
      const matchMgr = (employees || []).find(
        (e: any) => e.id === currentUser.managerId || e.empCode === currentUser.managerId
      );
      if (matchMgr) {
        return `${matchMgr.name} (${matchMgr.designation || 'Manager'})`;
      }
    }

    // 3. Custom approval workflow hierarchy
    const workflowApproverId = (companyConfig as any)?.approvalSettings?.customWorkflows?.find(
      (w: any) => w.employeeId === currentUser?.id
    )?.approverId;
    if (workflowApproverId) {
      const matchApprover = (employees || []).find((e: any) => e.id === workflowApproverId);
      if (matchApprover) {
        return `${matchApprover.name} (${matchApprover.designation || 'Approver'})`;
      }
    }

    // 4. Role / Designation based intelligent hierarchy fallback
    const designationLower = (currentUser?.designation || '').toLowerCase();
    const roleLower = (currentUser?.roleName || '').toLowerCase();

    if (
      designationLower.includes('founder') ||
      designationLower.includes('director') ||
      designationLower.includes('ceo') ||
      designationLower.includes('president') ||
      designationLower.includes('partner') ||
      roleLower.includes('owner') ||
      roleLower.includes('super admin')
    ) {
      return 'Top Management / Board of Directors';
    }

    // 5. Check if there is a department head
    const deptHead = (employees || []).find(
      (e: any) =>
        e.id !== currentUser?.id &&
        e.department === currentUser?.department &&
        ((e.designation || '').toLowerCase().includes('lead') ||
          (e.designation || '').toLowerCase().includes('head') ||
          (e.designation || '').toLowerCase().includes('manager'))
    );
    if (deptHead) {
      return `${deptHead.name} (${deptHead.designation || 'Dept Head'})`;
    }

    return 'Direct Management / HR Admin';
  }, [currentUser, employees, companyConfig]);

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
      {/* 1. TOP PROFILE HERO CARD (White Background with Theme-Based Border) */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.isDark ? theme.card : '#ffffff',
            borderColor: theme.primary,
          },
        ]}
      >
        {/* Top Row: Avatar on Left, Two Stacked Pills on Right */}
        <View style={styles.heroTopRow}>
          {/* Avatar on Top Left */}
          <View style={[styles.heroAvatarCircle, { backgroundColor: theme.primary }]}>
            {currentUser?.photoDataUrl ? (
              <Image source={{ uri: currentUser.photoDataUrl }} style={styles.heroAvatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.heroAvatarInitial, { color: '#ffffff' }]}>{initial}</Text>
            )}
          </View>

          {/* Stacked Pills on Top Right */}
          <View style={styles.heroTopRightStack}>
            {/* Pill 1: Status */}
            <View
              style={[
                styles.heroPillTop,
                {
                  backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7',
                },
              ]}
            >
              <View style={[styles.heroStatusDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.heroPillTextTop, { color: theme.isDark ? '#4ade80' : '#15803d' }]}>
                {currentUser?.status ? currentUser.status.toUpperCase() : 'ACTIVE'} • FULL-TIME
              </Text>
            </View>

            {/* Pill 2: Realtime Sync */}
            <TouchableOpacity
              style={[
                styles.heroPillBottom,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
              onPress={onRefresh}
              activeOpacity={0.75}
            >
              <Icon name="history" size={12} color={theme.primary} />
              <Text style={[styles.heroPillTextBottom, { color: theme.primary }]}>Realtime Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Row: Name & Role on Left, 2 Mini Info Boxes on Right */}
        <View style={styles.heroBottomRow}>
          {/* Bottom Left: Name & Role */}
          <View style={styles.heroNameCol}>
            <Text style={[styles.heroNameText, { color: theme.textPrimary }]} numberOfLines={1}>
              {currentUser?.name || 'Employee'}
            </Text>
            <Text style={[styles.heroRoleText, { color: theme.textMuted }]} numberOfLines={1}>
              {currentUser?.designation || 'Team Member'} • <Text style={{ color: theme.primary, fontWeight: '700' }}>{currentUser?.department || 'General'}</Text>
            </Text>
          </View>

          {/* Bottom Right: 2 Stacked Info Boxes */}
          <View style={styles.heroInfoBoxesCol}>
            <View
              style={[
                styles.heroInfoBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.heroInfoBoxText, { color: theme.textPrimary }]} numberOfLines={1}>
                ID: {currentUser?.empCode || currentUser?.code || currentUser?.id || 'EMP'}
              </Text>
            </View>

            <View
              style={[
                styles.heroInfoBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.heroInfoBoxText, { color: theme.textPrimary }]} numberOfLines={1}>
                {currentUser?.bloodGroup ? `🩸 ${currentUser.bloodGroup}` : `Branch: ${branches.find((b: any) => b.id === currentUser?.branchId)?.name || 'Main'}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. MIDDLE QUICK METRIC STRIP (Divided Bar from Wireframe) */}
      <View style={[styles.metricStripCard, { backgroundColor: theme.card }]}>
        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: isFaceEnrolled ? (theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7') }]}>
            <Icon name={isFaceEnrolled ? 'check' : 'camera'} size={12} color={isFaceEnrolled ? '#16a34a' : '#d97706'} />
          </View>
          <Text style={[styles.metricMainText, { color: isFaceEnrolled ? '#16a34a' : '#d97706' }]}>
            {isFaceEnrolled ? 'Enrolled' : 'Pending'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Face ID</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.18)' : '#e0f2fe' }]}>
            <Icon name="calendar" size={12} color={theme.primary} />
          </View>
          <Text style={[styles.metricMainText, { color: theme.primary }]}>Active</Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Leaves</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7' }]}>
            <Icon name="document" size={12} color="#16a34a" />
          </View>
          <Text style={[styles.metricMainText, { color: '#16a34a' }]}>
            {documentsList.length > 0 ? 'Verified' : 'Active'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Onboarding</Text>
        </View>

        <View style={[styles.metricVerticalDivider, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.metricColumn}>
          <View style={[styles.metricIconCircle, { backgroundColor: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? (theme.isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7') : (theme.isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7') }]}>
            <Icon name="wallet" size={12} color={(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706'} />
          </View>
          <Text style={[styles.metricMainText, { color: (currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? '#16a34a' : '#d97706' }]}>
            {(currentUser?.bankAcc || currentUser?.bankAccount || currentUser?.bankName) ? 'Linked' : 'Pending'}
          </Text>
          <Text style={[styles.metricLabelText, { color: theme.textMuted }]}>Salary A/C</Text>
        </View>
      </View>

      {/* 3. SEGMENTED TAB SWITCHER (Horizontal Capsule Strip from Wireframe) */}
      <View style={[styles.segmentedPillContainer, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.inputBg, borderColor: theme.cardBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentedPillScroll}
        >
          {[
            { id: 'work', label: 'Work & Org', icon: 'home' },
            { id: 'personal', label: 'Personal Details', icon: 'user' },
            { id: 'statutory', label: 'Bank & Statutory', icon: 'wallet' },
            { id: 'history', label: 'Education & Exp', icon: 'calendar' },
            { id: 'documents', label: `Documents (${documentsList.length})`, icon: 'document' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.segmentedPillBtn,
                  isActive && {
                    backgroundColor: theme.primary,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
                onPress={() => setActiveTab(tab.id as ProfileSectionTab)}
                activeOpacity={0.75}
              >
                <Icon
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? '#ffffff' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.segmentedPillText,
                    {
                      color: isActive ? '#ffffff' : theme.textMuted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
              <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{reportingManagerDisplay}</Text>
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

        {/* Color Palette Theme Option (Below Dark Mode Option) */}
        <View
          style={[
            styles.paletteOptionContainer,
            { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowPaletteModal(true)}
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
              <Icon name="sparkles" size={18} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Color Theme Palette</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }} numberOfLines={1}>
                  {getPaletteById(selectedPaletteId).name} • {getPaletteById(selectedPaletteId).vibe}
                </Text>
              </View>
            </View>

            <View style={styles.paletteTriggerRight}>
              <View style={styles.miniSwatchBar}>
                {getPaletteById(selectedPaletteId).hexes.map((h, i) => (
                  <View key={i} style={[styles.miniSwatchDot, { backgroundColor: h }]} />
                ))}
              </View>
              <Text style={[styles.settingVal, { color: theme.primary, marginLeft: 6 }]}>
                Change →
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Palette Horizontal Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPalettesRow}
            style={styles.quickPalettesScroll}
          >
            {COLOR_PALETTES.map((p) => {
              const isSelected = selectedPaletteId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.quickPaletteCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: isSelected ? theme.primary : theme.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => onSelectPalette && onSelectPalette(p.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickSwatchRow}>
                    {p.hexes.map((hex, i) => (
                      <View
                        key={i}
                        style={[
                          styles.quickSwatchSegment,
                          {
                            backgroundColor: hex,
                            borderTopLeftRadius: i === 0 ? 4 : 0,
                            borderBottomLeftRadius: i === 0 ? 4 : 0,
                            borderTopRightRadius: i === 4 ? 4 : 0,
                            borderBottomRightRadius: i === 4 ? 4 : 0,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.quickTitleRow}>
                    <Text
                      style={[
                        styles.quickPaletteName,
                        { color: isSelected ? theme.primary : theme.textPrimary, fontWeight: isSelected ? '800' : '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    {isSelected && <Icon name="check" size={10} color={theme.primary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 8, paddingTop: 12 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={18} color={theme.primary} />
            <View>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Biometric AI Face Matching</Text>
              <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>Enrolled & Protected (Admin Locked)</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.settingVal, { color: isFaceEnrolled ? theme.success : '#d97706', fontWeight: '800' }]}>
              {isFaceEnrolled ? 'Enrolled ✓' : 'Pending'}
            </Text>
          </View>
        </View>

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

      {/* 20 Curated Themes Modal */}
      <ThemePaletteModal
        visible={showPaletteModal}
        theme={theme}
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={(id) => {
          if (onSelectPalette) onSelectPalette(id);
        }}
        onClose={() => setShowPaletteModal(false)}
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
    paddingBottom: 110,
  },

  // 1. HERO CARD (White Background with Theme-Based Border)
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroAvatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  heroAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroAvatarInitial: {
    fontSize: 32,
    fontWeight: '900',
  },
  heroTopRightStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  heroPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  heroPillTextTop: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroPillBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillTextBottom: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  heroNameCol: {
    flex: 1,
    marginRight: 12,
  },
  heroNameText: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroRoleText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 3,
  },
  heroInfoBoxesCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  heroInfoBox: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 9,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroInfoBoxText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // 2. MIDDLE QUICK METRIC STRIP
  metricStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 0,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  metricMainText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  metricLabelText: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  metricVerticalDivider: {
    width: 1,
    height: 32,
    opacity: 0.6,
  },

  // 3. SEGMENTED TAB SWITCHER
  segmentedPillContainer: {
    borderRadius: 14,
    borderWidth: 0,
    padding: 3.5,
    marginBottom: 16,
  },
  segmentedPillScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  segmentedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentedPillText: {
    fontSize: 12,
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
  paletteOptionContainer: {
    marginBottom: 4,
  },
  paletteTriggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniSwatchBar: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  miniSwatchDot: {
    width: 9,
    height: 14,
    borderRadius: 2,
  },
  quickPalettesScroll: {
    marginTop: 10,
    marginBottom: 2,
  },
  quickPalettesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  quickPaletteCard: {
    borderRadius: 12,
    padding: 8,
    width: 130,
  },
  quickSwatchRow: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quickSwatchSegment: {
    flex: 1,
    height: '100%',
  },
  quickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickPaletteName: {
    fontSize: 11,
    flex: 1,
  },
});

