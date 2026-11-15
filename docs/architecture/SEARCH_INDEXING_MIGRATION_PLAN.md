# DECKKNOB — Search Indexing & Data Migration Plan (v1.0.3)

**Document:** Architecture & Migration Specification  
**Status:** Approved for v1.0.3 Architecture / Migration Staged (Zero Production Writes Executed)  
**Target:** User Discovery, Display Name Normalization, and Full-Text Search Parity  

---

## 1. Executive Summary

In DECKKNOB v1.0.2, user discovery operated exclusively on username prefix searches (`@username`) via Firestore range queries (`startAt`, `endAt`). In v1.0.3, the search engine is upgraded to support:
1. Username prefix search (case-insensitive)
2. Display-name search across multiple case variants (`Title Case`, `UPPERCASE`, `lowercase`, and raw)
3. Public user ID / handle lookup via `/usernames/{handle}` and `publicId` fields
4. Pagination (`pageOffset`, `maxResults`) and deduplication

To maintain 100% backward compatibility and strictly comply with zero production data modification mandates, v1.0.3 implements an adaptive query strategy that works out-of-the-box on existing user records without requiring immediate schema migrations.

---

## 2. Current Schema Analysis

The current `/users/{uid}` document schema in production Firestore contains:
```json
{
  "uid": "7Ywb4dxw2zaZar4uYpuMCuvM65j1",
  "username": "dj_kash",
  "name": "DJKASH",
  "displayName": "DJKASH",
  "role": "dj",
  "city": "Delhi",
  "genre": "Techno",
  "followersCount": 1,
  "followingCount": 1
}
```

### Constraints & Inherent Limitations in Firestore Range Queries
- Firestore string range queries (`startAt` and `endAt`) are strictly lexicographical (byte-order).
- A search for lowercase `"sanskar"` will not naturally match `"Sanskar Kumar"` because `'s' (115) > 'S' (83)`.
- Automatic single-field indexes exist on `username` and `name`.

---

## 3. v1.0.3 Adaptive Query Architecture (Current Implementation)

To resolve display-name and username search without modifying production data or requiring complex full-text backends:
1. **Case Variant Expansion:** The client search engine in `SocialRepository` expands the clean search query into common casing patterns:
   - `Title Case`: `cleanTerm.replaceFirstChar { it.titlecase() }`
   - `UPPERCASE`: `cleanTerm.uppercase()`
   - `lowercase`: `cleanTerm.lowercase()`
   - `Raw`: `cleanTerm`
2. **Parallel Range Queries:** Executes bounded range queries on `name` and `username` using Firestore's automatic single-field indexes.
3. **Public ID / Handle Resolution:** Queries the `/usernames` lookup collection and dedicated `publicId` field if present.
4. **In-Memory Deduplication & Relevance Ranking:**
   - Filters out the searching user's own UID (`currentUid`).
   - Deduplicates matches by document `uid`.
   - Ranks exact username matches first, exact display-name matches second, followed by alphabetical order.
5. **Pagination Slicing:** Uses `pageOffset` and `maxResults` to support smooth infinite scrolling and incremental loading.

---

## 4. Forward-Looking Schema Migration Plan (For Future Admin Deployment)

When an administrative maintenance window is approved, the following non-destructive migration will provide full N-gram tokenization and case-insensitive lowercased indexing.

### 4.1. Proposed Schema Additions
On each `/users/{uid}` document:
- `name_lowercase` (`string`): Lowercased display name (e.g., `"sanskar kumar"`).
- `search_tokens` (`array of strings`): Edge N-grams and tokenized word prefixes (e.g., `["san", "sansk", "sanskar", "kum", "kumar"]`).
- `publicId` (`string`, optional): Public-facing alphanumeric ID if independent of username.

### 4.2. Automated Non-Destructive Migration Script (Cloud Function / Node.js)
```javascript
/**
 * Administrative script to backfill name_lowercase and search_tokens.
 * MUST be executed only during an authorized maintenance window.
 */
const admin = require('firebase-admin');
const db = admin.firestore();

function generateSearchTokens(str) {
  if (!str) return [];
  const tokens = new Set();
  const words = str.toLowerCase().split(/\s+/);
  for (const word of words) {
    for (let i = 2; i <= Math.min(word.length, 15); i++) {
      tokens.add(word.substring(0, i));
    }
  }
  return Array.from(tokens);
}

async function backfillSearchTokens() {
  const usersSnap = await db.collection('users').get();
  const batch = db.batch();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const name = data.name || data.displayName || '';
    const username = data.username || '';

    const updates = {
      name_lowercase: name.toLowerCase(),
      search_tokens: Array.from(new Set([
        ...generateSearchTokens(name),
        ...generateSearchTokens(username)
      ]))
    };

    batch.set(doc.ref, updates, { merge: true });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
    }
  }
  await batch.commit();
  console.log(`Successfully indexed ${count} user profiles.`);
}
```

### 4.3. Client Write Pipeline (Zero-Cost Backward Compatibility)
In `AuthRepository.kt` and `userService.js`, all profile creation and updates will automatically compute and write `name_lowercase` alongside `name`. This ensures newly updated accounts immediately benefit from lowercased queries without administrative intervention.

---

## 5. Security & Privacy Safeguards

1. **Private Identity Protection:** Firebase Authentication UIDs are internal identifiers and are never used as public identifiers or exposed in public search results.
2. **Access Control:** User search queries only public user metadata (`uid`, `username`, `name`, `profilePic`, `role`, `followersCount`, `followingCount`). Sensitive fields (`email`, `fcm_token`, `phone`, `stripeCustomerId`) are never queried or deserialized in search cards.
3. **Firestore Security Rules:** `frontend/firestore.rules` enforces read-only access for public profiles while preventing non-owners from modifying search index tokens or metadata.
