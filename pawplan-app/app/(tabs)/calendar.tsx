import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon } from '../../components/ui';
import { useHousehold } from '../../lib/household-context';
import { supabase } from '../../lib/supabase';
import { TaskListItem, TaskWithCompletion } from '../../components/TaskListItem';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const { theme, isDark } = useTheme();
  const { household, pets } = useHousehold();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [monthActivity, setMonthActivity] = useState<Record<string, boolean>>({}); // 'YYYY-MM-DD': hasActivity
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Calendar Generation Logic
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayIndex = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < startingDayIndex; i++) {
      days.push({ day: null, fullDate: null });
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ day: i, fullDate: d });
    }
    
    return days;
  }, [currentDate]);

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Fetch tasks for selected date
  const fetchTasksForDate = async () => {
    if (!household?.id) return;
    setLoading(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch active tasks
    // Note: Ideally we check if task was active ON that date, but for MVP we check currently active
    // and filter based on recurrence if possible, or just show all active for now.
    // Better: Check activity logs for completion status on that date.
    
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_active', true);

    const { data: logsData } = await supabase
      .from('activity_logs')
      .select('task_id, pet_id, completed_at')
      .eq('household_id', household.id)
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString());

    const tasksWithCompletion = (tasksData || []).map(task => {
      const taskLogs = (logsData || []).filter(log => log.task_id === task.id);
      const completedPetIds = [...new Set(taskLogs.map(log => log.pet_id))];
      const allPetsCompleted = task.pet_ids.length > 0 && task.pet_ids.every((petId: string) => 
        completedPetIds.includes(petId)
      );

      return {
        ...task,
        completedToday: allPetsCompleted,
        completedCount: completedPetIds.length,
      };
    });

    setTasks(tasksWithCompletion);
    setLoading(false);
  };

  // Fetch activity indicators for the whole month
  const fetchMonthActivity = async () => {
    if (!household?.id) return;
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    const { data: logsData } = await supabase
      .from('activity_logs')
      .select('completed_at')
      .eq('household_id', household.id)
      .gte('completed_at', startOfMonth.toISOString())
      .lte('completed_at', endOfMonth.toISOString());

    const activityMap: Record<string, boolean> = {};
    (logsData || []).forEach(log => {
      const dateKey = log.completed_at.split('T')[0];
      activityMap[dateKey] = true;
    });
    setMonthActivity(activityMap);
  };

  useEffect(() => {
    fetchTasksForDate();
  }, [selectedDate, household]);

  useEffect(() => {
    fetchMonthActivity();
  }, [currentDate, household]);

  const handleQuickComplete = async (task: TaskWithCompletion) => {
    // Logic similar to dashboard, but simplified or disallowed for past dates?
    // Allowing completion for past dates is good for catching up.
    if (completing || task.completedToday) return;
    setCompleting(task.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !household?.id) {
        setCompleting(null);
        return;
    }

    // Assume we complete for all uncompleted pets for this date
    // We need to be careful about the date used for completion. 
    // If we are on a past date, should we log it as completed THEN? 
    // Yes, create log with 'completed_at' set to the selected date (plus maybe current time or noon).
    
    const completionTime = new Date(selectedDate);
    // Preserve current time if today, otherwise set to noon or end of day
    const now = new Date();
    if (selectedDate.toDateString() === now.toDateString()) {
        completionTime.setHours(now.getHours(), now.getMinutes());
    } else {
        completionTime.setHours(12, 0, 0);
    }

    const logs = task.pet_ids.map((petId: string) => ({
        household_id: household.id,
        task_id: task.id,
        pet_id: petId,
        completed_by: user.id,
        status: 'completed',
        completed_at: completionTime.toISOString(),
    }));

    const { error } = await supabase.from('activity_logs').insert(logs);
    setCompleting(null);
    
    if (!error) {
        fetchTasksForDate();
        fetchMonthActivity();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="largeTitle" weight="bold">Calendar</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar View */}
        <View style={[styles.calendarCard, { backgroundColor: theme.surface }]}>
          {/* Month Nav */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <Icon name="chevron-back" size={24} color={theme.accent} />
            </TouchableOpacity>
            <Text variant="title2" weight="semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <Icon name="chevron-forward" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {/* Weekdays */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((day, i) => (
              <Text key={i} variant="caption1" color="tertiary" style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              if (!item.day) return <View key={index} style={styles.dayCell} />;
              
              const isSelected = item.fullDate?.toDateString() === selectedDate.toDateString();
              const isToday = item.fullDate?.toDateString() === new Date().toDateString();
              const dateKey = item.fullDate ? formatDateKey(item.fullDate) : '';
              const hasActivity = monthActivity[dateKey];

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: theme.accent, borderRadius: 20 },
                    !isSelected && isToday && { borderWidth: 1, borderColor: theme.accent, borderRadius: 20 }
                  ]}
                  onPress={() => item.fullDate && setSelectedDate(item.fullDate)}
                >
                  <Text 
                    variant="body" 
                    weight={isSelected || isToday ? 'semibold' : 'regular'}
                    style={{ color: isSelected ? '#FFF' : theme.text }}
                  >
                    {item.day}
                  </Text>
                  {hasActivity && !isSelected && (
                    <View style={[styles.dot, { backgroundColor: theme.success }]} />
                  )}
                  {hasActivity && isSelected && (
                    <View style={[styles.dot, { backgroundColor: '#FFF' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Title */}
        <View style={styles.dateHeader}>
          <Text variant="title3" weight="semibold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Task List */}
        <View style={styles.taskList}>
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="body" color="secondary">No tasks found for this date.</Text>
            </View>
          ) : (
            tasks.map(task => (
              <TaskListItem
                key={task.id}
                task={task}
                onComplete={handleQuickComplete}
                onPress={() => {}} // Maybe disable detail view navigation for calendar or keep it
                isCompleting={completing === task.id}
              />
            ))
          )}
        </View>
        
        <View style={{ height: 100 }} />
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
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
  },
  calendarCard: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.xl,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navButton: {
    padding: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dateHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  taskList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
});