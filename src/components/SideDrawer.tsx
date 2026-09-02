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
  Switch,
} from 'react-native';
import { ThemeColors, getPaletteById, COLOR_PALETTES } from '../theme/colors';
import { Icon, IconName } from './Icon';
import { ThemePaletteModal } from './ThemePaletteModal';
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
  onClose: () => void;
  theme: ThemeColors;
  onNavigate: (screen: any) => void;
  onToggleTheme: () => void;
  selectedPaletteId?: string;
  onSelectPalette?: (paletteId: string) => void;
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
  onClose,
  theme,
  onNavigate,
  onToggleTheme,
  selectedPaletteId = 'default',
  onSelectPalette,
  onLogout,
}: SideDrawerProps) {
  const { currentUser, companyConfig, leaves, docRequests, attendance, applyLeave, refreshData } = useAppContext();
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const darkBgColor = getPaletteById(selectedPaletteId).hexes[0];

  // Dropdown states
  const [isMessagesOpen, setIsMessagesOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(true);

  // Animation states for snappy, smooth incoming slide
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;


  const startIncomingAnimation = () => {
    slideAnim.setValue(-DRAWER_WIDTH);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
      requestAnimationFrame(() => {
        startIncomingAnimation();
      });
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
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
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
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
        { key: 'attendance', label: 'Attendance', icon: 'clock', color: theme.primary, desc: 'Facial punch & timesheets' },
        { key: 'payroll', label: 'Payslip', icon: 'payroll', color: theme.success, desc: 'Salary breakdown & slips' },
        { key: 'leaves', label: 'Apply Leave', icon: 'calendar', color: theme.warning, desc: 'Leave & permission balance' },
        { key: 'documents', label: 'Documents', icon: 'document', color: theme.primaryLight, desc: 'Letters, KYC & agreements' },
        { key: 'holidays', label: 'Leave Calendar', icon: 'holiday', color: theme.accent, desc: 'Official & festive holidays' },
      ],
    },
    {
      title: 'REQUESTS & SELF-SERVICE',
      items: [
        { key: 'requests', label: 'Requests', icon: 'task', color: theme.accent, desc: 'Advance Loan, Comp-Off & Grievance' },
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
                backgroundColor: darkBgColor,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Drawer Top Header matching reference */}
            <View style={[styles.drawerHeader, { backgroundColor: darkBgColor, borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.mainMenuTitle}>Main Menu</Text>
                <TouchableOpacity style={styles.circularCloseBtn} onPress={handleClose} activeOpacity={0.75}>
                  <Icon name="cross" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Body */}
            <ScrollView style={styles.drawerBody} contentContainerStyle={styles.drawerBodyContent} showsVerticalScrollIndicator={false}>
              {/* Top Notification / Profile Status Card */}
              <TouchableOpacity
                style={styles.topStatusCard}
                onPress={() => {
                  onClose();
                  onNavigate('profile');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.whiteCircleBadge}>
                  {currentUser?.photoDataUrl ? (
                    <Image source={{ uri: currentUser.photoDataUrl }} style={styles.avatarPhoto} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.avatarInitialText, { color: darkBgColor }]}>{initial}</Text>
                  )}
                  <View style={styles.badgePulseDot} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.topStatusTitle} numberOfLines={1}>
                    {currentUser?.name || 'Employee Profile'}
                  </Text>
                  <Text style={styles.topStatusSub} numberOfLines={1}>
                    {currentUser?.designation || 'Verified Employee'} • {currentUser?.empCode || 'SW001'}
                  </Text>
                </View>

                <Icon name="chevron-right" size={18} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>

              {/* 2x2 Core Action Grid */}
              <View style={styles.gridContainer}>
                {/* Row 1: Attendance & Payslip */}
                <View style={styles.gridRow}>
                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => handleSelectDrawerItem('attendance')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.gridIconCircle}>
                      <Icon name="clock" size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.gridCardText}>Attendance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => handleSelectDrawerItem('payroll')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.gridIconCircle}>
                      <Icon name="payroll" size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.gridCardText}>Payslips</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Apply Leave & Documents */}
                <View style={styles.gridRow}>
                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => handleSelectDrawerItem('leaves')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.gridIconCircle}>
                      <Icon name="calendar" size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.gridCardText}>Apply Leave</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => handleSelectDrawerItem('documents')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.gridIconCircle}>
                      <Icon name="document" size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.gridCardText}>Documents</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Section 1: Messages & Requests Dropdown */}
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setIsMessagesOpen(!isMessagesOpen)}
                activeOpacity={0.7}
              >
                <Text style={styles.listSectionHeading}>Messages &amp; Requests</Text>
                <Icon
                  name={isMessagesOpen ? 'chevron-down' : 'chevron-right'}
                  size={18}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </TouchableOpacity>

              {isMessagesOpen && (
                <View style={styles.dropdownBody}>
                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      onNavigate('notifications');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="bell" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>Notifications &amp; Inbox</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      onNavigate('chat');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="bot" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>AI HR Assistant</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      onNavigate('requests');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="task" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>Advance Loan &amp; Requests</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      onNavigate('holidays');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="holiday" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>Official Holidays Calendar</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      setTimeout(() => setActiveModal('relieve'), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="document" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>Relieving &amp; Resignation</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Section 2: Account and Security Dropdown */}
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setIsAccountOpen(!isAccountOpen)}
                activeOpacity={0.7}
              >
                <Text style={styles.listSectionHeading}>Account and Security</Text>
                <Icon
                  name={isAccountOpen ? 'chevron-down' : 'chevron-right'}
                  size={18}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </TouchableOpacity>

              {isAccountOpen && (
                <View style={styles.dropdownBody}>
                  <TouchableOpacity
                    style={styles.listRowItem}
                    onPress={() => {
                      onClose();
                      onNavigate('profile');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="user" size={20} color="#ffffff" />
                    <Text style={styles.listRowText}>Update Account Data</Text>
                    <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Standalone Theme & Dark Mode Settings (Outside Account and Security) */}
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.listRowItem}
                  onPress={() => setShowPaletteModal(true)}
                  activeOpacity={0.7}
                >
                  <Icon name="sparkles" size={20} color="#ffffff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listRowText}>Color Theme Palette</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                    {getPaletteById(selectedPaletteId).hexes.map((hex, i) => (
                      <View key={i} style={{ width: 8, height: 12, borderRadius: 2, backgroundColor: hex }} />
                    ))}
                  </View>
                </TouchableOpacity>

                <View style={styles.listRowItem}>
                  <Icon name={theme.isDark ? 'moon' : 'sun'} size={20} color="#ffffff" />
                  <Text style={styles.listRowText}>Dark Mode</Text>
                  <Switch
                    value={theme.isDark}
                    onValueChange={onToggleTheme}
                    trackColor={{ false: 'rgba(255, 255, 255, 0.25)', true: '#22c55e' }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="rgba(255, 255, 255, 0.25)"
                  />
                </View>
              </View>

              {/* Solid Red Flat Sign Out Action Button */}
              <TouchableOpacity
                style={styles.signOutRedBtn}
                onPress={onLogout}
                activeOpacity={0.85}
              >
                <Icon name="logout" size={18} color="#ffffff" />
                <Text style={styles.signOutRedBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>






          {/* Backdrop Tap to Close (Right Side) */}
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
      </Modal>

      {/* Theme Palette Modal for SideDrawer */}
      <ThemePaletteModal
        visible={showPaletteModal}
        theme={theme}
        selectedPaletteId={selectedPaletteId}
        onSelectPalette={(id) => {
          if (onSelectPalette) onSelectPalette(id);
        }}
        onClose={() => setShowPaletteModal(false)}
      />

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
    width: Math.min(360, SCREEN_WIDTH * 0.88),
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 24,
  },
  drawerHeader: {
    paddingTop: 48,
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainMenuTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  circularCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 48,
  },
  topStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: 12,
    paddingRight: 16,
    marginBottom: 18,
  },
  whiteCircleBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarInitialText: {
    fontSize: 22,
    fontWeight: '800',
  },
  badgePulseDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 10,
  },
  topStatusTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topStatusSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  gridContainer: {
    gap: 12,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 14,
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    backgroundColor: 'transparent',
    flex: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
    paddingVertical: 6,
  },
  dropdownBody: {
    marginBottom: 4,
  },
  listSectionHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  listRowText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '600',
    flex: 1,
    backgroundColor: 'transparent',
  },
  themePillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  themePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutRedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 24,
    marginBottom: 12,
  },
  signOutRedBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
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
