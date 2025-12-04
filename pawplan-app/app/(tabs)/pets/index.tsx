import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useHousehold } from '../../../lib/household-context';
import { useTheme, spacing, radius } from '../../../lib/theme';
import { Text, Icon, Card, Button } from '../../../components/ui';

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  fish: '🐠',
  rabbit: '🐰',
  hamster: '🐹',
  reptile: '🦎',
  other: '🐾',
};

export default function PetsListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { pets, refreshHousehold, isLoading } = useHousehold();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshHousehold();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHousehold();
    setRefreshing(false);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age === 0) {
      // Less than a year, show months
      const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      return `${months}m old`;
    }
    
    return `${age}y old`;
  };

  const renderPetCard = ({ item }: { item: any }) => {
    const emoji = SPECIES_EMOJI[item.species?.toLowerCase()] || '🐾';
    const age = calculateAge(item.birth_date);
    
    return (
      <Card 
        variant="elevated" 
        onPress={() => router.push(`/(tabs)/pets/${item.id}`)}
        style={styles.petCard}
      >
        <View style={styles.petCardContent}>
          <View style={[styles.avatar, { backgroundColor: item.color_code || theme.accentBackground }]}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            )}
          </View>
          <View style={styles.petInfo}>
            <View style={styles.headerRow}>
              <Text variant="headline" weight="semibold">{item.name}</Text>
              {item.sex && (
                <Icon 
                  name={item.sex === 'male' ? 'male' : item.sex === 'female' ? 'female' : 'paw'} 
                  size={16} 
                  color={item.sex === 'male' ? '#3B82F6' : item.sex === 'female' ? '#EC4899' : theme.textTertiary} 
                />
              )}
            </View>
            
            <Text variant="subhead" color="secondary" style={styles.petDetails}>
              {item.species}{item.breed ? ` · ${item.breed}` : ''}
            </Text>

            <View style={styles.metaTags}>
              {age && (
                <View style={[styles.metaTag, { backgroundColor: theme.inputBackground }]}>
                  <Text variant="caption2" color="secondary">{age}</Text>
                </View>
              )}
              {item.weight_kg && (
                <View style={[styles.metaTag, { backgroundColor: theme.inputBackground }]}>
                  <Text variant="caption2" color="secondary">{item.weight_kg} kg</Text>
                </View>
              )}
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentBackground }]}>
        <Icon name="paw" size={48} color={theme.text} />
      </View>
      <Text variant="title2" weight="semibold" align="center" style={styles.emptyTitle}>
        No pets yet
      </Text>
      <Text variant="body" color="secondary" align="center" style={styles.emptySubtitle}>
        Add your first pet to start tracking their care
      </Text>
      <Button
        title="Add Your First Pet"
        onPress={() => router.push('/(tabs)/pets/add')}
        icon="add"
        size="lg"
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="largeTitle" weight="bold">Pets</Text>
        {pets.length > 0 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.tint }]}
            onPress={() => router.push('/(tabs)/pets/add')}
          >
            <Icon name="add" size={24} color={theme.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        renderItem={renderPetCard}
        contentContainerStyle={pets.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
      />
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
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  petCard: {
    marginBottom: spacing.sm,
  },
  petCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  petInfo: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petDetails: {
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  metaTags: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyTitle: {
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    marginBottom: spacing['2xl'],
  },
  emptyButton: {
    minWidth: 200,
  },
});