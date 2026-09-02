import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import Svg, { Circle, G } from 'react-native-svg';
import { useAppContext, LeaveRequest } from '../context/AppContext';

interface LeavesScreenProps {
  theme: ThemeColors;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartItemProps {
  id: string;
  code: string;
  fullName: string;
  subText: string;
  available: number;
  total: number;
  color: string;
  theme: ThemeColors;
}

const DonutChartItem: React.FC<DonutChartItemProps> = React.memo(({
  fullName,
  subText,
  available,
  total,
  color,
  theme,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const targetFraction = Math.min(1, Math.max(0.04, available / (total || 1)));

  useEffect(() => {
    animValue.setValue(0);
    setDisplayed(0);

    Animated.timing(animValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();

    let start: number | null = null;
    const duration = 1000;
    let animId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(available * ease));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayed(Math.round(available));
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [available, total]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - targetFraction)],
  });

  return (
    <View style={styles.donutCard}>
      {/* Bold Donut SVG Ring with Centered Count */}
      <View style={styles.donutRingWrapper}>
        <Svg width={96} height={96} viewBox="0 0 96 96">
          {/* Background Track Circle */}
          <Circle
            cx={48}
            cy={48}
            r={radius}
            stroke={theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}
            strokeWidth={9.5}
            fill="none"
          />
          {/* Active Bold Animated Progress Circle */}
          <AnimatedCircle
            cx={48}
            cy={48}
            r={radius}
            stroke={color}
            strokeWidth={9.5}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
        </Svg>

        {/* Days Count in Middle of Donut */}
        <View style={styles.donutCenterOverlay}>
          <Text style={[styles.donutCenterCount, { color: theme.textPrimary }]}>
            {displayed}/{Math.round(total)}
          </Text>
        </View>
      </View>

      {/* Leave Name Below Donut Graph */}
      <View style={styles.donutMeta}>
        <Text style={[styles.donutLeaveName, { color: theme.textPrimary }]} numberOfLines={1}>
          {fullName}
        </Text>
        <Text style={[styles.donutSubText, { color: theme.textMuted }]} numberOfLines={1}>
          {subText}
        </Text>
      </View>
    </View>
  );
});

