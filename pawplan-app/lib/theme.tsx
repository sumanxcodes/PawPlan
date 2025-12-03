import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@pawplan_theme_mode';

// Monotone color palette
const palette = {
  // Grays (main monotone scale)
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  gray950: '#0A0A0A',
  
  // Accent (subtle blue-gray for interactive elements)
  accent: '#3B82F6',
  accentLight: '#60A5FA',
  accentDark: '#2563EB',
  
  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

type StatusBarStyle = 'dark-content' | 'light-content';

export const lightTheme = {
  // Background colors
  background: palette.white,
  backgroundSecondary: palette.gray50,
  backgroundTertiary: palette.gray100,
  
  // Surface colors (cards, modals)
  surface: palette.white,
  surfaceSecondary: palette.gray50,
  surfaceBorder: palette.gray200,
  
  // Text colors
  text: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray400,
  textInverse: palette.white,
  
  // Interactive
  tint: palette.gray900,
  tintSecondary: palette.gray600,
  tintInactive: palette.gray400,
  
  // Accent
  accent: palette.accent,
  accentBackground: palette.gray100,
  
  // Semantic
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  
  // Specific components
  tabBar: palette.white,
  tabBarBorder: palette.gray200,
  separator: palette.gray200,
  inputBackground: palette.gray50,
  inputBorder: palette.gray200,
  
  // Status bar
  statusBar: 'dark-content' as StatusBarStyle,
  
  // Shadows
  shadow: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  shadowMedium: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const darkTheme: typeof lightTheme = {
  // Background colors
  background: palette.gray950,
  backgroundSecondary: palette.gray900,
  backgroundTertiary: palette.gray800,
  
  // Surface colors (cards, modals)
  surface: palette.gray900,
  surfaceSecondary: palette.gray800,
  surfaceBorder: palette.gray700,
  
  // Text colors
  text: palette.gray50,
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
  textInverse: palette.gray900,
  
  // Interactive
  tint: palette.white,
  tintSecondary: palette.gray400,
  tintInactive: palette.gray600,
  
  // Accent
  accent: palette.accentLight,
  accentBackground: palette.gray800,
  
  // Semantic
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  
  // Specific components
  tabBar: palette.gray900,
  tabBarBorder: palette.gray800,
  separator: palette.gray800,
  inputBackground: palette.gray800,
  inputBorder: palette.gray700,
  
  // Status bar
  statusBar: 'light-content' as StatusBarStyle,
  
  // Shadows
  shadow: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  shadowMedium: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
};

export type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved theme preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeMode(savedTheme);
      }
      setIsLoading(false);
    });
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Force re-render when system theme changes
      if (themeMode === 'system') {
        // The hook will automatically update, but we can force a state update
        setThemeMode('system');
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  // Determine if dark mode is active
  // useColorScheme() can return null, so we need to handle that
  const getSystemIsDark = () => {
    // Try the hook value first
    if (systemColorScheme !== null) {
      return systemColorScheme === 'dark';
    }
    // Fallback to Appearance API
    const appearance = Appearance.getColorScheme();
    return appearance === 'dark';
  };

  const isDark = themeMode === 'system' 
    ? getSystemIsDark()
    : themeMode === 'dark';
  
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const handleSetTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme: handleSetTheme, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Typography scale
export const typography = {
  // Size
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  
  // Line height multipliers
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

// Border radius
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};
