import { 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { useTheme, radius, spacing } from '../../lib/theme';
import { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconsName;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme, isDark } = useTheme();

  const sizes = {
    sm: { height: 36, paddingHorizontal: spacing.md, iconSize: 16, fontSize: 14 },
    md: { height: 44, paddingHorizontal: spacing.lg, iconSize: 18, fontSize: 16 },
    lg: { height: 52, paddingHorizontal: spacing.xl, iconSize: 20, fontSize: 17 },
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? theme.tintInactive : theme.tint,
          textColor: theme.textInverse,
        };
      case 'secondary':
        return {
          backgroundColor: theme.surfaceSecondary,
          textColor: theme.text,
          borderWidth: 1,
          borderColor: theme.surfaceBorder,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.text,
        };
      case 'destructive':
        return {
          backgroundColor: disabled ? theme.tintInactive : theme.error,
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: theme.tint,
          textColor: theme.textInverse,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth || 0,
          borderColor: variantStyles.borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.textColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={styles.iconLeft}
            />
          )}
          <Text
            variant="headline"
            style={{ 
              color: variantStyles.textColor, 
              fontSize: sizeStyles.fontSize,
            }}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
