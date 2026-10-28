# DECKKNOB — Complete Project Handover & Technical Specification

> **Project Name:** DECKKNOB (Underground DJ & Nightlife Social Ecosystem)  
> **Repository Type:** Monorepo (Web, Mobile, Shared, Android, Backend)  
> **Cloud Architecture:** 100% Firebase Serverless (Zero-Cost Free Spark Tier)  
> **Brand Theme:** Dark Underground Aesthetic (`#09090B` background, `#DFE104` Electric Lime accent)

---

## 1. Executive Summary & Vision

**DECKKNOB** is a specialized social media and event discovery platform tailored for the electronic music and nightlife ecosystem. It connects:
- **DJs & Producers**: Showcase mixes, post short-form video reels (*Klyps*), publish audio tracks, manage gigs, and engage fans.
- **Venues & Club Promoters**: List upcoming club nights, manage bookings, publish lineup flyers, and sell tickets.
- **Fans & Partygoers**: Discover tonight's events by city, stream underground sets, follow favorite DJs, and view backstage stories.

---

## 2. Monorepo Architecture & Directory Structure

```text
DECKKNOB/
├── frontend/               # Web Application (React 19 + Vite + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/     # Reusable UI, icons, layout, and feed cards
│   │   ├── config/         # Firebase initialization & client setup
│   │   ├── layouts/        # MainLayout (Sidebar, navigation, mobile bar)
│   │   ├── pages/          # Feed, Login, Register, Onboarding, Reels, Upload, Settings, Events, etc.
│   │   ├── services/       # Direct Firebase Firestore/Storage services
│   │   ├── stores/         # Zustand global state stores (auth, feed, reels, stories, etc.)
│   │   └── utils/          # Helpers, mention parsers, editor filters
│   ├── firestore.rules     # Production database security rules
│   └── storage.rules       # Firebase Storage file upload permissions
│
├── mobile/                 # Cross-platform Mobile App (Expo SDK 57 + React Native 0.86)
│   ├── src/                # Navigation, mobile screens, NativeWind components
│   ├── App.tsx             # Mobile entry point
│   └── app.json            # Expo config & Android/iOS bundle identifiers
│
├── shared/                 # Shared TypeScript Package
│   └── src/
│       ├── constants/      # Collection names, pagination limits, genres
│       ├── types/          # Strict TypeScript interfaces (User, Post, Reel, Event, Venue)
│       └── utils/          # Date formatting, counter formatting, slug generators
│
├── android/                # Native Android Project Wrapper (Gradle 8.9)
├── backend/                # Legacy Django REST API (Python 3.12 - Optional / Deprecated)
├── firebase.json           # Firebase Hosting, Firestore & Storage deployment rules
├── package.json            # Root npm workspaces configuration
└── run.bat                 # One-click Windows launch script
```

---

## 3. Technology Stack & Programming Languages

| Layer | Languages & Frameworks | Purpose |
| :--- | :--- | :--- |
| **Web Frontend** | **JavaScript (ES Modules)**, **React 19.2**, **Vite 8**, **Tailwind CSS v4** | Ultra-fast single-page web app with modern dark theme and micro-animations |
| **Mobile App** | **TypeScript**, **React Native 0.86**, **Expo SDK 57**, **NativeWind v5** | iOS & Android native experience sharing common logic and design tokens |
| **Shared Contracts** | **TypeScript** | Universal data models, interfaces, and validation rules shared across web and mobile |
| **Database & Auth** | **Cloud Firestore**, **Firebase Auth**, **Firebase DSL (Rules)** | Serverless real-time NoSQL database and secure authentication |
| **Cloud Storage** | **Firebase Storage** | Media asset hosting for photos, vertical video clips, and high-res audio |
| **State Management** | **Zustand 5** | Lightweight, reactive state management with optimistic UI updates |
| **Native Android** | **Java / Kotlin / Gradle Groovy** | Android build automation and Gradle distribution wrapper |
| **Animations & Icons** | **Framer Motion 12**, **Lucide React**, **Custom SVG Iconsax** | Smooth page transitions, animated icons, and kinetic typography marquees |

---

## 4. 100% Free Serverless Cloud Architecture (Firebase Spark Plan)

DECKKNOB requires **no paid server** to run. All operations talk directly to Firebase via client SDKs:

```mermaid
graph TD
    UserWeb[Web Browser / Vite React] -->|Firebase JS SDK| Auth[Firebase Auth]
    UserWeb -->|Firebase JS SDK| Firestore[(Cloud Firestore DB)]
    UserWeb -->|Firebase JS SDK| Storage[(Firebase Storage)]
    
    UserMobile[Mobile App / Expo RN] -->|Firebase JS SDK| Auth
    UserMobile -->|Firebase JS SDK| Firestore
    UserMobile -->|Firebase JS SDK| Storage

    subgraph "Google Cloud (Free Spark Tier)"
        Auth -->|50,000 MAU Free| AuthDesc[Google & Email Authentication]
        Firestore -->|50K Reads, 20K Writes/Day Free| DBDesc[Users, Posts, Reels, Events, Chats]
        Storage -->|5 GB Storage Free| MediaDesc[Images, Videos, Track Audios]
    end
```

### Free Tier Capacity:
1. **Firebase Authentication**: 50,000 monthly active users for free.
2. **Cloud Firestore Database**: 1 GB storage, 50,000 reads/day, 20,000 writes/day free.
3. **Firebase Cloud Storage**: 5 GB total storage, 1 GB/day download bandwidth free.
4. **Firebase Hosting / Vercel**: Global CDN, automated SSL certificates, custom domain support for free.

---

## 5. Core Feature Matrix

