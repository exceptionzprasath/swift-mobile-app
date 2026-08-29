import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';
import { useAppContext, GrievanceTicket, UnifiedRequestItem } from '../context/AppContext';

interface RequestsScreenProps {
  theme: ThemeColors;
  initialCategory?: 'loan' | 'comp_off' | 'grievance' | 'history';
  onNavigate?: (tab: any) => void;
}

export interface GrievanceOption {
  id: string;
  name: string;
  description?: string;
  workflowId?: string;
}

const DEFAULT_GRIEVANCE_CATEGORIES = [
  'Missing Punch (Check-in / Check-out)',
  'Leave Not Approved',
  'Payroll & Salary Issues',
  'Workplace / Behavior',
  'Policy / Compliance',
  'IT / System Access',
  'Others',
];

const DEFAULT_LOAN_TYPES = [
  'Salary Advance (Monthly)',
  'Emergency Medical Loan',
  'Festival Advance Loan',
];

const DEFAULT_COMPOFF_TYPES = [
  'Weekend Duty Comp-Off',
  'Gazetted Holiday Comp-Off',
  'Urgent Project / Night Shift Comp-Off',
];

const LOAN_AMOUNT_PRESETS = ['10000', '25000', '50000', '75000', '100000'];
const LOAN_TENORS = ['1 Month (Next Pay)', '2 Months (EMI)', '3 Months (EMI)', '6 Months (EMI)'];
const LOAN_PURPOSES = [
  'Medical Emergency',
  'Family / Personal Need',
  'Education & School Fees',
  'Travel & Relocation',
  'Home Maintenance',
  'Other Purpose',
];

