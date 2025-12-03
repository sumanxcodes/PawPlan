import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Button, Icon } from '../../components/ui';
import { PASSWORD_RESET_FLAG } from '../_layout';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');

  async function handleSendOtp() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setStep('otp');
    }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the verification code from your email');
      return;
    }

    setLoading(true);
    
    // Set the password reset flag BEFORE verifying OTP
    await AsyncStorage.setItem(PASSWORD_RESET_FLAG, 'true');
    
    // Verify OTP and get session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });

    if (verifyError) {
      // Clear the flag if verification fails
      await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
      Alert.alert('Error', verifyError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    // Navigate to new password screen
    router.push('/(auth)/reset-password');
  }

  // OTP verification state
  if (step === 'otp') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Icon name="mail-open" size={48} color={theme.text} />
            <Text variant="title1" weight="bold" style={styles.title}>
              Check Your Email
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              We sent a verification code to{'\n'}
              <Text variant="body" weight="semibold">{email}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text variant="subhead" weight="medium" style={styles.label}>
                Verification Code
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  { 
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                placeholder="Enter code"
                placeholderTextColor={theme.textTertiary}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                autoFocus
              />
            </View>

            <Button
              title={loading ? 'Verifying...' : 'Verify Code'}
              onPress={handleVerifyOtp}
              disabled={loading}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.button}
            />
          </View>

          <TouchableOpacity 
            style={styles.resendButton}
            onPress={() => {
              handleSendOtp();
            }}
          >
            <Text variant="subhead" color="secondary">
              Didn't receive the code?{' '}
            </Text>
            <Text variant="subhead" weight="semibold">
              Resend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep('email')}
          >
            <Text variant="subhead" color="secondary">
              ← Back to email
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="lock-closed" size={48} color={theme.text} />
          <Text variant="title1" weight="bold" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Enter your email and we'll send you a verification code.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text variant="subhead" weight="medium" style={styles.label}>
              Email
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
              placeholder="your@email.com"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
          </View>

          <Button
            title={loading ? 'Sending...' : 'Send Code'}
            onPress={handleSendOtp}
            disabled={loading}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="subhead" color="secondary">
            Remember your password?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text variant="subhead" weight="semibold">
                Sign In
              </Text>
            </TouchableOpacity>
          </Link>
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
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
  },
  button: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
  resendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  backButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
