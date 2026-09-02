import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

interface HolidaysScreenProps {
  theme: ThemeColors;
}

const DEFAULT_HOLIDAYS = [
  { id: 'hol-1', name: 'Republic Day', date: '2026-01-26', type: 'National Holiday', description: 'National Republic Day Celebration', isMandatory: true },
  { id: 'hol-2', name: 'Holi', date: '2026-03-25', type: 'Festival Holiday', description: 'Festival of Colors', isMandatory: true },
  { id: 'hol-3', name: 'Good Friday', date: '2026-04-10', type: 'Public Holiday', description: 'Christian Public Holiday', isMandatory: true },
  { id: 'hol-4', name: 'Tamil New Year / Ambedkar Jayanti', date: '2026-04-14', type: 'Public Holiday', description: 'State & National Holiday', isMandatory: true },
  { id: 'hol-5', name: 'Labor Day / May Day', date: '2026-05-01', type: 'Public Holiday', description: "International Workers' Day", isMandatory: true },
  { id: 'hol-6', name: 'Bakrid / Eid al-Adha', date: '2026-06-17', type: 'Festival Holiday', description: 'Islamic Festival of Sacrifice', isMandatory: true },
  { id: 'hol-7', name: 'Independence Day', date: '2026-08-15', type: 'National Holiday', description: 'National Independence Day celebration', isMandatory: true },
  { id: 'hol-8', name: 'Ganesh Chaturthi', date: '2026-09-04', type: 'Festival Holiday', description: 'Vinayaka Chaturthi Festival', isMandatory: true },
  { id: 'hol-9', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'National Holiday', description: "Mahatma Gandhi's Birthday", isMandatory: true },
  { id: 'hol-10', name: 'Ayudha Pooja / Vijaya Dashami', date: '2026-10-20', type: 'Festival Holiday', description: 'Dussehra Celebrations', isMandatory: true },
  { id: 'hol-11', name: 'Diwali (Deepavali)', date: '2026-11-01', type: 'Festival Holiday', description: 'Festival of Lights', isMandatory: true },
  { id: 'hol-12', name: 'Christmas Day', date: '2026-12-25', type: 'Festival Holiday', description: 'Christmas Day Celebration', isMandatory: true },
  { id: 'hol-13', name: 'New Year Day', date: '2027-01-01', type: 'Optional Holiday', description: 'New Year Day (Floating / Optional Holiday)', isMandatory: false },
  { id: 'hol-14', name: 'Pongal / Makar Sankranti', date: '2027-01-14', type: 'Festival Holiday', description: 'Traditional Harvest Festival', isMandatory: true },
];

export function HolidaysScreen({ theme }: HolidaysScreenProps) {
  const { holidays: apiHolidays, companyConfig } = useAppContext();

  const allHolidays = useMemo(() => {
    const list = apiHolidays && Array.isArray(apiHolidays) && apiHolidays.length > 0 ? apiHolidays : DEFAULT_HOLIDAYS;
    return list.slice().sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
  }, [apiHolidays]);

  // Find next upcoming holiday
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = useMemo(() => {
    return allHolidays.find((h: any) => h.date >= todayStr) || allHolidays[0];
  }, [allHolidays, todayStr]);

  const daysRemaining = useMemo(() => {
    if (!upcoming) return 0;
    const d1 = new Date(todayStr);
    const d2 = new Date(upcoming.date);
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }, [upcoming, todayStr]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
        {companyConfig?.companyName || 'Company'} Holidays Calendar
      </Text>

      {/* Featured Banner */}
      {upcoming && (
        <View style={[styles.heroCard, { backgroundColor: theme.isDark ? theme.primary + '20' : theme.primary + '12', borderColor: theme.primary + '40' }]}>
          <Text style={[styles.heroBadge, { color: theme.primary }]}>NEXT UPCOMING HOLIDAY</Text>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>{upcoming.name}</Text>
          <Text style={[styles.heroDate, { color: theme.primary }]}>{formatDate(upcoming.date)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Icon name="clock" size={14} color={theme.success} />
            <Text style={[styles.heroCount, { color: theme.success }]}>
              {daysRemaining === 0 ? 'Today!' : `${daysRemaining} Days Remaining`}
            </Text>
          </View>
        </View>
      )}

      {/* Holiday List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        Official Annual Holidays ({allHolidays.length})
      </Text>

      {allHolidays.map((h: any, idx: number) => {
        const isMandatory = h.isMandatory !== false;
        return (
          <View key={h.id || idx} style={[styles.holidayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.iconBg, { backgroundColor: theme.isDark ? theme.primary + '22' : theme.primary + '15' }]}>
              <Icon name="holiday" size={20} color={theme.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.topRow}>
                <Text style={[styles.holidayName, { color: theme.textPrimary }]}>{h.name}</Text>
                <View style={[styles.typeTag, { backgroundColor: isMandatory ? theme.successSoft : theme.accentSoft }]}>
                  <Text style={[styles.typeText, { color: isMandatory ? theme.success : theme.accent }]}>
                    {isMandatory ? 'Mandatory' : 'Optional'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.holidayDate, { color: theme.primary, fontWeight: '700' }]}>
                📅 {formatDate(h.date)}
              </Text>
              <Text style={[styles.holidayDesc, { color: theme.textMuted }]}>
                {h.description || h.desc || h.type || 'Official Company Holiday'}
              </Text>
            </View>
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
    paddingBottom: 96,
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
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  holidayDate: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  holidayDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
