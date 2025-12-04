import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from './ui';
import { useTheme, spacing, radius } from '../lib/theme';

export interface StreakBadgeProps {
  currentStreak: number;
  longestStreak?: number;
  size?: number;
}

export function StreakBadge({ currentStreak, longestStreak, size = 40 }: StreakBadgeProps) {
  const { theme } = useTheme();
  const isHot = currentStreak >= 3;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: isHot ? theme.accent : theme.inputBackground }]}>  
      <Icon name={isHot ? 'flame' : 'star'} size={size * 0.6} color={isHot ? theme.warning : theme.textSecondary} />
      <Text variant="caption1" weight="bold" style={{ color: theme.text, position: 'absolute', bottom: 4, alignSelf: 'center' }}>
        {currentStreak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
});

export default StreakBadge;
