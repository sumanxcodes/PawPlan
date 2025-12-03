import { useState, useEffect } from 'react';
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
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<'email' | 'otp'>('email');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string) => {
    // Only allow numbers, max 10 digits (Supabase OTP is 6-10 digits)
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 10);
    setOtp(sanitized);
  };

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
      setCountdown(60);
    }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter the verification code (6-10 digits)');
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

  async function handleResend() {
    if (countdown > 0) return;
    
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setResending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCountdown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    }
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
            <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
              <Icon name="mail-open" size={40} color={theme.accent} />
            </View>
            <Text variant="title1" weight="bold" style={styles.title}>
              Check Your Email
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              We sent a verification code to{'\n'}
              <Text variant="body" weight="semibold">{email}</Text>
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              style={[
                styles.otpInput,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: otp.length >= 6 ? theme.accent : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="Enter code"
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
            <Text variant="caption1" color="secondary" style={styles.otpHint}>
              Enter the 6-10 digit code from your email
            </Text>
          </View>

          <Button
            title={loading ? 'Verifying...' : 'Verify Code'}
            onPress={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />

          <View style={styles.resendContainer}>
            <Text variant="subhead" color="secondary">
              Didn't receive the code?{' '}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending}>
              <Text 
                variant="subhead" 
                weight="semibold"
                style={{ 
                  color: countdown > 0 ? theme.textTertiary : theme.accent,
                }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.backToEmailButton}
            onPress={() => {
              setStep('email');
              setOtp('');
            }}
          >
            <Icon name="arrow-back" size={16} color={theme.textSecondary} />
            <Text variant="subhead" color="secondary">
              Back to email
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
    marginBottom: spacing['3xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
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
  otpContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  otpInput: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderRadius: radius.lg,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 8,
  },
  otpHint: {
    marginTop: spacing.sm,
  },
  button: {
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  backToEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
