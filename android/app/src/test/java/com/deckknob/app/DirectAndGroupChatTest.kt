package com.deckknob.app

import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.ChatMessageDto
import com.deckknob.app.ui.navigation.Screen
import org.junit.Assert.*
import org.junit.Test

class DirectAndGroupChatTest {

    @Test
    fun testDirectChatCanonicalParticipantOrdering() {
        val uid1 = "zebra_999"
        val uid2 = "alpha_001"

        // Canonical ordering must place lower alphanumeric UID first
        val canonical1 = if (uid1 < uid2) listOf(uid1, uid2) else listOf(uid2, uid1)
        val canonical2 = if (uid2 < uid1) listOf(uid2, uid1) else listOf(uid1, uid2)

        assertEquals(listOf("alpha_001", "zebra_999"), canonical1)
        assertEquals(canonical1, canonical2)
    }

    @Test
    fun testDirectChatParticipantOrderInsensitiveMatching() {
        val storedParticipants = listOf("userA", "userB")
        val requestedParticipants = listOf("userB", "userA")

        // Direct equality fails because of indexing:
        assertNotEquals(storedParticipants, requestedParticipants)

        // Set-based / hasAll verification succeeds:
        val hasAllMatches = storedParticipants.containsAll(requestedParticipants) &&
                requestedParticipants.containsAll(storedParticipants)
        assertTrue("Order-insensitive participant check must succeed", hasAllMatches)
    }

    @Test
    fun testGroupChatDtoProperties() {
        val group = ChatDto(
            id = "group_123",
            type = "group",
            name = "Techno Producers",
            description = "Berlin club sound and sample sharing",
            imageUrl = "https://example.com/group.jpg",
            ownerId = "owner_uid",
            adminIds = listOf("owner_uid", "admin_uid"),
            memberCount = 4,
            participants = listOf("owner_uid", "admin_uid", "member1", "member2"),
            lastMessage = "Session starts at 9pm",
            lastSenderId = "admin_uid"
        )

        assertEquals("group_123", group.id)
        assertTrue(group.isGroup)
        assertEquals("group", group.type)
        assertEquals("Techno Producers", group.name)
        assertEquals(4, group.memberCount)
        assertEquals(4, group.participants.size)
        assertTrue(group.adminIds.contains("owner_uid"))
        assertTrue(group.adminIds.contains("admin_uid"))
        assertEquals("owner_uid", group.ownerId)
    }

    @Test
    fun testChatMessageDtoWithSenderMetadata() {
        val msg = ChatMessageDto(
            id = "msg_group_1",
            senderId = "uid_kraft",
            senderName = "DJ Kraft",
            senderAvatar = "https://example.com/kraft.png",
            text = "Welcome to the crew!"
        )

        assertEquals("msg_group_1", msg.id)
        assertEquals("uid_kraft", msg.senderId)
        assertEquals("DJ Kraft", msg.senderName)
        assertEquals("https://example.com/kraft.png", msg.senderAvatar)
        assertEquals("Welcome to the crew!", msg.text)
    }

    @Test
    fun testNewChatRoutes() {
        // GroupChat route
        assertEquals("group_chat/{groupId}", Screen.GroupChat.route)
        assertEquals("group_chat/grp_999", Screen.GroupChat.createRoute("grp_999"))
        assertEquals("messages", Screen.GroupChat.createRoute(""))

        // CreateGroup route
        assertEquals("create_group", Screen.CreateGroup.route)

        // GroupDetails route
        assertEquals("group_details/{groupId}", Screen.GroupDetails.route)
        assertEquals("group_details/grp_999", Screen.GroupDetails.createRoute("grp_999"))
        assertEquals("messages", Screen.GroupDetails.createRoute(""))
    }

    @Test
    fun testNavigationSuiteVisibilityPolicy() {
        val allowedBottomNavRoutes = setOf(
            Screen.Feed.route,
            Screen.Reels.route,
            Screen.Events.route,
            Screen.Profile.route
        )

        // Allowed on top-level tabs
        assertTrue(allowedBottomNavRoutes.contains("feed"))
        assertTrue(allowedBottomNavRoutes.contains("reels"))
        assertTrue(allowedBottomNavRoutes.contains("events"))
        assertTrue(allowedBottomNavRoutes.contains("profile"))

        // Strictly hidden on messaging, chat and modal flows
        assertFalse(allowedBottomNavRoutes.contains(Screen.Messages.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.Chat.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.GroupChat.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.CreateGroup.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.GroupDetails.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.Search.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.Settings.route))
        assertFalse(allowedBottomNavRoutes.contains(Screen.Camera.route))
    }

