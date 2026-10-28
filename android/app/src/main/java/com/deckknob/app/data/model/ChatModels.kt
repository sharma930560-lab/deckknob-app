package com.deckknob.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class ChatDto(
    val id: String = "",
    val participants: List<String> = emptyList(),
    val lastMessage: String? = null,
    val lastMessageAt: Timestamp? = null,
    val lastSenderId: String? = null,
    val readBy: List<String> = emptyList(),
    val otherUser: UserDto? = null
)

@IgnoreExtraProperties
data class ChatMessageDto(
    val id: String = "",
    val senderId: String = "",
    val text: String = "",
    val createdAt: Timestamp? = null
)

