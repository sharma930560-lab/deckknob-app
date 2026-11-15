package com.deckknob.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName
import java.util.Date

@IgnoreExtraProperties
data class NotificationDto(
    var id: String = "",
    val message: String = "",
    @get:PropertyName("notification_type") @set:PropertyName("notification_type") var notification_type: String = "alert",
    @get:PropertyName("type") @set:PropertyName("type") var type: String = "",
    @get:PropertyName("is_read") @set:PropertyName("is_read") var is_read: Boolean = false,
    val targetUid: String = "",
    @get:PropertyName("senderUsername") @set:PropertyName("senderUsername") var senderUsername: String = "",
    @get:PropertyName("fromUsername") @set:PropertyName("fromUsername") var fromUsername: String = "",
    @get:PropertyName("fromAvatar") @set:PropertyName("fromAvatar") var fromAvatar: String = "",
    @get:PropertyName("fromUid") @set:PropertyName("fromUid") var fromUid: String = "",
    @get:PropertyName("referenceId") @set:PropertyName("referenceId") var referenceId: String = "",
    @get:PropertyName("created_at") @set:PropertyName("created_at") var created_at: Timestamp? = null,
    @get:PropertyName("createdAt") @set:PropertyName("createdAt") var createdAt: Timestamp? = null
) {
    val displayType: String get() = if (type.isNotBlank()) type else notification_type
    val displaySender: String get() = if (fromUsername.isNotBlank()) fromUsername else senderUsername
}

