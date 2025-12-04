import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../lib/supabase';
import { useHousehold } from '../../../lib/household-context';
import { Pet } from '../../../lib/types';
import StreakBadge from '../../../components/StreakBadge';
import { useStreaks } from '../../../lib/hooks/useStreaks';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon, Card } from '../../../components/ui';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'cat', label: 'Cat', emoji: '🐱' },
  { value: 'bird', label: 'Bird', emoji: '🐦' },
  { value: 'fish', label: 'Fish', emoji: '🐠' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐰' },
  { value: 'hamster', label: 'Hamster', emoji: '🐹' },
  { value: 'reptile', label: 'Reptile', emoji: '🦎' },
  { value: 'other', label: 'Other', emoji: '🐾' },
];

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
];

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

export default function PetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household, refreshHousehold } = useHousehold();
  const { theme, isDark } = useTheme();
  
  const { data: streaks = [] } = useStreaks(household?.id, id);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchPet();
  }, [id]);

  async function fetchPet() {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPet(data);
      setName(data.name);
      setSpecies(data.species);
      setBreed(data.breed || '');
      setSex(data.sex || '');
      setColorCode(data.color_code || COLOR_OPTIONS[4]);
      setNotes(data.notes || '');
      setAvatarUrl(data.avatar_url);
      if (data.birth_date) {
        setBirthDate(new Date(data.birth_date));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pet');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }

  async function uploadImage(imageAsset: ImagePicker.ImagePickerAsset) {
    if (!household?.id || !pet?.id) return;
    setUploading(true);

    try {
      const base64 = imageAsset.base64;
      const fileName = `${household.id}/${pet.id}-${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('pet-avatars')
        .upload(fileName, decode(base64!), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('pet-avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload image. Check if storage bucket "pet-avatars" exists.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your pet');
      return;
    }
    if (!species) {
      Alert.alert('Error', 'Please select a species');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pets')
        .update({
          name: name.trim(),
          species,
          breed: breed.trim() || null,
          sex: sex || null,
          color_code: colorCode,
          avatar_url: avatarUrl,
          notes: notes.trim() || null,
          birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
        })
        .eq('id', id);

      if (error) throw error;

      await refreshHousehold();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update pet');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${pet?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pets')
                .delete()
                .eq('id', id);

              if (error) throw error;

              await refreshHousehold();
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete pet');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text variant="headline" weight="semibold">Edit Pet</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Text variant="body" weight="semibold" style={{ color: theme.accent }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colorCode || theme.accent }]}>
                <Text style={{ fontSize: 48 }}>
                  {SPECIES_OPTIONS.find(s => s.value === species)?.emoji || '🐾'}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              {uploading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Icon name="camera" size={16} color={theme.text} />
              )}
            </View>
          </TouchableOpacity>
          <Text variant="caption1" color="secondary" style={{ marginTop: spacing.xs }}>
            Tap to change photo
          </Text>
        </View>

        {/* General Info */}
        <View style={styles.section}>
          <Text variant="subhead" color="secondary" style={styles.sectionTitle}>GENERAL INFO</Text>
          <Card variant="elevated">
            <View style={styles.formRow}>
              <Text variant="body">Name</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Pet Name"
                placeholderTextColor={theme.textTertiary}
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            
            {/* Species Selection */}
            <View style={styles.formRowVertical}>
              <Text variant="body" style={{ marginBottom: spacing.sm }}>Species</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
                {SPECIES_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.speciesChip,
                      species === option.value 
                        ? { backgroundColor: theme.accent, borderColor: theme.accent }
                        : { backgroundColor: theme.background, borderColor: theme.surfaceBorder }
                    ]}
                    onPress={() => setSpecies(option.value)}
                  >
                    <Text style={{ fontSize: 16 }}>{option.emoji}</Text>
                    <Text 
                      variant="caption1" 
                      weight="medium"
                      style={{ color: species === option.value ? '#FFF' : theme.text }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Card>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text variant="subhead" color="secondary" style={styles.sectionTitle}>DETAILS</Text>
          <Card variant="elevated">
            <View style={styles.formRow}>
              <Text variant="body">Breed</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Optional"
                placeholderTextColor={theme.textTertiary}
                value={breed}
                onChangeText={setBreed}
                textAlign="right"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            
            {/* Birth Date */}
            <View style={styles.formRow}>
              <Text variant="body">Birth Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text variant="body" style={{ color: birthDate ? theme.text : theme.textTertiary }}>
                  {birthDate ? birthDate.toLocaleDateString() : 'Optional'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />

            {/* Sex Selection */}
            <View style={styles.formRow}>
              <Text variant="body">Sex</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {SEX_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sexChip,
                      sex === option.value 
                        ? { backgroundColor: theme.accent } 
                        : { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.surfaceBorder }
                    ]}
                    onPress={() => setSex(option.value)}
                  >
                    <Text 
                      variant="caption2" 
                      weight="semibold"
                      style={{ color: sex === option.value ? '#FFF' : theme.text }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text variant="subhead" color="secondary" style={styles.sectionTitle}>APPEARANCE</Text>
          <Card variant="elevated">
            <View style={styles.formRowVertical}>
              <Text variant="body" style={{ marginBottom: spacing.sm }}>Color Tag</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      colorCode === color && styles.colorCircleSelected,
                    ]}
                    onPress={() => setColorCode(color)}
                  >
                    {colorCode === color && <Icon name="checkmark" size={14} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text variant="subhead" color="secondary" style={styles.sectionTitle}>NOTES</Text>
          <Card variant="elevated">
            <TextInput
              style={[styles.textArea, { color: theme.text }]}
              placeholder="Any special care instructions..."
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              scrollEnabled={false}
            />
          </Card>
        </View>

        {/* Active Streaks (Read Only) */}
        {streaks.length > 0 && (
          <View style={styles.section}>
            <Text variant="subhead" color="secondary" style={styles.sectionTitle}>ACTIVE STREAKS</Text>
            <View style={styles.streaksRow}>
              {streaks.map((streak) => (
                <View key={streak.id} style={[styles.streakCard, { backgroundColor: theme.surface }]}>
                  <StreakBadge currentStreak={streak.current_streak} size={32} />
                  <View>
                    <Text variant="caption1" weight="bold">{streak.current_streak} Days</Text>
                    <Text variant="caption2" color="secondary">Best: {streak.longest_streak}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text variant="body" weight="semibold" color="error">Delete Pet</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      {(Platform.OS === 'ios' || Platform.OS === 'android') && showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text variant="body" color="secondary">Cancel</Text>
                  </TouchableOpacity>
                  <Text variant="headline" weight="semibold">Birth Date</Text>
                  <TouchableOpacity onPress={() => {
                     if (!birthDate) setBirthDate(new Date());
                     setShowDatePicker(false); 
                  }}>
                    <Text variant="body" weight="semibold" style={{ color: theme.accent }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={birthDate || new Date()}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) setBirthDate(date);
                    }}
                    style={styles.timePicker}
                    textColor={theme.text}
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={birthDate || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                setBirthDate(date);
              }
            }}
          />
        )
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
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
  headerButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  formRowVertical: {
    paddingVertical: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    paddingLeft: spacing.md,
  },
  textArea: {
    fontSize: 17,
    minHeight: 80,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: 0,
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    gap: 6,
  },
  sexChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  streaksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    minWidth: '45%',
  },
  deleteButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: '#FEE2E2', // Light red bg
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
