import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon } from '../../components/ui';

export default function ThemeScreen() {
  const router = useRouter();
  const { theme, isDark, setTheme, themeMode } = useTheme();

  const handleSelectTheme = (mode: 'light' | 'dark') => {
    setTheme(mode);
  };

  const handleToggleSystemTheme = (value: boolean) => {
    setTheme(value ? 'system' : (isDark ? 'dark' : 'light'));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text variant="headline" weight="semibold">Display</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text variant="footnote" color="secondary" weight="semibold" style={styles.sectionTitle}>
          APPEARANCE
        </Text>

        <View style={styles.themeOptions}>
          <TouchableOpacity
            style={[styles.themeCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
            onPress={() => handleSelectTheme('light')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#F8F8F8' }]}>
              <View style={[styles.themePreviewContent, { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' }]}>
                <View style={styles.previewHeader} />
                <View style={styles.previewBody} />
                <View style={styles.previewGrid}>
                  <View style={[styles.previewGridItem, { backgroundColor: '#E0E0E0' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#60A5FA' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#22C55E' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#EF4444' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#E0E0E0' }]} />
                </View>
              </View>
            </View>
            <Text variant="body" style={{ marginTop: spacing.md }}>Light</Text>
            <View style={styles.radioContainer}>
              <View style={[styles.radioOuter, { borderColor: theme.textSecondary }]}>
                {themeMode === 'light' && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
              </View>
            </View>
          </TouchableOpacity>

          {/* Dark Theme Option */}
          <TouchableOpacity
            style={[styles.themeCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
            onPress={() => handleSelectTheme('dark')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#1C1C1E' }]}>
              <View style={[styles.themePreviewContent, { backgroundColor: '#000000', borderColor: '#333333' }]}>
                <View style={[styles.previewHeader, { backgroundColor: '#1C1C1E' }]} />
                <View style={[styles.previewBody, { backgroundColor: '#333333' }]} />
                <View style={styles.previewGrid}>
                  <View style={[styles.previewGridItem, { backgroundColor: '#333333' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#60A5FA' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#22C55E' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#EF4444' }]} />
                  <View style={[styles.previewGridItem, { backgroundColor: '#333333' }]} />
                </View>
              </View>
            </View>
            <Text variant="body" style={{ marginTop: spacing.md }}>Dark</Text>
            <View style={styles.radioContainer}>
              <View style={[styles.radioOuter, { borderColor: theme.textSecondary }]}>
                {themeMode === 'dark' && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Use Device Settings Toggle */}
        <View style={[styles.settingRow, { marginTop: spacing.xl }]}>
          <View>
            <Text variant="body" weight="medium">Use device settings</Text>
            <Text variant="caption1" color="secondary">
              Match appearance to your device's Display & Brightness settings.
            </Text>
          </View>
          <Switch
            value={themeMode === 'system'}
            onValueChange={handleToggleSystemTheme}
            trackColor={{ false: theme.inputBackground, true: theme.accent }}
            thumbColor={theme.white}
            ios_backgroundColor={theme.inputBackground}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  themePreview: {
    width: '100%',
    height: 120, // Adjust as needed
    borderRadius: radius.md,
    backgroundColor: '#CCC', // Placeholder background
  },
  radioContainer: {
    marginTop: spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: radius.lg,
  },
  themePreviewContent: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 5,
  },
  previewHeader: {
    height: 10,
    borderRadius: 2,
    marginBottom: 5,
  },
  previewBody: {
    height: 15,
    borderRadius: 2,
    marginBottom: 5,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  previewGridItem: {
    width: '31%',
    height: 30,
    borderRadius: 2,
  },
});
