# DECKKNOB v1.0.4 — Release Notes

## Release Information
- **Release Tag:** `v1.0.4`
- **Release Title:** DECKKNOB v1.0.4 — Group Messaging, OTA Update Center & Security Hardening
- **Target Package:** `com.deckknob.app`
- **Target Version:** `1.0.4`
- **Target versionCode:** `5`
- **Target Branch:** `main`
- **Release Date:** November 16, 2026
- **Candidate APK:** `deckknob-v1.0.4.apk`
- **APK SHA-256:** `572F3033B5BE6E299525B34BAA0174DDB9D563FF6E22F0C49DAE27675F0E5C6A`
- **Signing Certificate SHA-256:** `b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a`

---

## Highlights

### 1. Group Messaging & Role Permissions
- Create and participate in multi-user group chats.
- Role-based permissions supporting Group Owner, Group Admin, and Group Member roles.
- Strict owner immutability and authorized membership management.
- Real-time group message delivery, multiline keyboard handling, and unread badges.

### 2. Direct Messaging Upgrades
- Full backward compatibility for legacy direct chats missing an explicit `type` field.
- Fixed keyboard/IME insets ensuring message composer never obscures active text inputs.
- Real-time inbox synchronization sorting chats by recent activity.

### 3. OTA Update Center & Remote Feature Flags
- Self-contained OTA update verification directly from the Settings screen.
- Integrated anti-downgrade protection, SHA-256 hash validation, and signing certificate verification.
- Over-the-air feature flagging and module kill switches powered by Firestore `/app_config/android`.

### 4. Live Profile Follower Synchronization
- Resolved follower and following count synchronization issues between root document counters and subcollections.
- Real-time bidirectional follower sheets with immediate action toggle feedback.

---

## Security Improvements

- **Firestore Ruleset `375ef85e-8f36-424e-95db-093e352ba837`:** Active in production Firebase project `deckknob-684f7`.
- **Field-Level Protection:** Non-owner admins cannot transfer ownership, demote owners, or escalate member privileges.
- **Read Receipt Protection:** Members can only update their own `readBy` entries; receipt erasure or forgery is denied.
- **Fail-Closed App Configuration:** All client write attempts to `/app_config/{docId}` are strictly blocked (`allow write: if false;`).
- **Music Identity Reconciliation:** Unified `userId` and `attribution` ownership requirements, preventing identity spoofing.

---

## Upgrade Notes

- **From v1.0.3:** Users on `v1.0.3` (`versionCode 4`) can install `v1.0.4` (`versionCode 5`) as an in-place upgrade. All local databases, SharedPreferences, cached feeds, and active authentication sessions are fully preserved.
- **Downgrade Notice:** In accordance with platform security best practices, the OTA Update Center will not permit downgrading from `v1.0.4` to earlier versions (`v1.0.3`, `v1.0.2`, `v1.0.1`).

---

## Verification & Installation Instructions

### Verifying the APK Checksum:
Before installing, verify that the downloaded APK matches the official SHA-256 checksum:

**Linux / macOS:**
```bash
sha256sum deckknob-v1.0.4.apk
# Expected output:
# 572f3033b5be6e299525b34baa0174ddb9d563ff6e22f0c49dae27675f0e5c6a  deckknob-v1.0.4.apk
```

**Windows (PowerShell):**
```powershell
Get-FileHash -Path deckknob-v1.0.4.apk -Algorithm SHA256
# Expected output:
# 572F3033B5BE6E299525B34BAA0174DDB9D563FF6E22F0C49DAE27675F0E5C6A
```

### Installation via ADB:
```bash
adb install -r deckknob-v1.0.4.apk
```

---

## Known Limitations

1. **Testing Environment:** Comprehensive regression and live production testing were executed on an Android 16 Google APIs x86_64 emulator (`emulator-5554`, API 36). Physical hardware testing was not performed.
2. **Push Notifications (FCM):** The FCM client service is fully integrated and tested in code (`DeckKnobMessagingService.kt`); however, end-to-end cross-device cloud push delivery remains unverified due to emulator Google Play token registration limitations.
3. **Search Substring Indexing:** Search queries currently match prefixes and exact handles. Scaled arbitrary substring searching is scheduled for backend search service migration.
