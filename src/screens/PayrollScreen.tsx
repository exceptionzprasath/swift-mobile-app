import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { BACKEND_URL, uploadFile } from '../services/api';
import { generatePayslipHtml, utf8ToBase64 } from '../services/pdfService';

interface PayrollScreenProps {
  theme: ThemeColors;
}

export function isMatchEmployee(p: any, user: any, empList: any[] = []): boolean {
  if (!p || !user) return false;
  const pEmpId = String(p.employeeId || '').trim().toLowerCase();
  const pCode = String(p.empCode || '').trim().toLowerCase();
  const pName = String(p.employeeName || '').trim().toLowerCase();

  const uId = String(user.id || '').trim().toLowerCase();
  const uCode = String(user.empCode || user.code || '').trim().toLowerCase();
  const uName = String(user.name || '').trim().toLowerCase();

  if (pEmpId && (pEmpId === uId || pEmpId === uCode)) return true;
  if (pCode && (pCode === uCode || pCode === uId)) return true;
  if (pName && uName && pName === uName) return true;

  if (Array.isArray(empList) && pEmpId) {
    const matchedFromList = empList.find(
      (e) =>
        String(e.id || '').toLowerCase() === pEmpId ||
        String(e.empCode || e.code || '').toLowerCase() === pEmpId
    );
    if (matchedFromList) {
      const mId = String(matchedFromList.id || '').toLowerCase();
      const mCode = String(matchedFromList.empCode || matchedFromList.code || '').toLowerCase();
      const mName = String(matchedFromList.name || '').toLowerCase();
      if (mId === uId || mCode === uCode || (mName && mName === uName)) {
        return true;
      }
    }
  }

  return false;
}

export function matchMonth(prMonth: string, targetKey: string, targetLabel: string): boolean {
  if (!prMonth) return false;
  if (prMonth === targetKey || prMonth === targetLabel) return true;
  const normPr = prMonth.replace('-0', '-');
  const normKey = targetKey.replace('-0', '-');
  return normPr === normKey;
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
  return (rounded || 0).toLocaleString('en-IN');
}

