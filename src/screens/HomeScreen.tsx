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

  const presentCount = attendance.filter((a) => a.status === 'present').length || 18;

  const branches = companyConfig?.branches || [];
  const branchName = branches.find((b: any) => b.id === currentUser?.branchId)?.name || currentUser?.branch || 'HQ Branch';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
      }
    >
      {/* Hero Welcome Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.shiftBadge, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
            <Icon name="clock" size={12} color={theme.primary} />
            <Text style={[styles.shiftText, { color: theme.primary }]}>
              {currentUser?.shift || 'Regular Shift (09:00 AM - 06:00 PM)'}
            </Text>
          </View>
          <Text style={[styles.heroDate, { color: theme.textMuted }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>
          Welcome back, {currentUser?.name?.split(' ')[0] || 'Alex'}
        </Text>
        <Text style={[styles.greetingSub, { color: theme.textMuted }]}>
          {currentUser?.designation || 'Software Engineer'} • {currentUser?.department || 'Engineering'}
        </Text>

        {/* Today's Status Widget */}
        <View style={[styles.punchWidget, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Today's Status</Text>
            <Text style={[styles.statusValue, { color: isClockedIn ? theme.success : theme.warning }]}>
              {isClockedIn && todayRecord ? `Checked In (${todayRecord.clockIn})` : 'Not Checked In'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="location" size={10} color={theme.textMuted} />
              <Text style={[styles.locationDetail, { color: theme.textMuted }]}>
                {branchName} • Geofence Verified
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monthly Attendance Summary Metrics */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Attendance Monthly Highlights</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderLeftColor: theme.success }]}>
          <Icon name="check" size={18} color={theme.success} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{presentCount} Days</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Present</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderLeftColor: theme.warning }]}>
          <Icon name="clock" size={18} color={theme.warning} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>2.5 Hrs</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Overtime</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderLeftColor: theme.cyan }]}>
          <Icon name="leaves" size={18} color={theme.cyan} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>2 Days</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Leaves Taken</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderLeftColor: theme.accent }]}>
          <Icon name="sparkles" size={18} color={theme.accent} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>100%</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>On-Time Score</Text>
        </View>
      </View>

      {/* Quick App Navigation Shortcuts */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Shortcuts</Text>
      <View style={styles.shortcutsGrid}>
        {[
          { tab: 'attendance', label: 'Attendance', icon: 'clock' as IconName, color: theme.primary },
          { tab: 'payroll', label: 'Payslips', icon: 'payroll' as IconName, color: theme.cyan },
          { tab: 'leaves', label: 'Apply Leave', icon: 'leaves' as IconName, color: theme.accent },
          { tab: 'documents', label: 'Documents', icon: 'document' as IconName, color: '#a855f7' },
          { tab: 'chat', label: 'AI Assistant', icon: 'bot' as IconName, color: '#ec4899' },
        ].map((item) => (
          <TouchableOpacity
            key={item.tab}
            style={[styles.shortcutItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => onNavigate(item.tab)}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: item.color + '15' }]}>
              <Icon name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.shortcutText, { color: theme.textPrimary }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next Upcoming Holiday Banner */}
      <View style={[styles.holidayBanner, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <View style={[styles.holidayIconBg, { backgroundColor: theme.card }]}>
          <Icon name="holiday" size={22} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.holidayTitle, { color: theme.textPrimary }]}>Next Holiday: Independence Day</Text>
          <Text style={[styles.holidayDate, { color: theme.accent }]}>Friday, 15 Aug • Paid Public Holiday</Text>
        </View>
        <TouchableOpacity style={[styles.viewHolidayBtn, { backgroundColor: theme.accent }]} onPress={() => onNavigate('holidays')}>
          <Text style={styles.viewHolidayText}>View All</Text>
        </TouchableOpacity>
      </View>
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
  heroCard: {
    borderRadius: 20,
    padding: 18,
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
    paddingVertical: 4,
    borderRadius: 12,
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
    borderRadius: 16,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 2,
  },
  locationDetail: {
    fontSize: 10,
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  punchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 42) / 2,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  shortcutItem: {
    width: (width - 56) / 3,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  shortcutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  holidayIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  holidayDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  viewHolidayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewHolidayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dueDate: {
    fontSize: 11,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  taskSub: {
    fontSize: 12,
  },
});
