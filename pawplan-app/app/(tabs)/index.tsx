import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme, spacing } from '../../lib/theme';
import { Text, Icon, Card } from '../../components/ui';
import { useHousehold } from '../../lib/household-context';

export default function TodayScreen() {
  const { theme } = useTheme();
  const { household, pets } = useHousehold();

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text variant="footnote" color="secondary" weight="medium">
          {dateString.toUpperCase()}
        </Text>
        <Text variant="largeTitle" weight="bold">Today</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="paw" size={24} color={theme.text} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              {pets.length}
            </Text>
            <Text variant="caption1" color="secondary">
              {pets.length === 1 ? 'Pet' : 'Pets'}
            </Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="checkmark-circle-outline" size={24} color={theme.success} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              0
            </Text>
            <Text variant="caption1" color="secondary">
              Tasks Done
            </Text>
          </Card>
          <Card variant="filled" style={styles.statCard}>
            <Icon name="time-outline" size={24} color={theme.warning} />
            <Text variant="title2" weight="bold" style={styles.statNumber}>
              0
            </Text>
            <Text variant="caption1" color="secondary">
              Pending
            </Text>
          </Card>
        </View>

        {/* Empty State for Tasks */}
        <View style={styles.section}>
          <Text variant="headline" weight="semibold" style={styles.sectionTitle}>
            Today's Tasks
          </Text>
          <Card variant="elevated" style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentBackground }]}>
              <Icon name="checkbox-outline" size={32} color={theme.textSecondary} />
            </View>
            <Text variant="headline" weight="semibold" align="center">
              No tasks scheduled
            </Text>
            <Text variant="subhead" color="secondary" align="center" style={styles.emptySubtext}>
              Add tasks to your pets to start tracking their daily care
            </Text>
          </Card>
        </View>

        {/* Pets Overview */}
        {pets.length > 0 && (
          <View style={styles.section}>
            <Text variant="headline" weight="semibold" style={styles.sectionTitle}>
              Your Pets
            </Text>
            <View style={styles.petsList}>
              {pets.map((pet) => (
                <Card key={pet.id} variant="elevated" style={styles.petMiniCard}>
                  <View style={[styles.petAvatar, { backgroundColor: pet.color_code || theme.accentBackground }]}>
                    <Text style={styles.petEmoji}>
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                    </Text>
                  </View>
                  <Text variant="subhead" weight="medium">{pet.name}</Text>
                </Card>
              ))}
            </View>
          </View>
        )}
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
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statNumber: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptySubtext: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  petsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  petMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  petAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 16,
  },
});
