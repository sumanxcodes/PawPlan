import { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Dimensions, FlatList, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';
import StreakBadge from '../../components/StreakBadge';
import { useHousehold } from '../../lib/household-context';
import { Task, TaskType } from '../../lib/types';
import { useStreaks } from '../../lib/hooks/useStreaks';
import { TaskListItem, TaskWithCompletion } from '../../components/TaskListItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TabIndex() {
  const { theme, isDark } = useTheme();
  const { household, pets } = useHousehold();
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const { data: streaks = [] } = useStreaks(household?.id);
  const [userProfile, setUserProfile] = useState<{ avatar_url?: string } | null>(null);
  const [selectedPetFilter, setSelectedPetFilter] = useState<string>('all');
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));

  const today = new Date();
  
  // Get start of today in ISO format
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Get start of week (Monday)
  const startOfWeek = new Date(todayStart);
  const dayOfWeek = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const fetchTodayData = async () => {
    if (!household?.id) return;

    // Fetch user profile for avatar
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      if (profile) setUserProfile(profile);
    }

    // Fetch active tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_active', true)
      .in('frequency', ['daily', 'weekly', 'monthly']);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return;
    }

    // Fetch activity logs for the whole week
    const { data: logsData, error: logsError } = await supabase
      .from('activity_logs')
      .select('task_id, pet_id, completed_at')
      .eq('household_id', household.id)
      .gte('completed_at', startOfWeek.toISOString());

    if (logsError) {
      console.error('Error fetching logs:', logsError);
    }

    // Calculate weekly progress
    const progress = new Array(7).fill(false);
    (logsData || []).forEach(log => {
      const logDate = new Date(log.completed_at);
      const dayIndex = logDate.getDay(); // 0=Sun, 1=Mon...
      // Map to 0=Mon, 6=Sun
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      if (adjustedIndex >= 0 && adjustedIndex < 7) {
        progress[adjustedIndex] = true;
      }
    });
    setWeeklyProgress(progress);

    // Mark tasks as completed based on logs (filter for TODAY)
    const tasksWithCompletion = (tasksData || []).map(task => {
      const taskLogs = (logsData || []).filter(log => {
        const logTime = new Date(log.completed_at).getTime();
        return log.task_id === task.id && logTime >= todayStart.getTime();
      });
      
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

  const completedCount = tasks.filter(t => t.completedToday).length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Process streaks to get one unique streak per pet (highest current streak)
  const uniqueStreaks = useMemo(() => {
    const petStreaks = new Map<string, any>();
    
    streaks.forEach(streak => {
      const current = petStreaks.get(streak.pet_id);
      if (!current || streak.current_streak > current.current_streak) {
        petStreaks.set(streak.pet_id, streak);
      }
    });
    
    return Array.from(petStreaks.values());
  }, [streaks]);

  // Sort and Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter by pet
    if (selectedPetFilter !== 'all') {
      result = result.filter(task => task.pet_ids.includes(selectedPetFilter));
    }

    return result.sort((a, b) => {
      if (a.completedToday !== b.completedToday) {
        return a.completedToday ? 1 : -1;
      }
      const timeA = a.recurrence_rule?.time;
      const timeB = b.recurrence_rule?.time;
      
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }
      return 0;
    });
  }, [tasks, selectedPetFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskWithCompletion[]> = {
      Morning: [],
      Afternoon: [],
      Evening: []
    };
    
    filteredTasks.forEach(task => {
       const time = task.recurrence_rule?.time || '00:00';
       const hour = parseInt(time.split(':')[0]);
       
       if (hour >= 5 && hour < 12) groups.Morning.push(task);
       else if (hour >= 12 && hour < 17) groups.Afternoon.push(task);
       else groups.Evening.push(task);
    });
    
    return groups;
  }, [filteredTasks]);

  const getDateLabel = () => {
    return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* New Header Design */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
             <Text variant="caption1" weight="bold" style={{ color: theme.textSecondary, letterSpacing: 1 }}>
               {getDateLabel()}
             </Text>
             <View style={styles.avatarContainer}>
               {userProfile?.avatar_url ? (
                 <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
               ) : (
                 <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                   <Text style={{ color: '#FFF' }}>U</Text>
                 </View>
               )}
             </View>
          </View>
          
          <View style={styles.headerTitleRow}>
            <Text variant="largeTitle" weight="bold">Today</Text>
          </View>
        </View>

        {/* Pet Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.petFilterContainer}
        >
          <TouchableOpacity
            style={[
              styles.petFilterPill, 
              selectedPetFilter === 'all' 
                ? { backgroundColor: theme.surface, borderColor: theme.surfaceBorder } 
                : { backgroundColor: theme.inputBackground, borderColor: theme.surfaceBorder }
            ]}
            onPress={() => setSelectedPetFilter('all')}
          >
            <Text variant="subhead" weight={selectedPetFilter === 'all' ? 'semibold' : 'medium'} style={{ color: theme.text }}>
              All Pets
            </Text>
          </TouchableOpacity>
          
          {pets.map((pet) => {
            const isSelected = selectedPetFilter === pet.id;
            return (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petFilterPill,
                  isSelected 
                    ? { backgroundColor: theme.accent, borderColor: theme.accent } 
                    : { backgroundColor: theme.inputBackground, borderColor: theme.surfaceBorder }
                ]}
                onPress={() => setSelectedPetFilter(pet.id)}
              >
                {pet.avatar_url ? (
                  <Image source={{ uri: pet.avatar_url }} style={styles.petFilterAvatar} />
                ) : (
                  <View style={styles.petFilterAvatarPlaceholder}>
                     <Text style={{ fontSize: 10 }}>{pet.name[0]}</Text>
                  </View>
                )}
                <Text 
                  variant="subhead" 
                  weight={isSelected ? 'semibold' : 'medium'}
                  style={{ color: isSelected ? theme.textInverse : theme.text }}
                >
                  {pet.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Household Streak Card */}
        <View style={[styles.goalsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeaderRow}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
               <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' }}>
                 <Icon name="flame" size={20} color="#FF9500" />
               </View>
               <View>
                 <Text variant="caption2" color="secondary" weight="bold" style={{letterSpacing: 0.5}}>HOUSEHOLD</Text>
                 <Text variant="caption2" style={{color: '#FF9500', letterSpacing: 0.5}} weight="bold">STREAK</Text>
               </View>
             </View>
             
             {/* Weekly Tracker */}
             <View style={styles.weeklyTracker}>
               {['M','T','W','T','F','S','S'].map((day, i) => {
                  const isCompleted = weeklyProgress[i];
                  const isTodayIndex = (today.getDay() === 0 ? 6 : today.getDay() - 1) === i;
                  
                  return (
                  <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                     <View style={[
                        styles.weekDayCircle, 
                        isCompleted && { backgroundColor: '#FF9500', borderColor: '#FF9500' },
                        !isCompleted && isTodayIndex && { borderColor: theme.accent, borderWidth: 2 }, // Highlight today if not done
                        !isCompleted && !isTodayIndex && { borderColor: '#E5E7EB' }
                     ]}>
                        {isCompleted && <Icon name="checkmark" size={10} color="#FFF" />}
                     </View>
                     <Text variant="caption2" color="secondary" style={{fontSize: 10}}>{day}</Text>
                  </View>
               )})}
             </View>
          </View>

          <View style={styles.streakMainStat}>
             <Text style={{ fontSize: 42, fontWeight: 'bold', color: theme.text }}>
                {uniqueStreaks.length > 0 ? Math.max(...uniqueStreaks.map(s => s.current_streak)) : 0}
             </Text>
             <Text variant="title3" color="secondary" style={{ marginBottom: 6, marginLeft: 8 }}>days</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
             <Text variant="caption2" color="secondary" weight="bold" style={{letterSpacing: 0.5}}>TODAY'S TASKS</Text>
             <Text variant="caption2" weight="bold">{completionPercentage}%</Text>
          </View>
          
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', marginTop: 8 }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: theme.accent,
                  width: `${completionPercentage}%`,
                }
              ]} 
            />
          </View>
        </View>

        {/* Tasks List Grouped by Time */}
        <View style={styles.section}>
          {filteredTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
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
            </View>
          ) : (
            <View style={{ gap: 24 }}>
              {(['Morning', 'Afternoon', 'Evening'] as const).map((period) => {
                const tasksInPeriod = groupedTasks[period];
                if (tasksInPeriod.length === 0) return null;

                const periodIcon = period === 'Morning' ? 'sunny' : period === 'Afternoon' ? 'partly-sunny' : 'moon';

                return (
                  <View key={period}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Icon name={periodIcon} size={18} color={theme.textSecondary} />
                        <Text variant="caption1" weight="bold" color="secondary" style={{textTransform: 'uppercase', letterSpacing: 1}}>
                          {period}
                        </Text>
                    </View>
                    
                    <View style={styles.tasksList}>
                      {tasksInPeriod.map((task) => (
                        <TaskListItem 
                          key={task.id} 
                          task={task} 
                          onComplete={handleQuickComplete}
                          onPress={() => router.push(`/(tabs)/tasks/${task.id}`)}
                          isCompleting={completing === task.id}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: radius.full,
  },
  petFilterContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  petFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  petFilterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  petFilterAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  goalsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsLeft: {
    flex: 1,
  },
  goalsLabel: {
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  completedText: {
    marginLeft: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '80%',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  goalsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
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
    borderRadius: radius.xl,
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
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  weeklyTracker: {
    flexDirection: 'row',
    gap: 6,
  },
  weekDayCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakMainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
