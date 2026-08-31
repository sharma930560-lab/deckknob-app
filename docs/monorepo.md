# DECKKNOB Monorepo Architecture

## Overview

DECKKNOB is a unified monorepo supporting:
- **Web** — React + Vite (`/frontend`)
- **Android** — Expo + React Native (`/mobile`)
- **Future iOS** — same `/mobile` package
- **Backend** — Django REST + Firebase (`/backend`)
- **Shared** — TypeScript types, constants, utils (`/shared`)

## Workspace Structure

```
DECKKNOB/
├── backend/          Django REST API (Python)
├── frontend/         React + Vite web app (JavaScript)
├── mobile/           Expo React Native app (TypeScript)
├── shared/           Shared types, constants, utils (TypeScript)
├── assets/           Brand assets: logos, icons, fonts
├── docs/
│   └── monorepo.md   This file
├── package.json      Root workspaces config
└── README.md
```

## Dependency Versions (July 2026)

| Package | Version |
|---------|---------|
| Expo SDK | 57 |
| React Native | 0.86 |
| React | 19.2 |
| NativeWind | v5 |
| Tailwind CSS (mobile) | v4 |
| React Navigation | v7 |
| Firebase JS SDK | ^12.x |
| Zustand | v5 |

## Architecture Decisions

### Why Firebase JS SDK (not @react-native-firebase)?
The web app already uses the Firebase JS SDK v12. Using the same SDK on mobile
avoids maintaining two separate Firebase integrations. The JS SDK works on React
Native with `AsyncStorage` persistence for auth and standard Firestore queries.

### Why shared/ only contains types + constants + utils?
Firebase initializes differently on web (env vars + `getAuth`) vs. mobile
(`initializeAuth` + `getReactNativePersistence`). Services are adapted per platform
but share the same TypeScript interfaces from `shared/`.

### NativeWind v5 (CSS-first)
NativeWind v5 uses Tailwind CSS v4's CSS-first configuration — no `tailwind.config.js`
needed. The DECKKNOB brand color (`#DFE104`) and dark theme are defined in `global.css`.
