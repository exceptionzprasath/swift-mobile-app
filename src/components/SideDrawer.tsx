import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon, IconName } from './Icon';
import { useAppContext, Employee } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(340, SCREEN_WIDTH * 0.85);

export type SideDrawerAction =
  | 'attendance'
  | 'payroll'
  | 'leaves'
  | 'documents'
  | 'holidays'
  | 'requests'
  | 'advance_loan'
  | 'comp_off'
  | 'grievance'
  | 'history'
  | 'relieve';

interface SideDrawerProps {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
  onNavigate: (tab: any) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

interface RequestRecord {
  id: string;
  type: string;
  category: 'loan' | 'comp_off' | 'grievance' | 'relieve' | 'leave' | 'document';
  title: string;
  details: string;
  amountOrDays?: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review' | 'Resolved';
}

export function SideDrawer({
  visible,
  theme,
  onClose,
  onNavigate,
  onToggleTheme,
  onLogout,
}: SideDrawerProps) {
  const { currentUser, companyConfig, leaves, docRequests, attendance, applyLeave, refreshData } = useAppContext();

  // Animation states for slow, smooth incoming slide
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startIncomingAnimation = () => {
    slideAnim.setValue(-DRAWER_WIDTH);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 520, // Smooth, slow, visible incoming glide
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
      // Also start as fallback if onShow is delayed
      const timer = setTimeout(() => {
        startIncomingAnimation();
      }, 50);
      return () => clearTimeout(timer);
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 340,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 340,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 340,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Sub-modals for extended side panel options
  const [activeModal, setActiveModal] = useState<
    'advance_loan' | 'comp_off' | 'grievance' | 'history' | 'relieve' | null
  >(null);

  // Advance Loan Form State
  const [loanAmount, setLoanAmount] = useState('25000');
  const [loanTenor, setLoanTenor] = useState('3 Months (EMI)');
  const [loanPurpose, setLoanPurpose] = useState('');

  // Comp-Off Form State
  const [compOffDate, setCompOffDate] = useState('Last Sunday (Weekend Duty)');
  const [compOffHours, setCompOffHours] = useState('Full Day (8 Hrs)');
  const [compOffReason, setCompOffReason] = useState('');

  // Grievance Form State
  const [grievanceCategory, setGrievanceCategory] = useState<'Workplace' | 'Compensation' | 'Shift' | 'POSH / Ethics'>('Workplace');
  const [grievanceSeverity, setGrievanceSeverity] = useState<'Normal' | 'Urgent' | 'High Priority'>('Normal');
  const [grievanceDesc, setGrievanceDesc] = useState('');

  // Relieve Request Form State
  const [relieveReason, setRelieveReason] = useState<'Career Growth' | 'Higher Studies' | 'Relocation' | 'Personal Reasons'>('Career Growth');
  const [proposedLWD, setProposedLWD] = useState('30 Days Standard Notice');
  const [handoverRemarks, setHandoverRemarks] = useState('');

  const [busy, setBusy] = useState(false);

  // Local state for custom requests persisted during session
  const [customRequests, setCustomRequests] = useState<RequestRecord[]>([]);

  const handleSelectDrawerItem = (action: SideDrawerAction, itemMeta?: { label: string; isComingSoon?: boolean }) => {
    if (itemMeta?.isComingSoon) {
      Alert.alert(
        'Coming Soon 🚀',
        `${itemMeta.label} is currently scheduled for development and will be available in an upcoming release.`
      );
      return;
    }

    onClose();
    switch (action) {
      case 'attendance':
        onNavigate('attendance');
        break;
      case 'payroll':
        onNavigate('payroll');
        break;
      case 'leaves':
        onNavigate('leaves');
        break;
      case 'documents':
        onNavigate('documents');
        break;
      case 'holidays':
        onNavigate('holidays');
        break;
      case 'requests':
      case 'advance_loan':
      case 'comp_off':
      case 'grievance':
      case 'history':
        onNavigate('requests');
        break;
      case 'relieve':
        setTimeout(() => setActiveModal('relieve'), 300);
        break;
      default:
        onNavigate('requests');
        break;
    }
  };

  // Submit Advance Loan
  const handleSubmitLoan = async () => {
    if (!loanAmount.trim() || isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid loan amount in ₹.');
      return;
    }
    if (!loanPurpose.trim()) {
      Alert.alert('Required', 'Please enter the purpose of the advance salary loan.');
      return;
    }

    setBusy(true);
    const newRecord: RequestRecord = {
      id: `loan-${Date.now()}`,
      type: 'Advance Salary Loan',
      category: 'loan',
      title: `Loan Request: ₹${Number(loanAmount).toLocaleString()}`,
      details: `Tenor: ${loanTenor} • Purpose: ${loanPurpose.trim()}`,
      amountOrDays: `₹${Number(loanAmount).toLocaleString()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending',
    };

    setCustomRequests((prev) => [newRecord, ...prev]);
    setBusy(false);
    setActiveModal(null);
    setLoanPurpose('');
    Alert.alert('Loan Request Submitted', `Your advance salary request for ₹${Number(loanAmount).toLocaleString()} has been submitted to Finance & HR for review.`);
  };

  // Submit Comp-Off Request
  const handleSubmitCompOff = async () => {
    if (!compOffReason.trim()) {
      Alert.alert('Required', 'Please describe the project/deliverables completed during weekend duty.');
      return;
    }

    setBusy(true);
    const newRecord: RequestRecord = {
      id: `compoff-${Date.now()}`,
      type: 'Compensation Off (Comp-Off)',
      category: 'comp_off',
      title: `Comp-Off Credit (${compOffHours})`,
      details: `Worked on: ${compOffDate} • Work: ${compOffReason.trim()}`,
      amountOrDays: '1 Day Leave Credit',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending',
    };

    setCustomRequests((prev) => [newRecord, ...prev]);
    setBusy(false);
    setActiveModal(null);
    setCompOffReason('');
    Alert.alert('Comp-Off Submitted', 'Your Compensation Off credit request has been submitted to your reporting manager for verification.');
  };

  // Submit Grievance Request
  const handleSubmitGrievance = async () => {
    if (!grievanceDesc.trim()) {
      Alert.alert('Required', 'Please provide confidential details regarding your grievance.');
      return;
    }

    setBusy(true);
    const newRecord: RequestRecord = {
      id: `grv-${Date.now()}`,
      type: 'Confidential Grievance',
      category: 'grievance',
      title: `${grievanceCategory} Concern (${grievanceSeverity})`,
      details: grievanceDesc.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Under Review',
    };

    setCustomRequests((prev) => [newRecord, ...prev]);
    setBusy(false);
    setActiveModal(null);
    setGrievanceDesc('');
    Alert.alert('Grievance Registered', 'Your confidential submission has been encrypted and assigned a tracking ID for HR Grievance Committee review.');
  };

  // Submit Relieve / Exit Request
  const handleSubmitRelieve = async () => {
    if (!handoverRemarks.trim()) {
      Alert.alert('Required', 'Please outline your handover plan or project transition remarks.');
      return;
    }

    setBusy(true);
    const newRecord: RequestRecord = {
      id: `relieve-${Date.now()}`,
      type: 'Relieving & Exit Request',
      category: 'relieve',
      title: `Resignation Notice (${relieveReason})`,
      details: `Proposed LWD: ${proposedLWD} • Handover: ${handoverRemarks.trim()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Under Review',
    };

    setCustomRequests((prev) => [newRecord, ...prev]);
    setBusy(false);
    setActiveModal(null);
    setHandoverRemarks('');
    Alert.alert('Relieving Request Logged', 'Your formal resignation notice and relieving letter request have been submitted to HR.');
  };

  // Build Unified Comprehensive History
  const allHistoryItems: RequestRecord[] = [
    ...customRequests,
    ...leaves.map((l) => ({
      id: l.id,
      type: l.type,
      category: 'leave' as const,
      title: `${l.type} (${l.days})`,
      details: `📅 ${l.startDate} • Reason: ${l.reason || 'N/A'}${l.actedBy ? ` • Acted by: ${l.actedBy}` : ''}`,
      amountOrDays: l.days,
      date: l.startDate || 'Recent',
      status: (l.status as any) || 'Pending',
    })),
    ...docRequests.map((d) => ({
      id: d.id,
      type: 'Official Document',
      category: 'document' as const,
      title: d.letterTitle,
      details: `Requested by ${d.requestedBy} • ${d.employeeAccepted ? 'Signed & Accepted' : 'In Approval Pipeline'}`,
      date: d.requestedAt ? new Date(d.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
      status: (d.status === 'approved' ? (d.employeeAccepted ? 'Resolved' : 'Approved') : d.status === 'rejected' ? 'Rejected' : 'Pending') as any,
    })),
  ];

  const initial = (currentUser?.name || 'User').charAt(0).toUpperCase();

  type MenuItem = {
    key: SideDrawerAction;
    label: string;
    icon: IconName;
    color: string;
    desc: string;
    isComingSoon?: boolean;
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'CORE WORKSPACE',
      items: [
        { key: 'attendance', label: 'Attendance', icon: 'clock', color: '#0284c7', desc: 'Facial punch & timesheets' },
        { key: 'payroll', label: 'Payslip', icon: 'payroll', color: '#10b981', desc: 'Salary breakdown & slips' },
        { key: 'leaves', label: 'Apply Leave', icon: 'calendar', color: '#f59e0b', desc: 'Leave & permission balance' },
        { key: 'documents', label: 'Documents', icon: 'document', color: '#6366f1', desc: 'Letters, KYC & agreements' },
        { key: 'holidays', label: 'Leave Calendar', icon: 'holiday', color: '#ec4899', desc: 'Official & festive holidays' },
      ],
    },
    {
      title: 'REQUESTS & SELF-SERVICE',
      items: [
        { key: 'requests', label: 'Requests', icon: 'task', color: '#059669', desc: 'Advance Loan, Comp-Off & Grievance' },
      ],
    },
  ];

  return (
    <>
      {/* Side Panel Drawer Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onShow={startIncomingAnimation}
        onRequestClose={handleClose}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          {/* Slide Drawer Content (Left Side with Slow Incoming Slide Animation) */}
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Drawer Header with Employee Profile Info */}
            <View style={[styles.drawerHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.cardBorder }]}>
              <View style={styles.profileRow}>
                <View style={[styles.avatarRing, { borderColor: theme.primary, backgroundColor: theme.tealSoft }]}>
                  {currentUser?.photoDataUrl ? (
                    <Image source={{ uri: currentUser.photoDataUrl }} style={styles.avatarImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                      <Text style={styles.avatarLetter}>{initial}</Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.profileName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {currentUser?.name || 'Employee'}
                  </Text>
                  <Text style={[styles.profileRole, { color: theme.primary }]} numberOfLines={1}>
                    {currentUser?.designation || 'Software Engineer'}
                  </Text>
                  <Text style={[styles.profileMeta, { color: theme.textMuted }]}>
                    ID: {currentUser?.empCode || 'SW001'} • {currentUser?.department || 'Engineering'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                  <Icon name="cross" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.companyBadge, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Icon name="shield" size={14} color={theme.primary} />
                <Text style={[styles.companyBadgeText, { color: theme.textPrimary }]} numberOfLines={1}>
                  {currentUser?.companyName || companyConfig?.companyName || 'SWIFT HRMS Enterprise'}
                </Text>
              </View>
            </View>

            {/* Menu Options ScrollView */}
            <ScrollView style={styles.drawerBody} contentContainerStyle={styles.drawerBodyContent} showsVerticalScrollIndicator={false}>
              {menuSections.map((sec, secIdx) => (
                <View key={sec.title} style={[styles.menuSection, secIdx > 0 && { marginTop: 16 }]}>
                  <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>{sec.title}</Text>
                  {sec.items.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.menuItem, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                      onPress={() => handleSelectDrawerItem(item.key, item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBg, { backgroundColor: item.color + '18' }]}>
                        <Icon name={item.icon} size={18} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>{item.label}</Text>
                          {item.isComingSoon && (
                            <View style={[styles.comingSoonBadge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
                              <Text style={[styles.comingSoonBadgeText, { color: '#f59e0b' }]}>COMING SOON</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.menuItemDesc, { color: theme.textMuted }]}>{item.desc}</Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={item.isComingSoon ? theme.textMuted + '60' : theme.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {/* Bottom Quick Controls: Theme & Sign Out */}
              <View style={[styles.footerControls, { borderColor: theme.cardBorder }]}>
                <TouchableOpacity style={[styles.themeToggleBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]} onPress={onToggleTheme}>
                  <Icon name={theme.isDark ? 'sun' : 'moon'} size={16} color={theme.textPrimary} />
                  <Text style={[styles.footerBtnText, { color: theme.textPrimary }]}>
                    {theme.isDark ? 'Light Theme' : 'Dark Theme'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: '#ef4444' + '15', borderColor: '#ef4444' + '40' }]} onPress={onLogout}>
                  <Icon name="logout" size={16} color="#ef4444" />
                  <Text style={[styles.footerBtnText, { color: '#ef4444', fontWeight: '800' }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>

          {/* Backdrop Tap to Close (Right Side) */}
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
      </Modal>

      {/* 1. Advance Loan Request Modal */}
      <Modal visible={activeModal === 'advance_loan'} transparent animationType="fade">
        <View style={styles.formModalOverlay}>
          <View style={[styles.formModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.formModalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#10b98120' }]}>
                <Icon name="wallet" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Apply Advance Salary Loan</Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textMuted }]}>
                  Max Eligible: ₹{((currentUser?.basic || 30000) * 2).toLocaleString()} (2x Basic)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Requested Loan Amount (₹):</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
              placeholder="e.g. 25000"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Repayment Tenor:</Text>
            <View style={styles.chipsRow}>
              {['1 Month', '3 Months (EMI)', '6 Months (EMI)'].map((tenor) => (
                <TouchableOpacity
                  key={tenor}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    loanTenor === tenor && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setLoanTenor(tenor)}
                >
                  <Text style={[styles.choiceChipText, { color: theme.textPrimary }, loanTenor === tenor && { color: '#fff', fontWeight: '800' }]}>
                    {tenor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Purpose of Advance / Loan:</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 75 }]}
              value={loanPurpose}
              onChangeText={setLoanPurpose}
              multiline
              placeholder="e.g. Medical emergency or family expenses..."
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.formCancelBtn, { borderColor: theme.cardBorder }]} onPress={() => setActiveModal(null)}>
                <Text style={[styles.formCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#10b981' }]} onPress={handleSubmitLoan} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSubmitText}>Submit Loan Application →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Compensation Off Request Modal */}
      <Modal visible={activeModal === 'comp_off'} transparent animationType="fade">
        <View style={styles.formModalOverlay}>
          <View style={[styles.formModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.formModalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#f59e0b20' }]}>
                <Icon name="coffee" size={22} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Compensation Off Request</Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textMuted }]}>
                  Claim compensatory leave for working on off-days
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Weekend / Holiday Date Worked:</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={compOffDate}
              onChangeText={setCompOffDate}
              placeholder="e.g. Aug 15, 2026 (Holiday)"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Duration Claimed:</Text>
            <View style={styles.chipsRow}>
              {['Full Day (8 Hrs)', 'Half Day (4 Hrs)'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    compOffHours === slot && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                  ]}
                  onPress={() => setCompOffHours(slot)}
                >
                  <Text style={[styles.choiceChipText, { color: theme.textPrimary }, compOffHours === slot && { color: '#fff', fontWeight: '800' }]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Project Tasks & Reason for Overtime:</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 75 }]}
              value={compOffReason}
              onChangeText={setCompOffReason}
              multiline
              placeholder="e.g. Critical cloud deployment support with manager sign-off..."
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.formCancelBtn, { borderColor: theme.cardBorder }]} onPress={() => setActiveModal(null)}>
                <Text style={[styles.formCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#f59e0b' }]} onPress={handleSubmitCompOff} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSubmitText}>Claim Comp-Off Credit →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Grievance Request Modal */}
      <Modal visible={activeModal === 'grievance'} transparent animationType="fade">
        <View style={styles.formModalOverlay}>
          <View style={[styles.formModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.formModalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#ef444420' }]}>
                <Icon name="alert-circle" size={22} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Confidential Grievance</Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textMuted }]}>
                  Direct & encrypted submission to HR Redressal Committee
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Grievance Category:</Text>
            <View style={styles.chipsRow}>
              {(['Workplace', 'Compensation', 'Shift', 'POSH / Ethics'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    grievanceCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setGrievanceCategory(cat)}
                >
                  <Text style={[styles.choiceChipText, { color: theme.textPrimary }, grievanceCategory === cat && { color: '#fff', fontWeight: '800' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Urgency Level:</Text>
            <View style={styles.chipsRow}>
              {(['Normal', 'Urgent', 'High Priority'] as const).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    grievanceSeverity === lvl && { backgroundColor: lvl === 'High Priority' ? '#ef4444' : theme.primary, borderColor: lvl === 'High Priority' ? '#ef4444' : theme.primary },
                  ]}
                  onPress={() => setGrievanceSeverity(lvl)}
                >
                  <Text style={[styles.choiceChipText, { color: theme.textPrimary }, grievanceSeverity === lvl && { color: '#fff', fontWeight: '800' }]}>
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Detailed Incident / Grievance Description:</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 85 }]}
              value={grievanceDesc}
              onChangeText={setGrievanceDesc}
              multiline
              placeholder="State the details, dates, individuals involved, and expected resolution..."
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.formCancelBtn, { borderColor: theme.cardBorder }]} onPress={() => setActiveModal(null)}>
                <Text style={[styles.formCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#ef4444' }]} onPress={handleSubmitGrievance} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSubmitText}>Submit Encrypted Grievance 🔒</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Relieve Request Modal */}
      <Modal visible={activeModal === 'relieve'} transparent animationType="fade">
        <View style={styles.formModalOverlay}>
          <View style={[styles.formModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.formModalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#e11d4820' }]}>
                <Icon name="logout" size={22} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Relieve & Exit Request</Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textMuted }]}>
                  Formal resignation notice and relieving letter processing
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Primary Reason for Resignation:</Text>
            <View style={styles.chipsRow}>
              {(['Career Growth', 'Higher Studies', 'Relocation', 'Personal Reasons'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                    relieveReason === r && { backgroundColor: '#e11d48', borderColor: '#e11d48' },
                  ]}
                  onPress={() => setRelieveReason(r)}
                >
                  <Text style={[styles.choiceChipText, { color: theme.textPrimary }, relieveReason === r && { color: '#fff', fontWeight: '800' }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Proposed Last Working Day (LWD):</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
              value={proposedLWD}
              onChangeText={setProposedLWD}
              placeholder="e.g. Sep 30, 2026 (30 Days Standard)"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Handover & Transition Plan Remarks:</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 75 }]}
              value={handoverRemarks}
              onChangeText={setHandoverRemarks}
              multiline
              placeholder="Summary of active projects, assigned assets, and handover peer..."
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={[styles.formCancelBtn, { borderColor: theme.cardBorder }]} onPress={() => setActiveModal(null)}>
                <Text style={[styles.formCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitBtn, { backgroundColor: '#e11d48' }]} onPress={handleSubmitRelieve} disabled={busy}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSubmitText}>Submit Relieve Request →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Comprehensive Requests History Modal */}
      <Modal visible={activeModal === 'history'} transparent animationType="fade">
        <View style={styles.formModalOverlay}>
          <View style={[styles.historyModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.formModalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#8b5cf620' }]}>
                <Icon name="history" size={22} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>Comprehensive Request History</Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textMuted }]}>
                  All self-service requests and approval logs ({allHistoryItems.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {allHistoryItems.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>No request history available.</Text>
                </View>
              ) : (
                allHistoryItems.map((item) => {
                  const badgeColor =
                    item.status === 'Approved' || item.status === 'Resolved'
                      ? '#10b981'
                      : item.status === 'Rejected'
                      ? '#ef4444'
                      : '#f59e0b';
                  return (
                    <View key={item.id} style={[styles.historyRowCard, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                      <View style={styles.historyRowTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyRowType, { color: theme.textPrimary }]}>{item.title}</Text>
                          <Text style={[styles.historyRowCategory, { color: theme.primary }]}>{item.type}</Text>
                        </View>
                        <View style={[styles.historyStatusBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                          <Text style={[styles.historyStatusText, { color: badgeColor }]}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={[styles.historyRowDetails, { color: theme.textMuted }]}>{item.details}</Text>
                      <Text style={[styles.historyRowDate, { color: theme.textMuted }]}>📅 {item.date}</Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.historyCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setActiveModal(null)}>
              <Text style={styles.historyCloseBtnText}>Close History View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: Math.min(340, SCREEN_WIDTH * 0.85),
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  profileMeta: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  menuSection: {
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  comingSoonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  comingSoonBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  menuItemDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  footerControls: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  historyModalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
  },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  formModalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  formInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  choiceChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  historyRowCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  historyRowType: {
    fontSize: 13,
    fontWeight: '800',
  },
  historyRowCategory: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyRowDetails: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  historyRowDate: {
    fontSize: 10,
    marginTop: 4,
  },
  historyCloseBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  historyCloseBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
