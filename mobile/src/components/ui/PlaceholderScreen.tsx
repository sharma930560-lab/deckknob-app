import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function PlaceholderScreen({ name, description }: { name: string; description: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.screenLabel}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.comingSoon}>Full implementation — Sprint 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  screenLabel: { fontSize: 24, fontWeight: '700', color: '#FAFAFA' },
  description: { fontSize: 15, color: '#A1A1AA', textAlign: 'center', lineHeight: 22 },
  comingSoon: { fontSize: 12, color: '#DFE104', fontWeight: '600', marginTop: 8 },
});

export default PlaceholderScreen;
