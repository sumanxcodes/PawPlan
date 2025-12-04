import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Platform, StyleSheet, View } from 'react-native';

import CustomTabBar from '../../components/CustomTabBar'; // Import custom tab bar

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  
  // Apple HIG: Tab bars use Liquid Glass - translucent with content peeking through
  // Prefer filled symbols for selected state, outline for unselected
  return (
    <Tabs
      key={isDark ? 'dark' : 'light'}
      tabBar={props => <CustomTabBar {...props} />} // Use custom tab bar
      screenOptions={{
        headerShown: false,
        // The rest of the screenOptions can be simplified as CustomTabBar handles appearance
        // However, tabBarActiveTintColor and tabBarInactiveTintColor are still useful for icons in CustomTabBar
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 60, 67, 0.6)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          // Apple HIG: Prefer filled symbols for consistency
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'today' : 'today-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'checkbox' : 'checkbox-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          href: null, // Hidden - accessed from Today screen
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'paw' : 'paw-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={26} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
