import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../lib/household-context';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { theme, isDark, themeMode, setTheme } = useTheme();
  const { household, membership } = useHousehold();

  async function handleCopyCode() {
    if (household?.invite_code) {
      await Clipboard.setStringAsync(household.invite_code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="largeTitle" weight="bold">Settings</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Household Section */}
        {household && (
          <View style={styles.section}>
            <Text variant="footnote" color="secondary" weight="semibold" style={styles.sectionTitle}>
              HOUSEHOLD
            </Text>
            <Card variant="elevated">
              <View style={styles.householdHeader}>
                <View style={[styles.householdIcon, { backgroundColor: theme.accentBackground }]}>
                  <Icon name="home" size={24} color={theme.text} />
                </View>
                <View style={styles.householdInfo}>
                  <Text variant="headline" weight="semibold">{household.name}</Text>
                  <Text variant="subhead" color="secondary">
                    {membership?.role === 'owner' ? 'Owner' : 'Member'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.separator }]} />
              
              <TouchableOpacity onPress={handleCopyCode} style={styles.inviteCodeRow}>
                <View>
                  <Text variant="subhead" color="secondary">Invite Code</Text>
                  <Text variant="title3" weight="bold" style={styles.codeText}>
                    {household.invite_code}
                  </Text>
                </View>
                <Icon name="copy-outline" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text variant="footnote" color="secondary" weight="semibold" style={styles.sectionTitle}>
            APPEARANCE
          </Text>
          <Card variant="elevated">
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setTheme(themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accentBackground }]}>
                  <Icon name="contrast-outline" size={20} color={theme.text} />
                </View>
                <Text variant="body">Theme</Text>
              </View>
              <View style={styles.settingRight}>
                <Text variant="body" color="secondary">{getThemeLabel()}</Text>
                <Icon name="chevron-forward" size={18} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text variant="footnote" color="secondary" weight="semibold" style={styles.sectionTitle}>
            ACCOUNT
          </Text>
          <Card variant="elevated">
            <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text variant="body" color="error">Sign Out</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text variant="footnote" color="tertiary" align="center">
            PawPlan v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },
  householdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  householdIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  householdInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    letterSpacing: 3,
    marginTop: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    paddingVertical: spacing['3xl'],
  },
});
