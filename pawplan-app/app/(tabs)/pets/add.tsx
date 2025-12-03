import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useHousehold } from '../../../lib/household-context';

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

export default function AddPetScreen() {
  const router = useRouter();
  const { household, refreshHousehold } = useHousehold();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('');
  const [colorCode, setColorCode] = useState(COLOR_OPTIONS[4]);
  const [notes, setNotes] = useState('');

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your pet');
      return;
    }
    if (!species) {
      Alert.alert('Error', 'Please select a species');
      return;
    }
    if (!household) {
      Alert.alert('Error', 'No household found');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pets').insert({
        household_id: household.id,
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        sex: sex || null,
        color_code: colorCode,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      await refreshHousehold();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Pet</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="What's your pet's name?"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Species */}
        <View style={styles.section}>
          <Text style={styles.label}>Species *</Text>
          <View style={styles.optionsGrid}>
            {SPECIES_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.speciesOption,
                  species === option.value && styles.speciesOptionSelected,
                ]}
                onPress={() => setSpecies(option.value)}
              >
                <Text style={styles.speciesEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.speciesLabel,
                    species === option.value && styles.speciesLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Breed */}
        <View style={styles.section}>
          <Text style={styles.label}>Breed (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Golden Retriever"
            placeholderTextColor="#9CA3AF"
            value={breed}
            onChangeText={setBreed}
          />
        </View>

        {/* Sex */}
        <View style={styles.section}>
          <Text style={styles.label}>Sex (optional)</Text>
          <View style={styles.sexOptions}>
            {SEX_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sexOption,
                  sex === option.value && styles.sexOptionSelected,
                ]}
                onPress={() => setSex(option.value)}
              >
                <Text
                  style={[
                    styles.sexLabel,
                    sex === option.value && styles.sexLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <View style={styles.section}>
          <Text style={styles.label}>Color Tag</Text>
          <View style={styles.colorOptions}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  colorCode === color && styles.colorOptionSelected,
                ]}
                onPress={() => setColorCode(color)}
              >
                {colorCode === color && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special notes about your pet..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  saveButtonDisabled: {
    color: '#9CA3AF',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  speciesOption: {
    width: '23%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  speciesOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  speciesEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  speciesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  speciesLabelSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  sexOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  sexOption: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sexOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  sexLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  sexLabelSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
