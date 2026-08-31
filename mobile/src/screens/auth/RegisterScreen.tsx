import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import authStore from '../../stores/authStore';
import type { RootStackParamList } from '../../navigation/AppNavigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const ROLES = [
  { value: 'fan', label: 'Fan' },
  { value: 'dj', label: 'DJ' },
  { value: 'venue', label: 'Venue' },
  { value: 'artist', label: 'Artist' },
  { value: 'promoter', label: 'Promoter' },
];

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register, isLoading, clearError } = authStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('fan');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    try {
      clearError();
      await register(username.trim(), email.trim(), password, role);
      navigation.navigate('Onboarding');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed.';
      Alert.alert('Registration Failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>DECKKNOB</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#71717A"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#71717A"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#71717A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Role picker */}
        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleChip, role === r.value && styles.roleChipActive]}
              onPress={() => setRole(r.value)}
            >
              <Text
                style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Already have an account?{' '}
            <Text style={styles.linkBrand}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  inner: { justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60, gap: 14 },
  logo: { fontSize: 28, fontWeight: '800', color: '#FAFAFA', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#A1A1AA' },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FAFAFA',
    fontSize: 16,
  },
  label: { color: '#A1A1AA', fontSize: 14 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
  },
  roleChipActive: { borderColor: '#DFE104', backgroundColor: '#DFE10420' },
  roleChipText: { color: '#A1A1AA', fontSize: 13 },
  roleChipTextActive: { color: '#DFE104', fontWeight: '600' },
  button: {
    backgroundColor: '#DFE104',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  link: { color: '#A1A1AA', textAlign: 'center' },
  linkBrand: { color: '#DFE104', fontWeight: '600' },
});