### 1. Authentication & Onboarding
- **Methods**: Email + Password, Google Sign-in popup/redirect, Password Reset email.
- **Live Username Checker**: Debounced verification querying the `usernames` collection with 3 auto-generated smart suffix suggestions if taken.
- **Onboarding Flow (`/onboarding`)**: Profile picture upload, location selection, DJ genre picker (Techno, House, Afro House, Melodic, Drum & Bass), and bio configuration.
- **Multi-Account Switching**: Concurrent session management in `localStorage`, letting users switch accounts or logout selectively without wiping state.

### 2. Feed & Stories (`/feed`)
- **Dual Stream**: Algorithmic timeline combining image carousels, status updates, and mini audio players.
- **Category Filter**: Instant switching between genres (*All, Techno, House, Afro House, Drum & Bass*).
- **Interactive Engagements**: Optimistic likes, bookmarking, threaded comments, and user `@mentions`.
- **24h Ephemeral Stories**: Instagram-style story bubbles with active gradient rings, view tracking, and fullscreen carousel reader.

### 3. Klyps / Short-form Video (`/klyps`)
- Vertical full-viewport video feed with autoplay, mute/unmute toggle, sound source attribution, and seamless scrolling.

### 4. Events & Venue Discovery (`/events`, `/venues/:id`)
- **Event Management**: Event creation wizard with flyer upload, date/time picker, ticket link, venue association, and DJ lineup tags.
- **Today's Nightlife**: Dedicated quick-access panel showing parties and club nights happening tonight in the user's city.
- **Venue Profiles**: Venue specs, capacity, sound system type, address, upcoming bookings, and community reviews.

### 5. Creator Studio & Workspace (`/upload`)
- Multi-mode creator canvas:
  - **Post**: Image carousels, captions, user tags.
  - **Klyp (Reel)**: Vertical video processing with duration validation.
  - **Story**: 24-hour expiration metadata tag.
  - **Event**: Flyer and ticket scheduling.
  - **Music Track**: Direct audio upload with custom waveforms and artwork tags.
- Visual photo filters (Nightlife, Monokrome, Neon, Underground) with CSS adjustment sliders.

### 6. Settings Menu (`/settings`)
- 15-section dual-column Instagram-inspired settings console:
  - Meta-style Accounts Center, Notifications, Privacy & Blocking, Close Friends lists, Creator analytics, Dark theme toggle, and Help utilities.

---

## 6. Firestore Database Collections & Data Models

| Collection | Document Key | Primary Fields |
| :--- | :--- | :--- |
| `users` | `{uid}` | `username`, `email`, `displayName`, `avatarUrl`, `bio`, `genres`, `role`, `followersCount`, `followingCount`, `createdAt` |
| `usernames` | `{lowercase_username}` | `uid`, `createdAt` *(Ensures globally unique handles)* |
| `posts` | `{postId}` | `authorId`, `caption`, `mediaUrls`, `genre`, `likesCount`, `commentsCount`, `createdAt`, `tags` |
| `reels` | `{reelId}` | `authorId`, `videoUrl`, `caption`, `audioTitle`, `likesCount`, `viewsCount`, `createdAt` |
| `stories` | `{storyId}` | `authorId`, `mediaUrl`, `mediaType`, `expiresAt`, `seenBy` |
| `events` | `{eventId}` | `title`, `venue`, `dateTime`, `flyerUrl`, `ticketUrl`, `lineup`, `authorId`, `city` |
| `venues` | `{venueId}` | `name`, `city`, `address`, `capacity`, `soundSystem`, `bannerUrl`, `rating` |
| `notifications` | `{notificationId}` | `toUid`, `fromUid`, `type` (*like/comment/follow*), `targetId`, `isRead` |
| `chats` | `{chatId}` | `participants`, `lastMessage`, `updatedAt`, subcollection `messages` |

---

## 7. Running & Developing Locally

### Prerequisites
- **Node.js**: `v18.x` or `v20.x` or newer
- **npm**: `v9.x` or newer

### Quick Start (Web App)
```bash
# 1. Open project root
cd d:\DECKKNOB

# 2. Run with one click on Windows
run.bat

# OR manually start frontend:
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Mobile App (React Native / Android)
```bash
cd mobile
npm install
npx expo run:android
```

---

## 8. Deployment Guide (Free Hosting)

### Option A: Firebase Hosting (Recommended)
Build and deploy directly from root:
```bash
# Build the production bundle
cd frontend && npm run build && cd ..

# Deploy to Firebase Free Hosting
firebase deploy --only hosting
```

### Option B: Vercel (One-Click)
1. Push this repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Deploy — Vercel reads `frontend/vercel.json` and automatically sets up SPA routing with free global CDN and SSL.

---

## 9. Environment Variables Reference

Located in `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSyBD7D-1QRlh-aALGc1lpg1L1DKL1OIIaJE
VITE_FIREBASE_AUTH_DOMAIN=deckknob-684f7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=deckknob-684f7
VITE_FIREBASE_STORAGE_BUCKET=deckknob-684f7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=408445559473
VITE_FIREBASE_APP_ID=1:408445559473:web:0387d248f54422c331f890
VITE_FIREBASE_MEASUREMENT_ID=G-KL0HLS68K9
```

---

## 10. Handover Summary & Status Checklist

- [x] **Frontend**: 100% operational on React 19 + Vite 8.
- [x] **Serverless Architecture**: All CRUD and file storage connects to Firebase Cloud services directly.
- [x] **Zero Hosting Costs**: Operates entirely within the free Firebase Spark Tier.
- [x] **Security Rules**: Deployed in `firestore.rules` and `storage.rules`.
- [x] **Build Status**: `npm run build` generates error-free production chunks.
