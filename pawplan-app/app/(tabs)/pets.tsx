import { View, Text, StyleSheet } from 'react-native';

export default function PetsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐶</Text>
      <Text style={styles.title}>My Pets</Text>
      <Text style={styles.subtitle}>Add and manage your pets here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
