import { useEffect, useState, createContext, useContext } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { HouseholdProvider, useHousehold } from '../lib/household-context';
import { ThemeProvider, useTheme } from '../lib/theme';

// Key for tracking password reset flow
export const PASSWORD_RESET_FLAG = 'pawplan_password_reset_in_progress';

// Context to share the clearPasswordReset function
type PasswordResetContextType = {
  clearPasswordReset: () => Promise<void>;
};
const PasswordResetContext = createContext<PasswordResetContextType | null>(null);
export const usePasswordReset = () => useContext(PasswordResetContext);

function RootLayoutNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const { household, isLoading: householdLoading } = useHousehold();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check if we're in password reset flow
    AsyncStorage.getItem(PASSWORD_RESET_FLAG).then((value) => {
      setIsPasswordReset(value === 'true');
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Track if this is a password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          await AsyncStorage.setItem(PASSWORD_RESET_FLAG, 'true');
          setIsPasswordReset(true);
        }
        // Re-check the flag on SIGNED_IN (OTP verification triggers this)
        if (event === 'SIGNED_IN') {
          const flag = await AsyncStorage.getItem(PASSWORD_RESET_FLAG);
          setIsPasswordReset(flag === 'true');
        }
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Function to clear password reset state (called from reset-password screen)
  const clearPasswordReset = async () => {
    await AsyncStorage.removeItem(PASSWORD_RESET_FLAG);
    setIsPasswordReset(false);
  };

  useEffect(() => {
    if (isLoading || householdLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inResetPassword = segments[1] === 'reset-password';
    const inForgotPassword = segments[1] === 'forgot-password';
    const inAuthCallback = segments[0] === 'auth'; // For auth/callback deep link

    // Skip redirect if in auth callback (handling email verification)
    if (inAuthCallback) return;

    // Skip redirect if user is in forgot-password or reset-password screens
    if (inForgotPassword || inResetPassword) {
      return;
    }

    // If in password reset flow, go to reset-password screen
    if (isPasswordReset && session) {
      router.replace('/(auth)/reset-password');
      return;
    }

    if (!session && !inAuthGroup) {
      // No session -> redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Session exists and in auth group -> check household
      if (household) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)');
      }
    } else if (session && !household && inTabsGroup) {
      // Has session but no household and trying to access tabs
      router.replace('/(onboarding)');
    } else if (session && household && inOnboardingGroup) {
      // Has household but in onboarding
      router.replace('/(tabs)');
    }
  }, [session, household, segments, isLoading, householdLoading, isPasswordReset]);

  if (isLoading || householdLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <StatusBar barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <PasswordResetContext.Provider value={{ clearPasswordReset }}>
      <StatusBar barStyle={theme.statusBar} />
      <Slot />
    </PasswordResetContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <HouseholdProvider>
        <RootLayoutNav />
      </HouseholdProvider>
    </ThemeProvider>
  );
}
