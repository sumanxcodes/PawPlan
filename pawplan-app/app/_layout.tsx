import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { HouseholdProvider, useHousehold } from '../lib/household-context';
import { ThemeProvider, useTheme } from '../lib/theme';

function RootLayoutNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { household, isLoading: householdLoading } = useHousehold();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading || householdLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

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
  }, [session, household, segments, isLoading, householdLoading]);

  if (isLoading || householdLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <StatusBar barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={theme.statusBar} />
      <Slot />
    </>
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
