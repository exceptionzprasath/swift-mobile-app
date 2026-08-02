import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon, IconName } from '../components/Icon';

interface NotificationsScreenProps {
  theme: ThemeColors;
}

export function NotificationsScreen({ theme }: NotificationsScreenProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'payroll', title: 'Salary Credited', desc: 'July 2026 Salary slip of ₹84,500 credited to HDFC Bank.', time: '2h ago', unread: true, icon: 'payroll' as IconName, iconColor: theme.cyan },
    { id: 2, type: 'attendance', title: 'Overtime Approved', desc: 'Overtime bonus of 2.5 hrs approved for Sprint Deploy.', time: '5h ago', unread: true, icon: 'clock' as IconName, iconColor: theme.warning },
    { id: 3, type: 'leave', title: 'Leave Application Approved', desc: 'Manager approved your Sick Leave for Jul 10.', time: '1d ago', unread: false, icon: 'check' as IconName, iconColor: theme.success },
    { id: 4, type: 'announcement', title: 'Company Holiday Reminder', desc: 'Office will remain closed on Aug 15 for Independence Day.', time: '2d ago', unread: false, icon: 'holiday' as IconName, iconColor: theme.accent },
    { id: 5, type: 'task', title: 'New Task Assigned', desc: 'Complete Q3 Self-Assessment before Aug 05.', time: '3d ago', unread: false, icon: 'task' as IconName, iconColor: theme.info },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const displayedList = filter === 'unread' ? notifications.filter(n => n.unread) : notifications;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Notification Center</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[styles.markReadText, { color: theme.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'all' && { backgroundColor: theme.primary, borderColor: theme.primaryLight },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'all' && { color: '#ffffff' }]}>All ({notifications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'unread' && { backgroundColor: theme.primary, borderColor: theme.primaryLight },
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'unread' && { color: '#ffffff' }]}>
            Unread ({notifications.filter(n => n.unread).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {displayedList.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }, item.unread && { borderColor: theme.primaryLight, backgroundColor: theme.tealSoft }]}>
          <View style={[styles.iconBg, { backgroundColor: item.iconColor + '15' }]}>
            <Icon name={item.icon} size={20} color={item.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.cardTime, { color: theme.textMuted }]}>{item.time}</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>{item.desc}</Text>
          </View>
          {item.unread && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
        </View>
      ))}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 10,
  },
  cardDesc: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
