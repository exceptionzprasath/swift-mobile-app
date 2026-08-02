import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';

interface DocumentsScreenProps {
  theme: ThemeColors;
}

export function DocumentsScreen({ theme }: DocumentsScreenProps) {
  const docs = [
    { title: 'Employment Offer Letter', category: 'Employment', size: '1.4 MB', date: 'Jan 15, 2024', type: 'PDF' },
    { title: 'Aadhaar & PAN Verification', category: 'Identity & Tax', size: '2.8 MB', date: 'Jan 16, 2024', type: 'PDF' },
    { title: 'MacBook Pro Asset Handover Form', category: 'Asset Handover', size: '840 KB', date: 'Jan 18, 2024', type: 'PDF' },
    { title: 'Annual Tax Form 16 (FY 2025-26)', category: 'Tax Documents', size: '3.2 MB', date: 'May 30, 2026', type: 'PDF' },
    { title: 'SWIFT Employee Handbook 2026', category: 'Company Policy', size: '5.1 MB', date: 'Jan 01, 2026', type: 'PDF' },
  ];

  const handleAction = (docName: string, action: string) => {
    Alert.alert(
      `Document ${action}`,
      `Selected "${docName}" for ${action.toLowerCase()}. File processed successfully!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>My Documents Library</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleAction('New Document', 'Upload')}
        >
          <Icon name="upload" size={14} color="#ffffff" />
          <Text style={styles.uploadText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Stored Documents ({docs.length})</Text>
      {docs.map((doc, idx) => (
        <View key={idx} style={[styles.docCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.docIconBg, { backgroundColor: theme.tealSoft }]}>
            <Icon name="document" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{doc.title}</Text>
            <Text style={[styles.docMeta, { color: theme.textMuted }]}>{doc.category} • {doc.size} • {doc.date}</Text>
          </View>
          <View style={styles.actionsGroup}>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => handleAction(doc.title, 'View')}
            >
              <Icon name="info" size={14} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
              onPress={() => handleAction(doc.title, 'Download')}
            >
              <Icon name="download" size={14} color={theme.primary} />
            </TouchableOpacity>
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  docIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
