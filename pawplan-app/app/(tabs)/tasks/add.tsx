import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../lib/supabase';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon, Card, Button } from '../../../components/ui';
import { useHousehold } from '../../../lib/household-context';
import { TaskType, TaskFrequency } from '../../../lib/types';

const TASK_TYPES: { type: TaskType; icon: string; color: string; label: string }[] = [
  { type: 'food', icon: 'restaurant', color: '#FF9500', label: 'Feeding' },
  { type: 'meds', icon: 'medkit', color: '#FF3B30', label: 'Medication' },
  { type: 'walk', icon: 'walk', color: '#34C759', label: 'Walk' },
  { type: 'grooming', icon: 'cut', color: '#AF52DE', label: 'Grooming' },
  { type: 'other', icon: 'ellipsis-horizontal', color: '#8E8E93', label: 'Other' },
];

const FREQUENCIES: { value: TaskFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'One-time' },
];

export default function AddTaskScreen() {
  const { theme } = useTheme();
  const { household, pets } = useHousehold();
  
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<TaskFrequency>('daily');
  
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState<string>('');

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const getTimePeriod = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Morning ☀️';
    if (hour >= 12 && hour < 17) return 'Afternoon ⛅';
    return 'Evening 🌙';
  };

  const togglePet = (petId: string) => {
    setSelectedPets(prev => 
      prev.includes(petId) 
        ? prev.filter(id => id !== petId)
        : [...prev, petId]
    );
  };

  const selectAllPets = () => {
    if (selectedPets.length === pets.length) {
      setSelectedPets([]);
    } else {
      setSelectedPets(pets.map(p => p.id));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (selectedPets.length === 0) {
      Alert.alert('Error', 'Please select at least one pet');
      return;
    }

    if (!household?.id) {
      Alert.alert('Error', 'No household found');
      return;
    }

    // Validation for specific frequencies
    if (frequency === 'monthly') {
      const day = parseInt(dayOfMonth);
      if (isNaN(day) || day < 1 || day > 31) {
        Alert.alert('Error', 'Please enter a valid day of month (1-31)');
        return;
      }
    }

    if (frequency === 'once' && !scheduledDate) {
      Alert.alert('Error', 'Please select a date for one-time task');
      return;
    }

    setLoading(true);

    const recurrenceRule: Record<string, any> = {};
    
    // Add Time (HH:MM)
    if (scheduledTime) {
      recurrenceRule.time = scheduledTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }

    // Add Frequency specific rules
    if (frequency === 'monthly') {
      recurrenceRule.day_of_month = parseInt(dayOfMonth);
    } else if (frequency === 'once' && scheduledDate) {
      // Store date as YYYY-MM-DD
      recurrenceRule.date = scheduledDate.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('tasks')
      .insert({
        household_id: household.id,
        title: title.trim(),
        task_type: taskType,
        pet_ids: selectedPets,
        frequency,
        recurrence_rule: recurrenceRule,
        details: details.trim() || null,
        is_active: true,
      });

    setLoading(false);

    if (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    } else {
      router.back();
    }
  };

  const renderSchedulingInputs = () => {
    return (
      <View style={styles.section}>
        <Text variant="subhead" weight="medium" color="secondary" style={styles.label}>
          Schedule Details
        </Text>
        
        <View style={{ gap: spacing.md }}>
          {/* Date Picker for One-time */}
          {frequency === 'once' && (
            <TouchableOpacity
              style={[styles.input, styles.pickerButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-outline" size={20} color={theme.textSecondary} />
              <Text variant="body" style={{ color: scheduledDate ? theme.text : theme.textTertiary, flex: 1 }}>
                {scheduledDate ? scheduledDate.toLocaleDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Day of Month for Monthly */}
          {frequency === 'monthly' && (
            <View>
              <Text variant="caption1" color="secondary" style={{ marginBottom: 4 }}>Day of Month (1-31)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, color: theme.text }]}
                placeholder="e.g. 15"
                placeholderTextColor={theme.textTertiary}
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          )}

          {/* Time Picker (Always available/optional?) - Requirement says give time to select */}
          <TouchableOpacity
            style={[styles.input, styles.pickerButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon name="time-outline" size={20} color={theme.textSecondary} />
            <Text variant="body" style={{ color: scheduledTime ? theme.text : theme.textTertiary, flex: 1 }}>
              {scheduledTime 
                ? scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : 'Select Time (Optional)'
              }
            </Text>
            {scheduledTime && (
              <TouchableOpacity onPress={() => setScheduledTime(null)}>
                <Icon name="close-circle" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          {scheduledTime && (
            <Text variant="caption1" color="secondary" style={{ marginLeft: 4 }}>
              Appears in: <Text weight="semibold">{getTimePeriod(scheduledTime)}</Text>
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Text variant="body" color="secondary">Cancel</Text>
          </TouchableOpacity>
          <Text variant="headline" weight="semibold">New Task</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={loading}>
            <Text variant="body" weight="semibold" style={{ color: theme.accent }}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.section}>
            <Text variant="subhead" weight="medium" color="secondary" style={styles.label}>Task Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, color: theme.text }]}
              placeholder="e.g., Morning feeding"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
          </View>

          {/* Task Type */}
          <View style={styles.section}>
            <Text variant="subhead" weight="medium" color="secondary" style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {TASK_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: taskType === item.type ? item.color + '20' : theme.surface,
                      borderColor: taskType === item.type ? item.color : theme.surfaceBorder,
                    },
                  ]}
                  onPress={() => setTaskType(item.type)}
                >
                  <Icon name={item.icon as any} size={24} color={item.color} />
                  <Text
                    variant="caption1"
                    weight={taskType === item.type ? 'semibold' : 'regular'}
                    style={{ color: taskType === item.type ? item.color : theme.textSecondary }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pet Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="subhead" weight="medium" color="secondary">Pets</Text>
              <TouchableOpacity onPress={selectAllPets}>
                <Text variant="subhead" style={{ color: theme.accent }}>
                  {selectedPets.length === pets.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.petsGrid}>
              {pets.map((pet) => {
                const isSelected = selectedPets.includes(pet.id);
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[
                      styles.petCard,
                      {
                        backgroundColor: isSelected ? theme.accent + '15' : theme.surface,
                        borderColor: isSelected ? theme.accent : theme.surfaceBorder,
                      },
                    ]}
                    onPress={() => togglePet(pet.id)}
                  >
                    <View style={[styles.petAvatar, { backgroundColor: pet.color_code || theme.accentBackground }]}>
                      <Text style={styles.petEmoji}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                      </Text>
                    </View>
                    <Text variant="subhead" weight={isSelected ? 'semibold' : 'regular'}>
                      {pet.name}
                    </Text>
                    {isSelected && (
                      <Icon name="checkmark-circle" size={20} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text variant="subhead" weight="medium" color="secondary" style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.frequencyChip,
                    {
                      backgroundColor: frequency === item.value ? theme.text : theme.surface,
                      borderColor: frequency === item.value ? theme.text : theme.surfaceBorder,
                    },
                  ]}
                  onPress={() => setFrequency(item.value)}
                >
                  <Text
                    variant="subhead"
                    weight={frequency === item.value ? 'semibold' : 'regular'}
                    style={{ color: frequency === item.value ? theme.textInverse : theme.text }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Scheduling Inputs (Dynamic) */}
          {renderSchedulingInputs()}

          {/* Details */}
          <View style={styles.section}>
            <Text variant="subhead" weight="medium" color="secondary" style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, color: theme.text }]}
              placeholder="Any additional details..."
              placeholderTextColor={theme.textTertiary}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Time Picker Modal */}
        {(Platform.OS === 'ios' || Platform.OS === 'android') && (showTimePicker || showDatePicker) && (
          Platform.OS === 'ios' ? (
            <Modal visible={showTimePicker || showDatePicker} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
                    <TouchableOpacity onPress={() => { setShowTimePicker(false); setShowDatePicker(false); }}>
                      <Text variant="body" color="secondary">Cancel</Text>
                    </TouchableOpacity>
                    <Text variant="headline" weight="semibold">
                      {showTimePicker ? 'Select Time' : 'Select Date'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                       if (showTimePicker && !scheduledTime) setScheduledTime(new Date());
                       if (showDatePicker && !scheduledDate) setScheduledDate(new Date());
                       setShowTimePicker(false); 
                       setShowDatePicker(false); 
                    }}>
                      <Text variant="body" weight="semibold" style={{ color: theme.accent }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={showTimePicker ? (scheduledTime || new Date()) : (scheduledDate || new Date())}
                      mode={showTimePicker ? 'time' : 'date'}
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          if (showTimePicker) setScheduledTime(date);
                          else setScheduledDate(date);
                        }
                      }}
                      style={styles.timePicker}
                      textColor={theme.text}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            // Android Handling
            (showTimePicker || showDatePicker) && (
              <DateTimePicker
                value={showTimePicker ? (scheduledTime || new Date()) : (scheduledDate || new Date())}
                mode={showTimePicker ? 'time' : 'date'}
                display="default"
                onChange={(event, date) => {
                  if (showTimePicker) setShowTimePicker(false);
                  if (showDatePicker) setShowDatePicker(false);
                  if (event.type === 'set' && date) {
                    if (showTimePicker) setScheduledTime(date);
                    else setScheduledDate(date);
                  }
                }}
              />
            )
          )
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerButton: {
    minWidth: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minWidth: 80,
    gap: spacing.xs,
  },
  petsGrid: {
    gap: spacing.sm,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  petAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 20,
  },
  noPetsCard: {
    paddingVertical: spacing.xl,
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  frequencyChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing['4xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timePickerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  timePicker: {
    width: '100%',
    height: 216,
  },
});