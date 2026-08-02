import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';

interface HolidaysScreenProps {
  theme: ThemeColors;
}

export function HolidaysScreen({ theme }: HolidaysScreenProps) {
  const holidays = [
    { date: 'Aug 15, 2026', day: 'Friday', name: 'Independence Day', type: 'Mandatory', desc: 'National Public Holiday' },
    { date: 'Oct 02, 2026', day: 'Friday', name: 'Gandhi Jayanti', type: 'Mandatory', desc: 'National Public Holiday' },
    { date: 'Nov 01, 2026', day: 'Sunday', name: 'Diwali (Deepavali)', type: 'Mandatory', desc: 'Festival of Lights' },
    { date: 'Dec 25, 2026', day: 'Friday', name: 'Christmas Day', type: 'Mandatory', desc: 'Christian Holiday' },
    { date: 'Jan 01, 2027', day: 'Friday', name: 'New Year Day', type: 'Optional', desc: 'Optional Floating Holiday' },
    { date: 'Jan 14, 2027', day: 'Thursday', name: 'Makar Sankranti / Pongal', type: 'Mandatory', desc: 'Harvest Festival' },
    { date: 'Jan 26, 2027', day: 'Tuesday', name: 'Republic Day', type: 'Mandatory', desc: 'National Public Holiday' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Company Holidays 2026-2027</Text>

      {/* Featured Banner */}
      <View style={[styles.heroCard, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
        <Text style={[styles.heroBadge, { color: theme.primary }]}>UPCOMING HOLIDAY</Text>
        <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Independence Day</Text>
        <Text style={[styles.heroDate, { color: theme.primary }]}>Friday, 15 August 2026</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Icon name="clock" size={14} color={theme.success} />
          <Text style={[styles.heroCount, { color: theme.success }]}>17 Days Remaining</Text>
        </View>
      </View>

      {/* Holiday List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Official Holiday Calendar</Text>
      {holidays.map((h, idx) => (
        <View key={idx} style={[styles.holidayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.iconBg, { backgroundColor: theme.tealSoft }]}>
            <Icon name="holiday" size={20} color={theme.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.topRow}>
              <Text style={[styles.holidayName, { color: theme.textPrimary }]}>{h.name}</Text>
              <View style={[styles.typeTag, { backgroundColor: h.type === 'Mandatory' ? theme.successSoft : theme.accentSoft }]}>
                <Text style={[styles.typeText, { color: h.type === 'Mandatory' ? theme.success : theme.accent }]}>
                  {h.type}
                </Text>
              </View>
            </View>
            <Text style={[styles.holidayDate, { color: theme.cyan }]}>📅 {h.date} ({h.day})</Text>
            <Text style={[styles.holidayDesc, { color: theme.textMuted }]}>{h.desc}</Text>
          </View>
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  heroDate: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  heroCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  holidayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '800',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  holidayDate: {
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 2,
  },
  holidayDesc: {
    fontSize: 11,
  },
});
