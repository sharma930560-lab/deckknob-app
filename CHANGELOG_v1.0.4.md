# DECKKNOB v1.0.4 — Changelog

**Release:** `v1.0.4`  
**Android versionCode:** `5`  
**Android versionName:** `1.0.4`  
**Release Date:** November 16, 2026  
**Status:** Staged for Approval  

---

## 1. Direct Messaging & Chat Integrity
- **Real-Time Direct Messaging:** Fixed direct messaging pipeline with real-time Firestore listeners, instant message dispatch, and automatic inbox preview synchronization.
- **Legacy Compatibility:** Added full backward compatibility for legacy direct chats missing an explicit `type` field, enabling bidirectional communication and reading historical threads without client errors.
- **IME & Keyboard Insets:** Resolved layout clipping and message composer displacement during soft-keyboard appearance in Chat and Group Chat views (`WindowInsets.ime` padding).
- **Read Receipt Enforcement:** Enforced strict per-user read receipt tracking (`readBy`), preventing unauthorized forgery or erasure of other users' read receipts.

## 2. Group Messaging & Role-Based Permissions
- **Group Chat Infrastructure:** Introduced complete group chat creation and messaging (`type: "group"`), supporting multi-user conversations, custom group names, and avatar badges.
- **Role Hierarchy & Field Authorization:**
  - Owner role is strictly immutable; owner transfer requires authenticated owner credentials to an existing group admin.
  - Non-owner admins are prevented from demoting or removing the owner, or promoting arbitrary members to admin.
  - Group members can view participants and leave groups gracefully.
- **Group Metadata & Preview Integrity:** Enforced field-level authorization so message senders can only update `lastMessage`, `lastMessageSenderId`, `lastMessageTimestamp`, and `readBy` on parent group documents without tampering with configuration.

## 3. Social & Live Profile Counts
- **Atomic Counter Synchronization:** Implemented batch and subcollection synchronization between root user follower counters (`followersCount`, `followingCount`) and underlying `followers/{uid}/userFollowers/{followerUid}` subcollections.
- **Hydration & State Preservation:** Ensured zero count drift across app restarts, account re-logins, and backgrounding.
- **Interactive Sheets:** Integrated dynamic Followers and Following bottom sheets displaying mutual follow statuses with immediate toggle action feedback.

## 4. OTA Update Center & Security Verification
- **In-App Update Engine:** Added self-contained OTA Update Center in Settings (`UpdateCenterScreen`) that inspects official GitHub release metadata via HTTPS without third-party app stores.
- **Cryptographic Security Checks:**
  - **Anti-Downgrade Protection:** Automatically detects installed build version code and strictly prevents downgrading to earlier versions.
  - **Package Name Matching:** Rejects APK downloads where manifest package differs from `com.deckknob.app`.
  - **Signature Verification:** Verifies APK signing certificate against production certificate digest (`b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a`).
  - **SHA-256 Digest Verification:** Rejects corrupted, tampered, or mismatched binaries prior to package installer handoff.
- **Safe Fallbacks:** Comprehensive error handling for offline states, network failures, and rate limits.

## 5. Remote Feature Flags & Kill Switch
- **Firestore Remote Config:** Integrated `/app_config/android` client listener for over-the-air feature flagging (`direct_messaging_enabled`, `group_chat_enabled`, `klyps_upload_enabled`, etc.).
- **Fail-Closed Security Defaults:** Security-sensitive features fail safe (fail-closed) when remote configuration is unreachable or missing.
- **Emergency Kill-Switch:** Provides immediate remote disablement of compromised modules without requiring an emergency app store rebuild.

## 6. Security Hardening
- **Firestore Ruleset `375ef85e-8f36-424e-95db-093e352ba837`:** Deployed and verified ruleset with 67 passing adversarial test cases.
- **App Config Sandboxing:** Public read-only access for client versioning and kill-switches; client writes strictly blocked (`allow write: if false;`).
- **Music Identity Reconciliation:** Unified legacy audio documents with `userId` and `attribution` ownership requirements, blocking account impersonation and audio asset takeover.
- **Author Immutability:** Enforced author and submitter immutability on social entities (posts, venue reviews, check-ins, hashtags).

## 7. Known Limitations & Notations
- **Physical Device Testing:** Verification performed entirely on Android 16 Google APIs x86_64 emulator (`emulator-5554`, API 36). Physical hardware testing was not performed.
- **FCM Delivery:** Cross-device FCM push delivery remains unverified end-to-end due to emulator Google Play Services token registration constraints. Client messaging service implementation is complete and verified in code.
- **Arbitrary Search Indexing:** Full substring searching across large user datasets requires dedicated search indexing (e.g., Algolia/Typesense) as detailed in `docs/architecture/SEARCH_INDEXING_MIGRATION_PLAN.md`.
