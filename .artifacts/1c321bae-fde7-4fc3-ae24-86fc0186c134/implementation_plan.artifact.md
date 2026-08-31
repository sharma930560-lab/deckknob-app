# Implementation Plan: Web to Native Android Migration (React Native + Expo)

This plan outlines the systematic conversion of the DECKKNOB web application into a native Android application using React Native and Expo, while preserving all existing logic and branding.

## User Review Required

> [!IMPORTANT]
> **Navigation Strategy**: We will use **React Navigation** (Stack & Bottom Tabs) as requested, mapping exactly to the current `BrowserRouter` structure.
>
> **Styling**: We will use **NativeWind (v4)** to preserve the Tailwind CSS classes used in the web version. This allows for near-identical style preservation.
>
> **Animations**: **Moti** will be used to replace `framer-motion` for layout transitions and page animations, as it provides a very similar declarative API.
>
> **Firebase**: We will use the **Firebase JS SDK** (modular v10) for data services to ensure consistency, while utilizing **Expo Secure Store** or **AsyncStorage** for persistent auth state.

## Proposed Changes

### 1. Project Initialization
- Create a new `mobile/` directory at the project root.
- Initialize an Expo project with TypeScript.
- Setup `NativeWind` and `Tailwind` configuration.
- Setup `React Navigation` root containers.

### 2. Core Infrastructure & Services
- **[NEW] [firebase.js](file:///D:/DECKKNOB/mobile/src/config/firebase.js)**: Mirrored Firebase configuration using environment variables.
- **[NEW] [AsyncStoragePersistence.js](file:///D:/DECKKNOB/mobile/src/utils/persistence.js)**: Adapter for `Zustand` and `Firebase` to use native storage.
- **[NEW] [services/](file:///D:/DECKKNOB/mobile/src/services/)**: Migration of all 10+ services, replacing browser-specific logic with native alternatives (e.g., `camera` -> `expo-camera`).

### 3. Shared Components & Icons
- **[NEW] [UI Components](file:///D:/DECKKNOB/mobile/src/components/ui/)**: Recreating `Button`, `Avatar`, `Card`, `GlassPanel` using `View` and `Text`.
- **[NEW] [Icons](file:///D:/DECKKNOB/mobile/src/components/icons/)**: Mapping `lucide-react` to `lucide-react-native`.

### 4. Navigation & Routes
- **[NEW] [RootNavigator.tsx](file:///D:/DECKKNOB/mobile/src/navigation/RootNavigator.tsx)**: Handles Auth Flow vs. Main App Flow.
- **[NEW] [MainTabNavigator.tsx](file:///D:/DECKKNOB/mobile/src/navigation/MainTabNavigator.tsx)**: Defines the 5-tab system (Feed, Explore, Create, Klyps, Profile).

### 5. Screen Migration (Module-by-Module)
- **Module 1: Auth**: Login, Register, Onboarding.
- **Module 2: Feed**: Feed, PostDetail, Stories.
- **Module 3: Creation**: Upload (Gallery/Camera), CreateEvent.
- **Module 4: Discovery**: Explore, Events, TodayEvents, VenueDetail.
- **Module 5: Profile**: Profile, EditProfile, Settings, SocialLinks.

## Verification Plan

### Automated Tests
- `npm run lint` for TypeScript and ESLint checks.
- Verify Firebase connectivity with a simple auth check test.

### Manual Verification
- **UI Consistency**: Compare side-by-side screenshots of Web vs. Android Emulator.
- **Functional Check**: Verify the full user journey: Login -> Onboarding -> Post Creation -> Feed Interaction.
- **Device Features**: Test Camera, Image Picker, and Local Storage persistence.

## Open Questions

> [!CAUTION]
> **NativeWind v4 / Tailwind v4**: The web version uses `@tailwindcss/vite` (v4). NativeWind v4 is currently in beta but offers best compatibility. I will proceed with NativeWind v4 to match your web project's Tailwind version. Is this acceptable?
