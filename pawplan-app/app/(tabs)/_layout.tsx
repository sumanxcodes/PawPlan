import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  
  // Apple HIG: Tab bars use Liquid Glass - translucent with content peeking through
  // Prefer filled symbols for selected state, outline for unselected
  return (
    <Tabs
      key={isDark ? 'dark' : 'light'}
      screenOptions={{
        // Apple HIG: Use appropriate tint colors
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 60, 67, 0.6)',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 34 : 10,
          // Transparent to show Liquid Glass blur
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        // Apple HIG: Liquid Glass background
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 100 : 80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle tint overlay for Liquid Glass effect */}
            <View 
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark 
                    ? 'rgba(25, 25, 25, 0.6)' 
                    : 'rgba(255, 255, 255, 0.75)',
                }
              ]} 
            />
            {/* Top border line */}
            <View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: StyleSheet.hairlineWidth,
                backgroundColor: isDark 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'rgba(0, 0, 0, 0.15)',
              }}
            />
          </View>
        ),
        // Apple HIG: Labels should be short, single words
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 4,
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
