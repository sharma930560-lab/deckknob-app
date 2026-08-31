/**
 * DECKKNOB Mobile — Root App Component
 *
 * Initialises:
 *   1. NativeWind v5 (global.css import via CSS-first Tailwind v4)
 *   2. Gesture handler root (required by React Navigation)
 *   3. Safe area provider
 *   4. AppNavigation (React Navigation v7 with auth state routing)
 */
import './global.css';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigation from './src/navigation/AppNavigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
