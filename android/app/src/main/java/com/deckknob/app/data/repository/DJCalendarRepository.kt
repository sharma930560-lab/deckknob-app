package com.deckknob.app.data.repository

import com.deckknob.app.data.model.CalendarAccessResult
import com.deckknob.app.data.model.DJCalendarEntry
import com.deckknob.app.data.model.DJCalendarSettings
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DJCalendarRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) {
    /**
     * Get DJ calendar privacy settings (defaults to "private")
     */
    suspend fun getCalendarSettings(djUid: String): DJCalendarSettings {
        return try {
            if (djUid.isBlank()) return DJCalendarSettings(privacy = "private")
            val doc = firestore.collection("djCalendars").document(djUid).get().await()
            if (doc.exists()) {
                DJCalendarSettings(
                    djUid = doc.getString("djUid") ?: djUid,
                    privacy = doc.getString("privacy") ?: "private",
                    updatedAt = doc.getTimestamp("updatedAt")
                )
            } else {
                DJCalendarSettings(djUid = djUid, privacy = "private")
            }
        } catch (e: Exception) {
            // PERMISSION_DENIED means rules are not yet deployed — default to private safely
            if (e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                android.util.Log.w("DJCalendar", "getCalendarSettings: PERMISSION_DENIED for $djUid — rules pending deployment, defaulting to private")
            }
            DJCalendarSettings(djUid = djUid, privacy = "private")
        }
    }

    /**
     * Update calendar privacy setting (Owner only)
     */
    suspend fun updateCalendarSettings(djUid: String, privacy: String, callerUid: String): Result<Boolean> {
        return try {
            if (djUid != callerUid || djUid.isBlank()) {
                return Result.failure(IllegalAccessException("Only the DJ calendar owner can change privacy settings."))
            }
            val allowed = listOf("private", "followers", "public")
            val validPrivacy = if (allowed.contains(privacy)) privacy else "private"

            val data = hashMapOf(
                "djUid" to djUid,
                "privacy" to validPrivacy,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            firestore.collection("djCalendars").document(djUid).set(data).await()
            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Check if viewerUid follows djUid in Firestore
     */
    suspend fun isFollowing(viewerUid: String, djUid: String): Boolean {
        return try {
            if (viewerUid.isBlank() || djUid.isBlank() || viewerUid == djUid) return false
            val doc = firestore.collection("following")
                .document(viewerUid)
                .collection("userFollowing")
                .document(djUid)
                .get()
                .await()
            doc.exists()
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Get calendar entries with fail-closed privacy verification & sanitization
     */
    suspend fun getCalendarEntries(
        djUid: String,
        viewerUid: String,
        followerStatusOverride: Boolean? = null
    ): CalendarAccessResult {
        return try {
            if (djUid.isBlank()) return CalendarAccessResult.Error("Invalid DJ UID")

            val settings = getCalendarSettings(djUid)
            val isOwner = viewerUid.isNotBlank() && viewerUid == djUid

            // 1. Owner always has full access
            if (isOwner) {
                val snap = firestore.collection("djCalendars")
                    .document(djUid)
                    .collection("entries")
                    .orderBy("date", Query.Direction.ASCENDING)
                    .get()
                    .await()

                val list = snap.documents.mapNotNull { d ->
                    d.toObject(DJCalendarEntry::class.java)?.copy(id = d.id)
                }
                return CalendarAccessResult.Authorized(
                    entries = list,
                    isOwner = true,
                    privacy = settings.privacy
                )
            }

            // 2. Private calendar: Fail closed for non-owners
            if (settings.privacy == "private") {
                return CalendarAccessResult.Restricted(
                    reason = "private",
                    privacy = "private"
                )
            }

            // 3. Check follow status
            val isFollower = followerStatusOverride ?: (viewerUid.isNotBlank() && isFollowing(viewerUid, djUid))

            // 4. Followers only calendar: Fail closed if not follower
            if (settings.privacy == "followers" && !isFollower) {
                return CalendarAccessResult.Restricted(
                    reason = "followers_only",
                    privacy = "followers"
                )
            }

            // 5. Authorized follower or public: Fetch & sanitize
            val snap = firestore.collection("djCalendars")
                .document(djUid)
                .collection("entries")
                .orderBy("date", Query.Direction.ASCENDING)
                .get()
                .await()

            val sanitizedList = mutableListOf<DJCalendarEntry>()
            for (d in snap.documents) {
                val entry = d.toObject(DJCalendarEntry::class.java)?.copy(id = d.id) ?: continue
                val vis = entry.visibility

                // Skip private entries
                if (vis == "private") continue

                // If public calendar and viewer is NOT follower, entry must be "public"
                if (settings.privacy == "public" && !isFollower && vis != "public") continue

                // Sanitize: Strip private notes
                sanitizedList.add(
                    entry.copy(
                        notes = "", // Strictly omitted
                        isSanitized = true
                    )
                )
            }

            CalendarAccessResult.Authorized(
                entries = sanitizedList,
                isOwner = false,
                privacy = settings.privacy
            )
        } catch (e: Exception) {
            // PERMISSION_DENIED = Firestore rules for djCalendars not yet deployed.
            // Show Restricted (private) instead of a raw error message to the user.
            if (e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                android.util.Log.w("DJCalendar", "getCalendarEntries: PERMISSION_DENIED for djUid=$djUid — rules pending deployment")
                return CalendarAccessResult.Restricted(
                    reason = "rules_pending",
                    privacy = "private"
                )
            }
            CalendarAccessResult.Error(e.message ?: "Failed to load calendar")
        }
    }

    /**
     * Add a new calendar entry (Owner only)
     */
    suspend fun addCalendarEntry(entry: DJCalendarEntry, callerUid: String): Result<DJCalendarEntry> {
        return try {
            if (entry.djUid != callerUid || callerUid.isBlank()) {
                return Result.failure(IllegalAccessException("Only the owner can add calendar entries."))
            }
            if (entry.title.isBlank() || entry.date.isBlank()) {
                return Result.failure(IllegalArgumentException("Title and date are required."))
            }

            val docRef = firestore.collection("djCalendars")
                .document(entry.djUid)
                .collection("entries")
                .document()

            val payload = entry.copy(
                id = docRef.id,
                createdAt = Timestamp.now(),
                updatedAt = Timestamp.now()
            )

            docRef.set(payload).await()
            Result.success(payload)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update an existing calendar entry (Owner only)
     */
    suspend fun updateCalendarEntry(entry: DJCalendarEntry, callerUid: String): Result<DJCalendarEntry> {
        return try {
            if (entry.djUid != callerUid || callerUid.isBlank()) {
                return Result.failure(IllegalAccessException("Only the owner can update calendar entries."))
            }
            val docRef = firestore.collection("djCalendars")
                .document(entry.djUid)
                .collection("entries")
                .document(entry.id)

            val payload = entry.copy(updatedAt = Timestamp.now())
            docRef.set(payload).await()
            Result.success(payload)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Delete calendar entry (Owner only).
     * Strictly does NOT delete linked public event.
     */
    suspend fun deleteCalendarEntry(djUid: String, entryId: String, callerUid: String): Result<Boolean> {
        return try {
            if (djUid != callerUid || callerUid.isBlank()) {
                return Result.failure(IllegalAccessException("Only the owner can delete calendar entries."))
            }
            firestore.collection("djCalendars")
                .document(djUid)
                .collection("entries")
                .document(entryId)
                .delete()
                .await()
            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