export function PayrollScreen({ theme }: PayrollScreenProps) {
  const { currentUser, employees, attendance, payrolls, companyConfig, requests, holidays, docLibrary, refreshData } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<'earnings' | 'deductions'>('earnings');
  const [segmentedWidth, setSegmentedWidth] = useState(0);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-fetch the latest state on mount so any admin edits reflect immediately
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSwitchTab = (tab: 'earnings' | 'deductions') => {
    if (tab === breakdownTab) return;
    Animated.spring(tabSlideAnim, {
      toValue: tab === 'earnings' ? 0 : 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
    }).start();

    Animated.sequence([
      Animated.timing(tabFadeAnim, {
        toValue: 0.2,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setBreakdownTab(tab);
  };

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
        isMatchEmployee(p, currentUser, employees) &&
        matchMonth(p.month, selectedMonthObj.key, selectedMonthObj.label)
    );
  }, [payrolls, currentUser, employees, selectedMonthObj]);

  // Calculate real-time payroll computation matching swift-admin-company logic with dynamic Loan EMI & deductions
  const payrollComputation = useMemo(() => {
    if (processedPayroll && processedPayroll.computed) {
      const comp = processedPayroll.computed;
      const rawDed = comp.deductions || {};
      const loanEmi = Number(rawDed.loan || rawDed.loanEmi || processedPayroll.loan || 0);
      const advance = Number(rawDed.advance || processedPayroll.advance || 0);
      const lwf = Number(rawDed.lwf || 0);
      const employeePF = Number(rawDed.employeePF || 0);
      const employeeESI = Number(rawDed.employeeESI || 0);
      const professionalTax = Number(rawDed.professionalTax || 0);
      const tds = Number(rawDed.tds || 0);
      const extraDeductions: { id: string; name: string; amount: number }[] = Array.isArray(comp.extraDeductions)
        ? comp.extraDeductions.filter((x: any) => Number(x?.amount) > 0)
        : [];

      return {
        gross: Number(comp.gross || 0),
        net: Number(comp.net || 0),
        totalDeductions: Number(comp.totalDeductions || 0),
        daysWorked: processedPayroll.daysWorked ?? 26,
        otHours: processedPayroll.otHours || 0,
        earningsList: Array.isArray(comp.earningsList) && comp.earningsList.length > 0 ? comp.earningsList : [
          { id: 'basic', name: 'Basic Pay', amount: Number(comp.gross || 0) }
        ],
        deductions: {
          employeePF,
          employeeESI,
          professionalTax,
          tds,
          loanEmi,
          advance,
          lwf,
        },
        extraDeductions,
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
    const halfDays = userMonthAttendance.filter((a) => a.status === 'halfday' || (a.status as string) === 'half-day').length;
    const leaveDays = userMonthAttendance.filter((a) => (a.status as string) === 'leave').length;
    const daysWorked = presentDays + halfDays * 0.5 + leaveDays;
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

    // Detect approved active Advance Loans for this employee in selected month
    const activeLoanRequests = (requests || []).filter((r) => {
      if (r.category !== 'loan' && r.category !== 'advance_loan') return false;
      const matchesEmp =
        r.employeeId === currentUser?.id ||
        (currentUser?.empCode && r.empCode === currentUser.empCode) ||
        r.employeeName === currentUser?.name;
      if (!matchesEmp) return false;
      const isApproved = r.status === 'Approved' || r.status === 'Disbursed';
      if (!isApproved) return false;

      const startMonth = r.metadata?.startMonth || (r.date ? r.date.slice(0, 7) : (r.createdAt ? r.createdAt.slice(0, 7) : ''));
      const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes('1') ? 1 : r.tenor?.includes('2') ? 2 : r.tenor?.includes('3') ? 3 : r.tenor?.includes('6') ? 6 : 1);
      if (!startMonth) return true;

      const [sYear, sMonth] = startMonth.split('-').map(Number);
      const [curYear, curMonth] = selectedMonthObj.key.split('-').map(Number);
      const startTotalMonths = sYear * 12 + sMonth;
      const curTotalMonths = curYear * 12 + curMonth;
      const endTotalMonths = startTotalMonths + tenorMonths - 1;

      return curTotalMonths >= startTotalMonths && curTotalMonths <= endTotalMonths;
    });

    const loanEmiDeduction = activeLoanRequests.reduce((sum, r) => {
      const tenorMonths = r.metadata?.tenorMonths || (r.tenor?.includes('1') ? 1 : r.tenor?.includes('2') ? 2 : r.tenor?.includes('3') ? 3 : r.tenor?.includes('6') ? 6 : 1);
      const emi = r.metadata?.monthlyEmi || Math.round((Number(r.amount) || 0) / tenorMonths);
      return sum + emi;
    }, 0);

    const totalDeductions = employeePF + employeeESI + professionalTax + tds + loanEmiDeduction;
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
      loanEmi: loanEmiDeduction,
      advance: 0,
      lwf: 0,
    };

    return {
      gross,
      net,
      totalDeductions,
      daysWorked,
      otHours,
      earningsList,
      deductions: deductionsObj,
      extraDeductions: [],
      isProcessed: false,
    };
  }, [processedPayroll, currentUser, selectedMonthObj, attendance, companyConfig, requests]);

  // Helper to normalize relative or absolute media URLs
  const normalizeMediaUrl = (url: string | undefined | null): string | null => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return `${BACKEND_URL}${trimmed}`;
    }
    return `${BACKEND_URL}/${trimmed}`;
  };

  // Dynamic Logo / Letterhead / Company Palette matching Swift Admin PayslipTemplateView
  const docAssets = companyConfig?.docAssets || companyConfig?.documentAssets || companyConfig?.branding || {};

  // Resolve letterhead ONLY from companyConfig / docAssets (NOT from general docLibrary)
  const rawLetterhead =
    docAssets?.letterheadDataUrl ||
    docAssets?.letterheadUrl ||
    companyConfig?.letterheadDataUrl ||
    companyConfig?.letterheadUrl ||
    companyConfig?.letterheadHeader ||
    companyConfig?.letterhead ||
    companyConfig?.headerImage ||
    companyConfig?.headerUrl ||
    companyConfig?.companyLetterhead;

  const letterheadUrl = normalizeMediaUrl(rawLetterhead);

  const rawFooter =
    docAssets?.footerDataUrl ||
    docAssets?.footerUrl ||
    companyConfig?.footerDataUrl ||
    companyConfig?.footerUrl ||
    companyConfig?.letterheadFooter ||
    companyConfig?.footer ||
    companyConfig?.footerImage;

  const footerUrl = normalizeMediaUrl(rawFooter);

  // Extract dynamic colors matching uploaded company branding or high-end default Slate/Navy
  const palette = useMemo(() => {
    if (companyConfig?.palette?.primaryHex) {
      return {
        primaryHex: companyConfig.palette.primaryHex,
        primaryDarkHex: companyConfig.palette.primaryDarkHex || companyConfig.palette.primaryHex,
        accentHex: companyConfig.palette.accentHex || '#38bdf8',
      };
    }
    const customPrimary =
      companyConfig?.payslipThemeColor ||
      companyConfig?.themeColor ||
      companyConfig?.primaryColor ||
      companyConfig?.brandColor;

    if (customPrimary && typeof customPrimary === 'string' && customPrimary.startsWith('#')) {
      return {
        primaryHex: customPrimary,
        primaryDarkHex: companyConfig?.primaryDarkHex || customPrimary,
        accentHex: companyConfig?.accentHex || companyConfig?.accentColor || '#38bdf8',
      };
    }

    // Default elegant corporate Slate/Navy palette
    return {
      primaryHex: '#0f172a',
      primaryDarkHex: '#020617',
      accentHex: '#0284c7',
    };
  }, [companyConfig]);

  // Month date calculation
  const [yearStr, monthStr] = selectedMonthObj.key.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const formattedMonthDateStr = `01-${monthStr.padStart(2, '0')}-${yearNum}`;
  const formattedMonthNameStr = selectedMonthObj.label.toUpperCase();

  const workingDaysCount = companyConfig?.workingDaysPerMonth || 26;
  const userMonthAttendance = useMemo(() => {
    return (attendance || []).filter(
      (a) =>
        (a.employeeId === currentUser?.id || a.employeeName === currentUser?.name) &&
        a.date &&
        a.date.startsWith(selectedMonthObj.key)
    );
  }, [attendance, currentUser, selectedMonthObj]);

  const presentCount = userMonthAttendance.filter((a) => a.status === 'present').length;
  const halfDaysCount = userMonthAttendance.filter((a) => a.status === 'halfday' || (a.status as string) === 'half-day').length;
  const leaveCount = userMonthAttendance.filter((a) => (a.status as string) === 'leave').length;
  const presentDaysDisplay = presentCount + halfDaysCount * 0.5;

  const sundayWorkCount = userMonthAttendance.filter((a) => {
    const d = new Date(a.date);
    return d.getDay() === 0 && (a.status === 'present' || (Number(a.otHours) || 0) > 0);
  }).length;

  const holidaysCount = (holidays || []).filter((h: any) => h.date && h.date.startsWith(selectedMonthObj.key)).length;
  const weekOffCount = Math.max(0, daysInMonth - workingDaysCount - holidaysCount);

  const fixedGrossSalary = currentUser?.fixedSalary || currentUser?.basic || 30000;
  const paySlabPerDay = Math.round(fixedGrossSalary / (workingDaysCount || 26));

  const pendingAdvanceTotal = useMemo(() => {
    return (requests || [])
      .filter((r) => {
        if (r.category !== 'loan' && r.category !== 'advance_loan') return false;
        const matchesEmp =
          r.employeeId === currentUser?.id ||
          (currentUser?.empCode && r.empCode === currentUser.empCode) ||
          r.employeeName === currentUser?.name;
        return matchesEmp && (r.status === 'Approved' || r.status === 'Disbursed');
      })
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [requests, currentUser]);

  const itemizedEarnings = useMemo(() => {
    const list = payrollComputation.earningsList || [];
    const items: { name: string; amount: number }[] = [];

    if (list.length > 0) {
      let combinedBasicDaAmt = 0;
      let foundBasicOrDa = false;

      // Pass 1: Basic + DA
      list.forEach((el: any) => {
        const idLower = (el.id || '').toLowerCase();
        const nameLower = (el.name || '').toLowerCase();
        if (idLower === 'basic' || idLower === 'da' || nameLower.includes('basic') || nameLower.includes('dearness')) {
          combinedBasicDaAmt += el.amount || 0;
          foundBasicOrDa = true;
        }
      });

      if (foundBasicOrDa || combinedBasicDaAmt > 0) {
        items.push({ name: 'BASIC + DA', amount: combinedBasicDaAmt });
      }

      // Pass 2: Other heads
      list.forEach((el: any) => {
        const idLower = (el.id || '').toLowerCase();
        const nameLower = (el.name || '').toLowerCase();
        if (idLower === 'basic' || idLower === 'da' || nameLower.includes('basic') || nameLower.includes('dearness')) {
          return;
        }

        let displayName = (el.name || '').toUpperCase();
        if (idLower === 'hra' || nameLower.includes('hra') || nameLower.includes('house rent')) {
          displayName = 'HRA (HOUSE RENT)';
        } else if (idLower === 'ca' || nameLower.includes('conveyance')) {
          displayName = 'CONVEYANCE ALW';
        } else if (idLower === 'oa' || nameLower.includes('other allowance') || nameLower.includes('special')) {
          displayName = 'SPECIAL / OTHER ALW';
        } else if (idLower === 'lta' || nameLower.includes('leave travel')) {
          displayName = 'L.T.A';
        } else if (idLower === 'bonus' || nameLower.includes('bonus')) {
          displayName = 'ATTENDANCE / BONUS';
        } else if (idLower === 'incentive' || nameLower.includes('incentive')) {
          displayName = 'PERFORMANCE INCENTIVE';
        } else if (idLower === 'overtime' || idLower === 'ot' || nameLower.includes('overtime')) {
          displayName = 'OVERTIME PAY (OT)';
        } else if (idLower === 'variablepay' || nameLower.includes('variable')) {
          displayName = 'VARIABLE PAY';
        } else if (idLower === 'night' || nameLower.includes('night')) {
          displayName = 'NIGHT SHIFT ALW';
        }

        if (el.amount > 0 && !items.some((it) => it.name === displayName)) {
          items.push({ name: displayName, amount: el.amount });
        }
      });
    }

    if (items.length === 0 && payrollComputation.gross > 0) {
      items.push({ name: 'BASIC + DA', amount: payrollComputation.gross });
    }
    return items;
  }, [payrollComputation]);

  const itemizedDeductions = useMemo(() => {
    const items: { name: string; amount: number }[] = [];
    const ded = payrollComputation.deductions || {};

    if (ded.employeePF > 0) items.push({ name: 'EPF (EMPLOYEE PF)', amount: ded.employeePF });
    if (ded.employeeESI > 0) items.push({ name: 'ESIC (ESI)', amount: ded.employeeESI });
    if (ded.professionalTax > 0) items.push({ name: 'PROFESSIONAL TAX (PT)', amount: ded.professionalTax });
    if (ded.tds > 0) items.push({ name: 'TDS (INCOME TAX)', amount: ded.tds });
    if ((ded as any).lwf > 0) items.push({ name: 'LABOUR WELFARE (LWF)', amount: (ded as any).lwf });
    if ((ded as any).advance > 0) items.push({ name: 'SALARY ADVANCE', amount: (ded as any).advance });
    if ((ded as any).loanEmi > 0 || (ded as any).loan > 0) {
      items.push({ name: 'LOAN EMI DEDUCTION', amount: (ded as any).loanEmi || (ded as any).loan });
    }

    if (items.length === 0) {
      items.push({ name: 'NIL STATUTORY DEDUCTIONS', amount: 0 });
    }
    return items;
  }, [payrollComputation]);

  const tableRowCount = Math.max(itemizedEarnings.length, itemizedDeductions.length, 6);

  // Annual CTC Calculation
  const annualCtcLpa = useMemo(() => {
    const fixed = currentUser?.fixedSalary || currentUser?.basic || 45000;
    return ((fixed * 12) / 100000).toFixed(1);
  }, [currentUser]);

  const handleDownloadPDF = async (monthKey?: string) => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);

    const targetMonth = monthKey || selectedMonthObj.key;
    const isCurrent = targetMonth === selectedMonthObj.key;

    let computation = payrollComputation;
    if (!isCurrent) {
      const matchRun = (payrolls || []).find(
        (p: any) =>
          (p.employeeId === currentUser?.id || p.employeeId === currentUser?.empCode) &&
          (p.month === targetMonth)
      );
      if (matchRun?.computed) {
        computation = matchRun.computed;
      }
    }

    try {
      const htmlContent = generatePayslipHtml({
        company: companyConfig || {},
        employee: currentUser || {},
        month: targetMonth,
        computation: computation || {},
        paidDays: computation?.daysWorked !== undefined ? computation.daysWorked : presentDaysDisplay,
        weekOffDaysCount: weekOffCount,
        leaveDaysCount: leaveCount,
        holidaysDaysCount: holidaysCount,
        sundayWorkDaysCount: sundayWorkCount,
        pendingAdvance: pendingAdvanceTotal,
        docAssets: {
          letterheadDataUrl: letterheadUrl || undefined,
          footerDataUrl: footerUrl || undefined,
        },
        palette: palette,
      });

      const base64Html = utf8ToBase64(htmlContent);
      const fileDataUrl = `data:text/html;base64,${base64Html}`;
      const empIdentifier = currentUser?.empCode || currentUser?.id || 'EMP';
      const fileName = `payslips/${empIdentifier}_${targetMonth}_${Date.now()}.html`;

      const uploadRes = await uploadFile(currentUser?.tenantId || 'default', fileName, fileDataUrl);

      if (uploadRes && uploadRes.success && uploadRes.url && uploadRes.url.startsWith('http')) {
        await Linking.openURL(uploadRes.url);
      } else {
        const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        await Linking.openURL(dataUri);
      }
    } catch (err: any) {
      console.warn('Error downloading payslip:', err);
      Alert.alert('Download Error', 'Could not open payslip. Please verify your network connection.');
    } finally {
      setDownloadingPdf(false);
    }
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
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Payroll</Text>
          <TouchableOpacity
            style={[styles.monthBadge, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : theme.card, borderColor: theme.cardBorder }]}
            onPress={() => setMonthPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Icon name="calendar" size={13} color={theme.textPrimary} />
            <Text style={[styles.monthBadgeText, { color: theme.textPrimary }]}>{selectedMonthObj.label}</Text>
            <Icon name="chevron-down" size={11} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 1. TOP CARD: Solid Vibrant Theme Color-Filled Salary Overview Card */}
        <View style={[styles.heroCardFilled, { backgroundColor: theme.primary }]}>
          {/* Header row in hero */}
          <View style={styles.heroHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.heroHeaderTitleFilled}>
                Salary Overview
              </Text>
              <Text style={styles.heroHeaderSubtitleFilled} numberOfLines={1}>
                {currentUser?.name || 'Employee'} • {currentUser?.empCode || 'EMP001'}
              </Text>
            </View>
            <View style={styles.statusBadgeFilled}>
              <View style={styles.statusDotFilled} />
              <Text style={styles.statusBadgeTextFilled}>
                {payrollComputation.isProcessed ? 'Credited' : 'Computed'}
              </Text>
            </View>
          </View>

          {/* Prominent Amount Display Box in middle of card */}
          <View style={[styles.amountDisplayBoxFilled, { backgroundColor: theme.primaryDark }]}>
            <Text style={styles.amountBoxLabelFilled}>
              Net Take-Home Salary
            </Text>
            <Text style={styles.amountBoxValueFilled}>
              ₹{formatInr(payrollComputation.net)}
            </Text>
            <Text style={styles.amountBoxWordsFilled} numberOfLines={1}>
              {numberToWordsIndian(payrollComputation.net)}
            </Text>
          </View>

          {/* Bottom row: Indicators on Left, 2 Action Pill Buttons on Right */}
          <View style={styles.heroBottomRow}>
            <View style={styles.heroMetaLeft}>
              <Text style={styles.heroMetaTextFilled}>
                Days: <Text style={{ color: '#ffffff', fontWeight: '800' }}>{payrollComputation.daysWorked}d</Text>
              </Text>
              {payrollComputation.otHours > 0 && (
                <Text style={[styles.heroMetaTextFilled, { color: '#fef08a', fontWeight: '800' }]}>
                  • {payrollComputation.otHours}h OT
                </Text>
              )}
            </View>

            <View style={styles.heroActionButtons}>
              <TouchableOpacity
                style={styles.heroActionBtnFilledWhite}
                onPress={() => setPayslipModalOpen(true)}
                activeOpacity={0.8}
              >
                <Icon name="receipt-cutoff" size={13} color={theme.primary} />
                <Text style={[styles.heroActionBtnTextFilledWhite, { color: theme.primary }]}>Payslip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroActionBtnFilledDark, { backgroundColor: theme.primaryDark }]}
                onPress={() => handleDownloadPDF()}
                activeOpacity={0.8}
              >
                <Icon name="download" size={13} color="#ffffff" />
                <Text style={styles.heroActionBtnTextFilledDark}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. MIDDLE CARD (Animated Segmented Breakdown Card) */}
        <View style={[styles.breakdownCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Segmented Pill Switcher with Smooth Slide Animation */}
          <View
            onLayout={(e) => setSegmentedWidth(e.nativeEvent.layout.width)}
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : theme.inputBg,
                borderColor: theme.cardBorder,
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
              onPress={() => handleSwitchTab('earnings')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  { color: theme.textMuted },
                  breakdownTab === 'earnings' && { color: theme.textPrimary, fontWeight: '800' },
                ]}
              >
                Earnings (₹{formatInr(payrollComputation.gross)})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => handleSwitchTab('deductions')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  { color: theme.textMuted },
                  breakdownTab === 'deductions' && { color: theme.textPrimary, fontWeight: '800' },
                ]}
              >
                Deductions (₹{formatInr(payrollComputation.totalDeductions)})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Line Items List with Smooth Fade Animation */}
          <Animated.View style={[styles.itemList, { opacity: tabFadeAnim }]}>
            {breakdownTab === 'earnings' ? (
              <>
                {payrollComputation.earningsList.map((item: any, idx: number) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      idx < payrollComputation.earningsList.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' },
                    ]}
                  >
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>{item.name}</Text>
                    <Text style={[styles.itemValue, { color: item.id === 'ot' ? theme.accent : theme.textPrimary }]}>
                      {item.id === 'ot' ? '+' : ''}₹{formatInr(item.amount)}
                    </Text>
                  </View>
                ))}

                <View style={[styles.subtotalRow, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4', borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#bbf7d0' }]}>
                  <Text style={[styles.subtotalLabel, { color: theme.textPrimary }]}>Total Gross Earnings</Text>
                  <Text style={[styles.subtotalValue, { color: theme.success }]}>
                    ₹{formatInr(payrollComputation.gross)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                {payrollComputation.deductions.employeePF > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Provident Fund (PF)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger }]}>-₹{formatInr(payrollComputation.deductions.employeePF)}</Text>
                  </View>
                )}

                {payrollComputation.deductions.employeeESI > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Employee State Insurance (ESI)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger }]}>-₹{formatInr(payrollComputation.deductions.employeeESI)}</Text>
                  </View>
                )}

                {payrollComputation.deductions.professionalTax > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Professional Tax (PT)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger }]}>-₹{formatInr(payrollComputation.deductions.professionalTax)}</Text>
                  </View>
                )}

                {payrollComputation.deductions.tds > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Income Tax (TDS)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger }]}>-₹{formatInr(payrollComputation.deductions.tds)}</Text>
                  </View>
                )}

                {(payrollComputation.deductions as any).loanEmi > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: '#059669', fontWeight: '600' }]}>Advance Salary Loan (EMI)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger, fontWeight: '700' }]}>-₹{formatInr((payrollComputation.deductions as any).loanEmi)}</Text>
                  </View>
                )}

                {(payrollComputation.deductions as any).advance > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: '#d97706', fontWeight: '600' }]}>Salary Advance Recovery</Text>
                    <Text style={[styles.itemValue, { color: theme.danger, fontWeight: '700' }]}>-{formatInr((payrollComputation.deductions as any).advance)}</Text>
                  </View>
                )}

                {(payrollComputation.deductions as any).lwf > 0 && (
                  <View style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Labour Welfare Fund (LWF)</Text>
                    <Text style={[styles.itemValue, { color: theme.danger }]}>-{formatInr((payrollComputation.deductions as any).lwf)}</Text>
                  </View>
                )}

                {((payrollComputation as any).extraDeductions || []).map((extra: any) => (
                  <View key={extra.id || extra.name} style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                    <Text style={[styles.itemLabel, { color: theme.danger, fontWeight: '500' }]}>{extra.name || 'Other Deduction'}</Text>
                    <Text style={[styles.itemValue, { color: theme.danger, fontWeight: '700' }]}>-{formatInr(extra.amount)}</Text>
                  </View>
                ))}

                {payrollComputation.totalDeductions === 0 && (
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.textMuted, fontStyle: 'italic' }]}>No active statutory deductions</Text>
                    <Text style={[styles.itemValue, { color: theme.textMuted }]}>₹0</Text>
                  </View>
                )}

                <View style={[styles.subtotalRow, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca' }]}>
                  <Text style={[styles.subtotalLabel, { color: theme.textPrimary }]}>Total Statutory Deductions</Text>
                  <Text style={[styles.subtotalValue, { color: theme.danger }]}>
                    -₹{formatInr(payrollComputation.totalDeductions)}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* 3. SUBTLE HORIZONTAL DIVIDER */}
        <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />

        {/* 4. BOTTOM CARD (Annual CTC & Account Summary Banner from Wireframe) */}
        <View style={[styles.bottomCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.bottomCardLeft}>
            <Text style={[styles.bottomCardTitle, { color: theme.textPrimary }]}>
              Annual CTC Package
            </Text>
            <Text style={[styles.bottomCardSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
              Disbursement: {currentUser?.bankAccount || (currentUser?.bankAcc ? `A/C ${currentUser.bankAcc}` : 'Registered Bank Transfer')}
            </Text>
          </View>
          <View style={[styles.ctcBadge, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : theme.successSoft, borderColor: theme.success }]}>
            <Text style={[styles.ctcBadgeText, { color: theme.success }]}>
              ₹{annualCtcLpa} LPA
            </Text>
          </View>
        </View>

        {/* 5. MONTHLY ARCHIVES LIST */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Monthly Payslip Archives</Text>
        {availableMonths.slice(1).map((mObj) => {
          const matchRun = (payrolls || []).find(
            (p: any) =>
              isMatchEmployee(p, currentUser, employees) &&
              matchMonth(p.month, mObj.key, mObj.label)
          );
          const hasProcessed = !!matchRun?.computed?.net || (matchRun?.computed && typeof matchRun.computed.net === 'number');
          const histNet = matchRun?.computed?.net || 0;

          return (
            <View key={mObj.key} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View>
                <Text style={[styles.historyMonth, { color: theme.textPrimary }]}>{mObj.label}</Text>
                <Text style={[styles.historyNet, { color: theme.textMuted }]}>
                  {hasProcessed ? `Net Paid: ₹${formatInr(histNet)}` : 'Not Processed'}
                </Text>
              </View>

              {hasProcessed ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.historyPdfBtn, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9', borderColor: theme.cardBorder }]}
                    onPress={() => {
                      setSelectedMonthObj(mObj);
                      setPayslipModalOpen(true);
                    }}
                  >
                    <Icon name="receipt-cutoff" size={13} color={theme.textPrimary} />
                    <Text style={[styles.historyPdfIcon, { color: theme.textPrimary }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.historyPdfBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => handleDownloadPDF(mObj.key)}
                  >
                    <Icon name="download" size={13} color="#ffffff" />
                    <Text style={[styles.historyPdfIcon, { color: '#ffffff' }]}>PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.historyPdfBtn, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc', borderColor: theme.cardBorder, opacity: 0.5 }]}>
                  <Icon name="dash" size={13} color={theme.textMuted} />
                  <Text style={[styles.historyPdfIcon, { color: theme.textMuted }]}>N/A</Text>
                </View>
              )}
            </View>
          );
        })}
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

      {/* MODAL 2: OFFICIAL CORPORATE PAYSLIP DOCUMENT MODAL (EXACT MATCH OF SWIFT ADMIN PAYSLIP TEMPLATE) */}
      <Modal visible={payslipModalOpen} animationType="slide" transparent>
        <View style={styles.payslipOverlay}>
          <View style={[styles.payslipModalCard, { borderColor: `${palette.primaryHex}40` }]}>
            {/* Top Close Bar */}
            <View style={styles.payslipTopBar}>
              <View style={styles.payslipTopBarTitleGroup}>
                <Icon name="receipt-cutoff" size={15} color={palette.primaryHex} />
                <Text style={[styles.payslipTopBarTitle, { color: palette.primaryHex }]}>
                  OFFICIAL PAYSLIP PREVIEW
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payslipCloseIconBtn}
                onPress={() => setPayslipModalOpen(false)}
              >
                <Icon name="cross" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.payslipModalBody}
              contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Document Container Card */}
              <View style={[styles.docContainer, { borderColor: `${palette.primaryHex}40` }]}>
                
                {/* 1. TOP LETTERHEAD (Rendered ONLY if letterheadUrl is uploaded) */}
                {letterheadUrl ? (
                  <View style={[styles.letterheadBox, { borderColor: `${palette.primaryHex}30` }]}>
                    <Image
                      source={{ uri: letterheadUrl }}
                      style={styles.letterheadImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {/* 2. TOP BRAND HEADER (Company Title & Address) */}
                <View
                  style={[
                    styles.payslipBanner,
                    {
                      backgroundColor: palette.primaryDarkHex,
                      borderBottomColor: `${palette.accentHex}90`,
                    },
                  ]}
                >
                  <View style={styles.payslipBannerRow}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.payslipBannerCompany} numberOfLines={1} ellipsizeMode="tail">
                        {companyConfig?.legalName || companyConfig?.name || companyConfig?.companyName || currentUser?.companyName || 'SWIFT HRMS'}
                      </Text>
                      <View
                        style={[
                          styles.payslipTagPill,
                          {
                            backgroundColor: `${palette.accentHex}35`,
                            borderColor: `${palette.accentHex}80`,
                          },
                        ]}
                      >
                        <Text style={styles.payslipTagText}>SALARY / WAGE SLIP &amp; TIME CARD</Text>
                      </View>
                    </View>

                    <View style={styles.payslipAddressCol}>
                      <Icon name="building" size={11} color="#ffffff" style={{ marginTop: 2 }} />
                      <Text style={styles.payslipBannerBranch} numberOfLines={2} ellipsizeMode="tail">
                        {currentUser?.branch || companyConfig?.address || companyConfig?.branch || 'Corporate Office'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. EMPLOYEE METADATA GRID (3-Column Clean Table Layout) */}
                <View style={styles.empGridTable}>
                  {/* Row 1: Name | Employee Code | Designation */}
                  <View style={styles.empGridRow}>
                    <View style={[styles.empGridCell, { flex: 1.15 }]}>
                      <Text style={styles.empGridLabel}>Name</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridValBold} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.name || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1 }]}>
                      <Text style={styles.empGridLabel}>Employee Code</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={[styles.empGridValBold, { color: palette.primaryHex }]} numberOfLines={1}>
                        {currentUser?.empCode || currentUser?.code || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1, borderRightWidth: 0 }]}>
                      <Text style={styles.empGridLabel}>Designation</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridValBold} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.designation || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: Gender | Month & Year | Father Name */}
                  <View style={styles.empGridRow}>
                    <View style={[styles.empGridCell, { flex: 1.15 }]}>
                      <Text style={styles.empGridLabel}>Gender</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1}>
                        {currentUser?.gender ? currentUser.gender.toUpperCase() : 'MALE'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1 }]}>
                      <Text style={styles.empGridLabel}>Month &amp; Year</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridValBold} numberOfLines={1}>
                        {formattedMonthDateStr} ({formattedMonthNameStr.slice(0, 3)})
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1, borderRightWidth: 0 }]}>
                      <Text style={styles.empGridLabel}>Father Name</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.fatherName || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Row 3: D.O.J | D.O.B | Pay Slab */}
                  <View style={styles.empGridRow}>
                    <View style={[styles.empGridCell, { flex: 1.15 }]}>
                      <Text style={styles.empGridLabel}>D.O.J</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1}>
                        {currentUser?.joiningDate || currentUser?.doj || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1 }]}>
                      <Text style={styles.empGridLabel}>D.O.B</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1}>
                        {currentUser?.dob || '—'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.empGridCell,
                        {
                          flex: 1,
                          borderRightWidth: 0,
                          backgroundColor: `${palette.primaryHex}10`,
                        },
                      ]}
                    >
                      <Text style={[styles.empGridLabel, { color: palette.primaryHex }]}>Pay Slab</Text>
                      <Text style={[styles.empGridColon, { color: palette.primaryHex }]}>:</Text>
                      <Text style={[styles.empGridValBold, { color: palette.primaryHex }]} numberOfLines={1}>
                        ₹{formatInr(paySlabPerDay)}/d
                      </Text>
                    </View>
                  </View>

                  {/* Row 4: PF.No / UAN | ESI.No | Fixed Salary */}
                  <View style={styles.empGridRow}>
                    <View style={[styles.empGridCell, { flex: 1.15 }]}>
                      <Text style={styles.empGridLabel}>PF.No / UAN</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1} ellipsizeMode="tail">
                        {(currentUser as any)?.uan || (currentUser as any)?.pfNumber || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1 }]}>
                      <Text style={styles.empGridLabel}>ESI.No</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1}>
                        {(currentUser as any)?.esiNumber || (currentUser as any)?.esic || (payrollComputation.deductions.employeeESI > 0 ? 'Applicable' : 'NA')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.empGridCell,
                        {
                          flex: 1,
                          borderRightWidth: 0,
                          backgroundColor: `${palette.primaryHex}08`,
                        },
                      ]}
                    >
                      <Text style={[styles.empGridLabel, { color: palette.primaryHex }]}>Fixed Salary</Text>
                      <Text style={[styles.empGridColon, { color: palette.primaryHex }]}>:</Text>
                      <Text style={[styles.empGridValBold, { color: palette.primaryHex }]} numberOfLines={1}>
                        ₹{formatInr(fixedGrossSalary)}/m
                      </Text>
                    </View>
                  </View>

                  {/* Row 5: Bank A/C | Bank IFSC | PAN / Dept */}
                  <View style={[styles.empGridRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.empGridCell, { flex: 1.15 }]}>
                      <Text style={styles.empGridLabel}>Bank A/C</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.bankAccount || currentUser?.bankAcc || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1 }]}>
                      <Text style={styles.empGridLabel}>Bank IFSC</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.bankIfsc || '—'}
                      </Text>
                    </View>
                    <View style={[styles.empGridCell, { flex: 1, borderRightWidth: 0 }]}>
                      <Text style={styles.empGridLabel}>PAN / Dept</Text>
                      <Text style={styles.empGridColon}>:</Text>
                      <Text style={styles.empGridVal} numberOfLines={1} ellipsizeMode="tail">
                        {currentUser?.panNumber || currentUser?.pan || '—'} · {currentUser?.department || '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4. ATTENDANCE SECTION (Accent Header & 8 Metric Tiles) */}
                <View style={styles.attSection}>
                  <View style={[styles.attHeaderBar, { backgroundColor: palette.primaryHex }]}>
                    <Icon name="calendar" size={12} color="#ffffff" />
                    <Text style={styles.attHeaderTitle}>ATTENDANCE SUMMARY</Text>
                  </View>

                  {/* 8-Tile Attendance Matrix */}
                  <View style={styles.attTilesGrid}>
                    {/* Tile 1: Month Days */}
                    <View style={[styles.attTile, styles.attTileNeutral]}>
                      <Text style={styles.attTileLabel}>Month Days</Text>
                      <Text style={styles.attTileValBold}>{daysInMonth}</Text>
                    </View>

                    {/* Tile 2: Pay Days (Sky) */}
                    <View style={[styles.attTile, styles.attTileSky]}>
                      <Text style={[styles.attTileLabel, { color: '#0369a1' }]}>Pay Days</Text>
                      <Text style={[styles.attTileValBold, { color: '#0369a1' }]}>{workingDaysCount}</Text>
                    </View>

                    {/* Tile 3: Present (Emerald) */}
                    <View style={[styles.attTile, styles.attTileEmerald]}>
                      <Text style={[styles.attTileLabel, { color: '#047857' }]}>Present</Text>
                      <Text style={[styles.attTileValBold, { color: '#047857' }]}>{presentDaysDisplay}</Text>
                    </View>

                    {/* Tile 4: Leave (Rose) */}
                    <View style={[styles.attTile, styles.attTileRose]}>
                      <Text style={[styles.attTileLabel, { color: '#be123c' }]}>Leave</Text>
                      <Text style={[styles.attTileValBold, { color: '#be123c' }]}>{leaveCount}</Text>
                    </View>

                    {/* Tile 5: Week Off (Indigo) */}
                    <View style={[styles.attTile, styles.attTileIndigo]}>
                      <Text style={[styles.attTileLabel, { color: '#4338ca' }]}>Week Off</Text>
                      <Text style={[styles.attTileValBold, { color: '#4338ca' }]}>{weekOffCount}</Text>
                    </View>

                    {/* Tile 6: Holidays (Amber) */}
                    <View style={[styles.attTile, styles.attTileAmber]}>
                      <Text style={[styles.attTileLabel, { color: '#b45309' }]}>Holidays</Text>
                      <Text style={[styles.attTileValBold, { color: '#b45309' }]}>{holidaysCount}</Text>
                    </View>

                    {/* Tile 7: Sunday Work (Purple) */}
                    <View style={[styles.attTile, styles.attTilePurple]}>
                      <Text style={[styles.attTileLabel, { color: '#7e22ce' }]}>Sunday Work</Text>
                      <Text style={[styles.attTileValBold, { color: '#7e22ce' }]}>{sundayWorkCount}</Text>
                    </View>

                    {/* Tile 8: Pending Adv. */}
                    <View style={[styles.attTile, styles.attTileNeutral]}>
                      <Text style={styles.attTileLabel}>Pending Adv.</Text>
                      <Text style={styles.attTileValBold}>₹{formatInr(pendingAdvanceTotal)}</Text>
                    </View>
                  </View>
                </View>

                {/* 5. 2-COLUMN TABLE: EARNINGS (ACTUAL EARNED) vs DEDUCTIONS & RECOVERIES */}
                <View style={styles.tableContainer}>
                  {/* Table Headers */}
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.tableHeaderLeft}>
                      <Text style={styles.tableHeaderText} numberOfLines={1}>EARNINGS (ACTUAL EARNED)</Text>
                    </View>
                    <View style={styles.tableHeaderRight}>
                      <Text style={styles.tableHeaderText} numberOfLines={1}>DEDUCTIONS &amp; RECOVERIES</Text>
                    </View>
                  </View>

                  {/* Itemized Rows */}
                  {Array.from({ length: tableRowCount }).map((_, idx) => {
                    const earn = itemizedEarnings[idx];
                    const ded = itemizedDeductions[idx];
                    return (
                      <View key={`payslip-row-${idx}`} style={styles.tableItemRow}>
                        {/* Left Column: Earnings */}
                        <View style={styles.tableCellLeft}>
                          <Text style={styles.cellItemName} numberOfLines={1} ellipsizeMode="tail">
                            {earn ? earn.name : ''}
                          </Text>
                          <Text style={styles.cellEarnAmount} numberOfLines={1}>
                            {earn ? `: ₹${formatInr(earn.amount)}` : ''}
                          </Text>
                        </View>

                        {/* Right Column: Deductions */}
                        <View style={styles.tableCellRight}>
                          <Text style={styles.cellItemName} numberOfLines={1} ellipsizeMode="tail">
                            {ded ? ded.name : ''}
                          </Text>
                          <Text style={styles.cellDedAmount} numberOfLines={1}>
                            {ded ? `: ₹${formatInr(ded.amount)}` : ''}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Totals Row */}
                  <View style={styles.tableTotalRow}>
                    <View style={styles.tableTotalCellLeft}>
                      <Text style={styles.totalLabelEarn} numberOfLines={1}>Gross Earnings</Text>
                      <Text style={styles.totalAmountEarn} numberOfLines={1}>
                        : ₹{formatInr(payrollComputation.gross)}
                      </Text>
                    </View>
                    <View style={styles.tableTotalCellRight}>
                      <Text style={styles.totalLabelDed} numberOfLines={1}>Total Deductions</Text>
                      <Text style={styles.totalAmountDed} numberOfLines={1}>
                        : ₹{formatInr(payrollComputation.totalDeductions)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 6. FULL WIDTH NET TAKE-HOME PAY HIGHLIGHT BANNER */}
                <View
                  style={[
                    styles.netPayBanner,
                    {
                      backgroundColor: palette.primaryHex,
                      borderTopColor: `${palette.accentHex}80`,
                    },
                  ]}
                >
                  <Text style={styles.netPayBannerLabel}>NET TAKE-HOME PAY</Text>
                  <Text style={styles.netPayBannerVal}>
                    : ₹{formatInr(payrollComputation.net)}
                  </Text>
                </View>

                {/* 7. BANK DISBURSEMENT FOOTER */}
                <View style={[styles.disbursalBox, { borderTopColor: `${palette.primaryHex}40` }]}>
                  <View style={styles.disbursalRow}>
                    <View style={[styles.disbursalCol, { flex: 1 }]}>
                      <Icon name="credit-card" size={12} color={palette.primaryHex} />
                      <View style={{ flex: 1, marginLeft: 4 }}>
                        <Text style={styles.disbursalLabel}>IFSC CODE</Text>
                        <Text style={styles.disbursalVal} numberOfLines={1}>
                          {currentUser?.bankIfsc || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.disbursalCol, { flex: 1.25 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.disbursalLabel}>CREDITED INTO ACCOUNT</Text>
                        <Text style={styles.disbursalVal} numberOfLines={1} ellipsizeMode="tail">
                          A/C NO : {currentUser?.bankAccount || currentUser?.bankAcc || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.disbursalCol, { flex: 1.25, borderRightWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.disbursalLabel}>BANK NAME</Text>
                        <Text style={[styles.disbursalVal, { color: palette.primaryHex }]} numberOfLines={1}>
                          {currentUser?.bankName || companyConfig?.bankName || 'Corporate Bank Transfer'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Amount In Words & Verified Tag */}
                  <View style={styles.amountInWordsRow}>
                    <Text style={styles.amountInWordsText} numberOfLines={2}>
                      <Text style={{ fontWeight: '800' }}>Amount in Words: </Text>
                      <Text style={{ fontStyle: 'italic' }}>{numberToWordsIndian(payrollComputation.net)}</Text>
                    </Text>
                    <View style={styles.verifiedTag}>
                      <Icon name="shield-check" size={12} color="#059669" />
                      <Text style={styles.verifiedText}>Verified Computer Generated Payslip</Text>
                    </View>
                  </View>
                </View>

                {/* 8. COMPANY DOCUMENT FOOTER (Rendered ONLY if uploaded) */}
                {footerUrl ? (
                  <View style={[styles.footerBox, { borderTopColor: `${palette.primaryHex}30` }]}>
                    <Image
                      source={{ uri: footerUrl }}
                      style={styles.footerImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

              </View>
            </ScrollView>

            {/* Bottom Action Footer */}
            <View style={styles.pdfActionFooter}>
              <TouchableOpacity
                style={styles.pdfCloseBtn}
                onPress={() => setPayslipModalOpen(false)}
              >
                <Text style={styles.pdfCloseBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pdfDownloadBtn, { backgroundColor: palette.primaryHex, opacity: downloadingPdf ? 0.7 : 1 }]}
                onPress={() => handleDownloadPDF()}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Icon name="download" size={15} color="#ffffff" />
                )}
                <Text style={styles.pdfDownloadBtnText}>
                  {downloadingPdf ? 'Preparing Payslip...' : 'Download PDF Payslip'}
                </Text>
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
    paddingBottom: 110,
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
    letterSpacing: -0.3,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  monthBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroCardFilled: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroHeaderTitleFilled: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  heroHeaderSubtitleFilled: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 2,
  },
  statusBadgeFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  statusDotFilled: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  statusBadgeTextFilled: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  amountDisplayBoxFilled: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  amountBoxLabelFilled: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  amountBoxValueFilled: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginVertical: 3,
  },
  amountBoxWordsFilled: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaTextFilled: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionBtnFilledWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  heroActionBtnTextFilledWhite: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroActionBtnFilledDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
  },
  heroActionBtnTextFilledDark: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  breakdownCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  segmentedContainer: {
    flexDirection: 'row',
    position: 'relative',
    padding: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  slidingSegmentPill: {
    position: 'absolute',
    top: 3.5,
    left: 4,
    bottom: 3.5,
    borderRadius: 11,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemList: {
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  dividerLine: {
    height: 1,
    marginVertical: 18,
  },
  bottomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  bottomCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  bottomCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  bottomCardSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  ctcBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctcBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
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

  // Official Payslip PDF Modal Styles matching Admin Panel Letterhead Theme
  payslipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  payslipModalCard: {
    width: '98%',
    height: '95%',
    maxWidth: 540,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1.5,
  },
  payslipTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  payslipTopBarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payslipTopBarTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  payslipCloseIconBtn: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  payslipModalBody: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  docContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  letterheadBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  letterheadImg: {
    width: '100%',
    height: 65,
  },
  payslipBanner: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  payslipBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payslipBannerCompany: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  payslipTagPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  payslipTagText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  payslipAddressCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    maxWidth: 150,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    paddingLeft: 8,
  },
  payslipBannerBranch: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 8.5,
    fontWeight: '500',
    lineHeight: 11,
    flexShrink: 1,
  },
  empGridTable: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: 'rgba(248, 250, 252, 0.6)',
  },
  empGridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  empGridCell: {
    paddingHorizontal: 5,
    paddingVertical: 3.5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  empGridLabel: {
    fontSize: 7.8,
    color: '#64748b',
    fontWeight: '800',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  empGridColon: {
    fontSize: 7.8,
    color: '#94a3b8',
    marginHorizontal: 2,
    flexShrink: 0,
  },
  empGridVal: {
    fontSize: 8,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
  },
  empGridValBold: {
    fontSize: 8,
    color: '#0f172a',
    fontWeight: '900',
    flex: 1,
  },
  attSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  attHeaderBar: {
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  attHeaderTitle: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  attTilesGrid: {
    padding: 5,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  attTile: {
    width: '23.8%',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  attTileNeutral: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  attTileSky: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  attTileEmerald: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  attTileRose: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  attTileIndigo: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  attTileAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  attTilePurple: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  attTileLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
    textAlign: 'center',
  },
  attTileValBold: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
    textAlign: 'center',
  },
  tableContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderLeft: {
    flex: 1,
    backgroundColor: '#047857',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ffffff40',
  },
  tableHeaderRight: {
    flex: 1,
    backgroundColor: '#be123c',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tableItemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 22,
  },
  tableCellLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tableCellRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    backgroundColor: '#ffffff',
  },
  cellItemName: {
    fontSize: 7.8,
    color: '#334155',
    fontWeight: '700',
    flex: 1,
    marginRight: 2,
  },
  cellEarnAmount: {
    fontSize: 7.8,
    color: '#047857',
    fontWeight: '900',
    flexShrink: 0,
  },
  cellDedAmount: {
    fontSize: 7.8,
    color: '#be123c',
    fontWeight: '900',
    flexShrink: 0,
  },
  tableTotalRow: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: '#cbd5e1',
  },
  tableTotalCellLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#ecfdf5',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  tableTotalCellRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#fff1f2',
  },
  totalLabelEarn: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#047857',
    textTransform: 'uppercase',
  },
  totalAmountEarn: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#047857',
  },
  totalLabelDed: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#be123c',
    textTransform: 'uppercase',
  },
  totalAmountDed: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#be123c',
  },
  netPayBanner: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
  },
  netPayBannerLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  netPayBannerVal: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },
  disbursalBox: {
    borderTopWidth: 1.5,
    backgroundColor: '#f8fafc',
    padding: 6,
  },
  disbursalRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
  },
  disbursalCol: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  disbursalLabel: {
    fontSize: 7.2,
    color: '#64748b',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  disbursalVal: {
    fontSize: 7.8,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 1,
  },
  amountInWordsRow: {
    paddingTop: 5,
  },
  amountInWordsText: {
    fontSize: 7.8,
    color: '#334155',
    lineHeight: 11,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    fontSize: 7.5,
    color: '#059669',
    fontWeight: '700',
  },
  footerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
  },
  footerImg: {
    width: '100%',
    height: 40,
  },
  pdfActionFooter: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  pdfCloseBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfCloseBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  pdfDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
  },
  pdfDownloadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});

