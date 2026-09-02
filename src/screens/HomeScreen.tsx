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
  Image,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';

import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { HomeHeroBannerCarousel } from '../components/HomeHeroBannerCarousel';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');
const GREETING_CARD_WIDTH = width - 32;
const GREETING_CARD_HEIGHT = Math.round(GREETING_CARD_WIDTH / 3);

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

  // Dynamic time-based greeting, wishes, and background image (updates live)
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const timeGreetingInfo = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) {
      return {
        greeting: 'Good Morning',
        wish: 'Have an energetic & productive day ahead!',
        emoji: '☀️',
        image: require('../assets/Morning.png'),
        period: 'morning',
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      return {
        greeting: 'Good Afternoon',
        wish: 'Hope your day is going smoothly & great!',
        emoji: '🌤️',
        image: require('../assets/Afternoon.png'),
        period: 'afternoon',
      };
    } else if (currentHour >= 17 && currentHour < 21) {
      return {
        greeting: 'Good Evening',
        wish: 'Great work today! Enjoy your peaceful evening.',
        emoji: '🌆',
        image: require('../assets/Evening.png'),
        period: 'evening',
      };
    } else {
      return {
        greeting: 'Good Night',
        wish: 'Rest well and recharge for a bright tomorrow!',
        emoji: '🌙',
        image: require('../assets/Night.png'),
        period: 'night',
      };
    }
  }, [currentHour]);

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

        {/* Unified Greeting & Today's Status Card (Template Design) */}
        <View style={[styles.unifiedHeroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Top: 3:1 Cropped Dynamic Image Banner with Greeting & Wishes */}
          <View style={styles.cardBannerContainer}>
            <Image
              source={timeGreetingInfo.image}
              style={styles.cardBannerImage}
              resizeMode="cover"
            />
            <View style={styles.cardBannerOverlay} />

            <View style={styles.cardBannerContent}>
              <View style={styles.heroHeader}>
                <View
                  style={[
                    styles.shiftBadge,
                    isRosterWeeklyOff
                      ? { backgroundColor: 'rgba(234, 179, 8, 0.4)', borderColor: '#eab308' }
                      : { backgroundColor: 'rgba(0, 0, 0, 0.55)', borderColor: 'rgba(255, 255, 255, 0.3)' },
                  ]}
                >
                  <Icon name={isRosterWeeklyOff ? 'coffee' : 'clock'} size={11} color={isRosterWeeklyOff ? '#fde047' : '#38bdf8'} />
                  <Text style={[styles.shiftText, { color: isRosterWeeklyOff ? '#fef08a' : '#ffffff' }]} numberOfLines={1}>
                    {isRosterWeeklyOff
                      ? 'Weekly Off'
                      : todayRoster?.shiftName
                        ? todayRoster.shiftName
                        : (currentUser?.shift ? currentUser.shift.split(' ')[0] + ' Shift' : 'Regular Shift')}
                  </Text>
                </View>
                <View style={styles.dateBadge}>
                  <Text style={styles.heroDate}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>

              <View style={styles.heroGreetingContent}>
                <Text style={styles.greetingTitle} numberOfLines={1}>
                  {timeGreetingInfo.greeting}, {userName}! {timeGreetingInfo.emoji}
                </Text>
                <Text style={styles.greetingSub} numberOfLines={1}>
                  {timeGreetingInfo.wish}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom: Today's Status Details & Full-Width Action Button */}
          <View style={styles.cardBodyContainer}>
            {/* Line 1: Status Label */}
            <Text style={[styles.statusLabel, { color: theme.textMuted }]}>TODAY'S STATUS</Text>

            {/* Line 2: Status Value */}
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
              numberOfLines={1}
            >
              {isClockedIn && todayRecord
                ? `Checked In (${todayRecord.clockIn})`
                : isRosterWeeklyOff
                  ? 'Weekly Off (Restricted)'
                  : 'Not Checked In'}
            </Text>

            {/* Line 3: Location / Geofence Sub-detail */}
            <View style={styles.statusLocationRow}>
              <Icon name="location" size={12} color={theme.textMuted} />
              <Text style={[styles.locationDetail, { color: theme.textMuted }]} numberOfLines={1}>
                {branchName} • Geofence Verified
              </Text>
            </View>

            {/* Line 4: Full-Width Rounded Action Button */}
            {isClockedIn ? (
              <TouchableOpacity
                style={[styles.fullWidthActionBtn, { backgroundColor: theme.success }]}
                onPress={() => onNavigate('attendance')}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={16} color="#ffffff" />
                <Text style={styles.fullWidthActionBtnText}>Check Out</Text>
              </TouchableOpacity>
            ) : isRosterWeeklyOff ? (
              <TouchableOpacity
                style={[
                  styles.fullWidthActionBtn,
                  { backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.warning + '60' },
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
                <Text style={[styles.fullWidthActionBtnText, { color: theme.warning }]}>Off Day (Attendance Locked)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.fullWidthActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => onNavigate('attendance')}
                activeOpacity={0.85}
              >
                <Icon name="camera" size={16} color="#ffffff" />
                <Text style={styles.fullWidthActionBtnText}>Check In</Text>
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
          {/* Card 1: Present (Blue) */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.isDark ? '#0f172a' : '#eff6ff',
                borderColor: theme.isDark ? '#3b82f6' : '#bfdbfe',
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: theme.isDark ? '#1e293b' : '#dbeafe',
                  borderColor: theme.isDark ? '#3b82f6' : '#93c5fd',
                },
              ]}
            >
              <Icon name="check" size={20} color={theme.isDark ? '#60a5fa' : '#2563eb'} />
            </View>
            <View style={styles.statInfoCol}>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]} numberOfLines={1}>
                {presentCount} Days
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={1}>
                Present
              </Text>
            </View>
          </View>

          {/* Card 2: Overtime (Yellow) */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.isDark ? '#1c1917' : '#fefce8',
                borderColor: theme.isDark ? '#eab308' : '#fef08a',
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: theme.isDark ? '#292524' : '#fef9c3',
                  borderColor: theme.isDark ? '#eab308' : '#fde047',
                },
              ]}
            >
              <Icon name="clock" size={20} color={theme.isDark ? '#fde047' : '#ca8a04'} />
            </View>
            <View style={styles.statInfoCol}>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]} numberOfLines={1}>
                {otHoursCount} Hrs
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={1}>
                Overtime
              </Text>
            </View>
          </View>

          {/* Card 3: Leaves Taken (Orange) */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.isDark ? '#1c1917' : '#fff7ed',
                borderColor: theme.isDark ? '#f97316' : '#fed7aa',
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: theme.isDark ? '#292524' : '#ffedd5',
                  borderColor: theme.isDark ? '#f97316' : '#fdba74',
                },
              ]}
            >
              <Icon name="leaves" size={20} color={theme.isDark ? '#fb923c' : '#ea580c'} />
            </View>
            <View style={styles.statInfoCol}>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]} numberOfLines={1}>
                {leavesTakenCount} Days
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={1}>
                Leaves Taken
              </Text>
            </View>
          </View>

          {/* Card 4: On-Time Score (Green) */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.isDark ? '#0f172a' : '#f0fdf4',
                borderColor: theme.isDark ? '#10b981' : '#bbf7d0',
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: theme.isDark ? '#1e293b' : '#dcfce7',
                  borderColor: theme.isDark ? '#10b981' : '#86efac',
                },
              ]}
            >
              <Icon name="hourglass-split" size={20} color={theme.isDark ? '#34d399' : '#16a34a'} />
            </View>
            <View style={styles.statInfoCol}>
              <Text style={[styles.statNumber, { color: theme.textPrimary }]} numberOfLines={1}>
                {onTimeScore}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={1}>
                On-Time Rate
              </Text>
            </View>
          </View>
        </View>


        {/* Quick App Navigation Shortcuts */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 14 }]}>Quick Shortcuts</Text>
        <View style={[styles.shortcutsContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.shortcutsGrid}>
            {[
              { tab: 'attendance', label: 'Attendance', icon: 'clock' as IconName },
              { tab: 'payroll', label: 'Payslips', icon: 'receipt-cutoff' as IconName },
              { tab: 'leaves', label: 'Apply Leave', icon: 'leaves' as IconName },
              { tab: 'requests', label: 'Requests', icon: 'task' as IconName },
              { tab: 'documents', label: 'Documents', icon: 'document' as IconName },
              { tab: 'chat', label: 'AI Assistant', icon: 'bot' as IconName },
            ].map((item) => (
              <TouchableOpacity
                key={item.tab}
                style={styles.shortcutItem}
                onPress={() => onNavigate(item.tab)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.shortcutIconBg,
                    {
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Icon name={item.icon} size={22} color={theme.textPrimary} />
                </View>
                <Text style={[styles.shortcutText, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Upcoming Holiday Banner */}
        <View style={[styles.holidayBanner, { backgroundColor: theme.isDark ? theme.primary + '18' : theme.primary + '12', borderColor: theme.isDark ? theme.primary + '40' : theme.primary + '30' }]}>
          <View style={[styles.holidayIconBg, { backgroundColor: theme.isDark ? theme.accent + '25' : theme.accentSoft }]}>
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
          <TouchableOpacity style={[styles.viewHolidayBtn, { backgroundColor: theme.primary }]} onPress={() => onNavigate('holidays')} activeOpacity={0.85}>
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
    paddingBottom: 110,
  },


  unifiedHeroCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
    ...SHADOWS.md,
  },
  cardBannerContainer: {
    width: '100%',
    aspectRatio: 3 / 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  cardBannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  cardBannerContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  cardBodyContainer: {
    padding: 16,
    paddingTop: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '65%',
  },
  shiftText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroGreetingContent: {
    justifyContent: 'flex-end',
    gap: 2,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginBottom: 14,
  },
  fullWidthActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    ...SHADOWS.sm,
  },
  fullWidthActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 3,
  },
  locationDetail: {
    fontSize: 12.5,
  },
  quickPunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  quickPunchText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 44) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  statIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfoCol: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  shortcutsContainer: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 6,
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  shortcutItem: {
    width: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  shortcutIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutText: {
    fontSize: 12.5,
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
    gap: 14,
  },
  holidayIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  holidayDate: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  viewHolidayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewHolidayText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  biometricCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
    ...SHADOWS.md,
  },
  biometricCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  biometricIconContainer: {
    position: 'relative',
  },
  biometricIconOuterRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
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
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pendingPill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  biometricCardSub: {
    fontSize: 13.5,
    marginTop: 3,
    lineHeight: 18,
  },
  enrollBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  enrollBtnText: {
    color: '#ffffff',
    fontSize: 14,
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
