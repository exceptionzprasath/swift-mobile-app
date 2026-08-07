import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

interface LeavesScreenProps {
  theme: ThemeColors;
}

export function LeavesScreen({ theme }: LeavesScreenProps) {
  const { leaves, applyLeave, refreshData, currentUser } = useAppContext();
  const [requestType, setRequestType] = useState<'leave' | 'permission'>('leave');
  const [leaveCategory, setLeaveCategory] = useState<'Casual' | 'Sick' | 'Earned'>('Casual');
  const [permissionHours, setPermissionHours] = useState('1');
  const [reason, setReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isLeaveEligible = currentUser?.leaveApplyEligible !== false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleSubmit = async () => {
    if (!isLeaveEligible) {
      Alert.alert(
        'Leave Applications Locked',
        'Leave applications are currently not enabled for your account by your HR administrator.'
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a valid reason for your request.');
      return;
    }

    const typeStr = requestType === 'leave' ? `${leaveCategory} Leave` : `Short Permission (${permissionHours} Hr)`;
    const datesStr = requestType === 'leave' ? 'Aug 18, 2026' : 'Tomorrow 04:00 PM - 05:00 PM';
    const daysStr = requestType === 'leave' ? '1 Day' : `${permissionHours} Hr`;

    await applyLeave({
      type: typeStr,
      startDate: datesStr,
      endDate: datesStr,
      days: daysStr,
      reason: reason.trim(),
      status: 'Pending',
    });

    setReason('');
    Alert.alert('Submitted!', 'Your request has been submitted to your manager for approval.');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
      }
    >
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Leave & Permission Management</Text>

      {/* Leave Balances Cards */}
      <View style={styles.balanceGrid}>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.cyan }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>6 / 12</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Casual Leave (CL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.warning }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>5 / 8</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Sick Leave (SL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.success }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>12 / 15</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Earned Leave (EL)</Text>
        </View>
        <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: theme.accent }]}>
          <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>2 Hrs</Text>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Monthly Permission</Text>
        </View>
      </View>

        {/* Application Form */}
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.formHeader, { color: theme.textPrimary }]}>Apply New Request</Text>

          {!isLeaveEligible && (
            <View style={[styles.lockedBanner, { backgroundColor: theme.danger + '18', borderColor: theme.danger + '40' }]}>
              <Icon name="lock-closed-outline" size={20} color={theme.danger} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.lockedTitle, { color: theme.danger }]}>Leave Applications Locked</Text>
                <Text style={[styles.lockedSubtitle, { color: theme.textMuted }]}>
                  Your account is not enabled for leave applications by HR. Please contact your HR Manager.
                </Text>
              </View>
            </View>
          )}

          {/* Toggle Request Type */}
          <View style={[styles.typeToggle, { backgroundColor: theme.inputBg, opacity: isLeaveEligible ? 1 : 0.6 }]}>
            <TouchableOpacity
              style={[styles.toggleOption, requestType === 'leave' && { backgroundColor: theme.primary }]}
              onPress={() => isLeaveEligible && setRequestType('leave')}
              disabled={!isLeaveEligible}
            >
              <Text style={[styles.toggleText, { color: theme.textMuted }, requestType === 'leave' && { color: '#ffffff' }]}>
                Leave Request
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, requestType === 'permission' && { backgroundColor: theme.primary }]}
              onPress={() => isLeaveEligible && setRequestType('permission')}
              disabled={!isLeaveEligible}
            >
              <Text style={[styles.toggleText, { color: theme.textMuted }, requestType === 'permission' && { color: '#ffffff' }]}>
                Short Permission
              </Text>
            </TouchableOpacity>
          </View>

          {requestType === 'leave' ? (
            <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Leave Category</Text>
              <View style={styles.categoryRow}>
                {(['Casual', 'Sick', 'Earned'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                      leaveCategory === cat && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => isLeaveEligible && setLeaveCategory(cat)}
                    disabled={!isLeaveEligible}
                  >
                    <Text style={[styles.catText, { color: theme.textMuted }, leaveCategory === cat && { color: '#ffffff' }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ opacity: isLeaveEligible ? 1 : 0.6 }}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Select Permission Slot</Text>
              <View style={styles.categoryRow}>
                {['1', '2'].map((hrs) => (
                  <TouchableOpacity
                    key={hrs}
                    style={[
                      styles.catChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                      permissionHours === hrs && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => isLeaveEligible && setPermissionHours(hrs)}
                    disabled={!isLeaveEligible}
                  >
                    <Text style={[styles.catText, { color: theme.textMuted }, permissionHours === hrs && { color: '#ffffff' }]}>
                      {hrs} Hour Slot
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Reason for Request</Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.cardBorder },
              !isLeaveEligible && { opacity: 0.6 }
            ]}
            placeholder={isLeaveEligible ? "Enter detailed reason for manager review..." : "Leave applications are currently locked..."}
            placeholderTextColor={theme.textMuted}
            value={reason}
            onChangeText={setReason}
            editable={isLeaveEligible}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: isLeaveEligible ? theme.primary : theme.cardBorder },
              !isLeaveEligible && { opacity: 0.7 }
            ]}
            onPress={handleSubmit}
            activeOpacity={isLeaveEligible ? 0.8 : 1}
          >
            <Text style={[styles.submitBtnText, !isLeaveEligible && { color: theme.textMuted }]}>
              {isLeaveEligible ? 'Submit Application →' : '🔒 Leave Application Locked by HR'}
            </Text>
          </TouchableOpacity>
        </View>

      {/* History List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Request History</Text>
      {leaves.map((item) => {
        const badgeColor = item.status === 'Approved' ? theme.success : item.status === 'Rejected' ? theme.danger : theme.warning;
        return (
          <View key={item.id} style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyType, { color: theme.textPrimary }]}>{item.type}</Text>
              <View style={[styles.statusBadge, { backgroundColor: badgeColor + '25' }]}>
                <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={[styles.historyDates, { color: theme.accent }]}>📅 {item.startDate || item.startDate} ({item.days})</Text>
            <Text style={[styles.historyReason, { color: theme.textMuted }]}>Reason: {item.reason}</Text>
          </View>
        );
      })}
    </ScrollView>
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  balanceCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 4,
    borderWidth: 1,
  },
  balanceNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  balanceLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  formHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  catChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    height: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 16,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  historyItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  lockedSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyDates: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 12,
  },
});
