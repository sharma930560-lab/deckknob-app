# DECKKNOB v1.0.3 Release Notes

**Release Version:** `v1.0.3`  
**Android versionCode:** `4`  
**Android versionName:** `1.0.3`  
**Package:** `com.deckknob.app`  
**Target Branch:** `main`  
**Date:** November 16, 2026  

---

## 1. Overview & Highlights

DECKKNOB v1.0.3 delivers a comprehensive social networking and discovery upgrade. It unifies the follow/unfollow architecture across all application surfaces, eliminates legacy direct database writes, and introduces an advanced multi-variant user discovery engine alongside enhanced navigation and profile link support.

### Key Enhancements

1. **Unified Follow & Social Graph Architecture:**
   - **Single Unified Pipeline:** Completely removed legacy, direct, unbatched Firestore writes from `FeedViewModel`. All follow/unfollow actions across Feed Scene Radar, Search Cards, User Profiles, and Followers/Following bottom sheets delegate exclusively to `SocialRepository`'s atomic 4-part batch write pipeline.
   - **Shared State Synchronization:** Introduced a reactive shared `followingState` (`StateFlow<Map<String, Boolean>>`) that instantly propagates follow status updates across all screens and tabs without stale views.
   - **Duplicate Follow Request Suppression:** Thread-safe in-flight locks prevent rapid duplicate taps and race conditions during network requests.
   - **Follower & Following Counters:** Profile counters (`followersCount`, `followingCount`) update atomically and remain consistent with web frontend behavior and hardened security rules.
   - **Followers and Following Lists:** Added dedicated modal bottom sheets (`UserFollowListSheet`) displaying bidirectional follower and following lists with real-time follow action toggles.

2. **Advanced User Discovery Engine:**
   - **Username Prefix Search:** Fast range queries on normalized lowercase usernames (`startAt` / `endAt`).
   - **Display-Name Search:** Generates and executes parallel queries across Title Case, UPPERCASE, lowercase, and raw casing variants, ensuring artist names match regardless of how the user types them (e.g., searching `"sanskar"` reliably matches `"Sanskar Kumar"`).
   - **Public Handle Lookup & Normalization:** Strips leading `@` symbols and queries `/usernames/{handle}` records and `publicId` fields directly.
   - **Privacy Protection:** Firebase Authentication UIDs are strictly treated as private internal identifiers and are never exposed as public IDs.
   - **Pagination & Deduplication:** Added offset-based pagination (`pageOffset`, `maxResults`) with automatic UID deduplication across merged result sets.

3. **External Profile Links & Navigation:**
   - **Profile External URL Handling:** Added `UrlLauncher` component to safely validate and open external profile links in the system browser using `ACTION_VIEW` intents with `FLAG_ACTIVITY_NEW_TASK` and normalized HTTPS protocols.
   - **Android Back Navigation & Stack Integrity:** Multi-level backstack navigation properly tracks deep transitions (Search ➔ Profile ➔ Following Sheet ➔ Followed User Profile ➔ back navigation) without state corruption or activity leaks.
   - **Session Persistence:** Verified session restoration directly into the authenticated Feed upon app restart without unneeded re-authentication.

---

## 2. Verification & Quality Assurance

- **User Acceptance Testing (UAT):** **15 / 15** criteria verified on Android 16 emulator (`emulator-5554`):
  - Clean installation, existing account login, feed loading, username search, display-name search, public handle lookup, follow/unfollow from feed, follow/unfollow from search, followers and following sheets, accurate profile count increments/decrements, external links, back navigation, app restart persistence, 0 crashes / 0 ANRs, and regression tabs (Feed, Klyps, Events, Profile).
- **Android Unit Test Suite:** **85 / 85** passed (0 failures, 0 errors, 0 skipped, 57s runtime).
- **Frontend Production Build:** Vite v8.0.10 production build succeeded in 830ms (579 modules) with zero errors.
- **v1.0.2 Release Baseline Integrity:**
  - Archived `v1.0.2` APK checksum `DB6852FB2EA2871F187231A860F00EDD2E6FB8FBBAF551C43D1FBA9541BC2872` verified intact and unaltered.
  - Tag `v1.0.2` verified targeting commit `544ea28f3145e5e14307361ff70b3ea6eb872b94`.

---

## 3. Known Limitations & Disclosure Boundaries

1. **Middle-of-Word Infix Substring Matching:**
   - Firestore single-field range queries (`startAt` / `endAt`) natively support prefix and whole-word matching across casing variants, but do not support middle-of-word infix substring matching (e.g., searching `"ska"` for `"Sanskar"`).
   - Arbitrary substring searching is documented in `docs/architecture/SEARCH_INDEXING_MIGRATION_PLAN.md` for future indexing migration.
2. **Production Firestore Rules Deployment:**
   - The hardened Firestore security rules (`frontend/firestore.rules`) have been thoroughly validated locally and in emulator test suites, but have **NOT** been deployed to production Firebase project `deckknob-684f7`.
3. **Physical-Device Testing:**
   - Physical-device testing was **not performed**; all verification occurred on Android 16 emulator (`emulator-5554`, API 36).
4. **Cross-Device Push Notifications (FCM):**
   - Cross-device FCM push notification behavior remains unverified due to emulator Google Play Services token registration constraints.

---

## 4. Release Artifact Specifications

- **Artifact Name:** `deckknob-v1.0.3.apk`
- **Location:** `android/release-artifacts/v1.0.3/deckknob-v1.0.3.apk`
- **Package Name:** `com.deckknob.app`
- **versionCode:** `4`
- **versionName:** `1.0.3`
- **File Size:** `22,703,044 bytes` (~21.65 MB)
- **SHA-256 Checksum:** `4C2230AFC5497C331F37E34C76F9837F8EE95379A11BF4D2E4E85718F4BBD8DD`
- **Signing Scheme:** APK Signature Scheme v2 (Production Certificate)
- **Signer DN:** `CN=DeckKnob Production, OU=Engineering, O=DeckKnob, L=San Francisco, ST=CA, C=US`
- **Certificate SHA-256 Digest:** `b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a`
- **Certificate SHA-1 Digest:** `1c1e5cc7998d1b55fc3932b1540d8330ebdfef1b`
