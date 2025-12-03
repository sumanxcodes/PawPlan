import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function TasksLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="add" 
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
