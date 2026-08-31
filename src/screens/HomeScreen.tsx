import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { HomeHeroBannerCarousel } from '../components/HomeHeroBannerCarousel';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  theme: ThemeColors;
  onNavigate: (tab: any) => void;
}

export function HomeScreen({ theme, onNavigate }: HomeScreenProps) {
  const { currentUser, attendance, leaves, holidays, isClockedIn, companyConfig, todayRecord, roster, refreshData } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [faceModalVisible, setFaceModalVisible] = useState(false);
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);
  const hasPromptedRef = useRef(false);

  const isFaceEnrolled = Boolean(currentUser?.faceRegistered || (currentUser?.photoDataUrl && currentUser.photoDataUrl.startsWith('http')));

  // Proactively pop up the face registration dialog when entering the home screen if not yet enrolled
  useEffect(() => {
    if (currentUser && !isFaceEnrolled && !hasPromptedRef.current) {
      hasPromptedRef.current = true;
      const timer = setTimeout(() => {
        setShowAutoPrompt(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id, isFaceEnrolled]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Dynamic real-time monthly KPIs calculated from AppContext
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const userAttendance = attendance.filter(
    (a) => a.employeeId === currentUser?.id || a.employeeName === currentUser?.name
  );
  const monthlyAttendance = userAttendance.filter(
    (a) => a.date && a.date.startsWith(currentMonthStr)
  );

  const presentCount = monthlyAttendance.filter((a) => a.status === 'present').length;
  const lateCount = monthlyAttendance.filter((a) => a.status === 'late').length;
  const otHoursCount = monthlyAttendance.reduce((sum, a) => sum + (Number(a.otHours) || 0), 0);

  const userLeaves = leaves.filter(
    (l) => (l.employeeId === currentUser?.id || l.employeeName === currentUser?.name) && l.status === 'Approved'
  );
  const leavesTakenCount = userLeaves.reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const onTimeScore = presentCount > 0 ? Math.max(0, Math.round(((presentCount - lateCount) / presentCount) * 100)) : 100;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHoliday = (holidays || []).find((h: any) => h.date >= todayStr) || (holidays && holidays[0]);

  // Swift Roster resolution for today
  const todayRoster = (roster || []).find(
    (r: any) => (r.employeeId === currentUser?.id || r.empCode === currentUser?.empCode) && r.date === todayStr
  );

  const isRosterWeeklyOff = useMemo(() => {
    if (todayRoster) {
      const shiftIdLow = (todayRoster.shiftId || '').toLowerCase();
      const shiftNameLow = (todayRoster.shiftName || '').toLowerCase();
      return shiftIdLow === 'off' || shiftIdLow === 'wo' || shiftNameLow.includes('off') || shiftNameLow.includes('weekly');
    }
    const todayDayOfWeek = new Date().getDay();
    const weekdayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (currentUser?.weeklyOff && currentUser.weeklyOff.toLowerCase().includes(weekdayName)) {
      return true;
    }
    if (companyConfig?.weeklyOffDays && Array.isArray(companyConfig.weeklyOffDays) && companyConfig.weeklyOffDays.includes(todayDayOfWeek)) {
      return true;
    }
    if (currentUser?.shiftId === 'off' || currentUser?.shift?.toLowerCase().includes('off')) {
      return true;
    }
    return false;
  }, [todayRoster, currentUser, companyConfig]);

  const branches = companyConfig?.branches || [];
  const assignedBranches = branches.filter((b: any) => (currentUser?.branchIds?.includes(b.id) || b.id === currentUser?.branchId));
  const branchName = assignedBranches.length > 0
    ? assignedBranches.map((b: any) => b.name).join(', ')
    : (branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'Head Office');
  const userName = currentUser?.name?.split(' ')[0] || 'Employee';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Company Hero Banner Carousel */}
        <HomeHeroBannerCarousel
          theme={theme}
          bannerConfig={companyConfig?.dashboardBanners}
          onNavigate={onNavigate}
        />

        {/* Hero Welcome Banner */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.shiftBadge,
                isRosterWeeklyOff
                  ? { backgroundColor: '#fef3c7', borderColor: '#fde68a' }
                  : { backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.15)' : '#e0f2fe', borderColor: theme.isDark ? 'rgba(6, 182, 212, 0.3)' : '#bae6fd' },
              ]}
            >
              <Icon name={isRosterWeeklyOff ? 'coffee' : 'clock'} size={12} color={isRosterWeeklyOff ? '#d97706' : theme.cyan} />
              <Text style={[styles.shiftText, { color: isRosterWeeklyOff ? '#d97706' : theme.cyan }]}>
                {isRosterWeeklyOff
                  ? 'Weekly Off (Swift Roster)'
                  : todayRoster?.shiftName
                  ? `${todayRoster.shiftName} ${todayRoster.shiftStart ? `(${todayRoster.shiftStart} - ${todayRoster.shiftEnd || ''})` : ''}`
                  : (currentUser?.shift || 'Regular Shift (09:00 AM - 06:00 PM)')}
              </Text>
            </View>
            <Text style={[styles.heroDate, { color: theme.textMuted }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>
            Welcome back, {userName} 👋
          </Text>
          <Text style={[styles.greetingSub, { color: theme.textMuted }]}>
            {currentUser?.designation || 'GODO'} • {currentUser?.department || 'Engineering'}
          </Text>

          {/* Today's Status Widget */}
          <View style={[styles.punchWidget, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>TODAY'S STATUS</Text>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color: isClockedIn
                      ? theme.success
                      : isRosterWeeklyOff
                      ? theme.warning
                      : theme.danger,
                  },
                ]}
              >
                {isClockedIn && todayRecord
                  ? `Checked In (${todayRecord.clockIn})`
                  : isRosterWeeklyOff
                  ? 'Weekly Off (Restricted)'
                  : 'Not Checked In'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="location" size={12} color={theme.textMuted} />
                <Text style={[styles.locationDetail, { color: theme.textMuted }]}>
                  {branchName} • Geofence Verified
                </Text>
              </View>
            </View>

            {isClockedIn ? (
              <TouchableOpacity
                style={[styles.quickPunchBtn, { backgroundColor: theme.success }]}
                onPress={() => onNavigate('attendance')}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={16} color="#ffffff" />
                <Text style={styles.quickPunchText}>Check Out</Text>
              </TouchableOpacity>
            ) : isRosterWeeklyOff ? (
              <TouchableOpacity
                style={[
                  styles.quickPunchBtn,
                  { backgroundColor: theme.cardBorder, opacity: 0.75, borderWidth: 1, borderColor: theme.warning + '50' },
                ]}
                onPress={() =>
                  Alert.alert(
                    'Attendance Restricted',
                    'Today is designated as Weekly Off in the Swift Roster. Attendance punch-in is restricted as per company policy.'
                  )
                }
                activeOpacity={0.7}
              >
                <Icon name="lock" size={15} color={theme.warning} />
                <Text style={[styles.quickPunchText, { color: theme.warning, fontSize: 11 }]}>Off Day (Locked)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.quickPunchBtn, { backgroundColor: theme.cyan }]}
                onPress={() => onNavigate('attendance')}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={16} color="#ffffff" />
                <Text style={styles.quickPunchText}>Check In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Biometric Face Enrollment Card (if face is not registered) */}
        {!isFaceEnrolled && (
          <View
            style={[
              styles.biometricCard,
              {
                backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.35)' : '#fca5a5',
              },
            ]}
          >
            <View style={styles.biometricCardHeader}>
              <View style={styles.biometricIconContainer}>
                <View
                  style={[
                    styles.biometricIconOuterRing,
                    {
                      backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                      borderColor: '#ef4444',
                    },
                  ]}
                >
                  <Icon name="camera" size={20} color="#ef4444" />
                </View>
                <View style={[styles.pulseDot, { backgroundColor: '#dc2626' }]} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.biometricTitleRow}>
                  <Text style={[styles.biometricCardTitle, { color: theme.isDark ? '#fca5a5' : '#991b1b' }]}>
                    Face Biometrics Setup
                  </Text>
                  <View
                    style={[
                      styles.pendingPill,
                      {
                        backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
                        borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.45)' : '#fca5a5',
                      },
                    ]}
                  >
                    <Text style={[styles.pendingPillText, { color: '#dc2626' }]}>Action Required</Text>
                  </View>
                </View>
                <Text style={[styles.biometricCardSub, { color: theme.isDark ? '#e2e8f0' : '#7f1d1d' }]}>
                  Enroll your face profile in 10 seconds for seamless 1-tap AI facial check-in &amp; geofence punch.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.enrollBtn,
                {
                  backgroundColor: '#dc2626',
                },
              ]}
              onPress={() => setFaceModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="camera" size={15} color="#ffffff" />
                <Text style={styles.enrollBtnText}>Enroll Face Profile Now</Text>
              </View>
              <Icon name="chevron-right" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Monthly Attendance Summary Metrics */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Attendance Monthly Highlights</Text>
          <TouchableOpacity style={[styles.dropdownPill, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Icon name="calendar" size={12} color={theme.textMuted} />
            <Text style={[styles.dropdownText, { color: theme.textMuted }]}>This Month</Text>
            <Icon name="chevron-right" size={10} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {/* Card 1: Present (5sec.json Lottie) */}
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.statCardLeft}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', borderColor: theme.success }]}>
                <Icon name="check" size={14} color={theme.success} />
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{presentCount} Days</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Present</Text>
              </View>
            </View>
            <LottieView
              source={require('../assets/5sec.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
            />
          </View>

          {/* Card 2: Overtime (clock-time.json Lottie) */}
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.statCardLeft}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', borderColor: theme.warning }]}>
                <Icon name="clock" size={14} color={theme.warning} />
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{otHoursCount} Hrs</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Overtime</Text>
              </View>
            </View>
            <LottieView
              source={require('../assets/clock-time.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
            />
          </View>

          {/* Card 3: Leaves Taken (Calender.json Lottie) */}
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.statCardLeft}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.15)' : '#e0f2fe', borderColor: theme.cyan }]}>
                <Icon name="leaves" size={14} color={theme.cyan} />
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{leavesTakenCount} Days</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Leaves Taken</Text>
              </View>
            </View>
            <LottieView
              source={require('../assets/Calender.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
            />
          </View>

          {/* Card 4: On-Time Score (Score.json Lottie) */}
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.statCardLeft}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.15)' : '#f3e8ff', borderColor: '#a855f7' }]}>
                <Icon name="sparkles" size={14} color="#a855f7" />
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{onTimeScore}%</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>On-Time Score</Text>
              </View>
            </View>
            <LottieView
              source={require('../assets/Trophy.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
            />
          </View>
        </View>

        {/* Quick App Navigation Shortcuts */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 14 }]}>Quick Shortcuts</Text>
        <View style={styles.shortcutsGrid}>
          {[
            { tab: 'attendance', label: 'Attendance', icon: 'clock' as IconName, color: theme.cyan },
            { tab: 'payroll', label: 'Payslips', icon: 'payroll' as IconName, color: theme.primary },
            { tab: 'leaves', label: 'Apply Leave', icon: 'leaves' as IconName, color: theme.warning },
            { tab: 'requests', label: 'Requests', icon: 'task' as IconName, color: '#059669' },
            { tab: 'documents', label: 'Documents', icon: 'document' as IconName, color: '#a855f7' },
            { tab: 'chat', label: 'AI Assistant', icon: 'bot' as IconName, color: '#ec4899' },
          ].map((item) => (
            <TouchableOpacity
              key={item.tab}
              style={[styles.shortcutItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => onNavigate(item.tab)}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconBg, { backgroundColor: theme.isDark ? item.color + '20' : item.color + '12', borderColor: item.color + '40' }]}>
                <Icon name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.shortcutText, { color: theme.textPrimary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Upcoming Holiday Banner */}
        <View style={[styles.holidayBanner, { backgroundColor: theme.isDark ? 'rgba(2, 132, 199, 0.12)' : '#e0f2fe', borderColor: theme.isDark ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd' }]}>
          <View style={[styles.holidayIconBg, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5' }]}>
            <Icon name="holiday" size={20} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.holidayTitle, { color: theme.textPrimary }]}>
              Next Holiday: {upcomingHoliday ? upcomingHoliday.name : 'None Scheduled'}
            </Text>
            <Text style={[styles.holidayDate, { color: theme.textMuted }]}>
              {upcomingHoliday ? `${upcomingHoliday.date} • ${upcomingHoliday.description || upcomingHoliday.type || 'Public Holiday'}` : 'No upcoming holiday'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.viewHolidayBtn, { backgroundColor: theme.cyan }]} onPress={() => onNavigate('holidays')} activeOpacity={0.85}>
            <Text style={styles.viewHolidayText}>View All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Face Biometric Enrollment Camera Modal */}
      <FaceRegistrationModal
        visible={faceModalVisible}
        onClose={() => setFaceModalVisible(false)}
        theme={theme}
      />

      {/* Auto-Prompt Face Registration Popup Modal on entering Home Screen */}
      <Modal
        visible={showAutoPrompt && !isFaceEnrolled}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoPrompt(false)}
      >
        <View style={styles.promptModalOverlay}>
          <View style={[styles.promptModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Red glowing icon badge */}
            <View style={styles.promptIconBadgeContainer}>
              <View style={[styles.promptIconOuterGlow, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)' }]}>
                <View style={[styles.promptIconCircle, { backgroundColor: '#dc2626' }]}>
                  <Icon name="camera" size={28} color="#ffffff" />
                </View>
              </View>
            </View>

            <View style={styles.promptContent}>
              <View style={[styles.promptBadge, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5' }]}>
                <Text style={[styles.promptBadgeText, { color: '#dc2626' }]}>Biometric Setup Required</Text>
              </View>

              <Text style={[styles.promptTitle, { color: theme.textPrimary }]}>
                Register Your Face Profile
              </Text>
              <Text style={[styles.promptDescription, { color: theme.textMuted }]}>
                Hi <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{userName}</Text>, your facial biometric profile is pending registration.
                {'\n\n'}
                Enroll your face in under 10 seconds to unlock <Text style={{ fontWeight: '700', color: theme.textPrimary }}>1-tap AI facial attendance &amp; check-in</Text>.
              </Text>

              {/* Action Button Stack */}
              <View style={styles.promptButtonStack}>
                <TouchableOpacity
                  style={[styles.promptPrimaryBtn, { backgroundColor: '#dc2626' }]}
                  onPress={() => {
                    setShowAutoPrompt(false);
                    setFaceModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name="camera" size={16} color="#ffffff" />
                  <Text style={styles.promptPrimaryBtnText}>Register Face Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.promptSecondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
                  onPress={() => setShowAutoPrompt(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.promptSecondaryBtnText, { color: theme.textMuted }]}>
                    Remind Me Later
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    ...SHADOWS.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  shiftText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13,
    marginBottom: 18,
  },
  punchWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 2,
  },
  locationDetail: {
    fontSize: 11,
  },
  quickPunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  quickPunchText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 42) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  statCardLeft: {
    flex: 1,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  lottieAnim: {
    width: 48,
    height: 48,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  shortcutItem: {
    width: (width - 56) / 3,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  shortcutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  holidayIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  holidayDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  viewHolidayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  viewHolidayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  biometricCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.md,
  },
  biometricCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  biometricIconContainer: {
    position: 'relative',
  },
  biometricIconOuterRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  biometricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  biometricCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  biometricCardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  enrollBtn: {
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  enrollBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  promptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptModalCard: {
    width: Math.min(width - 36, 380),
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  promptIconBadgeContainer: {
    marginBottom: 12,
  },
  promptIconOuterGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  promptContent: {
    alignItems: 'center',
    width: '100%',
  },
  promptBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  promptBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  promptDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  promptButtonStack: {
    width: '100%',
    gap: 10,
  },
  promptPrimaryBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  promptPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  promptSecondaryBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
