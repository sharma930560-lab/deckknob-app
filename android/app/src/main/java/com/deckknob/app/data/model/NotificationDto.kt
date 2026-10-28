package com.deckknob.app.data.model

import com.google.firebase.Timestamp

data class NotificationDto(
    val id: String = "",
    val message: String = "",
    val notification_type: String = "alert", // "like", "comment", "follow", "event", "alert"
    val is_read: Boolean = false,
    val targetUid: String = "",
    val senderUsername: String = "",
    val created_at: Timestamp? = null
)

