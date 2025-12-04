import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../lib/supabase';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Button, Icon } from '../../../components/ui';
import { Pet, Task } from '../../../lib/types';

const ACTIVITY_TYPES = [
  { type: 'walk', label: 'Walk', icon: 'walk', color: '#22C55E' },
  { type: 'food', label: 'Feeding', icon: 'restaurant', color: '#F59E0B' },
  { type: 'meds', label: 'Medicine', icon: 'medical', color: '#EF4444' },
  { type: 'grooming', label: 'Grooming', icon: 'cut', color: '#8B5CF6' },
  { type: 'vet', label: 'Vet Visit', icon: 'medkit', color: '#EC4899' },
  { type: 'play', label: 'Playtime', icon: 'game-controller', color: '#3B82F6' },
  { type: 'training', label: 'Training', icon: 'school', color: '#14B8A6' },
  { type: 'other', label: 'Other', icon: 'ellipse', color: '#6B7280' },
];

export default function LogActivityScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ activityType?: string }>();
  
  const [selectedType, setSelectedType] = useState<string>(params.activityType || '');
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  async function loadPets() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      setHouseholdId(memberData.household_id);

      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('household_id', memberData.household_id);

      if (petsData) {
        setPets(petsData);
        // Auto-select if only one pet
        if (petsData.length === 1) {
          setSelectedPets([petsData[0].id]);
        }
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  }

  function togglePet(petId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPets((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId]
    );
  }

  function selectActivityType(type: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
  }

  async function handleSave() {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }

    if (selectedPets.length === 0) {
      Alert.alert('Error', 'Please select at least one pet');
      return;
    }

    if (!householdId) {
      Alert.alert('Error', 'No household found');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create an activity log for each selected pet
      const activities = selectedPets.map((petId) => ({
        household_id: householdId,
        pet_id: petId,
        completed_by: user?.id,
        status: 'completed' as const,
        completed_at: date.toISOString(),
        note: note || selectedType,
      }));

      const { error } = await supabase.from('activity_logs').insert(activities);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Activity Type Selection */}
        <View style={styles.section}>
          <Text variant="subhead" weight="semibold" style={styles.sectionTitle}>
            Activity Type
          </Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_TYPES.map((activity) => (
              <TouchableOpacity
                key={activity.type}
                style={[
                  styles.activityType,
                  { backgroundColor: theme.surface },
                  selectedType === activity.type && {
                    borderColor: activity.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => selectActivityType(activity.type)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.activityTypeIcon,
                    {
                      backgroundColor:
                        selectedType === activity.type
                          ? activity.color + '20'
                          : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Icon
                    name={activity.icon as any}
                    size={24}
                    color={
                      selectedType === activity.type
                        ? activity.color
                        : theme.textSecondary
                    }
                  />
                </View>
                <Text
                  variant="caption1"
                  weight={selectedType === activity.type ? 'semibold' : 'regular'}
                  color={selectedType === activity.type ? 'primary' : 'secondary'}
                >
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pet Selection */}
        <View style={styles.section}>
          <Text variant="subhead" weight="semibold" style={styles.sectionTitle}>
            Pet{pets.length > 1 ? 's' : ''}
          </Text>
          {pets.length === 0 ? (
            <View style={[styles.emptyPets, { backgroundColor: theme.surface }]}>
              <Icon name="paw" size={32} color={theme.textTertiary} />
              <Text variant="body" color="secondary">
                No pets added yet
              </Text>
            </View>
          ) : (
            <View style={styles.petGrid}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petChip,
                    { backgroundColor: theme.surface },
                    selectedPets.includes(pet.id) && {
                      backgroundColor: theme.accent + '20',
                      borderColor: theme.accent,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => togglePet(pet.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.petAvatar,
                      {
                        backgroundColor: pet.color_code || theme.accent,
                      },
                    ]}
                  >
                    <Text variant="caption1" weight="bold" style={{ color: '#FFF' }}>
                      {pet.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    variant="subhead"
                    weight={selectedPets.includes(pet.id) ? 'semibold' : 'regular'}
                  >
                    {pet.name}
                  </Text>
                  {selectedPets.includes(pet.id) && (
                    <Icon name="checkmark-circle" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text variant="subhead" weight="semibold" style={styles.sectionTitle}>
            When
          </Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimePicker, { backgroundColor: theme.surface }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={20} color={theme.textSecondary} />
              <Text variant="body">{formatDate(date)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimePicker, { backgroundColor: theme.surface }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Icon name="time" size={20} color={theme.textSecondary} />
              <Text variant="body">{formatTime(date)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const newDate = new Date(date);
                  newDate.setFullYear(selectedDate.getFullYear());
                  newDate.setMonth(selectedDate.getMonth());
                  newDate.setDate(selectedDate.getDate());
                  setDate(newDate);
                }
              }}
              maximumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const newDate = new Date(date);
                  newDate.setHours(selectedDate.getHours());
                  newDate.setMinutes(selectedDate.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text variant="subhead" weight="semibold" style={styles.sectionTitle}>
            Notes (optional)
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.surfaceBorder,
              },
            ]}
            placeholder="Add any notes about this activity..."
            placeholderTextColor={theme.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <Button
          title={loading ? 'Saving...' : 'Log Activity'}
          onPress={handleSave}
          disabled={loading || !selectedType || selectedPets.length === 0}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityType: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  activityTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petGrid: {
    gap: spacing.sm,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  petAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPets: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateTimePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  notesInput: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
