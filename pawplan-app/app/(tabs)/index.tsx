import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';
import { useHousehold } from '../../lib/household-context';
import { Task, TaskType, ActivityLog } from '../../lib/types';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string }> = {
  food: { icon: 'restaurant', color: '#FF9500' },
  meds: { icon: 'medkit', color: '#FF3B30' },
  walk: { icon: 'walk', color: '#34C759' },
  grooming: { icon: 'cut', color: '#AF52DE' },
  other: { icon: 'ellipsis-horizontal', color: '#8E8E93' },
};

interface TaskWithCompletion extends Task {
  completedToday: boolean;
  completedCount: number;
}

export default function TodayScreen() {
  const { theme } = useTheme();
  const { household, pets } = useHousehold();
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get start of today in ISO format
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const fetchTodayData = async () => {
    if (!household?.id) return;

    // Fetch active tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_active', true)
      .in('frequency', ['daily', 'weekly', 'monthly']); // Show recurring tasks

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return;
    }

    // Fetch today's activity logs
    const { data: logsData, error: logsError } = await supabase
      .from('activity_logs')
      .select('task_id, pet_id')
      .eq('household_id', household.id)
      .gte('completed_at', todayStart.toISOString());

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    }

    // Mark tasks as completed based on logs
    const tasksWithCompletion = (tasksData || []).map(task => {
      const taskLogs = (logsData || []).filter(log => log.task_id === task.id);
      const completedPetIds = [...new Set(taskLogs.map(log => log.pet_id))];
      const allPetsCompleted = task.pet_ids.every((petId: string) => 
        completedPetIds.includes(petId)
      );

      return {
        ...task,
        completedToday: allPetsCompleted,
        completedCount: completedPetIds.length,
      };
    });

    setTasks(tasksWithCompletion);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodayData();
    }, [household?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayData();
  };

  const handleQuickComplete = async (task: TaskWithCompletion) => {
    if (completing || task.completedToday) return;

    setCompleting(task.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !household?.id) {
      setCompleting(null);
      return;
    }

    // Create logs for uncompleted pets
    const { data: existingLogs } = await supabase
      .from('activity_logs')
      .select('pet_id')
      .eq('task_id', task.id)
      .gte('completed_at', todayStart.toISOString());

    const completedPetIds = (existingLogs || []).map(log => log.pet_id);
    const uncompletedPetIds = task.pet_ids.filter((id: string) => !completedPetIds.includes(id));

    if (uncompletedPetIds.length === 0) {
      setCompleting(null);
      return;
    }

    const logs = uncompletedPetIds.map((petId: string) => ({
      household_id: household.id,
      task_id: task.id,
      pet_id: petId,
      completed_by: user.id,
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('activity_logs').insert(logs);

    setCompleting(null);

    if (error) {
      Alert.alert('Error', 'Failed to complete task');
    } else {
      fetchTodayData();
    }
  };

  const getPetNames = (petIds: string[]) => {
    if (!petIds || petIds.length === 0) return '';
    const names = petIds
      .map(id => pets.find(p => p.id === id)?.name)
      .filter(Boolean);
    if (names.length <= 2) return names.join(' & ');
    return `${names[0]} + ${names.length - 1} more`;
  };

  const completedCount = tasks.filter(t => t.completedToday).length;
  const pendingCount = tasks.filter(t => !t.completedToday).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="footnote" color="secondary" weight="medium">
          {dateString.toUpperCase()}
        </Text>
        <Text variant="largeTitle" weight="bold">Today</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="paw" size={24} color={theme.text} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              {pets.length}
            </Text>
            <Text variant="caption1" color="secondary">
              {pets.length === 1 ? 'Pet' : 'Pets'}
            </Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="checkmark-circle" size={24} color={theme.success} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              {completedCount}
            </Text>
            <Text variant="caption1" color="secondary">
              Done
            </Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="time-outline" size={24} color={theme.warning} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              {pendingCount}
            </Text>
            <Text variant="caption1" color="secondary">
              Pending
            </Text>
          </Card>
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="headline" weight="semibold">
              Today's Tasks
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text variant="subhead" style={{ color: theme.accent }}>See All</Text>
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <Card variant="elevated" style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.accentBackground }]}>
                <Icon name="checkbox-outline" size={32} color={theme.textSecondary} />
              </View>
              <Text variant="headline" weight="semibold" align="center">
                No tasks scheduled
              </Text>
              <Text variant="subhead" color="secondary" align="center" style={styles.emptySubtext}>
                Create tasks to track your pets' daily care
              </Text>
              <TouchableOpacity 
                style={[styles.addTaskButton, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)/tasks/add')}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text variant="subhead" weight="semibold" style={{ color: '#FFFFFF' }}>
                  Add Task
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task) => {
                const typeConfig = task.task_type 
                  ? TASK_TYPE_CONFIG[task.task_type] 
                  : TASK_TYPE_CONFIG.other;
                const isCompleting = completing === task.id;

                return (
                  <Card 
                    key={task.id} 
                    variant="elevated" 
                    style={[
                      styles.taskCard,
                      task.completedToday && styles.taskCardCompleted,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.taskRow}
                      onPress={() => router.push(`/(tabs)/tasks/${task.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.taskIcon, { backgroundColor: typeConfig.color + '20' }]}>
                        <Icon name={typeConfig.icon as any} size={22} color={typeConfig.color} />
                      </View>
                      <View style={styles.taskInfo}>
                        <Text 
                          variant="headline" 
                          weight="semibold" 
                          numberOfLines={1}
                          style={task.completedToday && { opacity: 0.6 }}
                        >
                          {task.title}
                        </Text>
                        <Text variant="caption1" color="secondary" numberOfLines={1}>
                          {getPetNames(task.pet_ids)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.completeButton,
                          { 
                            backgroundColor: task.completedToday 
                              ? theme.success + '20' 
                              : theme.accentBackground,
                            borderColor: task.completedToday 
                              ? theme.success 
                              : theme.surfaceBorder,
                          },
                        ]}
                        onPress={() => handleQuickComplete(task)}
                        disabled={task.completedToday || isCompleting}
                      >
                        {isCompleting ? (
                          <Icon name="hourglass-outline" size={20} color={theme.textSecondary} />
                        ) : (
                          <Icon 
                            name={task.completedToday ? 'checkmark' : 'checkmark'} 
                            size={20} 
                            color={task.completedToday ? theme.success : theme.textTertiary} 
                          />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Pets Overview */}
        {pets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="headline" weight="semibold">
                Your Pets
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/pets')}>
                <Text variant="subhead" style={{ color: theme.accent }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.petsList}>
              {pets.slice(0, 4).map((pet) => (
                <TouchableOpacity 
                  key={pet.id}
                  onPress={() => router.push(`/(tabs)/pets/${pet.id}`)}
                >
                  <Card variant="elevated" style={styles.petMiniCard}>
                    <View style={[styles.petAvatar, { backgroundColor: pet.color_code || theme.accentBackground }]}>
                      <Text style={styles.petEmoji}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                      </Text>
                    </View>
                    <Text variant="subhead" weight="medium">{pet.name}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statNumber: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptySubtext: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  tasksList: {
    gap: spacing.md,
  },
  taskCard: {
    padding: 0,
    overflow: 'hidden',
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  petsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  petMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  petAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 16,
  },
});
