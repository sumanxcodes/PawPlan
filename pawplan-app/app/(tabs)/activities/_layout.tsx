import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function ActivitiesLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Activity',
          headerLargeTitle: true,
          headerLargeTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="log"
        options={{
          title: 'Log Activity',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
