# ADR 0001: Authentication and Data Ownership

## Status
Accepted

## Context
The app currently has two identity and profile systems:

- Firebase Auth and Firestore are used directly by the React frontend for sign-up, login, username lookup, and profile documents.
- Django REST Framework uses `users.CustomUser` plus Simple JWT for protected API endpoints such as social links, posts, reels, follows, events, notifications, and Instagram sync.

Keeping both systems as peers creates divergent user IDs, duplicated profile fields, inconsistent authorization, and unclear ownership of writes.

## Decision
Django is the canonical application backend for domain data and authorization. Firebase remains an optional client authentication provider only.

The integration boundary is:

1. Frontend authenticates with Firebase or email/password UI.
2. Frontend exchanges the Firebase ID token, or Django credentials during the transition, for a Django JWT.
3. All application domain writes go through Django APIs.
4. Firestore is limited to Firebase-owned auth profile bootstrap data or is retired after migration.
5. Django `users.CustomUser` owns usernames, profiles, follows, social links, posts, events, notifications, and Instagram OAuth tokens.

## Migration path

1. Add a Django endpoint that verifies Firebase ID tokens and returns Django JWTs for a linked `CustomUser`.
2. Store the Firebase UID on `CustomUser` with a uniqueness constraint.
3. Move username/profile writes out of `frontend/src/services/authService.js` and into Django endpoints.
4. Replace page-level direct Firestore reads with service calls to Django.
5. Delete Firestore profile collections only after data has been migrated and verified.

## Consequences

- API permissions have one source of truth.
- Frontend services can rely on one API client and one JWT storage path.
- Existing Firebase sign-in UX can be preserved during migration.
- Backend tests can cover authorization and domain invariants without requiring Firestore.
