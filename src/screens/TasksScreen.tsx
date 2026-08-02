import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ThemeColors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';

interface TasksScreenProps {
  theme: ThemeColors;
}

export function TasksScreen({ theme }: TasksScreenProps) {
  const { tasks, toggleTask } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>My Assigned Tasks</Text>

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
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'all' && { color: '#ffffff' }]}>
            All ({tasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'pending' && { backgroundColor: theme.primary, borderColor: theme.primaryLight },
          ]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'pending' && { color: '#ffffff' }]}>
            Pending ({tasks.filter((t) => t.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            filter === 'completed' && { backgroundColor: theme.primary, borderColor: theme.primaryLight },
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, { color: theme.textMuted }, filter === 'completed' && { color: '#ffffff' }]}>
            Done ({tasks.filter((t) => t.status === 'completed').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task Cards */}
      {filteredTasks.map((t) => {
        const isDone = t.status === 'completed';
        const priorityColor = t.priority === 'High' ? theme.danger : t.priority === 'Medium' ? theme.info : theme.success;
        return (
          <TouchableOpacity
            key={t.id}
            style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }, isDone && { opacity: 0.6 }]}
            onPress={() => toggleTask(t.id)}
            activeOpacity={0.8}
          >
            <View style={styles.checkCol}>
              <View style={[styles.checkbox, { borderColor: theme.textMuted }, isDone && { backgroundColor: theme.success, borderColor: theme.success }]}>
                {isDone && <Icon name="check" size={14} color="#ffffff" />}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.taskHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '25' }]}>
                  <Text style={[styles.priorityText, { color: priorityColor }]}>{t.priority} Priority</Text>
                </View>
                <Text style={[styles.dueDate, { color: theme.textMuted }]}>Due: {t.dueDate}</Text>
              </View>

              <Text style={[styles.taskTitle, { color: theme.textPrimary }, isDone && styles.taskTitleDone]}>{t.title}</Text>
              <Text style={[styles.taskDesc, { color: theme.textMuted }]}>{t.desc}</Text>
            </View>
          </TouchableOpacity>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
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
  taskCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  checkCol: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dueDate: {
    fontSize: 11,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  taskDesc: {
    fontSize: 12,
  },
});
