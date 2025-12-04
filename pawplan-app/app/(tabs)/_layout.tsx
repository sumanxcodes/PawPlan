import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme'; // Removed spacing and radius
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur'; // Re-added BlurView

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  
  return (
    <Tabs
      key={isDark ? 'dark' : 'light'}
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 60, 67, 0.6)',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: 'transparent', // Make it transparent for BlurView to work
          borderTopWidth: 0, // Remove default border
          elevation: 0, // Remove shadow on Android
          height: Platform.OS === 'ios' ? 88 : 60, // Standard iOS height with safe area
          paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Adjust for safe area on iOS
        },
        tabBarBackground: () => (
          <BlurView
            intensity={95} // Standard iOS blur intensity
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarItemStyle: {
          paddingVertical: 5, // Default padding for items
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
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