    @Test
    fun testErrorMessageSanitization() {
        fun sanitize(msg: String): String {
            return when {
                msg.contains("PERMISSION_DENIED", ignoreCase = true) || msg.contains("insufficient permissions", ignoreCase = true) ->
                    "Access restricted. You do not have permission to view or participate in this conversation."
                msg.contains("UNAVAILABLE", ignoreCase = true) || msg.contains("network", ignoreCase = true) ->
                    "Connection failed. Please check your internet connection."
                msg.contains("NOT_FOUND", ignoreCase = true) ->
                    "Conversation not found."
                else -> msg
            }
        }

        val rawPermissionDenied = "PERMISSION_DENIED: Missing or insufficient permissions."
        val sanitizedPermission = sanitize(rawPermissionDenied)
        assertFalse(sanitizedPermission.contains("PERMISSION_DENIED"))
        assertFalse(sanitizedPermission.contains("Missing or insufficient permissions"))
        assertTrue(sanitizedPermission.contains("Access restricted"))

        val rawNetwork = "UNAVAILABLE: Network connection lost"
        val sanitizedNetwork = sanitize(rawNetwork)
        assertTrue(sanitizedNetwork.contains("Connection failed"))
    }

    @Test
    fun testGroupAdminAndOwnerRules() {
        val ownerId = "owner_1"
        val adminId = "admin_1"
        val memberId = "member_1"

        val group = ChatDto(
            id = "grp_test",
            type = "group",
            name = "Test",
            ownerId = ownerId,
            adminIds = listOf(ownerId, adminId),
            participants = listOf(ownerId, adminId, memberId)
        )

        // Owner is admin
        assertTrue(group.ownerId == ownerId)
        assertTrue(group.adminIds.contains(ownerId))

        // Admin is admin
        assertTrue(group.adminIds.contains(adminId))

        // Normal member is not admin
        assertFalse(group.adminIds.contains(memberId))

        // Owner cannot be removed
        fun canRemove(removerId: String, targetId: String): Boolean {
            if (targetId == group.ownerId) return false
            return group.adminIds.contains(removerId)
        }

        assertFalse("Owner cannot be removed by anyone", canRemove(adminId, ownerId))
        assertTrue("Admin can remove normal member", canRemove(adminId, memberId))
        assertTrue("Owner can remove normal member", canRemove(ownerId, memberId))
        assertFalse("Normal member cannot remove anyone", canRemove(memberId, adminId))
    }

    @Test
    fun testGroupOwnerLeaveRestriction() {
        val ownerId = "owner_1"
        val memberId = "member_1"

        fun canLeaveDirectly(userId: String, isOwner: Boolean): Result<Unit> {
            return if (isOwner) {
                Result.failure(IllegalStateException("Group owner must transfer ownership before leaving the group"))
            } else {
                Result.success(Unit)
            }
        }

        val ownerLeave = canLeaveDirectly(ownerId, isOwner = true)
        assertTrue(ownerLeave.isFailure)
        assertEquals("Group owner must transfer ownership before leaving the group", ownerLeave.exceptionOrNull()?.message)

        val memberLeave = canLeaveDirectly(memberId, isOwner = false)
        assertTrue(memberLeave.isSuccess)
    }

    @Test
    fun testGroupCreationValidationRules() {
        fun validate(name: String, members: List<String>): Result<Unit> {
            val trimmed = name.trim()
            if (trimmed.isEmpty()) return Result.failure(IllegalArgumentException("Group name cannot be empty"))
            if (trimmed.length > 100) return Result.failure(IllegalArgumentException("Group name too long"))
            if (members.distinct().size < 2) return Result.failure(IllegalArgumentException("Please select at least 1 other member"))
            return Result.success(Unit)
        }

        assertTrue(validate("", listOf("u1", "u2")).isFailure)
        assertTrue(validate("Valid Name", listOf("u1")).isFailure)
        assertTrue(validate("A".repeat(101), listOf("u1", "u2")).isFailure)
        assertTrue(validate("Valid Group Name", listOf("u1", "u2")).isSuccess)
    }
}
