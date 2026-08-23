import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';
import { useAppContext, canRoleApproveDocInApp, DocRequest, LeaveRequest } from '../context/AppContext';

interface NotificationsScreenProps {
  theme: ThemeColors;
  onNavigate?: (tab: any) => void;
}

export function NotificationsScreen({ theme, onNavigate }: NotificationsScreenProps) {
  const {
    currentUser,
    docRequests,
    leaves,
    userRole,
    canApproveDocuments,
    canApproveLeaves,
    actOnDocStep,
    forwardDocStep,
    acceptDocument,
    actOnLeave,
    employees,
    roles,
    notices: apiNotices,
    holidays: apiHolidays,
    attendance,
    payrolls,
    todayRecord,
  } = useAppContext();

  const [filter, setFilter] = useState<'all' | 'approvals' | 'general'>('all');
  
  // Document Action State
  const [actingDoc, setActingDoc] = useState<{ req: DocRequest; action: 'approve' | 'forward' | 'reject' } | null>(null);
  const [forwardToRole, setForwardToRole] = useState('CEO / Super Admin');
  
  // Leave Action State
  const [actingLeave, setActingLeave] = useState<{ req: LeaveRequest; action: 'approve' | 'reject' } | null>(null);
  
  const [approvalComment, setApprovalComment] = useState('');
  const [signingDoc, setSigningDoc] = useState<DocRequest | null>(null);
  const [signatureText, setSignatureText] = useState('');
  const [busy, setBusy] = useState(false);

  // Available positions for forwarding
  const forwardOptions = [
    'CEO / Super Admin',
    'Director',
    'General Manager',
    ...(roles || []).map((r) => r.name).filter((name) => name !== 'General Employee' && name !== userRole?.name),
  ];

  // 1. Pending document approvals for authorized manager/HR
  const pendingDocApprovals = (docRequests || []).filter(
    (d) => d.status === 'pending' && canRoleApproveDocInApp(userRole, d.letterKey)
  );

  // 2. Pending leave & permission approvals for authorized roles
  const pendingLeaveApprovals = (leaves || []).filter(
    (l) => l.status === 'Pending' && canApproveLeaves && l.employeeId !== currentUser?.id
  );

  const totalPendingApprovals = pendingDocApprovals.length + pendingLeaveApprovals.length;
  const hasApprovalAuthority = canApproveDocuments || canApproveLeaves;

  // 3. Personal documents needing employee signature
  const pendingSignatures = (docRequests || []).filter(
    (d) =>
      (d.employeeId === currentUser?.id || d.employeeId === currentUser?.empCode) &&
      d.status === 'approved' &&
      !d.employeeAccepted
  );

  // 4. Dynamic, 100% Real-Time System Notices (NO Hardcoded Mock Data)
  const realTimeNotices: Array<{
    id: string;
    type: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    icon: IconName;
    iconColor: string;
  }> = [];

  // 4a. Real Database Notices from Admin Portal / Backend
  if (Array.isArray(apiNotices) && apiNotices.length > 0) {
    apiNotices.forEach((n: any, idx: number) => {
      // Filter if target role or employee is specified
      const isTargeted =
        !n.targetRole ||
        n.targetRole === 'all' ||
        n.targetRole === userRole?.name ||
        n.targetRole === userRole?.id ||
        (n.targetEmployeeId && (n.targetEmployeeId === currentUser?.id || n.targetEmployeeId === currentUser?.empCode));

      if (isTargeted) {
        realTimeNotices.push({
          id: n.id || `notic-${idx}`,
          type: n.category || 'announcement',
          title: n.title || 'Company Notice',
          desc: n.description || n.body || 'Official company announcement',
          time: n.date || 'Today',
          unread: false,
          icon: n.category === 'approval' ? 'shield' : n.category === 'leave' ? 'calendar' : 'document',
          iconColor: n.category === 'approval' ? '#f59e0b' : theme.primary,
        });
      }
    });
  }

  // 4b. Personal Leave / Permission Request Status Updates
  const userLeaves = (leaves || []).filter(
    (l) => l.employeeId === currentUser?.id || l.employeeId === currentUser?.empCode
  );

  userLeaves.slice(0, 3).forEach((l) => {
    if (l.status === 'Approved') {
      realTimeNotices.push({
        id: `leave-app-${l.id}`,
        type: 'leave',
        title: `${l.type} Approved`,
        desc: `Your application for ${l.startDate || ''} (${l.days}) was approved by ${l.actedBy || 'Manager'}${l.approverComment ? ` · "${l.approverComment}"` : ''}.`,
        time: l.actedAt ? new Date(l.actedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
        unread: false,
        icon: 'calendar',
        iconColor: '#10b981',
      });
    } else if (l.status === 'Rejected') {
      realTimeNotices.push({
        id: `leave-rej-${l.id}`,
        type: 'leave',
        title: `${l.type} Request Rejected`,
        desc: `Your application for ${l.startDate || ''} was declined by ${l.actedBy || 'Manager'}${l.approverComment ? ` · Reason: ${l.approverComment}` : ''}.`,
        time: l.actedAt ? new Date(l.actedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
        unread: true,
        icon: 'calendar',
        iconColor: '#ef4444',
      });
    } else if (l.status === 'Pending') {
      realTimeNotices.push({
        id: `leave-pend-${l.id}`,
        type: 'leave',
        title: `${l.type} Submitted (Pending)`,
        desc: `Your request for ${l.startDate || ''} (${l.days}) has been submitted and is awaiting manager approval.`,
        time: 'Pending',
        unread: false,
        icon: 'clock',
        iconColor: '#f59e0b',
      });
    }
  });

  // 4c. Real-time Attendance Check-in Notification
  if (todayRecord && todayRecord.clockIn) {
    realTimeNotices.push({
      id: `att-today-${todayRecord.date}`,
      type: 'attendance',
      title: 'Biometric Attendance Verified',
      desc: `Check-in recorded at ${todayRecord.clockIn} today via AWS Rekognition facial biometric verification (${todayRecord.similarity ? todayRecord.similarity.toFixed(1) + '%' : 'Verified'}).`,
      time: 'Today',
      unread: false,
      icon: 'clock',
      iconColor: '#10b981',
    });
  }

  // 4d. Real-time Upcoming Holiday
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHol = (apiHolidays || []).find((h: any) => h.date >= todayStr);
  if (upcomingHol) {
    realTimeNotices.push({
      id: `hol-${upcomingHol.id || upcomingHol.date}`,
      type: 'holiday',
      title: `Upcoming Holiday: ${upcomingHol.name}`,
      desc: `Official company holiday declared for ${upcomingHol.date}. ${upcomingHol.description || ''}`,
      time: upcomingHol.date,
      unread: false,
      icon: 'holiday',
      iconColor: '#f59e0b',
    });
  }

  // 4e. Real Payroll Slip Notification
  const userPayroll = (payrolls || []).find(
    (p) => p.employeeId === currentUser?.id || p.employeeId === currentUser?.empCode
  );
  if (userPayroll) {
    realTimeNotices.push({
      id: `pay-${userPayroll.id || userPayroll.month}`,
      type: 'payroll',
      title: `Payslip Available (${userPayroll.month || 'Current Month'})`,
      desc: `Net pay of ₹${(userPayroll.netSalary || userPayroll.netPay || currentUser?.basic || 0).toLocaleString()} credited. Tap to review breakdown in Payroll tab.`,
      time: userPayroll.month || 'This Month',
      unread: false,
      icon: 'payroll',
      iconColor: theme.primary,
    });
  }

  const systemNotices = realTimeNotices;

  // Document action handlers
  const handleOpenDocActionModal = (req: DocRequest, action: 'approve' | 'forward' | 'reject') => {
    setActingDoc({ req, action });
    setForwardToRole('CEO / Super Admin');
    setApprovalComment('');
  };

  const handleConfirmDocAction = async () => {
    if (!actingDoc) return;
    setBusy(true);

    if (actingDoc.action === 'forward') {
      const ok = await forwardDocStep(actingDoc.req.id, forwardToRole, approvalComment.trim());
      setBusy(false);
      if (ok) {
        Alert.alert(
          'Approved & Forwarded',
          `"${actingDoc.req.letterTitle}" has been approved on your level and forwarded to ${forwardToRole}.`
        );
        setActingDoc(null);
      } else {
        Alert.alert('Error', 'Failed to forward approval request.');
      }
    } else {
      const ok = await actOnDocStep(actingDoc.req.id, actingDoc.action, approvalComment.trim());
      setBusy(false);
      if (ok) {
        Alert.alert(
          actingDoc.action === 'approve' ? 'Document Approved' : 'Document Rejected',
          `Request for "${actingDoc.req.letterTitle}" has been ${actingDoc.action === 'approve' ? 'approved' : 'rejected'}.`
        );
        setActingDoc(null);
      } else {
        Alert.alert('Error', 'Failed to update approval status. Please try again.');
      }
    }
  };

  // Leave action handlers
  const handleOpenLeaveActionModal = (req: LeaveRequest, action: 'approve' | 'reject') => {
    setActingLeave({ req, action });
    setApprovalComment('');
  };

  const handleConfirmLeaveAction = async () => {
    if (!actingLeave) return;
    setBusy(true);

    const ok = await actOnLeave(actingLeave.req.id, actingLeave.action, approvalComment.trim());
    setBusy(false);
    if (ok) {
      Alert.alert(
        actingLeave.action === 'approve' ? 'Leave Approved' : 'Leave Rejected',
        `${actingLeave.req.type} request from ${actingLeave.req.employeeName || 'Employee'} has been ${actingLeave.action === 'approve' ? 'approved' : 'rejected'}.`
      );
      setActingLeave(null);
    } else {
      Alert.alert('Error', 'Failed to update leave request status. Please try again.');
    }
  };

  // Sign Document handlers
  const handleOpenSignModal = (doc: DocRequest) => {
    setSigningDoc(doc);
    setSignatureText(currentUser?.name || '');
  };

  const handleConfirmSign = async () => {
    if (!signingDoc) return;
    if (!signatureText.trim()) {
      Alert.alert('Signature Required', 'Please enter your full legal name to sign.');
      return;
    }
    setBusy(true);
    const ok = await acceptDocument(signingDoc.id, `E-Signed: ${signatureText.trim()}`);
    setBusy(false);
    if (ok) {
      Alert.alert('Document Signed', `You have accepted and signed "${signingDoc.letterTitle}".`);
      setSigningDoc(null);
    } else {
      Alert.alert('Error', 'Failed to record signature.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Notification Center</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            {hasApprovalAuthority
              ? `${userRole?.name || 'Manager'} • Role Approvals & Live Alerts`
              : `Personal Updates & Company Alerts`}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'all' && { color: '#ffffff' }]}>
            All ({totalPendingApprovals + pendingSignatures.length + systemNotices.length})
          </Text>
        </TouchableOpacity>

        {hasApprovalAuthority && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
              filter === 'approvals' && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setFilter('approvals')}
          >
            <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'approvals' && { color: '#ffffff' }]}>
              Pending Approvals ({totalPendingApprovals})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'general' && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => setFilter('general')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'general' && { color: '#ffffff' }]}>
            My Alerts ({systemNotices.length + pendingSignatures.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section 1A: Urgent Leave & Permission Approvals for Manager/HR */}
      {(filter === 'all' || filter === 'approvals') && pendingLeaveApprovals.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              🌴 Action Required: Leave & Permission Approvals ({pendingLeaveApprovals.length})
            </Text>
            <View style={[styles.urgentBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={styles.urgentBadgeText}>Awaiting Approval</Text>
            </View>
          </View>

          {pendingLeaveApprovals.map((req) => (
            <View
              key={req.id}
              style={[styles.urgentCard, { backgroundColor: theme.card, borderColor: '#f59e0b' }]}
            >
              <View style={styles.urgentCardHeader}>
                <View style={[styles.urgentIconBg, { backgroundColor: '#fef3c7' }]}>
                  <Icon name="calendar" size={20} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.urgentCardTitle, { color: theme.textPrimary }]}>
                    {req.type} Application ({req.days})
                  </Text>
                  <Text style={[styles.urgentCardMeta, { color: theme.textMuted }]}>
                    From: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{req.employeeName || 'Employee'}</Text> • 📅 {req.startDate || req.startDate}
                  </Text>
                </View>
              </View>

              {req.reason ? (
                <View style={[styles.noteBox, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.noteText, { color: theme.textPrimary }]}>Reason: "{req.reason}"</Text>
                </View>
              ) : null}

              {/* Action Buttons: Reject & Approve */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.actionRejectBtn, { borderColor: '#ef4444' }]}
                  onPress={() => handleOpenLeaveActionModal(req, 'reject')}
                >
                  <Text style={styles.actionRejectText}>✕ Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionApproveBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => handleOpenLeaveActionModal(req, 'approve')}
                >
                  <Text style={styles.actionApproveText}>✓ Approve Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Section 1B: Urgent Document Approvals for Authorized Role */}
      {(filter === 'all' || filter === 'approvals') && pendingDocApprovals.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              ⚡ Action Required: Document Approvals ({pendingDocApprovals.length})
            </Text>
            <View style={[styles.urgentBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={styles.urgentBadgeText}>Awaiting Your Role</Text>
            </View>
          </View>

          {pendingDocApprovals.map((req) => {
            const targetEmp = employees.find((e) => e.id === req.employeeId || e.empCode === req.employeeId);
            return (
              <View
                key={req.id}
                style={[styles.urgentCard, { backgroundColor: theme.card, borderColor: theme.primary }]}
              >
                <View style={styles.urgentCardHeader}>
                  <View style={[styles.urgentIconBg, { backgroundColor: theme.tealSoft }]}>
                    <Icon name="document" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.urgentCardTitle, { color: theme.textPrimary }]}>
                      Approve {req.letterTitle}
                    </Text>
                    <Text style={[styles.urgentCardMeta, { color: theme.textMuted }]}>
                      For: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{targetEmp?.name || req.employeeName || 'Employee'}</Text> ({targetEmp?.department || 'General'}) • Req by {req.requestedBy}
                    </Text>
                  </View>
                </View>

                {req.note ? (
                  <View style={[styles.noteBox, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.noteText, { color: theme.textMuted }]}>"{req.note}"</Text>
                  </View>
                ) : null}

                {/* 3 Action Buttons: Reject, Forward, Approve */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionRejectBtn, { borderColor: '#ef4444' }]}
                    onPress={() => handleOpenDocActionModal(req, 'reject')}
                  >
                    <Text style={styles.actionRejectText}>✕ Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionForwardBtn, { backgroundColor: theme.inputBg, borderColor: theme.primary }]}
                    onPress={() => handleOpenDocActionModal(req, 'forward')}
                  >
                    <Text style={[styles.actionForwardText, { color: theme.primary }]}>↗ Forward</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionApproveBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleOpenDocActionModal(req, 'approve')}
                  >
                    <Text style={styles.actionApproveText}>✓ Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Section 2: Personal Documents Ready for E-Signature */}
      {(filter === 'all' || filter === 'general') && pendingSignatures.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            ✍️ Documents Requiring Your Signature ({pendingSignatures.length})
          </Text>

          {pendingSignatures.map((doc) => (
            <View
              key={doc.id}
              style={[styles.signNoticeCard, { backgroundColor: theme.card, borderColor: '#6366f1' }]}
            >
              <View style={styles.signNoticeHeader}>
                <View style={[styles.signIconBg, { backgroundColor: '#e0e7ff' }]}>
                  <Icon name="document" size={20} color="#4338ca" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.signNoticeTitle, { color: theme.textPrimary }]}>
                    {doc.letterTitle} - Approved
                  </Text>
                  <Text style={[styles.signNoticeDesc, { color: theme.textMuted }]}>
                    Your official document has been verified by HR. Please review and e-sign to complete onboarding.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.eSignBtn, { backgroundColor: '#4f46e5' }]}
                onPress={() => handleOpenSignModal(doc)}
              >
                <Text style={styles.eSignBtnText}>Accept & E-Sign Now</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Section 3: Live Dynamic System Notifications */}
      {(filter === 'all' || filter === 'general') && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Live Alerts & Updates ({systemNotices.length})
          </Text>

          {systemNotices.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Icon name="bell" size={28} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>All Caught Up!</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                No unread notifications at this time.
              </Text>
            </View>
          ) : (
            systemNotices.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.noticeCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  item.unread && { borderColor: theme.primary, backgroundColor: theme.tealSoft },
                ]}
              >
                <View style={[styles.iconBg, { backgroundColor: item.iconColor + '20' }]}>
                  <Icon name={item.icon} size={20} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.cardTime, { color: theme.textMuted }]}>{item.time}</Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: theme.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Document Action Modal (Approve, Forward, or Reject) */}
      <Modal visible={!!actingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {actingDoc?.action === 'approve'
                ? 'Approve Document'
                : actingDoc?.action === 'forward'
                ? 'Approve & Forward to Next Position'
                : 'Reject Document'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {actingDoc?.req.letterTitle}
            </Text>

            {/* Target Role Selector for Forward Action */}
            {actingDoc?.action === 'forward' && (
              <View style={styles.forwardRoleSection}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                  Select Next Approver Position / Role:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChipsRow}>
                  {Array.from(new Set(forwardOptions)).map((roleOption) => (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleChip,
                        { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                        forwardToRole === roleOption && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setForwardToRole(roleOption)}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: theme.textPrimary },
                          forwardToRole === roleOption && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {roleOption === 'CEO / Super Admin' ? '👑 ' : ''}{roleOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
              {actingDoc?.action === 'forward'
                ? 'Forwarding Note / Instructions (Optional):'
                : actingDoc?.action === 'reject'
                ? 'Reason for Rejection (Required):'
                : 'Approval Comment (Optional):'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={approvalComment}
              onChangeText={setApprovalComment}
              placeholder={
                actingDoc?.action === 'forward'
                  ? 'e.g. Approved and forwarding for executive signoff'
                  : actingDoc?.action === 'approve'
                  ? 'e.g. Approved and verified'
                  : 'e.g. Revision needed in designation'
              }
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setActingDoc(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor:
                      actingDoc?.action === 'approve'
                        ? '#10b981'
                        : actingDoc?.action === 'forward'
                        ? theme.primary
                        : '#ef4444',
                  },
                ]}
                onPress={handleConfirmDocAction}
                disabled={busy || (actingDoc?.action === 'reject' && !approvalComment.trim())}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actingDoc?.action === 'approve'
                      ? 'Confirm Approval'
                      : actingDoc?.action === 'forward'
                      ? 'Approve & Forward'
                      : 'Confirm Rejection'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Action Modal (Approve or Reject) */}
      <Modal visible={!!actingLeave} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {actingLeave?.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {actingLeave?.req.type} ({actingLeave?.req.days}) for {actingLeave?.req.employeeName || 'Employee'}
            </Text>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
              {actingLeave?.action === 'reject' ? 'Reason for Rejection (Optional):' : 'Approval Note / Remarks (Optional):'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={approvalComment}
              onChangeText={setApprovalComment}
              placeholder={actingLeave?.action === 'approve' ? 'e.g. Approved. Have a good break!' : 'e.g. Critical deployment on this date.'}
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setActingLeave(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: actingLeave?.action === 'approve' ? '#10b981' : '#ef4444' },
                ]}
                onPress={handleConfirmLeaveAction}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actingLeave?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* E-Signature Modal */}
      <Modal visible={!!signingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>E-Sign Document</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {signingDoc?.letterTitle}
            </Text>

            <View style={[styles.signAgreementBox, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.signAgreementText, { color: theme.textPrimary }]}>
                "I hereby confirm that I accept this {signingDoc?.letterTitle}."
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Type Legal Full Name to Sign:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={signatureText}
              onChangeText={setSignatureText}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setSigningDoc(null)}
                disabled={busy}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmSign}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Sign & Accept</Text>
                )}
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
    paddingBottom: 36,
  },
  headerRow: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgentBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  urgentCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  urgentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  urgentIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  urgentCardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  noteBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionRejectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRejectText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  actionForwardBtn: {
    flex: 1.3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionForwardText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionApproveBtn: {
    flex: 1.2,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionApproveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  forwardRoleSection: {
    marginBottom: 14,
  },
  roleChipsRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signNoticeCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  signNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  signIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  signNoticeDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  eSignBtn: {
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eSignBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 10,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  signAgreementBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  signAgreementText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
