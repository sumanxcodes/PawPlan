import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon, Card, Button } from '../../../components/ui';
import { useHousehold } from '../../../lib/household-context';
import { Task, TaskType } from '../../../lib/types';
import * as Haptics from 'expo-haptics';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string; label: string }> = {
  food: { icon: 'restaurant', color: '#FF9500', label: 'Feeding' },
  meds: { icon: 'medkit', color: '#FF3B30', label: 'Medication' },
  walk: { icon: 'walk', color: '#34C759', label: 'Walk' },
  grooming: { icon: 'cut', color: '#AF52DE', label: 'Grooming' },
  other: { icon: 'ellipsis-horizontal', color: '#8E8E93', label: 'Other' },
};

export default function TasksScreen() {
  const { theme } = useTheme();
  const { household, pets } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    if (!household?.id) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [household?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getPetNames = (petIds: string[]) => {
    if (!petIds || petIds.length === 0) return 'All pets';
    const names = petIds
      .map(id => pets.find(p => p.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return 'Unknown';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(' & ');
    return `${names[0]} + ${names.length - 1} more`;
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'once': return 'One-time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'custom': return 'Custom';
      default: return frequency;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Task'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Are you sure you want to delete this task?',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const { error } = await supabase
              .from('tasks')
              .update({ is_active: false })
              .eq('id', taskId);

            if (error) {
              Alert.alert('Error', 'Failed to delete task');
            } else {
              fetchTasks();
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('tasks')
                .update({ is_active: false })
                .eq('id', taskId);

              if (error) {
                Alert.alert('Error', 'Failed to delete task');
              } else {
                fetchTasks();
              }
            },
          },
        ]
      );
    }
  };

  const renderTaskItem = ({ item: task }: { item: Task }) => {
    const typeConfig = task.task_type 
      ? TASK_TYPE_CONFIG[task.task_type] 
      : TASK_TYPE_CONFIG.other;
    
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/tasks/${task.id}`)}
        onLongPress={() => handleDeleteTask(task.id)}
        activeOpacity={0.7}
        style={styles.taskCardWrapper}
      >
        <Card variant="elevated" style={styles.taskCard}>
          <View style={styles.taskRow}>
            <View style={[styles.taskIcon, { backgroundColor: typeConfig.color + '20' }]}>
              <Icon name={typeConfig.icon as any} size={24} color={typeConfig.color} />
            </View>
            <View style={styles.taskInfo}>
              <Text variant="headline" weight="semibold" numberOfLines={1}>
                {task.title}
              </Text>
              <Text variant="subhead" color="secondary" numberOfLines={1}>
                {getPetNames(task.pet_ids)}
              </Text>
            </View>
            <View style={styles.taskMeta}>
              <View style={[styles.frequencyBadge, { backgroundColor: theme.accentBackground }]}>
                <Text variant="caption2" weight="medium" color="secondary">
                  {getFrequencyLabel(task.frequency)}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
            </View>
          </View>
          {task.recurrence_rule?.time && (
            <View style={[styles.timeRow, { borderTopColor: theme.separator }]}>
              <Icon name="time-outline" size={16} color={theme.textSecondary} />
              <Text variant="footnote" color="secondary" style={styles.timeText}>
                {task.recurrence_rule.time}
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <Card variant="elevated" style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentBackground }]}>
        <Icon name="checkbox-outline" size={48} color={theme.textSecondary} />
      </View>
      <Text variant="headline" weight="semibold" align="center">
        No tasks yet
      </Text>
      <Text variant="subhead" color="secondary" align="center" style={styles.emptySubtext}>
        Create tasks to schedule feeding, walks, medications, and more for your pets
      </Text>
      <Button
        title="Create First Task"
        onPress={() => router.push('/(tabs)/tasks/add')}
        style={styles.emptyButton}
      />
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundSecondary }]}>
        <Text variant="body" color="secondary">Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="largeTitle" weight="bold">Tasks</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(tabs)/tasks/add')}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          tasks.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentBackground }]}>
              <Icon name="checkbox-outline" size={48} color={theme.textSecondary} />
            </View>
            <Text variant="headline" weight="semibold" align="center">
              No tasks yet
            </Text>
            <Text variant="subhead" color="secondary" align="center" style={styles.emptySubtext}>
              Create tasks to schedule feeding, walks, medications, and more for your pets
            </Text>
            <Button
              title="Create First Task"
              onPress={() => router.push('/(tabs)/tasks/add')}
              style={styles.emptyButton}
            />
          </Card>
        }
        renderItem={({ item: task }) => {
          const typeConfig = task.task_type 
            ? TASK_TYPE_CONFIG[task.task_type] 
            : TASK_TYPE_CONFIG.other;
          
          return (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/tasks/${task.id}`)}
              onLongPress={() => handleDeleteTask(task.id)}
              activeOpacity={0.7}
              style={styles.taskCardWrapper}
            >
              <Card variant="elevated" style={styles.taskCard}>
                <View style={styles.taskRow}>
                  <View style={[styles.taskIcon, { backgroundColor: typeConfig.color + '20' }]}>
                    <Icon name={typeConfig.icon as any} size={24} color={typeConfig.color} />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text variant="headline" weight="semibold" numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text variant="subhead" color="secondary" numberOfLines={1}>
                      {getPetNames(task.pet_ids)}
                    </Text>
                  </View>
                  <View style={styles.taskMeta}>
                    <View style={[styles.frequencyBadge, { backgroundColor: theme.accentBackground }]}>
                      <Text variant="caption2" weight="medium" color="secondary">
                        {getFrequencyLabel(task.frequency)}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
                  </View>
                </View>
                {task.recurrence_rule?.time && (
                  <View style={[styles.timeRow, { borderTopColor: theme.separator }]}>
                    <Icon name="time-outline" size={16} color={theme.textSecondary} />
                    <Text variant="footnote" color="secondary" style={styles.timeText}>
                      {task.recurrence_rule.time}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.taskSeparator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  taskCardWrapper: {
    marginBottom: 0,
  },
  taskSeparator: {
    height: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptySubtext: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 180,
  },
  tasksList: {
    gap: spacing.md,
  },
  taskCard: {
    padding: 0,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  frequencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  timeText: {
    marginLeft: spacing.xs,
  },
});
