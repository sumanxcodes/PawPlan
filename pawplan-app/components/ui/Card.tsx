import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useTheme, radius, spacing } from '../../lib/theme';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export function Card({ children, onPress, style, variant = 'elevated' }: CardProps) {
  const { theme } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.surface,
          ...theme.shadow,
        };
      case 'outlined':
        return {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.surfaceBorder,
        };
      case 'filled':
        return {
          backgroundColor: theme.surfaceSecondary,
        };
      default:
        return {
          backgroundColor: theme.surface,
        };
    }
  };

  const content = (
    <View style={[styles.card, getVariantStyles(), style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
