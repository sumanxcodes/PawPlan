import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme, spacing, radius } from '../lib/theme';
import { Text, Icon } from './ui';
import { Ionicons } from '@expo/vector-icons';

// Helper to map Ionicons names
const getTabBarIconName = (routeName: string, focused: boolean) => {
  switch (routeName) {
    case 'index':
      return focused ? 'today' : 'today-outline';
    case 'calendar':
      return focused ? 'calendar' : 'calendar-outline';
    case 'tasks':
      return focused ? 'checkbox' : 'checkbox-outline';
    case 'pets':
      return focused ? 'paw' : 'paw-outline';
    case 'settings':
      return focused ? 'settings' : 'settings-outline';
    default:
      return focused ? 'help-circle' : 'help-circle-outline';
  }
};

interface CustomTabBarProps extends BottomTabBarProps {}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const focusedTabWidth = useRef(new Animated.Value(0)).current;
  const focusedTabOffset = useRef(new Animated.Value(0)).current;
  const tabWidth = (spacing.md * 2) + 50; // Estimate: padding + icon size + label size

  useEffect(() => {
    // Calculate layout for animations only when the component is mounted
    // This is a placeholder; actual width calculation needs onLayout.
    // For now, we'll animate to a fixed width/offset.
  }, []);

  useEffect(() => {
    const focusedRoute = state.routes[state.index];
    const focusedDescriptor = descriptors[focusedRoute.key];
    const focusedOptions = focusedDescriptor.options;

    // Simulate item width (needs to be dynamic based on layout measurement)
    // For this design, selected tab expands.
    // This is a simplified animation. Full implementation needs onLayout for each tab.
    const selectedTabActualWidth = 60; // Approximate width of selected tab
    const unselectedTabActualWidth = 40; // Approximate width of unselected tab
    const totalWidth = (state.routes.length - 1) * unselectedTabActualWidth + selectedTabActualWidth;

    // This part is complex without actual layout values.
    // For now, let's focus on the visual rendering of items.

  }, [state.index, tabWidth]); // Re-run when active tab changes

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { backgroundColor: theme.tint, borderColor: theme.surfaceBorder }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconName = getTabBarIconName(route.name, isFocused);
          const iconColor = isFocused ? theme.textInverse : theme.tintInactive;
          const labelColor = isFocused ? theme.textInverse : theme.tintInactive;


          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              // accessibilityLabel={options.tabBarAccessibilityLabel} // Removed
              // testID={options.tabBarTestID} // Removed
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tabItem,
                isFocused && { backgroundColor: theme.accent, borderRadius: radius.full } // Selected background
              ]}
            >
              <Ionicons name={iconName as any} size={24} color={iconColor} />
              {/* <Text style={[styles.tabLabel, { color: labelColor }]}>
                {options.title || route.name}
              </Text> */}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    height: 60, // Fixed height for the floating bar
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Placeholder for blur
    borderRadius: radius.full, // Capsule shape
    height: '100%',
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1, // Distribute space evenly
    justifyContent: 'center',
    alignItems: 'center',
    height: '80%', // Make selected item a bit shorter than bar for capsule effect
    maxWidth: 60, // Limit individual item width for selected state
    minWidth: 40,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default CustomTabBar;
