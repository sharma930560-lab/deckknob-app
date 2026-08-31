# DECKKNOB

> Music platform for DJs, artists, venues, fans, and promoters.

## Monorepo Structure

```
DECKKNOB/
├── backend/          Django REST API (Python)
├── frontend/         React + Vite web app
├── mobile/           Expo React Native app (Android + iOS)
├── shared/           Shared TypeScript: types, constants, utils
├── assets/           Brand assets
└── docs/
    └── monorepo.md   Architecture reference
```

## Quick Start

### Web
```bash
cd frontend
npm install
npm run dev
```

### Mobile (Android)
```bash
# 1. Copy and fill environment variables
cp mobile/.env.example mobile/.env

# 2. Install dependencies
cd mobile
npm install

# 3. Run dev build on connected Android device / emulator
npx expo run:android
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py runserver
```

## Shared Package

The `shared/` package provides TypeScript types, constants, and utilities
for use in both `frontend/` and `mobile/`:

```ts
import type { UserProfile, Post, Reel } from '../shared/src/types';
import { COLLECTIONS, PAGINATION } from '../shared/src/constants';
import { formatRelativeTime, formatCount } from '../shared/src/utils';
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | React 19, Vite, Tailwind CSS v4, Zustand |
| Mobile | Expo SDK 57, React Native 0.79, NativeWind v5, Zustand |
| Backend | Django 5, Firebase Admin SDK |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Storage | Firebase Storage |
| Shared | TypeScript, Platform-agnostic utils |

## Key Architecture Decisions

- **Firebase JS SDK** used on both web and mobile (not @react-native-firebase).
  Same SDK = one Firebase integration to maintain.
- **Shared types in TypeScript** — all Firestore document shapes are typed once
  in `shared/` and imported by both platforms.
- **No nohoist** — Expo SDK 52+ auto-detects monorepos; Metro config handles
  `watchFolders` for the shared package.
- **Dev builds required** — `expo-camera`, `expo-notifications`, and
  `expo-secure-store` are not compatible with Expo Go.

## Environment Variables

Copy `mobile/.env.example` → `mobile/.env` and fill in your Firebase credentials.
The mobile app uses the same Firebase project as the web app.
Web env vars are in `frontend/.env` (VITE_ prefix).
Mobile env vars use `EXPO_PUBLIC_` prefix.
