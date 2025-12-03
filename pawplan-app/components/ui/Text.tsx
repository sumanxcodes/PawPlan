import { Text as RNText, TextStyle, StyleSheet, Platform } from 'react-native';
import { useTheme, typography } from '../../lib/theme';
import { ReactNode } from 'react';

interface TextProps {
  children: ReactNode;
  variant?: 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'callout' | 'subhead' | 'footnote' | 'caption1' | 'caption2';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent' | 'error' | 'success';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  numberOfLines?: number;
}

// iOS Human Interface Guidelines typography
const variants: Record<string, { fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16 },
  caption2: { fontSize: 11, lineHeight: 13, letterSpacing: 0.07 },
};

const weights: Record<string, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function Text({
  children,
  variant = 'body',
  weight = 'regular',
  color = 'primary',
  align = 'left',
  style,
  numberOfLines,
}: TextProps) {
  const { theme } = useTheme();

  const colorMap = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    inverse: theme.textInverse,
    accent: theme.accent,
    error: theme.error,
    success: theme.success,
  };

  const variantStyle = variants[variant];
  const defaultWeight = variant === 'headline' ? 'semibold' : weight;

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          letterSpacing: variantStyle.letterSpacing,
          fontWeight: weights[defaultWeight],
          color: colorMap[color],
          textAlign: align,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
