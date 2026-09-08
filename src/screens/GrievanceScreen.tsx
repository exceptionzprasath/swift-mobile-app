import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext, type GrievanceTicket } from '../context/AppContext';

interface GrievanceScreenProps {
  theme: ThemeColors;
}

const DEFAULT_CATEGORIES = [
  'Attendance Related',
  'Leave Permission',
  'Salary / Payroll',
  'Manager Behavior',
  'Workplace Issues',
  'Policy Violation',
  'Benefits & Claims',
  'Others',
];

const PRIORITIES: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Low', 'Medium', 'High', 'Critical'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDatePretty(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthShort = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].substring(0, 3) : parts[1];
  return `${day < 10 ? '0' + day : day} ${monthShort} ${year}`;
}

function formatDateRange(fromStr?: string, toStr?: string): string {
  if (!fromStr && !toStr) return '';
  if (fromStr && !toStr) return formatDatePretty(fromStr);
  if (!fromStr && toStr) return formatDatePretty(toStr);
  if (fromStr === toStr) return formatDatePretty(fromStr);
  return `${formatDatePretty(fromStr)} – ${formatDatePretty(toStr)}`;
}

export const GrievanceScreen: React.FC<GrievanceScreenProps> = ({ theme }) => {
  const { grievances, applyGrievance, sendGrievanceMessage, refreshData, currentUser, companyConfig } = useAppContext();

  const categories = useMemo(() => {
    const fromWorkflows = (companyConfig?.approvalWorkflows?.grievance || [])
      .filter((g: any) => g.active !== false)
      .map((g: any) => g.name);
    if (fromWorkflows.length > 0) return fromWorkflows;

    const dynamic = (companyConfig?.grievanceTypes || [])
      .filter((g: any) => g.active !== false)
      .map((g: any) => g.name);
    if (dynamic.length > 0) return dynamic;
    return DEFAULT_CATEGORIES;
  }, [companyConfig?.approvalWorkflows?.grievance, companyConfig?.grievanceTypes]);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [chatTicket, setChatTicket] = useState<GrievanceTicket | null>(null);

  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_30_days'>('all');

  // Form State
  const [category, setCategory] = useState(categories[0] || 'Salary / Payroll');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [fromDate, setFromDate] = useState<string>(getTodayString());
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calendar Modal State
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to'>('from');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // Chat message state
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const myTickets = useMemo(() => {
    return (grievances || []).filter(
      (g) => g.employeeId === currentUser?.id || g.empCode === currentUser?.empCode || g.employeeName === currentUser?.name
    );
  }, [grievances, currentUser]);

  const filteredTickets = useMemo(() => {
    let result = myTickets;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.fromDate?.toLowerCase().includes(q) ||
          t.toDate?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === 'open') {
      result = result.filter((t) => t.status === 'Open' || t.status === 'In Progress');
    } else if (statusFilter === 'resolved') {
      result = result.filter((t) => t.status === 'Resolved');
    }

    // Date filter
    if (dateFilter === 'this_month') {
      const now = new Date();
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      result = result.filter((t) => {
        const ticketDate = t.fromDate || t.createdAt?.slice(0, 10);
        return ticketDate && ticketDate.startsWith(currentMonthPrefix);
      });
    } else if (dateFilter === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      result = result.filter((t) => {
        const ticketDate = t.fromDate || t.createdAt?.slice(0, 10);
        return ticketDate && ticketDate >= thirtyDaysAgoStr;
      });
    }

    return result;
  }, [myTickets, searchQuery, statusFilter, dateFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Calendar Day Computation
  const monthDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { day: number | null; isToday: boolean; isSelected: boolean; inRange: boolean; dateStr: string }[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, isToday: false, isSelected: false, inRange: false, dateStr: '' });
    }

    const todayStr = getTodayString();
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const cellDateStr = `${year}-${mStr}-${dStr}`;
      const isToday = cellDateStr === todayStr;
      const isSelected = cellDateStr === fromDate || cellDateStr === toDate;
      const cellTime = new Date(cellDateStr).getTime();
      const inRange = cellTime >= fromTime && cellTime <= toTime;

      days.push({ day: d, isToday, isSelected, inRange, dateStr: cellDateStr });
    }

    return days;
  }, [calendarViewDate, fromDate, toDate]);

  const openCalendarFor = (target: 'from' | 'to') => {
    setCalendarTarget(target);
    const initialDateStr = target === 'from' ? fromDate : toDate;
    const initialDate = new Date(initialDateStr);
    setCalendarViewDate(isNaN(initialDate.getTime()) ? new Date() : initialDate);
    setCalendarVisible(true);
  };

  const handleSelectCalendarDay = (day: number) => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${mStr}-${dStr}`;

    if (calendarTarget === 'from') {
      setFromDate(selectedDateStr);
      if (selectedDateStr > toDate) {
        setToDate(selectedDateStr);
      }
    } else {
      if (selectedDateStr < fromDate) {
        setFromDate(selectedDateStr);
      }
      setToDate(selectedDateStr);
    }
    setCalendarVisible(false);
  };

  const applyDatePreset = (preset: 'today' | 'yesterday' | 'last7' | 'this_month') => {
    const today = new Date();
    const todayStr = getTodayString();

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setFromDate(yestStr);
      setToDate(yestStr);
    } else if (preset === 'last7') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      setFromDate(sevenDaysAgo.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a ticket subject.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe your grievance in detail.');
      return;
    }

    setSubmitting(true);
    const success = await applyGrievance({
      category: category || categories[0] || 'Salary / Payroll',
      priority,
      fromDate,
      toDate,
      incidentDate: fromDate,
      subject: subject.trim(),
      description: description.trim(),
      assignedRole: 'HR Manager',
    });
    setSubmitting(false);

    if (success) {
      Alert.alert('Ticket Submitted', 'Your grievance ticket has been sent to HR & Management with the specified incident date range.');
      setCreateModalVisible(false);
      setSubject('');
      setDescription('');
      setCategory(categories[0] || 'Salary / Payroll');
      setPriority('Medium');
      setFromDate(getTodayString());
      setToDate(getTodayString());
    } else {
      Alert.alert('Error', 'Failed to submit grievance. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatTicket || !chatText.trim()) return;
    setSendingMsg(true);
    const success = await sendGrievanceMessage(chatTicket.id, chatText.trim());
    setSendingMsg(false);
    if (success) {
      setChatText('');
      const updated = grievances.find((g) => g.id === chatTicket.id);
      if (updated) setChatTicket(updated);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Grievance Desk 💬</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Confidential employee support & incident escalation
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            setFromDate(getTodayString());
            setToDate(getTodayString());
            setCreateModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ Raise Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Ticket Summary Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.statNum, { color: theme.textPrimary }]}>{myTickets.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Tickets</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '35' }]}>
            <Text style={[styles.statNum, { color: theme.warning }]}>
              {myTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.warning }]}>Active / Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.success + '15', borderColor: theme.success + '35' }]}>
            <Text style={[styles.statNum, { color: theme.success }]}>
              {myTickets.filter((t) => t.status === 'Resolved').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.success }]}>Resolved</Text>
          </View>
        </View>

        {/* Search Bar & Filter Chips */}
        <View style={[styles.searchFilterCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
            <Icon name="search" size={15} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search tickets, incident dates, keywords..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="cross" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Filter Chips (Status & Date) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: theme.cardBorder, backgroundColor: statusFilter === 'all' && dateFilter === 'all' ? theme.primary : theme.inputBg },
              ]}
              onPress={() => {
                setStatusFilter('all');
                setDateFilter('all');
              }}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === 'all' && dateFilter === 'all' ? '#fff' : theme.textPrimary }]}>
                All Tickets ({myTickets.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: theme.cardBorder, backgroundColor: dateFilter === 'this_month' ? theme.primary : theme.inputBg },
              ]}
              onPress={() => setDateFilter(dateFilter === 'this_month' ? 'all' : 'this_month')}
            >
              <Text style={[styles.filterChipText, { color: dateFilter === 'this_month' ? '#fff' : theme.textPrimary }]}>
                📅 This Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: theme.cardBorder, backgroundColor: dateFilter === 'last_30_days' ? theme.primary : theme.inputBg },
              ]}
              onPress={() => setDateFilter(dateFilter === 'last_30_days' ? 'all' : 'last_30_days')}
            >
              <Text style={[styles.filterChipText, { color: dateFilter === 'last_30_days' ? '#fff' : theme.textPrimary }]}>
                📅 Last 30 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: theme.cardBorder, backgroundColor: statusFilter === 'open' ? theme.warning : theme.inputBg },
              ]}
              onPress={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === 'open' ? '#fff' : theme.textPrimary }]}>
                ⚡ Active Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: theme.cardBorder, backgroundColor: statusFilter === 'resolved' ? theme.success : theme.inputBg },
              ]}
              onPress={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === 'resolved' ? '#fff' : theme.textPrimary }]}>
                ✓ Resolved
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ticket Cards List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            My Tickets ({filteredTickets.length})
          </Text>
          {(statusFilter !== 'all' || dateFilter !== 'all' || searchQuery.length > 0) && (
            <TouchableOpacity
              onPress={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
            >
              <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredTickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🤝</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {myTickets.length === 0 ? 'No Grievances Raised' : 'No Tickets Match Filter'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {myTickets.length === 0
                ? 'If you have any issues regarding salary, attendance, managers, or workplace facilities, raise a ticket with incident dates.'
                : 'Try adjusting your search keywords or date filters.'}
            </Text>
          </View>
        ) : (
          filteredTickets.map((t) => {
            const isResolved = t.status === 'Resolved';
            const isRejected = t.status === 'Rejected';
            const statusColor = isResolved ? theme.success : isRejected ? theme.danger : theme.warning;
            const hasDates = !!(t.fromDate || t.toDate || t.incidentDate);

            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.ticketCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => setChatTicket(t)}
                activeOpacity={0.7}
              >
                <View style={styles.ticketHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ticketNum, { color: theme.primary }]}>{t.ticketNumber}</Text>
                    <Text style={[styles.ticketCategory, { color: theme.textMuted }]}>{t.category}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{t.status}</Text>
                  </View>
                </View>

                {/* Subject & Description */}
                <Text style={[styles.ticketSubject, { color: theme.textPrimary }]}>{t.subject}</Text>
                <Text style={[styles.ticketDesc, { color: theme.textMuted }]} numberOfLines={2}>
                  {t.description}
                </Text>

                {/* Incident Date Badge (From & To Date) */}
                {hasDates && (
                  <View style={[styles.dateBadgeContainer, { backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.12)' : '#f0f9ff', borderColor: theme.isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd' }]}>
                    <Icon name="calendar" size={12} color={theme.primary} />
                    <Text style={[styles.dateBadgeText, { color: theme.primary }]}>
                      Incident: {formatDateRange(t.fromDate || t.incidentDate, t.toDate || t.incidentDate)}
                    </Text>
                  </View>
                )}

                <View style={[styles.ticketFooter, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.ticketMeta, { color: theme.textMuted }]}>
                    Priority:{' '}
                    <Text
                      style={{
                        color:
                          t.priority === 'Critical'
                            ? theme.danger
                            : t.priority === 'High'
                            ? theme.warning
                            : theme.textPrimary,
                        fontWeight: '700',
                      }}
                    >
                      {t.priority}
                    </Text>
                  </Text>
                  <Text style={[styles.ticketMeta, { color: theme.primary, fontWeight: '600' }]}>
                    💬 {t.thread?.length || 1} message{(t.thread?.length || 1) > 1 ? 's' : ''} ›
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* CREATE TICKET MODAL WITH FROM & TO DATE OPTION */}
      {/* ============================================================ */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Raise Grievance Ticket</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  Provide issue category, incident dates, and details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={{ padding: 4 }}>
                <Icon name="cross" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* Category selector */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map((cat: string) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      { borderColor: theme.cardBorder, backgroundColor: category === cat ? theme.primary : theme.inputBg },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: category === cat ? '#fff' : theme.textPrimary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Priority */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Urgency / Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p;
                  const activeColor =
                    p === 'Critical'
                      ? theme.danger
                      : p === 'High'
                      ? theme.warning
                      : p === 'Medium'
                      ? theme.primary
                      : theme.textSecondary;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.chip,
                        {
                          flex: 1,
                          alignItems: 'center',
                          borderColor: isSelected ? activeColor : theme.cardBorder,
                          backgroundColor: isSelected ? activeColor : theme.inputBg,
                        },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? '#fff' : theme.textPrimary }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ============================================================ */}
              {/* DATE SELECTION (FROM DATE & TO DATE) */}
              {/* ============================================================ */}
              <View style={[styles.dateSectionContainer, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="calendar" size={14} color={theme.primary} />
                    <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginBottom: 0 }]}>
                      Incident / Discrepancy Period
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Select Date Range</Text>
                </View>

                {/* Quick Date Presets */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[styles.presetMiniChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => applyDatePreset('today')}
                  >
                    <Text style={[styles.presetMiniText, { color: theme.textPrimary }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.presetMiniChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => applyDatePreset('yesterday')}
                  >
                    <Text style={[styles.presetMiniText, { color: theme.textPrimary }]}>Yesterday</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.presetMiniChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => applyDatePreset('last7')}
                  >
                    <Text style={[styles.presetMiniText, { color: theme.textPrimary }]}>Past 7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.presetMiniChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => applyDatePreset('this_month')}
                  >
                    <Text style={[styles.presetMiniText, { color: theme.textPrimary }]}>This Month</Text>
                  </TouchableOpacity>
                </View>

                {/* Side-by-Side From Date and To Date Buttons */}
                <View style={styles.dateButtonsRow}>
                  {/* From Date */}
                  <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => openCalendarFor('from')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateBtnLabel, { color: theme.textMuted }]}>FROM DATE</Text>
                    <View style={styles.dateBtnValueRow}>
                      <Icon name="calendar" size={14} color={theme.primary} />
                      <Text style={[styles.dateBtnValue, { color: theme.textPrimary }]}>
                        {formatDatePretty(fromDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Arrow Indicator */}
                  <View style={styles.dateArrowContainer}>
                    <Text style={{ color: theme.textMuted, fontSize: 14 }}>→</Text>
                  </View>

                  {/* To Date */}
                  <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => openCalendarFor('to')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateBtnLabel, { color: theme.textMuted }]}>TO DATE</Text>
                    <View style={styles.dateBtnValueRow}>
                      <Icon name="calendar" size={14} color={theme.primary} />
                      <Text style={[styles.dateBtnValue, { color: theme.textPrimary }]}>
                        {formatDatePretty(toDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Selected Range Summary */}
                <Text style={[styles.dateSummaryText, { color: theme.textMuted }]}>
                  Selected Duration:{' '}
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>
                    {formatDateRange(fromDate, toDate)}
                  </Text>
                </Text>
              </View>

              {/* Subject */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Subject / Summary</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary }]}
                placeholder="Brief summary of the issue..."
                placeholderTextColor={theme.textMuted}
                value={subject}
                onChangeText={setSubject}
              />

              {/* Description */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Detailed Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary }]}
                placeholder="Please describe what happened, specific dates/times, and what resolution you expect..."
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleCreateTicket}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Grievance →'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* INTERACTIVE CALENDAR MODAL */}
      {/* ============================================================ */}
      <Modal visible={calendarVisible} animationType="fade" transparent>
        <View style={styles.calModalBackdrop}>
          <View style={[styles.calModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Calendar Header */}
            <View style={styles.calHeaderRow}>
              <TouchableOpacity
                style={[styles.calNavBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <Text style={[styles.calNavBtnText, { color: theme.textPrimary }]}>‹</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.calTitle, { color: theme.textPrimary }]}>
                  {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                </Text>
                <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700', marginTop: 1 }}>
                  Select {calendarTarget === 'from' ? 'From Date (Start)' : 'To Date (End)'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.calNavBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                onPress={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <Text style={[styles.calNavBtnText, { color: theme.textPrimary }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.calWeekdaysRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={[styles.calWeekdayText, { color: theme.textMuted }]}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {monthDays.map((item, idx) => {
                if (item.day === null) {
                  return <View key={`empty-${idx}`} style={styles.calDayCell} />;
                }

                const isStart = item.dateStr === fromDate;
                const isEnd = item.dateStr === toDate;
                const isSingleSelected = isStart && isEnd;

                return (
                  <TouchableOpacity
                    key={`day-${item.day}`}
                    style={[
                      styles.calDayCell,
                      item.inRange && { backgroundColor: theme.primary + '20' },
                      isStart && styles.calDayStart,
                      isEnd && styles.calDayEnd,
                      (isStart || isEnd) && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => item.day !== null && handleSelectCalendarDay(item.day)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        { color: theme.textPrimary },
                        item.isToday && { color: theme.primary, fontWeight: '800' },
                        (isStart || isEnd) && { color: '#ffffff', fontWeight: '800' },
                      ]}
                    >
                      {item.day}
                    </Text>
                    {item.isToday && !(isStart || isEnd) && (
                      <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.calCloseBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={[styles.calCloseBtnText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* CHAT / TICKET DETAILS MODAL */}
      {/* ============================================================ */}
      {chatTicket && (
        <Modal visible={Boolean(chatTicket)} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={[styles.chatModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* Header */}
              <View style={[styles.chatHeader, { borderBottomColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ticketNum, { color: theme.primary }]}>{chatTicket.ticketNumber}</Text>
                  <Text style={[styles.chatTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {chatTicket.subject}
                  </Text>
                  {/* Date & Meta */}
                  {(chatTicket.fromDate || chatTicket.toDate || chatTicket.incidentDate) && (
                    <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '600', marginTop: 2 }}>
                      📅 Incident Period: {formatDateRange(chatTicket.fromDate || chatTicket.incidentDate, chatTicket.toDate || chatTicket.incidentDate)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setChatTicket(null)} style={{ padding: 4 }}>
                  <Icon name="cross" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Messages Thread */}
              <ScrollView style={styles.chatScroll} contentContainerStyle={{ padding: 12, gap: 10 }}>
                {(chatTicket.thread || []).map((msg) => {
                  const isMe = msg.senderRole === 'Employee';
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.msgBubble,
                        isMe
                          ? { alignSelf: 'flex-end', backgroundColor: theme.primary }
                          : { alignSelf: 'flex-start', backgroundColor: theme.inputBg, borderColor: theme.cardBorder, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.msgSender, { color: isMe ? '#fff' : theme.textPrimary }]}>
                        {msg.senderName} ({msg.senderRole})
                      </Text>
                      <Text style={[styles.msgText, { color: isMe ? '#fff' : theme.textPrimary }]}>
                        {msg.message}
                      </Text>
                      <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Message Input */}
              <View style={[styles.chatInputRow, { borderTopColor: theme.cardBorder, backgroundColor: theme.card }]}>
                <TextInput
                  style={[styles.chatInput, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary }]}
                  placeholder="Type a response..."
                  placeholderTextColor={theme.textMuted}
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: sendingMsg || !chatText.trim() ? 0.6 : 1 }]}
                  onPress={handleSendMessage}
                  disabled={sendingMsg || !chatText.trim()}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  newBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  searchFilterCard: { padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
  filterChipText: { fontSize: 11, fontWeight: '700' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  emptyCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginVertical: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  ticketCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ticketNum: { fontSize: 11, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  ticketCategory: { fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  ticketSubject: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  ticketDesc: { fontSize: 12, lineHeight: 16, marginBottom: 8 },

  dateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  dateBadgeText: { fontSize: 11, fontWeight: '700' },

  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1 },
  ticketMeta: { fontSize: 11 },

  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 18, maxHeight: '88%' },
  chatModalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, height: '80%', overflow: 'hidden' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Date picker in form
  dateSectionContainer: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  presetMiniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  presetMiniText: { fontSize: 10, fontWeight: '700' },
  dateButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dateBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1 },
  dateBtnLabel: { fontSize: 9, fontWeight: '800', marginBottom: 4 },
  dateBtnValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBtnValue: { fontSize: 12, fontWeight: '700' },
  dateArrowContainer: { paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
  dateSummaryText: { fontSize: 11, marginTop: 8 },

  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 13, marginBottom: 12 },
  textArea: { height: 80, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingTop: 10, fontSize: 13, marginBottom: 14, textAlignVertical: 'top' },
  submitBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Calendar Modal
  calModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  calModalCard: { width: '100%', maxWidth: 360, borderRadius: 18, borderWidth: 1, padding: 16 },
  calHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  calNavBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calNavBtnText: { fontSize: 18, fontWeight: '700' },
  calTitle: { fontSize: 15, fontWeight: '800' },
  calWeekdaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calWeekdayText: { width: 40, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calDayCell: { width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  calDayStart: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  calDayEnd: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  calDayText: { fontSize: 12, fontWeight: '600' },
  todayDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 3 },
  calCloseBtn: { marginTop: 14, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calCloseBtnText: { fontSize: 12, fontWeight: '700' },

  // Chat Modal
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  chatTitle: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  chatScroll: { flex: 1 },
  msgBubble: { maxWidth: '82%', padding: 10, borderRadius: 12, marginBottom: 4 },
  msgSender: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  msgText: { fontSize: 12, lineHeight: 16 },
  msgTime: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  sendBtn: { height: 40, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
