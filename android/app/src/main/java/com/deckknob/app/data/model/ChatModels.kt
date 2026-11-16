package com.deckknob.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class ChatDto(
    val id: String = "",
    val type: String = "direct",
    val name: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val ownerId: String? = null,
    val adminIds: List<String> = emptyList(),
    val memberCount: Int = 2,
    val participants: List<String> = emptyList(),
    val lastMessage: String? = null,
    val lastMessageAt: Timestamp? = null,
    val lastSenderId: String? = null,
    val readBy: List<String> = emptyList(),
    val otherUser: UserDto? = null
) {
    val isGroup: Boolean
        get() = type == "group"
}

@IgnoreExtraProperties
data class ChatMessageDto(
    val id: String = "",
    val senderId: String = "",
    val senderName: String? = null,
    val senderAvatar: String? = null,
    val text: String = "",
    val createdAt: Timestamp? = null
)
