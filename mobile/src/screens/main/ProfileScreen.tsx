import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import authStore from '../../stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = authStore();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>@{user?.username}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || user?.username}</Text>
        <Text style={styles.role}>{user?.role}</Text>
        <Text style={styles.bio}>{user?.bio || 'No bio yet.'}</Text>

        <View style={styles.statsRow}>
          {[
            { label: 'Posts', value: user?.postsCount ?? 0 },
            { label: 'Followers', value: user?.followersCount ?? 0 },
            { label: 'Following', value: user?.followingCount ?? 0 },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  username: { fontSize: 18, fontWeight: '700', color: '#FAFAFA' },
  settingsIcon: { fontSize: 22 },
  body: { flex: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 24, gap: 12 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DFE104',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#000' },
  name: { fontSize: 20, fontWeight: '700', color: '#FAFAFA', marginTop: 8 },
  role: {
    fontSize: 13,
    color: '#DFE104',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bio: { fontSize: 14, color: '#A1A1AA', textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 40, marginTop: 8 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FAFAFA' },
  statLabel: { fontSize: 12, color: '#71717A' },
  editButton: {
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 10,
    marginTop: 16,
  },
  editButtonText: { color: '#FAFAFA', fontWeight: '600' },
  logoutButton: { marginTop: 24 },
  logoutText: { color: '#EF4444', fontWeight: '600' },
});
