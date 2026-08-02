import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

interface PayrollScreenProps {
  theme: ThemeColors;
}

export function PayrollScreen({ theme }: PayrollScreenProps) {
  const { currentUser, refreshData } = useAppContext();
  const [selectedMonth] = useState('July 2026');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const basicPay = currentUser?.basic || 45000;
  const hra = Math.round(basicPay * 0.4); // 40% HRA
  const specialAllowance = Math.round(basicPay * 0.3); // 30% Special Allowance
  const otBonus = 5437.5;
  const grossEarnings = basicPay + hra + specialAllowance + otBonus;

  const pf = 1800; // Employee PF
  const pt = 200;  // Professional Tax
  const tds = Math.round(grossEarnings * 0.05); // TDS
  const totalDeductions = pf + pt + tds;

  const netSalary = grossEarnings - totalDeductions;

  const handleDownloadPDF = (month: string) => {
    Alert.alert(
      'Download Payslip',
      `Downloading official signed payslip PDF for ${month}...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
      }
    >
      {/* Month Selector */}
      <View style={styles.monthHeader}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Payroll & Salary Slips</Text>
        <View style={[styles.monthBadge, { backgroundColor: theme.tealSoft, borderColor: theme.primaryLight }]}>
          <Icon name="leaves" size={12} color={theme.primary} />
          <Text style={[styles.monthBadgeText, { color: theme.primary }]}>{selectedMonth}</Text>
        </View>
      </View>

      {/* Net Salary Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>Net Salary Credited ({currentUser?.name})</Text>
            <Text style={[styles.heroAmount, { color: theme.success }]}>₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={[styles.paidChip, { backgroundColor: theme.successSoft }]}>
            <Text style={[styles.paidChipText, { color: theme.success }]}>STATUS: CREDITED</Text>
          </View>
        </View>

        <Text style={[styles.bankDetail, { color: theme.textMuted }]}>
          Credited to {currentUser?.bankAccount || 'Salary Account'} on Aug 01, 2026
        </Text>

        <TouchableOpacity
          style={[styles.downloadPdfBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleDownloadPDF(selectedMonth)}
          activeOpacity={0.8}
        >
          <Icon name="download" size={16} color="#ffffff" />
          <Text style={styles.downloadPdfText}>Download Salary Slip PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings vs Deductions Cards */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Salary Structure Breakdown</Text>
      <View style={styles.breakdownGrid}>
        {/* Earnings Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={14} color={theme.success} />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Earnings</Text>
            </View>
            <Text style={[styles.cardTotal, { color: theme.success }]}>₹{grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Basic Salary</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>House Rent Allowance (HRA)</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Special Allowance</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Overtime Pay Bonus</Text>
            <Text style={[styles.rowVal, { color: theme.accent }]}>+₹{otBonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Deductions Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="cross" size={14} color={theme.danger} />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Deductions</Text>
            </View>
            <Text style={[styles.cardTotal, { color: theme.danger }]}>-₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Employee PF (12%)</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Professional Tax (PT)</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{pt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Income Tax (TDS)</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>₹{tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>

      {/* Payslip History List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Previous Payslips History</Text>
      {[
        { month: 'June 2026', net: `₹${(netSalary * 0.98).toFixed(2)}` },
        { month: 'May 2026', net: `₹${(netSalary * 0.98).toFixed(2)}` },
        { month: 'April 2026', net: `₹${(netSalary * 0.92).toFixed(2)}` },
      ].map((item, idx) => (
        <View key={idx} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View>
            <Text style={[styles.historyMonth, { color: theme.textPrimary }]}>{item.month}</Text>
            <Text style={[styles.historyNet, { color: theme.textMuted }]}>Net Paid: {item.net}</Text>
          </View>
          <TouchableOpacity
            style={[styles.historyPdfBtn, { backgroundColor: theme.cyanSoft, borderColor: theme.cyan }]}
            onPress={() => handleDownloadPDF(item.month)}
          >
            <Icon name="download" size={14} color={theme.cyan} />
            <Text style={[styles.historyPdfIcon, { color: theme.cyan }]}>PDF</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Salary Revision Log */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Salary Revision History</Text>
      <View style={[styles.revisionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.revisionRow}>
          <View>
            <Text style={[styles.revisionTitle, { color: theme.textPrimary }]}>Annual Hike (15% Increase)</Text>
            <Text style={[styles.revisionDate, { color: theme.textMuted }]}>Effective Apr 01, 2026</Text>
          </View>
          <Text style={[styles.revisionAmount, { color: theme.success }]}>
            ₹{((basicPay * 12) / 100000).toFixed(1)} LPA
          </Text>
        </View>
      </View>
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
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
    paddingVertical: 4,
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
});
