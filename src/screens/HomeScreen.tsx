import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  theme: ThemeColors;
  onNavigate: (tab: any) => void;
}

export function HomeScreen({ theme, onNavigate }: HomeScreenProps) {
  const { currentUser, attendance, isClockedIn, companyConfig, todayRecord, refreshData } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const presentCount = attendance.filter((a) => a.status === 'present').length || 3;

  const branches = companyConfig?.branches || [];
  const branchName = branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'Branch 2 Erode';
  const userName = currentUser?.name?.split(' ')[0] || 'YUJI';

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
        {/* Hero Welcome Banner */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.shiftBadge, { backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.15)' : '#e0f2fe', borderColor: theme.isDark ? 'rgba(6, 182, 212, 0.3)' : '#bae6fd' }]}>
              <Icon name="clock" size={12} color={theme.cyan} />
              <Text style={[styles.shiftText, { color: theme.cyan }]}>
                {currentUser?.shift || 'Regular Shift  09:00 AM - 06:00 PM'}
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
              <Text style={[styles.statusValue, { color: isClockedIn ? theme.success : theme.danger }]}>
                {isClockedIn && todayRecord ? `Checked In (${todayRecord.clockIn})` : 'Not Checked In'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="location" size={12} color={theme.textMuted} />
                <Text style={[styles.locationDetail, { color: theme.textMuted }]}>
                  {branchName} • Geofence Verified
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.quickPunchBtn, { backgroundColor: isClockedIn ? theme.success : theme.cyan }]}
              onPress={() => onNavigate('attendance')}
              activeOpacity={0.85}
            >
              <Icon name="camera" size={16} color="#ffffff" />
              <Text style={styles.quickPunchText}>{isClockedIn ? 'Check Out' : 'Check In'}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>2.5 Hrs</Text>
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
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>2 Days</Text>
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
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>100%</Text>
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
            <Text style={[styles.holidayTitle, { color: theme.textPrimary }]}>Next Holiday: Independence Day</Text>
            <Text style={[styles.holidayDate, { color: theme.textMuted }]}>Friday, 15 Aug • Paid Public Holiday</Text>
          </View>
          <TouchableOpacity style={[styles.viewHolidayBtn, { backgroundColor: theme.cyan }]} onPress={() => onNavigate('holidays')} activeOpacity={0.85}>
            <Text style={styles.viewHolidayText}>View All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
});
