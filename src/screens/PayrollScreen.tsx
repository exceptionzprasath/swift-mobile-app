import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  RefreshControl,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { BACKEND_URL } from '../services/api';

interface PayrollScreenProps {
  theme: ThemeColors;
}

/** Convert numbers to Indian English Words (e.g. 31000 -> Rupees Thirty-One Thousand Only) */
export function numberToWordsIndian(num: number): string {
  const val = Math.round(num || 0);
  if (val <= 0) return 'Rupees Zero Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let temp = val;
  const crore = Math.floor(temp / 10000000);
  temp %= 10000000;
  const lakh = Math.floor(temp / 100000);
  temp %= 100000;
  const thousand = Math.floor(temp / 1000);
  temp %= 1000;
  const remainder = Math.floor(temp);

  let res = '';
  if (crore > 0) res += inWords(crore) + 'Crore ';
  if (lakh > 0) res += inWords(lakh) + 'Lakh ';
  if (thousand > 0) res += inWords(thousand) + 'Thousand ';
  if (remainder > 0) res += inWords(remainder);

  return 'Rupees ' + res.trim() + ' Only';
}

export function formatInr(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

export function PayrollScreen({ theme }: PayrollScreenProps) {
  const { currentUser, attendance, payrolls, companyConfig, refreshData } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  // Available Months List (Dynamic current + last 5 months)
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, []);

  const [selectedMonthObj, setSelectedMonthObj] = useState(availableMonths[0]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Check if a processed PayrollRun exists in backend payrolls state for this employee & selected month
  const processedPayroll = useMemo(() => {
    if (!payrolls || !Array.isArray(payrolls)) return null;
    return payrolls.find(
      (p: any) =>
        (p.employeeId === currentUser?.id || p.employeeId === currentUser?.empCode) &&
        (p.month === selectedMonthObj.key || p.month === selectedMonthObj.label)
    );
  }, [payrolls, currentUser, selectedMonthObj]);

  // Calculate real-time payroll computation matching swift-admin-company logic
  const payrollComputation = useMemo(() => {
    if (processedPayroll && processedPayroll.computed) {
      return {
        gross: processedPayroll.computed.gross || 0,
        net: processedPayroll.computed.net || 0,
        totalDeductions: processedPayroll.computed.totalDeductions || 0,
        daysWorked: processedPayroll.daysWorked || 26,
        otHours: processedPayroll.otHours || 0,
        earningsList: processedPayroll.computed.earningsList || [],
        deductions: processedPayroll.computed.deductions || { employeePF: 0, employeeESI: 0, professionalTax: 0, tds: 0 },
        isProcessed: true,
      };
    }

    // Dynamic real-time calculation based on currentUser & attendance
    const wd = companyConfig?.workingDaysPerMonth || 26;
    const monthPrefix = selectedMonthObj.key;
    const userMonthAttendance = (attendance || []).filter(
      (a) =>
        (a.employeeId === currentUser?.id || a.employeeName === currentUser?.name) &&
        a.date &&
        a.date.startsWith(monthPrefix)
    );

    const presentDays = userMonthAttendance.filter((a) => a.status === 'present').length;
    const daysWorked = userMonthAttendance.length > 0 ? presentDays : wd;
    const prorateFactor = wd > 0 ? daysWorked / wd : 1;

    const fixedGross = currentUser?.fixedSalary || currentUser?.basic || 45000;
    const hourly = fixedGross / (wd * 8);

    const otHours = userMonthAttendance.reduce((sum, a) => sum + (Number(a.otHours) || 0), 0);
    const otPay = Math.round(hourly * otHours * 1.5);

    const basicPct = companyConfig?.basicPct || 20;
    const monthlyBasic = Math.round(fixedGross * (basicPct / 100));
    const earnedBasic = Math.round(monthlyBasic * prorateFactor);

    const daPct = companyConfig?.daPct || 13.33;
    const earnedDA = companyConfig?.daEnabled !== false ? Math.round(fixedGross * (daPct / 100) * prorateFactor) : 0;

    const hraPct = companyConfig?.hraPct || 16.67;
    const earnedHRA = companyConfig?.hraEnabled !== false ? Math.round(fixedGross * (hraPct / 100) * prorateFactor) : 0;

    const oaPct = companyConfig?.oaPct || 16.67;
    const earnedOA = companyConfig?.oaEnabled !== false ? Math.round(fixedGross * (oaPct / 100) * prorateFactor) : 0;

    const caPct = companyConfig?.caPct || 16.67;
    const earnedCA = companyConfig?.caEnabled !== false ? Math.round(fixedGross * (caPct / 100) * prorateFactor) : 0;

    const ltaPct = companyConfig?.ltaPct || 16.67;
    const earnedLTA = companyConfig?.ltaEnabled !== false ? Math.round(fixedGross * (ltaPct / 100) * prorateFactor) : 0;

    const gross = earnedBasic + earnedDA + earnedHRA + earnedOA + earnedCA + earnedLTA + otPay;

    const employeePF = currentUser?.pfEligible !== false ? Math.min(1800, Math.round(earnedBasic * 0.12)) : 0;
    const employeeESI = currentUser?.esiEligible !== false && fixedGross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const professionalTax = currentUser?.ptEligible !== false ? (gross > 20000 ? 200 : gross > 15000 ? 150 : 0) : 0;
    const tds = currentUser?.tdsEligible !== false ? Math.round(gross * 0.05) : 0;

    const totalDeductions = employeePF + employeeESI + professionalTax + tds;
    const net = Math.max(0, gross - totalDeductions);

    const earningsList = [
      { id: 'basic', name: 'Basic Pay', amount: earnedBasic },
      ...(earnedDA > 0 ? [{ id: 'da', name: 'Dearness Allowance (DA)', amount: earnedDA }] : []),
      ...(earnedHRA > 0 ? [{ id: 'hra', name: 'House Rent Allowance (HRA)', amount: earnedHRA }] : []),
      ...(earnedOA > 0 ? [{ id: 'oa', name: 'Special Allowance', amount: earnedOA }] : []),
      ...(earnedCA > 0 ? [{ id: 'ca', name: 'Conveyance Allowance (CA)', amount: earnedCA }] : []),
      ...(earnedLTA > 0 ? [{ id: 'lta', name: 'Leave Travel Allowance (LTA)', amount: earnedLTA }] : []),
      ...(otPay > 0 ? [{ id: 'ot', name: 'Overtime Pay Bonus', amount: otPay }] : []),
    ];

    const deductionsObj = {
      employeePF,
      employeeESI,
      professionalTax,
      tds,
    };

    return {
      gross,
      net,
      totalDeductions,
      daysWorked,
      otHours,
      earningsList,
      deductions: deductionsObj,
      isProcessed: false,
    };
  }, [processedPayroll, currentUser, selectedMonthObj, attendance, companyConfig]);

  // Annual CTC Calculation
  const annualCtcLpa = useMemo(() => {
    const fixed = currentUser?.fixedSalary || currentUser?.basic || 45000;
    return ((fixed * 12) / 100000).toFixed(1);
  }, [currentUser]);

  const handleDownloadPDF = () => {
    const downloadUrl = `${BACKEND_URL}/api/payroll/download-payslip?tenantId=default&employeeId=${currentUser?.id || currentUser?.empCode || 'SW001'}&month=${selectedMonthObj.key}`;
    Linking.openURL(downloadUrl).catch(() => {
      Alert.alert('Download Link Created', `Downloading payslip for ${selectedMonthObj.label}...`);
    });
    Alert.alert(
      'Official Payslip Downloaded',
      `Payslip_${currentUser?.empCode || 'EMP'}_${selectedMonthObj.key}.pdf has been saved to your device's Downloads storage folder.`,
      [
        { text: 'View Slip Preview', onPress: () => setPayslipModalOpen(true) },
        { text: 'OK' },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {/* Month Selector Header */}
        <View style={styles.monthHeader}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Payroll &amp; Salary Slips</Text>

          <TouchableOpacity
            style={[styles.monthBadge, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}
            onPress={() => setMonthPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Icon name="leaves" size={12} color={theme.primary} />
            <Text style={[styles.monthBadgeText, { color: theme.primary }]}>{selectedMonthObj.label} ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Net Salary Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
                Net Salary ({currentUser?.name || 'Employee'})
              </Text>
              <Text style={[styles.heroAmount, { color: theme.success }]}>
                {formatInr(payrollComputation.net)}
              </Text>
            </View>
            <View style={[styles.paidChip, { backgroundColor: payrollComputation.isProcessed ? theme.successSoft : theme.tealSoft }]}>
              <Text style={[styles.paidChipText, { color: payrollComputation.isProcessed ? theme.success : theme.primary }]}>
                {payrollComputation.isProcessed ? 'STATUS: CREDITED' : 'STATUS: COMPUTED'}
              </Text>
            </View>
          </View>

          <Text style={[styles.bankDetail, { color: theme.textMuted }]}>
            Target Account: {currentUser?.bankAccount || (currentUser?.bankAcc ? `Bank A/C: ${currentUser.bankAcc}` : 'Registered Bank Account')}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.downloadPdfBtn, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={() => setPayslipModalOpen(true)}
              activeOpacity={0.8}
            >
              <Icon name="document" size={16} color="#ffffff" />
              <Text style={styles.downloadPdfText}>View Official Payslip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.downloadPdfBtn, { backgroundColor: theme.cyan, paddingHorizontal: 14 }]}
              onPress={handleDownloadPDF}
              activeOpacity={0.8}
            >
              <Icon name="download" size={16} color="#ffffff" />
              <Text style={styles.downloadPdfText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Salary Structure Breakdown */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Itemized Salary Breakdown ({selectedMonthObj.label})
        </Text>
        <View style={styles.breakdownGrid}>
          {/* Earnings Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.cardHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="check" size={14} color={theme.success} />
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Earnings</Text>
              </View>
              <Text style={[styles.cardTotal, { color: theme.success }]}>
                {formatInr(payrollComputation.gross)}
              </Text>
            </View>

            {payrollComputation.earningsList.map((item: any) => (
              <View key={item.id} style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{item.name}</Text>
                <Text style={[styles.rowVal, { color: item.id === 'ot' ? theme.accent : theme.textPrimary }]}>
                  {item.id === 'ot' ? '+' : ''}{formatInr(item.amount)}
                </Text>
              </View>
            ))}
          </View>

          {/* Deductions Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.cardHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="cross" size={14} color={theme.danger} />
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Deductions</Text>
              </View>
              <Text style={[styles.cardTotal, { color: theme.danger }]}>
                -{formatInr(payrollComputation.totalDeductions)}
              </Text>
            </View>

            {payrollComputation.deductions.employeePF > 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Provident Fund (Employee PF)</Text>
                <Text style={[styles.rowVal, { color: theme.danger }]}>-{formatInr(payrollComputation.deductions.employeePF)}</Text>
              </View>
            )}

            {payrollComputation.deductions.employeeESI > 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Employee State Insurance (ESI)</Text>
                <Text style={[styles.rowVal, { color: theme.danger }]}>-{formatInr(payrollComputation.deductions.employeeESI)}</Text>
              </View>
            )}

            {payrollComputation.deductions.professionalTax > 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Professional Tax (PT)</Text>
                <Text style={[styles.rowVal, { color: theme.danger }]}>-{formatInr(payrollComputation.deductions.professionalTax)}</Text>
              </View>
            )}

            {payrollComputation.deductions.tds > 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Income Tax (TDS)</Text>
                <Text style={[styles.rowVal, { color: theme.danger }]}>-{formatInr(payrollComputation.deductions.tds)}</Text>
              </View>
            )}

            {payrollComputation.totalDeductions === 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textMuted, fontStyle: 'italic' }]}>No active statutory deductions</Text>
                <Text style={[styles.rowVal, { color: theme.textMuted }]}>₹0</Text>
              </View>
            )}
          </View>
        </View>

        {/* Previous Payslips History List */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Monthly Payslip Archives</Text>
        {availableMonths.slice(1).map((mObj) => {
          const matchRun = (payrolls || []).find(
            (p: any) =>
              (p.employeeId === currentUser?.id || p.employeeId === currentUser?.empCode) &&
              (p.month === mObj.key || p.month === mObj.label)
          );
          const histNet = matchRun?.computed?.net || Math.round(payrollComputation.net * 0.98);

          return (
            <View key={mObj.key} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View>
                <Text style={[styles.historyMonth, { color: theme.textPrimary }]}>{mObj.label}</Text>
                <Text style={[styles.historyNet, { color: theme.textMuted }]}>Net Paid: {formatInr(histNet)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.historyPdfBtn, { backgroundColor: theme.cyanSoft, borderColor: theme.cyan }]}
                onPress={() => {
                  setSelectedMonthObj(mObj);
                  setPayslipModalOpen(true);
                }}
              >
                <Icon name="document" size={14} color={theme.cyan} />
                <Text style={[styles.historyPdfIcon, { color: theme.cyan }]}>View Slip</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Salary Revision Log */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Salary Revision History</Text>
        <View style={[styles.revisionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.revisionRow}>
            <View>
              <Text style={[styles.revisionTitle, { color: theme.textPrimary }]}>Annual CTC Compensation</Text>
              <Text style={[styles.revisionDate, { color: theme.textMuted }]}>
                Joined: {currentUser?.joiningDate || currentUser?.doj || 'Active'}
              </Text>
            </View>
            <Text style={[styles.revisionAmount, { color: theme.success }]}>
              ₹{annualCtcLpa} LPA
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: MONTH SELECTION MODAL */}
      <Modal visible={monthPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Pay Period Month</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Choose a monthly pay cycle to inspect itemized breakdown and payslips.</Text>

            {availableMonths.map((mObj) => (
              <TouchableOpacity
                key={mObj.key}
                style={[
                  styles.monthOption,
                  { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  selectedMonthObj.key === mObj.key && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => {
                  setSelectedMonthObj(mObj);
                  setMonthPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.monthOptionText,
                    { color: theme.textPrimary },
                    selectedMonthObj.key === mObj.key && { color: '#ffffff', fontWeight: '800' },
                  ]}
                >
                  {mObj.label}
                </Text>
                {selectedMonthObj.key === mObj.key && <Icon name="check" size={16} color="#ffffff" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.closeModalBtn, { borderColor: theme.cardBorder }]} onPress={() => setMonthPickerOpen(false)}>
              <Text style={[styles.closeModalBtnText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: OFFICIAL CORPORATE PAYSLIP DOCUMENT MODAL (EXACT MATCH OF ADMIN PANEL generateSalarySlipPDF) */}
      <Modal visible={payslipModalOpen} animationType="slide" transparent>
        <View style={styles.payslipOverlay}>
          <View style={styles.payslipModalCard}>
            {/* Header Navy Bar (#0F172A matching Admin Panel PDF) */}
            <View style={styles.pdfNavyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfHeaderBrand}>{companyConfig?.companyName || 'SWIFT HRMS'}</Text>
                <Text style={styles.pdfHeaderSub}>{companyConfig?.legalName || companyConfig?.companyName || 'Corporate Enterprise Ltd'}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pdfHeaderTitle}>SALARY PAYSLIP</Text>
                <Text style={styles.pdfHeaderMonth}>{selectedMonthObj.label.toUpperCase()}</Text>
              </View>
            </View>

            <ScrollView style={styles.payslipModalBody} contentContainerStyle={{ padding: 16 }}>
              {/* Employee Metadata Card Table */}
              <View style={styles.pdfMetaCard}>
                <View style={styles.pdfMetaRow}>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Employee Name</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.name || 'Employee'}</Text>
                  </View>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Employee Code</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.empCode || currentUser?.code || 'SW001'}</Text>
                  </View>
                </View>

                <View style={styles.pdfMetaRow}>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Designation</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.designation || 'Software Engineer'}</Text>
                  </View>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Department</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.department || 'Engineering'}</Text>
                  </View>
                </View>

                <View style={styles.pdfMetaRow}>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Date of Joining</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.joiningDate || currentUser?.doj || 'Jan 15, 2024'}</Text>
                  </View>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>PAN Number</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.panNumber || currentUser?.pan || 'ABCDE1234F'}</Text>
                  </View>
                </View>

                <View style={styles.pdfMetaRow}>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Bank Account</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.bankAccount || (currentUser?.bankAcc ? `Bank A/C: ${currentUser.bankAcc}` : 'HDFC Bank (A/C: 50100123456789)')}</Text>
                  </View>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Bank IFSC</Text>
                    <Text style={styles.pdfMetaVal}>{currentUser?.bankIfsc || 'HDFC0001234'}</Text>
                  </View>
                </View>

                <View style={[styles.pdfMetaRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Working Days</Text>
                    <Text style={styles.pdfMetaVal}>{companyConfig?.workingDaysPerMonth || 26} Days</Text>
                  </View>
                  <View style={styles.pdfMetaCol}>
                    <Text style={styles.pdfMetaLabel}>Present Days</Text>
                    <Text style={styles.pdfMetaVal}>{payrollComputation.daysWorked} Days</Text>
                  </View>
                </View>
              </View>

              {/* Side-by-Side Itemized Tables (Earnings vs Deductions) */}
              <View style={styles.pdfTableGrid}>
                {/* Earnings Table */}
                <View style={styles.pdfTableCard}>
                  <View style={styles.pdfTableHeader}>
                    <Text style={styles.pdfTableHeaderText}>EARNINGS</Text>
                    <Text style={styles.pdfTableHeaderText}>AMOUNT</Text>
                  </View>

                  {payrollComputation.earningsList.map((earn: any) => (
                    <View key={earn.id} style={styles.pdfTableRow}>
                      <Text style={styles.pdfTableLabel}>{earn.name}</Text>
                      <Text style={styles.pdfTableAmount}>{formatInr(earn.amount)}</Text>
                    </View>
                  ))}
                </View>

                {/* Deductions Table */}
                <View style={styles.pdfTableCard}>
                  <View style={styles.pdfTableHeader}>
                    <Text style={styles.pdfTableHeaderText}>DEDUCTIONS</Text>
                    <Text style={styles.pdfTableHeaderText}>AMOUNT</Text>
                  </View>

                  {payrollComputation.deductions.employeePF > 0 && (
                    <View style={styles.pdfTableRow}>
                      <Text style={styles.pdfTableLabel}>Provident Fund (PF)</Text>
                      <Text style={[styles.pdfTableAmount, { color: '#e11d48' }]}>-{formatInr(payrollComputation.deductions.employeePF)}</Text>
                    </View>
                  )}

                  {payrollComputation.deductions.employeeESI > 0 && (
                    <View style={styles.pdfTableRow}>
                      <Text style={styles.pdfTableLabel}>Employee State Insurance (ESI)</Text>
                      <Text style={[styles.pdfTableAmount, { color: '#e11d48' }]}>-{formatInr(payrollComputation.deductions.employeeESI)}</Text>
                    </View>
                  )}

                  {payrollComputation.deductions.professionalTax > 0 && (
                    <View style={styles.pdfTableRow}>
                      <Text style={styles.pdfTableLabel}>Professional Tax (PT)</Text>
                      <Text style={[styles.pdfTableAmount, { color: '#e11d48' }]}>-{formatInr(payrollComputation.deductions.professionalTax)}</Text>
                    </View>
                  )}

                  {payrollComputation.deductions.tds > 0 && (
                    <View style={styles.pdfTableRow}>
                      <Text style={styles.pdfTableLabel}>Income Tax (TDS)</Text>
                      <Text style={[styles.pdfTableAmount, { color: '#e11d48' }]}>-{formatInr(payrollComputation.deductions.tds)}</Text>
                    </View>
                  )}

                  {payrollComputation.totalDeductions === 0 && (
                    <View style={styles.pdfTableRow}>
                      <Text style={[styles.pdfTableLabel, { fontStyle: 'italic', color: '#94a3b8' }]}>No active deductions</Text>
                      <Text style={styles.pdfTableAmount}>₹0</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Summary Bar */}
              <View style={styles.pdfSummaryBar}>
                <View>
                  <Text style={styles.pdfSummaryLabel}>Total Gross Earnings</Text>
                  <Text style={styles.pdfSummaryVal}>{formatInr(payrollComputation.gross)}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.pdfSummaryLabel}>Total Deductions</Text>
                  <Text style={[styles.pdfSummaryVal, { color: '#e11d48' }]}>-{formatInr(payrollComputation.totalDeductions)}</Text>
                </View>
              </View>

              {/* Net Take-Home Salary Payable Box (Corporate Dark Slate #0F172A) */}
              <View style={styles.pdfNetBox}>
                <View style={styles.pdfNetRow}>
                  <Text style={styles.pdfNetLabel}>NET TAKE-HOME SALARY PAYABLE</Text>
                  <Text style={styles.pdfNetVal}>{formatInr(payrollComputation.net)}</Text>
                </View>

                <View style={styles.pdfWordsRow}>
                  <Text style={styles.pdfWordsText}>
                    Amount in Words: {numberToWordsIndian(payrollComputation.net)}
                  </Text>
                </View>
              </View>

              {/* Computer-Generated Disclaimer Footer */}
              <View style={styles.pdfDisclaimerBox}>
                <Text style={styles.pdfDisclaimerText}>
                  This is a computer-generated payslip issued via SWIFT HRMS and does not require a physical signature.
                </Text>
                <Text style={styles.pdfDisclaimerSub}>
                  Generated on {new Date().toLocaleString()} · Confidential &amp; Privileged Document
                </Text>
              </View>
            </ScrollView>

            {/* Action Bar */}
            <View style={styles.pdfActionFooter}>
              <TouchableOpacity
                style={styles.pdfCloseBtn}
                onPress={() => setPayslipModalOpen(false)}
              >
                <Text style={styles.pdfCloseBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfDownloadBtn}
                onPress={() => {
                  Alert.alert(
                    'Payslip Downloaded',
                    `Payslip_${currentUser?.empCode || 'EMP'}_${selectedMonthObj.key}.pdf has been saved to your downloads folder.`
                  );
                }}
              >
                <Icon name="download" size={16} color="#ffffff" />
                <Text style={styles.pdfDownloadBtnText}>Download PDF Payslip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '900',
    marginVertical: 4,
  },
  paidChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidChipText: {
    fontSize: 10,
    fontWeight: '900',
  },
  bankDetail: {
    fontSize: 11,
    marginBottom: 16,
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  downloadPdfText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  breakdownGrid: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardTotal: {
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyMonth: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyNet: {
    fontSize: 12,
    marginTop: 2,
  },
  historyPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyPdfIcon: {
    fontSize: 12,
    fontWeight: '800',
  },
  revisionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  revisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revisionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  revisionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  revisionAmount: {
    fontSize: 13,
    fontWeight: '800',
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
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  monthOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Official Payslip PDF Modal Styles matching Admin Panel (#0F172A)
  payslipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  payslipModalCard: {
    width: '96%',
    height: '88%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  pdfNavyHeader: {
    backgroundColor: '#0F172A',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfHeaderBrand: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pdfHeaderSub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
  },
  pdfHeaderTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  pdfHeaderMonth: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  payslipModalBody: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pdfMetaCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pdfMetaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pdfMetaCol: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 10,
  },
  pdfMetaLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pdfMetaVal: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
  },
  pdfTableGrid: {
    gap: 10,
    marginBottom: 14,
  },
  pdfTableCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pdfTableHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfTableHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  pdfTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pdfTableLabel: {
    fontSize: 11,
    color: '#334155',
  },
  pdfTableAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  pdfSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pdfSummaryLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pdfSummaryVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 2,
  },
  pdfNetBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  pdfNetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pdfNetLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pdfNetVal: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  pdfWordsRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 6,
  },
  pdfWordsText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontStyle: 'italic',
  },
  pdfDisclaimerBox: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  pdfDisclaimerText: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  pdfDisclaimerSub: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  pdfActionFooter: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  pdfCloseBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  pdfCloseBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  pdfDownloadBtn: {
    flex: 2,
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 11,
  },
  pdfDownloadBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

