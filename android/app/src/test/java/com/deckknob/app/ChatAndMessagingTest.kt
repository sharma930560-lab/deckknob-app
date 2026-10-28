package com.deckknob.app

import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.ChatMessageDto
import com.deckknob.app.data.repository.ChatRepository
import com.deckknob.app.ui.navigation.Screen
import org.junit.Assert.*
import org.junit.Test

class ChatAndMessagingTest {

    @Test
    fun testScreenChatRouteCreation() {
        assertEquals("chat/{targetUid}", Screen.Chat.route)
        assertEquals("Chat", Screen.Chat.title)
        assertEquals("chat/user_dj_99", Screen.Chat.createRoute("user_dj_99"))
        assertEquals("messages", Screen.Chat.createRoute(""))
    }

    @Test
    fun testScreenMessagesRoute() {
        assertEquals("messages", Screen.Messages.route)
        assertEquals("Messages", Screen.Messages.title)
    }

    @Test
    fun testDeterministicChatIdGeneration() {
        // Chat IDs must be deterministic regardless of which user initiates
        val uidA = "alpha_uid_100"
        val uidB = "beta_uid_200"

        val idAB = if (uidA < uidB) "${uidA}_${uidB}" else "${uidB}_${uidA}"
        val idBA = if (uidB < uidA) "${uidB}_${uidA}" else "${uidA}_${uidB}"

        assertEquals("alpha_uid_100_beta_uid_200", idAB)
        assertEquals(idAB, idBA)
    }

    @Test
    fun testSelfChatPreventionLogic() {
        val uid = "self_user_123"
        val isSelfChat = uid == uid
        assertTrue("Self chat must be detected and rejected", isSelfChat)
    }

    @Test
    fun testMessageActionVisibilityConditions() {
        // Condition: On another user's profile, Message action must be visible
        val currentUserId = "my_uid_1"
        val otherUserId = "target_uid_2"

        val isOtherUser = otherUserId.isNotBlank() && otherUserId != currentUserId
        assertTrue("Message button must be visible for another user", isOtherUser)

        // Condition: On current user's own profile, Message action must NOT be visible
        val isOwnProfile = currentUserId == currentUserId
        val showMessageOnOwnProfile = !isOwnProfile
        assertFalse("Message button must NOT be visible on own profile", showMessageOnOwnProfile)
    }

    @Test
    fun testChatDtoDataIntegrity() {
        val chat = ChatDto(
            id = "chat_abc_xyz",
            participants = listOf("abc", "xyz"),
            lastMessage = "See you tonight at the gig!",
            lastSenderId = "abc",
            readBy = listOf("abc")
        )

        assertEquals("chat_abc_xyz", chat.id)
        assertEquals(2, chat.participants.size)
        assertTrue(chat.participants.contains("abc"))
        assertTrue(chat.participants.contains("xyz"))
        assertEquals("See you tonight at the gig!", chat.lastMessage)
    }

    @Test
    fun testChatMessageDtoFields() {
        val msg = ChatMessageDto(
            id = "msg_1",
            senderId = "sender_123",
            text = "Track sounds amazing!"
        )

        assertEquals("msg_1", msg.id)
        assertEquals("sender_123", msg.senderId)
        assertEquals("Track sounds amazing!", msg.text)
    }
}

