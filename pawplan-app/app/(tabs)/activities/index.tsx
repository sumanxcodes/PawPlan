import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon } from '../../../components/ui';
import { ActivityLog, Pet, Profile, Task } from '../../../lib/types';

interface ActivityWithDetails extends ActivityLog {
  pet?: Pet;
  task?: Task;
  completed_by_profile?: Profile;
}

interface GroupedActivity {
  title: string;
  data: ActivityWithDetails[];
}

const ACTIVITY_ICONS: Record<string, string> = {
  food: 'restaurant',
  meds: 'medical',
  walk: 'walk',
  grooming: 'cut',
  other: 'ellipse',
};

const QUICK_ACTIVITIES = [
  { type: 'walk', label: 'Walk', icon: 'walk' },
  { type: 'food', label: 'Fed', icon: 'restaurant' },
  { type: 'meds', label: 'Meds', icon: 'medical' },
  { type: 'grooming', label: 'Groomed', icon: 'cut' },
];

export default function ActivitiesScreen() {
  const { theme, isDark } = useTheme();
  const [activities, setActivities] = useState<GroupedActivity[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      // Get current user's household
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        setLoading(false);
        return;
      }

      setHouseholdId(memberData.household_id);

      // Load pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('household_id', memberData.household_id);

      setPets(petsData || []);

      // Load activities with related data
      const { data: activitiesData } = await supabase
        .from('activity_logs')
        .select(`
          *,
          pet:pets(*),
          task:tasks(*),
          completed_by_profile:profiles!activity_logs_completed_by_fkey(*)
        `)
        .eq('household_id', memberData.household_id)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (activitiesData) {
        // Group activities by date
        const grouped = groupActivitiesByDate(activitiesData);
        setActivities(grouped);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function groupActivitiesByDate(activities: ActivityWithDetails[]): GroupedActivity[] {
    const groups: Record<string, ActivityWithDetails[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    activities.forEach((activity) => {
      const date = new Date(activity.completed_at);
      let dateKey: string;

      if (isSameDay(date, today)) {
        dateKey = 'Today';
      } else if (isSameDay(date, yesterday)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  async function handleQuickLog(activityType: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (pets.length === 0) {
      Alert.alert('No Pets', 'Add a pet first before logging activities.');
      return;
    }

    if (pets.length === 1) {
      // Log directly for the only pet
      await logActivity(activityType, pets[0].id);
    } else {
      // Show pet selection
      if (Platform.OS === 'ios') {
        const options = [...pets.map((p) => p.name), 'Cancel'];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: options.length - 1,
            title: `Log ${activityType} for which pet?`,
          },
          async (buttonIndex) => {
            if (buttonIndex < pets.length) {
              await logActivity(activityType, pets[buttonIndex].id);
            }
          }
        );
      } else {
        // For Android, navigate to log screen with type preset
        router.push({
          pathname: '/(tabs)/activities/log',
          params: { activityType },
        });
      }
    }
  }

  async function logActivity(activityType: string, petId: string) {
    if (!householdId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('activity_logs').insert({
        household_id: householdId,
        pet_id: petId,
        completed_by: user?.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        note: activityType, // Store activity type in note for now
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData(); // Refresh the list
    } catch (error) {
      console.error('Error logging activity:', error);
      Alert.alert('Error', 'Failed to log activity');
    }
  }

  function getActivityIcon(activity: ActivityWithDetails): string {
    if (activity.task?.task_type) {
      return ACTIVITY_ICONS[activity.task.task_type] || 'ellipse';
    }
    // Check if activity type is stored in note
    const noteType = activity.note?.toLowerCase();
    if (noteType && ACTIVITY_ICONS[noteType]) {
      return ACTIVITY_ICONS[noteType];
    }
    return 'checkmark-circle';
  }

  function getActivityTitle(activity: ActivityWithDetails): string {
    if (activity.task?.title) {
      return activity.task.title;
    }
    // Capitalize the note if it's an activity type
    if (activity.note) {
      return activity.note.charAt(0).toUpperCase() + activity.note.slice(1);
    }
    return 'Activity completed';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return theme.success;
      case 'skipped':
        return theme.warning;
      case 'missed':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const renderActivity = ({ item }: { item: ActivityWithDetails }) => (
    <View style={[styles.activityCard, { backgroundColor: theme.surface }]}>
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: getStatusColor(item.status) + '20' },
        ]}
      >
        <Icon
          name={getActivityIcon(item) as any}
          size={20}
          color={getStatusColor(item.status)}
        />
      </View>

      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text variant="body" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
            {getActivityTitle(item)}
          </Text>
          <Text variant="caption1" color="secondary">
            {formatTime(item.completed_at)}
          </Text>
        </View>

        <View style={styles.activityMeta}>
          {item.pet && (
            <View style={styles.metaItem}>
              <Icon name="paw" size={12} color={theme.textTertiary} />
              <Text variant="caption1" color="tertiary">
                {item.pet.name}
              </Text>
            </View>
          )}
          {item.completed_by_profile && (
            <View style={styles.metaItem}>
              <Icon name="person" size={12} color={theme.textTertiary} />
              <Text variant="caption1" color="tertiary">
                {item.completed_by_profile.full_name || 'Unknown'}
              </Text>
            </View>
          )}
        </View>

        {item.note && item.task && (
          <Text variant="caption1" color="secondary" numberOfLines={2} style={styles.note}>
            {item.note}
          </Text>
        )}
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: GroupedActivity }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text variant="subhead" weight="semibold" color="secondary">
        {section.title}
      </Text>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text variant="subhead" weight="semibold" style={styles.quickActionsTitle}>
        Quick Log
      </Text>
      <View style={styles.quickActions}>
        {QUICK_ACTIVITIES.map((activity) => (
          <TouchableOpacity
            key={activity.type}
            style={[styles.quickAction, { backgroundColor: theme.surface }]}
            onPress={() => handleQuickLog(activity.type)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: theme.accent + '20' },
              ]}
            >
              <Icon name={activity.icon as any} size={24} color={theme.accent} />
            </View>
            <Text variant="caption1" weight="medium">
              {activity.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Icon name="time" size={48} color={theme.textTertiary} />
      </View>
      <Text variant="title3" weight="semibold" style={styles.emptyTitle}>
        No Activity Yet
      </Text>
      <Text variant="body" color="secondary" style={styles.emptyText}>
        Log your first activity using the quick actions above or tap the + button.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="body" color="secondary">Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderQuickActions()}

      <SectionList
        sections={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={activities.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={theme.textSecondary}
          />
        }
        stickySectionHeadersEnabled={true}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push('/(tabs)/activities/log')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  quickActionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickActionsTitle: {
    marginBottom: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  activityCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  note: {
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
