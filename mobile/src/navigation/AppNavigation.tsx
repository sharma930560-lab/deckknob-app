/**
 * Root navigation for DECKKNOB mobile.
 * Uses React Navigation v7 with native-stack and bottom-tabs.
 *
 * Route map (mirrors frontend App.jsx routes):
 *   /login          → LoginScreen
 *   /signup         → RegisterScreen
 *   /onboarding     → OnboardingScreen
 *   (tabs)
 *     /feed         → FeedScreen       (Home tab)
 *     /explore      → ExploreScreen    (Search tab)
 *     /upload       → UploadScreen     (+ tab)
 *     /klyps        → ReelsScreen      (Klyps tab)
 *     /profile      → ProfileScreen    (Profile tab)
 *   (stack over tabs)
 *     /events       → EventsScreen
 *     /events/:id   → EventDetailScreen
 *     /venues/:id   → VenueDetailScreen
 *     /settings     → SettingsScreen
 *     /edit-profile → EditProfileScreen
 *     /social-links → ManageSocialsScreen
 */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import authStore from '../stores/authStore';

// Screens — Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Screens — Main tabs
import FeedScreen from '../screens/main/FeedScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import UploadScreen from '../screens/main/UploadScreen';
import ReelsScreen from '../screens/main/ReelsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Screens — Stack over tabs
import EventsScreen from '../screens/main/EventsScreen';
import EventDetailScreen from '../screens/main/EventDetailScreen';
import VenueDetailScreen from '../screens/main/VenueDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import ManageSocialsScreen from '../screens/main/ManageSocialsScreen';

// Tab bar icon
import TabBarIcon from '../components/navigation/TabBarIcon';

// ─── Navigator instances ──────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Brand colors ─────────────────────────────────────────────────────────────
const BRAND = '#DFE104';
const BG = '#09090B';
const SURFACE = '#18181B';
const BORDER = '#27272A';
const MUTED = '#71717A';

// ─── Bottom Tab Navigator ────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: MUTED,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="search" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="plus-square" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="play" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ────────────────────────────────────────────────────
function RootNavigator() {
  const { user, isLoading, initializeAuth } = authStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BG },
        animation: 'slide_from_right',
      }}
    >
      {user ? (
        // Authenticated stack
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Events" component={EventsScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ManageSocials" component={ManageSocialsScreen} />
        </>
      ) : (
        // Unauthenticated stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ─── Navigation Container ────────────────────────────────────────────────────
export default function AppNavigation() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

// ─── Navigation Types (for type-safe useNavigation) ─────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Events: undefined;
  EventDetail: { id: string };
  VenueDetail: { id: string };
  Settings: undefined;
  EditProfile: undefined;
  ManageSocials: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};
