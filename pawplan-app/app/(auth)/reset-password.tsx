import { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Button, Icon } from '../../components/ui';
import { usePasswordReset } from '../_layout';

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const passwordResetContext = usePasswordReset();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleResetPassword() {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    } else {
      // Don't clear flag here - we'll do it when user clicks Continue
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Icon name="checkmark-circle" size={64} color={theme.success} />
            <Text variant="title1" weight="bold" style={styles.title}>
              Password Updated!
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Your password has been successfully reset. You are now signed in.
            </Text>
          </View>

          <Button
            title="Continue to App"
            onPress={async () => {
              // Clear the password reset flag
              await passwordResetContext?.clearPasswordReset();
              // Navigate to tabs (or onboarding if no household - _layout will handle)
              router.replace('/(tabs)');
            }}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="key" size={48} color={theme.text} />
          <Text variant="title1" weight="bold" style={styles.title}>
            Create New Password
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Enter your new password below.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text variant="subhead" weight="medium" style={styles.label}>
              New Password
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Enter new password"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />
          </View>

          <View style={styles.inputContainer}>
            <Text variant="subhead" weight="medium" style={styles.label}>
              Confirm Password
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <Button
            title={loading ? 'Updating...' : 'Update Password'}
            onPress={handleResetPassword}
            disabled={loading}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
  },
  button: {
    marginTop: spacing.sm,
  },
});
