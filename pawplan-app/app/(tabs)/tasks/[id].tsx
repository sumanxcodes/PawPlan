import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon, Card, Button } from '../../../components/ui';
import { useHousehold } from '../../../lib/household-context';
import { Task, TaskType, ActivityLog } from '../../../lib/types';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string; label: string }> = {
  food: { icon: 'restaurant', color: '#FF9500', label: 'Feeding' },
  meds: { icon: 'medkit', color: '#FF3B30', label: 'Medication' },
  walk: { icon: 'walk', color: '#34C759', label: 'Walk' },
  grooming: { icon: 'cut', color: '#AF52DE', label: 'Grooming' },
  other: { icon: 'ellipsis-horizontal', color: '#8E8E93', label: 'Other' },
};

interface ActivityLogWithProfile extends ActivityLog {
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export default function TaskDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household, pets } = useHousehold();
  
  const [task, setTask] = useState<Task | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchTask();
    fetchRecentLogs();
  }, [id]);

  const fetchTask = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } else {
      setTask(data);
    }
    setLoading(false);
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        profiles:completed_by (
          full_name,
          email
        )
      `)
      .eq('task_id', id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentLogs(data);
    }
  };

  const handleComplete = async () => {
    if (!task || !household?.id) return;

    setCompleting(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      setCompleting(false);
      return;
    }

    // Create activity log for each pet
    const logs = task.pet_ids.map(petId => ({
      household_id: household.id,
      task_id: task.id,
      pet_id: petId,
      completed_by: user.id,
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('activity_logs')
      .insert(logs);

    setCompleting(false);

    if (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to mark task as complete');
    } else {
      Alert.alert('Success', 'Task marked as complete!');
      fetchRecentLogs(); // Refresh the logs
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('tasks')
              .update({ is_active: false })
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to delete task');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const getPetName = (petId: string) => {
    return pets.find(p => p.id === petId)?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.backgroundSecondary }]}>
        <Text variant="body" color="secondary">Task not found</Text>
      </View>
    );
  }

  const typeConfig = task.task_type 
    ? TASK_TYPE_CONFIG[task.task_type] 
    : TASK_TYPE_CONFIG.other;

  const taskPets = task.pet_ids
    .map(id => pets.find(p => p.id === id))
    .filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text variant="headline" weight="semibold">Task Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Icon name="trash-outline" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Header Card */}
        <Card variant="elevated" style={styles.heroCard}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Icon name={typeConfig.icon as any} size={32} color={typeConfig.color} />
          </View>
          <Text variant="title2" weight="bold" align="center" style={styles.taskTitle}>
            {task.title}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Text variant="caption1" weight="semibold" style={{ color: typeConfig.color }}>
              {typeConfig.label}
            </Text>
          </View>
        </Card>

        {/* Quick Complete Button */}
        <Button
          title={completing ? 'Marking Complete...' : '✓ Mark as Complete'}
          onPress={handleComplete}
          disabled={completing}
          loading={completing}
          size="lg"
          fullWidth
          style={styles.completeButton}
        />

        {/* Task Info */}
        <View style={styles.section}>
          <Text variant="headline" weight="semibold" style={styles.sectionTitle}>
            Details
          </Text>
          <Card variant="filled">
            <View style={styles.infoRow}>
              <Icon name="repeat" size={20} color={theme.textSecondary} />
              <Text variant="body" style={styles.infoText}>
                {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
              </Text>
            </View>
            {task.recurrence_rule?.time && (
              <View style={[styles.infoRow, { borderTopColor: theme.separator }]}>
                <Icon name="time-outline" size={20} color={theme.textSecondary} />
                <Text variant="body" style={styles.infoText}>
                  {task.recurrence_rule.time}
                </Text>
              </View>
            )}
            {task.details && (
              <View style={[styles.infoRow, { borderTopColor: theme.separator }]}>
                <Icon name="document-text-outline" size={20} color={theme.textSecondary} />
                <Text variant="body" style={styles.infoText}>
                  {task.details}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Pets */}
        <View style={styles.section}>
          <Text variant="headline" weight="semibold" style={styles.sectionTitle}>
            Pets ({taskPets.length})
          </Text>
          <View style={styles.petsRow}>
            {taskPets.map((pet) => pet && (
              <Card key={pet.id} variant="filled" style={styles.petChip}>
                <View style={[styles.petAvatar, { backgroundColor: pet.color_code || theme.accentBackground }]}>
                  <Text style={styles.petEmoji}>
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                  </Text>
                </View>
                <Text variant="subhead" weight="medium">{pet.name}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text variant="headline" weight="semibold" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          {recentLogs.length === 0 ? (
            <Card variant="filled" style={styles.emptyLogs}>
              <Icon name="time-outline" size={32} color={theme.textTertiary} />
              <Text variant="subhead" color="secondary" align="center">
                No activity recorded yet
              </Text>
            </Card>
          ) : (
            <Card variant="filled" style={styles.logsCard}>
              {recentLogs.map((log, index) => (
                <View
                  key={log.id}
                  style={[
                    styles.logItem,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
                  ]}
                >
                  <View style={[styles.logStatus, { backgroundColor: theme.success + '20' }]}>
                    <Icon name="checkmark" size={16} color={theme.success} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text variant="subhead" weight="medium">
                      {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                    </Text>
                    <Text variant="caption1" color="secondary">
                      {getPetName(log.pet_id)} • {formatDate(log.completed_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  typeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taskTitle: {
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  completeButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
  },
  petsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  logsCard: {
    padding: 0,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  logStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInfo: {
    flex: 1,
    gap: spacing.xs,
  },
});
