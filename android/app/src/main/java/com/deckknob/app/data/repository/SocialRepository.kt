package com.deckknob.app.data.repository

import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.model.UsernameMapping
import com.deckknob.app.util.DeckKnobLogger
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.tasks.await
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocialRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val authRepository: AuthRepository
) {

    // Shared real-time follow relationship state: targetUid -> isFollowing
    private val _followingState = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val followingState: StateFlow<Map<String, Boolean>> = _followingState.asStateFlow()

    // Concurrency guard to serialize and drop duplicate concurrent follow/unfollow operations
    private val inFlightFollowOperations = ConcurrentHashMap.newKeySet<String>()

    /**
     * Seeds initial followed user IDs into the shared repository state.
     */
    fun seedFollowingState(followingUids: Set<String>) {
        _followingState.update { current ->
            val updated = current.toMutableMap()
            followingUids.forEach { updated[it] = true }
            updated
        }
    }

    /**
     * Updates follow relationship state locally in the shared cache.
     */
    fun updateRelationshipLocally(targetUid: String, isFollowing: Boolean) {
        _followingState.update { it + (targetUid to isFollowing) }
    }

    /**
     * Helper to map Firestore document to UserDto with field aliases.
     */
    private fun mapDocumentToUser(doc: DocumentSnapshot): UserDto? {
        val user = doc.toObject(UserDto::class.java)?.copy(uid = doc.id) ?: return null
        val profilePic = doc.getString("profilePic") ?: doc.getString("profile_pic") ?: user.profilePic
        val name = doc.getString("name") ?: doc.getString("displayName") ?: user.name
        val followers = doc.getLong("followersCount")?.toInt() ?: doc.getLong("followers_count")?.toInt() ?: user.followersCount
        val following = doc.getLong("followingCount")?.toInt() ?: doc.getLong("following_count")?.toInt() ?: user.followingCount
        return user.copy(profilePic = profilePic, name = name, followersCount = followers, followingCount = following)
    }

    /**
     * Advanced User Search supporting:
     * 1. Case-insensitive username prefix search.
     * 2. Case-insensitive display-name search (Title Case, Uppercase, Lowercase, Raw).
     * 3. Public user ID / Handle lookup via usernames collection and publicId field.
     * 4. Pagination via pageOffset and maxResults.
     * 5. Deduplication and exclusion of authenticated user.
     */
    suspend fun searchUsers(
        query: String,
        maxResults: Int = 20,
        pageOffset: Int = 0
    ): Result<List<UserDto>> {
        return try {
            val rawTerm = query.trim()
            val cleanTerm = rawTerm.removePrefix("@").trim()
            if (cleanTerm.length < 2) return Result.success(emptyList())

            val currentUid = auth.currentUser?.uid.orEmpty()
            val lowerTerm = cleanTerm.lowercase()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Searching users with term: '$cleanTerm' (offset=$pageOffset, limit=$maxResults)")

            val candidateUsers = mutableListOf<UserDto>()

            // 1. Username prefix query (lowercase)
            try {
                val usernameSnap = firestore.collection("users")
                    .orderBy("username")
                    .startAt(lowerTerm)
                    .endAt(lowerTerm + "\uf8ff")
                    .limit((maxResults * 2).toLong())
                    .get()
                    .await()

                for (doc in usernameSnap.documents) {
                    val user = mapDocumentToUser(doc)
                    if (user != null) candidateUsers.add(user)
                }
            } catch (e: Exception) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Username prefix query non-fatal exception: ${e.message}")
            }

            // 2. Display Name prefix queries across common case variants
            val nameVariants = linkedSetOf<String>()
            val titleCase = cleanTerm.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
            nameVariants.add(titleCase)
            nameVariants.add(cleanTerm.uppercase())
            nameVariants.add(cleanTerm.lowercase())
            nameVariants.add(cleanTerm)

            for (variant in nameVariants) {
                try {
                    val nameSnap = firestore.collection("users")
                        .orderBy("name")
                        .startAt(variant)
                        .endAt(variant + "\uf8ff")
                        .limit(maxResults.toLong())
                        .get()
                        .await()

                    for (doc in nameSnap.documents) {
                        val user = mapDocumentToUser(doc)
                        if (user != null) candidateUsers.add(user)
                    }
                } catch (e: Exception) {
                    // Non-critical, continue with remaining variants
                }
            }

            // 3. Exact handle / Public ID lookup via usernames collection
            try {
                val usernameDoc = firestore.collection("usernames").document(lowerTerm).get().await()
                if (usernameDoc.exists()) {
                    val uid = usernameDoc.toObject(UsernameMapping::class.java)?.uid
                    if (!uid.isNullOrBlank() && uid != currentUid) {
                        val profile = authRepository.fetchUserProfile(uid)
                        if (profile != null) candidateUsers.add(profile)
                    }
                }
            } catch (e: Exception) {
                // Non-critical
            }

            // 4. Dedicated public user ID field lookup if present
            try {
                val publicIdSnap = firestore.collection("users")
                    .whereEqualTo("publicId", cleanTerm)
                    .limit(5)
                    .get()
                    .await()

                for (doc in publicIdSnap.documents) {
                    val user = mapDocumentToUser(doc)
                    if (user != null) candidateUsers.add(user)
                }
            } catch (e: Exception) {
                // Optional schema field
            }

            // 5. Deduplicate by UID and filter out authenticated user
            val distinctUsers = candidateUsers
                .filter { it.uid != currentUid && it.uid.isNotBlank() }
                .distinctBy { it.uid }

            // 6. Relevance sorting: exact username matches first, exact name matches second, then alphabetical
            val sortedUsers = distinctUsers.sortedWith(
                compareByDescending<UserDto> { it.username.equals(lowerTerm, ignoreCase = true) }
                    .thenByDescending { it.name.equals(cleanTerm, ignoreCase = true) }
                    .thenBy { it.username.lowercase() }
            )

            // 7. Pagination slice
            val paged = if (pageOffset > 0) {
                sortedUsers.drop(pageOffset).take(maxResults)
            } else {
                sortedUsers.take(maxResults)
            }

            DeckKnobLogger.i(DeckKnobLogger.Tag.FIRESTORE, "Found ${distinctUsers.size} distinct users; returning page of ${paged.size} for '$cleanTerm'")
            Result.success(paged)
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "searchUsers failed: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Checks if currentUid follows targetUid.
     * Checks in-memory synchronized state first, falling back to Firestore.
     */
    suspend fun isFollowing(currentUid: String, targetUid: String): Boolean {
        if (currentUid.isBlank() || targetUid.isBlank() || currentUid == targetUid) return false
        val cached = _followingState.value[targetUid]
        if (cached != null) return cached

        return try {
            val doc = firestore.collection("following")
                .document(currentUid)
                .collection("userFollowing")
                .document(targetUid)
                .get()
                .await()
            val exists = doc.exists()
            _followingState.update { it + (targetUid to exists) }
            exists
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "isFollowing check failed: ${e.message}")
            false
        }
    }

    /**
     * Follows target user atomically using a Firestore WriteBatch.
     * Enforces self-follow protection, duplicate protection, and concurrency serialization.
     */
    suspend fun followUser(currentUid: String, targetUid: String, currentUserData: UserDto? = null): Result<Unit> {
        if (currentUid.isBlank() || targetUid.isBlank()) {
            return Result.failure(IllegalArgumentException("User IDs cannot be blank"))
        }
        if (currentUid == targetUid) {
            return Result.failure(IllegalArgumentException("Users cannot follow themselves"))
        }

        // Concurrency guard: drop concurrent duplicate requests for the same target
        if (!inFlightFollowOperations.add(targetUid)) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Concurrent follow request for $targetUid already in progress. Ignoring duplicate.")
            return Result.success(Unit)
        }

        return try {
            val followingRef = firestore.collection("following")
                .document(currentUid)
                .collection("userFollowing")
                .document(targetUid)

            val followerRef = firestore.collection("followers")
                .document(targetUid)
                .collection("userFollowers")
                .document(currentUid)

            // Prevent duplicate write if already following
            val existing = followingRef.get().await()
            if (existing.exists()) {
                _followingState.update { it + (targetUid to true) }
                return Result.success(Unit)
            }

            val batch = firestore.batch()

            // 1. Write following record
            val followingData = mapOf(
                "targetUid" to targetUid,
                "createdAt" to FieldValue.serverTimestamp()
            )
            batch.set(followingRef, followingData)

            // 2. Write follower record
            val followerData = mapOf(
                "followerUid" to currentUid,
                "createdAt" to FieldValue.serverTimestamp()
            )
            batch.set(followerRef, followerData)

            // 3. Increment counters (parity with frontend web userService.js & firestore.rules)
            val currentUserDoc = firestore.collection("users").document(currentUid)
            val targetUserDoc = firestore.collection("users").document(targetUid)

            batch.update(currentUserDoc, mapOf("followingCount" to FieldValue.increment(1)))
            batch.update(targetUserDoc, mapOf("followersCount" to FieldValue.increment(1)))

            // 4. Create notification
            val notifRef = firestore.collection("notifications").document()
            val senderUsername = currentUserData?.username ?: auth.currentUser?.displayName ?: "user"
            val senderAvatar = currentUserData?.profilePic ?: ""
            val notifData = mapOf(
                "id" to notifRef.id,
                "targetUid" to targetUid,
                "recipientId" to targetUid,
                "senderId" to currentUid,
                "fromUsername" to senderUsername,
                "fromAvatar" to senderAvatar,
                "type" to "follow",
                "message" to "@$senderUsername started following you.",
                "read" to false,
                "timestamp" to FieldValue.serverTimestamp(),
                "createdAt" to FieldValue.serverTimestamp()
            )
            batch.set(notifRef, notifData)

            batch.commit().await()
            _followingState.update { it + (targetUid to true) }
            DeckKnobLogger.i(DeckKnobLogger.Tag.FIRESTORE, "User $currentUid successfully followed $targetUid")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "followUser failed: ${e.message}", e)
            Result.failure(e)
        } finally {
            inFlightFollowOperations.remove(targetUid)
        }
    }

    /**
     * Unfollows target user atomically using a Firestore WriteBatch.
     * Decrements both profile counts safely and enforces concurrency serialization.
     */
    suspend fun unfollowUser(currentUid: String, targetUid: String): Result<Unit> {
        if (currentUid.isBlank() || targetUid.isBlank() || currentUid == targetUid) {
            return Result.failure(IllegalArgumentException("Invalid User IDs for unfollow"))
        }

        // Concurrency guard
        if (!inFlightFollowOperations.add(targetUid)) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Concurrent unfollow request for $targetUid already in progress. Ignoring duplicate.")
            return Result.success(Unit)
        }

        return try {
            val followingRef = firestore.collection("following")
                .document(currentUid)
                .collection("userFollowing")
                .document(targetUid)

            val followerRef = firestore.collection("followers")
                .document(targetUid)
                .collection("userFollowers")
                .document(currentUid)

            val existing = followingRef.get().await()
            if (!existing.exists()) {
                _followingState.update { it + (targetUid to false) }
                return Result.success(Unit)
            }

            val batch = firestore.batch()
            batch.delete(followingRef)
            batch.delete(followerRef)

            val currentUserDoc = firestore.collection("users").document(currentUid)
            val targetUserDoc = firestore.collection("users").document(targetUid)

            batch.update(currentUserDoc, mapOf("followingCount" to FieldValue.increment(-1)))
            batch.update(targetUserDoc, mapOf("followersCount" to FieldValue.increment(-1)))

            batch.commit().await()
            _followingState.update { it + (targetUid to false) }
            DeckKnobLogger.i(DeckKnobLogger.Tag.FIRESTORE, "User $currentUid successfully unfollowed $targetUid")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "unfollowUser failed: ${e.message}", e)
            Result.failure(e)
        } finally {
            inFlightFollowOperations.remove(targetUid)
        }
    }

    /**
     * Retrieves followers for targetUid and hydrates user profiles.
     */
    suspend fun getFollowers(targetUid: String): Result<List<UserDto>> {
        if (targetUid.isBlank()) return Result.success(emptyList())
        return try {
            val snap = firestore.collection("followers")
                .document(targetUid)
                .collection("userFollowers")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(50)
                .get()
                .await()

            val uids = snap.documents.map { doc ->
                doc.getString("followerUid") ?: doc.getString("followerId") ?: doc.id
            }.filter { it.isNotBlank() }

            val profiles = mutableListOf<UserDto>()
            for (uid in uids) {
                val profile = authRepository.fetchUserProfile(uid)
                if (profile != null) profiles.add(profile)
            }
            Result.success(profiles)
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "getFollowers failed for $targetUid: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Retrieves following for targetUid and hydrates user profiles.
     */
    suspend fun getFollowing(targetUid: String): Result<List<UserDto>> {
        if (targetUid.isBlank()) return Result.success(emptyList())
        return try {
            val snap = firestore.collection("following")
                .document(targetUid)
                .collection("userFollowing")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(50)
                .get()
                .await()

            val uids = snap.documents.map { doc ->
                doc.getString("targetUid") ?: doc.id
            }.filter { it.isNotBlank() }

            // Sync into shared state if this is the authenticated user
            if (targetUid == auth.currentUser?.uid) {
                _followingState.update { current ->
                    val updated = current.toMutableMap()
                    uids.forEach { updated[it] = true }
                    updated
                }
            }

            val profiles = mutableListOf<UserDto>()
            for (uid in uids) {
                val profile = authRepository.fetchUserProfile(uid)
                if (profile != null) profiles.add(profile)
            }
            Result.success(profiles)
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "getFollowing failed for $targetUid: ${e.message}")
            Result.failure(e)
        }
    }
}