export function RequestsScreen({ theme, initialCategory = 'loan', onNavigate }: RequestsScreenProps) {
  const {
    currentUser,
    companyConfig,
    grievances,
    requests,
    applyGrievance,
    sendGrievanceMessage,
    applyUnifiedRequest,
    docRequests,
    refreshData,
  } = useAppContext();

  const [activeCategory, setActiveCategory] = useState<'loan' | 'comp_off' | 'grievance' | 'history'>(initialCategory);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'loan' | 'comp_off' | 'grievance'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Dynamically resolve Advance Loan options from Admin Approval Settings
  const dynamicLoanOptions: GrievanceOption[] = useMemo(() => {
    const workflows = companyConfig?.approvalWorkflows?.loan;
    if (Array.isArray(workflows) && workflows.length > 0) {
      const activeWorkflows = workflows.filter((w: any) => w.active !== false);
      if (activeWorkflows.length > 0) {
        return activeWorkflows.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description || '',
          workflowId: w.id,
        }));
      }
    }

    return DEFAULT_LOAN_TYPES.map((name, idx) => ({
      id: `loan-def-${idx}`,
      name,
      description: '',
      workflowId: undefined,
    }));
  }, [companyConfig]);

  // Dynamically resolve Comp-Off options from Admin Approval Settings
  const dynamicCompOffOptions: GrievanceOption[] = useMemo(() => {
    const workflows = companyConfig?.approvalWorkflows?.compoff;
    if (Array.isArray(workflows) && workflows.length > 0) {
      const activeWorkflows = workflows.filter((w: any) => w.active !== false);
      if (activeWorkflows.length > 0) {
        return activeWorkflows.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description || '',
          workflowId: w.id,
        }));
      }
    }

    return DEFAULT_COMPOFF_TYPES.map((name, idx) => ({
      id: `compoff-def-${idx}`,
      name,
      description: '',
      workflowId: undefined,
    }));
  }, [companyConfig]);

  // Dynamically resolve Grievance options from Admin Approval Settings
  const dynamicGrievanceOptions: GrievanceOption[] = useMemo(() => {
    // 1. Primary: Approval Workflows from Admin Approval Settings
    const workflows = companyConfig?.approvalWorkflows?.grievance;
    if (Array.isArray(workflows) && workflows.length > 0) {
      const activeWorkflows = workflows.filter((w: any) => w.active !== false);
      if (activeWorkflows.length > 0) {
        return activeWorkflows.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description || '',
          workflowId: w.id,
        }));
      }
    }

    // 2. Secondary: companyConfig.grievanceTypes
    const grievanceTypes = companyConfig?.grievanceTypes;
    if (Array.isArray(grievanceTypes) && grievanceTypes.length > 0) {
      const activeTypes = grievanceTypes.filter((t: any) => t.active !== false);
      if (activeTypes.length > 0) {
        return activeTypes.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          workflowId: t.id,
        }));
      }
    }

    // 3. Fallback: Default standard categories
    return DEFAULT_GRIEVANCE_CATEGORIES.map((cat, idx) => ({
      id: `grv-def-${idx}`,
      name: cat,
      description: '',
      workflowId: undefined,
    }));
  }, [companyConfig]);

  // Local storage for in-app newly created requests
  const [customRequests, setCustomRequests] = useState<UnifiedRequestItem[]>([]);

  // Advance Loan Form State
  const [selectedLoanType, setSelectedLoanType] = useState<string>(
    dynamicLoanOptions[0]?.name || DEFAULT_LOAN_TYPES[0]
  );
  const [loanAmount, setLoanAmount] = useState('25000');
  const [loanTenor, setLoanTenor] = useState(LOAN_TENORS[1]); // 2 Months
  const [loanPurpose, setLoanPurpose] = useState(LOAN_PURPOSES[0]);
  const [loanRemarks, setLoanRemarks] = useState('');

  useEffect(() => {
    if (dynamicLoanOptions.length > 0) {
      const exists = dynamicLoanOptions.some((opt) => opt.name === selectedLoanType);
      if (!exists) {
        setSelectedLoanType(dynamicLoanOptions[0].name);
      }
    }
  }, [dynamicLoanOptions, selectedLoanType]);

  const selectedLoanOption = useMemo(() => {
    return (
      dynamicLoanOptions.find((opt) => opt.name === selectedLoanType) ||
      dynamicLoanOptions[0] ||
      null
    );
  }, [dynamicLoanOptions, selectedLoanType]);

  // Compensation Off Form State
  const [selectedCompOffType, setSelectedCompOffType] = useState<string>(
    dynamicCompOffOptions[0]?.name || DEFAULT_COMPOFF_TYPES[0]
  );
  const [compOffFromDate, setCompOffFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compOffToDate, setCompOffToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compOffAvailFromDate, setCompOffAvailFromDate] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate.toISOString().split('T')[0];
  });
  const [compOffAvailToDate, setCompOffAvailToDate] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate.toISOString().split('T')[0];
  });
  const [compOffHours, setCompOffHours] = useState<'Full Day (8+ hrs)' | 'Half Day (4+ hrs)'>('Full Day (8+ hrs)');
  const [compOffSubject, setCompOffSubject] = useState('');
  const [compOffDescription, setCompOffDescription] = useState('');

  // Comp-Off Calendar Picker Modal State
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'worked_from' | 'worked_to' | 'avail_from' | 'avail_to'>('worked_from');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const monthDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { day: number | null; isToday: boolean; isSelected: boolean; inRange: boolean }[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, isToday: false, isSelected: false, inRange: false });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isAvail = calendarTarget.startsWith('avail');
    const fromTime = new Date(isAvail ? compOffAvailFromDate : compOffFromDate).getTime();
    const toTime = new Date(isAvail ? compOffAvailToDate : compOffToDate).getTime();

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const cellDateStr = `${year}-${mStr}-${dStr}`;
      const isToday = cellDateStr === todayStr;
      const isSelected = isAvail
        ? cellDateStr === compOffAvailFromDate || cellDateStr === compOffAvailToDate
        : cellDateStr === compOffFromDate || cellDateStr === compOffToDate;
      const cellTime = new Date(cellDateStr).getTime();
      const inRange = cellTime >= fromTime && cellTime <= toTime;

      days.push({ day: d, isToday, isSelected, inRange });
    }

    return days;
  }, [calendarViewDate, compOffFromDate, compOffToDate, compOffAvailFromDate, compOffAvailToDate, calendarTarget]);

  const handleSelectCalendarDay = (day: number) => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${mStr}-${dStr}`;

    if (calendarTarget === 'worked_from') {
      setCompOffFromDate(selectedDateStr);
      if (selectedDateStr > compOffToDate) {
        setCompOffToDate(selectedDateStr);
      }
    } else if (calendarTarget === 'worked_to') {
      if (selectedDateStr < compOffFromDate) {
        setCompOffFromDate(selectedDateStr);
      }
      setCompOffToDate(selectedDateStr);
    } else if (calendarTarget === 'avail_from') {
      setCompOffAvailFromDate(selectedDateStr);
      if (selectedDateStr > compOffAvailToDate) {
        setCompOffAvailToDate(selectedDateStr);
      }
    } else if (calendarTarget === 'avail_to') {
      if (selectedDateStr < compOffAvailFromDate) {
        setCompOffAvailFromDate(selectedDateStr);
      }
      setCompOffAvailToDate(selectedDateStr);
    }
    setCalendarVisible(false);
  };

  const openCalendar = (target: 'worked_from' | 'worked_to' | 'avail_from' | 'avail_to') => {
    setCalendarTarget(target);
    const initialDate =
      target === 'worked_from'
        ? new Date(compOffFromDate)
        : target === 'worked_to'
        ? new Date(compOffToDate)
        : target === 'avail_from'
        ? new Date(compOffAvailFromDate)
        : new Date(compOffAvailToDate);
    setCalendarViewDate(isNaN(initialDate.getTime()) ? new Date() : initialDate);
    setCalendarVisible(true);
  };

  const handlePrevMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    if (dynamicCompOffOptions.length > 0) {
      const exists = dynamicCompOffOptions.some((opt) => opt.name === selectedCompOffType);
      if (!exists) {
        setSelectedCompOffType(dynamicCompOffOptions[0].name);
      }
    }
  }, [dynamicCompOffOptions, selectedCompOffType]);

  const selectedCompOffOption = useMemo(() => {
    return (
      dynamicCompOffOptions.find((opt) => opt.name === selectedCompOffType) ||
      dynamicCompOffOptions[0] ||
      null
    );
  }, [dynamicCompOffOptions, selectedCompOffType]);

  // Grievance Form State (Dynamic)
  const [grievanceCat, setGrievanceCat] = useState<string>(
    dynamicGrievanceOptions[0]?.name || DEFAULT_GRIEVANCE_CATEGORIES[0]
  );
  const [grievancePriority, setGrievancePriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [grievanceSubject, setGrievanceSubject] = useState('');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<GrievanceTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Synchronize grievanceCat if current selection is not available in dynamic list
  useEffect(() => {
    if (dynamicGrievanceOptions.length > 0) {
      const exists = dynamicGrievanceOptions.some((opt) => opt.name === grievanceCat);
      if (!exists) {
        setGrievanceCat(dynamicGrievanceOptions[0].name);
      }
    }
  }, [dynamicGrievanceOptions, grievanceCat]);

  const selectedGrievanceOption = useMemo(() => {
    return (
      dynamicGrievanceOptions.find((opt) => opt.name === grievanceCat) ||
      dynamicGrievanceOptions[0] ||
      null
    );
  }, [dynamicGrievanceOptions, grievanceCat]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('Requests refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Loan deduction calculations
  const loanTenorMonths = useMemo(() => {
    return loanTenor.includes('6') ? 6 : loanTenor.includes('3') ? 3 : loanTenor.includes('2') ? 2 : 1;
  }, [loanTenor]);

  const loanMonthlyEmi = useMemo(() => {
    const amt = Number(loanAmount) || 0;
    return Math.round(amt / loanTenorMonths);
  }, [loanAmount, loanTenorMonths]);

  // Submit Advance Loan Request (Backend Connected via Approval Settings)
  const handleSubmitLoan = async () => {
    if (!loanAmount || isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid loan amount.');
      return;
    }

    setBusy(true);
    const activeWorkflowId = selectedLoanOption?.workflowId || selectedLoanOption?.id || 'loan-salary-adv';
    const activeTypeName = selectedLoanOption?.name || 'Salary Advance (Monthly)';

    const tenorMonths = loanTenor.includes('6') ? 6 : loanTenor.includes('3') ? 3 : loanTenor.includes('2') ? 2 : 1;
    const monthlyEmi = Math.round(Number(loanAmount) / tenorMonths);

    const res = await applyUnifiedRequest({
      category: 'loan',
      workflowId: activeWorkflowId,
      type: activeTypeName,
      title: `${activeTypeName}: ₹${Number(loanAmount).toLocaleString()}`,
      amount: Number(loanAmount),
      amountOrDays: `₹${Number(loanAmount).toLocaleString()} (${loanTenor})`,
      tenor: loanTenor,
      date: new Date().toISOString().slice(0, 10),
      details: `Type: ${activeTypeName} • Tenor: ${loanTenor} • Purpose: ${loanPurpose}${loanRemarks.trim() ? ` • Note: ${loanRemarks.trim()}` : ''}`,
      reason: loanPurpose,
      notes: `Estimated Monthly Deduction: ₹${monthlyEmi.toLocaleString()} / month for ${tenorMonths} month(s).`,
      metadata: {
        loanType: activeTypeName,
        tenor: loanTenor,
        tenorMonths,
        monthlyEmi,
        purpose: loanPurpose,
        remarks: loanRemarks.trim(),
        startMonth: new Date().toISOString().slice(0, 7),
      },
    });
    setBusy(false);

    if (res.success) {
      setLoanRemarks('');
      Alert.alert(
        'Loan Request Submitted 🚀',
        `Your request for ${activeTypeName} of ₹${Number(loanAmount).toLocaleString()} has been submitted. It will follow the approval workflow configured in the company Admin Panel.`
      );
      setActiveCategory('history');
    } else {
      Alert.alert('Submission Error', res.error || 'Failed to submit advance loan request.');
    }
  };

  // Submit Comp-Off Handler (Backend Connected via Approval Settings)
  const handleSubmitCompOff = async () => {
    if (!compOffSubject.trim()) {
      Alert.alert('Required', 'Please enter a Subject for your comp-off request.');
      return;
    }
    if (!compOffDescription.trim()) {
      Alert.alert('Required', 'Please describe the deliverables and work completed in the Description field.');
      return;
    }

    setBusy(true);
    const activeWorkflowId = selectedCompOffOption?.workflowId || selectedCompOffOption?.id || 'compoff-weekend';
    const activeTypeName = selectedCompOffOption?.name || 'Weekend Duty Comp-Off';

    const isSameWorkedDay = compOffFromDate === compOffToDate;
    const workedDateLabel = isSameWorkedDay ? compOffFromDate : `${compOffFromDate} to ${compOffToDate}`;

    const isSameAvailDay = compOffAvailFromDate === compOffAvailToDate;
    const availDateLabel = isSameAvailDay ? compOffAvailFromDate : `${compOffAvailFromDate} to ${compOffAvailToDate}`;

    const res = await applyUnifiedRequest({
      category: 'comp_off',
      workflowId: activeWorkflowId,
      type: activeTypeName,
      title: `${activeTypeName}: ${compOffHours}`,
      amountOrDays: compOffHours.includes('Full') ? '1.0 Day Credit' : '0.5 Day Credit',
      date: compOffFromDate,
      details: `Subject: ${compOffSubject.trim()} • Worked: ${workedDateLabel} • Comp-Off: ${availDateLabel} • ${compOffHours}`,
      reason: compOffDescription.trim(),
      notes: `Worked: ${workedDateLabel}. Comp-Off Date: ${availDateLabel}. Upon approval, attendance is marked PRESENT for ${workedDateLabel} and leave balance is credited.`,
      metadata: {
        compOffType: activeTypeName,
        fromDate: compOffFromDate,
        toDate: compOffToDate,
        compOffDate: compOffFromDate,
        compOffAvailFromDate,
        compOffAvailToDate,
        availDateLabel,
        subject: compOffSubject.trim(),
        description: compOffDescription.trim(),
        shiftHours: compOffHours,
      },
    });
    setBusy(false);

    if (res.success) {
      setCompOffSubject('');
      setCompOffDescription('');
      Alert.alert(
        'Comp-Off Request Submitted ☕',
        `Your ${activeTypeName} request (Worked: ${workedDateLabel} • Comp-Off: ${availDateLabel}) has been submitted. Upon approval, attendance will automatically be marked PRESENT for ${workedDateLabel} and credit added to your leave balance.`
      );
      setActiveCategory('history');
    } else {
      Alert.alert('Submission Error', res.error || 'Failed to submit compensation off request.');
    }
  };

  // Submit Grievance Handler
  const handleSubmitGrievance = async () => {
    if (!grievanceSubject.trim()) {
      Alert.alert('Required', 'Please provide a clear subject for your grievance.');
      return;
    }
    if (!grievanceDesc.trim()) {
      Alert.alert('Required', 'Please describe your grievance in detail.');
      return;
    }

    setBusy(true);
    const activeWorkflowId = selectedGrievanceOption?.workflowId || selectedGrievanceOption?.id;

    // 1. Submit through Unified Request workflow engine (routes to approvers configured in Admin Approval Settings)
    const unifiedRes = await applyUnifiedRequest({
      category: 'grievance',
      workflowId: activeWorkflowId,
      type: grievanceCat,
      title: `${grievanceCat} (${grievancePriority} Priority)`,
      details: grievanceSubject.trim(),
      reason: grievanceDesc.trim(),
      metadata: {
        priority: grievancePriority,
        categoryName: grievanceCat,
        subject: grievanceSubject.trim(),
      },
    });

    // 2. Also register in grievances table for dedicated conversation & thread chat
    const ok = await applyGrievance({
      category: grievanceCat,
      priority: grievancePriority,
      subject: grievanceSubject.trim(),
      description: grievanceDesc.trim(),
      assignedRole: 'HR Grievance Committee',
    });
    setBusy(false);

    if (ok || unifiedRes.success) {
      const newReq: UnifiedRequestItem = unifiedRes.item || {
        id: `grv-${Date.now()}`,
        category: 'grievance',
        type: 'Confidential Grievance',
        title: `${grievanceCat} (${grievancePriority} Priority)`,
        details: grievanceSubject.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Under Review',
        priority: grievancePriority,
        notes: 'Encrypted and assigned to the HR Grievance Committee.',
      };
      setCustomRequests((prev) => [newReq, ...prev]);

      Alert.alert(
        'Grievance Registered 🛡️',
        'Your grievance ticket has been securely submitted to HR & Management. You can track progress under the Grievance tab.'
      );
      setGrievanceSubject('');
      setGrievanceDesc('');
      setActiveCategory('history');
    } else {
      Alert.alert('Error', unifiedRes.error || 'Could not record grievance ticket. Please try again.');
    }
  };

  // Handle Grievance Message Reply
  const handleSendTicketReply = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    setSendingReply(true);
    const ok = await sendGrievanceMessage(selectedTicket.id, ticketReplyText.trim());
    setSendingReply(false);
    if (ok) {
      setTicketReplyText('');
    } else {
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  // Build Comprehensive Requests History
  const myGrievances = useMemo(() => {
    return (grievances || []).filter(
      (g) => g.employeeId === currentUser?.id || g.empCode === currentUser?.empCode || g.employeeName === currentUser?.name
    );
  }, [grievances, currentUser]);

  const allCombinedRequests: UnifiedRequestItem[] = useMemo(() => {
    const fromGrievances: UnifiedRequestItem[] = myGrievances.map((g) => ({
      id: g.id,
      category: 'grievance',
      type: 'Grievance Ticket',
      title: `${g.category} - ${g.subject}`,
      details: g.description,
      date: g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
      status: (g.status === 'Resolved' ? 'Resolved' : g.status === 'In Progress' ? 'Under Review' : 'Pending') as any,
      priority: g.priority,
      notes: `Assigned to: ${g.assignedRole || 'HR Manager'}`,
    }));

    const myBackendRequests = (requests || []).filter(
      (r) => r.employeeId === currentUser?.id || r.empCode === currentUser?.empCode || r.employeeName === currentUser?.name
    );

    const map = new Map<string, UnifiedRequestItem>();
    [...myBackendRequests, ...customRequests, ...fromGrievances].forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });

    return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
  }, [requests, customRequests, myGrievances, currentUser]);

  const filteredHistory = useMemo(() => {
    return allCombinedRequests.filter((item) => {
      if (historyFilter !== 'all' && item.category !== historyFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCombinedRequests, historyFilter, historySearch]);

  const activeLoanRequests = allCombinedRequests.filter((r) => r.category === 'loan');
  const activeCompOffRequests = allCombinedRequests.filter((r) => r.category === 'comp_off');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Requests &amp; Self-Service</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            Advance Loans, Compensation Offs &amp; Confidential Grievance Redressal
          </Text>
        </View>
      </View>

      {/* Segmented Category Navigation */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'loan' && [styles.activeTabBtn, { backgroundColor: theme.card }]]}
          onPress={() => setActiveCategory('loan')}
        >
          <View style={styles.tabContentRow}>
            <Icon name="wallet" size={13} color={activeCategory === 'loan' ? '#059669' : theme.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeCategory === 'loan' ? '#059669' : theme.textMuted },
                activeCategory === 'loan' && styles.activeTabText,
              ]}
            >
              Advance Loan
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'comp_off' && [styles.activeTabBtn, { backgroundColor: theme.card }]]}
          onPress={() => setActiveCategory('comp_off')}
        >
          <View style={styles.tabContentRow}>
            <Icon name="coffee" size={13} color={activeCategory === 'comp_off' ? '#d97706' : theme.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeCategory === 'comp_off' ? '#d97706' : theme.textMuted },
                activeCategory === 'comp_off' && styles.activeTabText,
              ]}
            >
              Comp-Off
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'grievance' && [styles.activeTabBtn, { backgroundColor: theme.card }]]}
          onPress={() => setActiveCategory('grievance')}
        >
          <View style={styles.tabContentRow}>
            <Icon name="shield" size={13} color={activeCategory === 'grievance' ? '#dc2626' : theme.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeCategory === 'grievance' ? '#dc2626' : theme.textMuted },
                activeCategory === 'grievance' && styles.activeTabText,
              ]}
            >
              Grievance
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCategory === 'history' && [styles.activeTabBtn, { backgroundColor: theme.card }]]}
          onPress={() => setActiveCategory('history')}
        >
          <View style={styles.tabContentRow}>
            <Icon name="history" size={13} color={activeCategory === 'history' ? theme.primary : theme.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeCategory === 'history' ? theme.primary : theme.textMuted },
                activeCategory === 'history' && styles.activeTabText,
              ]}
            >
              History
            </Text>
            {allCombinedRequests.length > 0 && (
              <View style={[styles.counterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.counterText}>{allCombinedRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* 1. ADVANCE LOAN REQUEST CATEGORY */}
      {/* ============================================================ */}
      {activeCategory === 'loan' && (
        <View style={styles.section}>
          {/* Loan Application Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.formCardHeading, { color: theme.textPrimary }]}>Apply for Advance Loan</Text>

            {/* Dynamic Loan Category Options from Approval Settings */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Loan Type (Dynamic Workflows):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {dynamicLoanOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.purposeChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    selectedLoanType === opt.name && { backgroundColor: '#059669', borderColor: '#059669' },
                  ]}
                  onPress={() => setSelectedLoanType(opt.name)}
                >
                  <Text
                    style={[
                      styles.purposeChipText,
                      { color: theme.textPrimary },
                      selectedLoanType === opt.name && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedLoanOption?.description ? (
              <View style={[styles.categoryDescBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginBottom: 10 }]}>
                <Icon name="info" size={13} color={theme.textMuted} />
                <Text style={[styles.categoryDescText, { color: theme.textMuted }]}>
                  {selectedLoanOption.description}
                </Text>
              </View>
            ) : null}

            {/* Quick Amount Presets */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Select or Enter Loan Amount (₹):</Text>
            <View style={styles.presetsRow}>
              {LOAN_AMOUNT_PRESETS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    loanAmount === amt && { backgroundColor: '#059669', borderColor: '#059669' },
                  ]}
                  onPress={() => setLoanAmount(amt)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: theme.textPrimary },
                      loanAmount === amt && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    ₹{Number(amt).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.inputField, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={loanAmount}
              onChangeText={setLoanAmount}
              placeholder="e.g. 35000"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />

            {/* Repayment Tenor */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Repayment Duration (Tenor):</Text>
            <View style={styles.presetsRow}>
              {LOAN_TENORS.map((tenor) => (
                <TouchableOpacity
                  key={tenor}
                  style={[
                    styles.presetChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    loanTenor === tenor && { backgroundColor: '#059669', borderColor: '#059669' },
                  ]}
                  onPress={() => setLoanTenor(tenor)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: theme.textPrimary },
                      loanTenor === tenor && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {tenor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* EMI Preview Calculation Box */}
            <View style={[styles.emiPreviewBox, { backgroundColor: '#10b98112', borderColor: '#10b98135' }]}>
              <View>
                <Text style={[styles.emiPreviewLabel, { color: '#059669' }]}>ESTIMATED PAYROLL DEDUCTION</Text>
                <Text style={[styles.emiPreviewAmount, { color: theme.textPrimary }]}>
                  ₹{loanMonthlyEmi.toLocaleString()} <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textMuted }}>/ month</Text>
                </Text>
              </View>
              <View style={[styles.emiBadge, { backgroundColor: '#059669' }]}>
                <Text style={styles.emiBadgeText}>{loanTenorMonths} Deduction(s)</Text>
              </View>
            </View>

            {/* Purpose Selection */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 14 }]}>Loan Purpose / Reason:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {LOAN_PURPOSES.map((purp) => (
                <TouchableOpacity
                  key={purp}
                  style={[
                    styles.purposeChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    loanPurpose === purp && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setLoanPurpose(purp)}
                >
                  <Text
                    style={[
                      styles.purposeChipText,
                      { color: theme.textPrimary },
                      loanPurpose === purp && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {purp}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Remarks input */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Additional Remarks / Justification (Optional):</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={loanRemarks}
              onChangeText={setLoanRemarks}
              placeholder="Provide any additional details for expedited finance approval..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
              onPress={handleSubmitLoan}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Icon name="send" size={14} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Submit Advance Loan Request</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Real-Time Loan Applications List */}
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={[styles.subSectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                My Loan Applications ({activeLoanRequests.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>Live Status</Text>
              </View>
            </View>

            {activeLoanRequests.length > 0 ? (
              activeLoanRequests.map((req) => (
                <View key={req.id} style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{req.title}</Text>
                      <Text style={[styles.itemDate, { color: theme.textMuted }]}>
                        Submitted: {req.date} {req.amountOrDays ? `• ${req.amountOrDays}` : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            req.status === 'Approved' || req.status === 'Disbursed'
                              ? '#dcfce7'
                              : req.status === 'Rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                        },
                      ]}
                    >
                      <View style={styles.statusPillContent}>
                        {req.status === 'Approved' || req.status === 'Disbursed' ? (
                          <Icon name="check" size={11} color="#15803d" />
                        ) : req.status === 'Rejected' ? (
                          <Icon name="cross" size={11} color="#b91c1c" />
                        ) : (
                          <Icon name="clock" size={11} color="#b45309" />
                        )}
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                req.status === 'Approved' || req.status === 'Disbursed'
                                  ? '#15803d'
                                  : req.status === 'Rejected'
                                  ? '#b91c1c'
                                  : '#b45309',
                            },
                          ]}
                        >
                          {req.status === 'Approved' || req.status === 'Disbursed'
                            ? 'Approved'
                            : req.status === 'Rejected'
                            ? 'Declined'
                            : 'Pending Review'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.itemDetails, { color: theme.textPrimary }]}>{req.details}</Text>
                  {req.notes ? (
                    <Text style={[styles.itemNotes, { color: theme.textMuted, marginTop: 4 }]}>
                      Note: {req.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder, padding: 24, borderRadius: 12, alignItems: 'center' }]}>
                <Icon name="wallet" size={26} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary, marginTop: 8 }]}>
                  No Loan Applications Yet
                </Text>
                <Text style={[styles.emptyDesc, { color: theme.textMuted, textAlign: 'center', marginTop: 4 }]}>
                  When you apply for an Advance Loan above, its real-time approval status and monthly EMI deductions will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* 2. COMPENSATION OFF (COMP-OFF) REQUEST CATEGORY */}
      {/* ============================================================ */}
      {activeCategory === 'comp_off' && (
        <View style={styles.section}>
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.formCardHeading, { color: theme.textPrimary }]}>Apply for Comp-Off Credit</Text>

            {/* Dynamic Comp-Off Category Options from Approval Settings */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Comp-Off Workflow / Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {dynamicCompOffOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.purposeChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    selectedCompOffType === opt.name && { backgroundColor: '#d97706', borderColor: '#d97706' },
                  ]}
                  onPress={() => setSelectedCompOffType(opt.name)}
                >
                  <Text
                    style={[
                      styles.purposeChipText,
                      { color: theme.textPrimary },
                      selectedCompOffType === opt.name && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedCompOffOption?.description ? (
              <View style={[styles.categoryDescBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, marginBottom: 12 }]}>
                <Icon name="info" size={13} color={theme.textMuted} />
                <Text style={[styles.categoryDescText, { color: theme.textMuted }]}>
                  {selectedCompOffOption.description}
                </Text>
              </View>
            ) : null}

            {/* 1. Date Worked (From & To Calendar Selection) */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Date Worked (From &amp; To Calendar Selection):</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => openCalendar('worked_from')}
              >
                <Icon name="calendar" size={16} color="#d97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>From Date</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{compOffFromDate}</Text>
                </View>
                <Icon name="chevron-right" size={13} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => openCalendar('worked_to')}
              >
                <Icon name="calendar" size={16} color="#d97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>To Date</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{compOffToDate}</Text>
                </View>
                <Icon name="chevron-right" size={13} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 2. Comp-Off Date (From & To Calendar Selection) */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Comp-Off Date (From &amp; To Calendar to Avail Off):</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => openCalendar('avail_from')}
              >
                <Icon name="calendar" size={16} color="#d97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>From Date</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{compOffAvailFromDate}</Text>
                </View>
                <Icon name="chevron-right" size={13} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateSelectorBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => openCalendar('avail_to')}
              >
                <Icon name="calendar" size={16} color="#d97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.datePickerSubtext, { color: theme.textMuted }]}>To Date</Text>
                  <Text style={[styles.datePickerMainText, { color: theme.textPrimary }]}>{compOffAvailToDate}</Text>
                </View>
                <Icon name="chevron-right" size={13} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 10 }]}>Duty Hours / Shift Duration:</Text>
            <View style={styles.presetsRow}>
              {(['Full Day (8+ hrs)', 'Half Day (4+ hrs)'] as const).map((shift) => (
                <TouchableOpacity
                  key={shift}
                  style={[
                    styles.presetChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    compOffHours === shift && { backgroundColor: '#d97706', borderColor: '#d97706' },
                  ]}
                  onPress={() => setCompOffHours(shift)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: theme.textPrimary },
                      compOffHours === shift && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {shift}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Subject:</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={compOffSubject}
              onChangeText={setCompOffSubject}
              placeholder="e.g. Swift Production Hotfix / Weekend Client Support"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Description:</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={compOffDescription}
              onChangeText={setCompOffDescription}
              placeholder="Describe the tasks completed, Jira ticket IDs, or deployment release notes..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#d97706' }]}
              onPress={handleSubmitCompOff}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Icon name="send" size={14} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Submit Comp-Off Credit Request</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Comp-Off List */}
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.subSectionTitle, { color: theme.textPrimary }]}>
              My Comp-Off Requests ({activeCompOffRequests.length})
            </Text>
            {activeCompOffRequests.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder, padding: 24, borderRadius: 12, alignItems: 'center' }]}>
                <Icon name="coffee" size={26} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary, marginTop: 8 }]}>
                  No Comp-Off Requests Logged
                </Text>
                <Text style={[styles.emptyDesc, { color: theme.textMuted, textAlign: 'center', marginTop: 4 }]}>
                  When you apply for weekend or holiday duty above, its real-time approval status and automatic attendance present mark will show here.
                </Text>
              </View>
            ) : (
              activeCompOffRequests.map((req) => (
                <View key={req.id} style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{req.title}</Text>
                      <Text style={[styles.itemDate, { color: theme.textMuted }]}>Logged: {req.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef3c7' },
                      ]}
                    >
                      <View style={styles.statusPillContent}>
                        {req.status === 'Approved' ? (
                          <Icon name="check" size={11} color="#15803d" />
                        ) : req.status === 'Rejected' ? (
                          <Icon name="cross" size={11} color="#b91c1c" />
                        ) : (
                          <Icon name="clock" size={11} color="#b45309" />
                        )}
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: req.status === 'Approved' ? '#15803d' : req.status === 'Rejected' ? '#b91c1c' : '#b45309' },
                          ]}
                        >
                          {req.status === 'Approved' ? 'Approved' : req.status === 'Rejected' ? 'Declined' : 'In Review'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.itemDetails, { color: theme.textPrimary }]}>{req.details}</Text>
                  {req.notes && <Text style={[styles.itemNotes, { color: theme.textMuted }]}>{req.notes}</Text>}
                  {req.status === 'Approved' && (
                    <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#dcfce735', borderWidth: 1, borderColor: '#16a34a40', flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="check" size={12} color="#16a34a" />
                      <Text style={{ marginLeft: 6, fontSize: 11, fontWeight: '700', color: '#15803d' }}>
                        ✓ Marked Present in Attendance &amp; 1 Day Leave Credited
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* 3. GRIEVANCE REQUEST CATEGORY */}
      {/* ============================================================ */}
      {activeCategory === 'grievance' && (
        <View style={styles.section}>
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.formCardHeading, { color: theme.textPrimary }]}>Report an Issue / Grievance</Text>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Category of Concern (Dynamic Workflows):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {dynamicGrievanceOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.purposeChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    grievanceCat === opt.name && { backgroundColor: '#dc2626', borderColor: '#dc2626' },
                  ]}
                  onPress={() => setGrievanceCat(opt.name)}
                >
                  <Text
                    style={[
                      styles.purposeChipText,
                      { color: theme.textPrimary },
                      grievanceCat === opt.name && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedGrievanceOption?.description ? (
              <View style={[styles.categoryDescBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Icon name="info" size={13} color={theme.textMuted} />
                <Text style={[styles.categoryDescText, { color: theme.textMuted }]}>
                  {selectedGrievanceOption.description}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Severity / Urgency Level:</Text>
            <View style={styles.presetsRow}>
              {(['Low', 'Medium', 'High', 'Critical'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.presetChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    grievancePriority === sev && {
                      backgroundColor: sev === 'Critical' || sev === 'High' ? '#dc2626' : '#d97706',
                      borderColor: sev === 'Critical' || sev === 'High' ? '#dc2626' : '#d97706',
                    },
                  ]}
                  onPress={() => setGrievancePriority(sev)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: theme.textPrimary },
                      grievancePriority === sev && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {sev}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Subject / Brief Summary:</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={grievanceSubject}
              onChangeText={setGrievanceSubject}
              placeholder="e.g. Salary deduction query / Shift timing dispute"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }]}>Detailed Description &amp; Evidence:</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, minHeight: 90 }]}
              value={grievanceDesc}
              onChangeText={setGrievanceDesc}
              placeholder="Please provide full details, dates, individuals involved, and any relevant context..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#dc2626' }]}
              onPress={handleSubmitGrievance}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Icon name="send" size={14} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Submit Grievance</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Grievance Tickets List */}
          {myGrievances.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.subSectionTitle, { color: theme.textPrimary }]}>
                My Grievance Tickets ({myGrievances.length})
              </Text>
              {myGrievances.map((ticket) => (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => setSelectedTicket(ticket)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{ticket.subject}</Text>
                      <Text style={[styles.itemDate, { color: theme.textMuted }]}>
                        Category: {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            ticket.status === 'Resolved' ? '#dcfce7' : ticket.status === 'In Progress' ? '#fef3c7' : '#e0f2fe',
                        },
                      ]}
                    >
                      <View style={styles.statusPillContent}>
                        {ticket.status === 'Resolved' ? (
                          <Icon name="check" size={11} color="#15803d" />
                        ) : ticket.status === 'In Progress' ? (
                          <Icon name="clock" size={11} color="#b45309" />
                        ) : (
                          <Icon name="alert-circle" size={11} color="#0369a1" />
                        )}
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                ticket.status === 'Resolved' ? '#15803d' : ticket.status === 'In Progress' ? '#b45309' : '#0369a1',
                            },
                          ]}
                        >
                          {ticket.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.itemDetails, { color: theme.textPrimary }]} numberOfLines={2}>
                    {ticket.description}
                  </Text>
                  <View style={styles.ticketFooterRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icon name="chat" size={12} color={theme.primary} />
                      <Text style={[styles.chatCounterText, { color: theme.primary }]}>
                        {(ticket.thread || []).length} Updates / Messages
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={[styles.tapToViewText, { color: theme.textMuted }]}>Open Discussion</Text>
                      <Icon name="chevron-right" size={11} color={theme.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* 4. ALL REQUESTS HISTORY & TRACKING */}
      {/* ============================================================ */}
      {activeCategory === 'history' && (
        <View style={styles.section}>
          {/* Filter Bar */}
          <View style={styles.filterChipsRow}>
            {[
              { key: 'all' as const, label: 'All Requests', icon: 'task' as IconName },
              { key: 'loan' as const, label: 'Advance Loans', icon: 'wallet' as IconName },
              { key: 'comp_off' as const, label: 'Comp-Offs', icon: 'coffee' as IconName },
              { key: 'grievance' as const, label: 'Grievances', icon: 'shield' as IconName },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  historyFilter === f.key && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setHistoryFilter(f.key)}
              >
                <View style={styles.filterChipContent}>
                  <Icon
                    name={f.icon}
                    size={12}
                    color={historyFilter === f.key ? '#ffffff' : theme.textPrimary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: theme.textPrimary },
                      historyFilter === f.key && { color: '#ffffff', fontWeight: '800' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="document" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              value={historySearch}
              onChangeText={setHistorySearch}
              placeholder="Search request title, amount, or status..."
              placeholderTextColor={theme.textMuted}
            />
            {historySearch.length > 0 && (
              <TouchableOpacity onPress={() => setHistorySearch('')}>
                <Icon name="cross" size={12} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.subSectionTitle, { color: theme.textPrimary, marginTop: 14 }]}>
            Request Timeline ({filteredHistory.length})
          </Text>

          {filteredHistory.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="task" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Requests Found</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                You haven't submitted any requests under this category yet. Use the tabs above to apply.
              </Text>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const isLoan = item.category === 'loan';
              const isCompOff = item.category === 'comp_off';
              const isGrievance = item.category === 'grievance';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: theme.card,
                      borderColor:
                        item.status === 'Approved' || item.status === 'Resolved' || item.status === 'Disbursed'
                          ? '#10b98140'
                          : item.status === 'Rejected'
                          ? '#ef444440'
                          : theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <View
                        style={[
                          styles.categoryTagIcon,
                          {
                            backgroundColor: isLoan ? '#10b98118' : isCompOff ? '#f59e0b18' : '#dc262618',
                          },
                        ]}
                      >
                        <Icon
                          name={isLoan ? 'wallet' : isCompOff ? 'coffee' : 'shield'}
                          size={16}
                          color={isLoan ? '#059669' : isCompOff ? '#d97706' : '#dc2626'}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.itemDate, { color: theme.textMuted }]}>
                          {item.type} • {item.date}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            item.status === 'Approved' || item.status === 'Resolved' || item.status === 'Disbursed'
                              ? '#dcfce7'
                              : item.status === 'Rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                        },
                      ]}
                    >
                      <View style={styles.statusPillContent}>
                        {item.status === 'Approved' || item.status === 'Disbursed' || item.status === 'Resolved' ? (
                          <Icon name="check" size={11} color="#15803d" />
                        ) : item.status === 'Rejected' ? (
                          <Icon name="cross" size={11} color="#b91c1c" />
                        ) : (
                          <Icon name="clock" size={11} color="#b45309" />
                        )}
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                item.status === 'Approved' || item.status === 'Resolved' || item.status === 'Disbursed'
                                  ? '#15803d'
                                  : item.status === 'Rejected'
                                  ? '#b91c1c'
                                  : '#b45309',
                            },
                          ]}
                        >
                          {item.status === 'Approved' || item.status === 'Disbursed'
                            ? 'Approved'
                            : item.status === 'Resolved'
                            ? 'Resolved'
                            : item.status === 'Rejected'
                            ? 'Declined'
                            : 'In Review'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.itemDetails, { color: theme.textPrimary }]}>{item.details}</Text>
                  {item.notes && <Text style={[styles.itemNotes, { color: theme.textMuted }]}>Note: {item.notes}</Text>}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Grievance Ticket Chat Modal */}
      <Modal visible={!!selectedTicket} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatModalOverlay}>
          <View style={[styles.chatModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Header */}
            <View style={[styles.chatHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chatTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {selectedTicket?.subject}
                </Text>
                <Text style={[styles.chatSubtitle, { color: theme.textMuted }]}>
                  {selectedTicket?.category} • Status: {selectedTicket?.status}
                </Text>
              </View>
              <TouchableOpacity style={styles.chatCloseBtn} onPress={() => setSelectedTicket(null)}>
                <Icon name="cross" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Chat Thread Messages */}
            <ScrollView style={styles.chatMessagesBody}>
              <View style={[styles.ticketInitialCard, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Text style={[styles.ticketInitialHeading, { color: theme.primary }]}>Original Grievance Submission:</Text>
                <Text style={[styles.ticketInitialText, { color: theme.textPrimary }]}>{selectedTicket?.description}</Text>
                <Text style={[styles.ticketInitialDate, { color: theme.textMuted }]}>
                  Logged on {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : ''}
                </Text>
              </View>

              {(selectedTicket?.thread || []).map((msg) => {
                const isEmployee = msg.senderRole?.toLowerCase() === 'employee' || msg.senderId === currentUser?.id;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatMsgBubble,
                      isEmployee
                        ? [styles.myMsgBubble, { backgroundColor: theme.primary }]
                        : [styles.hrMsgBubble, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }],
                    ]}
                  >
                    <Text style={[styles.msgSender, { color: isEmployee ? '#ffffffcc' : theme.primary }]}>
                      {isEmployee ? 'You' : msg.senderName || 'HR Management'}
                    </Text>
                    <Text style={[styles.msgText, { color: isEmployee ? '#ffffff' : theme.textPrimary }]}>{msg.message}</Text>
                    <Text style={[styles.msgTime, { color: isEmployee ? '#ffffffaa' : theme.textMuted }]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.chatInputRow, { borderTopColor: theme.cardBorder }]}>
              <TextInput
                style={[styles.chatTextInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                value={ticketReplyText}
                onChangeText={setTicketReplyText}
                placeholder="Type your response to HR..."
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, { backgroundColor: theme.primary, opacity: !ticketReplyText.trim() ? 0.6 : 1 }]}
                onPress={handleSendTicketReply}
                disabled={sendingReply || !ticketReplyText.trim()}
              >
                {sendingReply ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.chatSendBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comp-Off Interactive Calendar Modal */}
      <Modal visible={calendarVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Calendar Header with Month Navigation */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {calendarTarget.startsWith('avail') ? 'Select Comp-Off Date 📅' : 'Select Date Worked 📅'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  {calendarTarget === 'worked_from'
                    ? 'Duty Start Date (From)'
                    : calendarTarget === 'worked_to'
                    ? 'Duty End Date (To)'
                    : calendarTarget === 'avail_from'
                    ? 'Comp-Off Start Date (From)'
                    : 'Comp-Off End Date (To)'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="cross" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Month / Year Bar */}
            <View style={[styles.calendarMonthBar, { backgroundColor: theme.inputBg }]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                <Icon name="chevron-left" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthText, { color: theme.textPrimary }]}>
                {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                <Icon name="chevron-right" size={18} color={theme.textPrimary} />
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
                      inRange && { backgroundColor: '#d9770625' },
                      isSelected && { backgroundColor: '#d97706', borderRadius: 10 },
                    ]}
                    onPress={() => handleSelectCalendarDay(item.day!)}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        { color: theme.textPrimary },
                        item.isToday && { color: '#d97706', fontWeight: '900' },
                        isSelected && { color: '#ffffff', fontWeight: '900' },
                      ]}
                    >
                      {item.day}
                    </Text>
                    {item.isToday && !isSelected && <View style={[styles.todayDot, { backgroundColor: '#d97706' }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Date Shortcuts */}
            <View style={styles.quickDateShortcuts}>
              <TouchableOpacity
                style={[styles.quickDateBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (calendarTarget === 'worked_from') {
                    setCompOffFromDate(todayStr);
                    if (todayStr > compOffToDate) setCompOffToDate(todayStr);
                  } else if (calendarTarget === 'worked_to') {
                    setCompOffToDate(todayStr);
                  } else if (calendarTarget === 'avail_from') {
                    setCompOffAvailFromDate(todayStr);
                    if (todayStr > compOffAvailToDate) setCompOffAvailToDate(todayStr);
                  } else if (calendarTarget === 'avail_to') {
                    setCompOffAvailToDate(todayStr);
                  }
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
                  const tmrwStr = tmrw.toISOString().split('T')[0];
                  if (calendarTarget === 'worked_from') {
                    setCompOffFromDate(tmrwStr);
                    if (tmrwStr > compOffToDate) setCompOffToDate(tmrwStr);
                  } else if (calendarTarget === 'worked_to') {
                    setCompOffToDate(tmrwStr);
                  } else if (calendarTarget === 'avail_from') {
                    setCompOffAvailFromDate(tmrwStr);
                    if (tmrwStr > compOffAvailToDate) setCompOffAvailToDate(tmrwStr);
                  } else if (calendarTarget === 'avail_to') {
                    setCompOffAvailToDate(tmrwStr);
                  }
                  setCalendarVisible(false);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.textPrimary }]}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => {
                  const d = new Date();
                  const day = d.getDay();
                  const diff = day === 0 ? 7 : day; // last Sunday
                  d.setDate(d.getDate() - diff);
                  const sunStr = d.toISOString().split('T')[0];
                  if (calendarTarget === 'worked_from') {
                    setCompOffFromDate(sunStr);
                    if (sunStr > compOffToDate) setCompOffToDate(sunStr);
                  } else if (calendarTarget === 'worked_to') {
                    setCompOffToDate(sunStr);
                  } else if (calendarTarget === 'avail_from') {
                    setCompOffAvailFromDate(sunStr);
                    if (sunStr > compOffAvailToDate) setCompOffAvailToDate(sunStr);
                  } else if (calendarTarget === 'avail_to') {
                    setCompOffAvailToDate(sunStr);
                  }
                  setCalendarVisible(false);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.textPrimary }]}>Last Sunday</Text>
              </TouchableOpacity>
            </View>
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
  headerRow: {
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  counterBadge: {
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  heroCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  heroCardSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  statMetricsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statMetric: {
    flex: 1,
    alignItems: 'center',
  },
  statMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#cbd5e140',
  },
  formCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  formCardHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputField: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  emiPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  emiPreviewLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emiPreviewAmount: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  emiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emiBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  purposeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  purposeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryActionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  itemCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryTagIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  itemDate: {
    fontSize: 10.5,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemDetails: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  itemNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ticketFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e130',
  },
  chatCounterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapToViewText: {
    fontSize: 10.5,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  anonymousLabel: {
    fontSize: 11,
    flex: 1,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
    paddingVertical: 0,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 260,
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  chatModalCard: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  chatSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  chatCloseBtn: {
    padding: 6,
  },
  chatMessagesBody: {
    flex: 1,
    marginVertical: 10,
  },
  ticketInitialCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  ticketInitialHeading: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  ticketInitialText: {
    fontSize: 12,
    lineHeight: 17,
  },
  ticketInitialDate: {
    fontSize: 10,
    marginTop: 6,
  },
  chatMsgBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  myMsgBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  hrMsgBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  msgSender: {
    fontSize: 9.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 16,
  },
  msgTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  chatSendBtn: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryDescBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    gap: 6,
  },
  categoryDescText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  dateSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateSelectorBtnSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  datePickerSubtext: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  datePickerMainText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
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
    justifyContent: 'space-around',
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
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
    marginTop: 1,
  },
  quickDateShortcuts: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00000015',
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickDateText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
