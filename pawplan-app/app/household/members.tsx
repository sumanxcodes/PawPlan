import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../lib/household-context';
import { useTheme, spacing, radius } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';

export default function MembersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { household, membership } = useHousehold();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (household?.id) {
      fetchMembers();
    }
  }, [household?.id]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('household_id', household?.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', 'Failed to load household members');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (membership?.role !== 'owner') return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('household_members')
                .delete()
                .eq('id', memberId);

              if (error) throw error;
              fetchMembers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  }

  const renderMember = ({ item }: { item: any }) => {
    const profile = item.profiles;
    const isMe = profile?.id === membership?.user_id;
    const isOwner = item.role === 'owner';
    const canRemove = membership?.role === 'owner' && !isOwner;

    return (
      <Card style={[styles.memberCard, { backgroundColor: theme.surface }]}>
        <View style={styles.memberRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.inputBackground }]}>
              <Text weight="bold" color="secondary" style={{ fontSize: 18 }}>
                {(profile?.full_name?.[0] || profile?.email?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text variant="body" weight="semibold">
                {profile?.full_name || profile?.email || 'Unknown'}
              </Text>
              {isMe && (
                <View style={[styles.badge, { backgroundColor: theme.accent + '20' }]}>
                  <Text variant="caption2" style={{ color: theme.accent }} weight="bold">YOU</Text>
                </View>
              )}
            </View>
            <Text variant="caption1" color="secondary" style={styles.roleText}>
              {item.role.toUpperCase()} • Joined {new Date(item.joined_at).toLocaleDateString()}
            </Text>
          </View>

          {canRemove && (
            <TouchableOpacity 
              onPress={() => handleRemoveMember(item.id, profile?.full_name || 'User')}
              style={styles.removeButton}
            >
              <Icon name="trash-outline" size={20} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/settings')} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text variant="headline" weight="semibold">Household Members</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="body" color="secondary">No members found</Text>
            </View>
          }
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  memberCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  roleText: {
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  removeButton: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
