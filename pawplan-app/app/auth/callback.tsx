import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Text } from '../../components/ui';
import { useTheme } from '../../lib/theme';

export default function AuthCallbackScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  async function handleAuthCallback() {
    try {
      // Check if we have tokens in the URL params (from email confirmation)
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        // Set the session with the tokens from the URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          router.replace('/(auth)/login');
          return;
        }
      }

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User is authenticated, go to home
        router.replace('/(tabs)');
      } else {
        // No session, go to login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      router.replace('/(auth)/login');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text variant="body" color="secondary" style={styles.text}>
        Verifying your account...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
  },
});
