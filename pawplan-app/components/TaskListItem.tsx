import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from './ui';
import { useTheme, spacing, radius } from '../lib/theme';
import { Task, TaskType } from '../lib/types';
import { useHousehold } from '../lib/household-context';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string }> = {
  food: { icon: 'restaurant', color: '#FF9500' },
  meds: { icon: 'medkit', color: '#FF3B30' },
  walk: { icon: 'walk', color: '#34C759' },
  grooming: { icon: 'cut', color: '#AF52DE' },
  other: { icon: 'ellipsis-horizontal', color: '#8E8E93' },
};

export interface TaskWithCompletion extends Task {
  completedToday: boolean;
  completedCount: number;
}

interface TaskListItemProps {
  task: TaskWithCompletion;
  onComplete: (task: TaskWithCompletion) => void;
  onPress: () => void;
  isCompleting?: boolean;
}

export function TaskListItem({ task, onComplete, onPress, isCompleting }: TaskListItemProps) {
  const { theme, isDark } = useTheme();
  const { pets } = useHousehold();

  const typeConfig = task.task_type 
    ? TASK_TYPE_CONFIG[task.task_type] 
    : TASK_TYPE_CONFIG.other;

  const getPetName = (petIds: string[]) => {
    if (!petIds || petIds.length === 0) return '';
    const pet = pets.find(p => p.id === petIds[0]);
    return pet?.name || '';
  };

  const getScheduledTime = (task: Task) => {
    const time = task.recurrence_rule?.time;
    if (time) {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  const petName = getPetName(task.pet_ids);
  const time = getScheduledTime(task);

  return (
    <TouchableOpacity
      style={[styles.taskCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.taskIcon, { backgroundColor: typeConfig.color }]}>
        <Icon name={typeConfig.icon as any} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.taskInfo}>
        <Text 
          variant="body" 
          weight="semibold" 
          numberOfLines={1}
          style={[
            task.completedToday && styles.taskTitleCompleted,
          ]}
        >
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {petName && (
            <View style={[styles.petBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
              <Text variant="caption2" weight="semibold" style={{ color: theme.textSecondary }}>
                {petName.toUpperCase()}
              </Text>
            </View>
          )}
          {time && (
            <View style={styles.timeContainer}>
              <Icon name="time-outline" size={12} color={theme.textTertiary} />
              <Text variant="caption1" color="tertiary">{time}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.completeButton,
          task.completedToday && styles.completeButtonDone,
          { borderColor: task.completedToday ? theme.success : theme.surfaceBorder },
        ]}
        onPress={() => onComplete(task)}
        disabled={task.completedToday || isCompleting}
      >
        {isCompleting ? (
          <Icon name="hourglass-outline" size={22} color={theme.textSecondary} />
        ) : (
          <Icon 
            name={task.completedToday ? 'checkmark' : 'checkmark'} 
            size={22} 
            color={task.completedToday ? theme.success : theme.textTertiary} 
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    gap: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  petBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  completeButtonDone: {
    backgroundColor: 'transparent',
  },
});
