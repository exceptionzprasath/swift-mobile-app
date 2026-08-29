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

  // Form State
  const [category, setCategory] = useState(categories[0] || 'Salary / Payroll');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chat message state
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const myTickets = useMemo(() => {
    return (grievances || []).filter(
      (g) => g.employeeId === currentUser?.id || g.empCode === currentUser?.empCode || g.employeeName === currentUser?.name
    );
  }, [grievances, currentUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
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
      subject: subject.trim(),
      description: description.trim(),
      assignedRole: 'HR Manager',
    });
    setSubmitting(false);

    if (success) {
      Alert.alert('Ticket Submitted', 'Your grievance ticket has been sent to HR & Management.');
      setCreateModalVisible(false);
      setSubject('');
      setDescription('');
      setCategory(categories[0] || 'Salary / Payroll');
      setPriority('Medium');
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
        <View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Grievance Desk 💬</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Confidential employee support & escalation thread
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: theme.primary }]}
          onPress={() => setCreateModalVisible(true)}
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

        {/* Ticket Cards List */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Tickets ({myTickets.length})</Text>

        {myTickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🤝</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Grievances Raised</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              If you have any issues regarding salary, attendance, managers or workplace facilities, raise a ticket here.
            </Text>
          </View>
        ) : (
          myTickets.map((t) => {
            const isResolved = t.status === 'Resolved';
            const isRejected = t.status === 'Rejected';
            const statusColor = isResolved ? theme.success : isRejected ? theme.danger : theme.warning;

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

                <Text style={[styles.ticketSubject, { color: theme.textPrimary }]}>{t.subject}</Text>
                <Text style={[styles.ticketDesc, { color: theme.textMuted }]} numberOfLines={2}>
                  {t.description}
                </Text>

                <View style={[styles.ticketFooter, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.ticketMeta, { color: theme.textMuted }]}>
                    Priority: <Text style={{ color: t.priority === 'Critical' ? theme.danger : theme.textPrimary, fontWeight: '700' }}>{t.priority}</Text>
                  </Text>
                  <Text style={[styles.ticketMeta, { color: theme.primary, fontWeight: '600' }]}>
                    💬 {t.thread?.length || 1} messages ›
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* CREATE TICKET MODAL */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Raise Grievance Ticket</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="cross" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.chip,
                      { flex: 1, alignItems: 'center', borderColor: theme.cardBorder, backgroundColor: priority === p ? theme.primary : theme.inputBg },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.chipText, { color: priority === p ? '#fff' : theme.textPrimary }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                placeholder="Please describe what happened, dates, and what resolution you expect..."
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

      {/* CHAT / TICKET DETAILS MODAL */}
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
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
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
  ticketDesc: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1 },
  ticketMeta: { fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 18, maxHeight: '85%' },
  chatModalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, height: '80%', overflow: 'hidden' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 13, marginBottom: 12 },
  textArea: { height: 80, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingTop: 10, fontSize: 13, marginBottom: 14, textAlignVertical: 'top' },
  submitBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
