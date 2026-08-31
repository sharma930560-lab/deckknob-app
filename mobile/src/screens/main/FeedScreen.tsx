import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>DECKKNOB</Text>
        <View style={styles.logoDot} />
      </View>
      <View style={styles.body}>
        <Text style={styles.screenLabel}>Feed</Text>
        <Text style={styles.description}>
          Your personalized music feed — posts, stories, and klyps from people you follow.
        </Text>
        <Text style={styles.comingSoon}>Full implementation coming in Sprint 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  logo: { fontSize: 20, fontWeight: '800', color: '#FAFAFA', letterSpacing: 1 },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DFE104',
    marginLeft: 3,
    marginTop: 6,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  screenLabel: { fontSize: 24, fontWeight: '700', color: '#FAFAFA' },
  description: { fontSize: 15, color: '#A1A1AA', textAlign: 'center', lineHeight: 22 },
  comingSoon: { fontSize: 12, color: '#DFE104', fontWeight: '600', marginTop: 8 },
});
