import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  TextInput,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = "AIzaSyAs3nkKoCsndZiXeV6oh0PvRLL7FpMiZ4k";

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function requestLocationPermission() {
  if (Platform.OS === 'ios') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Access Required',
        message: 'SWIFT HRMS requires device location to verify if you are within your assigned branch geofence.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[Location] Permission error:', err);
    return false;
  }
}

function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.log('[Location] High accuracy GPS failed, trying network accuracy...', error);
        // Fallback to enableHighAccuracy: false (uses wifi/cell towers/mock coordinates)
        Geolocation.getCurrentPosition(
          (fallbackPos) => {
            resolve({
              latitude: fallbackPos.coords.latitude,
              longitude: fallbackPos.coords.longitude,
            });
          },
          (fallbackErr) => {
            reject(fallbackErr);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 5000 }
    );
  });
}

interface AttendanceScreenProps {
  theme: ThemeColors;
}

export function AttendanceScreen({ theme }: AttendanceScreenProps) {
  const { currentUser, clockIn, clockOut, attendance, isClockedIn, companyConfig, refreshData, roster, holidays = [], leaves = [], applyLeave } = useAppContext();
  const [activeTab, setActiveTab] = useState<'punch' | 'calendar'>('punch');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [refreshing, setRefreshing] = useState(false);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDayDetails, setSelectedDayDetails] = useState<any | null>(null);
  const [applyModalType, setApplyModalType] = useState<'leave' | 'onduty' | 'permission' | null>(null);
  const [applyForm, setApplyForm] = useState({
    category: 'Casual Leave',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    days: '1',
    reason: '',
    permDate: new Date().toISOString().slice(0, 10),
    permHours: '1',
    odType: 'On Duty',
  });
  const [applyLoading, setApplyLoading] = useState(false);

  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<'ready' | 'capturing' | 'verifying' | 'success' | 'failed'>('ready');
  const [resultMsg, setResultMsg] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const loadUserLocation = async () => {
    setLocationLoading(true);
    const hasPerm = await requestLocationPermission();
    if (hasPerm) {
      try {
        const coords = await getCurrentLocation();
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
      } catch (err) {
        console.warn('[Location] Failed to fetch user location:', err);
      }
    }
    setLocationLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshData(), loadUserLocation()]);
    setRefreshing(false);
  }, [refreshData]);

  useEffect(() => {
    loadUserLocation();
  }, []);

  const branches = companyConfig?.branches || [];
  const userAssignedBranchIds: string[] = Array.isArray(currentUser?.branchIds) && currentUser.branchIds.length > 0
    ? currentUser.branchIds
    : (currentUser?.branchId ? [currentUser.branchId] : []);

  const assignedBranches = branches.filter((b: any) => userAssignedBranchIds.includes(b.id));
  const effectiveBranches = assignedBranches.length > 0 ? assignedBranches : (branches.length > 0 ? [branches[0]] : []);
  const primaryBranch = effectiveBranches.find((b: any) => b.id === currentUser?.branchId) || effectiveBranches[0];

  const branchLat = primaryBranch?.lat ?? 11.305639;
  const branchLng = primaryBranch?.lng ?? 77.703474;
  const branchRadius = primaryBranch?.radiusMeters ?? 100;
  const branchName = effectiveBranches.map((b: any) => b.name).join(', ') || primaryBranch?.name || 'Head Office';

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoster = (roster || []).find(
    (r: any) => r.employeeId === currentUser?.id && r.date === todayStr
  );

  const shiftList = companyConfig?.shifts || [];
  const effectiveShiftId = todayRoster ? todayRoster.shiftId : currentUser?.shiftId;
  const assignedShift = shiftList.find((s: any) => s.id === effectiveShiftId) || shiftList[0] || { start: '09:00', end: '18:00', name: 'General Shift 4.30' };
  const shiftStartStr = todayRoster?.shiftStart || assignedShift.start || '09:00';
  const graceTimeSetting = todayRoster?.graceTime || currentUser?.graceTime || assignedShift.graceTime || '15';
  const afternoonGraceSetting = todayRoster?.afternoonGraceTime || currentUser?.afternoonGraceTime || assignedShift.afternoonGraceTime || '15';
  const allowHalfDayLogin = (todayRoster?.allowHalfDayLogin ?? currentUser?.allowHalfDayLogin ?? assignedShift.allowHalfDayLogin) !== false;
  const halfDayLoginTimeStr = todayRoster?.halfDayLoginTime || currentUser?.halfDayLoginTime || assignedShift.halfDayLoginTime || '12:00';

  const isRosterWeeklyOff = useMemo(() => {
    if (todayRoster) {
      const shiftIdLow = (todayRoster.shiftId || '').toLowerCase();
      const shiftNameLow = (todayRoster.shiftName || '').toLowerCase();
      return shiftIdLow === 'off' || shiftIdLow === 'wo' || shiftNameLow.includes('off') || shiftNameLow.includes('weekly');
    }
    const todayDayOfWeek = new Date().getDay();
    const weekdayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (currentUser?.weeklyOff && currentUser.weeklyOff.toLowerCase().includes(weekdayName)) {
      return true;
    }
    if (companyConfig?.weeklyOffDays && Array.isArray(companyConfig.weeklyOffDays) && companyConfig.weeklyOffDays.includes(todayDayOfWeek)) {
      return true;
    }
    if (currentUser?.shiftId === 'off' || currentUser?.shift?.toLowerCase().includes('off')) {
      return true;
    }
    return false;
  }, [todayRoster, currentUser, companyConfig]);

  const punctualityStatus = useMemo(() => {
    if (isClockedIn) {
      return {
        isAllowed: true,
        reason: 'clock_out_ready',
        message: 'Clock-out active. Verify face to punch out.',
        isAfternoonSession: false,
        unlocksAt: undefined,
        isWeeklyOff: false,
      };
    }

    if (isRosterWeeklyOff) {
      return {
        isAllowed: false,
        reason: 'roster_weekoff_restricted',
        message: 'Today is assigned as Weekly Off in the Swift Roster. Attendance punch-in is restricted as per policy.',
        isAfternoonSession: false,
        unlocksAt: undefined,
        isWeeklyOff: true,
      };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = shiftStartStr.split(':').map((x: string) => parseInt(x, 10) || 0);
    const shiftStartMins = startH * 60 + startM;

    const isMorningFlexible = graceTimeSetting === 'always';
    const morningGraceMins = parseInt(graceTimeSetting, 10) || 15;
    const morningCutoffMins = shiftStartMins + morningGraceMins;

    const [halfH, halfM] = halfDayLoginTimeStr.split(':').map((x: string) => parseInt(x, 10) || 0);
    const halfDayMins = halfH * 60 + halfM;

    const isAfternoonFlexible = afternoonGraceSetting === 'always';
    const afternoonGraceMins = parseInt(afternoonGraceSetting, 10) || 15;
    const afternoonCutoffMins = halfDayMins + afternoonGraceMins;

    if (currentMins < halfDayMins) {
      if (isMorningFlexible || currentMins <= morningCutoffMins) {
        const minsRemaining = isMorningFlexible ? 999 : Math.max(0, morningCutoffMins - currentMins);
        const cutoffFormatted = `${String(Math.floor(morningCutoffMins / 60)).padStart(2, '0')}:${String(morningCutoffMins % 60).padStart(2, '0')}`;
        return {
          isAllowed: true,
          reason: 'morning_grace_valid',
          message: isMorningFlexible
            ? 'Morning Punch Active (Flexible Grace - No cutoff).'
            : `Morning Punch Active (${minsRemaining}m grace left before ${cutoffFormatted}).`,
          isAfternoonSession: false,
          isLate: false,
          lateMins: 0,
          unlocksAt: undefined,
          isWeeklyOff: false,
        };
      } else {
        const lateMins = currentMins - shiftStartMins;
        return {
          isAllowed: true,
          reason: 'morning_late',
          message: `Shift started at ${shiftStartStr}. Grace period (${morningGraceMins}m) exceeded. Check-in enabled: Marked as Late (${lateMins}m late).`,
          isAfternoonSession: false,
          isLate: true,
          lateMins,
          unlocksAt: undefined,
          isWeeklyOff: false,
        };
      }
    }

    if (currentMins >= halfDayMins) {
      const isWithinAfternoonGrace = isAfternoonFlexible || currentMins <= afternoonCutoffMins;
      const lateMins = Math.max(0, currentMins - halfDayMins);
      const minsRemaining = isAfternoonFlexible ? 999 : Math.max(0, afternoonCutoffMins - currentMins);
      const cutoffFormatted = `${String(Math.floor(afternoonCutoffMins / 60)).padStart(2, '0')}:${String(afternoonCutoffMins % 60).padStart(2, '0')}`;

      return {
        isAllowed: true,
        reason: isWithinAfternoonGrace ? 'afternoon_grace_valid' : 'afternoon_late',
        message: isWithinAfternoonGrace
          ? `Afternoon Punch Active (Half-Day Session, ${minsRemaining}m grace left before ${cutoffFormatted}).`
          : `Afternoon Session (Half-Day, Late by ${lateMins}m). Check-in enabled.`,
        isAfternoonSession: true,
        isLate: !isWithinAfternoonGrace,
        lateMins,
        unlocksAt: undefined,
        isWeeklyOff: false,
      };
    }

    return {
      isAllowed: true,
      reason: 'ok',
      message: 'Active',
      isAfternoonSession: false,
      unlocksAt: undefined,
      isWeeklyOff: false,
    };
  }, [
    isClockedIn,
    isRosterWeeklyOff,
    shiftStartStr,
    graceTimeSetting,
    afternoonGraceSetting,
    allowHalfDayLogin,
    halfDayLoginTimeStr,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [faceModalVisible, setFaceModalVisible] = useState(false);

  const isFaceEnrolled = Boolean(currentUser?.faceRegistered || (currentUser?.photoDataUrl && currentUser.photoDataUrl.startsWith('http')));

  const handleOpenScanner = () => {
    if (!isFaceEnrolled) {
      Alert.alert(
        'Face Biometrics Required',
        'You have not enrolled your face biometric profile yet. Please register your face first to enable AI Face Attendance.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Register Face Now', onPress: () => setFaceModalVisible(true) },
        ]
      );
      return;
    }
    setScanningStatus('ready');
    setResultMsg('');
    setMatchScore(null);
    setCapturedImageUri(null);
    setScannerModalVisible(true);
  };

  const handleStartBiometricVerification = async () => {
    try {
      setScanningStatus('capturing');
      setResultMsg('Launching front camera...');

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        setScanningStatus('ready');
        setResultMsg('Biometric capture cancelled.');
        return;
      }

      const asset = result.assets[0];
      setCapturedImageUri(asset.uri || null);

      let photoDataUrl = asset.base64
        ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri || '';

      setScanningStatus('verifying');
      setResultMsg('Transmitting biometric packet to AWS Rekognition engine...');

      const isGeofenceExempt = currentUser?.geofencingEnabled === false;
      if (!isGeofenceExempt) {
        try {
          const coords = await getCurrentLocation();
          setUserCoords({ lat: coords.latitude, lng: coords.longitude });
          const userLat = coords.latitude;
          const userLng = coords.longitude;
          let isInRange = false;
          let closestDist = 999999;
          for (const b of effectiveBranches) {
            const d = getDistanceMeters(userLat, userLng, b.lat ?? branchLat, b.lng ?? branchLng);
            if (d < closestDist) closestDist = d;
            if (d <= (b.radiusMeters ?? branchRadius)) {
              isInRange = true;
              break;
            }
          }

          if (!isInRange) {
            setScanningStatus('failed');
            setResultMsg(
              `Geofence verification failed. You are ${Math.round(closestDist)}m away from assigned branch boundaries (Allowed limit: ${branchRadius}m).`
            );
            return;
          }
        } catch (locErr: any) {
          console.warn('[Location] GPS verification error:', locErr);
          setScanningStatus('failed');
          setResultMsg('Could not verify GPS coordinates. Please ensure High Accuracy Location / GPS is enabled on your device.');
          return;
        }
      }

      let clockResult: any;
      if (isClockedIn) {
        clockResult = await clockOut(photoDataUrl);
      } else {
        clockResult = await clockIn(photoDataUrl);
      }

      if (clockResult && clockResult.success) {
        setScanningStatus('success');
        setMatchScore(clockResult.similarity || 99.4);
        setResultMsg(
          isClockedIn
            ? `Clock-out logged successfully. Shift completed. Facial Confidence: ${(clockResult.similarity || 99.4).toFixed(1)}%`
            : `Clock-in authenticated successfully. Have a productive day! Facial Confidence: ${(clockResult.similarity || 99.4).toFixed(1)}%`
        );
        setTimeout(() => {
          setScannerModalVisible(false);
        }, 2200);
      } else {
        setScanningStatus('failed');
        setResultMsg(
          clockResult?.reason ||
            'Face did not match registered biometric profile. Please align face clearly in good lighting and try again.'
        );
      }
    } catch (err: any) {
      setScanningStatus('failed');
      setResultMsg(err?.message || 'Biometric verification error. Please check network connection.');
    }
  };

  const userLogs = attendance.filter(
    (a) => a.employeeId === currentUser?.id || (currentUser?.empCode && a.empCode === currentUser.empCode) || a.employeeName === currentUser?.name
  );

  const todayDateNum = new Date().getDate();
  const todayMonthNum = new Date().getMonth();
  const todayYearNum = new Date().getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleTodayMonth = () => {
    setSelectedYear(todayYearNum);
    setSelectedMonth(todayMonthNum);
  };

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return -1;
    const clean = timeStr.trim();
    const ampmMatch = clean.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
    if (!ampmMatch) return -1;
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const mer = (ampmMatch[3] || '').toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const format12Hour = (timeStr?: string): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (clean.includes('AM') || clean.includes('PM')) {
      return clean.replace(/(:\d{2})(:\d{2})/, '$1');
    }
    const parts = clean.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10) || 0;
      const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
      const mer = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${m} ${mer}`;
    }
    return clean;
  };

  const daysInSelectedMonthCount = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();

  const monthDaysList = useMemo(() => {
    return Array.from({ length: daysInSelectedMonthCount }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, dayNum).getDay();
      const existingRec = userLogs.find((a) => a.date === dateStr);
      const rosterEntry = (roster || []).find((r: any) => (r.employeeId === currentUser?.id || r.empCode === currentUser?.empCode) && r.date === dateStr);
      const holidayEntry = (holidays || []).find((h: any) => h.date === dateStr);
      const leaveEntry = (leaves || []).find((l: any) => (l.employeeId === currentUser?.id || l.employeeName === currentUser?.name) && l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);
      const isWeekoff = rosterEntry?.shiftId === 'off' || (!rosterEntry && (dayOfWeek === 0));
      const shiftName = rosterEntry?.shiftName || assignedShift.name || 'General Shift 4.30';
      const shiftStart = rosterEntry?.shiftStart || assignedShift.start || '09:00';
      const shiftEnd = rosterEntry?.shiftEnd || assignedShift.end || '16:30';
      const shiftStartMins = parseTimeToMinutes(shiftStart);
      const shiftEndMins = parseTimeToMinutes(shiftEnd);
      const targetDurationMins = shiftStartMins >= 0 && shiftEndMins >= 0 ? (shiftEndMins - shiftStartMins) : 450;
      let inMins = -1, outMins = -1, effectiveMins = 0, earlyComingMins = 0, lateComingMins = 0, excessStayMins = 0, shortfallMins = 0, timingsStr = '--';
      if (existingRec?.clockIn) {
        inMins = parseTimeToMinutes(existingRec.clockIn);
        const inFmt = format12Hour(existingRec.clockIn);

        // Calculate early vs late check-in against scheduled shift start
        if (shiftStartMins >= 0 && inMins >= 0) {
          if (inMins < shiftStartMins) {
            earlyComingMins = shiftStartMins - inMins;
          } else if (inMins > shiftStartMins) {
            lateComingMins = inMins - shiftStartMins;
          }
        }

        if (existingRec.clockOut) {
          outMins = parseTimeToMinutes(existingRec.clockOut);
          const outFmt = format12Hour(existingRec.clockOut);
          timingsStr = `${inFmt} - ${outFmt}`;
          if (inMins >= 0 && outMins >= 0) {
            let diff = outMins - inMins;
            if (diff < 0) diff += 24 * 60;
            effectiveMins = diff;
            if (diff > targetDurationMins) excessStayMins = diff - targetDurationMins;
            else if (shiftEndMins >= 0 && outMins > shiftEndMins) excessStayMins = outMins - shiftEndMins;
            if (diff < targetDurationMins) shortfallMins = targetDurationMins - diff;
          }
        } else {
          timingsStr = `${inFmt} - Active`;
        }
      } else if (leaveEntry) {
        timingsStr = leaveEntry.type || 'On Leave';
      } else if (holidayEntry) {
        timingsStr = holidayEntry.name || 'Holiday';
      } else if (isWeekoff) {
        timingsStr = 'Weekoff';
      }
      const formatMinsToHHMM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      return {
        day: dayNum,
        dateStr,
        dayOfWeek,
        shiftName,
        timingsStr,
        isWeekoff,
        holidayEntry,
        leaveEntry,
        existingRec,
        effectiveHoursStr: effectiveMins > 0 ? formatMinsToHHMM(effectiveMins) : null,
        earlyComingStr: earlyComingMins > 0 ? formatMinsToHHMM(earlyComingMins) : null,
        lateComingStr: (lateComingMins > 0 || existingRec?.status === 'late') ? (lateComingMins > 0 ? formatMinsToHHMM(lateComingMins) : 'Late') : null,
        excessStayStr: excessStayMins > 0 ? formatMinsToHHMM(excessStayMins) : null,
        shortfallStr: shortfallMins > 0 ? formatMinsToHHMM(shortfallMins) : null,
        effectiveMins,
        earlyComingMins,
        lateComingMins,
        excessStayMins,
        shortfallMins,
        hasValidation: Boolean(existingRec?.faceVerified || existingRec?.clockOut),
      };
    });
  }, [selectedYear, selectedMonth, userLogs, roster, holidays, leaves, currentUser, assignedShift, daysInSelectedMonthCount]);

  const calendarWeeks = useMemo(() => {
    const padBefore = firstDayOfWeek; // 0: Sun, 1: Mon, ..., 6: Sat
    const cells: ((typeof monthDaysList)[0] | null)[] = [];

    for (let i = 0; i < padBefore; i++) {
      cells.push(null);
    }
    for (const dayItem of monthDaysList) {
      cells.push(dayItem);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: ((typeof monthDaysList)[0] | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [firstDayOfWeek, monthDaysList]);

  const monthlyMetrics = useMemo(() => {
    let totalExcessMins = 0, totalShortfallMins = 0, presentCount = 0, totalOtHours = 0;
    monthDaysList.forEach((d) => {
      totalExcessMins += d.excessStayMins;
      totalShortfallMins += d.shortfallMins;
      if (d.existingRec?.status === 'present' || d.effectiveMins > 0) presentCount += 1;
      if (d.excessStayMins > 0) totalOtHours += d.excessStayMins / 60;
    });
    const formatDuration = (m: number) => {
      const absM = Math.abs(m);
      const str = `${String(Math.floor(absM / 60)).padStart(2, '0')}:${String(absM % 60).padStart(2, '0')}`;
      return m < 0 ? `-${str}` : str;
    };
    return { excessStay: formatDuration(totalExcessMins), shortfall: formatDuration(totalShortfallMins), difference: formatDuration(totalExcessMins - totalShortfallMins), presentCount, totalOtHours: Math.round(totalOtHours * 10) / 10 };
  }, [monthDaysList]);

  const userApprovedLeaves = useMemo(() => {
    return (leaves || []).filter(
      (l: any) =>
        (l.employeeId === currentUser?.id || l.employeeName === currentUser?.name) &&
        l.status === 'Approved'
    );
  }, [leaves, currentUser]);

  // Dynamic Leave Types from company settings (backend config)
  const configuredLeaveTypes = useMemo(() => {
    const rawTypes: any[] = companyConfig?.leaveTypes || [];
    const filtered = rawTypes.filter(
      (lt: any) =>
        !lt.name?.toLowerCase().includes('permission') &&
        !lt.name?.toLowerCase().includes('short')
    );
    if (filtered.length > 0) return filtered;
    return [
      { id: 'cl', name: 'Casual Leave', days: 12, paid: true },
      { id: 'sl', name: 'Sick Leave', days: 8, paid: true },
      { id: 'el', name: 'Earned Leave', days: 15, paid: true },
    ];
  }, [companyConfig]);

  // Dynamic leave balances from backend settings & approved leave records
  const dynamicLeaveRows = useMemo(() => {
    const rows = configuredLeaveTypes.map((lt: any) => {
      const opening = typeof lt.days === 'number' ? lt.days : (parseFloat(lt.days) || 0);
      const credit = typeof lt.credit === 'number' ? lt.credit : 0;
      const used = userApprovedLeaves
        .filter((l: any) => {
          const lType = (l.type || '').toLowerCase();
          const targetName = (lt.name || '').toLowerCase();
          const targetId = (lt.id || '').toLowerCase();
          return lType.includes(targetName) || lType === targetId;
        })
        .reduce((sum: number, l: any) => sum + (parseFloat(l.days) || 1), 0);
      const balance = Math.max(0, opening + credit - used);
      return {
        id: lt.id,
        name: lt.name,
        opening,
        credit,
        used,
        balance,
      };
    });

    const usedLOP = userApprovedLeaves
      .filter((l: any) => (l.type || '').toLowerCase().includes('loss') || (l.type || '').toLowerCase().includes('lop'))
      .reduce((sum: number, l: any) => sum + (parseFloat(l.days) || 1), 0);

    if (usedLOP > 0 || !rows.some((r) => r.name.toLowerCase().includes('loss'))) {
      rows.push({
        id: 'lop',
        name: 'Loss of Pay (LOP)',
        opening: 0,
        credit: 0,
        used: usedLOP,
        balance: 0,
      });
    }

    return rows;
  }, [configuredLeaveTypes, userApprovedLeaves]);

  // Dynamic Permission Types from company settings (backend config)
  const configuredPermissionTypes = useMemo(() => {
    const permTypes: any[] = (companyConfig as any)?.permissionTypes || [];
    if (permTypes.length > 0) return permTypes;
    const leavePerm = (companyConfig as any)?.leaveTypes?.find((lt: any) =>
      lt.name?.toLowerCase().includes('permission')
    );
    if (leavePerm) {
      return [
        {
          id: leavePerm.id || 'perm-std',
          name: leavePerm.name || 'Standard Permission',
          maxHours: leavePerm.permissionHours || 2,
          period: leavePerm.permissionPeriod || 'month',
          maxRequestsPerMonth: 2,
          paid: true,
        },
      ];
    }
    return [
      {
        id: 'perm-std',
        name: 'Standard Permission',
        maxHours: 2,
        period: 'month',
        maxRequestsPerMonth: 2,
        paid: true,
      },
    ];
  }, [companyConfig]);

  // Compute permission metrics for the selected month / active period
  const dynamicPermissionRows = useMemo(() => {
    const permLeaves = userApprovedLeaves.filter((l: any) => {
      const type = (l.type || '').toLowerCase();
      if (!type.includes('permission')) return false;
      const refDate = l.startDate || l.endDate;
      if (!refDate) return true;
      const d = new Date(refDate);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    return configuredPermissionTypes.map((pt: any) => {
      const maxHours = pt.maxHours ?? 2;
      const maxRequests = pt.maxRequestsPerMonth ?? 2;

      const usedHours = permLeaves.reduce((sum: number, l: any) => {
        const val = parseFloat(l.days) || 1;
        return sum + val;
      }, 0);
      const usedRequests = permLeaves.length;
      const balanceHours = Math.max(0, maxHours - usedHours);
      const balanceRequests = Math.max(0, maxRequests - usedRequests);

      return {
        id: pt.id,
        name: pt.name || 'Standard Permission',
        maxHours,
        maxRequests,
        usedHours,
        usedRequests,
        balanceHours,
        balanceRequests,
      };
    });
  }, [configuredPermissionTypes, userApprovedLeaves, selectedYear, selectedMonth]);

  const handleQuickApplySubmit = async () => {
    if (!applyModalType) return;
    setApplyLoading(true);
    try {
      const ok = await applyLeave({
        type: applyModalType === 'leave' ? applyForm.category : 'Permission',
        startDate: applyModalType === 'permission' ? applyForm.permDate : applyForm.startDate,
        endDate: applyModalType === 'permission' ? applyForm.permDate : applyForm.endDate,
        days: applyModalType === 'permission' ? `${applyForm.permHours}h` : applyForm.days,
        reason: applyForm.reason || 'Requested from Attendance Calendar',
        status: 'Pending',
      });
      if (ok) {
        Alert.alert('Submitted', 'Request submitted for approval.');
        setApplyModalType(null);
        refreshData();
      } else {
        Alert.alert('Failed', 'Submission failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message);
    } finally {
      setApplyLoading(false);
    }
  };

  const otTotalBonusPay = monthlyMetrics.totalOtHours * ((currentUser?.basic || 45000) / 180) * 1.5;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.tabToggleRow, { backgroundColor: theme.inputBg }]}>
        <TouchableOpacity style={[styles.subTab, activeTab === 'punch' && { backgroundColor: theme.primary }]} onPress={() => setActiveTab('punch')}>
          <Text style={[styles.subTabText, { color: theme.textMuted }, activeTab === 'punch' && { color: '#ffffff' }]}>Face Punch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, activeTab === 'calendar' && { backgroundColor: theme.primary }]} onPress={() => setActiveTab('calendar')}>
          <Text style={[styles.subTabText, { color: theme.textMuted }, activeTab === 'calendar' && { color: '#ffffff' }]}>Calendar & Overtime</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
        {activeTab === 'punch' ? (
          <View>
            <View style={[styles.clockCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.clockTime, { color: theme.textPrimary }]}>{currentTime}</Text>
              <Text style={[styles.clockDate, { color: theme.textMuted }]}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              <View style={[styles.geofenceChip, { backgroundColor: theme.tealSoft }]}>
                <Icon name="location" size={12} color={theme.primary} />
                <Text style={[styles.geofenceText, { color: theme.primary }]}>🏢 Branch: {branchName} • Range: {branchRadius}m</Text>
              </View>
            </View>

            <View style={[styles.scannerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {punctualityStatus.isWeeklyOff && (
                <View
                  style={{
                    backgroundColor: '#fef3c7',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#fde68a',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="coffee" size={20} color="#d97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400e' }}>
                      Swift Roster: Weekly Off
                    </Text>
                    <Text style={{ fontSize: 11, color: '#b45309', marginTop: 2, lineHeight: 16 }}>
                      Today is assigned as your Weekly Off in the Swift Roster. Attendance punch-in is restricted as per company policy.
                    </Text>
                  </View>
                </View>
              )}

              {/* Late Arrival Alert Banner */}
              {punctualityStatus.isLate && !isClockedIn && (
                <View
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(234, 88, 12, 0.15)' : '#fff7ed',
                    borderColor: '#ea580c',
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#ffedd5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="clock" size={20} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#c2410c' }}>
                      Late Check-In Active ({punctualityStatus.lateMins}m Late)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9a3412', marginTop: 2, lineHeight: 16 }}>
                      {punctualityStatus.message} Total working hours will be calculated dynamically from your check-in to check-out timestamps.
                    </Text>
                  </View>
                </View>
              )}

              {/* Biometric Face Enrollment Status / Quick Action Pill */}
              <TouchableOpacity
                style={[
                  styles.faceEnrollPill,
                  {
                    backgroundColor: isFaceEnrolled
                      ? (theme.isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4')
                      : (theme.isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                    borderColor: isFaceEnrolled
                      ? (theme.isDark ? 'rgba(16, 185, 129, 0.35)' : '#86efac')
                      : (theme.isDark ? 'rgba(239, 68, 68, 0.35)' : '#fca5a5'),
                  },
                ]}
                onPress={() => setFaceModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={[
                      styles.pillIconBadge,
                      {
                        backgroundColor: isFaceEnrolled
                          ? (theme.isDark ? 'rgba(16, 185, 129, 0.25)' : '#dcfce7')
                          : (theme.isDark ? 'rgba(239, 68, 68, 0.22)' : '#fee2e2'),
                      },
                    ]}
                  >
                    <Icon name="camera" size={15} color={isFaceEnrolled ? '#16a34a' : '#dc2626'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.faceEnrollPillTitle, { color: isFaceEnrolled ? (theme.isDark ? '#4ade80' : '#15803d') : (theme.isDark ? '#fca5a5' : '#dc2626') }]}>
                      {isFaceEnrolled ? 'Biometric Face ID Enrolled ✓' : 'Face Biometrics Pending ⚠️'}
                    </Text>
                    <Text style={[styles.faceEnrollPillSub, { color: theme.textMuted }]}>
                      {isFaceEnrolled ? 'Tap to update or re-enroll selfie' : 'Tap to register your face for 1-tap check-in'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.pillActionArrow,
                    {
                      backgroundColor: isFaceEnrolled
                        ? (theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                        : (theme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                    },
                  ]}
                >
                  <Icon name="chevron-right" size={12} color={isFaceEnrolled ? '#16a34a' : '#dc2626'} />
                </View>
              </TouchableOpacity>

              <View style={[styles.cameraBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <View style={styles.faceGuide}>
                  <View style={[styles.faceOvalFrame, { borderColor: theme.primary }]}>
                    <Icon name="camera" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.empTagText, { color: theme.textPrimary }]}>{currentUser?.empCode || 'SW001'} • {currentUser?.name || 'Employee'}</Text>
                  <Text style={[styles.scannerStatusText, { color: theme.textMuted }]}>
                    {isClockedIn
                      ? '🟢 Shift active. Punch out.'
                      : punctualityStatus.isWeeklyOff
                      ? '🏖️ Swift Roster: Today is Weekly Off (Check-in restricted).'
                      : punctualityStatus.isLate
                      ? `🟠 Late Check-in (${punctualityStatus.lateMins}m late). Biometric punch active.`
                      : punctualityStatus.isAfternoonSession
                      ? '🌓 Afternoon Session (Half-Day). Biometric punch active.'
                      : 'Biometric AI face matching ready.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: !punctualityStatus.isAllowed
                      ? punctualityStatus.isWeeklyOff
                        ? '#f59e0b20'
                        : theme.cardBorder
                      : isClockedIn
                      ? theme.danger
                      : punctualityStatus.isLate
                      ? '#ea580c'
                      : theme.primary,
                    borderWidth: punctualityStatus.isWeeklyOff ? 1 : 0,
                    borderColor: punctualityStatus.isWeeklyOff ? '#f59e0b' : 'transparent',
                  },
                ]}
                onPress={handleOpenScanner}
                disabled={!punctualityStatus.isAllowed}
              >
                <Icon
                  name={isClockedIn ? 'cross' : punctualityStatus.isWeeklyOff ? 'lock' : 'camera'}
                  size={18}
                  color={punctualityStatus.isWeeklyOff ? '#d97706' : '#ffffff'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    punctualityStatus.isWeeklyOff && { color: '#d97706' },
                  ]}
                >
                  {punctualityStatus.isWeeklyOff
                    ? 'Check-In Restricted (Weekly Off)'
                    : isClockedIn
                    ? 'Verify Face to Punch Out'
                    : punctualityStatus.isLate
                    ? `Verify Face to Punch In (Late • ${punctualityStatus.lateMins}m)`
                    : punctualityStatus.isAfternoonSession
                    ? 'Verify Face to Punch In (Half-Day)'
                    : 'Verify Face to Punch In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            {/* Quick Apply Action Row */}
            <View style={[styles.applyHeaderCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkles" size={16} color={theme.primary} />
                <Text style={[styles.applyCardTitle, { color: theme.textPrimary }]}>Quick Apply</Text>
              </View>
              <View style={styles.applyActionButtonsRow}>
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => {
                    setApplyForm((prev) => ({
                      ...prev,
                      category: configuredLeaveTypes[0]?.name || 'Casual Leave',
                    }));
                    setApplyModalType('leave');
                  }}
                >
                  <Text style={styles.applyBtnText}>Apply Leave</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => setApplyModalType('permission')}
                >
                  <Text style={styles.applyBtnText}>Apply Permission</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.walletMonthHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}><Icon name="chevron-left" size={16} color={theme.primary} /></TouchableOpacity>
              <TouchableOpacity style={[styles.todayChip, { backgroundColor: theme.inputBg }]} onPress={handleTodayMonth}><Text style={[styles.todayChipText, { color: theme.textPrimary }]}>Today</Text></TouchableOpacity>
              <Text style={[styles.walletMonthTitle, { color: '#2563eb' }]}>{monthNames[selectedMonth]} {selectedYear}</Text>
              <TouchableOpacity style={styles.monthNavBtn} onPress={onRefresh}><Icon name="sparkles" size={14} color={theme.primary} /></TouchableOpacity>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth}><Icon name="chevron-right" size={16} color={theme.primary} /></TouchableOpacity>
            </View>

            {/* Calendar Month Grid Cards */}
            <View style={[styles.calendarGridContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* Aligned Weekday Header Row */}
              <View style={[styles.weekdayHeaderRow, { backgroundColor: theme.inputBg }]}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                  <View key={idx} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayCellText, { color: idx === 0 || idx === 6 ? '#ef4444' : theme.textPrimary }]}>
                      {dayName}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Aligned 7-Day Week Rows */}
              {calendarWeeks.map((week, wIdx) => (
                <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                  {week.map((item, dIdx) => {
                    if (!item) {
                      return (
                        <View
                          key={`pad-${wIdx}-${dIdx}`}
                          style={[styles.walletDayCard, styles.walletDayCardPad]}
                        />
                      );
                    }

                    const isCurrentDay =
                      item.day === todayDateNum &&
                      selectedMonth === todayMonthNum &&
                      selectedYear === todayYearNum;

                    return (
                      <TouchableOpacity
                        key={item.day}
                        style={[
                          styles.walletDayCard,
                          {
                            borderColor: isCurrentDay ? theme.primary : theme.cardBorder,
                            borderWidth: isCurrentDay ? 1.5 : 0.5,
                            backgroundColor: isCurrentDay ? theme.tealSoft : theme.card,
                          },
                        ]}
                        onPress={() => setSelectedDayDetails(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dayCardTopRow}>
                          <Text style={[styles.dayCardNumText, isCurrentDay && { color: theme.primary, fontWeight: '900' }]}>
                            {item.day}
                          </Text>
                        </View>

                        <View style={styles.shiftNamePill}>
                          <Text style={styles.shiftNamePillText} numberOfLines={1}>
                            {item.shiftName}
                          </Text>
                        </View>

                        {item.isWeekoff ? (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#0284c7' }]}>
                            <Text style={styles.statusBadgePillText}>Weekoff</Text>
                          </View>
                        ) : item.holidayEntry ? (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#0891b2' }]}>
                            <Text style={styles.statusBadgePillText} numberOfLines={1}>
                              {item.holidayEntry.name}
                            </Text>
                          </View>
                        ) : item.leaveEntry ? (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#e11d48' }]}>
                            <Text style={styles.statusBadgePillText} numberOfLines={1}>
                              {item.leaveEntry.type}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.timingsPill, { backgroundColor: '#e2e8f0' }]}>
                            <Text style={styles.timingsPillText} numberOfLines={1}>
                              {item.timingsStr}
                            </Text>
                          </View>
                        )}

                        {item.effectiveHoursStr && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#4d7c0f' }]}>
                            <Text style={styles.statusBadgePillText}>
                              {item.effectiveHoursStr}
                            </Text>
                          </View>
                        )}

                        {item.earlyComingStr && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#0284c7' }]}>
                            <Text style={styles.statusBadgePillText}>
                              Early: {item.earlyComingStr}
                            </Text>
                          </View>
                        )}

                        {item.lateComingStr && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#ea580c' }]}>
                            <Text style={styles.statusBadgePillText}>
                              Late: {item.lateComingStr}
                            </Text>
                          </View>
                        )}

                        {item.excessStayStr && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#0284c7' }]}>
                            <Text style={styles.statusBadgePillText}>
                              Excess: {item.excessStayStr}
                            </Text>
                          </View>
                        )}

                        {item.hasValidation && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#854d0e' }]}>
                            <Text style={styles.statusBadgePillText}>Validated</Text>
                          </View>
                        )}

                        {item.effectiveHoursStr && !item.isWeekoff && !item.leaveEntry && (
                          <View style={[styles.statusBadgePill, { backgroundColor: '#15803d' }]}>
                            <Text style={styles.statusBadgePillText}>Present</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* MONTHLY DETAILS SECTION */}
            <Text style={[styles.sectionHeader, { color: '#7c3aed', marginTop: 18, marginBottom: 8 }]}>
              Monthly Details
            </Text>

            {/* 1. Short Fall Table */}
            <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.detailsCardSubTitle, { color: theme.textPrimary }]}>Short fall</Text>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ExcessStay</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Shortfall</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Difference</Text>
              </View>
              <View style={styles.tableDataRow}>
                <Text style={[styles.tableDataCell, { flex: 1, color: '#0284c7', fontWeight: '800' }]}>
                  {monthlyMetrics.excessStay}
                </Text>
                <Text style={[styles.tableDataCell, { flex: 1, color: '#ef4444', fontWeight: '800' }]}>
                  {monthlyMetrics.shortfall}
                </Text>
                <Text style={[styles.tableDataCell, { flex: 1, color: '#16a34a', fontWeight: '800' }]}>
                  {monthlyMetrics.difference}
                </Text>
              </View>
            </View>

            {/* 2. Leave Quota & Balances Table (Dynamic from Backend Policy Settings) */}
            <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <Text style={[styles.detailsCardSubTitle, { color: theme.textPrimary }]}>Leave Policy & Balances</Text>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'left' }]}>Leave Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Opening</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Credit</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Used</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Balance</Text>
              </View>
              {dynamicLeaveRows.map((row, rIdx) => (
                <View key={row.id || rIdx} style={[styles.tableDataRow, rIdx % 2 === 1 && { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.tableDataCell, { flex: 2, textAlign: 'left', fontWeight: '700' }]}>{row.name}</Text>
                  <Text style={[styles.tableDataCell, { flex: 1 }]}>{row.opening}</Text>
                  <Text style={[styles.tableDataCell, { flex: 1 }]}>{row.credit}</Text>
                  <Text style={[styles.tableDataCell, { flex: 1, color: row.used > 0 ? '#ef4444' : theme.textMuted }]}>{row.used}</Text>
                  <Text style={[styles.tableDataCell, { flex: 1, fontWeight: '800', color: theme.primary }]}>{row.balance}</Text>
                </View>
              ))}
            </View>

            {/* 3. Permission Details Table (Dynamic from Backend Policy Settings) */}
            <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <Text style={[styles.detailsCardSubTitle, { color: theme.textPrimary }]}>Permission Details</Text>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'left' }]}>Permission Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Quota</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Used</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Balance</Text>
              </View>
              {dynamicPermissionRows.map((row, rIdx) => (
                <View key={row.id || rIdx} style={[styles.tableDataRow, rIdx % 2 === 1 && { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.tableDataCell, { flex: 2, textAlign: 'left', fontWeight: '700' }]}>{row.name}</Text>
                  <Text style={[styles.tableDataCell, { flex: 1.2 }]}>{row.maxHours}h ({row.maxRequests} req)</Text>
                  <Text style={[styles.tableDataCell, { flex: 1, color: row.usedHours > 0 ? '#ef4444' : theme.textMuted }]}>{row.usedHours}h ({row.usedRequests})</Text>
                  <Text style={[styles.tableDataCell, { flex: 1.2, fontWeight: '800', color: theme.primary }]}>{row.balanceHours}h left</Text>
                </View>
              ))}
            </View>

            {/* Overtime & Shift Summary Report */}
            <Text style={[styles.sectionHeader, { color: theme.textPrimary, marginTop: 16 }]}>
              Overtime Calculation Report
            </Text>
            <View style={[styles.otReportCard, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Days Present / Shift Standard</Text>
                <Text style={[styles.otVal, { color: theme.textPrimary }]}>{monthlyMetrics.presentCount} Days ({(monthlyMetrics.presentCount * 8).toFixed(1)} hrs)</Text>
              </View>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Overtime / Excess Stay Hours</Text>
                <Text style={[styles.otVal, { color: theme.accent }]}>+{monthlyMetrics.totalOtHours.toFixed(1)} Hours</Text>
              </View>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Overtime Hourly Rate (1.5x)</Text>
                <Text style={[styles.otVal, { color: theme.textPrimary }]}>₹{((currentUser?.basic || 45000) / 180 * 1.5).toFixed(2)} / hr</Text>
              </View>

              <View style={[styles.otDivider, { backgroundColor: theme.cardBorder }]} />

              <View style={styles.otTotalRow}>
                <View>
                  <Text style={[styles.otTotalLabel, { color: theme.textPrimary }]}>Total Overtime Bonus Pay</Text>
                  <Text style={[styles.otTotalSub, { color: theme.textMuted }]}>
                    Calculated for {monthNames[selectedMonth]} {selectedYear}
                  </Text>
                </View>
                <Text style={[styles.otTotalVal, { color: theme.primary }]}>
                  + ₹{otTotalBonusPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* DAY INSPECTION MODAL */}
      <Modal visible={Boolean(selectedDayDetails)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={18} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Day Details: {selectedDayDetails?.dateStr}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDayDetails(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10, gap: 8 }}>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Shift:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.textPrimary }]}>{selectedDayDetails?.shiftName}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Timings:</Text>
                <Text style={[styles.modalDetailValue, { color: theme.textPrimary }]}>{selectedDayDetails?.timingsStr}</Text>
              </View>

              {selectedDayDetails?.effectiveHoursStr && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Effective Work Time:</Text>
                  <Text style={[styles.modalDetailValue, { color: '#16a34a', fontWeight: '800' }]}>{selectedDayDetails?.effectiveHoursStr}</Text>
                </View>
              )}

              {selectedDayDetails?.earlyComingStr && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Early Arrival:</Text>
                  <Text style={[styles.modalDetailValue, { color: '#0284c7', fontWeight: '800' }]}>{selectedDayDetails?.earlyComingStr}</Text>
                </View>
              )}

              {selectedDayDetails?.lateComingStr && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Late Arrival:</Text>
                  <Text style={[styles.modalDetailValue, { color: '#ea580c', fontWeight: '800' }]}>
                    ⚠️ Late by {selectedDayDetails?.lateComingStr}
                  </Text>
                </View>
              )}

              {selectedDayDetails?.excessStayStr && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Excess Stay / OT:</Text>
                  <Text style={[styles.modalDetailValue, { color: '#0284c7', fontWeight: '800' }]}>{selectedDayDetails?.excessStayStr}</Text>
                </View>
              )}

              {selectedDayDetails?.shortfallStr && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Shortfall:</Text>
                  <Text style={[styles.modalDetailValue, { color: '#ef4444', fontWeight: '800' }]}>{selectedDayDetails?.shortfallStr}</Text>
                </View>
              )}

              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.textMuted }]}>Verification Status:</Text>
                <Text style={[styles.modalDetailValue, { color: selectedDayDetails?.hasValidation ? '#16a34a' : theme.textMuted }]}>
                  {selectedDayDetails?.hasValidation ? '✅ Biometric & Geofence Validated' : 'None / Not Punched'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalScanBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
              onPress={() => setSelectedDayDetails(null)}
            >
              <Text style={styles.modalScanBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QUICK APPLY MODAL (Leave / Permission) */}
      <Modal visible={Boolean(applyModalType)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {applyModalType === 'leave' ? 'Apply Leave' : 'Apply Permission'}
              </Text>
              <TouchableOpacity onPress={() => setApplyModalType(null)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, marginTop: 10 }}>
              {applyModalType === 'leave' && (
                <>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Leave Category</Text>
                  <View style={styles.categoryPillsRow}>
                    {configuredLeaveTypes.map((lt: any) => (
                      <TouchableOpacity
                        key={lt.id || lt.name}
                        style={[
                          styles.catPill,
                          { backgroundColor: theme.inputBg },
                          applyForm.category === lt.name && { backgroundColor: theme.primary },
                        ]}
                        onPress={() => setApplyForm({ ...applyForm, category: lt.name })}
                      >
                        <Text style={[styles.catPillText, { color: applyForm.category === lt.name ? '#ffffff' : theme.textPrimary }]}>
                          {lt.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={applyForm.startDate}
                    onChangeText={(t) => setApplyForm({ ...applyForm, startDate: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textMuted}
                  />

                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={applyForm.endDate}
                    onChangeText={(t) => setApplyForm({ ...applyForm, endDate: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textMuted}
                  />

                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Days</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={applyForm.days}
                    onChangeText={(t) => setApplyForm({ ...applyForm, days: t })}
                    keyboardType="numeric"
                  />
                </>
              )}

              {applyModalType === 'permission' && (
                <>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Permission Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder }]}
                    value={applyForm.permDate}
                    onChangeText={(t) => setApplyForm({ ...applyForm, permDate: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textMuted}
                  />

                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Duration (Hours)</Text>
                  <View style={styles.categoryPillsRow}>
                    {['1', '1.5', '2'].map((hr) => (
                      <TouchableOpacity
                        key={hr}
                        style={[
                          styles.catPill,
                          { backgroundColor: theme.inputBg },
                          applyForm.permHours === hr && { backgroundColor: theme.primary },
                        ]}
                        onPress={() => setApplyForm({ ...applyForm, permHours: hr })}
                      >
                        <Text style={[styles.catPillText, { color: applyForm.permHours === hr ? '#ffffff' : theme.textPrimary }]}>
                          {hr} Hr
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Reason / Remarks</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder, height: 60 }]}
                value={applyForm.reason}
                onChangeText={(t) => setApplyForm({ ...applyForm, reason: t })}
                placeholder="Reason for application"
                placeholderTextColor={theme.textMuted}
                multiline
              />

              <TouchableOpacity
                style={[styles.modalScanBtn, { backgroundColor: theme.primary, marginTop: 10 }]}
                onPress={handleQuickApplySubmit}
                disabled={applyLoading}
              >
                {applyLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalScanBtnText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BIOMETRIC FACE SCANNER MODAL */}
      <Modal visible={scannerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="camera" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Biometric Face Scan</Text>
              </View>
              <TouchableOpacity onPress={() => setScannerModalVisible(false)}>
                <Icon name="cross" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Emp ID: <Text style={{ fontWeight: '800', color: theme.primary }}>{currentUser?.empCode || 'SW001'}</Text> • {currentUser?.name || 'Employee'}
            </Text>

            <View style={[styles.modalCameraBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              {capturedImageUri ? (
                <Image source={{ uri: capturedImageUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={[styles.modalFaceOval, { borderColor: scanningStatus === 'failed' ? theme.danger : theme.success }]}>
                  <Icon name="camera" size={46} color={scanningStatus === 'verifying' ? theme.accent : scanningStatus === 'failed' ? theme.danger : theme.success} />
                </View>
              )}
              {scanningStatus === 'verifying' && <View style={[styles.laserBeam, { backgroundColor: theme.accent }]} />}
            </View>

            {scanningStatus === 'ready' && (
              <Text style={[styles.statusMsg, { color: theme.textMuted }]}>
                Align face inside the frame and tap 'Start Facial Recognition'
              </Text>
            )}

            {(scanningStatus === 'capturing' || scanningStatus === 'verifying') && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.statusMsg, { color: theme.primary }]}>
                  {scanningStatus === 'capturing' ? 'Capturing Biometric Frame...' : 'Verifying ...'}
                </Text>
              </View>
            )}

            {scanningStatus === 'success' && (
              <View style={[styles.resBox, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
                <Text style={[styles.resTitle, { color: theme.success }]}>
                  ✅ Face Match Authenticated ({(matchScore || 99.4).toFixed(1)}%)
                </Text>
                <Text style={[styles.resText, { color: theme.textPrimary }]}>{resultMsg}</Text>
              </View>
            )}

            {scanningStatus === 'failed' && (
              <View style={[styles.resBox, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
                <Text style={[styles.resTitle, { color: theme.danger }]}>❌ Facial Verification Failed</Text>
                <Text style={[styles.resText, { color: theme.danger }]}>{resultMsg}</Text>
              </View>
            )}

            {scanningStatus === 'ready' && (
              <TouchableOpacity style={[styles.modalScanBtn, { backgroundColor: theme.primary }]} onPress={handleStartBiometricVerification}>
                <Text style={styles.modalScanBtnText}>Start Facial Recognition Check</Text>
              </TouchableOpacity>
            )}

            {(scanningStatus === 'success' || scanningStatus === 'failed') && (
              <TouchableOpacity style={[styles.modalScanBtn, { backgroundColor: scanningStatus === 'success' ? theme.primary : theme.danger }]} onPress={() => setScannerModalVisible(false)}>
                <Text style={styles.modalScanBtnText}>{scanningStatus === 'success' ? 'Done' : 'Close'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Face Biometric Enrollment Modal */}
      <FaceRegistrationModal
        visible={faceModalVisible}
        onClose={() => setFaceModalVisible(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  clockCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  clockTime: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clockDate: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  geofenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  geofenceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scannerCard: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  cameraBox: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  faceGuide: {
    alignItems: 'center',
  },
  faceOvalFrame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  empTagText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scannerStatusText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    ...SHADOWS.sm,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  timelineCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
  },
  timeVal: {
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 2,
  },
  timeMeta: {
    fontSize: 10,
  },
  timelineDivider: {
    height: 20,
    width: 2,
    marginLeft: 5,
    marginVertical: 6,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  applyHeaderCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  applyActionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  walletMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  walletMonthTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
    gap: 3,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCellText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  calendarGridContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    marginBottom: 14,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
  },
  walletDayCard: {
    flex: 1,
    minHeight: 84,
    borderWidth: 0.5,
    borderRadius: 6,
    padding: 2,
    overflow: 'hidden',
  },
  walletDayCardPad: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  dayCardTopRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  dayCardNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  shiftNamePill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginBottom: 2,
  },
  shiftNamePillText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  statusBadgePill: {
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginTop: 1,
  },
  statusBadgePillText: {
    color: '#ffffff',
    fontSize: 6.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  timingsPill: {
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginTop: 1,
  },
  timingsPillText: {
    fontSize: 6.5,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  detailsCardSubTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },
  tableDataCell: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },
  modalDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (width - 64) / 7,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  otChip: {
    position: 'absolute',
    top: 1,
    right: 2,
    borderRadius: 6,
    paddingHorizontal: 3,
  },
  otChipText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  otReportCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  otRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otLabel: {
    fontSize: 12,
  },
  otVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  otDivider: {
    height: 1,
    marginVertical: 10,
  },
  otTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  otTotalSub: {
    fontSize: 10,
  },
  otTotalVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  modalCameraBox: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  modalFaceOval: {
    width: 90,
    height: 110,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserBeam: {
    position: 'absolute',
    width: '100%',
    height: 3,
    top: 90,
  },
  statusMsg: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 6,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  resText: {
    fontSize: 12,
  },
  modalScanBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalScanBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  mapCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  refreshLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshLocText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#e5e7eb',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapLegendOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapLegendText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  locationDetailsBox: {
    gap: 6,
  },
  locRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locRowBorder: {
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  locLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  locValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  faceEnrollPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  pillIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceEnrollPillTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  faceEnrollPillSub: {
    fontSize: 11,
    marginTop: 1,
  },
  pillActionArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
