import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../lib/household-context';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { household, membership } = useHousehold();

  async function handleCopyCode() {
    if (household?.invite_code) {
      await Clipboard.setStringAsync(household.invite_code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {household && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household</Text>
          <View style={styles.card}>
            <Text style={styles.householdName}>{household.name}</Text>
            <Text style={styles.roleText}>
              Role: {membership?.role === 'owner' ? '👑 Owner' : '👤 Member'}
            </Text>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Invite Code</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.codeBox}>
                <Text style={styles.codeText}>{household.invite_code}</Text>
                <Text style={styles.copyHint}>Tap to copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  householdName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  codeContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: '#4F46E5',
  },
  copyHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
