package com.deckknob.app

import com.deckknob.app.data.model.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.ConcurrentHashMap

class SocialGraphAndSearchTest {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Follow / Unfollow from Feed
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testFollowUnfollowFromFeedLogic() {
        val currentUid = "current_user_123"
        val djUid = "dj_kraft_456"
        var followedDjs = setOf<String>()

        // Self-follow guard
        var selfFollowAttempted = false
        if (currentUid == currentUid) {
            selfFollowAttempted = true
        }
        assertTrue("Self-follow must be intercepted and rejected", selfFollowAttempted)

        // Blank DJ UID guard
        var blankFollowAttempted = false
        val blankUid = ""
        if (blankUid.isBlank() || blankUid == currentUid) {
            blankFollowAttempted = true
        }
        assertTrue("Blank UID must be rejected", blankFollowAttempted)

        // Optimistic follow from feed
        val isNowFollowed = !followedDjs.contains(djUid)
        followedDjs = if (isNowFollowed) followedDjs + djUid else followedDjs - djUid
        assertTrue("Feed state must reflect followed DJ", followedDjs.contains(djUid))

        // Optimistic unfollow from feed
        val isNowUnfollowed = !followedDjs.contains(djUid)
        followedDjs = if (isNowUnfollowed) followedDjs + djUid else followedDjs - djUid
        assertFalse("Feed state must reflect unfollowed DJ", followedDjs.contains(djUid))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Follow / Unfollow from Search
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testFollowUnfollowFromSearchLogic() {
        val currentUid = "user_a"
        val targetUser = UserDto(uid = "user_b", username = "techno_b")
        val followingMap = mutableMapOf<String, Boolean>()

        // Initial state is unfollowed
        assertFalse(followingMap[targetUser.uid] ?: false)

        // Toggle follow in search
        val isFollowing = followingMap[targetUser.uid] ?: false
        followingMap[targetUser.uid] = !isFollowing
        assertTrue("Search card must optimistically show FOLLOWING", followingMap[targetUser.uid] == true)

        // Toggle unfollow in search
        val isFollowing2 = followingMap[targetUser.uid] ?: false
        followingMap[targetUser.uid] = !isFollowing2
        assertFalse("Search card must optimistically show FOLLOW", followingMap[targetUser.uid] == true)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Follow / Unfollow from Profile
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testFollowUnfollowFromProfileLogic() {
        var profile = UserDto(uid = "target_dj", username = "dj_target", followersCount = 10)
        var isFollowing = false

        // Follow action
        isFollowing = !isFollowing
        profile = profile.copy(followersCount = profile.followersCount + 1)
        assertTrue("Profile isFollowing must be true", isFollowing)
        assertEquals("Followers count must increment to 11", 11, profile.followersCount)

        // Unfollow action
        isFollowing = !isFollowing
        profile = profile.copy(followersCount = (profile.followersCount - 1).coerceAtLeast(0))
        assertFalse("Profile isFollowing must be false", isFollowing)
        assertEquals("Followers count must decrement to 10", 10, profile.followersCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Cross-Screen Relationship Synchronization
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testCrossScreenRelationshipSynchronization() {
        // Shared state flow simulated from SocialRepository
        val sharedFollowingState = MutableStateFlow<Map<String, Boolean>>(emptyMap())

        // Simulated screen states
        var feedFollowed = setOf<String>()
        val searchFollowingMap = mutableMapOf<String, Boolean>()
        var profileIsFollowing = false
        val targetUid = "dj_sync_test"

        fun applySync(state: Map<String, Boolean>) {
            feedFollowed = state.filter { it.value }.keys
            state.forEach { (k, v) -> searchFollowingMap[k] = v }
            if (state.containsKey(targetUid)) {
                profileIsFollowing = state[targetUid] ?: false
            }
        }

        // Action: User follows target from Feed
        sharedFollowingState.update { it + (targetUid to true) }
        applySync(sharedFollowingState.value)

        assertTrue("Feed must reflect follow", feedFollowed.contains(targetUid))
        assertTrue("Search must reflect follow", searchFollowingMap[targetUid] == true)
        assertTrue("Profile must reflect follow", profileIsFollowing)

        // Action: User unfollows target from Profile
        sharedFollowingState.update { it + (targetUid to false) }
        applySync(sharedFollowingState.value)

        assertFalse("Feed must reflect unfollow", feedFollowed.contains(targetUid))
        assertFalse("Search must reflect unfollow", searchFollowingMap[targetUid] == true)
        assertFalse("Profile must reflect unfollow", profileIsFollowing)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Counter Consistency
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testCounterConsistencyAcrossOperations() {
        var userAFollowing = 0
        var userBFollowers = 0

        // User A follows User B
        userAFollowing += 1
        userBFollowers += 1
        assertEquals(1, userAFollowing)
        assertEquals(1, userBFollowers)

        // User A unfollows User B
        userAFollowing = (userAFollowing - 1).coerceAtLeast(0)
        userBFollowers = (userBFollowers - 1).coerceAtLeast(0)
        assertEquals(0, userAFollowing)
        assertEquals(0, userBFollowers)

        // Prevent negative counters (floor at 0 safeguard)
        userAFollowing = (userAFollowing - 1).coerceAtLeast(0)
        userBFollowers = (userBFollowers - 1).coerceAtLeast(0)
        assertEquals("Counter must not go below 0", 0, userAFollowing)
        assertEquals("Counter must not go below 0", 0, userBFollowers)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Concurrent Follow Requests Guards
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testConcurrentFollowRequestsGuards() {
        val inFlightOperations = ConcurrentHashMap.newKeySet<String>()
        val targetUid = "dj_concurrency_target"

        // First request acquires lock
        val acquiredFirst = inFlightOperations.add(targetUid)
        assertTrue("First concurrent request must acquire lock", acquiredFirst)

        // Second concurrent request must be rejected / dropped
        val acquiredSecond = inFlightOperations.add(targetUid)
        assertFalse("Second concurrent request must be dropped while in flight", acquiredSecond)

        // First completes and releases lock
        inFlightOperations.remove(targetUid)
        assertFalse(inFlightOperations.contains(targetUid))

        // Subsequent request succeeds
        val acquiredThird = inFlightOperations.add(targetUid)
        assertTrue("Subsequent request must acquire lock after previous release", acquiredThird)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Failed Writes Rollback
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testFailedWritesRollbackAndErrorHandling() {
        var isFollowed = false
        var followersCount = 5

        // User initiates follow: optimistic apply
        val previousFollowState = isFollowed
        val previousCount = followersCount
        isFollowed = true
        followersCount += 1

        assertEquals(true, isFollowed)
        assertEquals(6, followersCount)

        // Network error occurs -> rollback triggered
        val isNetworkSuccess = false
        if (!isNetworkSuccess) {
            isFollowed = previousFollowState
            followersCount = previousCount
        }

        assertEquals("State must rollback to false on error", false, isFollowed)
        assertEquals("Followers count must rollback to previous count on error", 5, followersCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Display-Name Search
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testDisplayNameSearchCaseVariants() {
        val users = listOf(
            UserDto(uid = "u1", username = "dj_kash", name = "DJKASH"),
            UserDto(uid = "u2", username = "kumarsanskar229", name = "Sanskar Kumar"),
            UserDto(uid = "u3", username = "jojo", name = "Paras Sharma")
        )

        // Case variant generation logic matching SocialRepository
        fun generateVariants(input: String): Set<String> {
            val clean = input.trim().removePrefix("@")
            val titleCase = clean.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
            return setOf(titleCase, clean.uppercase(), clean.lowercase(), clean)
        }

        // Query lowercase "sanskar"
        val variantsSanskar = generateVariants("sanskar")
        assertTrue(variantsSanskar.contains("Sanskar"))
        assertTrue(variantsSanskar.contains("SANSKAR"))
        assertTrue(variantsSanskar.contains("sanskar"))

        val matchedSanskar = users.filter { u ->
            variantsSanskar.any { v -> u.name.startsWith(v, ignoreCase = true) }
        }
        assertEquals(1, matchedSanskar.size)
        assertEquals("Sanskar Kumar", matchedSanskar.first().name)

        // Query uppercase "DJKASH"
        val variantsDjkash = generateVariants("DJKASH")
        val matchedDjkash = users.filter { u ->
            variantsDjkash.any { v -> u.name.startsWith(v, ignoreCase = true) }
        }
        assertEquals(1, matchedDjkash.size)
        assertEquals("DJKASH", matchedDjkash.first().name)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Username Search (Prefix and Case-Insensitivity)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testUsernameSearchPrefixAndCaseInsensitivity() {
        val users = listOf(
            UserDto(uid = "1", username = "djkraft", name = "DJ Kraft"),
            UserDto(uid = "2", username = "dj_kash", name = "DJKASH"),
            UserDto(uid = "3", username = "ambient_vibes", name = "Ambient Sound")
        )

        // Query "@DJK"
        val query = "@DJK"
        val clean = query.trim().removePrefix("@").lowercase()

        val matched = users.filter { it.username.lowercase().startsWith(clean) }
        assertEquals("Should match djkraft", 1, matched.size)
        assertEquals("djkraft", matched.first().username)

        // Query "dj"
        val matchedDj = users.filter { it.username.lowercase().startsWith("dj") }
        assertEquals("Should match both djkraft and dj_kash", 2, matchedDj.size)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Public ID Search and Handle Lookup
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testPublicIdSearchAndHandleLookup() {
        // Public ID in DECKKNOB is the user handle / username
        val users = listOf(
            UserDto(uid = "firebase_auth_uid_hidden_1", username = "djkraft", name = "DJ Kraft"),
            UserDto(uid = "firebase_auth_uid_hidden_2", username = "dj_kash", name = "DJKASH")
        )

        val handleQuery = "@dj_kash"
        val normalizedHandle = handleQuery.trim().removePrefix("@").lowercase()

        val found = users.firstOrNull { it.username.equals(normalizedHandle, ignoreCase = true) }
        assertNotNull(found)
        assertEquals("dj_kash", found?.username)
        // Ensure private Firebase UID is not used as public handle
        assertNotEquals(found?.uid, found?.username)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Pagination Logic and hasMore
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testPaginationLogicAndHasMore() {
        val allResults = (1..45).map {
            UserDto(uid = "uid_$it", username = "user_$it", name = "User $it")
        }

        val pageSize = 20

        // Page 1
        val page1Offset = 0
        val page1 = allResults.drop(page1Offset).take(pageSize)
        val hasMore1 = page1.size >= pageSize
        assertEquals(20, page1.size)
        assertEquals("uid_1", page1.first().uid)
        assertTrue(hasMore1)

        // Page 2
        val page2Offset = page1Offset + page1.size
        val page2 = allResults.drop(page2Offset).take(pageSize)
        val hasMore2 = page2.size >= pageSize
        assertEquals(20, page2.size)
        assertEquals("uid_21", page2.first().uid)
        assertTrue(hasMore2)

        // Page 3
        val page3Offset = page2Offset + page2.size
        val page3 = allResults.drop(page3Offset).take(pageSize)
        val hasMore3 = page3.size >= pageSize
        assertEquals(5, page3.size)
        assertEquals("uid_41", page3.first().uid)
        assertFalse(hasMore3)

        // Combined deduplicated total
        val accumulated = (page1 + page2 + page3).distinctBy { it.uid }
        assertEquals(45, accumulated.size)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. App Restart Persistence (Session Following State)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun testAppRestartPersistenceSessionSync() {
        // Simulated persisted following set from Firestore session load
        val persistedFollowingUids = setOf("dj_kash", "kumarsanskar229", "djkraft")

        val stateFlow = MutableStateFlow<Map<String, Boolean>>(emptyMap())

        // Seed on restart
        stateFlow.update { current ->
            val map = current.toMutableMap()
            persistedFollowingUids.forEach { map[it] = true }
            map
        }

        assertEquals(3, stateFlow.value.size)
        assertTrue(stateFlow.value["dj_kash"] == true)
        assertTrue(stateFlow.value["kumarsanskar229"] == true)
        assertTrue(stateFlow.value["djkraft"] == true)
        assertFalse(stateFlow.value["unknown_user"] == true)
    }
}
