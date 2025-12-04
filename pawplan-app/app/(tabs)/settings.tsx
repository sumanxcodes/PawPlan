import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, ActionSheetIOS, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../lib/household-context';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { theme, isDark, themeMode, setTheme } = useTheme();
  const { household, membership, refreshHousehold } = useHousehold();
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (household?.id) {
      const fetchMembers = async () => {
        const { data, error } = await supabase
          .from('household_members')
          .select(`
            role,
            profiles (
              full_name,
              avatar_url,
              email
            )
          `)
          .eq('household_id', household.id)
          .order('joined_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching members:', error);
        } else {
          setMembers(data || []);
        }
      };
      fetchMembers();
    }
  }, [household?.id]);

  async function handleCopyCode() {
    if (household?.invite_code) {
      await Clipboard.setStringAsync(household.invite_code);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  }

  async function handleLeaveHousehold() {
    const isOwner = membership?.role === 'owner';
    const title = isOwner ? 'Delete Household' : 'Leave Household';
    const message = isOwner 
      ? 'This will permanently delete the household, all pets, and tasks. This action cannot be undone.'
      : 'Are you sure you want to leave this household?';

    const confirmAction = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !household) return;

        if (isOwner) {
          // Owner: Delete all related data, then the household
          // Delete tasks first
          await supabase
            .from('tasks')
            .delete()
            .eq('household_id', household.id);

          // Delete pets
          await supabase
            .from('pets')
            .delete()
            .eq('household_id', household.id);

          // Delete all household members
          await supabase
            .from('household_members')
            .delete()
            .eq('household_id', household.id);

          // Delete the household
          const { error } = await supabase
            .from('households')
            .delete()
            .eq('id', household.id);

          if (error) throw error;
        } else {
          // Member: Just remove themselves from household_members
          const { error } = await supabase
            .from('household_members')
            .delete()
            .eq('household_id', household.id)
            .eq('user_id', user.id);

          if (error) throw error;
        }

        // Refresh household context and redirect to onboarding
        await refreshHousehold();
        router.replace('/(onboarding)');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to leave household');
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', title],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: title,
          message: message,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            confirmAction();
          }
        }
      );
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: title,
          style: 'destructive',
          onPress: confirmAction,
        },
      ]);
    }
  }

  function handleThemeChange() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Light', 'Dark', 'System'],
          cancelButtonIndex: 0,
          title: 'Choose Theme',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setTheme('light');
          else if (buttonIndex === 2) setTheme('dark');
          else if (buttonIndex === 3) setTheme('system');
        }
      );
    } else {
      // Android: cycle through options
      setTheme(themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system');
    }
  }

  async function handleSignOut() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Sign Out'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Are you sure you want to sign out?',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await supabase.auth.signOut();
          }
        }
      );
    } else {
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

              <View style={[styles.divider, { backgroundColor: theme.separator }]} />

              <TouchableOpacity onPress={handleLeaveHousehold} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Icon 
                      name={membership?.role === 'owner' ? 'trash-outline' : 'exit-outline'} 
                      size={20} 
                      color="#EF4444" 
                    />
                  </View>
                  <Text variant="body" color="error">
                    {membership?.role === 'owner' ? 'Delete Household' : 'Leave Household'}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Members Section */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text variant="footnote" color="secondary" weight="semibold" style={styles.sectionTitle}>
              MEMBERS ({members.length})
            </Text>
            <Card variant="elevated">
              {members.map((member, index) => (
                <View key={index}>
                  <View style={styles.memberRow}>
                    <View style={styles.memberLeft}>
                      {member.profiles?.avatar_url ? (
                        <Image source={{ uri: member.profiles.avatar_url }} style={styles.memberAvatar} />
                      ) : (
                        <View style={[styles.memberAvatar, { backgroundColor: theme.inputBackground, justifyContent: 'center', alignItems: 'center' }]}>
                          <Text weight="bold" color="secondary">
                            {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text variant="body" weight="medium">
                          {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
                        </Text>
                        <Text variant="caption1" color="secondary" style={{ textTransform: 'capitalize' }}>
                          {member.role}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < members.length - 1 && (
                    <View style={[styles.settingDivider, { backgroundColor: theme.separator }]} />
                  )}
                </View>
              ))}
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
              onPress={handleThemeChange}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accentBackground }]}>
                  <Icon name={isDark ? 'moon' : 'sunny'} size={20} color={theme.text} />
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
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
    marginVertical: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});