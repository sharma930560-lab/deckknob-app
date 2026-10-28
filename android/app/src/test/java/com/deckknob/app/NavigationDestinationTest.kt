package com.deckknob.app

import com.deckknob.app.ui.navigation.Screen
import com.deckknob.app.ui.navigation.bottomNavItems
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationDestinationTest {

    @Test
    fun testScreenRoutesAndTitles() {
        assertEquals("feed", Screen.Feed.route)
        assertEquals("Feed", Screen.Feed.title)

        assertEquals("reels", Screen.Reels.route)
        assertEquals("Klyps", Screen.Reels.title)

        assertEquals("events", Screen.Events.route)
        assertEquals("Events", Screen.Events.title)

        assertEquals("profile", Screen.Profile.route)
        assertEquals("Profile", Screen.Profile.title)

        assertEquals("settings", Screen.Settings.route)
        assertEquals("Settings", Screen.Settings.title)

        assertEquals("camera", Screen.Camera.route)
        assertEquals("Camera", Screen.Camera.title)

        assertEquals("event_details/{eventId}", Screen.EventDetails.route)
        assertEquals("Event Details", Screen.EventDetails.title)
    }

    @Test
    fun testEventDetailsRouteCreation() {
        assertEquals("event_details/evt_12345", Screen.EventDetails.createRoute("evt_12345"))
        assertEquals("events", Screen.EventDetails.createRoute(""))
        assertEquals("events", Screen.EventDetails.createRoute("   "))
    }

    @Test
    fun testBottomNavItemsConsistency() {
        assertEquals(4, bottomNavItems.size)
        assertTrue(bottomNavItems.contains(Screen.Feed))
        assertTrue(bottomNavItems.contains(Screen.Reels))
        assertTrue(bottomNavItems.contains(Screen.Events))
        assertTrue(bottomNavItems.contains(Screen.Profile))
    }
}
