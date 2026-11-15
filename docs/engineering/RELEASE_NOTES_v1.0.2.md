# DECKKNOB Android v1.0.2 — Release Notes

**Release Version:** `v1.0.2`  
**Version Code:** `3`  
**Target Platform:** Android 14 (API 34)  
**Min Platform:** Android 7.0 (API 24)  
**Package:** `com.deckknob.app`  
**Build Date:** November 15, 2026  
**Signing Status:** Signed with Production Keystore (APK Signature Scheme v2)

---

## 1. Executive Summary

DECKKNOB v1.0.2 is a security hardening, reliability, and production-governance release. This version incorporates critical Firestore authorization controls (SEC-01), introduces a release ProGuard/R8 protection baseline preserving reflection and Hilt/Compose runtimes (SEC-03), and completes full regression verification across unit tests, security rules test suites, and frontend production builds.

---

## 2. Release Artifact Verification

| Property | Value |
| :--- | :--- |
| **Artifact File** | `android/release-artifacts/v1.0.2/deckknob-v1.0.2.apk` |
| **Direct Gradle Output** | `android/app/build/outputs/apk/release/app-release.apk` |
| **File Size** | 22,670,280 bytes (21.62 MB) |
| **SHA-256 Checksum** | `DB6852FB2EA2871F187231A860F00EDD2E6FB8FBBAF551C43D1FBA9541BC2872` |
| **AAPT2 Verification** | `package: name='com.deckknob.app' versionCode='3' versionName='1.0.2' platformBuildVersionName='14' compileSdkVersion='34'` |
| **Signing Scheme** | APK Signature Scheme v2: `true` (v1 JAR: `false`) |
| **Signer Certificate DN**| `CN=DeckKnob Production, OU=Engineering, O=DeckKnob, L=San Francisco, ST=CA, C=US` |
| **Certificate SHA-1** | `1c1e5cc7998d1b55fc3932b1540d8330ebdfef1b` |
| **Certificate SHA-256** | `b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a` |
| **Production Key Parity**| Matches v1.0.1 production release keystore identity |

---

## 3. What's Changed in v1.0.2

### 3.1 Security Hardening (SEC-01)
- Hardened Firestore security rules for secondary collections (`mentions`, `music`, `venueReviews`, `checkIns`, and `hashtags`).
- Enforced strict author/creator binding (`request.auth.uid == request.resource.data.authorId` / `userId`).
- Disallowed cross-user updates and deletions: only the original author can edit or delete their entries.
- Prevented tampering of ownership attribution fields during updates.
- Verified against a comprehensive 10-scenario automated test suite (25 test assertions, 100% pass rate) on the Firebase Emulator Suite.

### 3.2 Packaging & Runtime Protection (SEC-03)
- Created dedicated `android/app/proguard-rules.pro` keeping Jetpack Compose, Kotlin Coroutines, Dagger/Hilt, Firebase SDKs, `@PropertyName` model deserialization (`com.deckknob.app.data.model.**`), Retrofit, OkHttp, and Media3 intact.
- Verified APK signing integrity and runtime stability on Android 16 (API 36) emulator.

### 3.3 Previous Feature Gap Closures Consolidated
- Retained all Phase 4 & team-reported enhancements:
  - Multi-source soundtrack preview playback with clean Media3 ExoPlayer lifecycle management.
  - Selected photo thumbnail preview with dismiss action in post creation.
  - Profile image cropping with real-time UI preview and Firestore persistence.
  - Atomic comments count updates and live comment thread rendering.
  - Saved Posts & Klyps Vault storage and retrieval.
  - Cloudinary audio upload with 25 MB file size boundary and MIME type validation.

---

## 4. Verification & Test Summary

| Test Suite | Environment / Engine | Results | Status |
| :--- | :--- | :--- | :---: |
| **Android Unit Tests** | JUnit / Gradle `testDebugUnitTest` | **67 passed, 0 failed, 0 skipped** | **PASSED** |
| **Firestore Security Rules** | Local Firebase Firestore Emulator (`@firebase/rules-unit-testing`) | **25 passed, 0 failed** (10 test cases) | **PASSED** |
| **Frontend Production Build** | Node.js v20.19.2 / Vite v8.0.10 | **579 modules transformed, 0 errors** | **PASSED** |
| **Release APK Assembly** | Gradle 8.9 / Android Gradle Plugin 8.5.2 | Build successful in 2m 38s | **PASSED** |
| **APK Signature Verification** | Android SDK `apksigner` v34.0.0 | Scheme v2 verified, 1 signer | **PASSED** |

---

## 5. Release Governance & Infrastructure Status

1. **GitHub Release Publication:** Tag `v1.0.2` created and published on GitHub (`sharma930560-lab/deckknob-app`) with target commit `544ea28`.
2. **Release Artifact Attached:** `deckknob-v1.0.2.apk` (22,670,280 bytes, SHA-256: `DB6852FB2EA2871F187231A860F00EDD2E6FB8FBBAF551C43D1FBA9541BC2872`).
3. **Prior Release Preserved:** Release `v1.0.1` and asset `deckknob-v1.0.1.apk` remain active and unmodified.
4. **Firebase Storage:** Firebase Storage audio upload remains BLOCKED pending Blaze billing activation. Cloudinary remains the active media upload provider.
5. **Firestore Rules Deployment:** `frontend/firestore.rules` changes are maintained in source control and verified on the local emulator; they have NOT been deployed to the live production Firestore database.
6. **Physical Hardware:** Verification was conducted on `emulator-5554` (API 36). Physical hardware testing was not performed.
7. **FCM Push Notifications:** Cross-device push delivery remains unverified due to headless emulator GMS authentication limitations.

