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
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Button, Icon } from '../../components/ui';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Login Error', error.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="paw" size={48} color={theme.text} />
          <Text variant="largeTitle" weight="bold" style={styles.title}>
            PawPlan
          </Text>
          <Text variant="body" color="secondary">
            Welcome back
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
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordHeader}>
              <Text variant="subhead" weight="medium" style={styles.label}>
                Password
              </Text>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text variant="caption1" color="secondary">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="subhead" color="secondary">
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text variant="subhead" weight="semibold">
                Sign Up
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
    marginBottom: spacing['5xl'],
  },
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
});
