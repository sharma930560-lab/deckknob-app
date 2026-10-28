package com.deckknob.app.data.model

import com.google.firebase.Timestamp

data class DJCalendarSettings(
    val djUid: String = "",
    val privacy: String = "private", // "private" | "followers" | "public"
    val updatedAt: Timestamp? = null
)

data class DJCalendarEntry(
    val id: String = "",
    val djUid: String = "",
    val title: String = "",
    val entryType: String = "gig", // "gig" | "tentative" | "personal"
    val date: String = "", // "YYYY-MM-DD"
    val startTime: String = "",
    val endTime: String = "",
    val venue: String = "",
    val city: String = "",
    val notes: String = "", // Confidential rider/soundcheck notes
    val visibility: String = "followers", // "private" | "followers" | "public"
    val linkedEventId: String? = null,
    val isSanitized: Boolean = false,
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

sealed interface CalendarAccessResult {
    data class Authorized(
        val entries: List<DJCalendarEntry>,
        val isOwner: Boolean,
        val privacy: String
    ) : CalendarAccessResult

    data class Restricted(
        val reason: String, // "private" | "followers_only"
        val privacy: String
    ) : CalendarAccessResult

    object Loading : CalendarAccessResult
    data class Error(val message: String) : CalendarAccessResult
}

