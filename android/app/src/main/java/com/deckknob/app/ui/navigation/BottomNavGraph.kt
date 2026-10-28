package com.deckknob.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Feed : Screen("feed", "Feed", Icons.Default.Home)
    object Reels : Screen("reels", "Klyps", Icons.Default.PlayArrow)
    object Events : Screen("events", "Events", Icons.Default.DateRange)
    object Profile : Screen("profile", "Profile", Icons.Default.Person)
    object Settings : Screen("settings", "Settings", Icons.Default.Settings)
    object Camera : Screen("camera", "Camera", Icons.Default.PhotoCamera)

    /** View another user's profile. Route = "user_profile/{uid}" */
    object UserProfile : Screen("user_profile/{uid}", "Profile", Icons.Default.Person) {
        fun createRoute(uid: String) = if (uid.isNotBlank()) "user_profile/$uid" else "profile"
    }

    /** View dedicated event details. Route = "event_details/{eventId}" */
    object EventDetails : Screen("event_details/{eventId}", "Event Details", Icons.Default.DateRange) {
        fun createRoute(eventId: String) = if (eventId.isNotBlank()) "event_details/$eventId" else "events"
    }

    /** Direct conversation with another user. Route = "chat/{targetUid}" */
    object Chat : Screen("chat/{targetUid}", "Chat", Icons.Default.Email) {
        fun createRoute(targetUid: String) = if (targetUid.isNotBlank()) "chat/$targetUid" else "messages"
    }

    /** Messages inbox list. Route = "messages" */
    object Messages : Screen("messages", "Messages", Icons.Default.Email)

    companion object {
        val Klyps: Screen get() = Reels
    }
}

val bottomNavItems = listOf(
    Screen.Feed,
    Screen.Reels,
    Screen.Events,
    Screen.Profile
)
