import { 
  View, 
  TextInput, 
  StyleSheet, 
  TextInputProps,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { useTheme, radius, spacing, typography } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({
  label,
  error,
  helper,
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="subhead" weight="medium" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: error ? theme.error : theme.inputBorder,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textTertiary}
        selectionColor={theme.accent}
        {...props}
      />
      {error && (
        <Text variant="caption1" color="error" style={styles.helper}>
          {error}
        </Text>
      )}
      {helper && !error && (
        <Text variant="caption1" color="tertiary" style={styles.helper}>
          {helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.base,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  helper: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
