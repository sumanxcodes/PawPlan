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
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Button, Icon } from '../../components/ui';

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

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

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter the verification code (6-10 digits)');
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error.message);
    } else {
      // Verification successful - user is now logged in
      // Navigation will be handled by the auth state listener in _layout.tsx
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    setResending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCountdown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
            <Icon name="mail" size={40} color={theme.accent} />
          </View>
          <Text variant="title1" weight="bold" align="center">
            Verify your email
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
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
          title={loading ? 'Verifying...' : 'Verify Email'}
          onPress={handleVerify}
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
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['4xl'],
  },
  backButton: {
    marginBottom: spacing.xl,
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
  subtitle: {
    marginTop: spacing.md,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