interface TimeState {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

export function LeavesScreen({ theme }: LeavesScreenProps) {
  const { leaves, applyLeave, actOnLeave, canApproveLeaves, refreshData, currentUser, companyConfig } = useAppContext();

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

  // Manager Action Notes Modal State
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionTargetLeave, setActionTargetLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve_forward' | 'approve_close' | 'reject' | 'escalate'>('approve_forward');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Policy Modal & Animation states
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [segmentedWidth, setSegmentedWidth] = useState(0);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;

  const handleSwitchRequestType = (type: 'leave' | 'permission') => {
    if (type === requestType) return;
    Animated.spring(tabSlideAnim, {
      toValue: type === 'leave' ? 0 : 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
    }).start();

    Animated.sequence([
      Animated.timing(tabFadeAnim, {
        toValue: 0.25,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setRequestType(type);
  };

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

  const totalCasual = companyConfig?.leaveQuota?.casual || (companyConfig as any)?.leaveTypes?.find((l: any) => l.name?.toLowerCase().includes('casual'))?.days || 12;
  const totalSick = companyConfig?.leaveQuota?.sick || (companyConfig as any)?.leaveTypes?.find((l: any) => l.name?.toLowerCase().includes('sick'))?.days || 8;
  const totalEarned = companyConfig?.leaveQuota?.earned || (companyConfig as any)?.leaveTypes?.find((l: any) => l.name?.toLowerCase().includes('earned'))?.days || 15;

  // Permission quota: read from separate permissionTypes first, fallback to configured leaveType or legacy permissionQuota
  const activePermissionType = (companyConfig as any)?.permissionTypes?.[0] ||
    (companyConfig as any)?.permissionTypes?.find((p: any) => p.name?.toLowerCase().includes('permission'));
  const permissionLeaveType = (companyConfig as any)?.leaveTypes?.find((l: any) =>
    l.name?.toLowerCase().includes('permission') || l.name?.toLowerCase().includes('short')
  );
  // Determine period window for permission balance
  const permPeriod: 'month' | 'year' = activePermissionType?.period || permissionLeaveType?.permissionPeriod || 'month';
  const totalPermission = activePermissionType?.maxHours ?? permissionLeaveType?.permissionHours ?? companyConfig?.permissionQuota ?? 2;

  // Filter permission used leaves scoped to correct period
  const permPeriodLeaves = userApprovedLeaves.filter((l) => {
    if (!l.type.toLowerCase().includes('permission')) return false;
    const refDate = l.startDate || l.endDate;
    if (!refDate) return true;
    const d = new Date(refDate);
    const now = new Date();
    if (permPeriod === 'year') return d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const usedPermission = permPeriodLeaves.reduce((sum, l) => sum + (parseFloat(l.days) || 1), 0);

  const casualBal = Math.max(0, totalCasual - usedCasual);
  const sickBal = Math.max(0, totalSick - usedSick);
  const earnedBal = Math.max(0, totalEarned - usedEarned);
  const permBal = Math.max(0, totalPermission - usedPermission);

  // Determine remaining balance for the currently selected leave type/category
  const currentLeaveBalance = (() => {
    if (requestType === 'permission') return permBal;
    if (leaveCategory === 'Casual') return casualBal;
    if (leaveCategory === 'Sick') return sickBal;
    if (leaveCategory === 'Earned') return earnedBal;
    return 0;
  })();
  const currentLeaveTotal = (() => {
    if (requestType === 'permission') return totalPermission;
    if (leaveCategory === 'Casual') return totalCasual;
    if (leaveCategory === 'Sick') return totalSick;
    if (leaveCategory === 'Earned') return totalEarned;
    return 0;
  })();
  const isBalanceExhausted = currentLeaveBalance <= 0;

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

  // For multi-day requests, also check if days requested exceeds balance
  const requestedUnits = requestType === 'permission'
    ? parseFloat(permissionSlotDuration)
    : calculatedDaysCount || 1;
  const wouldExceedBalance = requestedUnits > currentLeaveBalance;
  const isSubmitDisabled = !isLeaveEligible || isBalanceExhausted || wouldExceedBalance;

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

    // Balance check before submitting
    if (isBalanceExhausted) {
      const unitLabel = requestType === 'permission' ? 'hours' : 'days';
      const typeName = requestType === 'permission' ? 'Permission' : `${leaveCategory} Leave`;
      Alert.alert(
        'Insufficient Leave Balance',
        `You have no remaining ${typeName} balance (${currentLeaveBalance} ${unitLabel} left out of ${currentLeaveTotal} ${unitLabel}).`
      );
      return;
    }

    if (wouldExceedBalance) {
      const unitLabel = requestType === 'permission' ? 'hours' : 'days';
      const typeName = requestType === 'permission' ? 'Permission' : `${leaveCategory} Leave`;
      Alert.alert(
        'Insufficient Leave Balance',
        `You requested ${requestedUnits} ${unitLabel} of ${typeName} but only ${currentLeaveBalance} ${unitLabel} remain.`
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

      {/* 1. TOP CARD: Vertical Leave & Permission Balance Bar Chart (Matching Prototype) */}
      <View style={[styles.barChartCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.chartHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chartHeaderTitle, { color: theme.textPrimary }]}>Leave &amp; Permission Balance</Text>
            <Text style={[styles.chartHeaderSubtitle, { color: theme.textMuted }]}>Yearly Allocation &amp; Available Units</Text>
          </View>
          <View style={[styles.chartBadge, { backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe', borderColor: theme.primary }]}>
            <Text style={[styles.chartBadgeText, { color: theme.primary }]}>2026 Quota</Text>
          </View>
        </View>

        {/* 2x2 Grid of Animated Donut Graphs */}
        <View style={styles.donutGrid2x2}>
          {[
            {
              id: 'cl',
              code: 'CL',
              fullName: 'Casual Leave',
              subText: 'Annual Quota',
              available: casualBal,
              total: totalCasual,
              color: theme.primary,
            },
            {
              id: 'sl',
              code: 'SL',
              fullName: 'Sick Leave',
              subText: 'Medical Leave',
              available: sickBal,
              total: totalSick,
              color: theme.warning,
            },
            {
              id: 'el',
              code: 'EL',
              fullName: 'Earned Leave',
              subText: 'Privilege Quota',
              available: earnedBal,
              total: totalEarned,
              color: theme.success,
            },
            {
              id: 'perm',
              code: 'PERM',
              fullName: 'Short Permission',
              subText: permPeriod === 'year' ? 'Yearly Hours' : 'Monthly Hours',
              available: permBal,
              total: totalPermission,
              color: theme.accent,
            },
          ].map((item) => (
            <DonutChartItem
              key={item.id}
              id={item.id}
              code={item.code}
              fullName={item.fullName}
              subText={item.subText}
              available={item.available}
              total={item.total}
              color={item.color}
              theme={theme}
            />
          ))}
        </View>
      </View>

      {/* 2. BOTTOM CARD: Application Form Container with 3x2 Grid (Matching Prototype) */}
      <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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

        {/* Animated Segmented Switcher at Top of Form Card */}
        <View
          onLayout={(e) => setSegmentedWidth(e.nativeEvent.layout.width)}
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : theme.inputBg,
              borderColor: theme.cardBorder,
              opacity: isLeaveEligible ? 1 : 0.6,
            },
          ]}
        >
          {segmentedWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingSegmentPill,
                {
                  width: (segmentedWidth - 8) / 2,
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  transform: [
                    {
                      translateX: tabSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (segmentedWidth - 8) / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={styles.segmentBtn}
            onPress={() => isLeaveEligible && handleSwitchRequestType('leave')}
            disabled={!isLeaveEligible}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                { color: theme.textMuted },
                requestType === 'leave' && { color: theme.textPrimary, fontWeight: '800' },
              ]}
            >
              Leave Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentBtn}
            onPress={() => isLeaveEligible && handleSwitchRequestType('permission')}
            disabled={!isLeaveEligible}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                { color: theme.textMuted },
                requestType === 'permission' && { color: theme.textPrimary, fontWeight: '800' },
              ]}
            >
              Short Permission
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3x2 Selector Grid (Category & Duration Mode Chips from Prototype) */}
        <Animated.View style={{ opacity: tabFadeAnim }}>
          {requestType === 'leave' ? (
            <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
              <Text style={[styles.gridSectionLabel, { color: theme.textMuted }]}>Choose Category &amp; Mode</Text>
              <View style={styles.grid3x2}>
                {/* Row 1: 3 Leave Categories */}
                <View style={styles.gridRow}>
                  {(['Casual', 'Sick', 'Earned'] as const).map((cat) => {
                    const isSelected = leaveCategory === cat;
                    const catColor = cat === 'Casual' ? theme.primary : cat === 'Sick' ? theme.warning : theme.success;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.gridChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                          isSelected && { backgroundColor: catColor, borderColor: catColor },
                        ]}
                        onPress={() => isLeaveEligible && setLeaveCategory(cat)}
                        disabled={!isLeaveEligible}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.gridChipText,
                            { color: theme.textPrimary },
                            isSelected && { color: '#ffffff', fontWeight: '800' },
                          ]}
                          numberOfLines={1}
                        >
                          {cat} ({cat === 'Casual' ? 'CL' : cat === 'Sick' ? 'SL' : 'EL'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Row 2: 3 Duration Modes */}
                <View style={styles.gridRow}>
                  {[
                    { id: 'single', label: 'Single Day' },
                    { id: 'half', label: 'Half Day' },
                    { id: 'range', label: 'Date Range' },
                  ].map((mode) => {
                    const isSelected = leaveDurationType === mode.id;
                    return (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.gridChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                          isSelected && { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1.5 },
                        ]}
                        onPress={() => isLeaveEligible && setLeaveDurationType(mode.id as any)}
                        disabled={!isLeaveEligible}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.gridChipText,
                            { color: theme.textMuted },
                            isSelected && { color: theme.primary, fontWeight: '800' },
                          ]}
                          numberOfLines={1}
                        >
                          {mode.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Half Day Session Selector if Half Day active */}
              {leaveDurationType === 'half' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Half-Day Timing</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['Morning (1st Half)', 'Afternoon (2nd Half)'].map((session) => (
                      <TouchableOpacity
                        key={session}
                        style={[
                          styles.catChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, flex: 1 },
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

              {/* Date Picker Button */}
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
                    <Icon name="calendar" size={16} color={theme.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>From</Text>
                      <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(startDate)}</Text>
                    </View>
                    <Icon name="chevron-right" size={13} color={theme.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                    onPress={() => isLeaveEligible && openCalendar('end')}
                    disabled={!isLeaveEligible}
                  >
                    <Icon name="calendar" size={16} color={theme.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>To</Text>
                      <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(endDate)}</Text>
                    </View>
                    <Icon name="chevron-right" size={13} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.dateSelectorBtnSingle, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  onPress={() => isLeaveEligible && openCalendar('start')}
                  disabled={!isLeaveEligible}
                >
                  <Icon name="calendar" size={18} color={theme.primary} />
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

              {/* Total Units Summary Pill */}
              <View style={[styles.summaryPill, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : theme.inputBg, borderColor: theme.cardBorder }]}>
                <Icon name="info" size={14} color={theme.primary} />
                <Text style={[styles.summaryPillText, { color: theme.textPrimary }]}>
                  Requested: <Text style={{ fontWeight: '800', color: theme.primary }}>{calculatedDaysCount} Day(s)</Text>
                  {leaveDurationType === 'range' && ` (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
              {/* Permission 3x2 Grid */}
              <Text style={[styles.gridSectionLabel, { color: theme.textMuted }]}>Quick Permission Presets</Text>
              <View style={styles.grid3x2}>
                <View style={styles.gridRow}>
                  {[
                    { label: '09:30 AM (Late)', h1: 9, m1: 30, p1: 'AM', h2: 10, m2: 30, p2: 'AM', dur: '1' },
                    { label: '04:30 PM (Early)', h1: 4, m1: 30, p1: 'PM', h2: 5, m2: 30, p2: 'PM', dur: '1' },
                    { label: '03:30 PM (2h)', h1: 3, m1: 30, p1: 'PM', h2: 5, m2: 30, p2: 'PM', dur: '2' },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.gridChip, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                      onPress={() => applyQuickTimeSlot(preset.h1 as any, preset.m1, preset.p1 as any, preset.h2 as any, preset.m2, preset.p2 as any, preset.dur as any)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.gridChipText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.gridRow}>
                  {['1', '1.5', '2'].map((d) => {
                    const isSelected = permissionSlotDuration === d;
                    return (
                      <TouchableOpacity
                        key={`dur-${d}`}
                        style={[
                          styles.gridChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                          isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                        ]}
                        onPress={() => setPermissionSlotDuration(d as any)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.gridChipText,
                            { color: theme.textMuted },
                            isSelected && { color: '#ffffff', fontWeight: '800' },
                          ]}
                        >
                          {d} Hour{d !== '1' ? 's' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Permission Scheduled Date & Clock Selectors */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Permission Date &amp; Time Window</Text>
              <TouchableOpacity
                style={[styles.dateSelectorBtnSingle, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginBottom: 10 }]}
                onPress={() => isLeaveEligible && openCalendar('permission')}
                disabled={!isLeaveEligible}
              >
                <Icon name="calendar" size={18} color={theme.accent} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>Scheduled Date</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatDate(permissionDate)}</Text>
                </View>
                <View style={[styles.changeBadge, { backgroundColor: theme.accent + '18' }]}>
                  <Text style={[styles.changeBadgeText, { color: theme.accent }]}>Pick Date 📅</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  onPress={() => isLeaveEligible && openClock('start')}
                  disabled={!isLeaveEligible}
                >
                  <Icon name="clock" size={16} color={theme.warning} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>From Time</Text>
                    <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatTimeStr(permStartTime)}</Text>
                  </View>
                  <Icon name="chevron-right" size={13} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  onPress={() => isLeaveEligible && openClock('end')}
                  disabled={!isLeaveEligible}
                >
                  <Icon name="clock" size={16} color={theme.warning} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>To Time</Text>
                    <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{formatTimeStr(permEndTime)}</Text>
                  </View>
                  <Icon name="chevron-right" size={13} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Reason Input */}
        <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 14 }]}>Reason for Request</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder },
            isSubmitDisabled && { opacity: 0.6 }
          ]}
          placeholder={
            !isLeaveEligible
              ? 'Leave applications are currently locked...'
              : isBalanceExhausted
                ? 'No leave balance remaining...'
                : 'Enter detailed reason for manager review...'
          }
          placeholderTextColor={theme.textMuted}
          value={reason}
          onChangeText={setReason}
          editable={isLeaveEligible && !isBalanceExhausted}
          multiline
        />

        {/* Balance warning */}
        {isLeaveEligible && (isBalanceExhausted || wouldExceedBalance) && (
          <View style={{ backgroundColor: '#FF000015', borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 12 }}>
            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>
              {isBalanceExhausted
                ? `⚠ No ${requestType === 'permission' ? 'permission hours' : `${leaveCategory} Leave days`} remaining.`
                : `⚠ Requested ${requestedUnits} ${requestType === 'permission' ? 'hrs' : 'days'} exceeds remaining balance of ${currentLeaveBalance} ${requestType === 'permission' ? 'hrs' : 'days'}.`}
            </Text>
          </View>
        )}

        {/* Two Large Action Cards / Buttons at Bottom (Matching Prototype) */}
        <View style={styles.actionButtonsStack}>
          {/* Button 1: Primary Submit Action Button */}
          <TouchableOpacity
            style={[
              styles.actionCardBtnPrimary,
              { backgroundColor: isSubmitDisabled ? theme.cardBorder : theme.primary },
              isSubmitDisabled && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            activeOpacity={isSubmitDisabled ? 1 : 0.8}
          >
            <Text style={[styles.actionCardBtnTextPrimary, isSubmitDisabled && { color: theme.textMuted }]}>
              {!isLeaveEligible
                ? '🔒 Leave Applications Locked by HR'
                : isBalanceExhausted
                  ? '🚫 Leave Balance Exhausted'
                  : wouldExceedBalance
                    ? `🚫 Exceeds Balance (${currentLeaveBalance} left)`
                    : 'Submit Leave Application →'}
            </Text>
          </TouchableOpacity>

          {/* Button 2: Secondary Entitlement Details Button */}
          <TouchableOpacity
            style={[styles.actionCardBtnSecondary, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.inputBg, borderColor: theme.cardBorder }]}
            onPress={() => setPolicyModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="info" size={16} color={theme.textPrimary} />
            <Text style={[styles.actionCardBtnTextSecondary, { color: theme.textPrimary }]}>
              Leave Policy &amp; Entitlement Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Approval Inbox for Managers / HR */}
      {canApproveLeaves && leaves.filter((l) => l.status === 'Pending' && l.employeeId !== currentUser?.id).length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
              Pending Approvals ({leaves.filter((l) => l.status === 'Pending' && l.employeeId !== currentUser?.id).length})
            </Text>
            <View style={{ backgroundColor: theme.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>Action Required</Text>
            </View>
          </View>

          {leaves
            .filter((l) => l.status === 'Pending' && l.employeeId !== currentUser?.id)
            .map((item) => {
              const isSequential = !item.approvalType || item.approvalType === 'sequential';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyItem,
                    { backgroundColor: theme.card, borderColor: theme.primary + '50', borderWidth: 1.5, marginBottom: 12 },
                  ]}
                >
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={[styles.historyType, { color: theme.textPrimary }]}>{item.employeeName}</Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>{item.type} · {item.days}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <View style={[styles.statusBadge, { backgroundColor: theme.warning + '25' }]}>
                        <Text style={[styles.statusText, { color: theme.warning }]}>
                          Level {item.currentLevel || 1}/{item.totalLevels || 3}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 9, color: theme.textMuted, textTransform: 'capitalize' }}>
                        {isSequential ? 'Sequential Order' : item.approvalType === 'all' ? 'All Must Approve' : 'Any One Can Approve'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.historyDates, { color: theme.accent, marginTop: 4 }]}>📅 {item.startDate} to {item.endDate || item.startDate}</Text>
                  <Text style={[styles.historyReason, { color: theme.textMuted, marginTop: 2 }]}>Reason: {item.reason}</Text>

                  {/* Multi-Action Buttons (Sequential has 3 vs Non-Sequential has 2) */}
                  <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.cardBorder, gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {isSequential && (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: theme.primary,
                            paddingVertical: 9,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            setActionTargetLeave(item);
                            setActionType('approve_forward');
                            setActionNotes('');
                            setActionModalVisible(true);
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🚀 Approve & Forward</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: theme.success,
                          paddingVertical: 9,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          setActionTargetLeave(item);
                          setActionType('approve_close');
                          setActionNotes('');
                          setActionModalVisible(true);
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓ Approve & Close</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: isSequential ? 0.9 : 1,
                          backgroundColor: theme.danger + '15',
                          borderColor: theme.danger,
                          borderWidth: 1,
                          paddingVertical: 9,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => {
                          setActionTargetLeave(item);
                          setActionType('reject');
                          setActionNotes('');
                          setActionModalVisible(true);
                        }}
                      >
                        <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700' }}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* History List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Request History</Text>
      {leaves.filter((l) => l.employeeId === currentUser?.id || l.employeeName === currentUser?.name).length === 0 ? (
        <View style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder, alignItems: 'center', paddingVertical: 20 }]}>
          <Text style={[{ color: theme.textMuted, fontSize: 12 }]}>No leave or permission requests submitted yet.</Text>
        </View>
      ) : (
        leaves
          .filter((l) => l.employeeId === currentUser?.id || l.employeeName === currentUser?.name)
          .map((item) => {
            const badgeColor = item.status === 'Approved' ? theme.success : item.status === 'Rejected' ? theme.danger : theme.warning;
            const steps = item.approvalSteps || [];

            return (
              <View key={item.id} style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 12 }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyType, { color: theme.textPrimary }]}>{item.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badgeColor + '25' }]}>
                    <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={[styles.historyDates, { color: theme.accent }]}>📅 {item.startDate} ({item.days})</Text>
                <Text style={[styles.historyReason, { color: theme.textMuted }]}>Reason: {item.reason}</Text>

                {/* Multi-Level Approval Pipeline Stepper */}
                {steps.length > 0 && (
                  <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                      Multi-Level Approval Pipeline
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      {steps.map((st, sIdx) => {
                        const isDone = st.status === 'Approved';
                        const isReject = st.status === 'Rejected';
                        const isCurrent = st.level === (item.currentLevel || 1) && item.status === 'Pending';
                        const stepColor = isDone ? theme.success : isReject ? theme.danger : isCurrent ? theme.warning : theme.textMuted;

                        return (
                          <React.Fragment key={st.level}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                              <View
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 11,
                                  backgroundColor: isDone ? theme.success : isReject ? theme.danger : isCurrent ? theme.warning + '30' : theme.cardBorder,
                                  borderColor: isCurrent ? theme.warning : 'transparent',
                                  borderWidth: isCurrent ? 1.5 : 0,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: isDone || isReject ? '#fff' : isCurrent ? theme.warning : theme.textMuted }}>
                                  {isDone ? '✓' : isReject ? '✗' : st.level}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 9, fontWeight: '600', color: stepColor, marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
                                {st.roleName.split(' ')[0]}
                              </Text>
                              <Text style={{ fontSize: 8, color: theme.textMuted, textAlign: 'center' }} numberOfLines={1}>
                                {st.status}
                              </Text>
                            </View>
                            {sIdx < steps.length - 1 && (
                              <View style={{ height: 1.5, flex: 0.6, backgroundColor: isDone ? theme.success : theme.cardBorder, marginHorizontal: 2, marginBottom: 12 }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                )}

                {item.actedBy ? (
                  <Text style={[styles.historyReason, { color: badgeColor, marginTop: 6, fontWeight: '600' }]}>
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

      {/* =========================================================================
          MANAGER ACTION NOTES MODAL (Approve & Forward, Approve & Close, Reject)
          ========================================================================= */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmittingAction && setActionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>
                  {actionType === 'approve_forward'
                    ? '🚀 Approve & Forward'
                    : actionType === 'approve_close'
                      ? '✓ Approve & Close'
                      : actionType === 'escalate'
                        ? '⚡ Escalate Request'
                        : '✕ Reject Request'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {actionType === 'approve_forward'
                    ? 'Advance request to the next sequential approver'
                    : actionType === 'approve_close'
                      ? 'Mark request fully approved and conclude flow'
                      : actionType === 'escalate'
                        ? 'Escalate request to higher authority'
                        : 'Decline this request with feedback remarks'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActionModalVisible(false)}
                style={{ padding: 6, borderRadius: 20, backgroundColor: theme.inputBg }}
              >
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Target Request Info Summary Card */}
            {actionTargetLeave && (
              <View style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>
                    {actionTargetLeave.employeeName}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: theme.warning + '25' }]}>
                    <Text style={[styles.statusText, { color: theme.warning, fontSize: 10 }]}>
                      Level {actionTargetLeave.currentLevel || 1}/{actionTargetLeave.totalLevels || 3}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 3 }}>
                  {actionTargetLeave.type} ({actionTargetLeave.days} Day{parseFloat(actionTargetLeave.days) > 1 ? 's' : ''})
                </Text>
                <Text style={{ fontSize: 11, color: theme.accent, marginTop: 3 }}>
                  📅 {actionTargetLeave.startDate} {actionTargetLeave.endDate ? `to ${actionTargetLeave.endDate}` : ''}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                  "{actionTargetLeave.reason}"
                </Text>
              </View>
            )}

            {/* Notes / Comments Input */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 }}>
              Approver Notes & Comments {actionType === 'reject' ? '(Mandatory Remarks)' : '(Optional Notes)'}
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.inputBg,
                color: theme.textPrimary,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                padding: 12,
                fontSize: 12,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
              placeholder={
                actionType === 'approve_forward'
                  ? 'Add notes for the next approver (e.g. Recommended for approval)...'
                  : actionType === 'approve_close'
                    ? 'Add closing remarks (e.g. Approved and finalized directly)...'
                    : actionType === 'escalate'
                      ? 'Reason for manual escalation...'
                      : 'Enter specific reason for rejection...'
              }
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              value={actionNotes}
              onChangeText={setActionNotes}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.inputBg,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={() => setActionModalVisible(false)}
                disabled={isSubmittingAction}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  backgroundColor:
                    actionType === 'reject'
                      ? theme.danger
                      : actionType === 'approve_close'
                        ? theme.success
                        : theme.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                disabled={isSubmittingAction}
                onPress={async () => {
                  if (!actionTargetLeave) return;
                  if (actionType === 'reject' && !actionNotes.trim()) {
                    Alert.alert('Rejection Note Required', 'Please provide a reason or note for rejecting this request.');
                    return;
                  }
                  setIsSubmittingAction(true);
                  try {
                    const ok = await actOnLeave(
                      actionTargetLeave.id,
                      actionType,
                      actionNotes.trim() ||
                      (actionType === 'approve_forward'
                        ? `Approved & Forwarded by ${currentUser?.name || 'Manager'}`
                        : actionType === 'approve_close'
                          ? `Approved & Closed by ${currentUser?.name || 'Manager'}`
                          : 'Rejected by Manager')
                    );
                    if (ok) {
                      Alert.alert(
                        actionType === 'reject'
                          ? 'Request Rejected'
                          : actionType === 'approve_close'
                            ? 'Request Fully Approved'
                            : 'Request Forwarded',
                        `Successfully processed leave request for ${actionTargetLeave.employeeName}`
                      );
                      setActionModalVisible(false);
                    } else {
                      Alert.alert('Action Failed', 'Could not process the request. Please try again.');
                    }
                  } finally {
                    setIsSubmittingAction(false);
                  }
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                  {isSubmittingAction ? 'Processing...' : 'Confirm & Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          POLICY & ENTITLEMENT OVERVIEW MODAL
          ========================================================================= */}
      <Modal
        visible={policyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Leave Policy &amp; Rules 📋</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Company HR Entitlement Guidelines</Text>
              </View>
              <TouchableOpacity onPress={() => setPolicyModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {[
                { title: 'Casual Leave (CL)', quota: `${totalCasual} Days / Year`, desc: 'For personal needs, family events, or urgent unplanned matters. Requires prior manager approval.' },
                { title: 'Sick Leave (SL)', quota: `${totalSick} Days / Year`, desc: 'Medical emergencies & recovery. Medical certificate required for 3+ consecutive days.' },
                { title: 'Earned / Privilege (EL)', quota: `${totalEarned} Days / Year`, desc: 'Accumulated paid annual leaves. Requires minimum 3-5 days advance notice.' },
                { title: 'Short Permission', quota: `${totalPermission} Hours / ${permPeriod === 'year' ? 'Year' : 'Month'}`, desc: 'Allowed in 1h, 1.5h, or 2h slots for late logins or urgent personal work during shift hours.' },
              ].map((pol, pIdx) => (
                <View key={pIdx} style={{ backgroundColor: theme.inputBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>{pol.title}</Text>
                    <View style={{ backgroundColor: theme.primary + '18', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary }}>{pol.quota}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textMuted, lineHeight: 16 }}>{pol.desc}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.clockConfirmBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
              onPress={() => setPolicyModalVisible(false)}
            >
              <Text style={styles.clockConfirmBtnText}>Got it, Close</Text>
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
    paddingBottom: 110,
  },

  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },

  // 1. TOP VERTICAL BAR CHART CARD
  barChartCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  chartHeaderSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  chartBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  // 2x2 Donut Grid Styles (Clean & Bold)
  donutGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 12,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  donutCard: {
    width: '47.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  donutRingWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  donutCenterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterCount: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  donutMeta: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  donutLeaveName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  donutSubText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // 2. FORM & 3X2 GRID
  formCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  segmentedContainer: {
    flexDirection: 'row',
    position: 'relative',
    padding: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  slidingSegmentPill: {
    position: 'absolute',
    top: 3.5,
    left: 4,
    bottom: 3.5,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  gridSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  grid3x2: {
    gap: 8,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridChip: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  gridChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  catChip: {
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
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    height: 75,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 16,
  },

  // 3. ACTION BUTTONS STACK (From Prototype)
  actionButtonsStack: {
    gap: 10,
  },
  actionCardBtnPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardBtnTextPrimary: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionCardBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionCardBtnTextSecondary: {
    fontSize: 12.5,
    fontWeight: '700',
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
