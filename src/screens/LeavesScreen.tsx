import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

interface LeavesScreenProps {
  theme: ThemeColors;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface TimeState {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

export function LeavesScreen({ theme }: LeavesScreenProps) {
  const { leaves, applyLeave, refreshData, currentUser, companyConfig } = useAppContext();

  const [requestType, setRequestType] = useState<'leave' | 'permission'>('leave');
  const [leaveCategory, setLeaveCategory] = useState<'Casual' | 'Sick' | 'Earned'>('Casual');
  const [leaveDurationType, setLeaveDurationType] = useState<'single' | 'half' | 'range'>('single');
  const [halfDaySession, setHalfDaySession] = useState<'Morning (1st Half)' | 'Afternoon (2nd Half)'>('Morning (1st Half)');

  // Leave Date Selection
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Permission Date & Clock Time Selection
  const [permissionDate, setPermissionDate] = useState<Date>(new Date());
  const [permStartTime, setPermStartTime] = useState<TimeState>({ hour: 4, minute: 0, period: 'PM' });
  const [permEndTime, setPermEndTime] = useState<TimeState>({ hour: 5, minute: 0, period: 'PM' });
  const [permissionSlotDuration, setPermissionSlotDuration] = useState<'1' | '1.5' | '2'>('1');

  // Reason & Refreshing
  const [reason, setReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Calendar Modal State
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end' | 'permission'>('start');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // Clock Picker Modal State
  const [clockVisible, setClockVisible] = useState(false);
  const [clockTarget, setClockTarget] = useState<'start' | 'end'>('start');
  const [tempTime, setTempTime] = useState<TimeState>({ hour: 4, minute: 0, period: 'PM' });

  const isLeaveEligible = currentUser?.leaveApplyEligible !== false;

  // Real-time dynamic leave balance calculations
  const userApprovedLeaves = leaves.filter(
    (l) => (l.employeeId === currentUser?.id || l.employeeName === currentUser?.name) && l.status === 'Approved'
  );

  const usedCasual = userApprovedLeaves
    .filter((l) => l.type.toLowerCase().includes('casual'))
    .reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const usedSick = userApprovedLeaves
    .filter((l) => l.type.toLowerCase().includes('sick'))
    .reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const usedEarned = userApprovedLeaves
    .filter((l) => l.type.toLowerCase().includes('earned'))
    .reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const usedPermission = userApprovedLeaves
    .filter((l) => l.type.toLowerCase().includes('permission'))
    .reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const totalCasual = companyConfig?.leaveQuota?.casual || 12;
  const totalSick = companyConfig?.leaveQuota?.sick || 8;
  const totalEarned = companyConfig?.leaveQuota?.earned || 15;
  const totalPermission = companyConfig?.permissionQuota || 2;

  const casualBal = Math.max(0, totalCasual - usedCasual);
  const sickBal = Math.max(0, totalSick - usedSick);
  const earnedBal = Math.max(0, totalEarned - usedEarned);
  const permBal = Math.max(0, totalPermission - usedPermission);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Date Formatting Helpers
  const formatDate = (d: Date): string => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (d: Date): string => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Time Formatting Helpers
  const formatTimeStr = (t: TimeState): string => {
    const hh = String(t.hour).padStart(2, '0');
    const mm = String(t.minute).padStart(2, '0');
    return `${hh}:${mm} ${t.period}`;
  };

  // Calculate Difference in Days for Multi-Day Range
  const calculatedDaysCount = useMemo(() => {
    if (leaveDurationType === 'half') return 0.5;
    if (leaveDurationType === 'single') return 1;
    const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [leaveDurationType, startDate, endDate]);

  // Open Calendar Picker Modal
  const openCalendar = (target: 'start' | 'end' | 'permission') => {
    setCalendarTarget(target);
    const initialDate = target === 'start' ? startDate : target === 'end' ? endDate : permissionDate;
    setCalendarViewDate(new Date(initialDate));
    setCalendarVisible(true);
  };

  // Open Clock Picker Modal
  const openClock = (target: 'start' | 'end') => {
    setClockTarget(target);
    setTempTime(target === 'start' ? { ...permStartTime } : { ...permEndTime });
    setClockVisible(true);
  };

  // Quick Preset Helper for Time Slot
  const applyQuickTimeSlot = (startH: number, startM: number, startP: 'AM' | 'PM', endH: number, endM: number, endP: 'AM' | 'PM', duration: '1' | '1.5' | '2') => {
    setPermStartTime({ hour: startH, minute: startM, period: startP });
    setPermEndTime({ hour: endH, minute: endM, period: endP });
    setPermissionSlotDuration(duration);
  };

  // Handle Calendar Day Selection
  const handleSelectCalendarDay = (day: number) => {
    const selected = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    if (calendarTarget === 'start') {
      setStartDate(selected);
      if (selected.getTime() > endDate.getTime()) {
        setEndDate(selected);
      }
    } else if (calendarTarget === 'end') {
      if (selected.getTime() < startDate.getTime()) {
        setStartDate(selected);
      }
      setEndDate(selected);
    } else {
      setPermissionDate(selected);
    }
    setCalendarVisible(false);
  };

  // Month Navigation in Calendar
  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
  };

  // Build Month Days Matrix
  const monthDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number | null; isToday?: boolean; isSelected?: boolean; inRange?: boolean }[] = [];
    const today = new Date();

    // Leading blanks
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null });
    }

    const activeTargetDate = calendarTarget === 'start' ? startDate : calendarTarget === 'end' ? endDate : permissionDate;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = activeTargetDate.getDate() === d && activeTargetDate.getMonth() === month && activeTargetDate.getFullYear() === year;

      let inRange = false;
      if (leaveDurationType === 'range' && calendarTarget !== 'permission') {
        const thisDate = new Date(year, month, d).getTime();
        inRange = thisDate >= startDate.getTime() && thisDate <= endDate.getTime();
      }

      days.push({ day: d, isToday, isSelected, inRange });
    }

    return days;
  }, [calendarViewDate, calendarTarget, startDate, endDate, permissionDate, leaveDurationType]);

  // Handle Form Submission
  const handleSubmit = async () => {
    if (!isLeaveEligible) {
      Alert.alert(
        'Leave Applications Locked',
        'Leave applications are currently not enabled for your account by your HR administrator.'
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a valid reason for your request.');
      return;
    }

    let typeStr = '';
    let datesStr = '';
    let daysStr = '';

    if (requestType === 'leave') {
      typeStr = `${leaveCategory} Leave`;
      if (leaveDurationType === 'single') {
        datesStr = formatDate(startDate);
        daysStr = '1 Day';
      } else if (leaveDurationType === 'half') {
        datesStr = `${formatDate(startDate)} (${halfDaySession})`;
        daysStr = '0.5 Day';
      } else {
        datesStr = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        daysStr = `${calculatedDaysCount} Days`;
      }
    } else {
      const timeWindow = `${formatTimeStr(permStartTime)} - ${formatTimeStr(permEndTime)}`;
      typeStr = `Short Permission (${permissionSlotDuration} Hr)`;
      datesStr = `${formatDate(permissionDate)} (${timeWindow})`;
      daysStr = `${permissionSlotDuration} Hr`;
    }

    await applyLeave({
      type: typeStr,
      startDate: datesStr,
      endDate: datesStr,
      days: daysStr,
      reason: reason.trim(),
      status: 'Pending',
    });

    setReason('');
    Alert.alert(
      'Application Submitted! 🎉',
      `Your request for ${typeStr} on ${datesStr} has been submitted for review.`
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
      }
    >
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Leave & Permission Management</Text>

      {/* Leave Balances Cards */}
      <View style={styles.balanceGrid}>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.cyan }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>{casualBal} / {totalCasual}</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Casual Leave (CL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.warning }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>{sickBal} / {totalSick}</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Sick Leave (SL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.success }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>{earnedBal} / {totalEarned}</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Earned Leave (EL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.accent }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>{permBal} Hrs</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Monthly Permission</Text>
        </View>
      </View>

      {/* Application Form */}
      <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.formHeader, { color: theme.textPrimary }]}>Apply New Request</Text>

        {!isLeaveEligible && (
          <View style={[styles.lockedBanner, { backgroundColor: theme.danger + '18', borderColor: theme.danger + '40' }]}>
            <Icon name="shield" size={20} color={theme.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.lockedTitle, { color: theme.danger }]}>Leave Applications Locked</Text>
              <Text style={[styles.lockedSubtitle, { color: theme.textMuted }]}>
                Your account is not enabled for leave applications by HR. Please contact your HR Manager.
              </Text>
            </View>
          </View>
        )}

        {/* Toggle Request Type */}
        <View style={[styles.typeToggle, { backgroundColor: theme.inputBg, opacity: isLeaveEligible ? 1 : 0.6 }]}>
          <TouchableOpacity
            style={[styles.toggleOption, requestType === 'leave' && { backgroundColor: theme.primary }]}
            onPress={() => isLeaveEligible && setRequestType('leave')}
            disabled={!isLeaveEligible}
          >
            <Text style={[styles.toggleText, { color: theme.textMuted }, requestType === 'leave' && { color: '#ffffff' }]}>
              Leave Request
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, requestType === 'permission' && { backgroundColor: theme.primary }]}
            onPress={() => isLeaveEligible && setRequestType('permission')}
            disabled={!isLeaveEligible}
          >
            <Text style={[styles.toggleText, { color: theme.textMuted }, requestType === 'permission' && { color: '#ffffff' }]}>
              Short Permission
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. LEAVE REQUEST SECTION */}
        {requestType === 'leave' ? (
          <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
            {/* Leave Category */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Leave Category</Text>
            <View style={styles.categoryRow}>
              {(['Casual', 'Sick', 'Earned'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    leaveCategory === cat && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => isLeaveEligible && setLeaveCategory(cat)}
                  disabled={!isLeaveEligible}
                >
                  <Text style={[styles.catText, { color: theme.textMuted }, leaveCategory === cat && { color: '#ffffff' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Leave Duration Type Selection */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Leave Duration Mode</Text>
            <View style={styles.categoryRow}>
              {[
                { id: 'single', label: 'Single Day' },
                { id: 'half', label: 'Half Day' },
                { id: 'range', label: 'Date Range' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.catChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    leaveDurationType === item.id && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => isLeaveEligible && setLeaveDurationType(item.id as any)}
                  disabled={!isLeaveEligible}
                >
                  <Text style={[styles.catText, { color: theme.textMuted }, leaveDurationType === item.id && { color: '#ffffff' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Half Day Session Selector */}
            {leaveDurationType === 'half' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Half-Day Session</Text>
                <View style={styles.categoryRow}>
                  {['Morning (1st Half)', 'Afternoon (2nd Half)'].map((session) => (
                    <TouchableOpacity
                      key={session}
                      style={[
                        styles.catChip,
                        { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                        halfDaySession === session && { backgroundColor: theme.warning, borderColor: theme.warning },
                      ]}
                      onPress={() => isLeaveEligible && setHalfDaySession(session as any)}
                      disabled={!isLeaveEligible}
                    >
                      <Text style={[styles.catText, { color: theme.textMuted }, halfDaySession === session && { color: '#ffffff' }]}>
                        {session}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Calendar Date Picker Pickers */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
              {leaveDurationType === 'range' ? 'Select Start & End Dates' : 'Select Leave Date'}
            </Text>

            {leaveDurationType === 'range' ? (
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  onPress={() => isLeaveEligible && openCalendar('start')}
                  disabled={!isLeaveEligible}
                >
                  <Icon name="calendar" size={18} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>Start Date</Text>
                    <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(startDate)}</Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  onPress={() => isLeaveEligible && openCalendar('end')}
                  disabled={!isLeaveEligible}
                >
                  <Icon name="calendar" size={18} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>End Date</Text>
                    <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(endDate)}</Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.dateSelectorBtnSingle, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => isLeaveEligible && openCalendar('start')}
                disabled={!isLeaveEligible}
              >
                <Icon name="calendar" size={20} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>
                    {leaveDurationType === 'half' ? `Leave Date (${halfDaySession})` : 'Leave Date (Full Day)'}
                  </Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(startDate)}</Text>
                </View>
                <View style={[styles.changeBadge, { backgroundColor: theme.primary + '18' }]}>
                  <Text style={[styles.changeBadgeText, { color: theme.primary }]}>Pick Date 📅</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Total Duration Summary Pill */}
            <View style={[styles.summaryPill, { backgroundColor: theme.cardBorder + '30', borderColor: theme.cardBorder }]}>
              <Icon name="info" size={14} color={theme.primary} />
              <Text style={[styles.summaryPillText, { color: theme.textPrimary }]}>
                Total Requested: <Text style={{ fontWeight: '800', color: theme.primary }}>{calculatedDaysCount} Day(s)</Text>
                {leaveDurationType === 'range' && ` • (${formatShortDate(startDate)} to ${formatShortDate(endDate)})`}
              </Text>
            </View>
          </View>
        ) : (
          /* 2. SHORT PERMISSION REQUEST SECTION */
          <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
            {/* Permission Date Picker */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Permission Date</Text>
            <TouchableOpacity
              style={[styles.dateSelectorBtnSingle, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => isLeaveEligible && openCalendar('permission')}
              disabled={!isLeaveEligible}
            >
              <Icon name="calendar" size={20} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>Scheduled Date</Text>
                <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(permissionDate)}</Text>
              </View>
              <View style={[styles.changeBadge, { backgroundColor: theme.accent + '18' }]}>
                <Text style={[styles.changeBadgeText, { color: theme.accent }]}>Pick Date 📅</Text>
              </View>
            </TouchableOpacity>

            {/* Clock Time Window Selectors */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 14 }]}>
              Select Permission Time Slot (Clock)
            </Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => isLeaveEligible && openClock('start')}
                disabled={!isLeaveEligible}
              >
                <Icon name="clock" size={18} color={theme.warning} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>From Time</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatTimeStr(permStartTime)}</Text>
                </View>
                <Icon name="chevron-right" size={14} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => isLeaveEligible && openClock('end')}
                disabled={!isLeaveEligible}
              >
                <Icon name="clock" size={18} color={theme.warning} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>To Time</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatTimeStr(permEndTime)}</Text>
                </View>
                <Icon name="chevron-right" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Preset Slots */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 12 }]}>Quick Permission Presets</Text>
            <View style={styles.presetSlotRow}>
              <TouchableOpacity
                style={[styles.presetSlotChip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => applyQuickTimeSlot(9, 30, 'AM', 10, 30, 'AM', '1')}
              >
                <Text style={[styles.presetSlotText, { color: theme.textPrimary }]}>09:30 AM (Late Login)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetSlotChip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => applyQuickTimeSlot(4, 30, 'PM', 5, 30, 'PM', '1')}
              >
                <Text style={[styles.presetSlotText, { color: theme.textPrimary }]}>04:30 PM (Early Exit)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetSlotChip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => applyQuickTimeSlot(3, 30, 'PM', 5, 30, 'PM', '2')}
              >
                <Text style={[styles.presetSlotText, { color: theme.textPrimary }]}>03:30 PM (2 Hrs Slot)</Text>
              </TouchableOpacity>
            </View>

            {/* Duration Chip Selector */}
            <View style={[styles.summaryPill, { backgroundColor: theme.cardBorder + '30', borderColor: theme.cardBorder, marginTop: 12 }]}>
              <Icon name="clock" size={14} color={theme.accent} />
              <Text style={[styles.summaryPillText, { color: theme.textPrimary }]}>
                Window: <Text style={{ fontWeight: '800', color: theme.accent }}>{formatTimeStr(permStartTime)} to {formatTimeStr(permEndTime)}</Text> ({permissionSlotDuration} Hr)
              </Text>
            </View>
          </View>
        )}

        {/* Reason Input */}
        <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 14 }]}>Reason for Request</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder },
            !isLeaveEligible && { opacity: 0.6 }
          ]}
          placeholder={isLeaveEligible ? "Enter detailed reason for manager review..." : "Leave applications are currently locked..."}
          placeholderTextColor={theme.textMuted}
          value={reason}
          onChangeText={setReason}
          editable={isLeaveEligible}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isLeaveEligible ? theme.primary : theme.cardBorder },
            !isLeaveEligible && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          activeOpacity={isLeaveEligible ? 0.8 : 1}
        >
          <Text style={[styles.submitBtnText, !isLeaveEligible && { color: theme.textMuted }]}>
            {isLeaveEligible ? 'Submit Application →' : '🔒 Leave Application Locked by HR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Request History</Text>
      {leaves.filter((l) => l.employeeId === currentUser?.id || l.employeeName === currentUser?.name).length === 0 ? (
        <View style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder, alignItems: 'center', paddingVertical: 20 }]}>
          <Text style={[{ color: theme.textMuted, fontSize: 12 }]}>No leave or permission requests submitted yet.</Text>
        </View>
      ) : (
        leaves
          .filter((l) => l.employeeId === currentUser?.id || l.employeeName === currentUser?.name)
          .map((item) => {
            const badgeColor = item.status === 'Approved' ? theme.success : item.status === 'Rejected' ? theme.danger : theme.warning;
            return (
              <View key={item.id} style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyType, { color: theme.textPrimary }]}>{item.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badgeColor + '25' }]}>
                    <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={[styles.historyDates, { color: theme.accent }]}>📅 {item.startDate} ({item.days})</Text>
                <Text style={[styles.historyReason, { color: theme.textMuted }]}>Reason: {item.reason}</Text>
                {item.actedBy ? (
                  <Text style={[styles.historyReason, { color: badgeColor, marginTop: 4, fontWeight: '600' }]}>
                    {item.status} by {item.actedBy}{item.approverComment ? ` · "${item.approverComment}"` : ''}
                  </Text>
                ) : null}
              </View>
            );
          })
      )}

      {/* 1. INTERACTIVE CALENDAR MODAL */}
      <Modal visible={calendarVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Calendar Header with Month Navigation */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Date 📅</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  {calendarTarget === 'start' ? 'Start Date' : calendarTarget === 'end' ? 'End Date' : 'Permission Date'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Month / Year Bar */}
            <View style={[styles.calendarMonthBar, { backgroundColor: theme.inputBg }]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                <Icon name="chevron-left" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthText, { color: theme.textPrimary }]}>
                {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                <Icon name="chevron-right" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Weekday Names Header */}
            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={[styles.weekDayText, { color: theme.textMuted }]}>{wd}</Text>
              ))}
            </View>

            {/* Calendar Days Matrix Grid */}
            <View style={styles.daysGrid}>
              {monthDays.map((item, idx) => {
                if (item.day === null) {
                  return <View key={`blank-${idx}`} style={styles.dayCellEmpty} />;
                }
                const isSelected = item.isSelected;
                const inRange = item.inRange;
                return (
                  <TouchableOpacity
                    key={`day-${item.day}`}
                    style={[
                      styles.dayCell,
                      inRange && { backgroundColor: theme.primary + '25' },
                      isSelected && { backgroundColor: theme.primary, borderRadius: 12 },
                    ]}
                    onPress={() => handleSelectCalendarDay(item.day!)}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        { color: theme.textPrimary },
                        item.isToday && { color: theme.accent, fontWeight: '900' },
                        isSelected && { color: '#ffffff', fontWeight: '900' },
                      ]}
                    >
                      {item.day}
                    </Text>
                    {item.isToday && !isSelected && <View style={[styles.todayDot, { backgroundColor: theme.accent }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Date Shortcuts */}
            <View style={styles.quickDateShortcuts}>
              <TouchableOpacity
                style={[styles.quickDateBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => {
                  const today = new Date();
                  if (calendarTarget === 'start') setStartDate(today);
                  else if (calendarTarget === 'end') setEndDate(today);
                  else setPermissionDate(today);
                  setCalendarVisible(false);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.textPrimary }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => {
                  const tmrw = new Date();
                  tmrw.setDate(tmrw.getDate() + 1);
                  if (calendarTarget === 'start') setStartDate(tmrw);
                  else if (calendarTarget === 'end') setEndDate(tmrw);
                  else setPermissionDate(tmrw);
                  setCalendarVisible(false);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.textPrimary }]}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. INTERACTIVE CLOCK / TIME PICKER MODAL */}
      <Modal visible={clockVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Clock Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Pick Time Slot 🕒</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  {clockTarget === 'start' ? 'Starting Time' : 'Ending Time'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setClockVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Big Digital Display & AM/PM Toggle */}
            <View style={[styles.digitalClockDisplay, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.digitalTimeText, { color: theme.textPrimary }]}>
                {String(tempTime.hour).padStart(2, '0')} : {String(tempTime.minute).padStart(2, '0')}
              </Text>
              <View style={styles.periodToggle}>
                <TouchableOpacity
                  style={[
                    styles.periodBtn,
                    tempTime.period === 'AM' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setTempTime((prev) => ({ ...prev, period: 'AM' }))}
                >
                  <Text style={[styles.periodBtnText, tempTime.period === 'AM' && { color: '#ffffff', fontWeight: '800' }]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodBtn,
                    tempTime.period === 'PM' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setTempTime((prev) => ({ ...prev, period: 'PM' }))}
                >
                  <Text style={[styles.periodBtnText, tempTime.period === 'PM' && { color: '#ffffff', fontWeight: '800' }]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hour Selection Grid (1 - 12) */}
            <Text style={[styles.clockSectionLabel, { color: theme.textMuted }]}>Hour</Text>
            <View style={styles.clockNumbersGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <TouchableOpacity
                  key={`hour-${h}`}
                  style={[
                    styles.clockNumBtn,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    tempTime.hour === h && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setTempTime((prev) => ({ ...prev, hour: h }))}
                >
                  <Text style={[styles.clockNumText, { color: theme.textPrimary }, tempTime.hour === h && { color: '#ffffff', fontWeight: '900' }]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Minute Selection Grid (00, 15, 30, 45) */}
            <Text style={[styles.clockSectionLabel, { color: theme.textMuted, marginTop: 12 }]}>Minutes</Text>
            <View style={styles.minuteRow}>
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={`min-${m}`}
                  style={[
                    styles.minuteBtn,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    tempTime.minute === m && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setTempTime((prev) => ({ ...prev, minute: m }))}
                >
                  <Text style={[styles.minuteBtnText, { color: theme.textPrimary }, tempTime.minute === m && { color: '#ffffff', fontWeight: '900' }]}>
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confirm Time Button */}
            <TouchableOpacity
              style={[styles.clockConfirmBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (clockTarget === 'start') {
                  setPermStartTime(tempTime);
                } else {
                  setPermEndTime(tempTime);
                }
                setClockVisible(false);
              }}
            >
              <Text style={styles.clockConfirmBtnText}>Apply Selected Time ({formatTimeStr(tempTime)}) →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  balanceCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 4,
    borderWidth: 1,
  },
  balanceNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  balanceLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  formHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  catText: {
    fontSize: 11,
    fontWeight: '700',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateSelectorBtnSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  datePickerSubtext: {
    fontSize: 10,
    fontWeight: '500',
  },
  datePickerMainText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetSlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetSlotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetSlotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    height: 75,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 16,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  historyItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  lockedSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyDates: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 12,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },

  // Calendar Modal Elements
  calendarMonthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  navArrowBtn: {
    padding: 6,
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  quickDateShortcuts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Clock Modal Elements
  digitalClockDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  digitalTimeText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clockSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  clockNumbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  clockNumBtn: {
    width: '14.5%',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockNumText: {
    fontSize: 13,
    fontWeight: '700',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  minuteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  minuteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clockConfirmBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  clockConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
