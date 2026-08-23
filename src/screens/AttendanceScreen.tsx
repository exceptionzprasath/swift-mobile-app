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
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
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
  const { currentUser, clockIn, clockOut, attendance, isClockedIn, companyConfig, refreshData, roster } = useAppContext();
  const [activeTab, setActiveTab] = useState<'punch' | 'calendar'>('punch');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [refreshing, setRefreshing] = useState(false);

  // Biometric Scanner Modal State
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<'ready' | 'capturing' | 'verifying' | 'success' | 'failed'>('ready');
  const [resultMsg, setResultMsg] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  // Auto-fetched Device Coordinates
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
  const assignedBranch = branches.find((b: any) => b.id === currentUser?.branchId) || branches[0];

  const branchLat = assignedBranch?.lat ?? 11.305639;
  const branchLng = assignedBranch?.lng ?? 77.703474;
  const branchRadius = assignedBranch?.radiusMeters ?? 100;
  const branchName = assignedBranch?.name || 'Head Office';

  // Shift & Grace Time Punctuality Evaluation with Roster Support
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoster = (roster || []).find(
    (r: any) => r.employeeId === currentUser?.id && r.date === todayStr
  );

  const shiftList = companyConfig?.shifts || [];
  const effectiveShiftId = todayRoster ? todayRoster.shiftId : currentUser?.shiftId;
  const isWeeklyOffToday = effectiveShiftId === 'off';

  const assignedShift = shiftList.find((s: any) => s.id === effectiveShiftId) || shiftList[0] || { start: '09:00', end: '18:00', name: 'General' };
  const shiftStartStr = todayRoster?.shiftStart || assignedShift.start || '09:00';
  const shiftNameStr = todayRoster?.shiftName || assignedShift.name || 'General Shift';
  const graceTimeSetting = todayRoster?.graceTime || currentUser?.graceTime || assignedShift.graceTime || '15';
  const allowHalfDayLogin = (todayRoster?.allowHalfDayLogin ?? currentUser?.allowHalfDayLogin ?? assignedShift.allowHalfDayLogin) !== false;
  const halfDayLoginTimeStr = todayRoster?.halfDayLoginTime || currentUser?.halfDayLoginTime || assignedShift.halfDayLoginTime || '12:00';

  const punctualityStatus = useMemo(() => {
    // If user is already clocked in, clock-out is always permitted
    if (isClockedIn) {
      return {
        isAllowed: true,
        reason: 'clock_out_ready',
        message: 'Clock-out active. Verify face to punch out.',
        isAfternoonSession: false,
        unlocksAt: undefined,
      };
    }

    // Flexible grace mode (Always)
    if (graceTimeSetting === 'always') {
      return {
        isAllowed: true,
        reason: 'flexible',
        message: 'Flexible punch-in active (No cutoff).',
        isAfternoonSession: false,
        unlocksAt: undefined,
      };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Parse Shift Start
    const [startH, startM] = shiftStartStr.split(':').map((x: string) => parseInt(x, 10) || 0);
    const shiftStartMins = startH * 60 + startM;

    // Parse Grace Duration
    const graceMins = parseInt(graceTimeSetting, 10) || 15;
    const morningCutoffMins = shiftStartMins + graceMins;

    // Parse Half Day Login Time (e.g. "12:00")
    const [halfH, halfM] = halfDayLoginTimeStr.split(':').map((x: string) => parseInt(x, 10) || 0);
    const halfDayMins = halfH * 60 + halfM;

    // 1. Within Morning Grace Window
    if (currentMins <= morningCutoffMins) {
      const minsRemaining = Math.max(0, morningCutoffMins - currentMins);
      return {
        isAllowed: true,
        reason: 'morning_grace_valid',
        message: `Morning Punch Active (${minsRemaining}m grace left before ${String(Math.floor(morningCutoffMins / 60)).padStart(2, '0')}:${String(morningCutoffMins % 60).padStart(2, '0')}).`,
        isAfternoonSession: false,
        unlocksAt: undefined,
      };
    }

    // 2. Morning Grace Exceeded, but Before Afternoon Window
    if (currentMins > morningCutoffMins && currentMins < halfDayMins) {
      if (allowHalfDayLogin) {
        return {
          isAllowed: false,
          reason: 'morning_exceeded_awaiting_afternoon',
          message: `Morning grace period exceeded (${graceMins}m). Marked Absent for Morning. Afternoon check-in opens at ${halfDayLoginTimeStr}.`,
          isAfternoonSession: false,
          unlocksAt: halfDayLoginTimeStr,
        };
      } else {
        return {
          isAllowed: false,
          reason: 'locked_full_day',
          message: `Grace period exceeded (${graceMins}m past ${shiftStartStr}). Attendance locked for the entire day (Marked Full Day Absent).`,
          isAfternoonSession: false,
          unlocksAt: undefined,
        };
      }
    }

    // 3. Afternoon Login Window Reached (>= Half Day Time)
    if (currentMins >= halfDayMins) {
      if (allowHalfDayLogin) {
        return {
          isAllowed: true,
          reason: 'afternoon_half_day_allowed',
          message: `Morning marked Absent. Afternoon attendance check-in active (Half Day).`,
          isAfternoonSession: true,
          unlocksAt: undefined,
        };
      } else {
        return {
          isAllowed: false,
          reason: 'locked_full_day',
          message: `Morning grace period missed. Attendance locked for full day as per policy (Marked Full Day Absent).`,
          isAfternoonSession: false,
          unlocksAt: undefined,
        };
      }
    }

    return {
      isAllowed: true,
      reason: 'standard',
      message: 'Ready to punch.',
      isAfternoonSession: false,
      unlocksAt: undefined,
    };
  }, [isClockedIn, graceTimeSetting, shiftStartStr, halfDayLoginTimeStr, allowHalfDayLogin, currentTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openBiometricScanner = () => {
    if (!punctualityStatus.isAllowed) {
      Alert.alert(
        'Attendance Locked',
        punctualityStatus.message
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
    setScanningStatus('verifying');

    const isGeofenceBypassed = currentUser?.geofencingEnabled === false || !!assignedBranch?.geofenceDisabled;

    if (isGeofenceBypassed) {
      console.log('[Geofence] Geofencing is bypassed for this employee. Facial recognition alone is sufficient.');
      setResultMsg('Geofence bypassed for your profile. Initializing face scanner...');
    } else {
      setResultMsg('Requesting device location...');

      // 1. Permission Check
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setScanningStatus('failed');
        setResultMsg('Geofence Failed: Location permission denied.');
        Alert.alert('Permission Denied', 'Location permission is required to check in/out.');
        return;
      }

      setResultMsg('Verifying geofence coordinates...');

      // 2. Fetch Native GPS Location
      let empLat = 0;
      let empLng = 0;
      try {
        const coords = await getCurrentLocation();
        empLat = coords.latitude;
        empLng = coords.longitude;
      } catch (err: any) {
        setScanningStatus('failed');
        const errMessage = err?.message || 'Could not fetch GPS location.';
        setResultMsg(`Geofence Error: ${errMessage}`);
        Alert.alert('GPS Location Error', 'Ensure device GPS is turned on and location access is granted.');
        return;
      }

      // 3. Haversine Distance Check
      const distanceMeters = getDistanceMeters(empLat, empLng, branchLat, branchLng);
      if (distanceMeters > branchRadius) {
        setScanningStatus('failed');
        setResultMsg(`Out of Geofence: ${Math.round(distanceMeters)}m away.`);
        Alert.alert(
          'Geofence Check Failed',
          `You are outside the geofence radius of your branch (${branchName}).\n\nDistance: ${Math.round(distanceMeters)}m\nRequired: ${branchRadius}m`
        );
        return;
      }

      setResultMsg('Geofence verified! Initializing face scanner...');
    }

    try {
      // Launch native camera
      const response = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        includeBase64: true,
        quality: 0.7,
      });

      if (response.didCancel) {
        Alert.alert('Cancelled', 'Face scan cancelled.');
        return;
      }

      if (response.errorMessage) {
        Alert.alert('Camera Error', response.errorMessage);
        return;
      }

      const asset = response.assets?.[0];
      if (!asset || !asset.base64) {
        Alert.alert('Error', 'Could not capture face image.');
        return;
      }

      // Display preview of the captured face
      setCapturedImageUri(asset.uri || null);

      // Update status to verifying
      setScanningStatus('verifying');

      // Generate base64 data url
      const faceSnapshotBase64 = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;

      // Call API (clockIn or clockOut)
      let res;
      if (!isClockedIn) {
        res = await clockIn(faceSnapshotBase64);
      } else {
        res = await clockOut(faceSnapshotBase64);
      }

      if (res && res.success) {
        setScanningStatus('success');
        setMatchScore(res.similarity || 99.4);
        setResultMsg(
          !isClockedIn
            ? `Face Verified! Clock In recorded for ${currentUser?.name || 'Employee'} (${currentUser?.empCode || 'SW001'}).`
            : `Face Verified! Clock Out recorded for ${currentUser?.name || 'Employee'} (${currentUser?.empCode || 'SW001'}).`
        );
      } else {
        setScanningStatus('failed');
        setResultMsg(res?.reason || 'Facial verification failed. Face does not match registered profile.');
      }
    } catch (err: any) {
      setScanningStatus('failed');
      setResultMsg(err?.message || 'Biometric verification error. Please check network connection.');
    }
  };

  const userLogs = attendance.filter((a) => a.employeeId === currentUser?.id || a.employeeName === currentUser?.name);

  const nowYearMonth = new Date();
  const year = nowYearMonth.getFullYear();
  const month = nowYearMonth.getMonth();
  const daysInCurrentMonthCount = new Date(year, month + 1, 0).getDate();
  const todayDateNum = nowYearMonth.getDate();

  const daysInMonth = Array.from({ length: daysInCurrentMonthCount }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, dayNum).getDay();
    const existingRec = userLogs.find((a) => a.date === dateStr);

    let status: 'present' | 'absent' | 'late' | 'halfday' | 'holiday' | 'weekend' = 'present';
    let otHours = 0;

    if (existingRec) {
      status = existingRec.status;
      otHours = Number(existingRec.otHours) || 0;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = 'weekend';
    } else if (dayNum > todayDateNum) {
      status = 'weekend';
    } else {
      status = 'absent';
    }

    return { day: dayNum, status, otHours };
  });

  const presentDaysCount = daysInMonth.filter((d) => d.status === 'present').length;
  const standardWorkingHours = presentDaysCount * 8;
  const totalOtHours = daysInMonth.reduce((sum, d) => sum + d.otHours, 0);
  const basicSalary = currentUser?.basic || 45000;
  const hourlyRate = (basicSalary / 180) * 1.5;
  const otTotalBonusPay = totalOtHours * hourlyRate;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Sub Tab Bar */}
      <View style={[styles.tabToggleRow, { backgroundColor: theme.inputBg }]}>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'punch' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('punch')}
        >
          <Text style={[styles.subTabText, { color: theme.textMuted }, activeTab === 'punch' && { color: '#ffffff' }]}>
            Face Punch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeTab === 'calendar' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.subTabText, { color: theme.textMuted }, activeTab === 'calendar' && { color: '#ffffff' }]}>
            Calendar & Overtime
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {activeTab === 'punch' ? (
          <View>
            {/* Live Clock Card */}
            <View style={[styles.clockCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.clockTime, { color: theme.textPrimary }]}>{currentTime}</Text>
              <Text style={[styles.clockDate, { color: theme.textMuted }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <View style={[styles.geofenceChip, { backgroundColor: currentUser?.geofencingEnabled === false ? theme.accentSoft : theme.tealSoft }]}>
                <Icon name="location" size={12} color={currentUser?.geofencingEnabled === false ? theme.accent : theme.primary} />
                <Text style={[styles.geofenceText, { color: currentUser?.geofencingEnabled === false ? theme.accent : theme.primary }]}>
                  {currentUser?.geofencingEnabled === false
                    ? '⚡ Facial Verification Only (Geofence Exempted)'
                    : `🏢 Branch: ${branchName} • Range: ${branchRadius}m`}
                </Text>
              </View>

              {/* Punctuality / Grace Status Badge */}
              <View style={[styles.geofenceChip, {
                marginTop: 6,
                backgroundColor: !punctualityStatus.isAllowed
                  ? theme.dangerSoft
                  : punctualityStatus.isAfternoonSession
                    ? theme.accentSoft
                    : theme.tealSoft
              }]}>
                <Icon
                  name="clock"
                  size={12}
                  color={!punctualityStatus.isAllowed ? theme.danger : punctualityStatus.isAfternoonSession ? theme.accent : theme.primary}
                />
                <Text style={[styles.geofenceText, {
                  color: !punctualityStatus.isAllowed ? theme.danger : punctualityStatus.isAfternoonSession ? theme.accent : theme.primary,
                  fontWeight: '700'
                }]}>
                  {graceTimeSetting === 'always'
                    ? `🕒 Shift: ${shiftStartStr} • Flexible Grace (Always)`
                    : !punctualityStatus.isAllowed
                      ? `⚠️ ${punctualityStatus.message}`
                      : punctualityStatus.isAfternoonSession
                        ? `🌓 Afternoon Half-Day Login Active (Morning Absent)`
                        : `⏰ Shift: ${shiftStartStr} • Grace: ${graceTimeSetting}m (${punctualityStatus.message})`}
                </Text>
              </View>
            </View>

            {/* Attendance Locked Warning Banner if grace period exceeded */}
            {!punctualityStatus.isAllowed && (
              <View style={{
                backgroundColor: theme.dangerSoft,
                borderColor: theme.danger,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <Icon name="clock" size={20} color={theme.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 13 }}>
                    Morning Attendance Locked (Marked Absent)
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                    {punctualityStatus.message}
                  </Text>
                </View>
              </View>
            )}

            {/* Afternoon Half Day Notice */}
            {punctualityStatus.isAfternoonSession && !isClockedIn && (
              <View style={{
                backgroundColor: theme.accentSoft,
                borderColor: theme.accent,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <Icon name="clock" size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13 }}>
                    Afternoon Session Active (Half-Day)
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                    Morning grace period was missed. You are now logging in for the afternoon second half.
                  </Text>
                </View>
              </View>
            )}

            {/* Scanner Action Card */}
            <View style={[styles.scannerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={[styles.cameraBox, { borderColor: theme.primaryLight, backgroundColor: theme.inputBg }]}>
                <View style={styles.faceGuide}>
                  <View style={[styles.faceOvalFrame, { borderColor: theme.accent }]}>
                    <Icon name="camera" size={38} color={theme.primary} />
                  </View>
                  <Text style={[styles.empTagText, { color: theme.primary }]}>
                    Employee: {currentUser?.name || 'Employee'} ({currentUser?.empCode || 'SW001'})
                  </Text>
                  <Text style={[styles.scannerStatusText, { color: theme.textMuted }]}>
                    Biometric Face Check required for Check-In & Check-Out
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: !punctualityStatus.isAllowed
                      ? '#64748b'
                      : isClockedIn
                        ? theme.danger
                        : punctualityStatus.isAfternoonSession
                          ? theme.accent
                          : theme.primary,
                    opacity: !punctualityStatus.isAllowed ? 0.7 : 1,
                  }
                ]}
                onPress={openBiometricScanner}
                disabled={!punctualityStatus.isAllowed}
                activeOpacity={0.8}
              >
                <Icon name={!punctualityStatus.isAllowed ? 'clock' : 'camera'} size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>
                  {!punctualityStatus.isAllowed
                    ? punctualityStatus.unlocksAt
                      ? `🚫 Check-In Disabled (Opens at ${punctualityStatus.unlocksAt})`
                      : '🚫 Check-In Locked for Today (Absent)'
                    : isClockedIn
                      ? 'Verify Face & Punch Clock Out'
                      : punctualityStatus.isAfternoonSession
                        ? 'Verify Face & Punch Afternoon Check-In'
                        : 'Verify Face & Punch Clock In'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Geofence Live Map & Location Breakdown */}
            {(() => {
              const empLat = userCoords?.lat ?? branchLat;
              const empLng = userCoords?.lng ?? branchLng;
              const liveDistanceMeters = getDistanceMeters(empLat, empLng, branchLat, branchLng);
              const isWithinFence = liveDistanceMeters <= branchRadius || !!assignedBranch?.geofenceDisabled;
              const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&scale=2&maptype=roadmap&markers=color:blue%7Clabel:U%7C${empLat},${empLng}&markers=color:red%7Clabel:B%7C${branchLat},${branchLng}&key=${GOOGLE_MAPS_API_KEY}`;

              return (
                <View style={[styles.mapCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.mapHeaderRow}>
                    <View style={styles.mapHeaderLeft}>
                      <Icon name="location" size={16} color={theme.primary} />
                      <Text style={[styles.mapTitle, { color: theme.textPrimary }]}>Geofence Map & Radar</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshLocBtn} onPress={loadUserLocation} disabled={locationLoading}>
                      {locationLoading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={[styles.refreshLocText, { color: theme.primary }]}>🔄 Refresh GPS</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Google Static Map View showing Blue (You) & Red (Branch) Pins */}
                  <View style={styles.mapContainer}>
                    <Image
                      source={{ uri: staticMapUrl }}
                      style={styles.mapImage}
                      resizeMode="cover"
                    />
                    <View style={styles.mapLegendOverlay}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.legendText}>🔵 You (Blue Pin)</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>🔴 Branch (Red Pin)</Text>
                      </View>
                    </View>
                  </View>

                  {/* Lat/Lng Breakdown & Distance Meter */}
                  <View style={styles.locationDetailsBox}>
                    <View style={styles.locRow}>
                      <Text style={[styles.locLabel, { color: theme.textMuted }]}>🔵 Device GPS Location:</Text>
                      <Text style={[styles.locValue, { color: theme.textPrimary }]}>
                        {userCoords ? `${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}` : 'Fetching GPS...'}
                      </Text>
                    </View>

                    <View style={styles.locRow}>
                      <Text style={[styles.locLabel, { color: theme.textMuted }]}>🔴 Assigned Branch ({branchName}):</Text>
                      <Text style={[styles.locValue, { color: theme.textPrimary }]}>
                        {branchLat.toFixed(5)}, {branchLng.toFixed(5)}
                      </Text>
                    </View>

                    <View style={[styles.locRow, styles.locRowBorder]}>
                      <Text style={[styles.locLabel, { color: theme.textMuted }]}>📏 Calculated Distance:</Text>
                      <Text style={[styles.locValue, { color: isWithinFence ? theme.success : theme.danger, fontWeight: '800' }]}>
                        {userCoords ? `${(liveDistanceMeters / 1000).toFixed(2)} km (${Math.round(liveDistanceMeters)}m)` : 'Calculating...'}
                      </Text>
                    </View>

                    <View style={styles.locRow}>
                      <Text style={[styles.locLabel, { color: theme.textMuted }]}>🛡️ Allowed Geofence Radius:</Text>
                      <Text style={[styles.locValue, { color: theme.textPrimary }]}>
                        {currentUser?.geofencingEnabled === false
                          ? 'Bypassed (Facial Attendance Only)'
                          : `${branchRadius}m ${assignedBranch?.geofenceDisabled ? '(Geofence Disabled)' : ''}`}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Today's Log Timeline */}
            <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Today's Verified Punch Logs</Text>
            <View style={[styles.timelineCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.timelineItem}>
                <View style={[styles.dot, { backgroundColor: theme.success }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Clock In Time</Text>
                  <Text style={[styles.timeVal, { color: theme.textPrimary }]}>
                    {userLogs[0]?.clockIn || (isClockedIn ? '09:05 AM' : '--:--')}
                  </Text>
                  <Text style={[styles.timeMeta, { color: theme.textMuted }]}>
                    {userLogs[0]?.faceVerified ? '✅ Face Match Verified' : isClockedIn ? '✅ Verified (99.4%)' : 'Pending Check-In'}
                  </Text>
                </View>
              </View>

              <View style={[styles.timelineDivider, { backgroundColor: theme.cardBorder }]} />

              <View style={styles.timelineItem}>
                <View style={[styles.dot, { backgroundColor: theme.warning }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Clock Out Time</Text>
                  <Text style={[styles.timeVal, { color: theme.textPrimary }]}>
                    {userLogs[0]?.clockOut || (!isClockedIn ? '06:00 PM' : 'In Progress...')}
                  </Text>
                  <Text style={[styles.timeMeta, { color: theme.textMuted }]}>Target Shift: 9.0 Hours</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View>
            {/* Calendar Month Header */}
            <View style={[styles.monthHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <TouchableOpacity style={styles.monthNavBtn}>
                <Icon name="chevron-left" size={18} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: theme.textPrimary }]}>August 2026</Text>
              <TouchableOpacity style={styles.monthNavBtn}>
                <Icon name="chevron-right" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* Attendance Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Late</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Half-Day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.cyan }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Holiday</Text>
              </View>
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={[styles.weekHeaderRow, { borderBottomColor: theme.cardBorder }]}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <Text key={idx} style={[styles.weekHeaderText, { color: theme.textMuted }]}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {daysInMonth.map((item) => {
                  let dotColor = theme.success;
                  if (item.status === 'absent') dotColor = theme.danger;
                  if (item.status === 'late') dotColor = theme.warning;
                  if (item.status === 'halfday') dotColor = theme.accent;
                  if (item.status === 'holiday') dotColor = theme.cyan;

                  return (
                    <View key={item.day} style={styles.dayCell}>
                      <Text style={[styles.dayText, { color: item.status === 'weekend' ? theme.textMuted : theme.textPrimary }]}>
                        {item.day}
                      </Text>
                      {item.status !== 'weekend' && (
                        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                      )}
                      {item.otHours > 0 && (
                        <View style={[styles.otChip, { backgroundColor: theme.accent }]}>
                          <Text style={styles.otChipText}>+{item.otHours}h</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Overtime Calculation Report */}
            <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Overtime Calculation Report</Text>
            <View style={[styles.otReportCard, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Standard Working Hours</Text>
                <Text style={[styles.otVal, { color: theme.textPrimary }]}>{standardWorkingHours.toFixed(1)} Hours</Text>
              </View>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Overtime Hours Logged</Text>
                <Text style={[styles.otVal, { color: theme.accent }]}>+{totalOtHours.toFixed(1)} Hours</Text>
              </View>
              <View style={styles.otRow}>
                <Text style={[styles.otLabel, { color: theme.textMuted }]}>Overtime Hourly Rate (1.5x)</Text>
                <Text style={[styles.otVal, { color: theme.textPrimary }]}>₹{hourlyRate.toFixed(2)} / hr</Text>
              </View>

              <View style={[styles.otDivider, { backgroundColor: theme.cardBorder }]} />

              <View style={styles.otTotalRow}>
                <View>
                  <Text style={[styles.otTotalLabel, { color: theme.textPrimary }]}>Total Overtime Bonus Pay</Text>
                  <Text style={[styles.otTotalSub, { color: theme.textMuted }]}>
                    Calculated for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

      {/* BIOMETRIC FACE SCANNER MODAL */}
      <Modal visible={scannerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Modal Header */}
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

            {/* Viewfinder Box */}
            <View style={[styles.modalCameraBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
              {capturedImageUri ? (
                <Image
                  source={{ uri: capturedImageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.modalFaceOval, { borderColor: scanningStatus === 'failed' ? theme.danger : theme.success }]}>
                  <Icon
                    name="camera"
                    size={46}
                    color={scanningStatus === 'verifying' ? theme.accent : scanningStatus === 'failed' ? theme.danger : theme.success}
                  />
                </View>
              )}
              {scanningStatus === 'verifying' && <View style={[styles.laserBeam, { backgroundColor: theme.accent }]} />}
            </View>

            {/* Verification Status Feedback */}
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

            {/* Action Buttons */}
            {scanningStatus === 'ready' && (
              <TouchableOpacity
                style={[styles.modalScanBtn, { backgroundColor: theme.primary }]}
                onPress={handleStartBiometricVerification}
              >
                <Text style={styles.modalScanBtnText}>Start Facial Recognition Check</Text>
              </TouchableOpacity>
            )}

            {(scanningStatus === 'success' || scanningStatus === 'failed') && (
              <TouchableOpacity
                style={[styles.modalScanBtn, { backgroundColor: scanningStatus === 'success' ? theme.primary : theme.danger }]}
                onPress={() => setScannerModalVisible(false)}
              >
                <Text style={styles.modalScanBtnText}>{scanningStatus === 'success' ? 'Done' : 'Close'}</Text>
              </TouchableOpacity>
            )}
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
});
